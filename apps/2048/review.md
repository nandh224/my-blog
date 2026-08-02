# 2048 게임 - Review 결과

Build 단계 산출물(`index.html`, `style.css`, `game.js`)을 spec.md와 대조하며 독립적으로 검증했다.

## 검증 방법

- 브라우저 자동화 도구(Playwright/Puppeteer 등)와 jsdom 모두 이 환경에서는 사용할 수 없어
  **실제 브라우저 렌더링 확인은 수행하지 못했다.** 대신 지침에 안내된 대체 방법을 확장해서 적용했다.
- **정적 분석**: `index.html`/`style.css`/`game.js`를 전부 정독하며 spec.md 5절(자료구조, 주요
  함수, 회전/전치 로직)과 실제 구현을 줄 단위로 대조. `rotateBoard`를 4방향(up/down/left/right)
  각각에 대해 손으로 좌표를 추적해 회전 횟수·역회전 계산이 올바른지 검증.
- **Node.js 로직 테스트 (`test-2048-logic.mjs`)**: `game.js`의 DOM 비의존 순수 함수
  (`slideAndMergeLine`, `move`, `rotateBoard`, `isGameOver`, `hasWon` 등)를 그대로 발췌해
  24개 케이스 검증 (4방향 이동, 연쇄 병합 방지, 병합 점수 계산, 보드 합 보존, 게임오버/승리 판정,
  회전 4회 항등 변환 등). **24/24 통과.**
- **Node.js DOM 스텁 통합 테스트 (`test-2048-integration.mjs`)**: `game.js` 원본 파일을 수정 없이
  그대로 로드하되, `document`/`localStorage`를 최소 스텁으로 대체해 실제 초기화·이벤트 배선을
  검증 (element id 일치 여부, keydown/touchstart/touchend/click 리스너 등록, `preventDefault`
  호출 여부, restart 동작 등). **16/16 통과.**
- **localStorage 예외 시나리오 테스트 (`test-2048-localstorage-throws.mjs`)**: `localStorage.getItem/setItem`이
  예외를 던지는 환경을 시뮬레이션해 게임이 크래시 없이 로드되는지 검증. **3/3 통과** (수정 후).
- 이 세 테스트 스크립트는 검증 목적의 임시 스크립트로 리포지토리 밖(스크래치패드)에 작성했으며
  `apps/2048/` 안에는 남기지 않았다.

## 발견한 문제 목록

### 치명적 — `.game-message`가 `hidden` 속성에도 불구하고 항상 보임 (수정함)
- `index.html`의 `#game-message`는 `class="game-message" hidden`으로 시작하지만,
  `style.css`의 `.game-message { display: flex; ... }` 규칙이 **author 오리진**이라
  `[hidden]`의 UA 기본 스타일(`display: none`, user-agent 오리진)보다 캐스케이드 우선순위가
  높다. Author 규칙은 특이도와 무관하게 UA 규칙을 이긴다. 결과적으로 `style.css`에 `[hidden]`을
  되돌리는 규칙이 없으면 **오버레이가 페이지 로드 직후부터 항상 보드 위에 표시된 채로 남는다**
  (게임 오버/승리 전에도). JS는 `messageEl.hidden`을 정상적으로 토글하지만 CSS가 이를 무시하는
  상태였다.
- 수정: `style.css`에 `.game-message[hidden] { display: none; }` 규칙을 추가해, `hidden`
  속성이 있을 때는 더 높은 특이도(0,2,0 > 0,1,0)로 다시 숨겨지도록 했다.

### 경미 — `localStorage` 접근에 예외 처리 없음 (수정함)
- 기존 코드는 `localStorage.getItem`/`setItem`을 try/catch 없이 직접 호출했다. 일부 브라우저의
  `file://` 직접 실행, 프라이빗 모드, 샌드박스 iframe 등에서 `localStorage` 접근이 예외를
  던지는 경우 IIFE 최상단(`let bestScore = ...`)에서 즉시 크래시가 나며 게임 전체가 초기화되지
  않는다(보드도, 이벤트 리스너도 전혀 등록되지 않음).
- 수정: `loadBestScore()`/`saveBestScore()` 헬퍼로 감싸 예외 발생 시 각각 `0`으로 폴백, 저장
  실패는 조용히 무시하도록 했다. 예외를 던지는 `localStorage`를 시뮬레이션한 테스트로 정상
  로드를 확인했다.

### 제안 (수정하지 않음)
- **회전/전치, 병합, 게임오버/승리 판정 로직**: 직접 좌표 추적 및 24개 Node 테스트로 검증한 결과
  버그를 발견하지 못했다. `slideAndMergeLine`의 연쇄 병합 방지(`[2,2,2,2] → [4,4]`, 3연속 동일값은
  왼쪽 쌍만 병합)도 2048 규칙과 일치한다.
- **승리 오버레이 표시 중 키보드/터치 입력 처리**: `keydown`/`touchend` 핸들러의
  `if (!messageEl.hidden && keepPlayingBtn.hidden) return;` 조건은 게임 오버 상태에서만 입력을
  막고, 승리("계속하기") 오버레이 상태에서는 입력을 막지 않는다. 오버레이가 반투명
  (`--overlay-bg` alpha 0.85)이라 실제 원조 2048과 유사하게 배경에서 게임이 계속 진행되는 방식으로
  보이며, 명백한 버그라기보다 의도된 동작에 가깝다고 판단해 손대지 않았다.
- **다크모드에서 타일 색상(`--tile-2-bg` ~ `--tile-2048-bg`)이 라이트/다크 동일**: spec.md는
  "라이트/다크 각각 대비가 충분하도록"라고 제안했지만, 실제로는 두 모드에서 타일 배경색을
  공유하고 타일 텍스트 색(`--tile-text-dark`/`--tile-text-light`)만 값별로 달리해 대비를
  확보하는 방식이다. 원조 2048과 동일한 접근이고 CSS 변수 자체는 누락 없이 정의돼 있어 버그로
  보기 어렵고, 굳이 라이트/다크 전용 타일 팔레트를 추가하는 것은 CLAUDE.md의 "과한 설정 옵션을
  만들지 않음" 원칙과도 충돌할 수 있어 그대로 두었다.
- **게임 오버 시 "새 게임 버튼 강조" 미구현**: spec.md 5절에 언급된 사항이지만 구체적 스펙(강조
  방식)이 없고 사소한 스타일 제안이라 임의로 추가하지 않았다.
- **뷰포트 `maximum-scale=1`로 인한 핀치 줌 제한**: 접근성 관점에서 완전한 베스트프랙티스는
  아니지만 spec.md가 명시적으로 요구한 사항이 아니라 스코프를 벗어난다고 판단해 손대지 않았다.
- **`/apps/`가 아직 `dist/`로 복사되지 않음**: `dist/apps/` 디렉터리가 존재하지 않아, 현재는
  로컬 서버(`npm run dev`)나 실제 배포 결과물에서 이 게임에 접근할 수 없다. 그러나 spec.md 8절에
  이는 명시적으로 "Embed 단계"의 책임으로 위임되어 있고, 이번 Review 지침의 수정 허용 범위
  (`apps/2048/index.html`, `style.css`, `game.js`, `review.md`)에도 `src/build.js`가 포함되지
  않으므로 수정하지 않고 이슈로만 남긴다. `index.html`의 백링크(`../../index.html`)는
  `dist/apps/2048/index.html` 기준으로는 올바른 상대 경로이므로 복사만 되면 정상 동작할 것으로
  보인다.

## 수정한 파일

- `apps/2048/style.css`: `.game-message[hidden] { display: none; }` 규칙 추가.
- `apps/2048/game.js`: `localStorage` 읽기/쓰기를 `loadBestScore()`/`saveBestScore()`로 감싸
  예외 발생 시 안전하게 폴백하도록 수정.

## 최종 결론

두 문제를 수정한 뒤 기준으로, 이 게임은 **정상 동작한다고 판단한다.**
- 핵심 로직(4방향 이동/회전, 병합, 게임오버/승리 판정, 점수/최고점수 갱신)은 24개의 독립 Node
  테스트로 검증했고 전부 통과했다.
- DOM 배선(요소 id 매칭, 키보드/터치/버튼 이벤트 리스너 등록, `preventDefault` 호출)은 16개의
  DOM 스텁 통합 테스트로 검증했고 전부 통과했다.
- 발견된 치명적 문제(오버레이가 항상 보이는 CSS 캐스케이드 버그)와 경미한 문제(localStorage
  예외 미처리)는 모두 수정 후 재검증을 마쳤다.
- 다만 실제 브라우저에서의 시각적 확인(렌더링, 애니메이션 체감, 실제 터치 제스처)은 이 환경의
  도구 제약상 수행하지 못했으므로, 가능하다면 실제 브라우저에서 한 번 더 육안 확인하는 것을
  권장한다. 또한 `/apps/`를 `dist/`로 복사하는 Embed 단계 작업이 완료되기 전까지는 로컬
  서버/배포 환경에서 게임 페이지 자체에 접근할 수 없다는 점을 별도로 인지해야 한다.
