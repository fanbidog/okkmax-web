export interface Announcement { id: number; title: string; content: string; date?: string; category?: string; }
export interface Social { type: string; name: string; link: string; }
export interface Route { name: string; url: string; desc?: string; }
export interface StationMeta { description?: string; logoUrl?: string; homepage?: string; docsUrl?: string; announcements?: Announcement[]; socials?: Social[]; routes?: Route[]; }

export async function fetchStationMeta(baseUrl: string): Promise<StationMeta> {
  const meta: StationMeta = {};
  try {
    const html = await (await fetch(baseUrl, { cache: "no-store" })).text();
    const og = (p: string) => html.match(new RegExp(`<meta[^>]*property="og:${p}"[^>]*content="([^"]*)"`, "i"))?.[1];
    meta.description = og("description") || undefined;
    const img = og("image");
    if (img) meta.logoUrl = img.startsWith("http") ? img : new URL(img, baseUrl).href;
    meta.homepage = og("url") || baseUrl;
  } catch {}
  try {
    const st = await (await fetch(`${baseUrl}/api/status`, { cache: "no-store" })).json();
    meta.docsUrl = st?.data?.docs_link || undefined;
    const routes = st?.data?.api_info;
    if (Array.isArray(routes) && st?.data?.api_info_enabled !== false) {
      meta.routes = routes
        .map((r) => ({ name: String(r?.route ?? ""), url: String(r?.url ?? ""), desc: r?.description ? String(r.description) : undefined }))
        .filter((r) => r.url);
    }
    const grps = st?.data?.after_sales_groups;
    if (Array.isArray(grps)) {
      meta.socials = grps
        .map((g) => ({ type: String(g?.type ?? "link"), name: String(g?.name ?? ""), link: String(g?.link ?? "") }))
        .filter((s) => s.link);
    }
    const anns = st?.data?.announcements;
    if (Array.isArray(anns)) {
      meta.announcements = anns
        .map((a) => ({ id: Number(a?.id), title: String(a?.title ?? ""), content: String(a?.content ?? "").trim(), date: a?.publishDate || undefined, category: a?.category || undefined }))
        .filter((a) => a.title || a.content);
    }
  } catch {}
  return meta;
}

export interface PricingData {
  groupRatio: Record<string, number>;
  models: Record<string, { r: number; c: number; price: number; qtype: number }>;
  base: number;
  exchange: number;
}

export async function fetchPricing(baseUrl: string): Promise<PricingData | null> {
  try {
    const [pr, st] = await Promise.all([
      (await fetch(`${baseUrl}/api/pricing`, { cache: "no-store" })).json(),
      (await fetch(`${baseUrl}/api/status`, { cache: "no-store" })).json(),
    ]);
    const models: PricingData["models"] = {};
    for (const m of pr.data ?? []) models[m.model_name] = { r: m.model_ratio, c: m.completion_ratio, price: m.model_price, qtype: m.quota_type };
    const s = st?.data ?? {};
    const quotaPerUnit = Number(s.quota_per_unit) || 500000;
    const price = Number(s.price) || 1;
    const exchange = Number(s.custom_currency_exchange_rate) || 1;
    return { groupRatio: pr.group_ratio ?? {}, models, base: (1e6 / quotaPerUnit) * price, exchange };
  } catch { return null; }
}

/** 某分组某模型的真实 ¥ 价(每 1M tokens)。按量(qtype 0)用倍率算,按次(qtype 1)用 model_price。 */
export function modelPriceYuan(p: PricingData, groupName: string, model: string): { in: number; out: number; ratio: number } | null {
  const m = p.models[model];
  const gr = p.groupRatio[groupName];
  if (!m || gr == null) return null;
  if (m.qtype === 1) return { in: m.price * p.exchange, out: m.price * p.exchange, ratio: m.r };
  const inputYuan = p.base * m.r * gr * p.exchange;
  return { in: inputYuan, out: inputYuan * m.c, ratio: m.r };
}

export interface GroupModel { id: string; in: number; out: number; ratio: number; cache: number | null; }
export interface GroupCatalog { name: string; ratio: number; service: string; models: GroupModel[]; }

export async function fetchGroups(baseUrl: string): Promise<GroupCatalog[]> {
  try {
    const [pr, st] = await Promise.all([
      (await fetch(`${baseUrl}/api/pricing`, { cache: "no-store" })).json(),
      (await fetch(`${baseUrl}/api/status`, { cache: "no-store" })).json(),
    ]);
    const s = st?.data ?? {};
    const base = (1e6 / (Number(s.quota_per_unit) || 500000)) * (Number(s.price) || 1);
    const exchange = Number(s.custom_currency_exchange_rate) || 1;
    const groupRatio: Record<string, number> = pr.group_ratio ?? {};
    const data: Array<{ model_name: string; model_ratio: number; completion_ratio: number; model_price: number; quota_type: number; cache_ratio?: number; enable_groups?: string[] }> = pr.data ?? [];
    const round = (n: number) => (Number.isInteger(n) ? n : Math.round(n * 100) / 100);
    const out: GroupCatalog[] = [];
    for (const [name, gr] of Object.entries(groupRatio)) {
      const models: GroupModel[] = data
        .filter((m) => (m.enable_groups ?? []).includes(name))
        .map((m) => {
          const inY = m.quota_type === 1 ? m.model_price * exchange : base * m.model_ratio * gr * exchange;
          const outY = m.quota_type === 1 ? inY : inY * m.completion_ratio;
          const cache = m.quota_type !== 1 && typeof m.cache_ratio === "number" && m.cache_ratio > 0 ? round(inY * m.cache_ratio) : null;
          return { id: m.model_name, in: round(inY), out: round(outY), ratio: m.model_ratio, cache };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
      const svc = models.some((m) => m.id.startsWith("claude")) ? "Claude"
        : models.some((m) => m.id.startsWith("gpt") || m.id.startsWith("codex")) ? "GPT / Codex"
        : models.some((m) => m.id.startsWith("gemini")) ? "Gemini" : "其他";
      out.push({ name, ratio: gr, service: svc, models });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  } catch { return []; }
}
