import { NextResponse } from "next/server";
import { getCredentials } from "@/lib/auth";
import { getAuthUrl } from "@/lib/zoho";

export async function GET() {
  const creds = await getCredentials();
  if (!creds) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(new URL("/setup", base));
  }
  return NextResponse.redirect(getAuthUrl(creds));
}
