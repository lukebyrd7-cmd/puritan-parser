/* ---------- PARSING PRACTICE ---------- */
function parsingModeFamily(mode = $('#parsingMode')?.value || 'mixed'){
  if(mode === 'nouns' || mode === 'construct') return 'nominals';
  if(mode === 'verbs' || ['participles','aorists'].includes(mode)) return 'verbs';
  return null;
}
function cleanParsingFiltersForMode(mode = $('#parsingMode')?.value || 'mixed'){
  const forced = parsingModeFamily(mode);
  const current = state.parsingFilters || { family:'all', details:{} };
  const family = forced || (['all','nominals','verbs'].includes(current.family) ? current.family : 'all');
  const valid = new Set(parsingFilterSpecs(state.lang, family).map(spec => spec.id));
  const details = {};
  Object.entries(current.details || {}).forEach(([key, value]) => { if(valid.has(key)) details[key] = value; });
  if(mode === 'construct') details.state = 'c';
  if(mode === 'participles') details.mood = 'ptc';
  if(mode === 'aorists') details.tense = 'aor';
  state.parsingFilters = { family, details };
}
function parsingPool(){
  cleanParsingFiltersForMode();
  let pool = applyRangeDueFilter(getCurrentList()).filter(isParseDrillable).filter(item => matchesParsingFilters(item));
  const mode = $('#parsingMode')?.value || 'mixed';
  const today = todayISO();
  if(mode === 'weak') pool = pool.filter(isWeakParsingItem);
  if(mode === 'misses') pool = pool.filter(it => (it.parsing?.todayMisses || []).includes(today));
  return pool;
}
function updateParsingMatchCount(){
  const el = $('#parsingMatchCount'); if(!el) return;
  const count = parsingPool().length;
  el.textContent = `${count} parseable form${count===1?'':'s'} match these filters`;
}
function updateParsingModeUI(){
  const mode = $('#parsingMode')?.value||'mixed';
  cleanParsingFiltersForMode(mode);
  const isWordForms = mode==='wordforms';
  const forced = parsingModeFamily(mode);
  $('#parsingCountWrap')?.classList.toggle('hidden', isWordForms);
  $('#lemmaPicker')?.classList.toggle('hidden', !isWordForms);
  const familySelect = $('#parsingFamilySelect');
  if(familySelect) familySelect.disabled = !!forced && !['wordforms','mixed'].includes(mode);
  updateParsingFilterOptions();
  updateParsingMatchCount();
  if(isWordForms) renderLemmaPicker();
}

function renderLemmaPicker(){
  readFiltersFromDOM();
  const search = ($('#lemmaSearch')?.value||'').toLowerCase();
  state.parsingFilters = readParsingFiltersFromDOM();
  const pool = parsingPool();
  // Group by lemma
  const lemmaMap = {};
  pool.forEach(it=>{
    const l = it.lemma||it.word||'';
    if(!lemmaMap[l]) lemmaMap[l]={ total:0, unmastered:0 };
    lemmaMap[l].total++;
    if((it.parsing?.streak || 0) < 2) lemmaMap[l].unmastered++;
  });
  const lemmas = Object.entries(lemmaMap)
    .filter(([l])=>!search||l.toLowerCase().includes(search))
    .sort((a,b)=>a[0].localeCompare(b[0]));

  const ll = $('#lemmaList'); if(!ll) return;
  if(!lemmas.length){
    ll.innerHTML = `<div class="lemma-item"><span class="muted small">No parseable lemmas found</span></div>`;
    return;
  }
  ll.innerHTML = lemmas.map(([l,stats])=>
    `<div class="lemma-item${selectedLemma===l?' selected':''}" data-lemma="${escHtml(l)}">`+
    `<span>${escHtml(l)}</span><span class="lemma-count">${stats.total} form${stats.total!==1?'s':''}${stats.unmastered ? ` · ${stats.unmastered} not mastered` : ' · mastered'}</span></div>`
  ).join('');
  $$('#lemmaList .lemma-item').forEach(el=>{
    el.addEventListener('click',()=>{
      selectedLemma = el.dataset.lemma;
      $$('#lemmaList .lemma-item').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      const sd = $('#lemmaSelected'); if(sd) sd.textContent = `Selected: ${selectedLemma}`;
    });
  });
}

function startParsing(){
  readFiltersFromDOM();
  const mode = $('#parsingMode')?.value||'mixed';

  if(mode==='wordforms'){
    if(!selectedLemma){ toast('Please select a lemma first.','danger'); return; }
    state.parsingFilters = readParsingFiltersFromDOM();
    const pool = parsingPool().filter(it=>(it.lemma||it.word||'')=== selectedLemma);
    if(!pool.length){
      toast(`No parseable forms found for "${selectedLemma}".`,'danger'); return;
    }
    parsingSession = { questions: shuffle(pool), idx:0, correct:0, total:pool.length, results:[], wordformsLemma: selectedLemma };
    if(pool.length===1) toast(`Only 1 form found for "${selectedLemma}".`);
    $('#parsingIdle').classList.add('hidden');
    $('#parsingSession').classList.remove('hidden');
    $('#endParsing').classList.remove('hidden');
    renderParsingQuestion();
    return;
  }

  const count = Number($('#parsingCount')?.value)||10;
  state.parsingFilters = readParsingFiltersFromDOM();
  let pool = parsingPool();
  if(!pool.length){
    toast('No parseable words found. Words need a "parse" field in your vocab JSON (e.g. "parse":"N-NSM").','danger'); return;
  }
  pool = shuffle(pool).slice(0, Math.min(count, pool.length));
  parsingSession = { questions: pool, idx:0, correct:0, total:pool.length, results:[], wordformsLemma: '' };
  $('#parsingIdle').classList.add('hidden');
  $('#parsingSession').classList.remove('hidden');
  $('#endParsing').classList.remove('hidden');
  renderParsingQuestion();
}

function endParsing(){
  $('#parsingSession').classList.add('hidden');
  $('#parsingIdle').classList.remove('hidden');
  $('#endParsing').classList.add('hidden');
}

function renderParsingQuestion(){
  const { idx, questions, total, results, wordformsLemma } = parsingSession;
  const dots = $('#parsingDots');
  if(dots){
    dots.innerHTML = questions.slice(0,total).map((_,i)=>{
      const r = results[i];
      return `<div class="ps-dot ${r===true?'correct-dot':r===false?'wrong-dot':''}"></div>`;
    }).join('');
  }

  const isLast = idx === total-1;
  const isDone = idx >= total;

  if(isDone){
    // Summary
    const pct = total?Math.round(parsingSession.correct/total*100):0;
    const summaryText = wordformsLemma
      ? `You identified ${parsingSession.correct}/${total} forms of ${wordformsLemma} correctly.`
      : `${parsingSession.correct}/${total} correct`;
    $('#parsingWord').innerHTML = `<span style="font-size:40px">${pct>=70?'🎉':'📖'}</span>`;
    $('#parsingForm').innerHTML='';
    $('#parsingMeta').innerHTML='';
    $('#parsingResult').classList.add('hidden');
    $('#parsingProgress').textContent = `Complete: ${parsingSession.correct}/${total} (${pct}%)`;
    $('#parsingSubmit').classList.add('hidden');
    $('#nextParsing').classList.add('hidden');
    $('#finishParsing').classList.add('hidden');
    $('#parsingReveal').classList.add('hidden');
    toast(summaryText, pct>=70?'success':'');
    return;
  }

  const qn = questions[idx];
  $('#parsingWord').textContent = qn.word||'—';
  if(wordformsLemma){
    $('#parsingProgress').textContent = `Training: ${wordformsLemma} — ${idx+1}/${total} forms`;
  } else {
    $('#parsingProgress').textContent = `${idx+1} / ${total}`;
  }
  const pm = $('#parsingMeta');
  if(pm){ pm.innerHTML=''; if(qn.freq){ const s=document.createElement('span'); s.className='fc-parse-tag'; s.textContent=`freq ${qn.freq}`; pm.appendChild(s); } }

  const res = $('#parsingResult'); if(res){ res.classList.add('hidden'); res.innerHTML=''; }
  $('#parsingSubmit').classList.remove('hidden');
  $('#nextParsing').classList.add('hidden');
  $('#finishParsing').classList.add('hidden');
  $('#parsingReveal').classList.remove('hidden');

  const form = $('#parsingForm'); if(!form) return;
  form.innerHTML='';
  const fields = getParsingFields(qn);
  fields.forEach(f=>{
    const div = document.createElement('div'); div.className='parsing-field';
    div.innerHTML = `<label>${escHtml(f.label)}</label>`;
    const s = document.createElement('select'); s.className='input'; s.id='par_'+f.id;
    f.opts.forEach(o=>{
      const opt = typeof o==='string' ? {value:o, label:o} : o;
      const op=document.createElement('option'); op.value=opt.value; op.textContent=opt.label; s.appendChild(op);
    });
    div.appendChild(s);
    form.appendChild(div);
  });
}

const PARSING_LABELS = {
  case: { n:'nominative', a:'accusative', g:'genitive', d:'dative', v:'vocative' },
  number: { s:'singular', p:'plural', d:'dual' },
  gender: { m:'masculine', f:'feminine', n:'neuter', c:'common' },
  tense: { pres:'present', impf:'imperfect', fut:'future', aor:'aorist', perf:'perfect', plup:'pluperfect' },
  voice: { act:'active', mid:'middle', pas:'passive', mp:'middle/passive' },
  mood: { ind:'indicative', subj:'subjunctive', opt:'optative', imp:'imperative', inf:'infinitive', ptc:'participle' },
  stem: { qal:'Qal', nifal:'Niphal', niphal:'Niphal', piel:'Piel', pual:'Pual', hifil:'Hiphil', hiphil:'Hiphil', hofal:'Hophal', hophal:'Hophal', hitpael:'Hithpael', hithpael:'Hithpael' },
  form: { perf:'perfect', impf:'imperfect', wayyiqtol:'wayyiqtol', imp:'imperative', inf:'infinitive', ptc:'participle' },
  state: { a:'absolute', c:'construct', d:'determined' },
  person: { '1s':'1st person singular', '2s':'2nd person singular', '3s':'3rd person singular', '1p':'1st person plural', '2p':'2nd person plural', '3p':'3rd person plural', '1cs':'1st person common singular', '2ms':'2nd person masculine singular', '2fs':'2nd person feminine singular', '3ms':'3rd person masculine singular', '3fs':'3rd person feminine singular', '1cp':'1st person common plural', '2mp':'2nd person masculine plural', '2fp':'2nd person feminine plural', '3mp':'3rd person masculine plural', '3fp':'3rd person feminine plural' }
};

function parsingOption(fieldId, value, label){
  return { value, label: label || PARSING_LABELS[fieldId]?.[value] || value };
}

function parsingOptions(fieldId, values){
  return values.map(value => parsingOption(fieldId, value));
}

function normalizeParsingCode(type, code){
  const lower = String(code || '').toLowerCase();
  if(type==='stem') return HEBREW_STEM_ALIASES[lower] || lower;
  const maps = {
    tense: { p:'pres', i:'impf', f:'fut', a:'aor', r:'perf', l:'plup', x:'perf' },
    voice: { a:'act', m:'mid', p:'pas', n:'mp' },
    mood: { i:'ind', s:'subj', o:'opt', m:'imp', n:'inf', p:'ptc', d:'imp' }
  };
  return maps[type]?.[lower] || lower;
}

function getParsingFields(qn){
  const p = (qn.parse||'').toLowerCase();
  const lang = (qn.lang||state.lang||'greek').toLowerCase();
  const bits = p.split('-').filter(Boolean);
  const compactGreekVerb = lang==='greek' && bits[0]==='v' && /^[a-z]{3}$/.test(bits[1]||'');
  const morphGntGreekVerb = lang==='greek' && bits[0]==='v' && /^[123-][a-z-]{3}$/.test(bits[1]||'');
  const compactMoodCode = compactGreekVerb ? bits[1][2] : (morphGntGreekVerb ? bits[1][3] : '');
  const partOfSpeech = bits[0] || (qn.pos||'').toLowerCase().slice(0,1);
  const isNominal = ['n','a','t','p','adj','pron'].includes(partOfSpeech) || ['noun','adjective','article','pronoun'].some(pos => (qn.pos||'').toLowerCase().startsWith(pos));
  if(isNominal){
    const fields = [];
    if(lang==='greek'){
      fields.push({id:'case', label:'Case', type:'select', opts: parsingOptions('case', ['n','a','g','d','v'])});
      fields.push({id:'number', label:'Number', type:'select', opts: parsingOptions('number', GREEK_NUMBER_OPTIONS)});
      fields.push({id:'gender', label:'Gender', type:'select', opts: parsingOptions('gender', ['m','f','n','c'])});
    } else {
      fields.push({id:'gender', label:'Gender', type:'select', opts: parsingOptions('gender', ['m','f','c'])});
      fields.push({id:'number', label:'Number', type:'select', opts: parsingOptions('number', HEBREW_NUMBER_OPTIONS)});
      fields.push({id:'state', label:'State', type:'select', opts: parsingOptions('state', ['a','c','d'])});
    }
    return fields;
  } else {
    if(lang==='hebrew'){
      return [
        {id:'stem', label:'Stem', type:'select', opts: parsingOptions('stem', ['qal','niphal','piel','pual','hiphil','hophal','hithpael'])},
        {id:'form', label:'Form', type:'select', opts: parsingOptions('form', ['perf','impf','wayyiqtol','imp','inf','ptc'])},
        {id:'person', label:'Person/Gender/Num', type:'select', opts: parsingOptions('person', ['1cs','2ms','2fs','3ms','3fs','1cp','2mp','2fp','3mp','3fp'])}
      ];
    }
    const fields = [
      {id:'tense', label:'Tense', type:'select', opts: parsingOptions('tense', ['pres','impf','fut','aor','perf','plup'])},
      {id:'voice', label:'Voice', type:'select', opts: parsingOptions('voice', ['act','mid','pas','mp'])}
    ];
    const hasMood = compactGreekVerb || morphGntGreekVerb || bits.some(x=>['ind','subj','opt','imp','inf','ptc'].includes(x));
    if(hasMood) fields.push({id:'mood', label:'Mood', type:'select', opts: parsingOptions('mood', ['ind','subj','opt','imp','inf','ptc'])});
    if(compactMoodCode==='p'){
      fields.push({id:'case', label:'Case', type:'select', opts: parsingOptions('case', ['n','a','g','d','v'])});
      fields.push({id:'number', label:'Number', type:'select', opts: parsingOptions('number', GREEK_NUMBER_OPTIONS)});
      fields.push({id:'gender', label:'Gender', type:'select', opts: parsingOptions('gender', ['m','f','n','c'])});
    } else if(compactMoodCode!=='n'){
      fields.push({id:'person', label:'Person/Num', type:'select', opts: parsingOptions('person', ['1s','2s','3s','1p','2p','3p'])});
    }
    return fields;
  }
}

function getExpectedParsingValue(qn, fieldId){
  const bits = (qn.parse||'').toLowerCase().split('-').filter(Boolean);
  const lang = (qn.lang||state.lang||'greek').toLowerCase();
  const compactGreekVerb = lang==='greek' && bits[0]==='v' && /^[a-z]{3}$/.test(bits[1]||'');
  const morphGntGreekVerb = lang==='greek' && bits[0]==='v' && /^[123-][a-z-]{3}$/.test(bits[1]||'');
  if(compactGreekVerb){
    if(fieldId==='tense') return normalizeParsingCode('tense', bits[1][0]);
    if(fieldId==='voice') return normalizeParsingCode('voice', bits[1][1]);
    if(fieldId==='mood') return normalizeParsingCode('mood', bits[1][2]);
    if(fieldId==='case') return bits[2]?.[0] || '';
    if(fieldId==='number') return bits[2]?.[1] || '';
    if(fieldId==='gender') return bits[2]?.[2] || '';
  }
  if(morphGntGreekVerb){
    if(fieldId==='tense') return normalizeParsingCode('tense', bits[1][1]);
    if(fieldId==='voice') return normalizeParsingCode('voice', bits[1][2]);
    if(fieldId==='mood') return normalizeParsingCode('mood', bits[1][3]);
    if(fieldId==='person') return `${bits[1][0]}${bits[2]?.[0] || ''}`.replace(/^-/, '');
    if(fieldId==='case') return bits[2]?.[0] || '';
    if(fieldId==='number') return bits[2]?.[1] || '';
    if(fieldId==='gender') return bits[2]?.[2] || '';
  }
  if(lang==='hebrew'){
    if(fieldId==='stem') return normalizeParsingCode('stem', bits[1] || '');
    if(fieldId==='form') return bits[2] || '';
    if(fieldId==='person') return bits[3] || '';
    if(fieldId==='gender') return bits[1]?.[0] || '';
    if(fieldId==='number') return bits[1]?.[1] || '';
    if(fieldId==='state') return bits[1]?.[2] || '';
  }
  if(fieldId==='case') return bits[1]?.[0] || '';
  if(fieldId==='number') return bits[1]?.[1] || '';
  if(fieldId==='gender') return bits[1]?.[2] || '';
  if(fieldId==='person') return bits.find(bit => /^[123][sp]$/.test(bit)) || '';
  if(fieldId==='tense') return bits[1] || '';
  if(fieldId==='voice') return bits[2] || '';
  if(fieldId==='mood') return bits[3] || '';
  return '';
}

function parseHasSelection(qn, fieldId, val){
  const expected = getExpectedParsingValue(qn, fieldId);
  const actual = fieldId === 'stem' ? normalizeParsingCode('stem', val) : val;
  return expected === actual;
}

function formatParsingValue(fieldId, val){
  return PARSING_LABELS[fieldId]?.[val] || val || '—';
}


function parsingWeakCategories(qn){
  const cats = [];
  const lang = (qn.lang||state.lang||'greek').toLowerCase();
  const fields = getParsingFields(qn);
  const val = id => getExpectedParsingValue(qn, id);
  if(lang === 'greek'){
    if(val('mood') === 'ptc') cats.push('participles');
    if(val('tense') === 'aor') cats.push('aorists');
    if(val('mood') === 'subj') cats.push('subjunctives');
    if(val('case') === 'g') cats.push('genitives');
    if(val('case') === 'd') cats.push('datives');
  } else {
    if(val('state') === 'c') cats.push('construct state');
    if(val('stem') === 'hiphil') cats.push('Hiphil');
    if(val('stem') === 'piel') cats.push('Piel');
    if(val('form') === 'impf') cats.push('imperfects');
  }
  fields.forEach(f => cats.push(`${f.label}: ${formatParsingValue(f.id, val(f.id))}`));
  return cats.filter(Boolean);
}
function isWeakParsingItem(item){
  const p = item.parsing || {};
  const missCount = Object.values(p.misses || {}).reduce((sum, n) => sum + Number(n || 0), 0);
  return missCount > 0 || Number(p.streak || 0) < 2;
}
function recordParsingReview(item, grammarCorrect, lemmaKnown){
  ensureSRS(item);
  item.parsing.attempts = (item.parsing.attempts || 0) + 1;
  item.vocab.attempts = (item.vocab.attempts || 0) + 1;
  if(grammarCorrect) item.parsing.correct = (item.parsing.correct || 0) + 1;
  if(lemmaKnown) item.vocab.correct = (item.vocab.correct || 0) + 1;
  item.parsing.streak = grammarCorrect ? (item.parsing.streak || 0) + 1 : 0;
  if(!grammarCorrect){
    const today = todayISO();
    item.parsing.todayMisses = Array.from(new Set([...(item.parsing.todayMisses || []).filter(d => d === today), today]));
    item.parsing.misses = item.parsing.misses || {};
    parsingWeakCategories(item).forEach(cat => { item.parsing.misses[cat] = (item.parsing.misses[cat] || 0) + 1; });
  }
  const quality = grammarCorrect && lemmaKnown ? 4 : grammarCorrect ? 3 : 2;
  scheduleUpdate(item, quality);
  item.history[item.history.length - 1].type = 'parsing';
  item.history[item.history.length - 1].grammarCorrect = !!grammarCorrect;
  item.history[item.history.length - 1].lemmaKnown = !!lemmaKnown;
  saveVocab(item.lang || state.lang);
  recordReview(quality);
  updateDueBadge();
}
function parsingExplanation(qn, fields = getParsingFields(qn)){
  const bits = String(qn.word || '').slice(-3);
  const lines = fields.map(f => {
    const value = formatParsingValue(f.id, getExpectedParsingValue(qn, f.id));
    if(f.id === 'state') return `${value} state is marked by the nominal state code in this form.`;
    if(f.id === 'stem') return `${value} is the verbal stem/binyan encoded in the parse.`;
    if(f.id === 'form') return `${value} is the Hebrew verbal form encoded in the parse.`;
    if(f.id === 'case' || f.id === 'number' || f.id === 'gender') return `${studentLabel(f.label)} is ${value}; the ending${bits ? ` (${bits})` : ''} and parse code point to it.`;
    return `${studentLabel(f.label)} is ${value} because that slot of the parse identifies it.`;
  });
  return lines.slice(0, 5);
}
function correctParsingSummary(qn){ return getParsingFields(qn).map(f => formatParsingValue(f.id, getExpectedParsingValue(qn, f.id))).filter(Boolean).map(studentLabel).join(' '); }

function checkParsingAnswer(reveal=false){
  const idx = parsingSession.idx;
  const qn = parsingSession.questions[idx];
  if(!qn) return;
  const fields = getParsingFields(qn);
  let correct=0; let total=0; const lines=[];
  fields.forEach(f=>{
    const el = $(`#par_${f.id}`); if(!el) return;
    const val = el.value; total++;
    const ok = parseHasSelection(qn, f.id, val);
    if(ok) correct++;
    const expected = getExpectedParsingValue(qn, f.id);
    const said = formatParsingValue(f.id, val);
    const answer = formatParsingValue(f.id, expected);
    lines.push({ ok, text: ok ? `✓ ${f.label}: ${said}` : `✗ ${f.label}: you said ${said}; correct is ${answer}` });
  });
  pendingParsingResult = { grammarCorrect: correct===total, correct, total };

  const res = $('#parsingResult'); if(!res) return;
  const allRight = correct===total;
  res.className = 'parsing-result';
  res.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${allRight?'Grammar looks right':'Grammar: '+correct+'/'+total+' correct'}</div>`
    + `<div><strong>Correct:</strong> ${escHtml(correctParsingSummary(qn))}</div>`
    + `<div class="small muted" style="margin-bottom:6px">${escHtml(parseSummary(qn))}</div>`
    + `<div>Lemma: <span class="serif" style="font-size:16px">${escHtml(qn.lemma||'—')}</span></div>`
    + (qn.gloss ? `<div>Gloss: ${escHtml(qn.gloss)}</div>` : '')
    + lines.map(l=>`<div class="parsing-result-line ${l.ok?'ok':'err'}">${escHtml(l.text)}</div>`).join('')
    + (!allRight ? `<div style="font-weight:700;margin-top:8px">Explanation:</div>${parsingExplanation(qn, fields).map(line=>`<div class="small muted">${escHtml(line)}</div>`).join('')}` : '')
    + `<div class="self-grade">
        <div class="small muted">Did you know the lemma?</div>
        <button class="btn btn-primary btn-sm" id="lemmaKnownBtn">I knew it</button>
        <button class="btn btn-ghost btn-sm" id="lemmaMissedBtn">Missed it</button>
      </div>`;
  res.classList.remove('hidden');
  $('#parsingSubmit').classList.add('hidden');
  $('#parsingReveal').classList.add('hidden');
  $('#nextParsing').classList.add('hidden');
  $('#finishParsing').classList.add('hidden');
  $('#lemmaKnownBtn')?.addEventListener('click',()=>finishParsingAnswer(true));
  $('#lemmaMissedBtn')?.addEventListener('click',()=>finishParsingAnswer(false));
}

function finishParsingAnswer(lemmaKnown){
  const idx = parsingSession.idx;
  if(!pendingParsingResult) return;
  const allRight = pendingParsingResult.grammarCorrect && lemmaKnown;
  if(allRight) parsingSession.correct++;
  const answered = parsingSession.questions[idx];
  recordParsingReview(answered, pendingParsingResult.grammarCorrect, lemmaKnown);
  parsingSession.results[idx] = allRight;
  if(parsingSession.wordformsLemma && !allRight){
    parsingSession.questions.push(answered);
    parsingSession.results.push(undefined);
    parsingSession.total++;
  }
  parsingSession.idx++;
  pendingParsingResult = null;

  const res = $('#parsingResult');
  if(res){
    res.classList.toggle('correct', allRight);
    res.classList.toggle('wrong', !allRight);
    const grade = document.createElement('div');
    grade.className = `parsing-result-line ${lemmaKnown?'ok':'err'}`;
    grade.textContent = lemmaKnown ? '✓ Lemma self-check: knew it' : '✗ Lemma self-check: missed it';
    res.appendChild(grade);
    $$('.self-grade button').forEach(btn=>btn.disabled=true);
  }

  const isLastQuestion = parsingSession.idx >= parsingSession.total;
  if(isLastQuestion){
    $('#nextParsing').classList.add('hidden');
    $('#finishParsing').classList.remove('hidden');
  } else {
    $('#nextParsing').classList.remove('hidden');
    $('#finishParsing').classList.add('hidden');
  }
  renderParsingDots();
}

function renderParsingDots(){
  const dots = $('#parsingDots'); if(!dots) return;
  dots.innerHTML = parsingSession.questions.map((_,i)=>{
    const r = parsingSession.results[i];
    return `<div class="ps-dot ${r===true?'correct-dot':r===false?'wrong-dot':''}"></div>`;
  }).join('');
}

function revealParsingAnswer(){
  const idx = parsingSession.idx;
  const qn = parsingSession.questions[idx];
  if(!qn) return;
  const res = $('#parsingResult'); if(!res) return;
  res.className = 'parsing-result';
  res.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Answer: <span class="mono">${escHtml(qn.parse||'—')}</span></div>
    <div><strong>Correct:</strong> ${escHtml(correctParsingSummary(qn))}</div>
    <div class="small muted" style="margin-bottom:6px">${escHtml(parseSummary(qn))}</div>
    <div>Lemma: <span class="serif" style="font-size:16px">${escHtml(qn.lemma||'—')}</span></div>
    <div>Gloss: ${escHtml(qn.gloss||'—')}</div>
    <div style="font-weight:700;margin-top:8px">Explanation:</div>
    ${parsingExplanation(qn).map(line=>`<div class="small muted">${escHtml(line)}</div>`).join('')}
    <div class="self-grade">
      <button class="btn btn-primary btn-sm" id="markRevealedBtn">Got it</button>
      <button class="btn btn-ghost btn-sm" id="markMissedRevealedBtn">Missed it</button>
    </div>`;
  res.classList.remove('hidden');
  $('#parsingSubmit').classList.add('hidden');
  $('#parsingReveal').classList.add('hidden');
  pendingParsingResult = { grammarCorrect: true, correct: getParsingFields(qn).length, total: getParsingFields(qn).length };
  $('#nextParsing').classList.add('hidden');
  $('#finishParsing').classList.add('hidden');
  $('#markRevealedBtn')?.addEventListener('click',()=>finishParsingAnswer(true));
  $('#markMissedRevealedBtn')?.addEventListener('click',()=>finishParsingAnswer(false));
}
