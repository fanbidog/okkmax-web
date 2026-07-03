"use client";
import { useEffect } from "react";
import { useT } from "@/components/LocaleProvider";

/** 需登录页未登录时的占位:渲染页面骨架(无数据)+ 自动弹出登录框。
 *  暗色蒙版由 AuthModal 自带的全屏遮罩提供;关掉登录框后留一个登录入口兜底。
 *  登录成功后 AuthModal 会把 redirectTo 设为当前路径并刷新,直接显示真内容。 */
export function LockedPage({ title }: { title: string }) {
  const t = useT();
  useEffect(() => { window.dispatchEvent(new CustomEvent("open-auth")); }, []);
  const openAuth = () => window.dispatchEvent(new CustomEvent("open-auth"));
  const bar = (w: number | string, h = 12) => (
    <span style={{ display: "block", width: w, height: h, borderRadius: 6, background: "var(--line)" }} />
  );
  return (
    <div className="wrap" style={{ paddingTop: 38, paddingBottom: 80, position: "relative", minHeight: 520 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 22 }}>{title}</div>

      {/* 页面骨架(无数据) */}
      <div aria-hidden style={{ opacity: 0.5, userSelect: "none", pointerEvents: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", border: "1px solid var(--line)", borderRadius: 14 }}>
            <span style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bg2)", flex: "none" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>{bar(140)}{bar(90, 10)}</div>
            <span style={{ width: 54, height: 24, borderRadius: 7, background: "var(--bg2)" }} />
            <span style={{ width: 64, height: 24, borderRadius: 7, background: "var(--bg2)" }} />
          </div>
        ))}
      </div>

      {/* 关掉登录框后的兜底入口 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 14, color: "var(--ink2)" }}>{t("登录后即可查看")}</div>
        <button className="btn-accent" onClick={openAuth}>{t("登录 / 注册")}</button>
      </div>
    </div>
  );
}
