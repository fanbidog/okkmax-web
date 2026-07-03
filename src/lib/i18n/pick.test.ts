import { test, expect } from "vitest";
import { pick, pickJson } from "./pick";
import { sha } from "./hash";

test("pick:en 有译文用译文,缺则回落中文;zh 永远中文", () => {
  expect(pick({ description: "中", description_en: "EN" }, "description", "en")).toBe("EN");
  expect(pick({ description: "中", description_en: null }, "description", "en")).toBe("中");
  expect(pick({ description: "中", description_en: "EN" }, "description", "zh")).toBe("中");
  expect(pick(null, "description", "en")).toBeUndefined();
});

test("pickJson:按源 hash 查 map,缺则回落原文;zh 永远原文", () => {
  const m = { [sha("标题")]: "Title" };
  expect(pickJson(m, "标题", "en")).toBe("Title");
  expect(pickJson(m, "未翻", "en")).toBe("未翻");
  expect(pickJson(m, "标题", "zh")).toBe("标题");
  expect(pickJson(null, "标题", "en")).toBe("标题");
});
