const fs = require('fs');
const path = require('path');

const srcLogo = path.join(__dirname, '..', 'public', 'images', 'logo.png');
const destIcon = path.join(__dirname, '..', 'src', 'app', 'icon.png');
const oldFavicon = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');

// Copy logo.png to icon.png
fs.copyFileSync(srcLogo, destIcon);
console.log('Copied logo.png to src/app/icon.png');

// Delete src/app/favicon.ico if it exists
if (fs.existsSync(oldFavicon)) {
  fs.unlinkSync(oldFavicon);
  console.log('Deleted src/app/favicon.ico');
}
