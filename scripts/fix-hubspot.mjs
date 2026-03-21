import fs from 'fs';
import path from 'path';

const hubspotFile = path.join(process.cwd(), 'lib', 'hubspot.js');
const clientFile = path.join(process.cwd(), 'lib', 'hubspot', 'client.js');

let clientCode = fs.readFileSync(clientFile, 'utf8');

const extraClientCode = `
export async function fetchSearchedCollection(path, body, options = {}) {
  const results = [];
  let after = undefined;
  let pageCount = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 200;

  while (true) {
    const payload = await hubspotFetch(path, {
      method: "POST",
      operation: "fetch-searched-collection",
      body: JSON.stringify({
        ...body,
        ...(after ? { after } : {}),
      }),
    });
    pageCount += 1;

    results.push(...(payload.results || []));

    if (results.length >= maxRecords || pageCount >= maxPages) {
      break;
    }

    after = payload.paging?.next?.after;
    if (!after) {
      break;
    }
  }

  logHubSpotObservation("info", "searched_collection_completed", {
    operation: "fetch-searched-collection",
    path: sanitizeHubSpotPath(path),
    resultCount: results.length,
    pageCount,
  });

  return results;
}

export async function fetchOptionalPagedCollection(path, options = {}) {
  try {
    return await fetchPagedCollection(path, options);
  } catch {
    return [];
  }
}
`;

if (!clientCode.includes('fetchSearchedCollection')) {
  fs.writeFileSync(clientFile, clientCode + '\n' + extraClientCode);
}

const originalLines = fs.readFileSync(hubspotFile, 'utf8').split('\n');

const startIdx = originalLines.findIndex(l => l.startsWith('const HUBSPOT_BASE_URL ='));
const endIdx = originalLines.findIndex(l => l.startsWith('async function fetchCampaignScopedActivities'));

if (startIdx !== -1 && endIdx !== -1) {
  originalLines.splice(startIdx, endIdx - startIdx);
}

let fileContent = originalLines.join('\n');

fileContent = fileContent.replace(
  'import { hubspotFetch, fetchPagedCollection, wait } from "./hubspot/client";',
  'import { hubspotFetch, fetchPagedCollection, fetchSearchedCollection, fetchOptionalPagedCollection, wait } from "./hubspot/client";'
);

const ttlStart = fileContent.indexOf('function getHubSpotCacheTtlMs');
if (ttlStart !== -1) {
  const ttlEnd = fileContent.indexOf('}', ttlStart) + 1;
  const before = fileContent.slice(0, ttlStart);
  const after = fileContent.slice(ttlEnd);
  fileContent = before + after;
}

fs.writeFileSync(hubspotFile, fileContent);
console.log('Fixed hubspot bindings!');
