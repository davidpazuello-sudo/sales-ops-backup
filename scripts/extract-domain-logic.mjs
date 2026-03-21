import fs from 'fs';
import path from 'path';

const hubspotFile = path.join(process.cwd(), 'lib', 'hubspot.js');
let sourceCode = fs.readFileSync(hubspotFile, 'utf8');

const domains = {
  contacts: [
    'fetchListByName',
    'resolveHubSpotListId',
    'fetchListMembershipIds',
    'fetchContactsByIds',
    'mergeHubSpotContactRecords',
    'fetchContactsFromCampaignSegmentLists',
    'HUBSPOT_CONTACT_BASE_PROPERTIES'
  ],
  owners: [
    'sortHubSpotOwnersAlphabetically',
    'filterSellerOwners',
    'paginateSellerOwners',
    'getSellerPaginationTotalPages',
    'getHubSpotOwnerDisplayName',
    'resolveSelectedOwnerId',
    'fetchCompanyUsers',
    'enrichTeamOwners',
    'fetchSellersPerformance',
    'getOwnerCollectionLimit',
    'buildOwnersPath'
  ],
  deals: [
    'HUBSPOT_DEAL_BASE_PROPERTIES',
    'updateHubSpotDealStage',
    'fetchPipelines',
    'processPipelineItems',
    'fetchRecentDeals',
    'searchDealsByPipeline',
    'buildDealsPath',
    'buildDealSearchBody',
    'filterDealsByPipeline',
    'computeDealSummary',
    'getComparableDealAmount'
  ]
};

// Extremely simple AST-like block extractor
function extractBlock(code, indentifier) {
  // Matches `function foo(...) {` or `const foo = ...` or `async function foo(...) {`
  const regex = new RegExp(`(?:const|let|var|function|async\\s+function)\\s+${indentifier}[\\s=\\(]`);
  const match = regex.exec(code);
  
  if (!match) return null;
  
  const startIndex = match.index;
  let i = startIndex;
  
  // Find the first opening brace or bracket
  while (i < code.length && code[i] !== '{' && code[i] !== '[') {
    if (code[i] === ';') {
      // It's a one-line declaration like `const foo = 1;`
      return { block: code.substring(startIndex, i + 1), start: startIndex, end: i + 1 };
    }
    i++;
  }
  
  if (i >= code.length) return null;
  
  const openChar = code[i];
  const closeChar = openChar === '{' ? '}' : ']';
  
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  
  for (let j = i; j < code.length; j++) {
    const char = code[j];
    
    if (inString) {
      if (char === stringChar && code[j-1] !== '\\\\') {
        inString = false;
      }
      continue;
    }
    
    if (char === '"' || char === "'" || char === '\`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === openChar) braceCount++;
    if (char === closeChar) braceCount--;
    
    if (braceCount === 0) {
      // Find the end line or semicolon
      let end = j + 1;
      while (end < code.length && (code[end] === ';' || code[end] === ' ' || code[end] === '\\n' || code[end] === '\\r')) {
        end++;
      }
      return { block: code.substring(startIndex, end), start: startIndex, end: end };
    }
  }
  
  return null;
}

const extractedCode = {
  contacts: ['import { hubspotFetch, fetchPagedCollection, fetchSearchedCollection } from "./client";', 'import { dedupeHubSpotRecords, chunkItems } from "./utils";'],
  owners: ['import { normalizeComparable, normalizeSellerPage } from "./utils";', 'import { hubspotFetch } from "./client";'],
  deals: ['import { hubspotFetch, fetchSearchedCollection } from "./client";'],
  utils: ['export function dedupeHubSpotRecords(records = []) { const uniqueRecords = new Map(); for (const record of records) { const id = String(record?.id || "").trim(); if (id && !uniqueRecords.has(id)) { uniqueRecords.set(id, record); } } return [...uniqueRecords.values()]; }', 'export function chunkItems(items = [], chunkSize = 5) { const chunks = []; for (let index = 0; index < items.length; index += chunkSize) { chunks.push(items.slice(index, index + chunkSize)); } return chunks; }'] // hardcoding generic utils needed to avoid ciruclar deps for now
};

for (const [domain, items] of Object.entries(domains)) {
  for (const item of items) {
    const extracted = extractBlock(sourceCode, item);
    if (extracted) {
      sourceCode = sourceCode.substring(0, extracted.start) + sourceCode.substring(extracted.end);
      let blockText = extracted.block.trim();
      if (!blockText.startsWith('export')) {
        blockText = 'export ' + blockText;
      }
      extractedCode[domain].push(blockText);
    }
  }
}

// Write the files
for (const [domain, blocks] of Object.entries(extractedCode)) {
  const filePath = path.join(process.cwd(), 'lib', 'hubspot', `${domain}.js`);
  fs.writeFileSync(filePath, blocks.join('\\n\\n'));
}

// Prepare imports for lib/hubspot.js
const imports = [];
for (const [domain, items] of Object.entries(domains)) {
  const foundItems = items.filter(item => extractedCode[domain].some(b => b.includes(` ${item}`)));
  if (foundItems.length > 0) {
    imports.push(`import { ${foundItems.join(', ')} } from "./hubspot/${domain}";`);
  }
}

sourceCode = imports.join('\\n') + '\\n' + sourceCode;

fs.writeFileSync(hubspotFile, sourceCode);
console.log('Sprint 2 domains extracted!');
