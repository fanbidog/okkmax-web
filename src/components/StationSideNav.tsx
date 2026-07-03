"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/LocaleProvider";

const ITEMS = [
  { id: "perf", label: "测评表现", d: "M3 3v18h18 M7 16v-5 M12 16V8 M17 16v-3" },
  { id: "info", label: "基本信息", d: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z M12 16v-4 M12 8h.01" },
  { id: "models", label: "模型与价格", d: "M3 4h7v7H3z M14 4h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" },
  { id: "compare", label: "综合对比", d: "M3 3v18h18 M8 17V9 M13 17V5 M18 17v-7" },
  { id: "timeline", label: "动态", d: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { id: "announce", label: "公告与接口", d: "M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z M14 8a4 4 0 0 1 0 8" },
  { id: "reviews", label: "评论", d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" },
];
/** 详情页左侧锚点导航:滚动跟随高亮(scrollspy)+ 点击即时选中并锁定到用户再次滚动。
 *  scroll offset 由 .sec-h{scroll-margin-top} 处理。底部 section 滚不到顶部触发线,故滚到底时高亮末项。
 *  hasCompare=false 时隐藏「综合对比」项(该 section 仅在有检测代表通道时渲染,避免点了跳空)。 */
export function StationSideNav({ hasCompare = true }: { hasCompare?: boolean }) {
  const tr = useT();
  const items = hasCompare ? ITEMS : ITEMS.filter((it) => it.id !== "compare");
  const LAST = items[items.length - 1].id;
  const [active, setActive] = useState(items[0].id);
  const locked = useRef(false); // 点击后锁定,避免「滚不到顶」的 section 被 spy 抢走高亮

  useEffect(() => {
    const compute = () => {
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) return LAST; // 已到底
      const line = 100; // 顶栏 + 余量
      let cur = items[0].id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) cur = it.id;
      }
      return cur;
    };
    const onScroll = () => { if (!locked.current) setActive(compute()); };
    const release = () => { locked.current = false; };
    // 初始按当前滚动位置定位(需 DOM,故在 effect 里;非渲染期 setState 安全)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(compute());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} className={active === it.id ? "on" : ""} onClick={() => { locked.current = true; setActive(it.id); }} style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}><path d={it.d} /></svg>
          {tr(it.label)}
        </a>
      ))}
    </div>
  );
}
