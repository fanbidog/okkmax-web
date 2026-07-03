import { NextRequest, NextResponse } from "next/server";
import { issueSignupCode, getSignupPending } from "@/lib/verification";
import { rateLimit, inCooldown, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { verifyCodeEmail } from "@/lib/email/templates";

// 重发注册验证码:复用暂存的 passwordHash/name/inviteRef,只换新码;冷却 + 限流同 register。
export async function POST(req: NextRequest) {
  const { email: rawEmail } = await req.json().catch(() => ({}));
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "参数缺失" }, { status: 400 });

  const pending = await getSignupPending(email);
  if (!pending) return NextResponse.json({ error: "请先填写注册信息" }, { status: 400 });

  const ip = clientIp(req);
  if (await inCooldown(`verify:email:${email}`, 60)) return NextResponse.json({ error: "请 60 秒后再试" }, { status: 429 });
  if (!(await rateLimit(`verify:email:${email}`, 3600, 5))) return NextResponse.json({ error: "请求过于频繁,请稍后再试" }, { status: 429 });
  if (!(await rateLimit(`verify:ip:${ip}`, 3600, 20))) return NextResponse.json({ error: "请求过于频繁,请稍后再试" }, { status: 429 });

  const code = await issueSignupCode({ email, passwordHash: pending.passwordHash, name: pending.name, inviteRef: pending.inviteRef });
  const { subject, html } = verifyCodeEmail(code);
  try { await sendEmail({ to: email, subject, html }); }
  catch { return NextResponse.json({ error: "验证码发送失败,请稍后再试" }, { status: 502 }); }
  return NextResponse.json({ ok: true });
}
