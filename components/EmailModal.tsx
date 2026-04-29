"use client";

import { useEffect, useState } from "react";
import { ZohoEmail } from "@/lib/zoho";

interface Attachment {
  attachmentId: string;
  attachmentName: string;
  attachmentSize: number;
  attachmentType: string;
}

function fileIcon(type: string) {
  if (type?.includes("pdf")) return "📄";
  if (type?.includes("image")) return "🖼️";
  if (type?.includes("word") || type?.includes("document")) return "📝";
  if (type?.includes("sheet") || type?.includes("excel") || type?.includes("csv")) return "📊";
  if (type?.includes("zip") || type?.includes("compressed")) return "🗜️";
  if (type?.includes("video")) return "🎥";
  if (type?.includes("audio")) return "🎵";
  return "📎";
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailModal({
  email,
  onClose,
}: {
  email: ZohoEmail;
  onClose: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setHtml(null);
    setAttachments([]);

    fetch(`/api/email?messageId=${email.messageId}&folderId=${email.folderId}`)
      .then((r) => r.json())
      .then((d) => setHtml(d.html ?? ""))
      .catch(() => setHtml(""))
      .finally(() => setLoading(false));

    if (email.hasAttachment === "1") {
      fetch(`/api/attachments?messageId=${email.messageId}`)
        .then((r) => r.json())
        .then((d) => setAttachments(d.attachments ?? []))
        .catch(() => {});
    }
  }, [email.messageId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function downloadAttachment(att: Attachment) {
    setDownloadingId(att.attachmentId);
    try {
      const url = `/api/attachment?messageId=${email.messageId}&attachmentId=${att.attachmentId}&fileName=${encodeURIComponent(att.attachmentName)}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = att.attachmentName;
      a.click();
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  }

  function previewUrl(att: Attachment) {
    return `/api/attachment?messageId=${email.messageId}&attachmentId=${att.attachmentId}&fileName=${encodeURIComponent(att.attachmentName)}`;
  }

  const isPreviewable = (type: string) =>
    type?.includes("image") || type?.includes("pdf");

  function formatDate(ts: string) {
    if (!ts) return "";
    try {
      return new Date(parseInt(ts)).toLocaleString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return ""; }
  }

  function cleanAddr(addr: string) {
    if (!addr) return "";
    return addr.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }

  const srcDoc = html
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#111;margin:16px;padding:0;background:#fff;word-wrap:break-word;overflow-wrap:break-word}
img{max-width:100%;height:auto}a{color:#2563eb}table{max-width:100%!important}
</style></head><body>${html}</body></html>`
    : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="font-bold text-gray-900 text-base leading-snug">
              {email.subject || "(No Subject)"}
            </h2>
            {email.hasAttachment === "1" && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                📎 {attachments.length > 0 ? `${attachments.length} attachment${attachments.length > 1 ? "s" : ""}` : "Has attachment"}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0 space-y-1.5">
          <MetaRow label="From" value={cleanAddr(email.fromAddress)} />
          <MetaRow label="To"   value={cleanAddr(email.toAddress)} />
          {email.ccAddress && email.ccAddress !== "Not Provided" && (
            <MetaRow label="CC"   value={cleanAddr(email.ccAddress)} />
          )}
          <MetaRow label="Date" value={formatDate(email.sentDateInGMT || email.receivedTime)} />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              ATTACHMENTS ({attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div key={att.attachmentId}
                  className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white hover:bg-gray-50 transition-colors group">
                  <span className="text-lg">{fileIcon(att.attachmentType)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate max-w-[140px]">{att.attachmentName}</p>
                    <p className="text-xs text-gray-400">{formatSize(att.attachmentSize)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPreviewable(att.attachmentType) && (
                      <a href={previewUrl(att)} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded-lg"
                        title="Preview">
                        👁
                      </a>
                    )}
                    <button
                      onClick={() => downloadAttachment(att)}
                      disabled={downloadingId === att.attachmentId}
                      className="text-xs text-green-600 hover:text-green-800 border border-green-200 px-2 py-1 rounded-lg disabled:opacity-50"
                      title="Download"
                    >
                      {downloadingId === att.attachmentId ? "…" : "⬇"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm h-40">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading email…
            </div>
          ) : html ? (
            <iframe
              srcDoc={srcDoc}
              sandbox="allow-same-origin allow-popups"
              className="w-full h-full border-0"
              style={{ minHeight: "360px" }}
              title="Email preview"
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No content available.
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-3 flex justify-end flex-shrink-0 bg-gray-50">
          <button onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-semibold text-gray-500 w-10 flex-shrink-0">{label}</span>
      <span className="text-gray-700 break-all">{value}</span>
    </div>
  );
}
