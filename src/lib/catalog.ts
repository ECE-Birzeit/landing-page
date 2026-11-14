// The course catalog at build time, for the generated course pages and the sitemap. It is the same
// bzu-course-catalog data the schedules read in the browser, scraped daily from Ritaj; the site is
// rebuilt on a schedule, so the course pages trail the live schedules by a few hours at most.
//
// Set CATALOG_DATA to a local copy of the catalog's data/ folder to build without the network.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { titleCase } from './names';

export { titleCase };

const REMOTE = 'https://raw.githubusercontent.com/mabushelbaia/bzu-course-catalog/main/data/';

export interface Meeting { day: string; start: string | null; end: string | null; room: string | null; building: string | null }
export interface Section {
  type: string; number: string; instructor: string | null; instructors?: string[];
  enrolled: number | null; capacity: number | null; meetings: Meeting[];
}
export interface Offering { term: string; name: string; updated_at: string; sections: Section[] }
export interface Course {
  code: string; prefix: string; name: string;
  department: string | null; faculty: string | null;
  offerings: Offering[]; // newest semester first; only the semesters that ran it
}
export interface Term { code: string; name: string; updated_at: string; calendar?: Record<string, string> }
export interface Catalog { terms: Term[]; current: string | null; courses: Map<string, Course> }

const DAY_ORDER = 'SUMTWRF';
export const DAY_NAMES: Record<string, string> = { S: 'Sat', U: 'Sun', M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri' };

// A co-taught section lists several people in one cell; the catalog splits them into `instructors`.
// Older files don't have that field, so split the cell the same way here.
export function people(s: Section): string[] {
  const list = s.instructors ?? String(s.instructor || '').split(/\s*,\s*/);
  return list.map((x) => x.trim()).filter((x) => x && x !== 'TBA');
}

export function sortMeetings(ms: Meeting[]): Meeting[] {
  return [...ms].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || String(a.start).localeCompare(String(b.start)));
}

// Meetings with the same time and room fold into one line: "Mon Wed 10:00–10:50 · Masri109"
export function meetingLines(s: Section): { days: string; time: string; room: string }[] {
  const groups = new Map<string, { days: string[]; time: string; room: string }>();
  for (const m of sortMeetings(s.meetings)) {
    const time = m.start && m.end ? `${m.start}–${m.end}` : 'Time not set';
    const room = m.room || 'Room not set';
    const key = time + '|' + room;
    if (!groups.has(key)) groups.set(key, { days: [], time, room });
    groups.get(key)!.days.push(DAY_NAMES[m.day] || m.day);
  }
  return [...groups.values()].map((g) => ({ ...g, days: g.days.join(' ') }));
}

async function get(path: string): Promise<any> {
  const local = process.env.CATALOG_DATA;
  if (local) return JSON.parse(await readFile(join(local, path), 'utf-8'));
  const r = await fetch(REMOTE + path);
  if (!r.ok) throw new Error(`bzu-course-catalog: ${path} answered ${r.status}`);
  return r.json();
}

// Each course prefix to the department (and faculty) that teaches it, from Ritaj's unit tree
function prefixOwners(tree: any): Map<string, { department: string; faculty: string | null }> {
  const owners = new Map<string, { department: string; faculty: string | null }>();
  const add = (prefix: string, department: string, faculty: string | null) => {
    if (prefix && !owners.has(prefix)) owners.set(prefix, { department, faculty });
  };
  for (const f of tree.faculties || []) {
    for (const d of f.departments || []) for (const p of d.programs || []) add(p.prefix, d.name, f.name);
    for (const p of f.programs || []) add(p.prefix, f.name, null);
  }
  for (const p of tree.programs || []) add(p.prefix, p.name, null);
  return owners;
}

let loaded: Promise<Catalog> | null = null;
export function catalog(): Promise<Catalog> {
  return (loaded ??= load());
}

async function load(): Promise<Catalog> {
  const [index, tree] = await Promise.all([get('index.json'), get('departments.json').catch(() => ({}))]);
  const codes: string[] = index.published_terms?.length ? index.published_terms : Object.keys(index.terms);
  const files = await Promise.all(codes.map((c) => get(`${c}.json`)));
  const owners = prefixOwners(tree);
  const courses = new Map<string, Course>();
  const terms: Term[] = codes.map((code) => ({ code, name: index.terms[code]?.name ?? code, updated_at: index.terms[code]?.updated_at, calendar: index.terms[code]?.calendar }));

  files.forEach((file, i) => {
    const term = terms[i];
    for (const c of file.courses) {
      if (!/^[A-Z]{2,6}\d{3,4}[A-Z]?$/.test(c.code)) continue;
      let course = courses.get(c.code);
      if (!course) {
        const owner = owners.get(c.prefix);
        course = { code: c.code, prefix: c.prefix, name: titleCase(c.name), department: owner?.department ?? null, faculty: owner?.faculty ?? null, offerings: [] };
        courses.set(c.code, course);
      }
      course.offerings.push({ term: term.code, name: term.name, updated_at: file.updated_at, sections: c.sections });
    }
  });
  // published_terms is newest first, so offerings already are
  return { terms, current: index.current?.term ?? codes[0] ?? null, courses: new Map([...courses].sort(([a], [b]) => a.localeCompare(b))) };
}
