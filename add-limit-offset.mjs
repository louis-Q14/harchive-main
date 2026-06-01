import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

console.log(`\n🔧 Adding limit/offset to all dataService.query() calls...\n`);

let totalFixed = 0;
let fileCount = 0;

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  // Pattern 1: dataService.query with just filters, no limit/offset
  // Find: dataService.query('Entity', { filters: [...] })
  // Replace with: dataService.query('Entity', { filters: [...], limit: 1000, offset: 0 })
  const pattern1 = /dataService\.query\('([^']+)',\s*\{\s*filters:\s*\[([\s\S]*?)\]\s*\}(?!\s*\))/g;
  content = content.replace(pattern1, (match, entity, filters) => {
    return `dataService.query('${entity}', { filters: [${filters}], limit: 1000, offset: 0 }`;
  });

  // Pattern 2: Fix broken query calls with extra closing brackets
  // Find: dataService.query(...] });  -> should be } });
  content = content.replace(/dataService\.query\('([^']+)',\s*\{\s*filters:\s*\[([\s\S]*?)\]\s*\]\s*\}/g, 
    (match, entity, filters) => {
      return `dataService.query('${entity}', { filters: [${filters}], limit: 1000, offset: 0 }`;
    }
  );

  // Pattern 3: Already has limit but missing offset
  content = content.replace(/dataService\.query\('([^']+)',\s*\{\s*filters:\s*\[([\s\S]*?)\],\s*limit:\s*(\d+)\s*\}(?!\s*\))/g,
    (match, entity, filters, limit) => {
      return `dataService.query('${entity}', { filters: [${filters}], limit: ${limit}, offset: 0 }`;
    }
  );

  // Pattern 4: Has limit and offset but broken syntax
  content = content.replace(/dataService\.query\('([^']+)',\s*\{\s*filters:\s*\[([\s\S]*?)\],\s*limit:\s*(\d+),\s*offset:\s*(\d+)\s*\}\s*\]\s*\}/g,
    (match, entity, filters, limit, offset) => {
      return `dataService.query('${entity}', { filters: [${filters}], limit: ${limit}, offset: ${offset} }`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, { encoding: 'utf8', flag: 'w' });
    totalFixed++;
    fileCount++;
    console.log(`✓ ${file}`);
  }
});

console.log(`\n✅ Fixed ${totalFixed} files\n`);
