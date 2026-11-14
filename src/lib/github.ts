// Who has worked on ECE Hub, read from GitHub when the site is built: everyone who has committed to a
// public ECE-Birzeit repository or the course catalog, most commits first. Bots are left out.
// Set GITHUB_TOKEN (the workflows do) to lift GitHub's anonymous rate limit. If GitHub can't be
// reached the build carries on with an empty list, and the home page just leaves the faces out.

import { execSync } from 'node:child_process';

const API = 'https://api.github.com/';
const REPOS = ['mabushelbaia/bzu-course-catalog'];

export interface Person { login: string; name: string; url: string; avatar: string | null; commits: number; repos: number; mock?: boolean }

// The workflows pass GITHUB_TOKEN; locally, borrow the GitHub CLI's sign-in if there is one, so
// `npm run dev` doesn't run out of GitHub's 60 anonymous requests an hour while you edit
let token: string | undefined = process.env.GITHUB_TOKEN;
if (!token) {
  try { token = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || undefined; } catch {}
}

async function get(path: string): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'ece-hub-build' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, { headers });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status}`);
  return r.status === 204 ? [] : r.json();
}

const isBot = (c: any) => c.type !== 'User' || /\[bot\]$/i.test(c.login) || /^copilot/i.test(c.login);

// Made-up contributors to see how the cards fill out, shown only in `npm run dev` (never in a build)
// unless MOCK_CONTRIBUTORS=1 is set. Initials only: no photos, no real accounts.
function mocks(): Person[] {
  if (!import.meta.env.DEV && process.env.MOCK_CONTRIBUTORS !== '1') return [];
  return [
    ['Sample Student', 'sample-student', 42, 3], ['Lab Assistant', 'lab-assistant', 27, 2],
    ['Manual Reviewer', 'manual-reviewer', 12, 1], ['First-time Fixer', 'first-fix', 3, 1],
    ['Data Helper', 'data-helper', 8, 1]
  ].map(([name, login, commits, repos]) => ({ login: login as string, name: name as string, url: '#', avatar: null, commits: commits as number, repos: repos as number, mock: true }));
}

export async function contributors(): Promise<Person[]> {
  try {
    // The org profile and the old-domain redirect are plumbing, not work on the hub
    const org = (await get('orgs/ECE-Birzeit/repos?type=public&per_page=100'))
      .filter((r: any) => !r.fork && !r.archived && !r.name.startsWith('.') && !r.name.endsWith('-redirect'));
    const names = [...org.map((r: any) => r.full_name), ...REPOS];
    const people = new Map<string, Person>();
    for (const list of await Promise.all(names.map((n) => get(`repos/${n}/contributors?per_page=100`)))) {
      for (const c of list.filter((c: any) => !isBot(c))) {
        const p = people.get(c.login) ?? { login: c.login, name: c.login, url: c.html_url, avatar: c.avatar_url, commits: 0, repos: 0 };
        p.commits += c.contributions;
        p.repos += 1;
        people.set(c.login, p);
      }
    }
    // Real names, where people have set one on GitHub
    await Promise.all([...people.values()].map(async (p) => {
      try { const u = await get(`users/${p.login}`); if (u.name) p.name = u.name; } catch {}
    }));
    return [...people.values(), ...mocks()].sort((a, b) => b.commits - a.commits || a.login.localeCompare(b.login));
  } catch (e: any) {
    console.warn(`[contributors] ${e.message}; leaving them out`);
    return [];
  }
}
