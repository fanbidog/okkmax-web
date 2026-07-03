"use client";
import { useEffect, useRef, useState } from "react";
import type { ProgressInfo } from "@/lib/detect-client";
import { patchHistory } from "@/lib/history";
import { Poster } from "./Poster";
import { useT } from "@/components/LocaleProvider";

/* ---------- 图标 ---------- */
const ICONS: Record<string, string> = {
  signature: '<path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z"/><path d="m9 12 2 2 4-4"/>',
  behavioral: '<path d="M3 12h3l2-7 4 16 3-9h6"/>',
  knowledge: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M19 3v16"/>',
  pdf: '<path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h6M8 17h5"/>',
  consistency: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  token: '<circle cx="12" cy="12" r="9"/><path d="M12 12 16 8"/><path d="M12 7v1M7 12h1M16 12h1"/>',
  message: '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  integrity: '<path d="m2 12 5 5 7-9"/><path d="m13 14 3 3 6-9"/>',
  protocol: '<path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/>',
  longctx: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/>',
  structured: '<path d="M8 4H6a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-2"/>',
  identity: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
  func: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
};
function Ic({ k, s = 18, sw = 1.7 }: { k: string; s?: number; sw?: number }) {
  return (
    <svg className="icon" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[k] ?? "" }} />
  );
}

/* ---------- 检测项元数据(图标 + tooltip 说明)---------- */
const DICON: Record<string, string> = {
  // Anthropic
  thinking_signature: "signature", behavioral_signature: "behavioral", knowledge: "knowledge",
  pdf: "pdf", consistency: "consistency", token_usage: "token", message_id: "message",
  integrity: "integrity", protocol: "protocol", long_context: "longctx",
  structured_output: "structured", identity: "identity",
  // OpenAI / Gemini(共享上面同名项:structured_output / integrity / protocol / long_context / token_usage)
  basic_request: "chat", model_consistency: "consistency", model_info: "consistency",
  function_calling: "func", token_billing: "token",
};
const EXP: Record<string, string> = {
  thinking_signature: "用数学题逼出模型的 thinking 推理块,校验其中 Anthropic 服务端的密码学签名。这是真伪最硬的铁证——套壳/伪装的模型给不出真签名。",
  behavioral_signature: "用一组探针测拒答风格、格式偏好、结构习惯等行为,比对真实 Claude 的行为指纹是否吻合。",
  knowledge: "问一组只有官方训练才答得准的事实(Anthropic CEO、总部、首个 Claude 发布年份等),错答说明非真模型。",
  pdf: "发一个内嵌唯一暗号的小 PDF,看中转站是否真把文档原样透传给后端模型识别——不透传说明中间动了手脚。",
  consistency: "同一问题连发多次,核对标称模型与实际返回模型是否一致、输出 token 数是否稳定(忽大忽小常是偷换模型)。",
  token_usage: "校验 usage 字段是否自洽、流式与非流式是否一致,防止中转站虚标 token、多收计费。",
  message_id: "检查响应里 message id 等标识是否符合官方格式规范。",
  integrity: "对比流式 vs 非流式两种输出是否一致、有无截断或丢内容。",
  protocol: "检查响应结构是否符合对应 API 的协议规范(必备字段、id 前缀、finish_reason 等)。",
  long_context: "大海捞针:塞入超长上下文 + 埋暗号,验证标称的上下文窗口是否真实(揪“标称 1M、实际截断”)。高成本可选项。",
  // OpenAI / Gemini 专有维度(integrity / protocol / long_context 沿用上面同名说明)
  basic_request: "最小探针:发一句话看中转站能否正常回包、finish_reason 是否正常,确认通路可用。",
  model_consistency: "同一问题连发多次,核对标称模型与实际返回模型是否一致、输出 token 数是否稳定(忽大忽小常是偷换模型)。",
  model_info: "核对响应里的模型字段是否与请求一致、响应结构是否规范,并连发多次看输出稳定性(防偷换路由)。",
  function_calling: "强制 tool_choice 调一个函数,检查响应是否返回合规 tool_calls(call_ 前缀、函数名、JSON 参数齐全)。",
  structured_output: "用 response_format=json_schema strict 要求严格 JSON 输出,验证中转站是否真的透传并实现了结构化输出参数。",
  token_billing: "校验 usage 字段是否自洽、长短 prompt 的 token 增量是否合理、流式与非流式是否一致,防止虚标 token 多收费。",
};
// 结果表只展示这 10 项(身份一致性/结构化输出恒为 skip,不进表;原始数据 tab 仍含全部)
const DISPLAY_ORDER = [
  "thinking_signature", "behavioral_signature", "knowledge", "pdf", "consistency",
  "token_usage", "message_id", "integrity", "protocol", "long_context",
];
// 维度名(等待页骨架要用,此时还没有 report)
const DIM_NAMES: Record<string, string> = {
  thinking_signature: "思维签名验证", behavioral_signature: "行为签名验证", knowledge: "知识准确度",
  pdf: "PDF 透传识别", consistency: "模型一致性", token_usage: "Token 用量", message_id: "消息标识规范",
  integrity: "响应完整性", protocol: "协议规范性", long_context: "长上下文真实性",
  structured_output: "结构化输出", identity: "身份一致性",
};

// 原始服务器响应 tab:Anthropic 全 12 项;OpenAI/Gemini 走 report.results 全量。
// 每项取 details 里最有代表性的原始字段;同名维度跨协议字段不同处给候选数组(取首个有值)。
const RAW_ORDER = [...DISPLAY_ORDER, "structured_output", "identity"];
const RAW_FIELD: Record<string, string | string[]> = {
  // Anthropic
  thinking_signature: "signature_prefix", behavioral_signature: "signatures", knowledge: "per_question",
  pdf: "response_text", consistency: "output_tokens_seq", token_usage: "sub_checks", message_id: "violations",
  integrity: ["sub_checks", "stream_text"], protocol: "issues", long_context: ["skip_reason", "summary"],
  structured_output: ["parsed", "reason"], identity: "reason",
  // OpenAI / Gemini 专有(同名维度沿用上面候选)
  basic_request: "response_text", model_consistency: "response_model", model_info: "response_model",
  function_calling: "sub_checks", token_billing: "sub_checks",
};
function rawVal(det?: DetResult): string {
  if (!det) return "—";
  const details = det.details ?? {};
  const spec = RAW_FIELD[det.name];
  const keys = spec == null ? [] : Array.isArray(spec) ? spec : [spec];
  for (const k of keys) {
    const v = details[k];
    if (v == null || v === "") continue; // 空串(如未检出签名时 signature_prefix:"")也算无值
    if (Array.isArray(v)) {
      if (!v.length) continue; // 空数组(violations:[] 等)无内容可展示,交给下方兜底,别编"均正常"
      return JSON.stringify(v);
    }
    return typeof v === "string" ? v : JSON.stringify(v);
  }
  return "—";
}

/* ---------- 类型 ---------- */
interface DetResult {
  name: string; display_name: string; status: string; score: number; summary?: string;
  details?: Record<string, unknown>;
}
interface Report {
  total_score: number; verdict: string; base_url?: string; target_model?: string;
  api_key_masked?: string; timestamp?: string; protocol?: string;
  run_error?: string | null; // 上游欠费/额度/模型不可用 → 整体检测无效,不按分数展示
  results: DetResult[];
  performance?: { ttft_ms?: number | null; total_latency_ms?: number | null; request_count?: number;
    usage?: { input_tokens?: number; output_tokens?: number } };
}
interface TierInfo { label: string; color: "green" | "amber" | "red" }
interface StationLite { slug: string; name: string; logoUrl: string | null }
interface Payload {
  status: "queued" | "running" | "done" | "error";
  error?: string; progress?: ProgressInfo; started_at?: number | null;
  base_url?: string; target_model?: string;
  tier?: TierInfo; report?: Report; station?: StationLite | null; logoData?: string | null;
}

/* ---------- 工具 ---------- */
const fmtS = (ms?: number | null) => (ms == null ? "—" : (ms / 1000).toFixed(1) + "s");
const fmtN = (n?: number) => (n == null ? "—" : n.toLocaleString("en-US"));
function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function siteOf(url?: string) {
  if (!url) return { host: "—", letter: "?" };
  try {
    const host = new URL(url).host.replace(/^www\./, "");
    return { host, letter: (host[0] || "?").toUpperCase() };
  } catch {
    return { host: url, letter: (url[0] || "?").toUpperCase() };
  }
}
const TONE: Record<TierInfo["color"], { tone: string; toneD: string; tone50: string; ring: [string, string] }> = {
  green: { tone: "#e0512b", toneD: "#c2410c", tone50: "rgba(224,81,43,.13)", ring: ["#f6a15c", "#cf4a22"] },
  amber: { tone: "#b45309", toneD: "#92400e", tone50: "rgba(180,83,9,.15)", ring: ["#e0b15c", "#b45309"] },
  red: { tone: "#c0392b", toneD: "#a02d22", tone50: "rgba(192,57,43,.15)", ring: ["#e08a7a", "#c0392b"] },
};

/* 站点身份块:收录站用真名/真 logo;无 logo 则留空(不用字母占位) */
function SiteBlock({ station, url, style }: { station?: StationLite | null; url?: string; style?: React.CSSProperties }) {
  const s = siteOf(url);
  return (
    <div className={"site" + (station?.logoUrl ? "" : " nologo")} style={style}>
      {station?.logoUrl ? <span className="lg"><img src={station.logoUrl} alt="" /></span> : null}
      <div style={style ? { textAlign: "left" } : undefined}>
        <div className="snm">{station?.name ?? s.host}</div>
        <div className="surl">{url}</div>
      </div>
    </div>
  );
}
/* 面包屑中段:收录站可点进档案,否则纯文本(不外链到中转站) */
function CrumbSite({ station, url, cur }: { station?: StationLite | null; url?: string; cur: string }) {
  const t = useT();
  const host = siteOf(url).host;
  return (
    <>
      <a href="/list">{t("站点")}</a><span className="sep"><Ic k="chev" s={13} /></span>
      {station ? <a href={`/station/${station.slug}`}>{station.name}</a>
        : <span style={{ color: "var(--ink3)" }}>{host}</span>}
      <span className="sep"><Ic k="chev" s={13} /></span><span className="cur">{cur}</span>
    </>
  );
}

/* ===================================================================== */
export function ResultView({ jobId }: { jobId: string }) {
  const t = useT();
  const [data, setData] = useState<Payload>({ status: "queued" });
  const [stuck, setStuck] = useState<{ label?: string } | null>(null);
  const [waitToken, setWaitToken] = useState(0); // 「继续等待」自增 → 重启轮询与计时

  useEffect(() => {
    let stop = false;
    let lastKey = "";
    let lastChange = Date.now();
    const start = Date.now();
    const STALL_MS = 90_000;  // 进度(完成项数)90 秒不推进 = 卡死
    const FUSE_MS = 240_000;  // 总时长保险丝(防两个信号都没触发)
    async function poll() {
      if (stop) return;
      try {
        const res = await fetch(`/api/result/${jobId}`, { cache: "no-store" });
        const d: Payload = await res.json();
        if (stop) return;
        setData(d);
        if (d.status === "done" || d.status === "error") return; // 终态,停轮询
        const now = Date.now();
        const key = `${d.status}:${d.progress?.done ?? 0}`;       // 状态或完成项数变化 = 「在动」
        if (key !== lastKey) { lastKey = key; lastChange = now; }
        const stalled = now - lastChange > STALL_MS;
        if (stalled || now - start > FUSE_MS) {
          const running = d.progress?.items?.find((i) => i.status === "running");
          setStuck({ label: stalled ? running?.display_name : undefined });
          return; // 判定卡死,停轮询
        }
        setTimeout(poll, 2000);
      } catch {
        if (!stop) setTimeout(poll, 3000);
      }
    }
    poll();
    return () => { stop = true; };
  }, [jobId, waitToken]);

  // 检测完成后,把评分/档位/站名/logo 回填进本地历史(若该 jobId 由本机发起)
  useEffect(() => {
    if (data.status !== "done" || !data.report) return;
    patchHistory(jobId, {
      score: Math.round(data.report.total_score ?? 0),
      tierColor: data.tier?.color,
      stationName: data.station?.name,
      stationLogo: data.station?.logoUrl ?? null,
    });
  }, [data.status, jobId, data.report, data.tier, data.station]);

  if (data.status === "error") {
    return (
      <div className="res">
        <div className="panel err">
          <div className="t">{t("检测失败")}</div>
          <div className="d">{data.error || t("未知错误")}</div>
        </div>
      </div>
    );
  }

  if (stuck && data.status !== "done") {
    return <TimeoutView stuck={stuck} onWait={() => { setStuck(null); setWaitToken((t) => t + 1); }} />;
  }

  if (data.status !== "done" || !data.report) {
    return <LoadingView data={data} />;
  }

  return <ReportView report={data.report} tier={data.tier} station={data.station} logoData={data.logoData} />;
}

/* ---------- 超时/卡死面板 ---------- */
function TimeoutView({ stuck, onWait }: { stuck: { label?: string }; onWait: () => void }) {
  const t = useT();
  const title = stuck.label ? `${t("检测卡在「")}${t(stuck.label)}${t("」")}` : t("检测超时");
  const desc = stuck.label
    ? t("这一项已 90 秒没有响应,通常是该中转站对该检测项无回应或线路拥堵。你可以继续等,或回首页重新发起。")
    : t("检测超过 4 分钟仍未完成,可能是该中转站响应过慢、排队拥堵或暂时不可用。你可以继续等,或回首页重新发起。");
  return (
    <div className="res">
      <div className="panel timeout">
        <div className="to-ic">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </div>
        <div className="t">{title}</div>
        <div className="d">{desc}</div>
        <div className="btns">
          <button type="button" className="b-wait" onClick={onWait}>{t("继续等待")}</button>
          <a className="b-home" href="/">{t("返回首页重新检测")}</a>
        </div>
      </div>
      <div className="foot">{t("检测过程不会保存你的 API Key")}</div>
    </div>
  );
}

/* ---------- 等待页(填充式骨架,布局即结果页;done 时整体换成 ReportView)---------- */
function LoadingView({ data }: { data: Payload }) {
  const t = useT();
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  if (data.started_at && startedRef.current == null) startedRef.current = data.started_at;

  useEffect(() => {
    const id = setInterval(() => {
      const s = startedRef.current;
      if (s) setElapsed(Date.now() / 1000 - s);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const R = 60, C = 2 * Math.PI * R;
  const sk = (w: number, h = 14) => <span className="sk" style={{ width: w, height: h }} />;
  const METRIC_LABELS = ["首字延迟", "总耗时", "输入 tokens", "输出 tokens", "检测请求数"];

  return (
    <div className="res">
      <div className="topbar">
        <nav className="crumb"><CrumbSite station={data.station} url={data.base_url} cur={t("检测中")} /></nav>
        <div className="acts">
          <button className="btn" type="button" disabled><Ic k="image" s={16} />{t("分享海报")}</button>
          <button className="btn" type="button" disabled><Ic k="link" s={16} />{t("分享链接")}</button>
        </div>
      </div>

      <div className="panel head">
        <div className="sgauge">
          <svg width={132} height={132} viewBox="0 0 158 158">
            <defs><linearGradient id="ldg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6a15c" /><stop offset="1" stopColor="#cf4a22" /></linearGradient></defs>
            <circle cx={79} cy={79} r={R} fill="none" stroke="var(--bg2)" strokeWidth={13} />
            <circle className="arc" cx={79} cy={79} r={R} fill="none" stroke="url(#ldg)" strokeWidth={13} strokeLinecap="round" strokeDasharray={`${C * 0.3} ${C}`} />
          </svg>
          <div className="c"><div className="m" style={{ fontSize: 12 }}>{t("检测中")}</div></div>
        </div>
        <div className="hmain">
          <div className="tier"><span className="wstat">{t("正在检测中,已用时")} {Math.floor(elapsed)} {t("秒,预计用时约 30 秒")}</span></div>
          <SiteBlock station={data.station} url={data.base_url} />
        </div>
        <div className="hkv">
          <div className="r"><span className="k">{t("检测时间")}</span><span className="v">{sk(120)}</span></div>
          <div className="r"><span className="k">{t("检测模型")}</span><span className="v">{data.target_model ?? sk(120)}</span></div>
          <div className="r"><span className="k">API Key</span><span className="v">{sk(96)}</span></div>
        </div>
      </div>

      <div className="panel metrics">
        {METRIC_LABELS.map((l) => (<div className="m" key={l}><div className="l">{t(l)}</div><div className="v">{sk(54)}</div></div>))}
      </div>

      <div className="subtabs"><span className="tab on">{t("检测报告")}</span><span className="tab dis">{t("原始数据")}</span></div>

      <div className="panel tbl">
        <div className="thead"><span className="c-dim">{t("检测维度")}</span><span className="c-ct"><span className="ctv">{t("检测内容")}</span></span><span className="c-sc">{t("得分")}</span></div>
        {DISPLAY_ORDER.map((name) => (
          <div className="trow" key={name}>
            <span className="dim"><span className="ico"><Ic k={DICON[name]} s={19} /></span>{t(DIM_NAMES[name])}</span>
            <span className="ct">{sk(180)}</span>
            <span className="sc">{sk(46, 16)}</span>
          </div>
        ))}
      </div>
      <div className="foot">{t("检测过程不会保存你的 API Key")}</div>
    </div>
  );
}

/* ---------- 结果页 ---------- */
function ReportView({ report, tier, station, logoData }: { report: Report; tier?: TierInfo; station?: StationLite | null; logoData?: string | null }) {
  const tr = useT();
  const [tab, setTab] = useState<"report" | "raw">("report");
  const [copied, setCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const t = TONE[tier?.color ?? "green"];
  const score = Math.round(report.total_score ?? 0);
  const perf = report.performance ?? {};
  const usage = perf.usage ?? {};

  // 数据驱动:Anthropic 用 12 项固定顺序(身份/结构化恒 skip 不进报告表);
  // OpenAI/Gemini 直接渲染各自 report.results,有几项检测就显示几项。
  const proto = report.protocol ?? "anthropic";
  const rowsByName = new Map(report.results.map((r) => [r.name, r]));
  const pick = (order: string[]) => order.map((n) => rowsByName.get(n)).filter(Boolean) as DetResult[];
  const reportRows = proto === "anthropic" ? pick(DISPLAY_ORDER) : report.results;
  const rawRows = proto === "anthropic" ? pick(RAW_ORDER) : report.results;

  const R = 60, C = 2 * Math.PI * R, off = C * (1 - score / 100);
  const toneStyle = { ["--tone" as string]: t.tone, ["--tone-d" as string]: t.toneD, ["--tone-50" as string]: t.tone50 } as React.CSSProperties;

  const metrics: [string, string][] = [
    [tr("首字延迟"), fmtS(perf.ttft_ms)],
    [tr("总耗时"), fmtS(perf.total_latency_ms)],
    [tr("输入 tokens"), fmtN(usage.input_tokens)],
    [tr("输出 tokens"), fmtN(usage.output_tokens)],
    [tr("检测请求数"), perf.request_count != null ? String(perf.request_count) : "—"],
  ];

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  }
  async function copyJson() {
    try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setJsonCopied(true); setTimeout(() => setJsonCopied(false), 1600); } catch {}
  }

  // 二维码(指向当前结果页)
  useEffect(() => {
    import("qrcode").then((QR) =>
      QR.toDataURL(window.location.href, { margin: 0, width: 256, color: { dark: "#1d1d1f", light: "#ffffff" } }).then(setQr).catch(() => {}),
    );
  }, []);

  // 点击 → 把离屏海报 DOM 截成 PNG 下载
  async function downloadPoster() {
    if (!posterRef.current || making) return;
    setMaking(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(posterRef.current, { pixelRatio: 2, cacheBust: true, width: 1080, height: 1350 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `OkkMax-${siteOf(report.base_url).host}-${tr("检测报告")}.png`;
      a.click();
    } catch (e) {
      console.error("poster failed", e);
      alert(tr("海报生成失败,请重试"));
    } finally {
      setMaking(false);
    }
  }
  const posterChecks = reportRows.map((r) => ({ name: r.display_name, skip: r.status === "skip", score: r.score }));

  // 上游欠费/额度/模型不可用 → 整体检测无效:不展示分数与检测项(避免"欠费还显示通过"),只给明确说明
  if (report.run_error) {
    return (
      <div className="res">
        <div className="topbar">
          <nav className="crumb"><CrumbSite station={station} url={report.base_url} cur={tr("检测报告")} /></nav>
        </div>
        <div className="panel err">
          <div className="t">{tr("检测无效")}</div>
          <div className="d">{tr(report.run_error)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="res" style={toneStyle}>
      <div className="topbar">
        <nav className="crumb"><CrumbSite station={station} url={report.base_url} cur={tab === "raw" ? tr("原始服务器响应") : tr("检测报告")} /></nav>
        <div className="acts">
          <button className="btn" type="button" onClick={downloadPoster} disabled={making}><Ic k="image" s={16} />{making ? tr("生成中…") : tr("分享海报")}</button>
          <button className="btn" type="button" onClick={copyLink}><Ic k="link" s={16} />{copied ? tr("已复制") : tr("分享链接")}</button>
        </div>
      </div>

      {/* 头部卡 */}
      <div className="panel head">
        <div className="sgauge">
          <svg width={132} height={132} viewBox="0 0 158 158">
            <defs>
              <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={t.ring[0]} /><stop offset="1" stopColor={t.ring[1]} />
              </linearGradient>
            </defs>
            <circle cx={79} cy={79} r={R} fill="none" stroke="var(--bg2)" strokeWidth={13} />
            <circle cx={79} cy={79} r={R} fill="none" stroke="url(#ringg)" strokeWidth={13} strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 79 79)" />
          </svg>
          <div className="c"><div className="n">{score}</div><div className="m">/ 100</div></div>
        </div>
        <div className="hmain">
          <div className="tier"><span className="badge"><Ic k="signature" s={26} /></span><span className="tn">{tier?.label ? tr(tier.label) : tr("检测完成")}</span></div>
          <SiteBlock station={station} url={report.base_url} />
        </div>
        <div className="hkv">
          <div className="r"><span className="k">{tr("检测时间")}</span><span className="v">{fmtTime(report.timestamp)}</span></div>
          <div className="r"><span className="k">{tr("检测模型")}</span><span className="v">{report.target_model ?? "—"}</span></div>
          <div className="r"><span className="k">API Key</span><span className="v mono">{report.api_key_masked ?? "—"}</span></div>
        </div>
      </div>

      {/* 指标行 */}
      <div className="panel metrics">
        {metrics.map(([l, v]) => (<div className="m" key={l}><div className="l">{l}</div><div className="v">{v}</div></div>))}
      </div>

      {/* 视图切换 */}
      <div className="subtabs">
        <span className={`tab ${tab === "report" ? "on" : ""}`} onClick={() => setTab("report")}>{tr("检测报告")}</span>
        <span className={`tab ${tab === "raw" ? "on" : ""}`} onClick={() => setTab("raw")}>{tr("原始服务器响应")}</span>
        {tab === "raw" && <button className="rawcopy" type="button" onClick={copyJson}><Ic k="copy" s={14} sw={1.8} />{jsonCopied ? tr("已复制") : tr("复制 JSON")}</button>}
      </div>

      {tab === "report" ? (
        <div className="panel tbl">
          <div className="thead">
            <span className="c-dim">{tr("检测维度")}</span>
            <span className="c-ct"><span className="ctv">{tr("检测内容")}</span></span>
            <span className="c-sc">{tr("得分")}</span>
          </div>
          {reportRows.map((r) => {
            const skip = r.status === "skip";
            const fail = r.status === "fail";
            const err = r.status === "error";
            const exp = EXP[r.name];
            return (
              <div className={`trow ${skip ? "skip" : ""}`} key={r.name}>
                <span className="dim">
                  <span className="ico"><Ic k={DICON[r.name]} s={19} /></span>
                  {exp
                    ? <span className="u">{tr(r.display_name)}<span className="tip">{tr(exp)}</span></span>
                    : <span>{tr(r.display_name)}</span>}
                </span>
                <span className="ct"><span className="ctv">{(() => { const s = r.summary || (typeof r.details?.summary === "string" ? r.details.summary : ""); return s ? tr(s) : (skip ? tr("未检测") : err ? tr("检测出错") : fail ? tr("未通过") : tr("通过")); })()}</span></span>
                <span className={`sc ${skip ? "muted" : ""}`}>
                  {skip ? "—" : <b className={fail || err ? "fail" : ""}>{Math.round(r.score)}</b>}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel tbl">
          <div className="thead">
            <span className="c-dim">{tr("检测维度")}</span>
            <span className="rawcth">{tr("原始响应值")}</span>
          </div>
          {rawRows.map((det) => {
            const skip = det.status === "skip";
            return (
              <div className={`trow rawrow ${skip ? "skip" : ""}`} key={det.name}>
                <span className="dim"><span className="ico"><Ic k={DICON[det.name]} s={19} /></span>{tr(det.display_name)}</span>
                <span className="rawct">{tr(rawVal(det))}</span>
              </div>
            );
          })}
        </div>
      )}

      {station ? (
        <div className="panel rec">
          <span className="ico"><Ic k="protocol" s={18} /></span>
          <span className="t"><b>{tr("该站已被 OkkMax 收录")}</b> —— {tr("含长期在线率、速度、历史纯度趋势")}</span>
          <a href={`/station/${station.slug}`}>{tr("查看完整档案 →")}</a>
        </div>
      ) : (
        <div className="panel rec">
          <span className="ico"><Ic k="protocol" s={18} /></span>
          <span className="t">{tr("该站尚未被 OkkMax 收录")}</span>
          <a href="/submit">{tr("提交收录 →")}</a>
        </div>
      )}
      <div className="foot">{tr("本站仅提供中转站 API 的自动化真伪与质量检测,结果可能因中转站策略调整、网络波动或检测覆盖有限而出现偏差或错误,仅供参考。检测不代表对任何中转站的推荐或背书,请以你自己的实际使用体验为准。")}</div>

      {/* 离屏海报(供「分享海报」截图;用户不可见) */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        <Poster
          innerRef={posterRef}
          score={score}
          tierLabel={tier?.label ? tr(tier.label) : tr("检测完成")}
          tone={t.tone}
          ring={t.ring}
          siteName={station?.name ?? siteOf(report.base_url).host}
          siteUrl={report.base_url ?? ""}
          logoData={logoData ?? null}
          model={report.target_model ?? "—"}
          time={fmtTime(report.timestamp)}
          metrics={metrics.slice(0, 4)}
          checks={posterChecks}
          qr={qr}
        />
      </div>
    </div>
  );
}
