import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Extended UTF-8 mojibake cleanup
    const replacements = {
      'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã´': 'ô', 'Ã¹': 'ù', 'Ã§': 'ç', 'Ã ': 'à', 'Â°': '°',
      'â€"': '–', 'â€œ': '"', 'â€': '–', 'â€™': "'", 'Ã': 'é',
      'FacultÃ©': 'Faculté', 'ApprouvÃ©': 'Approuvé',  // Common patterns
    };
    
    for (const [corrupted, correct] of Object.entries(replacements)) {
      content = content.split(corrupted).join(correct);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) {
    console.error(`Error in ${path.basename(filePath)}: ${e.message}`);
    return false;
  }
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let fixed = 0;
files.forEach(file => {
  if (cleanFile(path.join(pagesDir, file))) {
    fixed++;
  }
});

console.log(`✅ UTF-8 cleanup completed on ${files.length} files`);
