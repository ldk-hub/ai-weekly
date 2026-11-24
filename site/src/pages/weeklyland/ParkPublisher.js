/**
 * WeeklyLand Hybrid Publisher (Server Cost $0)
 * 1. Local Vite dev server: writes directly to site/public/data/park_world.json via /__weeklyland/save
 * 2. Production (GitHub Pages): commits via GitHub Contents API using session-only Fine-grained PAT
 *    (PAT is never stored in code or localStorage; memory/sessionStorage only)
 * 3. Blueprint JSON file export / import for portable backups
 */

const SESSION_PAT_KEY = "weeklyland-gh-pat-session";
const REPO_OWNER = "ldk-hub";
const REPO_NAME = "ai-weekly";
const TARGET_PATH = "site/public/data/park_world.json";

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class ParkPublisher {
  constructor(worldState) {
    this.worldState = worldState;
  }

  isLocalDev() {
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  }

  getSessionPat() {
    try {
      return sessionStorage.getItem(SESSION_PAT_KEY) || "";
    } catch {
      return "";
    }
  }

  setSessionPat(token) {
    try {
      const clean = String(token || "").trim();
      if (clean) sessionStorage.setItem(SESSION_PAT_KEY, clean);
      else sessionStorage.removeItem(SESSION_PAT_KEY);
    } catch {}
  }

  async saveToLocalDev() {
    const json = this.worldState.exportBlueprintString();
    const res = await fetch("/__weeklyland/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      throw new Error(body.error || `로컬 저장 실패 (HTTP ${res.status})`);
    }
    this.worldState.markPublished();
    return { mode: "local", path: body.path || TARGET_PATH };
  }

  async publishToGitHub(patToken, commitMessage = "feat(sanctuary): update WeeklyLand 3D park world") {
    const token = String(patToken || this.getSessionPat()).trim();
    if (!token) {
      throw new Error("GitHub Fine-grained PAT를 입력해 주세요 (Contents: Read & Write 권한).");
    }
    this.setSessionPat(token);

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${TARGET_PATH}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    let sha = undefined;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
    } else if (getRes.status !== 404) {
      const errData = await getRes.json().catch(() => ({}));
      throw new Error(errData.message || `GitHub 조회 실패 (HTTP ${getRes.status})`);
    }

    const content = utf8ToBase64(this.worldState.exportBlueprintString());
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMessage,
        content,
        sha,
        branch: "main",
      }),
    });

    const putBody = await putRes.json().catch(() => ({}));
    if (!putRes.ok) {
      throw new Error(putBody.message || `GitHub 커밋 실패 (HTTP ${putRes.status})`);
    }

    this.worldState.markPublished();
    return {
      mode: "github",
      commitUrl: putBody.commit?.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/commits/main`,
    };
  }

  downloadBlueprint() {
    const json = this.worldState.exportBlueprintString();
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weeklyland-blueprint-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
