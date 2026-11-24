import { joinRoom } from "trystero";
import { schnorr } from "@noble/secp256k1";

const APP_ID = "ai-weekly-sanctuary-city-v1";
const ROOM_ID = "grand-sanctuary-lobby";
const STORAGE_NICK_KEY = "aiw-sanctuary-nick";
const BC_NAME = "ai-weekly-sanctuary-chat-v1";

// Empirically verified low-latency public Nostr relays supporting NIP-01 ephemeral kind pub/sub
const VERIFIED_RELAYS = [
  "wss://relay.primal.net",
  "wss://offchain.pub",
  "wss://nostr.mom",
];
const DIRECT_TOPIC = "ai-weekly-sanctuary-25d-v1:plaza-direct-v2";
const DIRECT_KIND = 24377;
const HEARTBEAT_MS = 2000;
const STALE_PEER_MS = 18000;
const RECONNECT_DELAY_MS = 3500;

const textEncoder = new TextEncoder();

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function createNostrSigner() {
  const { secretKey, publicKey } = schnorr.keygen();
  return {
    secretKey,
    pubkey: toHex(publicKey),
  };
}

async function createSignedNostrEvent(topic, kind, content, signer) {
  const payload = {
    kind,
    tags: [["x", topic]],
    created_at: Math.floor(Date.now() / 1000),
    content,
    pubkey: signer.pubkey,
  };
  const serialized = JSON.stringify([
    0,
    payload.pubkey,
    payload.created_at,
    payload.kind,
    payload.tags,
    payload.content,
  ]);
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(serialized));
  const idBytes = new Uint8Array(digest);
  const sigBytes = await schnorr.signAsync(idBytes, signer.secretKey);
  return JSON.stringify([
    "EVENT",
    {
      ...payload,
      id: toHex(idBytes),
      sig: toHex(sigBytes),
    },
  ]);
}

function randomId(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

function getSessionClientId() {
  try {
    let id = sessionStorage.getItem("aiw-sanctuary-cid");
    if (!id) {
      id = randomId(8);
      sessionStorage.setItem("aiw-sanctuary-cid", id);
    }
    return id;
  } catch {
    return randomId(8);
  }
}

function loadSavedNickname(fallback) {
  try {
    const raw = (localStorage.getItem(STORAGE_NICK_KEY) || "").trim();
    return raw ? raw.slice(0, 16) : fallback;
  } catch {
    return fallback;
  }
}

function saveNickname(nick) {
  try {
    localStorage.setItem(STORAGE_NICK_KEY, nick);
  } catch {}
}

function trimSet(set, maxSize) {
  while (set.size > maxSize) {
    const first = set.values().next().value;
    set.delete(first);
  }
}

/**
 * Hybrid triple-transport (Direct NIP-01 WSS Pub/Sub Relays + Trystero WebRTC P2P +
 * same-browser BroadcastChannel) real-time multi-user chat and 3D avatar presence sync.
 * Ensures Phone (LTE/5G CGNAT) and PC clients gather reliably in one shared lobby.
 */
export class SanctuaryChat {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.clientId = getSessionClientId();
    this.nickname = loadSavedNickname(`모험가-${this.clientId.slice(0, 4).toUpperCase()}`);
    this.activeThread = "global"; // "global" | peerClientId
    this.collapsed = false;

    this.peers = new Map(); // clientId -> { clientId, peerId, nickname, classKey, x, z, facing, action, zone, lastSeen }
    this.peerIdToClientId = new Map();
    this.threads = new Map([["global", []]]); // threadId -> Array<msg>
    this.unread = new Map();
    this.seenMsgIds = new Set();

    // Direct WebSocket Pub/Sub hub state (NAT/CGNAT-proof cross-device transport)
    this.relaySigner = null;
    this.relaySockets = new Map(); // url -> WebSocket
    this.connectedRelays = new Set(); // open url
    this.seenRelayEventIds = new Set();
    this.seenFxIds = new Set();
    this._relayReconnectTimers = new Map();
    this._stopped = false;

    // Trystero WebRTC P2P accelerator state
    this.room = null;
    this.chatAction = null;
    this.presenceAction = null;
    this.fxAction = null;
    this.bc = null;
    this.p2pPeerCount = 0;

    // Throttling and handshake coalescing
    this._lastBcSentAt = 0;
    this._lastRemoteSentAt = 0;
    this._lastReplySentAt = 0;
    this._lastSentSignature = "";
    this._latestHeroState = null;
    this._immediateReplyTimer = null;
    this._joinAnnounceTimer = null;
    this._trailingIdleTimer = null;

    this._bindDom();
    this._renderSelfNick();
    this._renderTabs();
    this._renderMessages();
  }

  start() {
    this._stopped = false;

    // 1. Same-browser multi-tab BroadcastChannel (zero-latency mirror)
    if (typeof BroadcastChannel !== "undefined") {
      this.bc = new BroadcastChannel(BC_NAME);
      this.bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.clientId === this.clientId) return;
        if (msg.type === "presence") {
          this._handleRemotePresence(msg.payload, null);
        } else if (msg.type === "chat") {
          this._handleRemoteChat(msg.payload);
        } else if (msg.type === "fx") {
          this._handleRemoteFx(msg.payload);
        } else if (msg.type === "leave") {
          this._removePeerByClientId(msg.clientId);
        }
      };
    }

    // 2. Cross-device Direct WSS Pub/Sub Relays (works behind mobile LTE/5G CGNAT & firewalls)
    this._initDirectWssRelays();

    // 3. Cross-device low-latency WebRTC P2P accelerator via Trystero
    this._initTrysteroP2P();

    // 4. Periodic presence heartbeat & stale peer cleanup
    this._heartbeatTimer = setInterval(() => {
      if (this._latestHeroState) {
        this.broadcastState(this._latestHeroState, true, false);
      }
      this._pruneStalePeers();
    }, HEARTBEAT_MS);

    // 5. Mobile browser foreground/network resume resilience
    this._onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        this._ensureRelaysConnected();
        if (this._latestHeroState) {
          this.broadcastState(this._latestHeroState, true, true);
        }
      }
    };
    this._onOnline = () => {
      this._ensureRelaysConnected();
      if (this._latestHeroState) {
        this.broadcastState(this._latestHeroState, true, true);
      }
    };
    document.addEventListener("visibilitychange", this._onVisibilityChange);
    window.addEventListener("online", this._onOnline);

    this._onBeforeUnload = () => {
      this._stopped = true;
      try {
        this.bc?.postMessage({ type: "leave", clientId: this.clientId });
      } catch {}
      clearInterval(this._heartbeatTimer);
      clearTimeout(this._immediateReplyTimer);
      clearTimeout(this._joinAnnounceTimer);
      clearTimeout(this._trailingIdleTimer);
      for (const timer of this._relayReconnectTimers.values()) clearTimeout(timer);
      this._relayReconnectTimers.clear();
      for (const ws of this.relaySockets.values()) {
        try {
          ws.close();
        } catch {}
      }
      this.relaySockets.clear();
      this.connectedRelays.clear();
      try {
        this.room?.leave?.();
      } catch {}
    };
    window.addEventListener("beforeunload", this._onBeforeUnload);

    this.addSystemMessage("위클리월드에 입장했습니다. [전체] 또는 접속 유저를 눌러 1:1 대화할 수 있습니다.");
    this._updateStatusBadge();
  }

  _initDirectWssRelays() {
    try {
      if (!this.relaySigner) {
        this.relaySigner = createNostrSigner();
      }
    } catch {
      return;
    }
    this._ensureRelaysConnected();
  }

  _ensureRelaysConnected() {
    if (this._stopped) return;
    for (const url of VERIFIED_RELAYS) {
      const existing = this.relaySockets.get(url);
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
      ) {
        continue;
      }
      this._connectRelaySocket(url);
    }
  }

  _connectRelaySocket(url) {
    if (this._stopped) return;
    const prevTimer = this._relayReconnectTimers.get(url);
    if (prevTimer) {
      clearTimeout(prevTimer);
      this._relayReconnectTimers.delete(url);
    }

    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      this._scheduleRelayReconnect(url);
      return;
    }

    this.relaySockets.set(url, ws);
    const subId = `aiw-${randomId(6)}`;

    ws.onopen = () => {
      if (this._stopped || this.relaySockets.get(url) !== ws) {
        try {
          ws.close();
        } catch {}
        return;
      }
      this.connectedRelays.add(url);
      this._updateStatusBadge();

      try {
        const since = Math.floor(Date.now() / 1000) - 90;
        ws.send(JSON.stringify(["REQ", subId, { kinds: [DIRECT_KIND], "#x": [DIRECT_TOPIC], since }]));
      } catch {}

      this._scheduleJoinAnnounce(80);
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!Array.isArray(msg)) return;

      if (msg[0] === "EOSE") {
        this._scheduleJoinAnnounce(60);
        return;
      }

      if (msg[0] !== "EVENT" || !msg[2] || typeof msg[2] !== "object") return;
      const evt = msg[2];
      if (!evt.id || this.seenRelayEventIds.has(evt.id)) return;
      this.seenRelayEventIds.add(evt.id);
      trimSet(this.seenRelayEventIds, 600);

      let packet;
      try {
        packet = JSON.parse(evt.content);
      } catch {
        return;
      }
      if (!packet || !packet.clientId || packet.clientId === this.clientId) return;

      // Drop stale packets from disconnected sessions (> 2 minutes old handles device clock skew)
      if (packet._ts && Math.abs(Date.now() - packet._ts) > 120000) return;

      if (packet.channel === "presence") {
        this._handleRemotePresence(packet, null);
      } else if (packet.channel === "chat") {
        this._handleRemoteChat(packet);
      } else if (packet.channel === "fx") {
        this._handleRemoteFx(packet);
      } else if (packet.channel === "leave") {
        this._removePeerByClientId(packet.clientId);
      }
    };

    const handleDisconnect = () => {
      this.connectedRelays.delete(url);
      if (this.relaySockets.get(url) === ws) {
        this.relaySockets.delete(url);
      }
      this._updateStatusBadge();
      if (!this._stopped) {
        this._scheduleRelayReconnect(url);
      }
    };

    ws.onclose = handleDisconnect;
    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
      handleDisconnect();
    };
  }

  _scheduleRelayReconnect(url) {
    if (this._stopped || this._relayReconnectTimers.has(url)) return;
    const timer = setTimeout(() => {
      this._relayReconnectTimers.delete(url);
      this._connectRelaySocket(url);
    }, RECONNECT_DELAY_MS);
    this._relayReconnectTimers.set(url, timer);
  }

  _scheduleJoinAnnounce(delayMs = 80) {
    if (this._stopped) return;
    clearTimeout(this._joinAnnounceTimer);
    this._joinAnnounceTimer = setTimeout(() => {
      if (this._latestHeroState) {
        this.broadcastState(this._latestHeroState, true, true);
      }
    }, delayMs);
  }

  async _broadcastDirectWss(channel, payload) {
    if (this._stopped || !this.relaySigner || typeof crypto?.subtle?.digest !== "function") return;
    const openSockets = [];
    for (const ws of this.relaySockets.values()) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        openSockets.push(ws);
      }
    }
    if (!openSockets.length) return;

    try {
      const envelope = JSON.stringify({
        ...payload,
        channel,
        clientId: this.clientId,
        _ts: Date.now(),
      });
      const frame = await createSignedNostrEvent(DIRECT_TOPIC, DIRECT_KIND, envelope, this.relaySigner);
      for (const ws of openSockets) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(frame);
          } catch {}
        }
      }
    } catch {}
  }

  _initTrysteroP2P() {
    try {
      this.room = joinRoom(
        {
          appId: APP_ID,
          identity: "none",
          relayConfig: {
            urls: VERIFIED_RELAYS,
            redundancy: VERIFIED_RELAYS.length,
            warnOnRelayFailure: false,
          },
          rtcConfig: {
            iceServers: [
              { urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
            ],
          },
        },
        ROOM_ID
      );
      this.chatAction = this.room.makeAction("chat");
      this.presenceAction = this.room.makeAction("presence");
      this.fxAction = this.room.makeAction("fx");

      this.room.onPeerJoin(({ peerId }) => {
        this.p2pPeerCount = Object.keys(this.room.getPeers()).length;
        this._updateStatusBadge();
        if (this._latestHeroState) {
          this.presenceAction
            .send({ ...this._latestHeroState, isJoin: false }, { target: peerId })
            .catch(() => {});
        }
      });

      this.room.onPeerLeave(({ peerId }) => {
        this.p2pPeerCount = Object.keys(this.room.getPeers()).length;
        const cid = this.peerIdToClientId.get(peerId);
        this.peerIdToClientId.delete(peerId);
        // Remove peer only if no Direct WSS heartbeat arrived recently
        if (cid) {
          const peer = this.peers.get(cid);
          if (peer && Date.now() - peer.lastSeen > 5000) {
            this._removePeerByClientId(cid);
          }
        }
        this._updateStatusBadge();
      });

      this.room.onError?.(() => {
        this._updateStatusBadge();
      });

      this.presenceAction.onMessage((data, { peerId }) => {
        if (!data || data.clientId === this.clientId) return;
        this.peerIdToClientId.set(peerId, data.clientId);
        this._handleRemotePresence(data, peerId);
      });

      this.chatAction.onMessage((data) => {
        if (!data || data.clientId === this.clientId) return;
        this._handleRemoteChat(data);
      });

      this.fxAction.onMessage((data) => {
        if (!data || data.clientId === this.clientId) return;
        this._handleRemoteFx(data);
      });
    } catch {
      // Direct WSS & BroadcastChannel remain active if WebRTC fails
    }
  }

  _scheduleImmediatePresenceReply() {
    const now = Date.now();
    if (this._stopped || !this._latestHeroState) return;
    if (now - this._lastReplySentAt < 250) return;

    clearTimeout(this._immediateReplyTimer);
    this._immediateReplyTimer = setTimeout(() => {
      if (this._stopped || !this._latestHeroState) return;
      this._lastReplySentAt = Date.now();
      this.broadcastState(this._latestHeroState, true, false);
    }, 180);
  }

  broadcastPresence(heroState, force = false, isJoin = false) {
    this.broadcastState(heroState, force, isJoin);
  }

  broadcastState(heroState, force = false, isJoin = false) {
    if (!heroState) return;
    const isFirstState = !this._latestHeroState;
    const now = performance.now();
    this._latestHeroState = {
      clientId: this.clientId,
      nickname: this.nickname,
      classKey: heroState.classKey,
      x: Number(heroState.x.toFixed(2)),
      y: Number((heroState.y || 0).toFixed(2)),
      z: Number(heroState.z.toFixed(2)),
      facing: Number(heroState.facing.toFixed(2)),
      action: heroState.action || "Idle",
      zone: heroState.zone || "중앙 광장",
      riding: heroState.riding || null,
    };

    // BroadcastChannel: smooth 60ms updates for same-browser tabs
    if (force || isJoin || isFirstState || now - this._lastBcSentAt >= 60) {
      this._lastBcSentAt = now;
      try {
        this.bc?.postMessage({
          type: "presence",
          clientId: this.clientId,
          payload: this._latestHeroState,
        });
      } catch {}
    }

    const sig = `${this._latestHeroState.classKey}|${this._latestHeroState.nickname}|${this._latestHeroState.x.toFixed(1)}|${this._latestHeroState.y.toFixed(1)}|${this._latestHeroState.z.toFixed(1)}|${this._latestHeroState.facing.toFixed(1)}|${this._latestHeroState.action}|${this._latestHeroState.zone}`;
    const changed = sig !== this._lastSentSignature;
    const shouldSendRemote =
      force ||
      isJoin ||
      isFirstState ||
      (changed && now - this._lastRemoteSentAt >= 180);

    if (!shouldSendRemote) {
      // Ensure stopping ("Walk" -> "Idle") always syncs promptly after movement ends
      if (changed && this._latestHeroState.action !== "Walk" && !this._trailingIdleTimer) {
        this._trailingIdleTimer = setTimeout(() => {
          this._trailingIdleTimer = null;
          if (!this._stopped && this._latestHeroState) {
            this.broadcastState(this._latestHeroState, true, false);
          }
        }, 200);
      }
      return;
    }

    clearTimeout(this._trailingIdleTimer);
    this._trailingIdleTimer = null;
    this._lastRemoteSentAt = now;
    this._lastSentSignature = sig;

    const remotePacket = {
      ...this._latestHeroState,
      isJoin: Boolean(isJoin || isFirstState),
    };

    this._broadcastDirectWss("presence", remotePacket);

    if (this.presenceAction && this.p2pPeerCount > 0) {
      this.presenceAction.send(remotePacket).catch(() => {});
    }
  }

  selectUserThread(clientId) {
    if (!clientId || clientId === this.clientId) {
      this.activeThread = "global";
    } else {
      if (!this.threads.has(clientId)) this.threads.set(clientId, []);
      this.activeThread = clientId;
    }
    this.unread.set(this.activeThread, 0);
    if (this.collapsed) this.setCollapsed(false);
    this._renderTabs();
    this._renderMessages();
    this.els.input?.focus();
  }

  setCollapsed(flag) {
    this.collapsed = Boolean(flag);
    this.els.root?.classList.toggle("is-collapsed", this.collapsed);
    if (this.els.collapseBtn) {
      this.els.collapseBtn.textContent = this.collapsed ? "열기" : "접기";
      this.els.collapseBtn.setAttribute("aria-expanded", this.collapsed ? "false" : "true");
    }
    this._syncMobileUnreadBadge();
  }

  _syncMobileUnreadBadge() {
    const badge = document.getElementById("wl-mob-chat-badge");
    if (!badge) return;
    let totalUnread = 0;
    for (const v of this.unread.values()) totalUnread += v;
    if (this.collapsed && totalUnread > 0) {
      badge.textContent = totalUnread > 9 ? "9+" : String(totalUnread);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  sendMessage(rawText) {
    const text = String(rawText || "").trim().slice(0, 220);
    if (!text) return;

    // Slash commands: /nick, /w, /time, /season, /firework
    if (text.startsWith("/nick ")) {
      const next = text.slice(6).trim().slice(0, 16);
      if (next) this.setNickname(next);
      return;
    }
    if (text === "/firework" || text === "/불꽃") {
      this.callbacks.onCommand?.("firework");
      return;
    }
    if (text.startsWith("/time ")) {
      this.callbacks.onCommand?.("time", text.slice(6).trim());
      return;
    }
    if (text.startsWith("/season ")) {
      this.callbacks.onCommand?.("season", text.slice(8).trim());
      return;
    }
    if (text.startsWith("/w ")) {
      const rest = text.slice(3).trim();
      const sp = rest.indexOf(" ");
      if (sp > 0) {
        const targetNick = rest.slice(0, sp).trim();
        const body = rest.slice(sp + 1).trim();
        const targetPeer = [...this.peers.values()].find(
          (p) => p.nickname.toLowerCase() === targetNick.toLowerCase()
        );
        if (targetPeer && body) {
          this._dispatchChat(body, targetPeer.clientId);
          return;
        }
        this.addSystemMessage(`'${targetNick}' 유저를 온라인 목록에서 찾을 수 없습니다.`);
        return;
      }
    }

    const targetClientId = this.activeThread === "global" ? null : this.activeThread;
    this._dispatchChat(text, targetClientId);
  }

  setNickname(nextNick) {
    const clean = String(nextNick || "").trim().slice(0, 16);
    if (!clean) return;
    this.nickname = clean;
    saveNickname(clean);
    this._renderSelfNick();
    this.callbacks.onNicknameChange?.(clean);
    if (this._latestHeroState) this.broadcastState(this._latestHeroState, true, false);
    this.addSystemMessage(`닉네임이 '${clean}'(으)로 변경되었습니다.`);
  }

  addSystemMessage(text) {
    const msg = {
      id: `sys-${Date.now()}-${Math.random()}`,
      kind: "system",
      text,
      ts: Date.now(),
    };
    this._pushToThread("global", msg);
    if (this.activeThread === "global") this._renderMessages();
  }

  _dispatchChat(text, targetClientId) {
    const zone = this._latestHeroState?.zone || "중앙 광장";
    const payload = {
      id: `${this.clientId}-${Date.now()}-${randomId(4)}`,
      clientId: this.clientId,
      nickname: this.nickname,
      text,
      targetClientId: targetClientId || null,
      zone,
      ts: Date.now(),
    };
    this.seenMsgIds.add(payload.id);
    trimSet(this.seenMsgIds, 400);

    const threadId = targetClientId || "global";
    this._pushToThread(threadId, { ...payload, self: true, dm: Boolean(targetClientId) });

    if (this.activeThread !== threadId) {
      this.activeThread = threadId;
      this._renderTabs();
    }
    this._renderMessages();

    if (!targetClientId) {
      this.callbacks.onSelfPublicChat?.(text);
    }

    try {
      this.bc?.postMessage({ type: "chat", clientId: this.clientId, payload });
    } catch {}

    this._broadcastDirectWss("chat", payload);

    if (this.chatAction && this.p2pPeerCount > 0) {
      const targetPeer = targetClientId ? this.peers.get(targetClientId) : null;
      const sendOpts = targetPeer?.peerId ? { target: targetPeer.peerId } : undefined;
      this.chatAction.send(payload, sendOpts).catch(() => {});
    }
  }

  broadcastFx(kind, extra = {}) {
    const payload = {
      id: `fx-${this.clientId}-${Date.now()}-${randomId(4)}`,
      clientId: this.clientId,
      kind,
      ...extra,
    };
    this.seenFxIds.add(payload.id);
    trimSet(this.seenFxIds, 200);

    try {
      this.bc?.postMessage({ type: "fx", clientId: this.clientId, payload });
    } catch {}

    this._broadcastDirectWss("fx", payload);

    if (this.fxAction && this.p2pPeerCount > 0) {
      this.fxAction.send(payload).catch(() => {});
    }
  }

  _handleRemoteFx(data) {
    if (!data?.kind) return;
    if (data.id) {
      if (this.seenFxIds.has(data.id)) return;
      this.seenFxIds.add(data.id);
      trimSet(this.seenFxIds, 200);
    }
    this.callbacks.onRemoteFx?.(data);
  }

  _handleRemotePresence(data, peerId) {
    if (!data?.clientId || data.clientId === this.clientId) return;
    const isNew = !this.peers.has(data.clientId);
    const prev = this.peers.get(data.clientId) || {};
    const peer = {
      ...prev,
      clientId: data.clientId,
      peerId: peerId || prev.peerId || null,
      nickname: String(data.nickname || `모험가-${data.clientId.slice(0, 4)}`).slice(0, 16),
      classKey: data.classKey || "Solar_Guard",
      x: Number(data.x) || 0,
      y: Number(data.y) || 0,
      z: Number(data.z) || 0,
      facing: Number(data.facing) || 0,
      action: data.action || "Idle",
      zone: data.zone || "중앙 광장",
      riding: data.riding || null,
      lastSeen: Date.now(),
    };
    this.peers.set(data.clientId, peer);
    this.callbacks.onPeerUpdate?.(peer, isNew);

    if (isNew || prev.nickname !== peer.nickname || prev.classKey !== peer.classKey) {
      this._renderTabs();
      this._updateStatusBadge();
    }

    if ((isNew || data.isJoin) && this._latestHeroState) {
      this._scheduleImmediatePresenceReply();
    }
  }

  _handleRemoteChat(data) {
    if (!data?.id || this.seenMsgIds.has(data.id)) return;
    this.seenMsgIds.add(data.id);
    trimSet(this.seenMsgIds, 400);

    // Privacy check for 1:1 DM
    if (data.targetClientId && data.targetClientId !== this.clientId) return;

    const isDm = data.targetClientId === this.clientId;
    const threadId = isDm ? data.clientId : "global";

    this._pushToThread(threadId, {
      ...data,
      self: false,
      dm: isDm,
    });

    if (this.activeThread !== threadId || this.collapsed) {
      this.unread.set(threadId, (this.unread.get(threadId) || 0) + 1);
      this._renderTabs();
      this._syncMobileUnreadBadge();
    } else {
      this._renderMessages();
    }

    if (!isDm) {
      this.callbacks.onPeerPublicChat?.(data.clientId, data.text);
    }
  }

  _removePeerByClientId(clientId) {
    if (!this.peers.has(clientId)) return;
    this.peers.delete(clientId);
    this.callbacks.onPeerLeave?.(clientId);
    if (this.activeThread === clientId) {
      this.activeThread = "global";
    }
    this._renderTabs();
    this._renderMessages();
    this._updateStatusBadge();
  }

  _pruneStalePeers() {
    const cutoff = Date.now() - STALE_PEER_MS;
    for (const [cid, peer] of this.peers.entries()) {
      if (peer.lastSeen < cutoff) this._removePeerByClientId(cid);
    }
  }

  _pushToThread(threadId, msg) {
    if (!this.threads.has(threadId)) this.threads.set(threadId, []);
    const list = this.threads.get(threadId);
    list.push(msg);
    if (list.length > 80) list.shift();
  }

  _updateStatusBadge() {
    const total = 1 + this.peers.size;
    const relayCount = this.connectedRelays.size;
    const serverOnline = relayCount > 0 || this.p2pPeerCount > 0 || this.peers.size > 0;
    if (this.els.count) {
      this.els.count.textContent = serverOnline ? `${total}명 접속` : `${total}명 (연결중)`;
      this.els.count.title = `실시간 광장 · 릴레이 ${relayCount}/${VERIFIED_RELAYS.length} 연결 · WebRTC P2P ${this.p2pPeerCount}명`;
    }
    if (this.els.dot) {
      this.els.dot.classList.toggle("is-online", serverOnline);
    }
  }

  _renderSelfNick() {
    if (this.els.nickBtn) {
      this.els.nickBtn.textContent = this.nickname;
    }
  }

  _renderTabs() {
    const bar = this.els.tabs;
    if (!bar) return;
    bar.innerHTML = "";

    const makeTab = (id, label, isDm = false) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `sc-chat-tab ${this.activeThread === id ? "is-active" : ""} ${isDm ? "is-dm" : ""}`;
      btn.dataset.threadId = id;

      const txt = document.createElement("span");
      txt.textContent = label;
      btn.appendChild(txt);

      const u = this.unread.get(id) || 0;
      if (u > 0) {
        const badge = document.createElement("span");
        badge.className = "sc-chat-unread";
        badge.textContent = u > 9 ? "9+" : String(u);
        btn.appendChild(badge);
      }
      btn.addEventListener("click", () => this.selectUserThread(id));
      return btn;
    };

    bar.appendChild(makeTab("global", "전체"));
    for (const peer of this.peers.values()) {
      bar.appendChild(makeTab(peer.clientId, peer.nickname, true));
    }

    if (this.els.input) {
      if (this.activeThread === "global") {
        this.els.input.placeholder = "메시지 입력 (Enter 전송 · /w 닉네임 내용)";
      } else {
        const target = this.peers.get(this.activeThread);
        this.els.input.placeholder = target ? `${target.nickname}님에게 1:1 메시지…` : "1:1 메시지…";
      }
    }
  }

  _renderMessages() {
    const log = this.els.log;
    if (!log) return;
    const list = this.threads.get(this.activeThread) || [];
    log.innerHTML = "";

    if (!list.length && this.activeThread !== "global") {
      const peer = this.peers.get(this.activeThread);
      const empty = document.createElement("div");
      empty.className = "sc-chat-msg is-system";
      empty.textContent = `${peer ? peer.nickname : "유저"}님과 1:1 대화방입니다.`;
      log.appendChild(empty);
      return;
    }

    for (const m of list) {
      const row = document.createElement("div");
      if (m.kind === "system") {
        row.className = "sc-chat-msg is-system";
        row.textContent = m.text;
      } else {
        row.className = `sc-chat-msg ${m.self ? "is-self" : "is-peer"} ${m.dm ? "is-dm" : ""}`;
        const meta = document.createElement("span");
        meta.className = "sc-chat-author";
        const zoneTag = m.zone ? ` [${m.zone}]` : "";
        meta.textContent = `${m.dm ? "[1:1] " : ""}${m.nickname}${zoneTag}`;
        if (!m.self && m.clientId) {
          meta.title = "클릭하여 1:1 채팅";
          meta.addEventListener("click", () => this.selectUserThread(m.clientId));
        }

        const body = document.createElement("span");
        body.className = "sc-chat-text";
        body.textContent = m.text;
        row.append(meta, body);
      }
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  }

  _bindDom() {
    const root = document.getElementById("sanctuary-chat");
    this.els = {
      root,
      dot: document.getElementById("chat-status-dot"),
      count: document.getElementById("chat-online-count"),
      zone: document.getElementById("chat-zone-label"),
      nickBtn: document.getElementById("chat-nick-btn"),
      nickInput: document.getElementById("chat-nick-input"),
      collapseBtn: document.getElementById("chat-collapse-btn"),
      tabs: document.getElementById("chat-user-tabs"),
      log: document.getElementById("chat-message-log"),
      form: document.getElementById("chat-form"),
      input: document.getElementById("chat-input"),
    };

    if (!root) return;

    // Isolate pointer/wheel interactions inside chat from 3D canvas zoom & walk
    for (const evName of ["pointerdown", "pointerup", "click", "wheel"]) {
      root.addEventListener(evName, (ev) => ev.stopPropagation());
    }

    this.els.collapseBtn?.addEventListener("click", () => {
      this.setCollapsed(!this.collapsed);
    });

    // Inline nickname edit
    this.els.nickBtn?.addEventListener("click", () => {
      if (!this.els.nickInput) return;
      this.els.nickBtn.hidden = true;
      this.els.nickInput.hidden = false;
      this.els.nickInput.value = this.nickname;
      this.els.nickInput.focus();
      this.els.nickInput.select();
    });

    const commitNick = () => {
      if (!this.els.nickInput || this.els.nickInput.hidden) return;
      const val = this.els.nickInput.value.trim();
      this.els.nickInput.hidden = true;
      if (this.els.nickBtn) this.els.nickBtn.hidden = false;
      if (val && val !== this.nickname) this.setNickname(val);
    };
    this.els.nickInput?.addEventListener("blur", commitNick);
    this.els.nickInput?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commitNick();
      } else if (ev.key === "Escape") {
        this.els.nickInput.hidden = true;
        if (this.els.nickBtn) this.els.nickBtn.hidden = false;
      }
    });

    this.els.form?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!this.els.input) return;
      const val = this.els.input.value;
      this.els.input.value = "";
      this.sendMessage(val);
    });
  }

  updateZoneLabel(zoneName) {
    if (this.els.zone && zoneName) {
      this.els.zone.textContent = zoneName;
    }
  }

  focusInput() {
    if (this.collapsed) this.setCollapsed(false);
    this.els.input?.focus();
  }
}
