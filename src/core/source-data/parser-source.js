/* ---------- Parser source data ---------- */
function parseSourceSummary(parse, lang){
  if(!ParserCore.decodeParse) return parse || '—';
  return ParserCore.decodeParse(parse, lang).summary || parse || '—';
}
