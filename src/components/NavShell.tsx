"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { NAV_MENU_EVENT } from "@/lib/useNavMenu";

// 抽屉开合状态由 NavShell 持有,直接驱动 .nav 的 class(同步,无晚帧闪烁)。MobileNav 通过此 context 读写。
const DrawerCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });
export const useNavDrawer = () => useContext(DrawerCtx);

/** nav 外壳:管理「滚动浮出」和「手机抽屉开合」两个状态,统一拼到 .nav 的 className 上。 */
export function NavShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpenState] = useState(false);

  // 顶部透明,下滑 8px 后浮出白底
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 与设置/头像下拉互斥:别的菜单打开时关掉抽屉
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (d && d !== "burger") setOpenState(false); };
    window.addEventListener(NAV_MENU_EVENT, h);
    return () => window.removeEventListener(NAV_MENU_EVENT, h);
  }, []);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    if (v) window.dispatchEvent(new CustomEvent(NAV_MENU_EVENT, { detail: "burger" }));
  };

  return (
    <DrawerCtx.Provider value={{ open, setOpen }}>
      <nav className={`nav${scrolled ? " scrolled" : ""}${open ? " nav-open" : ""}`}>
        <div className="in">{children}</div>
      </nav>
    </DrawerCtx.Provider>
  );
}
