import en from "./messages/en.json";
import type { Locale } from "./pick";

const DICT = en as Record<string, string>;

/**
 * UI 固定文案翻译。key 即中文原文(字典 messages/en.json = { 中文: English })。
 * - locale 'en':查字典,缺则回落中文(EN 下仍显中文 = 漏翻,一眼可见)。
 * - locale 'zh':永远返回原中文。
 */
export function t(zh: string, locale: Locale): string {
  return locale === "en" ? (DICT[zh] ?? zh) : zh;
}
