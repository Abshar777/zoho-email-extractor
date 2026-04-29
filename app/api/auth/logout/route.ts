import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  const toDelete = [
    "zoho_access_token", "zoho_refresh_token",
    "zoho_account_id", "zoho_email",
    "zoho_client_id", "zoho_client_secret", "zoho_redirect_uri",
  ];
  toDelete.forEach((k) => jar.delete(k));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL("/", base));
}
