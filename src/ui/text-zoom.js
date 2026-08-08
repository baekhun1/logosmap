// 팝업 글자 크기(확대/축소) 컨트롤 — bible_map_v22.html 원본의 독립 <script> 블록을 그대로 옮김.
// window.setTextZoom, window.__uiZoom 을 노출해 pinch-zoom.js/wheel-zoom.js, 헤더의
// 가+ / 가- 버튼(onclick="setTextZoom(...)")이 그대로 동작한다.
// 글자 크기(확대/축소) 컨트롤 — 지도 팝업(지명 설명) 글자·크기 확대
(function(){
  var LEVELS=[1,1.15,1.3,1.5,1.75,2];
  var MIN_Z=1, MAX_Z=2.4;
  var idx=0, curZ=1;
  try{
    var saved=parseFloat(localStorage.getItem('bibleMapTextZoom'));
    if(!isNaN(saved)){
      var found=LEVELS.indexOf(saved);
      idx = found>=0 ? found : 0;
    }
  }catch(e){}

  function setRaw(z, persist){
    z = Math.max(MIN_Z, Math.min(MAX_Z, z));
    curZ = z;
    document.documentElement.style.setProperty('--ui-zoom', z);
    var lbl=document.getElementById('textZoomLabel');
    if(lbl) lbl.textContent = Math.round(z*100)+'%';
    if(persist){
      try{ localStorage.setItem('bibleMapTextZoom', String(z)); }catch(e){}
    }
  }

  function apply(){
    setRaw(LEVELS[idx], true);
  }

  window.setTextZoom=function(dir){
    if(dir===0){ idx=0; }
    else{ idx=Math.min(LEVELS.length-1, Math.max(0, idx+dir)); }
    apply();
  };

  // 다른 스크립트(핀치 줌)에서 쓸 수 있게 노출
  window.__uiZoom = {
    setRaw: function(z){ setRaw(z, false); },
    commit: function(){
      // 현재 값을 LEVELS 중 가장 가까운 값으로 스냅하지 않고, 그대로 저장(자연스러운 핀치 결과 유지)
      try{ localStorage.setItem('bibleMapTextZoom', String(curZ)); }catch(e){}
      // 버튼(+/-) 스텝 기준점도 현재 값에 맞춰 갱신
      var nearest=0, diff=Infinity;
      LEVELS.forEach(function(v,i){ var d=Math.abs(v-curZ); if(d<diff){diff=d; nearest=i;} });
      idx = nearest;
    },
    get: function(){ return curZ; }
  };

  apply();
})();
