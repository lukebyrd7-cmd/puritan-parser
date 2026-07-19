/* ---------- Paradigm Recognition Engine ---------- */
(function(root){
  const ReferenceLibrary = () => (typeof PuritanReferenceLibrary !== 'undefined')
    ? PuritanReferenceLibrary
    : (typeof require === 'function' ? require('../grammar/reference-data') : null);

  const VERIFIED_HEBREW_STEMS = new Set(['Qal','Niphal','Piel','Hiphil','Hitpael']);
  const HEBREW_STEM_LABELS = { Hitpael: 'Hithpael' };
  const HEBREW_FORMS = new Set(['Perfect','Imperfect','Imperative','Participle','Infinitive Absolute','Infinitive Construct']);
  const GREEK_TENSES = ['Present','Imperfect','Future','Aorist','Perfect','Pluperfect'];
  const GREEK_VOICES = ['Active','Middle/Passive','Middle','Passive'];
  const GREEK_MOODS = ['Indicative','Subjunctive','Imperative','Infinitive','Participle'];

  const titleCaseTarget = value => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  const slug = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, '-')
    .replace(/^-|-$/g, '');
  const cellText = cell => {
    if(cell && typeof cell === 'object') return cell.label || cell.text || '';
    return String(cell ?? '');
  };
  const isReviewCell = cell => cell && typeof cell === 'object' && /needs review/i.test(String(cell.label || cell.text || cell.note || ''));
  const cleanForm = value => cellText(value).trim();
  const normalizeLabel = label => String(label || '').replace(/:.*$/, '').trim();
  const hebrewStemDisplay = stem => HEBREW_STEM_LABELS[stem] || stem;
  const hasAny = (value, words) => words.some(word => new RegExp(`(^|\\s)${word.replace('/', '\\/')}($|\\s|:)`).test(value));

  function referenceSections(topicId){
    const api = ReferenceLibrary();
    const topic = api?.getReferenceTopic?.(topicId);
    const tabSections = topic?.sectionTabs?.find(tab => tab.id === 'paradigms')?.sections || [];
    return [...tabSections, ...(topic?.sections || [])];
  }

  function chartSource(section, chart, topicId){
    return {
      topicId,
      sectionId: section?.id || slug(section?.title || topicId),
      sectionTitle: section?.title || '',
      chartLabel: chart?.label || ''
    };
  }

  function item(idParts, source, form, answerLines, clues, categories = []){
    return {
      id: slug(idParts.join('-')),
      form,
      prompt: 'Recognize this form.',
      answerLines,
      clues,
      referenceTopicId: source.topicId,
      referenceSectionId: source.sectionId,
      referenceLabel: source.sectionTitle || source.chartLabel,
      categories: categories.filter(Boolean)
    };
  }

  function greekChartMeta(label){
    const normalized = normalizeLabel(label);
    const tense = GREEK_TENSES.find(value => normalized.includes(value));
    const voice = GREEK_VOICES.find(value => normalized.includes(value));
    const mood = GREEK_MOODS.find(value => normalized.includes(value));
    if(!tense || !mood) return null;
    if(!voice && mood !== 'Infinitive' && mood !== 'Participle') return null;
    return { tense, voice: voice || '', mood, label: normalized };
  }

  function greekClues(meta){
    const clues = [];
    if(meta.tense === 'Present') clues.push('No augment', 'No reduplication');
    if(meta.tense === 'Imperfect') clues.push('Augment with secondary endings');
    if(meta.tense === 'Future') clues.push('Future stem marker');
    if(meta.tense === 'Aorist') clues.push('Aorist tense stem');
    if(meta.tense === 'Perfect') clues.push('Reduplication or perfect-system marker');
    if(meta.tense === 'Pluperfect') clues.push('Augment plus perfect-system marker');
    if(meta.voice === 'Active') clues.push('Active ending pattern');
    if(meta.voice?.includes('Middle') || meta.voice?.includes('Passive')) clues.push('Middle/passive ending pattern');
    if(meta.mood === 'Subjunctive') clues.push('Lengthened mood vowel');
    if(meta.mood === 'Infinitive') clues.push('Non-finite verbal noun form');
    if(meta.mood === 'Participle') clues.push('Verbal adjective ending');
    return clues.slice(0, 3);
  }

  function greekItemsFromChart(section, chart){
    const source = chartSource(section, chart, 'greek-verbs');
    const meta = greekChartMeta(chart.label);
    if(!meta) return [];
    const categories = ['greek-verbs', slug(meta.label), slug(meta.tense), slug(meta.mood), slug(meta.voice)];
    const rows = chart.rows || [];
    const columns = chart.columns || [];
    if(columns.includes('Singular') && columns.includes('Plural')){
      return rows.flatMap(row => ['Singular','Plural'].map(number => {
        const index = columns.indexOf(number);
        const form = cleanForm(row[index]);
        if(!form || isReviewCell(row[index])) return null;
        const person = `${row[0]} Person ${number}`;
        return item(['greek', meta.label, person, form], source, form, [meta.label, person], greekClues(meta), categories);
      }).filter(Boolean));
    }
    if(columns.includes('Form')){
      return rows.map((row, index) => {
        const form = cleanForm(row[0]);
        if(!form || isReviewCell(row[0])) return null;
        const label = row.length > 1 ? `${row[0]} ${row[1]}` : meta.label;
        return item(['greek', meta.label, index, form], source, form, [meta.label], greekClues(meta), categories.concat(slug(label)));
      }).filter(Boolean);
    }
    if(columns.includes('Masculine') && columns.includes('Feminine') && columns.includes('Neuter')){
      return rows.flatMap(row => ['Masculine','Feminine','Neuter'].map(gender => {
        const index = columns.indexOf(gender);
        const form = cleanForm(row[index]);
        if(!form || isReviewCell(row[index])) return null;
        const detail = `${row[0]} ${gender}`;
        return item(['greek', meta.label, detail, form], source, form, [meta.label, detail], greekClues(meta), categories.concat(slug(detail)));
      }).filter(Boolean));
    }
    return [];
  }

  function hebrewChartMeta(chart){
    const normalized = normalizeLabel(chart.label);
    const metadataStem = titleCaseTarget(chart.stemId || '');
    const stem = [...VERIFIED_HEBREW_STEMS].find(value => value === metadataStem || normalized.toLowerCase().startsWith(`${value.toLowerCase()} `));
    const metadataForm = titleCaseTarget(chart.formCategory || '');
    const form = [...HEBREW_FORMS].find(value => value === metadataForm || normalized.toLowerCase().includes(value.toLowerCase()));
    if(!stem || !form) return null;
    return { stem, form, label: `${hebrewStemDisplay(stem)} ${form}` };
  }

  function hebrewClues(meta){
    const clues = [`${hebrewStemDisplay(meta.stem)} stem pattern`];
    if(meta.form === 'Perfect') clues.push('Suffix-conjugation form');
    if(meta.form === 'Imperfect') clues.push('Prefix-conjugation form');
    if(meta.form === 'Imperative') clues.push('Command form');
    if(meta.form.includes('Infinitive')) clues.push('Non-finite verbal form');
    if(meta.form === 'Participle') clues.push('Verbal adjective pattern');
    if(meta.stem === 'Niphal') clues.push('Niphal נ/הִ marker');
    if(meta.stem === 'Piel') clues.push('Doubled middle radical');
    if(meta.stem === 'Hiphil') clues.push('Causative ה pattern');
    if(meta.stem === 'Hitpael') clues.push('הת reflexive marker');
    return clues.slice(0, 3);
  }

  function hebrewItemsFromChart(section, chart){
    const source = chartSource(section, chart, 'hebrew-verbs');
    const meta = hebrewChartMeta(chart);
    if(!meta) return [];
    const categories = ['hebrew-verbs', slug(meta.stem), slug(hebrewStemDisplay(meta.stem)), slug(meta.form), slug(meta.label), chart.weakClassId ? `weak-${slug(chart.weakClassId)}` : 'strong-verb'];
    const rows = chart.rows || [];
    const columns = chart.columns || [];
    if(columns.includes('Attested weak form')){
      const formIndex=columns.indexOf('Attested weak form');
      return rows.map((row,index)=>{
        const cell=row[formIndex];
        const form=cleanForm(cell);
        if(!form||isReviewCell(cell)) return null;
        const detail=cleanForm(row[0])||`${meta.form} ${index+1}`;
        return item(['hebrew',chart.weakClassId,meta.label,detail,form],source,form,[meta.label,chart.weakClassLabel||titleCaseTarget(chart.weakClassId),detail],hebrewClues(meta).concat(chart.comparison?.change||'').slice(0,3),categories.concat(slug(detail)));
      }).filter(Boolean);
    }
    if(columns.includes('Hebrew form') || columns.includes('Hebrew pattern')){
      const formColumn = columns.includes('Hebrew form') ? 'Hebrew form' : 'Hebrew pattern';
      const formIndex = columns.indexOf(formColumn);
      return rows.map((row, index) => {
        const cell = row[formIndex];
        const form = cleanForm(cell);
        if(!form || isReviewCell(cell)) return null;
        const detail = row.slice(0, formIndex).map(cleanForm).filter(Boolean).join(' ');
        return item(['hebrew', meta.label, detail || index, form], source, form, [meta.label, detail || meta.form], hebrewClues(meta), categories.concat(slug(detail)));
      }).filter(Boolean);
    }
    if(columns.includes('Person')){
      return rows.flatMap(row => columns.slice(1).map((person, offset) => {
        const cell = row[offset + 1];
        const form = cleanForm(cell);
        if(!form || isReviewCell(cell)) return null;
        return item(['hebrew', meta.label, person, form], source, form, [meta.label, person], hebrewClues(meta), categories);
      }).filter(Boolean));
    }
    if(columns.includes('Gender/Number') || columns.includes('Form')){
      return rows.map((row, index) => {
        const form = cleanForm(row[1] || row[0]);
        if(!form || isReviewCell(row[1] || row[0])) return null;
        return item(['hebrew', meta.label, row[0], form], source, form, [meta.label, row[0]], hebrewClues(meta), categories.concat(slug(row[0])));
      }).filter(Boolean);
    }
    return [];
  }

  function nounRecognitionItems(topicId, language){
    const api = ReferenceLibrary();
    const topic = api?.getReferenceTopic?.(topicId);
    const sections = topic?.recognitionSections || topic?.sectionTabs?.find(tab => tab.id === 'paradigms')?.sections || [];
    return sections.flatMap(section => (section.charts || []).flatMap(chart => {
      if(chart.milestone === 'v1.3.6b') return [];
      const source = chartSource(section, chart, topicId);
      return (chart.rows || []).slice(0, 3).flatMap((row, rowIndex) => (chart.columns || []).slice(1).map((column, offset) => {
        const cell = row[offset + 1];
        const form = cleanForm(cell);
        if(!form || isReviewCell(cell) || /—/.test(form)) return null;
        const answer = [section.title, `${row[0]} ${column}`.trim()];
        return item([language, topicId, section.title, rowIndex, column, form], source, form, answer, section.recognitionTips || topic.recognitionTips || [], [topicId, `${language}-nouns`, slug(section.title)]);
      }).filter(Boolean));
    }));
  }

  function sequentialHebrewItems(){
    const source = { topicId:'hebrew-verbs', sectionId:'sequential-use', sectionTitle:'Sequential Use', chartLabel:'Sequential patterns' };
    return [
      item(['hebrew','wayyiqtol','vayomer'], source, 'וַיֹּאמֶר', ['Wayyiqtol', 'Qal Imperfect pattern in narrative sequence'], ['וַי + imperfect shape', 'Narrative sequence clue'], ['hebrew-verbs','wayyiqtol','waw-consecutive']),
      item(['hebrew','weqatal','veqatal'], source, 'וְקָטַל', ['Weqatal', 'Waw plus perfect form'], ['וְ + perfect shape', 'Sequential or modal/future context'], ['hebrew-verbs','weqatal','sequential-use'])
    ];
  }

  function buildItems(){
    const greekVerbItems = referenceSections('greek-verbs')
      .flatMap(section => (section.charts || []).flatMap(chart => greekItemsFromChart(section, chart)));
    const hebrewVerbItems = referenceSections('hebrew-verbs')
      .flatMap(section => (section.charts || []).flatMap(chart => hebrewItemsFromChart(section, chart)))
      .concat(sequentialHebrewItems());
    return [
      ...dedupeItems(greekVerbItems),
      ...dedupeItems(hebrewVerbItems),
      ...dedupeItems(nounRecognitionItems('greek-nouns', 'greek')),
      ...dedupeItems(nounRecognitionItems('hebrew-nouns', 'hebrew'))
    ];
  }

  function dedupeItems(items){
    const seen = new Set();
    return items.filter(item => {
      const key = `${item.form}|${item.answerLines.join('|')}|${item.referenceTopicId}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function allItems(){ return buildItems(); }
  function itemsForTarget(targetId){
    const target = recognitionTarget(targetId);
    if(!target) return [];
    return allItems().filter(item => target.match(item));
  }

  function target(id, title, description, language, kind, match, referenceTopicId){
    return { id, title, description, language, kind, referenceTopicId, match };
  }

  function recognitionTargets(){
    const items = allItems();
    const has = predicate => items.some(predicate);
    const base = [
      target('greek-verbs','Greek Verbs','All verified Greek verb recognition forms.','greek','verbs', item => item.categories.includes('greek-verbs'), 'greek-verbs'),
      target('greek-nouns','Greek Nouns','Greek noun, article, and ending recognition from Reference.','greek','nouns', item => item.categories.includes('greek-nouns'), 'greek-nouns'),
      target('hebrew-verbs','Hebrew Verbs','Verified Hebrew strong- and weak-verb recognition forms.','hebrew','verbs', item => item.categories.includes('hebrew-verbs'), 'hebrew-verbs'),
      target('hebrew-nouns','Hebrew Nouns','Verified Hebrew noun recognition forms already in Reference.','hebrew','nouns', item => item.categories.includes('hebrew-nouns'), 'hebrew-nouns')
    ];
    const greekParadigms = [
      'Present Active Indicative',
      'Present Middle/Passive Indicative',
      'Imperfect Active Indicative',
      'Future Active Indicative',
      'Aorist Active Indicative',
      'Aorist Passive Indicative',
      'Perfect Active Indicative',
      'Pluperfect Active Indicative',
      'Present Active Subjunctive',
      'Aorist Active Imperative',
      'Present Active Infinitive',
      'Aorist Passive Infinitive',
      'Present Active Participle',
      'Aorist Passive Participle'
    ].filter(label => has(item => item.categories.includes(slug(label)))).map(label =>
      target(`greek-${slug(label)}`, label, 'Study this Greek paradigm.', 'greek', 'verbs', item => item.categories.includes(slug(label)), 'greek-verbs')
    );
    const hebrewParadigms = [
      'Qal','Niphal','Piel','Hiphil','Hithpael',
      'Perfect','Imperfect','Imperative','Participle','Infinitive Absolute','Infinitive Construct','Wayyiqtol','Weqatal'
    ].filter(label => has(item => item.categories.includes(slug(label)))).map(label =>
      target(`hebrew-${slug(label)}`, label, `Study ${titleCaseTarget(label)} recognition.`, 'hebrew', 'verbs', item => item.categories.includes(slug(label)), 'hebrew-verbs')
    );
    return [...base, ...greekParadigms, ...hebrewParadigms].filter(t => items.some(t.match));
  }

  function recognitionTarget(id){
    return recognitionTargets().find(target => target.id === id) || null;
  }

  function createSession(targetId){
    const target = recognitionTarget(targetId);
    const items = target ? itemsForTarget(target.id) : [];
    return { target, items, total: items.length };
  }
  function createCombinedSession(targetIds = [], options = {}){
    const targets = [...new Set((Array.isArray(targetIds) ? targetIds : []).map(String).filter(Boolean))]
      .map(recognitionTarget)
      .filter(Boolean);
    const seen = new Set();
    const items = targets.flatMap(target => itemsForTarget(target.id)).filter(item => {
      if(seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    const language = targets.every(target => target.language === targets[0]?.language) ? targets[0]?.language : 'mixed';
    const target = {
      id: options.id || `combined-${targets.map(target => target.id).join('-')}`,
      title: options.title || targets.map(target => target.title).join(' + ') || 'Selected Paradigms',
      description: targets.length ? `Combined recognition from ${targets.map(target => target.title).join(', ')}.` : 'No paradigms selected.',
      language,
      kind: 'mixed',
      referenceTopicId: targets[0]?.referenceTopicId || ''
    };
    return { target, targets, selectedTargetIds: targets.map(target => target.id), items, total: items.length };
  }

  const api = { allItems, itemsForTarget, recognitionTargets, recognitionTarget, createSession, createCombinedSession, slug };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ParadigmRecognition = api;
})(typeof window !== 'undefined' ? window : globalThis);
