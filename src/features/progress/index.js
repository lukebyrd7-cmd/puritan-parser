/* ---------- Progress ---------- */
const ProgressModel = (typeof ProgressService !== 'undefined')
  ? ProgressService
  : (typeof require === 'function' ? require('../../core/progress-service') : null);

const progressState = { page: 'overview', overview: null, loading: false, error: '' };

function setProgressPage(page = 'overview'){
  progressState.page = page === 'statistics' ? 'statistics' : 'overview';
  renderProgress();
}
function progressValue(value){
  if(value === ProgressModel?.NOT_TRACKED) return ProgressModel.NOT_TRACKED;
  if(value === null || typeof value === 'undefined' || value === '') return ProgressModel?.NOT_TRACKED || 'Not yet tracked';
  return String(value);
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
  return `<ul class="progress-plain-list">${items.map(item => `<li>${escHtml(item)}</li>`).join('')}</ul>`;
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
  return `${label}: ${Number(item.remaining) || 0} ${Number(item.remaining) === 1 ? 'word' : 'words'} remaining`;
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
async function loadProgressOverview(){
  if(!ProgressModel || progressState.loading || progressState.overview) return;
  progressState.loading = true;
  progressState.error = '';
  renderProgress();
  try {
    progressState.overview = await ProgressModel.overview();
  } catch(error) {
    progressState.error = error.message || 'Progress is unavailable.';
  } finally {
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
  return `
    <section class="panel progress-panel" aria-labelledby="progressTitle">
      <header class="progress-header">
        <h1 id="progressTitle">Progress</h1>
        <p>Where you are, what is complete, and what to study next.</p>
      </header>
      ${renderProgressNav()}
      <section class="progress-section progress-recommendations" aria-labelledby="progressRecommendationsTitle">
        <h2 id="progressRecommendationsTitle">Recommendations</h2>
        ${progressList(data.recommendations || [], 'No recommendations yet.')}
      </section>
      <div class="progress-grid">
        <section class="progress-section" aria-labelledby="progressVocabularyTitle">
          <h2 id="progressVocabularyTitle">Vocabulary</h2>
          <dl class="progress-metrics">
            ${progressMetric('Known', vocab.known || 0)}
            ${progressMetric('Learning', vocab.learning || 0)}
            ${progressMetric('Due Today', vocab.dueToday || 0)}
          </dl>
        </section>
        <section class="progress-section" aria-labelledby="progressReadinessTitle">
          <h2 id="progressReadinessTitle">Reading Readiness</h2>
          <dl class="progress-metrics">
            ${renderReadinessGoalCard('Closest Books', readiness.closestBooks || [], 'No readiness data yet.')}
            ${renderReadinessGoalCard('Closest Chapters', readiness.closestChapters || [], 'No chapter readiness data yet.')}
            ${progressCard('Old Testament', formatReadinessSummary(readiness.oldTestament?.books), [`Books Ready: ${formatReadinessSummary(readiness.oldTestament?.books)}`, `Chapters Ready: ${formatReadinessSummary(readiness.oldTestament?.chapters)}`])}
            ${progressCard('New Testament', formatReadinessSummary(readiness.newTestament?.books), [`Books Ready: ${formatReadinessSummary(readiness.newTestament?.books)}`, `Chapters Ready: ${formatReadinessSummary(readiness.newTestament?.chapters)}`])}
          </dl>
        </section>
        <section class="progress-section" aria-labelledby="progressGrammarTitle">
          <h2 id="progressGrammarTitle">Grammar</h2>
          <dl class="progress-metrics">
            ${progressMetric('Paradigm sessions completed', recognition.sessionsCompleted || 0)}
            ${progressMetric('Greek recognition progress', formatRecognitionProgress(recognition.greek))}
            ${progressMetric('Hebrew recognition progress', formatRecognitionProgress(recognition.hebrew))}
          </dl>
        </section>
      </div>
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
}
function renderProgress(){
  const root = $('#progressShell'); if(!root) return;
  root.innerHTML = renderProgressPage();
  wireProgress();
  if(progressState.page === 'overview') loadProgressOverview();
}

if(typeof window !== 'undefined') Object.assign(window, { progressState, setProgressPage, renderProgress, renderProgressPage, renderProgressOverview, renderProgressStatistics });
if(typeof module !== 'undefined') module.exports = { progressState, setProgressPage, renderProgressPage, renderProgressOverview, renderProgressStatistics, progressMetric, progressList, progressCard, renderReadinessGoalCard, formatReadinessSummary };
