import { test, expect, vi } from "vitest";
import { GoogleV2Translator } from "./translate";

test("成功:拆 span、反转义、计字符", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    data: { translations: [{ translatedText: 'Use <span translate="no">OkkMax</span>' }] } }) });
  const t = new GoogleV2Translator({ apiKey: "k", fetch: fetchMock });
  const [r] = await t.translateBatch([{ src: "用 OkkMax" }]);
  expect(r).toEqual({ ok: true, en: "Use OkkMax" });
});

test("校验失败:输出仍含中文 → ok:false", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    data: { translations: [{ translatedText: "未翻 中文" }] } }) });
  const t = new GoogleV2Translator({ apiKey: "k", fetch: fetchMock });
  const [r] = await t.translateBatch([{ src: "中文" }]);
  expect(r.ok).toBe(false);
});

test("多行字段逐行翻 + \\n 拼回,空行保留(markdown/步骤保结构)", async () => {
  // 源文 "## 标题\n\n正文行" → 2 个非空行送翻,空行原样保留
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    data: { translations: [{ translatedText: "## Title" }, { translatedText: "Body line" }] } }) });
  const t = new GoogleV2Translator({ apiKey: "k", fetch: fetchMock });
  const [r] = await t.translateBatch([{ src: "## 标题\n\n正文行" }]);
  expect(r).toEqual({ ok: true, en: "## Title\n\nBody line" });
});

test("http 错误码原样带出(http 429,非 Error: 前缀)", async () => {
  const t = new GoogleV2Translator({ apiKey: "k", fetch: vi.fn().mockResolvedValue({ ok: false, status: 429 }) });
  const [r] = await t.translateBatch([{ src: "甲" }]);
  expect(r).toEqual({ ok: false, error: "http 429" });
});

test("len-ratio:长源离谱输出拦下,但短中文(<12字)豁免", async () => {
  const mk = (en: string) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { translations: [{ translatedText: en }] } }) });
  // 长源(16字)译出 200 字 → ratio 12.5 > 8 → 拦
  const long = await new GoogleV2Translator({ apiKey: "k", fetch: mk("x".repeat(200)) }).translateBatch([{ src: "一二三四五六七八九十一二三四五六" }]);
  expect(long[0]).toEqual({ ok: false, error: "len-ratio" });
  // 短源(10字)译出 70 字 → ratio 7 但 <12字豁免 → 通过
  const short = await new GoogleV2Translator({ apiKey: "k", fetch: mk("y".repeat(70)) }).translateBatch([{ src: "大陆发票补开即将关闭" }]);
  expect(short[0].ok).toBe(true);
});
