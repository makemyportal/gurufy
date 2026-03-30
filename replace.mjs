import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    // Replace 'Gurufy' with 'LDMS' (case-sensitive)
    content = content.replace(/Gurufy/g, 'LDMS');
    // Replace 'gurufy' with 'ldms'
    content = content.replace(/gurufy/g, 'ldms');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (e) {
    console.error(`Error in ${filePath}:`, e);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        walkDir(fullPath);
      }
    } else {
      if (['.jsx', '.js', '.html', '.css'].includes(path.extname(fullPath))) {
        replaceInFile(fullPath);
      }
    }
  }
}

walkDir('./src');
replaceInFile('./index.html');
console.log('Done replacement.');
