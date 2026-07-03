"use client";
// 页面级错误边界(loading.tsx 的搭档):server 渲染/数据获取抛错时兜底,显示"出错+重试",
// 而不是白屏或无限转圈。永久 pending(如 DB 挂)由数据层超时转成抛错后也走这里。
import { useEffect } from "react";
import { useT } from "@/components/LocaleProvider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => { console.error("page error:", error); }, [error]);
  return (
    <div className="page-error" role="alert">
      <div className="pe-box">
        <div className="pe-t">{t("页面加载出错")}</div>
        <div className="pe-d">{t("可能是网络波动或服务暂时不可用,请重试。")}</div>
        <button className="btn-accent" onClick={() => reset()}>{t("重试")}</button>
      </div>
    </div>
  );
}
