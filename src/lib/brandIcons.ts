// 品牌图标集中映射 —— 前台调用唯一入口。图标文件在 public/icons/{payment,vendor}/。
// 新增图标:① 把 svg 放进对应文件夹 ② 在这里登记 key→路径。组件别散落 import,统一从这里取。

/** 支付方式:与后台 PAYMENT 字典的 label 对齐(info.payment 存「、」连接的这些词)。 */
export const PAYMENT_ICON: Record<string, string> = {
  支付宝: "/icons/payment/alipay.svg",
  微信: "/icons/payment/wechatpay.svg",
  USDT: "/icons/payment/usdt.svg",
  PayPal: "/icons/payment/paypal.svg",
  银行卡: "/icons/payment/bankcard.svg",
  对公转账: "/icons/payment/corporate.svg",
};

/** AI 厂商 logo:厂商 key → 图标。 */
export const VENDOR_ICON: Record<string, string> = {
  claude: "/icons/vendor/claude.svg", // Anthropic / Claude / Claude Code(service cc)
  openai: "/icons/vendor/openai.svg", // GPT / Codex(service cx)
  gemini: "/icons/vendor/gemini.svg", // Google Gemini(service gm)
  deepseek: "/icons/vendor/deepseek.svg",
  minimax: "/icons/vendor/minimax.svg",
  moonshot: "/icons/vendor/moonshot.svg", // Kimi
  qwen: "/icons/vendor/qwen.svg", // 通义千问
  "xiaomi-mimo": "/icons/vendor/xiaomi-mimo.svg",
  zai: "/icons/vendor/zai.svg", // z.ai
  zhipu: "/icons/vendor/zhipu.svg", // 智谱 GLM
};

/** 监测服务 cc/cx/gm → 厂商 logo(替代 ServiceIcon 的占位点阵图)。 */
export const SERVICE_ICON: Record<string, string> = {
  cc: VENDOR_ICON.claude,
  cx: VENDOR_ICON.openai,
  gm: VENDOR_ICON.gemini,
};

/** 厂商 key → 中文名(ModelStack/筛选器显示)。 */
export const VENDOR_LABEL: Record<string, string> = {
  claude: "Claude", openai: "GPT / Codex", gemini: "Gemini", deepseek: "DeepSeek",
  minimax: "MiniMax", moonshot: "Kimi", qwen: "通义千问", "xiaomi-mimo": "小米 MiMo",
  zai: "Z.ai", zhipu: "智谱 GLM", other: "其他",
};

/** model id → 厂商 key(与 VENDOR_ICON/VENDOR_LABEL 对齐);认不出归 other。 */
export function vendorOf(id: string): string {
  const m = id.toLowerCase();
  if (/claude/.test(m)) return "claude";
  if (/gpt|codex|chatgpt|openai|^o\d/.test(m)) return "openai";
  if (/gemini/.test(m)) return "gemini";
  if (/deepseek/.test(m)) return "deepseek";
  if (/minimax|abab/.test(m)) return "minimax";
  if (/moonshot|kimi/.test(m)) return "moonshot";
  if (/qwen|tongyi/.test(m)) return "qwen";
  if (/mimo/.test(m)) return "xiaomi-mimo";
  if (/glm|zhipu|chatglm/.test(m)) return "zhipu";
  if (/^z-?ai|\bzai\b/.test(m)) return "zai";
  return "other";
}

/** 从 model id 猜厂商 logo(显示模型出处用);认不出返回 null。 */
export function vendorIconOfModel(id: string): string | null {
  const m = id.toLowerCase();
  if (/claude/.test(m)) return VENDOR_ICON.claude;
  if (/gpt|codex|openai|^o\d|chatgpt/.test(m)) return VENDOR_ICON.openai;
  if (/gemini/.test(m)) return VENDOR_ICON.gemini;
  if (/deepseek/.test(m)) return VENDOR_ICON.deepseek;
  if (/minimax|abab/.test(m)) return VENDOR_ICON.minimax;
  if (/moonshot|kimi/.test(m)) return VENDOR_ICON.moonshot;
  if (/qwen|tongyi|通义/.test(m)) return VENDOR_ICON.qwen;
  if (/mimo/.test(m)) return VENDOR_ICON["xiaomi-mimo"];
  if (/glm|zhipu|chatglm|智谱/.test(m)) return VENDOR_ICON.zhipu;
  if (/\bz-?ai\b/.test(m)) return VENDOR_ICON.zai;
  return null;
}
