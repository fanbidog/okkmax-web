"use client";
import { useState, useEffect } from "react";

// nav 上的下拉(汉堡 / 设置 / 头像)共用一条事件总线:开一个时广播自己的 id,其它的收到不同 id 就自关。
export const NAV_MENU_EVENT = "okk-nav-menu";

export function useNavMenu(id: string) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (d && d !== id) setOpen(false); };
    window.addEventListener(NAV_MENU_EVENT, h);
    return () => window.removeEventListener(NAV_MENU_EVENT, h);
  }, [id]);
  function show(v: boolean) {
    setOpen(v);
    if (v) window.dispatchEvent(new CustomEvent(NAV_MENU_EVENT, { detail: id }));
  }
  return [open, show] as const;
}
