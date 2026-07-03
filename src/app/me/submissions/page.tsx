import { LockedPage } from "@/components/LockedPage";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/SiteNav";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import "./submissions.css";

export const dynamic = "force-dynamic";

// 状态/类型文案与标签色,与后台口径一致(ADMIN-SPEC SUB_STATUS / FB_STATUS / FB_TYPE)。
const SUB_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "待处理", tone: "gray" },
  approved: { label: "已通过", tone: "green" },
  built: { label: "已建站", tone: "green" },
  rejected: { label: "已驳回", tone: "red" },
};
const FB_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "待处理", tone: "gray" },
  resolved: { label: "已处理", tone: "green" },
  invalid: { label: "无效", tone: "amber" },
};
const FB_TYPE: Record<string, string> = {
  basic: "基本信息",
  price: "价格变动",
  model: "模型问题",
  other: "其他",
};

function fmt(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function MySubmissionsPage() {
  const me = await getCurrentUser();
  const locale = await getLocale();
  if (!me) return (<><SiteNav /><LockedPage title={t("我的提交", locale)} /></>);

  const [submissions, feedbacks] = await Promise.all([
    prisma.submission.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, url: true, status: true, resultNote: true, createdAt: true },
    }),
    prisma.feedback.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, body: true, status: true, createdAt: true, station: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <SiteNav />
      <div className="sub-pg">
        <div className="sp-wrap">
          <h1 className="sp-title">{t("我的提交与反馈", locale)}</h1>
          <p className="sp-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            {t("这里汇总你提交的收录申请与反馈,以及它们的处理进度。", locale)}
          </p>

          <h2 className="sp-sec-h">{t("我的提交", locale)}<span className="cnt">{t("共", locale)} {submissions.length} {t("条", locale)}</span></h2>
          <div className="sp-panel">
            <div className="sp-scroll">
            <table className="sp-table">
              <colgroup><col style={{ width: "44%" }} /><col style={{ width: "20%" }} /><col style={{ width: "36%" }} /></colgroup>
              <thead><tr><td>{t("站点", locale)}</td><td>{t("状态", locale)}</td><td>{t("提交时间", locale)}</td></tr></thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr><td colSpan={3} className="sp-none">{t("还没有提交记录", locale)}</td></tr>
                ) : submissions.map((s) => {
                  const st = SUB_STATUS[s.status] ?? { label: s.status, tone: "gray" };
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className="sp-name">{s.name}</span>
                        <span className="sp-url">{s.url}</span>
                        {s.status === "rejected" && s.resultNote && (
                          <div className="sp-reason"><b>{t("驳回原因", locale)}</b>{s.resultNote}</div>
                        )}
                      </td>
                      <td><span className={`tag ${st.tone}`}>{t(st.label, locale)}</span></td>
                      <td className="c-time">{fmt(s.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <h2 className="sp-sec-h">{t("我的反馈", locale)}<span className="cnt">{t("共", locale)} {feedbacks.length} {t("条", locale)}</span></h2>
          <div className="sp-panel">
            <div className="sp-scroll">
            <table className="sp-table sp-fb">
              <colgroup><col style={{ width: "20%" }} /><col style={{ width: "16%" }} /><col style={{ width: "32%" }} /><col style={{ width: "16%" }} /><col style={{ width: "16%" }} /></colgroup>
              <thead><tr><td>{t("站点", locale)}</td><td>{t("类型", locale)}</td><td>{t("内容", locale)}</td><td>{t("状态", locale)}</td><td>{t("提交时间", locale)}</td></tr></thead>
              <tbody>
                {feedbacks.length === 0 ? (
                  <tr><td colSpan={5} className="sp-none">{t("还没有反馈记录", locale)}</td></tr>
                ) : feedbacks.map((f) => {
                  const st = FB_STATUS[f.status] ?? { label: f.status, tone: "gray" };
                  return (
                    <tr key={f.id}>
                      <td><span className="sp-name">{f.station?.name ?? "—"}</span></td>
                      <td>{t(FB_TYPE[f.type] ?? f.type, locale)}</td>
                      <td><div className="sp-body">{f.body}</div></td>
                      <td><span className={`tag ${st.tone}`}>{t(st.label, locale)}</span></td>
                      <td className="c-time">{fmt(f.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
