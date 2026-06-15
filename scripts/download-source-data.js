const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'source');
const GREEK_DIR = path.join(SOURCE_DIR, 'morphgnt-sblgnt');
const HEBREW_DIR = path.join(SOURCE_DIR, 'morphhb-wlc');

const GREEK_BOOKS = [
  '61-Mt', '62-Mk', '63-Lk', '64-Jn', '65-Ac', '66-Ro', '67-1Co', '68-2Co', '69-Ga',
  '70-Eph', '71-Php', '72-Col', '73-1Th', '74-2Th', '75-1Ti', '76-2Ti', '77-Tit',
  '78-Phm', '79-Heb', '80-Jas', '81-1Pe', '82-2Pe', '83-1Jn', '84-2Jn', '85-3Jn',
  '86-Jud', '87-Re'
];

const HEBREW_BOOKS = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs',
  '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song',
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic',
  'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'puritan-parser-data-builder' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      res.setEncoding('utf8');
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function download(url, filePath) {
  if (fs.existsSync(filePath)) return false;
  const text = await fetchText(url);
  fs.writeFileSync(filePath, text);
  return true;
}

async function main() {
  ensureDir(GREEK_DIR);
  ensureDir(HEBREW_DIR);
  let downloaded = 0;

  for (const book of GREEK_BOOKS) {
    const url = `https://raw.githubusercontent.com/morphgnt/sblgnt/master/${book}-morphgnt.txt`;
    const file = path.join(GREEK_DIR, `${book}-morphgnt.txt`);
    if (await download(url, file)) downloaded++;
  }

  for (const book of HEBREW_BOOKS) {
    const url = `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${book}.xml`;
    const file = path.join(HEBREW_DIR, `${book}.xml`);
    if (await download(url, file)) downloaded++;
  }

  console.log(`Source data ready in ${path.relative(ROOT, SOURCE_DIR)} (${downloaded} downloaded).`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
