import { buildDashboardDomainPayload } from "./dashboard-domain";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

function getHubSpotToken() {
  return process.env.HUBSPOT_ACCESS_TOKEN || "";
}

async function hubspotFetch(path, init = {}) {
  const token = getHubSpotToken();

  if (!token) {
    throw new Error("HUBSPOT_TOKEN_MISSING");
  }

  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HUBSPOT_API_ERROR:${response.status}:${body}`);
  }

  return response.json();
}

async function fetchPagedCollection(path) {
  const results = [];
  let after = "";

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const url = after ? `${path}${separator}after=${after}` : path;
    const payload = await hubspotFetch(url);

    results.push(...(payload.results || []));

    after = payload.paging?.next?.after || "";
    if (!after) break;
  }

  return results;
}

async function fetchOptionalPagedCollection(path) {
  try {
    return await fetchPagedCollection(path);
  } catch {
    return [];
  }
}

export async function getHubSpotDashboardData() {
  const [owners, deals, tasks, calls, meetings] = await Promise.all([
    fetchPagedCollection("/crm/v3/owners?limit=100&archived=false"),
    fetchPagedCollection("/crm/v3/objects/deals?limit=100&archived=false&properties=dealname,amount,dealstage,pipeline,hubspot_owner_id,closedate,createdate,hs_lastmodifieddate"),
    fetchOptionalPagedCollection("/crm/v3/objects/tasks?limit=100&archived=false&properties=hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_task_type,hubspot_owner_id,hs_timestamp,createdate,hs_lastmodifieddate"),
    fetchOptionalPagedCollection("/crm/v3/objects/calls?limit=100&archived=false&properties=hs_call_title,hs_call_body,hs_call_status,hs_call_direction,hubspot_owner_id,hs_timestamp,createdate,hs_lastmodifieddate"),
    fetchOptionalPagedCollection("/crm/v3/objects/meetings?limit=100&archived=false&properties=hs_meeting_title,hs_meeting_body,hs_internal_meeting_notes,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_outcome,hubspot_owner_id,hs_timestamp,createdate,hs_lastmodifieddate"),
  ]);

  return buildDashboardDomainPayload(owners, deals, {
    tasks,
    calls,
    meetings,
  });
}
