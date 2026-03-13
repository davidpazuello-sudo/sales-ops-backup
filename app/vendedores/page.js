import DashboardShell from "../dashboard-shell";

function normalizeSellerPage(value) {
  return String(value || "1").trim() === "2" ? "2" : "1";
}

export default function SellersPage({ searchParams }) {
  return <DashboardShell initialNav="sellers" initialSellerPage={normalizeSellerPage(searchParams?.pagina)} />;
}
