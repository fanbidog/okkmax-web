import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { reviewId } = await req.json().catch(() => ({}));
  if (!reviewId) return NextResponse.json({ error: "缺少 reviewId" }, { status: 400 });

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true, replies: { select: { id: true } } } });
  if (!review || review.userId !== user.id) return NextResponse.json({ error: "无权删除" }, { status: 403 });

  // Vote 无外键,删评论前手动清掉它和它回复上的赞(否则留孤儿票污染计数)
  const replyIds = review.replies.map((r) => r.id);
  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { OR: [
      { targetType: "review", targetId: reviewId },
      { targetType: "reply", targetId: { in: replyIds } },
    ] } }),
    prisma.review.delete({ where: { id: reviewId } }), // 回复由 onDelete:Cascade 连带删除
  ]);
  return NextResponse.json({ ok: true });
}
