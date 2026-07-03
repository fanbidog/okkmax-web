"use client";
import { useState, useEffect, type FormEvent } from "react";
import { POS_SUGGESTED, NEG_SUGGESTED } from "@/lib/reviewTags";
import { toast } from "@/components/Toast";
import { useT } from "@/components/LocaleProvider";

/** 优点 / 缺点 各一组:建议标签预归类,自定义加入哪组极性就是哪组。合计 6 个封顶,跨组不重复。 */
function TagGroup({ caption, suggested, selected, setSelected, other, total }: {
  caption: string; suggested: string[];
  selected: string[]; setSelected: (f: (s: string[]) => string[]) => void; other: string[]; total: number;
}) {
  const t = useT();
  const [custom, setCustom] = useState("");
  const chips = [...new Set([...suggested, ...selected])];
  const toggle = (t: string) => setSelected((s) =>
    s.includes(t) ? s.filter((x) => x !== t) : (total < 6 && !other.includes(t) ? [...s, t] : s));
  const addCustom = () => {
    const v = custom.trim().slice(0, 7);
    if (v && !selected.includes(v) && !other.includes(v) && total < 6) setSelected((s) => [...s, v]);
    setCustom("");
  };
  return (
    <div className="rvm-tg">
      <div className="rvm-tg-cap">{caption}</div>
      <div className="rvm-chips">
        {chips.map((t) => (
          <button type="button" key={t} className={"rvm-chip" + (selected.includes(t) ? " on" : "")} onClick={() => toggle(t)}>{t}</button>
        ))}
        <input value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} maxLength={7}
          placeholder={t("+ 自定义")} className="rvm-chip" style={{ borderStyle: "dashed", color: "var(--ink3)", width: 96, outline: "none" }} />
      </div>
    </div>
  );
}

/** 写点评:列表里是「留下评论」按钮,点开弹窗(评分 + 内容必填 + 优点/缺点标签)。一人可发多条,无"修改"概念。 */
export function ReviewForm({ stationId, slug, loggedIn }: { stationId: string; slug: string; loggedIn: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const shown = hover || rating;
  const total = pros.length + cons.length;

  // 挂载:提交成功 / 校验失败 的 toast(弹窗式无草稿)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const clean = () => window.history.replaceState(null, "", window.location.pathname + "#reviews");
    if (sp.get("posted")) { setTimeout(() => toast(t("评论已发布")), 0); clean(); }
    else if (sp.get("rerr")) { const m = sp.get("rerr")!; setTimeout(() => toast(m, "err"), 0); clean(); }
  }, []);

  function openModal() {
    if (!loggedIn) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    setOpen(true);
  }
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!loggedIn) { e.preventDefault(); setOpen(false); window.dispatchEvent(new CustomEvent("open-auth")); return; }
    if (submitting) { e.preventDefault(); return; } // 防重复提交:已在提交则拦下
    setSubmitting(true);
  }

  return (
    <>
      <button type="button" className="rv-leave" onClick={openModal}>{t("留下评论")}</button>
      {open && (
        <div className="rvovl">
          <div className="rvmodal">
            <div className="rvm-head">
              <h3>{t("写点评")}</h3>
              <button type="button" className="rvm-x" aria-label={t("关闭")} onClick={() => setOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <form method="post" action="/api/reviews" onSubmit={onSubmit}>
              <input type="hidden" name="stationId" value={stationId} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="rating" value={rating} />
              {pros.map((t) => <input key={"p" + t} type="hidden" name="pros" value={t} />)}
              {cons.map((t) => <input key={"c" + t} type="hidden" name="cons" value={t} />)}
              <div className="rvm-body">
                <div className="rvm-row">
                  <label>{t("评分")}</label>
                  <div className="rvm-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} role="button" aria-label={`${n} ${t("星")}`} className={shown >= n ? "on" : ""}
                        onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>★</span>
                    ))}
                  </div>
                </div>
                <div className="rvm-row">
                  <label>{t("内容")}</label>
                  <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000}
                    className="rvm-ta" placeholder={t("说说真实体验:速度 / 稳定 / 有没有降智偷换 / 客服 / 价格…")} />
                  <div className="rvm-hint">{t("真实评价帮到其他用户;最多 2000 字。")}</div>
                </div>
                <div className="rvm-row">
                  <TagGroup caption={t("优点")} suggested={POS_SUGGESTED} selected={pros} setSelected={setPros} other={cons} total={total} />
                  <TagGroup caption={t("缺点")} suggested={NEG_SUGGESTED} selected={cons} setSelected={setCons} other={pros} total={total} />
                </div>
                <div className="rvm-foot">
                  <button type="submit" className="rvm-submit" disabled={submitting}>{submitting ? t("提交中…") : t("提交评论")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
