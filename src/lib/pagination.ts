// 数字页码:首页、末页、当前±1,中间省略号(与首页排行榜分页器一致)。
export const PAGE_SIZE = 20;

export function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) out.push(i);
  if (page < total - 2) out.push("…");
  out.push(total);
  return out;
}
