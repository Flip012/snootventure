import { defineConfig } from 'vite';

// `base` is injected per-branch by the GitHub Actions deploy workflow via the
// VITE_BASE env var (e.g. "/snootventure/<branch>/"). Locally it defaults to
// "/" so `npm run dev` and `npm run preview` just work.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    // Phaser is a single large dependency; the default 500 kB warning is noise.
    chunkSizeWarningLimit: 2000,
  },
});
