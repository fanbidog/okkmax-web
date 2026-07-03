"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UptimeHeatmap } from "./UptimeHeatmap";
import { TierTag } from "./Tag";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

export interface StationRowData {
  id: string; slug: string; name: string; logoUrl: string | null; homepage: string | null; referralUrl?: string | null;
  rank: number; score: number | null; priceIn: number | null; priceOut: number | null;
  avail: number | null; points: unknown; isFav: boolean; loggedIn: boolean;
}

export function StationRow(p: StationRowData) {
  const t = useT();
  const router = useRouter();
  const [fav, setFav] = useState(p.isFav);
  const [busy, setBusy] = useState(false);
  async function toggleFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (!p.loggedIn) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: p.id }) });
      const d = await res.json();
      if (res.ok) { setFav(d.favorited); toast(d.favorited ? t("已收藏") : t("已取消收藏")); }
      else toast(t("操作失败,请重试"), "err");
    } catch { toast(t("操作失败,请重试"), "err"); }
    setBusy(false);
  }
  return (
    <tr className="brow" onClick={() => router.push(`/station/${p.slug}`)}>
      <td>
        <span className="rkcell">
          <button className="rkstar" aria-label={t("收藏")} title={fav ? t("已收藏") : t("收藏")} aria-pressed={fav} onClick={toggleFav} style={{ color: fav ? "#f0a020" : "var(--line2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z" /></svg>
          </button>
          <b className="rknum">{p.rank}</b>
        </span>
      </td>
      <td>
        <div className="bst">
          {p.logoUrl
            ? <img src={p.logoUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            : <div className="lg" style={{ width: 34, height: 34 }}>{p.name.slice(0, 1)}</div>}
          <span className="nm2">{p.name}</span>
        </div>
      </td>
      <td style={{ textAlign: "right" }}><span className="score">{p.score != null ? p.score.toFixed(0) : "—"}</span></td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{p.priceIn != null ? `¥${p.priceIn} / ¥${p.priceOut}` : <span style={{ color: "var(--ink3)" }}>—</span>}</td>
      <td style={{ textAlign: "right" }}><TierTag score={p.score} /></td>
      <td style={{ textAlign: "right", fontWeight: 600 }}>{p.avail != null ? `${p.avail.toFixed(0)}%` : "—"}</td>
      {/* 趋势图格子不参与整行跳转:悬浮看趋势时误点不该被带去内页 */}
      <td style={{ textAlign: "right", cursor: "default" }} onClick={(e) => e.stopPropagation()}><div style={{ display: "inline-block", width: 120 }}><UptimeHeatmap points={p.points} period="24h" height={16} /></div></td>
    </tr>
  );
}
