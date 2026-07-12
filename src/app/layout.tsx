import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./relay-theme.css";
import "./home.css";
import "./list.css";
import "./free.css";
import "./points.css";
import "./submit.css";
import "./invite.css";
import "./auth.css";
import "./detail.css";
import "./iq.css";
import "./footer.css";
import { Footer } from "@/components/Footer";
import { ToastHost } from "@/components/Toast";
import { InviteModal } from "@/components/InviteModal";
import { LocaleProvider } from "@/components/LocaleProvider";
import { CookieNotice } from "@/components/CookieNotice";
import { getLocale } from "@/lib/i18n/locale";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

// 本地字体(不依赖 Google Fonts,避免上线服务器连不上 gstatic 导致 build 失败)。
// 仅品牌字标 OkkMax 用 Orbitron;latin 子集 woff2 仅 6KB。Fraunces 原来没用到,已移除。
const orbitron = localFont({ src: "./fonts/orbitron-900.woff2", weight: "900", variable: "--font-orbitron", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OkkMax — 发现好用的 AI 中转站:纯度、可用性、价格实测",
    template: "%s | OkkMax",
  },
  description: "帮你发现好用的 AI 中转站:纯度、可用性、价格全自动探针实测,客观可复现,附真实用户口碑评价。",
  applicationName: SITE_NAME,
  keywords: ["AI 中转站", "中转站测评", "中转站排行", "中转站推荐", "Claude 中转", "Claude API 中转", "Claude Code 中转", "GPT 中转", "API 中转站", "纯度检测"],
  openGraph: { type: "website", siteName: SITE_NAME, url: SITE_URL, locale: "zh_CN", title: "OkkMax — 发现好用的 AI 中转站", description: "纯度、可用性、价格全自动探针实测,客观可复现,附真实用户口碑评价。" },
  alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: "OkkMax 站点动态" }] } },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale === "en" ? "en" : "zh-CN"} suppressHydrationWarning className={`h-full antialiased ${orbitron.variable}`}>
      <body className="min-h-full flex flex-col">
        {/* paint 前定主题,防刷新白闪。three modes: light / dark / system(默认) */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('okkmax-theme')||'system';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='system'}})()` }} />
        {/* 站点级结构化数据:Organization + WebSite(不含 SearchAction,无文本搜索结果页) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
          { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL, description: "独立第三方 AI API 中转站测评平台:纯度、可用性、价格全自动探针实测。" },
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        ]) }} />
        <LocaleProvider locale={locale}>
          <div style={{ minHeight: "100vh" }}>{children}</div>
          <Footer />
          <ToastHost />
          <InviteModal />
          <CookieNotice />
        </LocaleProvider>
      </body>
    </html>
  );
}
