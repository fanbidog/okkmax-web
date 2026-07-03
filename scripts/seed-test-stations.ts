import "./_env";
import { prisma } from "../src/lib/prisma";

// 开发期测试数据:灌一批测试站 + 多样的用户评价,让首页「口碑精选 / 排行榜」等有真实变化。
// 幂等:按 slug / email upsert;评价仅删-重建本脚本创建的测试用户名下的,绝不动真实用户数据。
// 跑:node_modules/.bin/tsx --env-file=.env scripts/seed-test-stations.ts

const CLAUDE_MODELS = ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];
const PRICES: Record<string, { in: number; out: number; ratio: number }> = {
  "claude-opus-4-8": { in: 9, out: 45, ratio: 0 },
  "claude-opus-4-7": { in: 9, out: 45, ratio: 0 },
  "claude-sonnet-4-6": { in: 5, out: 25, ratio: 0 },
  "claude-haiku-4-5-20251001": { in: 2, out: 10, ratio: 0 },
};

const USERS = [
  "老王", "Tina", "数据狗", "KitoZ", "阿May", "码农老李", "Nova", "薯条", "Echo", "小满", "Ray", "豆角",
].map((name, i) => ({ email: `seeduser${i}@test.com`, name }));

// 3 个精修站(带手写优质评价,用于口碑展示)
const DETAILED = [
  { slug: "anyrouter", name: "AnyRouter", baseUrl: "https://anyrouter.test", description: "聚合多家上游的中转,主打稳定与性价比,支持 Claude Code / Codex。", composite: 78.4, purity: 96.5, tier: "pureblood", avail: 80.1, speed: 72.3 },
  { slug: "gptmirror", name: "GPTMirror", baseUrl: "https://gptmirror.test", description: "GPT / Claude 混合中转,价格便宜,适合预算敏感的日常使用。", composite: 58.2, purity: 55.0, tier: "downgrade", avail: 76.0, speed: 68.4 },
  { slug: "linkapi", name: "LinkAPI", baseUrl: "https://linkapi.test", description: "老牌中转站,文档齐全、客服在线,接入体验顺畅。", composite: 70.5, purity: 92.0, tier: "pureblood", avail: 71.2, speed: 75.6 },
];
const DETAILED_REVIEWS = [
  { by: "老王", slug: "anyrouter", rating: 5, body: "接 claude code 很顺,跑了两周没掉过链子,价格也能打,目前主力在用。", pros: ["稳定", "速度快"], cons: [] },
  { by: "KitoZ", slug: "anyrouter", rating: 4, body: "纯度一直是官方渠道,实测没掺水。就是高峰期偶尔会限流,得重试一下。", pros: ["不掺水"], cons: ["偶发限流"] },
  { by: "Tina", slug: "gptmirror", rating: 4, body: "便宜大碗,日常写代码够用了。偶尔感觉会降智,要求高的场景慎用。", pros: ["价格实惠"], cons: ["疑似降智"] },
  { by: "数据狗", slug: "linkapi", rating: 5, body: "文档写得很全,照着接半小时就搞定了,客服响应也快,新手友好。", pros: ["文档全", "客服好"], cons: [] },
  { by: "老王", slug: "linkapi", rating: 4, body: "用了大半年比较稳,价格比同类稍贵一点点,但省心。", pros: ["稳定"], cons: ["价格贵"] },
  { by: "阿May", slug: "anyrouter", rating: 5, body: "claude code 接上去秒通,纯度检测一直是官方渠道,客服响应也快,目前用下来最省心的一个。", pros: ["速度快", "客服好"], cons: [] },
  { by: "Tina", slug: "gptmirror", rating: 4, body: "官方分组没掺水,延迟也能接受,性价比可以,推荐试试。", pros: ["不掺水"], cons: [] },
  { by: "KitoZ", slug: "linkapi", rating: 5, body: "分组多、模型全,纯度稳定。文档要是再细点就完美了。", pros: ["模型全", "纯度高"], cons: [] },
];

// 20 个批量站
const BULK: [string, string][] = [
  ["apiyi", "API易"], ["oneapi-pro", "OneAPI Pro"], ["gptgod", "GPTGod"], ["closeai-cn", "CloseAI"],
  ["aihubmix", "AIHubMix"], ["v3api", "V3 API"], ["geekai", "GeekAI"], ["laozhang", "老张 API"],
  ["foxai", "FoxAI"], ["ohmygpt", "OhMyGPT"], ["chatany", "ChatAnywhere"], ["deepbricks", "DeepBricks"],
  ["burnhair", "BurnHair"], ["yourapi", "YourAPI"], ["suanli", "算力云"], ["dollapi", "DollAPI"],
  ["nextapi", "NextAPI"], ["cellapi", "CellAPI"], ["zhipuhub", "智谱Hub"], ["moonapi", "MoonAPI"],
];
const DESCS = [
  "多模型聚合中转,主打稳定与速度,支持 Claude / GPT / Gemini。",
  "高性价比中转站,适合个人开发者日常使用。",
  "官方渠道直连,纯度有保障,延迟低。",
  "老牌站点,分组丰富,充值灵活,客服在线。",
  "新晋中转,价格激进,主打便宜大碗。",
  "企业级中转,SLA 稳定,适合团队接入。",
];
const POS = ["稳定", "速度快", "不掺水", "纯度高", "价格实惠", "文档全", "客服好", "模型全", "充值方便"];
const NEG = ["偶发限流", "不稳定", "疑似掺水", "疑似降智", "价格贵", "客服慢", "限制多"];
const BODY5 = [
  "接 claude code 秒通,稳定没掉过链子,价格也能打。", "纯度一直官方渠道,实测没掺水,客服响应快。",
  "用了几个月最省心的一个,模型全、文档清楚。", "速度很快,充值也方便,综合体验不错。",
  "高峰期也没掉过速,纯度稳得很,值得长期用。", "客服半夜都秒回,问题解决得很利索,放心。",
  "对接顺滑,额度透明不玩文字游戏,良心站。", "跑了一个月零故障,延迟低到几乎无感。",
];
const BODY4 = [
  "整体不错,偶尔高峰要重试,性价比可以。", "官方分组稳定,延迟能接受,推荐试试。",
  "用着还行,价格稍贵一点点但省心。", "模型挺全的,稳定性中上,日常够用。",
  "接入简单,文档清楚,小毛病不影响大局。", "速度不错,就是偶尔要刷新一下额度。",
  "稳定性可以,客服响应稍慢但能解决问题。", "价格实在,平时写代码完全够用了。",
];
const BODY3 = [
  "便宜大碗但偶尔抽风,佛系用还行。", "价格实惠,稳定性一般,看运气。",
  "能用,就是高峰期容易限流,要有心理预期。", "速度时快时慢,适合不赶时间的场景。",
  "额度给得足,但偶尔会降智,重要任务慎用。", "性价比高,稳定性看脸,备用站不错。",
];

// 错开取值,避免相邻站点撞同一条模板
const pick = <T,>(arr: T[], n: number) => arr[((n * 7) % arr.length + arr.length) % arr.length];

async function main() {
  // 1) 测试用户
  const userByName: Record<string, string> = {};
  for (const u of USERS) {
    const rec = await prisma.user.upsert({ where: { email: u.email }, update: { name: u.name }, create: { email: u.email, name: u.name } });
    userByName[u.name] = rec.id;
  }
  console.log(`✓ 用户 ${USERS.length} 个`);

  // 2) 站点 + 1 个 cc 分组(精修 3 个 + 批量 20 个)
  type StDef = { slug: string; name: string; baseUrl: string; description: string; composite: number; purity: number; tier: string; avail: number; speed: number };
  const bulkDefs: StDef[] = BULK.map(([slug, name], i) => {
    // 按 index 分档:0-7 官方高分, 8-14 混合中分, 15-19 存疑低分
    const tier = i < 8 ? "pureblood" : i < 15 ? "downgrade" : "counterfeit";
    const composite = i < 8 ? 84 - i * 1.4 : i < 15 ? 70 - (i - 8) * 2 : 52 - (i - 15) * 3;
    const purity = tier === "pureblood" ? 95 - i : tier === "downgrade" ? 60 - i : 25 - (i - 15) * 2;
    return { slug, name, baseUrl: `https://${slug}.test`, description: pick(DESCS, i), composite: Math.round(composite * 10) / 10, purity: Math.max(5, purity), tier, avail: 65 + (i * 7) % 30, speed: 60 + (i * 11) % 35 };
  });
  const allDefs = [...DETAILED, ...bulkDefs];
  const stationBySlug: Record<string, string> = {};
  for (const s of allDefs) {
    const st = await prisma.station.upsert({
      where: { slug: s.slug },
      update: { name: s.name, description: s.description, compositeScore: s.composite, purityIndex: s.purity, purityTier: s.tier, availIndex: s.avail, speedIndex: s.speed, scoredAt: new Date() },
      create: { slug: s.slug, name: s.name, baseUrl: s.baseUrl, description: s.description, category: "commercial", compositeScore: s.composite, purityIndex: s.purity, purityTier: s.tier, availIndex: s.avail, speedIndex: s.speed, scoredAt: new Date() },
    });
    stationBySlug[s.slug] = st.id;
    await prisma.channel.upsert({
      where: { stationId_name: { stationId: st.id, name: "cc" } },
      update: { avail: s.avail, speed: s.speed, purity: s.purity, currentStatus: 1 },
      create: { stationId: st.id, name: "cc", service: "cc", models: CLAUDE_MODELS, modelPrices: PRICES, currentStatus: 1, currentLatencyMs: 2200, avail: s.avail, speed: s.speed, purity: s.purity, uptimeSyncedAt: new Date() },
    });
  }
  console.log(`✓ 站点 ${allDefs.length} 个(各 1 个 cc 分组)`);

  // 3) 评价:先删本脚本测试用户的旧评价(幂等),再重建
  const seedUserIds = Object.values(userByName);
  await prisma.review.deleteMany({ where: { userId: { in: seedUserIds } } });

  type Rv = { by: string; slug: string; rating: number; body: string; pros: string[]; cons: string[] };
  const reviews: Rv[] = [...DETAILED_REVIEWS];
  // 批量站:每站 2 条评价(一条 4-5 分带优点,一条 3-4 分混评),作者轮换
  bulkDefs.forEach((s, i) => {
    const hi = i % 3 === 0 ? 5 : 4;
    reviews.push({ by: pick(USERS, i * 2).name, slug: s.slug, rating: hi, body: hi === 5 ? pick(BODY5, i) : pick(BODY4, i), pros: [pick(POS, i), pick(POS, i + 4)], cons: [] });
    const lo = i % 4 === 0 ? 3 : 4;
    reviews.push({ by: pick(USERS, i * 2 + 1).name, slug: s.slug, rating: lo, body: lo === 3 ? pick(BODY3, i) : pick(BODY4, i + 1), pros: [pick(POS, i + 2)], cons: [pick(NEG, i)] });
  });

  let made = 0;
  for (const r of reviews) {
    const userId = userByName[r.by];
    const stationId = stationBySlug[r.slug] ?? (await prisma.station.findUnique({ where: { slug: r.slug }, select: { id: true } }))?.id;
    if (!userId || !stationId) { console.warn(`跳过:${r.by} / ${r.slug}`); continue; }
    await prisma.review.create({ data: { stationId, userId, rating: r.rating, body: r.body, prosTags: r.pros, consTags: r.cons, tags: [...r.pros, ...r.cons], isWarning: r.rating <= 2 } });
    made++;
  }
  console.log(`✓ 评价 ${made} 条(跨 ${new Set(reviews.map((r) => r.slug)).size} 个站)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
