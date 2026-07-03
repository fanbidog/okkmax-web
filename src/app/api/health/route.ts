import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 部署健康检查:DB 必须通(不通给 503,负载均衡/看门狗据此判活);
// 检测服务是可选依赖,配置了才探,状态如实上报但不拖垮主判定。
export const dynamic = "force-dynamic";

async function ping(url: string, ms = 3000): Promise<boolean> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(ms) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch { /* db=false */ }
  const detectBase = process.env.DETECT_BASE_URL;
  const detect = detectBase ? await ping(`${detectBase}/`) : null; // null=未配置
  return NextResponse.json(
    { status: db ? "ok" : "down", db, detect, at: new Date().toISOString() },
    { status: db ? 200 : 503 },
  );
}
