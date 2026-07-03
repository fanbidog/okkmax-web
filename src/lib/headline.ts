/** 首页/详情页通用的「常用模型」pill 列表。 */
export const HEADLINE: { label: string; id: string; new?: boolean }[] = [
  { label: "Fable 5", id: "claude-fable-5", new: true },
  { label: "Opus 4.8", id: "claude-opus-4-8" }, { label: "Opus 4.7", id: "claude-opus-4-7" },
  { label: "Opus 4.6", id: "claude-opus-4-6" },
  { label: "Sonnet 5", id: "claude-sonnet-5", new: true }, { label: "Sonnet 4.6", id: "claude-sonnet-4-6" },
  { label: "GPT 5.5", id: "gpt-5.5" }, { label: "GPT 5.4", id: "gpt-5.4" },
  { label: "Gemini 3.1 Pro", id: "gemini-3.1-pro-preview" },
];

// 厂商前缀 → 展示词:claude 省略(说「Opus」不说「Claude Opus」,和 pills 一致),其余保留
const VENDOR_LABEL: Record<string, string> = {
  claude: "", anthropic: "", gpt: "GPT", chatgpt: "GPT", openai: "GPT", o1: "o1", o3: "o3", o4: "o4",
  gemini: "Gemini", deepseek: "DeepSeek", glm: "GLM", kimi: "Kimi", qwen: "Qwen", minimax: "MiniMax",
  mimo: "Mimo", grok: "Grok", llama: "Llama", mistral: "Mistral",
};
// 常见词大小写规范
const NAME_CAP: Record<string, string> = {
  sonnet: "Sonnet", opus: "Opus", haiku: "Haiku", pro: "Pro", flash: "Flash", lite: "Lite", mini: "Mini",
  nano: "Nano", codex: "Codex", max: "Max", image: "Image", preview: "Preview", exp: "Exp",
  customtools: "CustomTools", turbo: "Turbo", plus: "Plus", air: "Air", thinking: "Thinking",
};

/** 把原始 model id 转成人类友好名:优先用 HEADLINE 里的 label,否则按厂商/版本/日期规则美化。 */
export function prettyModel(id: string): string {
  const h = HEADLINE.find((x) => x.id === id);
  if (h) return h.label;
  let toks = id.split("-");
  let vendor = "";
  if (toks.length && Object.prototype.hasOwnProperty.call(VENDOR_LABEL, toks[0].toLowerCase())) {
    vendor = VENDOR_LABEL[toks[0].toLowerCase()];
    toks = toks.slice(1);
  }
  let date = "";
  if (toks.length && /^\d{8}$/.test(toks[toks.length - 1])) {
    const d = toks.pop()!;
    date = ` (${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)})`;
  }
  const parts: string[] = [];
  let numRun: string[] = [];
  const flush = () => { if (numRun.length) { parts.push(numRun.join(".")); numRun = []; } };
  for (const tk of toks) {
    if (/^\d+$/.test(tk)) { numRun.push(tk); continue; }   // 纯整数 → 版本段,相邻的用「.」拼
    flush();
    if (/^\d+\.\d+$/.test(tk)) parts.push(tk);             // 已带小数点(5.1 / 2.5)直接用
    else parts.push(NAME_CAP[tk.toLowerCase()] ?? (tk.charAt(0).toUpperCase() + tk.slice(1)));
  }
  flush();
  const body = [vendor, parts.join(" ")].filter(Boolean).join(" ").trim();
  return (body || id) + date;
}
