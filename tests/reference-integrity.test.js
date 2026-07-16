const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const library = require('../src/features/grammar/reference-data');

const GREEK = /[\u0370-\u03ff\u1f00-\u1fff]/;
const HEBREW = /[\u0590-\u05ff]/;
const INTERNAL = /Phase A|Phase B|TODO|Needs review|audit-marked|scholarly verification will occur later|\[object Object\]/i;
const PERSON_LABELS = new Set(['1st','2nd','3rd','1 sg','2 sg','3 sg','3 masc sg','3 fem sg','3ms','3fs','2ms','2fs','1cs','3mp','3fp','2mp','2fp','1cp','Form']);

function cellText(cell) {
  if (cell && typeof cell === 'object') return [cell.label, cell.text, cell.note].filter(Boolean).join(' ');
  return String(cell ?? '');
}
function topicSections(topic) {
  return [
    ...(topic.sections || []),
    ...(topic.sectionTabs || []).flatMap(tab => tab.sections || [])
  ];
}
function topicCharts(topic) {
  return [
    ...(topic.charts || []),
    ...(topic.paradigmTabs || []).flatMap(tab => tab.charts || []),
    ...topicSections(topic).flatMap(section => section.charts || [])
  ];
}
function visibleText(topic) {
  return JSON.stringify(topic, (key, value) => key === 'searchTerms' ? undefined : value);
}
function chartHasScript(chart, regex) {
  return (chart.rows || []).flat().some(cell => regex.test(cellText(cell)));
}

function sectionSlug(section, index = 0) {
  return section.id || String(section.title || `section-${index}`).toLowerCase().replace(/[^a-z0-9\u0370-\u03ff\u0590-\u05ff]+/g, '-').replace(/^-|-$/g, '');
}

test('v1.3.1 Reference navigation, aliases, and search targets resolve to real resources', () => {
  const ids = new Set(library.referenceTopics.map(topic => topic.id));
  assert.equal(ids.size, library.referenceTopics.length, 'visible Reference topics have duplicate ids');

  for (const language of ['greek', 'hebrew']) {
    for (const section of library.referenceLandingSections(language)) {
      assert.ok(section.title?.trim(), 'landing section title is nonempty');
      assert.ok(section.entries.length > 0, `${section.title} contains entries`);
      for (const entry of section.entries) {
        assert.ok(library.getReferenceTopic(entry.id), `${entry.id} resolves from landing navigation`);
      }
    }
    const firstSearch = library.searchReferenceTopics('paradigm', language).map(t => t.id);
    const secondSearch = library.searchReferenceTopics('paradigm', language).map(t => t.id);
    assert.deepEqual(firstSearch, secondSearch, `${language} Reference Search is deterministic`);
    assert.deepEqual(
      library.searchReferenceTopics('', language).map(t => t.language),
      library.searchReferenceTopics('', language).map(() => language),
      `${language} empty Reference Search stays language scoped`
    );
  }

  for (const [alias, target] of Object.entries(library.oldTopicAliases)) {
    assert.equal(library.canonicalTopicId(alias), target);
    assert.ok(library.getReferenceTopic(alias), `${alias} alias resolves calmly`);
  }

  for (const topic of library.searchReferenceTopics('λύω', 'greek')) assert.ok(ids.has(topic.id));
  for (const topic of library.searchReferenceTopics('כתב', 'hebrew')) assert.ok(ids.has(topic.id));
});

test('v1.3.1 Reference sections and anchors are nonempty and unique within each topic', () => {
  for (const topic of library.referenceTopics) {
    assert.ok(topic.title.trim(), `${topic.id} title`);
    assert.ok(topic.summary.trim(), `${topic.id} summary`);
    assert.match(topic.language, /^(greek|hebrew)$/);
    assert.doesNotMatch(visibleText(topic), INTERNAL, `${topic.id} exposes internal process language`);

    const slugs = [];
    for (const [index, section] of topicSections(topic).entries()) {
      assert.ok(section.title?.trim(), `${topic.id} section ${index} has a title`);
      const slug = sectionSlug(section, index);
      assert.ok(slug, `${topic.id} section ${index} has an anchor`);
      slugs.push(slug);
    }
    if (!topic.sectionTabs?.length) assert.equal(new Set(slugs).size, slugs.length, `${topic.id} section anchors are unique`);

    for (const tab of topic.sectionTabs || []) {
      const tabSlugs = (tab.sections || []).map((section, index) => sectionSlug(section, index));
      assert.equal(new Set(tabSlugs).size, tabSlugs.length, `${topic.id}:${tab.id} section anchors are unique within the tab`);
      const anchors = new Set(tabSlugs);
      for (const chip of tab.jumpChips || []) assert.ok(anchors.has(chip.target), `${topic.id}:${tab.id} jump chip ${chip.target} is reachable`);
    }
  }
});

test('v1.3.1 Reference charts have consistent rows, supported labels, and language-appropriate form cells', () => {
  for (const topic of library.referenceTopics) {
    for (const chart of topicCharts(topic)) {
      assert.ok(chart.label?.trim(), `${topic.id} chart has label`);
      assert.ok(Array.isArray(chart.columns) && chart.columns.length > 0, `${topic.id}:${chart.label} has columns`);
      assert.ok(Array.isArray(chart.rows) && chart.rows.length > 0, `${topic.id}:${chart.label} has rows`);
      const expectedLength = chart.columns.length;
      for (const row of chart.rows) {
        assert.equal(row.length, expectedLength, `${topic.id}:${chart.label} row length matches columns`);
        assert.equal(row.some(cell => cell === undefined || cell === null), false, `${topic.id}:${chart.label} has no null/undefined cells`);
        assert.doesNotMatch(row.map(cellText).join(' '), /lorem|placeholder|xxx|\[object Object\]/i, `${topic.id}:${chart.label} has no raw placeholders`);
      }
      const firstColumn = chart.rows.map(row => cellText(row[0]));
      if (!['Root'].includes(chart.columns[0])) assert.equal(new Set(firstColumn).size, firstColumn.length, `${topic.id}:${chart.label} first-column row labels are unique`);
      if (chart.columns.includes('Person')) for (const label of firstColumn) assert.ok(PERSON_LABELS.has(label), `${topic.id}:${chart.label} supported person label ${label}`);
      if (topic.language === 'greek' && /paradigm|indicative|imperative|infinitive|participle|declension|pronoun|article|λύ|λόγ|καλ/i.test(chart.label)) {
        assert.ok(chartHasScript(chart, GREEK), `${topic.id}:${chart.label} contains Greek forms`);
      }
      if (topic.language === 'hebrew' && /paradigm|perfect|imperfect|imperative|infinitive|participle|suffix|construct|כתב|pronoun/i.test(chart.label)) {
        assert.ok(chartHasScript(chart, HEBREW) || chart.rows.flat().some(cell => cellText(cell).includes('Not supplied')), `${topic.id}:${chart.label} contains Hebrew forms or explicit unsupplied cells`);
      }
    }
  }
});

test('v1.3.1 app shell and service worker keep Reference assets reachable without stale versioning', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /puritan-parser-v40-v1\.4\.1-fix2/, 'service-worker cache version is bumped for Reference changes');
  assert.match(sw, /\.\/src\/features\/grammar\/reference-data\.js/);
  assert.match(sw, /\.\/src\/features\/grammar\/index\.js/);
  assert.doesNotMatch(sw, /reference-audit\.md|reference-sources\.md/, 'docs are not app-shell assets');
});
