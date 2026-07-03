import { isUrl } from "@/lib/avatars";

/** 头像:image 为 URL 则显示图片,为色值则色块 + 首字母,否则默认灰底。 */
export function Avatar({ name, image, size = 40 }: { name: string; image?: string | null; size?: number }) {
  const letter = (name || "?").slice(0, 1).toUpperCase();
  if (isUrl(image)) {
    return <img src={image!} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  const bg = image && image.startsWith("#") ? image : "var(--bg2)";
  const fg = image && image.startsWith("#") ? "#fff" : "var(--ink2)";
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: bg, border: image && image.startsWith("#") ? "none" : "1px solid var(--line2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 600, color: fg, flexShrink: 0 }}>{letter}</span>
  );
}
