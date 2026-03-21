import fs from 'fs';
import path from 'path';

const files = [
  'lib/hubspot.js',
  'lib/hubspot/contacts.js',
  'lib/hubspot/deals.js',
  'lib/hubspot/owners.js',
  'lib/hubspot/utils.js'
];

for (const file of files) {
  const p = path.join(process.cwd(), file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/\\n/g, '\n');
    fs.writeFileSync(p, content);
  }
}
console.log('Newlines fixed!');
