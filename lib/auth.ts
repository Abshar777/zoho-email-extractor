import { cookies } from "next/headers";
import { refreshAccessToken, ZohoCreds } from "./zoho";

export async function getCredentials(): Promise<ZohoCreds | null> {
  const jar = await cookies();
  const clientId = jar.get("zoho_client_id")?.value;
  const clientSecret = jar.get("zoho_client_secret")?.value;
  const redirectUri = jar.get("zoho_redirect_uri")?.value;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export async function getValidToken(): Promise<string | null> {
  const jar = await cookies();
  const accessToken = jar.get("zoho_access_token")?.value;
  if (accessToken) return accessToken;

  const refreshToken = jar.get("zoho_refresh_token")?.value;
  if (!refreshToken) return null;

  const creds = await getCredentials();
  if (!creds) return null;

  const data = await refreshAccessToken(creds, refreshToken);
  if (!data.access_token) return null;

  jar.set("zoho_access_token", data.access_token, {
    httpOnly: true,
    path: "/",
    maxAge: 3600,
  });
  return data.access_token;
}

export async function getSession() {
  const jar = await cookies();
  return {
    accountId: jar.get("zoho_account_id")?.value ?? null,
    email: jar.get("zoho_email")?.value ?? null,
    refreshToken: jar.get("zoho_refresh_token")?.value ?? null,
  };
}
