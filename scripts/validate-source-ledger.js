const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file));

function validateSourceLedger(){
  const errors = [];
  const ledger = read('docs/data-source-ledger.md');
  const interlinear = json('data/hebrew-interlinear/source-manifest.json');
  const corrections = json('data/glosses/corrections.json');
  const unavailable = json('data/glosses/unavailable-glosses.json');
  const required = [
    'Puritan Parser Greek lexical glosses', 'Puritan Parser Hebrew lexical glosses',
    'MorphGNT SBLGNT Edition', 'Open Scriptures Hebrew Bible', 'MACULA Hebrew Linguistic Datasets',
    'Cherith Glosses', 'STEPBible Data', 'Open English Bible', 'World English Bible',
    'The Vocabulary Guide to Biblical Hebrew and Aramaic', 'verification-only',
    '47db250bd55d0d8577f2a94fba114ef16c35b23c', 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39'
  ];
  required.forEach(value => { if(!ledger.includes(value)) errors.push(`ledger missing ${value}`); });
  if(interlinear.sourceCommit !== '47db250bd55d0d8577f2a94fba114ef16c35b23c') errors.push('MACULA commit mismatch');
  if(interlinear.secondaryVerification?.commit !== 'b86d26cdb1f51729e73b5b4eb7f7ccadc5dfba39') errors.push('STEPBible verification commit mismatch');
  if((interlinear.secondaryVerification?.importedFields || []).length) errors.push('STEPBible must remain verification-only');
  if(!interlinear.licenses?.some(item => item.dataset.includes('MACULA') && item.license === 'CC BY 4.0')) errors.push('MACULA license missing');
  if(!interlinear.licenses?.some(item => item.dataset.includes('Cherith') && item.license === 'CC BY 4.0')) errors.push('Cherith license missing');
  if(corrections.schemaVersion !== 1 || !Array.isArray(corrections.corrections)) errors.push('correction manifest malformed');
  const correctionIds = new Set();
  corrections.corrections.forEach((item, index) => {
    const label = item.id || `correction[${index}]`;
    if(!item.id || correctionIds.has(item.id)) errors.push(`${label}: duplicate or missing correction id`);
    correctionIds.add(item.id);
    ['vocabularyId','language','expectedSourceValue','reason','sourceReference','manifestVersion'].forEach(field => { if(!item[field]) errors.push(`${label}: missing ${field}`); });
    if(!Array.isArray(item.correctedPrimary) || !item.correctedPrimary.length) errors.push(`${label}: correctedPrimary required`);
    if(!item.verificationTrigger || !/verification only/i.test(item.verificationTrigger)) errors.push(`${label}: verification-only trigger required`);
    if(/VGBH/i.test(item.sourceReference) || !/(Strong|Puritan Parser|Open Scriptures|MACULA|Cherith)/i.test(item.sourceReference)) errors.push(`${label}: approved publishable source support required`);
  });
  const unavailableRecord = unavailable.records?.find(item => item.vocabularyId === 'hb-28058');
  if(!unavailableRecord || unavailableRecord.lemma !== 'i' || unavailableRecord.frequency !== 1) errors.push('hb-28058 unavailable record mismatch');
  return errors;
}

if(require.main === module){
  const errors = validateSourceLedger();
  if(errors.length){ console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Source ledger validation passed.');
}
module.exports = { validateSourceLedger };
