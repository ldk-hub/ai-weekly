import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture } from "./ToonMaterials.js";

/**
 * WeeklyLand AI Pavilions & Live Data Loader
 * Loads AI Weekly's 6 live JSON datasets and builds 4 distinct themed 3D pavilions
 * (Plugin Forge, AI News IMAX Theater, Social Garden Lounge, Benchmark Observatory).
 */
export class AIPavilionEngine {
  constructor(scene, terrainEngine) {
    this.scene = scene;
    this.terrain = terrainEngine;
    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_Pavilions";
    this.scene.add(this.group);

    this.pavilions = new Map();
    this.pickables = [];
    this.nightLights = [];
    this.archiveData = {
      plugins: { updated: "로딩 중", items: [] },
      news: { updated: "로딩 중", summary: "", items: [] },
      social: { updated: "로딩 중", items: [] },
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

    const [pluginsJson, newsJson, socialJson, bmJson] = await Promise.all([
      fetchJson("data/latest.json"),
      fetchJson("data/news_latest.json"),
      fetchJson("data/social_latest.json"),
      fetchJson("data/benchmarks_latest.json"),
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

    return this.archiveData;
  }

  getLiveParkHighlights() {
    const topPlugin = this.archiveData.plugins.items[0];
    const topNews = this.archiveData.news.items[0];
    const topModel = this.archiveData.benchmarks.models[0];
    const topSocial = this.archiveData.social.items[0];

    const headline = topNews?.title_ko || topNews?.headline || "위클리랜드 AI 테마파크 그랜드 오픈";
    const sub = topPlugin
      ? `스타보드 HOT #1: ${topPlugin.name} (+${Number(topPlugin.velocity_7d || 0).toLocaleString()}★)`
      : "인기 플러그인 · AI 뉴스 · 벤치마크 실시간 연동";
    const metricLine = topModel
      ? `CODING #1: ${topModel.model} (${topModel.arena_coding_elo || topModel.arena_elo || "—"} Elo)`
      : "FRONTIER BENCHMARK DROP TOWER";

    const guestLines = [
      topPlugin ? `${topPlugin.name} 코스터 스폰서 열차 진짜 빠르다!` : "스타보드 하이퍼 코스터 4G 커브 미쳤다!",
      topNews ? `방금 뉴스 극장에서 "${String(topNews.title_ko || "").slice(0, 20)}..." 보고 왔어요!` : "AI 뉴스 아이맥스 극장 볼거리 많네요!",
      topModel ? `벤치마크 드롭타워 1위가 ${topModel.model}이라니!` : "벤치마크 드롭타워 낙하 쾌감 최고!",
      topSocial ? `소셜 라운지에서 ${topSocial.author} 포스트가 핫해요!` : "밤에 불꽃축제 보면서 대관람차 타야지!",
      "관리자님이 새로 만든 뱅크턴 각도가 예술이네요!",
    ];

    return { headline, sub, metricLine, guestLines };
  }

  syncAll(pavilionsList) {
    this._clear();
    for (const def of pavilionsList || []) {
      this._buildPavilion(def);
    }
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

    // Stepped plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.55, 7.8), createToonMaterial(0xffe8c2));
    plinth.position.y = 0.275;
    plinth.receiveShadow = true;
    addToonOutline(plinth, 1.025);
    root.add(plinth);

    // Main storybook architectural body
    const body = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.2, 6.4), wallMat);
    body.position.y = 2.65;
    body.castShadow = true;
    body.receiveShadow = true;
    addToonOutline(body, 1.03);
    root.add(body);

    // Cute striped awning above entrance
    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 1.5), stripeMat);
    awning.position.set(0, 3.25, 3.65);
    awning.rotation.x = 0.28;
    addToonOutline(awning, 1.05);
    root.add(awning);

    // Distinct storybook roof silhouette per AI domain
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

    // Floating cute domain gem topper on roof
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      createToonMaterial(0xffd166, { emissive: 0xf59e0b, emissiveIntensity: 0.3 })
    );
    gem.position.y = 7.9;
    addToonOutline(gem, 1.09);
    root.add(gem);

    // Glowing entrance portal
    const portal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.25), glassMat);
    portal.position.set(0, 1.9, 3.22);
    root.add(portal);

    // Marquee banner sign
    const signTex = this._makeMarqueeTexture(def.title, def.archiveKey.toUpperCase(), def.accent || "#e07a52");
    const marquee = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 1.25),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    marquee.position.set(0, 4.0, 3.25);
    root.add(marquee);

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData = { pickKind: "pavilion", id: def.id, archiveKey: def.archiveKey, title: def.title };
        this.pickables.push(obj);
      }
    });

    this.pavilions.set(def.archiveKey, { def, root, pos: root.position.clone() });
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

  getPavilionPosition(archiveKey) {
    return this.pavilions.get(archiveKey)?.pos?.clone() || new THREE.Vector3(0, 0, 20);
  }

  update(isNight) {
    for (const mat of this.nightLights) {
      mat.emissiveIntensity = isNight ? 1.5 : 0.35;
    }
  }

  dispose() {
    this._clear();
    this.scene.remove(this.group);
  }
}
