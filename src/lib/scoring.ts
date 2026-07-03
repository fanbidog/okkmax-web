import { prisma } from "./prisma";
import { classifyTier } from "./tier";
import { tierEventDraft } from "./stationEvents";
import type { Tier } from "./tier";

const num = (v: string | undefined, fallback: number): number => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// 评分可调常量(一处配置)。权重/系数/阈值属于各部署方自己的评分口径,
// 通过环境变量配置(SCORE_*);下面的 fallback 只是通用缺省值,按需调校。
export const SCORE_CFG = {
  purityWindowDays: 3,      // 纯度:近 N 天检测取中位数
  availSpeedWindowDays: 2,  // 可用/速度:近 N 天快照
  topN: 3,                  // 取最好的 N 个组聚合(不惩罚分组多)
  // 综合 = (可用×wAvail + 速度×wSpeed) × 纯度系数
  wAvail: num(process.env.SCORE_W_AVAIL, 0.5),
  wSpeed: num(process.env.SCORE_W_SPEED, 0.5),
  coef: {
    pureblood: num(process.env.SCORE_COEF_PUREBLOOD, 1.0),
    downgrade: num(process.env.SCORE_COEF_DOWNGRADE, 1.0),
    counterfeit: num(process.env.SCORE_COEF_COUNTERFEIT, 1.0),
  } as Record<string, number>,
  // 速度分:fast 满分 / slow 及以上 0 分
  speedFastMs: num(process.env.SCORE_SPEED_FAST_MS, 2000),
  speedSlowMs: num(process.env.SCORE_SPEED_SLOW_MS, 10000),
  minSamples: 12,           // 最小样本守卫:窗口内快照不足这么多时不给可用/速度分(显「积累中」),防前期 2-3 条虚高
  snapshotRetainDays: 35,   // UptimeSnapshot 原始保留期(覆盖 30d 图表+缓冲)。⚠️ 清理有安全闸:<7 不删,防误删全表
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const mean = (a: number[]): number | null => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 签名交叉验签「参考端试了但没验成」= 该次检测的纯度不可信,不进中位数。
 *  只排除 inconclusive_*(参考端超时/限流/出错);已验成(accepted/rejected)、
 *  未配参考(no_reference_configured)、老数据(无字段)一律保留——避免误伤与转期空档。 */
function sigInconclusive(report: unknown): boolean {
  const results = (report as { results?: unknown })?.results;
  if (!Array.isArray(results)) return false;
  const ts = results.find((r) => (r as { name?: string })?.name === "thinking_signature");
  const cv = (ts as { details?: { cross_verify?: unknown } })?.details?.cross_verify;
  return typeof cv === "string" && cv.startsWith("inconclusive");
}

/** 延迟(ms)→ 速度分 0-100。speedFastMs 满分,speedSlowMs 及以上 0 分。 */
export function speedScore(latMs: number | null): number | null {
  if (latMs == null || latMs <= 0) return null;
  const { speedFastMs: f, speedSlowMs: s } = SCORE_CFG;
  return clamp(((s - latMs) / (s - f)) * 100, 0, 100);
}

/** 算所有站评分并写回 Station/Channel + 排名。
 *  纯度=DetectionResult 近3天中位数(仅 cc);可用/速度=UptimeSnapshot 近2天(成功率 / 延迟中位数)。
 *  站级:按纯度取 top-3 组(无 claude 则按可用)→ 组分平均;综合=乘法闸门。 */
export async function computeAndStoreScores(): Promise<{ stations: number; ranked: number }> {
  const now = Date.now();
  const since3d = new Date(now - SCORE_CFG.purityWindowDays * 86_400_000);
  const since2d = new Date(now - SCORE_CFG.availSpeedWindowDays * 86_400_000);
  const stations = await prisma.station.findMany({
    where: { retiredAt: null }, // 手动下架站不参与评分/排名
    include: {
      channels: {
        where: { delistedAt: null }, // 下架组不参与评分
        include: {
          detections: { where: { detectedAt: { gte: since3d } }, select: { totalScore: true, report: true } },
          uptimes: { where: { capturedAt: { gte: since2d } }, select: { status: true, latencyMs: true } },
        },
      },
    },
  });

  const stScores: { id: string; composite: number | null }[] = [];
  for (const st of stations) {
    // 每组:纯度(中位数,仅 cc)/ 可用(成功率)/ 速度(延迟中位数换算)
    const chs = st.channels.map((c) => {
      // 排除"参考端没验成"的检测,防参考端宕机期间掺水站被存在性分数洗白成官方
      const purityDets = c.detections.filter((d) => !sigInconclusive(d.report));
      const purity = c.service === "cc" ? median(purityDets.map((d) => d.totalScore)) : null;
      const valid = c.uptimes.filter((u) => u.status >= 0); // -1=缺数据,不计入分母
      const lats = c.uptimes.map((u) => u.latencyMs).filter((l) => l > 0);
      // 最小样本守卫:窗口内快照不足 minSamples 时不给分(显「积累中」),防前期 2-3 条就 100% 的虚高
      const avail = valid.length >= SCORE_CFG.minSamples ? (valid.filter((u) => u.status === 1 || u.status === 2).length / valid.length) * 100 : null;
      const speed = lats.length >= SCORE_CFG.minSamples ? speedScore(median(lats)) : null;
      return { id: c.id, purity, avail, speed };
    });
    for (const c of chs) {
      await prisma.channel.update({ where: { id: c.id }, data: { purity: c.purity, avail: c.avail, speed: c.speed } });
    }

    // top-N:有 claude 检测按纯度排,否则按可用排(非 claude 站)
    const claude = chs.filter((c) => c.purity != null).sort((a, b) => b.purity! - a.purity!);
    const top = (claude.length ? claude : [...chs].sort((a, b) => (b.avail ?? -1) - (a.avail ?? -1))).slice(0, SCORE_CFG.topN);
    const purityIndex = claude.length ? mean(top.map((c) => c.purity).filter((v): v is number => v != null)) : null;
    const tier = purityIndex != null ? classifyTier(purityIndex) : null;
    const coef = tier ? (SCORE_CFG.coef[tier.tier] ?? 1) : 1; // 纯度未测系数按 1(测不了不罚)
    // 纯度闸门防失效:有 cc 组却算不出纯度(检测过期/缺失)→ 不按官方渠道折算、暂不排名,
    // 否则掺水站的旧低纯度一旦滑出 3 天窗口,coef 会从惩罚悄悄跳回 1.0、分数虚高冒头。
    const hasCc = st.channels.some((c) => c.service === "cc");
    const purityStale = hasCc && purityIndex == null;
    const availIndex = mean(top.map((c) => c.avail).filter((v): v is number => v != null));
    const speedIndex = mean(top.map((c) => c.speed).filter((v): v is number => v != null));
    const composite = availIndex != null && speedIndex != null && !purityStale
      ? (availIndex * SCORE_CFG.wAvail + speedIndex * SCORE_CFG.wSpeed) * coef
      : null;
    await prisma.station.update({
      where: { id: st.id },
      data: { compositeScore: composite, purityIndex, purityTier: tier?.tier ?? null, availIndex, speedIndex, scoredAt: new Date() },
    });
    const tev = tierEventDraft(st.purityTier as Tier | null, tier?.tier ?? null);
    if (tev) await prisma.stationEvent.create({ data: { stationId: st.id, type: "tier", channel: null, data: tev.data as object } });
    stScores.push({ id: st.id, composite });
  }

  // 排名:综合分降序,无综合分(null)排末尾(rank=null)。
  // 排名变化:更新 rank 前先把「本次算分开始时的旧 rank」存进 prevRank,前端据此显示涨跌。
  const prevRankById = new Map(stations.map((s) => [s.id, s.rank]));
  const ranked = stScores.filter((s) => s.composite != null).sort((a, b) => b.composite! - a.composite!);
  let r = 0;
  for (const s of ranked) { r++; await prisma.station.update({ where: { id: s.id }, data: { rank: r, prevRank: prevRankById.get(s.id) ?? null } }); }
  await prisma.station.updateMany({ where: { compositeScore: null }, data: { rank: null } });
  return { stations: stations.length, ranked: ranked.length };
}
