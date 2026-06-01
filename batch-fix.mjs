import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Remove BOM
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    
    // 2. Fix UTF-8 mojibake
    content = content.replace(/Ã©/g, 'é');
    content = content.replace(/Ã¨/g, 'è');
    content = content.replace(/Ãª/g, 'ê');
    content = content.replace(/Ã´/g, 'ô');
    content = content.replace(/Ã¹/g, 'ù');
    content = content.replace(/Ã§/g, 'ç');
    content = content.replace(/Ã /g, 'à');
    content = content.replace(/Â°/g, '°');
    
    // 3. Fix }); to }] });
    content = content.replace(/filters:\s*\[\{([^}]*)\}\s*\}\);/g, 'filters: [{$1}] });');
    
    // 4. Fix missing }] before };
    content = content.replace(/filters:\s*\[\{([^}]*)\}\s*,\s*"[^"]*"\);/g, 'filters: [{$1}], limit: 1000, offset: 0 });');
    
    // 5. Add limit/offset where missing
    content = content.replace(
      /dataService\.query\(([^,]+),\s*\{\s*filters:\s*\[([^\]]*)\]\s*\}\);/g,
      (match) => {
        if (!match.includes('limit')) {
          return match.replace('});', ', limit: 1000, offset: 0 });');
        }
        return match;
      }
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) {
    console.error(`Error in ${path.basename(filePath)}: ${e.message}`);
    return false;
  }
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let fixed = 0;
files.forEach(file => {
  if (cleanFile(path.join(pagesDir, file))) {
    fixed++;
    console.log('✓ ' + file);
  }
});

console.log(`\n✅ Processed ${files.length} files`);
