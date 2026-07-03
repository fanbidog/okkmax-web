import { NextRequest, NextResponse } from "next/server";
import { clearSessionByToken, SESSION_COOKIE, requestOrigin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await clearSessionByToken(token);
  const res = NextResponse.redirect(new URL("/", requestOrigin(req)), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
