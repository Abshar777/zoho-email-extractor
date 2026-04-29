import { NextRequest, NextResponse } from "next/server";
import { getValidToken, getSession } from "@/lib/auth";

const MAIL_API = "https://mail.zoho.com/api";

export async function GET(req: NextRequest) {
  const token = await getValidToken();
  const { accountId } = await getSession();
  if (!token || !accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const messageId = req.nextUrl.searchParams.get("messageId");
  if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 });

  const res = await fetch(
    `${MAIL_API}/accounts/${accountId}/messages/${messageId}/attachments`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const data = await res.json();
  return NextResponse.json({ attachments: data.data ?? [] });
}
