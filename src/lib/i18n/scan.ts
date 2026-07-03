import { sha } from "./hash";
import { TARGETS } from "./targets";
import type { Translator } from "./translate";

const LOCK_ID = "translate-scan";
const LOCK_TTL_MS = 15 * 60 * 1000;
const BATCH = 50;

export type ScanFailure = { model: string; recordId: string; fieldPath: string; error: string };
export type ScanSummary = {
  translated: number;
  skippedCurrent: number;
  failed: ScanFailure[];
  remaining: number;
  capped: boolean;
  locked: boolean;
};

type Pending = { model: string; recordId: string; fieldPath: string; src: string; srcHash: string; kind: "scalar" | "json"; field: string };

const delegate = (prisma: any, model: string) => prisma[model[0].toLowerCase() + model.slice(1)];

export async function runScan(opts: {
  prisma: any; translator: Translator;
  cap?: number; charBudget?: number; force?: boolean; backoffMin?: number;
}): Promise<ScanSummary> {
  const { prisma, translator, cap = 500, charBudget = Infinity, force = false, backoffMin = 30 } = opts;
  const now = new Date();

  // 1) 单飞锁:存在且未超 TTL → 拒绝
  const existing = await prisma.scanLock.findUnique({ where: { id: LOCK_ID } });
  if (existing && now.getTime() - new Date(existing.startedAt).getTime() < LOCK_TTL_MS) {
    return { translated: 0, skippedCurrent: 0, failed: [], remaining: 0, capped: false, locked: true };
  }
  await prisma.scanLock.upsert({ where: { id: LOCK_ID }, create: { id: LOCK_ID, startedAt: now }, update: { startedAt: now } });

  try {
    // 2-3) 收集脏单元 + 统计已最新
    const dirty: Pending[] = [];
    let skippedCurrent = 0;
    for (const t of TARGETS) {
      const d = delegate(prisma, t.model);
      if (t.kind === "scalar") {
        const rows = await d.findMany({ select: { id: true, [t.field]: true, [`${t.field}_en`]: true, [`${t.field}_enHash`]: true } });
        for (const r of rows) {
          const src: string = r[t.field];
          if (!src || !src.trim()) continue;
          if (r[`${t.field}_enHash`] === sha(src)) { skippedCurrent++; continue; }
          dirty.push({ model: t.model, recordId: r.id, fieldPath: t.field, src, srcHash: sha(src), kind: "scalar", field: t.field });
        }
      } else {
        const rows = await d.findMany({ select: { id: true, [t.field]: true, [`${t.field}_en`]: true } });
        for (const r of rows) {
          const map = (r[`${t.field}_en`] ?? {}) as Record<string, string>;
          for (const u of t.extract(r)) {
            if (u.srcHash in map) { skippedCurrent++; continue; }
            dirty.push({ model: t.model, recordId: r.id, fieldPath: u.fieldPath, src: u.src, srcHash: u.srcHash, kind: "json", field: t.field });
          }
        }
      }
    }

    // 4) 退避过滤(force=true 跳过)
    let candidates = dirty;
    if (!force) {
      const cutoff = now.getTime() - backoffMin * 60 * 1000;
      const fails = await prisma.translationFailure.findMany();
      const fm = new Map<string, any>(fails.map((f: any) => [`${f.model}|${f.recordId}|${f.fieldPath}`, f]));
      candidates = dirty.filter((u) => {
        const f = fm.get(`${u.model}|${u.recordId}|${u.fieldPath}`);
        if (!f) return true;
        if (f.srcHash !== u.srcHash) return true; // 源文变了,应重翻
        return new Date(f.attemptedAt).getTime() < cutoff; // 退避窗口外才重试
      });
    }

    // 5) cap
    const totalCand = candidates.length;
    const batch = candidates.slice(0, cap);
    let processed = 0;

    // 6) 分批翻译 + 字符预算
    let usedChars = 0;
    const results: { unit: Pending; res: Awaited<ReturnType<Translator["translateBatch"]>>[number] }[] = [];
    for (let i = 0; i < batch.length; i += BATCH) {
      const slice = batch.slice(i, i + BATCH);
      const sliceChars = slice.reduce((a, u) => a + u.src.length, 0);
      if (usedChars + sliceChars > charBudget) break;
      usedChars += sliceChars;
      const res = await translator.translateBatch(slice.map((u) => ({ src: u.src })));
      slice.forEach((u, j) => results.push({ unit: u, res: res[j] }));
      processed += slice.length;
    }

    // 7) 写回
    let translated = 0;
    const failed: ScanFailure[] = [];
    const jsonOk = new Map<string, { model: string; recordId: string; field: string; done: { srcHash: string; en: string }[] }>();

    for (const { unit, res } of results) {
      if (res.ok) {
        translated++;
        if (unit.kind === "scalar") {
          await delegate(prisma, unit.model).update({ where: { id: unit.recordId }, data: { [`${unit.field}_en`]: res.en, [`${unit.field}_enHash`]: unit.srcHash } });
        } else {
          const gk = `${unit.model}|${unit.recordId}|${unit.field}`;
          if (!jsonOk.has(gk)) jsonOk.set(gk, { model: unit.model, recordId: unit.recordId, field: unit.field, done: [] });
          jsonOk.get(gk)!.done.push({ srcHash: unit.srcHash, en: res.en });
        }
        await prisma.translationFailure.deleteMany({ where: { model: unit.model, recordId: unit.recordId, fieldPath: unit.fieldPath } });
      } else {
        failed.push({ model: unit.model, recordId: unit.recordId, fieldPath: unit.fieldPath, error: res.error });
        await prisma.translationFailure.upsert({
          where: { model_recordId_fieldPath: { model: unit.model, recordId: unit.recordId, fieldPath: unit.fieldPath } },
          create: { model: unit.model, recordId: unit.recordId, fieldPath: unit.fieldPath, srcHash: unit.srcHash, error: res.error },
          update: { srcHash: unit.srcHash, error: res.error, attempts: { increment: 1 } },
        });
      }
    }

    // JSON 聚合:重取当前 _en 合并(避免覆盖其他 key),一次 update
    for (const g of jsonOk.values()) {
      const t = TARGETS.find((x) => x.model === g.model && x.field === g.field);
      if (!t || t.kind !== "json") continue;
      const d = delegate(prisma, g.model);
      const row = await d.findUnique({ where: { id: g.recordId }, select: { [`${g.field}_en`]: true } });
      const curMap = (row?.[`${g.field}_en`] ?? {}) as Record<string, string>;
      const merged = t.inject(curMap, g.done);
      await d.update({ where: { id: g.recordId }, data: { [`${g.field}_en`]: merged } });
    }

    return { translated, skippedCurrent, failed, remaining: totalCand - processed, capped: totalCand > batch.length, locked: false };
  } finally {
    await prisma.scanLock.delete({ where: { id: LOCK_ID } }).catch(() => {});
  }
}
