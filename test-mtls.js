const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'localhost',
  port: 3016,
  path: '/payments/health',
  method: 'GET',
  key: fs.readFileSync('./client.key'),
  cert: fs.readFileSync('./client.crt'),
  ca: fs.readFileSync('./ca.crt'),
  // rejectUnauthorized: true là mặc định, nó sẽ verify server certificate
};

console.log('Sending mTLS request to https://localhost:3016/payments/health...');

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Request failed: ${e.message}`);
});

req.end();