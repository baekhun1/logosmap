# logosmap

성경지도 서비스 (확장가능)

## 구조

원래 `bible_map_v22.html` 단일 파일(1.3MB, 데이터+엔진+UI가 전부 인라인)로 되어 있던 앱을
데이터 / 엔진·UI / 셸 3개 층으로 분리했습니다. `bible_map_v22.html`은 참고용으로 남겨두었고,
실제 개발은 아래 구조에서 진행합니다.

```
index.html              # 슬림 셸 — 헤더/사이드바/지도 컨테이너만
src/
  main.js                # 진입점 (초기화 순서를 명시적으로 제어)
  data/                   # 콘텐츠 데이터 (ES 모듈) — 여기만 늘리면 지명/인물이 늘어남
    places.js               # 지명 156개
    journeys.js              # 인물 여정 지점 490개
    persons.js                # 인물 색상·라벨·시대/지역 인덱스
    person-tabs.js             # 상단 인물 탭(이모지+이름) — 탭 UI를 동적 생성하는 데이터
    regions.js, routes.js, xrefs.js
  engine/
    app.js                  # 지도 렌더링 + 검색/필터/팝업/탭전환 UI 로직
  ui/
    tabs.js                  # 인물 탭 버튼 동적 생성
    header-sync.js, text-zoom.js, pinch-zoom.js, wheel-zoom.js
  styles/
    main.css                 # 레이아웃/테마 CSS
    inject-person-colors.js   # 인물별 CSS 커스텀 프로퍼티(--personId)를 런타임에 주입
```

## 개발

```bash
npm install
npm run dev       # 개발 서버
npm run build     # dist/ 에 정적 빌드 생성 (Cloudflare Pages 등에 그대로 배포)
npm run preview   # 빌드 결과 로컬 미리보기
```

## 새 인물/지명 추가하기

`src/data/*.js`만 수정하면 됩니다. 상단 탭 버튼(`src/ui/tabs.js`)과 인물 색상 CSS
변수(`src/styles/inject-person-colors.js`)가 데이터에서 자동으로 생성되므로, HTML이나 CSS를
따로 손댈 필요가 없습니다.
