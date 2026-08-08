import { defineConfig } from 'vite';

export default defineConfig({
  // 정적 배포(Cloudflare Pages) 기준 — 루트 경로 서빙
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
