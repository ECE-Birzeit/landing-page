// The sitemap, written at build time: the site's pages, dated by the latest commit, and one entry per
// course page, dated by when Ritaj's data for its newest semester last changed.
import type { APIRoute } from 'astro';
import { execSync } from 'node:child_process';
import { catalog } from '../lib/catalog';

const PAGES = ['/', '/labs/', '/courses/', '/schedules/', '/timetable/', '/stats/'];

export const GET: APIRoute = async ({ site }) => {
  let built = new Date().toISOString().slice(0, 10);
  try { built = execSync('git log -1 --format=%cs').toString().trim() || built; } catch {}
  const { courses } = await catalog();
  const url = (path: string, lastmod: string) => `  <url><loc>${new URL(path, site).href}</loc><lastmod>${lastmod}</lastmod></url>`;
  const lines = [
    ...PAGES.map((p) => url(p, built)),
    ...[...courses.values()].map((c) => url(`/courses/${c.code}/`, (c.offerings[0].updated_at || built).slice(0, 10)))
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
