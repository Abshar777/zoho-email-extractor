"use client";

import { useState } from "react";
import Link from "next/link";

type Step = 1 | 2 | 3;

export default function SetupWizard() {
  const [step, setStep] = useState<Step>(1);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [redirectUri, setRedirectUri] = useState("");

  const REDIRECT_URI =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/callback`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? "https://zoho-email-extractor.deltaacademy.ae"}/api/auth/callback`;

  async function handleSave() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Both fields are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRedirectUri(data.redirectUri);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step === s
                    ? "bg-blue-600 text-white"
                    : step > s
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-white/40"
                  }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${step > s ? "bg-green-500" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 1: Instructions */}
          {step === 1 && (
            <div>
              <div className="bg-blue-600 px-8 py-6">
                <h1 className="text-xl font-bold text-white">Step 1: Create Your Zoho API App</h1>
                <p className="text-blue-100 text-sm mt-1">
                  Follow these steps to get your Client ID and Client Secret from Zoho.
                </p>
              </div>
              <div className="px-8 py-6 space-y-6">
                {[
                  {
                    n: 1,
                    title: "Go to Zoho API Console",
                    body: (
                      <span>
                        Open{" "}
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 text-xs">
                          api-console.zoho.com
                        </span>{" "}
                        in your browser and sign in with your Zoho account.
                      </span>
                    ),
                  },
                  {
                    n: 2,
                    title: 'Click "Add Client"',
                    body: (
                      <span>
                        On the API Console home page, click{" "}
                        <strong>"Add Client"</strong> or <strong>"GET STARTED"</strong>.
                      </span>
                    ),
                  },
                  {
                    n: 3,
                    title: 'Select "Server-based Applications"',
                    body: (
                      <span>
                        Choose <strong>Server-based Applications</strong> from the client type options.
                      </span>
                    ),
                  },
                  {
                    n: 4,
                    title: "Fill in the Application Details",
                    body: (
                      <div className="space-y-2">
                        <p>Fill in the form with these values:</p>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                          <FieldRow label="Client Name" value="My Mail Extractor (or anything)" />
                          <FieldRow label="Homepage URL" value={typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "https://zoho-email-extractor.deltaacademy.ae")} />
                          <FieldRow label="Authorized Redirect URI" value={REDIRECT_URI} copyable />
                        </div>
                      </div>
                    ),
                  },
                  {
                    n: 5,
                    title: 'Click "Create" and copy your credentials',
                    body: (
                      <span>
                        After creation, Zoho shows your <strong>Client ID</strong> and{" "}
                        <strong>Client Secret</strong>. Keep this page open — you'll need them in the next step.
                      </span>
                    ),
                  },
                ].map((item) => (
                  <div key={item.n} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {item.n}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
                      <div className="text-sm text-gray-600">{item.body}</div>
                    </div>
                  </div>
                ))}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <strong>📋 Scopes needed:</strong> When connecting, you'll approve access to{" "}
                  <code className="bg-amber-100 px-1 rounded text-xs">ZohoMail.messages.READ</code> and{" "}
                  <code className="bg-amber-100 px-1 rounded text-xs">ZohoMail.accounts.READ</code>. This is read-only — no emails are modified.
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  I have my Client ID & Secret →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter credentials */}
          {step === 2 && (
            <div>
              <div className="bg-blue-600 px-8 py-6">
                <h1 className="text-xl font-bold text-white">Step 2: Enter Your Credentials</h1>
                <p className="text-blue-100 text-sm mt-1">
                  Paste your Client ID and Client Secret from the Zoho API Console.
                </p>
              </div>
              <div className="px-8 py-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Your client secret"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Your Redirect URI (already configured):</p>
                  <p className="text-xs font-mono text-gray-700 break-all">{REDIRECT_URI}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-3 rounded-xl transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    {saving ? "Saving…" : "Save & Continue →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect */}
          {step === 3 && (
            <div>
              <div className="bg-green-600 px-8 py-6">
                <h1 className="text-xl font-bold text-white">Step 3: Connect Your Zoho Mail</h1>
                <p className="text-green-100 text-sm mt-1">
                  Credentials saved! Now authorize access to your mailbox.
                </p>
              </div>
              <div className="px-8 py-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                  <div className="pt-1">
                    <p className="font-semibold text-gray-900 text-sm">Click "Connect Zoho Mail" below</p>
                    <p className="text-sm text-gray-500 mt-0.5">You'll be redirected to Zoho's login page.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                  <div className="pt-1">
                    <p className="font-semibold text-gray-900 text-sm">Log in and click "Accept"</p>
                    <p className="text-sm text-gray-500 mt-0.5">This grants read-only access to your emails.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                  <div className="pt-1">
                    <p className="font-semibold text-gray-900 text-sm">You'll be taken to your dashboard</p>
                    <p className="text-sm text-gray-500 mt-0.5">All your emails load automatically.</p>
                  </div>
                </div>

                <Link
                  href="/api/auth/connect"
                  className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg text-base"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect Zoho Mail
                </Link>

                <p className="text-xs text-center text-gray-400">
                  Your Client ID and Secret are stored only in your browser cookie — never on any server.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 w-36 flex-shrink-0">{label}:</span>
      <span className="font-mono text-gray-800 text-xs break-all flex-1">{value}</span>
      {copyable && (
        <button
          onClick={copy}
          className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 border border-blue-200 rounded"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}
