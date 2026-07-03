/* 注册邮箱白名单种子。可重复跑(upsert)。灌完即激活严格白名单。 */
import { prisma } from "../src/lib/prisma";

const SEED: [string, string][] = [
  // 国内主流
  ["qq.com", "国内"], ["foxmail.com", "国内"], ["163.com", "国内"], ["126.com", "国内"],
  ["sina.com", "国内"], ["139.com", "国内"], ["aliyun.com", "国内"],
  // 国际主流
  ["gmail.com", "国际"], ["outlook.com", "国际"], ["hotmail.com", "国际"], ["live.com", "国际"],
  ["icloud.com", "国际"], ["yahoo.com", "国际"], ["proton.me", "国际"],
  // 教育(后缀匹配)
  ["*.edu.cn", "教育"], ["*.edu", "教育"],
];

async function main() {
  for (const [domain, note] of SEED) {
    await prisma.emailWhitelist.upsert({
      where: { domain },
      update: {},                 // 已存在不动(保留运营对 enabled 的调整)
      create: { domain, note, enabled: true },
    });
  }
  const n = await prisma.emailWhitelist.count({ where: { enabled: true } });
  console.log(`白名单种子已灌,当前启用 ${n} 条域名(白名单已激活)`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
