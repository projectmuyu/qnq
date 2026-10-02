// 사이트 전체에서 쓰는 기본 정보입니다. 여기만 고치면 모든 페이지에 반영돼요.
export default {
  title: "Questions & Quests",
  // 왼쪽 위 이름이 두 줄로 나뉘는 위치
  titleLines: ["Questions &", "Quests"],
  description: "에세이와 연구기록, 그리고 프로젝트를 모아두는 개인 아카이브",

  // 에세이 본문 위에 들어가는 글쓴이 정보
  author: "[이름]",
  authorBio: "[무엇을 연구하고 어떤 글을 쓰는지 한두 문장으로 적는 자리]",

  // 푸터와 상단 아이콘 링크
  email: "[이메일 주소]",
  github: "https://github.com/your-github-id",

  // 홈 대표 이미지: src/images 폴더에 넣고 경로를 적어주세요. 예) "/images/hero.jpg"
  heroImage: "",
  heroAlt: "",

  year: new Date().getFullYear(),
};
