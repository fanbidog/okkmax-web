import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SiteNav } from "@/components/SiteNav";
import { StationListBoard } from "@/components/StationListBoard";
import { buildStationRow, STATION_ROW_INCLUDE, type StationLike } from "@/lib/stationRow";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import { pick } from "@/lib/i18n/pick";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 中转站排行榜:纯度、可用性、价格对比",
  description: "全部 AI 中转站的纯度、可用性、延迟与价格横向对比排行,数据全自动实测,帮你发现好用的中转站。",
  alternates: { canonical: "/list" },
};

export default async function ListPage() {
  const locale = await getLocale();
  const stations = await prisma.station.findMany({ where: { retiredAt: null }, include: STATION_ROW_INCLUDE });
  const me = await getCurrentUser();
  const favSet = me ? new Set((await prisma.favorite.findMany({ where: { userId: me.id }, select: { stationId: true } })).map((f) => f.stationId)) : new Set<string>();
  const rows = stations.map((st) => { const r = buildStationRow(st as unknown as StationLike); r.isFav = favSet.has(r.id); r.intro = pick(st, "description", locale); return r; });
  const modelTotal = rows.reduce((s, r) => s + r.modelCount, 0);

  return (
    <>
      <SiteNav active="list" />
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div style={{ padding: "34px 0 18px" }}>
          <h1 style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em" }}>{t("中转站", locale)}</h1>
          <div style={{ fontSize: 13.5, color: "var(--ink2)", marginTop: 5 }}>
            {t("收录", locale)} {rows.length} {t("站", locale)},{modelTotal} {t("个模型", locale)} | {t("综合分(纯度实测)+ 支持模型 + 倍率 + 在线率 横向对比", locale)}
          </div>
        </div>
        {rows.length
          ? <StationListBoard rows={rows} loggedIn={!!me} />
          : <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>{t("暂无收录站点", locale)}</div>}
      </div>
    </>
  );
}
