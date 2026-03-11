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

export async function getHubSpotDashboardData() {
  const owners = await fetchPagedCollection("/crm/v3/owners?limit=100&archived=false");
  const deals = await fetchPagedCollection("/crm/v3/objects/deals?limit=100&archived=false&properties=dealname,amount,dealstage,pipeline,hubspot_owner_id,closedate,createdate,hs_lastmodifieddate");

  return buildDashboardDomainPayload(owners, deals);
}
