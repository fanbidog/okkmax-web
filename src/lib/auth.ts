import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "ceping_session";
const DAYS = 30;

export type SessionUser = { id: string; email: string; name: string | null; image: string | null };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** 建会话(只写库,返回 token+过期)。cookie 由调用方(route handler)设在响应上。 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

/** 请求是否走 https。http(本地/局域网直连)下必须 secure:false,否则浏览器丢弃 cookie 导致登录不持久。 */
export function isSecureRequest(req: Request): boolean {
  const xf = req.headers.get("x-forwarded-proto");
  if (xf) return xf.split(",")[0].trim() === "https";
  try { return new URL(req.url).protocol === "https:"; } catch { return false; }
}

export function sessionCookieOptions(expiresAt: Date, secure = process.env.NODE_ENV === "production") {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", expires: expiresAt };
}

export async function clearSessionByToken(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

/** 重定向用的真实来源:取客户端实际访问的 Host,避免 `-H 0.0.0.0` 时 req.url 解析成不可达的 0.0.0.0。 */
export function requestOrigin(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  return `${proto}://${host}`;
}

/** 读当前登录用户(无则 null)。只读 cookie,可在服务端组件/route handler 用。 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  if (s.user.status === "banned") return null; // 封号即视为未登录(login route 的校验只在登录那刻生效,这是会话层防御)
  return { id: s.user.id, email: s.user.email, name: s.user.name, image: s.user.image };
}
