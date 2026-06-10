const fs = require('fs');
const path = require('path');
const dir = __dirname;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html');
const injection = `
  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js"></script>
`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('firebase-app-compat.js')) {
    content = content.replace('<script src="script.js"></script>', injection + '\n  <script src="script.js"></script>');
    fs.writeFileSync(filePath, content);
    console.log('Injected into ' + file);
  }
}
