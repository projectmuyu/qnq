// projects.yml에 적힌 깃허브 저장소를 빌드할 때 가져옵니다.
// README, 파일 목록, 지정한 코드 파일, 최근 커밋을 모아 프로젝트 페이지를 만들어요.
import fs from "node:fs";
import yaml from "js-yaml";
import Fetch from "@11ty/eleventy-fetch";
import markdownIt from "markdown-it";

const md = markdownIt({ html: true });
const API = "https://api.github.com";
const MAX_TREE = 80; // 파일 목록에 보여줄 최대 항목 수
const MAX_FILES = 5; // 코드로 보여줄 최대 파일 수
const MAX_LINES = 500; // 파일 하나에 보여줄 최대 줄 수

function headers(accept = "application/vnd.github+json") {
  const h = {
    "User-Agent": "questions-and-quests-site",
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

function get(url, type = "json", accept) {
  return Fetch(url, { duration: "1h", type, fetchOptions: { headers: headers(accept) } });
}

function readConfig() {
  const file = new URL("../../projects.yml", import.meta.url);
  if (!fs.existsSync(file)) return [];
  const parsed = yaml.load(fs.readFileSync(file, "utf8")) || {};
  const list = Array.isArray(parsed) ? parsed : parsed.projects || [];
  return list
    .map((p) => (typeof p === "string" ? { repo: p } : p))
    .filter((p) => p && typeof p.repo === "string" && p.repo.includes("/"));
}

// README 안의 상대 경로 이미지·링크를 깃허브 주소로 바꿔줍니다.
function absolutize(markdown, rawBase, blobBase) {
  const clean = (p) => p.replace(/^\.\//, "").replace(/^\//, "");
  return markdown
    .replace(/(!?)\[([^\]]*)\]\((?!https?:|#|mailto:|data:)([^)\s]+)([^)]*)\)/g, (m, bang, text, p, rest) =>
      `${bang}[${text}](${bang ? rawBase : blobBase}${clean(p)}${rest})`
    )
    .replace(/(<img[^>]*\ssrc=["'])(?!https?:|data:)([^"']+)/gi, (m, pre, p) => `${pre}${rawBase}${clean(p)}`);
}

async function loadRepo(cfg) {
  const [owner, name] = cfg.repo.split("/");
  const meta = await get(`${API}/repos/${owner}/${name}`);
  const branch = meta.default_branch || "main";
  const rawBase = `https://raw.githubusercontent.com/${owner}/${name}/${branch}/`;
  const blobBase = `${meta.html_url}/blob/${branch}/`;

  let readmeHtml = "";
  try {
    const readme = await get(`${API}/repos/${owner}/${name}/readme`, "text", "application/vnd.github.raw+json");
    readmeHtml = md.render(absolutize(readme, rawBase, blobBase));
  } catch (e) {
    readmeHtml = "";
  }

  const wanted = (cfg.files || []).slice(0, MAX_FILES);

  let tree = [];
  let treeTruncated = false;
  try {
    const t = await get(`${API}/repos/${owner}/${name}/git/trees/${branch}?recursive=1`);
    const entries = (t.tree || []).filter((e) => {
      const parts = e.path.split("/");
      return parts.length <= 2 && !parts.some((p) => p.startsWith("."));
    });
    treeTruncated = entries.length > MAX_TREE || !!t.truncated;
    tree = entries.slice(0, MAX_TREE).map((e) => {
      const parts = e.path.split("/");
      return {
        path: e.path,
        name: parts[parts.length - 1] + (e.type === "tree" ? "/" : ""),
        depth: parts.length - 1,
        shown: wanted.includes(e.path),
      };
    });
  } catch (e) {
    tree = [];
  }

  const files = [];
  for (const path of wanted) {
    try {
      const text = await get(rawBase + path.split("/").map(encodeURIComponent).join("/"), "text");
      const lines = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
      files.push({
        path,
        total: lines.length,
        truncated: lines.length > MAX_LINES,
        lines: lines.slice(0, MAX_LINES),
        url: blobBase + path,
      });
    } catch (e) {
      console.warn(`[projects] ${cfg.repo}: ${path} 파일을 가져오지 못했어요.`);
    }
  }

  let commits = [];
  let sha = "";
  try {
    const c = await get(`${API}/repos/${owner}/${name}/commits?per_page=3`);
    sha = c[0] ? c[0].sha.slice(0, 7) : "";
    commits = c.map((x) => ({
      message: (x.commit.message || "").split("\n")[0],
      date: x.commit.author ? x.commit.author.date : x.commit.committer.date,
      url: x.html_url,
    }));
  } catch (e) {
    commits = [];
  }

  const license = meta.license && meta.license.spdx_id && meta.license.spdx_id !== "NOASSERTION" ? meta.license.spdx_id : "";

  return {
    name: meta.name,
    fullName: meta.full_name,
    slug: (cfg.slug || meta.name).toLowerCase(),
    description: meta.description || "",
    language: meta.language || "",
    license,
    metaLine: [meta.language, license].filter(Boolean).join(" · "),
    url: meta.html_url,
    branch,
    sha,
    pushed: meta.pushed_at,
    readmeHtml,
    tree,
    treeTruncated,
    files,
    commits,
  };
}

export default async function () {
  // 미리보기용: 네트워크 없이 예시 데이터로 빌드할 때
  if (process.env.REPOS_FIXTURE) {
    return JSON.parse(fs.readFileSync(process.env.REPOS_FIXTURE, "utf8"));
  }

  const repos = [];
  for (const cfg of readConfig()) {
    try {
      repos.push(await loadRepo(cfg));
    } catch (e) {
      console.warn(`[projects] ${cfg.repo} 저장소를 가져오지 못해 건너뜁니다. (${e.message})`);
    }
  }
  return repos;
}
