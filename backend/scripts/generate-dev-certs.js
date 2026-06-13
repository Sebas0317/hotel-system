'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CERTS_DIR = path.join(__dirname, '..', 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'dev-key.pem');
const CERT_PATH = path.join(CERTS_DIR, 'dev-cert.pem');

function findOpenssl() {
  const candidates = [
    'openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
    '/usr/bin/openssl',
    '/usr/local/bin/openssl',
  ];
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" version`, { stdio: 'pipe' });
      return bin;
    } catch { continue; }
  }
  return null;
}

function generate() {
  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    console.log('Development certificates already exist in certs/');
    return;
  }

  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  const openssl = findOpenssl();
  if (!openssl) {
    console.error('OpenSSL not found. Install OpenSSL or use Git Bash.');
    console.error('');
    console.error('Manual generation:');
    console.error(`  openssl req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/CN=localhost"`);
    process.exit(1);
  }

  execSync(
    `"${openssl}" req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/CN=localhost/O=EcoBosque Dev"`,
    { stdio: 'pipe' }
  );
  console.log('Development certificates generated in certs/');
  console.log(`  Private key: ${KEY_PATH}`);
  console.log(`  Certificate: ${CERT_PATH}`);
}

generate();
