const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

const handbook = require('../src/features/grammar/handbook-data');
const library = require('../src/features/grammar/reference-data');
const settings = require('../src/features/settings/index');
const grammarSource = fs.readFileSync('src/features/grammar/index.js','utf8');

const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

function focusedCharts(language){
  const topic=library.getReferenceTopic(`${language}-paradigm-charts`);
  const unique=new Map();
  for(const tab of topic.sectionTabs||[]) for(const section of tab.sections||[]) for(const chart of section.charts||[]) if(chart.id&&!unique.has(chart.id)) unique.set(chart.id,{ id:chart.id, rows:chart.rows });
  return [...unique.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

function renderHandbook(language, articleId=''){
  const ui=grammarSource;
  const page={ innerHTML:'', classList:{ toggle(){} }, addEventListener(){} };
  const context={
    PuritanReferenceLibrary:library,
    state:{lang:language},
    document:{},
    window:{location:{search:articleId?`?article=${articleId}`:'',pathname:'/grammar'}},
    URLSearchParams,
    localStorage:{getItem:()=>null,setItem(){}},
    $:selector=>selector==='#referencePage'?page:null,
    $$:()=>[],
    debounce:fn=>fn,
    requestAnimationFrame:fn=>fn()
  };
  vm.createContext(context);
  vm.runInContext(`${ui}; renderReferenceTopic(PuritanReferenceLibrary.getReferenceTopic('${language}-grammar-handbook'));`,context);
  return page.innerHTML;
}

test('v1.3.7 registers stable unique Handbook section and article ids without orphans',()=>{
  assert.equal(handbook.sections.length,12);
  assert.equal(handbook.articles.filter(article=>article.language==='greek').length,12);
  assert.equal(handbook.articles.filter(article=>article.language==='hebrew').length,13);
  assert.equal(new Set(handbook.sections.map(section=>section.id)).size,handbook.sections.length);
  assert.equal(new Set(handbook.articles.map(article=>article.id)).size,handbook.articles.length);
  const sectionIds=new Set(handbook.sections.map(section=>section.id));
  for(const article of handbook.articles){
    assert.ok(sectionIds.has(article.sectionId),`${article.id} has a valid section`);
    assert.equal(handbook.sections.find(section=>section.id===article.sectionId).language,article.language,`${article.id} stays in its language`);
  }
  assert.equal(hash(handbook.articles.map(article=>article.id)),'743eeccf18b71bf7e72eb406052739a04004c1fa91f1041513e082fccb119865');
  assert.equal(hash(handbook.sections.map(section=>section.id)),'f28d5b7f916789bddf93be32618e8212ba5a1d398f45fb9e1f9fe449f3119541');
});

test('v1.3.7 keeps a stable pedagogical section and article order',()=>{
  assert.deepEqual(handbook.sectionsForLanguage('greek').map(section=>section.id),['greek-nouns-agreement','greek-indicative-system','greek-voice-mood','greek-nonfinite','greek-markers','greek-reading']);
  assert.deepEqual(handbook.sectionsForLanguage('hebrew').map(section=>section.id),['hebrew-nouns-construct','hebrew-suffixes-prepositions','hebrew-qal-conjugations','hebrew-derived-stems','hebrew-weak-verbs','hebrew-reading']);
  assert.deepEqual(handbook.articlesForSection('greek-nonfinite').map(article=>article.id),['greek-infinitives','greek-participles']);
  assert.deepEqual(handbook.articlesForSection('hebrew-reading').map(article=>article.id),['hebrew-clause-structure','hebrew-sequential-forms','hebrew-clause-markers','hebrew-reading-workflow']);
});

test('v1.3.7 replaces thin visible Handbook sections while preserving merged aliases',()=>{
  for(const language of ['greek','hebrew']){
    const topic=library.getReferenceTopic(`${language}-grammar-handbook`);
    assert.equal(topic.sectionTabs,undefined);
    assert.deepEqual(topic.charts,[]);
    assert.equal(topic.handbookSections.length,6);
  }
  const aliases={
    greek:{'Morphology Guide':'greek-cases-agreement','Parsing Abbreviations':'greek-cases-agreement','case uses':'greek-cases-agreement','prepositions and particles':'greek-pronouns-prepositions'},
    hebrew:{'Morphology Guide':'hebrew-nouns-adjectives','Parsing Abbreviations':'hebrew-nouns-adjectives','person gender number':'hebrew-qal-finite','particles and prepositions':'hebrew-prepositions-article'}
  };
  for(const [language,queries] of Object.entries(aliases)) for(const [query,id] of Object.entries(queries)) assert.ok(handbook.searchArticles(query,language).some(article=>article.id===id),`${query} resolves to ${id}`);
  assert.equal(handbook.articles.some(article=>/coming soon|placeholder/i.test([article.title,...article.overview].join(' '))),false);
});

test('v1.3.7 source metadata distinguishes organization, content, and app-authored guidance',()=>{
  assert.equal(handbook.sources['merkle-beginning-2020'].kind,'organization');
  assert.equal(handbook.sources['pratico-van-pelt-2019'].kind,'organization-and-terminology');
  assert.equal(handbook.sources['machen-1923'].kind,'content-and-forms');
  assert.equal(handbook.sources['gesenius-1910'].kind,'content-and-forms');
  assert.equal(handbook.sources['puritan-parser-editorial'].kind,'app-authored');
  for(const source of Object.values(handbook.sources)){
    assert.ok(source.edition);
    assert.ok(source.publication);
  }
  for(const article of handbook.articles){
    assert.ok(article.sources.some(source=>source.support==='organization'),`${article.id} has organization metadata`);
    assert.ok(article.sources.some(source=>source.support==='partial'||source.support==='synthesis'),`${article.id} has content or synthesis metadata`);
    for(const entry of article.sources){
      assert.ok(handbook.sourceForId(entry.sourceId),`${article.id} source ${entry.sourceId} resolves`);
      assert.ok(entry.locations.length&&entry.locations.every(Boolean),`${article.id} has exact source locations`);
      assert.ok(entry.scope);
    }
  }
  const hebrewLocations=articleId=>handbook.getArticle(articleId).sources.find(source=>source.sourceId==='gesenius-1910').locations;
  assert.deepEqual(hebrewLocations('hebrew-construct-forms'),['§89a–e; printed p. 247']);
  assert.deepEqual(hebrewLocations('hebrew-qal-volitives-nonfinite'),['§§45–46; printed pp. 122–125','§48; printed pp. 129–131','§50; printed p. 136','Paradigm B, printed p. 510']);
  assert.deepEqual(hebrewLocations('hebrew-clause-markers'),['§152; printed p. 478','§155; printed p. 485']);
});

test('v1.3.7 article chart and related-article links resolve through stable ids',()=>{
  for(const article of handbook.articles){
    for(const chartId of article.relatedChartIds) assert.ok(library.findReferenceChart(chartId),`${article.id} chart ${chartId} resolves`);
    for(const relatedId of article.relatedArticleIds) assert.ok(handbook.getArticle(relatedId),`${article.id} related article ${relatedId} resolves`);
  }
  assert.equal(hash(handbook.articles.map(article=>[article.id,article.relatedChartIds])),'ccdcff4b4c55df34bebb4216d89b084958c2251c40c9fac308216ef7dee63aa0');
  assert.ok(library.handbookArticlesForChart('greek-principal-parts-lyo').some(article=>article.id==='greek-principal-parts'));
  assert.ok(library.handbookArticlesForChart('hebrew-strong-qal-wayyiqtol').some(article=>article.id==='hebrew-sequential-forms'));
});

test('v1.3.7 article search covers required titles, aliases, and keywords by language',()=>{
  const expected={
    greek:{'cases':'greek-cases-agreement','principal parts':'greek-principal-parts','verbal aspect':'greek-indicative-system','deponent':'greek-voice','middle voice':'greek-voice','genitive absolute':'greek-participles','participle':'greek-participles','articular infinitive':'greek-infinitives','mi verb':'greek-principal-parts','contract verb':'greek-principal-parts'},
    hebrew:{'construct chain':'hebrew-construct-forms','construct state':'hebrew-construct-forms','object suffix':'hebrew-pronominal-suffixes','pronominal suffix':'hebrew-pronominal-suffixes','segolate':'hebrew-nouns-adjectives','wayyiqtol':'hebrew-sequential-forms','waw consecutive':'hebrew-sequential-forms','Qal':'hebrew-qal-finite','Hiphil':'hebrew-derived-stem-recognition','weak verb':'hebrew-weak-overview','I-Nun':'hebrew-weak-classes','III-He':'hebrew-weak-classes','hollow verb':'hebrew-weak-classes','geminate':'hebrew-weak-classes'}
  };
  for(const [language,queries] of Object.entries(expected)) for(const [query,id] of Object.entries(queries)) assert.ok(handbook.searchArticles(query,language).some(article=>article.id===id),`${language} search ${query}`);
  assert.equal(handbook.searchArticles('wayyiqtol','greek').length,0);
  assert.equal(handbook.searchArticles('genitive absolute','hebrew').length,0);
  assert.ok(handbook.searchArticles('', 'hebrew','hebrew-weak-verbs').every(article=>article.sectionId==='hebrew-weak-verbs'));
});

test('v1.3.7 direct article rendering uses one active article, valid headings, and source-note links',()=>{
  const greek=renderHandbook('greek','greek-participles');
  assert.match(greek,/data-handbook-article-id="greek-participles"/);
  assert.match(greek,/<h2>Grammar Handbook<\/h2>[\s\S]*<h3>Participles<\/h3>[\s\S]*<h4>Recognition cues<\/h4>/);
  assert.match(greek,/data-related-chart-id="greek-present-active-participle-lyo"/);
  assert.match(grammarSource,/chart\?\.closest\('details'\)/,'chart links reveal charts inside collapsed Reference sections');
  assert.match(greek,/href="\/settings\/sources#grammar-handbook-sources"/);
  assert.doesNotMatch(greek,/J\. Gresham Machen|Benjamin L\. Merkle|Macmillan Company|B&H Academic/);
  assert.equal((greek.match(/<article class="handbook-article"/g)||[]).length,1,'only the active article body renders');
  const ids=[...greek.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  assert.match(greek,/id="handbookSectionFilter"/);
  assert.match(greek,/id="handbookArticleSearch"/);
});

test('v1.3.7 Greek and Hebrew examples preserve Unicode and direction safeguards',()=>{
  const greekExamples=handbook.articles.filter(article=>article.language==='greek').flatMap(article=>article.examples.map(example=>[article.id,example.text]));
  const hebrewExamples=handbook.articles.filter(article=>article.language==='hebrew').flatMap(article=>article.examples.map(example=>[article.id,example.text]));
  assert.ok(greekExamples.some(([,text])=>/[ἀἁἐἑἰἱὁὑὠ]/u.test(text)),'Greek examples include breathing marks');
  assert.ok(greekExamples.every(([,text])=>text===text.normalize('NFC')));
  assert.ok(hebrewExamples.every(([,text])=>/[\u0591-\u05c7]/u.test(text)), 'Hebrew examples remain pointed');
  assert.ok(hebrewExamples.every(([,text])=>text===text.normalize('NFC')));
  assert.equal(hash(greekExamples),'fe0cdda567b69d40ddcf841793d5adc05b5bd456d2ce732cfd4457fe7358f9dc');
  assert.equal(hash(hebrewExamples),'9563b27365a124ba68f4202fe3412b2fce08702f7a2ec2122daa9edee8022399');
  const hebrew=renderHandbook('hebrew','hebrew-sequential-forms');
  assert.match(hebrew,/class="reference-example-text hebrew-text" lang="he" dir="rtl">וַיֹּאמֶר/);
  assert.match(hebrew,/lang="en" dir="ltr"/);
});

test('v1.3.7 About & Sources centralizes the complete article source map',()=>{
  const html=settings.renderGrammarHandbookSources(library);
  for(const sourceId of Object.keys(handbook.sources)) assert.match(html,new RegExp(`data-handbook-source-id="${sourceId}"`));
  for(const article of handbook.articles) assert.match(html,new RegExp(`data-handbook-article-source="${article.id}"`));
  assert.match(html,/organization sources are not presented as the row source/i);
  assert.match(html,/App-authored workflows and recognition cues are editorial syntheses/i);
  assert.match(html,/selective and reading-oriented/i);
  assert.match(fs.readFileSync('src/features/settings/index.js','utf8'),/id="grammar-handbook-sources"/);
});

test('v1.3.7 preserves every existing focused Paradigm Chart id and form',()=>{
  const greek=focusedCharts('greek');
  const hebrew=focusedCharts('hebrew');
  assert.equal(greek.length,91);
  assert.equal(hebrew.length,94);
  assert.equal(hash(greek.map(chart=>chart.id)),'6ced2a50f963ac654d15f088c2a11858dc70d3707dacbabb60a71439746dc262');
  assert.equal(hash(hebrew.map(chart=>chart.id)),'8cb52c4b38bf321698d7ca596a4ab53ef45aa9a7df1ffc68dc55c2f9a0e90519');
  assert.equal(hash(greek),'c01a5cae73402061e87f05746de20d1547c1201a561671b008d753ca92217047');
  assert.equal(hash(hebrew),'84d8a7b650e0605a8518f909ae374f4100688815a2b46c1fce7e44eb4f9eed59');
});

test('v1.5.1 Reader cleanup keeps Reader and Progress changes isolated from Learn, SRS, storage, and migrations',()=>{
  const expected={
    'src/features/reader/index.js':'cf2728b11e57ef47f19bb272d8f5f8969ede65759941de79d75dfcdbedb67f02',
    'src/features/learn/index.js':'c4b4c50106d96e8d02848d6b487b204720d160f20a04be77a5e8fada383a2cdf',
    'src/features/learn/recognition-engine.js':'8a3de2d03901a7e6cd6fa2ea32c50c6f11c3676756282af7c6d2d2980ff1e7a2',
    'src/features/progress/index.js':'7c5a23be215503d7a6dc5d2ae2ea843c814eea2698a8481be8a048a4fdb28e37',
    'src/core/progress-service.js':'0e8f2e03ccdb6e47a95d9990055a2c0788c848a6ea5dfdc335dbc40310c8f64b',
    'src/models/vocabulary-learning.js':'df8c48fea08a3e12d2a79d7230be51da98b40f419582b6efbb63984aaf528787',
    'src/core/storage/storage.js':'b15fce85bac07ea80acab1bafe1dc4c04543086e818444edb05fe5c84217b544',
    'src/core/storage/prefs-storage.js':'8db2b04460f73e253d957840d79727e51c608bbe61725484efc1f4fc5cb01d1d',
    'src/core/migrations/migrations.js':'d809fbe1879423a266d08012819487f5f9d781e0e9ebb00553277bce557b1386'
  };
  for(const [path,digest] of Object.entries(expected)) assert.equal(fileHash(path),digest,path);
  const storageText=Object.keys(expected).filter(path=>/storage|migration|vocabulary-learning/.test(path)).map(path=>fs.readFileSync(path,'utf8')).join('\n');
  for(const key of ['pp_vocab_learning','pp_study_sets','pp_reader_location','pp_reader_adaptive_settings','pp_learn_review_targets','pp_learn_practice_srs_preference','pp_recognition_history']) assert.doesNotMatch(storageText,new RegExp(`removeItem\\(['"]${key}`));
});
