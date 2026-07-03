import { sha } from "./hash";

export type Unit = { srcHash: string; src: string; fieldPath: string };
export type ScalarTarget = { kind: "scalar"; model: string; field: string };
export type JsonTarget = {
  kind: "json"; model: string; field: string;       // <field> + <field>_en
  extract: (row: any) => Unit[];
  inject: (curMap: Record<string, string>, done: { srcHash: string; en: string }[]) => Record<string, string>;
};
export type Target = ScalarTarget | JsonTarget;

const jsonInject = (cur: Record<string, string>, done: { srcHash: string; en: string }[]) => {
  const m = { ...cur };
  for (const d of done) m[d.srcHash] = d.en;
  return m;
};

export const TARGETS: Target[] = [
  { kind: "scalar", model: "Station", field: "description" },
  { kind: "scalar", model: "RelayPromo", field: "activity" },
  { kind: "scalar", model: "RelayPromo", field: "eligibility" },
  { kind: "scalar", model: "RelayPromo", field: "steps" },
  { kind: "scalar", model: "RelayPromo", field: "terms" },
  { kind: "scalar", model: "FreeApi", field: "quota" },
  { kind: "scalar", model: "Content", field: "title" },
  { kind: "scalar", model: "Content", field: "body" },
  {
    kind: "json", model: "Station", field: "announcements",
    extract: (r) => ((r.announcements ?? []) as any[]).flatMap((a, i) =>
      ([["title", a.title], ["content", a.content]] as [string, string][])
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => ({ src: v, srcHash: sha(v), fieldPath: `announcements[${i}].${k}` }))),
    inject: jsonInject,
  },
  {
    kind: "json", model: "Station", field: "routes",
    extract: (r) => ((r.routes ?? []) as any[])
      .map((rt, i) => (rt.desc?.trim() ? { src: rt.desc, srcHash: sha(rt.desc), fieldPath: `routes[${i}].desc` } : null))
      .filter(Boolean) as Unit[],
    inject: jsonInject,
  },
  {
    kind: "json", model: "Station", field: "info",
    extract: (r) => (["minTopup", "payment", "invoice", "refund", "promo"])
      .map((k) => { const v = r.info?.[k]; return v?.trim() ? { src: v, srcHash: sha(v), fieldPath: `info.${k}` } : null; })
      .filter(Boolean) as Unit[],
    inject: jsonInject,
  },
];
