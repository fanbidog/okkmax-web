"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

const DISMISS_KEY = "okmax_cookie_ack";

// 底部悬浮 cookie 告知条:本站只用必要 cookie + 匿名访问统计,无广告追踪,故只做告知不做分类同意。
// 点「知道了」后 localStorage 记住不再弹(视觉基准 public/mock-cookie.html)。
export function CookieNotice() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const ack = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="ck-notice" role="region" aria-label={t("Cookie 提示")}>
      <span className="ck-ico" aria-hidden="true">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="9.5" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="ck-tx">
        {t("我们仅使用保障登录、语言偏好等必要 cookie,以及匿名的访问量统计,不用于广告追踪。继续浏览即视为同意,详见")}
        <Link href="/privacy" prefetch={false}>{t("隐私政策")}</Link>
        {t("。")}
      </span>
      <button className="ck-btn" onClick={ack}>{t("知道了")}</button>
    </div>
  );
}
