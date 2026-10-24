// แปลงไฟล์ ca.pem (ใบรับรองของ Aiven) ให้เป็นบรรทัดเดียว เพื่อวางในค่า DB_SSL_CA บน Render
//   node ca-to-env.js ca.pem
const fs = require('fs');
const file = process.argv[2] || 'ca.pem';
console.log(fs.readFileSync(file, 'utf8').trim().replace(/\r?\n/g, '\\n'));
