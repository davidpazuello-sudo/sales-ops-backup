import fs from 'fs';
import path from 'path';

const filesToConvert = [
  // Supabase layer
  'lib/supabase/admin.js',
  'lib/supabase/client.js',
  'lib/supabase/mfa.js',
  'lib/supabase/middleware.js',
  'lib/supabase/server.js',
  'lib/supabase/shared.js',
  // Auth + Security
  'lib/auth-logging.js',
  'lib/auth-rate-limit.js',
  'lib/public-auth-errors.js',
  // Roles + Users
  'lib/role-access.js',
  'lib/user-roles.js',
  'lib/system-users.js',
  // Runtime
  'lib/hubspot-runtime.js',
  // Remaining infra
  'lib/admin-access.js',
  'lib/access-requests-store.js',
  'lib/audit-log-store.js',
  'lib/idempotency-store.js',
  'lib/api-observability.js',
  'lib/operational-data.js',
  'lib/dashboard-shell-helpers.js',
  'lib/hubspot-webhooks.js',
  'lib/ai-agent-orchestration.js',
];

let converted = 0;
for (const file of filesToConvert) {
  const oldPath = path.join(process.cwd(), file);
  if (!fs.existsSync(oldPath)) {
    console.log(`SKIP: ${file} not found`);
    continue;
  }

  let content = fs.readFileSync(oldPath, 'utf8');
  
  if (!content.startsWith('// @ts-nocheck')) {
    content = '// @ts-nocheck\n' + content;
  }
  
  const newPath = oldPath.replace(/\.js$/, '.ts');
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);
  converted++;
  console.log(`✓ ${file} → .ts`);
}

console.log(`\nConverted ${converted} files!`);
