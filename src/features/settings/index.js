/* ---------- SETTINGS SYNC ---------- */
function syncSettingsUI(){
  const p = state.prefs;
  const sv = (id,v)=>{ const el=$(id); if(el) el.value=v; };
  const sc = (id,v)=>{ const el=$(id); if(el) el.checked=v; };
  sv('#srsPreset', p.srsPreset || inferSrsPreset(p));
  if(typeof learnReviewTargets === 'function'){
    const targets = learnReviewTargets();
    ['greek','hebrew'].forEach(language => {
      sv(`#${language}ReviewTargetPreset`, targets[language]?.preset || 'standard');
      sv(`#${language}ReviewTargetCustom`, targets[language]?.dailyTarget || 30);
    });
  }
  if(typeof learnPracticeSrsPreference === 'function') sv('#practiceSrsPreference', learnPracticeSrsPreference());
  sv('#fontSizeSlider', p.cardFontSize||54);
  sc('#showPosHint', !!p.showPosHint);
  sc('#autoNextCard', !!p.autoNextCard);
  const readerMode = typeof PuritanReaderPreferences !== 'undefined' ? PuritanReaderPreferences.readMode() : 'continuous';
  sc('#readerReadingModeContinuous', readerMode === 'continuous');
  sc('#readerReadingModeChapter', readerMode === 'chapter');
  const hebrewDisplay = typeof PuritanReaderPreferences !== 'undefined' ? PuritanReaderPreferences.readHebrewDisplay() : 'standard';
  sc('#readerHebrewDisplayStandard', hebrewDisplay === 'standard');
  sc('#readerHebrewDisplayInterlinear', hebrewDisplay === 'interlinear');
  const customAccent = $('#customAccent');
  if(customAccent && /^#[0-9a-f]{6}$/i.test(p.accent || '')) customAccent.value = p.accent;
  $('#fontSizeLabel').textContent = (p.cardFontSize||54)+'px';
  applyTheme(p.theme||'light');
  renderAccentButtons();
}
const SRS_PRESETS = {
  gentle: { initialEase: 2.6, minEase: 1.4, dailyCap: 100, newPerDay: 10, useSM2: true },
  balanced: { initialEase: 2.5, minEase: 1.3, dailyCap: 200, newPerDay: 20, useSM2: true },
  intensive: { initialEase: 2.4, minEase: 1.3, dailyCap: 300, newPerDay: 30, useSM2: true }
};
function inferSrsPreset(prefs = {}){
  if(SRS_PRESETS[prefs.srsPreset]) return prefs.srsPreset;
  const score = preset => Math.abs((Number(prefs.dailyCap) || 200) - SRS_PRESETS[preset].dailyCap) + Math.abs((Number(prefs.newPerDay) || 20) - SRS_PRESETS[preset].newPerDay) * 5;
  return Object.keys(SRS_PRESETS).sort((a, b) => score(a) - score(b))[0];
}
function applySrsPreset(preset){
  const name = SRS_PRESETS[preset] ? preset : 'balanced';
  Object.assign(state.prefs, SRS_PRESETS[name], { srsPreset: name, studyMode: 'lemma' });
  savePrefs();
  return state.prefs;
}

function escapeAboutSourcesHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function renderAboutSourcesText(value){
  return String(value ?? '').split(/([\u0590-\u05ff]+)/g).map(part=>/[\u0590-\u05ff]/.test(part)?`<span class="hebrew-text" lang="he" dir="rtl">${escapeAboutSourcesHtml(part)}</span>`:escapeAboutSourcesHtml(part)).join('');
}
function renderGrammarHandbookSources(referenceLibrary){
  const sources=referenceLibrary?.handbookSources||{};
  const articles=referenceLibrary?.handbookArticles||[];
  if(!articles.length) return '<p>Grammar Handbook source notes are unavailable in this installation.</p>';
  const sourceOrder=['merkle-beginning-2020','merkle-going-2016','merkle-gems-2019','machen-1923','pratico-van-pelt-2019','gesenius-1910','puritan-parser-editorial'];
  const bibliography=sourceOrder.map(id=>sources[id]?`<li data-handbook-source-id="${escapeAboutSourcesHtml(id)}"><cite>${escapeAboutSourcesHtml(sources[id].authors)}, <em>${escapeAboutSourcesHtml(sources[id].title)}</em> (${escapeAboutSourcesHtml(sources[id].publication)}).</cite><br><span>${escapeAboutSourcesHtml(sources[id].edition)}. ${escapeAboutSourcesHtml(sources[id].note)}</span>${sources[id].scan?`<br><span>${escapeAboutSourcesHtml(sources[id].scan)}</span>`:''}</li>`:'').join('');
  const articleMap=language=>articles.filter(article=>article.language===language).map(article=>{
    const entries=(article.sources||[]).map(entry=>{ const source=sources[entry.sourceId]; return `<li><strong>${escapeAboutSourcesHtml(source?.kind||entry.support)}</strong> · ${escapeAboutSourcesHtml(source?.authors||entry.sourceId)}<br><span>${escapeAboutSourcesHtml((entry.locations||[]).join('; '))}</span><br><span>Scope: ${escapeAboutSourcesHtml(entry.scope)}. Support: ${escapeAboutSourcesHtml(entry.support)}.</span></li>`; }).join('');
    const charts=(article.relatedChartIds||[]).join(', ')||'No direct chart mapping';
    return `<details class="about-sources-article-map" data-handbook-article-source="${escapeAboutSourcesHtml(article.id)}"><summary>${escapeAboutSourcesHtml(article.title)}</summary><p><code>${escapeAboutSourcesHtml(article.id)}</code> · Related charts: ${escapeAboutSourcesHtml(charts)}</p><ul>${entries}</ul></details>`;
  }).join('');
  return `<p>The Handbook is selective and reading-oriented. Greek organization and visible terminology broadly follow Merkle and his coauthors; Hebrew organization and visible terminology broadly follow Pratico and Van Pelt. Those organization sources are not presented as the row source for forms or as the source of every sentence.</p>
    <p>Machen supports foundational Greek morphology and explanations. Gesenius remains the row-level source for the existing Hebrew forms and supports the cited Hebrew descriptions. App-authored workflows and recognition cues are editorial syntheses rather than quotations from one textbook. Debated topics are summarized cautiously, and exhaustive syntax taxonomies are deliberately omitted.</p>
    <h3>Bibliography and source roles</h3><ul class="about-sources-coverage">${bibliography}</ul>
    <h3>Greek article source map</h3>${articleMap('greek')}
    <h3>Hebrew article source map</h3>${articleMap('hebrew')}`;
}
function greekSourceCoverage(referenceLibrary){
  const groups = new Map();
  const charts = [...(referenceLibrary?.greekCoreIndicativeCharts || []), ...(referenceLibrary?.greekAdditionalParadigmCharts || [])];
  for(const chart of charts){
    if(!chart.source) continue;
    const key = `${chart.source.printedPages}|${chart.source.sections || ''}`;
    if(!groups.has(key)) groups.set(key, { source: chart.source, charts: [] });
    groups.get(key).charts.push(chart);
  }
  return Array.from(groups.values());
}
function renderGreekReferenceSources(referenceLibrary){
  const charts = [...(referenceLibrary?.greekCoreIndicativeCharts || []), ...(referenceLibrary?.greekAdditionalParadigmCharts || [])];
  const source = charts.find(chart => chart.source)?.source;
  if(!source) return '<p>Detailed Greek Reference bibliography is not yet available in this installation.</p>';
  const chartById = id => charts.find(chart => chart.id === id);
  const coverage = greekSourceCoverage(referenceLibrary).map(group => {
    const pages = String(group.source.printedPages).includes('–') || String(group.source.printedPages).includes(',') ? 'pp.' : 'p.';
    const paradigms = group.charts.map(chart => `${chart.label} (${chart.lemma}${chart.principalPart ? ` / ${chart.principalPart}` : ''})`).join('; ');
    return `<li><strong>Printed ${pages} ${escapeAboutSourcesHtml(group.source.printedPages)}</strong>${group.source.sections ? ` · ${escapeAboutSourcesHtml(group.source.sections)}` : ''}<br><span>${escapeAboutSourcesHtml(paradigms)}</span></li>`;
  }).join('');
  const methodologyIds = [
    'greek-present-active-indicative-lyo',
    'greek-perfect-active-indicative-lyo',
    'greek-pluperfect-active-indicative-lyo',
    'greek-second-aorist-active-indicative-leipo',
    'greek-aorist-passive-indicative-lyo'
  ];
  const methodology = methodologyIds.map(id => chartById(id)?.note).filter(Boolean).map(note => `<li>${escapeAboutSourcesHtml(note)}</li>`).join('');
  return `<p><cite>${escapeAboutSourcesHtml(source.author)}, <em>${escapeAboutSourcesHtml(source.title)}</em> (${escapeAboutSourcesHtml(source.publication)}).</cite></p>
    <dl class="about-sources-details">
      <div><dt>Edition</dt><dd>${escapeAboutSourcesHtml(source.edition)}</dd></div>
      <div><dt>Scan used</dt><dd><a href="${escapeAboutSourcesHtml(source.scanUrl)}" target="_blank" rel="noopener noreferrer">${escapeAboutSourcesHtml(source.scan)}</a></dd></div>
    </dl>
    <p>Every included Greek form was verified against the printed page image rather than accepted from the electronic transcription.</p>
    <h3>Printed-page coverage</h3>
    <ul class="about-sources-coverage">${coverage}</ul>
    <h3>Conventions and limitations</h3>
    <ul>${methodology}</ul>
    <p>The pluperfect middle/passive is honestly omitted because Machen does not directly supply a complete paradigm. The perfect subjunctive is likewise omitted because Machen calls it too rare to learn and does not supply a complete chart. The second aorist uses Machen’s representative <span lang="grc">λείπω / ἔλιπον</span>, not an inferred <span lang="grc">λύω</span> paradigm. The present-system chart for <span lang="grc">δείκνυμι</span>, a distinct second-declension feminine noun chart, and a complete superlative chart remain deferred rather than inferred from isolated forms.</p>`;
}
function hebrewSourceCoverage(referenceLibrary){
  const groups = new Map();
  for(const chart of referenceLibrary?.hebrewStrongVerbCharts || []){
    if(!chart.source) continue;
    const key = `${chart.source.printedPages}|${chart.source.sections}`;
    if(!groups.has(key)) groups.set(key, { source:chart.source, charts:[] });
    groups.get(key).charts.push(chart);
  }
  return Array.from(groups.values());
}
function renderHebrewReferenceSources(referenceLibrary){
  const charts = referenceLibrary?.hebrewStrongVerbCharts || [];
  const source = charts[0]?.source;
  if(!source) return '<p>Detailed Hebrew strong-verb bibliography is not yet available in this installation.</p>';
  const coverage = hebrewSourceCoverage(referenceLibrary).map(group => {
    const pageLabel = String(group.source.printedPages).includes('–') ? 'pp.' : 'p.';
    const chartLabels = group.charts.map(chart => `${chart.label}${chart.source.complete ? '' : ' (limited)'}`).join('; ');
    return `<li><strong>Printed ${pageLabel} ${escapeAboutSourcesHtml(group.source.printedPages)}</strong> · ${escapeAboutSourcesHtml(group.source.sections)}<br><span>${escapeAboutSourcesHtml(chartLabels)}</span></li>`;
  }).join('');
  return `<p><cite>${escapeAboutSourcesHtml(source.author)}, <em>${escapeAboutSourcesHtml(source.title)}</em>, edited and enlarged by ${escapeAboutSourcesHtml(source.editor)}, translated and revised by ${escapeAboutSourcesHtml(source.translator)} (${escapeAboutSourcesHtml(source.publication)}).</cite></p>
    <dl class="about-sources-details">
      <div><dt>Edition</dt><dd>${escapeAboutSourcesHtml(source.edition)}</dd></div>
      <div><dt>Scan used</dt><dd><a href="${escapeAboutSourcesHtml(source.scanUrl)}" target="_blank" rel="noopener noreferrer">${escapeAboutSourcesHtml(source.scan)} (${escapeAboutSourcesHtml(source.scanId)})</a></dd></div>
      <div><dt>Representative root</dt><dd><span class="hebrew-text" lang="he" dir="rtl">קטל</span> — model strong root, not an ordinary vocabulary lemma</dd></div>
    </dl>
    <p>Every included pointed form was checked against the printed page image. OCR was used only to locate candidate pages.</p>
    <h3>Printed-page coverage</h3>
    <ul class="about-sources-coverage">${coverage}</ul>
    <h3>Conventions and limitations</h3>
    <ul>
      <li>The app uses Niphal, Piel, Pual, Hiphil, Hophal, and Hitpael where Gesenius prints Niphʿal, Piʿel, Puʿal, Hiphʿil, Hophʿal, and Hithpaʿel.</li>
      <li>Wayyiqtol is the app’s label for Gesenius’ “imperfect with wāw consecutive.” Only the Qal and Hiphil row-level forms directly printed in §49 are included.</li>
      <li>Paradigm B marks the Pual and Hophal infinitive construct and imperative as “wanting”; these charts are omitted rather than completed by analogy.</li>
      <li>Participles are limited to the masculine-singular recognition anchors printed in Paradigm B. Full participial declensions are not inferred.</li>
      <li>This strong-root registry remains separate from the weak-root charts below. No suffix expansion or Grammar Handbook syntax expansion is included.</li>
    </ul>`;
}
function hebrewWeakSourceCoverage(referenceLibrary){
  const groups = new Map();
  for(const chart of referenceLibrary?.hebrewWeakVerbCharts || []){
    if(!chart.source) continue;
    const key = `${chart.weakClassId}|${chart.source.printedPages}|${chart.source.sections}`;
    if(!groups.has(key)) groups.set(key, { weakClassId:chart.weakClassId, weakClassLabel:chart.weakClassDisplayLabel||chart.weakClassLabel, source:chart.source, roots:new Set(), stems:new Set(), forms:new Set(), charts:[] });
    const group=groups.get(key);
    group.roots.add(chart.representativeRoot);
    group.stems.add(chart.stemId);
    group.forms.add(chart.formCategory);
    group.charts.push(chart);
  }
  return Array.from(groups.values());
}
function renderHebrewWeakVerbSources(referenceLibrary){
  const charts=referenceLibrary?.hebrewWeakVerbCharts||[];
  const source=charts[0]?.source;
  if(!source) return '<p>Detailed Hebrew weak-verb bibliography is not yet available in this installation.</p>';
  const coverage=hebrewWeakSourceCoverage(referenceLibrary).map(group=>{
    const pageLabel=String(group.source.printedPages).includes('–')?'pp.':'p.';
    const roots=[...group.roots].map(root=>`<span class="hebrew-text" lang="he" dir="rtl">${escapeAboutSourcesHtml(root)}</span>`).join(', ');
    return `<li><strong>${escapeAboutSourcesHtml(group.weakClassLabel)}</strong> · Printed ${pageLabel} ${escapeAboutSourcesHtml(group.source.printedPages)} · ${escapeAboutSourcesHtml(group.source.sections)}<br><span>Representative root${group.roots.size===1?'':'s'}: ${roots}; stems: ${escapeAboutSourcesHtml([...group.stems].join(', '))}; forms: ${escapeAboutSourcesHtml([...group.forms].join(', '))}${group.source.complete?'':' (limited examples)'}</span></li>`;
  }).join('');
  return `<p>The weak-verb charts use the same Gesenius-Kautzsch-Cowley edition and page-image scan recorded above. Printed paradigms D–P and the corresponding discussions in §§62–78 were checked directly; OCR was used only to locate candidate rows.</p>
    <p><strong>Display terminology.</strong> Weak-class labels follow the positional classification commonly used by Gary D. Pratico and Miles V. Van Pelt, <cite>Basics of Biblical Hebrew Grammar</cite>, 3rd ed. (Zondervan Academic, 2019). This terminology source supplies the class names only; the Hebrew forms remain verified against Gesenius. Historical and morphological subtypes remain visible where they aid recognition.</p>
    <h4>Class, root, stem, and form coverage</h4>
    <ul class="about-sources-coverage">${coverage}</ul>
    <h4>Conventions and honest omissions</h4>
    <ul>
      <li>Starred and bracketed alternatives in Gesenius are not silently reconciled. The charts use the directly printed main forms; alternate pointing is recorded in chart metadata and narrowed notes.</li>
      <li>The I-Yod family distinguishes historical I-Waw <span class="hebrew-text" lang="he" dir="rtl">ישב</span> from true I-Yod <span class="hebrew-text" lang="he" dir="rtl">יטב</span>.</li>
      <li>Biconsonantal Middle Waw and Middle Yod subtypes remain distinct.</li>
      <li>Biconsonantal Middle Yod, Doubly Weak, and Irregular coverage is limited to directly printed examples. It is not presented as a complete productive paradigm.</li>
      <li>III-Aleph is a recognized positional class but has no source-backed v1.3.6a paradigm and is not presented as implemented coverage.</li>
      <li>The weak-verb registry does not generate noun or suffix forms. The separate v1.3.6b noun-and-suffix registry below remains independently sourced.</li>
      <li>The Grammar Handbook explains weak-root recognition selectively; the charts remain the source for displayed forms.</li>
    </ul>`;
}
function hebrewNominalSourceCoverage(referenceLibrary){
  const groups=new Map();
  for(const chart of referenceLibrary?.hebrewNominalAndSuffixCharts||[]){
    if(!chart.source) continue;
    const key=`${chart.morphologyFamily}|${chart.source.printedPages}|${chart.source.sections}|${chart.source.table}`;
    if(!groups.has(key)) groups.set(key,{ source:chart.source, morphologyFamily:chart.morphologyFamily, charts:[] });
    groups.get(key).charts.push(chart);
  }
  return Array.from(groups.values());
}
function renderHebrewNominalSuffixSources(referenceLibrary){
  const charts=referenceLibrary?.hebrewNominalAndSuffixCharts||[];
  const source=charts[0]?.source;
  if(!source) return '<p>Detailed Hebrew noun-and-suffix bibliography is not yet available in this installation.</p>';
  const coverage=hebrewNominalSourceCoverage(referenceLibrary).map(group=>{
    const pageLabel=String(group.source.printedPages).includes('–')||String(group.source.printedPages).includes(',')?'pp.':'p.';
    const familyLabel=referenceLibrary?.hebrewNominalClassroomLabels?.[group.morphologyFamily]||group.morphologyFamily;
    const labels=group.charts.map(chart=>`${renderAboutSourcesText(chart.label)}${chart.source.complete?'':' (limited)'}`).join('; ');
    const representatives=[...new Set(group.charts.flatMap(chart=>chart.representativeLexemes||[]))].join(', ');
    return `<li><strong>${escapeAboutSourcesHtml(familyLabel)}</strong> · Printed ${pageLabel} ${escapeAboutSourcesHtml(group.source.printedPages)} · ${escapeAboutSourcesHtml(group.source.sections)}<br><span>${labels}</span>${representatives?`<br><span>Representatives: <span class="hebrew-text" lang="he" dir="rtl">${escapeAboutSourcesHtml(representatives)}</span></span>`:''}<br><span>Table: ${escapeAboutSourcesHtml(group.source.table)}. Coverage: ${group.source.complete?'complete for the named rows':'limited to the named examples'}.</span>${group.source.limitation?`<br><span>Limit: ${escapeAboutSourcesHtml(group.source.limitation)}</span>`:''}</li>`;
  }).join('');
  return `<p>Gesenius-Kautzsch-Cowley 1910 supplies the row-level forms for the construct-state, pronominal-suffix, prepositional-suffix, limited verbal-object-suffix, segolate, reducible-vowel, and irregular-noun charts. Every displayed Hebrew form was checked against the printed image; OCR was used only for location.</p>
    <p>Gary D. Pratico and Miles V. Van Pelt, <cite>Basics of Biblical Hebrew Grammar</cite>, 3rd ed. (2019), guide the modern classroom terminology, grouping, and presentation order where practical; they are not claimed as the transcription source for these rows. Gesenius terminology remains in source notes where it is historically or technically useful. User-facing labels may therefore differ from the source's technical headings.</p>
    <p>Coverage labels distinguish complete paradigms for the named rows from limited examples. Neither label implies a productive generator or exhaustive account of the noun class.</p>
    <h4>Chart and printed-page coverage</h4>
    <ul class="about-sources-coverage">${coverage}</ul>
    <h4>Conventions and honest omissions</h4>
    <ul>
      <li>First-person suffixes are common gender. Second- and third-person rows preserve person, gender, and number separately.</li>
      <li>Construct and suffixed stems are shown only for the named representative nouns; the charts are not productive noun generators.</li>
      <li>The plural <span class="hebrew-text" lang="he" dir="rtl">בָּנִים</span> and selected spatial-preposition tables omit 2fp because the approved table does not print it.</li>
      <li>No complete <span class="hebrew-text" lang="he" dir="rtl">בְּ</span>, <span class="hebrew-text" lang="he" dir="rtl">כְּ</span>, or <span class="hebrew-text" lang="he" dir="rtl">לִפְנֵי</span> suffix system is inferred from neighboring patterns.</li>
      <li>Verbal object suffixes are limited to five directly printed perfect examples. They do not alter or generate the strong- or weak-verb registries.</li>
      <li>Segolate and peculiar-noun labels are recognition descriptions, not claims of an exhaustive historical or lexical classification.</li>
      <li>The Grammar Handbook now explains these patterns selectively. Learn drill behavior remains unchanged.</li>
    </ul>`;
}
function renderAboutSources(){
  const shell = typeof $ === 'function' ? $('#aboutSourcesShell') : null;
  if(!shell) return '';
  const referenceLibrary = typeof PuritanReferenceLibrary !== 'undefined' ? PuritanReferenceLibrary : null;
  shell.innerHTML = `<article class="about-sources-page">
    <div class="about-sources-header"><div><h1 class="panel-title">About &amp; Sources</h1><div class="panel-sub">Project purpose, sources, and scholarly limits</div></div><button class="btn btn-ghost btn-sm" id="aboutSourcesBackBtn" type="button">← Settings</button></div>
    <section id="about-the-puritan-parser"><h2>About The Puritan Parser</h2><p>The Puritan Parser is a local-first reading and learning tool designed to help students become increasingly independent readers of biblical Greek and Hebrew.</p></section>
    <section id="grammar-handbook-sources"><h2>Grammar Handbook Sources</h2>${renderGrammarHandbookSources(referenceLibrary)}</section>
    <section id="greek-reference-sources"><h2>Greek Reference Sources</h2>${renderGreekReferenceSources(referenceLibrary)}</section>
    <section id="hebrew-reference-sources"><h2>Hebrew Reference Sources</h2><h3>Strong verbs</h3>${renderHebrewReferenceSources(referenceLibrary)}<h3>Weak verbs</h3>${renderHebrewWeakVerbSources(referenceLibrary)}<div id="hebrew-nominal-suffix-sources"><h3>Nouns and suffixes</h3>${renderHebrewNominalSuffixSources(referenceLibrary)}</div></section>
    <section id="hebrew-search-methodology"><h2>Hebrew Search and Interlinear</h2><p>Hebrew lexical search accepts pointed or unpointed Hebrew and simplified Latin spellings as a search aid. The internal convention derives a practical consonant-and-vowel form from the existing Hebrew string, then accepts restrained aliases such as ch/kh, ts/tz, and cautious q/k variants. Case, ordinary punctuation and spacing, cantillation, and optional Latin diacritics are normalized.</p><p>This is not a complete pronunciation or scholarly transliteration system. Several Latin spellings may represent the same Hebrew consonants, and exact Hebrew remains the most precise input. Transliteration is not displayed in the Reader.</p><p>Hebrew Interlinear aligns the existing OSHB/WLC Reader tokens with the MACULA Hebrew Linguistic Datasets at commit <code>47db250bd55d0d8577f2a94fba114ef16c35b23c</code>, retrieved 24 July 2026. The English line uses MACULA’s Cherith occurrence-level word or morpheme glosses. These are concise contextual aids, not a smooth translation, and they can be awkward or unavailable. Attached analyzed units are retained in source order and joined for one compact display line; no gloss is inferred from English verse order or from a dictionary entry.</p><p>The importer uses MACULA <code>xml:id</code>, <code>ref</code>, <code>class</code>, <code>text</code>, <code>after</code>, <code>english</code>, <code>morph</code>, and <code>lemma</code>. It collapses only gloss whitespace, groups same-reference morphemes in source order, and derives an unpointed search/audit form without altering displayed Hebrew. STEPBible Hebrew data was reviewed only as a secondary check on schema, qere policy, and licensing; no STEPBible field is distributed here.</p><p>The alignment preserves the Reader’s pointed surface, lemma expression, morphology, qere/ketiv distinction, maqqef, punctuation relationship, and stable canonical token position. Qere and ketiv remain separate Reader tokens; a ketiv is never given the qere gloss. Missing glosses display an em dash. Hebrew Interlinear is optional under Settings → Reader, applies only to Hebrew Original text, and leaves Standard Hebrew unchanged. Full provenance, field transformations, license text, source hashes, and the corpus audit are stored with <code>data/hebrew-interlinear</code> and documented in <code>docs/hebrew-search-interlinear-audit.md</code>.</p></section>
    <section id="text-translation-sources"><h2>Text and Translation Sources</h2><p>Greek Reader data is generated from MorphGNT’s SBLGNT Edition. Hebrew Reader data comes from Open Scriptures Hebrew Bible morphology and the Westminster Leningrad Codex text. Built-in English translations are the Open English Bible and the World English Bible.</p></section>
    <section id="data-licensing"><h2>Data and Licensing</h2><p>MorphGNT morphology and lemmatization are provided under CC BY-SA; the SBLGNT text remains subject to its EULA. Open Scriptures Hebrew morphology and the MACULA Hebrew Linguistic Datasets, including incorporated Cherith occurrence glosses, are identified as CC BY 4.0; the Westminster Leningrad Codex text is unrestricted/public-domain text. The Open English Bible is CC0, and the World English Bible is public domain.</p><p>Required attribution: MACULA Hebrew Linguistic Datasets, available at <a href="https://github.com/Clear-Bible/macula-hebrew/" target="_blank" rel="noopener">github.com/Clear-Bible/macula-hebrew</a>. Puritan Parser transforms selected source fields into chapter-scoped token records and aligns them to the existing Reader stream; it does not alter the source Hebrew or claim the glosses as a continuous translation.</p></section>
    <section id="methodology-limitations"><h2>Methodology and Limitations</h2><p>Source-backed forms are shown only where the repository records adequate support. Missing paradigms and variants are omitted or described as limited rather than generated by analogy. Structural tests protect data shape and navigation, but do not replace scholarly verification.</p></section>
  </article>`;
  $('#aboutSourcesBackBtn')?.addEventListener('click', () => typeof navigateTo === 'function' ? navigateTo('/settings') : showView('settingsView'));
  const targetId = window.location.hash.slice(1);
  const positionPage = () => targetId ? document.getElementById(targetId)?.scrollIntoView({ block:'start' }) : window.scrollTo(0, 0);
  requestAnimationFrame(() => requestAnimationFrame(positionPage));
  setTimeout(positionPage, 0);
  return shell.innerHTML;
}
function openAboutSources(anchor=''){
  const target = `/settings/sources${anchor ? `#${anchor}` : ''}`;
  document.activeElement?.blur();
  if(`${window.location.pathname}${window.location.hash}` !== target) history.pushState({}, '', target);
  showView('aboutSourcesView', { skipHistory: true });
}
if(typeof window !== 'undefined') Object.assign(window, { SRS_PRESETS, inferSrsPreset, applySrsPreset, renderAboutSources, openAboutSources });
if(typeof module !== 'undefined') module.exports = { SRS_PRESETS, inferSrsPreset, applySrsPreset, renderGrammarHandbookSources, greekSourceCoverage, renderGreekReferenceSources, hebrewSourceCoverage, renderHebrewReferenceSources, hebrewWeakSourceCoverage, renderHebrewWeakVerbSources, hebrewNominalSourceCoverage, renderHebrewNominalSuffixSources };
