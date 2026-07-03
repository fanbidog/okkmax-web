// 服务图标。cc=Claude Code / cx=Codex / gm=Gemini。
// ServiceLogo:真品牌 logo(cc/cx/gm);ServiceIcon:占位字形(other 回退 / 不便用 logo 时)。
import { SERVICE_ICON, VENDOR_ICON, VENDOR_LABEL } from "@/lib/brandIcons";

export const SERVICE_LABEL: Record<string, string> = {
  cc: "Claude",
  cx: "Codex",
  gm: "Gemini",
  other: "其他模型",
};

export const SERVICE_COLOR: Record<string, string> = {
  cc: "#c2410c", // Anthropic 陶土橙(与主题砖红同系)
  cx: "#10a37f", // OpenAI 绿
  gm: "#4285f4", // Google 蓝
  other: "#76767c", // 其他家族(DeepSeek/GLM/Kimi…)
};

export function ServiceIcon({ service, size = 17, color }: { service: string; size?: number; color?: string }) {
  const stroke = color ?? SERVICE_COLOR[service] ?? "var(--ink2)";
  const label = SERVICE_LABEL[service] ?? service;
  const c = { width: size, height: size, viewBox: "0 0 24 24" } as const;

  if (service === "other") {
    return (
      <svg {...c} fill={stroke} role="img">
        <title>{label}</title>
        <circle cx="7" cy="7" r="2.3" /><circle cx="17" cy="7" r="2.3" /><circle cx="7" cy="17" r="2.3" /><circle cx="17" cy="17" r="2.3" />
      </svg>
    );
  }
  if (service === "cx") {
    return (
      <svg {...c} fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" role="img">
        <title>{label}</title>
        <polyline points="9 7.5 4.5 12 9 16.5" />
        <polyline points="15 7.5 19.5 12 15 16.5" />
      </svg>
    );
  }
  if (service === "gm") {
    return (
      <svg {...c} fill={stroke} role="img">
        <title>{label}</title>
        <path d="M12 2c.3 5 4.8 9.6 10 10-5.2.4-9.7 5-10 10-.3-5-4.8-9.6-10-10 5.2-.4 9.7-5 10-10z" />
      </svg>
    );
  }
  return (
    <svg {...c} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" role="img">
      <title>{label}</title>
      <line x1="12" y1="3.5" x2="12" y2="20.5" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** 真品牌 logo。兼容 service 码(cc/cx/gm)和 vendor key(claude/openai/gemini/deepseek/…);other 回退占位字形。 */
export function ServiceLogo({ service, size = 18 }: { service: string; size?: number }) {
  const icon = SERVICE_ICON[service] ?? VENDOR_ICON[service];
  const label = SERVICE_LABEL[service] ?? VENDOR_LABEL[service] ?? service;
  if (icon) return <img src={icon} alt={label} title={label} width={size} height={size} style={{ display: "block", objectFit: "contain" }} />;
  return <ServiceIcon service={service} size={size} />;
}
