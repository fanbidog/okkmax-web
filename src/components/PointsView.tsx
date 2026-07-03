"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import { PointsCoin } from "@/components/PointsCoin";
import { useT } from "@/components/LocaleProvider";

type DoneKey = "checkin" | "detectDaily" | "like" | "review" | "feedback" | "detectFirst" | "favoriteFirst" | "profile";

export interface PointsData {
  name: string;
  image: string | null;
  points: number;
  loggedIn: boolean;
  done: Record<DoneKey, boolean>;
  logs: { id: string; delta: number; reason: string; at: string }[];
}

type Task = { key?: DoneKey; t: string; d: string; pts: string; go: string; href?: string; checkin?: boolean; invite?: boolean; soon?: boolean };

const SECTIONS: { title: string; note: string; tasks: Task[] }[] = [
  {
    title: "日常任务", note: "每日 0 点重置", tasks: [
      { key: "checkin", t: "每日签到", d: "UTC+8 每天可签到一次，每次随机获得 3~5 分", pts: "3~5", go: "去签到", checkin: true },
      { key: "detectDaily", t: "每日检测", d: "在首页发起一次中转站检测，验证额度/纯度，每天首次得分", pts: "3", go: "去检测", href: "/" },
      { key: "like", t: "点赞优质评价", d: "给一条对你有用的评价点赞，帮好评价浮上来，每天首次得分", pts: "2", go: "去点赞", href: "/reputation" },
    ],
  },
  {
    title: "进阶任务", note: "优质贡献，多劳多得", tasks: [
      { key: "review", t: "发表点评", d: "对用过的中转站写真实点评，每天首条点评得分", pts: "8", go: "去评价", href: "/list" },
      { key: "feedback", t: "反馈纠错", d: "指出站点价格/模型/信息有误，每天首条提交得分", pts: "5", go: "去纠错", href: "/list" },
      { t: "邀请好友", d: "分享你的专属邀请链接，好友注册成功后双方得分", pts: "20", go: "去邀请", invite: true },
    ],
  },
  {
    title: "基础任务", note: "一次性，完成即得", tasks: [
      { t: "加入官方社群", d: "加入官方 Telegram / 微信群，第一手掌握跑路预警与新站动态", pts: "5", go: "敬请期待", soon: true },
      { key: "profile", t: "完善资料", d: "设置头像和昵称，让你的点评更有辨识度", pts: "5", go: "去完善", href: "/me" },
      { key: "detectFirst", t: "完成首次检测", d: "第一次发起站点检测，体验纯度/额度实测", pts: "5", go: "去检测", href: "/" },
      { key: "favoriteFirst", t: "首次收藏", d: "收藏第一个中转站，方便随时回看对比", pts: "3", go: "去收藏", href: "/list" },
    ],
  },
];

const DAILY = new Set<DoneKey>(["checkin", "detectDaily", "like", "review", "feedback"]);
const doneLabel = (k: DoneKey) => (k === "checkin" ? "今日已签到" : DAILY.has(k) ? "今日已领" : "已完成");

export function PointsView({ data }: { data: PointsData }) {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const openAuth = () => window.dispatchEvent(new CustomEvent("open-auth"));

  function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 700);
  }

  async function checkin() {
    if (!data.loggedIn) { openAuth(); return; }
    if (busy || data.done.checkin) return;
    setBusy(true);
    const res = await fetch("/api/checkin", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { toast(`${t("签到成功")} +${d.award}`); router.refresh(); }
    else if (res.status === 409) { toast(t("今日已签到")); router.refresh(); }
    else toast(d.error || t("签到失败"), "err");
  }

  function Action({ task }: { task: Task }) {
    if (task.soon) return <span className="pt-go done">{t("敬请期待")}</span>;
    // 未登录:所有任务入口都先弹登录(避免误以为不登录也能赚分)
    if (!data.loggedIn) return <button className="pt-go" onClick={openAuth}>{t(task.go)}</button>;
    if (task.invite) return <button className="pt-go" onClick={() => window.dispatchEvent(new CustomEvent("open-invite"))}>{t(task.go)}</button>;
    const done = task.key ? data.done[task.key] : false;
    if (task.key && done) return <span className="pt-go done">{t(doneLabel(task.key))}</span>;
    if (task.checkin) return <button className="pt-go" onClick={checkin} disabled={busy}>{busy ? t("签到中…") : t(task.go)}</button>;
    return <a className="pt-go" href={task.href}>{t(task.go)}</a>;
  }

  return (
    <div className="pts-root">
      <div className="wrap" style={{ paddingBottom: 80 }}>
        {/* 顶部横幅 */}
        <div className="pbanner">
          <div className="pb-l">
            {data.image
              ? <img className="pb-av" src={data.image} alt="" />
              : <span className="pb-av" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg2)", color: "var(--ink3)" }}>
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zm0 1.8c-4.1 0-7.6 2.1-7.6 5.3v.5h15.2v-.5c0-3.2-3.5-5.3-7.6-5.3z" /></svg>
                </span>}
            <div>
              <div className="pb-name">{data.name}</div>
              <div className="pb-sub">{t("做任务赚积分，积分可兑换权益")}</div>
            </div>
          </div>
          <div className="pb-r">
            <div className="pb-stat">
              <div className="k">{t("当前积分")}</div>
              <div className="v">{data.points}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ptabs">
          <button className={"ptab" + (tab === 0 ? " on" : "")} onClick={() => setTab(0)}>{t("任务列表")}</button>
          <button className={"ptab" + (tab === 1 ? " on" : "")} onClick={() => setTab(1)}>{t("积分兑换")}</button>
          <button className={"ptab" + (tab === 2 ? " on" : "")} onClick={() => setTab(2)}>{t("积分明细")}</button>
          <div className="prefresh">
            {tab === 0 && <span>{t("日常任务每日 0 点(UTC+8)重置")}</span>}
            <button onClick={refresh}><svg className={refreshing ? "spin" : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>{t("刷新")}</button>
          </div>
        </div>

        {/* 任务列表 */}
        {tab === 0 && SECTIONS.map((sec) => (
          <div className="psec" key={sec.title}>
            <div className="psec-h"><div className="psec-t">{t(sec.title)}<span className="cnt">{t(sec.note)}</span></div></div>
            <div className="pgrid">
              {sec.tasks.map((task) => (
                <div className="ptask" key={task.t}>
                  <div className="pt-t">{t(task.t)}</div>
                  <div className="pt-d">{t(task.d)}</div>
                  <div className="pt-foot">
                    <span className="pt-pts"><PointsCoin size={20} />{task.pts}</span>
                    <Action task={task} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 积分兑换(暂未开放) */}
        {tab === 1 && (
          <div className="pempty">
            <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v9H4v-9" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></div>
            <div className="t">{t("积分兑换暂未开放")}</div>
          </div>
        )}

        {/* 积分明细 */}
        {tab === 2 && (
          <div style={{ marginTop: 24 }}>
            {data.logs.length ? data.logs.map((l) => (
              <div className="plog" key={l.id}>
                <span className="pl-date">{l.at}</span>
                <span className="pl-reason">{t(l.reason)}</span>
                <span className={"pl-pts" + (l.delta < 0 ? " neg" : "")}><PointsCoin size={22} neg={l.delta < 0} />{l.delta >= 0 ? "+" : ""}{l.delta}</span>
              </div>
            )) : <div className="plist-empty">{t("还没有积分记录，去做任务赚分吧。")}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
