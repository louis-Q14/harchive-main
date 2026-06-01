import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Fix: }]\n, limit: => }],\nlimit:
    content = content.replace(/\}\]\s*\n\s*,\s*limit:/g, '}],\n  limit:');
    
    // Fix: })\n, limit: => }),\nlimit: (for simple cases)
    content = content.replace(/\}\)\s*\n\s*,\s*limit:/g, '}),\n  limit:');
    
    // Fix: remaining patterns with wrong comma placement
    content = content.replace(/filters:\s*\[\{([^}]*)\}\]\s*,\s*limit:/g, 'filters: [{$1}],\n  limit:');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (e) {
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

console.log(`\n✅ Fixed comma placement in ${fixed}/${files.length} files`);
