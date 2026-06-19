/* ---------- ReviewHistory model ---------- */
function createReviewHistory(attrs = {}){
  return {
    date: attrs.date || todayISO(),
    q: Number(attrs.q || attrs.quality || 0),
    type: attrs.type || 'vocab',
    grammarCorrect: attrs.grammarCorrect,
    lemmaKnown: attrs.lemmaKnown
  };
}
