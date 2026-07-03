"use client";
import { useEffect, useRef, useState } from "react";
import { cleanAnnouncement } from "@/lib/announcement";
import { useT } from "@/components/LocaleProvider";

interface Ann { id?: string | number; title?: string; content?: string; date?: string }

const pad = (n: number) => String(n).padStart(2, "0");
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function titleOf(a: Ann, text: string, fallback: string) {
  const title = (a.title || "").trim();
  if (title && title.toLowerCase() !== "announcement") return title;
  const first = text.split("\n").map((x) => x.trim()).filter(Boolean)[0] || fallback;
  return first.slice(0, 30);
}

const chev = (rot: boolean) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rot ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
);

/** 站点公告:收起态固定矮、不滚、底部淡出;「查看更多消息」展开为固定高可滚框。逐条正文夹 3 行 + 展开阅读全文。 */
export function AnnouncementList({ announcements }: { announcements: Ann[] }) {
  const t = useT();
  const items = announcements.map((a) => ({ ...a, text: cleanAnnouncement(a.content || "") }));
  const [boxOpen, setBoxOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [overflow, setOverflow] = useState<Record<number, boolean>>({});
  const [showMore, setShowMore] = useState(false);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o: Record<number, boolean> = {};
    bodyRefs.current.forEach((el, i) => { if (el) o[i] = el.scrollHeight > el.clientHeight + 2; });
    setOverflow(o);
    if (boxRef.current) setShowMore(boxRef.current.scrollHeight > 344);
  }, [boxOpen, announcements]);

  if (!items.length) {
    return (
      <>
        <div className="anh"><h3>{t("站点公告")}</h3></div>
        <div style={{ color: "var(--ink3)", fontSize: 13, borderTop: ".5px solid var(--line)", paddingTop: 14 }}>{t("暂无公告")}</div>
      </>
    );
  }

  const toggleItem = (i: number) => setExpanded((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <>
      <div className="anh"><h3>{t("站点公告")}</h3><span className="s">{t("共")} {items.length} {t("条")}</span></div>
      <div ref={boxRef} className={"annbox" + (boxOpen ? " open" : "")}>
        {items.map((a, i) => {
          const isExp = expanded.has(i);
          return (
            <div className="ann" key={a.id ?? i}>
              <div className="ann-t">{titleOf(a, a.text, t("公告"))}</div>
              <div ref={(el) => { bodyRefs.current[i] = el; }} className={"ann-body" + (isExp ? "" : " clamp")}>{a.text}</div>
              {(overflow[i] || isExp) && (
                <button type="button" className="ann-exp" onClick={() => toggleItem(i)}>{isExp ? t("收起") : t("展开阅读全文")}{chev(isExp)}</button>
              )}
              <div className="ann-d">{fmtDate(a.date)}</div>
            </div>
          );
        })}
      </div>
      {showMore && (
        <button type="button" className="ann-more" onClick={() => setBoxOpen((v) => !v)}>{boxOpen ? t("收起") : t("查看更多消息")}{chev(boxOpen)}</button>
      )}
    </>
  );
}
