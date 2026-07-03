import { LockedPage } from "@/components/LockedPage";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { StationListBoard } from "@/components/StationListBoard";
import { buildStationRow, STATION_ROW_INCLUDE, type StationLike } from "@/lib/stationRow";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const me = await getCurrentUser();
  const locale = await getLocale();
  if (!me) return (<><SiteNav /><LockedPage title={t("我的收藏", locale)} /></>);
  const favs = await prisma.favorite.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    include: { station: { include: STATION_ROW_INCLUDE } },
  });
  const rows = favs.map((f) => { const r = buildStationRow(f.station as unknown as StationLike); r.isFav = true; return r; });
  return (
    <>
      <SiteNav />
      <div className="wrap" style={{ paddingTop: 38, paddingBottom: 80 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{t("我的收藏", locale)} <span style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 400, marginLeft: 4 }}>{rows.length}</span></div>
          <a href="/list" style={{ fontSize: 13, color: "var(--accent-d)", fontWeight: 500 }}>{t("去站点页发现更多 →", locale)}</a>
        </div>
        {rows.length
          ? <StationListBoard rows={rows} showFilters={false} loggedIn />
          : <div style={{ padding: "70px 0", textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>{t("还没有收藏。在站点页点收藏吧。", locale)}</div>}
      </div>
    </>
  );
}
