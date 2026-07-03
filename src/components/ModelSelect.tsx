"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function ModelSelect({ models, value }: { models: string[]; value: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <select
      value={value}
      onChange={(e) => { const p = new URLSearchParams(sp.toString()); p.set("m", e.target.value); router.push(`?${p.toString()}`); }}
      style={{ fontSize: 13, fontWeight: 600, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line2)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}
    >
      {models.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  );
}
