import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { REF_COOKIE } from "@/lib/invite";
import { issueSignupCode } from "@/lib/verification";
import { rateLimit, inCooldown, clientIp } from "@/lib/rate-limit";
import { isEmailAllowed } from "@/lib/emailPolicy";
import { sendEmail } from "@/lib/email/send";
import { verifyCodeEmail } from "@/lib/email/templates";

const REG_IP_DAILY_CAP = 8; // 每 IP 每日注册上限(白名单挡不住 Gmail +别名,靠这道量闸)

// 方案 A:注册不建号,把 {email, passwordHash, name, inviteRef} 暂存 EmailVerification,
// 发 6 位验证码;验证码通过(见 register/verify)才 user.create + 发分 + 建 session。
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const name = String(form.get("name") || "").trim() || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  if (!(await isEmailAllowed(email))) return NextResponse.json({ error: "该邮箱域名暂不支持注册,请换用常用邮箱" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "该邮箱已注册,请直接登录" }, { status: 400 });

  const ip = clientIp(req);
  if (await inCooldown(`verify:email:${email}`, 60)) return NextResponse.json({ error: "验证码已发送,请 60 秒后再试" }, { status: 429 });
  if (!(await rateLimit(`verify:email:${email}`, 3600, 5))) return NextResponse.json({ error: "请求过于频繁,请稍后再试" }, { status: 429 });
  if (!(await rateLimit(`verify:ip:${ip}`, 3600, 20))) return NextResponse.json({ error: "请求过于频繁,请稍后再试" }, { status: 429 });
  if (!(await rateLimit(`reg:ip:day:${ip}`, 86400, REG_IP_DAILY_CAP))) return NextResponse.json({ error: "今日注册已达上限,请明天再试" }, { status: 429 });

  const inviteRef = req.cookies.get(REF_COOKIE)?.value ?? null;
  const code = await issueSignupCode({ email, passwordHash: await hashPassword(password), name, inviteRef });
  const { subject, html } = verifyCodeEmail(code);
  try { await sendEmail({ to: email, subject, html }); }
  catch { return NextResponse.json({ error: "验证码发送失败,请稍后再试" }, { status: 502 }); }

  return NextResponse.json({ ok: true, needVerify: true, email });
}
