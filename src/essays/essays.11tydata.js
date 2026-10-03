// 에세이 폴더 공통 설정
// 파일 이름이 한글 제목이어도 괜찮아요. 주소는 글 위쪽의 slug가 있으면 그걸, 없으면 파일 이름을 씁니다.
import { postPermalink } from "../../lib/permalink.js";

export default {
  layout: "essay.njk",
  eleventyComputed: {
    permalink: (data) => postPermalink("essays", data),
    // 제목을 안 적으면 파일 이름을 제목으로 써요.
    title: (data) => data.title || data.page.fileSlug,
  },
};
