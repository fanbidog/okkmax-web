// 敏感词:品牌固定表 + 模型id正则(含数字的连字符 token)+ URL
const BRANDS = ["OkkMax"];
const MODEL_RE = /\b[A-Za-z][A-Za-z0-9.]*-[A-Za-z0-9.\-]*\d[A-Za-z0-9.\-]*\b/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/g;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unesc = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0*34;/g, '"')
    .replace(/&#0*39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&"); // &amp; 最后解,避免把 &amp;quot; 误成 "

/** 先按 URL→模型→品牌的顺序标记敏感区间,再转义非敏感段、包裹敏感段。 */
export function protect(src: string): { html: string } {
  const marks: { start: number; end: number }[] = [];
  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    for (let m; (m = re.exec(src)); ) marks.push({ start: m.index, end: m.index + m[0].length });
  };
  collect(URL_RE); collect(MODEL_RE);
  for (const b of BRANDS) { let i = src.indexOf(b); while (i >= 0) { marks.push({ start: i, end: i + b.length }); i = src.indexOf(b, i + b.length); } }
  marks.sort((a, b) => a.start - b.start);
  // 去重叠(URL/模型优先,已排序后取不与前一段重叠的)
  const merged: typeof marks = [];
  for (const m of marks) if (!merged.length || m.start >= merged[merged.length - 1].end) merged.push(m);
  let out = "", pos = 0;
  for (const m of merged) {
    out += esc(src.slice(pos, m.start));
    out += `<span translate="no">${esc(src.slice(m.start, m.end))}</span>`;
    pos = m.end;
  }
  out += esc(src.slice(pos));
  return { html: out };
}

export function unprotect(html: string): string {
  return unesc(html.replace(/<span translate="no">(.*?)<\/span>/g, "$1"));
}
