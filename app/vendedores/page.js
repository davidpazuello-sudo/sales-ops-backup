import DashboardShell from "../dashboard-shell";

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

export default function SellersPage({ searchParams }) {
  return (
    <DashboardShell
      initialNav="sellers"
      initialSellerPage={normalizeSellerPage(searchParams?.pagina)}
      initialSellerSearch={normalizeSellerSearch(searchParams?.busca)}
    />
  );
}
