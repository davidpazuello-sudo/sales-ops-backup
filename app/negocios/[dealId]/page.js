import DashboardShell from "../../dashboard-shell";

export default async function DealProfilePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <DashboardShell
      initialNav="deals"
      dealId={resolvedParams?.dealId || ""}
      initialPipelineId={resolvedSearchParams?.pipeline || ""}
    />
  );
}
