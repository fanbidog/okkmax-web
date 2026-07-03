// Google OAuth(授权码流)。Google 只做身份验证;验证通过后走现有 cookie session 鉴权。
// 换码是服务端对服务端(带 client_secret、TLS 直连 Google),返回的 id_token 即可信;再校验 aud/iss/email_verified 作纵深防御。

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
// 起跳时写、回调时读的短时 cookie,存 { state, next }。state 防 CSRF,next 携带登录后去向。
export const OAUTH_STATE_COOKIE = "okkmax_oauth";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** 拼 Google 授权地址(起跳)。scope 只要 openid/email/profile。 */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string | null; picture: string | null };

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("bad id_token");
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

/** 用 code 换 token、解 id_token、校验,返回 Google 身份。redirectUri 必须和起跳时一致。 */
export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("no id_token");

  const p = decodeJwtPayload(data.id_token);
  if (p.aud !== CLIENT_ID) throw new Error("aud mismatch");
  if (p.iss !== "https://accounts.google.com" && p.iss !== "accounts.google.com") throw new Error("iss mismatch");

  return {
    sub: String(p.sub),
    email: String(p.email ?? "").trim().toLowerCase(),
    emailVerified: p.email_verified === true || p.email_verified === "true",
    name: p.name ? String(p.name) : null,
    picture: p.picture ? String(p.picture) : null,
  };
}
