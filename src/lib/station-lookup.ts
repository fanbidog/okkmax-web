import { prisma } from "@/lib/prisma";

/** 取域名(去协议/www/末尾斜杠,小写),用于把检测目标匹配到已收录站点。 */
export function hostOf(u?: string | null): string {
  if (!u) return "";
  try {
    return new URL(u).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
}

export interface StationLite {
  slug: string;
  name: string;
  logoUrl: string | null;
}

/** 按 base_url 域名查是否已收录站点 —— 决定结果页/海报用真名/真 logo + 收录条是否成立。 */
export async function lookupStation(baseUrl?: string | null): Promise<StationLite | null> {
  const h = hostOf(baseUrl);
  if (!h) return null;
  try {
    const all = await prisma.station.findMany({
      select: { slug: true, name: true, logoUrl: true, baseUrl: true },
    });
    const m = all.find((s) => hostOf(s.baseUrl) === h);
    return m ? { slug: m.slug, name: m.name, logoUrl: m.logoUrl } : null;
  } catch {
    return null; // 查库失败不应拖垮页面
  }
}

/** 把 logo 取成 data URI(服务端拉取)。海报用客户端 html-to-image 截图,跨域图片会污染 canvas,
 *  改用同源 data URI 规避;.ico 浏览器能正常解码渲染。失败 → null(留空,不用字母)。 */
export async function logoDataUri(url: string | null | undefined, origin: string): Promise<string | null> {
  if (!url) return null;
  const abs = url.startsWith("http") ? url : origin + (url.startsWith("/") ? url : "/" + url);
  try {
    const res = await fetch(abs);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/png";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}
