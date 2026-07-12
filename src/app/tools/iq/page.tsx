import { existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import { absUrl } from "@/lib/seo";
import { IqBoard, type IqRow } from "@/components/IqBoard";
import { ShareButton } from "@/components/ShareButton";

export const dynamic = "force-dynamic";

// SEO:蹭「claude 降智 / codex 降智 / gpt 降智 / xx 雷达」这批已验证有真实搜索生态的词
// (CodexRadar/claudecoderadar 等竞品已把词做起来了,我们卖点是多厂商全览+30天趋势+分项)
// Trends 实测(12个月全球均值,链式换算):ai排行榜≈17 > 大模型评测≈8 > 大模型排行榜≈3 > ai智商≈2 > 雷达/降智族≈0-1
// 策略:标题同时吃「排行榜」大词与「降智雷达」精准词;降智/雷达族量小但意图准、竞争弱、还在涨,留 keywords
const TITLE = "模型智商榜 - 大模型排行榜与 Claude / Codex 降智雷达";
const DESCRIPTION = "AI 大模型能力排行榜 + 降智雷达：Claude、Codex（GPT）、Gemini 等主流模型综合得分、30 天趋势、推理 / 代码 / 工具调用分项评测，每 5 小时更新，一页看清谁在悄悄变笨。";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["大模型排行榜", "ai排行榜", "大模型评测", "模型智商榜", "claude 雷达", "codex 雷达", "claude 降智", "codex 降智", "gpt 降智", "chatgpt 降智", "降智雷达", "降智检测"],
  alternates: { canonical: "/tools/iq" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: absUrl("/tools/iq") },
};

// IqSyncRound.payload 的模型结构(scripts/iq-sync.ts 落库时的形状)
type PayloadModel = {
  id: number; name: string; display: string; vendor: string;
  cur: number; ci: [number, number] | null; trend: string; status: string; isNew: boolean; re: boolean;
  gold: number | null; sr: number | null; lat: number | null; corr: number | null;
  modes: { reasoning: number | null; coding: number | null; tooling: number | null };
  stability: number | null;
};

const median = (a: number[]): number | null => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

// 厂商 logo 三级回退:内置(设计定稿)→ uploads(iq-sync 对新厂商自动拉取/也可手动放,免发版)→ 占位图
const BUILTIN_LOGOS = new Set(["anthropic", "openai", "google", "deepseek", "kimi", "glm"]);
function vendorLogo(ven: string): string {
  if (BUILTIN_LOGOS.has(ven)) return `/logos/models/${ven}.svg`;
  if (/^[a-z0-9_-]+$/i.test(ven) && existsSync(join(process.cwd(), "public/uploads/models", `${ven}.svg`))) return `/uploads/models/${ven}.svg`;
  return "/logos/models/_generic.svg";
}

export default async function IqPage() {
  const locale = await getLocale();
  const round = await prisma.iqSyncRound.findFirst({ where: { ok: true }, orderBy: { createdAt: "desc" } });
  const payload = round?.payload as { syncedAt?: string; models?: PayloadModel[] } | null;
  const models = payload?.models ?? [];

  // 近 31 天(UTC)趋势条:IqDaily 是我们自己攒的长历史,页面只取渲染窗口
  const since = new Date(Date.now() - 31 * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const daily = models.length
    ? await prisma.iqDaily.findMany({ where: { date: { gte: since } }, select: { modelId: true, date: true, score: true } })
    : [];
  const byModel = new Map<number, Map<string, number | null>>();
  for (const r of daily) {
    const m = byModel.get(r.modelId) ?? new Map();
    m.set(r.date.toISOString().slice(0, 10), r.score);
    byModel.set(r.modelId, m);
  }
  const dayKeys: string[] = [];
  for (let i = 30; i >= 0; i--) dayKeys.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  const days = dayKeys.map((d) => d.slice(5)); // MM-DD 标签
  // 末格覆盖仅当 payload 是今天(UTC)同步的:同步停摆时别拿旧分冒充「当日得分」
  const payloadFresh = !!payload?.syncedAt && payload.syncedAt.slice(0, 10) === dayKeys[dayKeys.length - 1];

  const rows: IqRow[] = models.map((m) => {
    const dm = byModel.get(m.id);
    const vals = dayKeys.map((k) => dm?.get(k) ?? null);
    if (vals.length && payloadFresh) vals[vals.length - 1] = m.cur; // 当日中位未跑完不可靠,末格用当前分(与来源网页一致)
    const base = median(vals.filter((v): v is number => v != null)); // 近期常态 = 30 天中位
    const glitchStats = m.sr === 0 && m.lat === 0; // 来源对个别模型返回全 0 统计,按缺数据处理
    const warn = m.status !== "good";
    const bdiff = base != null ? m.cur - base : null;
    return {
      id: m.id, display: m.display, ven: m.vendor, logo: vendorLogo(m.vendor), cur: m.cur, ci: m.ci,
      base, gold: m.gold, diff: m.gold != null ? m.cur - m.gold : null, bdiff,
      st: warn && bdiff != null && bdiff <= -8 ? 2 : warn ? 1 : 0,
      re: m.re, nw: m.isNew,
      sr: glitchStats ? null : m.sr, lat: glitchStats ? null : m.lat,
      modes: m.modes ?? { reasoning: null, coding: null, tooling: null }, stability: m.stability ?? null, vals, hmed: base,
    };
  }).sort((a, b) => b.cur - a.cur);

  // 状态行:N 款监测中,M 款能力滑落,同步于 X
  const syncedAt = payload?.syncedAt ? Date.parse(payload.syncedAt) : null;
  const hh = syncedAt != null ? Math.max(0, Math.round((Date.now() - syncedAt) / 36e5)) : null;
  const ago = hh == null ? null : hh < 1 ? t("刚刚", locale) : hh >= 48 ? `${Math.round(hh / 24)} ${t("天前", locale)}` : `${hh} ${t("小时前", locale)}`;
  const slipped = rows.filter((r) => r.st >= 1).length;

  // 常见问题:页面渲染与 FAQPage 结构化数据(谷歌 FAQ 富结果)共用同一份
  const faqs: [string, string][] = [
    [t("这些分数是怎么来的？", locale), t("来源方 aistupidlevel 持续给主流厂商的一批模型做自动化考试：写代码每小时测一轮，深度推理和调用工具每天各测一轮，另有每 10 分钟一次的健康检查；每项测试内部按 7 个维度打分，再汇成 0–100 的综合分。OkkMax 每 5 小时同步一份并长期留存，页面顶部会标注同步时间。", locale)],
    [t("什么是「降智」？", locale), t("同一个模型、没换版本，但表现比自己平时明显变差——比如平时考 72 分，突然只考 42 分。常见原因是服务商在高峰期悄悄降低算力、或把请求路由到了更便宜的通道。来源方用统计学的突变点检测算法（CUSUM 和 Page-Hinkley）盯着这种下滑，几小时内就能发现，不用等好几天。", locale)],
    [t("Codex 降智、Claude 降智了，能在这里看吗？", locale), t("能，这里就是一个降智雷达：Codex 雷达、CC 雷达盯的是单独一家，这一页同时盯着 Claude、Codex（GPT）、Gemini、DeepSeek、Kimi 等所有主流模型——谁低于自己平时水平、掉了多少、掉了几天，看「较近期」和 30 天趋势就知道。", locale)],
    [t("为什么分数每天变动这么大？", locale), t("来源方的大部分数据为估算和插值，单日分数会大幅波动，榜单一天内洗牌是常态。看单日排名意义不大，建议看 30 天趋势和「较发布时」的长期变化。", locale)],
    [t("这些分数能代表模型的真实水平吗？", locale), t("只能作参考。它反映的是「同一套题下的相对表现」，横向对比和盯降智比看绝对分更有意义。选模型还是要结合自己的实际用途实测。", locale)],
    [t("数据多久更新一次？", locale), t("来源方每小时实测一轮，OkkMax 每 5 小时同步一次并长期留存——来源方只保留 31 天，我们自己的历史会越攒越长。", locale)],
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <SiteNav active="tools" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div style={{ paddingBottom: 18 }}>
          <div className="crumb"><span style={{ color: "var(--accent-d)" }}>{t("工具", locale)}</span> › {t("模型智商榜", locale)}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <h1 className="iq-h1">{t("模型智商榜", locale)}</h1>
            <ShareButton name={t("模型智商榜", locale)} text={`OkkMax ${t("模型智商榜", locale)}`} />
          </div>
          <p className="iq-lede">
            {t("第三方基准全天候给主流大模型出题打分，盯着谁在悄悄变笨（降智）。", locale)}
            {rows.length > 0 && ago && <>{rows.length} {t("款监测中，", locale)}{slipped} {t("款能力滑落，同步于", locale)} {ago}</>}
          </p>
        </div>

        {rows.length ? (
          <IqBoard rows={rows} days={days} syncText={ago ? `${t("同步于", locale)} ${ago}` : undefined} />
        ) : (
          <div style={{ padding: "80px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>
            {t("数据同步中，稍后再来看看。", locale)}
          </div>
        )}

        <section className="home-sec" id="iq-faq" style={{ paddingBottom: 0 }}>
          <div className="hs-head"><span className="hs-t">{t("常见问题", locale)}</span></div>
          <div>
            {faqs.map(([q, a], i) => (
              <details className="faq" key={i} open={i === 0}>
                <summary>
                  <span>{q}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div className="a">{a}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
