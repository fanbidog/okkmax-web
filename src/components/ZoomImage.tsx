"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/** 公告等处的图片:缩略图限高显示,点击全屏看大图,再点(或 Esc)收起。 */
export function ZoomImage({ src }: { src: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <img src={src} alt="" loading="lazy" onClick={() => setOpen(true)}
        style={{ display: "block", maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, border: "1px solid var(--line)", margin: "6px 0", cursor: "zoom-in" }} />
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 32, cursor: "zoom-out" }}>
          <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        </div>,
        document.body
      )}
    </>
  );
}
