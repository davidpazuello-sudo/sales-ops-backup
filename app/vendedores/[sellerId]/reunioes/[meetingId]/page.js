import DashboardShell from "../../../../dashboard-shell";

function normalizeSellerPage(value) {
  return String(value || "1").trim() === "2" ? "2" : "1";
}

export default async function SellerMeetingDetailPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <DashboardShell
      initialNav="sellers"
      initialSellerPage={normalizeSellerPage(resolvedSearchParams?.pagina)}
      sellerSlug={resolvedParams?.sellerId || ""}
      sellerMeetingId={resolvedParams?.meetingId || ""}
    />
  );
}
