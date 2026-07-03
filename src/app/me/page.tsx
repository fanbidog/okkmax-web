import { LockedPage } from "@/components/LockedPage";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { AccountSettings } from "@/components/AccountSettings";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await getCurrentUser();
  const locale = await getLocale();
  if (!me) return (<><SiteNav /><LockedPage title={t("账户设置", locale)} /></>);
  const full = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true, name: true, image: true, bio: true } });
  return (
    <>
      <SiteNav />
      <div className="wrap" style={{ paddingTop: 44, paddingBottom: 80 }}>
        <AccountSettings user={{ email: full!.email, name: full!.name ?? "", image: full!.image ?? null, bio: full!.bio ?? "" }} />
      </div>
    </>
  );
}
