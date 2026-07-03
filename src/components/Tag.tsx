"use client";
import { classifyTier } from "@/lib/tier";
import { useT } from "@/components/LocaleProvider";

/** 掺水档标签 —— 纯文字、正常色,不加背景/语义色。score 为 null(未检测)显示「—」。 */
export function TierTag({ score }: { score: number | null }) {
  const t = useT();
  if (score === null) return <span style={{ color: "var(--ink3)" }}>—</span>;
  return <span>{t(classifyTier(score).label)}</span>;
}
