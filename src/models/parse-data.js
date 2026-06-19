/* ---------- ParseData model ---------- */
function createParseData(input = {}){
  return {
    family: input.family || '',
    tense: input.tense || '',
    voice: input.voice || '',
    mood: input.mood || '',
    case: input.case || '',
    number: input.number || '',
    gender: input.gender || '',
    state: input.state || '',
    stem: input.stem || '',
    person: input.person || ''
  };
}
