// 根路由加载 fallback:切页面/数据获取时,导航栏保留、内容区居中转圈(Next App Router Suspense)。
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-label="加载中">
      <span className="spinner" />
    </div>
  );
}
