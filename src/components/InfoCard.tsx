"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

export interface InfoItem {
  id: string;
  logoUrl: string | null;
  initial: string;
  name: string;
  a: string;      // 右侧主值(档位 / 状态 / 延迟)
  b?: string;     // 右侧次值(日期 / 在线率%);无则省略
  href: string;
}

/** 首页三宫格通用信息卡:标题 + 查看更多,3 条/页;横向 scroll-snap 轮播(可手滑/点圆点)。 */
export function InfoCard({ title, moreHref, items, empty }: { title: string; moreHref: string; items: InfoItem[]; empty: string }) {
  const t = useT();
  const PAGE = 3;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const [cur, setCur] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setCur(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const pageItems = Array.from({ length: pages }, (_, i) => items.slice(i * PAGE, i * PAGE + PAGE));

  return (
    <div className="icard">
      <div className="ic-head"><span className="ic-t">{title}</span><Link className="ic-more" href={moreHref}>{t("查看更多")} ›</Link></div>
      {items.length ? (
        <div className="ic-track" ref={trackRef} onScroll={onScroll}>
          {pageItems.map((pg, pi) => (
            <div className="ic-page" key={pi}>
              {pg.map((it) => (
                <Link key={it.id} className="ic-row" href={it.href}>
                  {it.logoUrl ? <img className="ic-logo" src={it.logoUrl} alt="" /> : <span className="ic-logo">{it.initial.toUpperCase()}</span>}
                  <span className="ic-nm">{it.name}</span>
                  <span className="ic-r"><span className="ic-a">{t(it.a)}</span>{it.b ? <span className="ic-b">{it.b}</span> : null}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : <div className="ic-empty">{empty}</div>}
      {pages > 1 && (
        <div className="ic-dots">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} type="button" className={"ic-dot" + (i === cur ? " on" : "")} aria-label={`${t("第")} ${i + 1} ${t("页")}`} onClick={() => goTo(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
