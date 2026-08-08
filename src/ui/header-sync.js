// 헤더 높이 동기화 (메인 스크립트와 독립 실행 — 항상 작동 보장)
// bible_map_v22.html 원본의 독립 <script> 블록을 그대로 옮김.
(function(){
  function setHeaderH(){
    var hdr=document.querySelector('header');
    if(hdr){
      var h=hdr.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-h', h+'px');
    }
  }
  setHeaderH();
  window.addEventListener('resize', setHeaderH);
  window.addEventListener('load', setHeaderH);
  if(document.readyState!=='complete'){
    document.addEventListener('DOMContentLoaded', setHeaderH);
  }
  // 폰트·렌더 지연 대응 재측정
  [100,300,600,1200].forEach(function(t){ setTimeout(setHeaderH, t); });
  // 헤더 크기 변화 실시간 감지
  if(window.ResizeObserver){
    var hdr=document.querySelector('header');
    if(hdr){ new ResizeObserver(setHeaderH).observe(hdr); }
  }
})();
