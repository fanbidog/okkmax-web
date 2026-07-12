import { ImageResponse } from "next/og";
import { OG_SIZE, ogImage } from "@/lib/og";

export const dynamic = "force-static"; // 常量模板,构建期渲染,防按请求实时生成被刷 CPU
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "OkkMax";

export default async function Image() {
  const { jsx, fonts } = await ogImage();
  return new ImageResponse(jsx, { ...size, fonts });
}
