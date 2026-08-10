const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'glosses', 'hebrew-glosses.json');

function cleanSense(value){
  const text = String(value || '').replace(/(?:[.;]?\s*(?:see also|see|compare|marg\. for)\s+H\d+.*)$/i, '').replace(/[.;,\s]+$/g, '').trim();
  return /[\u0590-\u05ff]/u.test(text) || /^[GH]\d+$/i.test(text) ? '' : text;
}
function sanitize(source){
  const changed = [];
  for(const [lemma, record] of Object.entries(source)){
    const before = JSON.stringify(record);
    record.primaryGloss = cleanSense(record.primaryGloss);
    record.alternateGlosses = [...new Set((record.alternateGlosses || []).map(cleanSense).filter(Boolean))];
    if(lemma === '238'){
      record.primaryGloss = 'listen';
      record.alternateGlosses = ['give ear', 'hear'];
    }
    if(JSON.stringify(record) !== before) changed.push(lemma);
  }
  return { source, changed };
}
function main(){
  const result = sanitize(JSON.parse(fs.readFileSync(FILE, 'utf8')));
  if(process.argv.includes('--write')) fs.writeFileSync(FILE, `${JSON.stringify(result.source, null, 2)}\n`);
  console.log(JSON.stringify({ changed: result.changed.length, lemmas: result.changed }, null, 2));
}
if(require.main === module) main();
module.exports = { cleanSense, sanitize };
