const fs = require('fs');
const buffer = fs.readFileSync('public/images/logo.png');
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
console.log(`Dimensions: ${width}x${height}`);
