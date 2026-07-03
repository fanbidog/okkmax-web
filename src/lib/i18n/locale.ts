import { cookies, headers } from "next/headers";
import type { Locale } from "./pick";

/**
 * 判定:① cookie 有偏好用 cookie;② 无 cookie 读 Accept-Language:中文系→zh、明确英文→en;
 * ③ 无 Accept-Language(爬虫/无头请求)→ zh(中文优先兜底,保证搜索引擎收录中文版)。
 */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("okkmax_lang")?.value;
  if (c === "zh" || c === "en") return c;
  const al = (await headers()).get("accept-language") ?? "";
  if (/\bzh\b|zh-/i.test(al)) return "zh";
  if (/\ben\b|en-/i.test(al)) return "en";
  return "zh";
}
