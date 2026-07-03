import { prisma } from "./prisma";

/**
 * 滑动窗口计数限流。bucket 唯一标识「动作+主体」(如 "verify:email:a@b" / "reset:ip:1.2.3.4")。
 * 命中上限返回 false(不记一次);未超返回 true 并记一次。login 暴破、detect 刷量可直接复用。
 */
export async function rateLimit(bucket: string, windowSec: number, max: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSec * 1000);
  const count = await prisma.rateLimitHit.count({ where: { bucket, createdAt: { gte: since } } });
  if (count >= max) return false;
  await prisma.rateLimitHit.create({ data: { bucket } });
  return true;
}

/** 冷却:距上次命中是否不足 minIntervalSec。true=仍在冷却(应拒)。不记新命中。 */
export async function inCooldown(bucket: string, minIntervalSec: number): Promise<boolean> {
  const since = new Date(Date.now() - minIntervalSec * 1000);
  const recent = await prisma.rateLimitHit.findFirst({ where: { bucket, createdAt: { gte: since } }, select: { id: true } });
  return !!recent;
}

/** 客户端 IP(反代下取 x-forwarded-for 首段)。 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
