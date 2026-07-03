/** 可被人工维护、需防自动覆盖的站点门面字段。
 *  审核员在后台改过其中某项后,该字段名会写入 Station.lockedFields,
 *  自动入库(ingest 等)更新时跳过这些字段,直到人工解锁(从名单移除)。
 *  注意:groups / 价格 / 公告(announcements) / detection / uptime 是机器客观数据,不在此列,始终自动覆盖。
 *  socials / routes / baseUrl 机器先抓、但允许人工补改(改即锁,见上),故已纳入本名单。 */
export const LOCKABLE_STATION_FIELDS = ["name", "description", "logoUrl", "homepage", "docsUrl", "category", "baseUrl", "socials", "routes"] as const;
export type LockableField = (typeof LOCKABLE_STATION_FIELDS)[number];

/** 从候选更新数据里剔除已锁字段,返回新对象(不改原对象)。 */
export function stripLocked<T extends Record<string, unknown>>(data: T, locked: readonly string[] | null | undefined): Partial<T> {
  if (!locked?.length) return data;
  const set = new Set(locked);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(data)) if (!set.has(k)) out[k] = data[k];
  return out as Partial<T>;
}
