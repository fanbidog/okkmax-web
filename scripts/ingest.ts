import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { submitDetect, getStatus, getReport } from "../src/lib/detect-client";
import { classifyTier } from "../src/lib/tier";
import { fetchModels } from "../src/lib/models";
import { fetchStationMeta, fetchPricing, modelPriceYuan, fetchGroups } from "../src/lib/stationMeta";
import { stripLocked } from "../src/lib/stationLock";

interface SeedChannel { name: string; service: string; model: string; key: string; detect: boolean; }
interface SeedStation { slug: string; name: string; baseUrl: string; category: string; channels: SeedChannel[]; }
interface Seed { stations: SeedStation[]; }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runDetection(baseUrl: string, key: string, model: string) {
  const jobId = await submitDetect({ baseUrl, apiKey: key, model, mode: "standard" });
  for (let i = 0; i < 60; i++) {
    const s = await getStatus(jobId);
    if (s.status === "done") return await getReport(jobId);
    if (s.status === "error") throw new Error(`detect error: ${s.error}`);
    await sleep(4000);
  }
  throw new Error("detect timeout");
}

async function main() {
  const seed: Seed = JSON.parse(
    readFileSync(join(process.cwd(), "scripts/seed.local.json"), "utf-8"),
  );

  for (const st of seed.stations) {
    const existing = await prisma.station.findUnique({ where: { slug: st.slug }, select: { lockedFields: true } });
    const locked = existing?.lockedFields ?? [];

    const station = await prisma.station.upsert({
      where: { slug: st.slug },
      create: { slug: st.slug, name: st.name, baseUrl: st.baseUrl, category: st.category },
      update: { ...stripLocked({ name: st.name, baseUrl: st.baseUrl, category: st.category }, locked) },
    });

    const meta = await fetchStationMeta(st.baseUrl);
    await prisma.station.update({ where: { id: station.id }, data: {
      ...stripLocked({
        description: meta.description ?? null, logoUrl: meta.logoUrl && !meta.logoUrl.startsWith("data:") ? meta.logoUrl : null, // 丢弃 base64 logo(撑爆体积)
        homepage: meta.homepage ?? st.baseUrl, docsUrl: meta.docsUrl ?? null,
        socials: (meta.socials ?? []) as unknown as Prisma.InputJsonValue,
        routes: (meta.routes ?? []) as unknown as Prisma.InputJsonValue,
      }, locked),
      announcements: (meta.announcements ?? []) as unknown as Prisma.InputJsonValue,
    }});
    const pricing = await fetchPricing(st.baseUrl);
    console.log("[meta]", st.slug, "desc:", (meta.description||"").slice(0,30), "logo:", meta.logoUrl ? "✓":"✗", "pricing:", pricing?Object.keys(pricing.models).length+"模型":"✗", "公告:", (meta.announcements?.length ?? 0)+"条");

    const groups = await fetchGroups(st.baseUrl);
    await prisma.station.update({ where: { id: station.id }, data: { groups: groups as unknown as Prisma.InputJsonValue } });
    console.log("[groups]", st.slug, groups.length, "个分组(全收录)");

    for (const ch of st.channels) {
      const channel = await prisma.channel.upsert({
        where: { stationId_name: { stationId: station.id, name: ch.name } },
        create: { stationId: station.id, name: ch.name, service: ch.service },
        update: { service: ch.service },
      });

      // 拉该分组支持的模型列表入库
      const models = await fetchModels(st.baseUrl, ch.key);
      await prisma.channel.update({ where: { id: channel.id }, data: { models } });
      console.log("[models]", st.slug + "/" + ch.name, models.length, "个");

      if (pricing) {
        const modelPrices: Record<string, { in: number; out: number; ratio: number }> = {};
        for (const model of models) { const pp = modelPriceYuan(pricing, ch.name, model); if (pp) modelPrices[model] = pp; }
        await prisma.channel.update({ where: { id: channel.id }, data: { modelPrices } });
      }

      // 真伪检测(仅 Claude 协议支持)
      if (ch.detect) {
        try {
          const report = await runDetection(st.baseUrl, ch.key, ch.model);
          const score = Number(report.total_score ?? 0);
          const tier = classifyTier(score);
          await prisma.detectionResult.create({
            data: {
              channelId: channel.id,
              model: ch.model,
              totalScore: score,
              verdict: String(report.verdict ?? ""),
              tier: tier.tier,
              report: report as object,
            },
          });
          console.log(`[detect] ${st.slug}/${ch.name} score=${score.toFixed(1)} tier=${tier.label}`);
        } catch (e) {
          console.error(`[detect] ${st.slug}/${ch.name} 失败: ${e}`);
        }
      }
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
