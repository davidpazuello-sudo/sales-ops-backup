"use client";

import { AccessPermissionsContent } from "../../dashboard-sections";
import { useGlobalState } from "../global-state-provider";

export default function AccessPermissionsPage() {
  const { sessionUser, refreshNotifications } = useGlobalState();
  return <AccessPermissionsContent sessionUser={sessionUser} onNotificationsRefresh={refreshNotifications} />;
}
