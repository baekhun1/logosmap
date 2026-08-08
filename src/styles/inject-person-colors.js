// 인물별 CSS 커스텀 프로퍼티(--adam, --moses, ...)를 런타임에 주입한다.
// 원본 파일은 이 ~200개 값을 CSS :root 블록과 JS MAP_COLORS 객체 두 곳에
// 손으로 동일하게 유지해야 했다(실수로 어긋나기 쉬운 구조).
// 이제는 src/data/persons.js의 PERSON_TAB_COLORS 하나가 단일 진실 공급원(source of truth)이며,
// CSS 쪽은 이 함수가 시작 시 한 번 주입한다.
import { PERSON_TAB_COLORS } from '../data/persons.js';

export function injectPersonColors() {
  const root = document.documentElement.style;
  for (const [id, color] of Object.entries(PERSON_TAB_COLORS)) {
    root.setProperty(`--${id}`, color);
  }
}
