import site from "@/configs/siteConfig";

/**
 * GET /api/github  → profil + repo publik milik GITHUB_USER (configs/siteConfig.cjs).
 * Di-cache di memori 10 menit & di CDN agar tidak menghabiskan rate limit GitHub (60/jam tanpa token).
 * Bila GitHub tidak terjangkau, mengembalikan data cadangan minimal (tautan profil saja).
 */
const USER = site.GITHUB_USER;
const TTL = 10 * 60 * 1000;
const HEAD = { Accept: "application/vnd.github+json", "User-Agent": "wudysoft-app", "X-GitHub-Api-Version": "2022-11-28" };

async function gh(path) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://api.github.com${path}`, { headers: HEAD, signal: ctl.signal });
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function load() {
  const [u, repos] = await Promise.all([gh(`/users/${USER}`), gh(`/users/${USER}/repos?per_page=100&sort=pushed`)]);
  const own = repos.filter((r) => !r.fork);
  const langs = {};
  for (const r of own) if (r.language) langs[r.language] = (langs[r.language] || 0) + 1;
  return {
    user: {
      login: u.login, name: u.name, bio: u.bio, avatar: u.avatar_url, url: u.html_url, blog: u.blog || null,
      location: u.location, company: u.company, followers: u.followers, following: u.following,
      publicRepos: u.public_repos, createdAt: u.created_at,
    },
    stats: {
      stars: own.reduce((a, r) => a + r.stargazers_count, 0),
      forks: own.reduce((a, r) => a + r.forks_count, 0),
      languages: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    },
    repos: own
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 6)
      .map((r) => ({ name: r.name, url: r.html_url, description: r.description, language: r.language, stars: r.stargazers_count, forks: r.forks_count, pushedAt: r.pushed_at, topics: (r.topics || []).slice(0, 3) })),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }
  const cache = (globalThis.__ghCache ||= { at: 0, data: null });
  try {
    if (!cache.data || Date.now() - cache.at > TTL) {
      cache.data = await load();
      cache.at = Date.now();
    }
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    return res.status(200).json({ ok: true, ...cache.data });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    if (cache.data) return res.status(200).json({ ok: true, stale: true, ...cache.data });
    return res.status(200).json({ ok: false, message: "GitHub tidak terjangkau", fallback: { login: USER, url: `https://github.com/${USER}` } });
  }
}
