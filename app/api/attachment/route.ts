import { NextRequest, NextResponse } from "next/server";
import { getValidToken, getSession } from "@/lib/auth";

const MAIL_API = "https://mail.zoho.com/api";

export async function GET(req: NextRequest) {
  const token = await getValidToken();
  const { accountId } = await getSession();
  if (!token || !accountId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const messageId = searchParams.get("messageId");
  const attachmentId = searchParams.get("attachmentId");
  const fileName = searchParams.get("fileName") ?? "attachment";

  if (!messageId || !attachmentId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const res = await fetch(
    `${MAIL_API}/accounts/${accountId}/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 502 });

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = await res.arrayBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
