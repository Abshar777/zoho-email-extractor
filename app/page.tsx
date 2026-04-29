import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const jar = await cookies();
  const hasCredentials = !!jar.get("zoho_client_id")?.value;
  const hasAccount = !!jar.get("zoho_account_id")?.value;

  if (hasAccount) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 rounded-2xl p-4 shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Zoho Mail Extractor</h1>
          <p className="text-gray-500 text-sm mb-8">
            Connect your own Zoho Mail account to view, search, and export all your emails — including 10,000+.
          </p>

          {hasCredentials ? (
            <div className="space-y-3">
              <Link
                href="/api/auth/connect"
                className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Zoho Mail
              </Link>
              <Link href="/setup" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Change credentials
              </Link>
            </div>
          ) : (
            <Link
              href="/setup"
              className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Get Started — Enter Your Credentials
            </Link>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "🔑", label: "Your Credentials", desc: "Use your own API keys" },
              { icon: "📧", label: "All Emails", desc: "No limits — 10,000+" },
              { icon: "📊", label: "Excel Export", desc: "Full body included" },
            ].map((f) => (
              <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-xs font-semibold text-gray-700">{f.label}</div>
                <div className="text-xs text-gray-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Credentials stored only in your browser session — never on any server.
        </p>
      </div>
    </main>
  );
}
