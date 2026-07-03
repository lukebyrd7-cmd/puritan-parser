/* ---------- Onboarding ---------- */
const OnboardingModel = (typeof PuritanOnboarding !== 'undefined')
  ? PuritanOnboarding
  : (typeof require === 'function' ? require('../../models/onboarding') : null);
const OnboardingVocabularyModel = (typeof VocabularyLearning !== 'undefined')
  ? VocabularyLearning
  : (typeof require === 'function' ? require('../../models/vocabulary-learning') : null);

const onboardingState = {
  step: 'welcome',
  profile: OnboardingModel ? OnboardingModel.normalizeProfile() : {},
  surveyMode: 'skip',
  seedResult: {}
};

const OnboardingSteps = ['welcome', 'language', 'goal', 'survey-choice', 'proficiency', 'summary', 'start-here'];
const OnboardingGoals = [
  { id: 'read-greek', title: 'Read Greek', description: 'Begin with Greek New Testament reading and support.' },
  { id: 'read-hebrew', title: 'Read Hebrew', description: 'Begin with Hebrew Bible reading and support.' },
  { id: 'build-vocabulary', title: 'Build vocabulary', description: 'Make vocabulary review your first habit.' },
  { id: 'prepare-book', title: 'Prepare for a book', description: 'Start from a reading goal and study what helps.' },
  { id: 'maintain', title: 'Maintain what I know', description: 'Keep known material fresh without unnecessary review debt.' },
  { id: 'start-beginning', title: 'Start from the beginning', description: 'Use gentle beginner defaults.' }
];
const OnboardingLanguageOptions = [
  { id: 'greek', title: 'Greek', description: 'Greek New Testament' },
  { id: 'hebrew', title: 'Hebrew', description: 'Hebrew Bible' },
  { id: 'both', title: 'Both', description: 'Greek and Hebrew together' }
];
const OnboardingProficiencyLabels = {
  greek: {
    new: 'New to Greek',
    'alphabet-basics': 'I know the alphabet and some basics',
    'first-year': 'I have completed first-year Greek',
    'gnt-with-help': 'I can read the Greek New Testament with help',
    'comfortable-maintenance': 'I can read comfortably and want maintenance'
  },
  hebrew: {
    new: 'New to Hebrew',
    'alphabet-vowels': 'I know the alphabet and vowels',
    'first-year': 'I have completed first-year Hebrew',
    'narrative-with-help': 'I can read narrative Hebrew with help',
    'comfortable-maintenance': 'I can read comfortably and want maintenance'
  }
};
const OnboardingGrammarLabels = {
  greek: {
    'noun-cases': 'Noun cases',
    'verb-endings': 'Verb endings',
    participles: 'Participles',
    infinitives: 'Infinitives',
    subjunctives: 'Subjunctives',
    imperatives: 'Imperatives',
    'mi-verbs': 'μι verbs',
    'basic-syntax': 'Basic syntax'
  },
  hebrew: {
    'nouns-adjectives': 'Nouns and adjectives',
    'pronominal-suffixes': 'Pronominal suffixes',
    'construct-chains': 'Construct chains',
    'qal-verbs': 'Qal verbs',
    'derived-stems': 'Derived stems',
    'weak-verbs': 'Weak verbs',
    wayyiqtol: 'Wayyiqtol / waw consecutive',
    'basic-hebrew-syntax': 'Basic Hebrew syntax'
  }
};

function onboardingLanguageTitle(language){ return language === 'hebrew' ? 'Hebrew' : 'Greek'; }
function onboardingStepIndex(){ return Math.max(0, OnboardingSteps.indexOf(onboardingState.step)); }
function onboardingSelectedLanguages(){ return OnboardingModel?.profileLanguages(onboardingState.profile.selectedLanguage) || ['greek']; }
function setOnboardingStep(step){
  onboardingState.step = OnboardingSteps.includes(step) ? step : 'welcome';
  renderOnboarding();
}
function onboardingNextStep(){
  const current = onboardingStepIndex();
  setOnboardingStep(OnboardingSteps[Math.min(OnboardingSteps.length - 1, current + 1)]);
}
function onboardingPreviousStep(){
  const current = onboardingStepIndex();
  setOnboardingStep(OnboardingSteps[Math.max(0, current - 1)]);
}
function updateOnboardingProfile(patch = {}){
  if(!OnboardingModel) return;
  onboardingState.profile = OnboardingModel.normalizeProfile({
    ...onboardingState.profile,
    ...patch
  });
}
function updateOnboardingLanguageProfile(language, patch = {}){
  if(!OnboardingModel) return;
  onboardingState.profile = OnboardingModel.normalizeProfile({
    ...onboardingState.profile,
    [language]: {
      ...(onboardingState.profile[language] || {}),
      ...patch
    }
  });
}
function onboardingVocabularyEntries(language){
  const list = (typeof state !== 'undefined' && state.data?.[language]) ? state.data[language] : [];
  if(typeof getStudyEntries === 'function') return getStudyEntries(list, 'lemma');
  return list;
}
function runOnboardingSeeding(profile){
  if(!OnboardingModel || !OnboardingVocabularyModel) return {};
  const dateISO = typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0, 10);
  let store = OnboardingVocabularyModel.loadStore();
  const result = {};
  profile.languages.forEach(language => {
    const band = profile[language]?.surveyChoice === 'yes' ? profile[language]?.vocabBand : 'none';
    const seed = OnboardingModel.seedSelfReportedVocabulary(onboardingVocabularyEntries(language), store, language, band, OnboardingVocabularyModel, dateISO);
    store = seed.store;
    result[language] = { band, count: seed.count };
  });
  OnboardingVocabularyModel.saveStore(store);
  return result;
}
function completeOnboarding(){
  if(!OnboardingModel) return;
  const normalized = OnboardingModel.normalizeProfile(onboardingState.profile);
  onboardingState.seedResult = runOnboardingSeeding(normalized);
  const startHere = OnboardingModel.defaultStartHere(normalized, onboardingState.seedResult);
  const saved = OnboardingModel.saveProfile({ ...normalized, startHere });
  OnboardingModel.saveStartHere(startHere);
  OnboardingModel.setOnboardingCompleted(true);
  onboardingState.profile = saved;
  if(typeof state !== 'undefined'){
    state.lang = saved.languages[0] || state.lang || 'greek';
    if(typeof saveLastLanguage === 'function') saveLastLanguage(state.lang);
  }
  setOnboardingStep('start-here');
}
function restartOnboardingFromSettings(){
  if(!OnboardingModel) return;
  if(typeof confirm === 'function' && !confirm('Restart onboarding? Your learning data will stay intact.')) return;
  onboardingState.profile = OnboardingModel.restartOnboarding();
  onboardingState.seedResult = {};
  onboardingState.surveyMode = 'skip';
  onboardingState.step = 'welcome';
  if(typeof navigateTo === 'function') navigateTo('/onboarding');
  else if(typeof showView === 'function') showView('onboardingView');
}
function initOnboarding(){
  if(!OnboardingModel) return;
  const saved = OnboardingModel.loadProfile();
  onboardingState.profile = saved;
  onboardingState.surveyMode = saved.languages.some(language => saved[language]?.surveyChoice === 'yes') ? 'yes' : 'skip';
}
function renderOnboardingProgress(){
  const step = onboardingStepIndex() + 1;
  return `
    <div class="onboarding-progress" aria-label="Onboarding step">
      <span>Step ${escHtml(String(step))} of ${escHtml(String(OnboardingSteps.length))}</span>
      <div><span style="width:${Math.round(step / OnboardingSteps.length * 100)}%"></span></div>
    </div>`;
}
function renderOnboardingHeader(title, subtitle){
  return `
    <header class="onboarding-header">
      <p>Onboarding</p>
      <h1>${escHtml(title)}</h1>
      ${subtitle ? `<p>${escHtml(subtitle)}</p>` : ''}
    </header>`;
}
function onboardingChoiceButton(item, selected, attrs){
  return `
    <button class="onboarding-choice${selected ? ' selected' : ''}" type="button" ${attrs}>
      <span>${escHtml(item.title)}</span>
      <small>${escHtml(item.description || '')}</small>
    </button>`;
}
function renderWelcomeStep(){
  return `
    ${renderOnboardingHeader('How should I begin?', 'Set a quiet starting point for reading, learning, and review. You can change this later.')}
    <section class="onboarding-card">
      <h2>Welcome</h2>
      <p>This is not a quiz. We will use your answers to set a helpful beginning without overwhelming you.</p>
      <p>Onboarding helps you begin. Learn trains, Reader applies, Progress measures, Reference explains, and Settings controls behavior.</p>
    </section>
    <div class="onboarding-actions">
      <button class="btn btn-primary" type="button" data-onboarding-next="true">Begin</button>
      <button class="btn btn-ghost btn-sm" type="button" data-onboarding-skip="true">Skip for now</button>
    </div>`;
}
function renderLanguageStep(){
  const selected = onboardingState.profile.selectedLanguage || 'greek';
  return `
    ${renderOnboardingHeader('Choose your language', 'This shapes your recommended first steps and which survey questions appear.')}
    <section class="onboarding-card">
      <div class="onboarding-choice-grid">
        ${OnboardingLanguageOptions.map(item => onboardingChoiceButton(item, selected === item.id, `data-onboarding-language="${escHtml(item.id)}"`)).join('')}
      </div>
    </section>
    ${renderOnboardingNav()}`;
}
function renderGoalStep(){
  const selected = onboardingState.profile.goal || 'start-beginning';
  return `
    ${renderOnboardingHeader('Choose a goal', 'Keep it simple. This only helps the app suggest your first path.')}
    <section class="onboarding-card">
      <div class="onboarding-choice-grid onboarding-choice-grid-wide">
        ${OnboardingGoals.map(item => onboardingChoiceButton(item, selected === item.id, `data-onboarding-goal="${escHtml(item.id)}"`)).join('')}
      </div>
    </section>
    ${renderOnboardingNav()}`;
}
function renderSurveyChoiceStep(){
  const selected = onboardingState.surveyMode || 'skip';
  const options = [
    { id: 'yes', title: 'Yes - help me set my starting level', description: 'Answer a short trust-based survey.' },
    { id: 'no', title: 'No - start me from the beginning', description: 'Use beginner defaults.' },
    { id: 'skip', title: 'Skip for now', description: 'Use safe defaults without vocabulary seeding.' }
  ];
  return `
    ${renderOnboardingHeader('Do you already know some Greek or Hebrew?', 'This is self-reported, not a placement test.')}
    <section class="onboarding-card">
      <div class="onboarding-choice-grid">
        ${options.map(item => onboardingChoiceButton(item, selected === item.id, `data-onboarding-survey-choice="${escHtml(item.id)}"`)).join('')}
      </div>
    </section>
    ${renderOnboardingNav()}`;
}
function renderLanguageSurvey(language){
  const profile = onboardingState.profile[language] || {};
  const bands = Object.values(OnboardingModel.VOCAB_BANDS[language]);
  const grammar = OnboardingGrammarLabels[language];
  return `
    <section class="onboarding-card onboarding-survey-card">
      <h2>${escHtml(onboardingLanguageTitle(language))}</h2>
      <label>
        <span>Starting level</span>
        <select class="input" data-onboarding-proficiency="${escHtml(language)}">
          ${OnboardingModel.PROFICIENCY_LEVELS[language].map(id => `<option value="${escHtml(id)}"${profile.proficiency === id ? ' selected' : ''}>${escHtml(OnboardingProficiencyLabels[language][id])}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>Known vocabulary</span>
        <select class="input" data-onboarding-vocab-band="${escHtml(language)}">
          ${bands.map(band => `<option value="${escHtml(band.id)}"${profile.vocabBand === band.id ? ' selected' : ''}>${escHtml(band.label)}</option>`).join('')}
        </select>
      </label>
      <fieldset>
        <legend>Familiar grammar concepts</legend>
        <div class="onboarding-checkbox-grid">
          ${Object.entries(grammar).map(([id, label]) => `
            <label>
              <input type="checkbox" data-onboarding-grammar="${escHtml(language)}" value="${escHtml(id)}"${(profile.familiarGrammar || []).includes(id) ? ' checked' : ''}>
              <span>${escHtml(label)}</span>
            </label>`).join('')}
        </div>
      </fieldset>
    </section>`;
}
function renderProficiencyStep(){
  if(onboardingState.surveyMode !== 'yes'){
    onboardingSelectedLanguages().forEach(language => updateOnboardingLanguageProfile(language, { surveyChoice: onboardingState.surveyMode }));
    return `
      ${renderOnboardingHeader('Optional proficiency survey', 'We will use safe beginner defaults.')}
      <section class="onboarding-card">
        <h2>${onboardingState.surveyMode === 'no' ? 'Start from the beginning' : 'Skipped for now'}</h2>
        <p>No self-reported vocabulary will be marked known. You can restart onboarding later from Settings.</p>
      </section>
      ${renderOnboardingNav()}`;
  }
  onboardingSelectedLanguages().forEach(language => updateOnboardingLanguageProfile(language, { surveyChoice: 'yes' }));
  return `
    ${renderOnboardingHeader('Set your starting level', 'Answer separately for each selected language. You can leave vocabulary at None.')}
    ${onboardingSelectedLanguages().map(renderLanguageSurvey).join('')}
    ${renderOnboardingNav()}`;
}
function selectedGoalLabel(){
  return OnboardingGoals.find(goal => goal.id === onboardingState.profile.goal)?.title || 'Start from the beginning';
}
function vocabularyBandLabel(language){
  const band = onboardingState.profile[language]?.vocabBand || 'none';
  return OnboardingModel.VOCAB_BANDS[language]?.[band]?.label || 'None';
}
function renderSummaryStep(){
  return `
    ${renderOnboardingHeader('Recommended setup', 'Review the starting point. Nothing here deletes existing learning data.')}
    <section class="onboarding-card">
      <h2>Based on your answers</h2>
      <ul class="onboarding-summary-list">
        <li>Languages enabled: ${escHtml(onboardingSelectedLanguages().map(onboardingLanguageTitle).join(', '))}</li>
        <li>Primary goal: ${escHtml(selectedGoalLabel())}</li>
        <li>Review target: Standard, 30/day</li>
        <li>Reader assistance: Everything, adjustable in Reader Settings</li>
        <li>Translation: On</li>
        ${onboardingSelectedLanguages().map(language => `<li>Known vocabulary: ${escHtml(onboardingLanguageTitle(language))} ${escHtml(vocabularyBandLabel(language))}${onboardingState.profile[language]?.surveyChoice === 'yes' ? ' marked by self-report' : ''}</li>`).join('')}
      </ul>
    </section>
    <div class="onboarding-actions">
      <button class="btn btn-ghost btn-sm" type="button" data-onboarding-back="true">Back</button>
      <button class="btn btn-primary" type="button" data-onboarding-complete="true">Finish setup</button>
    </div>`;
}
function renderStartHereStep(){
  const startHere = onboardingState.profile.startHere?.length ? onboardingState.profile.startHere : (OnboardingModel?.loadStartHere() || []);
  return `
    ${renderOnboardingHeader("You're ready to begin.", 'Here are a few first steps that match your setup.')}
    <section class="onboarding-card">
      <h2>Recommended first steps</h2>
      <ol class="onboarding-start-list">
        ${startHere.map(item => `<li>${escHtml(item.label)}</li>`).join('')}
      </ol>
      ${Object.values(onboardingState.seedResult || {}).some(item => item?.count)
        ? `<p class="small muted">Self-reported known words were saved for maintenance without being added to today's review queue.</p>`
        : '<p class="small muted">No self-reported vocabulary was added to review.</p>'}
    </section>
    <div class="onboarding-actions">
      <button class="btn btn-primary" type="button" data-onboarding-start-action="review">Start Review</button>
      <button class="btn btn-ghost btn-sm" type="button" data-onboarding-start-action="reader">Open Reader</button>
      <button class="btn btn-ghost btn-sm" type="button" data-onboarding-start-action="learn">Go to Learn</button>
    </div>`;
}
function renderOnboardingNav(){
  return `
    <div class="onboarding-actions">
      <button class="btn btn-ghost btn-sm" type="button" data-onboarding-back="true">Back</button>
      <button class="btn btn-primary" type="button" data-onboarding-next="true">Continue</button>
    </div>`;
}
function renderOnboardingPage(){
  if(!OnboardingModel) return '<section class="panel"><p>Onboarding is unavailable.</p></section>';
  const body = {
    welcome: renderWelcomeStep,
    language: renderLanguageStep,
    goal: renderGoalStep,
    'survey-choice': renderSurveyChoiceStep,
    proficiency: renderProficiencyStep,
    summary: renderSummaryStep,
    'start-here': renderStartHereStep
  }[onboardingState.step]?.() || renderWelcomeStep();
  return `
    <section class="panel onboarding-panel" aria-labelledby="onboardingTitle">
      ${renderOnboardingProgress()}
      ${body}
    </section>`;
}
function openOnboardingStartAction(action){
  const primary = onboardingState.profile.languages?.[0] || 'greek';
  if(action === 'review' && typeof setLearnPage === 'function'){
    setLearnPage(`vocabulary:review:${primary}`, { skipHistory: true });
    if(typeof navigateTo === 'function') navigateTo('/learn');
    else if(typeof showView === 'function') showView('learnView');
    return;
  }
  if(action === 'reader'){
    if(typeof state !== 'undefined') state.lang = primary;
    if(typeof navigateTo === 'function') navigateTo('/reader');
    else if(typeof showView === 'function') showView('readerView');
    return;
  }
  if(typeof navigateTo === 'function') navigateTo('/learn');
  else if(typeof showView === 'function') showView('learnView');
}
function wireOnboarding(){
  const root = $('#onboardingShell');
  if(!root) return;
  $$('[data-onboarding-next]', root).forEach(button => button.addEventListener('click', onboardingNextStep));
  $$('[data-onboarding-back]', root).forEach(button => button.addEventListener('click', onboardingPreviousStep));
  $$('[data-onboarding-skip]', root).forEach(button => button.addEventListener('click', () => {
    updateOnboardingProfile({ goal: 'start-beginning' });
    onboardingState.surveyMode = 'skip';
    onboardingSelectedLanguages().forEach(language => updateOnboardingLanguageProfile(language, { surveyChoice: 'skip', vocabBand: 'none', familiarGrammar: [] }));
    completeOnboarding();
  }));
  $$('[data-onboarding-language]', root).forEach(button => button.addEventListener('click', () => {
    updateOnboardingProfile({ selectedLanguage: button.dataset.onboardingLanguage });
    renderOnboarding();
  }));
  $$('[data-onboarding-goal]', root).forEach(button => button.addEventListener('click', () => {
    updateOnboardingProfile({ goal: button.dataset.onboardingGoal });
    renderOnboarding();
  }));
  $$('[data-onboarding-survey-choice]', root).forEach(button => button.addEventListener('click', () => {
    onboardingState.surveyMode = button.dataset.onboardingSurveyChoice || 'skip';
    onboardingSelectedLanguages().forEach(language => updateOnboardingLanguageProfile(language, { surveyChoice: onboardingState.surveyMode }));
    renderOnboarding();
  }));
  $$('[data-onboarding-proficiency]', root).forEach(select => select.addEventListener('change', () => {
    updateOnboardingLanguageProfile(select.dataset.onboardingProficiency, { proficiency: select.value });
  }));
  $$('[data-onboarding-vocab-band]', root).forEach(select => select.addEventListener('change', () => {
    updateOnboardingLanguageProfile(select.dataset.onboardingVocabBand, { vocabBand: select.value });
  }));
  ['greek','hebrew'].forEach(language => {
    $$(`[data-onboarding-grammar="${language}"]`, root).forEach(input => input.addEventListener('change', () => {
      const checked = $$(`[data-onboarding-grammar="${language}"]`, root).filter(item => item.checked).map(item => item.value);
      updateOnboardingLanguageProfile(language, { familiarGrammar: checked });
    }));
  });
  $$('[data-onboarding-complete]', root).forEach(button => button.addEventListener('click', completeOnboarding));
  $$('[data-onboarding-start-action]', root).forEach(button => button.addEventListener('click', () => openOnboardingStartAction(button.dataset.onboardingStartAction)));
}
function renderOnboarding(){
  const root = $('#onboardingShell');
  if(!root) return;
  root.innerHTML = renderOnboardingPage();
  wireOnboarding();
}

if(typeof window !== 'undefined') Object.assign(window, { onboardingState, initOnboarding, renderOnboarding, renderOnboardingPage, wireOnboarding, setOnboardingStep, completeOnboarding, restartOnboardingFromSettings });
if(typeof module !== 'undefined') module.exports = { onboardingState, OnboardingSteps, OnboardingGoals, OnboardingLanguageOptions, renderOnboardingPage, setOnboardingStep, updateOnboardingProfile, updateOnboardingLanguageProfile, completeOnboarding };
