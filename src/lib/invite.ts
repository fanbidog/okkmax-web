import { prisma } from "@/lib/prisma";
import { awardPoints, beijingDayStart } from "@/lib/points";

// 邀请来源 cookie(/invite/[code] 落地页写,注册/首次 Google 登录读)。
export const REF_COOKIE = "okmax_ref";

// 每邀请人每日「邀请好友」发分上限,防小号刷邀请分(撤 Turnstile 后的反批量注册防线之一)。
const DAILY_INVITE_CAP = 10;

// 邀请码字母表:去掉易混的 0/O/1/I。
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function genInviteCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** 确保用户有邀请码,没有就生成一个唯一的并写库(老用户首次打开邀请用)。 */
export async function ensureInviteCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { inviteCode: true } });
  if (u?.inviteCode) return u.inviteCode;
  for (let i = 0; i < 8; i++) {
    const code = genInviteCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { inviteCode: code } });
      return code;
    } catch {
      // P2002 唯一冲突 → 换一个重试
    }
  }
  throw new Error("invite code generation failed");
}

/**
 * 新用户(注册 / 首次 Google 登录)按 ref 邀请码归因发分:新人 +10;邀请人 +20 受每日上限约束。
 * 只在「确实新建了账号」时调用。返回是否成功归因(调用方据此决定要不要清 ref cookie)。
 * 归因(invitedById)始终记;仅邀请人当日发分次数达 DAILY_INVITE_CAP 时不再给 +20。
 */
export async function applyInviteRef(ref: string | undefined, newUserId: string): Promise<boolean> {
  if (!ref) return false;
  const inviter = await prisma.user.findUnique({ where: { inviteCode: ref }, select: { id: true, status: true } });
  if (!inviter || inviter.id === newUserId || inviter.status !== "active") return false;
  await prisma.user.update({ where: { id: newUserId }, data: { invitedById: inviter.id } });
  await awardPoints(newUserId, 10, "新人见面礼");
  const todayInvites = await prisma.pointsLog.count({ where: { userId: inviter.id, reason: "邀请好友", createdAt: { gte: beijingDayStart() } } });
  if (todayInvites < DAILY_INVITE_CAP) await awardPoints(inviter.id, 20, "邀请好友");
  return true;
}
