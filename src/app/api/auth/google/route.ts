import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildAuthUrl, OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { requestOrigin } from "@/lib/auth";

function safeNext(s: string) { return s.startsWith("/") && !s.startsWith("//") ? s : "/"; }

// 起跳:生成 state(防 CSRF)写短时 cookie,带 state 跳 Google 授权页。
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next") || "/");
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${requestOrigin(req)}/api/auth/google/callback`;

  const res = NextResponse.redirect(buildAuthUrl(redirectUri, state));
  res.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // 回调是 Google 顶级跳转 GET,lax 才会带上(strict 会丢)
    path: "/",
    maxAge: 600, // 10 分钟
  });
  return res;
}
