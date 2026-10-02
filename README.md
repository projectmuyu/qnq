# Questions & Quests

에세이, 연구기록, 프로젝트를 모아두는 개인 사이트입니다.
[Eleventy](https://www.11ty.dev/)로 만들고 GitHub Pages에 올립니다.

## 폴더 구조

```
projects.yml              ← 사이트에 보여줄 깃허브 저장소 목록
src/
├── _data/site.js         ← 사이트 이름, 글쓴이, 이메일, 홈 이미지 등 기본 정보
├── essays/               ← 에세이 (마크다운 파일)
├── research/             ← 연구기록 (마크다운 파일, 달력에 자동 표시)
├── about.md              ← 소개 페이지
├── images/               ← 이미지 파일
├── css/style.css         ← 디자인
└── _includes/            ← 페이지 틀
.github/workflows/deploy.yml  ← 자동 빌드·배포
```

## 처음 올리기

1. 깃허브에서 새 저장소를 만듭니다. 이름을 `아이디.github.io`로 하면 `https://아이디.github.io` 주소가 됩니다.
   (다른 이름이어도 `https://아이디.github.io/저장소이름` 주소로 동작해요.)
2. 이 폴더의 파일을 전부 저장소에 올립니다. (`node_modules`, `_site` 폴더는 빼고)
3. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
4. `src/_data/site.js`에서 이름, 소개, 이메일, 깃허브 주소를 고칩니다.
5. 올리면(push) 1~2분 뒤 사이트가 열립니다. 진행 상황은 **Actions** 탭에서 볼 수 있어요.

## 에세이 쓰기

`src/essays/`에 `날짜-주소.md` 형식으로 파일을 만듭니다. 예) `2026-10-05-first-essay.md`
파일 이름의 날짜 뒤 부분이 글 주소가 됩니다. (`/essays/first-essay/`)

```markdown
---
title: 글 제목
date: 2026-10-05
summary: 목록 페이지에 보일 두세 줄 소개
---

## 1

본문을 씁니다. `## 1`, `## 2`처럼 쓰면 번호로 나뉜 구간이 됩니다.

![이미지 설명](/images/photo.jpg)

(도판) 이미지 설명

주석은 이렇게 답니다.[^1]

[^1]: 주석 내용
```

## 연구기록 쓰기

`src/research/`에 같은 형식으로 파일을 만들면, 날짜에 맞춰 달력에 자동으로 표시됩니다.

```markdown
---
title: 실험 로그 #14
date: 2026-10-06
tag: 실험
summary: 달력 아래 목록에 보일 한 줄 요약
---

자유롭게 기록합니다.
```

태그는 실험, 읽기, 메모, 회고처럼 원하는 대로 정하면 돼요.

## 프로젝트 추가하기

`projects.yml`에 저장소를 적으면 다음 빌드 때 프로젝트 목록과 상세 페이지가 생깁니다.
README, 파일 목록, 최근 커밋을 저장소에서 그대로 가져와요.

```yaml
projects:
  - repo: 아이디/research-baseline
    files:
      - src/train.py          # 코드로 보여줄 파일 (선택, 최대 5개)
  - repo: 아이디/data-pipeline
```

- 공개 저장소만 가져올 수 있어요.
- 사이트는 매일 오전 3시(한국 시간)에 저장소 내용을 다시 가져옵니다.
  바로 반영하고 싶으면 **Actions → Deploy site → Run workflow**를 누르세요.

## 홈 이미지

`src/images/`에 그림을 넣고, `src/_data/site.js`의 `heroImage`에 경로를 적습니다.

```js
heroImage: "/images/hero.jpg",
heroAlt: "그림 설명",
```

## 내 컴퓨터에서 미리 보기 (선택)

[Node.js](https://nodejs.org/) 22 이상이 필요합니다.

```bash
npm install
npm start
```

`http://localhost:8080`에서 미리 볼 수 있어요. 글을 고치면 바로 반영됩니다.

> 참고: `src/essays`, `src/research`에 들어 있는 글은 예시입니다. 지우거나 고쳐 쓰세요.
