/* ---------- Parser source data ---------- */
function decodeParserSource(parse, lang){
  const decoded = ParserCore.decodeParse ? ParserCore.decodeParse(parse, lang) : {};
  return createParseData(Object.assign({ code: parse, lang }, decoded));
}
