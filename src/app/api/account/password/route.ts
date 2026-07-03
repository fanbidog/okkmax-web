import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { oldPassword, newPassword } = await req.json().catch(() => ({}));

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (row?.passwordHash) {
    if (typeof oldPassword !== "string" || !(await verifyPassword(oldPassword, row.passwordHash))) {
      return NextResponse.json({ error: "原密码不正确" }, { status: 400 });
    }
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return NextResponse.json({ ok: true });
}
