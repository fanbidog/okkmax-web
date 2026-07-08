// Render assets/star-history.svg from the GitHub stargazers API (self-hosted chart,
// no dependency on star-history.com / starchart.cc which are frequently rate-limited).
// Usage: GITHUB_TOKEN=... REPO=owner/name node scripts/star-history.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = process.env.REPO ?? "fanbidog/okkmax-web";
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

async function fetchStars() {
  const dates = [];
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/stargazers?per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github.star+json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`stargazers page ${page}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    for (const s of batch) if (s.starred_at) dates.push(new Date(s.starred_at));
    if (batch.length < 100) break;
  }
  dates.sort((a, b) => a - b);
  return dates;
}

function renderSvg(dates) {
  const W = 600, H = 340, PAD = { l: 46, r: 20, t: 40, b: 34 };
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const n = dates.length;
  const t0 = n ? dates[0].getTime() : Date.now() - 86400e3;
  const t1 = Math.max(n ? dates[n - 1].getTime() : Date.now(), t0 + 86400e3);
  const yMax = Math.max(5, Math.ceil(n * 1.15));
  const x = (t) => PAD.l + ((t - t0) / (t1 - t0)) * iw;
  const y = (c) => PAD.t + ih - (c / yMax) * ih;
  // step curve: each star bumps the cumulative count
  let d = `M ${x(t0)} ${y(0)}`;
  dates.forEach((dt, i) => { d += ` L ${x(dt.getTime())} ${y(i)} L ${x(dt.getTime())} ${y(i + 1)}`; });
  if (n) d += ` L ${x(t1)} ${y(n)}`;
  const fmt = (t) => new Date(t).toISOString().slice(0, 10);
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => {
    const c = Math.round(yMax * f);
    return `<line x1="${PAD.l}" y1="${y(c)}" x2="${W - PAD.r}" y2="${y(c)}" stroke="#d0d7de" stroke-dasharray="3 4" stroke-width="1"/>
    <text x="${PAD.l - 8}" y="${y(c) + 4}" text-anchor="end" class="tick">${c}</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    text { font: 12px -apple-system, "Segoe UI", sans-serif; fill: #57606a; }
    .title { font-size: 15px; font-weight: 600; fill: #24292f; }
    .tick { font-size: 11px; }
  </style>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text class="title" x="${PAD.l}" y="24">Star History — ${REPO}</text>
  <text x="${W - PAD.r}" y="24" text-anchor="end">★ ${n}</text>
  ${gridLines}
  <line x1="${PAD.l}" y1="${PAD.t + ih}" x2="${W - PAD.r}" y2="${PAD.t + ih}" stroke="#8c959f" stroke-width="1"/>
  <path d="${d}" fill="none" stroke="#e0512b" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="${PAD.l}" y="${H - 12}">${fmt(t0)}</text>
  <text x="${W - PAD.r}" y="${H - 12}" text-anchor="end">${fmt(t1)}</text>
</svg>
`;
}

const dates = await fetchStars();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "assets"), { recursive: true });
writeFileSync(join(root, "assets/star-history.svg"), renderSvg(dates));
console.log(`rendered assets/star-history.svg with ${dates.length} stars`);
