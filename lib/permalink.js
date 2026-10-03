// 글 주소 만들기 (에세이, 연구기록 공용)
// - 글 위쪽에 slug: first-essay 처럼 적으면 /essays/first-essay/
// - 없으면 파일 이름을 그대로 씁니다. 한글도 됩니다. 예) /essays/다른-방향으로-쓰기/
export function toSlug(text) {
  return String(text || "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[?#%/\\:*"<>|'`~!@$^&()+=,;[\]{}]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function postPermalink(section, data) {
  // 목록 페이지(index.njk)는 자기 주소를 따로 가지고 있어요.
  if (data.page.inputPath.endsWith("index.njk")) return `/${section}/`;
  const slug = toSlug(data.slug) || toSlug(data.page.fileSlug) || "post";
  return `/${section}/${slug}/`;
}

