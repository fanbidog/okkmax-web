"use client";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
export interface TestEntry { at: string; channel: string; model: string; actualModel?: string | null; modelDowngraded?: boolean | null; score: number; }

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmt(at: string) { const d = new Date(at); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export function TestHistoryModal({ tests, baseUrl }: { tests: TestEntry[]; baseUrl: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <>
      <button className="th-btn" onClick={() => setOpen(true)} disabled={!tests.length}>{tr("测试历史")} <span style={{ fontSize: 11 }}>↗</span></button>
      {open && (
        <div className="th-overlay" onClick={() => setOpen(false)}>
          <div className="th-modal" onClick={(e) => e.stopPropagation()}>
            <div className="th-head">
              <span>{tr("测试历史")}</span>
              <button className="th-x" onClick={() => setOpen(false)} aria-label={tr("关闭")}>✕</button>
            </div>
            <div className="th-body">
              <table className="th-table">
                <thead><tr><td>{tr("时间")}</td><td>{tr("分组")}</td><td>{tr("请求模型")}</td><td>{tr("接口")}</td><td style={{ textAlign: "right" }}>{tr("评分")}</td></tr></thead>
                <tbody>
                  {tests.map((t, i) => {
                    return (
                      <tr key={i}>
                        <td className="th-c-time">{fmt(t.at)}</td>
                        <td><b>{t.channel}</b></td>
                        <td className="th-c-model">
                          {t.model}
                        </td>
                        <td className="th-c-ep">{host}</td>
                        <td style={{ textAlign: "right" }}><b>{t.score.toFixed(0)}</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
