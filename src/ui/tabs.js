// 상단 "인물 지도" 탭 버튼을 렌더링한다.
// 원본 HTML은 이 200여 개 버튼을 전부 손으로 나열했다(마크업 3,600자 이상).
// 이제는 src/data/person-tabs.js 데이터 하나만 늘리면 새 인물 탭이 자동으로 생긴다 —
// 확장(더 많은 인물, 나중엔 다른 과목의 "탭")을 염두에 둔 핵심 리팩토링 지점.
import { PERSON_TABS } from '../data/person-tabs.js';

export function renderPersonTabs(container, onSelect) {
  if (!container) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'map-tab active';
  allBtn.dataset.map = 'all';
  allBtn.textContent = '🌐 전체';
  allBtn.addEventListener('click', () => onSelect('all', allBtn));
  container.appendChild(allBtn);

  for (const { id, label } of PERSON_TABS) {
    const btn = document.createElement('button');
    btn.className = 'map-tab';
    btn.dataset.map = id;
    btn.style.color = `var(--${id})`;
    btn.textContent = label;
    btn.addEventListener('click', () => onSelect(id, btn));
    container.appendChild(btn);
  }
}
