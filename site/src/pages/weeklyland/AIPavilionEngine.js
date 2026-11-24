import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture } from "./ToonMaterials.js";

const MEGA_BILLBOARD_SPECS = [
  { key: "plugins", title: "인기 플러그인", kicker: "PLUGINS TAB", accent: "#ff7657", x: -84, z: -124, rotY: 0.36 },
  { key: "news", title: "AI 뉴스", kicker: "AI NEWS TAB", accent: "#38bdf8", x: -30, z: -132, rotY: 0.12 },
  { key: "social", title: "소셜 피드", kicker: "SOCIAL TAB", accent: "#f472b6", x: 30, z: -132, rotY: -0.12 },
  { key: "starboard", title: "스타보드", kicker: "STARBOARD TAB", accent: "#fbbf24", x: 84, z: -124, rotY: -0.36 },
  { key: "benchmarks", title: "점유율 · 성능", kicker: "BENCHMARKS TAB", accent: "#34d399", x: 122, z: -64, rotY: -0.82 },
];

/**
 * WeeklyLand AI Pavilions + 5 Perimeter Tab Mega-Billboards & Live Data Loader
 * Loads AI Weekly's live JSON feeds (Plugins, News, Social, Starboard, Benchmarks),
 * builds 4 themed 3D pavilions and 5 giant interactive perimeter LED boards.
 */
export class AIPavilionEngine {
  constructor(scene, terrainEngine) {
    this.scene = scene;
    this.terrain = terrainEngine;
    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_Pavilions";
    this.scene.add(this.group);

    this.pavilions = new Map();
    this.billboards = new Map();
    this.interactiveSpots = [];
    this.pickables = [];
    this.nightLights = [];
    this.archiveData = {
      plugins: { updated: "로딩 중", items: [] },
      news: { updated: "로딩 중", summary: "", items: [] },
      social: { updated: "로딩 중", items: [] },
      starboard: { updated: "로딩 중", items: [] },
      benchmarks: { updated: "로딩 중", shares: [], models: [] },
    };
  }

  async loadArchiveData() {
    const fetchJson = async (url) => {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    const [pluginsJson, newsJson, socialJson, bmJson, starsMetaJson, starsLedgerJson] = await Promise.all([
      fetchJson("data/latest.json"),
      fetchJson("data/news_latest.json"),
      fetchJson("data/social_latest.json"),
      fetchJson("data/benchmarks_latest.json"),
      fetchJson("data/stars_meta.json"),
      fetchJson("data/stars_ledger.json"),
    ]);

    if (pluginsJson) {
      const rising = (pluginsJson.rising || pluginsJson.items || []).map((p) => ({ ...p, _tier: "rising" }));
      const classic = (pluginsJson.classic || []).map((p) => ({ ...p, _tier: "classic" }));
      this.archiveData.plugins = {
        updated: pluginsJson.generated_at || pluginsJson.updated_at || "최신",
        items: [...rising, ...classic],
      };
    }

    if (newsJson) {
      this.archiveData.news = {
        updated: newsJson.date || newsJson.updated_at || "최신",
        summary: newsJson.daily_summary_ko || "",
        items: newsJson.items || newsJson.articles || [],
      };
    }

    if (socialJson) {
      this.archiveData.social = {
        updated: socialJson.date || socialJson.updated_at || "최신",
        items: socialJson.items || socialJson.posts || [],
      };
    }

    if (bmJson) {
      this.archiveData.benchmarks = {
        updated: bmJson.updated_at || bmJson.date || "최신",
        shares: bmJson.market_share || bmJson.shares || [],
        models: bmJson.frontier_models || bmJson.models || [],
      };
    }

    if (starsMetaJson) {
      const metaEntries = Array.isArray(starsMetaJson)
        ? starsMetaJson
        : Object.entries(starsMetaJson.repos || starsMetaJson).map(([repo, v]) => ({ repo, ...v }));
      const ledgerRepos = starsLedgerJson?.repos || {};
      const items = metaEntries
        .filter((e) => e && (e.repo || e.name))
        .map((e) => {
          const key = e.repo || e.name;
          const hist = ledgerRepos[key];
          let stars = Number(e.stars || e.stargazers_count || 0);
          let delta = Number(e.delta_7d || e.velocity_7d || 0);
          if (hist && typeof hist === "object") {
            const dates = Object.keys(hist).sort();
            if (dates.length) {
              stars = Number(hist[dates[dates.length - 1]] || stars);
              const prevIdx = Math.max(0, dates.length - 8);
              delta = Math.max(0, stars - Number(hist[dates[prevIdx]] || stars));
            }
          }
          return {
            repo: key,
            name: e.name || key.split("/").pop() || key,
            description: e.description_ko || e.description || "",
            category: e.category || "AI OSS",
            stars,
            delta,
            url: e.url || `https://github.com/${key}`,
          };
        })
        .sort((a, b) => b.delta - a.delta || b.stars - a.stars)
        .slice(0, 40);

      this.archiveData.starboard = {
        updated: starsLedgerJson?.updated_at || new Date().toISOString().slice(0, 10),
        items,
      };
    }

    this.refreshMegaBillboards();
    return this.archiveData;
  }

  getLiveParkHighlights() {
    const topPlugin = this.archiveData.plugins.items[0];
    const topNews = this.archiveData.news.items[0];
    const topModel = this.archiveData.benchmarks.models[0];
    const topSocial = this.archiveData.social.items[0];
    const topStar = this.archiveData.starboard.items[0];

    const headline = topNews?.title_ko || topNews?.headline || "위클리랜드 AI 테마파크 그랜드 오픈";
    const sub = topPlugin
      ? `플러그인 #1: ${topPlugin.name} (+${Number(topPlugin.velocity_7d || 0).toLocaleString()}★)`
      : topStar
      ? `스타보드 #1: ${topStar.name} (${topStar.stars.toLocaleString()}★)`
      : "인기 플러그인 · AI 뉴스 · 스타보드 · 벤치마크 실시간 연동";
    const metricLine = topModel
      ? `CODING #1: ${topModel.model} (${topModel.arena_coding_elo || topModel.arena_elo || "—"} Elo)`
      : "FRONTIER BENCHMARK DROP TOWER";

    const guestLines = [
      topPlugin ? `${topPlugin.name} 코스터 스폰서 열차 진짜 빠르다!` : "스타보드 하이퍼 코스터 뱅크턴 최고!",
      topNews ? `북쪽 뉴스 전광판에서 "${String(topNews.title_ko || "").slice(0, 20)}..." 봤어요!` : "AI 뉴스 메가 전광판 멋져요!",
      topModel ? `벤치마크 드롭타워 1위가 ${topModel.model}이라니!` : "벤치마크 드롭타워 낙하 쾌감 최고!",
      topSocial ? `소셜 전광판에서 ${topSocial.author} 포스트가 핫해요!` : "동화 성 앞에서 불꽃놀이 봐야지!",
      "아이스크림 카페 들렀다 풍선 달고 대관람차 탈 거예요!",
    ];

    return { headline, sub, metricLine, guestLines };
  }

  syncAll(pavilionsList) {
    this._clear();
    for (const def of pavilionsList || []) {
      this._buildPavilion(def);
    }
    this._buildMegaBillboards();
    this.refreshMegaBillboards();
  }

  _clear() {
    while (this.group.children.length > 0) {
      const ch = this.group.children.pop();
      ch.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else if (obj.material) obj.material.dispose();
      });
    }
    this.pavilions.clear();
    this.billboards.clear();
    this.interactiveSpots = [];
    this.pickables = [];
    this.nightLights = [];
  }

  _buildPavilion(def) {
    const root = new THREE.Group();
    const gy = this.terrain ? Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(def.x, def.z)) : 0;
    root.position.set(def.x, gy, def.z);
    root.rotation.y = def.rotY || 0;
    this.group.add(root);

    const accent = new THREE.Color(def.accent || "#ff7657");
    const wallMat = createToonMaterial(0xfff7eb);
    const trimMat = createToonMaterial(accent);
    const stripeMat = createToonMaterial(0xffffff, {
      map: getCarnivalStripeTexture(def.accent || "#ff7657", "#fff7eb", 10),
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.2,
    });
    this.nightLights.push(glassMat);

    // Deep underground plinth skirt so pavilion sits flush even on gentle hills
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(9.8, 2.8, 8.2), createToonMaterial(0xcbd5e1));
    skirt.position.y = -1.35;
    skirt.receiveShadow = true;
    root.add(skirt);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.55, 7.8), createToonMaterial(0xffe8c2));
    plinth.position.y = 0.275;
    plinth.receiveShadow = true;
    addToonOutline(plinth, 1.025);
    root.add(plinth);

    const body = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.2, 6.4), wallMat);
    body.position.y = 2.65;
    body.castShadow = true;
    body.receiveShadow = true;
    addToonOutline(body, 1.03);
    root.add(body);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 1.5), stripeMat);
    awning.position.set(0, 3.25, 3.65);
    awning.rotation.x = 0.28;
    addToonOutline(awning, 1.05);
    root.add(awning);

    if (def.archiveKey === "benchmarks") {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3.5, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), trimMat);
      dome.position.y = 4.75;
      dome.castShadow = true;
      addToonOutline(dome, 1.035);
      root.add(dome);
    } else if (def.archiveKey === "news") {
      const archRoof = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.35, 8.4, 16, 1, false, 0, Math.PI), stripeMat);
      archRoof.rotation.z = Math.PI * 0.5;
      archRoof.position.y = 4.75;
      archRoof.castShadow = true;
      addToonOutline(archRoof, 1.03);
      root.add(archRoof);
    } else {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(6.3, 2.5, 4), stripeMat);
      roof.position.y = 5.95;
      roof.rotation.y = Math.PI * 0.25;
      roof.castShadow = true;
      addToonOutline(roof, 1.03);
      root.add(roof);
    }

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      createToonMaterial(0xffd166, { emissive: 0xf59e0b, emissiveIntensity: 0.3 })
    );
    gem.position.y = 7.9;
    addToonOutline(gem, 1.09);
    root.add(gem);

    const portal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.25), glassMat);
    portal.position.set(0, 1.9, 3.22);
    root.add(portal);

    const signTex = this._makeMarqueeTexture(def.title, def.archiveKey.toUpperCase(), def.accent || "#ff7657");
    const marquee = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.25), new THREE.MeshBasicMaterial({ map: signTex }));
    marquee.position.set(0, 4.0, 3.25);
    root.add(marquee);

    root.traverse((obj) => {
      if (obj.isMesh && !obj.userData.isToonOutline) {
        obj.userData = { pickKind: "pavilion", id: def.id, archiveKey: def.archiveKey, title: def.title };
        this.pickables.push(obj);
      }
    });

    this.interactiveSpots.push({
      kind: "pavilion",
      archiveKey: def.archiveKey,
      label: `${def.title} 대시보드 열기`,
      pos: root.position.clone(),
      radius: 9.5,
    });
    this.pavilions.set(def.archiveKey, { def, root, pos: root.position.clone() });
  }

  /**
   * Builds 5 giant interactive perimeter Mega-Billboards (1 per AI Weekly tab) at map edges.
   */
  _buildMegaBillboards() {
    for (const spec of MEGA_BILLBOARD_SPECS) {
      const root = new THREE.Group();
      const gy = this.terrain ? Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(spec.x, spec.z)) : 0;
      root.position.set(spec.x, gy, spec.z);
      root.rotation.y = spec.rotY;
      this.group.add(root);

      const frameMat = createToonMaterial(0x1e293b);
      const accentColor = new THREE.Color(spec.accent);
      const neonMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.75,
      });
      this.nightLights.push(neonMat);

      // Twin tall cartoon towers anchored deep (-3.8m) underground + concrete footings
      for (const px of [-9.5, 9.5]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.9, 19.8, 10), frameMat);
        leg.position.set(px, 6.1, 0);
        leg.castShadow = true;
        addToonOutline(leg, 1.04);
        root.add(leg);

        const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.75, 2.8, 10), createToonMaterial(0xcbd5e1));
        pad.position.set(px, -0.6, 0);
        root.add(pad);
      }

      // Giant screen casing (24m x 12m)
      const casing = new THREE.Mesh(new THREE.BoxGeometry(24.4, 12.2, 1.1), frameMat);
      casing.position.set(0, 18.2, 0);
      casing.castShadow = true;
      addToonOutline(casing, 1.02);
      root.add(casing);

      // Glowing top/bottom neon accent bars
      const barTop = new THREE.Mesh(new THREE.BoxGeometry(24.8, 0.45, 1.35), neonMat);
      barTop.position.set(0, 24.4, 0);
      root.add(barTop);
      const barBot = new THREE.Mesh(new THREE.BoxGeometry(24.8, 0.45, 1.35), neonMat);
      barBot.position.set(0, 12.0, 0);
      root.add(barBot);

      // Front interactive kiosk console button at ground level with underground plinth
      const consoleSkirt = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 2.2), createToonMaterial(0xcbd5e1));
      consoleSkirt.position.set(0, -1.2, 2.2);
      root.add(consoleSkirt);

      const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.2, 1.6), createToonMaterial(0xfff7eb));
      consoleBox.position.set(0, 1.1, 2.2);
      addToonOutline(consoleBox, 1.05);
      root.add(consoleBox);

      const btnGlow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 0.4), neonMat);
      btnGlow.position.set(0, 1.65, 3.0);
      root.add(btnGlow);

      // Dynamic LED CanvasTexture
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 460;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;

      const screen = new THREE.Mesh(new THREE.PlaneGeometry(23.0, 11.0), new THREE.MeshBasicMaterial({ map: tex }));
      screen.position.set(0, 18.2, 0.62);
      root.add(screen);

      root.traverse((obj) => {
        if (obj.isMesh && !obj.userData.isToonOutline) {
          obj.userData = {
            pickKind: "mega_billboard",
            archiveKey: spec.key,
            title: `${spec.title} 메가 전광판`,
          };
          this.pickables.push(obj);
        }
      });

      this.interactiveSpots.push({
        kind: "mega_billboard",
        archiveKey: spec.key,
        label: `${spec.title} 전광판 대시보드 열기`,
        pos: root.position.clone().add(new THREE.Vector3(0, 0, 4)),
        radius: 15,
      });

      this.billboards.set(spec.key, { spec, root, canvas, tex, pos: root.position.clone() });
    }
  }

  refreshMegaBillboards() {
    for (const [key, rec] of this.billboards.entries()) {
      const lines = this._getTabBoardLines(key);
      this._paintMegaBoard(rec.canvas, rec.spec, lines);
      rec.tex.needsUpdate = true;
    }
  }

  _getTabBoardLines(key) {
    if (key === "plugins") {
      const items = this.archiveData.plugins.items.slice(0, 3);
      return items.length
        ? items.map((p, i) => `#${i + 1} ${p.name}  (+${Number(p.velocity_7d || 0).toLocaleString()}★ / 7d)`)
        : ["인기 플러그인 실시간 데이터를 불러오는 중…"];
    }
    if (key === "news") {
      const items = this.archiveData.news.items.slice(0, 3);
      return items.length
        ? items.map((n, i) => `#${i + 1} ${String(n.title_ko || n.headline || "").slice(0, 34)}`)
        : ["AI 뉴스 실시간 브리핑을 불러오는 중…"];
    }
    if (key === "social") {
      const items = this.archiveData.social.items.slice(0, 3);
      return items.length
        ? items.map((s, i) => `#${i + 1} [${String(s.platform || "").toUpperCase()}] ${s.author}: ${String(s.title_ko || "").slice(0, 24)}`)
        : ["소셜 피드를 불러오는 중…"];
    }
    if (key === "starboard") {
      const items = this.archiveData.starboard.items.slice(0, 3);
      return items.length
        ? items.map((s, i) => `#${i + 1} ${s.name}  ★${s.stars.toLocaleString()} (+${s.delta.toLocaleString()})`)
        : ["스타보드 급상승 리포지토리를 불러오는 중…"];
    }
    const models = this.archiveData.benchmarks.models.slice(0, 3);
    return models.length
      ? models.map((m, i) => `#${i + 1} ${m.model}  (${m.arena_coding_elo || m.arena_elo || "—"} Elo)`)
      : ["프론티어 LLM 벤치마크를 불러오는 중…"];
  }

  _paintMegaBoard(canvas, spec, lines) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0b1222");
    grad.addColorStop(1, "#18243f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    ctx.fillStyle = spec.accent;
    ctx.font = "700 26px monospace";
    ctx.fillText(`AI WEEKLY · ${spec.kicker}`, 46, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px sans-serif";
    ctx.fillText(`${spec.title} 라이브 보드`, 46, 128);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 28px sans-serif";
    lines.forEach((line, idx) => {
      ctx.fillText(line.slice(0, 44), 46, 206 + idx * 58);
    });

    // Bottom CTA button graphic
    ctx.fillStyle = spec.accent;
    ctx.fillRect(46, 378, 360, 52);
    ctx.fillStyle = "#0b1222";
    ctx.font = "700 24px sans-serif";
    ctx.fillText("클릭 / [E] 대시보드 열기 →", 72, 412);
  }

  _makeMarqueeTexture(title, kicker, accentHex) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 104;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, 512, 104);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 512, 10);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, 256, 56);
    ctx.fillStyle = accentHex;
    ctx.font = "600 18px monospace";
    ctx.fillText(`${kicker} PAVILION · CLICK TO OPEN`, 256, 86);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  findNearestInteractable(worldPos) {
    let best = null;
    let bestDist = Infinity;
    for (const spot of this.interactiveSpots) {
      const d = Math.hypot(worldPos.x - spot.pos.x, worldPos.z - spot.pos.z);
      if (d <= spot.radius && d < bestDist) {
        bestDist = d;
        best = spot;
      }
    }
    return best;
  }

  getPavilionPosition(archiveKey) {
    return (
      this.billboards.get(archiveKey)?.pos?.clone() ||
      this.pavilions.get(archiveKey)?.pos?.clone() ||
      new THREE.Vector3(0, 0, -100)
    );
  }

  update(isNight) {
    for (const mat of this.nightLights) {
      mat.emissiveIntensity = isNight ? 1.55 : 0.4;
    }
  }

  dispose() {
    this._clear();
    this.scene.remove(this.group);
  }
}
