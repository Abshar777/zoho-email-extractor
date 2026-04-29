import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/jobs";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "done" || !job.buffer) {
    return NextResponse.json({ error: "Not ready" }, { status: 409 });
  }

  const buffer = Buffer.from(job.buffer);
  deleteJob(jobId);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="zoho_emails_${Date.now()}.xlsx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
