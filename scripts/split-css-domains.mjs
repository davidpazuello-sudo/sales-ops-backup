import fs from 'fs';
import path from 'path';

const sourceCssPath = path.join(process.cwd(), 'app', 'page.module.css');
const cssRaw = fs.readFileSync(sourceCssPath, 'utf8');

const sectionsDir = path.join(process.cwd(), 'app', 'dashboard-sections');
const filesToProcess = ['deals.js', 'sellers.js', 'presales.js', 'tasks.js', 'reports.js', 'campaigns.js', 'access.js', 'settings.js'];

// CSS extraction logic
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
      
      i = j + 1; // skip the block
      continue;
    }
    i++;
  }
  return extracted.join('\n\n');
}

for (const file of filesToProcess) {
  const filePath = path.join(sectionsDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  const jsContent = fs.readFileSync(filePath, 'utf8');
  
  // Find all styles.xyz used in the file
  const styleRegex = /styles\.([a-zA-Z0-9_]+)/g;
  const usedClasses = new Set();
  let match;
  while ((match = styleRegex.exec(jsContent)) !== null) {
    usedClasses.add(match[1]);
  }
  
  if (usedClasses.size === 0) continue;
  
  const moduleName = file.replace('.js', '.module.css');
  const moduleAbsPath = path.join(sectionsDir, moduleName);
  
  const extractedCss = extractBlocks(cssRaw, Array.from(usedClasses));
  
  // Write the new CSS module
  fs.writeFileSync(moduleAbsPath, extractedCss);
  console.log(`Created ${moduleName} with ${usedClasses.size} classes.`);
  
  // Also update the import in the JS file
  const updatedJs = jsContent.replace(/import styles from "\.\.\/page\.module\.css";/g, `import styles from "./${moduleName}";`);
  fs.writeFileSync(filePath, updatedJs);
}

console.log('Domain extraction complete!');
