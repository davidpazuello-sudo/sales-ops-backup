import fs from 'fs';
import path from 'path';

const filesToConvert = [
  'lib/hubspot/dashboard.js',
  'middleware.js',
  'lib/dashboard-fallback.js',
  'lib/dashboard-contracts.js'
];

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
  console.log(`Converted: ${file} → .ts`);
}
