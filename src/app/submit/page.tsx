import { SiteNav } from "@/components/SiteNav";
import { SubmitForm } from "@/components/SubmitForm";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

// 提交收录:免登录可提交(站长向);登录则关联 userId。
export default async function SubmitPage() {
  const locale = await getLocale();
  return (
    <>
      <SiteNav />
      <div className="wrap submit-page" style={{ paddingBottom: 40 }}>
        <div style={{ padding: "34px 0 46px" }}>
          <h1 style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em" }}>{t("提交收录", locale)}</h1>
        </div>
        <div className="sgrid">
          <aside className="guide">
            <div className="intro">
              <h3>{t("为什么提交到 OkkMax", locale)}</h3>
              <p>{t("OkkMax 是独立第三方中转站测评平台,纯度、可用性、价格全部来自自动探针实测,客观可复现。", locale)}</p>
              <p>{t("被收录意味着获得", locale)}<b>{t("客观、可复现的质量背书", locale)}</b>{t(",出现在用户主动挑选中转站的榜单里,精准触达高意向用户;实测数据与口碑长期沉淀,稳定的表现就是最好的招牌。", locale)}</p>
              <p>{t("全程免费,不收取任何影响排名的费用;提交后人工逐条核实,通过即收录。", locale)}</p>
            </div>
          </aside>
          <SubmitForm />
        </div>
      </div>
    </>
  );
}
