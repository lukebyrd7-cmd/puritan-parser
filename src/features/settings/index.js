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
function renderAboutSources(){
  const shell = typeof $ === 'function' ? $('#aboutSourcesShell') : null;
  if(!shell) return '';
  const referenceLibrary = typeof PuritanReferenceLibrary !== 'undefined' ? PuritanReferenceLibrary : null;
  shell.innerHTML = `<article class="about-sources-page">
    <div class="about-sources-header"><div><div class="panel-title">About &amp; Sources</div><div class="panel-sub">Project purpose, sources, and scholarly limits</div></div><button class="btn btn-ghost btn-sm" id="aboutSourcesBackBtn" type="button">← Settings</button></div>
    <section id="about-the-puritan-parser"><h2>About The Puritan Parser</h2><p>The Puritan Parser is a local-first reading and learning tool designed to help students become increasingly independent readers of biblical Greek and Hebrew.</p></section>
    <section id="greek-reference-sources"><h2>Greek Reference Sources</h2>${renderGreekReferenceSources(referenceLibrary)}</section>
    <section id="hebrew-reference-sources"><h2>Hebrew Reference Sources</h2><p>The current Hebrew Reference material is structurally audited, but it does not yet have complete row-level source verification. This page therefore does not present an unsupported paradigm bibliography.</p></section>
    <section id="text-translation-sources"><h2>Text and Translation Sources</h2><p>Greek Reader data is generated from MorphGNT’s SBLGNT Edition. Hebrew Reader data comes from Open Scriptures Hebrew Bible morphology and the Westminster Leningrad Codex text. Built-in English translations are the Open English Bible and the World English Bible.</p></section>
    <section id="data-licensing"><h2>Data and Licensing</h2><p>MorphGNT morphology and lemmatization are provided under CC BY-SA; the SBLGNT text remains subject to its EULA. Open Scriptures Hebrew morphology is identified as CC BY 4.0 and the Westminster Leningrad Codex text as public domain. The Open English Bible is CC0, and the World English Bible is public domain.</p></section>
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
if(typeof module !== 'undefined') module.exports = { SRS_PRESETS, inferSrsPreset, applySrsPreset, greekSourceCoverage, renderGreekReferenceSources };
