// Not part of tsconfig "include" — executed by Vite via esbuild, not typechecked.
import { defineConfig } from 'vite';

// VITE_BASE wird im CI aus dem Branchnamen gesetzt:
//   /snootventure/<branch>/
// Lokal (dev/preview) bleibt es '/'.
export default defineConfig({
  base: process.env['VITE_BASE'] ?? '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
