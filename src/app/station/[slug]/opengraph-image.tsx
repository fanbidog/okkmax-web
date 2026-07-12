import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = await prisma.station.findUnique({ where: { slug }, select: { name: true } });
  const { jsx, fonts } = await ogImage(station ? [station.name, "纯度、可用性、价格与口碑"] : undefined, { titleWeight: 500 });
  return new ImageResponse(jsx, { ...size, fonts });
}
