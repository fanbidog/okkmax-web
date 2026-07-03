import { prisma } from "./prisma";

/**
 * 注册邮箱白名单判定(严格 allowlist)。仅用于密码注册口(register / register verify),
 * Google 口不受此限(授权成本高、天然难批量)。
 *
 * 规则:
 * - 无任何 enabled 白名单行 → 放行(=未启用白名单,保持开放,也避免"空表锁死所有人")。
 * - 有 enabled 行 → 仅当邮箱域名命中某条才放行。
 * - domain 前缀 "*." 为后缀匹配:如 "*.edu.cn" 命中 "pku.edu.cn" 与裸 "edu.cn"。
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;

  const rows = await prisma.emailWhitelist.findMany({ where: { enabled: true }, select: { domain: true } });
  if (rows.length === 0) return true; // 空白名单 = 开放

  return rows.some((r) => {
    const d = r.domain.trim().toLowerCase();
    if (d.startsWith("*.")) {
      const suffix = d.slice(2);
      return domain === suffix || domain.endsWith("." + suffix);
    }
    return domain === d;
  });
}
