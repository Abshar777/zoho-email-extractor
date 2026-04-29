"use client";

import { useState, useEffect, useRef } from "react";

type ExportState = "idle" | "starting" | "polling" | "done" | "error";
type Phase = "pending" | "fetching-list" | "fetching-bodies" | "building-excel" | "done" | "error";

interface JobStatus {
  status: string;
  phase: Phase;
  fetched: number;
  bodiesDone: number;
  total: number;
  error?: string;
}

const phaseLabels: Record<Phase, string> = {
  pending: "Starting…",
  "fetching-list": "Fetching email list…",
  "fetching-bodies": "Fetching email content…",
  "building-excel": "Building Excel file…",
  done: "Ready!",
  error: "Error",
};

export default function ExportButton() {
  const [state, setState] = useState<ExportState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function startExport() {
    setState("starting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/export", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start export");
      const { jobId } = await res.json();
      setJobId(jobId);
      setState("polling");
      pollRef.current = setInterval(() => poll(jobId), 2000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start");
      setState("error");
    }
  }

  async function poll(id: string) {
    try {
      const res = await fetch(`/api/export/status?jobId=${id}`);
      if (!res.ok) return;
      const data: JobStatus = await res.json();
      setJobStatus(data);

      if (data.status === "done") {
        if (pollRef.current) clearInterval(pollRef.current);
        setState("done");
      } else if (data.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setErrorMsg(data.error ?? "Export failed");
        setState("error");
      }
    } catch {}
  }

  function download() {
    window.location.href = `/api/export/download?jobId=${jobId}`;
    setTimeout(() => { setState("idle"); setJobId(null); setJobStatus(null); }, 3000);
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setState("idle");
    setJobId(null);
    setJobStatus(null);
    setErrorMsg("");
  }

  const total = jobStatus?.total ?? 0;
  const pct =
    jobStatus?.phase === "fetching-bodies" && total > 0
      ? Math.round((jobStatus.bodiesDone / total) * 100)
      : jobStatus?.phase === "fetching-list"
      ? 10
      : jobStatus?.phase === "building-excel"
      ? 95
      : 0;

  if (state === "idle") {
    return (
      <button
        onClick={startExport}
        className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export All to Excel
      </button>
    );
  }

  if (state === "done") {
    return (
      <button
        onClick={download}
        className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm animate-pulse"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Excel
      </button>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">{errorMsg}</span>
        <button onClick={reset} className="text-xs text-gray-500 underline">Retry</button>
      </div>
    );
  }

  // starting or polling
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-xs font-medium text-gray-700">
            {jobStatus ? phaseLabels[jobStatus.phase] : "Starting…"}
          </span>
        </div>

        {jobStatus && (
          <div className="text-xs text-gray-500">
            {jobStatus.phase === "fetching-list" && `${jobStatus.fetched.toLocaleString()} emails found`}
            {jobStatus.phase === "fetching-bodies" &&
              `${jobStatus.bodiesDone.toLocaleString()} / ${total.toLocaleString()} bodies (${pct}%)`}
            {jobStatus.phase === "building-excel" && "Almost done…"}
          </div>
        )}

        {jobStatus && jobStatus.phase === "fetching-bodies" && total > 0 && (
          <div className="w-40 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
