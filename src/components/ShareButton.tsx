"use client";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/components/LocaleProvider";

export function ShareButton({ name, text }: { name: string; text?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setUrl(window.location.href); }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  function copy() {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  }

  const shareText = text ?? `${name} · ${t("中转测评")}`;
  const socials = [
    { key: "x", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, label: "X", svg: <path d="M18.9 2H22l-7.6 8.7L23.4 22h-7l-5.5-7.2L4.6 22H1.5l8.2-9.4L1 2h7.2l5 6.6L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z" /> },
    { key: "fb", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, label: "Facebook", svg: <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" /> },
    { key: "tg", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`, label: "Telegram", svg: <path d="M21.9 4.3 18.7 19.6c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2l-10.9 6.8-4.7-1.5c-1-.3-1-1 .2-1.5l18.4-7.1c.8-.3 1.6.2 1.3 1.6z" /> },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="iconbtn has-tip" aria-label={t("分享")} onClick={() => setOpen((o) => !o)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2.4" /><circle cx="17" cy="5.5" r="2.4" /><circle cx="17" cy="18.5" r="2.4" /><path d="M8.1 10.9l6.8-4M8.1 13.1l6.8 4" /></svg>
        <span className="tip">{t("分享")}</span>
      </button>

      {open && (
        <div className="share-pop">
          <div className="share-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink3)", flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
            <span className="lk">{url.replace(/^https?:\/\//, "")}</span>
            <button className="cp" onClick={copy} aria-label={t("复制链接")}>
              {copied
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>}
            </button>
          </div>
          <div className="share-socials">
            {socials.map((s) => (
              <a key={s.key} className="share-soc" href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">{s.svg}</svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
