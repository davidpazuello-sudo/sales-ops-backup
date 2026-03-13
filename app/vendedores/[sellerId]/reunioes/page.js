import DashboardShell from "../../../dashboard-shell";

function normalizeSellerPage(value) {
  const parsed = Number.parseInt(String(value || "1").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "1";
  }

  return String(parsed);
}

function normalizeSellerSearch(value) {
  return String(value || "").trim();
}

export default async function SellerMeetingsPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <DashboardShell
      initialNav="sellers"
      initialSellerPage={normalizeSellerPage(resolvedSearchParams?.pagina)}
      initialSellerSearch={normalizeSellerSearch(resolvedSearchParams?.busca)}
      sellerSlug={resolvedParams?.sellerId || ""}
      sellerMeetingsView
    />
  );
}
