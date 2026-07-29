#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { load, record } = require('./build-stars-ledger');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'data', 'stars_ledger.json');
const META_PATH = path.join(ROOT, 'data', 'stars_meta.json');
const LATEST_PATH = path.join(ROOT, 'site', 'public', 'data', 'latest.json');

function mergeSamples(ledger, oldId, newId) {
  const oldSamples = ledger[oldId] || [];
  const newSamples = ledger[newId] || [];
  
  const merged = {};
  for (const s of newSamples) merged[s.date] = s.stars;
  for (const s of oldSamples) {
    if (merged[s.date] !== undefined) merged[s.date] = Math.max(merged[s.date], s.stars);
    else merged[s.date] = s.stars;
  }
  
  const res = Object.keys(merged).sort().map(date => ({ date, stars: merged[date] }));
  ledger[newId] = res;
  delete ledger[oldId];
}

function checkSuspect(samples, newStars) {
  if (!samples || samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  const prevStars = sorted[sorted.length - 1].stars;
  if (newStars <= prevStars * 0.7) {
    return `stars_dropped:${prevStars}→${newStars}`;
  }
  return null;
}

function checkDormant(samples) {
  if (!samples || samples.length < 2) return null;
  const sorted = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date);
  
  let has84Days = false;
  for (const s of sorted) {
    if (s.date === latest.date) continue;
    const pastDate = new Date(s.date);
    const diffDays = (latestDate - pastDate) / 86400000;
    if (diffDays >= 84) {
      has84Days = true;
      if (latest.stars <= s.stars) return true;
    }
  }
  return has84Days ? false : null;
}

function selfCheck() {
  console.log("Running selfcheck...");
  const testLedger = {
    "old/repo": [{ date: "2026-01-01", stars: 10 }, { date: "2026-01-02", stars: 12 }],
    "new/repo": [{ date: "2026-01-02", stars: 15 }, { date: "2026-01-03", stars: 20 }]
  };
  mergeSamples(testLedger, "old/repo", "new/repo");
  if (testLedger["old/repo"]) {
    console.error("Selfcheck failed: old/repo not deleted");
    process.exit(1);
  }
  if (testLedger["new/repo"].find(s => s.date === "2026-01-02").stars !== 15) {
    console.error("Selfcheck failed: merge Math.max failed");
    process.exit(1);
  }
  if (testLedger["new/repo"].length !== 3) {
    console.error("Selfcheck failed: merge length failed");
    process.exit(1);
  }

  const susp = checkSuspect([{ date: "2026-01-01", stars: 100 }], 70);
  if (susp !== "stars_dropped:100→70") {
    console.error("Selfcheck failed: suspect failed");
    process.exit(1);
  }
  const susp2 = checkSuspect([{ date: "2026-01-01", stars: 100 }], 71);
  if (susp2 !== null) {
    console.error("Selfcheck failed: suspect should be null for > 70%");
    process.exit(1);
  }

  const dormant1 = checkDormant([{ date: "2025-01-01", stars: 100 }, { date: "2026-01-01", stars: 100 }]); 
  if (dormant1 !== true) {
    console.error("Selfcheck failed: dormant check failed (should be true)");
    process.exit(1);
  }
  
  const dormant2 = checkDormant([{ date: "2025-01-01", stars: 100 }, { date: "2026-01-01", stars: 101 }]); 
  if (dormant2 !== false) {
    console.error("Selfcheck failed: dormant check failed (should be false)");
    process.exit(1);
  }
  
  const dormant3 = checkDormant([{ date: "2026-01-01", stars: 100 }]);
  if (dormant3 !== null) {
    console.error("Selfcheck failed: dormant check failed (should be null)");
    process.exit(1);
  }

  console.log("Selfcheck passed.");
  process.exit(0);
}

function getToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const token = execSync('gh auth token --hostname github.com', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (token) return token;
  } catch(e) {}
  console.error("Error: No GitHub token found. Provide GH_TOKEN, GITHUB_TOKEN, or use `gh auth`");
  process.exit(1);
}

async function fetchRepo(id, token) {
  const res = await fetch(`https://api.github.com/repos/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ai-weekly-stars-collector'
    }
  });
  if (res.status === 404) return { status: 404 };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    status: 200,
    full_name: data.full_name,
    stargazers_count: data.stargazers_count,
    pushed_at: data.pushed_at,
    archived: data.archived
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isSelfCheck = args.includes('--selfcheck');
  
  if (isSelfCheck) {
    selfCheck();
  }
  
  const ledger = load();
  const populationSet = new Set(Object.keys(ledger));
  
  if (fs.existsSync(LATEST_PATH)) {
    try {
      const latest = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
      for (const it of (latest.rising || [])) populationSet.add(it.id);
      for (const it of (latest.classic || [])) populationSet.add(it.id);
    } catch (e) {
      console.warn("Failed to parse latest.json");
    }
  }
  
  const population = Array.from(populationSet);
  
  if (isDryRun) {
    console.log(`[DRY-RUN] Target population: ${population.length} repositories`);
    console.log(`[DRY-RUN] Expected GitHub API calls: ${population.length}`);
    process.exit(0);
  }
  
  const token = getToken();
  
  let meta = { generated_at: new Date().toISOString(), repos: {} };
  if (fs.existsSync(META_PATH)) {
    try {
      const oldMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
      if (oldMeta.repos) meta.repos = oldMeta.repos;
    } catch(e) {}
  }
  meta.generated_at = new Date().toISOString();
  
  const today = new Date().toISOString().slice(0, 10);
  
  let successCount = 0;
  let notFoundCount = 0;
  let renameCount = 0;
  let suspectCount = 0;
  
  const chunks = [];
  for (let i = 0; i < population.length; i += 8) {
    chunks.push(population.slice(i, i + 8));
  }
  
  let attempts = 0;
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async id => {
      attempts++;
      try {
        const repoData = await fetchRepo(id, token);
        if (repoData.status === 404) {
          notFoundCount++;
          successCount++; // 404 is a successful determination
          meta.repos[id] = meta.repos[id] || {};
          meta.repos[id].gone = true;
          return;
        }
        
        let canonicalId = repoData.full_name;
        if (canonicalId !== id) {
          renameCount++;
          mergeSamples(ledger, id, canonicalId);
          meta.repos[canonicalId] = meta.repos[canonicalId] || {};
          meta.repos[canonicalId].aliases = meta.repos[canonicalId].aliases || [];
          if (!meta.repos[canonicalId].aliases.includes(id)) {
            meta.repos[canonicalId].aliases.push(id);
          }
        }
        
        const newStars = repoData.stargazers_count;
        const suspectMsg = checkSuspect(ledger[canonicalId], newStars);
        if (suspectMsg) {
          suspectCount++;
          console.warn(`[WARN] Suspect drop for ${canonicalId}: ${suspectMsg}`);
        }
        
        record(ledger, canonicalId, today, newStars);
        const isDormant = checkDormant(ledger[canonicalId]);
        
        meta.repos[canonicalId] = meta.repos[canonicalId] || {};
        meta.repos[canonicalId].pushed_at = repoData.pushed_at;
        meta.repos[canonicalId].archived = repoData.archived;
        meta.repos[canonicalId].checked_at = today;
        meta.repos[canonicalId].gone = false;
        meta.repos[canonicalId].suspect = suspectMsg || meta.repos[canonicalId].suspect;
        meta.repos[canonicalId].dormant = isDormant;
        
        successCount++;
      } catch (e) {
        console.error(`Failed ${id}: ${e.message}`);
      }
    }));
  }
  
  const successRate = attempts === 0 ? 1 : successCount / attempts;
  console.log(`\n--- Summary ---`);
  console.log(`Targets: ${attempts}`);
  console.log(`Success: ${successCount} (${Math.round(successRate * 100)}%)`);
  console.log(`404 Gone: ${notFoundCount}`);
  console.log(`Renames: ${renameCount}`);
  console.log(`Suspects: ${suspectCount}`);
  
  if (successRate < 0.5) {
    console.error("Success rate below 50%. Aborting save to preserve data.");
    process.exit(1);
  }
  
  // Atomic writes to data/
  const tmpMeta = `${META_PATH}.tmp`;
  fs.writeFileSync(tmpMeta, JSON.stringify(meta, null, 2));
  fs.renameSync(tmpMeta, META_PATH);
  
  const tmpLedger = `${LEDGER_PATH}.tmp`;
  fs.writeFileSync(tmpLedger, JSON.stringify(ledger, null, 2));
  fs.renameSync(tmpLedger, LEDGER_PATH);
  
  // Mirror to site/public/data/ for frontend
  const PUBLIC_DATA_DIR = path.join(ROOT, 'site', 'public', 'data');
  if (fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.copyFileSync(META_PATH, path.join(PUBLIC_DATA_DIR, 'stars_meta.json'));
    fs.copyFileSync(LEDGER_PATH, path.join(PUBLIC_DATA_DIR, 'stars_ledger.json'));
  }
  
  console.log("Data saved successfully.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
