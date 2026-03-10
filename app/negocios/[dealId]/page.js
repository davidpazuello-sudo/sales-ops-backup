import DashboardShell from "../../dashboard-shell";

export default async function DealProfilePage({ params }) {
  const resolvedParams = await params;

  return (
    <DashboardShell
      initialNav="deals"
      dealId={resolvedParams?.dealId || ""}
    />
  );
}
