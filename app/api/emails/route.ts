import { NextRequest, NextResponse } from "next/server";
import { getValidToken, getSession } from "@/lib/auth";
import { fetchEmailPage } from "@/lib/zoho";

export async function GET(req: NextRequest) {
  const token = await getValidToken();
  const { accountId } = await getSession();

  if (!token || !accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const start = parseInt(searchParams.get("start") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const emails = await fetchEmailPage(token, accountId, start, limit);
  return NextResponse.json({ emails, start, limit });
}
