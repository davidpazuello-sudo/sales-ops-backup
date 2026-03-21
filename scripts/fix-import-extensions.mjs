import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function walk(dir, extensions = ['.js', '.ts', '.tsx']) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next') {
      results.push(...walk(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Regex to match import paths ending in .js that are local imports (not node_modules)
// Matches: from "lib/something.js" or from "./something.js" or from "../something.js"
const importRegex = /from\s+(['"])((?:lib\/|\.\.?\/)[^'"]+)\.js\1/g;

let totalFixed = 0;

const files = [
  ...walk(path.join(root, 'app')),
  ...walk(path.join(root, 'lib')),
];

// Also check root middleware
if (fs.existsSync(path.join(root, 'middleware.js'))) {
  files.push(path.join(root, 'middleware.js'));
}

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const matches = content.match(importRegex);
  if (matches) {
    content = content.replace(importRegex, 'from $1$2$1');
    fs.writeFileSync(file, content);
    const relPath = path.relative(root, file);
    console.log(`Fixed ${matches.length} import(s) in ${relPath}`);
    totalFixed += matches.length;
  }
}

console.log(`\nTotal: ${totalFixed} import paths fixed!`);
