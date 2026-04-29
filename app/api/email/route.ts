import { NextRequest, NextResponse } from "next/server";
import { getValidToken, getSession } from "@/lib/auth";

const MAIL_API = "https://mail.zoho.com/api";

export async function GET(req: NextRequest) {
  const token = await getValidToken();
  const { accountId } = await getSession();

  if (!token || !accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const messageId = req.nextUrl.searchParams.get("messageId");
  const folderId = req.nextUrl.searchParams.get("folderId");

  if (!messageId || !folderId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const res = await fetch(
    `${MAIL_API}/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const data = await res.json();
  const html = data.data?.content ?? "";
  return NextResponse.json({ html });
}
