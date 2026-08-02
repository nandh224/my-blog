# 지침: 픽셀 아트 에디터 - Build 단계

너는 이 저장소(my-blog)의 Build 서브에이전트다. 아래 범위 내에서만 작업하라.

## 배경

my-blog는 마크다운 블로그 + 미니 웹앱 포트폴리오 프로젝트다. 프레임워크 없이 순수 HTML/CSS/JS만
사용한다. Plan 단계에서 계획 문서 `/apps/pixel-art/spec.md`가 이미 작성되었다. 먼저 이 문서를
읽고 그 내용을 그대로 구현하라. 참고로 `/apps/2048/`에 동일한 방식으로 만든 앱이 있으니
스타일/패턴 참고용으로 읽어봐도 좋다(단, 수정하지는 마라).

## 네 임무

`spec.md`의 계획에 따라 실제 에디터를 구현한다:

- `/apps/pixel-art/index.html`
- `/apps/pixel-art/style.css`
- `/apps/pixel-art/editor.js`

spec.md에 정의된 파일 구조, 캔버스/그리기 로직(자료구조/주요 함수), 색상 팔레트, PNG 저장 방식,
UI/UX, 조작 방식을 충실히 따른다. 특히:

- `<canvas width="16" height="16">` + `pixels: string[16][16]` 배열, CSS로 확대 표시
  (`image-rendering: pixelated`)
- 마우스 클릭/드래그 + 모바일 터치로 연속 칠하기 (좌표 변환 로직 공유)
- 지우개 토글, 전체 지우기 버튼
- 색상 팔레트(기본 스와치 8~12개 + `<input type="color">` 커스텀 색상)
- PNG 저장: 임시 캔버스에 업스케일(32px/셀, 512x512) + `imageSmoothingEnabled=false` +
  `toDataURL` + `<a download="pixel-art.png">`, 미채색 칸은 투명 처리
- 라이트/다크 모드 CSS 변수, 모바일 반응형

spec.md의 "9. 범위 밖"에 명시된 항목(레이어/프레임, undo/redo, 그림 저장/불러오기, 도구 확장,
격자 크기 변경, 수동 다크모드 토글)은 구현하지 마라.

## 제약 (중요)

- **`/apps/pixel-art/` 폴더 안의 파일만 생성/수정한다.** (`index.html`, `style.css`, `editor.js`)
- `/apps/pixel-art/spec.md`, `plan-instructions.md`, `build-instructions.md`는 수정하지 마라.
- 이 폴더 밖의 어떤 파일도 건드리지 마라 — `src/build.js`, `src/templates.js`, `/apps/2048/`,
  `CLAUDE.md`, 블로그의 다른 어떤 파일도 포함된다. (블로그 메인 페이지 연동은 별도의 Embed
  단계에서 처리한다.)
- 프레임워크 사용 금지. 순수 HTML/CSS/JS만 사용.
- 불필요한 추상화, 설정 옵션, 과도한 주석을 추가하지 마라. 주석은 자명하지 않은 이유(WHY)가
  있을 때만 최소한으로 작성한다.

## 완료 후

무엇을 만들었는지, spec.md의 계획과 다르게 구현한 부분이 있다면(있어서는 안 되지만 불가피한 경우)
그 이유를 요약해서 보고하라.
