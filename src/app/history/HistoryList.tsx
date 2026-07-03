"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadHistory, clearHistory, patchHistory, type HistoryEntry } from "@/lib/history";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

const TONE_CLASS: Record<NonNullable<HistoryEntry["tierColor"]>, string> = {
  green: "org", amber: "amb", red: "red",
};

function fmt(at: string) {
  const d = new Date(at);
  if (isNaN(d.getTime())) return "—";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function HistoryList() {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<HistoryEntry[] | null>(null); // null=未挂载(避免水合不一致)

  // 进页面一次性刷新:把「检测中」条目查一遍,done 了回填评分(不轮询、不用手动 F5)
  useEffect(() => {
    const list = loadHistory();
    setItems(list);
    const pending = list.filter((it) => it.score == null);
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      let changed = false;
      for (const it of pending) {
        try {
          const res = await fetch(`/api/result/${it.jobId}`, { cache: "no-store" });
          const d = await res.json();
          if (d.status === "done" && d.report) {
            patchHistory(it.jobId, {
              score: Math.round(d.report.total_score ?? 0),
              tierColor: d.tier?.color,
              stationName: d.station?.name,
              stationLogo: d.station?.logoUrl ?? null,
            });
            changed = true;
          }
        } catch { /* ignore */ }
      }
      if (!cancelled && changed) setItems(loadHistory());
    })();
    return () => { cancelled = true; };
  }, []);

  function onClear() {
    if (!items || items.length === 0) return;
    if (!window.confirm(t("确定清空本机检测历史?清空后不可恢复。"))) return;
    clearHistory();
    setItems([]);
    toast(t("已清空检测历史"));
  }

  return (
    <div className="hist-pg">
      <div className="hp-wrap">
        <h1 className="hp-title">{t("最近检测历史")}</h1>
        <p className="hp-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          {t("检测历史仅保存在此浏览器,不上传服务器;清缓存或换设备会清空。")}
        </p>

        <div className="hp-panel">
          <div className="hp-head">
            <span className="t">{t("最近历史")}</span>
            <button className="clr" type="button" onClick={onClear}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
              {t("清除缓存")}
            </button>
          </div>
          <div className="hp-scroll">
          <table className="hp-table">
            <thead><tr>
              <td>{t("站点")}</td><td>{t("评分")}</td><td>{t("模型")}</td><td className="c-ep">{t("接口")}</td><td>{t("时间")}</td><td className="c-go">{t("详情")}</td>
            </tr></thead>
            <tbody>
              {!items || items.length === 0 ? (
                <tr className="hp-none-row"><td colSpan={6} className="hp-none">{t("暂时没有数据")}</td></tr>
              ) : (
                items.map((it) => {
                  const tc = it.tierColor ? TONE_CLASS[it.tierColor] : "";
                  const initial = (it.stationName ?? it.host ?? "?").slice(0, 1).toUpperCase();
                  return (
                    <tr key={it.jobId} onClick={() => router.push(`/r/${it.jobId}`)}>
                      <td>
                        <span className="col-site">
                          <span className="lg">{it.stationLogo ? <img src={it.stationLogo} alt="" /> : initial}</span>
                          <b>{it.stationName ?? it.host}</b>
                        </span>
                      </td>
                      <td>{it.score == null ? <span className="pend">{t("检测中")}</span> : <span className={`score ${tc}`}>{it.score}</span>}</td>
                      <td className="c-model">{it.model}</td>
                      <td className="c-ep">{it.host}</td>
                      <td className="c-time">{fmt(it.at)}</td>
                      <td className="c-go"><span className="go-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
