const fs = require('fs');
const p = 'src/pages/GestionStructureAcademique.jsx';
let c = fs.readFileSync(p, 'utf8');

const before = c.length;
const imgTag4 = '<img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691230093d09cc9fd317fdee/8b9a4e0c1_delete1.png" alt="Supprimer" className="h-4 w-4" />';
const imgTag3 = '<img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691230093d09cc9fd317fdee/8b9a4e0c1_delete1.png" alt="Supprimer" className="h-3 w-3" />';

while (c.includes(imgTag4)) {
  c = c.replace(imgTag4, '<Trash2 className="h-4 w-4" />');
}
while (c.includes(imgTag3)) {
  c = c.replace(imgTag3, '<Trash2 className="h-3 w-3" />');
}

const after = c.length;
fs.writeFileSync(p, c, 'utf8');
process.stdout.write('Length before: ' + before + ' after: ' + after + '\n');
