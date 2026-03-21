import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generatorModule from '@babel/generator';

// Default export interop
const traverse = traverseModule.default || traverseModule;
const generate = generatorModule.default || generatorModule;

const hubspotFile = path.join(process.cwd(), 'lib', 'hubspot.js');
let sourceCode = fs.readFileSync(hubspotFile, 'utf8');

const ast = parse(sourceCode, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

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
    'getComparableDealAmount',
    'joinProperties',
    'getCollectionLimit'
  ]
};

const extractedCode = {
  contacts: ['import { hubspotFetch, fetchPagedCollection, fetchSearchedCollection } from "./client";', 'import { dedupeHubSpotRecords, chunkItems } from "./utils";'],
  owners: ['import { normalizeComparable, normalizeSellerPage } from "./utils";', 'import { hubspotFetch } from "./client";'],
  deals: ['import { hubspotFetch, fetchSearchedCollection } from "./client";'],
  utils: [
    'export function dedupeHubSpotRecords(records = []) { const uniqueRecords = new Map(); for (const record of records) { const id = String(record?.id || "").trim(); if (id && !uniqueRecords.has(id)) { uniqueRecords.set(id, record); } } return [...uniqueRecords.values()]; }',
    'export function chunkItems(items = [], chunkSize = 5) { const chunks = []; for (let index = 0; index < items.length; index += chunkSize) { chunks.push(items.slice(index, index + chunkSize)); } return chunks; }',
    'export function normalizeComparable(value) { return String(value || "").trim().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase(); }',
    'export function normalizeSellerPage(value) { const parsed = Number.parseInt(String(value || "1").trim(), 10); if (!Number.isFinite(parsed) || parsed <= 0) { return "1"; } return String(parsed); }'
  ]
};

// We will collect the nodes to remove so we can delete them from the AST later
const nodesToRemove = [];

traverse(ast, {
  Program(path) {
    path.node.body.forEach((node, index) => {
      let isExported = false;
      let declaration = node;
      
      if (node.type === 'ExportNamedDeclaration') {
        isExported = true;
        declaration = node.declaration;
      }
      
      let name = null;
      if (declaration?.type === 'FunctionDeclaration') {
        name = declaration.id.name;
      } else if (declaration?.type === 'VariableDeclaration') {
        name = declaration.declarations[0].id.name;
      }
      
      if (name) {
        for (const [domain, items] of Object.entries(domains)) {
          if (items.includes(name)) {
            // Generate the code for this sub-node
            let generated = generate(declaration).code;
            if (!isExported) {
              generated = 'export ' + generated;
            }
            extractedCode[domain].push(generated);
            nodesToRemove.push(path.get(`body.${index}`));
            break;
          }
        }
      }
    });
  }
});

// Remove nodes
nodesToRemove.forEach(p => p.remove());

// Generate the new hubspot.js code
let newHubspotCode = generate(ast).code;

// Save the domains
for (const [domain, blocks] of Object.entries(extractedCode)) {
  const filePath = path.join(process.cwd(), 'lib', 'hubspot', `${domain}.js`);
  fs.writeFileSync(filePath, blocks.join('\n\n'));
}

// Add imports to the top of newHubspotCode
const imports = [];
for (const [domain, items] of Object.entries(domains)) {
  const foundItems = items.filter(item => extractedCode[domain].some(b => b.includes(` ${item}`)));
  if (foundItems.length > 0) {
    imports.push(`import { ${foundItems.join(', ')} } from "./hubspot/${domain}";`);
  }
}

newHubspotCode = imports.join('\n') + '\n\n' + newHubspotCode;

fs.writeFileSync(hubspotFile, newHubspotCode);
console.log('Sprint 2 AST Extraction Complete!');
