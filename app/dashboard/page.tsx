import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const jar = await cookies();
  const email = jar.get("zoho_email")?.value;
  const accountId = jar.get("zoho_account_id")?.value;

  if (!accountId) redirect("/");

  return <Dashboard userEmail={email ?? ""} />;
}
