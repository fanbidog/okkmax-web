import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { beijingDay, beijingDayStart, PTS } from "@/lib/points";
import { SiteNav } from "@/components/SiteNav";
import { PointsView, type PointsData } from "@/components/PointsView";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

// 北京时区的 "YYYY-MM-DD HH:mm:ss"(明细展示用)
function bjStamp(d: Date) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);
}

const NONE = { checkin: false, detectDaily: false, like: false, review: false, feedback: false, detectFirst: false, favoriteFirst: false, profile: false };

export default async function PointsPage() {
  const me = await getCurrentUser();
  const locale = await getLocale();

  // 未登录:也能看任务/规则,真正做任务时才弹登录
  if (!me) {
    const guest: PointsData = { name: t("访客", locale), image: null, points: 0, loggedIn: false, done: NONE, logs: [] };
    return (<><SiteNav /><PointsView data={guest} /></>);
  }

  const today = beijingDay(0);
  const dayStart = beijingDayStart();
  const [user, logs, todayLogs, onceLogs, checkedToday] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id }, select: { points: true } }),
    prisma.pointsLog.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.pointsLog.findMany({ where: { userId: me.id, createdAt: { gte: dayStart } }, select: { reason: true } }),
    prisma.pointsLog.findMany({ where: { userId: me.id, reason: { in: [PTS.detectFirst, PTS.favoriteFirst, PTS.profile] } }, select: { reason: true }, distinct: ["reason"] }),
    prisma.checkIn.findUnique({ where: { userId_day: { userId: me.id, day: today } }, select: { id: true } }),
  ]);

  const todaySet = new Set(todayLogs.map((l) => l.reason));
  const onceSet = new Set(onceLogs.map((l) => l.reason));

  const data: PointsData = {
    name: me.name || me.email.split("@")[0],
    image: me.image,
    points: user!.points,
    loggedIn: true,
    done: {
      checkin: !!checkedToday,
      detectDaily: todaySet.has(PTS.detectDaily),
      like: todaySet.has(PTS.like),
      review: todaySet.has(PTS.review),
      feedback: todaySet.has(PTS.feedback),
      detectFirst: onceSet.has(PTS.detectFirst),
      favoriteFirst: onceSet.has(PTS.favoriteFirst),
      profile: onceSet.has(PTS.profile),
    },
    logs: logs.map((l) => ({ id: l.id, delta: l.delta, reason: l.reason, at: bjStamp(l.createdAt) })),
  };

  return (
    <>
      <SiteNav />
      <PointsView data={data} />
    </>
  );
}
