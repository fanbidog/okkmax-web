// 检测后端(需自建部署)。未配置 DETECT_BASE_URL 时,detect/result 路由返回 501。
const BASE = process.env.DETECT_BASE_URL ?? "";

export const detectConfigured = (): boolean => Boolean(process.env.DETECT_BASE_URL);

export interface SubmitInput {
  baseUrl: string;
  apiKey: string;
  model: string;
  mode?: "quick" | "standard" | "full";
  protocol?: "claude" | "openai" | "gemini"; // 默认 claude(只有 claude 测真伪)
  includeLongContext?: boolean; // 长上下文真实性加测(贵+慢,默认关)
}

/** 提交检测,返回检测任务 job_id。 */
export async function submitDetect(input: SubmitInput): Promise<string> {
  const form = new URLSearchParams({
    base_url: input.baseUrl,
    api_key: input.apiKey,
    model: input.model,
    mode: input.mode ?? "standard",
    force: "true", // 跳过预检直接进入检测流程,避免部分站点对预检请求限流造成误判

    include_long_context: input.includeLongContext ? "true" : "false",
  });
  const res = await fetch(`${BASE}/api/detect/${input.protocol ?? "claude"}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error(`detect submit ${res.status}: ${await res.text()}`);
  return (await res.json()).job_id as string;
}

export interface ProgressItem {
  name: string;
  display_name: string;
  status: "running" | "done";
}
export interface ProgressInfo {
  total: number;
  done: number;
  items: ProgressItem[];
}
export interface StatusPayload {
  status: "queued" | "running" | "done" | "error";
  error?: string;
  progress?: ProgressInfo;
  base_url?: string;
  target_model?: string;
  started_at?: number | null;
}

/** 取任务状态。 */
export async function getStatus(jobId: string): Promise<StatusPayload> {
  const res = await fetch(`${BASE}/api/status/${jobId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`detect status ${res.status}`);
  return res.json();
}

/** 取完整报告 JSON(仅 done 后有效)。 */
export async function getReport(jobId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/api/result/${jobId}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`detect result ${res.status}`);
  return res.json();
}

/** 从报告里提取上游实际返回的模型(模型一致性检测器 details.response_model)+ 是否降级(model_match===false)。
 *  各协议检测器名不同(anthropic=consistency / gemini=model_info …),故按"哪个 details 带 response_model"通用取。
 *  modelDowngraded:null=没测到,false=测了且匹配,true=标称与实际不符(降级)。 */
export function extractActualModel(report: Record<string, unknown>): { actualModel: string | null; modelDowngraded: boolean | null } {
  const results = (report as { results?: Array<{ details?: { response_model?: unknown; model_match?: unknown } }> }).results ?? [];
  for (const r of results) {
    const rm = r.details?.response_model;
    if (typeof rm === "string" && rm) {
      return { actualModel: rm, modelDowngraded: r.details?.model_match === false };
    }
  }
  return { actualModel: null, modelDowngraded: null };
}

/** 未测通判定:没有任何检测项真正跑出 pass/fail(全是 error/skip,典型为 overall timeout)。
 *  这种是「没打通 / 我们没测到」,不是有效检测结果 —— 不该入库当 0 分、不该判「来源存疑」,应显示「—」。 */
export function isUntestedReport(report: Record<string, unknown>): boolean {
  const results = (report as { results?: Array<{ status?: unknown }> }).results ?? [];
  if (!results.length) return true;
  return !results.some((r) => r.status === "pass" || r.status === "fail");
}
