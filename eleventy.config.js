import { HtmlBasePlugin } from "@11ty/eleventy";
import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";

// GitHub Actions가 PATH_PREFIX를 넣어줍니다.
// 아이디.github.io 저장소면 "/", 다른 이름의 저장소면 "/저장소이름/"이 됩니다.
const pathPrefix = process.env.PATH_PREFIX || "/";

const pad = (n) => String(n).padStart(2, "0");
const toDate = (v) => (v instanceof Date ? v : new Date(v));

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const fileName = (p) => p.split("/").pop();
const imageUrl = (p) => "/images/" + encodeURI(fileName(p.trim()));

// 옵시디언에서 쓴 글을 그대로 올려도 되도록 링크를 바꿉니다.
// - ![[사진.png]]           → 이미지 (src/images 폴더에서 찾아요)
// - ![[사진.png|400]]       → 폭 400px 이미지
// - ![[사진.png|설명]]      → 설명이 붙은 이미지
// - ![](images/사진.png), ![](../images/사진.png) → /images/사진.png
// - [[다른 노트]], [[다른 노트|보일 글자]] → 링크 없이 글자만 남겨요
function convertObsidian(content) {
  // 코드 블록 안은 건드리지 않아요.
  return content
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part
        .replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (m, target, opt) => {
          if (!IMAGE_EXT.test(target.trim())) return opt || fileName(target);
          const src = imageUrl(target);
          if (opt && /^\d+(x\d+)?$/.test(opt.trim())) {
            const width = opt.trim().split("x")[0];
            return `<img src="${src}" alt="" width="${width}">`;
          }
          const alt = (opt || "").replace(/"/g, "&quot;");
          return `<img src="${src}" alt="${alt}">`;
        })
        .replace(/(!\[[^\]]*\]\()(?:\.\.\/)*(?:src\/)?images\/([^)\s]+)\)/g, (m, pre, p) => `${pre}${imageUrl(decodeURI(p))})`)
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
        .replace(/\[\[([^\]]+)\]\]/g, (m, t) => fileName(t).replace(/#.*$/, ""))
        .replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
    })
    .join("");
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildTreeHtml(nodes, repoSlug) {
  let h = '<ul class="file-tree">';
  for (const n of nodes) {
    if (n.type === "tree") {
      h += `<li><details><summary class="tree-dir">${escHtml(n.name)}/</summary>`;
      h += buildTreeHtml(n.children || [], repoSlug);
      h += `</details></li>`;
    } else if (n.hasPage) {
      h += `<li><a class="tree-file" href="/projects/${repoSlug}/files/${n.path}/" data-path="${escHtml(n.path)}">${escHtml(n.name)}</a></li>`;
    } else {
      h += `<li><a class="tree-file tree-file--ext" href="${escHtml(n.directUrl || "")}" target="_blank" rel="noopener">${escHtml(n.name)} ↗</a></li>`;
    }
  }
  h += "</ul>";
  return h;
}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.setLibrary(
    "md",
    markdownIt({ html: true, typographer: false, linkify: true })
      .use(markdownItFootnote)
      .enable(["strikethrough"])
  );

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");

  // 옵시디언 보관함 설정·템플릿·휴지통은 사이트에 올리지 않아요.
  eleventyConfig.ignores.add("src/.obsidian/**");
  eleventyConfig.ignores.add("src/.trash/**");
  eleventyConfig.ignores.add("src/_templates/**");

  // 옵시디언식 링크를 사이트에서 쓸 수 있는 형식으로 바꿔요.
  eleventyConfig.addPreprocessor("obsidian", "md", (data, content) => convertObsidian(content));

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

  // 파일 트리 HTML 생성
  eleventyConfig.addFilter("repoTree", (nodes, repoSlug) => buildTreeHtml(nodes || [], repoSlug));

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
    // 글 안의 {{ }} 같은 기호를 그대로 두기 위해 마크다운 글은 템플릿으로 해석하지 않아요.
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
