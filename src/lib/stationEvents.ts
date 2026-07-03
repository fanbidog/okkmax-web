import type { Tier } from "./tier";

export type EventType = "listed" | "group_add" | "group_delist" | "group_relist" | "price" | "tier" | "model";
export interface EventDraft { type: EventType; channel: string | null; data: Record<string, unknown> | null; }
export interface PrevChannel { name: string; models: string[]; prices: Record<string, number>; delistedAt: Date | null; }
export interface NextChannel { name: string; models: string[]; prices: Record<string, number>; delisted: boolean; }

export const PRICE_CHANGE_MIN = 0.05; // 价格变动 ≥5% 才记
export const PRICE_CHANGE_MAX = 3.0;  // 涨跌幅护栏:相对变化 >300% 判为数据口径跳变(占位→真实价/USD↔RMB),不当真实调价
export const EVENT_RETAIN_DAYS = 90;

function priceChanges(prev: Record<string, number>, next: Record<string, number>) {
  const out: { model: string; oldIn: number; newIn: number }[] = [];
  for (const [model, newIn] of Object.entries(next)) {
    const oldIn = prev[model];
    if (oldIn == null || oldIn <= 0) continue; // 新模型不算价格变动(由 model 事件管)
    const rel = Math.abs(newIn - oldIn) / oldIn;
    // 上限护栏:真实商业调价极少一夜翻几倍,超过 PRICE_CHANGE_MAX 基本是脏数据/首次校准(占位价被真实价替换),丢弃
    if (rel >= PRICE_CHANGE_MIN && rel <= PRICE_CHANGE_MAX && Math.round(newIn * 100) !== Math.round(oldIn * 100)) {
      out.push({ model, oldIn, newIn });
    }
  }
  out.sort((a, b) => Math.abs(b.newIn - b.oldIn) / b.oldIn - Math.abs(a.newIn - a.oldIn) / a.oldIn);
  return out;
}

/** 算一个站本轮的事件草稿。stationExisted=false(首次收录)→ 只发 listed。 */
export function computeStationEvents(prev: PrevChannel[], next: NextChannel[], stationExisted: boolean): EventDraft[] {
  if (!stationExisted) return [{ type: "listed", channel: null, data: null }];
  const prevByName = new Map(prev.map((c) => [c.name, c]));
  const out: EventDraft[] = [];
  for (const n of next) {
    const p = prevByName.get(n.name);
    if (!p) { out.push({ type: "group_add", channel: n.name, data: { modelCount: n.models.length } }); continue; }
    if (!p.delistedAt && n.delisted) out.push({ type: "group_delist", channel: n.name, data: null });
    else if (p.delistedAt && !n.delisted) out.push({ type: "group_relist", channel: n.name, data: null });
    // 护栏②:两边都非空才 diff 价格/模型
    if (Object.keys(p.prices).length && Object.keys(n.prices).length) {
      const ch = priceChanges(p.prices, n.prices);
      if (ch.length) out.push({ type: "price", channel: n.name, data: { model: ch[0].model, oldIn: ch[0].oldIn, newIn: ch[0].newIn, more: ch.length - 1 } });
    }
    if (p.models.length && n.models.length) {
      const added = n.models.filter((m) => !p.models.includes(m));
      const removed = p.models.filter((m) => !n.models.includes(m));
      if (added.length || removed.length) out.push({ type: "model", channel: n.name, data: { added, removed } });
    }
  }
  return out;
}

const TIER_LABEL: Record<Tier, string> = { pureblood: "官方渠道", downgrade: "混合渠道", counterfeit: "来源存疑" };
const TIER_RANK: Record<Tier, number> = { counterfeit: 0, downgrade: 1, pureblood: 2 };

/** 档位变化事件。from 为 null(首次)或与 to 相同 → 不发。 */
export function tierEventDraft(from: Tier | null, to: Tier | null): EventDraft | null {
  if (!from || !to || from === to) return null;
  return { type: "tier", channel: null, data: { from, to } };
}

/** type + data → 用户向中文句(禁内部系统名)。t 翻动词/状态词,数据(模型名/价格/分组名)不翻。 */
export function formatEvent(ev: { type: EventType; channel: string | null; data: Record<string, unknown> | null }, t: (zh: string) => string = (zh) => zh): string {
  const c = ev.channel ?? "";
  const d = (ev.data ?? {}) as Record<string, any>;
  switch (ev.type) {
    case "listed": return t("站点已收录");
    case "group_add": return d.modelCount ? `${c} ${t("分组上架,含")} ${d.modelCount} ${t("个模型")}` : `${c} ${t("分组上架")}`;
    case "group_delist": return `${c} ${t("分组下架(暂无可用模型)")}`;
    case "group_relist": return `${c} ${t("分组恢复")}`;
    case "price": {
      const dir = d.newIn < d.oldIn ? t("降价") : t("涨价");
      const tail = d.more ? `${t(",另")} ${d.more} ${t("项")}` : "";
      const money = (n: number) => Number.isFinite(n) ? String(Math.round(n * 100) / 100) : String(n); // 取整到分,去长尾小数
      return `${d.model} ${dir}${t("至")} ${money(d.newIn)} ${t("元/M")}(${t("原")} ${money(d.oldIn)})${tail}`;
    }
    case "tier": {
      const up = TIER_RANK[d.to as Tier] > TIER_RANK[d.from as Tier];
      return `${t("纯度")}${up ? t("升级") : t("降级")}${t("为")}${t(TIER_LABEL[d.to as Tier])}(${t("原")}${t(TIER_LABEL[d.from as Tier])})`;
    }
    case "model": {
      // 展示层截断(库里存全量):卖家一次上下架几十个模型很常见,全列出来把动态挤成一堵墙。
      // 与 price 事件的「,另 N 项」同思路:列前 3 个,多的收成「等 N 项」。
      const fmt = (arr: string[]) => arr.length > 3 ? `${arr.slice(0, 3).join(t("、"))} ${t("等")} ${arr.length} ${t("项")}` : arr.join(t("、"));
      const parts: string[] = [];
      if (d.added?.length) parts.push(`${t("新增")} ${fmt(d.added)}`);
      if (d.removed?.length) parts.push(`${t("移除")} ${fmt(d.removed)}`);
      return `${c} ${t("分组")}${parts.join(t(","))}`;
    }
  }
}
