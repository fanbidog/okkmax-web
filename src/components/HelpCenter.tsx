"use client";
import { useState, useEffect, type ReactNode } from "react";
import { useT } from "@/components/LocaleProvider";

export type Doc = { key: string; title: string; body: string };

const NAV = [
  { group: "平台说明", items: [{ key: "method", label: "评测方法" }, { key: "scoring", label: "评分说明" }, { key: "conn", label: "连通性测试" }] },
  // 法律条款(用户协议/隐私政策)已拆为独立页 /terms /privacy /disclaimer,不再放帮助中心
];

const h1s: React.CSSProperties = { fontSize: 23, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.3 };
const leadS: React.CSSProperties = { fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.7, margin: "12px 0 4px" };
const dateS: React.CSSProperties = { fontSize: 13, color: "var(--ink3)", marginTop: 9 };
const h2s: React.CSSProperties = { fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", margin: "34px 0 12px" };
const pS: React.CSSProperties = { fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.85, margin: "0 0 13px" };
const listS: React.CSSProperties = { fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.8, paddingLeft: 22, margin: "0 0 13px", listStyleType: "decimal", listStylePosition: "outside" };
const liS: React.CSSProperties = { marginBottom: 6 };
const strongS: React.CSSProperties = { color: "var(--ink)", fontWeight: 600 };

function H1({ children }: { children: ReactNode }) { return <h1 style={h1s}>{children}</h1>; }
function H2({ children, id }: { children: ReactNode; id?: string }) { return <h2 id={id} style={{ ...h2s, scrollMarginTop: 90 }}>{children}</h2>; }
function P({ children }: { children: ReactNode }) { return <p style={pS}>{children}</p>; }
function S({ children }: { children: ReactNode }) { return <strong style={strongS}>{children}</strong>; }

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="help-table-x">
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, margin: "6px 0 14px" }}>
      <thead>
        <tr>{head.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "9px 12px", background: "var(--bg2)", color: "var(--ink3)", fontWeight: 600, fontSize: 12.5, borderBottom: "1px solid var(--line)" }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "11px 12px", borderBottom: "1px solid var(--line)", color: j === 0 ? "var(--ink)" : "var(--ink2)", fontWeight: j === 0 ? 600 : 400, verticalAlign: "top", lineHeight: 1.6, whiteSpace: j <= 1 ? "nowrap" : "normal" }}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/** 行内 markdown:仅处理 **强调**(→ S),其余原样。保持与原硬编码 <S> 视觉一致。 */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <S key={i}>{p.slice(2, -2)}</S>
      : <span key={i}>{p}</span>
  );
}

/** 灰色 12px 副标 span,与原硬编码协议表第二行视觉一致。 */
const subS: React.CSSProperties = { fontWeight: 400, color: "var(--ink3)", fontSize: 12 };

/**
 * 表格单元格渲染:把约定的 <br> 标记当作换行,拆成「主行 + 灰色副标」。
 * <br> 作为标记被解析成真正的 React <br/>/<span>,绝不走 dangerouslySetInnerHTML。
 * 无 <br> 时退化为普通行内渲染。
 */
function tableCell(text: string): ReactNode {
  const idx = text.indexOf("<br>");
  if (idx === -1) return inline(text);
  const main = text.slice(0, idx);
  const sub = text.slice(idx + 4);
  return <>{inline(main)}<br /><span style={subS}>{inline(sub)}</span></>;
}

/** 把一行表格按 | 切分成单元格(去掉首尾空管道)。 */
function tableCells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

/**
 * 轻量 markdown → React,输出复用本文件已有的排版组件(H1/H2/P/S/Table/ol),
 * 让 CMS 正文与改造前的硬编码 JSX 像素级一致。支持的语法:
 *   - 标题 H1 = Content.title(顶部);## = H2
 *   - 段落首行「最后更新:…」= dateS;其后第一段 = leadS;其余段落 = P
 *   - GFM 表格(| 头 | …,次行 | --- |)= Table
 *   - 有序列表「1. 内容」= ol/listS;「1.1 内容」当作普通段落(与原文一致)
 *   - 行内 **强调** = S
 */
function renderMarkdown(title: string, body: string): ReactNode {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  out.push(<H1 key="h1">{title}</H1>);

  let leadDone = false; // 第一段正文用 leadS,之后用 P
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") { i++; continue; }

    // 最后更新 dateline(置于 lead 之前)
    if (trimmed.startsWith("最后更新")) {
      out.push(<div key={`d${k++}`} style={dateS}>{trimmed}</div>);
      i++;
      continue;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      out.push(<H2 key={`h2${k++}`} id={`s${k}`}>{trimmed.slice(3)}</H2>);
      i++;
      continue;
    }

    // 表格:本行含 | 且下一行是分隔符 | --- |
    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = tableCells(line);
      const rows: ReactNode[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes("|")) {
        rows.push(tableCells(lines[j]).map((c) => tableCell(c)));
        j++;
      }
      out.push(<Table key={`t${k++}`} head={head} rows={rows} />);
      i = j;
      continue;
    }

    // 有序列表块:连续的「1. 内容」(单层数字,非 1.1)
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      out.push(
        <ol key={`ol${k++}`} style={listS}>
          {items.map((it, n) => <li key={n} style={liS}>{inline(it)}</li>)}
        </ol>
      );
      continue;
    }

    // 普通段落(含「1.1 …」这种次级编号,保持原文为独立段落)
    if (!leadDone) {
      out.push(<p key={`lead${k++}`} style={leadS}>{inline(trimmed)}</p>);
      leadDone = true;
    } else {
      out.push(<P key={`p${k++}`}>{inline(trimmed)}</P>);
    }
    i++;
  }
  return <>{out}</>;
}

export function HelpCenter({ docs, initial = "method" }: { docs: Doc[]; initial?: string }) {
  const t = useT();
  const [active, setActive] = useState(initial);
  const byKey = new Map(docs.map((d) => [d.key, d]));
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && byKey.has(h)) setActive(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const doc = byKey.get(active);
  return (
    <div className="wrap help-grid" style={{ display: "grid", paddingTop: 32, paddingBottom: 80, alignItems: "start" }}>
      <aside className="help-aside" style={{ fontSize: 14.5 }}>
        {NAV.map((g, gi) => (
          <div key={g.group}>
            <div style={{ fontSize: 11, color: "var(--ink3)", margin: gi ? "16px 0 6px" : "0 0 6px" }}>{t(g.group)}</div>
            {g.items.map((it) => (
              <button key={it.key} onClick={() => setActive(it.key)}
                style={{ display: "block", width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer", border: "none", fontSize: 14.5,
                  padding: "11px 13px", borderRadius: 11,
                  background: active === it.key ? "rgba(224,81,43,.08)" : "transparent",
                  color: active === it.key ? "var(--accent-d)" : "var(--ink2)",
                  fontWeight: active === it.key ? 600 : 400 }}>
                {t(it.label)}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <main style={{ minWidth: 0, maxWidth: 720 }}>{doc ? renderMarkdown(doc.title, doc.body) : null}</main>
    </div>
  );
}
