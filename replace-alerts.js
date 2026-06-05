const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, 'src', 'app');

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Only process if it has alert(
    if (content.includes('alert(')) {
      // Add import if not exists
      if (!content.includes('from "sonner"') && !content.includes("from 'sonner'")) {
        // find last import or "use client";
        if (content.includes('"use client";')) {
          content = content.replace('"use client";', '"use client";\nimport { toast } from "sonner";');
        } else {
          content = 'import { toast } from "sonner";\n' + content;
        }
      }

      // Replace alert(...) with toast.xxx(...)
      content = content.replace(/alert\((.*?)\)/g, (match, p1) => {
        const text = p1.toLowerCase();
        if (text.includes('สำเร็จ') || text.includes('เรียบร้อย') || text.includes('success')) {
          return `toast.success(${p1})`;
        } else if (text.includes('ผิดพลาด') || text.includes('ไม่') || text.includes('error') || text.includes('กรุณา')) {
          return `toast.error(${p1})`;
        } else {
          return `toast(${p1})`;
        }
      });

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
console.log('Done replacing alerts.');
