import DashboardShell from "../dashboard-shell";

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams;
  const section = params?.section || "hubspot";

  return <DashboardShell initialNav="settings" initialConfig={section} />;
}
