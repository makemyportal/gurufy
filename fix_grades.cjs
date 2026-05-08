const fs = require('fs');
const path = './src/pages/AITools.jsx';
let content = fs.readFileSync(path, 'utf8');

const GRADE_LIST = "['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']";

if (!content.includes('const GRADE_LIST =')) {
  content = content.replace(
    'export const tools = [',
    `const GRADE_LIST = ${GRADE_LIST};\n\nexport const tools = [`
  );
}

content = content.replace(/\{\s*id:\s*'grade',[^}]*type:\s*'select',[^}]*options:\s*\[.*?\][^}]*\}/g, 
  "{ id: 'grade', label: 'Class / Grade', type: 'select', options: GRADE_LIST }");

fs.writeFileSync(path, content);
console.log('Regex replacements done');
