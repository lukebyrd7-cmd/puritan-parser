const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const manifest = require(path.join(ROOT, 'data', 'metadata', 'abbott-smith-source.json'));
function sha256(value){ return crypto.createHash('sha256').update(value).digest('hex'); }
function download(url){
  return new Promise((resolve, reject) => https.get(url, response => {
    if(response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return resolve(download(new URL(response.headers.location, url).href));
    if(response.statusCode !== 200) return reject(new Error(`${url}: HTTP ${response.statusCode}`));
    const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve(Buffer.concat(chunks))); response.on('error', reject);
  }).on('error', reject));
}
async function main(){
  for(const record of manifest.files){
    const bytes = await download(record.url);
    if(bytes.length !== record.bytes || sha256(bytes) !== record.sha256) throw new Error(`${record.url}: pinned source integrity check failed`);
    const destination = path.join(ROOT, record.path); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes);
    console.log(`Downloaded ${path.relative(ROOT, destination)} (${bytes.length} bytes; SHA-256 ${record.sha256}).`);
  }
}
if(require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { download, sha256 };
