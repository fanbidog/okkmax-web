import { sha } from "./hash";

export type Locale = "zh" | "en";

/** 标量:en 有译文用译文,缺则回落中文。 */
export const pick = <T extends Record<string, any>>(row: T | null | undefined, field: string, l: Locale): any =>
  l === "en" ? (row?.[`${field}_en`] ?? row?.[field]) : row?.[field];

/** JSON 子串:按源中文的 hash 在 _en map 里查译文,缺则回落原中文。 */
export const pickJson = (enMap: Record<string, string> | null | undefined, srcText: string, l: Locale): string =>
  l === "en" ? (enMap?.[sha(srcText)] ?? srcText) : srcText;
