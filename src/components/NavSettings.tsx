"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNavMenu } from "@/lib/useNavMenu";
import { useT } from "@/components/LocaleProvider";

// 设置下拉:语言(暂仅简体中文)+ 主题(浅色 / 深色 / 跟随系统,写 localStorage 并设 documentElement.dataset.theme)。
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px" };
const label: React.CSSProperties = { fontSize: 14, color: "var(--ink)", fontWeight: 500 };

const TI = (children: React.ReactNode) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const SUN = TI(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>);
const MOON = TI(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);
const SYS = TI(<><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8.5 21h7M12 17v4" /></>);

type Theme = "light" | "dark" | "system";
const THEMES: { v: Theme; label: string; icon: React.ReactNode }[] = [
  { v: "light", label: "浅色", icon: SUN },
  { v: "dark", label: "深色", icon: MOON },
  { v: "system", label: "系统", icon: SYS },
];

type Lang = "zh" | "en";
const LANGS: { v: Lang; label: string }[] = [
  { v: "zh", label: "中文" },
  { v: "en", label: "EN" },
];

export function NavSettings() {
  const router = useRouter();
  const [open, setOpen] = useNavMenu("settings");
  const [theme, setTheme] = useState<Theme>("system");
  const [lang, setLang] = useState<Lang>("zh");
  const t = useT();

  useEffect(() => {
    const t = (localStorage.getItem("okkmax-theme") as Theme) || "system";
    setTheme(t);
    const m = document.cookie.match(/(?:^|;\s*)okkmax_lang=([^;]+)/);
    if (m && (m[1] === "zh" || m[1] === "en")) setLang(m[1] as Lang);
  }, []);
  const applyTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("okkmax-theme", t);
    document.documentElement.dataset.theme = t;
  };
  const applyLang = (v: Lang) => {
    setLang(v);
    document.cookie = "okkmax_lang=" + v + "; path=/; max-age=" + 60 * 60 * 24 * 365;
    router.refresh();
  };

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="nav-icon" aria-label={t("设置")} aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><circle cx="12" cy="12" r="2.6" /></svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1000 }} />
          <div className="nav-settings-pop" style={{ width: 236, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--sh-float)", padding: 7, zIndex: 1001 }}>
            <div style={row}>
              <span style={label}>语言</span>
              <div style={{ display: "inline-flex", background: "var(--bg2)", borderRadius: 9, padding: 3 }}>
                {LANGS.map((l) => (
                  <button key={l.v} type="button" onClick={() => applyLang(l.v)} style={{ border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, padding: "5px 11px", borderRadius: 7, background: lang === l.v ? "var(--surface)" : "transparent", color: lang === l.v ? "var(--ink)" : "var(--ink3)", boxShadow: lang === l.v ? "var(--sh-sm)" : "none", transition: ".15s" }}>{l.label}</button>
                ))}
              </div>
            </div>
            <div style={row}>
              <span style={label}>{t("主题")}</span>
              <div style={{ display: "inline-flex", background: "var(--bg2)", borderRadius: 9, padding: 3 }}>
                {THEMES.map((th) => (
                  <button key={th.v} type="button" onClick={() => applyTheme(th.v)} aria-label={t(th.label)} title={t(th.label)} style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", padding: "6px 9px", borderRadius: 7, background: theme === th.v ? "var(--surface)" : "transparent", color: theme === th.v ? "var(--ink)" : "var(--ink3)", boxShadow: theme === th.v ? "var(--sh-sm)" : "none", transition: ".15s" }}>{th.icon}</button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
