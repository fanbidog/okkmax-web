"use client";
import { InfoTip } from "./InfoTip";
import { IdxPointer } from "./IdxPointer";
import { useT } from "@/components/LocaleProvider";

const GRAD = "linear-gradient(90deg,#ef4444,#eab308,#22c55e)";

/** RootData 式指数卡:大数字 + 「!」公式浮层 + 渐变标尺 + 排名。value 0-100,null 显「—」。 */
export function IndexCard({ label, value, tip, rank, leftLabel, midLabel, rightLabel, suffix }: {
  label: string; value: number | null; tip?: { desc: string; formula?: string }; rank?: number | null;
  leftLabel: string; midLabel: string; rightLabel: string; suffix?: string;
}) {
  const t = useT();
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="idxcard">
      <div className="idx-h">{label}{tip && <InfoTip {...tip} />}</div>
      <div className="idx-num">
        <span className="idx-v">{value == null ? "—" : Math.round(value)}{value != null && suffix}</span>
        <span className="idx-foot">{t("排名")} {rank != null ? `${t("第")} ${rank}` : <span className="idx-pend">—</span>}</span>
      </div>
      <div className="idx-bar" style={{ background: GRAD }}>
        {value != null && <IdxPointer pct={pct} label={`${Math.round(value)}${suffix ?? ""}`} />}
      </div>
      <div className="idx-scale"><span>{leftLabel}</span><span>{midLabel}</span><span>{rightLabel}</span></div>
    </div>
  );
}
