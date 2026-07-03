// 检测历史:仅存浏览器 localStorage(匿名免登录)。提交检测时写一条,
// 结果页跑完 done 再回填 评分/档位/站名/logo。换设备或清缓存会丢,这是预期。
export interface HistoryEntry {
  jobId: string;
  baseUrl: string;
  host: string;
  model: string;
  at: string; // ISO 提交时间
  score?: number;
  tierColor?: "green" | "amber" | "red";
  stationName?: string;
  stationLogo?: string | null;
}

const KEY = "okkmax:history:v1";
const MAX = 50;

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* 隐私模式/超额:静默放弃,历史只是锦上添花 */
  }
}

export function loadHistory(): HistoryEntry[] {
  return read();
}

/** 提交检测时调用:按 jobId 去重后置顶。 */
export function addHistory(entry: HistoryEntry) {
  const list = read().filter((x) => x.jobId !== entry.jobId);
  list.unshift(entry);
  write(list);
}

/** 结果 done 后回填评分/档位/站点(条目不存在则不动,如直接打开他人分享链接)。 */
export function patchHistory(jobId: string, patch: Partial<HistoryEntry>) {
  const list = read();
  const i = list.findIndex((x) => x.jobId === jobId);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  write(list);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
