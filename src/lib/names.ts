// Shared by the build (course pages) and the browser (the search box), so it imports nothing.

// Ritaj writes course names in capitals: "COMPUTER NETWORKS LAB" reads as "Computer Networks Lab".
// Roman numerals stay capitals, and so do the short words, like "and" and "of", which go lower case.
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
export function titleCase(s: string): string {
  return s.toLowerCase().split(/(\s+|[(/-])/).map((w, i) => {
    if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(w)) return w.toUpperCase();
    if (i > 0 && SMALL.has(w)) return w;
    return w.replace(/\p{L}/u, (c) => c.toUpperCase());
  }).join('');
}
