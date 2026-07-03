import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, sessionCookieOptions, SESSION_COOKIE, isSecureRequest } from "@/lib/auth";
import { ensureInviteCode, applyInviteRef, REF_COOKIE } from "@/lib/invite";
import { checkSignupCode } from "@/lib/verification";
import { isEmailAllowed } from "@/lib/emailPolicy";

// 方案 A 建号出口:验证码通过才 user.create(带 emailVerifiedAt)+ 发邀请分 + 建 session。
export async function POST(req: NextRequest) {
  const { email: rawEmail, code } = await req.json().catch(() => ({}));
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || typeof code !== "string") return NextResponse.json({ error: "参数缺失" }, { status: 400 });

  const result = await checkSignupCode(email, code.trim());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // 保险:两步之间白名单可能被后台改动,建号前再查一次。
  if (!(await isEmailAllowed(email))) return NextResponse.json({ error: "该邮箱域名暂不支持注册,请换用常用邮箱" }, { status: 400 });

  // 并发兜底:暂存校验通过到建号之间,邮箱可能已被占(理论极少)。
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ error: "该邮箱已注册,请直接登录" }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.create({ data: { email, passwordHash: result.passwordHash, name: result.name, image: "/avatars/default.png", emailVerifiedAt: new Date() } });
  } catch {
    return NextResponse.json({ error: "该邮箱已注册,请直接登录" }, { status: 400 }); // 兜 unique 约束竞态
  }
  await ensureInviteCode(user.id);
  const refApplied = await applyInviteRef(result.inviteRef ?? undefined, user.id);

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ ok: true, next: "/" });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt, isSecureRequest(req)));
  if (refApplied) res.cookies.delete(REF_COOKIE);
  return res;
}
