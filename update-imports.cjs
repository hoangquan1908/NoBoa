const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let results = [];
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const dirToWalk = path.join(__dirname, 'apps/web/src');
const files = walkDir(dirToWalk);

const importRegex = /from\s+['"](\.\.\/)+(store|lib|types)\/[a-zA-Z0-9_\.]+['"]/g;

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (importRegex.test(content)) {
    content = content.replace(importRegex, "from '@note-board-app/shared'");
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated imports in: ${file}`);
    count++;
  }
}

console.log(`Successfully updated ${count} files.`);
