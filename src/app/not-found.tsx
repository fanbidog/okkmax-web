import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export default async function NotFound() {
  const locale = await getLocale();
  return (
    <>
      <SiteNav />
      <div style={{ maxWidth: 480, margin: "96px auto", textAlign: "center", padding: "0 20px" }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>404</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginTop: 8 }}>{t("页面不存在", locale)}</div>
        <div style={{ fontSize: 14, color: "var(--ink3)", marginTop: 10, lineHeight: 1.6 }}>{t("你访问的页面可能已移除,或链接有误。", locale)}</div>
        <Link href="/" style={{ display: "inline-block", marginTop: 24, height: 44, lineHeight: "44px", padding: "0 24px", background: "var(--accent)", color: "#fff", borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none" }}>{t("返回首页", locale)}</Link>
      </div>
    </>
  );
}
