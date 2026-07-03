// 品牌:字标 OkkMa(墨)+ x(橙 #e0512b),与站内一致。表格骨架 + 内联样式,Gmail/QQ/Apple Mail 通吃。
// 注意:字体名用单引号!style 属性本身是双引号,字体名再用双引号会让 style 提前闭合 → Gmail 丢样式(验证码变小)。
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica Neue',Helvetica,Arial,sans-serif`;
const ACCENT = "#e0512b";
const INK = "#1c1917";

// preheader = 收件箱预览那行小字;inner = 卡片正文。
function wrap(preheader: string, inner: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="zh">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style="background-color:#f5f3f0;margin:0;padding:0;font-family:${FONT}">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${preheader}</div>
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#f5f3f0">
      <tbody><tr><td align="center" style="padding:32px 12px">
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background-color:#ffffff;border-radius:14px">
          <tbody><tr><td style="padding:32px 32px 28px">
            <div style="font-size:20px;font-weight:700;color:${INK};letter-spacing:-0.01em;margin-bottom:24px">OkkMa<span style="color:${ACCENT}">x</span></div>
            ${inner}
            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #ece9e4;font-size:12px;line-height:20px;color:#a8a29e">这封邮件由 OkkMax 自动发送,请勿直接回复。</div>
          </td></tr></tbody>
        </table>
      </td></tr></tbody>
    </table>
  </body>
</html>`;
}

export function verifyCodeEmail(code: string): { subject: string; html: string } {
  return {
    subject: "OkkMax 注册验证码",
    html: wrap(`注册验证码 ${code},10 分钟内有效`, `
      <h1 style="font-size:20px;font-weight:600;color:${INK};margin:0 0 12px">验证你的邮箱</h1>
      <p style="font-size:14px;line-height:24px;color:#44403c;margin:0 0 20px">你正在注册 OkkMax,在页面填入下面的验证码完成注册:</p>
      <div style="background-color:#f5f3f0;border-radius:12px;padding:20px 16px;text-align:center;margin:0 0 20px">
        <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:${INK};font-family:${FONT}">${code}</div>
      </div>
      <p style="font-size:13px;line-height:22px;color:#78716c;margin:0">验证码 10 分钟内有效,请勿泄露给他人。如果不是你本人操作,忽略这封邮件即可。</p>`),
  };
}

export function resetLinkEmail(url: string): { subject: string; html: string } {
  return {
    subject: "重置你的 OkkMax 密码",
    html: wrap("点击链接重置密码,30 分钟内有效", `
      <h1 style="font-size:20px;font-weight:600;color:${INK};margin:0 0 12px">重置密码</h1>
      <p style="font-size:14px;line-height:24px;color:#44403c;margin:0 0 20px">你申请了重置 OkkMax 密码,点击下方按钮设置新密码:</p>
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px">
        <tbody><tr><td align="center" style="border-radius:9px;background-color:${ACCENT}">
          <a href="${url}" target="_blank" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px">重置密码</a>
        </td></tr></tbody>
      </table>
      <p style="font-size:13px;line-height:22px;color:#78716c;margin:0 0 12px">链接 30 分钟内有效、仅可使用一次。若不是你本人申请,忽略即可,密码不会变更。</p>
      <p style="font-size:12px;line-height:20px;color:#a8a29e;margin:0;word-break:break-all">按钮打不开就复制链接到浏览器:<br />${url}</p>`),
  };
}
