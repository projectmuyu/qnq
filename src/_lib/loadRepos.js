// loadRepos.js — zipball 기반 파일 탐색기 데이터 로더
import fs from "node:fs";
import yaml from "js-yaml";
import Fetch from "@11ty/eleventy-fetch";
import markdownIt from "markdown-it";
import { unzipSync } from "fflate";

const md = markdownIt({ html: true });
const API = "https://api.github.com";

const MAX_FILE_PAGES = 300;   // 전용 페이지를 만들 최대 파일 수 (저장소당)
const MAX_FILE_BYTES = 200 * 1024; // 파일 미리보기 크기 상한 (200 KB)
const MAX_LINES = 500;        // 텍스트 파일 미리보기 최대 줄 수

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".cache", "_site"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".bmp", ".ico"]);

// 모듈 수준 캐시 — repos.js와 repoFiles.js 모두 동일 결과 재사용
let _cache = null;

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

// 경로 기준 확장자 가져오기
function extOf(p) {
  const dot = p.lastIndexOf(".");
  if (dot === -1) return "";
  return p.slice(dot).toLowerCase();
}

// 바이너리 여부 — 앞 512 바이트에 null 바이트가 있으면 바이너리
function isBinaryBuffer(buf) {
  const n = Math.min(buf.length, 512);
  for (let i = 0; i < n; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

// 플랫 경로 목록을 중첩 트리로 변환
// files: [{path, hasPage, directUrl}]
function buildTree(files) {
  const root = [];

  for (const f of files) {
    const parts = f.path.split("/");
    let nodes = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      let dir = nodes.find((n) => n.type === "tree" && n.name === dirName);
      if (!dir) {
        dir = { name: dirName, type: "tree", path: parts.slice(0, i + 1).join("/"), children: [] };
        nodes.push(dir);
      }
      nodes = dir.children;
    }
    nodes.push({
      name: parts[parts.length - 1],
      type: "blob",
      path: f.path,
      hasPage: f.hasPage,
      directUrl: f.directUrl,
    });
  }

  // 폴더 먼저, 그 다음 파일 — 각각 알파벳순
  function sortNodes(nodes) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.type === "tree" && n.children) sortNodes(n.children);
    }
  }
  sortNodes(root);
  return root;
}

async function loadRepo(cfg) {
  const [owner, name] = cfg.repo.split("/");
  const meta = await get(`${API}/repos/${owner}/${name}`);
  const branch = meta.default_branch || "main";
  const rawBase = `https://raw.githubusercontent.com/${owner}/${name}/${branch}/`;
  const blobBase = `${meta.html_url}/blob/${branch}/`;

  // ── README ──────────────────────────────────────────────
  let readmeHtml = "";
  try {
    const readme = await get(
      `${API}/repos/${owner}/${name}/readme`,
      "text",
      "application/vnd.github.raw+json"
    );
    readmeHtml = md.render(absolutize(readme, rawBase, blobBase));
  } catch {
    readmeHtml = "";
  }

  // ── 최근 커밋 ────────────────────────────────────────────
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
  } catch {
    commits = [];
  }

  // ── zipball 다운로드 & 압축 해제 ─────────────────────────
  const zipUrl = `https://api.github.com/repos/${owner}/${name}/zipball/${branch}`;
  let allFiles = []; // {path, data: Uint8Array}

  try {
    const zipBuf = await Fetch(zipUrl, {
      duration: "1h",
      type: "buffer",
      fetchOptions: { headers: headers() },
    });
    const unzipped = unzipSync(new Uint8Array(zipBuf));

    for (const [zipPath, data] of Object.entries(unzipped)) {
      // zipball 경로: {owner}-{name}-{sha}/실제경로
      const slashIdx = zipPath.indexOf("/");
      if (slashIdx === -1) continue;
      const relPath = zipPath.slice(slashIdx + 1);
      if (!relPath) continue; // 루트 디렉토리 엔트리

      // 제외 필터
      const parts = relPath.split("/");
      if (
        parts.some((seg) => SKIP_DIRS.has(seg) || seg.startsWith("._"))
      ) continue;

      // 디렉토리 엔트리(data 길이 0이고 경로가 /로 끝남)는 건너뜀
      if (zipPath.endsWith("/")) continue;

      allFiles.push({ path: relPath, data });
    }
  } catch (e) {
    console.warn(`[projects] ${cfg.repo}: zipball 다운로드 실패 (${e.message})`);
  }

  // ── 페이지 할당 ──────────────────────────────────────────
  const priorityPaths = new Set((cfg.files || []).filter(Boolean));
  const allPaths = allFiles.map((f) => f.path);

  // 우선 파일 중 실제로 존재하는 것
  const existingPriority = [...priorityPaths].filter((p) => allPaths.includes(p));

  // 나머지 파일 (우선 파일 제외)
  const rest = allPaths.filter((p) => !priorityPaths.has(p));

  // 페이지가 생길 파일들 (최대 MAX_FILE_PAGES)
  const withPage = new Set([
    ...existingPriority,
    ...rest.slice(0, Math.max(0, MAX_FILE_PAGES - existingPriority.length)),
  ]);

  // ── contentMap 생성 ───────────────────────────────────────
  const contentMap = {};
  const dec = new TextDecoder("utf-8", { fatal: false });

  for (const { path, data } of allFiles) {
    if (!withPage.has(path)) continue;

    const url = blobBase + path;
    const ext = extOf(path);
    const isImage = IMAGE_EXTS.has(ext);

    if (isImage) {
      contentMap[path] = { isImage: true, isBinary: false, url };
      continue;
    }

    if (data.length > MAX_FILE_BYTES) {
      contentMap[path] = { noPreview: true, isImage: false, isBinary: false, url };
      continue;
    }

    const isBinary = isBinaryBuffer(data);
    if (isBinary) {
      contentMap[path] = { isBinary: true, isImage: false, url };
      continue;
    }

    const text = dec.decode(data);
    const allLines = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
    const total = allLines.length;
    const truncated = total > MAX_LINES;
    const lines = truncated ? allLines.slice(0, MAX_LINES) : allLines;

    contentMap[path] = {
      isImage: false,
      isBinary: false,
      lines,
      total,
      truncated,
      url,
    };
  }

  // ── 트리 구성 ─────────────────────────────────────────────
  const treeInput = allFiles.map(({ path }) => ({
    path,
    hasPage: withPage.has(path),
    directUrl: blobBase + path,
  }));
  const tree = buildTree(treeInput);

  // ── 기본 파일 결정 ────────────────────────────────────────
  let defaultPath = "";
  // 1) projects.yml files 중 존재하는 첫 번째
  for (const p of cfg.files || []) {
    if (contentMap[p]) { defaultPath = p; break; }
  }
  // 2) README.md
  if (!defaultPath && contentMap["README.md"]) defaultPath = "README.md";
  // 3) 트리의 첫 번째 파일
  if (!defaultPath) {
    function firstBlob(nodes) {
      for (const n of nodes) {
        if (n.type === "blob" && n.hasPage) return n.path;
        if (n.type === "tree") {
          const found = firstBlob(n.children || []);
          if (found) return found;
        }
      }
      return "";
    }
    defaultPath = firstBlob(tree);
  }

  const license =
    meta.license && meta.license.spdx_id && meta.license.spdx_id !== "NOASSERTION"
      ? meta.license.spdx_id
      : "";

  return {
    name: meta.name,
    fullName: meta.full_name,
    slug: (cfg.slug || meta.name).toLowerCase(),
    description: cfg.description || meta.description || "",
    language: meta.language || "",
    license,
    metaLine: [meta.language, license].filter(Boolean).join(" · "),
    url: meta.html_url,
    branch,
    sha,
    pushed: meta.pushed_at,
    readmeHtml,
    commits,
    tree,
    contentMap,
    defaultPath,
  };
}

export async function loadAllRepos() {
  if (_cache) return _cache;

  // 미리보기용: 네트워크 없이 예시 데이터로 빌드할 때
  if (process.env.REPOS_FIXTURE) {
    _cache = JSON.parse(fs.readFileSync(process.env.REPOS_FIXTURE, "utf8"));
    return _cache;
  }

  const repos = [];
  for (const cfg of readConfig()) {
    try {
      repos.push(await loadRepo(cfg));
    } catch (e) {
      console.warn(`[projects] ${cfg.repo} 저장소를 가져오지 못해 건너뜁니다. (${e.message})`);
    }
  }
  _cache = repos;
  return _cache;
}
