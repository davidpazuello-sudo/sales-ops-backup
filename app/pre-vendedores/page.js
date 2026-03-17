import DashboardShell from "../dashboard-shell";

export default function PreSalesPage({ searchParams }) {
  const initialOwnerFilter = typeof searchParams?.proprietario === "string"
    ? searchParams.proprietario
    : "todos";
  const initialCampaignName = typeof searchParams?.campanha === "string"
    ? searchParams.campanha
    : "Aluno a Bordo 2026";

  return (
    <DashboardShell
      initialNav="presales"
      initialOwnerFilter={initialOwnerFilter}
      initialCampaignName={initialCampaignName}
    />
  );
}
