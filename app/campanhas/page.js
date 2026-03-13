import DashboardShell from "../dashboard-shell";

export default function CampaignsPage({ searchParams }) {
  const initialCampaignName = typeof searchParams?.campanha === "string"
    ? searchParams.campanha
    : "";

  return <DashboardShell initialNav="campaigns" initialCampaignName={initialCampaignName} />;
}
