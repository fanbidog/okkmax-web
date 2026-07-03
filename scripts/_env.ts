// 独立 tsx 脚本的环境变量加载。
// Next 会自动读 .env / .env.local,但 `tsx scripts/*.ts` 不会 ——
// 以前靠「Prisma Client 运行时顺带读 .env」的副作用,且 .env.local 被忽略,很脆:
// 换非默认端口 / 某脚本不 import prisma 时就会读到错误地址。这里显式加载。
// 优先级与 Next 一致:已存在的 process.env(shell)> .env.local > .env。
// 必须在任何读取 env 的模块(prisma / fetchCatalog 等)之前 import 本文件。
import { existsSync } from "node:fs";
import { config } from "dotenv";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) config({ path: file, quiet: true }); // override 默认 false:先加载者(及 shell)优先;quiet 抑制 dotenv 广告日志
}
