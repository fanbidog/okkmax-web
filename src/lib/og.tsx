import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 分享卡片(OG/Twitter)共用模板:白底 + 顶部橙色淡渐变(同首页 hero),logo 居中,
// 有 title 时 title 在上、logo 缩小在下;没 title(首页)时纯 logo 居中放大。
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#1d1d1f";
const ACCENT = "#e0512b";
const ACCENT_50 = "#fdf1ec";

// next/og(satori)不认 woff2,这几份是单独转出来的 ttf,不影响正式页面用的 woff2:
// - orbitron-900.ttf:logo 用,只有拉丁字母。
// - og-noto-sans-sc-800/500.ttf:标题用,中文站名/标题需要覆盖(Orbitron 没有中文字形);
//   两个字重同一个 family 名注册,靠 style.fontWeight 选。
let orbitronData: Buffer | null = null;
let sans800Data: Buffer | null = null;
let sans500Data: Buffer | null = null;
async function loadFonts() {
  if (!orbitronData) orbitronData = await readFile(join(process.cwd(), "src/app/fonts/orbitron-900.ttf"));
  if (!sans800Data) sans800Data = await readFile(join(process.cwd(), "src/app/fonts/og-noto-sans-sc-800.ttf"));
  if (!sans500Data) sans500Data = await readFile(join(process.cwd(), "src/app/fonts/og-noto-sans-sc-500.ttf"));
  return { orbitronData, sans800Data, sans500Data };
}

export async function ogImage(title?: string | string[], opts?: { titleWeight?: 500 | 800 }) {
  const lines = title == null ? [] : Array.isArray(title) ? title : [title];
  const titleWeight = opts?.titleWeight ?? 800;
  const { orbitronData, sans800Data, sans500Data } = await loadFonts();
  const jsx = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        backgroundImage: `radial-gradient(1100px 640px at 50% 0%, ${ACCENT_50} 0%, rgba(253,241,236,0) 62%)`,
      }}
    >
      {lines.length ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontFamily: "NotoSansSC",
                fontSize: 76,
                fontWeight: titleWeight,
                color: INK,
                textAlign: "center",
                maxWidth: 1040,
                letterSpacing: -1.5,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          fontFamily: "Orbitron",
          fontWeight: 900,
          fontSize: lines.length ? 84 : 168,
          color: INK,
        }}
      >
        OkkMa<span style={{ color: ACCENT }}>x</span>
      </div>
    </div>
  );
  return {
    jsx,
    fonts: [
      { name: "Orbitron", data: orbitronData, weight: 900 as const, style: "normal" as const },
      { name: "NotoSansSC", data: sans800Data, weight: 800 as const, style: "normal" as const },
      { name: "NotoSansSC", data: sans500Data, weight: 500 as const, style: "normal" as const },
    ],
  };
}
