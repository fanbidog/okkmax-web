"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";

const DISMISS_KEY = "okmax_beta_banner_dismissed";

// 公测期顶部横幅:说明公测状态 + 反馈入口 + 种子用户注册奖励引导。阶段性内容,公测结束后应整体移除(见 DEPLOYMENT.md)。
export function BetaBanner() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };
  const openRegister = () => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "register" } }));

  return (
    <div className="beta-banner">
      <span>
        {t("OkkMax 目前处于公测阶段,可能存在体验不完善之处,")}
        <a href="https://github.com/fanbidog/okkmax-web/issues" target="_blank" rel="noopener noreferrer">{t("欢迎反馈")}</a>
        {t("。现在注册即为种子用户,")}
        <a href="#" onClick={(e) => { e.preventDefault(); openRegister(); }}>{t("送 50 积分")}</a>
        {t("。")}
      </span>
      <button className="beta-close" aria-label={t("关闭")} onClick={dismiss}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
