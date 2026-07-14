#!/usr/bin/env bash
# Weekly GitHub Release publisher
# Creates a release with this week's version tag + Top 3 summary
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
LATEST="$PROJECT_DIR/site/public/data/latest.json"

if [[ ! -f "$LATEST" ]]; then
  echo "latest.json not found, skipping release"
  exit 0
fi

VERSION=$(node -p "JSON.parse(require('fs').readFileSync('$LATEST','utf8')).version || ''")
if [[ -z "$VERSION" ]]; then
  echo "no version in latest.json, skipping"
  exit 0
fi

TAG="$VERSION"

# Skip if release already exists
if gh release view "$TAG" --repo ldk-hub/ai-weekly >/dev/null 2>&1; then
  echo "release $TAG already exists, skipping"
  exit 0
fi

# Build release notes from latest.json
NOTES=$(node -e "
const d = JSON.parse(require('fs').readFileSync('$LATEST','utf8'));
const rising = (d.rising||[]).slice(0,5);
const classic = (d.classic||[]).slice(0,3);
let out = '## 🔥 이번 주 뜨는 (Rising)\n\n';
rising.forEach((r, i) => {
  out += \`\${i+1}. **[\${r.title_ko||r.id}](\${r.official_url||'#'})** — \${r.catchphrase||''}\n\`;
  out += \`   \\\`\${r.id}\\\` · ★\${r.stars||0} · score \${r.trend_score||0}\n\n\`;
});
out += '## ⭐ 이미 자리잡은 (Classic)\n\n';
classic.forEach((r, i) => {
  out += \`\${i+1}. **[\${r.title_ko||r.id}](\${r.official_url||'#'})** — \${r.catchphrase||''}\n\`;
  out += \`   \\\`\${r.id}\\\` · ★\${r.stars||0}\n\n\`;
});
out += '---\n\n';
out += '📊 [전체 보기](https://ldk-hub.github.io/ai-weekly/) · 📡 [RSS](https://ldk-hub.github.io/ai-weekly/feed.xml)\n';
out += '\n매주 월요일 09:00 KST 자동 갱신.';
process.stdout.write(out);
")

echo "$NOTES" > /tmp/release-notes.md

gh release create "$TAG" \
  --repo ldk-hub/ai-weekly \
  --title "$TAG · $(date +%Y-%m-%d) 주간 트렌드" \
  --notes-file /tmp/release-notes.md \
  || echo "⚠ release create failed"

echo "✓ release $TAG published"
