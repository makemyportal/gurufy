const fs = require('fs');
const path = './src/pages/AITools.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: daily-homework double brace
content = content.replace("  },\n  {  {\n    id: 'daily-homework',", "  },\n  {\n    id: 'daily-homework',");

// Fix 2: iep-generator missing brace and comma
content = content.replace("  }\n    id: 'iep-generator',", "  },\n  {\n    id: 'iep-generator',");

fs.writeFileSync(path, content);
console.log('Fixed syntax!');
