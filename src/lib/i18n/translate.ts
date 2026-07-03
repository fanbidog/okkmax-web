import { protect, unprotect } from "./sensitive";
export type TransUnit = { src: string };
export type TransResult = { ok: true; en: string } | { ok: false; error: string };
export interface Translator { translateBatch(units: TransUnit[]): Promise<TransResult[]>; }

const CJK = /[一-鿿]/;
const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const MAX_Q = 100; // Google v2 单请求 q 段数保守上限,超了分块

export class GoogleV2Translator implements Translator {
  private chars = 0;
  constructor(private cfg: { apiKey: string; fetch?: typeof fetch; maxLenRatio?: number }) {}
  charsUsed() { return this.chars; }

  /** 调 Google,把 q[] 分块请求,返回 translatedText[](保序);任一块失败抛错。 */
  private async callGoogle(q: string[]): Promise<string[]> {
    const f = this.cfg.fetch ?? fetch;
    const out: string[] = [];
    for (let i = 0; i < q.length; i += MAX_Q) {
      const res = await f(`${ENDPOINT}?key=${this.cfg.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: q.slice(i, i + MAX_Q), target: "en", format: "html" }),
      });
      if (!res.ok) throw new Error(`http ${res.status}`);
      for (const t of (await res.json()).data.translations) out.push(t.translatedText);
    }
    return out;
  }

  async translateBatch(units: TransUnit[]): Promise<TransResult[]> {
    // 1) 每个 unit 按 \n 拆行;非空行作为待翻 segment。
    //    多行字段(markdown 帮助文 / 多行步骤)逐行翻、空行保留,拼回后结构不塌;单行字段=1 段,行为不变。
    const perUnitLines = units.map((u) => u.src.split("\n"));
    const segs: { ui: number; li: number; text: string }[] = [];
    perUnitLines.forEach((lines, ui) => lines.forEach((l, li) => { if (l.trim()) segs.push({ ui, li, text: l }); }));
    this.chars += segs.reduce((a, s) => a + s.text.length, 0);

    // 2) 翻所有 segment(分块、保序)
    let translated: string[];
    try {
      translated = segs.length ? await this.callGoogle(segs.map((s) => protect(s.text).html)) : [];
    } catch (e) {
      return units.map(() => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    }

    // 3) 回填到各 unit 的行(空行原样保留),用 \n 拼回
    const enLines = perUnitLines.map((lines) => [...lines]);
    segs.forEach((s, i) => { enLines[s.ui][s.li] = unprotect(translated[i] ?? ""); });

    // 4) 逐 unit 校验(无人润色的兜底)
    return units.map((u, ui) => {
      const en = enLines[ui].join("\n");
      if (!en.trim()) return { ok: false, error: "empty" };
      if (CJK.test(en)) return { ok: false, error: "residual-cjk" };
      // 长度比仅对「够长的源文」生效:中文极密,短中文译英文天然 6-10 倍属正常,只对 substantial 文本防离谱输出。
      const ratio = en.length / Math.max(1, u.src.length);
      if (u.src.length >= 12 && ratio > (this.cfg.maxLenRatio ?? 8)) return { ok: false, error: "len-ratio" };
      return { ok: true, en };
    });
  }
}
