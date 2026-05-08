const fs = require('fs');
const path = './src/pages/AITools.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\{\s*\{\s*id:\s*'daily-homework'/g, "{\n    id: 'daily-homework'");
content = content.replace(/\}\s*id:\s*'iep-generator'/g, "},\n  {\n    id: 'iep-generator'");

fs.writeFileSync(path, content);
console.log('Fixed syntax with regex!');
