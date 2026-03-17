import DashboardShell from "../dashboard-shell";

export default function PreSalesPage({ searchParams }) {
  const initialOwnerFilter = typeof searchParams?.proprietario === "string"
    ? searchParams.proprietario
    : "todos";

  return (
    <DashboardShell
      initialNav="presales"
      initialOwnerFilter={initialOwnerFilter}
    />
  );
}
