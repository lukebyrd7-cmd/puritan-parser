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
  const strongs = json('data/metadata/open-scriptures-strongs-source.json');
  const completion = json('data/glosses/v1.9.3-greek-reviewed-completions.json');
  const required = [
    'Puritan Parser Greek lexical glosses', 'Puritan Parser Hebrew lexical glosses',
    'MorphGNT SBLGNT Edition', 'Open Scriptures Hebrew Bible', 'MACULA Hebrew Linguistic Datasets',
    'Cherith Glosses', 'STEPBible Data', 'Open English Bible', 'World English Bible',
    'The Vocabulary Guide to Biblical Hebrew and Aramaic', 'verification-only',
    'James Swanson', 'Dictionary of Biblical Languages with Semantic Domains', 'Open Scriptures Strong’s',
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
    if(/VGBH|Swanson/i.test(item.sourceReference) || !/(Strong|Puritan Parser|Open Scriptures|MorphGNT|MACULA|Cherith)/i.test(item.sourceReference)) errors.push(`${label}: approved publishable source support required`);
  });
  if(!Array.isArray(unavailable.records) || unavailable.records.length) errors.push('v1.9.3 requires zero unavailable lexical identities');
  if(strongs.commit !== '0acd2f251c2d35ff8db2dece4e0593979d3ac223' || strongs.digitalLicense !== 'CC BY-SA' || strongs.rawSourceDistributed !== false) errors.push('Open Scriptures Strong’s source gate mismatch');
  if(completion.records?.length !== 769 || completion.records.some(item => !item.sourceEntry || item.finalStatus !== 'COVERED')) errors.push('Greek completion manifest incomplete');
  return errors;
}

if(require.main === module){
  const errors = validateSourceLedger();
  if(errors.length){ console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Source ledger validation passed.');
}
module.exports = { validateSourceLedger };
