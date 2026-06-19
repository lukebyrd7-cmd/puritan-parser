const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('smoke: app shell loads required views and controls', () => {
  ['app', 'listView', 'flashView', 'parsingView', 'dashboardView', 'settingsView'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});

test('smoke: Greek/Hebrew switching and word list controls are present', () => {
  assert.match(html, /data-lang="greek"/);
  assert.match(html, /data-lang="hebrew"/);
  assert.match(html, /id="wordsTbody"/);
});

test('smoke: flashcards, parsing, dashboard, settings, and import/export controls are present', () => {
  ['startFlashBtn', 'fcFlipToBack', 'startParsing', 'parsingSubmit', 'statsGrid', 'openSettings', 'exportData', 'importData'].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`));
  });
});
