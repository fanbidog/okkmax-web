import "./_env";
import { prisma } from "../src/lib/prisma";
import { computeAndStoreScores } from "../src/lib/scoring";
import { EVENT_RETAIN_DAYS } from "../src/lib/stationEvents";

// 算分:从 DetectionResult(3天)+ UptimeSnapshot(2天)算综合/纯度/可用/速度,写回 Station/Channel + 排名。
// 建议用 cron 每小时跑一次(npm run score)。分是窗口平滑的,每小时重算绰绰有余。
async function main() {
  const sc = await computeAndStoreScores();
  console.log(`[score] 算分 ${sc.stations} 站,${sc.ranked} 站有综合分(已排名)`);
  {
    const days = EVENT_RETAIN_DAYS;
    if (Number.isFinite(days) && days >= 30) { // 守卫:阈值异常不删
      const cutoff = new Date(Date.now() - days * 86_400_000);
      const pruned = await prisma.stationEvent.deleteMany({ where: { at: { lt: cutoff } } });
      if (pruned.count) console.log(`[events] 清理 ${days} 天前 ${pruned.count} 条`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
