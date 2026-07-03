import { test, expect, vi } from "vitest";
import { runScan } from "./scan";
import { sha } from "./hash";

/** mock prisma:station.findMany 按 select 形状返回对应行(模拟真 prisma 的 select 语义)。 */
function mockPrisma(rows: any, opts: { failures?: any[] } = {}) {
  const calls: any = { update: [], tfUpsert: [], tfDeleteMany: [], lockDelete: 0 };
  const station = {
    findMany: vi.fn(async ({ select }: any) => {
      if ("announcements" in select) return rows.announcements ?? [];
      if ("routes" in select) return rows.routes ?? [];
      if ("info" in select) return rows.info ?? [];
      if ("description" in select) return rows.description ?? [];
      return [];
    }),
    update: vi.fn(async (a: any) => { calls.update.push(a); }),
    findUnique: vi.fn(async ({ where }: any) => rows.findUnique?.(where) ?? null),
  };
  const empty = { findMany: vi.fn(async () => []), update: vi.fn(), findUnique: vi.fn() };
  const prisma: any = {
    station, relayPromo: empty, freeApi: empty, content: empty,
    scanLock: { findUnique: vi.fn(async () => null), upsert: vi.fn(), delete: vi.fn(async () => { calls.lockDelete++; }) },
    translationFailure: {
      findMany: vi.fn(async () => opts.failures ?? []),
      upsert: vi.fn(async (a: any) => { calls.tfUpsert.push(a); }),
      deleteMany: vi.fn(async (a: any) => { calls.tfDeleteMany.push(a); }),
    },
  };
  return { prisma, calls };
}

test("JSON:脏单元翻译并 merge,不覆盖既有 key", async () => {
  const oldHash = sha("旧公告");
  const newHash = sha("新标题");
  const { prisma, calls } = mockPrisma({
    announcements: [{ id: "s1", announcements: [{ title: "新标题", content: "" }], announcements_en: { [oldHash]: "Old" } }],
    findUnique: () => ({ announcements_en: { [oldHash]: "Old" } }),
  });
  const translator = { translateBatch: vi.fn().mockResolvedValue([{ ok: true, en: "New Title" }]) };
  const r = await runScan({ prisma, translator, force: true });
  expect(r.translated).toBe(1);
  const upd = calls.update.find((u: any) => "announcements_en" in u.data);
  expect(upd.data.announcements_en).toEqual({ [oldHash]: "Old", [newHash]: "New Title" });
});

test("退避:近期失败同 hash → force=false 跳过、force=true 重试", async () => {
  const desc = "中文简介";
  const row = { id: "s1", description: desc, description_en: null, description_enHash: null };
  const failures = [{ model: "Station", recordId: "s1", fieldPath: "description", srcHash: sha(desc), attemptedAt: new Date() }];

  const a = mockPrisma({ description: [row] }, { failures });
  const tA = { translateBatch: vi.fn().mockResolvedValue([{ ok: true, en: "X" }]) };
  const rA = await runScan({ prisma: a.prisma, translator: tA, force: false });
  expect(tA.translateBatch).not.toHaveBeenCalled();
  expect(rA.translated).toBe(0);

  const b = mockPrisma({ description: [row] }, { failures });
  const tB = { translateBatch: vi.fn().mockResolvedValue([{ ok: true, en: "X" }]) };
  const rB = await runScan({ prisma: b.prisma, translator: tB, force: true });
  expect(rB.translated).toBe(1);
});

test("cap:脏超过 cap → capped + remaining", async () => {
  const rows = Array.from({ length: 3 }, (_, i) => ({ id: `s${i}`, description: `简介${i}`, description_en: null, description_enHash: null }));
  const { prisma } = mockPrisma({ description: rows });
  const translator = { translateBatch: vi.fn(async (us: any[]) => us.map(() => ({ ok: true as const, en: "x" }))) };
  const r = await runScan({ prisma, translator, force: true, cap: 2 });
  expect(r.translated).toBe(2);
  expect(r.capped).toBe(true);
  expect(r.remaining).toBe(1);
});

test("结束释放单飞锁(finally)", async () => {
  const { prisma, calls } = mockPrisma({ description: [] });
  const r = await runScan({ prisma, translator: { translateBatch: vi.fn() } });
  expect(calls.lockDelete).toBe(1);
  expect(r.locked).toBe(false);
});
