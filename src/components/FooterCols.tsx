"use client";
import { useState } from "react";
import Link from "next/link";

// footer 链接栏目:桌面四列网格(样式全在 footer.css,与原服务端渲染一致);
// M 端(≤760px)变手风琴——每组一行标题+箭头,点开展开,默认全部收起(Apple 移动端 footer 同款)。
// 文案由服务端 Footer 翻译好传入,本组件不碰 i18n。
export function FooterCols({ cols }: { cols: { h: string; links: { label: string; href?: string; soonHint?: string }[] }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="f-cols">
      {cols.map((c) => (
        <div className={`f-col${open === c.h ? " on" : ""}`} key={c.h}>
          <h4 onClick={() => setOpen((o) => (o === c.h ? null : c.h))}>
            {c.h}
            <svg className="f-cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
          </h4>
          <ul>
            {c.links.map((l) => (
              <li key={l.label}>
                {l.href
                  ? <Link href={l.href}>{l.label}</Link>
                  : <span className="f-soon" title={l.soonHint}>{l.label}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
