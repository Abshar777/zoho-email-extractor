import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, getAccount } from "@/lib/zoho";
import { getCredentials } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/setup?error=no_code", req.url));

  const creds = await getCredentials();
  if (!creds) return NextResponse.redirect(new URL("/setup?error=no_creds", req.url));

  const tokens = await exchangeCode(creds, code);
  if (!tokens.access_token) return NextResponse.redirect(new URL("/setup?error=auth_failed", req.url));

  const account = await getAccount(tokens.access_token);
  if (!account) return NextResponse.redirect(new URL("/setup?error=no_account", req.url));

  const jar = await cookies();
  const opts = { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 } as const;

  jar.set("zoho_access_token", tokens.access_token, { ...opts, maxAge: 3600 });
  if (tokens.refresh_token) jar.set("zoho_refresh_token", tokens.refresh_token, opts);
  jar.set("zoho_account_id", account.accountId, opts);
  jar.set("zoho_email", account.primaryEmailAddress, opts);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
