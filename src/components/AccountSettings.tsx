"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { useT } from "@/components/LocaleProvider";

const TABS: [string, string][] = [["profile", "编辑资料"], ["password", "密码管理"], ["account", "账户管理"]];
const fld: React.CSSProperties = { width: "100%", height: 48, border: "1px solid var(--line)", borderRadius: 10, padding: "0 15px", fontSize: 14, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)", outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: 13.5, fontWeight: 600, marginBottom: 9 };
const save: React.CSSProperties = { width: "100%", height: 50, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

export function AccountSettings({ user }: { user: { email: string; name: string; image: string | null; bio: string } }) {
  const t = useT();
  const [tab, setTab] = useState("profile");
  return (
    <div className="acct-grid" style={{ maxWidth: 880, margin: "0 auto", display: "grid", paddingTop: 10 }}>
      <nav className="acct-nav" style={{ display: "flex", gap: 4 }}>
        {TABS.map(([k, label]) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 14, color: on ? "var(--accent-d)" : "var(--ink2)", fontWeight: on ? 600 : 400, padding: on ? "8px 0" : "8px 0 8px 12px" }}>
              {on && <span style={{ width: 3, height: 15, background: "var(--accent)", borderRadius: 2 }} />}{t(label)}
            </button>
          );
        })}
      </nav>
      <div style={{ maxWidth: 600 }}>
        {tab === "profile" ? <ProfilePane user={user} /> : tab === "password" ? <PasswordPane /> : <AccountPane email={user.email} />}
      </div>
    </div>
  );
}

function ProfilePane({ user }: { user: { email: string; name: string; image: string | null; bio: string } }) {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [preview, setPreview] = useState<string | null>(user.image);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f));
  }
  async function submit() {
    if (saving) return; setSaving(true); setMsg("");
    const fd = new FormData();
    fd.set("name", name); fd.set("bio", bio);
    if (file) fd.set("avatar", file);
    const res = await fetch("/api/account", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "已保存" : (d.error || "保存失败"));
    if (res.ok) { setFile(null); if (d.image) setPreview(d.image); router.refresh(); }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <label style={lbl}>{t("头像")}</label>
        <div onClick={() => fileRef.current?.click()} style={{ position: "relative", width: 76, height: 76, cursor: "pointer" }} title={t("点击上传头像")}>
          <Avatar name={name || user.email} image={preview} size={76} />
          <span style={{ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--ink)", border: "2px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </span>
        </div>
        <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={onPick} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
          <label style={{ ...lbl, marginBottom: 0 }}>{t("昵称")} <span style={{ color: "var(--accent)" }}>*</span></label>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>{name.length}/24</span>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} style={fld} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
          <label style={{ ...lbl, marginBottom: 0 }}>{t("个人简介")}</label>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>{bio.length}/200</span>
        </div>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} placeholder={t("介绍一下自己…")} style={{ ...fld, height: 116, padding: "12px 15px", resize: "none", lineHeight: 1.6 }} />
      </div>
      <div style={{ marginBottom: 32 }}>
        <label style={lbl}>{t("电子邮件地址")}</label>
        <div style={{ fontSize: 14, color: "var(--ink3)" }}>{user.email}</div>
      </div>
      <button onClick={submit} disabled={saving} style={save}>{saving ? t("保存中…") : t("保存")}</button>
      {msg && <div style={{ fontSize: 13, marginTop: 12, textAlign: "center", color: msg.includes("已") ? "var(--ok)" : "var(--red)" }}>{t(msg)}</div>}
    </div>
  );
}

function PasswordPane() {
  const t = useT();
  const [old, setOld] = useState(""); const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState("");
  async function submit() {
    if (saving) return;
    if (pw.length < 6) { setMsg("新密码至少 6 位"); return; }
    if (pw !== confirm) { setMsg("两次新密码不一致"); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword: old, newPassword: pw }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "密码已修改" : (d.error || "修改失败"));
    if (res.ok) { setOld(""); setPw(""); setConfirm(""); }
    setSaving(false);
  }
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>{t("当前密码")} <span style={{ color: "var(--accent)" }}>*</span></label>
        <input type="password" value={old} onChange={(e) => setOld(e.target.value)} style={fld} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>{t("新密码")} <span style={{ color: "var(--accent)" }}>*</span></label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("至少 6 位")} style={fld} />
      </div>
      <div style={{ marginBottom: 32 }}>
        <label style={lbl}>{t("确认新密码")} <span style={{ color: "var(--accent)" }}>*</span></label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={fld} />
      </div>
      <button onClick={submit} disabled={saving} style={save}>{saving ? t("保存中…") : t("保存")}</button>
      {msg && <div style={{ fontSize: 13, marginTop: 12, textAlign: "center", color: msg.includes("已") ? "var(--ok)" : "var(--red)" }}>{t(msg)}</div>}
    </div>
  );
}

function AccountPane({ email }: { email: string }) {
  const t = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={lbl}>{t("登录账号")}</div>
        <div style={{ fontSize: 14, color: "var(--ink3)" }}>{email}</div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <form action="/api/auth/logout" method="post"><button type="submit" className="btn-line">{t("退出登录")}</button></form>
      </div>
    </div>
  );
}
