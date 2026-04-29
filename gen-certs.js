const forge = require('node-forge');
const fs = require('fs');

function generateCert(commonName, isCa = false, caCert = null, caKey = null, altNames = []) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(Date.now());
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{ name: 'commonName', value: commonName }];
  cert.setSubject(attrs);
  cert.setIssuer(isCa ? attrs : caCert.subject.attributes);

  const extensions = [
    { name: 'basicConstraints', cA: isCa },
    { name: 'keyUsage', keyCertSign: isCa, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true }
  ];

  // Add Subject Alternative Names for server certs
  if (altNames.length > 0) {
    extensions.push({
      name: 'subjectAltName',
      altNames: altNames.map(name => {
        // Check if it's an IP address
        if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
          return { type: 7, ip: name };
        }
        return { type: 2, value: name }; // DNS name
      })
    });
  }

  cert.setExtensions(extensions);
  cert.sign(isCa ? keys.privateKey : caKey, forge.md.sha256.create());

  return {
    cert: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keys.privateKey),
    forgeCert: cert,
    forgeKey: keys.privateKey
  };
}

// Generate CA
const ca = generateCert('CabGo-Root-CA', true);
fs.writeFileSync('ca.crt', ca.cert);
fs.writeFileSync('ca.key', ca.key);

// Generate Server Cert with SANs for Docker service names
const server = generateCert('payment-service', false, ca.forgeCert, ca.forgeKey, [
  'localhost',
  'payment-service',          // Docker service name
  '127.0.0.1'
]);
fs.writeFileSync('server.crt', server.cert);
fs.writeFileSync('server.key', server.key);

// Generate Client Cert (for API Gateway)
const client = generateCert('api-gateway-client', false, ca.forgeCert, ca.forgeKey, [
  'localhost',
  'api-gateway'
]);
fs.writeFileSync('client.crt', client.cert);
fs.writeFileSync('client.key', client.key);

console.log('✅ Certificates generated with SAN (Subject Alternative Names)!');
console.log('   Server cert valid for: localhost, payment-service, 127.0.0.1');
console.log('   Client cert valid for: localhost, api-gateway');
