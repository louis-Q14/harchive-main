import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const patterns = [
  // Missing }] before });
  { 
    regex: /filters:\s*\[\{[^}]*\}\);/g, 
    fix: (match) => match.replace(/\}\);$/, '}] });')
  },
  // Missing filters array close
  {
    regex: /filters:\s*\[\{[^}]*\}\s*,\s*(?=limit|offset)/g,
    fix: (match) => match.replace(/\}(?=\s*,)/, '}]')
  },
  // Broken object property
  {
    regex: /([a-zA-Z_]\w*:\s*[^,}]+)\)\s*\}/g,
    check: (match) => match.includes(');') ? match : null
  }
];

console.log(`Scanning ${files.length} files...\n`);

files.forEach(file => {
  let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  let hasIssues = false;
  
  // Look for common syntax patterns
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Check for unmatched brackets in dataService.query
    if (line.includes('dataService.query')) {
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (openBrackets !== closeBrackets || openParens !== closeParens) {
        console.log(`⚠ ${file}:${index + 1} - Unmatched brackets/parens`);
        console.log(`   ${line.trim()}`);
        hasIssues = true;
      }
    }
  });
  
  if (hasIssues) {
    console.log();
  }
});
