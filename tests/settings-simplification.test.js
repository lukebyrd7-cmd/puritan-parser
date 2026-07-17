const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

global.DEFAULTS = {
  accent: '#4e8f6e', theme: 'light', initialEase: 2.5, minEase: 1.3,
  useSM2: true, dailyCap: 200, newPerDay: 20, studyMode: 'lemma'
};

test('legacy form-mode preferences migrate to lemma study without dropping data', () => {
  delete require.cache[require.resolve('../src/models/preferences')];
  const { createPreferences } = require('../src/models/preferences');
  const migrated = createPreferences({ studyMode: 'form', accent: '#123456', customPreference: 'kept' });
  assert.equal(migrated.studyMode, 'lemma');
  assert.equal(migrated.accent, '#123456');
  assert.equal(migrated.customPreference, 'kept');
});

test('SRS presets map to existing scheduler preferences and preserve the algorithm', () => {
  global.state = { prefs: {} };
  global.savePrefs = () => {};
  const { SRS_PRESETS, inferSrsPreset, applySrsPreset } = require('../src/features/settings');
  assert.deepEqual(Object.keys(SRS_PRESETS), ['gentle', 'balanced', 'intensive']);
  assert.equal(inferSrsPreset({ dailyCap: 200, newPerDay: 20 }), 'balanced');
  const prefs = applySrsPreset('intensive');
  assert.equal(prefs.srsPreset, 'intensive');
  assert.equal(prefs.useSM2, true);
  assert.equal(prefs.studyMode, 'lemma');
  assert.equal(prefs.newPerDay, 30);
});

test('settings markup uses named theme swatches and a native custom color picker', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const theme = fs.readFileSync('src/ui/theme.js', 'utf8');
  ['Neutral Green', 'Slate', 'Ocean', 'Warm Sand', 'Deep Blue', 'Burgundy'].forEach(name => assert.match(theme, new RegExp(name)));
  assert.match(html, /id="customAccent" type="color"/);
  assert.match(html, /id="srsPreset"/);
  assert.doesNotMatch(html, /id="studyModeSetting"|id="initialEase"|id="minEase"/);
});

test('About & Sources is a normal Settings destination with the required sections', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const settings = fs.readFileSync('src/features/settings/index.js', 'utf8');
  assert.match(html, /id="openAboutSourcesBtn"/);
  assert.match(settings, /About The Puritan Parser/);
  assert.match(settings, /Greek Reference Sources/);
  assert.match(settings, /Hebrew Reference Sources/);
  assert.match(settings, /Text and Translation Sources/);
  assert.match(settings, /Data and Licensing/);
  assert.match(settings, /Methodology and Limitations/);
  assert.match(settings, /navigateTo\('\/settings'\)/, 'the page retains a normal return to Settings');
});
