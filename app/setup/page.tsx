import SetupWizard from "@/components/SetupWizard";

export default function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; step?: string }>;
}) {
  return <SetupWizard />;
}
