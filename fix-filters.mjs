import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pagesDir = 'src/pages';
const files = readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let totalFixes = 0;

for (const file of files) {
  const path = join(pagesDir, file);
  let code = readFileSync(path, 'utf8');
  let fileFixes = 0;
  
  // Pattern 1: Multi-line filters: [{ ... }); → }]});
  // Matches: filters: [{\n  key: value,\n  key2: value2\n});
  // The issue is the closing is }); instead of }]});
  const lines = code.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Fix: single-line filters: [{ ... }) → }])
    // e.g., filters: [{ email: emailR }) : [];
    if (line.match(/filters:\s*\[\{[^}]*\}\s*\)/)) {
      // Check if it's already correct (has }])
      if (!line.match(/\}\s*\]\s*\)/)) {
        const fixed = line.replace(/(\}\s*)\)/, '$1])');
        if (fixed !== line) {
          console.log(`  ${file}:${i+1}: Fixed single-line filters close`);
          console.log(`    FROM: ${line.trim()}`);
          console.log(`    TO:   ${fixed.trim()}`);
          lines[i] = fixed;
          fileFixes++;
          modified = true;
        }
      }
    }
  }
  
  // Now handle multi-line patterns
  code = lines.join('\n');
  
  // Pattern 2: Multi-line: filters: [{\n ... \n}); → }]);
  // Look for lines that have just }); where the previous lines have filters: [{
  const lines2 = code.split('\n');
  for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i].trim();
    
    // Check if this line is just }); and the context above has filters: [{
    if (line === '});' || line === '});') {
      // Look backwards for filters: [{
      let foundFilters = false;
      let bracketDepth = 0;
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const prevLine = lines2[j].trim();
        if (prevLine.includes('filters: [{') || prevLine.includes('filters:[{')) {
          foundFilters = true;
          break;
        }
        // If we hit another closing bracket or opening of a different block, stop
        if (prevLine === '});' || prevLine === '})' || prevLine === '}]});' || prevLine === '}]);') {
          break;
        }
      }
      
      if (foundFilters) {
        // Check: is this }); closing a filter object or the useQuery?
        // If the line after is something like enabled:, it's closing the queryFn
        // If the line after is }, or },, it's closing the filters
        const nextLine = i + 1 < lines2.length ? lines2[i + 1].trim() : '';
        
        // If next line is }, or empty or enabled, this }); is likely closing the dataService.query  
        // The filter needs }] before ); but this is the query call close
        // We need to change }); to }]});
        
        // Actually, looking at the pattern more carefully:
        // dataService.query('X', { filters: [{
        //   key: value,
        //   key2: value2
        // });
        // should become:
        // dataService.query('X', { filters: [{
        //   key: value,
        //   key2: value2
        // }]});
        
        const indent = lines2[i].match(/^(\s*)/)[1];
        lines2[i] = indent + '}]});';
        console.log(`  ${file}:${i+1}: Fixed multi-line filters close }); → }]});`);
        fileFixes++;
        modified = true;
      }
    }
  }
  
  if (modified) {
    code = lines2.join('\n');
    writeFileSync(path, code, 'utf8');
    totalFixes += fileFixes;
    console.log(`  → ${file}: ${fileFixes} fixes applied`);
  }
}

console.log(`\nTotal fixes: ${totalFixes}`);
