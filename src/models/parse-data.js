/* ---------- ParseData model ---------- */
function createParseData(attrs = {}){
  return {
    code: attrs.code || attrs.parse || '',
    lang: attrs.lang || 'greek',
    family: attrs.family || '',
    details: Array.isArray(attrs.details) ? attrs.details : [],
    label: attrs.label || ''
  };
}
