"use client";
import type { TierInfo } from "@/lib/tier";
import { useT } from "@/components/LocaleProvider";

/** 掺水档结论块(报告页)—— 中性卡片,不加语义色。 */
export function TierBadge({ tier }: { tier: TierInfo }) {
  const t = useT();
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", padding: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.01em" }}>{t(tier.label)}</div>
      <div style={{ fontSize: 13, marginTop: 5, color: "var(--ink2)" }}>{t(tier.sub)}</div>
    </div>
  );
}
