# 픽셀 아트 에디터 - Review 결과

> Build 단계와 독립적으로 수행한 검증 결과다. spec.md의 계획과 실제 구현
> (`index.html`, `style.css`, `editor.js`)을 대조하고, Playwright로 Chromium을
> 직접 띄워 동작을 확인했다.

## 검증 방법

- `spec.md`와 `index.html`/`style.css`/`editor.js`를 전체 정독하여 설계와 구현을 라인 단위로 대조.
- Node.js + Playwright(`node_modules`에 이미 설치되어 있는 Chromium)로 `apps/pixel-art/`를
  로컬 HTTP 서버(포트 8934/8935)에 올리고 실제 브라우저에서 다음 시나리오를 자동화 스크립트로 실행:
  1. 페이지 로드 확인(캔버스/팔레트 12개 스와치 노출 여부, 콘솔 에러 유무)
  2. 캔버스 클릭 → `getImageData`로 해당 셀 픽셀 값 직접 검증 (좌상단 `(0,0)`, 우하단 경계
     `(15,15)` 포함)
  3. `mouse.down()` → 한 번의 큰 점프(`steps: 1`, 실제 빠른 마우스 이동을 흉내)로
     `mouse.move()` → `mouse.up()`을 실행해 드래그 중 셀 스킵 여부 확인
  4. 지우개 토글, 팔레트 클릭 시 지우개 자동 해제, 지우개로 실제 지워지는지 확인
  5. "전체 지우기" 클릭 후 캔버스가 실제로 비는지 확인
  6. "PNG로 저장" 클릭 → Playwright의 `download` 이벤트로 실제 다운로드 발생 확인 →
     다운로드된 PNG를 base64로 읽어 별도 페이지의 `<img>`/`<canvas>`에 그린 뒤
     `getImageData`로 크기(512×512), 칠한 셀의 색상이 올바른 위치에 업스케일되어 있는지,
     미채색 칸이 투명(alpha 0)인지 확인
  7. `colorScheme: 'dark'`/`'light'` 에뮬레이션으로 다크/라이트 모드 CSS 변수 적용 확인
  8. 뷰포트 375px(모바일)/900px(데스크톱)로 전환하며 `.editor-layout`의
     `flex-direction`이 실제로 `column`/`row`로 바뀌는지 확인
  9. `#grid`의 `touch-action` computed style이 `none`인지, 블로그로 돌아가는 링크
     경로(`../../index.html`)가 `/apps/2048/`과 동일한 패턴인지 확인

- 테스트 스크립트는 검토 목적의 임시 파일로 스크래치패드 디렉터리에만 두었고, 저장소에는
  남기지 않았다(허용된 4개 파일 외 어떤 파일도 커밋하지 않음).

### 한계

- 실제 물리 마우스/터치스크린으로 조작한 것은 아니며 Playwright의 합성 입력 이벤트를 사용했다.
  다만 `mouse.move(..., { steps: 1 })`는 브라우저가 실제로 mousemove를 드문드문 발생시키는
  "빠른 드래그" 상황을 비교적 정확히 재현한다.
- 터치 이벤트(`touchstart`/`touchmove`) 자체의 `preventDefault` 동작은 Playwright API로
  실제 스크롤 억제까지 재현해 검증하지는 못했고, 코드 정적 리딩으로만 확인했다(아래 참고).
- PNG를 실제 이미지 뷰어로 열어 육안 확인하지는 않았고, 브라우저 canvas API로 픽셀 데이터를
  읽어 검증했다(동등한 신뢰도로 판단).

## 발견한 문제

### 1. [치명적 → 수정 완료] 빠른 드래그 시 칠하기 누락(셀 스킵)

- **증상**: `paintAtEvent`가 이전 셀(`lastCell`)과 현재 셀만 비교해 현재 셀 하나만 칠했다.
  `mousemove`는 포인터가 빠르게 움직이면 지나간 모든 셀에 대해 발생하지 않으므로, 예를 들어
  한 프레임 사이에 `(2,2)`에서 `(2,10)`으로 이동하면 실제로는 `(2,2)`와 `(2,10)`만 칠해지고
  중간 7칸은 비어 있었다.
- **재현**: `mouse.down()` 후 `steps: 1`로 먼 거리를 한 번에 이동 → 실제 테스트 결과
  `X.......X` (양 끝만 칠해짐, 수정 전).
- **수정**: `editor.js`에 Bresenham 직선 알고리즘 기반 `applyToolAlongLine(from, to)`를
  추가하고, `paintAtEvent`가 이전 셀이 있을 때 현재 셀로 바로 칠하는 대신 이전 셀→현재 셀
  사이를 직선으로 보간하며 칠하도록 변경했다. 같은 셀을 반복 처리하지 않는 기존 최적화
  (`lastCell` 동일 시 무시)는 그대로 유지했고, 보간 시작점(이전 셀)은 이미 칠해졌으므로
  다시 칠하지 않도록 처리했다.
- **재검증**: 동일 시나리오 재실행 결과 `XXXXXXXXX` (전 구간 정상 채워짐)로 확인.

### 2. [경미 → 수정 완료] 지우개 토글 버튼에 `aria-pressed` 상태 누락

- **증상**: `#eraser-btn`이 `.active` 클래스로 시각적 토글 상태만 표시하고, 스크린리더가
  인식할 수 있는 `aria-pressed` 속성이 없었다.
- **수정**: `index.html`에 `aria-pressed="false"` 초기값을 추가하고, `editor.js`의 지우개
  클릭 핸들러와 `selectColor()`(팔레트 선택 시 지우개 자동 해제) 양쪽에서
  `eraserBtn.setAttribute("aria-pressed", ...)`를 갱신하도록 했다.

## 검증 결과 요약 (문제 없음으로 확인된 항목)

- `cellFromPointerEvent`: `getBoundingClientRect()` 기반 계산으로 CSS 확대 배율(384px로
  표시되지만 논리 해상도는 16×16)과 무관하게 항상 올바른 셀을 가리켰다. 경계값(`(15,15)`
  포함)과 캔버스 밖 클릭(범위 밖 반환 `null`)도 정상 동작 확인.
- 같은 셀 반복 칠하기 방지: `lastCell` 비교로 정상 동작(이번 수정 후에도 유지).
- PNG 저장: 업스케일 캔버스(512×512)에 `imageSmoothingEnabled = false` 적용, 실제
  다운로드 트리거 확인, 칠한 셀 색상이 올바른 위치에 32배 확대되어 저장됨(`#e53935` 정확히
  일치), 미채색 칸은 alpha 0으로 투명 저장됨을 실측 확인.
- 지우개/팔레트 상호작용: 지우개 활성 중 팔레트(스와치·커스텀 컬러 모두) 클릭 시 지우개가
  자동으로 꺼짐. 지우개로 실제 셀이 지워짐(투명 처리) 확인.
- "전체 지우기": 클릭 시 `pixels` 전체가 비워지고 캔버스가 실제로 비는 것을 확인.
- 터치: `touch-action: none`이 `#grid`에 실제 적용됨을 computed style로 확인. `touchstart
  /touchmove/touchend/touchcancel` 핸들러 모두 존재하며 `touchstart`/`touchmove`/`touchend`에서
  `event.preventDefault()`가 호출되어 스크롤을 막는 코드가 정적으로 확인됨(정적 리딩,
  위 한계 참고).
- 라이트/다크 모드: `:root`와 `prefers-color-scheme: dark` 양쪽에 사용되는 변수
  (`--bg`, `--text`, `--text-muted`, `--canvas-bg`, `--panel-bg`, `--swatch-border`,
  `--swatch-border-selected`, `--button-bg`, `--button-text`, `--button-active-bg`)가 누락 없이
  정의되어 있고, 실제 `colorScheme` 에뮬레이션으로 각각 다른 배경색이 적용됨을 확인
  (light `rgb(250,248,240)`, dark `rgb(28,26,23)`).
- 반응형: `@media (min-width: 640px)`에서 `.editor-layout`이 `column → row`로 실제
  전환됨을 확인. 스와치/버튼 최소 크기(40px/44px)로 터치 타깃 확보.
- 블로그로 돌아가는 링크: `../../index.html`로 `/apps/2048/index.html`과 동일한 패턴,
  경로 계산도 올바름(`apps/pixel-art/` → 저장소 루트).
- 콘솔 에러: 위 모든 시나리오 실행 동안 콘솔 에러/페이지 에러 없음.
- 오탈자: 한국어 문구(제목, 안내, 버튼 라벨, aria-label) 검토 결과 명백한 오탈자 없음.

## 수정하지 않고 남겨둔 이슈

- **`src/build.js`의 `apps` 배열에 pixel-art 항목이 아직 없음**: spec.md 10절에 Embed
  단계에서 처리하도록 명시된 항목이며, 이 지침 파일이 허용한 수정 가능 파일
  (`apps/pixel-art/index.html`, `style.css`, `editor.js`, `review.md`)에 `src/build.js`가
  포함되지 않으므로 수정하지 않았다. 현재 상태로는 블로그 메인 페이지 카드 목록에
  픽셀 아트 에디터가 노출되지 않는다 — Embed 단계 작업으로 별도 처리 필요.
- **터치 실동작(실제 터치스크린 스크롤 억제)의 엔드투엔드 검증은 못함**: 위 "한계" 참고.
  코드상 `preventDefault()` + `touch-action: none` 조합이 표준적으로 스크롤을 막는 패턴이라
  정적 검토로 충분히 신뢰 가능하다고 판단했다.

## 최종 결론

**정상 동작한다고 판단한다.** 발견된 유일한 기능적 버그(빠른 드래그 시 셀 스킵)는 직접
수정 후 재검증까지 마쳤고, 그 외 클릭/드래그 칠하기, 지우개, 전체 지우기, PNG 저장(투명도·
업스케일 포함), 다크/라이트 모드, 반응형 레이아웃, 콘솔 에러 없음을 모두 브라우저에서
실측으로 확인했다. 유일하게 남은 항목은 코드 버그가 아니라 저장소 배포 파이프라인 연결
(Embed 단계, `src/build.js`)로, 이 리뷰의 수정 권한 범위 밖이라 보고만 한다.
