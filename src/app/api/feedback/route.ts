import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { awardDailyFirst, PTS } from "@/lib/points";

const TYPES = ["basic", "price", "model", "other"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const d = await req.json().catch(() => ({}));
  const stationId = String(d.stationId || "");
  const type = TYPES.includes(d.type) ? d.type : "other";
  const body = String(d.body || "").trim().slice(0, 1000);
  const source = String(d.source || "").trim().slice(0, 300) || null;
  if (!stationId || !body) return NextResponse.json({ error: "请填写反馈内容" }, { status: 400 });

  const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) return NextResponse.json({ error: "站点不存在" }, { status: 404 });

  await prisma.feedback.create({ data: { stationId, userId: user?.id ?? null, type, body, source } });
  if (user) await awardDailyFirst(user.id, 5, PTS.feedback); // 每天首条纠错 +5
  return NextResponse.json({ ok: true });
}
