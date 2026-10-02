import { HtmlBasePlugin } from "@11ty/eleventy";
import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";

// GitHub Actions가 PATH_PREFIX를 넣어줍니다.
// 아이디.github.io 저장소면 "/", 다른 이름의 저장소면 "/저장소이름/"이 됩니다.
const pathPrefix = process.env.PATH_PREFIX || "/";

const pad = (n) => String(n).padStart(2, "0");
const toDate = (v) => (v instanceof Date ? v : new Date(v));

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.setLibrary(
    "md",
    markdownIt({ html: true, typographer: false }).use(markdownItFootnote)
  );

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");

  // 컬렉션: 최신 글이 먼저
  eleventyConfig.addCollection("essays", (api) =>
    api.getFilteredByGlob("src/essays/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("research", (api) =>
    api.getFilteredByGlob("src/research/*.md").sort((a, b) => b.date - a.date)
  );

  // 날짜 표기: 2026.09.28 / 2026.09
  eleventyConfig.addFilter("dotDate", (v) => {
    if (!v) return "";
    const d = toDate(v);
    return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
  });
  eleventyConfig.addFilter("monthDot", (v) => {
    if (!v) return "";
    const d = toDate(v);
    return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}`;
  });

  // 연구기록 달력에 넘길 데이터
  eleventyConfig.addFilter("researchJson", (items) => {
    const base = pathPrefix.replace(/\/$/, "");
    const data = (items || []).map((item) => {
      const d = item.date;
      return {
        date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
        title: item.data.title || "",
        tag: item.data.tag || "",
        summary: item.data.summary || "",
        url: base + item.url,
      };
    });
    return JSON.stringify(data).replace(/</g, "\\u003c");
  });

  return {
    pathPrefix,
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
