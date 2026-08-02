---
title: 깃으로 블로그 관리하고 배포하기
date: 2026-08-02
---

이 블로그 프로젝트를 Git으로 관리하고 GitHub Pages에 배포하기까지의 과정을 정리합니다.

## 1. Git 저장소 초기화 및 첫 커밋

프로젝트 루트에서 `git init`으로 저장소를 만들고, `node_modules/`와 `dist/`는 `.gitignore`에 등록해 커밋 대상에서 제외했습니다. 커밋 작성자 정보가 없어서 이 저장소에 한정해 `user.name`, `user.email`을 설정한 뒤 첫 커밋을 남겼습니다.

```bash
git config user.name "nandh224"
git config user.email "nandh22@gmail.com"
git add .
git commit -m "블로그 초기 버전 완성"
```

## 2. 디자인 실험과 되돌리기

네온 테마로 디자인을 전면 개편해봤지만 마음에 들지 않아 폐기하기로 했습니다. 아직 커밋되지 않은 변경 사항이었기 때문에 `git restore`로 간단히 직전 커밋 상태로 되돌릴 수 있었습니다.

```bash
git restore CLAUDE.md src/build.js src/site.js src/styles.css src/templates.js
npm run build
```

커밋하기 전에는 언제든 작업 내용을 안전하게 되돌릴 수 있다는 점이 Git의 큰 장점입니다.

## 3. GitHub 저장소 생성 및 푸시

GitHub CLI(`gh`)로 로그인 상태를 확인하고, public 저장소를 만든 뒤 로컬 저장소를 원격에 연결해 푸시했습니다.

```bash
gh auth status
gh repo create nandh224/my-blog --public --source=. --remote=origin
git push -u origin master
```

## 4. GitHub Actions로 자동 빌드·배포

이 프로젝트는 `dist/`를 커밋하지 않으므로, `master`에 푸시할 때마다 GitHub Actions가 `npm run build`를 실행하고 결과물을 GitHub Pages로 배포하도록 워크플로를 작성했습니다(`.github/workflows/deploy.yml`).

주요 단계:

- `actions/checkout`으로 코드 체크아웃
- `actions/setup-node`로 Node.js 환경 준비 후 `npm ci`, `npm run build`
- `actions/upload-pages-artifact`로 `dist/` 업로드
- `actions/deploy-pages`로 실제 배포

그다음 GitHub API로 Pages의 빌드 방식을 "GitHub Actions"로 설정했습니다.

```bash
gh api -X POST repos/nandh224/my-blog/pages -f build_type=workflow
```

## 5. 결과 확인

`gh run watch`로 워크플로가 끝까지 성공하는 것을 확인하고, 배포된 주소에 직접 요청을 보내 정상 응답을 확인했습니다.

- 저장소: https://github.com/nandh224/my-blog
- 배포된 사이트: https://nandh224.github.io/my-blog/

이제부터는 `master` 브랜치에 커밋을 푸시하기만 하면 별도 수동 작업 없이 블로그가 자동으로 다시 빌드되고 배포됩니다.
