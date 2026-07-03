import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

type Col = { h: string; links: { label: string; href?: string }[] };

const COLS: Col[] = [
  {
    h: "导航",
    links: [
      { label: "首页", href: "/" },
      { label: "站点排行", href: "/list" },
      { label: "可用性", href: "/availability" },
      { label: "口碑", href: "/reputation" },
    ],
  },
  {
    h: "了解",
    links: [
      { label: "评测方法", href: "/help" },
      { label: "评分说明", href: "/help#scoring" },
      { label: "关于我们", href: "/about" },
      { label: "联系我们", href: "/about#contact" },
    ],
  },
  {
    h: "法律",
    links: [{ label: "隐私政策", href: "/privacy" }, { label: "服务条款", href: "/terms" }, { label: "免责声明", href: "/disclaimer" }],
  },
];

export async function Footer() {
  const locale = await getLocale();
  return (
    <footer className="site-footer">
      <div className="f-wrap">
        <div className="f-top">
          <div className="f-brand">
            <Link href="/" className="f-logo" aria-label="OkkMax">OkkMa<span className="x">x</span></Link>
            <div className="f-social">
              <span className="f-soc" aria-label="X"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7 8 8.2 12h-6.6l-5.2-7.6L4.4 22H1.3l7.5-8.6L1 2h6.7l4.7 7zm-1.1 18h1.7L7.3 3.8H5.4z" /></svg></span>
              <span className="f-soc" aria-label="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2 0 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" /></svg></span>
              <span className="f-soc" aria-label={t("邮箱", locale)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg></span>
            </div>
            <p className="f-copy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9.5" /><path d="M14.8 9.3a3.5 3.5 0 1 0 0 5.4" /></svg>
              2026 OkkMax. {t("保留所有权利。", locale)}
            </p>
          </div>
          <div className="f-cols">
            {COLS.map((c) => (
              <div className="f-col" key={c.h}>
                <h4>{t(c.h, locale)}</h4>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.href
                        ? <Link href={l.href}>{t(l.label, locale)}</Link>
                        : <span className="f-soon" title={t("建设中", locale)}>{t(l.label, locale)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
