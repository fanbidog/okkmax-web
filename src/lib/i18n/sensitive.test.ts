import { test, expect } from "vitest";
import { protect, unprotect } from "./sensitive";

test("品牌/模型名/URL 被包进 translate=no,& 被转义", () => {
  const { html } = protect("用 OkkMax 测 gemini-3.5-flash 见 https://x.com 和 A&B");
  expect(html).toContain('<span translate="no">OkkMax</span>');
  expect(html).toContain('<span translate="no">gemini-3.5-flash</span>');
  expect(html).toContain('<span translate="no">https://x.com</span>');
  expect(html).toContain("A&amp;B");
});

test("unprotect 拆 span + 反转义还原纯文本", () => {
  const en = unprotect('Use <span translate="no">OkkMax</span> &amp; go');
  expect(en).toBe("Use OkkMax & go");
});

test("unprotect 解码 Google 输出的引号实体(&quot; / &#39;)", () => {
  expect(unprotect('the &quot;fast&quot; one')).toBe('the "fast" one');
  expect(unprotect("don&#39;t &amp; can&#039;t")).toBe("don't & can't");
  expect(unprotect("say &#34;hi&#34;")).toBe('say "hi"');
});
