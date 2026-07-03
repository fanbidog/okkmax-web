import Link from "next/link";
import { formatEvent, type EventType } from "@/lib/stationEvents";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

const TYPE_LABEL: Record<EventType, string> = {
  listed: "收录", group_add: "上架", group_delist: "下架", group_relist: "恢复",
  price: "价格", tier: "档位", model: "模型",
};
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** at 是 UTC ISO 串;站点面向北京时间,分组/星期/时刻统一 +8 换算(用 getUTC* 读,不依赖服务器时区)。 */
function toBeijing(atIso: string): Date {
  return new Date(new Date(atIso).getTime() + 8 * 3600 * 1000);
}

/** 页码列表:首页、末页、当前±1,中间用省略号(对标 shadcn 分页)。 */
function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) out.push(i);
  if (page < total - 2) out.push("…");
  out.push(total);
  return out;
}

export interface TimelineEvent { type: EventType; channel: string | null; data: Record<string, unknown> | null; at: string }

export async function StationTimeline({ events, page, totalPages, hrefForPage }: {
  events: TimelineEvent[]; page: number; totalPages: number; hrefForPage: (n: number) => string;
}) {
  const locale = await getLocale();
  if (!events.length) return <div className="tle"><div className="b" style={{ color: "var(--ink3)" }}>{t("暂无动态记录", locale)}</div></div>;
  // 按「年-月-日」分组(保持倒序)
  const groups: { day: string; head: string; items: TimelineEvent[] }[] = [];
  for (const e of events) {
    const bj = toBeijing(e.at);
    const day = bj.toISOString().slice(0, 10);
    const head = locale === "en"
      ? new Date(e.at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Shanghai" })
      : `星期${WEEK[bj.getUTCDay()]} · ${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日`;
    let g = groups.find((x) => x.day === day);
    if (!g) { g = { day, head, items: [] }; groups.push(g); }
    g.items.push(e);
  }
  return (
    <div className="evfeed">
      <div className="ev-row ev-head">
        <span className="ev-txt">{t("事件", locale)}</span>
        <span className="ev-ty">{t("类型", locale)}</span>
        <span className="ev-tm">{t("时间", locale)}</span>
      </div>
      {groups.map((g, gi) => (
        <div key={g.day}>
          <div className="ev-day">{g.head}</div>
          {g.items.map((e, i) => {
            const isLast = gi === groups.length - 1 && i === g.items.length - 1;
            return (
              <div className="ev-row" key={i} style={isLast ? { borderBottom: "none" } : undefined}>
                <span className="ev-txt">{formatEvent(e, (zh) => t(zh, locale))}</span>
                <span className="ev-ty"><span className="ev-pill">{t(TYPE_LABEL[e.type], locale)}</span></span>
                <span className="ev-tm">{toBeijing(e.at).toISOString().slice(11, 16)}</span>
              </div>
            );
          })}
        </div>
      ))}
      {totalPages > 1 && (
        <nav className="ev-pager" aria-label={t("动态分页", locale)}>
          {page > 1
            ? <Link className="ev-pg ev-pg-nav" href={hrefForPage(page - 1)} aria-label={t("上一页", locale)}>‹</Link>
            : <span className="ev-pg ev-pg-nav dis">‹</span>}
          {pageList(page, totalPages).map((p, i) =>
            p === "…"
              ? <span key={`e${i}`} className="ev-pg-e">…</span>
              : <Link key={p} className={"ev-pg" + (p === page ? " on" : "")} href={hrefForPage(p)} aria-current={p === page ? "page" : undefined}>{p}</Link>
          )}
          {page < totalPages
            ? <Link className="ev-pg ev-pg-nav" href={hrefForPage(page + 1)} aria-label={t("下一页", locale)}>›</Link>
            : <span className="ev-pg ev-pg-nav dis">›</span>}
        </nav>
      )}
    </div>
  );
}
