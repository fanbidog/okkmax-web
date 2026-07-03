"use client";
import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/LocaleProvider";

function Ico({ children, size = 17 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
const MAIL = <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>;
const LOCK = <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>;
const USER = <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6.2 8-6.2S20 16 20 20" /></>;
const EYE = <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>;
const EYE_OFF = <><path d="m3 3 18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.5 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 3.9" /><path d="M6.2 6.2A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.5 10.5 0 0 0 3.7-.65" /></>;

export function AuthModal() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [step, setStep] = useState<"form" | "code">("form"); // 注册两步:填表 → 输码
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0); // 重发验证码倒计时(秒)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const m = (e as CustomEvent).detail?.mode;
      setMode(m === "register" ? "register" : "login");
      setError(""); setShowPw(false);
      setStep("form"); setCode(""); setCooldown(0);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setOpen(true);
    };
    window.addEventListener("open-auth", handler);
    return () => window.removeEventListener("open-auth", handler);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Google 登录失败回跳 /?authError=... → 自动弹登录框显示错误,并清掉 URL 参数
  useEffect(() => {
    const url = new URL(window.location.href);
    const ae = url.searchParams.get("authError");
    if (ae) {
      setMode("login"); setError(t(ae)); setOpen(true);
      url.searchParams.delete("authError");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, [t]);

  function resetSignup() { setStep("form"); setCode(""); setCooldown(0); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  function switchMode(m: "login" | "register" | "forgot") { setMode(m); setError(""); setShowPw(false); setForgotSent(false); resetSignup(); }

  function startCooldown() {
    setCooldown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => { if (s <= 1) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } return 0; } return s - 1; });
    }, 1000);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError("");
    const form = new FormData();
    if (mode === "register") form.set("name", name);
    form.set("email", email);
    form.set("password", password);
    form.set("redirectTo", window.location.pathname + window.location.search);
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { Accept: "application/json" }, body: form });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.needVerify) { setStep("code"); startCooldown(); setPending(false); return; } // 注册:进输码步,不再直接登录
      if (res.ok && d.ok) { window.location.href = d.next || "/"; return; }
      setError(t(d.error || "出错了,请重试"));
    } catch {
      setError(t("网络错误,请重试"));
    }
    setPending(false);
  }

  async function submitForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setForgotSent(true);
      else setError(t(d.error || "出错了,请重试"));
    } catch {
      setError(t("网络错误,请重试"));
    }
    setPending(false);
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== 6) return; // 双保险:未满 6 位不打请求
    setPending(true); setError("");
    try {
      const res = await fetch("/api/auth/register/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) { window.location.href = d.next || "/"; return; }
      setError(t(d.error || "验证码不正确"));
    } catch {
      setError(t("网络错误,请重试"));
    }
    setPending(false);
  }

  async function resend() {
    if (cooldown > 0) return;
    setError("");
    try {
      const res = await fetch("/api/auth/register/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) startCooldown();
      else setError(t(d.error || "重发失败"));
    } catch {
      setError(t("网络错误,请重试"));
    }
  }

  const headTitle = mode === "forgot" ? t("找回密码") : mode === "login" ? t("欢迎回来") : t("创建账户");
  const headSub = mode === "forgot" ? (forgotSent ? t("重置邮件已发送") : t("输入注册邮箱,我们给你发送重置链接")) : mode === "login" ? t("登录后可打分、评论、避雷,全程免费") : step === "code" ? t("验证码已发送,查收邮件完成注册") : t("注册后可打分、评论、避雷,全程免费");

  return (
    <>
      <button className="btn-dark nav-acct" onClick={() => { switchMode("login"); setOpen(true); }}>{t("登录")}</button>
      {open && createPortal(
        <div className="auth-ov">
          <div className="auth-card">
            <button className="auth-close" onClick={() => setOpen(false)} aria-label={t("关闭")}><Ico size={18}><path d="M18 6 6 18M6 6l12 12" /></Ico></button>

            <div className="auth-head">
              <div className="t">{headTitle}</div>
              <div className="s">{headSub}</div>
            </div>

            {mode !== "forgot" && !(mode === "register" && step === "code") && (
              <div className="auth-tabs">
                <button className={"auth-tab" + (mode === "login" ? " on" : "")} onClick={() => switchMode("login")}>{t("登录")}</button>
                <button className={"auth-tab" + (mode === "register" ? " on" : "")} onClick={() => switchMode("register")}>{t("注册")}</button>
              </div>
            )}

            {mode === "forgot" ? (
              forgotSent ? (
                <div style={{ textAlign: "center", padding: "4px 0" }}>
                  <div style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.8 }}>{t("重置邮件已发出,请查收(含垃圾箱)。")}</div>
                  <button type="button" onClick={() => switchMode("login")} style={{ marginTop: 20, height: 44, width: "100%", border: "1px solid var(--line2)", borderRadius: 10, background: "var(--surface)", color: "var(--ink2)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s,background .15s" }}>{t("返回登录")}</button>
                </div>
              ) : (
                <form onSubmit={submitForgot}>
                  <div className="auth-panel" key="forgot">
                    <label className="auth-fld">
                      <span className="lb">{t("邮箱")}</span>
                      <div className="auth-inp">
                        <span className="ic"><Ico>{MAIL}</Ico></span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                      </div>
                    </label>
                    {error && <div className="auth-err">{error}</div>}
                    <button type="submit" className="auth-submit" disabled={pending}>{pending ? t("提交中…") : t("发送重置链接")}</button>
                    <div style={{ textAlign: "center", marginTop: 2 }}>
                      <button type="button" onClick={() => switchMode("login")} style={{ background: "none", border: "none", color: "var(--ink3)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{t("返回登录")}</button>
                    </div>
                  </div>
                </form>
              )
            ) : mode === "register" && step === "code" ? (
              <form onSubmit={submitCode}>
                <div className="auth-panel" key="code">
                  <div style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.6 }}>
                    {t("验证码已发送至")} <b style={{ color: "var(--ink)", fontWeight: 500 }}>{email}</b>{t(",请查收(含垃圾箱)并填入下方。")}
                  </div>
                  <label className="auth-fld">
                    <span className="lb">{t("6 位验证码")}</span>
                    <div className="auth-inp">
                      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="------" style={{ padding: "0 14px", textAlign: "center", letterSpacing: 10, textIndent: 10, fontSize: 20 }} required />
                    </div>
                  </label>
                  {error && <div className="auth-err">{error}</div>}
                  <button type="submit" className="auth-submit" disabled={pending || code.length !== 6}>{pending ? t("验证中…") : t("完成注册")}</button>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                    <button type="button" onClick={() => { setStep("form"); setError(""); }} style={{ background: "none", border: "none", color: "var(--ink3)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>{t("返回修改")}</button>
                    <button type="button" onClick={resend} disabled={cooldown > 0} style={{ background: "none", border: "none", color: cooldown > 0 ? "var(--ink3)" : "var(--accent-d)", fontSize: 12.5, fontWeight: cooldown > 0 ? 400 : 500, cursor: cooldown > 0 ? "default" : "pointer", fontFamily: "inherit", padding: 0 }}>{cooldown > 0 ? `${cooldown}s ${t("后重发")}` : t("重发验证码")}</button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={submit}>
                  <div className="auth-panel" key={mode}>
                    {mode === "register" && (
                      <label className="auth-fld">
                        <span className="lb">{t("昵称")}<span className="opt"> {t("(可选)")}</span></span>
                        <div className="auth-inp">
                          <span className="ic"><Ico>{USER}</Ico></span>
                          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("请输入昵称")} />
                        </div>
                      </label>
                    )}
                    <label className="auth-fld">
                      <span className="lb">{t("邮箱")}</span>
                      <div className="auth-inp">
                        <span className="ic"><Ico>{MAIL}</Ico></span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                      </div>
                    </label>
                    <label className="auth-fld">
                      <span className="lb">{t("密码")}</span>
                      <div className="auth-inp pw">
                        <span className="ic"><Ico>{LOCK}</Ico></span>
                        <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? t("设置密码(至少 6 位)") : t("请输入密码")} required minLength={6} />
                        <button type="button" className="auth-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t("隐藏密码") : t("显示密码")}><Ico>{showPw ? EYE_OFF : EYE}</Ico></button>
                      </div>
                    </label>
                    {error && <div className="auth-err">{error}</div>}
                    <button type="submit" className="auth-submit" disabled={pending}>{pending ? t("提交中…") : mode === "login" ? t("登录") : t("注册")}</button>
                    {mode === "login" && (
                      <div style={{ textAlign: "right", marginTop: 2 }}>
                        <button type="button" onClick={() => switchMode("forgot")} style={{ background: "none", border: "none", color: "var(--ink3)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>{t("忘记密码?")}</button>
                      </div>
                    )}
                  </div>
                </form>

                <div className="auth-or"><span /><span className="txt">{t("或")}</span><span /></div>

                <button type="button" className="auth-google" onClick={() => { window.location.href = "/api/auth/google?next=" + encodeURIComponent(window.location.pathname + window.location.search); }}>
                  <img src="/google.svg" alt="" className="g" />{mode === "login" ? t("使用 Google 登录") : t("使用 Google 注册")}
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
