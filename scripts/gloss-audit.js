const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_VOCAB_PATH = path.join(ROOT, 'vocab_all.json');
const LANGS = ['greek', 'hebrew'];
const LONG_PRIMARY_GLOSS_LIMIT = 40;
const LARGE_ALTERNATE_GLOSSES_LIMIT = 12;

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function hasSuspiciousFormatting(value) {
  return typeof value === 'string' && (/^\s|\s$/.test(value) || /\s{2,}/.test(value) || /[;,|]$/.test(value));
}

function createLangReport(lang, entries) {
  const ids = new Map();
  const report = {
    lang,
    totalEntries: entries.length,
    missingGloss: [],
    missingPrimaryGloss: [],
    withAlternateGlosses: [],
    blankIds: [],
    duplicateIds: [],
    malformedAlternateGlosses: [],
    suspiciouslyLongPrimaryGlosses: [],
    unusuallyLargeAlternateGlosses: [],
    suspiciousFormatting: [],
    coveragePercent: 0
  };

  entries.forEach((entry, index) => {
    const label = entry && entry.id ? entry.id : `${lang}[${index}]`;
    if (!entry || isBlank(entry.id)) {
      report.blankIds.push(label);
    } else {
      const seen = ids.get(entry.id) || [];
      seen.push(label);
      ids.set(entry.id, seen);
    }

    if (!entry || isBlank(entry.gloss)) report.missingGloss.push(label);
    if (!entry || isBlank(entry.primaryGloss)) report.missingPrimaryGloss.push(label);

    if (entry && Object.prototype.hasOwnProperty.call(entry, 'alternateGlosses')) {
      if (!Array.isArray(entry.alternateGlosses)) {
        report.malformedAlternateGlosses.push(label);
      } else if (entry.alternateGlosses.length) {
        report.withAlternateGlosses.push(label);
        if (entry.alternateGlosses.length > LARGE_ALTERNATE_GLOSSES_LIMIT) {
          report.unusuallyLargeAlternateGlosses.push(`${label} (${entry.alternateGlosses.length})`);
        }
        entry.alternateGlosses.forEach((gloss, glossIndex) => {
          if (isBlank(gloss) || hasSuspiciousFormatting(gloss)) {
            report.suspiciousFormatting.push(`${label}.alternateGlosses[${glossIndex}]`);
          }
        });
      }
    }

    if (entry && typeof entry.primaryGloss === 'string') {
      if (entry.primaryGloss.trim().length > LONG_PRIMARY_GLOSS_LIMIT) {
        report.suspiciouslyLongPrimaryGlosses.push(label);
      }
      if (hasSuspiciousFormatting(entry.primaryGloss)) {
        report.suspiciousFormatting.push(`${label}.primaryGloss`);
      }
    }
    if (entry && typeof entry.gloss === 'string' && hasSuspiciousFormatting(entry.gloss)) {
      report.suspiciousFormatting.push(`${label}.gloss`);
    }
  });

  report.coveragePercent = report.totalEntries ? Number((((report.totalEntries - report.missingPrimaryGloss.length) / report.totalEntries) * 100).toFixed(2)) : 100;

  report.duplicateIds = Array.from(ids.entries())
    .filter(([, seen]) => seen.length > 1)
    .map(([id, seen]) => `${id} (${seen.length})`);

  return report;
}

function auditGlosses(entries) {
  const reports = {};
  LANGS.forEach(lang => {
    reports[lang] = createLangReport(lang, entries.filter(entry => entry && entry.lang === lang));
  });
  return reports;
}

function validationErrors(reports) {
  const errors = [];
  Object.values(reports).forEach(report => {
    if (report.blankIds.length) errors.push(`${report.lang}: blank IDs (${report.blankIds.length})`);
    if (report.duplicateIds.length) errors.push(`${report.lang}: duplicate IDs (${report.duplicateIds.length})`);
    if (report.missingGloss.length) errors.push(`${report.lang}: blank gloss (${report.missingGloss.length})`);
    if (report.missingPrimaryGloss.length) errors.push(`${report.lang}: blank primaryGloss (${report.missingPrimaryGloss.length})`);
    if (report.malformedAlternateGlosses.length) errors.push(`${report.lang}: alternateGlosses not arrays (${report.malformedAlternateGlosses.length})`);
  });
  return errors;
}

function formatSamples(values, max = 5) {
  if (!values.length) return '';
  const sample = values.slice(0, max).join(', ');
  return ` (${sample}${values.length > max ? ', ...' : ''})`;
}

function formatReport(reports) {
  const lines = [];
  Object.values(reports).forEach(report => {
    const name = report.lang[0].toUpperCase() + report.lang.slice(1);
    lines.push(`${name}:`);
    lines.push(`* total entries: ${report.totalEntries}`);
    lines.push(`* missing gloss: ${report.missingGloss.length}${formatSamples(report.missingGloss)}`);
    lines.push(`* entries with primaryGloss: ${report.totalEntries - report.missingPrimaryGloss.length}`);
    lines.push(`* missing primaryGloss: ${report.missingPrimaryGloss.length}${formatSamples(report.missingPrimaryGloss)}`);
    lines.push(`* primaryGloss coverage: ${report.coveragePercent.toFixed(2)}%`);
    lines.push(`* entries with alternateGlosses: ${report.withAlternateGlosses.length}`);
    lines.push(`* duplicate IDs: ${report.duplicateIds.length}${formatSamples(report.duplicateIds)}`);
    lines.push(`* malformed alternateGlosses: ${report.malformedAlternateGlosses.length}${formatSamples(report.malformedAlternateGlosses)}`);
    lines.push(`* suspiciously long primaryGlosses: ${report.suspiciouslyLongPrimaryGlosses.length}${formatSamples(report.suspiciouslyLongPrimaryGlosses)}`);
    lines.push(`* unusually large alternateGloss arrays: ${report.unusuallyLargeAlternateGlosses.length}${formatSamples(report.unusuallyLargeAlternateGlosses)}`);
    lines.push(`* suspicious formatting: ${report.suspiciousFormatting.length}${formatSamples(report.suspiciousFormatting)}`);
    lines.push('');
  });
  const errors = validationErrors(reports);
  lines.push(errors.length ? `Validation failed: ${errors.join('; ')}` : 'Validation passed.');
  return lines.join('\n');
}

function readVocab(file = DEFAULT_VOCAB_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runCli(argv = process.argv.slice(2)) {
  const json = argv.includes('--json');
  const noFail = argv.includes('--no-fail');
  const fileArg = argv.find(arg => !arg.startsWith('--'));
  const reports = auditGlosses(readVocab(fileArg || DEFAULT_VOCAB_PATH));
  process.stdout.write(json ? `${JSON.stringify(reports, null, 2)}\n` : `${formatReport(reports)}\n`);
  const errors = validationErrors(reports);
  return !noFail && errors.length ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = runCli();
}

module.exports = {
  auditGlosses,
  formatReport,
  validationErrors,
  runCli,
  LONG_PRIMARY_GLOSS_LIMIT,
  LARGE_ALTERNATE_GLOSSES_LIMIT
};
