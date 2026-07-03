import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// 从 UPLOAD_DIR 提供上传文件。本地默认 public/uploads(Next 静态会直接服务,这里是兜底);
// 线上 UPLOAD_DIR 指向持久卷(public 外)时,/uploads/<file> 由本路由从卷读出 → 设 UPLOAD_DIR 即可,代码不用改。
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = path.basename(file); // 只取文件名,防路径穿越
  const type = TYPES[name.split(".").pop()?.toLowerCase() ?? ""];
  if (!type) return new Response("Not found", { status: 404 }); // 仅服务图片白名单
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
