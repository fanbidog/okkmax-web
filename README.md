# OkkMax Web

[OkkMax](https://www.okkmax.com) 网站前端开源仓 —— 一个 AI API 中转站测评与导航平台,采用"机器客观数据 + 用户真实口碑"双轨评价体系,帮助用户挑选可靠的中转站。

本仓库是网站本体(Next.js 全栈应用),开源目的是让评分展示口径、榜单逻辑与页面实现可被审计。数据采集与检测由独立的后端服务完成,不在本仓库内(见下文「架构说明」)。

## 功能

- **站点排行**:综合分榜单(可用性、速度、纯度三个指数聚合),支持按模型筛选
- **站点详情**:分组/模型/价格、检测明细、可用性趋势、动态事件、用户评价
- **可用性监测**:各站点各分组的实时状态与历史在线率
- **口碑**:真实用户评分、评价与优缺点标签
- **自带 Key 自测**:用户用自己的密钥即时检测某个站点(需自建检测后端,见下)
- **账号体系**:邮箱注册/Google 登录、积分、收藏、邀请
- **多语言**:中文为源,英文预翻译存库

## 技术栈

Next.js 16(App Router)+ Prisma + PostgreSQL,UI 无组件库依赖。

## 快速开始

要求:Node.js 20+、PostgreSQL。

```bash
npm install
cp .env.example .env      # 填 DATABASE_URL
cp .env.example .env.local # 填其余变量(按需)
npx prisma migrate deploy
npx prisma generate
npm run dev
```

可选:灌入演示数据看页面效果。

```bash
npx tsx scripts/seed-test-stations.ts   # 三个演示站点 + 评价
npx tsx scripts/seed-content.ts         # 帮助中心文档
```

## 架构说明

本仓库只包含网站本体。完整运行一套自己的测评平台还需要:

- **检测后端**:执行单次站点检测,通过 `DETECT_BASE_URL` 接入;未配置时「自带 Key 自测」接口返回 501,其余页面不受影响
- **可用性监测**:持续采集各站点在线率/延迟,结果写入本应用数据库(`UptimeSnapshot` 等表)
- **数据入库**:`npm run ingest` 提供手动收录站点的最小工具(读 `scripts/seed.local.json`,格式见 `scripts/seed.example.json`);自动化采集编排不在本仓库
- **评分**:`npm run score` 从库内数据计算各站指数与排名,建议用 cron 定时跑;权重与系数通过 `SCORE_*` 环境变量配置(见 `.env.example`)

## 常用命令

```bash
npm run dev     # 开发
npm run build   # 生产构建
npm run test    # 单测(vitest)
npm run lint    # eslint
npm run ingest  # 手动收录站点
npm run score   # 计算评分与排名
```

## 环境变量

见 [.env.example](.env.example),数据库外均为可选或按功能启用(发信、Google 登录、机翻、检测后端、评分口径)。
