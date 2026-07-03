"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

export type RLReply = { id: string; user: string; avatar: string | null; body: string; date: string; votes: number; voted: boolean };
export type RLReview = { id: string; user: string; avatar: string | null; rating: number; body: string; pros: string[]; cons: string[]; date: string; votes: number; voted: boolean; replies: RLReply[] };

const THUMB = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>;
const REPLY = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>;

function Avatar({ name, image, size = 32 }: { name: string; image?: string | null; size?: number }) {
  if (image) return <span className="rvav" style={{ width: size, height: size }}><img src={image} alt={name} /></span>;
  return <span className="rvav" style={{ width: size, height: size, fontSize: size * 0.42 }}>{name.slice(0, 1).toUpperCase()}</span>;
}
function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return <span className="rv-stars" style={{ fontSize: size, letterSpacing: 1 }}>{"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span></span>;
}

function VoteBtn({ type, id, votes, voted, loggedIn }: { type: "review" | "reply"; id: string; votes: number; voted: boolean; loggedIn: boolean }) {
  const t = useT();
  const [v, setV] = useState(voted);
  const [c, setC] = useState(votes);
  const [busy, setBusy] = useState(false);
  async function click() {
    if (!loggedIn) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    if (busy) return; setBusy(true);
    try {
      const res = await fetch("/api/reviews/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: type, targetId: id }) });
      const d = await res.json();
      if (res.ok) { setV(d.voted); setC(d.count); }
      else toast(t("操作失败,请重试"), "err");
    } catch { toast(t("操作失败,请重试"), "err"); }
    setBusy(false);
  }
  return <button type="button" onClick={click} className={"rvact" + (v ? " on" : "")} aria-label={t("赞")}>{THUMB}{t("赞")}{c ? ` ${c}` : ""}</button>;
}

export function ReviewList({ reviews, loggedIn }: { reviews: RLReview[]; loggedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitReply(e: FormEvent, reviewId: string) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reviews/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, body: text }) });
      if (res.ok) { setText(""); setReplyFor(null); router.refresh(); toast(t("已回复")); }
      else toast(t("回复失败,请重试"), "err");
    } catch { toast(t("回复失败,请重试"), "err"); }
    setBusy(false);
  }
  function openReply(id: string) {
    if (!loggedIn) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    setReplyFor((cur) => (cur === id ? null : id)); setText("");
  }

  return (
    <>
      {reviews.map((r) => (
        <div key={r.id} className="rvitem">
          <div className="rvhead"><Avatar name={r.user} image={r.avatar} /><span className="rvname">{r.user}</span><span className="rvdate">{r.date}</span></div>
          <div className="rvmeta"><Stars n={r.rating} /></div>
          {r.body && <div className="rvbody">{r.body}</div>}
          {(r.pros.length > 0 || r.cons.length > 0) && (
            <div className="rvc-tags">
              {r.pros.map((tag) => <span key={"p" + tag} className="rvc-tag">{t(tag)}</span>)}
              {r.cons.map((tag) => <span key={"c" + tag} className="rvc-tag">{t(tag)}</span>)}
            </div>
          )}
          <div className="rvacts">
            <VoteBtn type="review" id={r.id} votes={r.votes} voted={r.voted} loggedIn={loggedIn} />
            <button type="button" className="rvact" onClick={() => openReply(r.id)}>{REPLY}{t("回复")}</button>
          </div>

          {replyFor === r.id && (
            <form onSubmit={(e) => submitReply(e, r.id)} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder={t("回复…")} autoFocus
                style={{ border: "1px solid var(--line2)", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", color: "var(--ink)" }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setReplyFor(null)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--ink3)" }}>{t("取消")}</button>
                <button type="submit" className="btn-accent" disabled={busy} style={{ padding: "6px 16px", fontSize: 13 }}>{t("发送")}</button>
              </div>
            </form>
          )}

          {r.replies.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14, paddingLeft: 12, borderLeft: "2px solid var(--line)" }}>
              {r.replies.map((rep) => (
                <div key={rep.id}>
                  <div className="rvhead"><Avatar name={rep.user} image={rep.avatar} size={24} /><span className="rvname" style={{ fontSize: 13 }}>{rep.user}</span><span className="rvdate">{rep.date}</span></div>
                  <div style={{ fontSize: 13.5, color: "var(--ink2)", whiteSpace: "pre-line", lineHeight: 1.7, marginTop: 8, overflowWrap: "break-word", wordBreak: "break-word" }}>{rep.body}</div>
                  <div className="rvacts" style={{ marginTop: 10 }}><VoteBtn type="reply" id={rep.id} votes={rep.votes} voted={rep.voted} loggedIn={loggedIn} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
