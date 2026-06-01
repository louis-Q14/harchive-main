import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure proper UTF-8 encoding and remove any BOM
    let fixed = content;
    if (fixed.charCodeAt(0) === 0xFEFF) {
      fixed = fixed.slice(1);
    }
    
    // Ensure file ends with newline
    if (!fixed.endsWith('\n')) {
      fixed += '\n';
    }
    
    // Write back with explicit UTF-8 encoding
    fs.writeFileSync(filePath, fixed, { encoding: 'utf8', flag: 'w' });
    return true;
  } catch (e) {
    console.error(`Error in ${path.basename(filePath)}: ${e.message}`);
    return false;
  }
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let fixed = 0;
files.forEach(file => {
  if (fixFile(path.join(pagesDir, file))) {
    fixed++;
    console.log('✓ ' + file);
  }
});

console.log(`\n✅ Re-encoded ${fixed}/${files.length} files with proper UTF-8`);
