import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestOrigin } from "@/lib/auth";
import { issueResetToken } from "@/lib/verification";
import { rateLimit, inCooldown, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { resetLinkEmail } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  const { email: rawEmail } = await req.json().catch(() => ({}));
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });

  const ip = clientIp(req);
  // 防轰炸限流保留(防枚举已撤,但限流不撤):邮箱冷却 60s + 每小时 5 次,IP 每小时 20 次。
  if (await inCooldown(`reset:email:${email}`, 60)) return NextResponse.json({ error: "请求过于频繁,请 60 秒后再试" }, { status: 429 });
  if (!(await rateLimit(`reset:email:${email}`, 3600, 5))) return NextResponse.json({ error: "请求过于频繁,请稍后再试" }, { status: 429 });
  if (!(await rateLimit(`reset:ip:${ip}`, 3600, 20))) return NextResponse.json({ error: "请求过于频繁,请稍后再试" }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, status: true } });
  // 不防枚举(与注册口一致、优先体验):未注册直接明说。
  if (!user) return NextResponse.json({ error: "该邮箱未注册" }, { status: 400 });

  // 已注册:逻辑完全照旧——仅对「有密码 + 未封禁」发信(Google-only / 封禁号的处理一行不动)。
  if (user.passwordHash && user.status === "active") {
    const raw = await issueResetToken(user.id);
    const url = `${requestOrigin(req)}/reset?token=${raw}`;
    const { subject, html } = resetLinkEmail(url);
    try { await sendEmail({ to: email, subject, html }); } catch { /* 发信失败不阻塞响应 */ }
  }
  return NextResponse.json({ ok: true, message: "重置邮件已发出,请查收(含垃圾箱)" });
}
