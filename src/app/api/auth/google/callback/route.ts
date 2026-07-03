import { NextRequest, NextResponse } from "next/server";
import { createSession, sessionCookieOptions, SESSION_COOKIE, requestOrigin, isSecureRequest } from "@/lib/auth";
import { exchangeCode, OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { resolveGoogleUser } from "@/lib/google-user";
import { REF_COOKIE } from "@/lib/invite";

function safeNext(s: string) { return s.startsWith("/") && !s.startsWith("//") ? s : "/"; }

// Google 回调:验 state → 换码 → email_verified 闸 → find-or-create → 封号检查 → 现有 session。
export async function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  // 失败跳首页(全站无 /login 路由,原来跳 /login 是 404);带 authError 参数,首页 AuthModal 自动弹窗显示
  const fail = (msg: string) => NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(msg)}`, origin), 303);

  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return fail("已取消 Google 登录");
  const code = sp.get("code");
  const stateParam = sp.get("state");

  // ① 验 state(CSRF):cookie 里的 state 必须与回调 query 的 state 一致
  const raw = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  let saved: { state?: string; next?: string } = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch { /* 坏 cookie,下面校验会失败 */ }
  if (!code || !stateParam || !saved.state || saved.state !== stateParam) return fail("登录校验失败,请重试");
  const next = safeNext(saved.next || "/");

  // ② 换码拿 Google 身份(服务端换码,id_token 可信;helper 内已校验 aud/iss)
  let profile;
  try { profile = await exchangeCode(code, `${origin}/api/auth/google/callback`); }
  catch { return fail("Google 登录失败,请重试"); }

  // ③ email_verified 闸:Google 邮箱未验证则拒绝(防关联到他人未验证邮箱 = 账号接管)
  if (!profile.email || !profile.emailVerified) return fail("该 Google 账号邮箱未验证,无法登录");

  // ④ find-or-create 三级(防重复账号):googleId → email 关联 → 建号(见 resolveGoogleUser)
  const { user, refApplied } = await resolveGoogleUser(profile, req.cookies.get(REF_COOKIE)?.value);

  // ⑤ 封号检查:已存在用户若被封,拒登录、不建 session(getCurrentUser 会话层亦拦,此为双保险)
  if (user.status === "banned") {
    return fail("账号已封禁" + (user.bannedReason ? `:${user.bannedReason}` : ""));
  }

  // ⑥ 走现有 cookie session 机制(与密码登录完全一致)
  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.redirect(new URL(next, origin), 303);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt, isSecureRequest(req)));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  if (refApplied) res.cookies.delete(REF_COOKIE);
  return res;
}
