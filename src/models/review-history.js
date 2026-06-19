/* ---------- ReviewHistory model ---------- */
function createReviewHistory(input = {}){
  return {
    date: input.date || todayISO(),
    q: input.q ?? input.quality ?? null,
    quality: input.quality ?? input.q ?? null,
    reviewType: input.reviewType || input.type || 'vocab',
    parsingResult: input.parsingResult || null
  };
}
