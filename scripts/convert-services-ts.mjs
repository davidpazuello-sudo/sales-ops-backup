import fs from 'fs';
import path from 'path';

const filesToConvert = [
  'lib/services/dashboard-campaigns.js',
  'lib/services/dashboard-deals.js',
  'lib/services/dashboard-presales.js',
  'lib/services/dashboard-sellers.js',
  'lib/services/dashboard-tasks.js',
  'lib/dashboard-domain.js',
  'lib/domain-model.js',
];

for (const file of filesToConvert) {
  const oldPath = path.join(process.cwd(), file);
  if (!fs.existsSync(oldPath)) {
    console.log(`SKIP: ${file} not found`);
    continue;
  }

  let content = fs.readFileSync(oldPath, 'utf8');
  
  // Add @ts-nocheck if not already present
  if (!content.startsWith('// @ts-nocheck')) {
    content = '// @ts-nocheck\n' + content;
  }
  
  const newPath = oldPath.replace(/\.js$/, '.ts');
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);
  console.log(`Converted: ${file} → ${file.replace('.js', '.ts')}`);
}

console.log('Sprint 2 file conversion done!');
