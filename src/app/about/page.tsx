export const metadata = {
  title: "关于我们",
  description: "OkkMax 是一个独立的第三方 AI 中转站测评平台。了解我们做什么、怎么测,以及如何联系我们。",
};

export default function AboutPage() {
  return (
    <main className="legal">
      <h1>关于我们</h1>
      <div className="lg-upd">OkkMax · 独立第三方 AI 中转站测评平台</div>
      <p className="lg-lead">
        OkkMax 致力于用客观、可复现的方法,帮助你发现真正好用的 AI 中转站。我们独立于所展示的任何中转站,不接受影响评分的付费排名。
      </p>

      <h2>我们做什么</h2>
      <p>市面上的 AI 中转站良莠不齐:有的以次充好、用替身模型冒充官方,有的价格不透明、可用性时好时坏。我们把这些"看不见的差别"检测出来、公开呈现,让你在选择前就能看清一个站的真实成色。</p>

      <h2>我们怎么测</h2>
      <ul>
        <li><strong>纯度</strong>:通过加密签名交叉验证、行为与知识特征等手段,识别中转站是否真的在跑官方模型,还是掺入了替身或混合渠道。</li>
        <li><strong>可用性</strong>:持续定时探测各站各分组的在线率,记录成功、降级与失败。</li>
        <li><strong>速度</strong>:测量真实请求的响应延迟。</li>
        <li><strong>价格</strong>:采集并对比各站各模型的倍率与实价。</li>
      </ul>
      <p>检测方法与评分标准公开可查,详见<a href="/help">评测方法</a>与<a href="/help#scoring">评分说明</a>。检测结果的性质与边界,请见<a href="/disclaimer">免责声明</a>。</p>

      <h2>我们的立场</h2>
      <p>我们只呈现基于既定方法的客观结果,不对任何中转站做推荐或背书。数据尽力求准,但仍可能有偏差 —— 请始终以你自己的实际体验为准。</p>

      <h2 id="contact">联系我们</h2>
      <p>合作、纠错、收录申请或任何反馈,欢迎联系:</p>
      <ul>
        <li>邮箱:<a href="mailto:hello@okkmax.com">hello@okkmax.com</a></li>
        <li>站内:登录后可在站点页提交<strong>纠错反馈</strong>,或在<a href="/submit">收录申请</a>提交新的中转站。</li>
      </ul>

    </main>
  );
}
