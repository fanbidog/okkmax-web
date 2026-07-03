import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { awardOnce, PTS } from "@/lib/points";

// 头像写入 UPLOAD_DIR(默认 public/uploads,本地直接跑);线上设成持久卷路径并挂卷,代码不用改。
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// 按魔术字节嗅探真实图片类型(不信客户端 MIME);只放行 png/jpg/webp,拒 SVG 等 → 堵存储型 XSS。
function sniffImageExt(b: Buffer): "png" | "jpg" | "webp" | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim().slice(0, 24);
  const bio = String(form.get("bio") ?? "").trim().slice(0, 200);
  const avatar = form.get("avatar");

  if (!name) return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
  const data: { name: string; bio: string; image?: string } = { name, bio };

  if (avatar && typeof avatar !== "string" && avatar.size > 0) {
    if (avatar.size > 2 * 1024 * 1024) return NextResponse.json({ error: "图片不超过 2MB" }, { status: 400 });
    const buf = Buffer.from(await avatar.arrayBuffer());
    const ext = sniffImageExt(buf); // 按真实字节判类型,SVG/伪装一律拒
    if (!ext) return NextResponse.json({ error: "仅支持 png / jpg / webp 图片" }, { status: 400 });
    const filename = `${user.id}-${Date.now()}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), buf);
    data.image = `/uploads/${filename}`;
  }

  await prisma.user.update({ where: { id: user.id }, data });
  // 完善资料:头像 + 昵称都齐了,一次性 +5
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, image: true } });
  if (fresh?.name && fresh?.image) await awardOnce(user.id, 5, PTS.profile);
  return NextResponse.json({ ok: true, image: data.image });
}
