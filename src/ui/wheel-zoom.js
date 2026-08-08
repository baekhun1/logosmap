// 데스크탑 Ctrl/Cmd + 휠로 팝업 글자 크기 조절 — bible_map_v22.html 원본의 독립 <script> 블록을 그대로 옮김.
import { map } from '../engine/app.js';

// 데스크탑 마우스 휠 확대 — 팝업 위에서 Ctrl(맥은 Cmd/트랙패드 핀치)을 누른 채 휠을 돌리면
// 브라우저 페이지 확대나 지도 확대 대신 팝업 배율(--ui-zoom)이 조절된다.
// Ctrl 없이 휠만 돌리면 평소처럼 팝업 내용을 스크롤한다.
(function(){
  var wheelTimer=null;

  function onWheel(ev){
    if(!(ev.ctrlKey || ev.metaKey)) return; // Ctrl(윈도우)/Cmd(맥) 없으면 일반 스크롤 유지
    ev.preventDefault();
    ev.stopPropagation();
    if(!window.__uiZoom) return;
    var cur = window.__uiZoom.get();
    var delta = -ev.deltaY * 0.0015; // 위로 굴리면 확대, 아래로 굴리면 축소
    window.__uiZoom.setRaw(cur * (1 + delta));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function(){ window.__uiZoom.commit(); }, 250);
  }

  map.on('popupopen', function(e){
    var el = e.popup.getElement();
    if(!el) return;
    el.addEventListener('wheel', onWheel, {passive:false});
  });
})();
