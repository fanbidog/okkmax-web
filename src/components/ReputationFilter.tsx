"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/Dropdown";
import { ReviewForm } from "@/components/ReviewForm";
import { useT } from "@/components/LocaleProvider";

type StationOpt = { id: string; slug: string; name: string; logoUrl: string | null };

// 评分区间(多少分-多少分),值即区间 key,page 端据此过滤站点平均分
const SCORES: [string, string][] = [
  ["all", "全部评分"],
  ["4.5", "4.5 - 5 分"],
  ["4", "4 - 4.5 分"],
  ["3", "3 - 4 分"],
  ["low", "3 分以下"],
];

export function ReputationFilter({ stations, loggedIn }: { stations: StationOpt[]; loggedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const score = sp.get("score") ?? "all";

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v && v !== "all") p.set(k, v); else p.delete(k);
    p.delete("p"); // 筛选变化回到第 1 页
    router.replace(`/reputation${p.toString() ? `?${p.toString()}` : ""}`, { scroll: false });
  };

  // 搜索 debounce:输入停 400ms 再更新 URL
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) setParam("q", q);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const SCORES_T = SCORES.map(([v, l]) => [v, t(l)] as [string, string]);

  return (
    <div className="card pad rep-filter" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 230 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15 }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("搜索站点名称")}
          style={{ width: "100%", height: 36, border: "1px solid var(--line2)", borderRadius: 10, background: "var(--bg2)", padding: "0 12px 0 34px", fontSize: 13, fontFamily: "inherit", color: "var(--ink)", outline: "none" }} />
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Dropdown label={t("评分")} value={score} options={SCORES_T} onPick={(v) => setParam("score", v)} />
        <ReviewForm stations={stations} loggedIn={loggedIn} triggerLabel={t("写评价")} />
      </div>
    </div>
  );
}
