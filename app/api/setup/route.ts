import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { clientId, clientSecret } = await req.json();

  if (!clientId?.trim() || !clientSecret?.trim()) {
    return NextResponse.json({ error: "Client ID and Secret are required" }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://zoho-email-extractor.deltaacademy.ae"}/api/auth/callback`;
  const jar = await cookies();
  const opts = { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 } as const;

  jar.set("zoho_client_id", clientId.trim(), opts);
  jar.set("zoho_client_secret", clientSecret.trim(), opts);
  jar.set("zoho_redirect_uri", redirectUri, opts);

  return NextResponse.json({ ok: true, redirectUri });
}
