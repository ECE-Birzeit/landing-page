// Who has worked on ECE Hub, read from GitHub when the site is built: every public repository of the
// ECE-Birzeit organisation (plus the course catalog), its contributors and their commit counts.
// Bots are left out. Set GITHUB_TOKEN (the workflows do) to lift GitHub's anonymous rate limit.
// If GitHub can't be reached the build carries on, and the page says the list couldn't be loaded.

const API = 'https://api.github.com/';
const ORG = 'ECE-Birzeit';
const EXTRA = ['mabushelbaia/bzu-course-catalog'];
// Repositories that are plumbing rather than work: the org profile and the old-domain redirect
const SKIP = (name: string) => name.startsWith('.') || name.endsWith('-redirect');

export interface Repo { full: string; name: string; url: string; description: string; pushed_at: string; commits: number; people: string[] }
export interface Person { login: string; name: string; url: string; avatar: string; commits: number; repos: string[] }
export interface Contributors { ok: boolean; repos: Repo[]; people: Person[] }

async function get(path: string): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'ece-hub-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(API + path, { headers });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status}`);
  return r.status === 204 ? [] : r.json();
}

const isBot = (c: any) => c.type !== 'User' || /\[bot\]$/i.test(c.login) || /^copilot/i.test(c.login);

let loaded: Promise<Contributors> | null = null;
export function contributors(): Promise<Contributors> {
  return (loaded ??= load().catch((e) => {
    console.warn(`[contributors] ${e.message}; the page will say the list couldn't be loaded`);
    return { ok: false, repos: [], people: [] };
  }));
}

async function load(): Promise<Contributors> {
  const org = await get(`orgs/${ORG}/repos?type=public&per_page=100`);
  const extra = await Promise.all(EXTRA.map((r) => get(`repos/${r}`)));
  const list = [...org, ...extra].filter((r: any) => !r.fork && !r.archived && !r.private && !SKIP(r.name));

  const people = new Map<string, Person>();
  const repos: Repo[] = await Promise.all(list.map(async (r: any) => {
    const cs = (await get(`repos/${r.full_name}/contributors?per_page=100`)).filter((c: any) => !isBot(c));
    for (const c of cs) {
      const p = people.get(c.login) ?? { login: c.login, name: c.login, url: c.html_url, avatar: c.avatar_url, commits: 0, repos: [] };
      p.commits += c.contributions;
      p.repos.push(r.name);
      people.set(c.login, p);
    }
    return {
      full: r.full_name, name: r.name, url: r.html_url, description: r.description || '', pushed_at: r.pushed_at,
      commits: cs.reduce((n: number, c: any) => n + c.contributions, 0), people: cs.map((c: any) => c.login)
    };
  }));

  // Real names, where people have set one on GitHub
  await Promise.all([...people.values()].map(async (p) => {
    try { const u = await get(`users/${p.login}`); if (u.name) p.name = u.name; } catch {}
  }));

  repos.sort((a, b) => b.commits - a.commits);
  // Each person's repositories in the same order as the list: most worked-on first
  const rank = new Map(repos.map((r, i) => [r.name, i]));
  for (const p of people.values()) p.repos.sort((a, b) => rank.get(a)! - rank.get(b)!);
  return {
    ok: true,
    repos,
    people: [...people.values()].sort((a, b) => b.commits - a.commits || a.login.localeCompare(b.login))
  };
}
