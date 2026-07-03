"use client";
import { useEffect, useState } from "react";

type Tone = "ok" | "err";
interface Item { id: number; msg: string; tone: Tone }

/** 任意组件调用:toast("已收藏") / toast("操作失败,请重试", "err")。沿用项目的 CustomEvent 风格。 */
export function toast(msg: string, tone: Tone = "ok") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("okmax:toast", { detail: { msg, tone } }));
}

let seq = 0;
// 弹窗样式对齐详情页 InfoTip 白卡;宿主对齐 .wrap 的 1200px 内容列右缘(非视口边)。
const CSS = `
.toast-host{position:fixed;top:72px;left:0;right:0;z-index:1100;pointer-events:none}
.toast-wrap{max-width:1200px;margin:0 auto;padding:0 28px;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
.toast{display:flex;align-items:center;gap:9px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:11px 16px;font-size:13.5px;font-weight:500;white-space:nowrap;box-shadow:0 16px 44px -12px rgba(20,12,8,.22);animation:toast-in .2s cubic-bezier(.16,1,.3,1)}
@keyframes toast-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
`;

/** 全局 toast 宿主:在 layout 挂一次。监听 okmax:toast 事件,内容列右缘(nav 下方)弹出,2.6s 自动消失。 */
export function ToastHost() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    function on(e: Event) {
      const d = (e as CustomEvent).detail as { msg: string; tone: Tone };
      const id = ++seq;
      setItems((xs) => [...xs, { id, msg: d.msg, tone: d.tone }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2600);
    }
    window.addEventListener("okmax:toast", on);
    return () => window.removeEventListener("okmax:toast", on);
  }, []);
  return (
    <>
      <style>{CSS}</style>
      <div className="toast-host" aria-live="polite">
        <div className="toast-wrap">
          {items.map((it) => (
            <div key={it.id} className="toast" role="status">
              {it.tone === "ok"
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></svg>}
              <span>{it.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
