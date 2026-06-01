import { readFileSync, readdirSync } from 'fs';
import { transformSync } from 'esbuild';
import { join } from 'path';

const pagesDir = 'src/pages';
const files = readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let errors = 0;
for (const file of files) {
  const path = join(pagesDir, file);
  try {
    const code = readFileSync(path, 'utf8');
    transformSync(code, { loader: 'jsx', logLevel: 'silent' });
    // console.log(`OK: ${file}`);
  } catch (e) {
    errors++;
    const msg = e.message || String(e);
    // Extract just the first error line
    const lines = msg.split('\n').filter(l => l.includes('ERROR') || l.includes('error') || l.includes(':'));
    console.log(`\n=== ERROR in ${file} ===`);
    console.log(lines.slice(0, 5).join('\n'));
  }
}
console.log(`\n--- Total files with errors: ${errors}/${files.length} ---`);
