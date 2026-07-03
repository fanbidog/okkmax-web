/** 展示用:从一组模型里挑一个代表模型(厂商内最高档优先),与 src/lib/headline.ts 的 HEADLINE 对齐。 */
export interface Flagship {
  model: string;
  vendor: "claude" | "openai" | "google";
  service: "cc" | "cx" | "gm";
}

// 代表模型优先级(高→低)。
const PRIORITY: Flagship[] = [
  { model: "claude-opus-4-8", vendor: "claude", service: "cc" },
  { model: "claude-opus-4-7", vendor: "claude", service: "cc" },
  { model: "claude-fable-5", vendor: "claude", service: "cc" },
  { model: "claude-sonnet-5", vendor: "claude", service: "cc" },
  { model: "claude-sonnet-4-6", vendor: "claude", service: "cc" },
  { model: "gpt-5.5", vendor: "openai", service: "cx" },
  { model: "gpt-5.4", vendor: "openai", service: "cx" },
  { model: "gemini-3.1-pro-preview", vendor: "google", service: "gm" },
];

/** 给一组的模型 ID 列表,返回挑中的代表模型;没有任何 headline 则 null。 */
export function pickFlagship(models: string[]): Flagship | null {
  const set = new Set(models.map((m) => m.trim()));
  for (const p of PRIORITY) {
    if (set.has(p.model)) return p;
  }
  return null;
}
