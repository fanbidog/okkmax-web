import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import type { Locale } from "@/lib/i18n/pick";

export interface HomePromoItem {
  id: string;
  kind: "free" | "perk";
  logoUrl: string | null;
  initial: string;
  title: string;
  sub: string;
  desc: string;
  meta: string[];
  href: string;
}

function PromoCard(p: HomePromoItem & { locale: Locale }) {
  const external = p.href.startsWith("http");
  return (
    <div className="hpr">
      <span className={"badge " + p.kind}>{p.kind === "free" ? t("免费 API", p.locale) : t("中转站福利", p.locale)}</span>
      <div className="top">
        {p.logoUrl ? <img className="logo" src={p.logoUrl} alt="" /> : <span className="logo">{p.initial}</span>}
        <div style={{ minWidth: 0 }}>
          <div className="nm">{p.title}</div>
          {p.sub && <div className="prov">{p.sub}</div>}
        </div>
      </div>
      <div className="desc">{p.desc}</div>
      {p.meta.length ? <div className="meta">{p.meta.map((m, i) => <span key={i} className="mchip">{t(m, p.locale)}</span>)}</div> : null}
      <a className="go" href={p.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{t("立即前往", p.locale)}</a>
    </div>
  );
}

/** 首页「福利活动」:免费 API + 中转站福利混排,单行 3 张(无框)。 */
export async function HomePromos({ items }: { items: HomePromoItem[] }) {
  if (!items.length) return null;
  const locale = await getLocale();
  return (
    <section className="home-sec">
      <div className="hs-head"><span className="hs-t">{t("福利活动", locale)}</span><Link className="hs-more" href="/activity">{t("查看更多", locale)} ›</Link></div>
      <div className="ic-grid">{items.map((p) => <PromoCard key={p.id} {...p} locale={locale} />)}</div>
    </section>
  );
}
