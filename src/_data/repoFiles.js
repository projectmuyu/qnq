import { loadAllRepos } from "../_lib/loadRepos.js";

export default async function () {
  const repos = await loadAllRepos();
  return repos.flatMap((repo) =>
    Object.keys(repo.contentMap).map((path) => ({
      repoSlug: repo.slug,
      repoName: repo.name,
      path,
      ...repo.contentMap[path],
      repo: {
        name: repo.name,
        slug: repo.slug,
        url: repo.url,
        branch: repo.branch,
        sha: repo.sha,
        tree: repo.tree,
      },
    }))
  );
}
