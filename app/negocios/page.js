import DashboardShell from "../dashboard-shell";

export default async function DealsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <DashboardShell
      initialNav="deals"
      initialPipelineId={resolvedSearchParams?.pipeline || ""}
    />
  );
}
