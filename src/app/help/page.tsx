import { SiteNav } from "@/components/SiteNav";
import { HelpCenter, type Doc } from "@/components/HelpCenter";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";

export const dynamic = "force-dynamic";

// 帮助中心文档 key 与导航顺序(标题取自 Content.title,正文 markdown 取自 Content.body)。
const DOC_KEYS = ["method", "scoring", "conn"]; // terms/privacy 已拆为独立页 /terms /privacy

export const metadata = {
  title: "测评方法与评分标准",
  description: "OkkMax 如何测评 AI 中转站:纯度、可用性、价格的检测方法与综合评分标准。",
  alternates: { canonical: "/help" },
};

export default async function HelpPage() {
  const locale = await getLocale();
  const rows = await prisma.content.findMany({ where: { key: { in: DOC_KEYS } }, select: { key: true, title: true, title_en: true, body: true, body_en: true } });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const docs: Doc[] = DOC_KEYS.filter((k) => byKey.has(k)).map((k) => {
    const r = byKey.get(k)!;
    return { key: r.key, title: pick(r, "title", locale), body: pick(r, "body", locale) };
  });
  return (
    <>
      <SiteNav active="help" />
      <HelpCenter docs={docs} />
    </>
  );
}
