import DashboardShell from "../../dashboard-shell";

export default async function SellerProfilePage({ params }) {
  const resolvedParams = await params;

  return <DashboardShell initialNav="sellers" sellerSlug={resolvedParams?.sellerId || ""} />;
}
