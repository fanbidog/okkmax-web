"use client";
import { useState } from "react";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

/** 收藏按钮:登录后切换收藏,未登录点击弹登录。 */
export function FavoriteButton({ stationId, initialFavorited, loggedIn }: { stationId: string; initialFavorited: boolean; loggedIn: boolean }) {
  const t = useT();
  const [fav, setFav] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId }) });
      const d = await res.json();
      if (res.ok) { setFav(d.favorited); toast(d.favorited ? t("已收藏") : t("已取消收藏")); }
      else toast(t("操作失败,请重试"), "err");
    } catch { toast(t("操作失败,请重试"), "err"); }
    setBusy(false);
  }

  return (
    <button className="iconbtn" onClick={toggle} title={fav ? t("已收藏") : t("收藏")} aria-label={t("收藏")} aria-pressed={fav}
      style={fav ? { color: "#f0a020", borderColor: "#f0a020" } : undefined}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z" />
      </svg>
    </button>
  );
}
