const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const library = require('../src/features/grammar/reference-data');
const settings = require('../src/features/settings');

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
      const identityColumns = chart.columns.includes('Base noun') ? 4 : 3;
      const rowLabels = chart.columns.includes('Gender') && chart.columns.includes('Number') ? chart.rows.map(row => row.slice(0,identityColumns).map(cellText).join('|')) : firstColumn;
      if (!['Root'].includes(chart.columns[0])) assert.equal(new Set(rowLabels).size, rowLabels.length, `${topic.id}:${chart.label} row labels are unique`);
      if (chart.columns.includes('Person')) for (const label of firstColumn) assert.ok(PERSON_LABELS.has(label), `${topic.id}:${chart.label} supported person label ${label}`);
      if (topic.language === 'greek' && /paradigm|indicative|imperative|infinitive|participle|declension|pronoun|article|λύ|λόγ|καλ/i.test(chart.label)) {
        assert.ok(chartHasScript(chart, GREEK), `${topic.id}:${chart.label} contains Greek forms`);
      }
      if (topic.language === 'hebrew' && /paradigm|perfect|imperfect|imperative|infinitive|participle|suffix|construct|כתב|קטל|pronoun/i.test(chart.label)) {
        assert.ok(chartHasScript(chart, HEBREW) || chart.rows.flat().some(cell => cellText(cell).includes('Not supplied')), `${topic.id}:${chart.label} contains Hebrew forms or explicit unsupplied cells`);
      }
    }
  }
});

test('v1.3.1 app shell and service worker keep Reference assets reachable without stale versioning', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /v114-\$\{APP_VERSION\}/, 'service-worker cache version is bumped for SRS runtime reliability follow-up');
  assert.match(fs.readFileSync('index.html', 'utf8'), /src\/main\.js\?v=v1\.9\.6-srs-runtime-reliability/, 'startup query string is bumped with the cache');
  assert.match(sw, /'src\/features\/grammar\/handbook-data\.js'/);
  assert.match(sw, /'src\/features\/grammar\/reference-data\.js'/);
  assert.match(sw, /'src\/features\/grammar\/index\.js'/);
  assert.doesNotMatch(sw, /reference-audit\.md|reference-sources\.md/, 'docs are not app-shell assets');
});

test('v1.3.3 registers the sourced Greek core indicative chart set with stable unique ids', () => {
  const charts = library.greekCoreIndicativeCharts;
  const ids = charts.map(chart => chart.id);
  const required = [
    'greek-present-active-indicative-lyo',
    'greek-present-middle-passive-indicative-lyo',
    'greek-imperfect-active-indicative-lyo',
    'greek-imperfect-middle-passive-indicative-lyo',
    'greek-future-active-indicative-lyo',
    'greek-future-middle-indicative-lyo',
    'greek-future-passive-indicative-lyo',
    'greek-first-aorist-active-indicative-lyo',
    'greek-first-aorist-middle-indicative-lyo',
    'greek-second-aorist-active-indicative-leipo',
    'greek-second-aorist-middle-indicative-leipo',
    'greek-aorist-passive-indicative-lyo',
    'greek-perfect-active-indicative-lyo',
    'greek-perfect-middle-passive-indicative-lyo',
    'greek-pluperfect-active-indicative-lyo',
    'greek-present-indicative-eimi',
    'greek-imperfect-indicative-eimi',
    'greek-future-indicative-eimi',
    'greek-principal-parts-lyo',
    'greek-principal-parts-leipo-second-aorist'
  ];

  assert.deepEqual(new Set(ids).size, ids.length, 'core chart identifiers are unique');
  for (const id of required) assert.ok(ids.includes(id), `${id} is registered`);
});

test('v1.3.3 core indicative charts carry complete rows, representative lemmas, and printed-page sources', () => {
  const charts = library.greekCoreIndicativeCharts;
  const finite = charts.filter(chart => chart.label.includes('Indicative'));
  for (const chart of finite) {
    assert.deepEqual(chart.rows.map(row => row[0]), ['1st','2nd','3rd'], `${chart.id} has ordered person rows`);
    assert.ok(chart.rows.every(row => row[1] && row[2]), `${chart.id} has singular and plural forms`);
    assert.match(chart.lemma, /^(λύω|λείπω|εἰμί)$/);
    assert.equal(chart.source.author, 'J. Gresham Machen');
    assert.equal(chart.source.edition, '1923 first edition');
    assert.match(chart.source.scan, /page-image scan/);
    assert.match(String(chart.source.printedPages), /\d/);
  }

  const secondAorist = charts.find(chart => chart.id === 'greek-second-aorist-active-indicative-leipo');
  assert.equal(secondAorist.lemma, 'λείπω');
  assert.equal(secondAorist.principalPart, 'ἔλιπον');
  assert.equal(secondAorist.rows[0][1], 'ἔλιπον');

  const passive = charts.find(chart => chart.id === 'greek-aorist-passive-indicative-lyo');
  assert.equal(passive.principalPart, 'ἐλύθην');
  assert.match(passive.note, /sixth principal part/i);
});

test('v1.3.3 preserves sourced alternates, NFC Greek, and honest pluperfect scope', () => {
  const charts = library.greekCoreIndicativeCharts;
  const forms = charts.flatMap(chart => chart.rows.flat().slice(1)).filter(value => GREEK.test(String(value)));
  for (const form of forms) assert.equal(form, form.normalize('NFC'), `${form} is NFC-normalized`);

  const perfect = charts.find(chart => chart.id === 'greek-perfect-active-indicative-lyo');
  assert.equal(perfect.rows[2][2], 'λελύκασι(ν) / λέλυκαν');
  const pluperfect = charts.find(chart => chart.id === 'greek-pluperfect-active-indicative-lyo');
  assert.deepEqual(pluperfect.rows.map(row => row[2]), ['ἐλελύκειμεν','ἐλελύκειτε','ἐλελύκεισαν']);
  assert.match(pluperfect.note, /\(ἐ\)-/);
  assert.equal(charts.some(chart => /Pluperfect Middle|Pluperfect Passive/.test(chart.label)), false);
  assert.equal(charts.some(chart => /Second Aorist Passive/.test(chart.label)), false);
});

test('v1.3.3 εἰμί indicatives and Paradigm Charts navigation remain focused', () => {
  const eimi = library.greekCoreIndicativeCharts.filter(chart => chart.lemma === 'εἰμί');
  assert.deepEqual(eimi.map(chart => chart.id), [
    'greek-present-indicative-eimi',
    'greek-imperfect-indicative-eimi',
    'greek-future-indicative-eimi'
  ]);
  assert.deepEqual(eimi[0].rows[2].slice(1), ['ἐστί(ν)','εἰσί(ν)']);

  const paradigms = library.getReferenceTopic('greek-paradigm-charts');
  const verbSections = paradigms.sectionTabs.find(tab => tab.id === 'verbs').sections.map(section => section.title);
  for (const title of ['Present','Imperfect','Future','Aorist','Perfect','Pluperfect','εἰμί']) assert.ok(verbSections.includes(title));
  assert.deepEqual(library.referenceLandingSections('greek').map(section => section.title), ['Reference']);
  assert.deepEqual(library.referenceLandingSections('greek')[0].entries.map(entry => entry.label), ['Paradigm Charts','Grammar Handbook']);
  assert.equal(library.greekCoreIndicativeCharts.some(chart => /Subjunctive|Imperative|Infinitive|Participle/.test(chart.label)), false, 'v1.3.4 material is absent from the core registry');
});

test('v1.3.3 About & Sources centralizes the complete Machen source map', () => {
  const html = settings.renderGreekReferenceSources(library);
  assert.match(html, /J\. Gresham Machen/);
  assert.match(html, /New Testament Greek for Beginners/);
  assert.match(html, /New York: The Macmillan Company, 1923/);
  assert.match(html, /1923 first edition/);
  assert.match(html, /CCEL digital facsimile v0\.1/);
  for (const pages of new Set(library.greekCoreIndicativeCharts.map(chart => String(chart.source.printedPages)))) {
    assert.ok(html.includes(pages), `printed pages ${pages} remain visible centrally`);
  }
  assert.match(html, /λείπω \/ ἔλιπον/);
  assert.match(html, /pluperfect middle\/passive is honestly omitted/i);
  assert.match(html, /movable/i);
  assert.match(html, /λέλυκαν/);
  assert.match(html, /initial augment is optional/i);
});

test('v1.3.3 paradigm charts keep source metadata but render only a centralized source-notes link', () => {
  const ui = fs.readFileSync('src/features/grammar/index.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  for (const chart of library.greekCoreIndicativeCharts) assert.ok(chart.source?.printedPages, `${chart.id} keeps its source connection`);
  assert.match(ui, /View source notes/);
  assert.match(ui, /source\.language === 'hebrew'/);
  assert.match(ui, /href="\/settings\/sources#\$\{target\}"/);
  assert.match(ui, /data-source-notes-target="\$\{target\}"/);
  assert.doesNotMatch(ui, /reference-source-note|Verified against the CCEL page image/);
  assert.match(html, /id="openAboutSourcesBtn"/);
  assert.match(html, /id="aboutSourcesView"/);
  assert.match(html, /id="aboutSourcesShell"/);
});

test('v1.3.4 registers unique source-backed Greek additional paradigm charts', () => {
  const charts = library.greekAdditionalParadigmCharts;
  const ids = charts.map(chart => chart.id);
  assert.ok(charts.length >= 70, 'the three-phase milestone has substantial focused coverage');
  assert.equal(new Set(ids).size, ids.length, 'v1.3.4 chart ids are unique');
  for (const chart of charts) {
    assert.match(chart.id, /^greek-/);
    assert.equal(chart.milestone, 'v1.3.4');
    assert.equal(chart.source?.author, 'J. Gresham Machen');
    assert.equal(chart.source?.edition, '1923 first edition');
    assert.match(String(chart.source?.printedPages), /\d/);
    assert.ok(chart.source?.sections, `${chart.id} records a section or table location`);
    for (const value of chart.rows.flat()) {
      if (typeof value === 'string' && GREEK.test(value)) assert.equal(value, value.normalize('NFC'), `${chart.id}: ${value} is NFC`);
    }
  }
});

test('v1.3.4 phase A covers regular omega non-indicatives with appropriate structures', () => {
  const charts = library.greekAdditionalParadigmCharts;
  const ids = new Set(charts.map(chart => chart.id));
  [
    'greek-present-active-subjunctive-lyo',
    'greek-present-middle-passive-subjunctive-lyo',
    'greek-aorist-active-subjunctive-lyo',
    'greek-aorist-middle-subjunctive-lyo',
    'greek-aorist-passive-subjunctive-lyo',
    'greek-present-active-imperative-lyo',
    'greek-present-middle-passive-imperative-lyo',
    'greek-aorist-active-imperative-lyo',
    'greek-aorist-middle-imperative-lyo',
    'greek-aorist-passive-imperative-lyo',
    'greek-infinitive-system-index-lyo',
    'greek-present-active-participle-lyo',
    'greek-aorist-passive-participle-lyo',
    'greek-perfect-active-participle-lyo',
    'greek-perfect-middle-passive-participle-lyo'
  ].forEach(id => assert.ok(ids.has(id), `${id} is registered`));

  for (const chart of charts.filter(item => item.id.includes('-imperative-'))) {
    assert.deepEqual(chart.rows.map(row => row[0]), ['2nd', '3rd'], `${chart.id} contains only second and third persons`);
  }
  for (const chart of charts.filter(item => item.id.includes('-participle-lyo') && item.columns.includes('Case'))) {
    assert.deepEqual(chart.columns, ['Case','Masculine','Feminine','Neuter']);
    assert.ok(chart.rows.some(row => row[0] === 'Gen sg'), `${chart.id} supplies oblique singular recognition`);
    assert.ok(chart.rows.some(row => row[0] === 'Nom pl'), `${chart.id} supplies plural recognition`);
  }
  const infinitives = charts.find(chart => chart.id === 'greek-infinitive-system-index-lyo');
  assert.ok(infinitives.rows.some(row => row[0] === 'Future Active' && row[1] === 'λύσειν'));
  assert.ok(infinitives.rows.some(row => row[0] === 'Perfect Middle/Passive' && row[1] === 'λελύσθαι'));
  assert.equal(charts.some(chart => /Perfect.*Subjunctive/.test(chart.label)), false, 'unsupported perfect subjunctive is omitted');
});

test('v1.3.4 phase B supplies contract and major mi-verb representatives without inference', () => {
  const charts = library.greekAdditionalParadigmCharts;
  const ids = new Set(charts.map(chart => chart.id));
  ['alpha-contract','epsilon-contract','omicron-contract'].forEach(type => assert.ok(charts.some(chart => chart.id.includes(type)), `${type} is represented`));
  ['δίδωμι','τίθημι','ἵστημι'].forEach(lemma => assert.ok(charts.some(chart => chart.lemma === lemma), `${lemma} is represented`));
  assert.ok(ids.has('greek-didomi-aorist-active-indicative'));
  assert.ok(ids.has('greek-tithemi-aorist-middle-indicative'));
  const histemi = charts.find(chart => chart.id === 'greek-histemi-second-aorist-active-indicative');
  assert.deepEqual(histemi.rows[0].slice(1), ['ἔστην','ἔστημεν']);
  assert.match(histemi.note, /intransitive/i);
  assert.equal(charts.some(chart => chart.lemma === 'δείκνυμι'), false, 'no complete δείκνυμι paradigm is inferred from isolated forms');
});

test('v1.3.4 phase C supplies high-value noun, adjective, determiner, and pronoun families', () => {
  const charts = library.greekAdditionalParadigmCharts;
  const ids = new Set(charts.map(chart => chart.id));
  [
    'greek-first-declension-feminine-hora-graphe',
    'greek-first-declension-masculine-prophetes-mathetes',
    'greek-second-declension-masculine-logos',
    'greek-second-declension-neuter-doron',
    'greek-third-declension-guttural-nyx-sarx',
    'greek-third-declension-nasal-archon',
    'greek-third-declension-dental-elpis',
    'greek-third-declension-s-stem-genos',
    'greek-irregular-nouns-pater-aner',
    'greek-adjective-first-second-agathos',
    'greek-adjective-third-declension-alethes',
    'greek-adjective-comparative-meizon',
    'greek-pronouns-personal-autos-singular',
    'greek-pronoun-demonstrative-houtos',
    'greek-pronoun-relative-hos',
    'greek-pronouns-interrogative-indefinite-singular',
    'greek-determiner-pas',
    'greek-pronouns-reflexive-reciprocal'
  ].forEach(id => assert.ok(ids.has(id), `${id} is registered`));

  const paradigms = library.getReferenceTopic('greek-paradigm-charts');
  assert.deepEqual(paradigms.sectionTabs.map(tab => tab.label), ['Verb Paradigms','Noun Declensions','Participles','Infinitives','Adjectives','Pronouns']);
  assert.ok(paradigms.sectionTabs.find(tab => tab.id === 'verbs').sections.some(section => section.title === 'Contract Verbs'));
  assert.ok(paradigms.sectionTabs.find(tab => tab.id === 'verbs').sections.some(section => section.title === 'μι Verbs'));
});

test('v1.3.4 About & Sources covers new metadata while chart flow stays citation-free', () => {
  const sourceHtml = settings.renderGreekReferenceSources(library);
  for (const pages of new Set(library.greekAdditionalParadigmCharts.map(chart => String(chart.source.printedPages)))) {
    assert.ok(sourceHtml.includes(pages), `About & Sources includes printed pages ${pages}`);
  }
  assert.match(sourceHtml, /perfect subjunctive/i);
  assert.match(sourceHtml, /δείκνυμι/);
  const ui = fs.readFileSync('src/features/grammar/index.js', 'utf8');
  assert.match(ui, /'greek-reference-sources'/);
  assert.doesNotMatch(ui, /New Testament Greek for Beginners|The Macmillan Company, 1923/);
});

test('v1.3.4 remains isolated from Hebrew data and v1.3.7 keeps unsupported future-perfect content omitted', () => {
  const additional = library.greekAdditionalParadigmCharts;
  assert.equal(additional.some(chart => chart.rows.flat().some(value => HEBREW.test(cellText(value)))), false);
  assert.equal(library.handbookArticles.some(article => /Future Perfect/.test(article.title)), false);
  assert.doesNotMatch(library.handbookArticles.flatMap(article=>article.overview||[]).join(' '), /v1\.3\.4|source map|page-image/i);
});

test('v1.3.5 registers the seven source-backed Hebrew strong stems with stable ids', () => {
  const charts = library.hebrewStrongVerbCharts;
  const ids = charts.map(chart => chart.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...new Set(charts.map(chart => chart.stemId))].sort(), ['hiphil','hitpael','hophal','niphal','piel','pual','qal']);
  for(const chart of charts){
    assert.match(chart.id, /^hebrew-strong-(qal|niphal|piel|pual|hiphil|hophal|hitpael)-[a-z-]+$/);
    assert.equal(chart.milestone, 'v1.3.5');
    assert.equal(chart.language, 'hebrew');
    assert.equal(chart.representativeRoot, 'קטל');
    assert.equal(chart.rootDescription, 'model strong root');
  }
});

test('v1.3.5 form coverage follows Paradigm B and enforces honest passive-stem omissions', () => {
  const categories = stem => library.hebrewStrongVerbCharts.filter(chart => chart.stemId === stem).map(chart => chart.formCategory).sort();
  assert.deepEqual(categories('qal'), ['imperative','imperfect','infinitive-absolute','infinitive-construct','participle','perfect','wayyiqtol']);
  assert.deepEqual(categories('niphal'), ['imperative','imperfect','infinitive-absolute','infinitive-construct','participle','perfect']);
  assert.deepEqual(categories('piel'), ['imperative','imperfect','infinitive-absolute','infinitive-construct','participle','perfect']);
  assert.deepEqual(categories('pual'), ['imperfect','infinitive-absolute','participle','perfect']);
  assert.deepEqual(categories('hiphil'), ['imperative','imperfect','infinitive-absolute','infinitive-construct','participle','perfect','shortened-imperfect','wayyiqtol']);
  assert.deepEqual(categories('hophal'), ['imperfect','infinitive-absolute','participle','perfect']);
  assert.deepEqual(categories('hitpael'), ['imperative','imperfect','infinitive-absolute','infinitive-construct','participle','perfect']);
});

test('v1.3.5 finite and non-finite Hebrew rows carry valid grammatical structure', () => {
  const validPerson = new Set(['1st','2nd','3rd']);
  const validGender = new Set(['masculine','feminine','common']);
  const validNumber = new Set(['singular','plural']);
  for(const chart of library.hebrewStrongVerbCharts){
    if(['perfect','imperfect','wayyiqtol'].includes(chart.formCategory)){
      assert.deepEqual(chart.columns, ['Person','Gender','Number','Hebrew form']);
      for(const row of chart.rows){
        assert.ok(validPerson.has(row[0]));
        assert.ok(validGender.has(row[1]));
        assert.ok(validNumber.has(row[2]));
      }
    }
    if(chart.formCategory === 'imperative'){
      assert.equal(chart.rows.every(row => row[0] === '2nd'), true);
      assert.equal(chart.rows.some(row => row[0] === '1st'), false);
    }
    if(chart.formCategory === 'participle'){
      assert.deepEqual(chart.columns, ['Form','Gender','Number','State','Hebrew pattern']);
      assert.equal(chart.rows.every(row => row[1] === 'masculine' && row[2] === 'singular' && row[3] === 'absolute'), true);
    }
    if(chart.formCategory.startsWith('infinitive-')) assert.deepEqual(chart.columns, ['Form','State','Hebrew pattern']);
  }
});

test('v1.3.5 wayyiqtol remains a distinct, directly printed recognition category', () => {
  const wayyiqtol = library.hebrewStrongVerbCharts.filter(chart => chart.formCategory === 'wayyiqtol');
  assert.deepEqual(wayyiqtol.map(chart => chart.stemId), ['qal','hiphil']);
  assert.deepEqual(wayyiqtol.flatMap(chart => chart.rows.map(row => row[3])), ['וַיִּקְטֹל','וָאֶקְטֹל','וַיַּקְטֵל']);
  assert.equal(wayyiqtol.every(chart => chart.source.complete === false), true);
  assert.equal(wayyiqtol.every(chart => /no complete paradigm is inferred/i.test(chart.source.limitation)), true);
  assert.equal(wayyiqtol.some(chart => chart.id.includes('imperfect') && !chart.id.includes('wayyiqtol')), false);
});

test('v1.3.5 every Hebrew chart has exact Gesenius provenance and normalized pointing', () => {
  for(const chart of library.hebrewStrongVerbCharts){
    assert.equal(chart.source.author, 'Wilhelm Gesenius');
    assert.equal(chart.source.edition, 'Second English edition, revised according to the twenty-eighth German edition of 1909');
    assert.equal(chart.source.scanId, 'geseniushebrewgr00geseuoft');
    assert.match(String(chart.source.printedPages), /\d/);
    assert.match(chart.source.sections, /§|Paradigm B/);
    assert.ok(chart.source.table);
    const HebrewCells = chart.rows.flat().flatMap(cell => cellText(cell).match(/[\u0590-\u05ff]+/g) || []);
    assert.ok(HebrewCells.length, `${chart.id} contains Hebrew`);
    for(const value of HebrewCells){
      assert.equal(value, value.normalize('NFC'), `${chart.id} Hebrew is NFC`);
      assert.match(value, /[\u05b0-\u05bc]/, `${chart.id} preserves pointing`);
    }
  }
});

test('v1.3.5 Hebrew navigation, RTL markup, and source notes stay focused', () => {
  const paradigms = library.getReferenceTopic('hebrew-paradigm-charts');
  assert.deepEqual(paradigms.sectionTabs.slice(0,2).map(tab => tab.label), ['Strong Verbs — by Stem','Strong Verbs — by Form']);
  assert.deepEqual(paradigms.sectionTabs[0].sections.map(section => section.title), ['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael']);
  assert.ok(paradigms.sectionTabs[1].sections.some(section => section.title === 'Wayyiqtol'));
  const ui = fs.readFileSync('src/features/grammar/index.js', 'utf8');
  assert.match(ui, /lang="he" dir="rtl"/);
  assert.match(ui, /hebrew-reference-sources/);
  assert.match(ui, /View source notes/);
  assert.doesNotMatch(ui, /Gesenius' Hebrew Grammar|Clarendon Press, 1910/);
});

test('v1.3.5 About & Sources centralizes coverage without expanding Greek or the Handbook', () => {
  const sourceHtml = settings.renderHebrewReferenceSources(library);
  assert.match(sourceHtml, /Wilhelm Gesenius/);
  assert.match(sourceHtml, /Clarendon Press, 1910/);
  assert.match(sourceHtml, /Paradigm B/);
  assert.match(sourceHtml, /§49/);
  assert.match(sourceHtml, /Pual and Hophal/);
  assert.equal(library.greekCoreIndicativeCharts.length, 20);
  assert.equal(library.greekAdditionalParadigmCharts.length, 73);
  assert.equal(topicCharts(library.getReferenceTopic('hebrew-grammar-handbook')).some(chart => chart.milestone === 'v1.3.5'), false);
  assert.equal(library.hebrewStrongVerbCharts.some(chart => chart.representativeRoot !== 'קטל'), false);
});

test('v1.3.6a registers every required Hebrew weak class with stable unique ids', () => {
  const charts=library.hebrewWeakVerbCharts;
  const required=['pe-nun','pe-yod-waw','hollow-ayin-waw','hollow-ayin-yod','geminate','lamed-he','initial-guttural','medial-guttural','final-guttural','doubly-weak','irregular'];
  assert.ok(charts.length >= 35, 'weak-root coverage is substantial');
  assert.equal(new Set(charts.map(chart=>chart.id)).size, charts.length);
  assert.deepEqual([...new Set(charts.map(chart=>chart.weakClassId))].sort(), required.sort());
  for(const chart of charts){
    assert.match(chart.id,/^hebrew-weak-[a-z-]+$/);
    assert.equal(chart.milestone,'v1.3.6a');
    assert.equal(chart.language,'hebrew');
    assert.ok(library.hebrewWeakClassLabels[chart.weakClassId]);
    assert.match(chart.stemId,/^(qal|niphal|piel|pual|hiphil|hophal|hitpael)$/);
    assert.ok(chart.formCategory);
  }
});

test('v1.3.6a weak representative roots and comparison metadata match their classes', () => {
  const validRoots={
    'pe-nun':new Set(['נגש','נפל']), 'pe-yod-waw':new Set(['ישב','יטב']),
    'hollow-ayin-waw':new Set(['קום']), 'hollow-ayin-yod':new Set(['שית']), geminate:new Set(['סבב']),
    'lamed-he':new Set(['גלה']), 'initial-guttural':new Set(['עמד']), 'medial-guttural':new Set(['שחט','ברך']),
    'final-guttural':new Set(['שלח']), 'doubly-weak':new Set(['נשא','היה']), irregular:new Set(['אכל'])
  };
  for(const chart of library.hebrewWeakVerbCharts){
    assert.ok(validRoots[chart.weakClassId].has(chart.representativeRoot),`${chart.id} root matches its class`);
    assert.ok(chart.affectedRadical);
    assert.ok(chart.comparison.expectedStrong);
    assert.ok(chart.comparison.attestedWeak);
    assert.ok(chart.comparison.change);
    assert.ok(chart.comparison.recognitionCue);
    assert.deepEqual(chart.columns,['Form','Strong pattern','Attested weak form','Recognition cue']);
  }
});

test('v1.3.6a weak charts retain exact Gesenius provenance and normalized pointing', () => {
  for(const chart of library.hebrewWeakVerbCharts){
    assert.equal(chart.source.author,'Wilhelm Gesenius');
    assert.equal(chart.source.edition,'Second English edition, revised according to the twenty-eighth German edition of 1909');
    assert.equal(chart.source.scanId,'geseniushebrewgr00geseuoft');
    assert.match(String(chart.source.printedPages),/\d/);
    assert.match(chart.source.sections,/§|Paradigm/);
    assert.ok(chart.source.table);
    assert.equal(typeof chart.source.complete,'boolean');
    assert.equal(typeof chart.source.alternatePointing,'string');
    const forms=chart.rows.flatMap(row=>row.slice(1,3)).flatMap(value=>String(value).match(/[\u0590-\u05ff]+/g)||[]);
    assert.ok(forms.length);
    for(const form of forms){
      assert.equal(form,form.normalize('NFC'),`${chart.id}: ${form} is NFC`);
      assert.match(form,/[\u05b0-\u05bc]/,`${chart.id}: ${form} retains pointing`);
    }
  }
  assert.ok(library.hebrewWeakVerbCharts.some(chart=>chart.rows.flat().includes('שְׁלֹחַ')),'furtive patah is retained');
  assert.ok(library.hebrewWeakVerbCharts.some(chart=>chart.rows.flat().includes('יִגַּשׁ')),'nun assimilation dagesh is retained');
  assert.ok(library.hebrewWeakVerbCharts.some(chart=>chart.rows.flat().includes('עֲמַדְתֶּם')),'reduced vowel is retained');
});

test('v1.3.6a filters weak charts by class, stem, and form without touching strong charts', () => {
  const peNun=library.filterHebrewWeakVerbCharts({weakClassId:'pe-nun'});
  assert.ok(peNun.length>0 && peNun.every(chart=>chart.weakClassId==='pe-nun'));
  const qalImperfect=library.filterHebrewWeakVerbCharts({stemId:'qal',formCategory:'imperfect'});
  assert.ok(qalImperfect.length>0 && qalImperfect.every(chart=>chart.stemId==='qal'&&chart.formCategory==='imperfect'));
  assert.equal(library.filterHebrewWeakVerbCharts({weakClassId:'lamed-he',stemId:'hiphil',formCategory:'imperfect'}).length,1);
  assert.equal(library.hebrewStrongVerbCharts.length,41);
  assert.equal(new Set([...library.hebrewStrongVerbCharts,...library.hebrewWeakVerbCharts].map(chart=>chart.id)).size,library.hebrewStrongVerbCharts.length+library.hebrewWeakVerbCharts.length);
});

test('v1.3.6a weak navigation, RTL cells, filters, and source links remain accessible', () => {
  const paradigms=library.getReferenceTopic('hebrew-paradigm-charts');
  const weakTab=paradigms.sectionTabs.find(tab=>tab.id==='weak-verbs');
  assert.ok(weakTab?.filterableWeakCharts);
  assert.equal(weakTab.sections[0].charts.length,library.hebrewWeakVerbCharts.length);
  const ui=fs.readFileSync('src/features/grammar/index.js','utf8');
  assert.match(ui,/Filter Hebrew weak-verb charts/);
  assert.match(ui,/data-weak-filter="weakClass"/);
  assert.match(ui,/data-weak-filter="stem"/);
  assert.match(ui,/data-weak-filter="formCategory"/);
  assert.match(ui,/lang="he" dir="rtl"/);
  assert.match(ui,/View source notes/);
  assert.doesNotMatch(ui,/Clarendon Press, 1910|Gesenius' Hebrew Grammar/);
  const ids=[...fs.readFileSync('index.html','utf8').matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'static app shell has no duplicate DOM ids');
});

test('v1.3.6a About & Sources preserves weak-verb limits after the Handbook expansion', () => {
  const html=settings.renderHebrewWeakVerbSources(library);
  for(const label of Object.values(library.hebrewWeakClassLabels)) assert.match(html,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,/printed paradigms D–P/i);
  assert.match(html,/limited examples/i);
  assert.match(html,/weak-verb registry does not generate noun or suffix forms/i);
  assert.match(html,/explains weak-root recognition selectively/i);
  assert.equal(topicCharts(library.getReferenceTopic('hebrew-grammar-handbook')).some(chart=>chart.milestone==='v1.3.6a'),false);
  assert.equal(library.greekCoreIndicativeCharts.length,20);
  assert.equal(library.greekAdditionalParadigmCharts.length,73);
  assert.equal(library.hebrewWeakVerbCharts.some(chart=>/suffix/i.test(chart.formCategory)),false);
  assert.equal(library.hebrewWeakVerbCharts.some(chart=>/noun|nominal/i.test(chart.label)),false);
});

test('v1.3.6a visible weak-class terminology follows the approved positional labels', () => {
  assert.deepEqual(library.hebrewWeakClassLabels, {
    'pe-nun':'I-Nun',
    'pe-yod-waw':'I-Yod',
    'hollow-ayin-waw':'Biconsonantal — Middle Waw',
    'hollow-ayin-yod':'Biconsonantal — Middle Yod',
    geminate:'Geminate',
    'lamed-he':'III-He',
    'initial-guttural':'I-Guttural',
    'medial-guttural':'II-Guttural',
    'final-guttural':'III-ח/ע',
    'doubly-weak':'Doubly Weak',
    irregular:'Irregular'
  });
  const historical=library.hebrewWeakVerbCharts.filter(chart=>chart.representativeRoot==='ישב');
  const trueYod=library.hebrewWeakVerbCharts.filter(chart=>chart.representativeRoot==='יטב');
  assert.ok(historical.length && historical.every(chart=>chart.label.includes('I-Yod — Historical I-Waw') && chart.weakClassDisplayLabel==='I-Yod — Historical I-Waw'));
  assert.ok(trueYod.length && trueYod.every(chart=>chart.label.includes('I-Yod — True I-Yod') && chart.weakClassDisplayLabel==='I-Yod — True I-Yod'));
  assert.ok(library.hebrewWeakVerbCharts.filter(chart=>chart.weakClassId==='hollow-ayin-waw').every(chart=>chart.label.includes('Biconsonantal — Middle Waw')));
  assert.ok(library.hebrewWeakVerbCharts.filter(chart=>chart.weakClassId==='hollow-ayin-yod').every(chart=>chart.label.includes('Biconsonantal — Middle Yod')));
  assert.ok(library.hebrewWeakVerbCharts.filter(chart=>chart.weakClassId==='final-guttural').every(chart=>chart.label.startsWith('III-ח/ע')));
  assert.equal(library.hebrewWeakVerbCharts.some(chart=>/^Final guttural|^III-Guttural/.test(chart.label)),false);
});

test('v1.3.6a terminology refinement preserves stable ids, Hebrew forms, and persistence boundaries', () => {
  const stableIds=library.hebrewWeakVerbCharts.map(chart=>chart.id).sort();
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(stableIds)).digest('hex'),'c49713f4a2307b7c3bed4ded9c5eb5eb6e7ab3a4e7582069100b97bdf1aef81e');
  const hebrewForms=library.hebrewWeakVerbCharts.flatMap(chart=>chart.rows.flatMap(row=>row.slice(1,3).map(String).filter(value=>HEBREW.test(value))));
  assert.equal(hebrewForms.length,286);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(hebrewForms)).digest('hex'),'17143ebb4f6cba0813b186a60ce5d2a00268d0bc2b84687fc1a03603318a35aa');
  assert.doesNotMatch(fs.readFileSync('src/core/migrations/migrations.js','utf8'),/v1\.3\.6a|weak-class|pe-yod-waw|hollow-ayin/);
  const html=settings.renderHebrewWeakVerbSources(library);
  assert.match(html,/Gary D\. Pratico and Miles V\. Van Pelt/);
  assert.match(html,/Basics of Biblical Hebrew Grammar/);
  assert.match(html,/terminology source supplies the class names only/i);
  assert.match(html,/forms remain verified against Gesenius/i);
  assert.match(html,/III-Aleph is a recognized positional class but has no source-backed v1\.3\.6a paradigm/i);
});

test('v1.3.6b registers normalized Hebrew noun and suffix chart families with stable metadata', () => {
  const charts=library.hebrewNominalAndSuffixCharts;
  assert.equal(charts.length,16);
  assert.equal(new Set(charts.map(chart=>chart.id)).size,charts.length);
  assert.deepEqual([...new Set(charts.map(chart=>chart.morphologyFamily))].sort(),[
    'construct-state','nominal-patterns','prepositional-suffixes','pronominal-suffixes','verbal-object-suffixes'
  ]);
  for(const chart of charts){
    assert.match(chart.id,/^hebrew-[a-z-]+$/);
    assert.equal(chart.milestone,'v1.3.6b');
    assert.equal(chart.language,'hebrew');
    assert.ok(chart.grammaticalCategory);
    assert.ok(chart.baseType);
    assert.ok(chart.representativeLexemes?.length);
    assert.ok(chart.comparison?.focus);
    assert.ok(chart.comparison?.cue);
  }
});

test('v1.3.6b refinement preserves every chart id, Hebrew form fragment, and source location', () => {
  const charts=library.hebrewNominalAndSuffixCharts;
  const ids=charts.map(chart=>chart.id);
  const hebrewForms=charts.flatMap(chart=>chart.rows.flatMap(row=>row.flatMap(value=>String(value).match(/[\u0590-\u05ff]+/g)||[])));
  const sources=charts.map(chart=>[chart.id,chart.source.printedPages,chart.source.sections,chart.source.table]);
  const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(ids.length,16);
  assert.equal(hash(ids),'b7ba143cddfbc5cd94e1a3cdfecfc020c5afcb484673163d9a6bcf44596ad997');
  assert.equal(hebrewForms.length,446);
  assert.equal(hash(hebrewForms),'08cbc3acfdedee45aec5f3688650ca3653c39c9076e81d2a572522f7b019a8af');
  assert.equal(hash(sources),'157c328655944725cc6b022afe78daf47ece4de3ac9f434615b534c82336b0e7');
});

test('v1.3.6b suffix rows preserve person, gender, and number without inferred gaps', () => {
  const suffixCharts=[...library.hebrewNominalSuffixCharts,...library.hebrewPrepositionalSuffixCharts];
  for(const chart of suffixCharts){
    assert.deepEqual(chart.columns.slice(0,3),['Person','Gender','Number']);
    for(const row of chart.rows){
      assert.match(row[0],/^(1st|2nd|3rd)$/);
      assert.match(row[1],/^(common|masculine|feminine)$/);
      assert.match(row[2],/^(singular|plural)$/);
      if(row[0]==='1st') assert.equal(row[1],'common');
    }
  }
  const pluralNoun=library.hebrewNominalSuffixCharts.find(chart=>chart.id==='hebrew-noun-suffix-plural-banim');
  assert.equal(pluralNoun.rows.some(row=>row[0]==='2nd'&&row[1]==='feminine'&&row[2]==='plural'),false);
  for(const id of ['hebrew-preposition-suffix-el','hebrew-preposition-suffix-al','hebrew-preposition-suffix-acharei']){
    assert.equal(library.hebrewPrepositionalSuffixCharts.find(chart=>chart.id===id).rows.some(row=>row[0]==='2nd'&&row[1]==='feminine'&&row[2]==='plural'),false);
  }
});

test('v1.3.6b retains exact Gesenius provenance, Hebrew pointing, and honest coverage limits', () => {
  for(const chart of library.hebrewNominalAndSuffixCharts){
    assert.equal(chart.source.author,'Wilhelm Gesenius');
    assert.equal(chart.source.edition,'Second English edition, revised according to the twenty-eighth German edition of 1909');
    assert.equal(chart.source.scanId,'geseniushebrewgr00geseuoft');
    assert.equal(chart.source.coverageAnchor,'hebrew-nominal-suffix-sources');
    assert.match(String(chart.source.printedPages),/\d/);
    assert.match(chart.source.sections,/§/);
    assert.ok(chart.source.table);
    assert.equal(typeof chart.source.complete,'boolean');
    assert.equal(typeof chart.source.limitation,'string');
    assert.equal(typeof chart.source.alternatePointing,'string');
    const forms=chart.rows.flatMap(row=>row.flatMap(value=>String(value).match(/[\u0590-\u05ff]+/g)||[])).filter(form=>/[\u05b0-\u05bc]/.test(form));
    assert.ok(forms.length);
    for(const form of forms){
      assert.equal(form,form.normalize('NFC'),`${chart.id}: ${form} is NFC`);
    }
  }
  assert.equal(library.hebrewVerbalObjectSuffixCharts.length,1);
  assert.equal(library.hebrewVerbalObjectSuffixCharts[0].source.complete,false);
  assert.match(library.hebrewVerbalObjectSuffixCharts[0].source.limitation,/no stem-by-person generator/i);
});

test('v1.3.6b filters chart metadata and keeps verb, Greek, Handbook, and persistence boundaries intact', () => {
  assert.ok(library.filterHebrewNominalCharts({morphologyFamily:'prepositional-suffixes'}).every(chart=>chart.morphologyFamily==='prepositional-suffixes'));
  assert.deepEqual(library.filterHebrewNominalCharts({baseType:'min-preposition'}).map(chart=>chart.id),['hebrew-preposition-suffix-min']);
  assert.ok(library.filterHebrewNominalCharts({suffixPerson:'2nd'}).every(chart=>chart.suffixPersons?.includes('2nd')));
  assert.equal(library.hebrewStrongVerbCharts.length,41);
  assert.equal(library.hebrewWeakVerbCharts.length,37);
  assert.equal(library.greekCoreIndicativeCharts.length,20);
  assert.equal(library.greekAdditionalParadigmCharts.length,73);
  assert.equal(topicCharts(library.getReferenceTopic('hebrew-grammar-handbook')).some(chart=>chart.milestone==='v1.3.6b'),false);
  assert.doesNotMatch(fs.readFileSync('src/core/migrations/migrations.js','utf8'),/v1\.3\.6b|nominal-suffix-sources/);
});

test('v1.3.6b navigation, filters, RTL rendering, and centralized source disclosure are accessible', () => {
  const paradigms=library.getReferenceTopic('hebrew-paradigm-charts');
  assert.deepEqual(paradigms.sectionTabs.map(tab=>tab.label),[
    'Strong Verbs — by Stem','Strong Verbs — by Form','Weak Verbs','Construct State','Pronominal Suffixes on Nouns','Pronominal Suffixes on Prepositions','Object Suffixes on Verbs','Segolate and Irregular Nouns'
  ]);
  assert.deepEqual(paradigms.sectionTabs.map(tab=>tab.id),[
    'strong-verb-stems','strong-verb-forms','weak-verbs','noun-construct','nominal-suffixes','prepositional-suffixes','verbal-object-suffixes','noun-patterns'
  ]);
  assert.ok(paradigms.sectionTabs.slice(3).every(tab=>tab.filterableNominalCharts));
  assert.equal(paradigms.sectionTabs[3].sections[0].title,'Construct State');
  assert.equal(paradigms.sectionTabs[7].sections[0].title,'Segolate Nouns');
  assert.equal(paradigms.sectionTabs[7].sections[1].title,'Irregular Nouns');
  assert.match(library.hebrewVerbalObjectSuffixCharts[0].label,/Limited Perfect Examples/);
  const ui=fs.readFileSync('src/features/grammar/index.js','utf8');
  assert.match(ui,/Filter Hebrew noun and suffix charts/);
  assert.match(ui,/data-nominal-filter="morphologyFamily"/);
  assert.match(ui,/data-nominal-filter="grammaticalCategory"/);
  assert.match(ui,/data-nominal-filter="baseType"/);
  assert.match(ui,/data-nominal-filter="suffixPerson"/);
  assert.match(ui,/attachNominalChartFilters\(page\)/);
  assert.match(ui,/event\.key==='Enter'\|\|event\.key===' '/);
  assert.match(ui,/class="hebrew-text" lang="he" dir="rtl"/);
  assert.match(ui,/Chart family/);
  assert.match(ui,/Form pattern/);
  assert.match(ui,/Base form/);
  assert.doesNotMatch(ui,/Clarendon Press, 1910|Gesenius' Hebrew Grammar/);
  assert.doesNotMatch(ui,/style="[^"]*font-family/i);
  const css=fs.readFileSync('styles.css','utf8');
  assert.match(css,/\.hebrew-text\s*\{[^}]*font-family:\s*var\(--font-serif\)/s);
  assert.match(css,/\.reference-chart-filters\s*\{[^}]*font-family:\s*inherit/s);
  assert.match(css,/\.reference-tab\s*\{[^}]*font-family:\s*inherit/s);
  const html=settings.renderHebrewNominalSuffixSources(library);
  assert.match(html,/Gesenius-Kautzsch-Cowley 1910/);
  assert.match(html,/Gary D\. Pratico and Miles V\. Van Pelt/);
  assert.match(html,/guide the modern classroom terminology, grouping, and presentation order/i);
  assert.match(html,/not claimed as the transcription source/i);
  assert.match(html,/User-facing labels may therefore differ from the source's technical headings/i);
  assert.match(html,/complete for the named rows/);
  assert.match(html,/limited to the named examples/);
  assert.match(html,/No complete[\s\S]*בְּ[\s\S]*כְּ[\s\S]*לִפְנֵי/);
  assert.match(fs.readFileSync('src/features/settings/index.js','utf8'),/id="hebrew-nominal-suffix-sources"/);
});
