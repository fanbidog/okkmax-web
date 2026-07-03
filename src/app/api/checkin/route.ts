import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { beijingDay, PTS } from "@/lib/points";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const today = beijingDay(0), yesterday = beijingDay(-1);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.checkIn.create({ data: { userId: user.id, day: today } }); // 唯一约束 (userId,day) 防重复签到
      const yest = await tx.checkIn.findUnique({ where: { userId_day: { userId: user.id, day: yesterday } } });
      const u = await tx.user.findUnique({ where: { id: user.id }, select: { points: true, checkInStreak: true } });
      const streak = yest ? u!.checkInStreak + 1 : 1; // streak 仍记账,当前只展示用
      const award = 3 + Math.floor(Math.random() * 3); // 每次随机 3~5 分
      const points = u!.points + award;
      await tx.user.update({ where: { id: user.id }, data: { points, checkInStreak: streak } });
      await tx.pointsLog.create({ data: { userId: user.id, delta: award, reason: PTS.checkin, balance: points } });
      return { award, streak, points };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "今日已签到" }, { status: 409 });
    }
    throw e;
  }
}
