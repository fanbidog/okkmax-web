import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import { AuthModal } from "@/components/AuthModal";
import { UserMenu } from "@/components/UserMenu";
import { SearchBox } from "@/components/SearchBox";
import { NavShell } from "@/components/NavShell";
import { NavSettings } from "@/components/NavSettings";
import { MobileNav } from "@/components/MobileNav";
import { BetaBanner } from "@/components/BetaBanner";

const LINKS: { label: string; href: string; key: string; ready: boolean; isNew?: boolean }[] = [
  { label: "首页", href: "/", key: "home", ready: true },
  { label: "站点", href: "/list", key: "list", ready: true },
  { label: "可用性", href: "/availability", key: "availability", ready: true },
  { label: "口碑", href: "/reputation", key: "reputation", ready: true },
  { label: "工具", href: "/tools/iq", key: "tools", ready: true, isNew: true },
  { label: "活动", href: "/activity", key: "activity", ready: true },
];

export async function SiteNav({ active }: { active?: string }) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  return (
    <>
    <BetaBanner />
    <NavShell>
        <Link href="/" className="brand" aria-label="OkkMax">OkkMa<span className="x">x</span></Link>
        <div className="navlinks">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={active === l.key ? "on" : ""}
              style={l.ready ? undefined : { color: "var(--ink3)", cursor: "default" }}
              title={l.ready ? undefined : t("建设中", locale)}
            >{t(l.label, locale)}{l.isNew && <span className="nav-new">NEW</span>}</Link>
          ))}
        </div>
        <div className="navactions">
          {/* 积分入口:引导用户去 /points 登录赚积分。放搜索左边(夹在图标中间难看)。 */}
          <Link href="/points" className="nav-points" aria-label={t("赚积分", locale)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>
            <span>{t("赚积分", locale)}</span>
          </Link>
          <SearchBox />
          <NavSettings />
          <MobileNav links={LINKS} active={active} />
          {user ? (
            <UserMenu name={user.name || user.email.split("@")[0]} image={user.image} email={user.email} />
          ) : (
            <AuthModal />
          )}
        </div>
    </NavShell>
    </>
  );
}
