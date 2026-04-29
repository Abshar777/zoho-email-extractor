"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ZohoEmail } from "@/lib/zoho";
import EmailModal from "./EmailModal";
import ExportButton from "./ExportButton";

const PAGE_SIZE = 25;
const FETCH_BATCH = 200;

interface Filters {
  search: string;
  from: string;
  dateFrom: string;
  dateTo: string;
  hasAttachment: "all" | "yes" | "no";
  status: "all" | "unread" | "read";
}

const defaultFilters: Filters = {
  search: "", from: "", dateFrom: "", dateTo: "",
  hasAttachment: "all", status: "all",
};

export default function Dashboard({ userEmail }: { userEmail: string }) {
  const [allEmails, setAllEmails] = useState<ZohoEmail[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<ZohoEmail | null>(null);
  const stopRef = useRef(false);

  // Load all emails in background
  useEffect(() => {
    stopRef.current = false;
    loadEmails();
    return () => { stopRef.current = true; };
  }, []);

  async function loadEmails() {
    setLoadingInitial(true);
    let start = 1;
    let accumulated: ZohoEmail[] = [];

    while (!stopRef.current) {
      try {
        const res = await fetch(`/api/emails?start=${start}&limit=${FETCH_BATCH}`);
        if (res.status === 401) { window.location.href = "/"; return; }
        const data = await res.json();
        const batch: ZohoEmail[] = data.emails ?? [];
        if (!batch.length) break;

        accumulated = [...accumulated, ...batch];
        setAllEmails([...accumulated]);
        setTotalLoaded(accumulated.length);

        if (start === 1) setLoadingInitial(false);
        setLoadingAll(true);

        if (batch.length < FETCH_BATCH) break;
        start += FETCH_BATCH;
      } catch { break; }
    }

    setLoadingInitial(false);
    setLoadingAll(false);
    setAllLoaded(true);
  }

  // Filtered emails
  const filtered = useMemo(() => {
    return allEmails.filter((e) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hit =
          e.subject?.toLowerCase().includes(q) ||
          e.fromAddress?.toLowerCase().includes(q) ||
          e.toAddress?.toLowerCase().includes(q) ||
          e.summary?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filters.from) {
        if (!e.fromAddress?.toLowerCase().includes(filters.from.toLowerCase())) return false;
      }
      if (filters.dateFrom) {
        const ts = parseInt(e.sentDateInGMT || e.receivedTime || "0");
        if (ts < new Date(filters.dateFrom).getTime()) return false;
      }
      if (filters.dateTo) {
        const ts = parseInt(e.sentDateInGMT || e.receivedTime || "0");
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        if (ts > end.getTime()) return false;
      }
      if (filters.hasAttachment === "yes" && e.hasAttachment !== "1") return false;
      if (filters.hasAttachment === "no" && e.hasAttachment === "1") return false;
      if (filters.status === "unread" && e.status !== "0") return false;
      if (filters.status === "read" && e.status === "0") return false;
      return true;
    });
  }, [allEmails, filters]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilterCount = [
    filters.search, filters.from, filters.dateFrom, filters.dateTo,
    filters.hasAttachment !== "all" ? "x" : "",
    filters.status !== "all" ? "x" : "",
  ].filter(Boolean).length;

  function setFilter<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function clearFilters() { setFilters(defaultFilters); }

  function formatDate(ts: string) {
    if (!ts) return "";
    try {
      return new Date(parseInt(ts)).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return ""; }
  }

  function stripEmail(addr: string) {
    if (!addr) return "";
    const m = addr.match(/<(.+?)>/);
    return m ? m[1] : addr.replace(/&quot;/g, "").trim();
  }

  function truncate(str: string, n: number) {
    return str?.length > n ? str.slice(0, n) + "…" : (str ?? "");
  }

  function pageNumbers() {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  const stats = useMemo(() => ({
    total: allEmails.length,
    unread: allEmails.filter((e) => e.status === "0").length,
    attachments: allEmails.filter((e) => e.hasAttachment === "1").length,
  }), [allEmails]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-xl p-2 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Zoho Mail Extractor</h1>
            <p className="text-xs text-gray-400 leading-tight">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {loadingAll && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading {totalLoaded.toLocaleString()}…
            </span>
          )}
          {allLoaded && (
            <span className="text-xs text-green-600 font-medium">
              ✓ {totalLoaded.toLocaleString()} emails loaded
            </span>
          )}
          <ExportButton />
          <a href="/api/auth/logout"
            className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors">
            Disconnect
          </a>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Emails", value: stats.total, icon: "📧", extra: allLoaded ? "all loaded" : "loading…" },
            { label: "Unread", value: stats.unread, icon: "✉️", extra: "in inbox" },
            { label: "With Attachments", value: stats.attachments, icon: "📎", extra: "in inbox" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.extra}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-3">
          <div className="px-4 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search subject, from, to, preview…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400 bg-transparent"
            />
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Clear all
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">From Address</label>
                <input
                  type="text"
                  placeholder="e.g. john@example.com"
                  value={filters.from}
                  onChange={(e) => setFilter("from", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Attachment</label>
                  <select
                    value={filters.hasAttachment}
                    onChange={(e) => setFilter("hasAttachment", e.target.value as Filters["hasAttachment"])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All</option>
                    <option value="yes">Has attachment</option>
                    <option value="no">No attachment</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilter("status", e.target.value as Filters["status"])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                </div>
              </div>

              {/* Quick date presets */}
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 self-center">Quick:</span>
                {[
                  { label: "Today", days: 0 },
                  { label: "Last 7 days", days: 7 },
                  { label: "Last 30 days", days: 30 },
                  { label: "Last 90 days", days: 90 },
                  { label: "This year", days: 365 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(from.getDate() - days);
                      setFilters((f) => ({
                        ...f,
                        dateFrom: from.toISOString().slice(0, 10),
                        dateTo: to.toISOString().slice(0, 10),
                      }));
                    }}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    onClick={() => setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }))}
                    className="text-xs px-3 py-1.5 text-red-500 hover:text-red-700"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results info */}
        {activeFilterCount > 0 && (
          <p className="text-xs text-gray-500 mb-3 px-1">
            {filtered.length.toLocaleString()} results
            {activeFilterCount > 0 && " (filtered)"}
            {" · "}showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}
          </p>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loadingInitial ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm text-gray-500">Loading your emails…</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">From</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Preview</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">📎</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                          {activeFilterCount > 0 ? (
                            <div>
                              <p>No emails match your filters.</p>
                              <button onClick={clearFilters} className="mt-2 text-blue-600 text-xs underline">
                                Clear filters
                              </button>
                            </div>
                          ) : "No emails found."}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((email, idx) => (
                        <tr
                          key={email.messageId}
                          onClick={() => setSelectedEmail(email)}
                          className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${
                            email.status === "0" ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {formatDate(email.sentDateInGMT || email.receivedTime)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-xs">
                            <span className="block truncate max-w-[160px]">{stripEmail(email.fromAddress)}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            <span className={`block truncate max-w-[200px] ${email.status === "0" ? "font-semibold" : ""}`}>
                              {truncate(email.subject, 55) || "(No Subject)"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                            <span className="block truncate max-w-[260px]">{truncate(email.summary, 75)}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {email.hasAttachment === "1" && <span className="text-gray-400 text-xs">📎</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              email.status === "0" ? "bg-blue-500" : "bg-gray-300"
                            }`} title={email.status === "0" ? "Unread" : "Read"} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-gray-100 px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50">
                <p className="text-xs text-gray-500 order-2 sm:order-1">
                  {filtered.length > 0
                    ? `${((page - 1) * PAGE_SIZE + 1).toLocaleString()}–${Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()} emails`
                    : "No emails"}
                  {!allLoaded && <span className="text-blue-500 ml-1">(still loading…)</span>}
                </p>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <PagBtn onClick={() => setPage(1)} disabled={page === 1} label="«" />
                    <PagBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1} label="‹" />
                    {pageNumbers().map((n, i) =>
                      n === "..." ? (
                        <span key={`d${i}`} className="px-2 text-gray-400 text-sm">…</span>
                      ) : (
                        <PagBtn
                          key={n}
                          onClick={() => setPage(n as number)}
                          active={page === n}
                          label={String(n)}
                        />
                      )
                    )}
                    <PagBtn onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} label="›" />
                    <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages} label="»" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedEmail && (
        <EmailModal email={selectedEmail} onClose={() => setSelectedEmail(null)} />
      )}
    </div>
  );
}

function PagBtn({ onClick, disabled, active, label }: {
  onClick: () => void; disabled?: boolean; active?: boolean; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : disabled
          ? "text-gray-300 cursor-not-allowed"
          : "text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
