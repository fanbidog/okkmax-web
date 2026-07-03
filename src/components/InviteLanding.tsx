"use client";
import { useEffect } from "react";
import { useT } from "@/components/LocaleProvider";

const Gem = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 4.5h8l3.6 4.6L12 20.5 4.4 9.1z" /></svg>;
const Sparkle = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8z" /></svg>;

const FEATS = [
  { t: "客观第三方实测", d: "纯度、可用性、价格全自动探针测,数据可复现,不收影响排名的钱。", ic: <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></> },
  { t: "持续监测预警", d: "跑路、掺水、降速第一时间发现,帮你及时止损、绕开坑站。", ic: <><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9.5 12l1.8 1.8L15 10" /></> },
  { t: "真实用户口碑", d: "用户评价与避雷爆料汇于一处,绕开别人踩过的坑。", ic: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 10h8M8 13h5" /></> },
];

export function InviteLanding({ code, inviterName }: { code: string; inviterName: string | null }) {
  const t = useT();
  useEffect(() => {
    // 写 ref cookie(非 httpOnly,注册路由读它做归因 + 发分)
    document.cookie = `okmax_ref=${encodeURIComponent(code)}; path=/; max-age=${7 * 86400}; samesite=lax`;
  }, [code]);

  const register = () => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "register" } }));

  return (
    <div className="iland">
      <div className="iland-art">
        <span className="ispk la-s1"><Sparkle /></span>
        <span className="ispk la-s2"><Sparkle /></span>
        <svg className="igift" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 12h18M12 8v13" /><path d="M12 8S10.5 3.5 8 4.2C6 4.8 6.4 8 9 8z" /><path d="M12 8s1.5-4.5 4-3.8C18 4.8 17.6 8 15 8z" /></svg>
        <span className="icoin la-c1"><Gem /></span>
        <span className="icoin la-c2"><Gem /></span>
      </div>

      <h1>{inviterName ? <><span className="who">{inviterName}</span> {t("邀请你加入 OkkMax")}</> : t("加入 OkkMax")}</h1>

      <div className="iland-reward">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 12h18M12 8v13" /><path d="M12 8S10.5 3.5 8 4.2C6 4.8 6.4 8 9 8z" /><path d="M12 8s1.5-4.5 4-3.8C18 4.8 17.6 8 15 8z" /></svg>
        {t("注册即得 10 积分,可兑换平台权益")}
      </div>

      <p>{t("OkkMax 是独立第三方中转站测评平台 —— 纯度、可用性、价格全部自动探针实测,客观可复现。和我们一起,客观选站、绕开坑站。")}</p>

      <button className="reg" onClick={register}>{t("立即注册")}</button>

      <div className="iland-feats">
        {FEATS.map((f) => (
          <div className="feat" key={f.t}>
            <span className="fic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.ic}</svg></span>
            <div className="ft">{t(f.t)}</div>
            <div className="fd">{t(f.d)}</div>
          </div>
        ))}
      </div>

      <div className="tip">{t("弹出框里可切换「登录 / 注册」。")}</div>
    </div>
  );
}
