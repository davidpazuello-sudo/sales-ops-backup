import fs from 'fs';
import path from 'path';

function walk(dir, extensions = ['.js']) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...walk(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const appDir = path.join(process.cwd(), 'app');
const files = walk(appDir);

let convertedCount = 0;

for (const oldPath of files) {
  let content = fs.readFileSync(oldPath, 'utf8');
  
  // Prepend @ts-nocheck if not present
  if (!content.startsWith('// @ts-nocheck')) {
    content = '// @ts-nocheck\n' + content;
  }
  
  // Decide extension
  // route.js -> .ts
  // page.js, layout.js, loading.js -> .tsx
  // others in app/ -> .tsx (likely components)
  let newExt = '.tsx';
  if (oldPath.endsWith('route.js')) {
    newExt = '.ts';
  } else if (oldPath.endsWith('dashboard-shell-config.js')) {
      newExt = '.ts'; // Looks like config
  }
  
  const newPath = oldPath.replace(/\.js$/, newExt);
  
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);
  console.log(`Converted: ${path.relative(process.cwd(), oldPath)} -> ${newExt}`);
  convertedCount++;
}

console.log(`\nSuccessfully converted ${convertedCount} files to TS/TSX.`);
