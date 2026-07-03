import { test, expect, vi } from "vitest";
import { sha } from "./hash";
import { runScan } from "./scan";

// 各 model 默认 findMany 返回 [],被测 model 覆盖
function makePrisma(overrides: {
  station?: { findMany?: any };
  scanLock?: { findUnique?: any };
} = {}) {
  const empty = () => vi.fn().mockResolvedValue([]);
  const model = () => ({
    findMany: empty(),
    update: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null),
  });
  const prisma: any = {
    station: model(),
    relayPromo: model(),
    freeApi: model(),
    content: model(),
    scanLock: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    translationFailure: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
  };
  if (overrides.station?.findMany) prisma.station.findMany = overrides.station.findMany;
  if (overrides.scanLock?.findUnique) prisma.scanLock.findUnique = overrides.scanLock.findUnique;
  return prisma;
}

const SRC = "中文简介";

test("1) 标量脏 → 翻译 + 写回", async () => {
  const prisma = makePrisma({
    station: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", description: SRC, description_en: null, description_enHash: null },
      ]),
    },
  });
  const translator = { translateBatch: vi.fn().mockResolvedValue([{ ok: true, en: "EN intro" }]) };

  const out = await runScan({ prisma, translator });

  expect(out.translated).toBe(1);
  expect(prisma.station.update).toHaveBeenCalledTimes(1);
  const data = prisma.station.update.mock.calls[0][0].data;
  expect(data.description_en).toBe("EN intro");
  expect(data.description_enHash).toBe(sha(SRC));
  expect(prisma.translationFailure.deleteMany).toHaveBeenCalled();
});

test("2) 标量失败 → 记 TranslationFailure", async () => {
  const prisma = makePrisma({
    station: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", description: SRC, description_en: null, description_enHash: null },
      ]),
    },
  });
  const translator = { translateBatch: vi.fn().mockResolvedValue([{ ok: false, error: "residual-cjk" }]) };

  const out = await runScan({ prisma, translator });

  expect(out.translated).toBe(0);
  expect(out.failed.length).toBe(1);
  expect(prisma.translationFailure.upsert).toHaveBeenCalledTimes(1);
  // 复合键 where 断言
  const upsertArg = prisma.translationFailure.upsert.mock.calls[0][0];
  expect(upsertArg.where).toEqual({
    model_recordId_fieldPath: { model: "Station", recordId: "s1", fieldPath: "description" },
  });
  expect(upsertArg.create.error).toBe("residual-cjk");
});

test("3) 锁占用 → locked:true,不扫不译", async () => {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const prisma = makePrisma({
    station: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", description: SRC, description_en: null, description_enHash: null },
      ]),
    },
    scanLock: {
      findUnique: vi.fn().mockResolvedValue({ id: "translate-scan", startedAt: oneMinAgo }),
    },
  });
  const translator = { translateBatch: vi.fn().mockResolvedValue([]) };

  const out = await runScan({ prisma, translator });

  expect(out.locked).toBe(true);
  expect(out.translated).toBe(0);
  expect(prisma.station.findMany).not.toHaveBeenCalled();
  expect(prisma.relayPromo.findMany).not.toHaveBeenCalled();
  expect(translator.translateBatch).not.toHaveBeenCalled();
});

test("4) 已最新 → skippedCurrent,不译", async () => {
  const prisma = makePrisma({
    station: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", description: SRC, description_en: "old EN", description_enHash: sha(SRC) },
      ]),
    },
  });
  const translator = { translateBatch: vi.fn().mockResolvedValue([]) };

  const out = await runScan({ prisma, translator });

  expect(out.skippedCurrent).toBeGreaterThanOrEqual(1);
  expect(out.translated).toBe(0);
  expect(translator.translateBatch).not.toHaveBeenCalled();
});
