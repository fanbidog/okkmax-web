import { randomInt, randomBytes, createHash } from "node:crypto";
import { prisma } from "./prisma";

/** 6 位数字验证码(含前导零)。 */
export function genCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** 高熵重置 token(明文,进邮件链接;DB 只存其 hash)。 */
export function genResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** sha256 hex,用于存验证码/重置 token 的不可逆摘要。 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

const RESET_TTL_MS = 30 * 60_000; // 30 分钟

/** 为用户签发重置 token:作废其旧 token(防多链接并存)→ 存新 hash → 返回明文(进邮件链接)。 */
export async function issueResetToken(userId: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }] } }); // 顺手清过期+已消费,免 cron
  const raw = genResetToken();
  await prisma.passwordResetToken.deleteMany({ where: { userId, consumedAt: null } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return raw;
}

/** 消费重置 token:校验存在/未用/未过期 → 返回 userId(并标记已用);失败返回 null。 */
export async function consumeResetToken(raw: string): Promise<string | null> {
  if (!raw) return null;
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row || row.consumedAt || row.expiresAt < new Date()) return null;
  await prisma.passwordResetToken.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return row.userId;
}

const CODE_TTL_MS = 10 * 60_000; // 10 分钟
const MAX_ATTEMPTS = 5;

/** 暂存/刷新一条注册验证(一邮箱一条,upsert 覆盖),返回明文验证码(供发信)。 */
export async function issueSignupCode(input: { email: string; passwordHash: string; name: string | null; inviteRef: string | null }): Promise<string> {
  await prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: new Date() } } }); // 顺手清过期暂存,免 cron(量小低频)
  const code = genCode();
  const data = {
    passwordHash: input.passwordHash, name: input.name, inviteRef: input.inviteRef,
    codeHash: hashToken(code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MS), lastSentAt: new Date(),
  };
  await prisma.emailVerification.upsert({ where: { email: input.email }, update: data, create: { email: input.email, ...data } });
  return code;
}

/**
 * 校验注册验证码。成功返回暂存数据(并删除该暂存行);失败返回 { ok:false, error }。
 * 错码累加 attempts,达上限作废(删行,逼重发)。
 */
export async function checkSignupCode(email: string, code: string): Promise<
  | { ok: true; passwordHash: string; name: string | null; inviteRef: string | null }
  | { ok: false; error: string }
> {
  const row = await prisma.emailVerification.findUnique({ where: { email } });
  if (!row) return { ok: false, error: "请先获取验证码" };
  if (row.expiresAt < new Date()) { await prisma.emailVerification.delete({ where: { email } }); return { ok: false, error: "验证码已过期,请重新获取" }; }
  if (row.codeHash !== hashToken(code)) {
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) { await prisma.emailVerification.delete({ where: { email } }); return { ok: false, error: "验证码错误次数过多,请重新获取" }; }
    await prisma.emailVerification.update({ where: { email }, data: { attempts } });
    return { ok: false, error: "验证码不正确" };
  }
  await prisma.emailVerification.delete({ where: { email } });
  return { ok: true, passwordHash: row.passwordHash, name: row.name, inviteRef: row.inviteRef };
}

/** 重发场景取暂存行(判断是否存在 + 冷却由路由用 inCooldown)。 */
export async function getSignupPending(email: string) {
  return prisma.emailVerification.findUnique({ where: { email }, select: { passwordHash: true, name: true, inviteRef: true } });
}
