import { NextRequest, NextResponse } from "next/server";
import { submitDetect, detectConfigured } from "@/lib/detect-client";
import { HEADLINE } from "@/lib/headline";
import { getCurrentUser } from "@/lib/auth";
import { awardOnce, awardDailyFirst, PTS } from "@/lib/points";

// 用户触发的检测只允许预置模型(防直接 POST 任意模型刷检测服务)。
const ALLOWED = new Set(HEADLINE.map((h) => h.id));

/** 按模型厂商定检测协议:gemini→gemini / gpt|codex|o\d→openai / 其余→claude。 */
function protocolOf(model: string): "claude" | "openai" | "gemini" {
  const s = model.toLowerCase();
  if (s.startsWith("gemini")) return "gemini";
  if (s.startsWith("gpt") || s.startsWith("codex") || /^o\d/.test(s)) return "openai";
  return "claude";
}

export async function POST(req: NextRequest) {
  if (!detectConfigured()) {
    return NextResponse.json({ error: "检测服务未配置:需自建检测后端并设置 DETECT_BASE_URL" }, { status: 501 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const { baseUrl, apiKey, model, longContext } = body;
  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json({ error: "baseUrl / apiKey / model 必填" }, { status: 400 });
  }
  if (!/^https?:\/\/.+/i.test(String(baseUrl))) {
    return NextResponse.json({ error: "接口地址格式不正确,请以 http:// 或 https:// 开头" }, { status: 400 });
  }
  if (!ALLOWED.has(model)) {
    return NextResponse.json({ error: "不支持的模型(仅限预置模型)" }, { status: 400 });
  }
  try {
    // 首页用户触发的检测走深度(full):多跑行为签名 + PDF 透传等,结论更硬。
    // 成本仅比标准多 ~1.5 分;自动同步(detect.ts/refresh.ts)仍走 standard 控成本。
    // longContext:用户勾选「上下文检测」时才加测(贵+慢,需 full 才有意义)。
    const jobId = await submitDetect({ baseUrl, apiKey, model, protocol: protocolOf(model), mode: "full", includeLongContext: !!longContext });
    // 登录用户:发起检测发分(首次一次性 +5,当天首次 +3);匿名检测不计分。
    const user = await getCurrentUser();
    if (user) { await awardOnce(user.id, 5, PTS.detectFirst); await awardDailyFirst(user.id, 3, PTS.detectDaily); }
    return NextResponse.json({ jobId });
  } catch (e) {
    // 原始错误只记服务端日志,不外泄(可能含内部服务细节)
    console.error("[detect] submitDetect failed:", e);
    return NextResponse.json({ error: "检测服务暂时不可用,请稍后再试" }, { status: 502 });
  }
}
