/* ---------- Grammar & Reference Library Data ---------- */
(function(root){
  const COLORS = {};
  const ex = (word, reference, translation, note='') => ({ word, reference, translation, note });
  const chart = (label, columns, rows, options={}) => ({ label, columns, rows, ...options });
  const featureLinks = (...links) => links.map(([label, type, target]) => ({ label, type, target }));
  const greekVerbChart = chart('λύω present active indicative endings', ['Person','Singular','Plural','Recognition clue'], [['1st','λύω','λύομεν','ω / μεν'],['2nd','λύεις','λύετε','εις / τε'],['3rd','λύει','λύουσι(ν)','ει / ουσι']], { color:'tense', note:'Representative omega-verb forms; accents and movable nu may vary.' });
  const hebrewStemRows = [['Perfect','כָּתַב','completed/simple action'],['Imperfect','יִכְתֹּב','prefixed imperfect form'],['Imperative','כְּתֹב','command form'],['Infinitive Construct','כְּתֹב','verbal noun, often with לְ'],['Infinitive Absolute','כָּתוֹב','intensifying or verbal noun use'],['Participle','כֹּתֵב','verbal adjective/ongoing action']];
  const stemInfo = {
    Qal:['simple active/stative','קָטַל','basic lexical action'], Niphal:['passive/reflexive of Qal','נִקְטַל','often has נ or assimilated nun'], Piel:['intensive/factitive active','קִטֵּל','doubled middle radical'], Pual:['passive of Piel','קֻטַּל','u-class vowel with doubling'], Hiphil:['causative active','הִקְטִיל','prefixed הִ and causative sense'], Hophal:['passive of Hiphil','הָקְטַל','ho/ha class causative passive'], Hitpael:['reflexive/reciprocal','הִתְקַטֵּל','הת prefix plus doubling']
  };
  const stemRelationships = ['Qal gives the simple lexical baseline for many roots.','Niphal commonly presents the Qal idea as passive or reflexive.','Piel and Pual often form an active/passive pair with intensified, factitive, or result-focused force.','Hiphil and Hophal often form a causative active/passive pair.','Hitpael commonly adds reflexive or reciprocal involvement.'];
  const hebrewStemTopic = stem => ({ id:`hebrew-${stem.toLowerCase()}`, language:'hebrew', title:`${stem} Paradigms`, category:`${stem} Paradigms`, color:stem.toLowerCase(), frequency: stem==='Qal' ? '≈ majority of Hebrew verbal forms' : stem==='Niphal' ? 'common major stem' : 'regular major stem; less frequent than Qal', summary:`${stem} is one of the major Biblical Hebrew verbal stems (binyanim).`, body:[stem==='Qal'?'Qal is the basic/light stem and often carries the simple lexical meaning of the verb.':`${stem} modifies the root idea in a conventional stem relationship; exact meaning depends on the root and context.`, ...stemRelationships], recognitionTips: stem==='Hiphil' ? ['Look for prefixed הִ in perfect and infinitive forms.','Expect causative meaning when the lexicon and context support it.','Characteristic i-class vowels often mark the stem.'] : [`Watch for the ${stemInfo[stem][1]} pattern.`, stemInfo[stem][2], 'Confirm the stem by both consonantal pattern and vowels.'], charts:[chart(`${stem} quick profile`, ['Stem','Typical value','Pattern','Recognition'], [[stem, stemInfo[stem][0], stemInfo[stem][1], stemInfo[stem][2]]], { color:stem.toLowerCase(), note:'Representative strong-verb pattern.' }), chart(`${stem} representative paradigm: כתב`, ['Form','Representative','Use'], hebrewRepresentativeRows(stem), { color:stem.toLowerCase() })], examples:[ex(stem==='Hiphil'?'הִכְתִּיב':'כָּתַב', stem==='Qal'?'Jeremiah 36:2':'Reference example', stem==='Qal'?'he wrote / write':'representative stem form', `sample ${stem} form`)], paradigmTabs:hebrewTabs(stem), breadcrumbs:['Grammar','Hebrew',`${stem} Paradigms`], stemRelationships:{ root:'כתב', stems:['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'], explanation:stemRelationships }, featureLinks:featureLinks(['See words with this feature','feature',stem],['See related vocabulary','vocabulary',stem],['See related topics','topics',`hebrew-${stem.toLowerCase()}`]), related:['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-pual','hebrew-hiphil','hebrew-hophal','hebrew-hitpael','hebrew-stem-markers'].filter(id=>id!==`hebrew-${stem.toLowerCase()}`) });

  const six = rows => rows;
  const greekFinite = (label, sg, pl) => chart(label, ['Person','Singular','Plural'], [['1st',sg[0],pl[0]],['2nd',sg[1],pl[1]],['3rd',sg[2],pl[2]]]);
  const greekImperative = (label, forms) => chart(label, ['Person','Singular','Plural'], [['2nd',forms[0],forms[2]],['3rd',forms[1],forms[3]]]);
  const greekInfinitive = (label, form) => chart(label, ['Form'], [[form]]);
  const greekParticiple = (label, rows) => chart(label, ['Case','Masculine','Feminine','Neuter'], rows);
  const greekLyoTabs = [
    { id:'present', label:'Present', charts:[
      greekFinite('Present Active Indicative',['λύω','λύεις','λύει'],['λύομεν','λύετε','λύουσι(ν)']),
      greekFinite('Present Middle/Passive Indicative',['λύομαι','λύῃ / λύει','λύεται'],['λυόμεθα','λύεσθε','λύονται']),
      greekFinite('Present Active Subjunctive',['λύω','λύῃς','λύῃ'],['λύωμεν','λύητε','λύωσι(ν)']),
      greekFinite('Present Middle/Passive Subjunctive',['λύωμαι','λύῃ','λύηται'],['λυώμεθα','λύησθε','λύωνται']),
      greekImperative('Present Active Imperative',['λῦε','λυέτω','λύετε','λυόντων']),
      greekImperative('Present Middle/Passive Imperative',['λύου','λυέσθω','λύεσθε','λυέσθων']),
      greekInfinitive('Present Active Infinitive','λύειν'), greekInfinitive('Present Middle/Passive Infinitive','λύεσθαι'),
      greekParticiple('Present Active Participle', [['Nom sg','λύων','λύουσα','λῦον'],['Gen sg','λύοντος','λυούσης','λύοντος'],['Nom pl','λύοντες','λύουσαι','λύοντα']]), greekParticiple('Present Middle/Passive Participle', [['Nom sg','λυόμενος','λυομένη','λυόμενον'],['Gen sg','λυομένου','λυομένης','λυομένου'],['Nom pl','λυόμενοι','λυόμεναι','λυόμενα']]) ]},
    { id:'imperfect', label:'Imperfect', charts:[greekFinite('Imperfect Active Indicative',['ἔλυον','ἔλυες','ἔλυε(ν)'],['ἐλύομεν','ἐλύετε','ἔλυον']), greekFinite('Imperfect Middle/Passive Indicative',['ἐλυόμην','ἐλύου','ἐλύετο'],['ἐλυόμεθα','ἐλύεσθε','ἐλύοντο'])]},
    { id:'future', label:'Future', charts:[greekFinite('Future Active Indicative',['λύσω','λύσεις','λύσει'],['λύσομεν','λύσετε','λύσουσι(ν)']), greekFinite('Future Middle Indicative',['λύσομαι','λύσῃ','λύσεται'],['λυσόμεθα','λύσεσθε','λύσονται']), greekFinite('Future Passive Indicative',['λυθήσομαι','λυθήσῃ','λυθήσεται'],['λυθησόμεθα','λυθήσεσθε','λυθήσονται'])]},
    { id:'aorist', label:'Aorist', charts:[
      greekFinite('Aorist Active Indicative',['ἔλυσα','ἔλυσας','ἔλυσε(ν)'],['ἐλύσαμεν','ἐλύσατε','ἔλυσαν']), greekFinite('Aorist Middle Indicative',['ἐλυσάμην','ἐλύσω','ἐλύσατο'],['ἐλυσάμεθα','ἐλύσασθε','ἐλύσαντο']), greekFinite('Aorist Passive Indicative',['ἐλύθην','ἐλύθης','ἐλύθη'],['ἐλύθημεν','ἐλύθητε','ἐλύθησαν']),
      greekFinite('Aorist Active Subjunctive',['λύσω','λύσῃς','λύσῃ'],['λύσωμεν','λύσητε','λύσωσι(ν)']), greekFinite('Aorist Middle Subjunctive',['λύσωμαι','λύσῃ','λύσηται'],['λυσώμεθα','λύσησθε','λύσωνται']), greekFinite('Aorist Passive Subjunctive',['λυθῶ','λυθῇς','λυθῇ'],['λυθῶμεν','λυθῆτε','λυθῶσι(ν)']),
      greekImperative('Aorist Active Imperative',['λῦσον','λυσάτω','λύσατε','λυσάντων']), greekImperative('Aorist Middle Imperative',['λῦσαι','λυσάσθω','λύσασθε','λυσάσθων']), greekImperative('Aorist Passive Imperative',['λύθητι','λυθήτω','λύθητε','λυθέντων']),
      greekInfinitive('Aorist Active Infinitive','λῦσαι'), greekInfinitive('Aorist Middle Infinitive','λύσασθαι'), greekInfinitive('Aorist Passive Infinitive','λυθῆναι'),
      greekParticiple('Aorist Active Participle', [['Nom sg','λύσας','λύσασα','λῦσαν'],['Gen sg','λύσαντος','λυσάσης','λύσαντος'],['Nom pl','λύσαντες','λύσασαι','λύσαντα']]), greekParticiple('Aorist Middle Participle', [['Nom sg','λυσάμενος','λυσαμένη','λυσάμενον'],['Gen sg','λυσαμένου','λυσαμένης','λυσαμένου'],['Nom pl','λυσάμενοι','λυσάμεναι','λυσάμενα']]), greekParticiple('Aorist Passive Participle', [['Nom sg','λυθείς','λυθεῖσα','λυθέν'],['Gen sg','λυθέντος','λυθείσης','λυθέντος'],['Nom pl','λυθέντες','λυθεῖσαι','λυθέντα']]) ]},
    { id:'perfect', label:'Perfect', charts:[greekFinite('Perfect Active Indicative',['λέλυκα','λέλυκας','λέλυκε(ν)'],['λελύκαμεν','λελύκατε','λελύκασι(ν)']), greekFinite('Perfect Middle/Passive Indicative',['λέλυμαι','λέλυσαι','λέλυται'],['λελύμεθα','λέλυσθε','λέλυνται']), greekInfinitive('Perfect Active Infinitive','λελυκέναι'), greekInfinitive('Perfect Middle/Passive Infinitive','λελύσθαι'), greekParticiple('Perfect Active Participle', [['Nom sg','λελυκώς','λελυκυῖα','λελυκός'],['Gen sg','λελυκότος','λελυκυίας','λελυκότος'],['Nom pl','λελυκότες','λελυκυῖαι','λελυκότα']]), greekParticiple('Perfect Middle/Passive Participle', [['Nom sg','λελυμένος','λελυμένη','λελυμένον'],['Gen sg','λελυμένου','λελυμένης','λελυμένου'],['Nom pl','λελυμένοι','λελυμέναι','λελυμένα']])]},
    { id:'pluperfect', label:'Pluperfect', charts:[greekFinite('Pluperfect Active Indicative',['ἐλελύκειν','ἐλελύκεις','ἐλελύκει'],['ἐλελύκεμεν','ἐλελύκετε','ἐλελύκεσαν']), greekFinite('Pluperfect Middle/Passive Indicative',['ἐλελύμην','ἐλέλυσο','ἐλέλυτο'],['ἐλελύμεθα','ἐλέλυσθε','ἐλέλυντο'])]},
    { id:'non-finite', label:'Infinitives & Participles', charts:[chart('Infinitive quick index',['Tense/Voice','Form'],[['Present Active','λύειν'],['Present Middle/Passive','λύεσθαι'],['Aorist Active','λῦσαι'],['Aorist Middle','λύσασθαι'],['Aorist Passive','λυθῆναι'],['Perfect Active','λελυκέναι'],['Perfect Middle/Passive','λελύσθαι']]), chart('Participle quick index',['Tense/Voice','Masc nom sg','Fem nom sg','Neut nom sg'],[['Present Active','λύων','λύουσα','λῦον'],['Present Middle/Passive','λυόμενος','λυομένη','λυόμενον'],['Aorist Active','λύσας','λύσασα','λῦσαν'],['Aorist Middle','λυσάμενος','λυσαμένη','λυσάμενον'],['Aorist Passive','λυθείς','λυθεῖσα','λυθέν'],['Perfect Active','λελυκώς','λελυκυῖα','λελυκός'],['Perfect Middle/Passive','λελυμένος','λελυμένη','λελυμένον']])]},
    { id:'principal-parts', label:'Principal Parts', charts:[chart('Principal parts', ['Part','Form'], [['Present','λύω'],['Future active','λύσω'],['Aorist active','ἔλυσα'],['Perfect active','λέλυκα'],['Perfect middle/passive','λέλυμαι'],['Aorist passive','ἐλύθην']])]}
  ];
  const hebPersons = ['3ms','3fs','2ms','2fs','1cs','3mp','3fp','2mp','2fp','1cp'];
  const hebrewForms = {
    Qal:{
      perfect:['כָּתַב','כָּתְבָה','כָּתַבְתָּ','כָּתַבְתְּ','כָּתַבְתִּי','כָּתְבוּ','כָּתְבוּ','כְּתַבְתֶּם','כְּתַבְתֶּן','כָּתַבְנוּ'],
      imperfect:['יִכְתֹּב','תִּכְתֹּב','תִּכְתֹּב','תִּכְתְּבִי','אֶכְתֹּב','יִכְתְּבוּ','תִּכְתֹּבְנָה','תִּכְתְּבוּ','תִּכְתֹּבְנָה','נִכְתֹּב'],
      imperative:['כְּתֹב','כִּתְבִי','כִּתְבוּ','כְּתֹבְנָה'],
      infinitiveConstruct:'כְּתֹב',
      infinitiveAbsolute:'כָּתוֹב',
      participles:[['masculine singular','כֹּתֵב'],['feminine singular','כֹּתֶבֶת'],['masculine plural','כֹּתְבִים'],['feminine plural','כֹּתְבוֹת']]
    },
    Niphal:{
      perfect:['נִכְתַּב','נִכְתְּבָה','נִכְתַּבְתָּ','נִכְתַּבְתְּ','נִכְתַּבְתִּי','נִכְתְּבוּ','נִכְתְּבוּ','נִכְתַּבְתֶּם','נִכְתַּבְתֶּן','נִכְתַּבְנוּ'],
      imperfect:['יִכָּתֵב','תִּכָּתֵב','תִּכָּתֵב','תִּכָּתְבִי','אִכָּתֵב','יִכָּתְבוּ','תִּכָּתַבְנָה','תִּכָּתְבוּ','תִּכָּתַבְנָה','נִכָּתֵב'],
      imperative:['הִכָּתֵב','הִכָּתְבִי','הִכָּתְבוּ','הִכָּתַבְנָה'],
      infinitiveConstruct:'הִכָּתֵב',
      infinitiveAbsolute:'נִכְתֹּב',
      participles:[['masculine singular','נִכְתָּב'],['feminine singular','נִכְתֶּבֶת'],['masculine plural','נִכְתָּבִים'],['feminine plural','נִכְתָּבוֹת']]
    },
    Piel:{
      perfect:['כִּתֵּב','כִּתְּבָה','כִּתַּבְתָּ','כִּתַּבְתְּ','כִּתַּבְתִּי','כִּתְּבוּ','כִּתְּבוּ','כִּתַּבְתֶּם','כִּתַּבְתֶּן','כִּתַּבְנוּ'],
      imperfect:['יְכַתֵּב','תְּכַתֵּב','תְּכַתֵּב','תְּכַתְּבִי','אֲכַתֵּב','יְכַתְּבוּ','תְּכַתֵּבְנָה','תְּכַתְּבוּ','תְּכַתֵּבְנָה','נְכַתֵּב'],
      imperative:['כַּתֵּב','כַּתְּבִי','כַּתְּבוּ','כַּתֵּבְנָה'],
      infinitiveConstruct:'כַּתֵּב',
      infinitiveAbsolute:'כַּתֵּב',
      participles:[['masculine singular','מְכַתֵּב'],['feminine singular','מְכַתֶּבֶת'],['masculine plural','מְכַתְּבִים'],['feminine plural','מְכַתְּבוֹת']]
    },
    Pual:{
      perfect:['כֻּתַּב','כֻּתְּבָה','כֻּתַּבְתָּ','כֻּתַּבְתְּ','כֻּתַּבְתִּי','כֻּתְּבוּ','כֻּתְּבוּ','כֻּתַּבְתֶּם','כֻּתַּבְתֶּן','כֻּתַּבְנוּ'],
      imperfect:['יְכֻתַּב','תְּכֻתַּב','תְּכֻתַּב','תְּכֻתְּבִי','אֲכֻתַּב','יְכֻתְּבוּ','תְּכֻתַּבְנָה','תְּכֻתְּבוּ','תְּכֻתַּבְנָה','נְכֻתַּב'],
      imperative:null,
      infinitiveConstruct:null,
      infinitiveAbsolute:'כֻּתֹּב',
      participles:[['masculine singular','מְכֻתָּב'],['feminine singular','מְכֻתֶּבֶת'],['masculine plural','מְכֻתָּבִים'],['feminine plural','מְכֻתָּבוֹת']]
    },
    Hiphil:{
      perfect:['הִכְתִּיב','הִכְתִּיבָה','הִכְתַּבְתָּ','הִכְתַּבְתְּ','הִכְתַּבְתִּי','הִכְתִּיבוּ','הִכְתִּיבוּ','הִכְתַּבְתֶּם','הִכְתַּבְתֶּן','הִכְתַּבְנוּ'],
      imperfect:['יַכְתִּיב','תַּכְתִּיב','תַּכְתִּיב','תַּכְתִּיבִי','אַכְתִּיב','יַכְתִּיבוּ','תַּכְתֵּבְנָה','תַּכְתִּיבוּ','תַּכְתֵּבְנָה','נַכְתִּיב'],
      imperative:['הַכְתֵּב','הַכְתִּיבִי','הַכְתִּיבוּ','הַכְתֵּבְנָה'],
      infinitiveConstruct:'הַכְתִּיב',
      infinitiveAbsolute:'הַכְתֵּב',
      participles:[['masculine singular','מַכְתִּיב'],['feminine singular','מַכְתִּיבָה'],['masculine plural','מַכְתִּיבִים'],['feminine plural','מַכְתִּיבוֹת']]
    },
    Hophal:{
      perfect:['הָכְתַּב','הָכְתְּבָה','הָכְתַּבְתָּ','הָכְתַּבְתְּ','הָכְתַּבְתִּי','הָכְתְּבוּ','הָכְתְּבוּ','הָכְתַּבְתֶּם','הָכְתַּבְתֶּן','הָכְתַּבְנוּ'],
      imperfect:['יָכְתַּב','תָּכְתַּב','תָּכְתַּב','תָּכְתְּבִי','אָכְתַּב','יָכְתְּבוּ','תָּכְתַּבְנָה','תָּכְתְּבוּ','תָּכְתַּבְנָה','נָכְתַּב'],
      imperative:null,
      infinitiveConstruct:null,
      infinitiveAbsolute:'הָכְתֵּב',
      participles:[['masculine singular','מָכְתָּב'],['feminine singular','מָכְתֶּבֶת'],['masculine plural','מָכְתָּבִים'],['feminine plural','מָכְתָּבוֹת']]
    },
    Hitpael:{
      perfect:['הִתְכַּתֵּב','הִתְכַּתְּבָה','הִתְכַּתַּבְתָּ','הִתְכַּתַּבְתְּ','הִתְכַּתַּבְתִּי','הִתְכַּתְּבוּ','הִתְכַּתְּבוּ','הִתְכַּתַּבְתֶּם','הִתְכַּתַּבְתֶּן','הִתְכַּתַּבְנוּ'],
      imperfect:['יִתְכַּתֵּב','תִּתְכַּתֵּב','תִּתְכַּתֵּב','תִּתְכַּתְּבִי','אֶתְכַּתֵּב','יִתְכַּתְּבוּ','תִּתְכַּתֵּבְנָה','תִּתְכַּתְּבוּ','תִּתְכַּתֵּבְנָה','נִתְכַּתֵּב'],
      imperative:['הִתְכַּתֵּב','הִתְכַּתְּבִי','הִתְכַּתְּבוּ','הִתְכַּתֵּבְנָה'],
      infinitiveConstruct:'הִתְכַּתֵּב',
      infinitiveAbsolute:'הִתְכַּתֵּב',
      participles:[['masculine singular','מִתְכַּתֵּב'],['feminine singular','מִתְכַּתֶּבֶת'],['masculine plural','מִתְכַּתְּבִים'],['feminine plural','מִתְכַּתְּבוֹת']]
    }
  };
  const noForm = note => ({ label:'Needs review', note });
  const hebrewTabRows = value => value ? [[value]] : [[noForm('No strong-form command/infinitive supplied for this passive stem; verify in Phase B.')]];
  const representativeForm = value => value || noForm('No representative strong form supplied; verify before using in drills.');
  const hebrewRepresentativeRows = stem => {
    const forms = hebrewForms[stem];
    return hebrewStemRows.map(([label,, use]) => {
      const representative = {
        Perfect: forms.perfect[0],
        Imperfect: forms.imperfect[0],
        Imperative: forms.imperative?.[0],
        'Infinitive Construct': forms.infinitiveConstruct,
        'Infinitive Absolute': forms.infinitiveAbsolute,
        Participle: forms.participles?.[0]?.[1]
      }[label];
      return [label, representativeForm(representative), use];
    });
  };
  const hebrewTabs = stem => {
    const forms = hebrewForms[stem];
    return [
      {id:'perfect',label:'Perfect',charts:[chart(`${stem} Perfect: כתב`, ['Person',...hebPersons], [['Form',...forms.perfect]])]},
      {id:'imperfect',label:'Imperfect',charts:[chart(`${stem} Imperfect: כתב`, ['Person',...hebPersons], [['Form',...forms.imperfect]])]},
      {id:'imperative',label:'Imperative',charts:[chart(`${stem} Imperative`, ['2ms','2fs','2mp','2fp'], [forms.imperative ? ['Form',...forms.imperative] : ['Form', noForm('Passive stems do not normally supply a standard imperative paradigm here.'), noForm('Phase B scholarly review'), noForm('Phase B scholarly review'), noForm('Phase B scholarly review')]])]},
      {id:'infinitive-construct',label:'Infinitive Construct',charts:[chart(`${stem} Infinitive Construct`, ['Form'], hebrewTabRows(forms.infinitiveConstruct))]},
      {id:'infinitive-absolute',label:'Infinitive Absolute',charts:[chart(`${stem} Infinitive Absolute`, ['Form'], hebrewTabRows(forms.infinitiveAbsolute))]},
      {id:'participles',label:'Participles',charts:[chart(`${stem} Participles`, ['Gender/Number','Form'], forms.participles)]},
      {id:'recognition',label:'Recognition',charts:[chart(`${stem} recognition`, ['Clue','Tip'], [[stemInfo[stem][1], stemInfo[stem][2]],['Root','כתב'],['Audit status','Strong representative forms corrected for Phase A; full scholarly verification is a Phase B gate.']])]}
    ];
  };
  const decoderEntries = {
    'V-PAI-3S': { breakdown:['Verb','Present Active Indicative','3rd singular'], tips:['Look for present stem plus active ending.'], examples:['λύει'], related:['greek-lyo-paradigm','greek-verb-endings'] },
    'V-API-3S': { breakdown:['Verb','Aorist Passive Indicative','3rd singular'], tips:['Augment plus θη commonly marks aorist passive.'], examples:['ἐλύθη'], related:['greek-lyo-paradigm','greek-common-parsing-clues'] },
    'V-AAI-1P': { breakdown:['Verb','Aorist Active Indicative','1st plural'], tips:['Augment plus σα often marks first aorist.'], examples:['ἐλύσαμεν'], related:['greek-lyo-paradigm','greek-common-parsing-clues'] },
    'N-GSM': { breakdown:['Noun','Genitive Singular Masculine'], tips:['ου is a common second-declension genitive clue.'], examples:['λόγου'], related:['greek-logos-paradigm','greek-noun-endings'] },
    'A-NSF': { breakdown:['Adjective','Nominative Singular Feminine'], tips:['Adjectives agree with nouns they modify.'], examples:['καλή'], related:['greek-kalos-paradigm'] },
    'QAL PERFECT 3MS': { breakdown:['Qal stem','Perfect conjugation','3ms'], tips:['Basic stem; perfect 3ms is often the lexical baseline.'], examples:['כָּתַב'], related:['hebrew-qal'] },
    'HIPHIL IMPERFECT 2MP': { breakdown:['Hiphil stem','Imperfect conjugation','2mp'], tips:['Look for causative ה/י pattern and 2mp ending וּ.'], examples:['תַּכְתִּיבוּ'], related:['hebrew-hiphil','hebrew-prefixes'] }
  };

  const topics = [
    { id:'grammar-parsing-decoder', language:'greek', title:'Parsing Guide', category:'Tools', summary:'Static lookup for common Greek and Hebrew parsing codes.', body:[], recognitionTips:['Search for parsing guide when you need to interpret a parsing code.'], charts:[], examples:[ex('V-AAI-1P','Parsing code','Aorist active indicative, first plural'), ex('Hiphil Imperfect 2mp','Parsing code','Hiphil imperfect, second masculine plural')], related:['greek-common-parsing-clues','greek-verb-endings','hebrew-stem-markers'] },
    { id:'greek-articles', language:'greek', title:'Article Paradigms', category:'Article Paradigms', summary:'The Greek article marks case, number, and gender and often identifies a noun as definite or previously known.', body:['Articles are parsing anchors: parse the article and you often know the nearby noun pattern.'], recognitionTips:['ὁ/οἱ often point to masculine nominative forms.','τοῦ/τῶν are strong genitive clues.','τό can be nominative or accusative neuter singular.'], charts:[chart('Greek article chart', ['Case','Masculine','Feminine','Neuter'], [['Nom sg','ὁ','ἡ','τό'],['Gen sg','τοῦ','τῆς','τοῦ'],['Dat sg','τῷ','τῇ','τῷ'],['Acc sg','τόν','τήν','τό'],['Nom pl','οἱ','αἱ','τά'],['Gen pl','τῶν','τῶν','τῶν'],['Dat pl','τοῖς','ταῖς','τοῖς'],['Acc pl','τούς','τάς','τά']], { color:'blue', note:'The article agrees with its noun.' })], examples:[ex('ὁ λόγος','John 1:1','the Word'), ex('τὰ ἔργα','James 2:18','the works')], related:['greek-logos-paradigm','greek-noun-endings','greek-pronouns'] },
    { id:'greek-pronouns', language:'greek', title:'Pronoun Paradigms', category:'Pronoun Paradigms', summary:'Pronouns replace or point to nouns and are parsed for case, number, gender, and sometimes person.', body:['Pronouns must be read in context because their antecedent may be nearby or implied.'], recognitionTips:['αὐτός may function as he/she/it, self, or same.','Relative pronouns often introduce dependent clauses.'], charts:[chart('Personal pronouns', ['Person','Nominative','Genitive','Accusative'], [['1 sg','ἐγώ','μου / ἐμοῦ','με / ἐμέ'],['2 sg','σύ','σου / σοῦ','σε / σέ'],['3 masc sg','αὐτός','αὐτοῦ','αὐτόν']])], examples:[ex('αὐτός','Matthew 1:21','he'), ex('ἐγώ','John 8:32','I')], related:['greek-articles','greek-noun-endings'] },
    { id:'greek-verb-overview', language:'greek', title:'Verb overview', category:'Verbs', summary:'Greek verbs communicate action or state through tense-form, voice, mood, person, and number.', body:['Start with tense-form, voice, and mood, then confirm person and number from endings.'], recognitionTips:['Personal endings carry person and number.','Augment often points to past indicative forms.','Connecting vowels often appear before endings.'], charts:[chart('Main parsing categories', ['Category','Question'], [['Tense-form','What viewpoint/time?'],['Voice','How is the subject related?'],['Mood','How is the action presented?']], { color:'tense' }), greekVerbChart], examples:[ex('λύω','John 8:32','I release / loose'), ex('λέγω','Matthew 5:37','I say')], related:['greek-tense-explanations','greek-voice-explanations','greek-mood-explanations','greek-lyo-paradigm','greek-verb-endings'] },
    { id:'greek-tense-explanations', language:'greek', title:'Tense explanations', category:'Verbs', color:'tense', frequency:'Present and aorist are very common tense-forms.', summary:'Greek tense-forms combine aspect with time most clearly in the indicative mood.', body:['Present/imperfect usually present imperfective aspect; aorist usually presents perfective aspect; perfect emphasizes a resulting state.'], recognitionTips:['Present often uses the present stem plus primary endings.','Aorist often has augment and σα or second-aorist stem changes.'], charts:[chart('Greek tense-form overview', ['Tense-form','Typical force'], [['Present','ongoing/imperfective'],['Imperfect','past ongoing'],['Aorist','summary/perfective'],['Perfect','completed with result'],['Future','future-oriented']], { color:'tense' })], examples:[ex('λύω','John 8:32','I release'), ex('λέγω','Matthew 5:37','I say')], related:['greek-verb-overview','greek-voice-explanations','greek-mood-explanations'] },
    { id:'greek-voice-explanations', language:'greek', title:'Voice explanations', category:'Verbs', color:'voice', summary:'Voice describes the subject’s relationship to the action.', body:['Active presents the subject acting; passive presents the subject acted upon; middle highlights subject involvement.'], recognitionTips:['μαι/σαι/ται endings often mark middle/passive forms.','θη often points to aorist passive.'], charts:[chart('Voice overview', ['Voice','Basic idea'], [['Active','subject acts'],['Middle','subject participates'],['Passive','subject receives action']], { color:'voice' })], examples:[ex('λύεται','Mark 7:35','is loosed/opened'), ex('ἐλήμφθην','Representative','I was taken')], related:['greek-verb-overview','greek-tense-explanations','greek-mood-explanations'] },
    { id:'greek-mood-explanations', language:'greek', title:'Mood explanations', category:'Verbs', color:'mood', frequency:'Indicative mood ≈ most finite verbs.', summary:'Mood presents action as assertion, possibility, command, verbal idea, or adjectival verbal form.', body:['Indicative states or asks; subjunctive often presents potential/purpose; imperative commands.'], recognitionTips:['ωμεν/ητε can mark subjunctive endings.','Imperatives often lack an explicit subject.'], charts:[chart('Mood overview', ['Mood','Common use'], [['Indicative','statement/question'],['Subjunctive','potential/purpose'],['Imperative','command'],['Infinitive','verbal noun'],['Participle','verbal adjective']], { color:'mood' })], examples:[ex('λέγει','Matthew 5:37','he says'), ex('πιστεύωμεν','Representative','let us believe')], related:['greek-verb-overview','greek-tense-explanations','greek-voice-explanations'] },
    { id:'greek-noun-endings', language:'greek', title:'Greek Cheat Sheets', category:'Cheat sheets', summary:'Common noun endings help students recognize case and number quickly.', body:['Use endings as clues, then confirm with article, adjective agreement, and context.'], recognitionTips:['ος → often nominative masculine singular.','ου → often genitive singular.','οι → often nominative masculine plural.','ον → often accusative masculine singular or neuter nominative/accusative singular.'], charts:[chart('Common noun ending clues', ['Ending','Likely parse','Example'], [['ος','nominative masculine singular','λόγος'],['ου','genitive singular','λόγου'],['ῳ','dative singular','λόγῳ'],['ον','accusative masculine singular','λόγον'],['οι','nominative masculine plural','λόγοι']])], examples:[ex('λόγος','John 1:1','word'), ex('λόγου','John 1:14','of a word / word')], related:['greek-logos-paradigm','greek-articles'] },
    { id:'greek-verb-endings', language:'greek', title:'Verb endings cheat sheet', category:'Cheat sheets', summary:'Common verb endings give quick person, number, voice, and mood clues.', body:['Endings are pattern-recognition aids, not a substitute for context.'], recognitionTips:['ω endings often mark first singular active.','ει endings often mark third singular active.','ουσι endings often mark third plural active.'], charts:[greekVerbChart], examples:[ex('λύω','John 8:32','I release'), ex('λέγω','Matthew 5:37','I say')], related:['greek-lyo-paradigm','greek-verb-overview'] },
    { id:'greek-common-parsing-clues', language:'greek', title:'Common parsing clues', category:'Cheat sheets', summary:'A compact checklist for recognizing common Greek forms.', body:['Look for articles, augments, endings, stem changes, and prepositional contexts.'], recognitionTips:['Augment ε often points to past indicative.','θη often points to passive.','σ before endings may signal future or first aorist.'], charts:[chart('Parsing clue checklist', ['Clue','Often indicates'], [['ε augment','past indicative'],['θη','aorist passive'],['σ + ending','future or first aorist'],['μαι/σαι/ται','middle/passive']])], examples:[ex('ἐλήμφθην','Representative','I was taken')], related:['greek-tense-explanations','greek-voice-explanations'] },
    { id:'greek-lyo-paradigm', language:'greek', title:'Verb Paradigms', category:'Verb Paradigms', summary:'Representative Greek omega-verb paradigm with principal parts.', body:['This is an educational reference page for recognizing regular omega-verb patterns.'], principalParts:['λύω','λύσω','ἔλυσα','λέλυκα','λέλυμαι','ἐλύθην'], paradigmTabs:greekLyoTabs, breadcrumbs:['Grammar','Greek','Verb Paradigms'], recognitionTips:['Present active indicative uses ω, εις, ει, ομεν, ετε, ουσι.','Middle/passive forms often use μαι endings.'], charts:[greekVerbChart, chart('Principal parts', ['Part','Form'], [['Present','λύω'],['Future active','λύσω'],['Aorist active','ἔλυσα'],['Perfect active','λέλυκα'],['Perfect middle/passive','λέλυμαι'],['Aorist passive','ἐλύθην']])], examples:[ex('λύω','John 8:32','I release / loose')], related:['greek-verb-endings','greek-verb-overview'] },
    { id:'greek-logos-paradigm', language:'greek', title:'Noun Paradigms', category:'Noun Paradigms', summary:'Representative second-declension masculine noun paradigm.', body:['λόγος illustrates many common second-declension noun endings.'], recognitionTips:['ος is a common nominative singular ending.','ου is a common genitive singular ending.'], breadcrumbs:['Grammar','Greek','Noun Paradigms'], charts:[chart('λόγος noun paradigm', ['Case','Singular','Plural'], [['Nominative','λόγος','λόγοι'],['Genitive','λόγου','λόγων'],['Dative','λόγῳ','λόγοις'],['Accusative','λόγον','λόγους'],['Vocative','λόγε','λόγοι']])], examples:[ex('λόγος','John 1:1','word')], related:['greek-noun-endings','greek-articles'] },
    { id:'greek-kalos-paradigm', language:'greek', title:'Adjective Paradigms', category:'Adjective Paradigms', summary:'Representative 2-1-2 adjective paradigm.', body:['καλός illustrates adjective agreement across masculine, feminine, and neuter forms.'], recognitionTips:['Adjectives agree with nouns in case, number, and gender.','Neuter nominative and accusative forms often match.'], breadcrumbs:['Grammar','Greek','Adjective Paradigms'], charts:[chart('καλός masculine', ['Case','Singular','Plural'], [['Nominative','καλός','καλοί'],['Genitive','καλοῦ','καλῶν'],['Dative','καλῷ','καλοῖς'],['Accusative','καλόν','καλούς']]), chart('καλή feminine', ['Case','Singular','Plural'], [['Nominative','καλή','καλαί'],['Genitive','καλῆς','καλῶν'],['Dative','καλῇ','καλαῖς'],['Accusative','καλήν','καλάς']]), chart('καλόν neuter', ['Case','Singular','Plural'], [['Nominative','καλόν','καλά'],['Genitive','καλοῦ','καλῶν'],['Dative','καλῷ','καλοῖς'],['Accusative','καλόν','καλά']])], examples:[ex('καλός','John 10:11','good')], related:['greek-articles','greek-noun-endings'] },
    { id:'hebrew-pronouns', language:'hebrew', title:'Pronouns', category:'Nominals', summary:'Hebrew pronouns mark person, gender, and number and may stand alone or attach as suffixes.', body:['Independent pronouns often supply emphasis or serve as subjects in verbless clauses.'], recognitionTips:['הוּא is 3ms; הִיא is 3fs.','Suffixes attach to nouns, prepositions, and verbs.'], charts:[chart('Independent pronouns', ['Person','Singular','Plural'], [['1 common','אֲנִי / אָנֹכִי','אֲנַחְנוּ'],['2 masculine','אַתָּה','אַתֶּם'],['2 feminine','אַתְּ','אַתֶּן'],['3 masculine','הוּא','הֵם'],['3 feminine','הִיא','הֵנָּה']])], examples:[ex('אֲנִי','Exodus 20:2','I'), ex('הוּא','Genesis 2:11','it / he')], related:['hebrew-suffixes','hebrew-noun-basics'] },
    { id:'hebrew-noun-basics', language:'hebrew', title:'Noun patterns / noun basics', category:'Nominals', summary:'Hebrew nouns have gender, number, and state; construct chains are central to noun syntax.', body:['The construct state links one noun closely to a following noun, often translated with “of.”'], recognitionTips:['־ִים often marks masculine plural.','־וֹת often marks feminine plural.','Construct nouns are bound closely to the following noun.'], charts:[chart('Noun pattern clues', ['Feature','Common marker'], [['Masculine plural','־ִים'],['Feminine singular','־ָה / ־ת'],['Feminine plural','־וֹת'],['Construct','bound form before another noun']])], examples:[ex('דְּבַר יְהוָה','Jeremiah 1:2','word of YHWH'), ex('סוּסִים','Representative','horses')], related:['hebrew-pronouns','hebrew-suffixes'] },
    { id:'hebrew-prefixes', language:'hebrew', title:'Prefixes cheat sheet', category:'Cheat sheets', summary:'Common Hebrew prefixes help identify conjunctions, prepositions, articles, and verbal forms.', body:['Prefixes stack, so identify each element from left to right.'], recognitionTips:['וַי → wayyiqtol narrative form.','הִ → often Hiphil in the right verbal context.','לְ, בְּ, כְּ attach directly to words.'], charts:[chart('Common prefixes', ['Prefix','Recognition'], [['וַי','wayyiqtol'],['הִ','Hiphil clue'],['נִ','Niphal clue'],['הַ','article or interrogative depending context'],['לְ','to/for or infinitive marker']])], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said')], related:['hebrew-wayyiqtol','hebrew-stem-markers'] },
    { id:'hebrew-suffixes', language:'hebrew', title:'Suffixes cheat sheet', category:'Cheat sheets', summary:'Hebrew suffixes mark pronominal relationships and some verbal parsing information.', body:['Suffixes can show possession, objects, or verbal person/number/gender.'], recognitionTips:['וֹ often marks his/its on nouns.','תִּי often marks first common singular perfect.'], charts:[chart('Common suffix clues', ['Suffix','Often indicates'], [['וֹ','his/its'],['ךָ','your masculine singular'],['תִּי','I, perfect'],['וּ','they or plural marker depending form']])], examples:[ex('סוּסוֹ','Representative','his horse')], related:['hebrew-pronouns'] },
    { id:'hebrew-wayyiqtol', language:'hebrew', title:'Wayyiqtol recognition', category:'Cheat sheets', summary:'Wayyiqtol is a common Biblical Hebrew narrative sequence form.', body:['Wayyiqtol often advances narrative with “and he/they ...” in past-time contexts.'], recognitionTips:['וַי is the key visual clue.','Look for doubled prefix consonant when spelling allows.','Translate according to narrative context, not mechanically.'], charts:[chart('Wayyiqtol clues', ['Clue','Example'], [['וַי + imperfect','וַיֹּאמֶר'],['Narrative sequence','and he said / then he said']])], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said')], related:['hebrew-prefixes','hebrew-qal'] },
    { id:'hebrew-stem-markers', language:'hebrew', title:'Hebrew Cheat Sheets', category:'Cheat sheets', summary:'Quick recognition markers for the major Hebrew stems.', body:['Use consonants, vowels, and meaning together to identify a stem.'], recognitionTips:['נִ often points to Niphal.','Doubled middle radical often points to Piel/Pual/Hitpael.','הִ often points to Hiphil.'], charts:[chart('Stem marker overview', ['Stem','Marker','Typical relationship'], Object.entries(stemInfo).map(([s,v])=>[s,v[1],v[0]]))], examples:[ex('הִכְתִּיב','Representative','he caused to write')], related:['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-hiphil'] },
    ...['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'].map(hebrewStemTopic),
    { id:'hebrew-katav-stem-relationships', language:'hebrew', title:'כתב stem relationships', category:'Paradigms', summary:'A single-root overview showing how כתב relates across major Hebrew stems.', body:['This page compares stem relationships without generating forms dynamically.'], recognitionTips:['Start with the root consonants כ־ת־ב.','Then identify stem markers around the root.'], charts:[chart('כתב across stems', ['Stem','Relationship','Representative pattern'], Object.entries(stemInfo).map(([s,v])=>[s,v[0],v[1]]))], examples:[ex('אָמַר','Genesis 1:3','he said'), ex('כתב','Jeremiah 36:2','write')], stemRelationships:{ root:'כתב', stems:['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'], explanation:stemRelationships }, related:['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-pual','hebrew-hiphil','hebrew-hophal','hebrew-hitpael'] }
  ];


  const caseRows = [['Nominative','subject / predicate nominative'],['Genitive','of / from / possession'],['Dative','to / for / in / by'],['Accusative','direct object / extent'],['Vocative','direct address']];
  const greekCaseEndingTopics = [
    { id:'greek-case-endings', language:'greek', title:'Case Endings', category:'Case Endings', summary:'Gateway for Greek noun, article, adjective, and pronoun ending charts.', body:['Use this page as the category-first entry point for common Greek case-ending charts.'], recognitionTips:['Start with declension for nouns, then compare article, adjective, and pronoun agreement.','Use the related links below to jump directly to a specific ending family.'], charts:[chart('Case ending pages', ['Page','Use it for'], [['First Declension','mostly feminine α/η nouns'],['Second Declension','masculine and neuter ο-declension nouns'],['Third Declension Basics','frequent consonant-stem and irregular noun patterns'],['Article Endings','case-number-gender anchors'],['Adjective Endings','agreement checks'],['Pronoun Endings','personal, demonstrative, relative, and interrogative lookup']])], examples:[ex('τῆς γραφῆς','Representative','of the Scripture'), ex('τοῦ λόγου','Representative','of the word')], related:['greek-first-declension-endings','greek-second-declension-endings','greek-third-declension-basics','greek-article-endings','greek-adjective-endings','greek-pronoun-endings','greek-case-functions'] },
    { id:'greek-first-declension-endings', language:'greek', title:'First Declension', category:'Case Endings', summary:'Quick chart for common first-declension case endings, especially feminine nouns.', body:['Use this page as an ending lookup; fuller case functions live on the shared Case Functions page.'], recognitionTips:['η/α often marks nominative singular feminine.','ης/ας often marks genitive singular.','αι often marks nominative plural.'], charts:[chart('First declension endings', ['Case','Singular','Plural','Common clue'], [['Nominative','-η / -α','-αι','subject'],['Genitive','-ης / -ας','-ῶν','of'],['Dative','-ῃ / -ᾳ','-αις','to/for/in'],['Accusative','-ην / -αν','-ας','object'],['Vocative','-η / -α','-αι','address']])], examples:[ex('γραφή','2 Timothy 3:16','Scripture'), ex('δόξα','John 1:14','glory')], related:['greek-case-endings','greek-case-functions','greek-noun-endings','greek-article-endings'] },
    { id:'greek-second-declension-endings', language:'greek', title:'Second Declension', category:'Case Endings', summary:'Quick chart for common second-declension masculine and neuter endings.', body:[], recognitionTips:['ος is often nominative masculine singular.','ου is a strong genitive singular clue.','Neuter nominative and accusative match.'], charts:[chart('Second declension endings', ['Case','Masculine sg/pl','Neuter sg/pl','Common clue'], [['Nominative','-ος / -οι','-ον / -α','subject'],['Genitive','-ου / -ων','-ου / -ων','of'],['Dative','-ῳ / -οις','-ῳ / -οις','to/for/in'],['Accusative','-ον / -ους','-ον / -α','object'],['Vocative','-ε / -οι','-ον / -α','address']])], examples:[ex('λόγος','John 1:1','word'), ex('ἔργον','James 2:18','work')], related:['greek-case-endings','greek-case-functions','greek-noun-endings','greek-logos-paradigm'] },
    { id:'greek-third-declension-basics', language:'greek', title:'Third Declension Basics', category:'Case Endings', summary:'Concise third-declension lookup for frequent case endings and stem changes.', body:['Third declension nouns vary by stem, so identify the genitive singular and compare the article and context.'], recognitionTips:['Genitive singular -ος is the best anchor.','Dative plural often ends in -σι(ν).','Nominative singular may be irregular or bare stem.'], charts:[chart('Third declension basic endings', ['Case','Singular','Plural','Common clue'], [['Nominative','varies / -ς','-ες / -α','subject'],['Genitive','-ος','-ων','of'],['Dative','-ι','-σι(ν)','to/for/in'],['Accusative','-α / -ν','-ας / -α','object'],['Vocative','varies','-ες / -α','address']])], examples:[ex('σάρξ','John 1:14','flesh'), ex('ὄνομα','Matthew 1:21','name')], related:['greek-case-endings','greek-case-functions','greek-noun-endings','greek-article-endings'] },
    { id:'greek-article-endings', language:'greek', title:'Article Endings', category:'Article Paradigms', summary:'Dedicated article ending page for quick agreement checks.', body:['Articles are often the fastest way to confirm case, number, and gender.'], recognitionTips:['Parse the article before guessing a nearby noun.','τοῦ/τῶν are common genitive anchors.'], charts:[chart('Article endings', ['Case','Masculine sg/pl','Feminine sg/pl','Neuter sg/pl'], [['Nominative','ὁ / οἱ','ἡ / αἱ','τό / τά'],['Genitive','τοῦ / τῶν','τῆς / τῶν','τοῦ / τῶν'],['Dative','τῷ / τοῖς','τῇ / ταῖς','τῷ / τοῖς'],['Accusative','τόν / τούς','τήν / τάς','τό / τά'],['Vocative','—','—','—']])], examples:[ex('ὁ λόγος','John 1:1','the Word')], related:['greek-case-endings','greek-articles','greek-case-functions','greek-pronoun-endings'] },
    { id:'greek-adjective-endings', language:'greek', title:'Adjective Endings', category:'Adjective Paradigms', summary:'Common 2-1-2 adjective endings for agreement lookup.', body:['Adjectives agree with the nouns they modify in case, number, and gender.'], recognitionTips:['Find the noun or substantive use that controls agreement.','Neuter nominative and accusative forms often match.'], charts:[chart('Adjective endings', ['Case','Masculine sg/pl','Feminine sg/pl','Neuter sg/pl'], [['Nominative','-ος / -οι','-η / -αι','-ον / -α'],['Genitive','-ου / -ων','-ης / -ων','-ου / -ων'],['Dative','-ῳ / -οις','-ῃ / -αις','-ῳ / -οις'],['Accusative','-ον / -ους','-ην / -ας','-ον / -α'],['Vocative','-ε / -οι','-η / -αι','-ον / -α']])], examples:[ex('καλός','John 10:11','good')], related:['greek-case-endings','greek-kalos-paradigm','greek-case-functions','greek-article-endings'] },
    { id:'greek-pronoun-endings', language:'greek', title:'Pronoun Endings', category:'Pronoun Paradigms', summary:'Fast lookup for major Greek pronoun families.', body:['Pronouns are often small but decisive for tracking participants and clauses.'], recognitionTips:['Relative pronouns usually introduce a clause.','Demonstratives point near/far and agree with their referent.'], charts:[chart('Pronoun family index', ['Family','Key forms','Lookup page'], [['Personal','ἐγώ, σύ, αὐτός','Pronouns'],['Demonstrative','οὗτος, ἐκεῖνος','Pronouns'],['Relative','ὅς, ἥ, ὅ','Pronouns'],['Interrogative','τίς / τί','Pronouns']])], examples:[ex('ὅς','John 1:15','who'), ex('τίς','Matthew 21:10','who?')], related:['greek-case-endings','greek-pronouns','greek-case-functions','greek-article-endings'] }
  ];

  const futureGrammarHooks = [
    { id:'greek-mi-verbs-hook', language:'greek', sourceTopicId:'greek-verbs', sourceSectionId:'mi-verbs' },
    { id:'greek-irregular-verbs-hook', language:'greek', sourceTopicId:'greek-verbs', sourceSectionId:'irregular-verbs' },
    { id:'paradigm-recognition-source', language:'all', source:'referenceTopics', note:'Future Paradigm Recognition should consume reference topic sections and paradigmTabs rather than duplicate paradigm data.' }
  ];

  const grammarRefinements = [
    ...greekCaseEndingTopics,
    { id:'greek-case-functions', language:'greek', title:'Case Functions', category:'Shared Explanations', summary:'One shared page for common Greek case functions used by noun, article, adjective, and pronoun pages.', body:['Start with the form, then ask how the case functions in context. Avoid repeating these case summaries on every paradigm page.'], recognitionTips:['Articles and adjectives usually confirm a noun’s case.','Prepositions can narrow the likely case function.'], charts:[chart('Case function quick guide', ['Case','Frequent reading use'], caseRows)], examples:[ex('τοῦ θεοῦ','John 1:1','of God'), ex('τῷ κυρίῳ','Representative','to/for the Lord')], related:['greek-first-declension-endings','greek-second-declension-endings','greek-third-declension-basics','greek-article-endings'] },
    { id:'greek-participles', language:'greek', title:'Participles', category:'Verb Paradigms', summary:'Recognition patterns and common endings for Greek participles.', body:[], recognitionTips:['-ων/-ουσα/-ον often marks present active.','-μενος/-μενη/-μενον often marks middle/passive.','-σας/-σασα/-σαν marks many aorist active participles; -θείς often marks aorist passive.'], charts:[chart('Participle recognition patterns', ['Tense/Voice','Masc nom sg','Fem nom sg','Neut nom sg','Common clue'], [['Present active','λύων','λύουσα','λῦον','οντ / ουσα'],['Present middle/passive','λυόμενος','λυομένη','λυόμενον','μενος'],['Aorist active','λύσας','λύσασα','λῦσαν','σας'],['Aorist middle','λυσάμενος','λυσαμένη','λυσάμενον','σαμενος'],['Aorist passive','λυθείς','λυθεῖσα','λυθέν','θείς / θεν'],['Perfect active','λελυκώς','λελυκυῖα','λελυκός','κως / κοτ'],['Perfect middle/passive','λελυμένος','λελυμένη','λελυμένον','μενος with reduplication']])], examples:[ex('λέγων','Matthew 3:2','saying'), ex('γεγραμμένον','Matthew 4:4','written')], related:['greek-lyo-paradigm','greek-voice-explanations','greek-case-functions'] },
    { id:'greek-contract-verbs', language:'greek', title:'Contract Verbs', category:'Verb Paradigms', summary:'Recognition tips for alpha, epsilon, and omicron contract verbs.', body:[], recognitionTips:['Alpha contracts often show ᾶ/ᾳ forms.','Epsilon contracts often show ει or ου after contraction.','Omicron contracts often show ου/οι forms.'], charts:[chart('Contract verb clues', ['Type','Representative','Common contracted clue'], [['Alpha contract','ἀγαπάω → ἀγαπῶ','α + ω/εις contracts'],['Epsilon contract','ποιέω → ποιῶ','ε + ο often → ου'],['Omicron contract','δηλόω → δηλῶ','ο + ο/ε often → ου/οι']])], examples:[ex('ἀγαπᾷ','John 3:35','he loves'), ex('ποιεῖ','Matthew 7:21','he does')], related:['greek-verb-overview','greek-verb-endings','greek-common-parsing-clues'] },
    { id:'hebrew-dual-forms', language:'hebrew', title:'Dual Forms', category:'Nominals', summary:'Recognition chart for Hebrew singular, plural, and dual forms.', body:[], recognitionTips:['־ַיִם is the common dual ending.','Expect duals with eyes, hands, feet, ears, days, and years.'], charts:[chart('Number forms', ['Number','Typical marker','Example'], [['Singular','no plural/dual ending','יָד hand'],['Plural','־ִים / ־וֹת','סוּסִים horses'],['Dual','־ַיִם','יָדַיִם hands / two hands']])], examples:[ex('יָדַיִם','Representative','hands'), ex('יוֹמַיִם','Representative','two days')], related:['hebrew-noun-basics','hebrew-construct-chains','hebrew-suffixes'] },
    { id:'hebrew-pronominal-suffixes', language:'hebrew', title:'Pronominal Suffixes', category:'Nominals', summary:'Dedicated suffix chart for possession and object relationships.', body:['Suffixes attach to nouns, prepositions, and verbs. On nouns they often express possession.'], recognitionTips:['וֹ often means his/its.','ךָ and ךְ distinguish your masculine/feminine singular.','Construct chains and suffixes both express close noun relationships.'], charts:[chart('Common noun suffixes', ['Person','Suffix','Example','Sense'], [['1cs','־ִי','סוּסִי','my horse'],['2ms','־ךָ','סוּסְךָ','your horse'],['2fs','־ךְ','סוּסֵךְ','your horse'],['3ms','־וֹ','סוּסוֹ','his horse'],['3fs','־הּ','סוּסָהּ','her horse'],['1cp','־נוּ','סוּסֵנוּ','our horse'],['3mp','־הֶם','סוּסֵיהֶם','their horse']])], examples:[ex('סוּסוֹ','Representative','his horse'), ex('עַמִּי','Exodus 3:10','my people')], related:['hebrew-suffixes','hebrew-construct-chains','hebrew-pronouns'] },
    { id:'hebrew-construct-chains', language:'hebrew', title:'Construct Chains', category:'Nominals', summary:'Concise reference for absolute state, construct state, and noun chains.', body:['A construct noun is bound to the following noun. Translate many chains with “of,” then refine by context.'], recognitionTips:['The construct word normally cannot take the article; definiteness often comes from the final noun.','Construct forms may shorten vowels or change endings.'], charts:[chart('Construct chain basics', ['Feature','Description','Example'], [['Absolute state','noun stands independently','דָּבָר word'],['Construct state','noun bound to following noun','דְּבַר word of'],['Chain','construct + following noun(s)','דְּבַר יְהוָה word of YHWH']])], examples:[ex('דְּבַר יְהוָה','Jeremiah 1:2','word of YHWH'), ex('בְּנֵי יִשְׂרָאֵל','Exodus 1:1','sons of Israel')], related:['hebrew-noun-basics','hebrew-pronominal-suffixes','hebrew-dual-forms'] },
    { id:'hebrew-weak-verbs', language:'hebrew', title:'Weak Verb Overview', category:'Verbs', summary:'Weak verbs recognition chart for common weak verb classes.', body:[], recognitionTips:['I-נ verbs may assimilate nun.','III-ה verbs often show final ה/י changes.','Hollow verbs have a weak middle radical; geminate verbs repeat the second and third radicals.'], charts:[chart('Weak verb classes', ['Class','Recognition pattern'], [['I-נ','initial nun may disappear into doubling'],['III-ה','final ה changes or drops in some forms'],['Hollow','middle ו/י vowel behavior'],['Geminate','second and third radicals match']])], examples:[ex('נפל','Representative','fall (I-נ)'), ex('בנה','Representative','build (III-ה)')], related:['hebrew-stem-markers','hebrew-qal','hebrew-prefixes'] },
    { id:'grammar-parsing-ambiguity', language:'greek', title:'Parsing Ambiguity Guide', category:'Tools', summary:'What to do when a form could parse more than one way.', body:['Do not decide from endings alone. Check context, articles, agreement, nearby verbs, and common pitfalls.'], recognitionTips:['Articles often settle nominal case, gender, and number.','Agreement links adjectives, participles, and pronouns to their heads.','Context can decide whether a form is middle or passive, subject or object, or noun or adjective.'], charts:[chart('Ambiguity checklist', ['Question','Use it for'], [['Is there an article?','case/gender/number anchor'],['What agrees with it?','adjectives, pronouns, participles'],['What does context require?','subject/object and voice decisions'],['Is this a common look-alike?','neuter nom/acc, middle/passive, genitive forms']])], examples:[ex('τό','Representative','nominative or accusative neuter singular'), ex('αὐτοῦ','Representative','his/of him/of it')], related:['greek-case-functions','greek-article-endings','greek-pronouns','hebrew-construct-chains'] }
  ];
  topics.push(...grammarRefinements);
  const suffixTopic = topics.find(t => t.id === 'hebrew-suffixes');
  if (suffixTopic) suffixTopic.related = Array.from(new Set([...(suffixTopic.related||[]), 'hebrew-pronominal-suffixes', 'hebrew-construct-chains']));
  const nounTopic = topics.find(t => t.id === 'hebrew-noun-basics');
  if (nounTopic) nounTopic.related = Array.from(new Set([...(nounTopic.related||[]), 'hebrew-dual-forms', 'hebrew-construct-chains']));
  const pronounTopic = topics.find(t => t.id === 'greek-pronouns');
  if (pronounTopic) {
    pronounTopic.charts.push(
      chart('Demonstrative pronouns', ['Pronoun','Masculine','Feminine','Neuter','Use'], [['near demonstrative','οὗτος','αὕτη','τοῦτο','this/these'],['far demonstrative','ἐκεῖνος','ἐκείνη','ἐκεῖνο','that/those']]),
      chart('Relative pronoun', ['Case','Masculine','Feminine','Neuter'], [['Nominative','ὅς','ἥ','ὅ'],['Genitive','οὗ','ἧς','οὗ'],['Dative','ᾧ','ᾗ','ᾧ'],['Accusative','ὅν','ἥν','ὅ']]),
      chart('Interrogative pronoun', ['Case','Masculine/Feminine','Neuter'], [['Nominative','τίς','τί'],['Genitive','τίνος','τίνος'],['Dative','τίνι','τίνι'],['Accusative','τίνα','τί']])
    );
    pronounTopic.title = 'Pronouns';
    pronounTopic.category = 'Pronouns';
    pronounTopic.searchTerms = ['Pronoun Paradigms', 'Pronoun Endings'];
    pronounTopic.related = Array.from(new Set([...(pronounTopic.related||[]), 'greek-pronoun-endings', 'greek-case-functions']));
  }

  const oldTopicAliases = {
    'greek-articles':'greek-nouns',
    'greek-logos-paradigm':'greek-nouns',
    'greek-noun-endings':'greek-nouns',
    'greek-case-endings':'greek-nouns',
    'greek-first-declension-endings':'greek-nouns',
    'greek-second-declension-endings':'greek-nouns',
    'greek-third-declension-basics':'greek-nouns',
    'greek-article-endings':'greek-nouns',
    'greek-case-functions':'greek-nouns',
    'greek-lyo-paradigm':'greek-verbs',
    'greek-verb-overview':'greek-verbs',
    'greek-tense-explanations':'greek-verbs',
    'greek-voice-explanations':'greek-verbs',
    'greek-mood-explanations':'greek-verbs',
    'greek-verb-endings':'greek-verbs',
    'greek-common-parsing-clues':'greek-verbs',
    'greek-participles':'greek-verbs',
    'greek-contract-verbs':'greek-verbs',
    'greek-kalos-paradigm':'greek-adjectives',
    'greek-adjective-endings':'greek-adjectives',
    'greek-pronoun-endings':'greek-pronouns',
    'hebrew-pronouns':'hebrew-nouns',
    'hebrew-noun-basics':'hebrew-nouns',
    'hebrew-dual-forms':'hebrew-nouns',
    'hebrew-pronominal-suffixes':'hebrew-nouns',
    'hebrew-construct-chains':'hebrew-nouns',
    'hebrew-suffixes':'hebrew-nouns',
    'hebrew-prefixes':'hebrew-particles',
    'hebrew-wayyiqtol':'hebrew-verbs',
    'hebrew-stem-markers':'hebrew-verbs',
    'hebrew-qal':'hebrew-verbs',
    'hebrew-niphal':'hebrew-verbs',
    'hebrew-piel':'hebrew-verbs',
    'hebrew-pual':'hebrew-verbs',
    'hebrew-hiphil':'hebrew-verbs',
    'hebrew-hophal':'hebrew-verbs',
    'hebrew-hitpael':'hebrew-verbs',
    'hebrew-weak-verbs':'hebrew-verbs',
    'hebrew-katav-stem-relationships':'hebrew-verbs'
  };
  const oldTopicAliasIds = new Set(Object.keys(oldTopicAliases));
  const oldTopic = id => topics.find(t => t.id === id) || {};
  const sectionFromTopic = (id, title, extra={}) => {
    const t = oldTopic(id);
    const searchTerms = [id, t.title, t.category, ...(extra.searchTerms || [])].filter(term => term && !/cheat sheet/i.test(term));
    return { title:title || t.title, body:t.body || [], recognitionTips:t.recognitionTips || [], charts:t.charts || [], examples:t.examples || [], searchTerms, ...extra };
  };
  const chartsFromTabs = (topicId, labels) => {
    const t = oldTopic(topicId);
    return (t.paradigmTabs || []).filter(tab => labels.includes(tab.label)).flatMap(tab => tab.charts || []);
  };
  const hebrewStemIds = ['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-pual','hebrew-hiphil','hebrew-hophal','hebrew-hitpael'];
  const chartsFromHebrewStemTabs = labels => hebrewStemIds.flatMap(id => chartsFromTabs(id, labels));
  const hebrewStemSection = stem => {
    const t = oldTopic(`hebrew-${stem.toLowerCase()}`);
    return { title:stem, body:t.body || [], recognitionTips:t.recognitionTips || [], charts:[...(t.charts || []), ...(t.paradigmTabs || []).flatMap(tab => tab.charts || [])], examples:t.examples || [], searchTerms:[`${stem} Paradigms`, `${stem} stem`, `hebrew-${stem.toLowerCase()}`] };
  };
  const sectionByTitle = (sections, title) => (sections || []).find(section => section.title === title) || { title, body:[], recognitionTips:[], charts:[], examples:[] };
  const sectionWithId = (section, id, extra={}) => ({ ...section, id, ...extra });
  const chip = (label, target) => ({ label, target });
  const chartsByLabelText = (charts, terms) => (charts || []).filter(chart => terms.some(term => chart.label.includes(term)));
  const categoryTab = (id, label, sections, chips=[], collapsible=true) => ({
    id,
    label,
    collapsible,
    jumpChips: chips.length ? chips : sections.map(section => chip(section.title, section.id || section.title.toLowerCase().replace(/[^a-z0-9\u0370-\u03ff\u0590-\u05ff]+/g,'-').replace(/^-|-$/g,''))),
    sections
  });
  const greekMiVerbSection = () => ({
    title:'μι Verbs',
    id:'mi-verbs',
    body:['μι verbs are high-frequency verbs with older endings and stem patterns. Recognize common forms by lexical familiarity, repeated stems, and compact endings rather than forcing an omega-verb pattern.'],
    recognitionTips:['Look first for familiar lexical anchors: δίδωμι, τίθημι, ἵστημι, and εἰμί.','Third singular forms often end in -σι(ν): δίδωσι(ν), τίθησι(ν), ἵστησι(ν).','εἰμί is irregular and should be recognized as its own family of forms.'],
    charts:[
      chart('Common μι verb anchors', ['Verb','Common form','Reading clue'], [['δίδωμι','δίδωσι(ν)','he/she/it gives'],['τίθημι','τίθησι(ν)','he/she/it places'],['ἵστημι','ἵστησι(ν)','he/she/it stands / causes to stand'],['εἰμί','ἐστίν','he/she/it is']]),
      chart('μι recognition forms', ['Lexical form','Present 1sg','Present 3sg','Useful clue'], [['δίδωμι','δίδωμι','δίδωσι(ν)','give; reduplicated δι-'],['τίθημι','τίθημι','τίθησι(ν)','put/place; θη stem'],['ἵστημι','ἵστημι','ἵστησι(ν)','stand; στη stem'],['εἰμί','εἰμί','ἐστίν','being verb; irregular forms']])
    ],
    examples:[ex('δίδωσιν','John 3:34','he gives'), ex('τίθησιν','John 10:11','he lays down'), ex('ἐστίν','John 1:1','he/she/it is')],
    searchTerms:['mi verbs','μί verbs','δίδωμι','τίθημι','ἵστημι','εἰμί']
  });
  const applyVerbSectionTabs = topic => {
    if (!topic || topic.sectionTabs?.length) return topic;
    const sections = topic.sections || [];
    const present = sectionWithId(sectionByTitle(sections,'Present'), 'present', { open:true });
    const imperfect = sectionWithId(sectionByTitle(sections,'Imperfect'), 'imperfect');
    const future = sectionWithId(sectionByTitle(sections,'Future'), 'future');
    const aorist = sectionWithId(sectionByTitle(sections,'Aorist'), 'aorist');
    const perfect = sectionWithId(sectionByTitle(sections,'Perfect'), 'perfect');
    const pluperfect = sectionWithId(sectionByTitle(sections,'Pluperfect'), 'pluperfect');
    const infinitiveCharts = chartsFromTabs('greek-lyo-paradigm',['Infinitives & Participles']).filter(c => c.label.includes('Infinitive'));
    const participleCharts = chartsFromTabs('greek-lyo-paradigm',['Infinitives & Participles']).filter(c => c.label.includes('Participle'));
    const participles = { title:'Participles', id:'participles', body:['Participles are verbal adjectives: recognize tense-form and voice, then match case, number, and gender to the noun or substantive use.'], recognitionTips:[...(oldTopic('greek-participles').recognitionTips||[])], charts:participleCharts, examples:oldTopic('greek-participles').examples || [] };
    const infinitives = { title:'Infinitives', id:'infinitives', body:['Infinitives are verbal nouns. They do not carry person and number endings, so recognize the tense-form and voice marker first.'], recognitionTips:['-ειν often marks present active infinitive.','-σθαι often marks middle/passive infinitives.','-θῆναι is a strong aorist passive infinitive clue.'], charts:infinitiveCharts, examples:[ex('λύειν','Representative','to release'), ex('λυθῆναι','Representative','to be released')] };
    const contractVerbs = sectionWithId(sectionFromTopic('greek-contract-verbs','Contract Verbs'), 'contract-verbs');
    const miVerbs = greekMiVerbSection();
    const irregularVerbs = sectionWithId(sectionByTitle(sections,'Common Irregulars'), 'irregular-verbs');
    const voice = sectionWithId(sectionByTitle(sections,'Voices'), 'voice');
    const aspect = sectionWithId(sectionByTitle(sections,'Aspect'), 'aspect');
    const mood = sectionWithId(sectionByTitle(sections,'Moods'), 'mood');
    topic.sectionTabs = [
      categoryTab('paradigms','Paradigms',[present, imperfect, future, aorist, perfect, pluperfect, participles, infinitives, contractVerbs, miVerbs, irregularVerbs],[chip('Present','present'),chip('Imperfect','imperfect'),chip('Future','future'),chip('Aorist','aorist'),chip('Perfect','perfect'),chip('Pluperfect','pluperfect'),chip('Participles','participles'),chip('Infinitives','infinitives'),chip('Contract Verbs','contract-verbs'),chip('μι Verbs','mi-verbs'),chip('Irregular Verbs','irregular-verbs')]),
      categoryTab('concepts','Concepts',[voice, aspect, mood],[chip('Voice','voice'),chip('Aspect','aspect'),chip('Mood','mood')]),
      categoryTab('reference-material','Reference Material',[
        { title:'Augment', id:'augment', body:['Augment is the prefixed ε that commonly marks past-time indicative forms, especially imperfect and aorist indicatives.'], recognitionTips:['Look for ε before the stem in indicative forms: ἔλυον, ἔλυσα, ἐλύθην.','Compound verbs often place augment after the prepositional prefix.'], charts:[chart('Augment anchors', ['Form','Clue','Likely path'], [['ἔλυσα','augment + σα','aorist active indicative'],['ἐλύθην','augment + θη','aorist passive indicative'],['ἐξῆλθεν','augment inside compound','aorist of ἐξέρχομαι']])], examples:[ex('ἐλύθησαν','Reader example','they were released')] },
        { title:'Reduplication', id:'reduplication', body:['Reduplication commonly marks perfect-system forms and points to a completed action with a resulting state.'], recognitionTips:['Look for repeated initial consonant plus ε: λέλυκα.','Some perfects are irregular or use different stems.'], charts:[chart('Reduplication anchors', ['Form','Clue','Reading'], [['λέλυκα','λε- reduplication','I have released'],['γεγραμμένον','γε- reduplication','written']])], examples:[ex('γεγραμμένον','Reader example','written')] },
        sectionWithId(sectionByTitle(sections,'Principal Parts'), 'principal-parts'),
        { title:'Historical Present', id:'historical-present', body:['A present-tense form may narrate a past event for vividness. Recognize the present form first, then let narrative context supply the time reference.'], recognitionTips:['Common with verbs of saying, coming, and seeing in narrative.'], charts:[chart('Historical present reading', ['Visible form','Contextual reading'], [['λέγει','he says / he said in narrative'],['ἔρχεται','he comes / he came in narrative']])], examples:[ex('λέγει','Narrative example','he says / he said')] },
        { title:'Deponency', id:'deponency', body:['Some verbs regularly appear in middle/passive forms while carrying active meaning. Treat the form as middle/passive for recognition, then learn the lexical behavior.'], recognitionTips:['ἔρχομαι and πορεύομαι are common active-meaning middle-form verbs.'], charts:[chart('Deponent-style anchors', ['Verb','Form','Reading'], [['ἔρχομαι','ἔρχομαι','I come/go'],['πορεύομαι','πορεύεται','he/she goes']])], examples:[ex('ἔρχεται','John 1:29','he comes')] },
        { title:'Irregular Principal Parts', id:'irregular-principal-parts', body:['Frequent verbs often change stems across principal parts. Recognition usually comes from memorized form families rather than one ending rule.'], recognitionTips:['λέγω uses εἶπον for many aorist forms.','ἔρχομαι uses ἐλεύσομαι and ἦλθον.'], charts:[chart('Irregular principal part anchors', ['Lexical form','Aorist','Recognition'], [['λέγω','εἶπον','said'],['ἔρχομαι','ἦλθον','came/went'],['ὁράω','εἶδον','saw']])], examples:[ex('εἶπεν','Matthew 4:4','he said')] },
        { title:'Common Irregularities', id:'common-irregularities', body:['Common irregularities include second aorist stems, liquid futures, contract changes, and high-frequency suppletive forms.'], recognitionTips:['If the ending looks regular but the stem is unfamiliar, check whether the verb is a common irregular.'], charts:[chart('Common irregularity checks', ['Pattern','Example','Check'], [['second aorist','ἔλαβον','lexical form λαμβάνω'],['liquid future','μενῶ','future without σ'],['contract','ποιεῖ','contracted vowel']])], examples:[ex('ἔλαβον','Reader example','I received / they received')] },
        sectionWithId(sectionByTitle(sections,'Examples'), 'examples'),
        sectionWithId(sectionByTitle(sections,'Recognition Tips'), 'recognition-notes')
      ],[chip('Augment','augment'),chip('Reduplication','reduplication'),chip('Principal Parts','principal-parts'),chip('Historical Present','historical-present'),chip('Deponency','deponency'),chip('Irregular Principal Parts','irregular-principal-parts'),chip('Common Irregularities','common-irregularities'),chip('Examples','examples'),chip('Recognition Notes','recognition-notes')])
    ];
    topic.sections = sections.filter(section => !['Recognition Cheat Sheet','Indicative Paradigms','Pluperfect'].includes(section.title));
    topic.searchTerms = (topic.searchTerms || []).filter(term => !/cheat sheet/i.test(term));
    return topic;
  };
  const applyHebrewVerbSectionTabs = topic => {
    if (!topic || topic.sectionTabs?.length) return topic;
    const sections = topic.sections || [];
    const stemSections = ['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'].map(stem => sectionWithId(sectionByTitle(sections,stem), stem.toLowerCase()));
    const weakVerbSection = (title, hebrewClass, root, commonForms, why, examples=[]) => ({
      title,
      id:title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
      body:[why],
      recognitionTips:[
        `Recognition notes: ${hebrewClass} roots may not look like the strong כתב pattern.`,
        `Common forms: ${commonForms.map(form => form[0]).join(', ')}.`,
        'Confirm the root from context and lexicon when one radical disappears, weakens, or changes vowel behavior.'
      ],
      charts:[
        chart(`${title} common forms`, ['Root','Form','Recognition','Reading'], commonForms.map(row => [root, ...row])),
        chart(`${title} paradigm snapshot`, ['Form','Representative','What changed'], commonForms.slice(0,4).map(row => [row[1], row[0], row[2]]))
      ],
      examples
    });
    const weakVerbs = [
      sectionWithId(sectionByTitle(sections,'Weak Verbs'), 'weak-verbs', { open:true }),
      sectionWithId(sectionByTitle(sections,'I-Aleph'), 'i-aleph'),
      weakVerbSection('I-Nun','I-נ','נפל', [['יִפֹּל','imperfect','initial nun assimilates or drops','he falls'],['נָפַל','perfect','nun visible in the perfect','he fell'],['לִפֹּל','infinitive construct','nun absent before פ','to fall']], 'Initial nun often assimilates into the following consonant or disappears in prefixed forms, so the visible form may begin with the second radical.', [ex('יִפֹּל','Representative','he falls')]),
      weakVerbSection('Pe-Yod','I-י','ישב', [['יֵשֵׁב','imperfect','initial yod shapes the vowel pattern','he sits'],['שֵׁב','imperative','initial yod may disappear','sit!'],['לָשֶׁבֶת','infinitive construct','weak initial yod affects the stem shape','to sit']], 'Pe-Yod roots have initial י/ו behavior that can collapse into vowel patterns or disappear in short command and infinitive forms.', [ex('יֵשֵׁב','Representative','he sits')]),
      weakVerbSection('Hollow','II-ו/י','קום', [['יָקוּם','imperfect','middle weak radical appears as a long vowel','he arises'],['קָם','perfect','short form with vowel carrying the middle radical','he arose'],['קוּם','imperative','long vowel marks the hollow root','arise!']], 'Hollow verbs have ו or י as the middle radical, so the middle consonant is often represented by a long vowel rather than a normal consonantal slot.', [ex('קָם','Representative','he arose')]),
      weakVerbSection('Geminate','II=III','סבב', [['יָסֹב','imperfect','second and third radicals may contract','he turns'],['סַב','imperative','doubled root can shorten','turn!'],['סָבַב','perfect','full doubled radicals may appear','he turned']], 'Geminate verbs repeat the second and third radicals. Forms often contract or show doubling because the final two radicals are identical.', [ex('סָבַב','Representative','he turned')]),
      weakVerbSection('III-He','III-ה','בנה', [['בָּנָה','perfect','final ה marks the weak final radical','he built'],['יִבְנֶה','imperfect','final ה appears as final vowel/he','he builds'],['בְּנוֹת','infinitive construct','final ה shifts to ות','to build']], 'III-He verbs have final ה as the third radical; endings often replace it or expose older י/ת behavior.', [ex('בָּנָה','Representative','he built')]),
      weakVerbSection('Lamed-He','ל״ה','עשה', [['עָשָׂה','perfect','final ה is visible','he did/made'],['יַעֲשֶׂה','imperfect','final ה shapes the final vowel','he does/makes'],['עֲשׂוֹת','infinitive construct','final ה shifts to ות','to do/make']], 'Lamed-He is another name for III-He. Many grammars use lamed because ל is the third radical in the פעל naming pattern.', [ex('עָשָׂה','Representative','he did/made')])
    ];
    topic.sectionTabs = [
      categoryTab('paradigms','Paradigms',[
        sectionWithId(sectionByTitle(sections,'Strong Verb Paradigms'), 'strong-verbs', { open:true }),
        sectionWithId(sectionByTitle(sections,'Stems'), 'stems'),
        ...stemSections,
        ...weakVerbs,
        sectionWithId(sectionByTitle(sections,'Participle'), 'participles'),
        { title:'Infinitives', id:'infinitives', body:['Hebrew infinitives appear mainly as construct and absolute forms. Use them by visible shape and by their relationship to nearby verbs or prepositions.'], recognitionTips:['Infinitive construct often appears with לְ.','Infinitive absolute often reinforces a nearby finite verb.'], charts:[...chartsFromHebrewStemTabs(['Infinitive Construct']), ...chartsFromHebrewStemTabs(['Infinitive Absolute'])], examples:[] },
        sectionWithId(sectionByTitle(sections,'Imperative'), 'imperatives')
      ],[chip('Strong Verbs','strong-verbs'),chip('Stems','stems'),chip('Weak Verbs','weak-verbs'),chip('Participles','participles'),chip('Infinitives','infinitives'),chip('Imperatives','imperatives')]),
      categoryTab('concepts','Concepts',[
        sectionWithId(sectionByTitle(sections,'Aspect'), 'aspect'),
        sectionWithId(sectionByTitle(sections,'Waw Consecutive'), 'waw-consecutive'),
        { title:'Volitives', id:'volitives', body:['Volitives present wanted, commanded, or urged action, including cohortative, jussive, and imperative uses.'], recognitionTips:['Context and short forms often matter more than one visible ending.','Imperatives are the clearest command forms; jussives and cohortatives require context.'], charts:[chart('Volitive forms', ['Use','Common clue','Reading'], [['Imperative','second-person command','do!'],['Jussive','short/modal imperfect where visible','let him do / may he do'],['Cohortative','often 1cs/1cp with הָ','let me/us do']])], examples:[] },
        { title:'Stem Meanings', id:'stem-meanings', body:stemRelationships, recognitionTips:['Start with the visible stem marker, then confirm the meaning in context.'], charts:[chart('Stem meaning map', ['Stem','Common relationship'], Object.entries(stemInfo).map(([s,v])=>[s,v[0]]))], examples:[] }
      ],[chip('Aspect','aspect'),chip('Waw Consecutive','waw-consecutive'),chip('Volitives','volitives'),chip('Stem Meanings','stem-meanings')]),
      categoryTab('reference-material','Reference Material',[
        { title:'Energic Nun', id:'energic-nun', body:['The energic nun is an added nun element found in some older or poetic verbal forms. In reading, recognize it as a form-expanding feature rather than a new root consonant.'], recognitionTips:['Do not mistake energic nun for the first radical of the root.','Expect it mostly in specialized or less common forms.'], charts:[chart('Energic nun reading', ['Visible clue','Reader task'], [['extra final nun','check whether the root remains intact without it'],['unusual long ending','compare with the expected imperfect/jussive form']])], examples:[] },
        { title:'Sequential Use', id:'sequential-use', body:['Sequential forms organize clauses in narrative or discourse. Wayyiqtol is the most important reader-facing pattern.'], recognitionTips:['וַי + imperfect shape usually moves narrative forward.','Do not treat every prefixed waw as the same construction.'], charts:[chart('Sequential patterns', ['Pattern','Typical use'], [['וַי + imperfect','narrative sequence'],['וְ + perfect','continuation or modal/future context depending discourse']])], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said')] },
        sectionWithId(sectionByTitle(sections,'Recognition Tips'), 'recognition-notes'),
        sectionWithId(sectionByTitle(sections,'Examples'), 'examples'),
        { title:'Common Irregularities', id:'common-irregularities', body:['Common irregularities usually come from weak roots, stem-specific vowel changes, or high-frequency verbs with shortened forms.'], recognitionTips:['If a root consonant seems missing, check weak verbs before assuming a different root.','If a stem marker is visible, identify the stem before solving the weak behavior.'], charts:[chart('Common irregularity checks', ['Problem','Likely cause','Go to'], [['missing initial נ','I-Nun','Weak Verbs'],['middle vowel carries root','Hollow','Weak Verbs'],['final ה changes','III-He / Lamed-He','Weak Verbs'],['doubled middle radical','Piel/Pual/Hitpael or geminate','Stems / Weak Verbs']])], examples:[ex('יִפֹּל','Representative','he falls'), ex('קָם','Representative','he arose')] }
      ],[chip('Energic Nun','energic-nun'),chip('Sequential Use','sequential-use'),chip('Recognition Notes','recognition-notes'),chip('Examples','examples'),chip('Common Irregularities','common-irregularities')])
    ];
    topic.sections = sections.filter(section => section.title !== 'Recognition Cheat Sheet');
    return topic;
  };
  const applyGreekNounSectionTabs = topic => {
    if (!topic || topic.sectionTabs?.length) return topic;
    const sections = topic.sections || [];
    topic.sectionTabs = [
      categoryTab('paradigms','Paradigms',[
        sectionWithId(sectionByTitle(sections,'Article'), 'article', { open:true }),
        sectionWithId(sectionByTitle(sections,'First Declension'), 'first-declension'),
        sectionWithId(sectionByTitle(sections,'Second Declension'), 'second-declension'),
        sectionWithId(sectionByTitle(sections,'Third Declension'), 'third-declension'),
        { title:'Adjective Agreement', id:'adjective-agreement', body:['Adjectives use noun-like endings and agree with the nouns they modify in case, number, and gender.'], recognitionTips:['Find the article or noun first, then match the adjective ending.','Predicate adjectives may agree without standing inside the article-noun frame.'], charts:oldTopic('greek-adjective-endings').charts || [], examples:oldTopic('greek-kalos-paradigm').examples || [] }
      ]),
      categoryTab('concepts','Concepts',[
        sectionWithId(sectionByTitle(sections,'Case Uses'), 'case-functions'),
        { title:'Genitive Uses', id:'genitive-uses', body:['The genitive often marks possession, source, description, relationship, or the whole from which a part is taken.'], recognitionTips:['Start with of/from as a placeholder, then refine from context.'], charts:[chart('Genitive reading options', ['Use','Reader gloss'], [['Possession','of / belonging to'],['Source','from'],['Description','characterized by'],['Partitive','part of']])], examples:[ex('λόγου','Representative','of a word / word')] },
        { title:'Dative Uses', id:'dative-uses', body:['The dative often marks indirect object, means, location, sphere, or reference.'], recognitionTips:['Try to/for/in/by as placeholders, then let the verb and preposition decide.'], charts:[chart('Dative reading options', ['Use','Reader gloss'], [['Indirect object','to / for'],['Means','by / with'],['Location/Sphere','in'],['Reference','with respect to']])], examples:[] },
        { title:'Attributive Position', id:'attributive-position', body:['Attributive position places a modifier inside an article-noun structure or in another article-marked position.'], recognitionTips:['Article + adjective + noun often means the adjective modifies the noun.','Article + noun + article + adjective also marks attribution.'], charts:[chart('Attributive position', ['Pattern','Reading'], [['ὁ καλὸς λόγος','the good word'],['ὁ λόγος ὁ καλός','the good word']])], examples:[] }
      ]),
      categoryTab('reference-material','Reference Material',[
        sectionWithId(sectionByTitle(sections,'Recognition Tips'), 'recognition-notes'),
        sectionWithId(sectionByTitle(sections,'Common Patterns'), 'common-patterns'),
        sectionWithId(sectionByTitle(sections,'Examples'), 'examples')
      ])
    ];
    return topic;
  };
  const applyGreekAdjectiveSectionTabs = topic => {
    if (!topic || topic.sectionTabs?.length) return topic;
    const sections = topic.sections || [];
    topic.sectionTabs = [
      categoryTab('paradigms','Paradigms',[
        { title:'Common Patterns', id:'common-patterns', body:['Most common adjectives follow 2-1-2 or third-declension patterns. Recognize the adjective family, then match the noun it modifies.'], recognitionTips:['-ος/-η/-ον is a common 2-1-2 pattern.','Some adjectives use third-declension endings, especially in masculine/feminine forms.'], charts:oldTopic('greek-adjective-endings').charts || [], examples:[] },
        sectionWithId(sectionByTitle(sections,'Agreement'), 'agreement', { open:true }),
        sectionWithId(sectionByTitle(sections,'Comparative'), 'comparative'),
        sectionWithId(sectionByTitle(sections,'Superlative'), 'superlative')
      ]),
      categoryTab('concepts','Concepts',[
        { title:'Adjective Function', id:'adjective-function', body:['Greek adjectives may modify nouns, stand substantively as nouns, or function predicatively with an implied or explicit verb of being.'], recognitionTips:['Article plus adjective can stand for a person or thing: οἱ καλοί, the good ones.','Predicate position often lacks the repeated attributive article pattern.'], charts:[chart('Adjective function', ['Function','Clue','Reading task'], [['Attributive','article-noun/adjective frame','modifies a noun'],['Substantive','article + adjective without noun','supplies a noun from context'],['Predicate','agrees with noun but outside attributive frame','states something about the noun']])], examples:[ex('καλός','John 10:11','good')] }
      ]),
      categoryTab('reference-material','Reference Material',[
        sectionWithId(sectionByTitle(sections,'Examples'), 'examples'),
        { title:'Recognition Notes', id:'recognition-notes', body:[], recognitionTips:topic.recognitionTips || [], charts:[], examples:[] }
      ])
    ];
    return topic;
  };
  const applyHebrewNounSectionTabs = topic => {
    if (!topic || topic.sectionTabs?.length) return topic;
    const sections = topic.sections || [];
    topic.sectionTabs = [
      categoryTab('paradigms','Paradigms',[
        { title:'Singular', id:'singular', body:['Singular nouns are the base recognition form and may be absolute or construct.'], recognitionTips:['A singular noun lacks plural ים/ות and dual יִם endings.'], charts:[chart('Singular anchors', ['Form','Reading'], [['דָּבָר','word'],['מֶלֶךְ','king']])], examples:[ex('דָּבָר','Representative','word')] },
        { title:'Plural', id:'plural', body:['Plural nouns commonly use masculine ים or feminine ות endings, though lexical gender and form do not always line up neatly.'], recognitionTips:['־ִים and ־וֹת are the main plural endings.'], charts:[chart('Plural anchors', ['Ending','Example','Reading'], [['־ִים','סוּסִים','horses'],['־וֹת','תּוֹרוֹת','laws']])], examples:[] },
        sectionWithId(sectionByTitle(sections,'Dual'), 'dual'),
        { title:'Construct Forms', id:'construct-forms', body:['Construct forms bind a noun to the following word and often shorten or alter vowels.'], recognitionTips:['Read construct as noun of the following noun.','A construct noun normally does not take the article itself.'], charts:sectionByTitle(sections,'Construct State').charts || [], examples:sectionByTitle(sections,'Construct State').examples || [] },
        { title:'Suffix Forms', id:'suffix-forms', body:['Pronominal suffixes attach to nouns and commonly mark possession.'], recognitionTips:['Identify the noun first, then read the suffix as my/your/his/her/our/their.'], charts:sectionByTitle(sections,'Pronominal Suffixes').charts || [], examples:sectionByTitle(sections,'Pronominal Suffixes').examples || [] }
      ]),
      categoryTab('concepts','Concepts',[
        sectionWithId(sectionByTitle(sections,'Construct State'), 'construct-state-usage'),
        sectionWithId(sectionByTitle(sections,'Pronominal Suffixes'), 'pronominal-suffix-usage'),
        sectionWithId(sectionByTitle(sections,'Article'), 'definite-article'),
        { title:'Apposition', id:'apposition', body:['Apposition places two nominals side by side where the second identifies or explains the first.'], recognitionTips:['If two nouns stand together without construct behavior, ask whether the second renames the first.'], charts:[chart('Apposition reading', ['Pattern','Reading task'], [['דָּוִד הַמֶּלֶךְ','David, the king']])], examples:[] },
        { title:'Predicate and Attributive Position', id:'predicate-attributive-position', body:['Hebrew adjectives may attribute a quality to a noun or predicate a quality in a verbless clause.'], recognitionTips:['Attributive adjectives usually follow the noun and match definiteness.','Predicate adjectives usually do not take the article merely because the noun is definite.'], charts:[chart('Hebrew adjective positions', ['Pattern','Reading'], [['הַמֶּלֶךְ הַטּוֹב','the good king'],['הַמֶּלֶךְ טוֹב','the king is good']])], examples:[] }
      ]),
      categoryTab('reference-material','Reference Material',[
        sectionWithId(sectionByTitle(sections,'Recognition Tips'), 'recognition-notes'),
        { title:'Common Patterns', id:'common-patterns', body:['Common Hebrew noun patterns include masculine plurals in ים, feminine plurals in ות, dual forms in יִם, construct chains, and suffixed possession.'], recognitionTips:['State comes before meaning: decide absolute, construct, or suffixed before smoothing the English.'], charts:[chart('Common noun pattern checks', ['Visible form','Likely category'], [['־ִים','plural'],['־ַיִם','dual'],['shortened first noun before another noun','construct'],['final pronominal ending','suffix form']])], examples:[] },
        sectionWithId(sectionByTitle(sections,'Examples'), 'examples')
      ])
    ];
    return topic;
  };

  topics.push(
    { id:'greek-nouns', language:'greek', title:'Nouns', category:'Nouns', summary:'Reader-focused Greek noun reference: article, declensions, case endings, and recognition clues in one place.', body:['Use nouns by recognition first: parse article and ending, identify likely declension, then let context decide the case use.'], recognitionTips:['Articles often give the fastest case, number, and gender anchor.','Genitive singular is often the best clue for declension.','Neuter nominative and accusative forms usually match.'], searchTerms:['Noun Paradigms','Noun Endings','Article','Article Paradigms','Article Endings','First Declension','Second Declension','Third Declension','Third Declension Basics','Case Endings','Case Uses','Case Functions'], sections:[
      sectionFromTopic('greek-articles','Article'),
      sectionFromTopic('greek-first-declension-endings','First Declension'),
      sectionFromTopic('greek-second-declension-endings','Second Declension'),
      sectionFromTopic('greek-third-declension-basics','Third Declension'),
      sectionFromTopic('greek-case-endings','Case Endings'),
      sectionFromTopic('greek-case-functions','Case Uses', { searchTerms:['Case Functions'] }),
      sectionFromTopic('greek-noun-endings','Recognition Tips'),
      sectionFromTopic('greek-logos-paradigm','Common Patterns'),
      { title:'Examples', body:[], recognitionTips:[], charts:[], examples:[...(oldTopic('greek-logos-paradigm').examples||[]), ...(oldTopic('greek-articles').examples||[]), ...(oldTopic('greek-first-declension-endings').examples||[]), ...(oldTopic('greek-second-declension-endings').examples||[]), ...(oldTopic('greek-third-declension-basics').examples||[])] }
    ], charts:[], examples:[ex('λόγος','John 1:1','word'), ex('ὁ λόγος','John 1:1','the Word'), ex('σάρξ','John 1:14','flesh')], related:['greek-verbs','greek-adjectives','greek-pronouns','greek-prepositions'] },
    { id:'greek-verbs', language:'greek', title:'Verbs', category:'Verbs', color:'tense', summary:'Major Greek verb reference for recognizing tense-form, voice, mood, finite forms, infinitives, and participles while reading.', body:['Start with visible clues: augment, tense stem, voice marker, mood vowel, and ending. Then confirm the form against the nearest paradigm section.'], principalParts:['λύω','λύσω','ἔλυσα','λέλυκα','λέλυμαι','ἐλύθην'], recognitionTips:['Augment plus θη points strongly toward aorist passive indicative, as in ἐλύθησαν.','σ before endings often signals future or first aorist.','μαι/σαι/ται endings usually point to middle or passive forms.'], searchTerms:['Verb Paradigms','Parsing Guide','Cheat Sheets','Participles','Infinitives','Contract Verbs','μι Verbs','mi verbs','Common Irregulars','Aspect','Voice','Mood','Aorist Passive Indicative','ἐλύθησαν'], sections:[
      sectionFromTopic('greek-common-parsing-clues','Recognition Cheat Sheet'),
      sectionFromTopic('greek-lyo-paradigm','Principal Parts', { charts:chartsFromTabs('greek-lyo-paradigm',['Principal Parts']) }),
      { title:'Indicative Paradigms', body:['Use the indicative charts first when a form has augment or ordinary personal endings.'], recognitionTips:[], charts:chartsFromTabs('greek-lyo-paradigm',['Present','Imperfect','Future','Aorist','Perfect','Pluperfect']).filter(c => c.label.includes('Indicative')), examples:[] },
      { title:'Present', body:[], recognitionTips:['Present forms usually use the present stem plus primary endings.'], charts:chartsFromTabs('greek-lyo-paradigm',['Present']), examples:[] },
      { title:'Imperfect', body:[], recognitionTips:['Imperfect indicative commonly has augment plus present stem.'], charts:chartsFromTabs('greek-lyo-paradigm',['Imperfect']), examples:[] },
      { title:'Future', body:[], recognitionTips:['Future active and middle often show σ before the ending.'], charts:chartsFromTabs('greek-lyo-paradigm',['Future']), examples:[] },
      { title:'Aorist', body:[], recognitionTips:['Aorist passive forms commonly show θη; ἐλύθησαν is aorist passive indicative, third plural.'], charts:chartsFromTabs('greek-lyo-paradigm',['Aorist']), examples:[ex('ἐλύθησαν','Representative','they were released')] },
      { title:'Perfect', body:[], recognitionTips:['Perfect forms often show reduplication and completed-result force.'], charts:chartsFromTabs('greek-lyo-paradigm',['Perfect']), examples:[] },
      { title:'Pluperfect', body:[], recognitionTips:['Pluperfect combines past reference with perfect/result-state forms.'], charts:chartsFromTabs('greek-lyo-paradigm',['Pluperfect']), examples:[] },
      sectionFromTopic('greek-voice-explanations','Voices', { searchTerms:['Active','Middle','Passive','Voice Explanation'] }),
      sectionFromTopic('greek-mood-explanations','Moods', { searchTerms:['Indicative','Subjunctive','Imperative'] }),
      { title:'Non-Finite Forms', body:['Infinitives and participles do not carry ordinary finite person endings. Participles also agree like adjectives.'], recognitionTips:[...(oldTopic('greek-participles').recognitionTips||[])], charts:chartsFromTabs('greek-lyo-paradigm',['Infinitives & Participles']), examples:[...(oldTopic('greek-participles').examples||[])] },
      sectionFromTopic('greek-contract-verbs','Contract Verbs'),
      { title:'μι Verbs', body:['μι verbs are high-frequency verbs with older endings and stem patterns. Recognize common forms by lexical familiarity and endings rather than forcing an omega-verb pattern.'], recognitionTips:['Look for δίδωμι, τίθημι, ἵστημι, and εἰμί as common reading forms.'], charts:[chart('Common μι verb anchors', ['Verb','Common form','Reading clue'], [['δίδωμι','δίδωσι(ν)','he/she/it gives'],['τίθημι','τίθησι(ν)','he/she/it places'],['εἰμί','ἐστίν','he/she/it is']])], examples:[ex('ἐστίν','John 1:1','he/she/it is')], searchTerms:['mi verbs'] },
      { title:'Common Irregulars', body:['Some very frequent verbs are best recognized as families of forms. Principal parts and context matter more than a single ending chart.'], recognitionTips:['λέγω has aorist forms from εἶπον.','ἔρχομαι uses future ἐλεύσομαι and aorist ἦλθον.'], charts:[chart('Common irregular anchors', ['Lexical form','Common form','Recognition'], [['λέγω','εἶπον','aorist: I said'],['ἔρχομαι','ἦλθον','aorist: I came/went'],['ὁράω','εἶδον','aorist: I saw']])], examples:[ex('εἶπεν','Matthew 4:4','he said')], searchTerms:['irregular verbs'] },
      sectionFromTopic('greek-tense-explanations','Aspect'),
      sectionFromTopic('greek-common-parsing-clues','Recognition Tips'),
      { title:'Examples', body:[], recognitionTips:[], charts:[], examples:[...(oldTopic('greek-lyo-paradigm').examples||[]), ...(oldTopic('greek-verb-endings').examples||[]), ...(oldTopic('greek-contract-verbs').examples||[]), ...(oldTopic('greek-participles').examples||[]), ex('ἐλύθησαν','Reader example','they were released')] }
    ], charts:[], examples:[ex('λύω','John 8:32','I release / loose'), ex('ἐλύθησαν','Reader example','they were released')], related:['greek-nouns','greek-adjectives','grammar-parsing-decoder'] },
    { id:'greek-adjectives', language:'greek', title:'Adjectives', category:'Adjectives', summary:'Greek adjective endings, agreement, comparison, and recognition examples in one page.', body:['Read adjectives by agreement: find the noun or substantive use, then check case, number, and gender.'], recognitionTips:['Adjectives agree with nouns in case, number, and gender.','Neuter nominative and accusative forms often match.','Comparatives often use -τερος; superlatives often use -τατος.'], searchTerms:['Adjective Paradigms','Adjective Endings','Comparative','Superlative'], sections:[
      sectionFromTopic('greek-adjective-endings','Endings'),
      sectionFromTopic('greek-kalos-paradigm','Agreement'),
      { title:'Comparative', body:['Comparatives normally express more/greater, often with -τερος patterns or irregular forms like μείζων.'], recognitionTips:['Look for -τερος/-τέρα/-τερον or irregular comparative stems.'], charts:[chart('Comparative anchors', ['Pattern','Example','Sense'], [['-τερος','σοφώτερος','wiser'],['irregular','μείζων','greater']])], examples:[ex('μείζων','John 14:28','greater')] },
      { title:'Superlative', body:['Superlatives express greatest/highest degree and are less common in the New Testament than comparatives.'], recognitionTips:['Look for -τατος/-τη/-τον patterns.'], charts:[chart('Superlative anchors', ['Pattern','Example','Sense'], [['-τατος','πρῶτος / μέγιστος','first / greatest']])], examples:[ex('πρῶτος','Matthew 22:38','first / greatest')] },
      sectionFromTopic('greek-kalos-paradigm','Examples')
    ], charts:[], examples:[ex('καλός','John 10:11','good'), ex('μείζων','John 14:28','greater')], related:['greek-nouns','greek-pronouns'] },
    { id:'greek-prepositions', language:'greek', title:'Prepositions', category:'Prepositions', summary:'Compact recognition guide for common Greek prepositions and the cases they govern.', body:['Prepositions narrow case use. Identify the preposition, then ask which case follows it.'], recognitionTips:['ἐν usually takes the dative.','εἰς usually takes the accusative.','ἐκ/ἐξ usually takes the genitive.'], searchTerms:['preposition','prepositions','case uses'], charts:[chart('Common prepositions', ['Preposition','Common case','Basic reading value'], [['ἐν','Dative','in / among'],['εἰς','Accusative','into / toward'],['ἐκ / ἐξ','Genitive','out of / from'],['διά','Genitive or Accusative','through / because of'],['μετά','Genitive or Accusative','with / after']])], examples:[ex('ἐν ἀρχῇ','John 1:1','in the beginning'), ex('εἰς τὸν κόσμον','John 1:9','into the world')], related:['greek-nouns','greek-case-functions'] },
    { id:'hebrew-nouns', language:'hebrew', title:'Nouns', category:'Nouns', summary:'Hebrew noun reference for state, number, article, suffixes, and construct recognition.', body:['Read Hebrew nouns by state and relationship: absolute, construct, article, suffix, then number.'], recognitionTips:['Construct forms bind to the following noun.','־ַיִם often marks dual.','Pronominal suffixes frequently express possession on nouns.'], searchTerms:['Noun patterns','Noun basics','Construct State','Absolute State','Dual Forms','Pronominal Suffixes','Article','Construct Chains','Suffixes cheat sheet'], sections:[
      sectionFromTopic('hebrew-construct-chains','Construct State', { searchTerms:['Construct Chains'] }),
      { title:'Absolute State', body:['The absolute state is the ordinary independent noun form, not bound to a following noun in a construct chain.'], recognitionTips:['A noun with the article or standing independently is often absolute.'], charts:[chart('Absolute vs construct', ['State','Example','Reading'], [['Absolute','דָּבָר','word'],['Construct','דְּבַר','word of']])], examples:[ex('דָּבָר','Representative','word')] },
      sectionFromTopic('hebrew-dual-forms','Dual'),
      sectionFromTopic('hebrew-pronominal-suffixes','Pronominal Suffixes'),
      { title:'Article', body:['The Hebrew article normally appears as prefixed הַ with doubling in the following consonant when spelling allows.'], recognitionTips:['הַ at the front of a noun often marks the article.','Prefixed prepositions can combine with the article.'], charts:[chart('Article clues', ['Form','Example','Sense'], [['הַ','הַמֶּלֶךְ','the king'],['בַּ','בַּבַּיִת','in the house']])], examples:[ex('הַמֶּלֶךְ','Representative','the king')] },
      sectionFromTopic('hebrew-noun-basics','Recognition Tips'),
      { title:'Examples', body:[], recognitionTips:[], charts:[], examples:[...(oldTopic('hebrew-noun-basics').examples||[]), ...(oldTopic('hebrew-construct-chains').examples||[]), ...(oldTopic('hebrew-pronominal-suffixes').examples||[]), ...(oldTopic('hebrew-dual-forms').examples||[])] }
    ], charts:[], examples:[ex('דְּבַר יְהוָה','Jeremiah 1:2','word of YHWH'), ex('יָדַיִם','Representative','hands')], related:['hebrew-verbs','hebrew-particles'] },
    { id:'hebrew-verbs', language:'hebrew', title:'Verbs', category:'Verbs', color:'qal', summary:'Major Hebrew verb reference for strong forms, stems, weak verbs, aspect, and waw consecutive recognition.', body:['Start with the verbal pattern: prefixes/suffixes, stem markers, root consonants, and whether וַי marks narrative sequence.'], recognitionTips:['וַי plus an imperfect form is the classic waw consecutive / wayyiqtol clue, as in וַיֹּאמֶר.','Stem markers such as נִ, doubled middle radical, and הִ narrow the binyan.','Weak roots may hide or change consonants.'], searchTerms:['Strong Verb Paradigms','Perfect','Imperfect','Imperative','Infinitive Construct','Infinitive Absolute','Participle','Stems','Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael','Weak Verbs','I-Aleph','I-Nun','III-He','Geminate','Hollow','Aspect','Waw Consecutive','Wayyiqtol','וַיֹּאמֶר'], sections:[
      sectionFromTopic('hebrew-stem-markers','Recognition Cheat Sheet'),
      { title:'Strong Verb Paradigms', body:['כתב is the representative strong verb pattern used for quick recognition.'], recognitionTips:['These Phase A forms are organized for recognition practice reuse; Phase B will perform the full scholarly verification.'], charts:hebrewStemIds.flatMap(id => (oldTopic(id).paradigmTabs||[]).flatMap(tab => tab.charts || [])), examples:[ex('כָּתַב','Jeremiah 36:2','he wrote / write')] },
      { title:'Perfect', body:[], recognitionTips:['Perfect forms often use suffixes for person, gender, and number.'], charts:chartsFromHebrewStemTabs(['Perfect']), examples:[] },
      { title:'Imperfect', body:[], recognitionTips:['Imperfect forms use prefixes plus endings.'], charts:chartsFromHebrewStemTabs(['Imperfect']), examples:[] },
      { title:'Imperative', body:[], recognitionTips:['Imperatives are second-person command forms; passive stems may need Phase B verification rather than forced Qal-looking forms.'], charts:chartsFromHebrewStemTabs(['Imperative']), examples:[] },
      { title:'Infinitive Construct', body:[], recognitionTips:['Often appears with לְ. Passive stem entries marked Needs review are intentionally not presented as Qal forms.'], charts:chartsFromHebrewStemTabs(['Infinitive Construct']), examples:[] },
      { title:'Infinitive Absolute', body:[], recognitionTips:['Often reinforces a nearby finite verb. Passive stem entries marked Needs review are intentionally not presented as Qal forms.'], charts:chartsFromHebrewStemTabs(['Infinitive Absolute']), examples:[] },
      { title:'Participle', body:[], recognitionTips:['Participles often behave as verbal adjectives.'], charts:chartsFromHebrewStemTabs(['Participles']), examples:[] },
      { title:'Stems', body:['The stems modify the root idea in conventional active, passive, causative, intensive, reflexive, or reciprocal directions.'], recognitionTips:stemRelationships, charts:[chart('Stem overview', ['Stem','Typical value','Pattern','Recognition'], Object.entries(stemInfo).map(([s,v])=>[s,v[0],v[1],v[2]]))], examples:[] },
      ...['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'].map(hebrewStemSection),
      sectionFromTopic('hebrew-weak-verbs','Weak Verbs', { searchTerms:['I-Aleph','I-Nun','III-He','Geminate','Hollow'] }),
      { title:'I-Aleph', body:['I-א verbs can show vowel and guttural behavior that obscures the expected strong pattern.'], recognitionTips:['Watch for א as the first root consonant and compensating vowel patterns.'], charts:[chart('I-Aleph clue', ['Class','Recognition'], [['I-א','initial aleph with guttural vowel behavior']])], examples:[ex('אָמַר','Genesis 1:3','he said')] },
      { title:'Aspect', body:['Hebrew perfect and imperfect are better treated as aspectual forms whose time value comes from context, genre, and sequence.'], recognitionTips:['Do not translate perfect as mechanically past or imperfect as mechanically future.'], charts:[chart('Aspect reading', ['Form','Common reading task'], [['Perfect','completed, whole, or stative viewpoint'],['Imperfect','incomplete, habitual, modal, future, or sequenced action']])], examples:[] },
      sectionFromTopic('hebrew-wayyiqtol','Waw Consecutive', { searchTerms:['wayyiqtol','וַיֹּאמֶר'] }),
      sectionFromTopic('hebrew-stem-markers','Recognition Tips'),
      { title:'Examples', body:[], recognitionTips:[], charts:[], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said'), ...(oldTopic('hebrew-qal').examples||[]), ...(oldTopic('hebrew-wayyiqtol').examples||[])] }
    ], charts:[], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said'), ex('כָּתַב','Jeremiah 36:2','he wrote / write')], related:['hebrew-nouns','hebrew-particles'] },
    { id:'hebrew-particles', language:'hebrew', title:'Particles', category:'Particles', summary:'Common Hebrew prefixes, particles, and small-form recognition cues.', body:['Particles and prefixed elements shape reading before full parsing begins.'], recognitionTips:['וְ/וַ marks conjunction or sequence depending form.','לְ, בְּ, כְּ attach directly to nouns and infinitives.','הַ may be article or interrogative depending context.'], searchTerms:['Prefixes cheat sheet','particles','prepositions','article'], sections:[
      sectionFromTopic('hebrew-prefixes','Prefixes'),
      { title:'Article', body:['The article is usually prefixed הַ, sometimes absorbed into a prefixed preposition.'], recognitionTips:['Look for הַ and following doubling when spelling allows.'], charts:[chart('Particle/article anchors', ['Form','Reading'], [['הַ','the / question marker by context'],['בַּ','in the'],['לַ','to the']])], examples:[ex('בַּבַּיִת','Representative','in the house')] },
      { title:'Examples', body:[], recognitionTips:[], charts:[], examples:[...(oldTopic('hebrew-prefixes').examples||[])] }
    ], charts:[], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said')], related:['hebrew-nouns','hebrew-verbs'] }
  );
  applyGreekNounSectionTabs(topics.find(t => t.id === 'greek-nouns'));
  applyVerbSectionTabs(topics.find(t => t.id === 'greek-verbs'));
  applyGreekAdjectiveSectionTabs(topics.find(t => t.id === 'greek-adjectives'));
  applyHebrewNounSectionTabs(topics.find(t => t.id === 'hebrew-nouns'));
  applyHebrewVerbSectionTabs(topics.find(t => t.id === 'hebrew-verbs'));
  const scrubReferenceColors = value => {
    if (!value || typeof value !== 'object') return;
    delete value.color;
    Object.values(value).forEach(child => Array.isArray(child) ? child.forEach(scrubReferenceColors) : scrubReferenceColors(child));
  };
  topics.forEach(scrubReferenceColors);

  const referenceTopicOrder = ['greek-verbs','greek-nouns','greek-pronouns','greek-adjectives','greek-prepositions','grammar-parsing-decoder','grammar-parsing-ambiguity','hebrew-verbs','hebrew-nouns','hebrew-particles'];
  const visibleTopics = topics
    .filter(t => !oldTopicAliasIds.has(t.id))
    .sort((a,b) => {
      const ai = referenceTopicOrder.indexOf(a.id);
      const bi = referenceTopicOrder.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  function canonicalTopicId(id){ return oldTopicAliases[id] || id; }
  function getReferenceTopic(id){ const canonical = canonicalTopicId(id); return visibleTopics.find(t => t.id === canonical) || topics.find(t => t.id === canonical); }
  function topicLabel(id){ return getReferenceTopic(id)?.title || id; }
  function cellText(cell){ return typeof cell === 'object' && cell !== null ? Object.values(cell).join(' ') : String(cell ?? ''); }
  function normalizeSearchText(value){ return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function flattenCharts(charts){ return (charts||[]).flatMap(c=>[c.heading,c.label,c.note,c.color,...(c.columns||[]),...(c.rows||[]).flat().map(cellText)]); }
  function flattenExamples(examples){ return (examples||[]).flatMap(e=>[e.word,e.reference,e.translation,e.note,e.text]); }
  function flattenSections(sections){ return (sections||[]).flatMap(s=>[s.title, ...(s.body||[]), ...(s.recognitionTips||[]), ...(s.searchTerms||[]), ...flattenCharts(s.charts), ...flattenExamples(s.examples)]); }
  function flattenSectionTabs(sectionTabs){ return (sectionTabs||[]).flatMap(tab=>[tab.label, ...(tab.jumpChips||[]).flatMap(chip=>[chip.label, chip.target]), ...flattenSections(tab.sections)]); }
  function flattenTopic(topic){ return [topic.id, topic.title, topic.category, topic.summary, topic.frequency, ...(topic.searchTerms||[]), ...(topic.body||[]), ...(topic.recognitionTips||[]), ...(topic.principalParts||[]), ...flattenSections(topic.sections), ...flattenSectionTabs(topic.sectionTabs), ...(topic.paradigmTabs||[]).flatMap(tab=>[tab.label,...flattenCharts(tab.charts)]), ...flattenCharts(topic.charts), ...flattenExamples(topic.examples), ...(topic.related||[]).map(topicLabel), ...(topic.featureLinks||[]).flatMap(l=>[l.label,l.type,l.target]), topic.stemRelationships?.root, ...(topic.stemRelationships?.stems||[]), ...(topic.stemRelationships?.explanation||[])].join(' '); }
  function referenceSectionSlug(section, index=0){ return section.id || String(section.title || `section-${index}`).toLowerCase().replace(/[^a-z0-9\u0370-\u03ff\u0590-\u05ff]+/g,'-').replace(/^-|-$/g,''); }
  function searchReferenceTopics(query='', language='all'){
    const q = normalizeSearchText(String(query).trim());
    return visibleTopics.filter(t => (language === 'all' || t.language === language) && (!q || normalizeSearchText(flattenTopic(t)).includes(q)));
  }
  function referenceParadigmGroups(language='all'){
    return visibleTopics
      .filter(topic => (language === 'all' || topic.language === language) && (topic.sectionTabs?.some(tab => tab.id === 'paradigms') || topic.paradigmTabs?.length))
      .map(topic => ({
        topicId: topic.id,
        language: topic.language,
        title: topic.title,
        sections: (topic.sectionTabs?.find(tab => tab.id === 'paradigms')?.sections || []).map((section, index) => ({ id: referenceSectionSlug(section, index), title: section.title })),
        paradigmTabs: (topic.paradigmTabs || []).map(tab => ({ id: tab.id, label: tab.label }))
      }));
  }
  function decodeParsing(input){ const key=String(input||'').trim().toUpperCase().replace(/\s+/g,' '); return decoderEntries[key] || null; }
  const api = { referenceTopics: visibleTopics, futureGrammarHooks, searchReferenceTopics, getReferenceTopic, topicLabel, referenceColors: COLORS, decodeParsing, decoderEntries, oldTopicAliases, canonicalTopicId, referenceParadigmGroups };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PuritanReferenceLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
