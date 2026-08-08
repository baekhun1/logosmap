// 모바일 사이드바 오프캔버스 드로어 토글.
// 데스크톱(>768px)에서는 CSS가 이 클래스들을 무시하므로 아무 영향이 없다.
const MOBILE_QUERY = '(max-width: 768px)';

export function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!toggleBtn || !sidebar || !backdrop) return;

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function open() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    toggleBtn.setAttribute('aria-expanded', 'true');
  }
  function close() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
  function toggle() {
    if (sidebar.classList.contains('open')) close();
    else open();
  }

  toggleBtn.addEventListener('click', toggle);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) close();
  });

  // 데스크톱 폭으로 리사이즈되면 드로어 상태(열림 클래스)를 지워
  // 다시 모바일로 좁혔을 때 이상한 상태로 남지 않게 한다.
  window.addEventListener('resize', () => {
    if (!isMobile()) close();
  });

  // 사이드바의 지명 목록에서 항목을 고르면(selectPlace) 모바일에서는
  // 지도를 바로 볼 수 있도록 드로어를 자동으로 닫아준다.
  // app.js가 selectPlace를 window에 노출한 뒤에 감싸 씌운다.
  const origSelectPlace = window.selectPlace;
  if (typeof origSelectPlace === 'function') {
    window.selectPlace = function (...args) {
      const result = origSelectPlace.apply(this, args);
      if (isMobile()) close();
      return result;
    };
  }

  return { open, close, toggle };
}
