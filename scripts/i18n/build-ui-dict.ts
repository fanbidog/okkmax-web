// 扫描 src 里所有 t("中文") / t("中文", locale) 调用,抽出中文 key,把 messages/en.json 里缺的批量机翻补上。
// 每个 wave 接入后复用:npx tsx scripts/i18n/build-ui-dict.ts
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { GoogleV2Translator } from "../../src/lib/i18n/translate";

// 读 .env 里的 key(非 prisma 脚本不会自动加载 .env)
const env = readFileSync(".env", "utf8");
const key = (env.match(/^GOOGLE_TRANSLATE_API_KEY=(.+)$/m) || [])[1]?.trim() ?? "";

const DICT_PATH = "src/lib/i18n/messages/en.json";
const CJK = /[一-鿿]/;
// 已接入 t() 的文件(import 了翻译工具):对它们抽**全部中文字符串字面量**,覆盖 const 数组/函数返回/t() 参数,
// 不漏「经 t(变量) 渲染」的动态 key(如 Footer 的导航数组、scoreLabel 返回的评级词)。
const WIRED = /useT|i18n\/ui/;
// 枚举/标签源 lib(不 import t,但其中文值经 t(变量) 在已接入组件里渲染):显式纳入扫描。
const LIB_FILES = new Set([
  "src/lib/reviewTags.ts", "src/lib/stationEvents.ts", "src/lib/tier.ts",
  "src/lib/uptimeColor.ts", "src/lib/stationRow.ts", "src/lib/brandIcons.ts",
].map((p) => p.replace(/\//g, require("path").sep)));
const STR_DQ = /"((?:[^"\\\n]|\\.)*?)"/g; // 禁跨行(否则会把大段 JSX 当一个字符串吞进来)
const STR_SQ = /'((?:[^'\\\n]|\\.)*?)'/g;
const STR_TPL = /`([^`$\n]*)`/g; // 无插值、单行的模板串
// 合法 UI key:纯展示文案,不含代码特征,长度合理。过滤误抓的代码片段。
// 拒绝代码特征(换行/JSX/赋值/标识符关键字)即可滤掉误抓;长度放宽到 300(合法长 UI 句如 hero 副标题/营销文案保留)。
const isValidKey = (s: string) => CJK.test(s) && s.length <= 300 && !/[\n<>{}=]|\\[nt"]|=>|；\s|prisma|locale|const |await |return |style|className/.test(s);
// 经 t(变量) 渲染但抓不到的:无引号对象 key(雷达维度)+ DB 枚举值(模态/网络/绑卡)。
const SUPPLEMENT = [
  "速度", "纯度", "稳定", "价格", "模型",                       // 雷达维度(stationRow 无引号 key)
  "文本", "图像", "视频", "声音", "pdf", "推理", "代码",        // FreeApi.modality
  "免绑卡", "需实名", "国内直连", "需海外网络",                 // bindCard / network
];

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

async function main() {
  const files = walk("src");
  const keys = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (!WIRED.test(src) && !LIB_FILES.has(f)) continue; // 已接入 t() 的文件 + 显式枚举源 lib
    for (const re of [STR_DQ, STR_SQ, STR_TPL]) {
      for (const m of src.matchAll(re)) {
        if (isValidKey(m[1])) keys.add(m[1]);
      }
    }
  }
  for (const s of SUPPLEMENT) if (isValidKey(s)) keys.add(s);
  const dict: Record<string, string> = JSON.parse(readFileSync(DICT_PATH, "utf8"));
  // prune 历史误抓的代码片段 key(跨行正则遗留)
  let pruned = 0;
  for (const k of Object.keys(dict)) if (!isValidKey(k)) { delete dict[k]; pruned++; }
  if (pruned) console.log(`prune 掉 ${pruned} 个非法(代码片段)key`);
  const missing = [...keys].filter((k) => !(k in dict));
  console.log(`扫到 ${keys.size} 个 UI key,字典已有 ${Object.keys(dict).length},缺 ${missing.length}`);
  const writeBack = () => writeFileSync(DICT_PATH, JSON.stringify(Object.fromEntries(Object.keys(dict).sort().map((k) => [k, dict[k]])), null, 2) + "\n");
  if (!missing.length) {
    if (pruned) { writeBack(); console.log(`✅ prune ${pruned} 条已落盘,无新增`); } else console.log("无需补翻");
    return;
  }

  const tr = new GoogleV2Translator({ apiKey: key });
  // 分批翻(translateBatch 内部还会再分块)
  for (let i = 0; i < missing.length; i += 50) {
    const slice = missing.slice(i, i + 50);
    const res = await tr.translateBatch(slice.map((s) => ({ src: s })));
    slice.forEach((s, j) => { const r = res[j]; if (r.ok) dict[s] = r.en; else console.log(`❌ ${s}: ${r.error}`); });
  }
  writeBack(); // 按 key 排序写回(便于 review/diff)
  console.log(`✅ 补了 ${missing.length} 条,字典现 ${Object.keys(dict).length} 条,字符用量 ${tr.charsUsed()}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
