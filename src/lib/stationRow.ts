import type { StationRow } from "@/components/StationListBoard";
import { vendorOf } from "@/lib/brandIcons";

export const STATION_ROW_INCLUDE = {
  channels: {
    where: { delistedAt: null }, // 下架组不进列表/收藏
    include: {
      windows: { where: { period: { in: ["7d", "24h"] } } },
      detections: { orderBy: { detectedAt: "desc" as const }, take: 1 },
    },
  },
};

// 家族识别细到具体厂商(vendorOf 统一在 brandIcons),ModelStack 显各自 logo + 筛选用。
const FAM_ORDER = ["claude", "openai", "gemini", "deepseek", "qwen", "moonshot", "zhipu", "minimax", "xiaomi-mimo", "zai", "other"];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

interface GroupModel { id: string; in: number | null; out: number | null; ratio?: number | null }
interface ChWindow { period: string; avg: number; points: unknown }
interface ChDet { totalScore: number }
interface Ch { service: string; currentLatencyMs: number | null; windows: ChWindow[]; detections: ChDet[] }
export interface StationLike { id: string; slug: string; name: string; homepage: string | null; logoUrl: string | null; description: string | null; groups: unknown; channels: Ch[]; compositeScore: number | null; purityIndex: number | null; availIndex: number | null; speedIndex: number | null }

/** 五维雷达数据(列表 + 详情综合对比 共用,保证同站同数)。
 *  纯度/稳定/速度 = 缓存评分(与指数卡一致);价格/模型 = 粗略画像(非评分维度),缺数据取中性 50。 */
export function radarDims(s: {
  purityIndex: number | null; availIndex: number | null; speedIndex: number | null;
  priceIn: number | null; modelCount: number;
}): Record<string, number> {
  const D = 50;
  return {
    纯度: s.purityIndex != null ? Math.round(s.purityIndex) : D,
    稳定: s.availIndex != null ? Math.round(s.availIndex) : D,
    速度: s.speedIndex != null ? Math.round(s.speedIndex) : D,
    价格: s.priceIn != null ? Math.round(clamp(100 - s.priceIn * 4, 5, 100)) : D,
    模型: Math.round(clamp(s.modelCount * 2.2, 10, 100)),
  };
}

/** 站点 → 列表行数据(/list 与 收藏 共用,口径一致)。 */
export function buildStationRow(st: StationLike): StationRow {
  const groups = (Array.isArray(st.groups) ? st.groups : []) as { ratio?: number | null; models?: GroupModel[] }[];
  const modelIds = new Set<string>();
  let startIn: number | null = null, startOut: number | null = null, minRatio: number | null = null;
  const takeRatio = (v: unknown) => { if (typeof v === "number" && v > 0 && (minRatio == null || v < minRatio)) minRatio = v; };
  for (const g of groups) {
    takeRatio(g.ratio);
    for (const m of g.models ?? []) {
      modelIds.add(m.id);
      takeRatio(m.ratio);
      if (m.in != null && m.in > 0 && (startIn == null || m.in < startIn)) { startIn = m.in; startOut = m.out; }
    }
  }
  const fams = new Set<string>();
  modelIds.forEach((id) => fams.add(vendorOf(id)));
  const families = FAM_ORDER.filter((f) => fams.has(f));

  // 评分读缓存(算分步骤每小时算;样本不足为 null=积累中)。与首页/详情页口径一致。
  const score = st.compositeScore;  // 综合分
  const purity = st.purityIndex;    // 纯度(radar/tag 用)
  const uptime = st.availIndex;     // 可用
  const speed = st.speedIndex;      // 速度

  const lats = st.channels.map((c) => c.currentLatencyMs).filter((x): x is number => x != null && x > 0);
  const latency = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null;

  const cand = st.channels
    .map((c) => { const w = c.windows.find((x) => x.period === "24h"); return (Array.isArray(w?.points) ? w!.points : []) as { av: number }[]; })
    .sort((a, b) => b.filter((p) => p.av >= 0).length - a.filter((p) => p.av >= 0).length)[0] ?? [];
  const trend = cand.map((p) => (typeof p.av === "number" ? p.av : -1));

  const tagPool: string[] = [];
  if (purity != null && purity >= 85) tagPool.push("纯度高");
  if (uptime != null && uptime >= 99) tagPool.push("高可用");
  if (startIn != null && startIn <= 5) tagPool.push("低价");
  if (modelIds.size >= 10) tagPool.push("模型丰富");
  if (startIn != null) tagPool.push("价格透明");
  const tags = tagPool.slice(0, 3);

  const radar = radarDims({ purityIndex: purity, availIndex: uptime, speedIndex: speed, priceIn: startIn, modelCount: modelIds.size });

  return {
    id: st.id, isFav: false,
    slug: st.slug, name: st.name,
    host: st.homepage ? st.homepage.replace(/^https?:\/\//, "").replace(/\/+$/, "") : null,
    logoUrl: st.logoUrl, score, families, modelCount: modelIds.size, startIn, startOut, minRatio, uptime, latency, trend,
    intro: st.description, tags, recommend: score != null && score >= 60, radar,
    services: [...new Set(st.channels.map((c) => c.service))],
  };
}
