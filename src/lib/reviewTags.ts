// 评论标签:分「优点 / 缺点」两组采集,各组可自定义。自定义标签的极性 = 用户加入的那一组。
export const POS_SUGGESTED = ["速度快", "稳定", "不掺水", "纯度高", "价格实惠", "客服好", "文档全", "模型全", "充值方便"];
export const NEG_SUGGESTED = ["偶发限流", "不稳定", "疑似掺水", "疑似降智", "价格贵", "客服慢", "限制多"];
// 兼容旧导入:扁平建议标签(优点在前、缺点在后)
export const SUGGESTED_TAGS = [...POS_SUGGESTED, ...NEG_SUGGESTED];

const POS_TAGS = new Set(POS_SUGGESTED);
const NEG_TAGS = new Set(NEG_SUGGESTED);

/** 标签倾向:正面 / 负面 / 中性(仅按建议标签判定;自定义标签判不出,故旧数据里它们为中性)。 */
export function tagPolarity(tag: string): "pos" | "neg" | "neutral" {
  if (POS_TAGS.has(tag)) return "pos";
  if (NEG_TAGS.has(tag)) return "neg";
  return "neutral";
}

/** 旧数据兜底:老评论只有扁平 tags(无 pros/cons),按已知极性拆;自定义(中性)无从归类,丢弃。 */
export function splitLegacyTags(tags: string[]): { pros: string[]; cons: string[] } {
  const pros: string[] = [], cons: string[] = [];
  for (const t of tags) {
    const p = tagPolarity(t);
    if (p === "pos") pros.push(t);
    else if (p === "neg") cons.push(t);
  }
  return { pros, cons };
}

/** 规整用户提交的标签:去空白、去重、每个 ≤7 字、最多 6 个。 */
export function sanitizeTags(raw: string[]): string[] {
  const out: string[] = [];
  for (const t of raw) {
    const v = t.trim().slice(0, 7);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= 6) break;
  }
  return out;
}
