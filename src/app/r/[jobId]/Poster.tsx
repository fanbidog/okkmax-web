"use client";
import type { CSSProperties, Ref } from "react";

/* 离屏渲染的分享海报(1080×1350)。浏览器原生渲染 → html-to-image 截图,
   不受 Satori 限制(SVG 环/字体/.ico logo 全部正常)。设计同 mock-poster.html。 */

interface Check { name: string; skip: boolean; score: number }
interface PosterProps {
  innerRef: Ref<HTMLDivElement>;
  score: number;
  tierLabel: string;
  tone: string;
  ring: [string, string];
  siteName: string;
  siteUrl: string;
  logoData: string | null;
  model: string;
  time: string;
  metrics: [string, string][];
  checks: Check[];
  qr: string | null;
}

const ICONS: Record<string, string> = {
  signature: '<path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
function Ic({ k, s, sw = 1.7, color }: { k: string; s: number; sw?: number; color: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[k] }} />;
}

export function Poster(p: PosterProps) {
  const R = 60, C = 2 * Math.PI * R;
  const ink = "#1d1d1f", ink3 = "#86868b", line = "#ececef";
  const card: CSSProperties = { flex: 1, background: "#f5f5f7", borderRadius: 18, padding: "24px 8px", display: "flex", flexDirection: "column", alignItems: "center" };

  return (
    <div ref={p.innerRef} style={{
      width: 1080, height: 1350, background: "#fff", boxSizing: "border-box",
      padding: "60px 76px", display: "flex", flexDirection: "column",
      fontFamily: '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',
      color: ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-.01em",
      backgroundImage: "radial-gradient(900px 520px at 50% -8%,#fdf1ec,#fff 70%)",
    }}>
      {/* 顶栏 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-orbitron),sans-serif", fontWeight: 900, fontSize: 40 }}>
          OkkMa<span style={{ color: p.tone }}>x</span>
        </div>
        <div style={{ fontSize: 21, color: "#55565b", border: "1px solid #e0e0e4", borderRadius: 999, padding: "9px 20px" }}>中转站真伪实测</div>
      </div>

      {/* 环 + 档名 + 站 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 38 }}>
        <div style={{ position: "relative", width: 260, height: 260 }}>
          <svg width="260" height="260" viewBox="0 0 158 158">
            <defs><linearGradient id="prg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.ring[0]} /><stop offset="1" stopColor={p.ring[1]} /></linearGradient></defs>
            <circle cx="79" cy="79" r={R} fill="none" stroke={line} strokeWidth="13" />
            <circle cx="79" cy="79" r={R} fill="none" stroke="url(#prg)" strokeWidth="13" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p.score / 100)} transform="rotate(-90 79 79)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1 }}>{p.score}</div>
            <div style={{ fontSize: 20, color: ink3, marginTop: 4 }}>/ 100</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 24 }}>
          <Ic k="signature" s={48} color={p.tone} />
          <div style={{ fontFamily: "var(--font-serif),'Fraunces',serif", fontSize: 60, fontWeight: 600, marginLeft: 16 }}>{p.tierLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 18 }}>
          {p.logoData ? <img src={p.logoData} width={46} height={46} style={{ borderRadius: 23, marginRight: 14, objectFit: "cover" }} alt="" /> : null}
          <div style={{ fontSize: 28, fontWeight: 600 }}>{p.siteName}</div>
          <div style={{ fontSize: 21, color: ink3, marginLeft: 14 }}>{p.siteUrl}</div>
        </div>
      </div>

      {/* 指标 */}
      <div style={{ display: "flex", gap: 18, marginTop: 40 }}>
        {p.metrics.map(([l, v]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 19, color: ink3 }}>{l}</div>
            <div style={{ fontSize: 34, fontWeight: 700, marginTop: 8, letterSpacing: "-.02em" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 检测项 2 列 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 56, marginTop: 30 }}>
        {p.checks.map((c) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 4px", borderBottom: `1px solid ${line}` }}>
            <span style={{ width: 30, height: 30, borderRadius: 15, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: c.skip ? "#e0e0e4" : p.tone }}>
              {c.skip ? <span style={{ width: 12, height: 3, borderRadius: 2, background: "#fff" }} /> : <Ic k="check" s={18} sw={3} color="#fff" />}
            </span>
            <span style={{ flex: 1, fontSize: 25, fontWeight: 500, color: c.skip ? ink3 : ink }}>{c.name}</span>
            <span style={{ fontSize: 25, fontWeight: c.skip ? 400 : 700, color: c.skip ? ink3 : p.tone }}>{c.skip ? "未测" : Math.round(c.score)}</span>
          </div>
        ))}
      </div>

      {/* 脚注 + 二维码 */}
      <div style={{ marginTop: "auto", paddingTop: 34, borderTop: "2px solid #1d1d1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 22, color: "#55565b", lineHeight: 1.65 }}>
          <div>检测模型 <b style={{ color: ink, fontWeight: 600 }}>{p.model}</b></div>
          <div>检测时间 {p.time}</div>
          <div style={{ marginTop: 6, fontSize: 23, color: ink }}><b style={{ fontWeight: 700 }}>okkmax.com</b> <span style={{ color: "#55565b" }}>逐项实测可复现</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
          {p.qr ? <img src={p.qr} width={128} height={128} alt="" /> : <div style={{ width: 128, height: 128, background: "#f5f5f7", borderRadius: 8 }} />}
          <div style={{ fontSize: 18, color: ink3 }}>扫码看完整报告</div>
        </div>
      </div>
    </div>
  );
}
