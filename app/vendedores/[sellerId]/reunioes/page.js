import DashboardShell from "../../../dashboard-shell";

export default async function SellerMeetingsPage({ params }) {
  const resolvedParams = await params;

  return (
    <DashboardShell
      initialNav="sellers"
      sellerSlug={resolvedParams?.sellerId || ""}
      sellerMeetingsView
    />
  );
}
