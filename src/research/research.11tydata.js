// 연구기록 폴더 공통 설정
import { postPermalink } from "../../lib/permalink.js";

export default {
  layout: "note.njk",
  eleventyComputed: {
    permalink: (data) => postPermalink("research", data),
    // 제목을 안 적으면 파일 이름을 제목으로 써요.
    title: (data) => data.title || data.page.fileSlug,
  },
};
