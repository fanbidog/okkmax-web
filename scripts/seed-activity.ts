import "./_env";
import { prisma } from "../src/lib/prisma";
import { SEED_FREE_APIS, SEED_RELAY_PROMOS } from "../src/lib/promoData";

// 活动页(/activity)初始数据灌库。真数据走后台录入,本脚本只为开发期不空表。
// 幂等:清空两表后重灌。跑:node_modules/.bin/tsx --env-file=.env scripts/seed-activity.ts

async function main() {
  await prisma.freeApi.deleteMany({});
  await prisma.relayPromo.deleteMany({});

  for (const a of SEED_FREE_APIS) {
    await prisma.freeApi.create({ data: { ...a, endsAt: a.endsAt ? new Date(a.endsAt) : null } });
  }
  for (const r of SEED_RELAY_PROMOS) {
    await prisma.relayPromo.create({ data: { ...r, endsAt: r.endsAt ? new Date(r.endsAt) : null } });
  }

  const [f, p] = await Promise.all([prisma.freeApi.count(), prisma.relayPromo.count()]);
  console.log(`已灌库:免费 API ${f} 条,中转站福利 ${p} 条`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
