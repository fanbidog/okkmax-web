import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { reviewId, body } = await req.json().catch(() => ({}));
  const text = String(body || "").trim();
  if (!reviewId || !text) return NextResponse.json({ error: "内容为空" }, { status: 400 });
  const review = await prisma.review.findUnique({ where: { id: String(reviewId) } });
  if (!review) return NextResponse.json({ error: "评论不存在" }, { status: 404 });
  await prisma.reviewReply.create({ data: { reviewId: String(reviewId), userId: user.id, body: text.slice(0, 1000) } });
  return NextResponse.json({ ok: true });
}
