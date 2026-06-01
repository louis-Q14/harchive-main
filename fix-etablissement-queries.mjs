import fs from 'fs';
import path from 'path';

const file = 'c:\\Users\\LOUIS-QUATORZE\\Documents\\harchive-main\\src\\pages\\PlanificationPedagogique.jsx';

let content = fs.readFileSync(file, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}

// Replace all instances of the malformed query
const fixed = content.replace(
  /const etablissements = await dataService\.query\('Etablissement', \{ filters: \[\{ id: user\.etablissement_id \}\);/g,
  "const etablissements = await dataService.query('Etablissement', { filters: [{ id: user.etablissement_id }] });"
);

fs.writeFileSync(file, fixed, { encoding: 'utf8', flag: 'w' });

console.log('Fixed etablissement queries in PlanificationPedagogique.jsx');
