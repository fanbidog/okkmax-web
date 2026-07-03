"use client";
import { createContext, useContext } from "react";
import { t as tBase } from "@/lib/i18n/ui";
import type { Locale } from "@/lib/i18n/pick";

const Ctx = createContext<Locale>("zh");

/** 根布局注入(server 算好 locale 传进来),client 组件靠它拿 locale。切语言时 layout 重渲染→provider 更新。 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx);
}

/** client 组件用:const t = useT(); t("首页") */
export function useT(): (zh: string) => string {
  const locale = useContext(Ctx);
  return (zh: string) => tBase(zh, locale);
}
