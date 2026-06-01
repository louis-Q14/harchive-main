const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

// Patterns to fix
const fixes = [
  {
    name: 'Missing }] in dataService.query',
    pattern: /dataService\.query\([^)]*\{\s*filters:\s*\[\{[^}]*\}\s*\)\s*;/g,
    test: (content) => /dataService\.query\([^)]*\}\s*\)\s*;/.test(content),
    fix: (content) => {
      // Fix: }); => }] });
      return content.replace(/(\}\]\s*\)\s*;)/, '} ] });')
        .replace(/(\{\s*filters:\s*\[\{[^}]*\})\s*\)\s*;/g, (match) => {
          return match.replace('})', '}] });');
        });
    }
  },
  {
    name: 'UTF-8 mojibake (Ã©, Ã¨, etc)',
    pattern: /Ã©|Ã¨|Ãª|Ã´|Ã¹|Ã§|Ã |Â°/g,
    test: (content) => /(Ã©|Ã¨|Ãª|Ã´|Ã¹|Ã§|Ã |Â°)/.test(content),
    fix: (content) => {
      return content
        .replace(/Ã©/g, 'é')
        .replace(/Ã¨/g, 'è')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã¹/g, 'ù')
        .replace(/Ã§/g, 'ç')
        .replace(/Ã /g, 'à')
        .replace(/Â°/g, '°');
    }
  },
  {
    name: 'Missing limit/offset in query',
    pattern: /dataService\.query\([^,]+,\s*\{\s*filters:\s*\[[^\]]*\]\s*\}\s*(?:,|;|\))/g,
    test: (content) => {
      // Check if queries don't have limit/offset
      return /dataService\.query\([^)]*\{\s*filters:[^}]*\}(?!\s*,.*limit)/.test(content);
    },
    fix: (content) => {
      // Add limit/offset to query calls that don't have them
      return content.replace(
        /dataService\.query\(([^,]+),\s*\{\s*filters:\s*\[([^\]]*)\]\s*\}\s*([,;)])/g,
        (match, entity, filters, endChar) => {
          if (!match.includes('limit')) {
            return `dataService.query(${entity}, { filters: [${filters}], limit: 1000, offset: 0 }${endChar}`;
          }
          return match;
        }
      );
    }
  },
  {
    name: 'BOM removal',
    pattern: /^\uFEFF/,
    test: (content) => /^\uFEFF/.test(content),
    fix: (content) => content.replace(/^\uFEFF/, '')
  },
  {
    name: 'Broken await comments',
    pattern: /await\s+\/\/\s*TODO:/g,
    test: (content) => /await\s+\/\/\s*TODO:/.test(content),
    fix: (content) => {
      return content.replace(
        /const\s+(\w+)\s*=\s*await\s+\/\/\s*TODO:[^\n]*\n/g,
        'const $1 = null; // TODO: Implement\n'
      );
    }
  },
  {
    name: 'Extra closing crochets }, });',
    pattern: /\},\s*\}\);/g,
    test: (content) => /\},\s*\}\);/.test(content),
    fix: (content) => content.replace(/\},\s*\}\);/g, '}] });')
  },
  {
    name: 'Malformed setInterval',
    pattern: /setInterval\([^}]*\}\]\s*\}\);/g,
    test: (content) => /setInterval\([^}]*\}\]\s*\}\);/.test(content),
    fix: (content) => {
      return content.replace(
        /recordingInterval\.current\s*=\s*setInterval\(\([^)]*\)\s*=>\s*\{[\s\S]*?\}\]\s*\}\);/,
        (match) => {
          return match
            .replace('}] });', '}, 1000);')
            .replace('});', '}, 1000);');
        }
      );
    }
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixCount = 0;

    fixes.forEach(fixRule => {
      if (fixRule.test(content)) {
        content = fixRule.fix(content);
        fixCount++;
      }
    });

    if (fixCount > 0 || content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { file: path.basename(filePath), fixes: fixCount, status: '✓' };
    }
    return { file: path.basename(filePath), fixes: 0, status: '—' };
  } catch (error) {
    return { file: path.basename(filePath), fixes: 0, status: '✗', error: error.message };
  }
}

// Main execution
console.log('🔍 Scanning all JSX pages...\n');

const files = fs.readdirSync(pagesDir)
  .filter(f => f.endsWith('.jsx'))
  .sort();

console.log(`Found ${files.length} JSX files\n`);

const results = files.map(file => fixFile(path.join(pagesDir, file)));

// Report
console.log('\n📊 Results:\n');
console.table(results);

const fixedCount = results.filter(r => r.fixes > 0).length;
const errorCount = results.filter(r => r.status === '✗').length;

console.log(`\n✅ Fixed: ${fixedCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log(`➡️  Unchanged: ${results.filter(r => r.fixes === 0 && r.status !== '✗').length} files`);
console.log(`\n✨ All pages processed!`);
