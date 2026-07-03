import { prisma } from "@/lib/prisma";

/** 北京时区(UTC+8)日期字符串,作为签到的「天」边界。offsetDays=-1 即昨天。 */
export function beijingDay(offsetDays = 0): string {
  const t = Date.now() + 8 * 3600 * 1000 + offsetDays * 86400 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/** 加/扣积分并记一条账本(balance = 变动后余额)。积分将来要兑换,以 PointsLog 为唯一账本。 */
export async function awardPoints(userId: string, delta: number, reason: string) {
  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
    if (!u) return;
    const balance = u.points + delta;
    await tx.user.update({ where: { id: userId }, data: { points: balance } });
    await tx.pointsLog.create({ data: { userId, delta, reason, balance } });
  });
}

/** 当前北京日 00:00 对应的 UTC 时刻,用于「今天是否已发过某分」的查询边界。 */
export function beijingDayStart(): Date {
  return new Date(`${beijingDay(0)}T00:00:00+08:00`);
}

/** 任务 → PointsLog.reason 的事实源(页面判定「今天/已完成」与路由发分都用这个,防漂移)。 */
export const PTS = {
  checkin: "每日签到",
  detectDaily: "每日检测",
  like: "点赞优质评价",
  review: "发表点评",
  feedback: "反馈纠错",
  detectFirst: "完成首次检测",
  favoriteFirst: "首次收藏",
  profile: "完善资料",
} as const;

/** 当天(北京时区)首次触发某 reason 才发分;已发过返回 false。 */
export async function awardDailyFirst(userId: string, delta: number, reason: string): Promise<boolean> {
  const existing = await prisma.pointsLog.findFirst({ where: { userId, reason, createdAt: { gte: beijingDayStart() } }, select: { id: true } });
  if (existing) return false;
  await awardPoints(userId, delta, reason);
  return true;
}

/** 历史从未触发某 reason 才发分(一次性任务);已发过返回 false。 */
export async function awardOnce(userId: string, delta: number, reason: string): Promise<boolean> {
  const existing = await prisma.pointsLog.findFirst({ where: { userId, reason }, select: { id: true } });
  if (existing) return false;
  await awardPoints(userId, delta, reason);
  return true;
}

