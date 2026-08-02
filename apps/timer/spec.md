# 타이머/스톱워치 - 계획 문서 (Plan)

> 이 문서는 계획 단계 산출물이다. 실제 앱 코드(HTML/CSS/JS)는 포함하지 않으며,
> Build/Embed 단계에서 이 계획을 바탕으로 구현한다.

## 1. 개요

`my-blog` 저장소는 마크다운 블로그 외에 미니 웹앱들을 `/apps/` 아래에 포트폴리오 형태로
호스팅한다 (`/apps/2048/`, `/apps/pixel-art/`가 이미 같은 방식으로 구현되어 있음).
이번 앱은 **카운트다운 타이머와 스톱워치, 두 가지 모드를 하나의 화면에서 전환하며 쓸 수 있는
타이머 앱**이다.

- **카운트다운 타이머**: 분/초를 입력해 목표 시간을 설정하고, 0에 도달하면 소리/시각 효과로
  알려준다
- **스톱워치**: 누르면 즉시 경과 시간 측정을 시작하고, 일시정지/재개가 가능하다
- 두 모드 모두 시작/일시정지/리셋 조작을 제공한다
- 프레임워크 없이 순수 HTML/CSS/JS로 구현 (블로그 본체와 동일한 기술 스택 제약)
- `/apps/2048/`, `/apps/pixel-art/`와 마찬가지로 자체 완결적(self-contained) 앱이며, 블로그의
  `styles.css`를 재사용하지 않고 전용 CSS를 별도로 둔다. 다만 라이트/다크 모드 대응, "장식보다
  콘텐츠(시간 표시) 우선"이라는 프로젝트 디자인 원칙은 동일하게 따른다

## 2. 저장소 구조 파악 결과 (참고용, 이번 단계에서 수정 없음)

- `src/build.js`
  - `apps` 배열(현재 `2048`, `pixel-art` 두 항목)이 블로그 메인 페이지에 노출할 앱 목록이다.
    각 항목은 `{ name, path, description }` 형태.
  - `/apps/` 디렉터리 전체를 `dist/apps/`로 재귀 복사하는 로직(`copyDirRecursive`)이 **이미
    범용으로 구현되어 있다.** `skipExt: [".md"]` 옵션으로 `.md` 파일(계획/검토 문서)만 복사에서
    제외한다. 즉 `apps/timer/` 디렉터리를 새로 추가하기만 해도 정적 파일(html/css/js)은 자동으로
    `dist/apps/timer/`에 복사되고, `spec.md`는 배포물에서 자동으로 제외된다.
  - 이 로직은 `apps/2048/`, `apps/pixel-art/` 두 앱 모두에 이미 적용되어 검증된 패턴이다.
- `src/templates.js`
  - `indexPage(posts, apps)` → `appsSection(apps)`가 `apps` 배열을 순회하며 카드(제목/설명 +
    `<iframe src="apps/{path}/index.html">` 미리보기 + `apps/{path}/index.html` 링크)를 **자동
    생성**한다. 카드 UI를 위해 `templates.js`를 직접 고칠 필요가 없다 — `apps` 배열에 항목만
    추가하면 된다.
- `.github/workflows/deploy.yml`
  - `npm run build` 실행 후 `dist/` 폴더 전체를 GitHub Pages 아티팩트로 업로드한다. `build.js`가
    이미 `/apps/`를 `dist/apps/`로 복사하므로 배포 워크플로 자체는 수정할 필요가 없다.

**결론**: `apps/2048/`, `apps/pixel-art/`를 추가했을 때와 동일하게, 이번에도 `build.js`의 복사
로직과 `templates.js`의 카드 렌더링은 이미 범용으로 마련되어 있어 손댈 필요가 없다. Embed 단계에서
필요한 변경은 **`src/build.js`의 `apps` 배열에 `timer` 항목 하나를 추가하는 것뿐**이다 (8절 참고).

## 3. 파일 구조

```
apps/timer/
├── spec.md         # (본 문서, plan 단계 산출물)
├── index.html       # 타이머/스톱워치 페이지 마크업 (모드 탭, 시간 표시, 조작 버튼)
├── style.css        # 전용 스타일 (라이트/다크, 반응형)
└── timer.js         # 카운트다운/스톱워치 로직 + 렌더링 + 입력 처리
```

- 외부 라이브러리: **불필요**. 시간 계산은 `Date.now()`/`setInterval`만으로, 완료 알림음은
  Web Audio API의 오실레이터로 충분히 구현 가능한 범위이므로 CDN 라이브러리를 도입하지 않는다.
- 이미지/폰트 등 별도 에셋 없음 (알림음도 파일이 아닌 코드로 생성하는 짧은 비프음 하나).

## 4. 각 파일의 역할

### `index.html`
- `<meta viewport>`, 타이틀(`타이머 / 스톱워치`), `style.css` 링크
- 블로그 메인으로 돌아가는 링크 ("← 블로그로", 기존 두 앱과 동일한 패턴)
- 모드 전환 탭: "카운트다운"/"스톱워치" 버튼 2개 (`#tab-countdown`, `#tab-stopwatch`), 현재
  선택된 탭에 활성 스타일
- 카운트다운 영역(`#countdown-panel`)
  - 시간 입력: 분(`#cd-minutes`), 초(`#cd-seconds`) 숫자 입력 (`<input type="number">`, 모바일
    숫자 키패드가 뜨도록 `inputmode="numeric"`) — 실행 중에는 `disabled`
  - 남은 시간 표시(`#cd-display`, `MM:SS` 큰 글씨)
  - 완료 시 표시할 상태 문구 영역(`#cd-status`, 기본 숨김 — "시간 종료!" 등)
- 스톱워치 영역(`#stopwatch-panel`)
  - 경과 시간 표시(`#sw-display`, `MM:SS.d` 형식 — 분:초.10분의1초)
- 공통 조작 버튼: 시작/일시정지 토글 버튼(`#btn-toggle`, 상태에 따라 라벨이 "시작"↔"일시정지"로
  바뀜) + 리셋 버튼(`#btn-reset`)
- 사용법 안내 문구 영역 (하단 고정, 8절 참고)
- `<script src="timer.js" defer></script>`

### `style.css`
- `apps/2048/style.css`, `apps/pixel-art/style.css`와 동일한 패턴(라이트 기본값 +
  `prefers-color-scheme: dark` + `data-theme` 속성 오버라이드)의 CSS 변수 기반 다크모드.
  블로그의 `src/styles.css`는 import하지 않고, 이 앱에도 **동일한 변수 이름과 값**을
  자체 정의한다(자체완결 원칙):
  ```css
  :root {
    --bg: #ffffff;
    --text: #1a1a1a;
    --text-secondary: #626a72;
    --link: #0969da;
    --border: #e5e5e5;
    --code-bg: #f6f8fa;
  }
  @media (prefers-color-scheme: dark) { :root { /* 동일한 다크 값 */ } }
  :root[data-theme="light"] { /* 라이트 값 재정의 */ }
  :root[data-theme="dark"] { /* 다크 값 재정의 */ }
  ```
  (`src/styles.css`에 정의된 라이트/다크 색상 값을 그대로 가져와 재정의한다. `data-theme`
  속성 오버라이드까지 두는 이유: 블로그 본체가 우측 상단 토글로 `localStorage`에 테마를
  저장하는 것과 별개로, 이 앱은 독립 페이지이므로 자체적으로 시스템 설정(`prefers-color-scheme`)만
  따르는 것을 기본으로 하되, 향후 토글이 필요해질 경우를 대비해 동일한 오버라이드 구조를
  미리 맞춰 둔다 — 이번 구현 범위에서 토글 버튼 자체를 넣지는 않는다)
- 시간 표시(`#cd-display`, `#sw-display`): 매우 큰 폰트(`clamp()`로 반응형, 예:
  `clamp(2.5rem, 12vw, 5rem)`), `font-variant-numeric: tabular-nums`로 숫자 폭을 고정해
  매 tick마다 자릿수가 흔들리지 않게 함
- 모드 탭: `--border`로 구분된 두 버튼, 활성 탭은 `--link` 색으로 강조(밑줄 또는 배경)
- 조작 버튼(시작/일시정지, 리셋): 모바일 터치를 고려해 최소 44px 이상의 큰 탭 영역, 버튼 사이
  충분한 간격(`gap`)
- 카운트다운 완료 시 시각 효과: `#cd-display`에 클래스 토글(예: `.finished`)로 색상을 강조색
  (예: 경고색 또는 `--link`)으로 잠깐 바꾸는 정도의 최소한의 피드백만 사용 (깜빡임 애니메이션은
  1~2회 정도로 제한, 과도한 반복 애니메이션 지양 — 블로그의 "불필요한 장식 지양" 원칙)
- 반응형: `main` 컨테이너 `max-width`로 데스크톱에서 과도하게 넓어지지 않게 제한, 작은 화면에서는
  탭/버튼이 세로로도 자연스럽게 줄바꿈되도록 flex-wrap 사용

### `timer.js`
- 카운트다운/스톱워치 상태, 로직, DOM 렌더링, 입력 처리를 모두 포함 (규모가 작으므로 기존 두
  앱과 같이 파일 분리하지 않음)
- 아래 5절 참고

## 5. 핵심 로직 설계

### 타이밍 정확도 원칙 (공통)
- `setInterval`의 콜백 호출 간격 자체는 브라우저 스케줄링 오차로 정확히 지정한 만큼 보장되지
  않는다(탭이 백그라운드일 때 특히 지연됨). 이 오차가 **누적되지 않도록**, "몇 번 틱이
  돌았는가"로 시간을 계산하지 않고 **매 틱마다 `Date.now()`로 실제 경과/남은 시간을 다시
  계산**한다. `setInterval`은 어디까지나 "화면을 다시 그릴 시점을 알려주는 트리거" 역할만
  하고, 실제 표시값은 항상 타임스탬프 차이로 구한다. 화면 갱신 주기는 스톱워치가 0.1초 단위까지
  표시하므로 `setInterval(tick, 100)` 정도면 충분하고, 매끄러운 애니메이션이 필요한 게 아니므로
  `requestAnimationFrame`까지는 쓰지 않는다(과설계 방지).

### 자료구조
- `mode`: `"countdown" | "stopwatch"` — 현재 활성 탭
- 카운트다운 상태 `countdown`:
  - `totalMs`: 사용자가 입력한 목표 시간(밀리초). 입력 필드(`#cd-minutes`, `#cd-seconds`)
    값으로부터 계산
  - `remainingMs`: 리셋/정지 상태일 때 남은 시간을 보관하는 값 (일시정지 시 갱신)
  - `endTimestamp`: `number | null` — 실행 중일 때만 값 존재. `Date.now() + remainingMs`로
    시작 시점에 계산해두고, 매 틱마다 `endTimestamp - Date.now()`로 남은 시간을 구함
  - `running`: `boolean`
  - `finished`: `boolean` — 0에 도달해 알림을 이미 울렸는지 여부 (중복 알림 방지)
- 스톱워치 상태 `stopwatch`:
  - `elapsedMs`: 일시정지 시점까지 누적된 경과 시간
  - `startTimestamp`: `number | null` — 실행 중일 때만 값 존재 (`Date.now()`)
  - `running`: `boolean`
- `intervalId`: 현재 화면 갱신용 `setInterval`의 id (모드 전환/정지 시 `clearInterval`로 정리)

### 주요 함수 (공통 패턴)
- `getCountdownRemaining()`: `running`이면 `Math.max(0, endTimestamp - Date.now())`, 아니면
  `remainingMs` 반환
- `getStopwatchElapsed()`: `running`이면 `elapsedMs + (Date.now() - startTimestamp)`, 아니면
  `elapsedMs` 반환
- `formatCountdown(ms)`: `MM:SS` 문자열로 변환 (분은 두 자리 이상도 표시 가능하도록 패딩만
  하고 자리수 제한은 두지 않음)
- `formatStopwatch(ms)`: `MM:SS.d` 문자열로 변환 (0.1초 단위 한 자리)
- `startCountdown()`: 입력 필드에서 `totalMs`를 읽어 `remainingMs`가 0이면(리셋 후 첫 시작)
  `remainingMs = totalMs`로 채운 뒤, `endTimestamp = Date.now() + remainingMs`, `running = true`,
  `finished = false`, 입력 필드 `disabled = true`, `startTick()` 호출
- `pauseCountdown()`: `remainingMs = getCountdownRemaining()`으로 현재 값을 고정, `running = false`,
  `endTimestamp = null`
- `resetCountdown()`: `running = false`, `endTimestamp = null`, `finished = false`,
  `remainingMs = 0`(또는 입력 필드 값 기준으로 재계산), 입력 필드 `disabled = false`, 표시를
  입력값 기준 초기 상태로 되돌림
- `startStopwatch()`: `startTimestamp = Date.now()`, `running = true`, `startTick()` 호출
- `pauseStopwatch()`: `elapsedMs = getStopwatchElapsed()`, `running = false`, `startTimestamp = null`
- `resetStopwatch()`: `running = false`, `startTimestamp = null`, `elapsedMs = 0`
- `startTick()`: 기존 `intervalId`가 있으면 정리 후 `setInterval(renderActive, 100)`로 등록
  (100ms마다 활성 모드 화면 갱신 + 카운트다운의 경우 0 도달 여부 검사)
- `renderActive()`: 현재 `mode`에 따라 해당 패널의 표시값을 갱신. 카운트다운 모드에서
  `getCountdownRemaining() <= 0`이고 아직 `finished`가 아니면 `onCountdownFinished()` 호출
- `onCountdownFinished()`: `finished = true`, `running = false`, `clearInterval`, 완료 상태
  문구(`#cd-status`) 표시, `#cd-display`에 `.finished` 클래스 토글, `playBeep()` 호출
- `playBeep()`: Web Audio API(`AudioContext` + `OscillatorNode`)로 짧은 비프음(예: 880Hz,
  0.3~0.5초, `gainNode`로 감쇠) 1회 재생. 외부 음원 파일 불필요. (브라우저 자동재생 정책상
  `AudioContext`는 사용자가 이미 "시작" 버튼을 눌러 상호작용한 뒤 생성/재생되므로 별도
  차단 이슈 없음)
- `switchMode(newMode)`: 6절의 모드 전환 정책에 따라 처리 (아래 참고)

### 진행 흐름
1. 페이지 로드 시 `mode = "countdown"`, 두 상태 모두 초기값(정지, 0)으로 시작, 카운트다운
   입력 필드는 빈 값이 아닌 기본값(예: `5`분 `0`초) 정도를 미리 채워 즉시 시작 가능하게 함
2. "시작/일시정지" 버튼 클릭 → 현재 `mode`에 해당하는 `start*()`/`pause*()`를 토글 호출,
   버튼 라벨 갱신
3. "리셋" 버튼 클릭 → 현재 `mode`에 해당하는 `reset*()` 호출, 화면을 초기 상태로 갱신
4. 카운트다운이 0에 도달하면 자동으로 `onCountdownFinished()`가 실행되어 정지 + 알림
5. 모드 탭 클릭 → `switchMode()` (6절)

## 6. UI/UX 및 조작 방식

- **모드 전환 정책 (과설계 방지를 위한 단순화)**: 두 모드를 동시에 표시/운영하지 않는다.
  다른 모드로 탭을 전환하면 현재 실행 중인 타이머/스톱워치를 **자동으로 일시정지**한다
  (상태값은 보존되므로, 다시 그 탭으로 돌아오면 일시정지된 지점부터 이어서 시작 가능).
  두 모드를 백그라운드에서 동시에 카운트하게 하는 것은 이번 요구사항(모드 두 가지, 시작/
  일시정지/리셋)의 범위를 벗어나므로 구현하지 않는다.
- **데스크톱 입력**: 마우스 클릭으로 탭 전환, 숫자 입력 필드는 `<input type="number">`
  스피너 및 직접 타이핑 지원. 시작/일시정지/리셋은 일반 버튼 클릭
- **모바일 터치 대응**:
  - 모든 버튼(탭, 시작/일시정지, 리셋)은 최소 44x44px 탭 영역 확보
  - 숫자 입력 필드에 `inputmode="numeric"` 지정으로 모바일에서 숫자 키패드가 뜨도록 함
  - 레이아웃은 세로 스택 기본(작은 화면), 넓은 화면에서는 버튼들이 가로로 나열되도록
    `flex-wrap`으로 자연스럽게 대응 (별도 breakpoint 미디어쿼리를 최소한으로 사용)
- **시작/일시정지 버튼**: 하나의 버튼이 상태에 따라 라벨과 동작을 겸함 (정지 상태 → "시작",
  실행 중 → "일시정지"). 카운트다운이 완료된 직후에는 버튼을 "시작"으로 되돌리되 눌러도
  `remainingMs`가 0이므로 사실상 재시작하려면 먼저 "리셋"이 필요함을 사용법 안내에 명시
- **리셋 버튼**: 언제든 클릭 가능, 확인 다이얼로그 없이 즉시 초기화 (기존 두 앱의 "새 게임"/
  "전체 지우기" 버튼과 동일하게 과설계 방지 원칙 유지)
- **사용법 안내 문구**: 화면 하단(조작 버튼 아래, footer 형태의 작은 텍스트 영역)에 고정
  텍스트로 배치. 예시 문구:
  > "카운트다운: 분/초를 입력한 뒤 시작을 누르세요. 스톱워치: 시작을 누르면 바로 측정이
  > 시작됩니다. 일시정지 후 다시 시작하면 이어서 진행됩니다. 다른 탭으로 이동하면 진행 중인
  > 타이머는 자동으로 일시정지됩니다."
  (기존 2048/픽셀 아트 앱들이 조작 안내를 화면 상단 헤더 아래에 배치한 것과 달리, 이 앱은
  화면 대부분을 시간 표시에 쓰고 안내문은 눈에 띄되 방해되지 않도록 하단에 작게 배치하는
  것을 제안 — 구현 단계에서 헤더 아래 배치로 바꿔도 무방한 사소한 선택)
- **다크모드**: 블로그 본체·기존 두 앱과 동일하게 시스템 설정(`prefers-color-scheme`) 자동
  감지를 기본으로 지원. 수동 토글 버튼은 이번 요구사항에 없으므로 넣지 않음 (2048/픽셀 아트
  spec.md와 동일한 판단)
- **접근성**: 시작/일시정지/리셋 버튼과 탭 버튼에 명확한 텍스트 라벨(아이콘만 쓰지 않음),
  시간 표시 영역은 `aria-live="polite"` 정도를 검토해 스크린 리더가 과도하게 자주 읽지
  않으면서도 상태 변화(완료 등)는 알 수 있게 하는 것을 구현 단계에서 고려 (필수 요구사항은
  아니므로 시간이 부족하면 생략 가능한 항목으로 명시)

## 7. 범위 밖 (이번 계획에 포함하지 않음)

- 알람음 커스터마이징(음원 업로드/선택), 볼륨 조절
- 여러 타이머 동시 실행/목록 관리
- 저장된 프리셋(자주 쓰는 시간 즉시 선택 버튼 등)
- 카운트다운 진행 상태를 `localStorage`에 저장해 새로고침 후 이어서 재개하는 기능
  (새로고침하면 초기 상태로 리셋 — 기존 두 앱과 동일한 "새로고침 시 초기화" 원칙)
- 랩타임(스톱워치 구간 기록) 기능
- 브라우저 알림(Notification API)·진동(Vibration API) 연동 — 요구사항에 없는 범위이며 완료
  시 비프음 + 시각 효과만으로 충분

## 8. Embed 단계 메모 — 블로그 메인 페이지에서 수정이 필요한 지점

실제로 저장소를 확인한 결과는 다음과 같다 (2절 참고, 재확인 결과):

1. **`src/build.js`**
   - `/apps/`를 `dist/apps/`로 복사하는 `copyDirRecursive` 로직은 이미 범용으로 구현되어
     있어 **수정 불필요**. `apps/timer/` 디렉터리를 추가하기만 하면 정적 파일이 자동으로
     `dist/apps/timer/`에 복사되고, `spec.md`는 `skipExt: [".md"]`로 자동 제외된다.
   - 변경이 필요한 부분은 `apps` 배열뿐이다. 아래와 같은 형태의 항목을 추가해야 카드가
     블로그 메인에 노출된다:
     ```js
     {
       name: "타이머 / 스톱워치",
       path: "timer",
       description: "카운트다운 타이머와 스톱워치, 시작·일시정지·리셋으로 시간을 측정",
     }
     ```
2. **`src/templates.js`**
   - `appsSection(apps)`가 `apps` 배열을 순회해 카드(제목/설명/iframe 미리보기)를 자동
     생성하므로 **수정 불필요** (2048/픽셀 아트와 동일하게 확인됨)
3. **`src/styles.css`**
   - 변경 불필요. 타이머 앱은 자체 `style.css`를 쓰는 self-contained 앱이며, 블로그 인덱스의
     카드 스타일(`.app-card` 등)은 이미 존재하는 것을 그대로 재사용함
4. **배포 워크플로(`.github/workflows/deploy.yml`)**
   - 별도 수정 불필요. `npm run build`가 이미 `dist/`에 `apps/` 전체를 포함하므로
     `upload-pages-artifact` 단계가 자동으로 함께 배포함

이상으로 계획 수립을 마친다. 실제 구현(HTML/CSS/JS 작성, `build.js`의 `apps` 배열 수정)은
Build/Embed 단계에서 진행한다.
