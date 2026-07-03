import { test, expect } from "vitest";
import { TARGETS } from "./targets";

test("announcements extract 出 title/content,inject 合并 map", () => {
  const t = TARGETS.find((x) => x.model === "Station" && x.field === "announcements")!;
  if (t.kind !== "json") throw new Error("应是 json target");
  const units = t.extract({ announcements: [{ id: "a", title: "标题", content: "正文" }] });
  expect(units.map((u) => u.src).sort()).toEqual(["标题", "正文"]);
  const map = t.inject({}, [{ srcHash: units[0].srcHash, en: "X" }]);
  expect(Object.values(map)).toContain("X");
});

test("info extract 出 5 个子字段里非空的", () => {
  const t = TARGETS.find((x) => x.model === "Station" && x.field === "info")!;
  if (t.kind !== "json") throw new Error("应是 json target");
  const units = t.extract({ info: { payment: "支付宝", refund: "" } });
  expect(units.map((u) => u.src)).toEqual(["支付宝"]); // 空的 refund 被过滤
});

test("routes 只取 desc 非空的", () => {
  const t = TARGETS.find((x) => x.model === "Station" && x.field === "routes")!;
  if (t.kind !== "json") throw new Error("应是 json target");
  const units = t.extract({ routes: [{ name: "n", url: "u", desc: "说明" }, { name: "n2", url: "u2" }] });
  expect(units.map((u) => u.src)).toEqual(["说明"]);
});
