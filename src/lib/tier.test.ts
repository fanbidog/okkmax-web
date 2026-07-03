import { describe, it, expect } from "vitest";
import { classifyTier } from "./tier";

describe("classifyTier", () => {
  it("≥80 → 官方渠道", () => {
    expect(classifyTier(99.2).tier).toBe("pureblood");
    expect(classifyTier(80).tier).toBe("pureblood");
  });
  it("30..79 → 混合渠道", () => {
    expect(classifyTier(36.4).tier).toBe("downgrade");
    expect(classifyTier(79.9).tier).toBe("downgrade");
    expect(classifyTier(30).tier).toBe("downgrade");
  });
  it("<30 → 来源存疑", () => {
    expect(classifyTier(29.9).tier).toBe("counterfeit");
    expect(classifyTier(0).tier).toBe("counterfeit");
  });
  it("带中文标签", () => {
    expect(classifyTier(99).label).toBe("官方渠道");
    expect(classifyTier(40).label).toBe("混合渠道");
    expect(classifyTier(10).label).toBe("来源存疑");
  });
});
