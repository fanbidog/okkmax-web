// 活动页(/activity)数据契约。
// - View 类型:页面传给 PromoBoard 的形状(结构化字段供真筛选;endsAt 为 ISO 或 null;dead 已算好)。
// - SEED_*:初始测试数据(DB 形状),由 scripts/seed-activity.ts 灌库。真数据走后台录入。

export type FreeApiView = {
  id: string;
  model: string;
  provider: string;
  logoUrl: string; // 真 logo;空则前台用首字母兜底
  context: string;
  maxOutput: string;
  bindCard: string; // 免绑卡 | 需实名
  network: string; // 国内直连 | 需海外网络
  quota: string; // 额度一句话,如 2000万 token/天 速率 40 次/分
  modality: string[];
  endsAt: string | null; // ISO 日期;null=长期
  dead: boolean; // 已失效(!active || 过期),页面算好
  sortWeight: number; // 置顶/排序,大在前(任何排序下都钉在最前)
  createdAt: string; // ISO,供「最新」排序
  claimUrl: string;
};

export type RelayView = {
  id: string;
  station: string;
  host: string;
  logoUrl: string;
  activity: string;
  eligibility: string;
  steps: string; // 多行,每行一步
  terms: string;
  endsAt: string | null;
  dead: boolean;
  sortWeight: number;
  createdAt: string;
  claimUrl: string;
};

// 警示色门槛/资格(返回 true 用 --warn 琥珀色)
export const GATE_WARN = new Set(["需实名", "需海外网络"]);
export const ELIG_WARN = new Set(["仅新账号"]);
// 模态可选项(后台多选 + 前台筛选)
export const MODALITY_OPTS = ["文本", "图像", "视频", "声音", "pdf", "推理", "代码"];

export const FREE_API_TOTAL = "242+"; // 收录总量(展示用,卡片为精选样本)

// ---- 种子数据(DB 形状,endsAt 用 ISO 字符串;active=false 表示下线/已失效;logoUrl 留空走首字母兜底)----
export type FreeApiSeed = {
  model: string; provider: string; logoUrl: string;
  context: string; maxOutput: string; bindCard: string; network: string;
  quota: string; modality: string;
  endsAt: string | null; active: boolean; sortWeight: number; claimUrl: string;
};
export type RelaySeed = {
  station: string; host: string; logoUrl: string;
  activity: string; eligibility: string; steps: string; terms: string;
  endsAt: string | null; active: boolean; sortWeight: number; claimUrl: string;
};

export const SEED_FREE_APIS: FreeApiSeed[] = [
  { model: "gemini-3.5-flash", provider: "Google Gemini", logoUrl: "", context: "100万", maxOutput: "64K", bindCard: "免绑卡", network: "需海外网络", quota: "1500 次/天 速率 15 次/分", modality: "文本,图像,视频,声音,pdf,推理", endsAt: null, active: true, sortWeight: 0, claimUrl: "#" },
  { model: "Nemotron 3 Ultra", provider: "OpenRouter", logoUrl: "", context: "100万", maxOutput: "66K", bindCard: "免绑卡", network: "国内直连", quota: "200 次/天 免费档", modality: "文本,推理", endsAt: null, active: true, sortWeight: 0, claimUrl: "#" },
  { model: "deepseek-v4-pro", provider: "NVIDIA NIM", logoUrl: "", context: "100万", maxOutput: "384K", bindCard: "需实名", network: "需海外网络", quota: "2000万 token/天 速率 40 次/分", modality: "文本,推理", endsAt: null, active: true, sortWeight: 0, claimUrl: "#" },
  { model: "llama-4-maverick", provider: "Cerebras", logoUrl: "", context: "128K", maxOutput: "8K", bindCard: "免绑卡", network: "国内直连", quota: "无限次 速率 30 次/分", modality: "文本", endsAt: null, active: true, sortWeight: 0, claimUrl: "#" },
  { model: "Qwen3.6-27B", provider: "OVHcloud", logoUrl: "", context: "131K", maxOutput: "32K", bindCard: "免绑卡", network: "国内直连", quota: "500 次/天 匿名", modality: "文本,图像,推理", endsAt: "2026-07-01", active: true, sortWeight: 0, claimUrl: "#" },
  { model: "North Mini Code", provider: "OpenRouter", logoUrl: "", context: "256K", maxOutput: "64K", bindCard: "需实名", network: "国内直连", quota: "$5 一次性 注册赠送", modality: "文本,代码", endsAt: "2026-08-31", active: true, sortWeight: 0, claimUrl: "#" },
  { model: "step-2-flash", provider: "StepFun 免费版", logoUrl: "", context: "131K", maxOutput: "8K", bindCard: "免绑卡", network: "需海外网络", quota: "1000 次/天 已下线", modality: "文本,推理", endsAt: null, active: false, sortWeight: 0, claimUrl: "#" },
];

export const SEED_RELAY_PROMOS: RelaySeed[] = [
  { station: "示例站 A", host: "relay-a.example.com", logoUrl: "", activity: "新用户注册送 ¥10 体验额度", eligibility: "仅新账号", steps: "用邮箱注册新账号并验证\n体验额度自动到账\n在控制台「额度」页查看", terms: "", endsAt: "2026-07-05", active: true, sortWeight: 0, claimUrl: "#" },
  { station: "示例站 B", host: "relay-b.example.com", logoUrl: "", activity: "充值满 ¥100 送 ¥30", eligibility: "所有用户", steps: "注册账号\n单笔或累计充值满 ¥100\n¥30 赠额自动返到余额", terms: "", endsAt: "2026-07-20", active: true, sortWeight: 0, claimUrl: "#" },
  { station: "示例站 C", host: "relay-c.example.com", logoUrl: "", activity: "Claude Opus 4.8 限时免费，每日 50 次", eligibility: "所有用户", steps: "注册并完成实名\n在控制台「活动」页点击「领取限免」\n使用 claude-opus-4-8 分组发起请求即享免费额度", terms: "每自然日 0 点重置 50 次额度；仅限官方渠道分组；活动期内随时可能调整,以站点公告为准。", endsAt: "2026-07-31", active: true, sortWeight: 0, claimUrl: "#" },
  { station: "示例站 D", host: "relay-d.example.com", logoUrl: "", activity: "GPT 系列长期 8 折", eligibility: "所有用户", steps: "注册账号\n请求时选官方渠道分组\n按 8 折自动计费,无需领取", terms: "", endsAt: null, active: true, sortWeight: 0, claimUrl: "#" },
  { station: "示例站 E", host: "relay-e.example.com", logoUrl: "", activity: "618 充值五折", eligibility: "—", steps: "", terms: "", endsAt: "2026-06-18", active: false, sortWeight: 0, claimUrl: "#" },
];
