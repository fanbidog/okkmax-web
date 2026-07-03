import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { awardOnce, PTS } from "@/lib/points";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { stationId } = await req.json().catch(() => ({ stationId: "" }));
  if (!stationId) return NextResponse.json({ error: "缺少 stationId" }, { status: 400 });

  // 站点不存在直接 400,避免 create 撞外键裸抛 500
  const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) return NextResponse.json({ error: "站点不存在" }, { status: 400 });

  const existing = await prisma.favorite.findUnique({ where: { userId_stationId: { userId: user.id, stationId } } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favorite.create({ data: { userId: user.id, stationId } });
  await awardOnce(user.id, 3, PTS.favoriteFirst); // 首次收藏 +3
  return NextResponse.json({ favorited: true });
}
