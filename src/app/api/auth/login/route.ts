import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, sessionCookieOptions, SESSION_COOKIE, requestOrigin, isSecureRequest } from "@/lib/auth";

function safeNext(s: string) { return s.startsWith("/") && !s.startsWith("//") ? s : "/"; }

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData(); // 登录只收表单;JSON 等非表单请求会抛,兜为 415 而非 500
  } catch {
    return NextResponse.json({ error: "请用表单提交登录" }, { status: 415 });
  }
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = safeNext(String(form.get("redirectTo") || "/"));
  const wantsJson = req.headers.get("accept")?.includes("application/json");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    if (wantsJson) return NextResponse.json({ error: "邮箱或密码错误" }, { status: 400 });
    return NextResponse.redirect(new URL("/", requestOrigin(req)), 303); // 无 /login 页,失败回首页(真实 UI 走 JSON 内联报错)
  }
  if (user.status === "banned") {
    const msg = "账号已封禁" + (user.bannedReason ? `:${user.bannedReason}` : "");
    if (wantsJson) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.redirect(new URL("/", requestOrigin(req)), 303);
  }
  const { token, expiresAt } = await createSession(user.id);
  const res = wantsJson ? NextResponse.json({ ok: true, next }) : NextResponse.redirect(new URL(next, requestOrigin(req)), 303);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt, isSecureRequest(req)));
  return res;
}
