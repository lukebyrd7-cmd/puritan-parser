/* ---------- Learn Shell ---------- */
const LearnAreas = [
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    description: 'Build long-term vocabulary through flexible study paths.',
    children: [
      { id: 'review', title: 'Review', description: 'Eventually review words currently in Learning.' },
      { id: 'new-words', title: 'New Words', description: 'Learn new vocabulary from your selected study path.' },
      { id: 'by-frequency', title: 'By Frequency', description: 'Study vocabulary grouped by occurrence frequency.' },
      { id: 'by-book', title: 'By Book', description: 'Prepare vocabulary for individual books and chapters.' }
    ]
  },
  {
    id: 'paradigms',
    title: 'Paradigms',
    description: 'Strengthen recognition of Greek and Hebrew grammar.',
    groups: [
      {
        id: 'greek',
        title: 'Greek',
        children: [
          { id: 'greek-verbs', title: 'Verbs', emphasis: true, description: 'Greek verb recognition practice will be added in a future release.' },
          { id: 'greek-nouns', title: 'Nouns', description: 'Greek noun recognition practice will be added in a future release.' }
        ]
      },
      {
        id: 'hebrew',
        title: 'Hebrew',
        children: [
          { id: 'hebrew-verbs', title: 'Verbs', emphasis: true, description: 'Hebrew verb recognition practice will be added in a future release.' },
          { id: 'hebrew-nouns', title: 'Nouns', description: 'Hebrew noun recognition practice will be added in a future release.' }
        ]
      }
    ]
  },
  {
    id: 'reading-readiness',
    title: 'Reading Readiness',
    description: 'See how prepared you are to read books and chapters.',
    body: 'Reading Readiness will show how prepared you are to read biblical books and chapters by connecting vocabulary, grammar recognition, and Reader coverage.',
    children: [
      { id: 'old-testament', title: 'Old Testament', description: 'Old Testament readiness views will be added in a future release.' },
      { id: 'new-testament', title: 'New Testament', description: 'New Testament readiness views will be added in a future release.' }
    ]
  }
];

const learnState = { page: 'home', history: [] };

function learnArea(id){ return LearnAreas.find(area => area.id === id); }
function learnChild(area, id){
  const children = [
    ...(area?.children || []),
    ...(area?.groups || []).flatMap(group => group.children || [])
  ];
  return children.find(item => item.id === id);
}
function learnPageTitle(page = learnState.page){
  if(page === 'home') return 'Learn';
  const [areaId, childId] = page.split(':');
  const area = learnArea(areaId);
  if(!childId) return area?.title || 'Learn';
  return learnChild(area, childId)?.title || area?.title || 'Learn';
}
function setLearnPage(page, options = {}){
  const next = page || 'home';
  if(!options.skipHistory && learnState.page !== next) learnState.history.push(learnState.page);
  learnState.page = next;
  renderLearn();
}
function backLearnPage(){
  const previous = learnState.history.pop();
  if(previous){
    learnState.page = previous;
    renderLearn();
    return;
  }
  if(typeof showView === 'function') showView('listView');
  else renderLearn();
}
function learnCard(item, page, extraClass = ''){
  return `
    <button class="learn-card ${extraClass}" type="button" data-learn-page="${escHtml(page)}">
      <span class="learn-card-title">${escHtml(item.title)}</span>
      <span class="learn-card-description">${escHtml(item.description || '')}</span>
    </button>`;
}
function renderLearnHeader(title, subtitle = '', headingId = 'learnPageTitle'){
  return `
    <header class="learn-header">
      <button class="btn btn-ghost btn-sm" id="learnBackBtn" type="button">← Back</button>
      <div>
        <h1 id="${escHtml(headingId)}">${escHtml(title)}</h1>
        ${subtitle ? `<p>${escHtml(subtitle)}</p>` : ''}
      </div>
    </header>`;
}
function renderLearnHome(){
  return `
    <section class="panel learn-panel" aria-labelledby="learnTitle">
      ${renderLearnHeader('Learn', 'Choose a study area.', 'learnTitle')}
      <div class="learn-card-grid">
        ${LearnAreas.map(area => learnCard(area, area.id)).join('')}
      </div>
    </section>`;
}
function renderVocabularyPage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnVocabularyTitle">
      ${renderLearnHeader(area.title, area.description, 'learnVocabularyTitle')}
      <div class="learn-card-grid">
        ${area.children.map(item => learnCard(item, `${area.id}:${item.id}`)).join('')}
      </div>
    </section>`;
}
function renderParadigmsPage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnParadigmsTitle">
      ${renderLearnHeader(area.title, area.description, 'learnParadigmsTitle')}
      <div class="learn-language-grid">
        ${area.groups.map(group => `
          <section class="learn-language-group" aria-labelledby="learn-${escHtml(group.id)}">
            <h2 id="learn-${escHtml(group.id)}">${escHtml(group.title)}</h2>
            <div class="learn-card-grid learn-card-grid-compact">
              ${group.children.map(item => learnCard(item, `${area.id}:${item.id}`, item.emphasis ? 'learn-card-emphasis' : '')).join('')}
            </div>
          </section>`).join('')}
      </div>
    </section>`;
}
function renderReadingReadinessPage(area){
  return `
    <section class="panel learn-panel" aria-labelledby="learnReadinessTitle">
      ${renderLearnHeader(area.title, area.description, 'learnReadinessTitle')}
      <section class="word-page-section learn-explainer">
        <h2>Future Purpose</h2>
        <p>${escHtml(area.body)}</p>
      </section>
      <div class="learn-card-grid">
        ${area.children.map(item => learnCard(item, `${area.id}:${item.id}`)).join('')}
      </div>
    </section>`;
}
function renderLearnPlaceholder(area, item){
  return `
    <section class="panel learn-panel learn-placeholder" aria-labelledby="learnPlaceholderTitle">
      ${renderLearnHeader(item.title, area.title)}
      <section class="word-page-section">
        <h2 id="learnPlaceholderTitle">Planned Work</h2>
        <p>${escHtml(item.description)}</p>
      </section>
    </section>`;
}
function renderLearnPage(){
  const [areaId, childId] = learnState.page.split(':');
  const area = learnArea(areaId);
  if(!area) return renderLearnHome();
  if(childId) return renderLearnPlaceholder(area, learnChild(area, childId) || area);
  if(area.id === 'vocabulary') return renderVocabularyPage(area);
  if(area.id === 'paradigms') return renderParadigmsPage(area);
  if(area.id === 'reading-readiness') return renderReadingReadinessPage(area);
  return renderLearnHome();
}
function wireLearn(){
  const root = $('#learnShell'); if(!root) return;
  $$('.learn-card', root).forEach(card => card.addEventListener('click', () => setLearnPage(card.dataset.learnPage)));
  $('#learnBackBtn', root)?.addEventListener('click', backLearnPage);
}
function renderLearn(){
  const root = $('#learnShell'); if(!root) return;
  root.innerHTML = renderLearnPage();
  wireLearn();
}

if(typeof window !== 'undefined') Object.assign(window, { LearnAreas, learnState, learnArea, learnChild, learnPageTitle, setLearnPage, backLearnPage, renderLearn, renderLearnPage });
if(typeof module !== 'undefined') module.exports = { LearnAreas, learnState, learnArea, learnChild, learnPageTitle, setLearnPage, backLearnPage, renderLearnPage };
