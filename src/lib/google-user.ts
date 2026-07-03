import { prisma } from "@/lib/prisma";
import { ensureInviteCode, applyInviteRef } from "@/lib/invite";
import type { GoogleProfile } from "@/lib/google-oauth";

/**
 * find-or-create 三级(防重复账号),只在 email_verified 通过后调用:
 * ① googleId 命中 → 老 Google 用户;② email 命中 → 关联到现有账号(补 googleId);③ 都没有 → 建新号 + 邀请码 + 邀请归因发分。
 * 返回用户 + 是否做了邀请归因(调用方据此决定清 ref cookie)。
 */
export async function resolveGoogleUser(profile: GoogleProfile, ref: string | undefined) {
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  let refApplied = false;
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          name: byEmail.name ?? profile.name,
          image: byEmail.image ?? profile.picture ?? "/avatars/default.png",
        },
      });
    } else {
      user = await prisma.user.create({
        data: { email: profile.email, googleId: profile.sub, name: profile.name, image: profile.picture ?? "/avatars/default.png" },
      });
      await ensureInviteCode(user.id);
      refApplied = await applyInviteRef(ref, user.id);
    }
  }
  return { user, refApplied };
}
