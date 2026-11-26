import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function weeklylandDevSavePlugin() {
  return {
    name: 'weeklyland-dev-save',
    configureServer(server) {
      server.middlewares.use('/__weeklyland/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
          return;
        }
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
          size += chunk.length;
          if (size <= 2 * 1024 * 1024) chunks.push(chunk);
        });
        req.on('end', () => {
          if (size > 2 * 1024 * 1024) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
            return;
          }
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.coasters)) {
              throw new Error('Invalid park_world schema');
            }
            const outPath = resolve(__dirname, 'site/public/data/park_world.json');
            const tmpPath = `${outPath}.tmp`;
            fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), 'utf8');
            fs.renameSync(tmpPath, outPath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: 'site/public/data/park_world.json' }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
          }
        });
      });
    },
  };
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeJsonLd(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

function readPublicJson(filename) {
  try {
    const p = resolve(__dirname, 'site/public/data', filename);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 빌드 타임에 정적 HTML 요약(SSR 스냅샷)과 구조화 데이터(ItemList/FAQPage JSON-LD)를 주입합니다.
 * JS를 실행하지 않는 검색·AI 크롤러(Googlebot, Naver Yeti, PerplexityBot 등)가
 * 1차 원천 데이터를 원문 HTML에서 직접 인덱싱할 수 있으며, 브라우저 하이드레이션 시 기존 앱이 자연스럽게 대체합니다.
 */
function seoPrerenderPlugin() {
  return {
    name: 'aiweekly-seo-prerender',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const page = String(ctx.filename || '').replace(/\\/g, '/').split('/').pop();

        if (page === 'index.html') {
          const data = readPublicJson('latest.json');
          if (!data) return html;
          const rising = (data.rising || []).slice(0, 12);
          const classic = (data.classic || []).slice(0, 8);
          const all = [...rising, ...classic];
          const updated = escapeHtml(data.generated || data.generated_at || '');
          const itemsHtml = all.map((it) => {
            const url = escapeHtml(it.official_url || it.repo_url || `https://github.com/${it.id}`);
            const title = escapeHtml(it.title_ko || it.name || it.id);
            const sum = escapeHtml((it.summary_ko || it.catchphrase || '').slice(0, 140));
            const stars = Number(it.stars || 0).toLocaleString('en-US');
            const v7d = Number(it.velocity_7d || 0);
            const delta = v7d > 0 ? ` (+${v7d.toLocaleString('en-US')}/wk)` : '';
            return `<li><a href="${url}" rel="noopener">${title}</a><div>★ ${stars}${delta} · ${escapeHtml(it.category || '')}</div><p>${sum}</p></li>`;
          }).join('');
          const snapshot = `<section class="ssr-snapshot" aria-label="주간 인기 플러그인 요약"><h2>이번 주 뜨는 · 이미 유명한 Claude Code 도구 (${updated} 기준)</h2><ul>${itemsHtml}</ul></section>`;
          const itemListLd = safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `AI위클리 주간 Claude Code 도구 인덱스 (${data.generated || ''})`,
            numberOfItems: all.length,
            itemListElement: all.map((it, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: it.title_ko || it.name || it.id,
              url: it.official_url || it.repo_url || `https://github.com/${it.id}`,
            })),
          });
          const faqLd = safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'AI위클리는 어떤 도구와 데이터를 추적하나요?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'GitHub과 9개 개발자·소셜 커뮤니티에서 Claude Code 에이전트·스킬·하네스·MCP 주간 트렌드, 600개 이상 오픈소스 스타보드, 일일 AI 뉴스, 3출처 평균 AI 점유율 및 프론티어 LLM 벤치마크를 추적합니다.',
                },
              },
              {
                '@type': 'Question',
                name: '데이터 갱신 주기는 어떻게 되나요?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'AI 뉴스·소셜 피드·오픈소스 스타보드는 평일 매일 갱신하며, 주간 인기 플러그인 인덱스와 AI 점유율·성능 벤치마크는 매주 갱신합니다.',
                },
              },
            ],
          });
          return html
            .replace(/<div class="grid" id="grid">[\s\S]*?<\/div>\s*<\/main>/, `<div class="grid" id="grid">${snapshot}</div>\n  </main>`)
            .replace('</head>', `${itemListLd}\n${faqLd}\n</head>`);
        }

        if (page === 'news.html') {
          const data = readPublicJson('news_latest.json');
          if (!data || !Array.isArray(data.news)) return html;
          const items = data.news.slice(0, 18);
          const listHtml = items.map((n) => {
            const url = escapeHtml(n.url || '#');
            const title = escapeHtml(n.title_ko || n.title || '');
            const src = escapeHtml(n.source || n.platform || '');
            const sum = escapeHtml((n.summary_ko || '').replace(/\s+/g, ' ').slice(0, 220));
            return `<li><a href="${url}" rel="noopener">${title}</a><div>${src} · ${escapeHtml(n.publish_date || '')}</div><p>${sum}</p></li>`;
          }).join('');
          const snapshot = `<section class="ssr-snapshot" aria-label="일일 AI 뉴스 요약"><h2>${escapeHtml(data.summary || '오늘의 AI 기술 신호')}</h2><ul>${listHtml}</ul></section>`;
          const ld = safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `AI위클리 일일 AI 뉴스 (${data.version || ''})`,
            numberOfItems: items.length,
            itemListElement: items.map((n, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              item: {
                '@type': 'NewsArticle',
                headline: n.title_ko || n.title || '',
                url: n.url || 'https://ldk-hub.github.io/ai-weekly/news',
                datePublished: n.publish_date || data.generated_at,
                inLanguage: 'ko-KR',
              },
            })),
          });
          return html
            .replace(/<div id="news-feed-container">[\s\S]*?<\/div>\s*<\/main>/, `<div id="news-feed-container">${snapshot}</div>\n  </main>`)
            .replace('</head>', `${ld}\n</head>`);
        }

        if (page === 'social.html') {
          const data = readPublicJson('social_latest.json');
          if (!data || !Array.isArray(data.items)) return html;
          const items = data.items.slice(0, 15);
          const listHtml = items.map((s) => {
            const url = escapeHtml(s.url || '#');
            const title = escapeHtml(s.title_ko || (s.text || '').slice(0, 90));
            const author = escapeHtml(s.author || '');
            const plat = escapeHtml(s.platform || '');
            return `<li><a href="${url}" rel="noopener">${title}</a><div>${plat} · ${author}</div></li>`;
          }).join('');
          const snapshot = `<section class="ssr-snapshot" aria-label="AI 소셜 피드 요약"><h2>최신 AI 소셜 피드 (${escapeHtml(data.date || '')})</h2><ul>${listHtml}</ul></section>`;
          const ld = safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `AI위클리 소셜 피드 (${data.date || ''})`,
            numberOfItems: items.length,
            itemListElement: items.map((s, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: s.title_ko || (s.text || '').slice(0, 80),
              url: s.url || 'https://ldk-hub.github.io/ai-weekly/social',
            })),
          });
          return html
            .replace(/<section id="social-list"[^>]*>[\s\S]*?<\/section>/, `<section id="social-list" class="social-feed" aria-live="polite">${snapshot}</section>`)
            .replace('</head>', `${ld}\n</head>`);
        }

        if (page === 'starboard.html') {
          const data = readPublicJson('stars_summary.json');
          const reposMap = data?.meta?.repos || {};
          const ledger = data?.ledger || {};
          const rows = Object.keys(reposMap)
            .filter((id) => !reposMap[id]?.gone && Array.isArray(ledger[id]) && ledger[id].length > 0)
            .map((id) => {
              const hist = ledger[id];
              const last = hist[hist.length - 1];
              const prev = hist.length >= 2 ? hist[Math.max(0, hist.length - 8)] : last;
              const delta = (last.stars || 0) - (prev.stars || 0);
              return { id, stars: last.stars || 0, delta, desc: reposMap[id].desc_ko || reposMap[id].description || '' };
            })
            .sort((a, b) => b.delta - a.delta || b.stars - a.stars)
            .slice(0, 20);
          if (!rows.length) return html;
          const listHtml = rows.map((r) => `<li><a href="https://github.com/${escapeHtml(r.id)}" rel="noopener">${escapeHtml(r.id)}</a><div>★ ${r.stars.toLocaleString('en-US')} (+${r.delta.toLocaleString('en-US')})</div><p>${escapeHtml(r.desc.slice(0, 120))}</p></li>`).join('');
          const snapshot = `<section class="ssr-snapshot" aria-label="스타보드 상위 리포지토리"><h2>급성장 오픈소스 스타보드 Top 20 (${escapeHtml(data.updated_date || '')})</h2><ul>${listHtml}</ul></section>`;
          const ld = safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `AI위클리 스타보드 급성장 Top 20 (${data.updated_date || ''})`,
            numberOfItems: rows.length,
            itemListElement: rows.map((r, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: r.id,
              url: `https://github.com/${r.id}`,
            })),
          });
          return html
            .replace(/<div id="starboard-container">[\s\S]*?<\/div>\s*<\/main>/, `<div id="starboard-container">${snapshot}</div>\n  </main>`)
            .replace('</head>', `${ld}\n</head>`);
        }

        if (page === 'benchmarks.html') {
          const data = readPublicJson('benchmarks_latest.json');
          if (!data) return html;
          const shares = (data.market_shares || []).slice(0, 6);
          const models = (data.model_benchmarks || []).slice(0, 15);
          const shareRows = shares.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.provider)}</td><td>${Number(s.share_pct || 0).toFixed(1)}%</td></tr>`).join('');
          const modelRows = models.map((m) => `<tr><td>${escapeHtml(m.model)}</td><td>${escapeHtml(m.provider)}</td><td>${m.composite_score != null ? Number(m.composite_score).toFixed(1) : '-'}</td><td>${m.arena_elo ?? '-'}</td></tr>`).join('');
          const snapshot = `<section class="ssr-snapshot" aria-label="AI 점유율 및 프론티어 성능 요약"><h2>AI 서비스 3출처 평균 점유율 (${escapeHtml((data.updated_at || '').slice(0, 10))})</h2><table><thead><tr><th>서비스</th><th>제공사</th><th>점유율</th></tr></thead><tbody>${shareRows}</tbody></table><h2>프론티어 LLM 성능 리더보드 Top ${models.length}</h2><table><thead><tr><th>모델</th><th>제공사</th><th>종합점수</th><th>LMArena Elo</th></tr></thead><tbody>${modelRows}</tbody></table></section>`;
          const ld = safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `AI위클리 프론티어 LLM 리더보드 (${(data.updated_at || '').slice(0, 10)})`,
            numberOfItems: models.length,
            itemListElement: models.map((m, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: `${m.model} (${m.provider})`,
            })),
          });
          return html
            .replace(/<div id="benchmarks-container">[\s\S]*?<\/div>\s*<\/main>/, `<div id="benchmarks-container">${snapshot}</div>\n  </main>`)
            .replace('</head>', `${ld}\n</head>`);
        }

        return html;
      },
    },
  };
}

export default defineConfig({
  base: './',
  root: 'site',
  publicDir: 'public',
  plugins: [tailwindcss({ optimize: false }), weeklylandDevSavePlugin(), seoPrerenderPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'site/index.html'),
        news: resolve(__dirname, 'site/news.html'),
        starboard: resolve(__dirname, 'site/starboard.html'),
        benchmarks: resolve(__dirname, 'site/benchmarks.html'),
        social: resolve(__dirname, 'site/social.html'),
        sanctuary: resolve(__dirname, 'site/sanctuary.html'),
      },
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /node_modules[\\/]three/ },
            { name: 'vendor-trystero', test: /node_modules[\\/]trystero/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
});
