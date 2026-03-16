import DashboardShell from "../dashboard-shell";

export default function CampaignsPage({ searchParams }) {
  const initialCampaignName = typeof searchParams?.campanha === "string"
    ? searchParams.campanha
    : "";
  const initialOwnerFilter = typeof searchParams?.proprietario === "string"
    ? searchParams.proprietario
    : "todos";

  return (
    <DashboardShell
      initialNav="campaigns"
      initialCampaignName={initialCampaignName}
      initialOwnerFilter={initialOwnerFilter}
    />
  );
}
