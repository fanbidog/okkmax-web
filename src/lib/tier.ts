export type Tier = "pureblood" | "downgrade" | "counterfeit";

export interface TierInfo {
  tier: Tier;
  label: string; // 中文档名
  sub: string; // 一句话解释
  color: "green" | "amber" | "red";
}

/**
 * 掺水三档判定 —— 全站唯一判档入口(所有渠道统一:Claude / gemini / gpt 同口径)。
 * 阈值:≥80 官方渠道 / 30–79 混合渠道 / <30 来源存疑。
 */
export function classifyTier(score: number): TierInfo {
  if (score >= 80) {
    return { tier: "pureblood", label: "官方渠道", sub: "加密签名交叉验证通过,行为与知识均符 —— 确认真实 Claude", color: "green" };
  }
  if (score >= 30) {
    return { tier: "downgrade", label: "混合渠道", sub: "真 Claude 行为,但加密签名未通过验证(伪造或缺失)/ 部分请求掺入非官方后端", color: "amber" };
  }
  return { tier: "counterfeit", label: "来源存疑", sub: "无有效签名 + 行为/知识不符,疑似替身模型冒充", color: "red" };
}
