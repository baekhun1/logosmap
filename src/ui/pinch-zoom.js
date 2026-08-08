// 팝업 두 손가락 핀치 제스처 — bible_map_v22.html 원본의 독립 <script> 블록을 그대로 옮김.
import { map } from '../engine/app.js';

// 팝업 두 손가락 핀치 제스처 — 지도가 제스처를 가로채므로, 팝업 위에서는 직접 거리 변화를 계산해
// 같은 --ui-zoom 값을 조절한다(버튼과 동일한 배율을 공유).
(function(){
  function dist(t0, t1){
    var dx=t0.clientX-t1.clientX, dy=t0.clientY-t1.clientY;
    return Math.sqrt(dx*dx+dy*dy);
  }
  var startDist=null, startZoom=1;

  function onTouchStart(ev){
    if(ev.touches.length===2){
      startDist = dist(ev.touches[0], ev.touches[1]);
      startZoom = (window.__uiZoom && window.__uiZoom.get()) || 1;
      ev.preventDefault();
    }
  }
  function onTouchMove(ev){
    if(ev.touches.length===2 && startDist){
      var d = dist(ev.touches[0], ev.touches[1]);
      var ratio = d / startDist;
      var z = startZoom * ratio;
      if(window.__uiZoom) window.__uiZoom.setRaw(z);
      ev.preventDefault();
      ev.stopPropagation();
    }
  }
  function onTouchEnd(ev){
    if(ev.touches.length<2){
      startDist=null;
      if(window.__uiZoom) window.__uiZoom.commit();
    }
  }

  map.on('popupopen', function(e){
    var el = e.popup.getElement();
    if(!el) return;
    el.addEventListener('touchstart', onTouchStart, {passive:false});
    el.addEventListener('touchmove', onTouchMove, {passive:false});
    el.addEventListener('touchend', onTouchEnd, {passive:true});
    el.addEventListener('touchcancel', onTouchEnd, {passive:true});
  });
})();
