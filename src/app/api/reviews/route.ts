import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeTags } from "@/lib/reviewTags";
import { awardDailyFirst, PTS } from "@/lib/points";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const stationId = String(form.get("stationId") || "");
  const slug = String(form.get("slug") || "");
  const back = slug ? `/station/${slug}` : "/";
  const rating = Math.round(Number(form.get("rating")));
  const body = String(form.get("body") || "").trim();
  const pros = sanitizeTags(form.getAll("pros").map(String));
  const cons = sanitizeTags(form.getAll("cons").map(String));
  const tags = sanitizeTags([...pros, ...cons]); // 兼容旧字段:存并集

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`${back}#reviews`, req.url), 303); // 登录由前端弹窗处理,这里仅兜底
  if (!stationId) { // 缺站点信息(正常从站点页发起不会缺,仅兜底直连请求)
    return NextResponse.redirect(new URL(`${back}?rerr=${encodeURIComponent("缺少站点信息,请从站点页发起评论")}#reviews`, req.url), 303);
  }
  if (!(rating >= 1 && rating <= 5) || !body) { // 评分 + 内容都必填
    return NextResponse.redirect(new URL(`${back}?rerr=${encodeURIComponent("请打分并填写评论内容")}#reviews`, req.url), 303);
  }

  // 站点不存在直接 400,避免 create 撞外键裸抛 500
  const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) return NextResponse.json({ error: "站点不存在" }, { status: 400 });

  // 一人可多条评论(无修改概念);积分每天首条计、防刷分
  await prisma.review.create({ data: { stationId, userId: user.id, rating, body: body.slice(0, 2000), tags, prosTags: pros, consTags: cons, isWarning: rating <= 2 } });
  await awardDailyFirst(user.id, 8, PTS.review);
  return NextResponse.redirect(new URL(`${back}?posted=1#reviews`, req.url), 303);
}
