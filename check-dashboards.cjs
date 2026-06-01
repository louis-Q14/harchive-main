const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const files = [
  'AdminSystemeDashboard',
  'AdminEtablissementDashboard', 
  'ProfesseurDashboard',
  'EtudiantDashboard',
  'ParentDashboard'
];

console.log('--- Dashboard Syntax Check ---');
for (const name of files) {
  const filePath = path.join('src', 'components', 'dashboards', name + '.jsx');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    transformSync(content, { loader: 'jsx', logLevel: 'silent' });
    console.log(name + ': OK');
  } catch (err) {
    console.log(name + ': ERROR - ' + (err.errors ? err.errors[0].text : err.message));
  }
}
console.log('--- Done ---');
