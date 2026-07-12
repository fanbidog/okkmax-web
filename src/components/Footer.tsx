import Link from "next/link";
import { FooterCols } from "@/components/FooterCols";
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
      { label: "模型智商", href: "/tools/iq" },
      { label: "活动", href: "/activity" },
    ],
  },
  {
    h: "参与",
    links: [
      { label: "提交收录", href: "/submit" },
      { label: "检测历史", href: "/history" },
      { label: "赚积分", href: "/points" },
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
              <a className="f-soc" aria-label="GitHub" href="https://github.com/fanbidog/okkmax-web" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2 0 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" /></svg></a>
              <a className="f-soc" aria-label="Telegram" href="https://t.me/okkmax_inf" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg></a>
              <a className="f-soc" aria-label={t("邮箱", locale)} href="mailto:hello@okkmax.com"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg></a>
              <a className="f-soc" aria-label="RSS" href="/feed.xml"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415c1.814 0 3.293 1.479 3.293 3.295 0 1.813-1.485 3.29-3.301 3.29C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" /></svg></a>
            </div>
            <p className="f-copy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9.5" /><path d="M14.8 9.3a3.5 3.5 0 1 0 0 5.4" /></svg>
              2026 OkkMax. {t("保留所有权利。", locale)}
            </p>
          </div>
          <FooterCols cols={COLS.map((c) => ({
            h: t(c.h, locale),
            links: c.links.map((l) => ({ label: t(l.label, locale), href: l.href, soonHint: t("建设中", locale) })),
          }))} />
        </div>
      </div>
    </footer>
  );
}
