import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

console.log(`\n🔧 Fixing dataService.query() formatting...\n`);

let fixed = 0;

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  // Fix: Remove limit/offset from same line as });
  // Pattern: ... limit: 1000, offset: 0 });
  // Replace with proper formatting on separate line
  const pattern = /,\s*limit:\s*(\d+),\s*offset:\s*(\d+)\s*\}\);/g;
  const newContent = content.replace(pattern, `, limit: $1, offset: $2\n  }\n);`);
  
  if (newContent !== content) {
    // Extra cleanup: normalize the formatting
    let cleanContent = newContent
      // Fix double closing brackets
      .replace(/\}\n\s*\}\n\s*\);/g, '}\n);')
      // Normalize spacing
      .replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, cleanContent, { encoding: 'utf8' });
    fixed++;
    console.log(`✓ ${file}`);
  }
});

console.log(`\n✅ Cleaned up ${fixed} files\n`);
