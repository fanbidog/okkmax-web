export function ScoreGauge({ value }: { value: number | null }) {
  if (value == null) return <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink3)" }}>—</div>;
  const v = Math.max(0, Math.min(100, value));
  const theta = Math.PI * (1 - v / 100);
  const cx = 50, cy = 48, r = 38;
  const px = cx + r * Math.cos(theta);
  const py = cy - r * Math.sin(theta);
  return (
    <svg width="108" height="60" viewBox="0 0 100 58">
      <defs><linearGradient id="sg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#ef4444" /><stop offset="0.5" stopColor="#eab308" /><stop offset="1" stopColor="#22c55e" /></linearGradient></defs>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#sg)" strokeWidth="7" strokeLinecap="round" />
      <circle cx={px} cy={py} r="5" fill="#fff" stroke="var(--ink)" strokeWidth="2.5" />
      <text x={cx} y={cy - 6} fontSize="21" fontWeight="700" fill="var(--ink)" textAnchor="middle">{Math.round(v)}</text>
    </svg>
  );
}
