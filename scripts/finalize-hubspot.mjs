import fs from 'fs';
import path from 'path';

const oldFile = path.join(process.cwd(), 'lib', 'hubspot.js');
const newFile = path.join(process.cwd(), 'lib', 'hubspot', 'dashboard.js');

let code = fs.readFileSync(oldFile, 'utf8');

// Fix relative imports: from "./hubspot/xxx" → from "./xxx" (since the file is now INSIDE lib/hubspot/)
code = code.replace(/from\s+["']\.\/hubspot\//g, 'from "./');

// Fix other relative imports that go up to lib/
// "./dashboard-fallback" → "../dashboard-fallback"
// "./dashboard-domain" → "../dashboard-domain"
// "./audit-log-store" → "../audit-log-store"
// "./auth-logging" → "../auth-logging"
// "./hubspot-runtime" → "../hubspot-runtime"
// "./services/dashboard-campaigns" → "../services/dashboard-campaigns"
code = code.replace(/from\s+["']\.\/(dashboard-fallback|dashboard-domain|audit-log-store|auth-logging|hubspot-runtime|services\/dashboard-campaigns)["']/g, 
  (match, moduleName) => `from "../${moduleName}"`);

fs.writeFileSync(newFile, code);
console.log('Created lib/hubspot/dashboard.js');

// Now update the two API routes
const routeFiles = [
  { file: 'app/api/hubspot/dashboard/route.js', old: 'from "lib/hubspot"', new: 'from "lib/hubspot/dashboard"' },
  { file: 'app/api/deals/stage/route.js', old: 'from "lib/hubspot"', new: 'from "lib/hubspot/deals"' }
];

for (const route of routeFiles) {
  const filePath = path.join(process.cwd(), route.file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(route.old, route.new);
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${route.file}`);
}

// Delete the old file
fs.unlinkSync(oldFile);
console.log('DELETED lib/hubspot.js!');
