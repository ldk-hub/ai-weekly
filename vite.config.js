import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './', // Use relative paths for built assets
  root: 'site', // Set the root to the 'site' directory where index.html etc. live
  publicDir: 'public', // Static assets like latest.json go here (relative to root)
  build: {
    outDir: '../dist', // Output to the project root 'dist' folder
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'site/index.html'),
        news: resolve(__dirname, 'site/news.html'),
        starboard: resolve(__dirname, 'site/starboard.html')
      }
    }
  }
});
