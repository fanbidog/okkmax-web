import Link from "next/link";
import { Avatar } from "./Avatar";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export interface HomeReviewItem {
  id: string;
  body: string;
  rating: number;
  pros: string[];
  cons: string[];
  userName: string;
  userImage: string | null;
  stationSlug: string;
  stationName: string;
  stationLogo: string | null;
}

function Thumb({ down }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ transform: down ? "rotate(180deg)" : undefined }}>
      <path d="M2 21h2.5V10H2v11zM23 12a2 2 0 0 0-2-2h-6.31l.95-4.57.03-.32a1.5 1.5 0 0 0-.44-1.06L14.17 3 7.6 9.59A2 2 0 0 0 7 11v8a2 2 0 0 0 2 2h9a2 2 0 0 0 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" />
    </svg>
  );
}

/** 首页「口碑精选」:几条真实用户评价(引言式),卡底左用户右站点。整卡点进该站评价区。 */
export async function HomeReviews({ items }: { items: HomeReviewItem[] }) {
  if (!items.length) return null;
  const locale = await getLocale();
  return (
    <section className="home-sec">
      <div className="hs-head"><span className="hs-t">{t("口碑精选", locale)}</span><Link className="hs-more" href="/reputation">{t("查看更多", locale)} ›</Link></div>
      <div className="ic-grid">
        {items.map((r) => (
          <Link key={r.id} href={`/station/${r.stationSlug}#reviews`} className="hrev">
            <span className="qm">&ldquo;</span>
            <div className="body">{r.body}</div>
            {(r.pros.length || r.cons.length) ? (
              <div className="tags">
                {r.pros.map((tag) => <span key={"p" + tag} className="pill p"><Thumb />{t(tag, locale)}</span>)}
                {r.cons.map((tag) => <span key={"c" + tag} className="pill c"><Thumb down />{t(tag, locale)}</span>)}
              </div>
            ) : null}
            <div className="foot">
              <Avatar name={r.userName} image={r.userImage} size={32} />
              <div className="uinfo">
                <div className="nm">{r.userName}</div>
                <span className="stars">{"★".repeat(r.rating)}<span className="off">{"★".repeat(5 - r.rating)}</span></span>
              </div>
              <div className="station">
                {r.stationLogo ? <img className="slogo" src={r.stationLogo} alt="" /> : <span className="slogo">{r.stationName.slice(0, 1)}</span>}
                <span className="sname">{r.stationName}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
