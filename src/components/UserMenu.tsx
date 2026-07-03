"use client";
import { useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { useNavMenu } from "@/lib/useNavMenu";
import { useT } from "@/components/LocaleProvider";

function Ico({ children }: { children: ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const SETTINGS = <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>;
const STAR = <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />;
const AWARD = <><circle cx="12" cy="8" r="6" /><path d="M15.5 13 17 22l-5-3-5 3 1.5-9" /></>;
const PLUS = <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>;
const INBOX = <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z" /></>;
const LOGOUT = <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>;

const GIFT = <><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 12h18M12 8v13" /><path d="M12 8S10.5 3.5 8 4.2C6 4.8 6.4 8 9 8z" /><path d="M12 8s1.5-4.5 4-3.8C18 4.8 17.6 8 15 8z" /></>;

type MenuItem = { label: string; icon: ReactNode; href?: string; invite?: boolean; badge?: string };
const ITEMS: MenuItem[] = [
  { label: "账户设置", href: "/me", icon: SETTINGS },
  { label: "我的积分", href: "/points", icon: AWARD },
  { label: "邀请好友", invite: true, icon: GIFT, badge: "送积分" },
  { label: "我的收藏", href: "/favorites", icon: STAR },
  { label: "提交收录", href: "/submit", icon: PLUS },
  { label: "我的提交", href: "/me/submissions", icon: INBOX },
];

export function UserMenu({ name, image, email }: { name: string; image: string | null; email: string }) {
  const [open, setOpen] = useNavMenu("user");
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="nav-acct" style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} className={open ? "umenu-trigger on" : "umenu-trigger"}>
        <Avatar name={name} image={image} size={30} />
        <span className="umenu-name" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink2)" }}>{name}</span>
        <svg className="umenu-caret" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="umenu-pop" style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", width: 268, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "0 20px 48px -16px rgba(20,12,8,.28)", overflow: "hidden", zIndex: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px" }}>
            <Avatar name={name} image={image} size={42} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
            </div>
          </div>
          <div style={{ padding: 6, borderTop: "1px solid var(--line)" }}>
            {ITEMS.map((it) => it.invite ? (
              <button key="invite" type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("open-invite")); }} className="umenu-item" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                <Ico>{it.icon}</Ico>{t(it.label)}
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, background: "var(--accent-50)", color: "var(--accent-d)", padding: "2px 8px", borderRadius: 6 }}>{t(it.badge!)}</span>
              </button>
            ) : (
              <Link key={it.href} href={it.href!} onClick={() => setOpen(false)} className="umenu-item"><Ico>{it.icon}</Ico>{t(it.label)}</Link>
            ))}
          </div>
          <div style={{ padding: 6, borderTop: "1px solid var(--line)" }}>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="umenu-item danger" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}><Ico>{LOGOUT}</Ico>{t("退出登录")}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
