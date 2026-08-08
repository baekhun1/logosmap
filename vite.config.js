import { defineConfig } from 'vite';

export default defineConfig({
  // 정적 배포(Cloudflare Pages/Workers) 기준 — 루트 경로 서빙
  base: './',
  // 빈 배열이라도 반드시 필요: Cloudflare 배포(wrangler)가 최초 배포 시 이 배열에
  // 자체 Vite 플러그인을 자동으로 주입한다. 배열 자체가 없으면 그 자동 설정이
  // "Cannot modify Vite config: could not find a valid plugins array" 로 실패한다.
  plugins: [],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
