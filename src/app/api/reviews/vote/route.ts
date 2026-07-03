import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { awardPoints, awardDailyFirst, PTS } from "@/lib/points";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { targetType, targetId } = await req.json().catch(() => ({}));
  if (!["review", "reply"].includes(targetType) || !targetId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  // 校验目标存在(Vote 无外键,防止对虚构 id 刷票)
  const authorId = targetType === "review"
    ? (await prisma.review.findUnique({ where: { id: targetId }, select: { userId: true } }))?.userId
    : (await prisma.reviewReply.findUnique({ where: { id: targetId }, select: { userId: true } }))?.userId;
  if (!authorId) return NextResponse.json({ error: targetType === "review" ? "评论不存在" : "回复不存在" }, { status: 400 });
  const isSelf = authorId === user.id;

  const existing = await prisma.vote.findUnique({ where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } } });
  if (existing) await prisma.vote.delete({ where: { id: existing.id } });
  else await prisma.vote.create({ data: { userId: user.id, targetType, targetId } });

  // 评价被赞 → 作者积分(自己赞自己不计;取消则扣回,保持账本一致)
  if (targetType === "review" && !isSelf) {
    await awardPoints(authorId, existing ? -1 : 1, existing ? "取消点赞" : "评价被赞");
  }
  // 点赞者本人:每天首次点赞 +2(自赞不计,与作者侧一致;取消不扣,防刷)
  if (!existing && !isSelf) await awardDailyFirst(user.id, 2, PTS.like);

  const count = await prisma.vote.count({ where: { targetType, targetId } });
  return NextResponse.json({ voted: !existing, count });
}
