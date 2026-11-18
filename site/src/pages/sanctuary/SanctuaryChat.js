import { joinRoom, defaultRelayUrls } from "trystero";

const APP_ID = "ai-weekly-sanctuary-city-v1";
const ROOM_ID = "grand-sanctuary-lobby";
const STORAGE_NICK_KEY = "aiw-sanctuary-nick";
const BC_NAME = "ai-weekly-sanctuary-chat-v1";
const RELAY_URLS = (defaultRelayUrls || [])
  .filter((u) => !u.includes("chaima.info") && !u.includes("wellorder.net"))
  .slice(0, 6);

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

/**
 * Dual-transport (Trystero serverless WebRTC + local BroadcastChannel) real-time multi-user chat
 * and 3D avatar presence sync, supporting city-wide chat and per-user 1:1 DM threads.
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

    this.room = null;
    this.chatAction = null;
    this.presenceAction = null;
    this.bc = null;
    this.p2pPeerCount = 0;

    this._lastStateSentAt = 0;
    this._latestHeroState = null;

    this._bindDom();
    this._renderSelfNick();
    this._renderTabs();
    this._renderMessages();
  }

  start() {
    // 1. Same-browser multi-tab BroadcastChannel (zero-latency mirror / offline fallback)
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
          this.callbacks.onRemoteFx?.(msg.payload);
        } else if (msg.type === "leave") {
          this._removePeerByClientId(msg.clientId);
        }
      };
    }

    // 2. Cross-browser / cross-device serverless WebRTC via Trystero (Nostr relays)
    try {
      this.room = joinRoom({ appId: APP_ID, relayConfig: { urls: RELAY_URLS } }, ROOM_ID);
      this.chatAction = this.room.makeAction("chat");
      this.presenceAction = this.room.makeAction("presence");
      this.fxAction = this.room.makeAction("fx");

      this.room.onPeerJoin(({ peerId }) => {
        this.p2pPeerCount = Object.keys(this.room.getPeers()).length;
        this._updateStatusBadge();
        if (this._latestHeroState) {
          this.presenceAction.send(this._latestHeroState, { target: peerId }).catch(() => {});
        }
      });

      this.room.onPeerLeave(({ peerId }) => {
        this.p2pPeerCount = Object.keys(this.room.getPeers()).length;
        const cid = this.peerIdToClientId.get(peerId);
        this.peerIdToClientId.delete(peerId);
        if (cid) this._removePeerByClientId(cid);
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
        this.callbacks.onRemoteFx?.(data);
      });
    } catch {
      // BroadcastChannel remains active if WebRTC/relays are blocked
    }

    this._heartbeatTimer = setInterval(() => {
      if (this._latestHeroState) this.broadcastState(this._latestHeroState, true);
      this._pruneStalePeers();
    }, 2500);

    window.addEventListener("beforeunload", () => {
      try {
        this.bc?.postMessage({ type: "leave", clientId: this.clientId });
      } catch {}
      try {
        this.room?.leave?.();
      } catch {}
    });

    this.addSystemMessage("성역 도시에 입장했습니다. [전체] 또는 접속 유저를 눌러 1:1 대화할 수 있습니다.");
    this._updateStatusBadge();
  }

  broadcastState(heroState, force = false) {
    const now = performance.now();
    this._latestHeroState = {
      clientId: this.clientId,
      nickname: this.nickname,
      classKey: heroState.classKey,
      x: Number(heroState.x.toFixed(2)),
      z: Number(heroState.z.toFixed(2)),
      facing: Number(heroState.facing.toFixed(2)),
      action: heroState.action || "Idle",
      zone: heroState.zone || "중앙 광장",
    };

    if (!force && now - this._lastStateSentAt < 160) return;
    this._lastStateSentAt = now;

    try {
      this.bc?.postMessage({ type: "presence", clientId: this.clientId, payload: this._latestHeroState });
    } catch {}
    if (this.presenceAction && this.p2pPeerCount > 0) {
      this.presenceAction.send(this._latestHeroState).catch(() => {});
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
    if (this._latestHeroState) this.broadcastState(this._latestHeroState, true);
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
    if (this.chatAction && this.p2pPeerCount > 0) {
      const targetPeer = targetClientId ? this.peers.get(targetClientId) : null;
      const sendOpts = targetPeer?.peerId ? { target: targetPeer.peerId } : undefined;
      this.chatAction.send(payload, sendOpts).catch(() => {});
    }
  }

  broadcastFx(kind, extra = {}) {
    const payload = { clientId: this.clientId, kind, ...extra };
    try {
      this.bc?.postMessage({ type: "fx", clientId: this.clientId, payload });
    } catch {}
    if (this.fxAction && this.p2pPeerCount > 0) {
      this.fxAction.send(payload).catch(() => {});
    }
  }

  _handleRemotePresence(data, peerId) {
    if (!data?.clientId) return;
    const isNew = !this.peers.has(data.clientId);
    const prev = this.peers.get(data.clientId) || {};
    const peer = {
      ...prev,
      clientId: data.clientId,
      peerId: peerId || prev.peerId || null,
      nickname: String(data.nickname || `모험가-${data.clientId.slice(0, 4)}`).slice(0, 16),
      classKey: data.classKey || "Solar_Guard",
      x: Number(data.x) || 0,
      z: Number(data.z) || 0,
      facing: Number(data.facing) || 0,
      action: data.action || "Idle",
      zone: data.zone || "중앙 광장",
      lastSeen: Date.now(),
    };
    this.peers.set(data.clientId, peer);
    this.callbacks.onPeerUpdate?.(peer, isNew);
    if (isNew || prev.nickname !== peer.nickname) {
      this._renderTabs();
      this._updateStatusBadge();
    }
  }

  _handleRemoteChat(data) {
    if (!data?.id || this.seenMsgIds.has(data.id)) return;
    this.seenMsgIds.add(data.id);
    if (this.seenMsgIds.size > 400) {
      const first = this.seenMsgIds.values().next().value;
      this.seenMsgIds.delete(first);
    }

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
    const cutoff = Date.now() - 12000;
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
    if (this.els.count) {
      this.els.count.textContent = `${total}명 접속`;
    }
    if (this.els.dot) {
      this.els.dot.classList.toggle("is-online", this.peers.size > 0 || this.p2pPeerCount > 0);
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
