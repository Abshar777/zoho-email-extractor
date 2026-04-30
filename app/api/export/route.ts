import { NextResponse } from "next/server";
import { getValidToken, getSession, getCredentials } from "@/lib/auth";
import { fetchAllEmails, fetchEmailBody, refreshAccessToken, ZohoEmail } from "@/lib/zoho";
import { createJob, updateJob } from "@/lib/jobs";
import { withConcurrency } from "@/lib/concurrency";
import * as XLSX from "xlsx";

export async function POST() {
  const token = await getValidToken();
  const { accountId, refreshToken } = await getSession();
  const creds = await getCredentials();

  if (!token || !accountId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const job = createJob();

  // Fire and forget — runs after response is sent
  (async () => {
    try {
      // Phase 1: Fetch all email metadata
      updateJob(job.id, { phase: "fetching-list" });
      let currentToken = token;

      const emails = await fetchAllEmails(currentToken, accountId, (count) => {
        updateJob(job.id, { fetched: count });
      });

      updateJob(job.id, { fetched: emails.length, total: emails.length, phase: "fetching-bodies" });

      // Refresh token if needed (for large inboxes)
      const ensureToken = async () => {
        if (creds && refreshToken) {
          const data = await refreshAccessToken(creds, refreshToken);
          if (data.access_token) currentToken = data.access_token;
        }
        return currentToken;
      };

      // Phase 2: Fetch bodies with 10 concurrent requests
      let bodiesDone = 0;
      const tasks = emails.map((email: ZohoEmail) => async () => {
        // Refresh token every 800 emails
        if (bodiesDone > 0 && bodiesDone % 800 === 0) {
          currentToken = await ensureToken();
        }
        const body = await fetchEmailBody(currentToken, accountId, email.folderId, email.messageId);
        bodiesDone++;
        updateJob(job.id, { bodiesDone });
        return body;
      });

      const bodies = await withConcurrency(tasks, 10);

      // Phase 3: Build Excel
      updateJob(job.id, { phase: "building-excel" });

      const CELL_LIMIT = 32767;
      const cap = (s: string) => s.slice(0, CELL_LIMIT);

      const rows = emails.map((email: ZohoEmail, i: number) => {
        const ts = parseInt(email.sentDateInGMT || email.receivedTime || "0");
        const date = ts ? new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "";
        return {
          "#": i + 1,
          Date: date,
          From: cap(email.fromAddress ?? ""),
          To: cap(email.toAddress ?? ""),
          CC: cap(email.ccAddress === "Not Provided" ? "" : (email.ccAddress ?? "")),
          Subject: cap(email.subject ?? ""),
          Body: cap(bodies[i] ?? ""),
          Attachments: email.hasAttachment === "1" ? (email.attachmentCount ?? 1) : 0,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 30 },
        { wch: 25 }, { wch: 40 }, { wch: 80 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Emails");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

      updateJob(job.id, { status: "done", phase: "done", buffer });
    } catch (err) {
      updateJob(job.id, {
        status: "error",
        phase: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  })();

  return NextResponse.json({ jobId: job.id });
}
