import { test, expect } from "vitest";
import { sha } from "./hash";

test("sha 稳定且对首尾空白归一", () => {
  expect(sha("  你好 ")).toBe(sha("你好"));
  expect(sha("你好")).not.toBe(sha("你好世界"));
  expect(sha("你好")).toHaveLength(16);
});
