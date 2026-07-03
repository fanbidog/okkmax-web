import { NextRequest, NextResponse } from "next/server";
import { getStatus, getReport, detectConfigured } from "@/lib/detect-client";
import { classifyTier } from "@/lib/tier";
import { lookupStation, logoDataUri } from "@/lib/station-lookup";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!detectConfigured()) {
    return NextResponse.json({ status: "error", error: "检测服务未配置" }, { status: 501 });
  }
  const origin = new URL(_req.url).origin;
  try {
    const status = await getStatus(jobId);
    if (status.status !== "done") {
      // 等待页要的:逐项进度 + 起始时间(算已用秒)+ 被测站/模型 + 收录站点
      return NextResponse.json({
        status: status.status,
        error: status.error,
        progress: status.progress,
        started_at: status.started_at,
        base_url: status.base_url,
        target_model: status.target_model,
        station: await lookupStation(status.base_url),
      });
    }
    const report = await getReport(jobId);
    const score = Number(report.total_score ?? 0);
    const station = await lookupStation(report.base_url as string | undefined);
    return NextResponse.json({
      status: "done",
      tier: classifyTier(score),
      report,
      station,
      // 海报截图用:同源 data URI logo(规避 html-to-image 跨域污染 canvas)
      logoData: await logoDataUri(station?.logoUrl, origin),
    });
  } catch (e) {
    return NextResponse.json({ status: "error", error: String(e) }, { status: 502 });
  }
}
