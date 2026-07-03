import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ensureInviteCode } from "@/lib/invite";

function bjStamp(d: Date) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 16);
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const code = await ensureInviteCode(me.id);
  const [invitees, total, agg] = await Promise.all([
    prisma.user.findMany({ where: { invitedById: me.id }, orderBy: { createdAt: "desc" }, select: { name: true, email: true, createdAt: true }, take: 50 }),
    prisma.user.count({ where: { invitedById: me.id } }),
    prisma.pointsLog.aggregate({ where: { userId: me.id, reason: "邀请好友" }, _sum: { delta: true } }),
  ]);

  return NextResponse.json({
    code,
    count: total,
    points: agg._sum.delta ?? 0,
    records: invitees.map((u) => ({ name: u.name || u.email.split("@")[0], at: bjStamp(u.createdAt) })),
  });
}
