import { describe, it, expect } from "vitest";
import { stripLocked, LOCKABLE_STATION_FIELDS } from "./stationLock";

describe("stripLocked", () => {
  it("无锁时原样返回", () => {
    expect(stripLocked({ name: "a", description: "b" }, [])).toEqual({ name: "a", description: "b" });
    expect(stripLocked({ name: "a" }, null)).toEqual({ name: "a" });
  });

  it("剔除锁定字段,保留其余", () => {
    const out = stripLocked({ name: "新名", description: "新简介", logoUrl: "/x.png" }, ["description"]);
    expect(out).toEqual({ name: "新名", logoUrl: "/x.png" });
    expect("description" in out).toBe(false);
  });

  it("锁定多个字段", () => {
    const out = stripLocked({ name: "n", description: "d", logoUrl: "l" }, ["name", "logoUrl"]);
    expect(out).toEqual({ description: "d" });
  });

  it("不改原对象", () => {
    const src = { name: "n", description: "d" };
    stripLocked(src, ["name"]);
    expect(src).toEqual({ name: "n", description: "d" });
  });

  it("门面字段清单包含简介与 logo", () => {
    expect(LOCKABLE_STATION_FIELDS).toContain("description");
    expect(LOCKABLE_STATION_FIELDS).toContain("logoUrl");
  });
});
