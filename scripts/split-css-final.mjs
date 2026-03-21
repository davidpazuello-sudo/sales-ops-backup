import fs from 'fs';
import path from 'path';

const sourceCssPath = path.join(process.cwd(), 'app', 'page.module.css');
const cssRaw = fs.readFileSync(sourceCssPath, 'utf8');

const filesToProcess = [
  'app/two-factor-settings.js',
  'app/page-agent-panel.js',
  'app/login/page.js',
  'app/loading.js',
  'app/dashboard-section-feedback.js',
  'app/(dashboard)/perfil/page.js',
  'app/(dashboard)/configuracoes/page.js',
  'app/(dashboard)/ai-agent/page.js'
];

function extractBlocks(css, classes) {
  let inMedia = false;
  let mediaQuery = '';
  const extracted = [];
  const lines = css.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    if (line.trim().startsWith('@media')) {
      inMedia = true;
      mediaQuery = line;
      i++;
      continue;
    }
    
    if (inMedia && line.trim() === '}') {
      inMedia = false;
      mediaQuery = '';
      i++;
      continue;
    }
    
    const isClassStart = classes.some(c => line.includes(`.${c} `) || line.includes(`.${c}:`) || line.includes(`.${c},`) || line.trim() === `.${c} {`);
    
    if (isClassStart && line.includes('{')) {
      let block = [];
      let braceCount = 0;
      let j = i;
      
      while (j < lines.length) {
        block.push(lines[j]);
        if (lines[j].includes('{')) braceCount += (lines[j].match(/\{/g) || []).length;
        if (lines[j].includes('}')) braceCount -= (lines[j].match(/\}/g) || []).length;
        
        if (braceCount === 0) {
          break;
        }
        j++;
      }
      
      if (inMedia) {
        extracted.push(mediaQuery);
        extracted.push(block.map(l => '  ' + l).join('\n'));
        extracted.push('}');
      } else {
        extracted.push(block.join('\n'));
      }
      
      i = j + 1;
      continue;
    }
    i++;
  }
  return extracted.join('\n\n');
}

for (const relFile of filesToProcess) {
  const filePath = path.join(process.cwd(), relFile);
  if (!fs.existsSync(filePath)) continue;
  
  const jsContent = fs.readFileSync(filePath, 'utf8');
  
  const styleRegex = /styles\.([a-zA-Z0-9_]+)/g;
  const usedClasses = new Set();
  let match;
  while ((match = styleRegex.exec(jsContent)) !== null) {
    usedClasses.add(match[1]);
  }
  
  if (usedClasses.size === 0) {
    // If no styles are used, just remove the import
    const cleanJs = jsContent.replace(/import styles from ['"].*page\.module\.css['"];\n?/g, '');
    fs.writeFileSync(filePath, cleanJs);
    continue;
  }
  
  // Decide module name based on file name or folder
  let parsed = path.parse(filePath);
  let cssName;
  if (parsed.name === 'page') {
    // use folder name
    const folderName = path.basename(parsed.dir);
    cssName = `${folderName}.module.css`;
  } else {
    cssName = `${parsed.name}.module.css`;
  }
  
  const moduleAbsPath = path.join(parsed.dir, cssName);
  const extractedCss = extractBlocks(cssRaw, Array.from(usedClasses));
  
  fs.writeFileSync(moduleAbsPath, extractedCss);
  console.log(`Created ${cssName} in ${parsed.dir} with ${usedClasses.size} classes.`);
  
  const updatedJs = jsContent.replace(/import styles from ['"].*page\.module\.css['"];/g, `import styles from "./${cssName}";`);
  fs.writeFileSync(filePath, updatedJs);
}

console.log('Final extraction complete!');
// DANGER REMOVAL OF THE MONOLITH!
fs.unlinkSync(sourceCssPath);
console.log('DELETED page.module.css!');
