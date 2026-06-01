const fs = require('fs');
const c = fs.readFileSync('src/pages/BibliothequeNumerique.jsx', 'utf8');
const lines = c.split('\n');
// Write lines 584-627 to a temp file for inspection
const output = [];
for (let i = 583; i < 627; i++) {
  output.push(`L${i+1}: ${JSON.stringify(lines[i])}`);
}
fs.writeFileSync('_temp_output.txt', output.join('\n'));
console.log('Done - check _temp_output.txt');
