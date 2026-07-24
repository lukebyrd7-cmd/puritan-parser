/* ---------- Progress ---------- */
const ProgressModel = (typeof ProgressService !== 'undefined')
  ? ProgressService
  : (typeof require === 'function' ? require('../../core/progress-service') : null);

const progressState = { page: 'overview', overview: null, loading: false, coreReady: false, error: '', requestId: 0 };

function invalidateProgressViewCache(){
  progressState.overview = null;
  progressState.coreReady = false;
  progressState.error = '';
  progressState.requestId += 1;
}

function setProgressPage(page = 'overview'){
  progressState.page = page === 'statistics' ? 'statistics' : 'overview';
  renderProgress();
}
function progressValue(value){
  if(value === ProgressModel?.NOT_TRACKED) return ProgressModel.NOT_TRACKED;
  if(value === null || typeof value === 'undefined' || value === '') return ProgressModel?.NOT_TRACKED || 'Not yet tracked';
  return String(value);
}
function progressAttr(value){
  return escHtml(value).replace(/"/g, '&quot;');
}
function progressMetric(label, value, description = ''){
  return `
    <div class="progress-metric">
      <dt>${escHtml(label)}</dt>
      <dd>${escHtml(progressValue(value))}</dd>
      ${description ? `<p>${escHtml(description)}</p>` : ''}
    </div>`;
}
function progressList(items = [], empty = 'Not yet tracked'){
  if(!items.length) return `<p class="progress-empty">${escHtml(empty)}</p>`;
  return `<ul class="progress-plain-list">${items.map(item => `<li>${escHtml(typeof item === 'string' ? item : item?.text || '')}</li>`).join('')}</ul>`;
}
function progressCard(label, value, details = []){
  const detailList = Array.isArray(details) ? details.filter(Boolean) : [details].filter(Boolean);
  return `
    <div class="progress-metric">
      <dt>${escHtml(label)}</dt>
      <dd>${escHtml(progressValue(value))}</dd>
      ${detailList.map(detail => `<p>${escHtml(detail)}</p>`).join('')}
    </div>`;
}
function formatReadinessItem(item = {}){
  const label = ProgressModel?.readinessLabel ? ProgressModel.readinessLabel(item) : (item.book?.name || 'Book');
  const percent = ProgressModel?.readinessPercent?.(item);
  const prefix = percent === null || typeof percent === 'undefined' ? '' : `${percent}% ready, `;
  return `${label}: ${prefix}${Number(item.remaining) || 0} ${Number(item.remaining) === 1 ? 'word' : 'words'} remaining`;
}
function renderReadinessGoalCard(label, items = [], empty = 'Not yet tracked'){
  const formatted = items.map(formatReadinessItem);
  return progressCard(label, formatted[0] || empty, formatted.slice(1));
}
function formatReadinessSummary(summary = {}){
  if(!summary || summary.ready === ProgressModel?.NOT_TRACKED || summary.total === ProgressModel?.NOT_TRACKED) return 'Not yet tracked';
  if(typeof summary.ready === 'undefined' || typeof summary.total === 'undefined') return 'Not yet tracked';
  return `${Number(summary.ready) || 0} / ${Number(summary.total) || 0}`;
}
function formatRecognitionProgress(progress = {}){
  if(!progress.totalTargets) return 'Not yet tracked';
  return `${progress.completedTargets || 0} of ${progress.totalTargets} targets practiced`;
}
function progressPercent(item = {}){
  const percent = ProgressModel?.readinessPercent?.(item);
  return percent === null || typeof percent === 'undefined' ? ProgressModel?.NOT_TRACKED || 'Not yet tracked' : `${percent}%`;
}
function languageTitle(language){
  return language === 'hebrew' ? 'Hebrew' : 'Greek';
}
function learnPageForBook(item = {}){
  const testament = item.language === 'hebrew' ? 'old-testament' : 'new-testament';
  return `reading-readiness:${testament}:${item.book?.id || ''}`;
}
function readerActionAttrs(item = {}){
  return `data-progress-reader-language="${progressAttr(item.language || 'greek')}" data-progress-reader-book="${progressAttr(item.book?.id || '')}" data-progress-reader-chapter="${progressAttr(item.chapter || item.book?.chapters?.[0] || 1)}"`;
}
function renderProgressActionButton(label, attrs, variant = 'btn-ghost'){
  return `<button class="btn ${variant} btn-sm" type="button" ${attrs}>${escHtml(label)}</button>`;
}
function renderRecommendationList(items = []){
  if(!items.length) return `<p class="progress-empty">No recommendations yet.</p>`;
  return `
    <div class="progress-action-list">
      ${items.map(item => {
        const recommendation = typeof item === 'string' ? { text: item } : item;
        const action = recommendation.view === 'reader'
          ? renderProgressActionButton(recommendation.action || 'Open Reader', readerActionAttrs({ language: recommendation.language, book: { id: recommendation.bookId, chapters: [recommendation.chapter || 1] }, chapter: recommendation.chapter || 1 }), 'btn-primary')
          : recommendation.learnPage
            ? renderProgressActionButton(recommendation.action || 'Open Learn', `data-progress-learn-page="${progressAttr(recommendation.learnPage)}"`, 'btn-primary')
            : '';
        return `
          <article class="progress-action-row">
            <p>${escHtml(recommendation.text || '')}</p>
            ${action}
          </article>`;
      }).join('')}
    </div>`;
}
function renderReaderGrowthSummary(data = {}){
  const vocab = data.vocabulary || {};
  const greek = vocab.byLanguage?.greek || {};
  const hebrew = vocab.byLanguage?.hebrew || {};
  const greekCoverage = typeof greek.coveragePercent === 'number' ? `About ${greek.coveragePercent}% GNT vocabulary coverage by frequency.` : '';
  const hebrewCoverage = typeof hebrew.coveragePercent === 'number' ? `About ${hebrew.coveragePercent}% Hebrew Bible vocabulary coverage by frequency.` : '';
  const closest = (data.readiness?.closestBooks || []).slice(0, 3).map(item => ProgressModel?.readinessLabel?.(item) || item.book?.name).filter(Boolean);
  const closestText = closest.length ? closest.join(', ') : 'Readiness will appear after book data loads.';
  return `
    <section class="progress-section progress-summary" aria-labelledby="progressReaderGrowthTitle">
      <h2 id="progressReaderGrowthTitle">Reader Growth Summary</h2>
      <dl class="progress-metrics progress-summary-metrics">
        ${progressMetric('Known Greek Words', greek.known || 0, greekCoverage)}
        ${progressMetric('Known Hebrew Words', hebrew.known || 0, hebrewCoverage)}
        ${progressMetric('Closest to Readiness', closestText)}
        ${progressMetric('Reviews Ready', vocab.dueToday || 0, 'Review count is shown quietly; reading independence is the goal.')}
      </dl>
    </section>`;
}
function renderReadinessCard(item = {}){
  const remaining = Number(item.remaining) || 0;
  const known = Number(item.known) || 0;
  const total = Number(item.total) || 0;
  const highValue = (item.frequency || []).find(row => row.threshold !== 'all' && Number(row.remaining) > 0);
  return `
    <article class="progress-readiness-card">
      <div>
        <h3>${escHtml(ProgressModel?.readinessLabel?.(item) || item.book?.name || 'Book')}</h3>
        <p>${escHtml(languageTitle(item.language))}</p>
      </div>
      <dl class="progress-mini-metrics">
        <div><dt>Readiness</dt><dd>${escHtml(progressPercent(item))}</dd></div>
        <div><dt>Known Words</dt><dd>${escHtml(`${known} of ${total}`)}</dd></div>
        <div><dt>Unknown High-Value Words</dt><dd>${escHtml(highValue ? String(highValue.remaining) : String(remaining))}</dd></div>
      </dl>
      <div class="progress-actions">
        ${renderProgressActionButton('Open Reading Path', `data-progress-learn-page="${progressAttr(learnPageForBook(item))}"`, 'btn-primary')}
        ${renderProgressActionButton('Practice Unknown Words', `data-progress-learn-page="${progressAttr(`${learnPageForBook(item)}:overall:all`)}"`)}
        ${renderProgressActionButton('Read Book', readerActionAttrs(item))}
      </div>
    </article>`;
}
function renderReadingReadiness(readiness = {}, loading = false){
  if(loading) return `<section class="progress-section" aria-labelledby="progressReadinessTitle"><h2 id="progressReadinessTitle">Reading Readiness</h2><p class="progress-empty" role="status">Calculating book and chapter readiness…</p></section>`;
  const books = readiness.closestBooks || [];
  return `
    <section class="progress-section" aria-labelledby="progressReadinessTitle">
      <h2 id="progressReadinessTitle">Reading Readiness</h2>
      ${books.length ? `<div class="progress-readiness-list">${books.map(renderReadinessCard).join('')}</div>` : `<p class="progress-empty">No readiness data yet. Open a Reading Readiness book from Learn when you are ready to prepare a passage.</p>`}
    </section>`;
}
function renderVocabularyGrowth(vocab = {}){
  const languageMetrics = language => {
    const stats = vocab.byLanguage?.[language] || {};
    return `
      <section class="progress-subsection">
        <h3>${escHtml(languageTitle(language))}</h3>
        <dl class="progress-metrics">
          ${progressMetric('Known', stats.known || 0)}
          ${progressMetric('Known by Self-Report', stats.knownBySelfReport || 0)}
          ${progressMetric('Learning', stats.learning || 0)}
          ${progressMetric('Reviewing', stats.reviewing || 0)}
          ${progressMetric('Not Learned', stats.notLearned || 0)}
          ${progressMetric('Due Today', stats.dueToday || 0)}
        </dl>
      </section>`;
  };
  return `
    <section class="progress-section" aria-labelledby="progressVocabularyTitle">
      <h2 id="progressVocabularyTitle">Vocabulary Growth</h2>
      <div class="progress-grid">${languageMetrics('greek')}${languageMetrics('hebrew')}</div>
    </section>`;
}
function renderGrammarGrowth(grammar = {}, recognition = {}){
  const topics = Array.isArray(grammar.topics) ? grammar.topics : [];
  return `
    <section class="progress-section" aria-labelledby="progressGrammarTitle">
      <h2 id="progressGrammarTitle">Grammar Growth</h2>
      ${topics.length ? `
        <div class="progress-topic-list">
          ${topics.slice(0, 8).map(topic => `
            <article class="progress-topic-row">
              <div>
                <h3>${escHtml(topic.title)}</h3>
                <p>${escHtml(languageTitle(topic.language))}${topic.accuracy === null ? '' : `, ${topic.accuracy}% recognition`}</p>
              </div>
              <strong>${escHtml(topic.state)}</strong>
            </article>`).join('')}
        </div>` : `<p class="progress-empty">Grammar mastery tracking will appear after paradigm recognition practice. Nothing is marked mastered until practice data exists.</p>`}
      <dl class="progress-metrics">
        ${progressMetric('Paradigm Sessions Completed', recognition.sessionsCompleted || 0)}
        ${progressMetric('Greek Recognition Progress', formatRecognitionProgress(recognition.greek))}
        ${progressMetric('Hebrew Recognition Progress', formatRecognitionProgress(recognition.hebrew))}
      </dl>
    </section>`;
}
function renderReadingHistory(stats = ProgressModel?.statistics?.()){
  return `
    <section class="progress-section" aria-labelledby="progressHistoryTitle">
      <h2 id="progressHistoryTitle">Reading History</h2>
      <dl class="progress-metrics">
        ${progressMetric('Chapters Opened', stats?.reader?.chaptersOpened, 'Tracked only when Reader activity is available in this session.')}
        ${progressMetric('Word Taps Per Chapter', stats?.reader?.wordLookups, 'Future Reader event tracking can show whether chapters need fewer helps over time.')}
        ${progressMetric('Reading Sessions', stats?.reader?.readingSessions)}
      </dl>
    </section>`;
}
function renderDetailedAnalytics(data = {}, stats = ProgressModel?.statistics?.()){
  const readiness = data.readiness || {};
  const vocab = data.vocabulary || {};
  return `
    <section class="progress-section" aria-labelledby="progressAnalyticsTitle">
      <h2 id="progressAnalyticsTitle">Detailed Analytics</h2>
      <div class="progress-grid">
        <dl class="progress-metrics">
          ${progressCard('Old Testament Books Ready', formatReadinessSummary(readiness.oldTestament?.books), [`Chapters Ready: ${formatReadinessSummary(readiness.oldTestament?.chapters)}`])}
          ${progressCard('New Testament Books Ready', formatReadinessSummary(readiness.newTestament?.books), [`Chapters Ready: ${formatReadinessSummary(readiness.newTestament?.chapters)}`])}
        </dl>
        <dl class="progress-metrics">
          ${progressMetric('Vocabulary Reviews Completed', stats?.vocabulary?.reviewsCompleted)}
          ${progressMetric('Correct Recognitions', stats?.vocabulary?.correctRecognitions)}
          ${progressMetric('Missed Recognitions', stats?.vocabulary?.missedRecognitions)}
          ${progressMetric('Known Vocabulary Total', (vocab.known || 0) + (vocab.knownBySelfReport || 0))}
        </dl>
      </div>
    </section>`;
}
async function loadProgressOverview(){
  if(!ProgressModel || progressState.loading || progressState.overview) return;
  const requestId = ++progressState.requestId;
  progressState.loading = true;
  progressState.coreReady = false;
  progressState.error = '';
  renderProgress();
  try {
    const core = ProgressModel.overviewCore ? ProgressModel.overviewCore() : null;
    if(core){
      progressState.overview = core;
      progressState.coreReady = true;
      renderProgress();
      await new Promise(resolve => {
        if(typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
      });
    }
    const complete = await ProgressModel.overview(core ? { core } : {});
    if(requestId !== progressState.requestId) return;
    progressState.overview = complete;
  } catch(error) {
    if(requestId !== progressState.requestId) return;
    progressState.error = error.message || 'Progress is unavailable.';
  } finally {
    if(requestId !== progressState.requestId) return;
    progressState.loading = false;
    renderProgress();
  }
}
function renderProgressNav(){
  return `
    <div class="progress-tabs" role="tablist" aria-label="Progress pages">
      <button class="progress-tab ${progressState.page === 'overview' ? 'active' : ''}" type="button" data-progress-page="overview">Overview</button>
      <button class="progress-tab ${progressState.page === 'statistics' ? 'active' : ''}" type="button" data-progress-page="statistics">Statistics</button>
    </div>`;
}
function renderProgressOverview(data = progressState.overview){
  if(progressState.loading && !data) return `<section class="panel progress-panel"><h1>Progress</h1>${renderProgressNav()}<p class="progress-empty">Loading progress...</p></section>`;
  if(progressState.error) return `<section class="panel progress-panel"><h1>Progress</h1>${renderProgressNav()}<p class="progress-empty">${escHtml(progressState.error)}</p></section>`;
  if(!data) return `<section class="panel progress-panel"><h1>Progress</h1>${renderProgressNav()}<p class="progress-empty">Progress is not available yet.</p></section>`;
  const vocab = data.vocabulary || {};
  const readiness = data.readiness || {};
  const recognition = data.recognition || {};
  const grammar = data.grammar || {};
  const stats = data.statistics || ProgressModel?.statistics?.();
  const readinessLoading = progressState.loading && progressState.coreReady && !data.readiness;
  return `
    <section class="panel progress-panel" aria-labelledby="progressTitle">
      <header class="progress-header">
        <h1 id="progressTitle">Progress</h1>
        <p>How you are growing as an independent reader.</p>
      </header>
      ${renderProgressNav()}
      ${renderReaderGrowthSummary(data)}
      ${renderReadingReadiness(readiness, readinessLoading)}
      ${renderVocabularyGrowth(vocab)}
      ${renderGrammarGrowth(grammar, recognition)}
      ${renderReadingHistory(stats)}
      ${readinessLoading ? '' : renderDetailedAnalytics(data, stats)}
      <section class="progress-section progress-recommendations" aria-labelledby="progressRecommendationsTitle">
        <h2 id="progressRecommendationsTitle">Recommendations</h2>
        ${renderRecommendationList(data.recommendations || [])}
      </section>
    </section>`;
}
function renderProgressStatistics(stats = ProgressModel?.statistics?.()){
  return `
    <section class="panel progress-panel progress-panel-secondary" aria-labelledby="progressStatsTitle">
      <header class="progress-header">
        <h1 id="progressStatsTitle">Progress</h1>
        <p>Lifetime statistics, where the app currently tracks them.</p>
      </header>
      ${renderProgressNav()}
      <div class="progress-grid">
        <section class="progress-section">
          <h2>Vocabulary</h2>
          <dl class="progress-metrics">
            ${progressMetric('Words learned', stats?.vocabulary?.wordsLearned)}
            ${progressMetric('Reviews completed', stats?.vocabulary?.reviewsCompleted)}
            ${progressMetric('Correct recognitions', stats?.vocabulary?.correctRecognitions)}
            ${progressMetric('Missed recognitions', stats?.vocabulary?.missedRecognitions)}
          </dl>
        </section>
        <section class="progress-section">
          <h2>Grammar</h2>
          <dl class="progress-metrics">
            ${progressMetric('Greek sessions', stats?.grammar?.greekSessions)}
            ${progressMetric('Hebrew sessions', stats?.grammar?.hebrewSessions)}
            ${progressMetric('Total paradigms practiced', stats?.grammar?.totalParadigmsPracticed)}
          </dl>
        </section>
        <section class="progress-section">
          <h2>Reader</h2>
          <dl class="progress-metrics">
            ${progressMetric('Word lookups', stats?.reader?.wordLookups)}
            ${progressMetric('Chapters opened', stats?.reader?.chaptersOpened)}
            ${progressMetric('Reading sessions', stats?.reader?.readingSessions)}
          </dl>
        </section>
        <section class="progress-section">
          <h2>Learning</h2>
          <dl class="progress-metrics">
            ${progressMetric('Total study sessions', stats?.learning?.totalStudySessions)}
          </dl>
        </section>
      </div>
    </section>`;
}
function renderProgressPage(){
  return progressState.page === 'statistics' ? renderProgressStatistics() : renderProgressOverview();
}
function wireProgress(){
  const root = $('#progressShell'); if(!root) return;
  $$('[data-progress-page]', root).forEach(button => button.addEventListener('click', () => setProgressPage(button.dataset.progressPage)));
  $$('[data-progress-learn-page]', root).forEach(button => button.addEventListener('click', () => {
    if(typeof setLearnPage === 'function') setLearnPage(button.dataset.progressLearnPage || 'home', { skipHistory: true });
    if(typeof showView === 'function') showView('learnView');
    else if(typeof navigateTo === 'function') navigateTo('/learn');
  }));
  $$('[data-progress-reader-book]', root).forEach(button => button.addEventListener('click', async () => {
    if(typeof setReaderLocation === 'function') await setReaderLocation({
      language: button.dataset.progressReaderLanguage || 'greek',
      book: button.dataset.progressReaderBook,
      chapter: Number(button.dataset.progressReaderChapter) || 1
    });
    if(typeof showView === 'function') showView('readerView');
    else if(typeof navigateTo === 'function') navigateTo('/reader');
  }));
}
function renderProgress(){
  const root = $('#progressShell'); if(!root) return;
  root.innerHTML = renderProgressPage();
  wireProgress();
  if(progressState.page === 'overview') loadProgressOverview();
}

if(typeof window !== 'undefined') Object.assign(window, { progressState, invalidateProgressViewCache, setProgressPage, renderProgress, renderProgressPage, renderProgressOverview, renderProgressStatistics });
if(typeof module !== 'undefined') module.exports = { progressState, invalidateProgressViewCache, setProgressPage, renderProgressPage, renderProgressOverview, renderProgressStatistics, progressMetric, progressList, progressCard, renderReadinessGoalCard, formatReadinessSummary, renderReaderGrowthSummary, renderReadingReadiness, renderVocabularyGrowth, renderGrammarGrowth, renderReadingHistory, renderDetailedAnalytics, renderRecommendationList };
