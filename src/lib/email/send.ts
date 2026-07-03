import { Resend } from "resend";

// 全站唯一发信出口。key/from 仅服务端读,缺失即抛(让调用方感知配置问题,而非静默不发)。
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("缺少 RESEND_API_KEY 或 EMAIL_FROM 环境变量");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend 发信失败:${error.message}`);
}
