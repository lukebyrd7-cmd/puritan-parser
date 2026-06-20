/* ---------- Grammar & Reference Library UI ---------- */
function escapeReferenceHtml(value){ return (typeof escHtml === 'function') ? escHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function referenceApi(){ return (typeof PuritanReferenceLibrary !== 'undefined') ? PuritanReferenceLibrary : null; }
function selectedReferenceLanguage(){ return $('#referenceLanguageFilter')?.value || 'all'; }
function selectedReferenceTopicId(){ return $('#referenceTopicList .reference-topic-btn.active')?.dataset.topicId || referenceApi()?.referenceTopics?.[0]?.id; }
function renderReferenceLibrary(topicId){
  const api = referenceApi(); if(!api) return;
  const query = $('#referenceSearchInput')?.value || '';
  const language = selectedReferenceLanguage();
  const results = api.searchReferenceTopics(query, language);
  const list = $('#referenceTopicList');
  if(list){
    list.innerHTML = results.map(t => `<button class="reference-topic-btn" data-topic-id="${escapeReferenceHtml(t.id)}"><span>${escapeReferenceHtml(t.title)}</span><small>${escapeReferenceHtml(t.language)} · ${escapeReferenceHtml(t.category)}</small></button>`).join('') || '<div class="empty-state small muted">No reference topics match your search.</div>';
    $$('.reference-topic-btn', list).forEach(btn => btn.addEventListener('click', () => renderReferenceLibrary(btn.dataset.topicId)));
  }
  const chosen = api.getReferenceTopic(topicId) || results[0] || api.referenceTopics[0];
  $$('.reference-topic-btn', list || document).forEach(btn => btn.classList.toggle('active', btn.dataset.topicId === chosen?.id));
  renderReferenceTopic(chosen);
}
function renderReferenceTopic(topic){
  const api = referenceApi(); const page = $('#referencePage'); if(!api || !page || !topic) return;
  const chartHtml = (topic.charts || []).map(chart => `<section class="reference-section"><h3>${escapeReferenceHtml(chart.label)}</h3><div class="table-wrap"><table class="reference-table"><thead><tr>${(chart.columns||[]).map(c=>`<th>${escapeReferenceHtml(c)}</th>`).join('')}</tr></thead><tbody>${(chart.rows||[]).map(row=>`<tr>${row.map(cell=>`<td>${escapeReferenceHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('');
  const examples = (topic.examples || []).map(e => `<li><span class="reference-example-text">${escapeReferenceHtml(e.text)}</span><span>${escapeReferenceHtml(e.note)}</span></li>`).join('');
  const related = (topic.related || []).map(id => api.getReferenceTopic(id) ? `<button class="reference-link" data-topic-id="${escapeReferenceHtml(id)}">${escapeReferenceHtml(api.topicLabel(id))}</button>` : '').join('');
  page.innerHTML = `<article class="reference-article"><div class="reference-kicker">${escapeReferenceHtml(topic.language)} · ${escapeReferenceHtml(topic.category)}</div><h2>${escapeReferenceHtml(topic.title)}</h2><p class="reference-summary">${escapeReferenceHtml(topic.summary)}</p>${(topic.body||[]).map(p=>`<p>${escapeReferenceHtml(p)}</p>`).join('')}${chartHtml}${examples ? `<section class="reference-section"><h3>Examples</h3><ul class="reference-examples">${examples}</ul></section>` : ''}${related ? `<section class="reference-section"><h3>Related topics</h3><div class="reference-related">${related}</div></section>` : ''}</article>`;
  $$('.reference-link', page).forEach(btn => btn.addEventListener('click', () => renderReferenceLibrary(btn.dataset.topicId)));
}
function initReferenceLibrary(){
  if(!$('#referenceTopicList')) return;
  $('#referenceSearchInput')?.addEventListener('input', debounce(()=>renderReferenceLibrary(selectedReferenceTopicId()), 100));
  $('#referenceLanguageFilter')?.addEventListener('change', ()=>renderReferenceLibrary());
  renderReferenceLibrary();
}
