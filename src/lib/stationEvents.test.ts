import { describe, it, expect } from "vitest";
import { computeStationEvents, type PrevChannel, type NextChannel } from "./stationEvents";

const ch = (name: string, p: Partial<NextChannel> = {}): NextChannel =>
  ({ name, models: ["m1"], prices: { m1: 10 }, delisted: false, ...p });
const prevCh = (name: string, p: Partial<PrevChannel> = {}): PrevChannel =>
  ({ name, models: ["m1"], prices: { m1: 10 }, delistedAt: null, ...p });

describe("computeStationEvents", () => {
  it("首次收录(站点不存在)→ 只发 listed,不发其它", () => {
    const evs = computeStationEvents([], [ch("cc"), ch("codex")], false);
    expect(evs).toEqual([{ type: "listed", channel: null, data: null }]);
  });

  it("无变化 → 不发事件(幂等)", () => {
    const evs = computeStationEvents([prevCh("cc")], [ch("cc")], true);
    expect(evs).toEqual([]);
  });

  it("新分组 → group_add", () => {
    const evs = computeStationEvents([prevCh("cc")], [ch("cc"), ch("new", { models: ["a", "b"] })], true);
    expect(evs).toContainEqual({ type: "group_add", channel: "new", data: { modelCount: 2 } });
  });

  it("下架 / 恢复 按 delisted 转变", () => {
    expect(computeStationEvents([prevCh("cc")], [ch("cc", { delisted: true })], true))
      .toContainEqual({ type: "group_delist", channel: "cc", data: null });
    expect(computeStationEvents([prevCh("cc", { delistedAt: new Date() })], [ch("cc")], true))
      .toContainEqual({ type: "group_relist", channel: "cc", data: null });
  });

  it("价格降 ≥5% → price 事件(带 more 计数)", () => {
    const prev = [prevCh("cc", { models: ["a", "b"], prices: { a: 10, b: 8 } })];
    const next = [ch("cc", { models: ["a", "b"], prices: { a: 7, b: 6 } })];
    const evs = computeStationEvents(prev, next, true);
    const pe = evs.find((e) => e.type === "price");
    expect(pe).toBeTruthy();
    expect(pe!.data).toMatchObject({ model: "a", oldIn: 10, newIn: 7, more: 1 });
  });

  it("价格变 <5% → 不发", () => {
    const prev = [prevCh("cc", { prices: { m1: 10 } })];
    const next = [ch("cc", { prices: { m1: 9.8 } })];
    expect(computeStationEvents(prev, next, true).some((e) => e.type === "price")).toBe(false);
  });

  it("价格变 >300%(脏数据/首次校准如 1.749315→75)→ 不发", () => {
    const prev = [prevCh("cc", { prices: { m1: 1.749315 } })];
    const next = [ch("cc", { prices: { m1: 75 } })];
    expect(computeStationEvents(prev, next, true).some((e) => e.type === "price")).toBe(false);
  });

  it("models 抖空(next 空)→ 不发假的 price/model 事件", () => {
    const prev = [prevCh("cc", { models: ["a", "b"], prices: { a: 10 } })];
    const next = [ch("cc", { models: [], prices: {}, delisted: true })];
    const evs = computeStationEvents(prev, next, true);
    expect(evs.some((e) => e.type === "model" || e.type === "price")).toBe(false);
    expect(evs).toContainEqual({ type: "group_delist", channel: "cc", data: null });
  });

  it("模型增减 → model 事件", () => {
    const prev = [prevCh("cc", { models: ["a", "b"] })];
    const next = [ch("cc", { models: ["a", "c"] })];
    expect(computeStationEvents(prev, next, true))
      .toContainEqual({ type: "model", channel: "cc", data: { added: ["c"], removed: ["b"] } });
  });
});

import { tierEventDraft, formatEvent } from "./stationEvents";

describe("tierEventDraft", () => {
  it("首次(from null)或没变 → null", () => {
    expect(tierEventDraft(null, "pureblood")).toBeNull();
    expect(tierEventDraft("downgrade", "downgrade")).toBeNull();
  });
  it("变化 → tier 事件", () => {
    expect(tierEventDraft("downgrade", "pureblood")).toEqual({ type: "tier", channel: null, data: { from: "downgrade", to: "pureblood" } });
  });
});

describe("formatEvent(自然句,无内部系统名)", () => {
  const f = (type: any, channel: any, data: any) => formatEvent({ type, channel, data });
  it("各类文案", () => {
    expect(f("listed", null, null)).toBe("站点已收录");
    expect(f("group_add", "cc", { modelCount: 6 })).toBe("cc 分组上架,含 6 个模型");
    expect(f("group_delist", "aws-q", null)).toBe("aws-q 分组下架(暂无可用模型)");
    expect(f("group_relist", "cc", null)).toBe("cc 分组恢复");
    expect(f("price", "cc", { model: "claude-opus-4-8", oldIn: 10, newIn: 7.7, more: 2 })).toBe("claude-opus-4-8 降价至 7.7 元/M(原 10),另 2 项");
    expect(f("price", "cc", { model: "m", oldIn: 5, newIn: 6, more: 0 })).toBe("m 涨价至 6 元/M(原 5)");
    expect(f("tier", null, { from: "downgrade", to: "pureblood" })).toBe("纯度升级为官方渠道(原混合渠道)");
    expect(f("tier", null, { from: "pureblood", to: "downgrade" })).toBe("纯度降级为混合渠道(原官方渠道)");
    expect(f("model", "cc", { added: ["gpt-5.5"], removed: [] })).toBe("cc 分组新增 gpt-5.5");
  });
  it("不含内部系统名", () => {
    const s = f("group_delist", "aws-q", null) + f("tier", null, { from: "downgrade", to: "pureblood" });
    expect(s).not.toMatch(/distributor|_BASE_URL/i); // 展示文案不得出现内部系统词
  });
});
