"use client";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";

const I = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** 线路 url 后的操作:复制 / 测速(tcptest) / 打开。 */
export function RouteActions({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
  };
  return (
    <span style={{ display: "inline-flex", gap: 2, marginLeft: 10, verticalAlign: "middle" }}>
      <button className="ract" onClick={copy} title={copied ? t("已复制") : t("复制")} aria-label={t("复制")}>
        {copied
          ? <svg {...I} stroke="#16a34a"><path d="M20 6L9 17l-5-5" /></svg>
          : <svg {...I}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
      </button>
      <a className="ract" href={`https://www.tcptest.cn/http/${host(url)}`} target="_blank" rel="noopener" title={t("测速")} aria-label={t("测速")}>
        <svg {...I}><path d="M3.5 14a8.5 8.5 0 1 1 17 0" /><path d="M12 14l3.5-3.5" /></svg>
      </a>
      <a className="ract" href={url} target="_blank" rel="noopener" title={t("打开")} aria-label={t("打开")}>
        <svg {...I}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
      </a>
    </span>
  );
}
