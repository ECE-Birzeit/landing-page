// Who has worked on ECE Hub, read from GitHub when the site is built: everyone who has committed to a
// public ECE-Birzeit repository or the course catalog, most commits first. Bots are left out.
// Set GITHUB_TOKEN (the workflows do) to lift GitHub's anonymous rate limit. If GitHub can't be
// reached the build carries on with an empty list, and the home page just leaves the faces out.

const API = 'https://api.github.com/';
const REPOS = ['mabushelbaia/bzu-course-catalog'];

export interface Person { login: string; name: string; url: string; avatar: string; commits: number }

async function get(path: string): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'ece-hub-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(API + path, { headers });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status}`);
  return r.status === 204 ? [] : r.json();
}

const isBot = (c: any) => c.type !== 'User' || /\[bot\]$/i.test(c.login) || /^copilot/i.test(c.login);

export async function contributors(): Promise<Person[]> {
  try {
    const org = (await get('orgs/ECE-Birzeit/repos?type=public&per_page=100')).filter((r: any) => !r.fork && !r.archived);
    const names = [...org.map((r: any) => r.full_name), ...REPOS];
    const people = new Map<string, Person>();
    for (const list of await Promise.all(names.map((n) => get(`repos/${n}/contributors?per_page=100`)))) {
      for (const c of list.filter((c: any) => !isBot(c))) {
        const p = people.get(c.login) ?? { login: c.login, name: c.login, url: c.html_url, avatar: c.avatar_url, commits: 0 };
        p.commits += c.contributions;
        people.set(c.login, p);
      }
    }
    // Real names, where people have set one on GitHub
    await Promise.all([...people.values()].map(async (p) => {
      try { const u = await get(`users/${p.login}`); if (u.name) p.name = u.name; } catch {}
    }));
    return [...people.values()].sort((a, b) => b.commits - a.commits || a.login.localeCompare(b.login));
  } catch (e: any) {
    console.warn(`[contributors] ${e.message}; leaving them out`);
    return [];
  }
}
