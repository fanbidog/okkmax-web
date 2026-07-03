import { PAYMENT_ICON } from "@/lib/brandIcons";
import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/ui";
import type { Locale } from "@/lib/i18n/pick";

type Info = { minTopup?: string; payment?: string; invoice?: string; refund?: string; promo?: string };

const ICO = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5 } as const;
const Check = () => <svg {...ICO}><path d="M5 13l4 4L19 7" /></svg>;
const Cross = () => <svg {...ICO}><path d="M6 6l12 12M18 6L6 18" /></svg>;
const Dash = () => <svg {...ICO}><path d="M5 12h14" /></svg>;

// 发票/退款:固定词→绿✓/红✗,其余(其他：xxx / 有条件：xxx)→橙~并显说明
function Stat({ raw, ok, no, locale }: { raw?: string; ok: string; no: string; locale: Locale }) {
  if (!raw) return <>—</>;
  if (raw === ok) return <span className="pstat ok"><Check />{t(ok, locale)}</span>;
  if (raw === no) return <span className="pstat no"><Cross />{t(no, locale)}</span>;
  const m = raw.match(/^(其他|有条件)[:：]?(.*)$/);
  const head = m ? m[1] : raw;
  const detail = m ? m[2].trim() : "";
  return (
    <span className="statline">
      <span className="pstat cond"><Dash />{t(head, locale)}</span>
      {detail && <span className="psub">{detail}</span>}
    </span>
  );
}

/** 站点详情「基本信息」块:支付方式纯品牌图标(悬浮出名)、发票/退款带状态图标。人工录入,空项显「—」。 */
export async function StationBasicInfo({ name, info }: { name: string; info: Info }) {
  const locale = await getLocale();
  const pays = (info.payment ?? "").split("、").map((s) => s.trim()).filter(Boolean);
  const rows: { k: string; node: React.ReactNode }[] = [
    { k: t("网站名", locale), node: name },
    { k: t("最低充值", locale), node: info.minTopup || "—" },
    {
      k: t("支付方式", locale),
      node: pays.length ? (
        <span className="paylist">
          {pays.map((m) =>
            PAYMENT_ICON[m]
              ? <span key={m} className="payicon-w"><img className="payicon" src={PAYMENT_ICON[m]} alt={m} /><span className="paytip">{m}</span></span>
              : <span key={m} className="paytext">{m}</span>,
          )}
        </span>
      ) : "—",
    },
    { k: t("发票", locale), node: <Stat raw={info.invoice} ok="是" no="否" locale={locale} /> },
    { k: t("退款政策", locale), node: <Stat raw={info.refund} ok="支持" no="不支持" locale={locale} /> },
    { k: t("优惠", locale), node: info.promo || "—" },
  ];
  return (
    <div className="infogrid">
      {rows.map((r) => (
        <div className="infocard" key={r.k}>
          <div className="il">{r.k}</div>
          <div className="iv">{r.node}</div>
        </div>
      ))}
    </div>
  );
}
