// SEO 站点常量。未部署前默认 www.okkmax.com;上线可用 NEXT_PUBLIC_SITE_URL 覆盖。
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.okkmax.com").replace(/\/$/, "");
export const SITE_NAME = "OkkMax";

/** 拼绝对 URL(sitemap / canonical / og 用)。 */
export function absUrl(path: string): string {
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}
