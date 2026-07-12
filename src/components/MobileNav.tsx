"use client";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useNavDrawer } from "./NavShell";
import { useT } from "@/components/LocaleProvider";

type NavLink = { label: string; href: string; key: string; ready: boolean; isNew?: boolean };

/** 手机端汉堡菜单(<768px):开合状态由 NavShell 的 context 提供,顶栏 class 同步切换,无闪烁。 */
export function MobileNav({ links, active }: { links: NavLink[]; active?: string }) {
  const { open, setOpen } = useNavDrawer();
  const t = useT();
  return (
    <>
      <button type="button" className="nav-burger" aria-label={t("菜单")} aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
        </svg>
      </button>
      {open && (
        <>
          {/* 遮罩 portal 到 body:作为 .nav 子元素会盖在顶栏之上。透明,仅作点击关闭层 */}
          {typeof document !== "undefined" && createPortal(
            <div className="nav-burger-ov" onClick={() => setOpen(false)} />, document.body)}
          <div className="nav-drawer">
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={"nav-drawer-link" + (active === l.key ? " on" : "")}
                onClick={() => setOpen(false)}
                style={l.ready ? undefined : { color: "var(--ink3)", pointerEvents: "none" }}
              >{t(l.label)}{l.isNew && <span className="nav-new">NEW</span>}</Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
