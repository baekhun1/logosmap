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
    rolldownOptions: {
      output: {
        // 콘텐츠 데이터(지명 156개 + 여정 490개, 텍스트 대부분)를 앱 로직과 분리한
        // 별도 청크로 뺀다. 데이터는 자주 안 바뀌고 로직은 자주 바뀌므로, 이렇게
        // 나눠두면 로직만 고쳐도 브라우저가 이미 캐시해둔 데이터 청크는 재다운로드하지
        // 않는다. leaflet도 별도 vendor 청크로 분리해 같은 이유로 캐시 효율을 높인다.
        manualChunks(moduleId) {
          if (moduleId.includes('/src/data/places.js') || moduleId.includes('/src/data/journeys.js')) {
            return 'data-content';
          }
          if (moduleId.includes('/node_modules/leaflet/')) {
            return 'vendor-leaflet';
          }
        },
      },
    },
  },
});
