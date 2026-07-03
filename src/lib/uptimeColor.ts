type RGB = { r: number; g: number; b: number };
const GREEN: RGB = { r: 34, g: 197, b: 94 };
const YELLOW: RGB = { r: 234, g: 179, b: 8 };
const RED: RGB = { r: 239, g: 68, b: 68 };
const GRAY: RGB = { r: 148, g: 163, b: 184 };

function lerp(a: RGB, b: RGB, t: number): string {
  const c = (k: keyof RGB) => Math.round(a[k] + (b[k] - a[k]) * t);
  return `rgb(${c("r")}, ${c("g")}, ${c("b")})`;
}

/** 可用率 → 颜色:<0 灰 / 0-60 红→黄 / 60-100 黄→绿。 */
export function availabilityToColor(av: number): string {
  if (av < 0) return `rgb(${GRAY.r}, ${GRAY.g}, ${GRAY.b})`;
  if (av <= 60) return lerp(RED, YELLOW, av / 60);
  return lerp(YELLOW, GREEN, (av - 60) / 40);
}

/** 统一状态色:与响应趋势条同一套(亮绿/亮黄/亮红),全站状态文字共用,避免和主题暗色不搭。 */
export const STATUS_COLOR = {
  ok: "rgb(34, 197, 94)",
  warn: "rgb(234, 179, 8)",
  down: "rgb(239, 68, 68)",
  none: "var(--ink3)",
} as const;

/** 站级状态(按挂的比例分):全好=正常 / 过半挂=异常 / 个别挂=部分异常 / 仅波动=部分波动。 */
export function stationStatus(channels: { statusKey: string }[]): { text: string; color: string } {
  const down = channels.filter((c) => c.statusKey === "down").length;
  const warn = channels.filter((c) => c.statusKey === "warn").length;
  if (down === 0 && warn === 0) return { text: "正常", color: STATUS_COLOR.ok };
  if (down * 2 >= channels.length) return { text: "异常", color: STATUS_COLOR.down };
  if (down > 0) return { text: "部分异常", color: STATUS_COLOR.warn };
  return { text: "部分波动", color: STATUS_COLOR.warn };
}

/** 可用率 → 文字色(同状态色档):≥95 绿 / ≥80 黄 / 其余红。 */
export function uptimeTextColor(av: number | null): string {
  if (av == null || av < 0) return STATUS_COLOR.none;
  if (av >= 95) return STATUS_COLOR.ok;
  if (av >= 80) return STATUS_COLOR.warn;
  return STATUS_COLOR.down;
}
