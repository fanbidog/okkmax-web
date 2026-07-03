/** 全站统一的积分图标:橙色金币 + 白色四角星(替代旧的「分」字)。
 *  size 控制直径;neg=true 走灰色(扣分)。自带内联样式,任意位置可用。 */
export function PointsCoin({ size = 20, neg = false }: { size?: number; neg?: boolean }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: neg ? "linear-gradient(135deg,#cfd3d8,#9aa0a6)" : "linear-gradient(135deg,#ffcf8e,#f59e0b)",
        boxShadow: neg ? "none" : "0 1px 2px rgba(245,158,11,.45)",
        color: "#fff",
      }}
    >
      <svg width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8 4.5h8l3.6 4.6L12 20.5 4.4 9.1z" opacity=".96" />
      </svg>
    </span>
  );
}
