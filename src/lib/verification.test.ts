import { test, expect } from "vitest";
import { genCode, genResetToken, hashToken } from "./verification";

test("genCode 是 6 位数字", () => {
  for (let i = 0; i < 200; i++) {
    const c = genCode();
    expect(c).toMatch(/^\d{6}$/);
  }
});

test("genResetToken 64 位 hex 且每次不同", () => {
  const a = genResetToken(), b = genResetToken();
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  expect(a).not.toBe(b);
});

test("hashToken 稳定且不同输入不同", () => {
  expect(hashToken("123456")).toBe(hashToken("123456"));
  expect(hashToken("123456")).not.toBe(hashToken("123457"));
  expect(hashToken("x")).toHaveLength(64);
});
