// 앱 진입점. Vite가 이 파일을 시작점으로 나머지 모듈을 번들링한다.
//
// 정적 import를 섞으면 ES 모듈 로딩 순서(의존성이 먼저, 소스 순서와 다를 수 있음)를
// 눈으로 따라가기 어려워지므로, 실행 순서가 실제로 중요한 이 초기화 단계는
// 전부 동적 import로 명시적인 순서를 강제한다.
import 'leaflet/dist/leaflet.css';
import './styles/main.css';

async function boot() {
  const { injectPersonColors } = await import('./styles/inject-person-colors.js');
  // 1) 인물 색상 CSS 커스텀 프로퍼티 주입 — 탭 버튼(var(--personId))보다 먼저.
  injectPersonColors();

  // 2) 헤더 높이 동기화를 먼저 실행 — #map의 top 오프셋(--header-h)이
  //    지도가 만들어지기 전에 정확한 값을 갖도록 한다.
  await import('./ui/header-sync.js');

  // 3) 팝업 글자 크기 컨트롤(window.setTextZoom / window.__uiZoom) 등록.
  await import('./ui/text-zoom.js');

  // 4) 지도 엔진 + UI 로직 — 로드 즉시 Leaflet 지도를 만들고 최초 렌더링까지 수행한다.
  const { switchMap } = await import('./engine/app.js');

  // 5) 상단 인물 탭 버튼을 데이터로부터 생성 (원본은 이 200여 개를 정적 HTML로 하드코딩했었음).
  const { renderPersonTabs } = await import('./ui/tabs.js');
  renderPersonTabs(document.getElementById('mapTabs'), (id, btn) => switchMap(id, btn));

  // 6) 팝업 위 핀치/휠 확대 — map이 이미 만들어진 뒤에 로드.
  await import('./ui/pinch-zoom.js');
  await import('./ui/wheel-zoom.js');
}

boot();
