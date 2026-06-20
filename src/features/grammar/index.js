/* ---------- Grammar & Reference Library UI ---------- */
function escapeReferenceHtml(value){ return (typeof escHtml === 'function') ? escHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function referenceApi(){ return (typeof PuritanReferenceLibrary !== 'undefined') ? PuritanReferenceLibrary : null; }
function selectedReferenceLanguage(){ return $('#referenceLanguageFilter')?.value || 'all'; }
function selectedReferenceTopicId(){ return $('#referenceTopicList .reference-topic-btn.active')?.dataset.topicId || referenceApi()?.referenceTopics?.[0]?.id; }
function referenceColorClass(color){ return color ? ` reference-color-${escapeReferenceHtml(color)}` : ''; }
function renderReferenceCell(cell){
  if(cell && typeof cell === 'object'){
    const label = cell.label || cell.text || '';
    const note = cell.note ? `<small>${escapeReferenceHtml(cell.note)}</small>` : '';
    return `<span>${escapeReferenceHtml(label)}</span>${note}`;
  }
  return escapeReferenceHtml(cell);
}
function renderReferenceLibrary(topicId){
  const api = referenceApi(); if(!api) return;
  const query = $('#referenceSearchInput')?.value || '';
  const language = selectedReferenceLanguage();
  const results = api.searchReferenceTopics(query, language);
  const list = $('#referenceTopicList');
  if(list){
    list.innerHTML = results.map(t => `<button class="reference-topic-btn${referenceColorClass(t.color)}" data-topic-id="${escapeReferenceHtml(t.id)}"><span>${escapeReferenceHtml(t.title)}</span><small>${escapeReferenceHtml(t.language)} · ${escapeReferenceHtml(t.category)}</small></button>`).join('') || '<div class="empty-state small muted">No reference topics match your search.</div>';
    $$('.reference-topic-btn', list).forEach(btn => btn.addEventListener('click', () => renderReferenceLibrary(btn.dataset.topicId)));
  }
  const chosen = api.getReferenceTopic(topicId) || results[0] || api.referenceTopics[0];
  $$('.reference-topic-btn', list || document).forEach(btn => btn.classList.toggle('active', btn.dataset.topicId === chosen?.id));
  renderReferenceTopic(chosen);
}
function renderReferenceTopic(topic){
  const api = referenceApi(); const page = $('#referencePage'); if(!api || !page || !topic) return;
  const chartHtml = (topic.charts || []).map(chart => `<section class="reference-section reference-chart${referenceColorClass(chart.color || topic.color)}">${chart.heading ? `<h4>${escapeReferenceHtml(chart.heading)}</h4>` : ''}<h3>${escapeReferenceHtml(chart.label)}</h3>${chart.note ? `<p class="reference-note">${escapeReferenceHtml(chart.note)}</p>` : ''}<div class="table-wrap"><table class="reference-table"><thead><tr>${(chart.columns||[]).map(c=>`<th>${escapeReferenceHtml(c)}</th>`).join('')}</tr></thead><tbody>${(chart.rows||[]).map(row=>`<tr>${row.map(cell=>`<td>${renderReferenceCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('');
  const examples = (topic.examples || []).map(e => `<li><span class="reference-example-text">${escapeReferenceHtml(e.word || e.text)}</span><span>${escapeReferenceHtml(e.reference || '')}${e.reference && e.translation ? ' — ' : ''}${escapeReferenceHtml(e.translation || e.note || '')}</span>${e.note && e.translation ? `<small>${escapeReferenceHtml(e.note)}</small>` : ''}</li>`).join('');
  const tips = (topic.recognitionTips || []).map(tip => `<li>${escapeReferenceHtml(tip)}</li>`).join('');
  const parts = (topic.principalParts || []).map((part, index) => `<li><span>Part ${index + 1}</span><strong>${escapeReferenceHtml(part)}</strong></li>`).join('');
  const stems = topic.stemRelationships ? `<section class="reference-section"><h3>Stem relationships</h3><p><strong>${escapeReferenceHtml(topic.stemRelationships.root)}</strong>: ${escapeReferenceHtml((topic.stemRelationships.stems||[]).join(' → '))}</p><ul>${(topic.stemRelationships.explanation||[]).map(x=>`<li>${escapeReferenceHtml(x)}</li>`).join('')}</ul></section>` : '';
  const featureLinks = (topic.featureLinks || []).map(link => `<a class="reference-link reference-feature-link" href="#" data-reference-hook="${escapeReferenceHtml(link.type)}" data-reference-target="${escapeReferenceHtml(link.target)}">${escapeReferenceHtml(link.label)}</a>`).join('');
  const related = (topic.related || []).map(id => api.getReferenceTopic(id) ? `<button class="reference-link" data-topic-id="${escapeReferenceHtml(id)}">${escapeReferenceHtml(api.topicLabel(id))}</button>` : '').join('');
  page.innerHTML = `<article class="reference-article${referenceColorClass(topic.color)}"><div class="reference-kicker">${escapeReferenceHtml(topic.language)} · ${escapeReferenceHtml(topic.category)}</div><h2>${escapeReferenceHtml(topic.title)}</h2><p class="reference-summary">${escapeReferenceHtml(topic.summary)}</p>${topic.frequency ? `<div class="reference-frequency">${escapeReferenceHtml(topic.frequency)}</div>` : ''}${(topic.body||[]).map(p=>`<p>${escapeReferenceHtml(p)}</p>`).join('')}${tips ? `<section class="reference-section"><h3>Recognition tips</h3><ul class="reference-tips">${tips}</ul></section>` : ''}${parts ? `<section class="reference-section"><h3>Principal parts</h3><ol class="reference-principal-parts">${parts}</ol></section>` : ''}${stems}${chartHtml}${examples ? `<section class="reference-section"><h3>Biblical examples</h3><ul class="reference-examples">${examples}</ul></section>` : ''}${featureLinks ? `<section class="reference-section"><h3>Feature links</h3><div class="reference-related">${featureLinks}</div></section>` : ''}${related ? `<section class="reference-section"><h3>Related topics</h3><div class="reference-related">${related}</div></section>` : ''}</article>`;
  $$('.reference-link[data-topic-id]', page).forEach(btn => btn.addEventListener('click', () => renderReferenceLibrary(btn.dataset.topicId)));
}
function initReferenceLibrary(){
  if(!$('#referenceTopicList')) return;
  $('#referenceSearchInput')?.addEventListener('input', debounce(()=>renderReferenceLibrary(selectedReferenceTopicId()), 100));
  $('#referenceLanguageFilter')?.addEventListener('change', ()=>renderReferenceLibrary());
  renderReferenceLibrary();
}
