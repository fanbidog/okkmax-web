import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { AvailabilityBoard } from "@/components/AvailabilityBoard";
import { type AvailCard, type AvailChannel } from "@/components/StationAvailCard";
import { pickFlagship } from "@/lib/flagship";
import { availabilityToColor, STATUS_COLOR, stationStatus } from "@/lib/uptimeColor";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const PERIODS = ["90m", "24h", "7d", "30d"] as const;
const PERIOD_LABEL: Record<string, string> = { "90m": "90m", "24h": "24h", "7d": "7d", "30d": "30d" };

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8", "claude-opus-4-7": "Opus 4.7", "claude-opus-4-6": "Opus 4.6",
  "claude-sonnet-4-6": "Sonnet 4.6", "claude-haiku-4-5": "Haiku 4.5", "claude-haiku-4-5-20251001": "Haiku 4.5",
  "gpt-5.5": "GPT 5.5", "gpt-5.4": "GPT 5.4",
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro", "gemini-3.1-pro": "Gemini 3.1 Pro",
};
const fmtModel = (m: string) => MODEL_LABEL[m] ?? m;

function fmtLatencyMs(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// down 时显示真实失败原因(监测数据已分好的 sub_status,与趋势条 tooltip 同一套词),从最近一个有错误的点取主因。
const FAIL_REASON: Record<string, string> = {
  auth_error: "认证失败", rate_limit: "被限流", server_error: "服务端错", client_error: "请求被拒",
  invalid_request: "请求被拒", network_error: "连接失败", response_timeout: "超时", content_mismatch: "答案不符",
};
function failReason(points: unknown): string | null {
  const arr = Array.isArray(points) ? (points as { sc?: Record<string, number> }[]) : [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const sc = arr[i]?.sc;
    if (!sc) continue;
    const errs = Object.entries(sc).filter(([k, v]) => FAIL_REASON[k] && v > 0).sort((a, b) => b[1] - a[1]);
    if (errs.length) return FAIL_REASON[errs[0][0]];
  }
  return null;
}

function deriveStatus(avg: number | null, cur: number | null): { key: AvailChannel["statusKey"]; text: string } {
  if (cur === 1) return { key: "ok", text: "正常" };
  if (cur === 2) return { key: "warn", text: "波动" };
  if (cur === 0) return { key: "down", text: "异常" };
  if (avg == null || avg < 0) return { key: "none", text: "—" };
  if (avg >= 99) return { key: "ok", text: "正常" };
  if (avg >= 90) return { key: "warn", text: "波动" };
  return { key: "down", text: "异常" };
}

const SVC_ORDER: Record<string, number> = { cc: 0, cx: 1, gm: 2 };

export const metadata = {
  title: "中转站可用性监测:实时在线率与延迟",
  description: "各 AI 中转站分组的实时在线率与延迟监测,数据全自动采集。",
  alternates: { canonical: "/availability" },
};

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  const period = (PERIODS as readonly string[]).includes(sp.p ?? "") ? (sp.p as string) : "90m";

  const stations = await prisma.station.findMany({
    where: { retiredAt: null }, // 手动下架站不进可用性页
    orderBy: { name: "asc" },
    include: { channels: { where: { delistedAt: null }, include: { windows: { where: { period } } } } }, // 下架组不进可用性页
  });

  // 逐站构造卡片;逐通道取旗舰模型 + 窗口可用率 + 当前状态
  let chTotal = 0, alertTotal = 0, upSum = 0, upN = 0, latSum = 0, latN = 0;
  const svcSet = new Set<string>();
  const cards: AvailCard[] = [];

  for (const st of stations) {
    const channels: AvailChannel[] = st.channels
      .map((ch) => {
        const models = (Array.isArray(ch.models) ? ch.models : []) as string[];
        const fs = pickFlagship(models);
        const w = ch.windows[0];
        const avg = w ? w.avg : null;
        const stt = deriveStatus(avg, ch.currentStatus ?? null);
        return {
          group: ch.name,
          service: fs?.service ?? ch.service,
          model: fs ? fmtModel(fs.model) : (models[0] ? fmtModel(models[0]) : "—"),
          statusKey: stt.key,
          statusText: stt.text,
          avg,
          latency: stt.key === "down" ? (failReason(w ? w.points : null) ?? "失败") : fmtLatencyMs(ch.currentLatencyMs ?? null),
          points: w ? w.points : null,
          dot: availabilityToColor(avg ?? -1),
        };
      })
      .sort((a, b) => (SVC_ORDER[a.service] ?? 9) - (SVC_ORDER[b.service] ?? 9) || a.group.localeCompare(b.group));

    if (!channels.length) continue;

    const ups = channels.map((c) => c.avg).filter((v): v is number => v != null && v >= 0);
    const stAvgUp = ups.length ? ups.reduce((s, v) => s + v, 0) / ups.length : null;
    const stLats = st.channels.map((c) => c.currentLatencyMs).filter((v): v is number => v != null && v > 0);
    const stAvgLat = stLats.length ? stLats.reduce((s, v) => s + v, 0) / stLats.length : null;
    const downCount = channels.filter((c) => c.statusKey === "down").length;
    const sev = stationStatus(channels); // 站级状态按"挂的比例"分(全站统一逻辑)

    chTotal += channels.length;
    alertTotal += downCount;
    if (stAvgUp != null) { upSum += stAvgUp; upN++; }
    if (stAvgLat != null) { latSum += stAvgLat; latN++; }
    channels.forEach((c) => svcSet.add(c.service));

    cards.push({
      name: st.name,
      slug: st.slug,
      logoUrl: st.logoUrl,
      statusText: sev.text,
      statusColor: sev.color,
      avgUptime: stAvgUp != null ? `${stAvgUp.toFixed(1)}%` : "—",
      avgLatency: stAvgLat != null ? (stAvgLat < 1000 ? `${Math.round(stAvgLat)}ms` : `${(stAvgLat / 1000).toFixed(2)}s`) : "—",
      avgUptimeNum: stAvgUp,
      avgLatencyNum: stAvgLat,
      channels,
      defaultOpen: false,
    });
  }

  // 异常站排前面,再按可用率降序
  cards.sort((a, b) => {
    const ai = a.statusText !== "正常" ? 0 : 1, bi = b.statusText !== "正常" ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return (parseFloat(b.avgUptime) || 0) - (parseFloat(a.avgUptime) || 0);
  });
  // 只有排前两位的默认展开,其余默认收起(保持页面清爽)
  cards.forEach((c, i) => { c.defaultOpen = i < 2; });

  const avgUp = upN ? (upSum / upN).toFixed(2) : "—";
  const avgLat = latN ? (latSum / latN / 1000).toFixed(2) : "—";
  const overall = alertTotal > 0 ? { t: alertTotal > 1 ? t("部分异常", locale) : `1 ${t("处异常", locale)}`, c: STATUS_COLOR.down } : { t: t("正常", locale), c: STATUS_COLOR.ok };

  const tab = (p: string) => (
    <Link key={p} href={p === "90m" ? "/availability" : `/availability?p=${p}`} className={period === p ? "on" : ""}>{PERIOD_LABEL[p]}</Link>
  );

  return (
    <>
      <SiteNav active="availability" />
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="avail-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "34px 0 18px" }}>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em" }}>{t("全站可用性", locale)}</h1>
            <div style={{ fontSize: 13.5, color: "var(--ink2)", marginTop: 5 }}>{t("实时监控各站每个服务、每个模型的可用性、延迟与响应趋势", locale)}</div>
          </div>
          <div className="seg avail-period">{PERIODS.map(tab)}</div>
        </div>

        <div className="avail-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
          <div className="metric" style={{ background: "var(--bg2)" }}><div className="l">{t("整体状态", locale)}</div><div className="v" style={{ color: overall.c }}>{overall.t}</div><div className="x">{alertTotal > 0 ? t("有服务需要关注", locale) : t("所有服务运行正常", locale)}</div></div>
          <div className="metric"><div className="l">{t("平均可用率", locale)}</div><div className="v">{avgUp}{avgUp !== "—" ? "%" : ""}</div><div className="x">{period} {t("内全站均值", locale)}</div></div>
          <div className="metric"><div className="l">{t("平均延迟", locale)}</div><div className="v">{avgLat}{avgLat !== "—" ? "s" : ""}</div><div className="x">{chTotal} {t("个监测均值", locale)}</div></div>
          <div className="metric"><div className="l">{t("异常告警", locale)}</div><div className="v" style={{ color: alertTotal > 0 ? STATUS_COLOR.down : "var(--ink)" }}>{alertTotal} {t("个", locale)}</div><div className="x">{svcSet.size} {t("个服务", locale)} · {chTotal} {t("个模型", locale)}</div></div>
        </div>

        {cards.length
          ? <AvailabilityBoard cards={cards} period={period} />
          : <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>{t("暂无监测数据", locale)}</div>}
      </div>
    </>
  );
}
