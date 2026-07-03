import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { consumeResetToken } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json().catch(() => ({}));
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }
  const userId = await consumeResetToken(String(token || ""));
  if (!userId) return NextResponse.json({ error: "链接无效或已过期,请重新申请" }, { status: 400 });

  // 改密 + 失效该用户全部 session(强制所有设备重登)+ 清掉其它未用重置 token
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId, consumedAt: null } }),
  ]);
  return NextResponse.json({ ok: true });
}
