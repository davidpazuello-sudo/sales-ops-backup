import fs from 'fs';
import path from 'path';

const sourceFile = path.join(process.cwd(), 'app', 'page.module.css');
const css = fs.readFileSync(sourceFile, 'utf8');

const layoutClassNames = [
  'appShell', 'appShellCollapsed', 'topbar', 'topbarGroup', 'topbarActions', 'menuWrap',
  'topbarButton', 'topbarButtonActive', 'notificationButton', 'notificationBadge',
  'aiButton', 'logoutButton', 'dropdownMenu', 'dropdownItem', 'shortcutHint',
  'sidebar', 'logoRow', 'logoDark', 'logoAccent', 'navigation', 'navItem', 'navItemActive',
  'settingsItem', 'navIcon', 'navLabel', 'profileBox', 'profileBoxActive', 'profileAvatar',
  'profileText', 'profileName', 'profileRole', 'content', 'contentNoScroll',
  'logoutModalBackdrop', 'logoutModal', 'logoutEyebrow', 'logoutActions', 'logoutSecondaryButton', 'logoutPrimaryButton',
  'notificationsBackdrop', 'notificationsPanel', 'notificationsTopBar', 'notificationsClose',
  'notificationsTabs', 'notificationsTab', 'notificationsTabActive', 'notificationsPermissionCard',
  'notificationsPermissionCopy', 'notificationsPermissionButton', 'notificationsPermissionBadge',
  'notificationsPermissionBadgeActive', 'notificationsList', 'notificationRow', 'notificationRowButton',
  'notificationContent', 'notificationBody', 'notificationTag', 'notificationSide', 'notificationArrow',
  'notificationsEmptyState', 'globalSearchBackdrop', 'globalSearchPanel', 'globalSearchHeader',
  'globalSearchClose', 'globalSearchInput', 'globalSearchAiHint', 'globalSearchResults',
  'globalSearchResultItem', 'globalSearchEmpty'
];

const uiClassNames = [
  'hamburger', 'panelsIcon', 'detailRow', 'detailLabel', 'detailValueBox', 'detailValue', 'detailHelper',
  'photoOption', 'photoPreview', 'photoMeta', 'photoAction', 'hiddenFileInput',
  'pageTitleRow', 'pageTitleStatus', 'sectionLoadingSpinner', 'pageTitleSpinner', 'srOnly',
  'card', 'cardWide', 'cardEyebrow', 'cardTitle',
  'table', 'tableHead', 'matrixCols', 'tableRow',
  'metric', 'optionGroup', 'optionGroupLabel', 'optionPills', 'optionPill', 'optionPillActive',
  'preferenceTable', 'preferenceRow', 'preferenceCopy', 'toggleButton', 'toggleButtonActive'
];

function extractBlocks(classes) {
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
    
    // Check if line matches one of the classes
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

const layoutCss = extractBlocks(layoutClassNames);
const uiCss = extractBlocks(uiClassNames);

fs.writeFileSync(path.join(process.cwd(), 'app', '(dashboard)', 'layout.module.css'), layoutCss);
// Create components folder if it doesn't exist
if (!fs.existsSync(path.join(process.cwd(), 'app', 'components'))) {
  fs.mkdirSync(path.join(process.cwd(), 'app', 'components'));
}
fs.writeFileSync(path.join(process.cwd(), 'app', 'components', 'ui.module.css'), uiCss);

console.log('Extraction complete!');
