// 지도 렌더링 엔진 + UI 상호작용(검색/필터/팝업/탭 전환) — bible_map_v22.html 원본의
// 메인 <script> 블록(TILES 정의부터 초기화까지)을 그대로 옮긴 것.
//
// 원본에서 렌더링 로직과 UI 상태(currentFilter, selectedId, markers ...)가 서로 강하게
// 얽혀 있어(예: renderAll이 렌더링과 UI 갱신을 함께 수행, selectPlace가 지도 전환까지 담당)
// 이번 1단계 리팩토링에서는 이 파일을 무리하게 "엔진"과 "UI"로 쪼개지 않고 하나의 모듈로
// 옮기는 쪽을 택했다 — 데이터 분리가 더 값어치 있고, 잘못 쪼개면 상태 버그가 나기 쉬웠기 때문.
// (엔진/UI 분리는 이 파일이 더 커지면 다음 리팩토링 단계에서 다룰 것)
import L from 'leaflet';
import { REGIONS, REGION_COLORS, REGION_LABELS, MAP_REGIONS } from '../data/regions.js';
import { PLACES } from '../data/places.js';
import { JOURNEY_PLACES } from '../data/journeys.js';
import { ROUTES } from '../data/routes.js';
import { MAP_COLORS, MAP_LABELS, ERA_PERSONS, REGION_PERSONS, NT_PERSON_MAPS, PERSON_TAB_COLORS } from '../data/persons.js';
import { PERSON_TABS } from '../data/person-tabs.js';
import { OT_NT_LINKS, NT_OT_LINKS, EVENT_XREFS, XREF_BY_PLACE, findEventXrefs, ALL_XREFS } from '../data/xrefs.js';

// 원본에서 같은 <script> 블록 안에서 TILES보다 앞서 선언되어 있던 앱 상태.
// (원본 라인: let currentFilter=...; let expandedEras={}; let xrefViewMode=false;
//  const PERSON_LABEL={}, PERSON_COLOR={}; — 데이터가 아니라 UI 상태라 data/ 폴더로
//  옮기지 않고 이 파일에 그대로 둔다.)
let currentFilter='all', searchQuery='', selectedId=null, markers={};
let expandedEras = {};
let xrefViewMode = false;
const PERSON_LABEL = {}, PERSON_COLOR = {};

const TILES={
  dark:      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
               {attribution:'© OpenStreetMap © CARTO',maxZoom:19}),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
               {attribution:'Tiles © Esri',maxZoom:19}),
  street:    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
               {attribution:'Tiles © Esri',maxZoom:19}),
  google:    L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=ko&gl=KR&x={x}&y={y}&z={z}',
               {subdomains:['mt0','mt1','mt2','mt3'],maxZoom:20,attribution:'© Google Maps'}),
  // 사무엘
  sa_birth:'#7abcdc', sa_ministry:'#6aaccc', sa_kingdom:'#5a9cbc',
  // 솔로몬
  so_temple:'#d4a830', so_glory:'#c49820', so_fall:'#b48810',
  // 엘리야
  el_start:'#4caf8a', el_kerith:'#3c9f7a', el_carmel:'#5cbf9a', el_horeb:'#2c8f6a', el_ascend:'#6ccfaa',
  // 베드로
  pe_galilee:'#e87070', pe_jerusalem:'#d86060', pe_antioch:'#c85050', pe_rome:'#f88080',

  sa_birth:'탄생·성장기', sa_ministry:'순회 사역기', sa_kingdom:'왕국 수립기',
  so_temple:'성전 건축기', so_glory:'왕국 번영기', so_fall:'타락·분열기',
  el_start:'선지자 시작', el_kerith:'그릿 시냇가 피신', el_carmel:'갈멜 산 대결', el_horeb:'호렙 산 도피', el_ascend:'승천 준비',
  pe_galilee:'갈릴리 사역', pe_jerusalem:'예루살렘 초대교회', pe_antioch:'안디옥·이방 선교', pe_rome:'로마 이송',

  // ── 사무엘 경로
  sa_birth:    [[31.86,35.14],[31.95,35.30]],
  sa_ministry: [[31.95,35.30],[31.86,35.14],[31.81,35.01],[32.10,35.22],[31.95,35.30]],
  sa_kingdom:  [[31.95,35.30],[31.53,35.10],[32.21,35.29]],
  // ── 솔로몬 경로
  so_temple:   [[31.77,35.23],[31.78,35.24]],
  so_glory:    [[31.77,35.23],[29.50,34.90],[28.54,33.97],[29.97,32.82]],
  so_fall:     [[31.77,35.23],[31.77,35.23]],
  // ── 엘리야 경로
  el_start:    [[32.56,35.55],[31.83,35.54]],
  el_kerith:   [[31.83,35.54],[31.83,35.62]],
  el_carmel:   [[31.83,35.62],[32.74,34.99]],
  el_horeb:    [[32.74,34.99],[29.65,34.85],[28.54,33.97]],
  el_ascend:   [[28.54,33.97],[31.86,35.54],[31.77,35.23]],
  // ── 베드로 경로
  pe_galilee:  [[32.70,35.30],[32.88,35.58],[32.10,35.22],[31.77,35.23]],
  pe_jerusalem:[[31.77,35.23],[31.86,35.14],[31.53,35.10],[32.21,35.29]],
  pe_antioch:  [[31.77,35.23],[33.51,36.29]],
  pe_rome:     [[33.51,36.29],[40.64,22.94],[41.90,12.50]],
};
let currentTile='google';

const map=L.map('map',{center:[31.5,35.5],zoom:7,zoomControl:true,layers:[TILES.google]});
map.zoomControl.setPosition('bottomright');

// 팝업 안에서는 지도의 핀치(손가락 확대/축소) 제스처를 가로채지 않고
// 브라우저 기본 핀치 줌이 그대로 동작하도록 터치 이벤트 전파를 막는다.
map.on('popupopen', e => {
  const el = e.popup.getElement();
  if (!el) return;
  el.style.touchAction = 'auto';
  ['touchstart','touchmove','touchend'].forEach(evt => {
    el.addEventListener(evt, ev => ev.stopPropagation(), {passive:true});
  });
});

function makeIcon(color,selected=false,virtual=false){
  const r=selected?11:8;
  if (virtual) {
    // 가상 지명: 실제 지리적 위치가 아닌 서신서 등의 신학적 논증을 표시 — 점선 다이아몬드로 구분
    const s = selected ? 10 : 7.5;
    const glow = selected?`<circle cx="12" cy="12" r="${s+6}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.35"/>`:'';
    const diamond=`<rect x="${12-s*0.7}" y="${12-s*0.7}" width="${s*1.4}" height="${s*1.4}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="${selected?1.6:1.2}" stroke-dasharray="3,2" transform="rotate(45 12 12)"/>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${glow}${diamond}</svg>`;
    return L.divIcon({className:'',html:`<div style="position:relative;width:24px;height:24px">${svg}</div>`,
      iconSize:[24,24],iconAnchor:[12,12],popupAnchor:[0,-14]});
  }
  const glow=selected?`<circle cx="12" cy="12" r="${r+5}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.4"/>` :'';
  const ring=`<circle cx="12" cy="12" r="${r+2}" fill="none" stroke="${color}" stroke-width="${selected?1.2:0.8}" opacity="${selected?0.6:0.35}"/>`;
  const dot=`<circle cx="12" cy="12" r="${r}" fill="${color}" stroke="${selected?'#fff':color}" stroke-width="${selected?2:1}" opacity="${selected?1:0.9}"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${glow}${ring}${dot}</svg>`;
  return L.divIcon({className:'',html:`<div style="position:relative;width:24px;height:24px">${svg}</div>`,
    iconSize:[24,24],iconAnchor:[12,12],popupAnchor:[0,-14]});
}

function commentaryHTML(e){
  if(!e || (!e.bg && !e.sig)) return '';
  var rows = '';
  if(e.bg){
    rows += '<div style="display:flex;gap:6px;margin-top:4px">'
      +'<span style="flex:none;font-size:calc(9px * var(--ui-zoom));font-weight:700;color:#8fb4d8;'
      +'background:rgba(96,160,216,0.12);border:1px solid rgba(96,160,216,0.3);'
      +'border-radius:3px;padding:1px 5px;height:fit-content;letter-spacing:1px">\uBC30\uACBD</span>'
      +'<span style="font-size:calc(11px * var(--ui-zoom));line-height:1.65;color:#b9c4cf">'+e.bg+'</span>'
      +'</div>';
  }
  if(e.sig){
    rows += '<div style="display:flex;gap:6px;margin-top:4px">'
      +'<span style="flex:none;font-size:calc(9px * var(--ui-zoom));font-weight:700;color:#d8b46f;'
      +'background:rgba(200,169,110,0.14);border:1px solid rgba(200,169,110,0.35);'
      +'border-radius:3px;padding:1px 5px;height:fit-content;letter-spacing:1px">\uC758\uBBF8</span>'
      +'<span style="font-size:calc(11px * var(--ui-zoom));line-height:1.65;color:#d9cbb0">'+e.sig+'</span>'
      +'</div>';
  }
  return '<div style="margin-top:6px;padding:7px 9px;'
    +'background:linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015));'
    +'border-left:2px solid var(--accent);border-radius:0 5px 5px 0">'+rows+'</div>';
}
// ── 성경구절 확인 · 원어(히브리어/헬라어) 연결 ──────────────────────────
// 팝업의 각 사건 하단에 "성경 본문 보기"(개역한글, bible.com)와
// "원어 보기"(히브리어/헬라어 대조, biblehub.com interlinear) 버튼을 붙여준다.
const KOREAN_BOOKS = {
  창:{code:'GEN',blb:'genesis'}, 출:{code:'EXO',blb:'exodus'}, 레:{code:'LEV',blb:'leviticus'},
  민:{code:'NUM',blb:'numbers'}, 신:{code:'DEU',blb:'deuteronomy'}, 수:{code:'JOS',blb:'joshua'},
  삿:{code:'JDG',blb:'judges'}, 룻:{code:'RUT',blb:'ruth'}, 룻기:{code:'RUT',blb:'ruth'},
  삼상:{code:'1SA',blb:'1_samuel'}, 삼하:{code:'2SA',blb:'2_samuel'},
  왕상:{code:'1KI',blb:'1_kings'}, 왕하:{code:'2KI',blb:'2_kings'},
  대상:{code:'1CH',blb:'1_chronicles'}, 대하:{code:'2CH',blb:'2_chronicles'},
  스:{code:'EZR',blb:'ezra'}, 에스라:{code:'EZR',blb:'ezra'}, 느:{code:'NEH',blb:'nehemiah'},
  에:{code:'EST',blb:'esther'}, 욥:{code:'JOB',blb:'job'}, 시:{code:'PSA',blb:'psalms'},
  잠:{code:'PRO',blb:'proverbs'}, 전:{code:'ECC',blb:'ecclesiastes'}, 아:{code:'SNG',blb:'song_of_solomon'},
  사:{code:'ISA',blb:'isaiah'}, 렘:{code:'JER',blb:'jeremiah'}, 애:{code:'LAM',blb:'lamentations'},
  겔:{code:'EZK',blb:'ezekiel'}, 단:{code:'DAN',blb:'daniel'}, 호:{code:'HOS',blb:'hosea'},
  욜:{code:'JOL',blb:'joel'}, 암:{code:'AMO',blb:'amos'}, 옵:{code:'OBA',blb:'obadiah'},
  욘:{code:'JON',blb:'jonah'}, 미:{code:'MIC',blb:'micah'}, 나:{code:'NAM',blb:'nahum'},
  합:{code:'HAB',blb:'habakkuk'}, 습:{code:'ZEP',blb:'zephaniah'}, 학:{code:'HAG',blb:'haggai'},
  슥:{code:'ZEC',blb:'zechariah'}, 말:{code:'MAL',blb:'malachi'},
  마:{code:'MAT',blb:'matthew'}, 막:{code:'MRK',blb:'mark'}, 눅:{code:'LUK',blb:'luke'},
  요:{code:'JHN',blb:'john'}, 행:{code:'ACT',blb:'acts'}, 롬:{code:'ROM',blb:'romans'},
  고전:{code:'1CO',blb:'1_corinthians'}, 고후:{code:'2CO',blb:'2_corinthians'}, 갈:{code:'GAL',blb:'galatians'},
  엡:{code:'EPH',blb:'ephesians'}, 빌:{code:'PHP',blb:'philippians'}, 골:{code:'COL',blb:'colossians'},
  살전:{code:'1TH',blb:'1_thessalonians'}, 살후:{code:'2TH',blb:'2_thessalonians'},
  딤전:{code:'1TI',blb:'1_timothy'}, 딤후:{code:'2TI',blb:'2_timothy'}, 딛:{code:'TIT',blb:'titus'},
  몬:{code:'PHM',blb:'philemon'}, 히:{code:'HEB',blb:'hebrews'}, 약:{code:'JAS',blb:'james'},
  벧전:{code:'1PE',blb:'1_peter'}, 벧후:{code:'2PE',blb:'2_peter'},
  요일:{code:'1JN',blb:'1_john'}, 요이:{code:'2JN',blb:'2_john'}, 요삼:{code:'3JN',blb:'3_john'},
  유:{code:'JUD',blb:'jude'}, 계:{code:'REV',blb:'revelation'}
};
function bibleLinksHTML(ref) {
  if (!ref) return '';
  const m = ref.match(/^([가-힣]+)\s*(\d+)(?:\s*[:장]\s*(\d+))?/);
  if (!m) return '';
  const book = KOREAN_BOOKS[m[1]];
  if (!book) return '';
  const chap = m[2], verse = m[3] || '1';
  const bibleUrl = `https://www.bible.com/ko/bible/88/${book.code}.${chap}.${verse}.KRV`;
  const origUrl = `https://biblehub.com/interlinear/${book.blb}/${chap}-${verse}.htm`;
  return '<div style="display:flex;gap:5px;margin-top:4px">'
    + `<a href="${bibleUrl}" target="_blank" rel="noopener" style="flex:1;text-align:center;font-size:calc(9px * var(--ui-zoom));padding:3px 6px;border-radius:5px;border:1px solid #4a9edd55;background:#4a9edd14;color:#4a9edd;text-decoration:none;font-family:inherit;white-space:nowrap">📖 본문 보기</a>`
    + `<a href="${origUrl}" target="_blank" rel="noopener" style="flex:1;text-align:center;font-size:calc(9px * var(--ui-zoom));padding:3px 6px;border-radius:5px;border:1px solid #c8a84a55;background:#c8a84a14;color:#c8a84a;text-decoration:none;font-family:inherit;white-space:nowrap">🔤 원어 보기</a>`
    + '</div>';
}

// ── 인쇄 / PDF 저장 ──────────────────────────────────────────────
// 팝업 내용을 깔끔한 흑백 인쇄용 문서로 새 창에 열고 인쇄 대화상자를 띄운다.
// 사용자가 그 대화상자에서 "PDF로 저장"을 선택하면 PDF로도 저장된다.
function printPopupContent(btn) {
  const wrap = btn.closest('.popup-wrap');
  if (!wrap) return;
  const clone = wrap.cloneNode(true);
  clone.querySelectorAll('.no-print').forEach(el => el.remove());
  // 지도 이동용 onclick(예: 구약·신약 연결, 바로가기)은 인쇄물에서 무의미하므로 제거
  clone.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
  const titleEl = wrap.querySelector('.popup-name');
  const title = titleEl ? titleEl.textContent.trim() : '성경 지명·인물';
  const dateStr = new Date().toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'});
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { alert('팝업 차단 기능 때문에 인쇄 창을 열 수 없습니다. 이 사이트의 팝업 차단을 해제해주세요.'); return; }
  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>' + title + ' — 인쇄</title>' +
    '<style>' +
    "  @page{ margin:2cm; }" +
    "  *{ box-sizing:border-box; }" +
    "  body{ font-family:'Noto Sans KR','Malgun Gothic',sans-serif; color:#1a1a1a; background:#fff; max-width:720px; margin:0 auto; padding:28px 20px; line-height:1.75; }" +
    "  * { color:#1a1a1a !important; background:transparent !important; border-color:#ccc !important; }" +
    "  .print-header{ display:flex; justify-content:space-between; align-items:baseline; border-bottom:2px solid #333; padding-bottom:8px; margin-bottom:18px; }" +
    "  .print-header h1{ font-size:15px; margin:0; font-weight:700; }" +
    "  .print-header span{ font-size:11px; color:#666 !important; }" +
    "  .popup-badge{ display:inline-block; padding:2px 9px; border-radius:3px; font-size:11px; font-weight:600; border:1px solid #999 !important; margin-right:5px; }" +
    "  .popup-name{ font-size:22px; font-weight:800; margin:10px 0 2px; }" +
    "  .popup-name-en{ font-size:13px; color:#666 !important; margin-bottom:10px; }" +
    "  .popup-sec-title{ font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#555 !important; margin:16px 0 8px; border-bottom:1px solid #ccc; padding-bottom:4px; }" +
    "  .popup-event, div[style*='border-left']{ border-left:3px solid #999 !important; padding-left:12px; margin-bottom:16px; page-break-inside:avoid; }" +
    "  .popup-time{ font-size:11px; color:#777 !important; font-weight:600; margin-bottom:2px; }" +
    "  .popup-type{ font-size:12px; font-weight:700; margin-bottom:2px; }" +
    "  .popup-person{ font-size:12px; color:#555 !important; margin-bottom:4px; }" +
    "  .popup-desc{ font-size:13px; line-height:1.8; margin-bottom:6px; }" +
    "  .popup-ref{ font-size:12px; font-weight:600; margin-top:4px; }" +
    "  a{ color:#1a56db !important; text-decoration:underline; word-break:break-all; }" +
    "  .print-footer{ margin-top:28px; padding-top:10px; border-top:1px solid #ccc; font-size:10px; color:#999 !important; }" +
    "</style></head><body>" +
    '<div class="print-header"><h1>성경 지명·인물 통합지도</h1><span>' + dateStr + ' 출력</span></div>' +
    clone.outerHTML +
    '<div class="print-footer">이 인쇄물은 학습·연구 참고용입니다. 성경 본문은 저작권자(대한성서공회 등)의 원문을 확인하시기 바랍니다.</div>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 350);
}

function buildPopup(p){
  const col=(REGIONS[p.region]||{}).color||'#8a8a8a', rlbl=p._regionLabel||(REGIONS[p.region]||{}).label||'인물 여정';
  const era=p._eraLabel||(p.testament==='ot'?'구약성경':'신약성경');
  const eraCol=p.testament==='ot'?'#c8a84a':'#4a9edd';
  // geo를 파이프(|)로 분리: 위치 | 고도
  const geoParts = (p.geo||'').split('|');
  const geoLoc  = geoParts[0].trim();
  const geoElev = geoParts.length > 1 ? geoParts[1].trim() : '';
  // 고도 숫자 추출 및 강조
  const elevHtml = geoElev
    ? '<div style="display:inline-flex;align-items:center;gap:5px;'
      +'margin-top:5px;padding:3px 9px;background:rgba(96,208,240,0.12);'
      +'border:1px solid rgba(96,208,240,0.3);border-radius:4px;">'
      +'<span style="font-size:calc(10px * var(--ui-zoom));color:#60d0f0">🏔</span>'
      +'<span style="font-size:calc(11px * var(--ui-zoom));color:#60d0f0;font-weight:700">'
      +geoElev.replace(/^고도[：:]\s*/,'')+'</span>'
      +'</div>'
    : '';
  const evHTML=p.events.map(e=>{
    const xrefs = findEventXrefs(p.id, e.ref);
    const xrefHTML = xrefs.map(xref=>{
      const otherPlace = PLACES.find(pl=>pl.id===xref.otherPlaceId) || JOURNEY_PLACES.find(pl=>pl.id===xref.otherPlaceId);
      const dirCol = p.testament==='ot' ? '#4a9edd' : '#c8a84a';
      const dirIcon = p.testament==='ot' ? '✝' : '📜';
      return '<div style="margin-top:6px;padding:6px 9px;cursor:pointer;'
        +'background:'+dirCol+'14;border:1px solid '+dirCol+'55;border-radius:5px;border-left:3px solid '+dirCol+'" '
        +'onclick="selectPlace(\''+xref.otherPlaceId+'\')">'
        +'<div style="font-size:calc(9px * var(--ui-zoom));font-weight:700;color:'+dirCol+';letter-spacing:.5px">'+dirIcon+' '+xref.type+' · '+xref.label+'</div>'
        +'<div style="font-size:calc(10px * var(--ui-zoom));color:#b8b0a0;line-height:1.5;margin-top:2px">'+xref.note+'</div>'
        +(otherPlace?'<div style="font-size:calc(10px * var(--ui-zoom));color:'+dirCol+';text-decoration:underline dotted;margin-top:3px;font-weight:600">→ '+otherPlace.name+' 바로가기</div>':'')
        +'</div>';
    }).join('');
    return '<div class="popup-event">'
    +'<div class="popup-time">'+e.time+(e.__src?' <span style="opacity:.6;font-weight:400">· '+e.__src+'</span>':'')+'</div>'
    +'<div class="popup-ev-body">'
    +'<div class="popup-type" style="font-size:calc(10px * var(--ui-zoom));font-weight:700;color:var(--accent);margin-bottom:2px">'+(e.type||'')+'</div>'
    +'<div class="popup-person">👤 '+e.persons+'</div>'
    +'<div class="popup-desc">'+e.desc+'</div>'
    +commentaryHTML(e)
    +xrefHTML
    +'<div class="popup-ref">'+e.ref+'</div>'
    +bibleLinksHTML(e.ref)
    +'</div></div>';
  }).join('');
  // 구약↔신약 연결 섹션 생성
  let linkHTML = '';
  const PLACES_MAP = {};
  PLACES.forEach(pl => { PLACES_MAP[pl.id] = pl; });

  if(p.testament === 'nt' && OT_NT_LINKS[p.id]) {
    const link = OT_NT_LINKS[p.id];
    const otItems = link.otIds.map(otId => {
      const otPlace = PLACES_MAP[otId];
      return otPlace
        ? '<span style="cursor:pointer;color:#c8a84a;text-decoration:underline dotted;font-weight:600" '
          +'onclick="selectPlace(\''+otId+'\')">'
          +otPlace.name+'</span>'
        : '';
    }).filter(Boolean).join(' · ');
    if(otItems) {
      linkHTML = '<div style="margin:8px 0;padding:7px 10px;'
        +'background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.3);'
        +'border-radius:5px;border-left:3px solid #c8a84a">'
        +'<div style="font-size:calc(10px * var(--ui-zoom));font-weight:700;color:#c8a84a;margin-bottom:4px">📜 구약 동일/인접 지명</div>'
        +'<div style="font-size:calc(11px * var(--ui-zoom));color:#e0d0a0;margin-bottom:3px">'+otItems+'</div>'
        +'<div style="font-size:calc(10px * var(--ui-zoom));color:#a09070;line-height:1.5">'+link.note+'</div>'
        +'</div>';
    }
  } else if(p.testament === 'ot' && NT_OT_LINKS[p.id]) {
    const ntLinks = NT_OT_LINKS[p.id];
    const ntItems = ntLinks.map(({ntId}) => {
      const ntPlace = PLACES_MAP[ntId];
      return ntPlace
        ? '<span style="cursor:pointer;color:#4a9edd;text-decoration:underline dotted;font-weight:600" '
          +'onclick="selectPlace(\''+ntId+'\')">'
          +ntPlace.name+'</span>'
        : '';
    }).filter(Boolean).join(' · ');
    if(ntItems) {
      linkHTML = '<div style="margin:8px 0;padding:7px 10px;'
        +'background:rgba(74,158,221,0.08);border:1px solid rgba(74,158,221,0.3);'
        +'border-radius:5px;border-left:3px solid #4a9edd">'
        +'<div style="font-size:calc(10px * var(--ui-zoom));font-weight:700;color:#4a9edd;margin-bottom:4px">✝ 신약 동일/인접 지명</div>'
        +'<div style="font-size:calc(11px * var(--ui-zoom));color:#a0c8f0;margin-bottom:3px">'+ntItems+'</div>'
        +'<div style="font-size:calc(10px * var(--ui-zoom));color:#7090b0;line-height:1.5">'+ntLinks[0].note+'</div>'
        +'</div>';
    }
  }

  return '<div class="popup-wrap">'
    +'<div style="display:flex;gap:5px;margin-bottom:5px;align-items:center">'
    +'<div class="popup-badge" style="background:'+eraCol+'22;color:'+eraCol+'">'+era+'</div>'
    +'<div class="popup-badge" style="background:'+col+'22;color:'+col+'">'+rlbl+'</div>'
    +'</div>'
    +'<div class="popup-name">'+p.name+'</div>'
    +'<div class="popup-name-en">'+(p.nameEn||'')+'</div>'
    +'<div style="font-size:calc(11px * var(--ui-zoom));color:#a0b4c8;margin-bottom:4px;line-height:1.6;'
    +'padding:5px 8px;background:rgba(255,255,255,0.05);border-radius:5px 5px 0 0;'
    +'border-left:2px solid #3a5a7a">📍 '+geoLoc+'</div>'
    +(p.virtual ? '<div style="font-size:calc(10px * var(--ui-zoom));color:#c8a84a;margin:4px 0 8px;line-height:1.6;padding:5px 8px;background:rgba(200,168,74,0.1);border:1px dashed rgba(200,168,74,0.4);border-radius:5px">◆ 이 위치는 실제 역사적 지명이 아니라, 서신서 등에서 다뤄지는 신학적 주제를 표시하기 위해 관련 지역 인근에 둔 상징적 지점입니다.</div>' : '')
    +elevHtml
    +linkHTML
    +'<div style="margin-bottom:10px"></div>'
    +'<div class="popup-sec-title">연대 · 인물 · 사건</div>'
    +evHTML
    +'<button class="no-print" onclick="printPopupContent(this)" style="width:100%;margin-top:10px;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--muted);cursor:pointer;font-family:inherit;font-size:calc(10px * var(--ui-zoom));font-weight:600">🖨 인쇄 / PDF로 저장</button>'
    +'</div>';
}
// (참고: selectPlace 함수 정의는 아래쪽에 통합되어 있음 — 필터·인물여정 모드와 무관하게 항상 동작하도록 보완됨)



;



const style=document.createElement('style');
style.textContent=`
  .leaflet-tooltip{background:rgba(13,12,16,0.85)!important;border:1px solid #2e2a38!important;
    border-radius:4px!important;color:#c8c2b6!important;font-size:9px!important;
    font-family:"Noto Sans KR",sans-serif!important;padding:2px 7px!important;
    box-shadow:none!important;white-space:nowrap!important;}
  .leaflet-tooltip::before{display:none!important;}`;
document.head.appendChild(style);

// ⑤ 확장 함수들

let currentMap = 'all';
let showRoutes = false;
let _switching = false;
let routeLines = [];

function isJourneyMode() { return currentMap !== 'all'; }

let currentJourneyFilter = 'all';

function filterJourneyRegion(rk) {
  currentJourneyFilter = rk;
  selectedId = null;
  map.closePopup();
  renderAll();
}

// ── 연대 문자열에서 정렬 가능한 연도 추출 (BC는 음수, AD는 양수) ──
function parseYear(t) {
  if (!t) return null;
  const bc = t.match(/BC\s*(\d+)/);
  if (bc) return -parseInt(bc[1], 10);
  const ad = t.match(/AD\s*(\d+)/);
  if (ad) return parseInt(ad[1], 10);
  return null;
}

// ── 지명에서 시대별 수식어(괄호·병기)를 뗀 "기본 지명" 추출 ──
function baseNameOf(n) {
  return (n||'').replace(/\s*[(（][^)）]*[)）]/g, '').trim().split('·')[0].trim();
}
// ── 두 좌표 사이 거리(km, 하버사인) ──
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// ── 같은 시대(region)+같은 좌표(동일 지명)를 하나로 합쳐 사건을 연대순 정렬 ──
// 검색 중일 때는 시대(region) 구분 없이, "기본 지명"이 같고 인접(12km 이내)한 항목을
// 좌표가 정확히 일치하지 않아도 하나로 통합한다 (예: "예루살렘"과 "예루살렘 (요시야 개혁)").
// 반대로 기본 지명이 다르면 좌표가 우연히 같아도(반올림 충돌) 별개로 유지한다.
function getMergedPlaces(list) {
  if (!searchQuery) {
    const groups = {};
    const order = [];
    list.forEach(p => {
      const key = p.region + '|' + p.lat + ',' + p.lng;
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(p);
    });
    return order.map(key => mergeItems(groups[key]));
  }
  const clusters = []; // { base, lat, lng, items }
  list.forEach(p => {
    const base = baseNameOf(p.name);
    let cluster = null;
    if (base) {
      cluster = clusters.find(c =>
        c.base && (c.base === base || c.base.startsWith(base) || base.startsWith(c.base)) &&
        distKm(c.lat, c.lng, p.lat, p.lng) <= 12
      );
    }
    if (!cluster) { cluster = { base, lat: p.lat, lng: p.lng, items: [] }; clusters.push(cluster); }
    cluster.items.push(p);
  });
  return clusters.map(c => mergeItems(c.items));
}

function eventYearCompare(a, b) {
  const ya = parseYear(a.time), yb = parseYear(b.time);
  if (ya !== null && yb !== null) return ya - yb;
  if (ya !== null) return -1;
  if (yb !== null) return 1;
  return 0;
}

function mergeItems(items) {
    if (items.length === 1) {
      const it = items[0];
      // 단일 지명도 사건을 연대순 정렬 (원본 훼손 없이 복사본 반환)
      return Object.assign({}, it, { events: (it.events||[]).slice().sort(eventYearCompare) });
    }
    const events = [];
    items.forEach(it => it.events.forEach(e => events.push(Object.assign({}, e, {__src: e.__src || it.name}))));
    events.sort(eventYearCompare);
    // 괄호 수식어·병기 지명 제거 후 공통 기본 지명 추출 (예: "예루살렘·랍바 (우리아)" → "예루살렘")
    const stripKo = n => (n||'').replace(/\s*[(（][^)）]*[)）]/g, '').trim().split('·')[0].trim();
    const baseNames = items.map(i => stripKo(i.name)).filter(Boolean);
    const shortKo = baseNames.length ? baseNames.reduce((a,b)=>b.length<a.length?b:a) : '';
    const sameBase = shortKo && baseNames.every(b => b === shortKo || b.startsWith(shortKo));
    const stripEn = n => (n||'').split('—')[0].replace(/\s*[(（][^)）]*[)）]/g, '').trim();
    const baseEnArr = items.map(i => stripEn(i.nameEn)).filter(Boolean);
    const shortEn = baseEnArr.length ? baseEnArr.reduce((a,b)=>b.length<a.length?b:a) : '';
    const sameBaseEn = shortEn && baseEnArr.every(b => b === shortEn || b.startsWith(shortEn));
    const uniqRegions = [...new Set(items.flatMap(i => i._regions || [i.region]))];
    const uniqTest = [...new Set(items.flatMap(i => i._testaments || [i.testament]))];
    const allIds = [];
    items.forEach(i => { if (i._mergedIds) allIds.push(...i._mergedIds); else allIds.push(i.id); });
    return {
      id: allIds.join('__'),
      _merged: true,
      _mergedIds: allIds,
      _regionLabel: uniqRegions.length > 1 ? uniqRegions.map(r => (REGIONS[r]||{}).label||r).join(' → ') : null,
      _eraLabel: uniqTest.length > 1 ? '구약·신약' : null,
      _regions: uniqRegions,
      _testaments: uniqTest,
      name: sameBase ? shortKo : items.map(i => i.name).join(' · '),
      nameEn: sameBaseEn ? shortEn : items.map(i => i.nameEn).filter(Boolean).join(' · '),
      testament: items[0].testament,
      region: items[0].region,
      lat: items[0].lat, lng: items[0].lng,
      geo: items[0].geo,
      events
    };
}

// ── 메인 지도 검색 풀: 검색 중에는 인물 여정(JOURNEY_PLACES) 데이터도 포함 ──
function adaptJourneyForSearch(p) {
  // testament가 없는 여정 항목은 우선 인물(map 키)로 구약/신약을 판정한다.
  // 예수·세례요한 등 신약 인물의 탄생 사건은 연대가 "BC 6~4년"처럼 BC로 표기되므로,
  // 연대 부호만으로 판정하면 구약으로 잘못 분류되는 문제가 있었음 — 인물 기준을 우선한다.
  let t;
  if (p.map && NT_PERSON_MAPS.has(p.map)) {
    t = 'nt';
  } else {
    t = 'ot';
    for (const e of (p.events||[])) {
      const y = parseYear(e.time);
      if (y !== null) { t = y < 0 ? 'ot' : 'nt'; break; }
    }
  }
  return Object.assign({}, p, { testament: p.testament || t });
}
function getMainSearchPool() {
  if (!searchQuery || isJourneyMode()) return PLACES;
  const q = searchQuery.toLowerCase();
  const seen = {};
  const extra = JOURNEY_PLACES.filter(p => {
    const hit = p.name.toLowerCase().includes(q) || (p.nameEn||'').toLowerCase().includes(q) ||
                (p.events||[]).some(e=>(e.persons||'').toLowerCase().includes(q));
    if (!hit || seen[p.id]) return false;
    seen[p.id] = true;
    return true;
  }).map(adaptJourneyForSearch);
  return PLACES.concat(extra);
}

function isVisible(p) {
  if (isJourneyMode()) {
    if (p.map !== currentMap) return false;
    if (currentJourneyFilter !== 'all' && p.region !== currentJourneyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.nameEn||'').toLowerCase().includes(q) ||
             (p.events||[]).some(e=>(e.persons||'').toLowerCase().includes(q));
    }
    return true;
  }
  if (currentFilter === 'ot' && (REGIONS[p.region]?.testament || p.testament) !== 'ot') return false;
  if (currentFilter === 'nt' && (REGIONS[p.region]?.testament || p.testament) !== 'nt') return false;
  if (currentFilter !== 'all' && currentFilter !== 'ot' && currentFilter !== 'nt' && p.region !== currentFilter) return false;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.nameEn||'').toLowerCase().includes(q) ||
           p.events.some(e=>(e.persons||'').toLowerCase().includes(q));
  }
  return true;
}

function renderLegend() {
  const otEl = document.getElementById('legendItems-ot');
  const ntEl = document.getElementById('legendItems-nt');
  const allBtnWrap = document.getElementById('legend-title-all');
  if (!otEl) return;
  if (isJourneyMode()) {
    if (allBtnWrap) allBtnWrap.style.display = '';
    const mcol = MAP_COLORS[currentMap]||'#888';
    const regions = MAP_REGIONS[currentMap]||[];
    const allActive = currentJourneyFilter === 'all';
    const titOt = document.getElementById('legend-title-ot');
    const titNt = document.getElementById('legend-title-nt');
    if (titOt) titOt.innerHTML = `<span>${MAP_LABELS[currentMap]||currentMap} 여정</span>`;
    if (titNt) titNt.style.display = 'none';
    if (ntEl)  ntEl.style.display  = 'none';

    let html = `<div class="legend-item journey-filter-btn" data-rk="all" style="cursor:pointer;margin-bottom:4px;${allActive?'background:rgba(255,255,255,0.12);border:1px solid #888;border-radius:5px;':''}">
      <div class="legend-dot" style="background:#aaa${allActive?';box-shadow:0 0 6px #aaa':''}"></div>
      <span class="legend-label" style="color:${allActive?'#fff':'#aaa'};${allActive?'font-weight:700':''}">전체 보기</span>
      <span class="legend-count">${JOURNEY_PLACES.filter(q=>q.map===currentMap).length}</span>
      ${allActive?'<span style="font-size:9px;color:#fff;margin-left:2px">✓</span>':''}
    </div>`;
    regions.forEach(rk=>{
      const col=REGION_COLORS[rk]||mcol, lbl=REGION_LABELS[rk]||rk;
      const cnt=JOURNEY_PLACES.filter(q=>q.map===currentMap&&q.region===rk).length;
      const isAct = currentJourneyFilter === rk;
      html += `<div class="legend-item journey-filter-btn" data-rk="${rk}" style="cursor:pointer;${isAct?`border:1px solid ${col};background:${col}22;border-radius:5px;`:''}">
        <div class="legend-dot" style="background:${col}${isAct?`;box-shadow:0 0 6px ${col}`:''}"></div>
        <span class="legend-label" style="color:${col};${isAct?'font-weight:700':''}">${lbl}</span>
        <span class="legend-count">${cnt}</span>
        ${isAct?`<span style="font-size:9px;color:${col};margin-left:2px">✓</span>`:''}
      </div>`;
    });
    otEl.innerHTML = html;
    otEl.querySelectorAll('.journey-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => filterJourneyRegion(btn.dataset.rk));
    });
    return;
  }
  // ── 전체 모드: 구약/신약 레전드 복원 ──
  if (allBtnWrap) allBtnWrap.style.display = '';
  const titOt2 = document.getElementById('legend-title-ot');
  const titNt2 = document.getElementById('legend-title-nt');
  const otTotal = Object.values(ERA_PERSONS).reduce((s,arr)=>s+arr.length,0);
  const ntTotal = new Set(Object.values(REGION_PERSONS).flat()).size;
  if (titOt2) titOt2.innerHTML = `<span>📅 시대별 (구약) · 총 ${otTotal}명</span><button id="btn-ot-all" onclick="filterTestament('ot')" style="font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--muted);cursor:pointer;font-family:inherit;transition:all .15s">구약 전체</button>`;
  if (titNt2) { titNt2.innerHTML = `<span>🗺 권역별 (신약) · 총 ${ntTotal}명</span><button id="btn-nt-all" onclick="filterTestament('nt')" style="font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--muted);cursor:pointer;font-family:inherit;transition:all .15s">신약 전체</button>`; titNt2.style.display = ''; }
  if (ntEl)   ntEl.style.display = '';
  const makeItem=([key,r])=>{
    const act=currentFilter===key;
    const persons=(r.testament==='ot'?ERA_PERSONS[key]:REGION_PERSONS[key])||[];
    const isExp=!!expandedEras[key];
    const arrow=persons.length?`<span class="era-toggle" data-era="${key}" title="소속 인물 보기" style="cursor:pointer;font-size:9px;color:var(--muted);padding:2px 4px;display:inline-block;transition:transform .15s;${isExp?'transform:rotate(90deg)':''}">▶</span>`:'';
    const personsHtml=persons.length?`<div class="era-persons" style="display:${isExp?'flex':'none'};flex-wrap:wrap;gap:4px;padding:6px 6px 8px 22px;">
      ${persons.map(pk=>`<button class="era-person-chip" data-person="${pk}" style="font-size:10px;padding:2px 7px;border-radius:10px;border:1px solid ${(PERSON_COLOR[pk]||'#8ac97a')}55;background:${(PERSON_COLOR[pk]||'#8ac97a')}18;color:${PERSON_COLOR[pk]||'#8ac97a'};cursor:pointer;font-family:inherit;white-space:nowrap;">${PERSON_LABEL[pk]||pk}</button>`).join('')}
    </div>`:'';
    return `<div>
      <div class="legend-item" onclick="filterRegion('${key}',null)" style="display:flex;align-items:center;">
        <div class="legend-dot" style="background:${r.color}${act?`;box-shadow:0 0 5px ${r.color}`:''}"></div>
        <span class="legend-label" style="${act?`color:${r.color};font-weight:600`:''}">${r.label}</span>
        <span class="legend-count" title="이 시대(권역)에 등록된 인물 수">${persons.length}명</span>
        ${arrow}
      </div>
      ${personsHtml}
    </div>`;
  };
  const tit = otEl.previousElementSibling;
  // tit은 titOt2와 같은 요소 — 이미 위에서 처리됨
  otEl.innerHTML=Object.entries(REGIONS).filter(([,v])=>v.testament==='ot').map(makeItem).join('');
  ntEl.innerHTML=Object.entries(REGIONS).filter(([,v])=>v.testament==='nt').map(makeItem).join('');
  [otEl, ntEl].forEach(el=>{
    if(!el) return;
    el.querySelectorAll('.era-toggle').forEach(t=>{
      t.addEventListener('click', ev=>{
        ev.stopPropagation();
        const k=t.dataset.era;
        expandedEras[k]=!expandedEras[k];
        renderLegend();
      });
    });
    el.querySelectorAll('.era-person-chip').forEach(c=>{
      c.addEventListener('click', ev=>{
        ev.stopPropagation();
        switchMap(c.dataset.person, null);
      });
    });
  });
  // 구약전체·신약전체 버튼 활성 스타일
  const btnAll = document.getElementById('btn-view-all');
  const btnOt = document.getElementById('btn-ot-all');
  const btnNt = document.getElementById('btn-nt-all');
  if (btnAll) {
    const isAllActive = currentFilter === 'all';
    btnAll.style.color      = isAllActive ? '#8ac97a' : 'var(--muted)';
    btnAll.style.borderColor= isAllActive ? '#8ac97a' : 'var(--border)';
    btnAll.style.fontWeight = isAllActive ? '700' : '600';
    btnAll.style.background = isAllActive ? 'rgba(138,201,122,0.14)' : 'rgba(255,255,255,0.06)';
  }
  if (btnOt) {
    btnOt.style.color      = currentFilter==='ot' ? '#c8a84a' : 'var(--muted)';
    btnOt.style.borderColor= currentFilter==='ot' ? '#c8a84a' : 'var(--border)';
    btnOt.style.fontWeight = currentFilter==='ot' ? '700'      : '400';
    btnOt.style.background = currentFilter==='ot' ? 'rgba(200,168,74,0.12)' : 'rgba(255,255,255,0.06)';
  }
  if (btnNt) {
    btnNt.style.color      = currentFilter==='nt' ? '#4a9edd' : 'var(--muted)';
    btnNt.style.borderColor= currentFilter==='nt' ? '#4a9edd' : 'var(--border)';
    btnNt.style.fontWeight = currentFilter==='nt' ? '700'      : '400';
    btnNt.style.background = currentFilter==='nt' ? 'rgba(74,158,221,0.12)' : 'rgba(255,255,255,0.06)';
  }
}

function renderList() {
  const el=document.getElementById('placeList'); if(!el) return;
  if (xrefViewMode) {
    const v=document.getElementById('vcnt'); if(v) v.textContent=ALL_XREFS.length;
    let html = `<div style="font-size:9px;letter-spacing:1.5px;color:#c8a84a;padding:6px 8px 2px;text-transform:uppercase;opacity:.85">🔗 구약·신약 연결 (${ALL_XREFS.length})</div>`;
    html += ALL_XREFS.map(x => {
      const aPlace = PLACES.find(p=>p.id===x.a.placeId) || JOURNEY_PLACES.find(p=>p.id===x.a.placeId);
      const bPlace = PLACES.find(p=>p.id===x.b.placeId) || JOURNEY_PLACES.find(p=>p.id===x.b.placeId);
      return `<div style="margin:0 8px 8px;padding:8px 10px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:7px">
        <div style="font-size:9px;font-weight:700;color:#c8a84a;letter-spacing:.5px;margin-bottom:3px">${x.type}</div>
        <div style="font-size:12px;font-weight:600;line-height:1.4;margin-bottom:5px">${x.label}</div>
        <div style="font-size:10px;color:var(--muted);line-height:1.5;margin-bottom:7px">${x.note.length>90?x.note.slice(0,90)+'…':x.note}</div>
        <div style="display:flex;gap:5px">
          <button onclick="selectPlace('${x.a.placeId}')" style="flex:1;font-size:10px;padding:4px 6px;border-radius:5px;border:1px solid #4a9edd55;background:#4a9edd14;color:#4a9edd;cursor:pointer;font-family:inherit">📜 ${aPlace?aPlace.name:'구약'} 보기</button>
          <button onclick="selectPlace('${x.b.placeId}')" style="flex:1;font-size:10px;padding:4px 6px;border-radius:5px;border:1px solid #c8a84a55;background:#c8a84a14;color:#c8a84a;cursor:pointer;font-family:inherit">✝ ${bPlace?bPlace.name:'신약'} 보기</button>
        </div>
      </div>`;
    }).join('');
    el.innerHTML = html;
    return;
  }
  if (isJourneyMode()) {
    const vis=JOURNEY_PLACES.filter(isVisible);
    if(!vis.length){el.innerHTML='<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">검색 결과 없음</div>';return;}
    const byR={};
    vis.forEach(q=>{if(!byR[q.region])byR[q.region]=[];byR[q.region].push(q);});
    let html='';
    Object.entries(byR).forEach(([rk,ps])=>{
      const col=REGION_COLORS[rk]||MAP_COLORS[currentMap]||'#888', lbl=REGION_LABELS[rk]||rk;
      html+=`<div style="font-size:9px;letter-spacing:1.5px;color:${col};padding:6px 8px 2px;text-transform:uppercase;opacity:.85">${lbl}</div>`;
      html+=ps.map(q=>`<div class="place-item${q.id===selectedId?' selected':''}" onclick="selectPlace('${q.id}')"><div class="pi-dot" style="${q.virtual?`background:transparent;border:1.5px dashed ${col};transform:rotate(45deg);border-radius:2px`:`background:${col}`}"></div><div><div class="pi-name">${q.name}${q.virtual?' <span style="font-size:9px;color:#c8a84a;font-weight:400">◆주제</span>':''}</div><div class="pi-region">${q.nameEn||''}</div></div></div>`).join('');
    });
    el.innerHTML=html;
    const v=document.getElementById('vcnt'); if(v) v.textContent=vis.length; return;
  }
  const vis=getMergedPlaces(getMainSearchPool().filter(isVisible)),
        ot=vis.filter(q=>(q._testaments||[q.testament]).includes('ot')),
        nt=vis.filter(q=>(q._testaments||[q.testament]).includes('nt'));
  let html='';
  if(ot.length){
    html+=`<div style="font-size:9px;letter-spacing:2px;color:var(--muted);padding:6px 8px 2px;text-transform:uppercase">📅 구약 (${ot.length})</div>`;
    html+=ot.map(q=>{const col=(REGIONS[q.region]||{}).color||'#8a8a8a';const sel=q._merged?(q.id===selectedId||q._mergedIds.includes(selectedId)):q.id===selectedId;const navId=q._merged?q._mergedIds[0]:q.id;return `<div class="place-item${sel?' selected':''}" onclick="selectPlace('${navId}')"><div class="pi-dot" style="${q.virtual?`background:transparent;border:1.5px dashed ${col};transform:rotate(45deg);border-radius:2px`:`background:${col}`}"></div><div><div class="pi-name">${q.name}${q.virtual?' <span style="font-size:9px;color:#c8a84a;font-weight:400">◆주제</span>':''}</div><div class="pi-region">${q._regionLabel||(REGIONS[q.region]||{}).label||q.nameEn||''}</div></div></div>`;}).join('');
  }
  if(nt.length){
    html+=`<div style="font-size:9px;letter-spacing:2px;color:var(--muted);padding:6px 8px 2px;text-transform:uppercase">🗺 신약 (${nt.length})</div>`;
    html+=nt.map(q=>{const col=(REGIONS[q.region]||{}).color||'#8a8a8a';const sel=q._merged?(q.id===selectedId||q._mergedIds.includes(selectedId)):q.id===selectedId;const navId=q._merged?q._mergedIds[0]:q.id;return `<div class="place-item${sel?' selected':''}" onclick="selectPlace('${navId}')"><div class="pi-dot" style="${q.virtual?`background:transparent;border:1.5px dashed ${col};transform:rotate(45deg);border-radius:2px`:`background:${col}`}"></div><div><div class="pi-name">${q.name}${q.virtual?' <span style="font-size:9px;color:#c8a84a;font-weight:400">◆주제</span>':''}</div><div class="pi-region">${q._regionLabel||(REGIONS[q.region]||{}).label||q.nameEn||''}</div></div></div>`;}).join('');
  }
  el.innerHTML=html;
  const v=document.getElementById('vcnt'),t=document.getElementById('tcnt');
  if(v)v.textContent=vis.length; if(t)t.textContent=PLACES.length;
}

function renderMarkers() {
  Object.values(markers).forEach(m=>map.removeLayer(m)); markers={};
  const hasSel=!!selectedId;

  if (isJourneyMode()) {
    const src=JOURNEY_PLACES;
    const vis=src.filter(isVisible);
    vis.forEach(place=>{
      const col=REGION_COLORS[place.region]||MAP_COLORS[place.map]||'#888';
      const sel=place.id===selectedId;
      const marker=L.marker([place.lat,place.lng],{icon:makeIcon(col,sel,!!place.virtual),opacity:hasSel&&!sel?.3:1,zIndexOffset:sel?1000:0});
      marker.bindTooltip(place.name,{permanent:true,direction:'top',offset:[0,sel?-14:-10],className:'',pane:'tooltipPane'});
      marker.on('add',()=>{const tt=marker.getTooltip();if(tt&&tt.getElement()){tt.getElement().style.cssText=`background:${sel?col+'33':'rgba(13,12,16,0.85)'};border:1px solid ${sel?col:'#2e2a38'};border-radius:4px;padding:2px 7px;color:${sel?col:'#c8c2b6'};font-size:${sel?'11px':'9px'};font-weight:${sel?700:400};font-family:"Noto Sans KR",sans-serif;box-shadow:none;white-space:nowrap;opacity:${hasSel&&!sel?0.45:1};`;}});
      marker.bindPopup(buildPopupAll(place),{maxWidth:640,minWidth:320,autoPan:true,autoPanPadding:[20,20],keepInView:false,closeButton:true});
      marker.on('click',()=>selectPlace(place.id));
      marker.on('popupclose',()=>{if(selectedId===place.id && !_switching){selectedId=null;renderAll();}});
      marker.addTo(map); markers[place.id]=marker;
    });
  } else {
    const visRaw=getMainSearchPool().filter(isVisible);
    const merged=getMergedPlaces(visRaw);
    merged.forEach(place=>{
      const col=(REGIONS[place.region]||{}).color||'#8a8a8a';
      const sel=place._merged ? (place.id===selectedId || place._mergedIds.includes(selectedId)) : place.id===selectedId;
      const marker=L.marker([place.lat,place.lng],{icon:makeIcon(col,sel,!!place.virtual),opacity:hasSel&&!sel?.3:1,zIndexOffset:sel?1000:0});
      marker.bindTooltip(place.name,{permanent:true,direction:'top',offset:[0,sel?-14:-10],className:'',pane:'tooltipPane'});
      marker.on('add',()=>{const tt=marker.getTooltip();if(tt&&tt.getElement()){tt.getElement().style.cssText=`background:${sel?col+'33':'rgba(13,12,16,0.85)'};border:1px solid ${sel?col:'#2e2a38'};border-radius:4px;padding:2px 7px;color:${sel?col:'#c8c2b6'};font-size:${sel?'11px':'9px'};font-weight:${sel?700:400};font-family:"Noto Sans KR",sans-serif;box-shadow:none;white-space:nowrap;opacity:${hasSel&&!sel?0.45:1};`;}});
      marker.bindPopup(buildPopupAll(place),{maxWidth:640,minWidth:320,autoPan:true,autoPanPadding:[20,20],keepInView:false,closeButton:true});
      marker.on('click',()=>selectPlace(place.id));
      marker.on('popupclose',()=>{
        const stillSel = place._merged ? (place.id===selectedId || place._mergedIds.includes(selectedId)) : selectedId===place.id;
        if(stillSel && !_switching){selectedId=null;renderAll();}
      });
      marker.addTo(map); markers[place.id]=marker;
      if (place._merged) place._mergedIds.forEach(id=>{ markers[id]=marker; });
    });
  }
  const totalVisible = isJourneyMode() ? JOURNEY_PLACES.filter(isVisible).length : getMergedPlaces(getMainSearchPool().filter(isVisible)).length;
  const v=document.getElementById('vcnt'),vi=document.getElementById('visibleCount');
  if(v)v.textContent=totalVisible; if(vi)vi.textContent=totalVisible;
}

function buildPopupAll(p) {
  if (isJourneyMode()) {
    const col  = REGION_COLORS[p.region] || MAP_COLORS[p.map] || '#888';
    const rlbl = REGION_LABELS[p.region] || p.region;
    const mlbl = MAP_LABELS[p.map] || p.map;
    const mcol = MAP_COLORS[p.map] || '#888';
    // geo를 파이프로 분리
    const geoParts = (p.geo||'').split('|');
    const geoLoc  = geoParts[0].trim();
    const geoElev = geoParts.length > 1 ? geoParts[1].trim() : '';
    const elevHtml = geoElev
      ? '<div style="display:inline-flex;align-items:center;gap:5px;'
        +'margin-top:5px;padding:3px 9px;background:rgba(96,208,240,0.12);'
        +'border:1px solid rgba(96,208,240,0.3);border-radius:4px;">'
        +'<span style="font-size:calc(10px * var(--ui-zoom));color:#60d0f0">🏔</span>'
        +'<span style="font-size:calc(11px * var(--ui-zoom));color:#60d0f0;font-weight:700">'
        +geoElev.replace(/^고도[：:]\s*/,'')+'</span>'
        +'</div>'
      : '';
    const evHTML = (p.events||[]).map(function(e){
      const xrefs = findEventXrefs(p.id, e.ref);
      const xrefHTML = xrefs.map(function(xref){
        const otherPlace = PLACES.find(pl=>pl.id===xref.otherPlaceId) || JOURNEY_PLACES.find(pl=>pl.id===xref.otherPlaceId);
        const dirCol = (p.testament||'ot')==='ot' ? '#4a9edd' : '#c8a84a';
        const dirIcon = (p.testament||'ot')==='ot' ? '✝' : '📜';
        return '<div style="margin-top:6px;padding:6px 9px;cursor:pointer;'
          +'background:'+dirCol+'14;border:1px solid '+dirCol+'55;border-radius:5px;border-left:3px solid '+dirCol+'" '
          +'onclick="selectPlace(\''+xref.otherPlaceId+'\')">'
          +'<div style="font-size:calc(9px * var(--ui-zoom));font-weight:700;color:'+dirCol+';letter-spacing:.5px">'+dirIcon+' '+xref.type+' · '+xref.label+'</div>'
          +'<div style="font-size:calc(10px * var(--ui-zoom));color:#b8b0a0;line-height:1.5;margin-top:2px">'+xref.note+'</div>'
          +(otherPlace?'<div style="font-size:calc(10px * var(--ui-zoom));color:'+dirCol+';text-decoration:underline dotted;margin-top:3px;font-weight:600">→ '+otherPlace.name+' 바로가기</div>':'')
          +'</div>';
      }).join('');
      return '<div style="margin-bottom:6px;padding:6px 8px;background:rgba(255,255,255,.04);border-radius:5px;border-left:2px solid '+col+'">'
        +'<div style="font-size:calc(9px * var(--ui-zoom));color:var(--muted)">'+( e.time||'')+'</div>'
        +'<div style="font-size:calc(10px * var(--ui-zoom));font-weight:700;color:var(--accent)">'+(e.type||'')+'</div>'
        +'<div style="font-size:calc(10px * var(--ui-zoom));color:var(--muted)">👤 '+(e.persons||'')+'</div>'
        +'<div style="font-size:calc(11px * var(--ui-zoom));line-height:1.6;margin-top:3px">'+(e.desc||'')+'</div>'
        +commentaryHTML(e)
        +xrefHTML
        +'<div style="font-size:calc(10px * var(--ui-zoom));color:var(--accent);margin-top:3px">📖 '+(e.ref||'')+'</div>'
        +bibleLinksHTML(e.ref)
        +'</div>';
    }).join('');
    return '<div class="popup-wrap">'
      +'<div style="display:flex;gap:5px;margin-bottom:7px">'
      +'<span style="padding:2px 7px;border-radius:3px;font-size:calc(9px * var(--ui-zoom));background:'+mcol+'22;color:'+mcol+'">'+mlbl+'</span>'
      +'<span style="padding:2px 7px;border-radius:3px;font-size:calc(9px * var(--ui-zoom));background:'+col+'22;color:'+col+'">'+rlbl+'</span>'
      +'</div>'
      +'<div class="popup-name">'+p.name+'</div>'
      +(p.nameEn ? '<div class="popup-name-en">'+p.nameEn+'</div>' : '')
      +'<div style="font-size:calc(11px * var(--ui-zoom));color:#a0b4c8;margin-bottom:4px;line-height:1.6;'
      +'padding:5px 8px;background:rgba(255,255,255,0.05);border-radius:5px 5px 0 0;'
      +'border-left:2px solid #3a5a7a">📍 '+geoLoc+'</div>'
      +(p.virtual ? '<div style="font-size:calc(10px * var(--ui-zoom));color:#c8a84a;margin:4px 0 8px;line-height:1.6;padding:5px 8px;background:rgba(200,168,74,0.1);border:1px dashed rgba(200,168,74,0.4);border-radius:5px">◆ 이 위치는 실제 역사적 지명이 아니라, 서신서 등에서 다뤄지는 신학적 주제를 표시하기 위해 관련 지역 인근에 둔 상징적 지점입니다.</div>' : '')
      +elevHtml
      +'<div style="margin-bottom:10px"></div>'
      +'<div class="popup-sec-title">연대 · 인물 · 사건</div>'
      +evHTML
      +'<button class="no-print" onclick="printPopupContent(this)" style="width:100%;margin-top:10px;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.06);color:var(--muted);cursor:pointer;font-family:inherit;font-size:calc(10px * var(--ui-zoom));font-weight:600">🖨 인쇄 / PDF로 저장</button>'
      +'</div>';
  }
  return buildPopup(p);
}
function renderAll() {
  renderLegend(); renderList(); renderMarkers();
  if (isJourneyMode()) renderRoutes();
  else { routeLines.forEach(l=>map.removeLayer(l)); routeLines=[]; }
}

function fitVisibleMarkers(maxZoom){
  var src = isJourneyMode() ? JOURNEY_PLACES : PLACES;
  var cs = src.filter(isVisible).map(function(p){return [p.lat,p.lng];});
  if (cs.length) map.fitBounds(L.latLngBounds(cs), {padding:[60,60], maxZoom:(maxZoom||11), animate:true});
}
// '🌐 전체 (구약+신약)' 버튼: 시대 필터와 인물여정 모드를 모두 초기화하고 전체 보기로 복귀
function viewAll() {
  xrefViewMode = false;
  currentFilter = 'all';
  searchQuery = '';
  const sb = document.getElementById('searchBox');
  if (sb) sb.value = '';
  if (isJourneyMode()) {
    switchMap('all', null);
  } else {
    if (selectedId) { const sel = PLACES.find(q => q.id === selectedId); if (sel && !isVisible(sel)) { selectedId = null; map.closePopup(); } }
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.region === 'all'));
    renderAll();
  }
}
// '🔗 구약·신약 연결 보기' — EVENT_XREFS를 모아 별도 목록으로 보여줌
function viewXrefs() {
  xrefViewMode = true;
  currentFilter = 'all';
  searchQuery = '';
  const sb = document.getElementById('searchBox');
  if (sb) sb.value = '';
  if (isJourneyMode()) { switchMap('all', null); }
  else { renderAll(); }
}
function filterRegion(region, btn) {
  currentFilter=region;
  if(selectedId){const sel=PLACES.find(q=>q.id===selectedId);if(sel&&!isVisible(sel)){selectedId=null;map.closePopup();}}
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.region===region));
  renderAll();
  if (region !== 'all') fitVisibleMarkers(11);
}

function filterTestament(t) {
  currentFilter = t;
  if(selectedId){const sel=PLACES.find(q=>q.id===selectedId);if(sel&&!isVisible(sel)){selectedId=null;map.closePopup();}}
  renderAll();
}

function onSearch(q) {
  searchQuery=q.trim();
  if(selectedId){const src=isJourneyMode()?JOURNEY_PLACES:getMainSearchPool();const sel=src.find(r=>r.id===selectedId);if(sel&&!isVisible(sel)){selectedId=null;map.closePopup();}}
  renderAll();
}
document.getElementById('searchBox').addEventListener('input',e=>onSearch(e.target.value));

function selectPlace(id) {
  const place = PLACES.find(p => p.id === id);
  if (place) {
    // 대상 지명이 현재 필터·검색·인물여정 모드로 인해 지도에 렌더링되어 있지 않다면
    // 전체 보기로 전환해 반드시 찾을 수 있도록 한다 (구약·신약 교차 연결이 항상 동작하게 함)
    if (!markers[id]) {
      _switching = true; // 마커 재구성 중 popupclose로 인한 renderAll() 재진입 방지
      map.closePopup();
      currentFilter = 'all';
      searchQuery = '';
      const sb = document.getElementById('searchBox'); if (sb) sb.value = '';
      if (isJourneyMode()) currentMap = 'all';
      document.querySelectorAll('.map-tab, .sb-tab').forEach(b => b.classList.toggle('active', b.dataset.map === 'all'));
      renderAll();
      _switching = false;
    }
    _switching = true;
    selectedId = id;
    renderAll();
    _switching = false;
    const marker = markers[id];
    if (!marker) return;
    map.flyTo([marker.getLatLng().lat, marker.getLatLng().lng], Math.max(map.getZoom(), 8), {animate: true, duration: 0.8});
    setTimeout(() => marker.openPopup(), 850);
    setTimeout(() => { const el = document.querySelector('.place-item.selected'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'nearest'}); }, 100);
    return;
  }
  // PLACES에 없다면 인물여정 전용 데이터(JOURNEY_PLACES)에서 찾아, 해당 인물의 여정 모드로 전환한다.
  const jplace = JOURNEY_PLACES.find(p => p.id === id);
  if (!jplace) return;
  _switching = true;
  switchMap(jplace.map, null);
  selectedId = id;
  renderAll();
  _switching = false;
  setTimeout(() => {
    const marker = markers[id];
    if (!marker) return;
    map.flyTo([marker.getLatLng().lat, marker.getLatLng().lng], Math.max(map.getZoom(), 8), {animate: true, duration: 0.8});
    setTimeout(() => marker.openPopup(), 850);
  }, 60);
}

function setTile(name) {
  map.removeLayer(TILES[currentTile]); map.addLayer(TILES[name]); currentTile=name;
  document.body.classList.toggle('tile-dark', name==='dark');
  document.querySelectorAll('.tile-btn[data-tile]').forEach(b=>b.classList.toggle('active',b.dataset.tile===name));
}


// ⑥ switchMap / renderRoutes / toggleRoutes
function switchMap(m, btn) {
  // 팝업 닫기
  map.closePopup();

  // 지도 위 모든 마커·경로선 강제 제거
  Object.values(markers).forEach(mk => map.removeLayer(mk));
  markers = {};
  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];
  // 위에서 못 잡힌 레이어까지 전체 순회 제거
  map.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
      map.removeLayer(layer);
    }
  });

  currentMap = m;
  selectedId = null;
  currentJourneyFilter = 'all';

  // 탭 활성화 (헤더 + 사이드바)
  document.querySelectorAll('.map-tab, .sb-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.map === m);
    if (b.dataset.map === m) {
      const col = m === 'all' ? '#ccc' : MAP_COLORS[m];
      b.style.background = m === 'all' ? 'rgba(255,255,255,0.1)' : col + '22';
      b.style.color = col;
    } else {
      b.style.background = 'transparent';
      b.style.color = '';
    }
  });

  // 지도 중심 이동
  const centers = {
    all:[31.0,35.0], noah:[39.7,44.3], abraham:[33.0,36.0], isaac:[31.5,34.8],
    jacob:[33.5,37.0], joseph:[30.5,32.0], moses:[29.5,33.5],
    joshua:[31.9,35.3], deborah:[32.6,35.3], ruth:[31.7,35.2],
    samuel:[31.9,35.2], david:[31.6,35.1], solomon:[31.8,35.2],
    elijah:[32.5,35.5], isaiah:[31.8,35.2], hezekiah:[31.8,35.2],
    jeremiah:[31.8,35.2], ezekiel:[32.5,45.0], esther:[32.2,48.7],
    nehemiah:[31.8,35.2], jonah:[36.8,35.2],
    ezra:[32.2,48.2],
    john_baptist:[31.8,35.5],
    jesus:[32.0,35.5], peter:[32.5,35.5], paul:[37.0,27.0],
    mary_magdalene:[32.3,35.39],
    james_john:[33.04,35.67],
    judas_iscariot:[32.04,35.32],
    pilate:[32.14,35.07],
    joseph_arimathea:[31.77,35.23],
    philip_evangelist:[32.39,35.05],
    samaritan_woman:[32.21,35.27],
    simon_magus:[32.27,35.19],
    barnabas:[34.37,34.94],
    mark:[38.52,22.96],
    ananias_dam:[33.51,36.29],
    syrophoenician:[33.27,35.2],
    john_apostle:[37.63,26.95],
    epaphras:[39.17,23.57],
    aquila_priscilla:[39.25,20.91],
    timothy:[37.81,27.5],
    onesimus:[39.84,20.81],
    silas:[40.02,23.08],
    lydia:[41.01,24.29],
    gallio:[37.91,22.88],
    epaphroditus:[41.45,18.39],
    luke:[36.77,20.64],
    julius:[36.77,20.64],
    cornelius:[32.5,34.9],
    othniel:[31.86,35.46],
    ehud:[31.53,35.59],
    shamgar:[31.77,34.97],
    barak:[32.77,35.35],
    gideon:[32.51,35.31],
    tola:[32.56,35.33],
    jair:[32.29,35.76],
    jephthah:[31.87,35.68],
    ibzan:[31.7,35.2],
    elon:[31.92,35.28],
    abdon:[32.41,35.21],
    samson:[31.77,34.98],
    eli:[31.98,35.13],
    saul:[32.21,35.36],
    elisha:[32.07,35.33],
    daniel:[32.54,44.42],
    nebuchadnezzar:[32.16,39.83],
    zechariah_prophet:[31.77,35.23],
    haggai:[31.77,35.23],
    zerubbabel:[31.77,35.23],
    mordecai:[32.19,48.26],
    boaz:[31.7,35.2],
    hannah:[32.06,35.29]
  };
  const zoomMap={all:5, noah:5, abraham:6, isaac:7, jacob:6, joseph:6, moses:5, joshua:7,
    deborah:7, ruth:8, samuel:7, solomon:7, david:7, elijah:6,
    isaiah:7, hezekiah:7, jeremiah:7, ezekiel:5, esther:5, nehemiah:7,
    jonah:6, ezra:5,
    john_baptist:7, jesus:7, peter:6, paul:5,
    mary_magdalene:7,
    james_john:7,
    judas_iscariot:7,
    pilate:7,
    joseph_arimathea:7,
    philip_evangelist:7,
    samaritan_woman:7,
    simon_magus:7,
    barnabas:6,
    mark:5,
    ananias_dam:7,
    syrophoenician:7,
    john_apostle:7,
    epaphras:5,
    aquila_priscilla:5,
    timothy:5,
    onesimus:5,
    silas:6,
    lydia:7,
    gallio:7,
    epaphroditus:5,
    luke:5,
    julius:5,
    cornelius:7,
    othniel:7,
    ehud:7,
    shamgar:7,
    barak:7,
    gideon:7,
    tola:7,
    jair:7,
    jephthah:7,
    ibzan:7,
    elon:7,
    abdon:7,
    samson:7,
    eli:7,
    saul:7,
    elisha:7,
    daniel:7,
    nebuchadnezzar:5,
    zechariah_prophet:7,
    haggai:7,
    zerubbabel:7,
    mordecai:7,
    boaz:7,
    hannah:7
  };
  if (m === 'all') {
    try { map.fitBounds(L.latLngBounds(PLACES.map(function(p){return [p.lat,p.lng];})), {padding:[40,40], animate:true}); }
    catch(e){ map.setView(centers[m]||centers.all, zoomMap[m]||5, {animate:true}); }
  } else {
    var __cs = JOURNEY_PLACES.filter(function(p){return p.map===m;}).map(function(p){return [p.lat,p.lng];});
    if (__cs.length) map.fitBounds(L.latLngBounds(__cs), {padding:[60,60], maxZoom:12, animate:true});
    else map.setView(centers[m]||centers.all, zoomMap[m]||5, {animate:true});
  }

  renderAll();
}

function renderRoutes() {
  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];
  if (!isJourneyMode() && !showRoutes) return;

  const prefixMap = {
    moses:'m_', jesus:'j_', paul:'p_', joshua:'josh_',
    abraham:'ab_', isaac:'is_', jacob:'ja_', joseph:'jo_',
    david:'da_', samuel:'sa_', solomon:'so_', elijah:'el_', peter:'pe_',
    noah:'no_', deborah:'db_', ruth:'ru_', isaiah:'iy_', hezekiah:'hz_',
    jeremiah:'jr_', ezekiel:'ez_', esther:'es_', nehemiah:'ne_', john_baptist:'jb_',
    ezra:'er_', jonah:'jn_',
    mary_magdalene:'mary_magdalene_',
    james_john:'james_john_',
    judas_iscariot:'judas_iscariot_',
    pilate:'pilate_',
    joseph_arimathea:'joseph_arimathea_',
    philip_evangelist:'philip_evangelist_',
    samaritan_woman:'samaritan_woman_',
    simon_magus:'simon_magus_',
    barnabas:'barnabas_',
    mark:'mark_',
    ananias_dam:'ananias_dam_',
    syrophoenician:'syrophoenician_',
    john_apostle:'john_apostle_',
    epaphras:'epaphras_',
    aquila_priscilla:'aquila_priscilla_',
    timothy:'timothy_',
    onesimus:'onesimus_',
    silas:'silas_',
    lydia:'lydia_',
    gallio:'gallio_',
    epaphroditus:'epaphroditus_',
    luke:'luke_',
    julius:'julius_',
    cornelius:'cornelius_',
    othniel:'othniel_',
    ehud:'ehud_',
    shamgar:'shamgar_',
    barak:'barak_',
    gideon:'gideon_',
    tola:'tola_',
    jair:'jair_',
    jephthah:'jephthah_',
    ibzan:'ibzan_',
    elon:'elon_',
    abdon:'abdon_',
    samson:'samson_',
    eli:'eli_',
    saul:'saul_',
    elisha:'elisha_',
    daniel:'daniel_',
    nebuchadnezzar:'nebuchadnezzar_',
    zechariah_prophet:'zechariah_prophet_',
    haggai:'haggai_',
    zerubbabel:'zerubbabel_',
    mordecai:'mordecai_',
    boaz:'boaz_',
    hannah:'hannah_',
    adam:'adam_', eve:'eve_', aaron:'aaron_', miriam:'miriam_',
    bathsheba:'bathsheba_', rehoboam:'rehoboam_', jeroboam:'jeroboam_',
    ahab:'ahab_', jezebel:'jezebel_',
    stephen:'stephen_', apollos:'apollos_', james_brother:'james_brother_',
    mary_mother:'mary_mother_', joseph_earthly:'joseph_earthly_'
  };
  const prefix = currentMap === 'all' ? '' : (prefixMap[currentMap] || '');
  const hasPrefixDef = currentMap === 'all' || !!prefixMap[currentMap];

  // 경로 pane 생성 (마커 아래, 타일 위)
  if (!map.getPane('routePane')) {
    map.createPane('routePane');
    map.getPane('routePane').style.zIndex = 350;
    map.getPane('routePane').style.pointerEvents = 'none';
  }

  const isJourney = isJourneyMode();
  const wt = isJourney ? 3.5 : 1.5;
  const op = isJourney ? 0.9 : 0.45;

  // ROUTES 키 → region 키 변환 테이블
  const routeRegionMap = {
    p_conv:'conv', p_1st:'1st', p_2nd:'2nd', p_3rd:'3rd', p_final:'final',
    m_egypt:'egypt', m_midian:'midian', m_exodus:'exodus', m_sinai:'sinai', m_wilderness:'wilderness', m_moab:'moab',
    j_birth:'birth', j_baptism:'baptism', j_galilee:'galilee', j_expand:'expand', j_passion:'passion', j_risen:'risen',
    josh_calling:'calling', josh_jordan:'jordan', josh_central:'central', josh_south:'south', josh_north:'north', josh_allot:'allot',
  };
  const getRouteRegion = (key) => {
    if (routeRegionMap[key]) return routeRegionMap[key];
    // ab_, da_, sa_ 등 prefix 3자 제거
    for (const pfx of ['ab_','is_','ja_','jo_','da_','sa_','so_','el_','pe_','no_','iy_','db_','ru_','hz_','jr_','ez_','es_','ne_','jb_','er_','jn_']) {
      if (key.startsWith(pfx)) return key.slice(pfx.length);
    }
    return null;
  };

  Object.entries(ROUTES).forEach(([key, coords]) => {
    if (currentMap !== 'all') {
      if (!hasPrefixDef) return;   // 이 인물은 전용 경로가 정의되지 않음 — 무관한 경로 전체 표시 방지
      if (!key.startsWith(prefix)) return;
    }
    if (!coords || coords.length < 2) return;

    // 여정 필터 적용: 선택된 단계 경로만 표시
    if (isJourneyMode() && currentJourneyFilter !== 'all') {
      if (getRouteRegion(key) !== currentJourneyFilter) return;
    }

    // 동일 좌표 필터링
    const uniqueCoords = coords.filter((c,i) =>
      i===0 || c[0]!==coords[i-1][0] || c[1]!==coords[i-1][1]
    );
    if (uniqueCoords.length < 2) return;

    let col = '#888';
    const getCol = {
      'm_'   : () => REGION_COLORS[key.slice(2)]   || MAP_COLORS.moses,
      'j_'   : () => REGION_COLORS[key.slice(2)]   || MAP_COLORS.jesus,
      'p_'   : () => REGION_COLORS[key.slice(2)]   || MAP_COLORS.paul,
      'josh_': () => REGION_COLORS[key.slice(5)]   || MAP_COLORS.joshua,
      'ab_'  : () => REGION_COLORS[key] || MAP_COLORS.abraham,
      'is_'  : () => REGION_COLORS[key] || MAP_COLORS.isaac,
      'ja_'  : () => REGION_COLORS[key] || MAP_COLORS.jacob,
      'jo_'  : () => REGION_COLORS[key] || MAP_COLORS.joseph,
      'da_'  : () => REGION_COLORS[key] || MAP_COLORS.david,
      'sa_'  : () => REGION_COLORS[key] || MAP_COLORS.samuel,
      'so_'  : () => REGION_COLORS[key] || MAP_COLORS.solomon,
      'el_'  : () => REGION_COLORS[key] || MAP_COLORS.elijah,
      'pe_'  : () => REGION_COLORS[key] || MAP_COLORS.peter,
      'no_'  : () => MAP_COLORS.noah,
      'iy_'  : () => MAP_COLORS.isaiah,
      'db_'  : () => MAP_COLORS.deborah,
      'ru_'  : () => MAP_COLORS.ruth,
      'hz_'  : () => MAP_COLORS.hezekiah,
      'jr_'  : () => MAP_COLORS.jeremiah,
      'ez_'  : () => MAP_COLORS.ezekiel,
      'es_'  : () => MAP_COLORS.esther,
      'ne_'  : () => MAP_COLORS.nehemiah,
      'jb_'  : () => MAP_COLORS.john_baptist,
      'er_'  : () => MAP_COLORS.ezra,
      'jn_'  : () => MAP_COLORS.jonah,
      'mary_magdalene_': () => MAP_COLORS.mary_magdalene,
      'james_john_': () => MAP_COLORS.james_john,
      'judas_iscariot_': () => MAP_COLORS.judas_iscariot,
      'pilate_': () => MAP_COLORS.pilate,
      'joseph_arimathea_': () => MAP_COLORS.joseph_arimathea,
      'philip_evangelist_': () => MAP_COLORS.philip_evangelist,
      'samaritan_woman_': () => MAP_COLORS.samaritan_woman,
      'simon_magus_': () => MAP_COLORS.simon_magus,
      'barnabas_': () => MAP_COLORS.barnabas,
      'mark_': () => MAP_COLORS.mark,
      'ananias_dam_': () => MAP_COLORS.ananias_dam,
      'syrophoenician_': () => MAP_COLORS.syrophoenician,
      'john_apostle_': () => MAP_COLORS.john_apostle,
      'epaphras_': () => MAP_COLORS.epaphras,
      'aquila_priscilla_': () => MAP_COLORS.aquila_priscilla,
      'timothy_': () => MAP_COLORS.timothy,
      'onesimus_': () => MAP_COLORS.onesimus,
      'silas_': () => MAP_COLORS.silas,
      'lydia_': () => MAP_COLORS.lydia,
      'gallio_': () => MAP_COLORS.gallio,
      'epaphroditus_': () => MAP_COLORS.epaphroditus,
      'luke_': () => MAP_COLORS.luke,
      'julius_': () => MAP_COLORS.julius,
      'cornelius_': () => MAP_COLORS.cornelius,
      'othniel_': () => MAP_COLORS.othniel,
      'ehud_': () => MAP_COLORS.ehud,
      'shamgar_': () => MAP_COLORS.shamgar,
      'barak_': () => MAP_COLORS.barak,
      'gideon_': () => MAP_COLORS.gideon,
      'tola_': () => MAP_COLORS.tola,
      'jair_': () => MAP_COLORS.jair,
      'jephthah_': () => MAP_COLORS.jephthah,
      'ibzan_': () => MAP_COLORS.ibzan,
      'elon_': () => MAP_COLORS.elon,
      'abdon_': () => MAP_COLORS.abdon,
      'samson_': () => MAP_COLORS.samson,
      'eli_': () => MAP_COLORS.eli,
      'saul_': () => MAP_COLORS.saul,
      'elisha_': () => MAP_COLORS.elisha,
      'daniel_': () => MAP_COLORS.daniel,
      'nebuchadnezzar_': () => MAP_COLORS.nebuchadnezzar,
      'zechariah_prophet_': () => MAP_COLORS.zechariah_prophet,
      'haggai_': () => MAP_COLORS.haggai,
      'zerubbabel_': () => MAP_COLORS.zerubbabel,
      'mordecai_': () => MAP_COLORS.mordecai,
      'boaz_': () => MAP_COLORS.boaz,
      'hannah_': () => MAP_COLORS.hannah
    };
    for (const [pfx, fn] of Object.entries(getCol)) {
      if (key.startsWith(pfx)) { col = fn(); break; }
    }

    // 배경선 (흰색 테두리 효과)
    const shadow = L.polyline(uniqueCoords, {
      color: '#000', weight: wt + 2, opacity: op * 0.3,
      dashArray: null, lineCap: 'round', lineJoin: 'round', pane: 'routePane',
    }).addTo(map);
    routeLines.push(shadow);

    // 메인 경로선
    const line = L.polyline(uniqueCoords, {
      color: col, weight: wt, opacity: op,
      dashArray: isJourney ? '10,6' : '6,4',
      lineCap: 'round', lineJoin: 'round', pane: 'routePane',
    }).addTo(map);
    routeLines.push(line);

    // 이동 방향 화살표 (여정 모드에서만)
    if (isJourney && uniqueCoords.length >= 2) {
      const mid = Math.floor(uniqueCoords.length / 2);
      const p1 = uniqueCoords[mid-1], p2 = uniqueCoords[mid];
      const angle = Math.atan2(p2[1]-p1[1], p2[0]-p1[0]) * 180 / Math.PI;
      const arrow = L.marker([
        (p1[0]+p2[0])/2, (p1[1]+p2[1])/2
      ], {
        icon: L.divIcon({
          html: `<div style="transform:rotate(${angle}deg);color:${col};font-size:14px;line-height:1;text-shadow:0 0 3px #000">▶</div>`,
          className: '', iconSize: [14,14], iconAnchor: [7,7],
        }),
        interactive: false, pane: 'markerPane',
      }).addTo(map);
      routeLines.push(arrow);
    }
  });

  // ── 경로 전용 매핑이 없는 인물(신규 추가 인물 등): 본인 지점을 seq 순으로 단순 연결 ──
  if (currentMap !== 'all' && !hasPrefixDef) {
    const myStops = JOURNEY_PLACES
      .filter(p => p.map === currentMap && p.seq != null)
      .slice()
      .sort((a,b) => a.seq - b.seq);
    if (myStops.length >= 2) {
      const coords = myStops.map(p => [p.lat, p.lng])
        .filter((c,i,arr) => i===0 || c[0]!==arr[i-1][0] || c[1]!==arr[i-1][1]);
      if (coords.length >= 2) {
        const col = MAP_COLORS[currentMap] || '#888';
        const shadow = L.polyline(coords, {
          color:'#000', weight: wt+2, opacity: op*0.3,
          lineCap:'round', lineJoin:'round', pane:'routePane',
        }).addTo(map);
        routeLines.push(shadow);
        const line = L.polyline(coords, {
          color: col, weight: wt, opacity: op,
          dashArray: isJourney ? '10,6' : '6,4',
          lineCap:'round', lineJoin:'round', pane:'routePane',
        }).addTo(map);
        routeLines.push(line);
        if (isJourney && coords.length >= 2) {
          const mid = Math.floor(coords.length/2);
          const p1 = coords[mid-1] || coords[0], p2 = coords[mid];
          const angle = Math.atan2(p2[1]-p1[1], p2[0]-p1[0]) * 180/Math.PI;
          const arrow = L.marker([(p1[0]+p2[0])/2,(p1[1]+p2[1])/2], {
            icon: L.divIcon({
              html:`<div style="transform:rotate(${angle}deg);color:${col};font-size:14px;line-height:1;text-shadow:0 0 3px #000">▶</div>`,
              className:'', iconSize:[14,14], iconAnchor:[7,7],
            }),
            interactive:false, pane:'markerPane',
          }).addTo(map);
          routeLines.push(arrow);
        }
      }
    }
  }
}

function toggleRoutes() {
  showRoutes = !showRoutes;
  const btn = document.getElementById('routeBtn');
  btn.textContent = showRoutes ? '📍 경로선 ON' : '📍 경로선 OFF';
  btn.classList.toggle('active', showRoutes);
  renderRoutes();
}

// ⑦ 초기화

// ── 경로선을 실제 마커(지점)에 맞춰 재구성: 경로가 지명과 정확히 연결되도록 보완 ──
(function(){
  try {
    var byMap = {};
    JOURNEY_PLACES.forEach(function(p){
      if (p.map == null || p.seq == null) return;
      (byMap[p.map] = byMap[p.map] || []).push(p);
    });
    Object.keys(byMap).forEach(function(mp){
      var ms = byMap[mp].slice().sort(function(a,b){ return a.seq - b.seq; });
      var regions = [];
      ms.forEach(function(m){ if (regions.indexOf(m.region) < 0) regions.push(m.region); });
      regions.forEach(function(R){
        if (!(R in ROUTES)) return;
        var idxs = [];
        ms.forEach(function(m,i){ if (m.region === R) idxs.push(i); });
        if (!idxs.length) return;
        var coords = [];
        if (idxs[0] > 0) coords.push([ms[idxs[0]-1].lat, ms[idxs[0]-1].lng]);
        idxs.forEach(function(i){ coords.push([ms[i].lat, ms[i].lng]); });
        coords = coords.filter(function(c,i){ return i===0 || c[0]!==coords[i-1][0] || c[1]!==coords[i-1][1]; });
        if (coords.length >= 2) ROUTES[R] = coords;
      });
    });
  } catch(e) { console.warn('route rebuild skipped:', e); }
})();

const styleTag=document.createElement('style');
styleTag.textContent=`.leaflet-tooltip{background:rgba(13,12,16,0.85)!important;border:1px solid #2e2a38!important;border-radius:4px!important;color:#c8c2b6!important;font-size:9px!important;font-family:"Noto Sans KR",sans-serif!important;padding:2px 7px!important;box-shadow:none!important;white-space:nowrap!important;}.leaflet-tooltip::before{display:none!important;}`;
document.head.appendChild(styleTag);
// 인물 탭 데이터에서 라벨(이모지+이름)·색상을 읽어와 사이드바 시대별 인물 목록에 재사용.
// (원본은 이미 렌더링된 DOM 탭 버튼을 역으로 스캔했지만, 탭이 이제 tabs.js에서 동적으로
//  생성되므로 DOM 순서에 의존하지 않게 데이터에서 직접 채운다 — 결과는 동일)
PERSON_TABS.forEach(({id: k, label}) => {
  if (!k || k === 'all' || PERSON_LABEL[k]) return;
  PERSON_LABEL[k] = label;
  PERSON_COLOR[k] = PERSON_TAB_COLORS[k] || '#8ac97a';
});
renderAll();
try { if (typeof PLACES!=='undefined' && PLACES.length) map.fitBounds(L.latLngBounds(PLACES.map(function(p){return [p.lat,p.lng];})), {padding:[40,40]}); } catch(e){}

// 헤더 높이를 측정해 사이드바·지도 top에 반영 (인물 메뉴 줄바꿈 대응)
function syncHeaderHeight() {
  const hdr = document.querySelector('header');
  if (hdr) {
    const h = hdr.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-h', h + 'px');
    try {
      if (typeof map !== 'undefined' && map && map.invalidateSize) {
        setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 50);
      }
    } catch(e) { /* map 미초기화 시 무시 */ }
  }
}
syncHeaderHeight();
window.addEventListener('resize', syncHeaderHeight);
window.addEventListener('load', syncHeaderHeight);
// 폰트 로딩 등으로 높이가 바뀔 수 있어 약간 지연 후 재측정
setTimeout(syncHeaderHeight, 300);
setTimeout(syncHeaderHeight, 1000);

// 팝업·사이드바가 생성하는 HTML 문자열은 onclick="selectPlace('...')" 처럼 함수를
// 인라인으로 참조한다. 이 함수들은 window에도 노출해야 그 인라인 핸들러가 동작한다.
Object.assign(window, {
  selectPlace, filterRegion, filterTestament, printPopupContent,
  viewAll, viewXrefs, setTile, switchMap, toggleRoutes,
});

export {
  map, selectPlace, filterRegion, filterTestament, printPopupContent,
  viewAll, viewXrefs, setTile, switchMap, toggleRoutes, filterJourneyRegion,
  renderAll,
};

