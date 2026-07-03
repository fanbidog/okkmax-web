import { SiteNav } from "@/components/SiteNav";
import { PromoBoard } from "@/components/PromoBoard";
import { prisma } from "@/lib/prisma";
import type { FreeApiView, RelayView } from "@/lib/promoData";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import { pick } from "@/lib/i18n/pick";

export const dynamic = "force-dynamic";

// 活动页:免费 API + 中转站福利。数据来自 DB(后台录入),dead 在此处由 active+endsAt 推导。
export const metadata = {
  title: "免费 API 与中转站优惠活动",
  description: "免费 AI API 额度与各中转站优惠活动汇总,持续更新。",
  alternates: { canonical: "/activity" },
};

export default async function ActivityPage() {
  const locale = await getLocale();
  const now = Date.now();
  const isDead = (active: boolean, endsAt: Date | null) => !active || (endsAt !== null && endsAt.getTime() < now);

  const [free, relay] = await Promise.all([
    prisma.freeApi.findMany({ orderBy: [{ sortWeight: "desc" }, { createdAt: "desc" }] }),
    prisma.relayPromo.findMany({ orderBy: [{ sortWeight: "desc" }, { createdAt: "desc" }] }),
  ]);

  const freeApis: FreeApiView[] = free.map((a) => ({
    id: a.id, model: a.model, provider: a.provider, logoUrl: a.logoUrl,
    context: a.context, maxOutput: a.maxOutput, bindCard: a.bindCard, network: a.network,
    quota: pick(a, "quota", locale), modality: a.modality ? a.modality.split(",").map((s) => s.trim()).filter(Boolean) : [],
    endsAt: a.endsAt ? a.endsAt.toISOString() : null, dead: isDead(a.active, a.endsAt),
    sortWeight: a.sortWeight, createdAt: a.createdAt.toISOString(), claimUrl: a.claimUrl,
  }));

  const relayPromos: RelayView[] = relay.map((p) => ({
    id: p.id, station: p.station, host: p.host, logoUrl: p.logoUrl,
    activity: pick(p, "activity", locale), eligibility: pick(p, "eligibility", locale), steps: pick(p, "steps", locale), terms: pick(p, "terms", locale),
    endsAt: p.endsAt ? p.endsAt.toISOString() : null, dead: isDead(p.active, p.endsAt),
    sortWeight: p.sortWeight, createdAt: p.createdAt.toISOString(), claimUrl: p.claimUrl,
  }));

  return (
    <>
      <SiteNav active="activity" />
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="promo-head">
          <h1>{t("福利活动", locale)}</h1>
          <div className="sub">{t("中转站限时福利，加上各家官方免费 API 资源，汇总一处。人工核实，失效即下。", locale)}</div>
        </div>
        <PromoBoard freeApis={freeApis} relayPromos={relayPromos} />
      </div>
    </>
  );
}
