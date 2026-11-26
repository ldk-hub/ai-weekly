import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import fs from 'node:fs';

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

export default defineConfig({
  base: './',
  root: 'site',
  publicDir: 'public',
  plugins: [tailwindcss(), weeklylandDevSavePlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'site/index.html'),
        news: resolve(__dirname, 'site/news.html'),
        starboard: resolve(__dirname, 'site/starboard.html'),
        benchmarks: resolve(__dirname, 'site/benchmarks.html'),
        social: resolve(__dirname, 'site/social.html'),
        sanctuary: resolve(__dirname, 'site/sanctuary.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/trystero')) {
            return 'vendor-trystero';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
