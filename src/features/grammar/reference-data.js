/* ---------- Grammar & Reference Library Data ---------- */
(function(root){
  const handbookLibrary = root.PuritanHandbookData || (typeof module !== 'undefined' && module.exports ? require('./handbook-data') : null);
  const COLORS = {};
  const ex = (word, reference, translation, note='') => ({ word, reference, translation, note });
  const chart = (label, columns, rows, options={}) => ({ label, columns, rows, ...options });
  const MACHEN_1923 = Object.freeze({
    author:'J. Gresham Machen',
    title:'New Testament Greek for Beginners',
    publication:'New York: The Macmillan Company, 1923',
    edition:'1923 first edition',
    scan:'CCEL digital facsimile v0.1 (page-image scan)',
    scanUrl:'https://www.ccel.org/m/machen/greek/home.html'
  });
  const machenSource = (printedPages, sections) => ({ ...MACHEN_1923, printedPages, sections });
  const featureLinks = (...links) => links.map(([label, type, target]) => ({ label, type, target }));
  const greekVerbChart = chart('λύω present active indicative endings', ['Person','Singular','Plural','Recognition clue'], [['1st','λύω','λύομεν','ω / μεν'],['2nd','λύεις','λύετε','εις / τε'],['3rd','λύει','λύουσι(ν)','ει / ουσι']], { color:'tense', note:'Representative omega-verb forms; accents and movable nu may vary.' });
  const hebrewStemRows = [['Perfect','קָטַל','suffix-conjugation form'],['Imperfect','יִקְטֹל','prefix-conjugation form'],['Imperative','קְטֹל','command form'],['Infinitive Construct','קְטֹל','construct infinitive'],['Infinitive Absolute','קָטוֹל','absolute infinitive'],['Participle','קֹטֵל','participle anchor']];
  const stemInfo = {
    Qal:['simple active/stative','קָטַל','basic lexical pattern'], Niphal:['passive/reflexive of Qal','נִקְטַל','often has נ or assimilated nun'], Piel:['intensive/factitive active','קִטֵּל','doubled middle radical'], Pual:['passive of Piel','קֻטַּל','u-class vowel with doubling'], Hiphil:['causative active','הִקְטִיל','prefixed הִ and characteristic i-class vowel'], Hophal:['passive of Hiphil','הָקְטַל','prefixed הָ in Gesenius’ strong model'], Hitpael:['reflexive/reciprocal','הִתְקַטֵּל','הת prefix plus doubling']
  };
  const stemRelationships = ['Qal gives the simple lexical baseline for many roots.','Niphal commonly presents the Qal idea as passive or reflexive.','Piel and Pual often form an active/passive pair with intensified, factitive, or result-focused force.','Hiphil and Hophal often form a causative active/passive pair.','Hitpael commonly adds reflexive or reciprocal involvement.'];
  const hebrewStemTopic = stem => ({ id:`hebrew-${stem.toLowerCase()}`, language:'hebrew', title:`${stem} Paradigms`, category:`${stem} Paradigms`, color:stem.toLowerCase(), frequency: stem==='Qal' ? '≈ majority of Hebrew verbal forms' : stem==='Niphal' ? 'common major stem' : 'regular major stem; less frequent than Qal', summary:`${stem} is one of the major Biblical Hebrew verbal stems (binyanim).`, body:[stem==='Qal'?'Qal is the basic/light stem and often carries the simple lexical meaning of the verb.':`${stem} modifies the root idea in a conventional stem relationship; exact meaning depends on the root and context.`, ...stemRelationships], recognitionTips: stem==='Hiphil' ? ['Look for prefixed הִ in perfect and infinitive forms.','Characteristic i-class vowels often mark the stem.','Confirm the stem from the whole pointed pattern.'] : [`Watch for the ${stemInfo[stem][1]} pattern.`, stemInfo[stem][2], 'Confirm the stem by both consonantal pattern and vowels.'], charts:[chart(`${stem} quick profile`, ['Stem','Typical value','Pattern','Recognition'], [[stem, stemInfo[stem][0], stemInfo[stem][1], stemInfo[stem][2]]], { color:stem.toLowerCase(), note:'Representative strong-verb pattern.' }), chart(`${stem} representative paradigm: קטל`, ['Form','Representative','Recognition'], hebrewRepresentativeRows(stem), { color:stem.toLowerCase(), note:'קטל is a model strong root, not an ordinary vocabulary lemma.' })], examples:[ex(stemInfo[stem][1],'Gesenius Paradigm B','model strong-root pattern')], paradigmTabs:hebrewTabs(stem), breadcrumbs:['Grammar','Hebrew',`${stem} Paradigms`], stemRelationships:{ root:'קטל', stems:['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'], explanation:stemRelationships }, featureLinks:featureLinks(['See words with this feature','feature',stem],['See related vocabulary','vocabulary',stem],['See related topics','topics',`hebrew-${stem.toLowerCase()}`]), related:['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-pual','hebrew-hiphil','hebrew-hophal','hebrew-hitpael','hebrew-stem-markers'].filter(id=>id!==`hebrew-${stem.toLowerCase()}`) });

  const six = rows => rows;
  const greekFinite = (label, sg, pl, options={}) => chart(label, ['Person','Singular','Plural'], [['1st',sg[0],pl[0]],['2nd',sg[1],pl[1]],['3rd',sg[2],pl[2]]], options);
  const greekImperative = (label, forms, options={}) => chart(label, ['Person','Singular','Plural'], [['2nd',forms[0],forms[2]],['3rd',forms[1],forms[3]]], options);
  const greekInfinitive = (label, form, options={}) => chart(label, ['Form'], [[form]], options);
  const greekParticiple = (label, rows, options={}) => chart(label, ['Case','Masculine','Feminine','Neuter'], rows, options);
  const v134 = options => ({ milestone:'v1.3.4', ...options });
  const fullParticipleRows = {
    presentActive:[['Nom sg','λύων','λύουσα','λῦον'],['Gen sg','λύοντος','λυούσης','λύοντος'],['Dat sg','λύοντι','λυούσῃ','λύοντι'],['Acc sg','λύοντα','λύουσαν','λῦον'],['Nom pl','λύοντες','λύουσαι','λύοντα'],['Gen pl','λυόντων','λυουσῶν','λυόντων'],['Dat pl','λύουσι(ν)','λυούσαις','λύουσι(ν)'],['Acc pl','λύοντας','λυούσας','λύοντα']],
    presentMiddlePassive:[['Nom sg','λυόμενος','λυομένη','λυόμενον'],['Gen sg','λυομένου','λυομένης','λυομένου'],['Dat sg','λυομένῳ','λυομένῃ','λυομένῳ'],['Acc sg','λυόμενον','λυομένην','λυόμενον'],['Nom pl','λυόμενοι','λυόμεναι','λυόμενα'],['Gen pl','λυομένων','λυομένων','λυομένων'],['Dat pl','λυομένοις','λυομέναις','λυομένοις'],['Acc pl','λυομένους','λυομένας','λυόμενα']],
    aoristActive:[['Nom sg','λύσας','λύσασα','λῦσαν'],['Gen sg','λύσαντος','λυσάσης','λύσαντος'],['Dat sg','λύσαντι','λυσάσῃ','λύσαντι'],['Acc sg','λύσαντα','λύσασαν','λῦσαν'],['Nom pl','λύσαντες','λύσασαι','λύσαντα'],['Gen pl','λυσάντων','λυσασῶν','λυσάντων'],['Dat pl','λύσασι(ν)','λυσάσαις','λύσασι(ν)'],['Acc pl','λύσαντας','λυσάσας','λύσαντα']],
    aoristMiddle:[['Nom sg','λυσάμενος','λυσαμένη','λυσάμενον'],['Gen sg','λυσαμένου','λυσαμένης','λυσαμένου'],['Dat sg','λυσαμένῳ','λυσαμένῃ','λυσαμένῳ'],['Acc sg','λυσάμενον','λυσαμένην','λυσάμενον'],['Nom pl','λυσάμενοι','λυσάμεναι','λυσάμενα'],['Gen pl','λυσαμένων','λυσαμένων','λυσαμένων'],['Dat pl','λυσαμένοις','λυσαμέναις','λυσαμένοις'],['Acc pl','λυσαμένους','λυσαμένας','λυσάμενα']],
    aoristPassive:[['Nom sg','λυθείς','λυθεῖσα','λυθέν'],['Gen sg','λυθέντος','λυθείσης','λυθέντος'],['Dat sg','λυθέντι','λυθείσῃ','λυθέντι'],['Acc sg','λυθέντα','λυθεῖσαν','λυθέν'],['Nom pl','λυθέντες','λυθεῖσαι','λυθέντα'],['Gen pl','λυθέντων','λυθεισῶν','λυθέντων'],['Dat pl','λυθεῖσι(ν)','λυθείσαις','λυθεῖσι(ν)'],['Acc pl','λυθέντας','λυθείσας','λυθέντα']],
    perfectActive:[['Nom sg','λελυκώς','λελυκυῖα','λελυκός'],['Gen sg','λελυκότος','λελυκυίας','λελυκότος'],['Dat sg','λελυκότι','λελυκυίᾳ','λελυκότι'],['Acc sg','λελυκότα','λελυκυῖαν','λελυκός'],['Nom pl','λελυκότες','λελυκυῖαι','λελυκότα'],['Gen pl','λελυκότων','λελυκυιῶν','λελυκότων'],['Dat pl','λελυκόσι(ν)','λελυκυίαις','λελυκόσι(ν)'],['Acc pl','λελυκότας','λελυκυίας','λελυκότα']],
    perfectMiddlePassive:[['Nom sg','λελυμένος','λελυμένη','λελυμένον'],['Gen sg','λελυμένου','λελυμένης','λελυμένου'],['Dat sg','λελυμένῳ','λελυμένῃ','λελυμένῳ'],['Acc sg','λελυμένον','λελυμένην','λελυμένον'],['Nom pl','λελυμένοι','λελυμέναι','λελυμένα'],['Gen pl','λελυμένων','λελυμένων','λελυμένων'],['Dat pl','λελυμένοις','λελυμέναις','λελυμένοις'],['Acc pl','λελυμένους','λελυμένας','λελυμένα']]
  };
  const greekLyoTabs = [
    { id:'present', label:'Present', charts:[
      greekFinite('Present Active Indicative',['λύω','λύεις','λύει'],['λύομεν','λύετε','λύουσι(ν)'], { id:'greek-present-active-indicative-lyo', lemma:'λύω', source:machenSource('20, 27','§18; movable ν §44'), note:'Regular omega-verb paradigm; parenthesized ν is movable.' }),
      greekFinite('Present Middle/Passive Indicative',['λύομαι','λύῃ','λύεται'],['λυόμεθα','λύεσθε','λύονται'], { id:'greek-present-middle-passive-indicative-lyo', lemma:'λύω', source:machenSource('58–59','§§110–112'), note:'The present middle and passive are identical in form.' }),
      greekFinite('Present Active Subjunctive',['λύω','λύῃς','λύῃ'],['λύωμεν','λύητε','λύωσι(ν)'], v134({ id:'greek-present-active-subjunctive-lyo', lemma:'λύω', source:machenSource('128–130, 238','§§269–280; regular-verb paradigm §589'), note:'Long ω/η mood vowels distinguish the subjunctive; movable ν is retained in the third plural.' })),
      greekFinite('Present Middle/Passive Subjunctive',['λύωμαι','λύῃ','λύηται'],['λυώμεθα','λύησθε','λύωνται'], v134({ id:'greek-present-middle-passive-subjunctive-lyo', lemma:'λύω', source:machenSource('129–130, 238','§§271–280; regular-verb paradigm §589'), note:'Middle and passive share the same present subjunctive forms.' })),
      greekImperative('Present Active Imperative',['λῦε','λυέτω','λύετε','λυόντων'], v134({ id:'greek-present-active-imperative-lyo', lemma:'λύω', source:machenSource('177–178, 238','§§404–407; regular-verb paradigm §589'), note:'Imperatives have second- and third-person forms only.' })),
      greekImperative('Present Middle/Passive Imperative',['λύου','λυέσθω','λύεσθε','λυέσθων'], v134({ id:'greek-present-middle-passive-imperative-lyo', lemma:'λύω', source:machenSource('177–178, 238','§§404–410; regular-verb paradigm §589'), note:'Middle and passive share the present imperative forms.' })),
      greekInfinitive('Present Active Infinitive','λύειν', v134({ id:'greek-present-active-infinitive-lyo', lemma:'λύω', source:machenSource('136, 238','§§293–294; regular-verb paradigm §589') })), greekInfinitive('Present Middle/Passive Infinitive','λύεσθαι', v134({ id:'greek-present-middle-passive-infinitive-lyo', lemma:'λύω', source:machenSource('136, 238','§§293–294; regular-verb paradigm §589') })),
      greekParticiple('Present Active Participle', fullParticipleRows.presentActive, v134({ id:'greek-present-active-participle-lyo', lemma:'λύω', source:machenSource('102, 232, 238','§§226–229; participle paradigm §576; regular-verb paradigm §589'), note:'The masculine and neuter follow third-declension patterns; the feminine follows the first declension.' })), greekParticiple('Present Middle/Passive Participle', fullParticipleRows.presentMiddlePassive, v134({ id:'greek-present-middle-passive-participle-lyo', lemma:'λύω', source:machenSource('103, 238','§§230–231; regular-verb paradigm §589'), note:'The -μενος family declines like a regular first/second-declension adjective.' })) ]},
    { id:'imperfect', label:'Imperfect', charts:[
      greekFinite('Imperfect Active Indicative',['ἔλυον','ἔλυες','ἔλυε(ν)'],['ἐλύομεν','ἐλύετε','ἔλυον'], { id:'greek-imperfect-active-indicative-lyo', lemma:'λύω', source:machenSource('65–66','§§123–130'), note:'Augmented present stem with secondary active endings; ν is movable in ἔλυε(ν).' }),
      greekFinite('Imperfect Middle/Passive Indicative',['ἐλυόμην','ἐλύου','ἐλύετο'],['ἐλυόμεθα','ἐλύεσθε','ἐλύοντο'], { id:'greek-imperfect-middle-passive-indicative-lyo', lemma:'λύω', source:machenSource('69–70','§§137–143'), note:'The imperfect middle and passive are identical in form.' })
    ]},
    { id:'future', label:'Future', charts:[
      greekFinite('Future Active Indicative',['λύσω','λύσεις','λύσει'],['λύσομεν','λύσετε','λύσουσι(ν)'], { id:'greek-future-active-indicative-lyo', lemma:'λύω', source:machenSource('75, 27','§154; movable ν §44'), note:'Built from the second principal part, λύσω.' }),
      greekFinite('Future Middle Indicative',['λύσομαι','λύσῃ','λύσεται'],['λυσόμεθα','λύσεσθε','λύσονται'], { id:'greek-future-middle-indicative-lyo', lemma:'λύω', source:machenSource('75','§155'), note:'Built from the second principal part, λύσω.' }),
      greekFinite('Future Passive Indicative',['λυθήσομαι','λυθήσῃ','λυθήσεται'],['λυθησόμεθα','λυθήσεσθε','λυθήσονται'], { id:'greek-future-passive-indicative-lyo', lemma:'λύω', source:machenSource('92–93','§§197–202'), note:'Built from the aorist-passive stem represented by the sixth principal part, ἐλύθην, without the augment.' })
    ]},
    { id:'aorist', label:'Aorist', charts:[
      greekFinite('First Aorist Active Indicative',['ἔλυσα','ἔλυσας','ἔλυσε(ν)'],['ἐλύσαμεν','ἐλύσατε','ἔλυσαν'], { id:'greek-first-aorist-active-indicative-lyo', lemma:'λύω', source:machenSource('82–83','§§171–177'), note:'First-aorist active system from the third principal part, ἔλυσα.' }),
      greekFinite('First Aorist Middle Indicative',['ἐλυσάμην','ἐλύσω','ἐλύσατο'],['ἐλυσάμεθα','ἐλύσασθε','ἐλύσαντο'], { id:'greek-first-aorist-middle-indicative-lyo', lemma:'λύω', source:machenSource('83','§178'), note:'First-aorist middle system from the third principal part, ἔλυσα.' }),
      greekFinite('Second Aorist Active Indicative',['ἔλιπον','ἔλιπες','ἔλιπε(ν)'],['ἐλίπομεν','ἐλίπετε','ἔλιπον'], { id:'greek-second-aorist-active-indicative-leipo', lemma:'λείπω', principalPart:'ἔλιπον', source:machenSource('87–89, 242','§§186–193; consolidated paradigm §593'), note:'Representative second aorist supplied by Machen: λείπω, second-aorist principal part ἔλιπον.' }),
      greekFinite('Second Aorist Middle Indicative',['ἐλιπόμην','ἐλίπου','ἐλίπετο'],['ἐλιπόμεθα','ἐλίπεσθε','ἐλίποντο'], { id:'greek-second-aorist-middle-indicative-leipo', lemma:'λείπω', principalPart:'ἔλιπον', source:machenSource('87–90, 242','§§186–194; consolidated paradigm §593'), note:'Representative second aorist supplied by Machen; it is not generated from λύω.' }),
      greekFinite('Aorist Passive Indicative',['ἐλύθην','ἐλύθης','ἐλύθη'],['ἐλύθημεν','ἐλύθητε','ἐλύθησαν'], { id:'greek-aorist-passive-indicative-lyo', lemma:'λύω', principalPart:'ἐλύθην', source:machenSource('92–93','§§197–201'), note:'The sixth principal part supplies the aorist-passive stem; this is distinct from active and middle aorist formation.' }),
      greekFinite('Aorist Active Subjunctive',['λύσω','λύσῃς','λύσῃ'],['λύσωμεν','λύσητε','λύσωσι(ν)'], v134({ id:'greek-aorist-active-subjunctive-lyo', lemma:'λύω', source:machenSource('129–130, 238','§§274–281; regular-verb paradigm §589'), note:'The aorist stem appears without augment outside the indicative.' })), greekFinite('Aorist Middle Subjunctive',['λύσωμαι','λύσῃ','λύσηται'],['λυσώμεθα','λύσησθε','λύσωνται'], v134({ id:'greek-aorist-middle-subjunctive-lyo', lemma:'λύω', source:machenSource('129–130, 238','§§275–281; regular-verb paradigm §589'), note:'The aorist stem appears without augment outside the indicative.' })), greekFinite('Aorist Passive Subjunctive',['λυθῶ','λυθῇς','λυθῇ'],['λυθῶμεν','λυθῆτε','λυθῶσι(ν)'], v134({ id:'greek-aorist-passive-subjunctive-lyo', lemma:'λύω', source:machenSource('130, 238','§§279–281; regular-verb paradigm §589'), note:'The θη passive formative contracts with the long subjunctive vowel.' })),
      greekImperative('Aorist Active Imperative',['λῦσον','λυσάτω','λύσατε','λυσάντων'], v134({ id:'greek-aorist-active-imperative-lyo', lemma:'λύω', source:machenSource('177–179, 238','§§404–413; regular-verb paradigm §589') })), greekImperative('Aorist Middle Imperative',['λῦσαι','λυσάσθω','λύσασθε','λυσάσθων'], v134({ id:'greek-aorist-middle-imperative-lyo', lemma:'λύω', source:machenSource('177–179, 238','§§404–413; regular-verb paradigm §589') })), greekImperative('Aorist Passive Imperative',['λύθητι','λυθήτω','λύθητε','λυθέντων'], v134({ id:'greek-aorist-passive-imperative-lyo', lemma:'λύω', source:machenSource('177–179, 238','§§404–415; regular-verb paradigm §589'), note:'The aorist passive imperative uses the θη stem without augment.' })),
      greekInfinitive('Aorist Active Infinitive','λῦσαι', v134({ id:'greek-aorist-active-infinitive-lyo', lemma:'λύω', source:machenSource('136–137, 238','§§293–296; regular-verb paradigm §589') })), greekInfinitive('Aorist Middle Infinitive','λύσασθαι', v134({ id:'greek-aorist-middle-infinitive-lyo', lemma:'λύω', source:machenSource('136–137, 238','§§293–296; regular-verb paradigm §589') })), greekInfinitive('Aorist Passive Infinitive','λυθῆναι', v134({ id:'greek-aorist-passive-infinitive-lyo', lemma:'λύω', source:machenSource('136–137, 238','§§293–296; regular-verb paradigm §589'), note:'The passive infinitive lengthens the θη formative.' })),
      greekParticiple('Aorist Active Participle', fullParticipleRows.aoristActive, v134({ id:'greek-aorist-active-participle-lyo', lemma:'λύω', source:machenSource('113, 233, 238','§§242–245; participle paradigm §577; regular-verb paradigm §589'), note:'The σα formative is visible throughout; no augment appears.' })), greekParticiple('Aorist Middle Participle', fullParticipleRows.aoristMiddle, v134({ id:'greek-aorist-middle-participle-lyo', lemma:'λύω', source:machenSource('114–116, 238','§§246–253; regular-verb paradigm §589'), note:'The -σάμενος family follows regular first/second-declension adjective endings.' })), greekParticiple('Aorist Passive Participle', fullParticipleRows.aoristPassive, v134({ id:'greek-aorist-passive-participle-lyo', lemma:'λύω', source:machenSource('121, 234, 238','§259; participle paradigm §579; regular-verb paradigm §589'), note:'The θεντ stem is visible in oblique masculine and neuter forms.' })) ]},
    { id:'perfect', label:'Perfect', charts:[
      greekFinite('Perfect Active Indicative',['λέλυκα','λέλυκας','λέλυκε(ν)'],['λελύκαμεν','λελύκατε','λελύκασι(ν) / λέλυκαν'], { id:'greek-perfect-active-indicative-lyo', lemma:'λύω', source:machenSource('183–184','§§426, 429–431'), note:'Machen explicitly supplies λέλυκαν as an alternate third-person plural beside λελύκασι(ν).' }),
      greekFinite('Perfect Middle/Passive Indicative',['λέλυμαι','λέλυσαι','λέλυται'],['λελύμεθα','λέλυσθε','λέλυνται'], { id:'greek-perfect-middle-passive-indicative-lyo', lemma:'λύω', source:machenSource('186–187','§§442–448'), note:'Pedagogical regular omega-verb paradigm formed from the fifth principal part, λέλυμαι.' }),
      greekInfinitive('Perfect Active Infinitive','λελυκέναι', v134({ id:'greek-perfect-active-infinitive-lyo', lemma:'λύω', source:machenSource('183, 238','§427; regular-verb paradigm §589'), note:'Reduplication and the κ perfect formative remain visible.' })), greekInfinitive('Perfect Middle/Passive Infinitive','λελύσθαι', v134({ id:'greek-perfect-middle-passive-infinitive-lyo', lemma:'λύω', source:machenSource('186, 238','§443; regular-verb paradigm §589'), note:'The ending is added directly to the reduplicated perfect middle/passive stem.' })), greekParticiple('Perfect Active Participle', fullParticipleRows.perfectActive, v134({ id:'greek-perfect-active-participle-lyo', lemma:'λύω', source:machenSource('184, 233, 238','§§428, 433; participle paradigm §578; regular-verb paradigm §589'), note:'The masculine and neuter use the κοτ stem outside the nominative; the feminine uses -κυῖα.' })), greekParticiple('Perfect Middle/Passive Participle', fullParticipleRows.perfectMiddlePassive, v134({ id:'greek-perfect-middle-passive-participle-lyo', lemma:'λύω', source:machenSource('186, 238','§§444–447; regular-verb paradigm §589'), note:'Reduplication plus the -μενος adjective pattern marks this family.' }))
    ]},
    { id:'pluperfect', label:'Pluperfect', charts:[
      greekFinite('Pluperfect Active Indicative',['ἐλελύκειν','ἐλελύκεις','ἐλελύκει'],['ἐλελύκειμεν','ἐλελύκειτε','ἐλελύκεισαν'], { id:'greek-pluperfect-active-indicative-lyo', lemma:'λύω', source:machenSource('187, 238','§450; regular-verb paradigm §589'), note:'Machen appendix convention: the initial augment is optional, (ἐ)-. The chart shows the augmented forms and does not infer a middle/passive pluperfect paradigm.' })
    ]},
    { id:'eimi', label:'εἰμί', charts:[
      greekFinite('Present Indicative of εἰμί',['εἰμί','εἶ','ἐστί(ν)'],['ἐσμέν','ἐστέ','εἰσί(ν)'], { id:'greek-present-indicative-eimi', lemma:'εἰμί', source:machenSource('50','§98'), note:'All forms except εἶ are enclitic; accents appear here as Machen prints them in the paradigm. Movable ν is explicit in ἐστί(ν) and εἰσί(ν).' }),
      greekFinite('Imperfect Indicative of εἰμί',['ἤμην','ἦς','ἦν'],['ἦμεν','ἦτε','ἦσαν'], { id:'greek-imperfect-indicative-eimi', lemma:'εἰμί', source:machenSource('66','§133'), note:'Complete six-person indicative paradigm.' }),
      greekFinite('Future Indicative of εἰμί',['ἔσομαι','ἔσῃ','ἔσται'],['ἐσόμεθα','ἔσεσθε','ἔσονται'], { id:'greek-future-indicative-eimi', lemma:'εἰμί', source:machenSource('152–153','§335'), note:'Future indicative remains its own supplied system; v1.3.4 present non-indicative forms are charted separately.' })
      ,greekFinite('Present Subjunctive of εἰμί',['ὦ','ᾖς','ᾖ'],['ὦμεν','ἦτε','ὦσι(ν)'], v134({ id:'greek-present-subjunctive-eimi', lemma:'εἰμί', source:machenSource('131, 250','§282; complete paradigm §602'), note:'The third-person plural retains movable ν.' })),
      greekImperative('Present Imperative of εἰμί',['ἴσθι','ἔστω','ἔστε','ἔστωσαν'], v134({ id:'greek-present-imperative-eimi', lemma:'εἰμί', source:machenSource('180, 250','§423; complete paradigm §602') })),
      greekInfinitive('Present Infinitive of εἰμί','εἶναι', v134({ id:'greek-present-infinitive-eimi', lemma:'εἰμί', source:machenSource('137, 250','§297; complete paradigm §602') })),
      greekParticiple('Present Participle of εἰμί', [['Nom sg','ὤν','οὖσα','ὄν'],['Gen sg','ὄντος','οὔσης','ὄντος'],['Dat sg','ὄντι','οὔσῃ','ὄντι'],['Acc sg','ὄντα','οὖσαν','ὄν'],['Nom pl','ὄντες','οὖσαι','ὄντα'],['Gen pl','ὄντων','οὐσῶν','ὄντων'],['Dat pl','οὖσι(ν)','οὔσαις','οὖσι(ν)'],['Acc pl','ὄντας','οὔσας','ὄντα']], v134({ id:'greek-present-participle-eimi', lemma:'εἰμί', source:machenSource('234, 250','participle paradigm §580; complete paradigm §602') }))
    ]},
    { id:'non-finite', label:'Infinitives & Participles', charts:[chart('Infinitive quick index',['Tense/Voice','Form'],[['Present Active','λύειν'],['Present Middle/Passive','λύεσθαι'],['Future Active','λύσειν'],['Future Middle','λύσεσθαι'],['Future Passive','λυθήσεσθαι'],['Aorist Active','λῦσαι'],['Aorist Middle','λύσασθαι'],['Aorist Passive','λυθῆναι'],['Perfect Active','λελυκέναι'],['Perfect Middle/Passive','λελύσθαι']], v134({ id:'greek-infinitive-system-index-lyo', lemma:'λύω', source:machenSource('136–137, 183, 186, 238','§§293–297, 427, 443; regular-verb paradigm §589'), note:'Future infinitives are included here because Machen supplies them directly in the consolidated regular-verb paradigm.' })), chart('Participle quick index',['Tense/Voice','Masc nom sg','Fem nom sg','Neut nom sg'],[['Present Active','λύων','λύουσα','λῦον'],['Present Middle/Passive','λυόμενος','λυομένη','λυόμενον'],['Aorist Active','λύσας','λύσασα','λῦσαν'],['Aorist Middle','λυσάμενος','λυσαμένη','λυσάμενον'],['Aorist Passive','λυθείς','λυθεῖσα','λυθέν'],['Perfect Active','λελυκώς','λελυκυῖα','λελυκός'],['Perfect Middle/Passive','λελυμένος','λελυμένη','λελυμένον']], v134({ id:'greek-participle-system-index-lyo', lemma:'λύω', source:machenSource('102–103, 113–116, 121, 184, 186, 232–234, 238','§§226–231, 242–253, 259, 428–447; paradigms §§576–580, 589'), note:'Use the detailed declension charts for case and number forms.' }))]},
    { id:'principal-parts', label:'Principal Parts', charts:[
      chart('λύω principal parts and indicative systems', ['Part','Form','Indicative relationship'], [['Present','λύω','present and imperfect stems'],['Future active','λύσω','future active and middle'],['Aorist active','ἔλυσα','first-aorist active and middle'],['Perfect active','λέλυκα','perfect and active pluperfect'],['Perfect middle/passive','λέλυμαι','perfect middle/passive'],['Aorist passive','ἐλύθην','aorist passive and future passive']], { id:'greek-principal-parts-lyo', lemma:'λύω', source:machenSource('77, 92–93, 183–187, 238','§§159, 197–202, 426–450; regular-verb paradigm §589'), note:'Recognition-oriented system map, not a principal-parts dictionary.' }),
      chart('λείπω second-aorist relationship', ['Lexical form','Second-aorist principal part','Indicative systems'], [['λείπω','ἔλιπον','second-aorist active and middle']], { id:'greek-principal-parts-leipo-second-aorist', lemma:'λείπω', source:machenSource('87–90, 242','§§186–194; consolidated paradigm §593'), note:'Machen directly supplies λείπω as the representative second-aorist paradigm.' })
    ]}
  ];
  const greekCoreIndicativeCharts = greekLyoTabs
    .flatMap(tab => tab.charts || [])
    .filter(item => item.id?.startsWith('greek-') && item.source)
    .filter(item => item.label.includes('Indicative') || item.id.startsWith('greek-principal-parts-'));
  const greekContractCharts = [
    greekFinite('τιμάω present active indicative',['τιμῶ','τιμᾷς','τιμᾷ'],['τιμῶμεν','τιμᾶτε','τιμῶσι(ν)'], v134({ id:'greek-alpha-contract-present-active-timao', lemma:'τιμάω', source:machenSource('143–147, 239','§§313–322; contract paradigm §590'), note:'Alpha contracts with following vowels throughout the present system.' })),
    greekFinite('τιμάω present middle/passive indicative',['τιμῶμαι','τιμᾷ','τιμᾶται'],['τιμώμεθα','τιμᾶσθε','τιμῶνται'], v134({ id:'greek-alpha-contract-present-middle-passive-timao', lemma:'τιμάω', source:machenSource('143–147, 239','§§313–322; contract paradigm §590') })),
    chart('τιμάω non-indicative anchors',['Form','Active','Middle/Passive'],[['Subjunctive 1sg','τιμῶ','τιμῶμαι'],['Imperative 2sg','τίμα','τιμῶ'],['Infinitive','τιμᾶν','τιμᾶσθαι'],['Participle masc nom sg','τιμῶν','τιμώμενος']], v134({ id:'greek-alpha-contract-nonindicative-timao', lemma:'τιμάω', source:machenSource('143–147, 239','§§313–322; contract paradigm §590'), note:'The contracted vowel, not a new tense formative, produces the visible long vowel or diphthong.' })),
    greekFinite('φιλέω present active indicative',['φιλῶ','φιλεῖς','φιλεῖ'],['φιλοῦμεν','φιλεῖτε','φιλοῦσι(ν)'], v134({ id:'greek-epsilon-contract-present-active-phileo', lemma:'φιλέω', source:machenSource('143–147, 240','§§313–322; contract paradigm §591'), note:'Epsilon contraction commonly produces ει or ου in the present system.' })),
    greekFinite('φιλέω present middle/passive indicative',['φιλοῦμαι','φιλῇ','φιλεῖται'],['φιλούμεθα','φιλεῖσθε','φιλοῦνται'], v134({ id:'greek-epsilon-contract-present-middle-passive-phileo', lemma:'φιλέω', source:machenSource('143–147, 240','§§313–322; contract paradigm §591') })),
    chart('φιλέω non-indicative anchors',['Form','Active','Middle/Passive'],[['Subjunctive 1sg','φιλῶ','φιλῶμαι'],['Imperative 2sg','φίλει','φιλοῦ'],['Infinitive','φιλεῖν','φιλεῖσθαι'],['Participle masc nom sg','φιλῶν','φιλούμενος']], v134({ id:'greek-epsilon-contract-nonindicative-phileo', lemma:'φιλέω', source:machenSource('143–147, 240','§§313–322; contract paradigm §591') })),
    greekFinite('δηλόω present active indicative',['δηλῶ','δηλοῖς','δηλοῖ'],['δηλοῦμεν','δηλοῦτε','δηλοῦσι(ν)'], v134({ id:'greek-omicron-contract-present-active-deloo', lemma:'δηλόω', source:machenSource('143–147, 241','§§313–322; contract paradigm §592'), note:'Omicron contraction commonly produces ου or οι in the present system.' })),
    greekFinite('δηλόω present middle/passive indicative',['δηλοῦμαι','δηλοῖ','δηλοῦται'],['δηλούμεθα','δηλοῦσθε','δηλοῦνται'], v134({ id:'greek-omicron-contract-present-middle-passive-deloo', lemma:'δηλόω', source:machenSource('143–147, 241','§§313–322; contract paradigm §592') })),
    chart('δηλόω non-indicative anchors',['Form','Active','Middle/Passive'],[['Subjunctive 1sg','δηλῶ','δηλῶμαι'],['Imperative 2sg','δήλου','δηλοῦ'],['Infinitive','δηλοῦν','δηλοῦσθαι'],['Participle masc nom sg','δηλῶν','δηλούμενος']], v134({ id:'greek-omicron-contract-nonindicative-deloo', lemma:'δηλόω', source:machenSource('143–147, 241','§§313–322; contract paradigm §592') }))
  ];
  const greekMiVerbCharts = [
    greekFinite('δίδωμι present active indicative',['δίδωμι','δίδως','δίδωσι(ν)'],['δίδομεν','δίδοτε','διδόασι(ν)'], v134({ id:'greek-didomi-present-active-indicative', lemma:'δίδωμι', source:machenSource('200–203, 244','§§481–503; paradigm §596'), note:'Present-system reduplication δι- combines with endings added directly to the athematic stem.' })),
    greekFinite('δίδωμι present middle/passive indicative',['δίδομαι','δίδοσαι','δίδοται'],['διδόμεθα','δίδοσθε','δίδονται'], v134({ id:'greek-didomi-present-middle-passive-indicative', lemma:'δίδωμι', source:machenSource('200–205, 244','§§481–510; paradigm §596') })),
    greekFinite('δίδωμι first aorist active indicative',['ἔδωκα','ἔδωκας','ἔδωκε(ν)'],['ἐδώκαμεν','ἐδώκατε','ἔδωκαν'], v134({ id:'greek-didomi-aorist-active-indicative', lemma:'δίδωμι', source:machenSource('201, 205, 245','§§487, 511–513; paradigm §597'), note:'This first aorist uses κ where the regular omega-verb pattern uses σ.' })),
    greekFinite('δίδωμι second aorist middle indicative',['ἐδόμην','ἔδου','ἔδοτο'],['ἐδόμεθα','ἔδοσθε','ἔδοντο'], v134({ id:'greek-didomi-aorist-middle-indicative', lemma:'δίδωμι', source:machenSource('205, 245','§514; paradigm §597'), note:'The short δο- stem distinguishes the second aorist middle.' })),
    chart('δίδωμι non-indicative anchors',['System','Active','Middle'],[['Present subjunctive 1sg','διδῶ','διδῶμαι'],['Present imperative 2sg','δίδου','δίδοσο'],['Present infinitive','διδόναι','δίδοσθαι'],['Present participle masc nom sg','διδούς','διδόμενος'],['Aorist subjunctive 1sg','δῶ','δῶμαι'],['Aorist imperative 2sg','δός','δοῦ'],['Aorist infinitive','δοῦναι','δόσθαι'],['Aorist participle masc nom sg','δούς','δόμενος']], v134({ id:'greek-didomi-nonindicative', lemma:'δίδωμι', source:machenSource('202–205, 244–245','§§496–514; paradigms §§596–597'), note:'Singular/plural stem length and athematic endings remain visible across the present and aorist systems.' })),
    greekFinite('τίθημι present active indicative',['τίθημι','τίθης','τίθησι(ν)'],['τίθεμεν','τίθετε','τιθέασι(ν)'], v134({ id:'greek-tithemi-present-active-indicative', lemma:'τίθημι', source:machenSource('210–212, 246','§§523–530; paradigm §598'), note:'Present-system reduplication τι- combines with endings added directly to the athematic stem.' })),
    greekFinite('τίθημι present middle/passive indicative',['τίθεμαι','τίθεσαι','τίθεται'],['τιθέμεθα','τίθεσθε','τίθενται'], v134({ id:'greek-tithemi-present-middle-passive-indicative', lemma:'τίθημι', source:machenSource('210–212, 246','§§523–530; paradigm §598') })),
    greekFinite('τίθημι first aorist active indicative',['ἔθηκα','ἔθηκας','ἔθηκε(ν)'],['ἐθήκαμεν','ἐθήκατε','ἔθηκαν'], v134({ id:'greek-tithemi-aorist-active-indicative', lemma:'τίθημι', source:machenSource('211, 247','§§524–529; paradigm §599'), note:'The indicative uses a first aorist in κ.' })),
    greekFinite('τίθημι second aorist middle indicative',['ἐθέμην','ἔθου','ἔθετο'],['ἐθέμεθα','ἔθεσθε','ἔθεντο'], v134({ id:'greek-tithemi-aorist-middle-indicative', lemma:'τίθημι', source:machenSource('211–212, 247','§§529–530; paradigm §599'), note:'The middle uses the short θε- root-aorist stem.' })),
    chart('τίθημι non-indicative anchors',['System','Active','Middle'],[['Present subjunctive 1sg','τιθῶ','τιθῶμαι'],['Present imperative 2sg','τίθει','τίθεσο'],['Present infinitive','τιθέναι','τίθεσθαι'],['Present participle masc nom sg','τιθείς','τιθέμενος'],['Aorist subjunctive 1sg','θῶ','θῶμαι'],['Aorist imperative 2sg','θές','θοῦ'],['Aorist infinitive','θεῖναι','θέσθαι'],['Aorist participle masc nom sg','θείς','θέμενος']], v134({ id:'greek-tithemi-nonindicative', lemma:'τίθημι', source:machenSource('211–212, 246–247','§§524–530; paradigms §§598–599'), note:'The root-aorist stem θε- appears without augment outside the indicative.' })),
    greekFinite('ἵστημι present active indicative (transitive)',['ἵστημι','ἵστης','ἵστησι(ν)'],['ἵσταμεν','ἵστατε','ἱστᾶσι(ν)'], v134({ id:'greek-histemi-present-active-indicative', lemma:'ἵστημι', source:machenSource('248','paradigm §600'), note:'Machen labels the present system transitive: “I cause to stand.”' })),
    greekFinite('ἵστημι present middle/passive indicative',['ἵσταμαι','ἵστασαι','ἵσταται'],['ἱστάμεθα','ἵστασθε','ἵστανται'], v134({ id:'greek-histemi-present-middle-passive-indicative', lemma:'ἵστημι', source:machenSource('248','paradigm §600') })),
    greekFinite('ἵστημι second aorist active indicative (intransitive)',['ἔστην','ἔστης','ἔστη'],['ἔστημεν','ἔστητε','ἔστησαν'], v134({ id:'greek-histemi-second-aorist-active-indicative', lemma:'ἵστημι', source:machenSource('249','paradigm §601'), note:'Machen explicitly distinguishes this intransitive second aorist, “I stood,” from the transitive present system.' })),
    chart('ἵστημι non-indicative anchors',['System','Form','Reading distinction'],[['Present active subjunctive 1sg','ἱστῶ','cause to stand'],['Present active imperative 2sg','ἵστη','cause to stand'],['Present active infinitive','ἱστάναι','cause to stand'],['Present active participle masc nom sg','ἱστάς','causing to stand'],['Second aorist subjunctive 1sg','στῶ','stand'],['Second aorist imperative 2sg','στῆθι','stand'],['Second aorist infinitive','στῆναι','stand'],['Second aorist participle masc nom sg','στάς','having stood']], v134({ id:'greek-histemi-nonindicative', lemma:'ἵστημι', source:machenSource('248–249','paradigms §§600–601'), note:'The shorter root-aorist forms are intransitive in Machen’s supplied paradigm.' }))
  ];
  const greekNounCharts = [
    chart('First-declension feminine: ὥρα and γραφή',['Case','ὥρα singular','ὥρα plural','γραφή singular','γραφή plural'],[['Nominative','ὥρα','ὧραι','γραφή','γραφαί'],['Genitive','ὥρας','ὡρῶν','γραφῆς','γραφῶν'],['Dative','ὥρᾳ','ὥραις','γραφῇ','γραφαῖς'],['Accusative','ὥραν','ὥρας','γραφήν','γραφάς']], v134({ id:'greek-first-declension-feminine-hora-graphe', lemma:'ὥρα / γραφή', source:machenSource('225','paradigm §555'), note:'These representatives show the alpha and eta first-declension patterns.' })),
    chart('First-declension masculine: προφήτης and μαθητής',['Case','προφήτης singular','προφήτης plural','μαθητής singular','μαθητής plural'],[['Nominative','προφήτης','προφῆται','μαθητής','μαθηταί'],['Genitive','προφήτου','προφητῶν','μαθητοῦ','μαθητῶν'],['Dative','προφήτῃ','προφήταις','μαθητῇ','μαθηταῖς'],['Accusative','προφήτην','προφήτας','μαθητήν','μαθητάς'],['Vocative','προφῆτα','προφῆται','μαθητά','μαθηταί']], v134({ id:'greek-first-declension-masculine-prophetes-mathetes', lemma:'προφήτης / μαθητής', source:machenSource('225','paradigm §556') })),
    chart('Second-declension masculine: λόγος',['Case','Singular','Plural'],[['Nominative','λόγος','λόγοι'],['Genitive','λόγου','λόγων'],['Dative','λόγῳ','λόγοις'],['Accusative','λόγον','λόγους'],['Vocative','λόγε','λόγοι']], v134({ id:'greek-second-declension-masculine-logos', lemma:'λόγος', source:machenSource('226','paradigm §557') })),
    chart('Second-declension neuter: δῶρον',['Case','Singular','Plural'],[['Nom/Acc/Voc','δῶρον','δῶρα'],['Genitive','δώρου','δώρων'],['Dative','δώρῳ','δώροις']], v134({ id:'greek-second-declension-neuter-doron', lemma:'δῶρον', source:machenSource('226','paradigm §558'), note:'Neuter nominative, accusative, and vocative forms coincide.' })),
    chart('Third-declension guttural stems: νύξ and σάρξ',['Case','νύξ singular','νύξ plural','σάρξ singular','σάρξ plural'],[['Nominative','νύξ','νύκτες','σάρξ','σάρκες'],['Genitive','νυκτός','νυκτῶν','σαρκός','σαρκῶν'],['Dative','νυκτί','νυξί(ν)','σαρκί','σαρξί(ν)'],['Accusative','νύκτα','νύκτας','σάρκα','σάρκας']], v134({ id:'greek-third-declension-guttural-nyx-sarx', lemma:'νύξ / σάρξ', source:machenSource('227','paradigm §559'), note:'The stem-final guttural combines with sigma in the nominative and dative plural.' })),
    chart('Third-declension nasal stem: ἄρχων',['Case','Singular','Plural'],[['Nominative','ἄρχων','ἄρχοντες'],['Genitive','ἄρχοντος','ἀρχόντων'],['Dative','ἄρχοντι','ἄρχουσι(ν)'],['Accusative','ἄρχοντα','ἄρχοντας'],['Vocative','ἄρχον','ἄρχοντες']], v134({ id:'greek-third-declension-nasal-archon', lemma:'ἄρχων', source:machenSource('227','paradigm §559'), note:'The ντ stem is visible outside the nominative singular.' })),
    chart('Third-declension dental stem: ἐλπίς',['Case','Singular','Plural'],[['Nominative','ἐλπίς','ἐλπίδες'],['Genitive','ἐλπίδος','ἐλπίδων'],['Dative','ἐλπίδι','ἐλπίσι(ν)'],['Accusative','ἐλπίδα','ἐλπίδας'],['Vocative','ἐλπί','ἐλπίδες']], v134({ id:'greek-third-declension-dental-elpis', lemma:'ἐλπίς', source:machenSource('227','paradigm §560'), note:'The dental stem appears as δ outside forms where it meets sigma.' })),
    chart('Third-declension s-stem: γένος',['Case','Singular','Plural'],[['Nom/Acc/Voc','γένος','γένη'],['Genitive','γένους','γενῶν'],['Dative','γένει','γένεσι(ν)']], v134({ id:'greek-third-declension-s-stem-genos', lemma:'γένος', source:machenSource('228','paradigm §562'), note:'Contraction obscures the stem-final sigma in several forms.' })),
    chart('Third-declension t-stem: ὄνομα',['Case','Singular','Plural'],[['Nom/Acc/Voc','ὄνομα','ὀνόματα'],['Genitive','ὀνόματος','ὀνομάτων'],['Dative','ὀνόματι','ὀνόμασι(ν)']], v134({ id:'greek-third-declension-t-stem-onoma', lemma:'ὄνομα', source:machenSource('228','paradigm §561'), note:'The ματ stem appears outside the nominative/accusative singular.' })),
    chart('Common irregular nouns: πατήρ and ἀνήρ',['Case','πατήρ singular','πατήρ plural','ἀνήρ singular','ἀνήρ plural'],[['Nominative','πατήρ','πατέρες','ἀνήρ','ἄνδρες'],['Genitive','πατρός','πατέρων','ἀνδρός','ἀνδρῶν'],['Dative','πατρί','πατράσι(ν)','ἀνδρί','ἀνδράσι(ν)'],['Accusative','πατέρα','πατέρας','ἄνδρα','ἄνδρας'],['Vocative','πάτερ','πατέρες','ἄνερ','ἄνδρες']], v134({ id:'greek-irregular-nouns-pater-aner', lemma:'πατήρ / ἀνήρ', source:machenSource('229','paradigm §565'), note:'Stem alternation is visible in the oblique forms.' }))
  ];
  const greekAdjectiveCharts = [
    chart('First/second-declension adjective: ἀγαθός, ἀγαθή, ἀγαθόν',['Case','Masculine','Feminine','Neuter'],[['Nom sg','ἀγαθός','ἀγαθή','ἀγαθόν'],['Gen sg','ἀγαθοῦ','ἀγαθῆς','ἀγαθοῦ'],['Dat sg','ἀγαθῷ','ἀγαθῇ','ἀγαθῷ'],['Acc sg','ἀγαθόν','ἀγαθήν','ἀγαθόν'],['Nom pl','ἀγαθοί','ἀγαθαί','ἀγαθά'],['Gen pl','ἀγαθῶν','ἀγαθῶν','ἀγαθῶν'],['Dat pl','ἀγαθοῖς','ἀγαθαῖς','ἀγαθοῖς'],['Acc pl','ἀγαθούς','ἀγαθάς','ἀγαθά']], v134({ id:'greek-adjective-first-second-agathos', lemma:'ἀγαθός', source:machenSource('230','paradigm §568') })),
    chart('Two-termination third-declension adjective: ἀληθής, ἀληθές',['Case','Masculine/Feminine','Neuter'],[['Nom sg','ἀληθής','ἀληθές'],['Gen sg','ἀληθοῦς','ἀληθοῦς'],['Dat sg','ἀληθεῖ','ἀληθεῖ'],['Acc sg','ἀληθῆ','ἀληθές'],['Nom pl','ἀληθεῖς','ἀληθῆ'],['Gen pl','ἀληθῶν','ἀληθῶν'],['Dat pl','ἀληθέσι(ν)','ἀληθέσι(ν)'],['Acc pl','ἀληθεῖς','ἀληθῆ']], v134({ id:'greek-adjective-third-declension-alethes', lemma:'ἀληθής', source:machenSource('231','paradigm §572'), note:'Masculine and feminine share one termination; neuter forms remain distinct.' })),
    chart('Irregular comparative: μείζων, μεῖζον',['Case','Masculine/Feminine','Neuter'],[['Nom sg','μείζων','μεῖζον'],['Gen sg','μείζονος','μείζονος'],['Dat sg','μείζονι','μείζονι'],['Acc sg','μείζονα / μείζω','μεῖζον'],['Nom pl','μείζονες / μείζους','μείζονα / μείζω'],['Gen pl','μειζόνων','μειζόνων'],['Dat pl','μείζοσι(ν)','μείζοσι(ν)'],['Acc pl','μείζονας / μείζους','μείζονα / μείζω']], v134({ id:'greek-adjective-comparative-meizon', lemma:'μείζων', source:machenSource('231','paradigm §571'), note:'Machen prints both regular and contracted alternatives where shown.' }))
  ];
  const greekPronounCharts = [
    chart('Personal pronouns and αὐτός',['Case','1st singular','2nd singular','αὐτός masc sg','αὐτή fem sg','αὐτό neut sg'],[['Nominative','ἐγώ','σύ','αὐτός','αὐτή','αὐτό'],['Genitive','ἐμοῦ / μου','σοῦ','αὐτοῦ','αὐτῆς','αὐτοῦ'],['Dative','ἐμοί / μοι','σοί','αὐτῷ','αὐτῇ','αὐτῷ'],['Accusative','ἐμέ / με','σέ','αὐτόν','αὐτήν','αὐτό']], v134({ id:'greek-pronouns-personal-autos-singular', lemma:'ἐγώ / σύ / αὐτός', source:machenSource('235','paradigm §581'), note:'Machen prints the alternate enclitic first-person forms in parentheses.' })),
    chart('Personal pronouns and αὐτός: plural',['Case','1st plural','2nd plural','αὐτοί masc','αὐταί fem','αὐτά neut'],[['Nominative','ἡμεῖς','ὑμεῖς','αὐτοί','αὐταί','αὐτά'],['Genitive','ἡμῶν','ὑμῶν','αὐτῶν','αὐτῶν','αὐτῶν'],['Dative','ἡμῖν','ὑμῖν','αὐτοῖς','αὐταῖς','αὐτοῖς'],['Accusative','ἡμᾶς','ὑμᾶς','αὐτούς','αὐτάς','αὐτά']], v134({ id:'greek-pronouns-personal-autos-plural', lemma:'ἡμεῖς / ὑμεῖς / αὐτός', source:machenSource('235','paradigm §581') })),
    chart('Demonstrative pronoun: οὗτος, αὕτη, τοῦτο',['Case','Masc sg','Fem sg','Neut sg','Masc pl','Fem pl','Neut pl'],[['Nominative','οὗτος','αὕτη','τοῦτο','οὗτοι','αὗται','ταῦτα'],['Genitive','τούτου','ταύτης','τούτου','τούτων','τούτων','τούτων'],['Dative','τούτῳ','ταύτῃ','τούτῳ','τούτοις','ταύταις','τούτοις'],['Accusative','τοῦτον','ταύτην','τοῦτο','τούτους','ταύτας','ταῦτα']], v134({ id:'greek-pronoun-demonstrative-houtos', lemma:'οὗτος', source:machenSource('235','paradigm §582'), note:'Machen notes that ἐκεῖνος uses the endings of αὐτός; no separate inferred chart is supplied here.' })),
    chart('Relative pronoun: ὅς, ἥ, ὅ',['Case','Masc sg','Fem sg','Neut sg','Masc pl','Fem pl','Neut pl'],[['Nominative','ὅς','ἥ','ὅ','οἵ','αἵ','ἅ'],['Genitive','οὗ','ἧς','οὗ','ὧν','ὧν','ὧν'],['Dative','ᾧ','ᾗ','ᾧ','οἷς','αἷς','οἷς'],['Accusative','ὅν','ἥν','ὅ','οὕς','ἅς','ἅ']], v134({ id:'greek-pronoun-relative-hos', lemma:'ὅς', source:machenSource('173, 235','§§395–398; paradigm §583') })),
    chart('Interrogative and indefinite pronouns',['Case','Interrogative m/f sg','Interrogative neut sg','Indefinite m/f sg','Indefinite neut sg'],[['Nominative','τίς','τί','τις','τι'],['Genitive','τίνος','τίνος','τινός','τινός'],['Dative','τίνι','τίνι','τινί','τινί'],['Accusative','τίνα','τί','τινά','τι']], v134({ id:'greek-pronouns-interrogative-indefinite-singular', lemma:'τίς / τις', source:machenSource('170–172','§§384–394'), note:'Accent distinguishes the interrogative from the normally enclitic indefinite forms.' })),
    chart('πᾶς, πᾶσα, πᾶν',['Case','Masculine','Feminine','Neuter'],[['Nom sg','πᾶς','πᾶσα','πᾶν'],['Gen sg','παντός','πάσης','παντός'],['Dat sg','παντί','πάσῃ','παντί'],['Acc sg','πάντα','πᾶσαν','πᾶν'],['Nom pl','πάντες','πᾶσαι','πάντα'],['Gen pl','πάντων','πασῶν','πάντων'],['Dat pl','πᾶσι(ν)','πάσαις','πᾶσι(ν)'],['Acc pl','πάντας','πάσας','πάντα']], v134({ id:'greek-determiner-pas', lemma:'πᾶς', source:machenSource('231','paradigm §573') })),
    chart('Reflexive and reciprocal anchors',['Person/family','Genitive','Dative','Accusative'],[['1st singular masculine','ἐμαυτοῦ','ἐμαυτῷ','ἐμαυτόν'],['2nd singular masculine','σεαυτοῦ','σεαυτῷ','σεαυτόν'],['3rd singular masculine','ἑαυτοῦ','ἑαυτῷ','ἑαυτόν'],['Common plural masculine','ἑαυτῶν','ἑαυτοῖς','ἑαυτούς'],['Reciprocal masculine plural','ἀλλήλων','ἀλλήλοις','ἀλλήλους']], v134({ id:'greek-pronouns-reflexive-reciprocal', lemma:'ἐμαυτοῦ / σεαυτοῦ / ἑαυτοῦ / ἀλλήλων', source:machenSource('150, 153–154','§§325, 337–343'), note:'Reflexives have no nominative; Machen supplies the reciprocal only in plural oblique forms.' }))
  ];
  const greekAdditionalParadigmCharts = [
    ...greekLyoTabs.flatMap(tab => tab.charts || []),
    ...greekContractCharts,
    ...greekMiVerbCharts,
    ...greekNounCharts,
    ...greekAdjectiveCharts,
    ...greekPronounCharts
  ].filter(item => item.milestone === 'v1.3.4');
  const GESENIUS_1910 = Object.freeze({
    language:'hebrew',
    author:'Wilhelm Gesenius',
    editor:'E. Kautzsch',
    translator:'A. E. Cowley',
    title:"Gesenius' Hebrew Grammar",
    publication:'Oxford: Clarendon Press, 1910',
    edition:'Second English edition, revised according to the twenty-eighth German edition of 1909',
    scan:'Internet Archive/Wikisource page-image scan',
    scanId:'geseniushebrewgr00geseuoft',
    scanUrl:'https://en.wikisource.org/wiki/Index:Gesenius%27_Hebrew_Grammar_(1910_Kautzsch-Cowley_edition).djvu'
  });
  const geseniusSource = (printedPages, sections, complete, limitation='') => ({
    ...GESENIUS_1910,
    printedPages,
    sections,
    table:'Paradigm B, “Strong Verb”',
    complete,
    limitation
  });
  const perfectPersons = [['3rd','masculine','singular'],['3rd','feminine','singular'],['2nd','masculine','singular'],['2nd','feminine','singular'],['1st','common','singular'],['3rd','common','plural'],['2nd','masculine','plural'],['2nd','feminine','plural'],['1st','common','plural']];
  const imperfectPersons = [['3rd','masculine','singular'],['3rd','feminine','singular'],['2nd','masculine','singular'],['2nd','feminine','singular'],['1st','common','singular'],['3rd','masculine','plural'],['3rd','feminine','plural'],['2nd','masculine','plural'],['2nd','feminine','plural'],['1st','common','plural']];
  const imperativePersons = [['2nd','masculine','singular'],['2nd','feminine','singular'],['2nd','masculine','plural'],['2nd','feminine','plural']];
  const finiteRows = (persons, forms) => persons.map((person,index) => [...person,forms[index]]);
  const hebrewStrongVerbData = {
    Qal:{ id:'qal', section:'§§43–50', page:'510', perfect:['קָטַל','קָטְלָה','קָטַלְתָּ','קָטַלְתְּ','קָטַלְתִּי','קָטְלוּ','קְטַלְתֶּם','קְטַלְתֶּן','קָטַלְנוּ'], imperfect:['יִקְטֹל','תִּקְטֹל','תִּקְטֹל','תִּקְטְלִי','אֶקְטֹל','יִקְטְלוּ','תִּקְטֹלְנָה','תִּקְטְלוּ','תִּקְטֹלְנָה','נִקְטֹל'], imperative:['קְטֹל','קִטְלִי','קִטְלוּ','קְטֹלְנָה'], infinitiveConstruct:['קְטֹל'], infinitiveAbsolute:['קָטוֹל'], participles:[['Active participle','masculine','singular','absolute','קֹטֵל'],['Passive participle','masculine','singular','absolute','קָטוּל']], wayyiqtol:[['3rd','masculine','singular','וַיִּקְטֹל'],['1st','common','singular','וָאֶקְטֹל']] },
    Niphal:{ id:'niphal', section:'§51', page:'510', perfect:['נִקְטַל','נִקְטְלָה','נִקְטַלְתָּ','נִקְטַלְתְּ','נִקְטַלְתִּי','נִקְטְלוּ','נִקְטַלְתֶּם','נִקְטַלְתֶּן','נִקְטַלְנוּ'], imperfect:['יִקָּטֵל','תִּקָּטֵל','תִּקָּטֵל','תִּקָּטְלִי','אֶקָּטֵל','יִקָּטְלוּ','תִּקָּטַלְנָה','תִּקָּטְלוּ','תִּקָּטַלְנָה','נִקָּטֵל'], imperative:['הִקָּטֵל','הִקָּטְלִי','הִקָּטְלוּ','הִקָּטַלְנָה'], infinitiveConstruct:['הִקָּטֵל'], infinitiveAbsolute:['הִקָּטֹל','נִקְטֹל'], participles:[['Participle','masculine','singular','absolute','נִקְטָל']] },
    Piel:{ id:'piel', section:'§52', page:'510', perfect:[{label:'קִטֵּל',note:'Gesenius also prints קִטַּל.'},'קִטְּלָה','קִטַּלְתָּ','קִטַּלְתְּ','קִטַּלְתִּי','קִטְּלוּ','קִטַּלְתֶּם','קִטַּלְתֶּן','קִטַּלְנוּ'], imperfect:['יְקַטֵּל','תְּקַטֵּל','תְּקַטֵּל','תְּקַטְּלִי','אֲקַטֵּל','יְקַטְּלוּ','תְּקַטֵּלְנָה','תְּקַטְּלוּ','תְּקַטֵּלְנָה','נְקַטֵּל'], imperative:['קַטֵּל','קַטְּלִי','קַטְּלוּ','קַטֵּלְנָה'], infinitiveConstruct:['קַטֵּל'], infinitiveAbsolute:['קַטֵּל','קַטֹּל'], participles:[['Active participle','masculine','singular','absolute','מְקַטֵּל']] },
    Pual:{ id:'pual', section:'§52', page:'511', perfect:['קֻטַּל','קֻטְּלָה','קֻטַּלְתָּ','קֻטַּלְתְּ','קֻטַּלְתִּי','קֻטְּלוּ','קֻטַּלְתֶּם','קֻטַּלְתֶּן','קֻטַּלְנוּ'], imperfect:['יְקֻטַּל','תְּקֻטַּל','תְּקֻטַּל','תְּקֻטְּלִי','אֲקֻטַּל','יְקֻטְּלוּ','תְּקֻטַּלְנָה','תְּקֻטְּלוּ','תְּקֻטַּלְנָה','נְקֻטַּל'], infinitiveAbsolute:['קֻטֹּל'], participles:[['Passive participle','masculine','singular','absolute','מְקֻטָּל']] },
    Hiphil:{ id:'hiphil', section:'§53', page:'511', perfect:['הִקְטִיל','הִקְטִילָה','הִקְטַלְתָּ','הִקְטַלְתְּ','הִקְטַלְתִּי','הִקְטִילוּ','הִקְטַלְתֶּם','הִקְטַלְתֶּן','הִקְטַלְנוּ'], imperfect:['יַקְטִיל','תַּקְטִיל','תַּקְטִיל','תַּקְטִילִי','אַקְטִיל','יַקְטִילוּ','תַּקְטֵלְנָה','תַּקְטִילוּ','תַּקְטֵלְנָה','נַקְטִיל'], imperative:['הַקְטֵל','הַקְטִילִי','הַקְטִילוּ','הַקְטֵלְנָה'], infinitiveConstruct:['הַקְטִיל'], infinitiveAbsolute:['הַקְטֵל'], participles:[['Active participle','masculine','singular','absolute','מַקְטִיל']], shortenedImperfect:['יַקְטֵל'], wayyiqtol:[['3rd','masculine','singular','וַיַּקְטֵל']] },
    Hophal:{ id:'hophal', section:'§53', page:'511', perfect:['הָקְטַל','הָקְטְלָה','הָקְטַלְתָּ','הָקְטַלְתְּ','הָקְטַלְתִּי','הָקְטְלוּ','הָקְטַלְתֶּם','הָקְטַלְתֶּן','הָקְטַלְנוּ'], imperfect:['יָקְטַל','תָּקְטַל','תָּקְטַל','תָּקְטְלִי','אָקְטַל','יָקְטְלוּ','תָּקְטַלְנָה','תָּקְטְלוּ','תָּקְטַלְנָה','נָקְטַל'], infinitiveAbsolute:['הָקְטֵל'], participles:[['Passive participle','masculine','singular','absolute','מָקְטָל']] },
    Hitpael:{ id:'hitpael', section:'§54', page:'511', perfect:['הִתְקַטֵּל','הִתְקַטְּלָה','הִתְקַטַּלְתָּ','הִתְקַטַּלְתְּ','הִתְקַטַּלְתִּי','הִתְקַטְּלוּ','הִתְקַטַּלְתֶּם','הִתְקַטַּלְתֶּן','הִתְקַטַּלְנוּ'], imperfect:['יִתְקַטֵּל','תִּתְקַטֵּל','תִּתְקַטֵּל','תִּתְקַטְּלִי','אֶתְקַטֵּל','יִתְקַטְּלוּ','תִּתְקַטֵּלְנָה','תִּתְקַטְּלוּ','תִּתְקַטֵּלְנָה','נִתְקַטֵּל'], imperative:['הִתְקַטֵּל','הִתְקַטְּלִי','הִתְקַטְּלוּ','הִתְקַטֵּלְנָה'], infinitiveConstruct:['הִתְקַטֵּל'], infinitiveAbsolute:['הִתְקַטֵּל'], participles:[['Participle','masculine','singular','absolute','מִתְקַטֵּל']] }
  };
  const strongChart = (stem, formCategory, label, columns, rows, note='', sourceOverride={}) => chart(label, columns, rows, {
    id:`hebrew-strong-${stem.id}-${formCategory}`,
    milestone:'v1.3.5',
    language:'hebrew',
    stemId:stem.id,
    formCategory,
    representativeRoot:'קטל',
    rootDescription:'model strong root',
    source:{ ...geseniusSource(sourceOverride.printedPages || stem.page, sourceOverride.sections || `${stem.section}; Paradigm B, “Strong Verb”`, sourceOverride.complete ?? true, sourceOverride.limitation || ''), ...(sourceOverride.table ? { table:sourceOverride.table } : {}) },
    note
  });
  const chartsForStrongStem = (label, stem) => {
    const charts = [
      strongChart(stem,'perfect',`${label} perfect — קטל`,['Person','Gender','Number','Hebrew form'],finiteRows(perfectPersons,stem.perfect),'Suffixes mark person, gender, and number.'),
      strongChart(stem,'imperfect',`${label} imperfect — קטל`,['Person','Gender','Number','Hebrew form'],finiteRows(imperfectPersons,stem.imperfect),'Prefixed person markers and suffixed number or gender markers frame the root.')
    ];
    if(stem.imperative) charts.push(strongChart(stem,'imperative',`${label} imperative — קטל`,['Person','Gender','Number','Hebrew form'],finiteRows(imperativePersons,stem.imperative),'Imperatives contain second-person forms only.'));
    if(stem.infinitiveConstruct) charts.push(strongChart(stem,'infinitive-construct',`${label} infinitive construct — קטל`,['Form','State','Hebrew pattern'],stem.infinitiveConstruct.map(form=>['Infinitive','construct',form]),'Consult the visible stem pattern; no extra forms are generated.'));
    if(stem.infinitiveAbsolute) charts.push(strongChart(stem,'infinitive-absolute',`${label} infinitive absolute — קטל`,['Form','State','Hebrew pattern'],stem.infinitiveAbsolute.map((form,index)=>[index ? 'Explicit alternate' : 'Infinitive','absolute',form]),'Only alternatives printed in Gesenius are included.'));
    if(stem.participles) charts.push(strongChart(stem,'participle',`${label} participle anchor — קטל`,['Form','Gender','Number','State','Hebrew pattern'],stem.participles,'Paradigm B supplies masculine-singular recognition anchors; a full participial declension is not inferred.',{complete:false,limitation:'Masculine-singular participle anchor forms only.'}));
    if(stem.shortenedImperfect) charts.push(strongChart(stem,'shortened-imperfect',`${label} shortened imperfect — קטל`,['Form','Hebrew pattern'],[['Jussive recognition anchor',stem.shortenedImperfect[0]]],'The shortened form is kept distinct from the ordinary imperfect.'));
    if(stem.wayyiqtol) charts.push(strongChart(stem,'wayyiqtol',`${label} wayyiqtol — קטל`,['Person','Gender','Number','Hebrew form'],stem.wayyiqtol,'The prefixed conjunction and strengthened imperfect prefix are visible; syntax is deferred to the Grammar Handbook.',{printedPages:label==='Qal'?'133–134':'133',sections:'§49b–c, “The Perfect and Imperfect with Waw Consecutive”',table:'Directly printed consecutive-imperfect examples',complete:false,limitation:'Only the row-level forms printed in §49 are included; no complete paradigm is inferred.'}));
    return charts;
  };
  const hebrewStrongVerbCharts = Object.entries(hebrewStrongVerbData).flatMap(([label,stem]) => chartsForStrongStem(label,stem));
  const HEBREW_WEAK_CLASS_LABELS = Object.freeze({
    'pe-nun':'I-Nun',
    'pe-yod-waw':'I-Yod',
    'hollow-ayin-waw':'Biconsonantal — Middle Waw',
    'hollow-ayin-yod':'Biconsonantal — Middle Yod',
    'geminate':'Geminate',
    'lamed-he':'III-He',
    'initial-guttural':'I-Guttural',
    'medial-guttural':'II-Guttural',
    'final-guttural':'III-ח/ע',
    'doubly-weak':'Doubly Weak',
    'irregular':'Irregular'
  });
  const weakSource = (printedPages, sections, table, complete=true, limitation='', alternatePointing='Bracketed forms and starred variants in Gesenius are omitted unless named in the chart note.') => ({
    ...geseniusSource(printedPages, sections, complete, limitation),
    table,
    alternatePointing
  });
  const HEBREW_WEAK_ROOT_IDS = Object.freeze({ עמד:'amad', שחט:'shachat', ברך:'barakh', שלח:'shalach', סבב:'savav', נגש:'nagash', נפל:'naphal', אכל:'akhal', ישב:'yashav', יטב:'yatav', קום:'qum', שית:'shit', גלה:'galah', נשא:'nasa', היה:'hayah' });
  const weakClassDisplayLabel = (weakClassId, representativeRoot) => {
    if(weakClassId === 'pe-yod-waw') return `I-Yod — ${representativeRoot === 'ישב' ? 'Historical I-Waw' : 'True I-Yod'}`;
    return HEBREW_WEAK_CLASS_LABELS[weakClassId];
  };
  const weakChart = (weakClassId, stemId, formCategory, representativeRoot, affectedRadical, label, rows, source, note='') => chart(label, ['Form','Strong pattern','Attested weak form','Recognition cue'], rows, {
    id:`hebrew-weak-${weakClassId}-${stemId}-${formCategory}-${HEBREW_WEAK_ROOT_IDS[representativeRoot]}`,
    milestone:'v1.3.6a',
    language:'hebrew',
    weakClassId,
    weakClassLabel:HEBREW_WEAK_CLASS_LABELS[weakClassId],
    weakClassDisplayLabel:weakClassDisplayLabel(weakClassId, representativeRoot),
    stemId,
    formCategory,
    representativeRoot,
    rootDescription:'source-supplied representative weak root',
    affectedRadical,
    comparison:{
      expectedStrong:rows[0][1],
      attestedWeak:rows[0][2],
      change:rows[0][3],
      recognitionCue:rows.map(row=>row[3]).filter(Boolean).join('; ')
    },
    source,
    note
  });
  const hebrewWeakVerbCharts = [
    weakChart('initial-guttural','qal','perfect','עמד','first', 'I-Guttural · Qal perfect — עמד', [
      ['3ms','קָטַל','עָמַד','The guttural remains visible.'],
      ['3fs','קָטְלָה','עָמְדָה','No doubling is expected.'],
      ['2mp','קְטַלְתֶּם','עֲמַדְתֶּם','A reduced vowel replaces vocal shewa.']
    ], weakSource('514','§§62–63; Paradigm D','Paradigm D, verbs first guttural')),
    weakChart('initial-guttural','qal','imperfect','עמד','first', 'I-Guttural · Qal imperfect — עמד', [
      ['3ms','יִקְטֹל','יַעֲמֹד','The prefix vowel and reduced vowel mark the guttural.'],
      ['1cs','אֶקְטֹל','אֶעֱמֹד','Aleph takes a reduced vowel after the prefix.'],
      ['3mp','יִקְטְלוּ','יַעַמְדוּ','The reduced vowel becomes a full short vowel before vocal shewa.']
    ], weakSource('514','§§62–63; Paradigm D','Paradigm D, verbs first guttural')),
    weakChart('initial-guttural','niphal','imperfect','עמד','first', 'I-Guttural · Niphal imperfect — עמד', [
      ['3ms','יִקָּטֵל','יֵעָמֵד','The guttural resists doubling; the prefix vowel lengthens.'],
      ['Infinitive construct','הִקָּטֵל','הֵעָמֵד','No dagesh appears in the first radical.'],
      ['Imperative 2ms','הִקָּטֵל','הֵעָמֵד','Tsere compensates for missing doubling.']
    ], weakSource('514','§63h; Paradigm D','Paradigm D, verbs first guttural')),
    weakChart('initial-guttural','hiphil','perfect','עמד','first', 'I-Guttural · Hiphil anchors — עמד', [
      ['Perfect 3ms','הִקְטִיל','הֶעֱמִיד','The guttural takes a reduced vowel.'],
      ['Imperfect 3ms','יַקְטִיל','יַעֲמִיד','The initial radical remains audible.'],
      ['Participle ms','מַקְטִיל','מַעֲמִיד','Reduced vowel follows the participial prefix.']
    ], weakSource('514','§63; Paradigm D','Paradigm D, verbs first guttural')),

    weakChart('medial-guttural','qal','perfect','שחט','second', 'II-Guttural · Qal perfect — שחט', [
      ['3ms','קָטַל','שָׁחַט','The medial guttural remains undoubled.'],
      ['3fs','קָטְלָה','שָׁחֲטָה','A reduced vowel appears under the guttural.'],
      ['3cp','קָטְלוּ','שָׁחֲטוּ','The guttural takes a reduced vowel before the suffix.']
    ], weakSource('515','§64; Paradigm E','Paradigm E, verbs middle guttural')),
    weakChart('medial-guttural','piel','perfect','ברך','second', 'II-Guttural · Piel anchors — ברך', [
      ['Perfect 3ms','קִטֵּל','בֵּרַךְ','The medial guttural cannot carry the expected dagesh.'],
      ['Imperfect 3ms','יְקַטֵּל','יְבָרֵךְ','Compensatory vowel change replaces doubling.'],
      ['Imperative 2ms','קַטֵּל','בָּרֵךְ','The Piel is recognized without medial doubling.'],
      ['Participle ms','מְקַטֵּל','מְבָרֵךְ','The stem vowel pattern identifies Piel.']
    ], weakSource('515','§64; Paradigm E','Paradigm E, verbs middle guttural')),
    weakChart('medial-guttural','pual','perfect','ברך','second', 'II-Guttural · Pual anchors — ברך', [
      ['Perfect 3ms','קֻטַּל','בֹּרַךְ','The guttural resists doubling and the vowels compensate.'],
      ['Imperfect 3ms','יְקֻטַּל','יְבֹרַךְ','The passive stem remains visible through its vowels.'],
      ['Participle ms','מְקֻטָּל','מְבֹרָךְ','No dagesh appears in the guttural.']
    ], weakSource('515','§64; Paradigm E','Paradigm E, verbs middle guttural')),
    weakChart('medial-guttural','hitpael','imperfect','ברך','second', 'II-Guttural · Hitpael anchors — ברך', [
      ['Perfect 3ms','הִתְקַטֵּל','הִתְבָּרֵךְ','The הת prefix identifies the stem; the guttural remains undoubled.'],
      ['Imperfect 3ms','יִתְקַטֵּל','יִתְבָּרֵךְ','Compensatory vowels replace expected doubling.'],
      ['Participle ms','מִתְקַטֵּל','מִתְבָּרֵךְ','The middle guttural has no dagesh.']
    ], weakSource('515','§64; Paradigm E','Paradigm E, verbs middle guttural')),

    weakChart('final-guttural','qal','imperfect','שלח','third', 'III-ח/ע · Qal anchors — שלח', [
      ['Imperfect 3ms','יִקְטֹל','יִשְׁלַח','Patah appears before the final guttural.'],
      ['Infinitive construct','קְטֹל','שְׁלֹחַ','Furtive patah is retained under final ח.'],
      ['Active participle ms','קֹטֵל','שֹׁלֵחַ','Furtive patah follows the long vowel.'],
      ['Passive participle ms','קָטוּל','שָׁלוּחַ','The final guttural remains explicit.']
    ], weakSource('516–517','§65; Paradigm F','Paradigm F, verbs third guttural')),
    weakChart('final-guttural','hiphil','perfect','שלח','third', 'III-ח/ע · Hiphil anchors — שלח', [
      ['Perfect 3ms','הִקְטִיל','הִשְׁלִיחַ','Furtive patah follows the long i-class vowel.'],
      ['Imperfect 3ms','יַקְטִיל','יַשְׁלִיחַ','The final ח retains furtive patah.'],
      ['Infinitive construct','הַקְטִיל','הַשְׁלִיחַ','The final guttural changes the word ending.'],
      ['Participle ms','מַקְטִיל','מַשְׁלִיחַ','The causative prefix and furtive patah are both visible.']
    ], weakSource('517','§65; Paradigm F','Paradigm F, verbs third guttural')),
    weakChart('final-guttural','hitpael','imperfect','שלח','third', 'III-ח/ע · Hitpael anchors — שלח', [
      ['Perfect 3ms','הִתְקַטֵּל','הִשְׁתַּלֵּחַ','Furtive patah marks final ח.'],
      ['Imperfect 3ms','יִתְקַטֵּל','יִשְׁתַּלֵּחַ','The final guttural alters the ending, not the stem prefix.'],
      ['Participle ms','מִתְקַטֵּל','מִשְׁתַּלֵּחַ','The Hitpael prefix remains the primary stem cue.']
    ], weakSource('517','§65; Paradigm F','Paradigm F, verbs third guttural')),

    weakChart('geminate','qal','perfect','סבב','second and third', 'Geminate · Qal perfect — סבב', [
      ['3ms','קָטַל','סָבַב','The expanded three-radical form is printed.'],
      ['2ms','קָטַלְתָּ','סַבּוֹתָ','The repeated radicals contract before a consonantal suffix.'],
      ['3cp','קָטְלוּ','סָבֲבוּ','The expanded form returns before a vowel suffix.']
    ], weakSource('518','§67; Paradigm G','Paradigm G, verbs middle geminate')),
    weakChart('geminate','qal','imperfect','סבב','second and third', 'Geminate · Qal imperfect — סבב', [
      ['3ms','יִקְטֹל','יָסֹב','The repeated radicals contract into a monosyllabic stem.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיָּסָב','The consecutive form has the contracted root.'],
      ['Infinitive construct','קְטֹל','סֹב','Only one written ב remains.'],
      ['Participle ms','קֹטֵל','סֹבֵב','The expanded participial form displays both radicals.']
    ], weakSource('518','§67; Paradigm G','Paradigm G, verbs middle geminate')),
    weakChart('geminate','niphal','perfect','סבב','second and third', 'Geminate · Niphal anchors — סבב', [
      ['Perfect 3ms','נִקְטַל','נָסַב','The stem contracts and the prefix vowel lengthens.'],
      ['Imperfect 3ms','יִקָּטֵל','יִסֹּב','Dagesh marks the doubled final radical.'],
      ['Infinitive construct','הִקָּטֵל','הִסֵּב','The contracted stem follows the Niphal prefix.'],
      ['Participle ms','נִקְטָל','נָסָב','The participle is contracted.']
    ], weakSource('518','§67; Paradigm G','Paradigm G, verbs middle geminate')),
    weakChart('geminate','hiphil','perfect','סבב','second and third', 'Geminate · Hiphil anchors — סבב', [
      ['Perfect 3ms','הִקְטִיל','הֵסֵב','The contracted root follows a lengthened prefix vowel.'],
      ['Imperfect 3ms','יַקְטִיל','יָסֵב','The middle radical is not written twice.'],
      ['Imperative 2ms','הַקְטֵל','הָסֵב','The causative stem is compact.'],
      ['Participle ms','מַקְטִיל','מֵסֵב','The participial prefix vowel lengthens.']
    ], weakSource('519','§67; Paradigm G','Paradigm G, verbs middle geminate')),

    weakChart('pe-nun','qal','imperfect','נגש','first', 'I-Nun · Qal imperfect — נגש', [
      ['3ms','יִקְטֹל','יִגַּשׁ','Initial nun assimilates into dagesh in the second radical.'],
      ['Infinitive construct','קְטֹל','גֶּשֶׁת','The initial nun is absent and doubling remains.'],
      ['Infinitive alternate','קְטֹל','נְגֹשׁ','The source also prints a form where nun remains.']
    ], weakSource('520','§66; Paradigm H','Paradigm H, verbs Pe-nun')),
    weakChart('pe-nun','qal','wayyiqtol','נפל','first', 'I-Nun · Qal sequence anchor — נפל', [
      ['Imperfect 3ms','יִקְטֹל','יִפֹּל','The nun assimilates and dagesh marks its loss.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיִּפֹּל','The assimilated nun remains distinct from the sequence prefix.'],
      ['Infinitive construct','קְטֹל','נְפֹל','Nun remains in this infinitive.']
    ], weakSource('520','§66; Paradigm H','Paradigm H, verbs Pe-nun')),
    weakChart('pe-nun','hiphil','perfect','נגש','first', 'I-Nun · Hiphil anchors — נגש', [
      ['Perfect 3ms','הִקְטִיל','הִגִּישׁ','Nun assimilates into the doubled second radical.'],
      ['Imperfect 3ms','יַקְטִיל','יַגִּישׁ','Dagesh is the visible trace of initial nun.'],
      ['Participle ms','מַקְטִיל','מַגִּישׁ','The causative prefix precedes the assimilated root.']
    ], weakSource('520','§66; Paradigm H','Paradigm H, verbs Pe-nun')),
    weakChart('pe-nun','hophal','perfect','נגש','first', 'I-Nun · Hophal anchors — נגש', [
      ['Perfect 3ms','הָקְטַל','הֻגַּשׁ','Nun assimilates; dagesh remains in the second radical.'],
      ['Imperfect 3ms','יָקְטַל','יֻגַּשׁ','The passive u-class vowel and doubling identify the form.'],
      ['Participle ms','מָקְטָל','מֻגָּשׁ','The root begins visibly with the doubled second radical.']
    ], weakSource('520','§66; Paradigm H','Paradigm H, verbs Pe-nun')),

    weakChart('irregular','qal','imperfect','אכל','first', 'Irregular · Qal — אכל', [
      ['Perfect 3ms','קָטַל','אָכַל','The aleph remains in the perfect.'],
      ['Imperfect 3ms','יִקְטֹל','יֹאכַל','The prefix and initial aleph contract visibly.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיֹּאכַל','The high-frequency sequence form is printed directly.'],
      ['Imperative 2ms','קְטֹל','אֱכֹל','A reduced vowel appears under aleph.'],
      ['Participle ms','קֹטֵל','אֹכֵל','Aleph carries the initial vowel.']
    ], weakSource('521','§68; Paradigm I','Paradigm I, weak verbs Pe-aleph')),
    weakChart('irregular','hiphil','perfect','אכל','first', 'Irregular · Hiphil — אכל', [
      ['Perfect 3ms','הִקְטִיל','הֶאֱכִיל','Aleph remains with a reduced vowel.'],
      ['Imperfect 3ms','יַקְטִיל','יַאֲכִיל','The causative prefix precedes audible aleph.'],
      ['Infinitive construct','הַקְטִיל','הַאֲכִיל','The printed form preserves the guttural sequence.'],
      ['Participle ms','מַקְטִיל','מַאֲכִיל','The participle preserves initial aleph.']
    ], weakSource('521','§68; Paradigm I','Paradigm I, weak verbs Pe-aleph')),

    weakChart('pe-yod-waw','qal','imperfect','ישב','first', 'I-Yod — Historical I-Waw · Qal — ישב', [
      ['Perfect 3ms','קָטַל','יָשַׁב','Initial yod appears without a preformative.'],
      ['Imperfect 3ms','יִקְטֹל','יֵשֵׁב','The historical first radical is absent from the imperfect stem.'],
      ['Infinitive construct','קְטֹל','שֶׁבֶת','Initial yod is lost and the feminine ending is visible.'],
      ['Imperative 2ms','קְטֹל','שֵׁב','Initial yod is absent.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיֵּשֶׁב','The shortened stem follows the sequence prefix.']
    ], weakSource('522','§69; Paradigm K','Paradigm K, verbs originally Pe-waw')),
    weakChart('pe-yod-waw','hiphil','perfect','ישב','first', 'I-Yod — Historical I-Waw · Hiphil — ישב', [
      ['Perfect 3ms','הִקְטִיל','הוֹשִׁיב','Historical waw appears as holem-waw.'],
      ['Imperfect 3ms','יַקְטִיל','יוֹשִׁיב','The initial radical is represented by וֹ.'],
      ['Imperative 2ms','הַקְטֵל','הוֹשֵׁב','The causative prefix and historical vowel are visible.'],
      ['Participle ms','מַקְטִיל','מוֹשִׁיב','The participle retains וֹ.']
    ], weakSource('523','§69; Paradigm K','Paradigm K, verbs originally Pe-waw')),
    weakChart('pe-yod-waw','qal','imperfect','יטב','first', 'I-Yod — True I-Yod · Qal and Hiphil — יטב', [
      ['Qal perfect 3ms','קָטַל','יָטַב','True initial yod remains.'],
      ['Qal imperfect 3ms','יִקְטֹל','יִיטַב','Yod is retained or written defectively.'],
      ['Hiphil perfect 3ms','הִקְטִיל','הֵיטִיב','The source distinguishes true Pe-yod contraction.'],
      ['Hiphil imperfect 3ms','יַקְטִיל','יֵיטִיב','Long vowels mark the contracted Hiphil.']
    ], weakSource('523','§70; Paradigm L','Paradigm L, verbs properly Pe-yod')),

    weakChart('hollow-ayin-waw','qal','perfect','קום','second', 'Biconsonantal — Middle Waw · Qal perfect — קום', [
      ['3ms','קָטַל','קָם','The weak middle radical contracts into the stem vowel.'],
      ['3fs','קָטְלָה','קָמָה','The long vowel remains before the suffix.'],
      ['2ms','קָטַלְתָּ','קַמְתָּ','The long vowel shortens before a consonantal suffix.'],
      ['3cp','קָטְלוּ','קָמוּ','The contracted stem remains visible.']
    ], weakSource('524','§72; Paradigm M','Paradigm M, hollow verbs Ayin-waw')),
    weakChart('hollow-ayin-waw','qal','imperfect','קום','second', 'Biconsonantal — Middle Waw · Qal imperfect — קום', [
      ['Infinitive construct','קְטֹל','קוּם','The middle radical is represented by a long vowel.'],
      ['Imperative 2ms','קְטֹל','קוּם','The contracted stem is monosyllabic.'],
      ['Imperfect 3ms','יִקְטֹל','יָקוּם','The stem vowel carries the weak radical.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיָּקָם','The sequence form shortens the hollow stem.'],
      ['Participle ms','קֹטֵל','קָם','The participle is contracted.']
    ], weakSource('524','§72; Paradigm M','Paradigm M, hollow verbs Ayin-waw')),
    weakChart('hollow-ayin-waw','hiphil','perfect','קום','second', 'Biconsonantal — Middle Waw · Hiphil — קום', [
      ['Perfect 3ms','הִקְטִיל','הֵקִים','The weak middle radical contracts into long vowels.'],
      ['Imperfect 3ms','יַקְטִיל','יָקִים','The Hiphil stem is compact.'],
      ['Imperative 2ms','הַקְטֵל','הָקֵם','The weak radical is carried by the stem vowel.'],
      ['Participle ms','מַקְטִיל','מֵקִים','The participial prefix vowel lengthens.']
    ], weakSource('524','§72; Paradigm M','Paradigm M, hollow verbs Ayin-waw')),
    weakChart('hollow-ayin-waw','hophal','perfect','קום','second', 'Biconsonantal — Middle Waw · Hophal — קום', [
      ['Perfect 3ms','הָקְטַל','הוּקַם','The hollow root contracts after the passive prefix.'],
      ['Imperfect 3ms','יָקְטַל','יוּקַם','The u-class vowel carries the weak radical.'],
      ['Participle ms','מָקְטָל','מוּקָם','The contracted passive stem remains visible.']
    ], weakSource('525','§72; Paradigm M','Paradigm M, hollow verbs Ayin-waw')),
    weakChart('hollow-ayin-yod','qal','imperfect','שית','second', 'Biconsonantal — Middle Yod · Qal anchors — שית', [
      ['Perfect 3ms','קָטַל','שָׁת','The middle yod is absent from the contracted perfect.'],
      ['Infinitive construct','קְטֹל','שִׁית','Yod appears as mater lectionis.'],
      ['Infinitive absolute','קָטוֹל','שׁוֹת','The source prints a distinct absolute form.'],
      ['Imperfect 3ms','יִקְטֹל','יָשִׁית','The i-class stem distinguishes this family.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיָּשֶׁת','The sequence form shortens the stem.']
    ], weakSource('202','§73, verbs middle i','Directly printed examples in §73',false,'Gesenius supplies representative Qal forms in the discussion, not a complete root-by-root paradigm.')),

    weakChart('lamed-he','qal','perfect','גלה','third', 'III-He · Qal perfect — גלה', [
      ['3ms','קָטַל','גָּלָה','Final ה marks the unsuffixed form.'],
      ['3fs','קָטְלָה','גָּלְתָה','Final ה drops before the suffix.'],
      ['2ms','קָטַלְתָּ','גָּלִיתָ','Yod appears before a consonantal suffix.'],
      ['3cp','קָטְלוּ','גָּלוּ','Final ה drops before the vowel suffix.']
    ], weakSource('528','§75; Paradigm P','Paradigm P, weak verbs Lamed-he')),
    weakChart('lamed-he','qal','imperfect','גלה','third', 'III-He · Qal imperfect — גלה', [
      ['Imperfect 3ms','יִקְטֹל','יִגְלֶה','Final ה carries the ending vowel.'],
      ['Shortened imperfect','יִקְטֹל','יִגֶל','Apocope removes final ה.'],
      ['Infinitive construct','קְטֹל','גְּלוֹת','The final weak radical becomes וֹת.'],
      ['Imperative 2ms','קְטֹל','גְּלֵה','Final ה remains in the unsuffixed command.'],
      ['Participle ms','קֹטֵל','גֹּלֶה','Final ה marks the participle.']
    ], weakSource('528','§75; Paradigm P','Paradigm P, weak verbs Lamed-he')),
    weakChart('lamed-he','niphal','imperfect','גלה','third', 'III-He · Niphal anchors — גלה', [
      ['Perfect 3ms','נִקְטַל','נִגְלָה','Final ה remains unsuffixed.'],
      ['Infinitive construct','הִקָּטֵל','הִגָּלוֹת','The final weak radical becomes וֹת.'],
      ['Imperative 2ms','הִקָּטֵל','הִגָּלֵה','Final ה carries the ending vowel.'],
      ['Imperfect 3ms','יִקָּטֵל','יִגָּלֶה','The Niphal prefix and final ה are both visible.'],
      ['Participle ms','נִקְטָל','נִגְלֶה','The final radical is represented by ה.']
    ], weakSource('528','§75; Paradigm P','Paradigm P, weak verbs Lamed-he')),
    weakChart('lamed-he','piel','imperfect','גלה','third', 'III-He · Piel anchors — גלה', [
      ['Perfect 3ms','קִטֵּל','גִּלָּה','Final ה replaces the ordinary ending.'],
      ['Infinitive construct','קַטֵּל','גַּלּוֹת','The final weak radical becomes וֹת.'],
      ['Imperative 2ms','קַטֵּל','גַּלֵּה','Final ה is retained.'],
      ['Imperfect 3ms','יְקַטֵּל','יְגַלֶּה','The doubled middle radical remains the Piel cue.'],
      ['Participle ms','מְקַטֵּל','מְגַלֶּה','Final ה carries the ending vowel.']
    ], weakSource('528','§75; Paradigm P','Paradigm P, weak verbs Lamed-he')),
    weakChart('lamed-he','hiphil','imperfect','גלה','third', 'III-He · Hiphil anchors — גלה', [
      ['Perfect 3ms','הִקְטִיל','הִגְלָה','The final weak radical changes the Hiphil ending.'],
      ['Infinitive construct','הַקְטִיל','הַגְלוֹת','The final radical becomes וֹת.'],
      ['Imperative 2ms','הַקְטֵל','הַגְלֵה','Final ה remains in the command.'],
      ['Imperfect 3ms','יַקְטִיל','יַגְלֶה','The usual Hiphil i-class ending is absent.'],
      ['Participle ms','מַקְטִיל','מַגְלֶה','Final ה carries the ending vowel.']
    ], weakSource('529','§75; Paradigm P','Paradigm P, weak verbs Lamed-he')),
    weakChart('lamed-he','hitpael','imperfect','גלה','third', 'III-He · Hitpael anchors — גלה', [
      ['Perfect 3ms','הִתְקַטֵּל','הִתְגַּלָּה','Final ה replaces the ordinary ending.'],
      ['Infinitive construct','הִתְקַטֵּל','הִתְגַּלּוֹת','The final weak radical becomes וֹת.'],
      ['Imperative 2ms','הִתְקַטֵּל','הִתְגַּלֵּה','The stem prefix and final ה remain visible.'],
      ['Imperfect 3ms','יִתְקַטֵּל','יִתְגַּלֶּה','Final ה carries the ending vowel.'],
      ['Participle ms','מִתְקַטֵּל','מִתְגַּלֶּה','The Hitpael prefix remains the primary cue.']
    ], weakSource('529','§75; Paradigm P','Paradigm P, weak verbs Lamed-he')),

    weakChart('doubly-weak','qal','infinitive-construct','נשא','first and third', 'Doubly Weak · Qal anchors — נשא', [
      ['Perfect 3ms','קָטַל','נָשָׂא','Both initial nun and final aleph are visible.'],
      ['Imperative 2ms','קְטֹל','שָׂא','Initial nun is lost.'],
      ['Infinitive construct','קְטֹל','שְׂאֵת','Initial nun is lost and the final weak radical reshapes the form.'],
      ['Infinitive with ל','לִקְטֹל','לָשֵׂאת','The directly printed prefixed infinitive contracts.'],
      ['Imperfect 3fp','תִּקְטֹלְנָה','תִּשֶּׂנָה','Both weak behaviors affect the form.']
    ], weakSource('217–218','§76c, verbs doubly weak','Direct examples for Pe-nun + Lamed-aleph',false,'Gesenius prints selected difficult forms, not a complete paradigm; no unprinted forms are inferred.')),
    weakChart('doubly-weak','qal','wayyiqtol','היה','first and third', 'Doubly Weak · High-frequency anchors — היה', [
      ['Perfect 3ms','קָטַל','הָיָה','Initial guttural and final weak radical remain visible.'],
      ['Shortened imperfect 3ms','יִקְטֹל','יְהִי','The final ה drops and the middle yod carries the vowel.'],
      ['Wayyiqtol 3ms','וַיִּקְטֹל','וַיְהִי','The high-frequency sequence form is strongly contracted.']
    ], weakSource('214–217','§75s; §76, verbs doubly weak','Directly printed examples for היה',false,'Only directly discussed high-frequency anchors are included; no complete paradigm is inferred.'))
  ];
  const nominalSource = (printedPages, sections, table, complete=true, limitation='', alternatePointing='Accents and rare pausal or poetic alternatives are omitted unless the chart names them.') => ({
    ...GESENIUS_1910,
    coverageAnchor:'hebrew-nominal-suffix-sources',
    printedPages,
    sections,
    table,
    complete,
    limitation,
    alternatePointing
  });
  const nominalChart = (id, morphologyFamily, grammaticalCategory, baseType, label, columns, rows, options={}) => chart(label, columns, rows, {
    id,
    milestone:'v1.3.6b',
    language:'hebrew',
    morphologyFamily,
    grammaticalCategory,
    baseType,
    ...options
  });
  const HEBREW_NOMINAL_CLASSROOM_LABELS = Object.freeze({
    'construct-state':'Construct State',
    'nominal-patterns':'Noun Patterns',
    'prepositional-suffixes':'Suffixes on Prepositions',
    'pronominal-suffixes':'Suffixes on Nouns',
    'verbal-object-suffixes':'Object Suffixes on Verbs',
    'assimilation':'Assimilating Preposition',
    'direct-attachment':'Direct-attaching Preposition',
    'direct-object-suffix':'Object Suffixes',
    'nominal-suffixes':'Pronominal Suffixes',
    'peculiar-construct':'Irregular Construct Forms',
    'peculiar-nouns':'Irregular Nouns',
    'plural-like-base':'Plural-like Prepositional Base',
    'plural-noun-base':'Plural Noun-like Base',
    'reducible-vowels':'Reducible-vowel Nouns',
    'segolate':'Segolate Nouns',
    'state-and-number':'Absolute and Construct Forms',
    'unchanged-construct':'Unchanged Construct Forms',
    'acharei-preposition':'אַחֲרֵי',
    'al-preposition':'עַל',
    'body-and-place-nouns':'Body and Place Nouns',
    'el-preposition':'אֶל',
    'feminine-singular-nouns':'Feminine Singular Nouns',
    'high-frequency-nouns':'High-frequency Nouns',
    'masculine-nouns':'Masculine Nouns',
    'masculine-plural-noun':'Masculine Plural Noun',
    'min-preposition':'מִן',
    'mixed-noun-classes':'Mixed Noun Classes',
    'peculiar-singular-noun':'Irregular Singular Noun',
    'prefixed-preposition':'Prefixed Preposition',
    'qatl-ground-form':'qaṭl Pattern',
    'representative-perfect-forms':'Limited Perfect Examples',
    'segolate-and-peculiar-nouns':'Segolate and Irregular Nouns',
    '1st':'First Person',
    '2nd':'Second Person',
    '3rd':'Third Person'
  });
  const hebrewNominalMorphologyCharts = [
    nominalChart('hebrew-nominal-state-number-endings','construct-state','state-and-number','mixed-noun-classes','Absolute and Construct Forms by Number',
      ['Gender','Number','Base noun','Absolute','Construct','Visible change','Recognition cue'],[
        ['masculine','singular','דָּבָר','דָּבָר','דְּבַר','Qamets reduces to shewa.','The bound form precedes its genitive.'],
        ['masculine','plural','דָּבָר','דְּבָרִים','דִּבְרֵי','־ִים becomes ־ֵי; the stem vowels change.','Final ־ֵי is the common plural construct ending.'],
        ['feminine','singular','מַלְכָּה','מַלְכָּה','מַלְכַּת','Final ־ָה returns to ־ַת.','Look for final ת before the following noun.'],
        ['feminine','plural','מַלְכָּה','מְלָכוֹת','מַלְכוֹת','־וֹת remains; the stem vowel changes.','The plural ending alone does not distinguish state.'],
        ['common','dual','עַיִן','עֵינַיִם','עֵינֵי','־ַיִם becomes ־ֵי.','Dual construct and masculine plural construct share ־ֵי.']
      ], { representativeLexemes:['דָּבָר','מַלְכָּה','עַיִן'], stateCoverage:['absolute','construct'], numberCoverage:['singular','plural','dual'], genderCoverage:['masculine','feminine','common'], comparison:{ focus:'absolute versus construct', cue:'Watch the ending and any reduced stem vowel.' }, source:nominalSource('247, 264–266, 277','§89a–e; §93 paradigms I–II; §95 paradigm I','Construct-state rules and noun paradigms',true,'Representative noun classes only; this is not a productive noun generator.'), note:'Representative classes only. A matching surface form may belong to a different noun class.' }),
    nominalChart('hebrew-nominal-construct-unchanged','construct-state','unchanged-construct','segolate-and-peculiar-nouns','Construct Forms with No Spelling Change',
      ['Gender','Number','Base noun','Absolute','Construct','Visible change','Recognition cue'],[
        ['masculine','singular','מֶלֶךְ','מֶלֶךְ','מֶלֶךְ','No visible change.','State must be recognized from the following genitive.'],
        ['masculine','singular','סֵפֶר','סֵפֶר','סֵפֶר','No visible change.','Syntax, not spelling, identifies construct.'],
        ['masculine','singular','אִישׁ','אִישׁ','אִישׁ','No visible change.','The next noun supplies the relationship.'],
        ['feminine','singular','בַּת','בַּת','בַּת','No visible change.','Do not assume every construct changes its ending.'],
        ['masculine','singular','יוֹם','יוֹם','יוֹם','No visible change.','Read the bound relationship from context.']
      ], { representativeLexemes:['מֶלֶךְ','סֵפֶר','אִישׁ','בַּת','יוֹם'], stateCoverage:['absolute','construct'], numberCoverage:['singular'], genderCoverage:['masculine','feminine'], comparison:{ focus:'unchanged construct forms', cue:'Use the following genitive to identify state.' }, source:nominalSource('264, 282–284','§93 paradigm I; §96, nouns of peculiar formation','Masculine noun paradigm and peculiar noun tables',true,'Only the directly printed representative nouns are included.'), note:'These examples are source-supplied; they do not imply that every noun in the same gender behaves identically.' }),
    nominalChart('hebrew-nominal-irregular-constructs','construct-state','peculiar-construct','high-frequency-nouns','Common Irregular Construct Forms',
      ['Gender','Number','Base noun','Absolute','Construct','Visible change','Recognition cue'],[
        ['masculine','singular','אָב','אָב','אֲבִי','The stem gains final ־ִי and the first vowel reduces.','אֲבִי before a noun means “father of.”'],
        ['masculine','singular','אָח','אָח','אֲחִי','The stem gains final ־ִי and the first vowel reduces.','אֲחִי before a noun means “brother of.”'],
        ['feminine','singular','אִשָּׁה','אִשָּׁה','אֵשֶׁת','The construct uses a distinct stem.','Recognize אֵשֶׁת as the bound form of אִשָּׁה.'],
        ['masculine','singular','בַּיִת','בַּיִת','בֵּית','The diphthong contracts.','בֵּית is the common construct “house of.”'],
        ['masculine','singular','בֵּן','בֵּן','בֶּן־','Tsere shortens before close connection.','The bound form is commonly joined with maqqef.']
      ], { representativeLexemes:['אָב','אָח','אִשָּׁה','בַּיִת','בֵּן'], stateCoverage:['absolute','construct'], numberCoverage:['singular'], genderCoverage:['masculine','feminine'], comparison:{ focus:'peculiar construct stems', cue:'Learn these high-frequency bound forms as lexical patterns.' }, source:nominalSource('282–283','§96, nouns of peculiar formation','Peculiar noun paradigms',true,'Only high-frequency forms printed in the table are selected.'), note:'Gesenius describes these as nouns of peculiar formation; this chart does not treat them as one productive class.' })
  ];
  const nounSuffixRows = (base, stem, rows) => rows.map(([person,gender,number,suffix,result,english,change]) => [person,gender,number,base,stem,suffix,result,english,change]);
  const hebrewNominalSuffixCharts = [
    nominalChart('hebrew-noun-suffix-singular-av','pronominal-suffixes','nominal-suffixes','peculiar-singular-noun','Pronominal Suffixes on a Singular Noun — אָב',
      ['Person','Gender','Number','Base noun','Suffix stem','Suffix','Result','Identification','Visible change'],nounSuffixRows('אָב','אֲבִי',[
        ['1st','common','singular','־ִי','אָבִי','my father','The first vowel lengthens in the resulting form.'],
        ['2nd','masculine','singular','־ךָ','אָבִיךָ','your father','The vowel-final suffix stem remains visible.'],
        ['2nd','feminine','singular','־ךְ','אָבִיךְ','your father','Gender is marked in the suffix.'],
        ['3rd','masculine','singular','־ו','אָבִיו','his father','Final yod remains before the pronominal ending.'],
        ['3rd','feminine','singular','־הָ','אָבִיהָ','her father','Final yod remains before the suffix.'],
        ['1st','common','plural','־נוּ','אָבִינוּ','our father','The suffix is not gendered.'],
        ['2nd','masculine','plural','־כֶם','אֲבִיכֶם','your father','The source prints the reduced initial vowel.'],
        ['2nd','feminine','plural','־כֶן','אֲבִיכֶן','your father','Plural gender is distinguished.'],
        ['3rd','masculine','plural','־הֶם','אֲבִיהֶם','their father','Plural gender is distinguished.'],
        ['3rd','feminine','plural','־הֶן','אֲבִיהֶן','their father','Plural gender is distinguished.']
      ]), { representativeLexemes:['אָב'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, stateCoverage:['absolute','suffix stem'], numberCoverage:['singular'], genderCoverage:['masculine'], comparison:{ focus:'base, suffix stem, suffix, result', cue:'The peculiar vowel-final stem אֲבִי controls attachment.' }, source:nominalSource('254–259, 282','§91a–l; §96, nouns of peculiar formation','Singular noun suffix inventory and אָב paradigm',true,'The alternate long 3ms form אָבִיהוּ is recorded by the source but omitted from the main row.'), note:'אָב uses a peculiar vowel-final suffix stem; do not transfer this pattern mechanically to other nouns.' }),
    nominalChart('hebrew-noun-suffix-plural-banim','pronominal-suffixes','nominal-suffixes','masculine-plural-noun','Pronominal Suffixes on a Masculine Plural Noun — בָּנִים',
      ['Person','Gender','Number','Base noun','Suffix stem','Suffix','Result','Identification','Visible change'],nounSuffixRows('בָּנִים','בָּנַי / בְּנֵי',[
        ['1st','common','singular','־י','בָּנַי','my sons','The plural ending becomes ־ַי.'],
        ['2nd','masculine','singular','־ךָ','בָּנֶיךָ','your sons','The plural suffix base retains yod.'],
        ['2nd','feminine','singular','־ךְ','בָּנַיִךְ','your sons','The source preserves the two-yod sequence.'],
        ['3rd','masculine','singular','־ו','בָּנָיו','his sons','The plural suffix base appears before waw.'],
        ['3rd','feminine','singular','־הָ','בָּנֶיהָ','her sons','The plural-like base remains visible.'],
        ['1st','common','plural','־נוּ','בָּנֵינוּ','our sons','The suffix is not gendered.'],
        ['2nd','masculine','plural','־כֶם','בְּנֵיכֶם','your sons','The stem reduces before the heavy suffix.'],
        ['3rd','masculine','plural','־הֶם','בְּנֵיהֶם','their sons','The stem reduces before the heavy suffix.'],
        ['3rd','feminine','plural','־הֶן','בְּנֵיהֶן','their sons','Plural gender remains distinct.']
      ]), { representativeLexemes:['בֵּן','בָּנִים'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, stateCoverage:['absolute','suffix stem'], numberCoverage:['plural'], genderCoverage:['masculine'], comparison:{ focus:'masculine plural suffix bases', cue:'Look for plural yod before the pronominal suffix.' }, source:nominalSource('255–259, 283','§91g–k; §96, nouns of peculiar formation','Plural noun suffix inventory and בָּנִים paradigm',false,'The printed בָּנִים table does not supply a 2fp result; none is inferred.'), note:'The source does not print a 2fp result for this representative noun, so the chart is intentionally incomplete.' }),
    nominalChart('hebrew-noun-suffix-feminine-comparison','pronominal-suffixes','nominal-suffixes','feminine-singular-nouns','Feminine Nouns with Pronominal Suffixes',
      ['Person','Gender','Number','Base noun','Suffix stem','Suffix','Result','Identification','Visible change'],[
        ['1st','common','singular','אִשָּׁה','אִשְׁתּ','־ִי','אִשְׁתִּי','my wife','The peculiar construct stem replaces the absolute form.'],
        ['2nd','masculine','singular','אִשָּׁה','אִשְׁתּ','־ךָ','אִשְׁתְּךָ','your wife','The suffix attaches to the construct-like stem.'],
        ['3rd','masculine','singular','אִשָּׁה','אִשְׁתּ','־וֹ','אִשְׁתּוֹ','his wife','The distinct stem remains visible.'],
        ['1st','common','singular','מַלְכָּה','מַלְכַּת','־ִי','מַלְכָּתִי','my queen','Final ־ָה returns to ת before the suffix.'],
        ['2nd','masculine','plural','מַלְכָּה','מַלְכַּת','־כֶם','מַלְכַּתְכֶם','your queen','The heavy suffix attaches to the feminine stem.']
      ], { representativeLexemes:['אִשָּׁה','מַלְכָּה'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, stateCoverage:['absolute','suffix stem'], numberCoverage:['singular'], genderCoverage:['feminine'], comparison:{ focus:'feminine suffix stems', cue:'Identify the noun class before reading the suffix.' }, source:nominalSource('277, 282','§95 paradigm I; §96, nouns of peculiar formation','Feminine and peculiar noun paradigms',false,'Focused directly printed comparisons only; no complete feminine paradigm is inferred.'), note:'Feminine noun classes do not share one suffix stem; these are two directly printed comparisons.' })
  ];
  const prepositionRows = (baseType, rows) => rows.map(([person,gender,number,suffix,result,english,change]) => [person,gender,number,baseType,suffix,result,english,change]);
  const hebrewPrepositionalSuffixCharts = [
    nominalChart('hebrew-preposition-suffix-lamed','prepositional-suffixes','direct-attachment','prefixed-preposition','Pronominal Suffixes with לְ',
      ['Person','Gender','Number','Base','Suffix','Result','Identification','Visible change'],prepositionRows('לְ',[
        ['1st','common','singular','־ִי','לִי','to me','The prefixed preposition takes a full vowel.'],['2nd','masculine','singular','־ךָ','לְךָ','to you','Direct attachment.'],['2nd','feminine','singular','־ךְ','לָךְ','to you','Qamets distinguishes the common feminine form.'],['3rd','masculine','singular','־וֹ','לוֹ','to him','Direct contraction.'],['3rd','feminine','singular','־הּ','לָהּ','to her','Mappiq marks the suffix.'],['1st','common','plural','־נוּ','לָנוּ','to us','The suffix is not gendered.'],['2nd','masculine','plural','־כֶם','לָכֶם','to you','The preposition takes Qamets.'],['2nd','feminine','plural','־כֶן','לָכֶן','to you','Plural gender is distinguished.'],['3rd','masculine','plural','־הֶם','לָהֶם','to them','Plural gender is distinguished.'],['3rd','feminine','plural','־הֶן','לָהֶן','to them','Plural gender is distinguished.']
      ]), { representativeLexemes:['לְ'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, attachmentType:'direct', comparison:{ focus:'prefixed preposition plus suffix', cue:'The one-letter preposition gains a full vowel in several forms.' }, source:nominalSource('301','§103e–g','לְ with pronominal suffixes',true,'Rare or poetic alternates are omitted from the main chart.'), note:'Common prose forms are shown; bracketed and poetic alternatives remain in the source notes.' }),
    nominalChart('hebrew-preposition-suffix-min','prepositional-suffixes','assimilation','min-preposition','Pronominal Suffixes with מִן',
      ['Person','Gender','Number','Base','Suffix','Result','Identification','Visible change'],prepositionRows('מִן',[
        ['1st','common','singular','־ִי','מִמֶּנִּי','from me','Nun assimilates and consonants double.'],['2nd','masculine','singular','־ךָ','מִמְּךָ','from you','Nun assimilates.'],['2nd','feminine','singular','־ךְ','מִמֵּךְ','from you','Nun assimilates.'],['3rd','masculine','singular','־וּ','מִמֶּנּוּ','from him','The expanded stem is used.'],['3rd','feminine','singular','־הָ','מִמֶּנָּה','from her','The expanded stem is used.'],['1st','common','plural','־נוּ','מִמֶּנּוּ','from us','The result is identical in spelling to 3ms.'],['2nd','masculine','plural','־כֶם','מִכֶּם','from you','The shorter assimilated base is used.'],['2nd','feminine','plural','־כֶן','מִכֶּן','from you','Plural gender is distinguished.'],['3rd','masculine','plural','־הֶם','מֵהֶם','from them','The source prints a contracted plural form.'],['3rd','feminine','plural','־הֶן','מֵהֶן','from them','Plural gender is distinguished.']
      ]), { representativeLexemes:['מִן'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, attachmentType:'assimilation', comparison:{ focus:'assimilation and expanded stem', cue:'Expect doubled consonants or contracted מֵ־ forms.' }, source:nominalSource('303','§103i–m','מִן with pronominal suffixes',true,'Poetic and pausal alternates are omitted; 3ms and 1cp remain homographic.'), note:'The 3ms and 1cp forms are homographic; context supplies person and number.' }),
    nominalChart('hebrew-preposition-suffix-el','prepositional-suffixes','plural-like-base','el-preposition','Pronominal Suffixes with אֶל',
      ['Person','Gender','Number','Base','Suffix','Result','Identification','Visible change'],prepositionRows('אֶל',[
        ['1st','common','singular','־ַי','אֵלַי','to me','The suffix base ends in yod.'],['2nd','masculine','singular','־ֶיךָ','אֵלֶיךָ','to you','A plural-like suffix shape appears.'],['2nd','feminine','singular','־ַיִךְ','אֵלַיִךְ','to you','Gender is visible in the ending.'],['3rd','masculine','singular','־ָיו','אֵלָיו','to him','The plural-like suffix shape remains.'],['3rd','feminine','singular','־ֶיהָ','אֵלֶיהָ','to her','The plural-like suffix shape remains.'],['1st','common','plural','־ֵינוּ','אֵלֵינוּ','to us','The suffix is not gendered.'],['2nd','masculine','plural','־ֵיכֶם','אֲלֵיכֶם','to you','The initial vowel reduces.'],['3rd','masculine','plural','־ֵיהֶם','אֲלֵיהֶם','to them','The initial vowel reduces.'],['3rd','feminine','plural','־ֵיהֶן','אֲלֵיהֶן','to them','Plural gender is distinguished.']
      ]), { representativeLexemes:['אֶל'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, attachmentType:'plural-like-base', comparison:{ focus:'plural-like suffix base', cue:'Look for ־ַי / ־ֶי / ־ֵי shapes.' }, source:nominalSource('304–305','§103n–p','Spatial prepositions with suffixes',false,'The printed comparison table supplies no 2fp form; none is inferred.'), note:'The source table does not print a 2fp form.' }),
    nominalChart('hebrew-preposition-suffix-al','prepositional-suffixes','plural-like-base','al-preposition','Pronominal Suffixes with עַל',
      ['Person','Gender','Number','Base','Suffix','Result','Identification','Visible change'],prepositionRows('עַל',[
        ['1st','common','singular','־ַי','עָלַי','on me','The suffix base ends in yod.'],['2nd','masculine','singular','־ֶיךָ','עָלֶיךָ','on you','A plural-like suffix shape appears.'],['2nd','feminine','singular','־ַיִךְ','עָלַיִךְ','on you','Gender is visible in the ending.'],['3rd','masculine','singular','־ָיו','עָלָיו','on him','The plural-like suffix shape remains.'],['3rd','feminine','singular','־ֶיהָ','עָלֶיהָ','on her','The plural-like suffix shape remains.'],['1st','common','plural','־ֵינוּ','עָלֵינוּ','on us','The suffix is not gendered.'],['2nd','masculine','plural','־ֵיכֶם','עֲלֵיכֶם','on you','The first vowel reduces.'],['3rd','masculine','plural','־ֵיהֶם','עֲלֵיהֶם','on them','The first vowel reduces.'],['3rd','feminine','plural','־ֵיהֶן','עֲלֵיהֶן','on them','Plural gender is distinguished.']
      ]), { representativeLexemes:['עַל'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, attachmentType:'plural-like-base', comparison:{ focus:'plural-like suffix base', cue:'Look for ־ַי / ־ֶי / ־ֵי shapes.' }, source:nominalSource('304–305','§103n–p','Spatial prepositions with suffixes',false,'The printed comparison table supplies no 2fp form; none is inferred.'), note:'The source table does not print a 2fp form.' }),
    nominalChart('hebrew-preposition-suffix-acharei','prepositional-suffixes','plural-noun-base','acharei-preposition','Pronominal Suffixes with אַחֲרֵי',
      ['Person','Gender','Number','Base','Suffix','Result','Identification','Visible change'],prepositionRows('אַחֲרֵי',[
        ['1st','common','singular','־ַי','אַחֲרַי','after me','The plural noun-like base takes a suffix.'],['2nd','masculine','singular','־ֶיךָ','אַחֲרֶיךָ','after you','The plural-like suffix shape appears.'],['2nd','feminine','singular','־ַיִךְ','אַחֲרַיִךְ','after you','Gender is visible in the ending.'],['3rd','masculine','singular','־ָיו','אַחֲרָיו','after him','The plural-like suffix shape remains.'],['3rd','feminine','singular','־ֶיהָ','אַחֲרֶיהָ','after her','The plural-like suffix shape remains.'],['1st','common','plural','־ֵינוּ','אַחֲרֵינוּ','after us','The suffix is not gendered.'],['2nd','masculine','plural','־ֵיכֶם','אַחֲרֵיכֶם','after you','The plural noun-like base remains.'],['3rd','masculine','plural','־ֵיהֶם','אַחֲרֵיהֶם','after them','The plural noun-like base remains.'],['3rd','feminine','plural','־ֵיהֶן','אַחֲרֵיהֶן','after them','Plural gender is distinguished.']
      ]), { representativeLexemes:['אַחֲרֵי'], suffixPersons:['1st','2nd','3rd'], suffixGenderNumber:true, attachmentType:'plural-noun-base', comparison:{ focus:'plural noun-like suffix base', cue:'The preposition behaves like a plural construct noun.' }, source:nominalSource('304–305','§103n–p','Spatial prepositions with suffixes',false,'The printed comparison table supplies no 2fp form; none is inferred.'), note:'The source table does not print a 2fp form.' })
  ];
  const hebrewVerbalObjectSuffixCharts = [
    nominalChart('hebrew-verbal-object-suffix-perfect-examples','verbal-object-suffixes','direct-object-suffix','representative-perfect-forms','Object Suffixes on Verbs — Limited Perfect Examples',
      ['Verbal base','Subject','Object person','Object gender','Object number','Suffix','Result','Identification','Visible change'],[
        ['חָקַר','2ms','1st','common','singular','־נִי','חֲקַרְתַּנִי','you searched me','The object suffix follows the perfect subject ending.'],
        ['עָזַב','2ms','1st','common','singular','־נִי','עֲזַבְתָּנִי','you forsook me','Pausal Qamets is retained in the source example.'],
        ['זָנַח','2ms','1st','common','plural','־נוּ','זְנַחְתָּנוּ','you cast us off','No connecting vowel appears after the 2ms ending.'],
        ['פָּרַץ','2ms','1st','common','plural','־נוּ','פְרַצְתָּנוּ','you broke us down','No connecting vowel appears after the 2ms ending.'],
        ['יָכֹל','1cs','3rd','masculine','singular','־וֹ','יְכָלְתִּיו','I prevailed against him','The middle vowel shortens after losing the tone.']
      ], { representativeLexemes:['חָקַר','עָזַב','זָנַח','פָּרַץ','יָכֹל'], suffixPersons:['1st','3rd'], suffixGenderNumber:true, attachmentType:'direct-object', comparison:{ focus:'finite verbal base plus object suffix', cue:'Separate the subject ending from the following object suffix.' }, source:nominalSource('155, 158–160','§§58–59','Verbal suffix inventory and directly cited perfect examples',false,'Selected attested perfect examples only; no stem-by-person generator or complete paradigm is supplied.'), note:'This is a recognition sample, not a complete verbal-suffix paradigm. Core strong and weak verb charts remain unchanged.' })
  ];
  const hebrewNominalPatternCharts = [
    nominalChart('hebrew-nominal-segolate-patterns','nominal-patterns','segolate','qatl-ground-form','Segolate Nouns — qaṭl Pattern',
      ['Pattern','Base noun','Absolute singular','Construct singular','Suffixed form','Absolute plural','Construct plural','Recognition cue'],[
        ['qaṭl — מלך','מֶלֶךְ','מֶלֶךְ','מֶלֶךְ','מַלְכִּי','מְלָכִים','מַלְכֵי','The helping vowel disappears before suffixes and endings.'],
        ['qaṭl — ספר','סֵפֶר','סֵפֶר','סֵפֶר','סִפְרִי','סְפָרִים','סִפְרֵי','The construct singular is unchanged; the suffix stem is reduced.'],
        ['qaṭl — קדש','קֹדֶשׁ','קֹדֶשׁ','קֹדֶשׁ','קָדְשִׁי','קֳדָשִׁים','קָדְשֵׁי','The source prints a distinct suffixed stem.'],
        ['qaṭl — נער','נַעַר','נַעַר','נַעַר','נַעֲרִי','נְעָרִים','נַעֲרֵי','The guttural takes a reduced vowel.']
      ], { representativeLexemes:['מֶלֶךְ','סֵפֶר','קֹדֶשׁ','נַעַר'], stateCoverage:['absolute','construct','suffixed'], numberCoverage:['singular','plural'], genderCoverage:['masculine'], comparison:{ focus:'segolate surface and suffix stems', cue:'Do not expect the helping vowel to remain before every ending.' }, source:nominalSource('264','§93g–h; paradigm I a–d','Masculine noun paradigm I',true,'Recognition-oriented representatives of the qatl ground-form class only.'), note:'The qatl label describes the source’s stated ground form; it is not an exhaustive historical classification.' }),
    nominalChart('hebrew-nominal-reducible-vowels','nominal-patterns','reducible-vowels','masculine-nouns','Nouns with Reducible Vowels',
      ['Base noun','Absolute singular','Construct singular','Suffixed form','Absolute plural','Construct plural','Visible change','Recognition cue'],[
        ['דָּבָר','דָּבָר','דְּבַר','דְּבָרִי','דְּבָרִים','דִּבְרֵי','Qamets reduces and the plural stem shifts.','Compare state before deciding the lexical form.'],
        ['חָכָם','חָכָם','חֲכַם','חֲכָמִי','חֲכָמִים','חַכְמֵי','A reduced vowel appears near the guttural.','Gutturals often take a reduced vowel instead of shewa.'],
        ['זָקֵן','זָקֵן','זְקַן','זְקֵנִי','זְקֵנִים','זִקְנֵי','The first vowel reduces; the construct plural shifts.','The lexical long vowels may not survive in bound forms.']
      ], { representativeLexemes:['דָּבָר','חָכָם','זָקֵן'], stateCoverage:['absolute','construct','suffixed'], numberCoverage:['singular','plural'], genderCoverage:['masculine'], comparison:{ focus:'reduced and shifted vowels', cue:'Recover the lexical form from the consonants and noun class.' }, source:nominalSource('264','§93 paradigm II a–c','Masculine noun paradigm II',true,'Representative reducible-vowel patterns only.'), note:'These comparisons show directly printed representatives, not a rule that predicts every noun.' }),
    nominalChart('hebrew-nominal-peculiar-high-frequency','nominal-patterns','peculiar-nouns','high-frequency-nouns','High-frequency Irregular Nouns',
      ['Base noun','Gender','Absolute singular','Construct singular','1cs suffixed','Absolute plural','Construct plural','Recognition cue'],[
        ['אָב','masculine','אָב','אֲבִי','אָבִי','אָבוֹת','אֲבוֹת','The singular construct ends in yod; the plural is suppletive-looking.'],
        ['אָח','masculine','אָח','אֲחִי','אָחִי','אַחִים','אֲחֵי','The singular and plural construct stems differ.'],
        ['אִישׁ','masculine','אִישׁ','אִישׁ','אִישִׁי','אֲנָשִׁים','אַנְשֵׁי','The plural uses a different visible stem.'],
        ['אִשָּׁה','feminine','אִשָּׁה','אֵשֶׁת','אִשְׁתִּי','נָשִׁים','נְשֵׁי','Both construct and plural use distinct stems.'],
        ['בַּיִת','masculine','בַּיִת','בֵּית','בֵּיתִי','בָּתִּים','בָּתֵּי','The singular construct contracts and the plural reshapes the stem.'],
        ['בֵּן','masculine','בֵּן','בֶּן־','בְּנִי','בָּנִים','בְּנֵי','The suffix and plural stems differ from the absolute.'],
        ['בַּת','feminine','בַּת','בַּת','בִּתִּי','בָּנוֹת','בְּנוֹת','The plural uses the בן consonantal base.'],
        ['יוֹם','masculine','יוֹם','יוֹם','יוֹמוֹ','יָמִים','יְמֵי','The plural vowels shift in construct.']
      ], { representativeLexemes:['אָב','אָח','אִישׁ','אִשָּׁה','בַּיִת','בֵּן','בַּת','יוֹם'], stateCoverage:['absolute','construct','suffixed'], numberCoverage:['singular','plural'], genderCoverage:['masculine','feminine'], comparison:{ focus:'peculiar high-frequency stems', cue:'Treat these forms as lexical recognition families.' }, source:nominalSource('282–283','§96, nouns of peculiar formation','Peculiar noun paradigms',true,'Eight high-frequency noun families selected from the larger printed table.'), note:'The source calls these nouns of peculiar formation; the chart does not claim one shared productive rule.' }),
    nominalChart('hebrew-nominal-peculiar-body-place','nominal-patterns','peculiar-nouns','body-and-place-nouns','Additional Irregular Nouns',
      ['Base noun','Gender','Absolute singular','Construct singular','1cs suffixed','Absolute plural','Construct plural','Recognition cue'],[
        ['רֹאשׁ','masculine','רֹאשׁ','רֹאשׁ','רֹאשִׁי','רָאשִׁים','רָאשֵׁי','The plural vowel differs from the singular.'],
        ['פֶּה','masculine','פֶּה','פִּי','פִּי','פִּיּוֹת','פִּיּוֹת','The construct and suffix stem are פִּי.'],
        ['עִיר','feminine','עִיר','עִיר','עִירִי','עָרִים','עָרֵי','The plural uses a shifted vowel pattern.'],
        ['שֵׁם','masculine','שֵׁם','שֵׁם','שְׁמִי','שֵׁמוֹת','שְׁמוֹת','The suffixed and plural construct stems reduce.']
      ], { representativeLexemes:['רֹאשׁ','פֶּה','עִיר','שֵׁם'], stateCoverage:['absolute','construct','suffixed'], numberCoverage:['singular','plural'], genderCoverage:['masculine','feminine'], comparison:{ focus:'selected peculiar noun anchors', cue:'Use the consonantal identity and learned stem alternation.' }, source:nominalSource('284','§96, nouns of peculiar formation','Peculiar noun paradigms',true,'Only directly printed high-value rows are selected; forms absent from the table are omitted.'), note:'These are selected anchors from the printed table, not an exhaustive irregular-noun list.' })
  ];
  const hebrewNominalAndSuffixCharts = [
    ...hebrewNominalMorphologyCharts,
    ...hebrewNominalSuffixCharts,
    ...hebrewPrepositionalSuffixCharts,
    ...hebrewVerbalObjectSuffixCharts,
    ...hebrewNominalPatternCharts
  ];
  const filterHebrewNominalCharts = (filters={}) => hebrewNominalAndSuffixCharts.filter(chart =>
    (!filters.morphologyFamily || chart.morphologyFamily === filters.morphologyFamily) &&
    (!filters.grammaticalCategory || chart.grammaticalCategory === filters.grammaticalCategory) &&
    (!filters.baseType || chart.baseType === filters.baseType) &&
    (!filters.suffixPerson || chart.suffixPersons?.includes(filters.suffixPerson))
  );
  const filterHebrewWeakVerbCharts = (filters={}) => hebrewWeakVerbCharts.filter(chart =>
    (!filters.weakClassId || chart.weakClassId === filters.weakClassId) &&
    (!filters.stemId || chart.stemId === filters.stemId) &&
    (!filters.formCategory || chart.formCategory === filters.formCategory)
  );
  const hebrewRepresentativeRows = stem => hebrewStemRows.map(([label,,use]) => {
    const data = hebrewStrongVerbData[stem];
    const representative = { Perfect:data.perfect[0], Imperfect:data.imperfect[0], Imperative:data.imperative?.[0], 'Infinitive Construct':data.infinitiveConstruct?.[0], 'Infinitive Absolute':data.infinitiveAbsolute?.[0], Participle:data.participles?.[0]?.[4] }[label];
    return representative ? [label,representative,use] : [label,{label:'Not supplied',note:'Gesenius Paradigm B marks this category “wanting.”'},use];
  });
  const hebrewTabs = stem => {
    const data = hebrewStrongVerbData[stem];
    const byCategory = category => hebrewStrongVerbCharts.filter(item => item.stemId === data.id && item.formCategory === category);
    return ['perfect','imperfect','wayyiqtol','imperative','infinitive-construct','infinitive-absolute','participle','shortened-imperfect']
      .map(category => ({ id:category, label:category.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' '), charts:byCategory(category) }))
      .filter(tab => tab.charts.length);
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
    { id:'hebrew-stem-markers', language:'hebrew', title:'Hebrew Cheat Sheets', category:'Cheat sheets', summary:'Quick recognition markers for the major Hebrew stems.', body:['Use consonants and vowels together to identify a stem.'], recognitionTips:['נִ often points to Niphal.','Doubled middle radical often points to Piel/Pual/Hitpael.','הִ often points to Hiphil.'], charts:[chart('Stem marker overview', ['Stem','Marker','Typical relationship'], Object.entries(stemInfo).map(([s,v])=>[s,v[1],v[0]]))], examples:[ex('הִקְטִיל','Gesenius Paradigm B','Hiphil model pattern')], related:['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-hiphil'] },
    ...['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'].map(hebrewStemTopic),
    { id:'hebrew-katav-stem-relationships', language:'hebrew', title:'קטל stem relationships', category:'Paradigms', summary:'A model-root overview of the seven major strong-verb stems.', body:['קטל is the model strong root printed in Gesenius Paradigm B; it is not presented as an ordinary vocabulary lemma.'], recognitionTips:['Start with the root consonants ק־ט־ל.','Then identify stem markers around the root.'], charts:[chart('קטל across stems', ['Stem','Relationship','Representative pattern'], Object.entries(stemInfo).map(([s,v])=>[s,v[0],v[1]]))], examples:[ex('קטל','Gesenius Paradigm B','model strong root')], stemRelationships:{ root:'קטל', stems:['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'], explanation:stemRelationships }, related:['hebrew-qal','hebrew-niphal','hebrew-piel','hebrew-pual','hebrew-hiphil','hebrew-hophal','hebrew-hitpael'] }
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
    { id:'greek-contract-verbs', language:'greek', title:'Contract Verbs', category:'Verb Paradigms', summary:'Present-system paradigms for representative alpha, epsilon, and omicron contract verbs.', body:[], recognitionTips:['Alpha contracts often show ᾶ/ᾳ forms.','Epsilon contracts often show ει or ου after contraction.','Omicron contracts often show ου/οι forms.'], charts:greekContractCharts, examples:[ex('ἀγαπᾷ','John 3:35','he loves'), ex('ποιεῖ','Matthew 7:21','he does')], related:['greek-verb-overview','greek-verb-endings','greek-common-parsing-clues'] },
    { id:'hebrew-dual-forms', language:'hebrew', title:'Dual Forms', category:'Nominals', summary:'Recognition chart for Hebrew singular, plural, and dual forms.', body:[], recognitionTips:['־ַיִם is the common dual ending.','Expect duals with eyes, hands, feet, ears, days, and years.'], charts:[chart('Number forms', ['Number','Typical marker','Example'], [['Singular','no plural/dual ending','יָד hand'],['Plural','־ִים / ־וֹת','סוּסִים horses'],['Dual','־ַיִם','יָדַיִם hands / two hands']])], examples:[ex('יָדַיִם','Representative','hands'), ex('יוֹמַיִם','Representative','two days')], related:['hebrew-noun-basics','hebrew-construct-chains','hebrew-suffixes'] },
    { id:'hebrew-pronominal-suffixes', language:'hebrew', title:'Pronominal Suffixes', category:'Nominals', summary:'Dedicated suffix chart for possession and object relationships.', body:['Suffixes attach to nouns, prepositions, and verbs. On nouns they often express possession.'], recognitionTips:['וֹ often means his/its.','ךָ and ךְ distinguish your masculine/feminine singular.','Construct chains and suffixes both express close noun relationships.'], charts:[chart('Common noun suffixes', ['Person','Suffix','Example','Sense'], [['1cs','־ִי','סוּסִי','my horse'],['2ms','־ךָ','סוּסְךָ','your horse'],['2fs','־ךְ','סוּסֵךְ','your horse'],['3ms','־וֹ','סוּסוֹ','his horse'],['3fs','־הּ','סוּסָהּ','her horse'],['1cp','־נוּ','סוּסֵנוּ','our horse'],['3mp','־הֶם','סוּסֵיהֶם','their horse']])], examples:[ex('סוּסוֹ','Representative','his horse'), ex('עַמִּי','Exodus 3:10','my people')], related:['hebrew-suffixes','hebrew-construct-chains','hebrew-pronouns'] },
    { id:'hebrew-construct-chains', language:'hebrew', title:'Construct Chains', category:'Nominals', summary:'Concise reference for absolute state, construct state, and noun chains.', body:['A construct noun is bound to the following noun. Translate many chains with “of,” then refine by context.'], recognitionTips:['The construct word normally cannot take the article; definiteness often comes from the final noun.','Construct forms may shorten vowels or change endings.'], charts:[chart('Construct chain basics', ['Feature','Description','Example'], [['Absolute state','noun stands independently','דָּבָר word'],['Construct state','noun bound to following noun','דְּבַר word of'],['Chain','construct + following noun(s)','דְּבַר יְהוָה word of YHWH']])], examples:[ex('דְּבַר יְהוָה','Jeremiah 1:2','word of YHWH'), ex('בְּנֵי יִשְׂרָאֵל','Exodus 1:1','sons of Israel')], related:['hebrew-noun-basics','hebrew-pronominal-suffixes','hebrew-dual-forms'] },
    { id:'hebrew-weak-verbs', language:'hebrew', title:'Weak Verb Overview', category:'Verbs', summary:'Source-backed recognition charts for major Hebrew weak-root classes.', body:['Compare each printed weak form with the corresponding strong pattern. Coverage is substantial but intentionally limited to forms supplied directly by Gesenius.'], recognitionTips:['Look for a missing radical, compensatory vowel, reduced vowel, or unexpected doubling.','Identify the stem before deciding which radical is weak.','Doubly weak and irregular charts are limited examples, not productive templates.'], charts:hebrewWeakVerbCharts, examples:[ex('יִפֹּל','Gesenius Paradigm H','Pe-nun assimilation'), ex('יָקוּם','Gesenius Paradigm M','hollow-root contraction'), ex('יִגְלֶה','Gesenius Paradigm P','Lamed-he change')], related:['hebrew-stem-markers','hebrew-qal','hebrew-prefixes'] },
    { id:'grammar-parsing-ambiguity', language:'greek', title:'Parsing Ambiguity Guide', category:'Tools', summary:'What to do when a form could parse more than one way.', body:['Do not decide from endings alone. Check context, articles, agreement, nearby verbs, and common pitfalls.'], recognitionTips:['Articles often settle nominal case, gender, and number.','Agreement links adjectives, participles, and pronouns to their heads.','Context can decide whether a form is middle or passive, subject or object, or noun or adjective.'], charts:[chart('Ambiguity checklist', ['Question','Use it for'], [['Is there an article?','case/gender/number anchor'],['What agrees with it?','adjectives, pronouns, participles'],['What does context require?','subject/object and voice decisions'],['Is this a common look-alike?','neuter nom/acc, middle/passive, genitive forms']])], examples:[ex('τό','Representative','nominative or accusative neuter singular'), ex('αὐτοῦ','Representative','his/of him/of it')], related:['greek-case-functions','greek-article-endings','greek-pronouns','hebrew-construct-chains'] }
  ];
  topics.push(...grammarRefinements);
  const suffixTopic = topics.find(t => t.id === 'hebrew-suffixes');
  if (suffixTopic) suffixTopic.related = Array.from(new Set([...(suffixTopic.related||[]), 'hebrew-pronominal-suffixes', 'hebrew-construct-chains']));
  const nounTopic = topics.find(t => t.id === 'hebrew-noun-basics');
  if (nounTopic) nounTopic.related = Array.from(new Set([...(nounTopic.related||[]), 'hebrew-dual-forms', 'hebrew-construct-chains']));
  const pronounTopic = topics.find(t => t.id === 'greek-pronouns');
  if (pronounTopic) {
    pronounTopic.charts = greekPronounCharts;
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
    'hebrew-katav-stem-relationships':'hebrew-verbs',
    'grammar-parsing-decoder':'greek-grammar-handbook',
    'greek-morphology-guide':'greek-grammar-handbook',
    'hebrew-morphology-guide':'hebrew-grammar-handbook',
    'greek-prepositions':'greek-grammar-handbook',
    'hebrew-particles':'hebrew-grammar-handbook',
    'grammar-parsing-ambiguity':'greek-grammar-handbook',
    'greek-quick-reference':'greek-grammar-handbook',
    'hebrew-quick-reference':'hebrew-grammar-handbook',
    'greek-reading-helps':'greek-grammar-handbook',
    'hebrew-reading-helps':'hebrew-grammar-handbook'
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
  const strongStemSection = label => ({
    id:`strong-${label.toLowerCase()}`,
    title:label,
    body:[],
    recognitionTips:[stemInfo[label][2]],
    charts:hebrewStrongVerbCharts.filter(chart => chart.stemId === label.toLowerCase()),
    examples:[]
  });
  const strongFormSection = (id, title) => ({
    id:`strong-${id}`,
    title,
    body:[],
    recognitionTips:id === 'wayyiqtol' ? ['The prefixed conjunction is part of the displayed form; this recognition chart is not a syntax lesson.'] : [],
    charts:hebrewStrongVerbCharts.filter(chart => chart.formCategory === id),
    examples:[]
  });
  const greekMiVerbSection = () => ({
    title:'μι Verbs',
    id:'mi-verbs',
    body:[],
    recognitionTips:['Look first for reduplication, an athematic ending, and singular/plural stem changes.','The short root-aorist stems of δίδωμι and τίθημι differ visibly from their present stems.','For ἵστημι, Machen distinguishes the transitive present from the intransitive second aorist.'],
    charts:greekMiVerbCharts,
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
    const eimi = { title:'εἰμί', id:'eimi', body:[], recognitionTips:['Recognize εἰμί as its own high-frequency form family.'], charts:chartsFromTabs('greek-lyo-paradigm',['εἰμί']).filter(item => !/Infinitive|Participle/.test(item.label)), examples:[ex('ἐστίν','John 1:1','he/she/it is')] };
    const sourcedVerbCharts = greekLyoTabs.flatMap(tab => tab.charts || []).filter(item => item.milestone === 'v1.3.4');
    const infinitiveCharts = sourcedVerbCharts.filter(item => item.label.includes('Infinitive'));
    const participleCharts = sourcedVerbCharts.filter(item => item.label.includes('Participle'));
    const participles = { title:'Participles', id:'participles', body:[], recognitionTips:[...(oldTopic('greek-participles').recognitionTips||[])], charts:participleCharts, examples:oldTopic('greek-participles').examples || [] };
    const infinitives = { title:'Infinitives', id:'infinitives', body:[], recognitionTips:['-ειν often marks present active infinitive.','-σθαι often marks middle/passive infinitives.','-θῆναι is a strong aorist passive infinitive clue.'], charts:infinitiveCharts, examples:[ex('λύειν','Representative','to release'), ex('λυθῆναι','Representative','to be released')] };
    const contractVerbs = sectionWithId(sectionFromTopic('greek-contract-verbs','Contract Verbs'), 'contract-verbs');
    const miVerbs = greekMiVerbSection();
    const irregularVerbs = sectionWithId(sectionByTitle(sections,'Common Irregulars'), 'irregular-verbs');
    const voice = sectionWithId(sectionByTitle(sections,'Voices'), 'voice');
    const aspect = sectionWithId(sectionByTitle(sections,'Aspect'), 'aspect');
    const mood = sectionWithId(sectionByTitle(sections,'Moods'), 'mood');
    topic.sectionTabs = [
      categoryTab('paradigms','Paradigms',[present, imperfect, future, aorist, perfect, pluperfect, eimi, participles, infinitives, contractVerbs, miVerbs, irregularVerbs],[chip('Present','present'),chip('Imperfect','imperfect'),chip('Future','future'),chip('Aorist','aorist'),chip('Perfect','perfect'),chip('Pluperfect','pluperfect'),chip('εἰμί','eimi'),chip('Participles','participles'),chip('Infinitives','infinitives'),chip('Contract Verbs','contract-verbs'),chip('μι Verbs','mi-verbs'),chip('Irregular Verbs','irregular-verbs')]),
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
        `Recognition notes: ${hebrewClass} roots may not look like the strong קטל model.`,
        `Common forms: ${commonForms.map(form => form[0]).join(', ')}.`,
        'Confirm the root from context and lexicon when one radical disappears, weakens, or changes vowel behavior.'
      ],
      charts:[
        chart(`${title} common forms`, ['Root','Form','Recognition','Note','Reading'], commonForms.map(row => [root, ...row])),
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
        { title:'Common Patterns', id:'common-patterns', body:[], recognitionTips:['-ος/-η/-ον is a common first/second-declension pattern.','Two-termination adjectives share masculine and feminine forms.'], charts:greekAdjectiveCharts, examples:[] },
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
    topic.recognitionSections = [
      { title:'Singular', id:'singular', recognitionTips:['A singular noun lacks plural ים/ות and dual יִם endings.'], charts:[chart('Singular anchors', ['Form','Reading'], [['דָּבָר','word'],['מֶלֶךְ','king']])] },
      { title:'Plural', id:'plural', recognitionTips:['־ִים and ־וֹת are the main plural endings.'], charts:[chart('Plural anchors', ['Ending','Example','Reading'], [['־ִים','סוּסִים','horses'],['־וֹת','תּוֹרוֹת','laws']])] },
      sectionWithId(sectionByTitle(sections,'Dual'), 'dual'),
      { title:'Construct Forms', id:'construct-forms', recognitionTips:['Read construct as noun of the following noun.'], charts:sectionByTitle(sections,'Construct State').charts || [] },
      { title:'Suffix Forms', id:'suffix-forms', recognitionTips:['Identify the noun first, then read the suffix.'], charts:sectionByTitle(sections,'Pronominal Suffixes').charts || [] }
    ];
    topic.sectionTabs = [
      { ...categoryTab('paradigms','Paradigms',[
        { title:'Construct State', id:'state-and-number', body:[], recognitionTips:['Compare the ending and any reduced vowel before deciding state.'], charts:hebrewNominalMorphologyCharts, examples:[] },
        { title:'Pronominal Suffixes on Nouns', id:'nominal-suffixes', body:[], recognitionTips:['Identify the noun class and suffix stem before reading person, gender, and number.'], charts:hebrewNominalSuffixCharts, examples:[] },
        { title:'Segolate and Irregular Nouns', id:'nominal-patterns', body:[], recognitionTips:['Use these as representative recognition families, not as a noun generator.'], charts:hebrewNominalPatternCharts, examples:[] }
      ]), filterableNominalCharts:true },
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
      sectionFromTopic('greek-first-declension-endings','First Declension', { charts:greekNounCharts.filter(item => item.id.includes('first-declension')) }),
      sectionFromTopic('greek-second-declension-endings','Second Declension', { charts:greekNounCharts.filter(item => item.id.includes('second-declension')) }),
      sectionFromTopic('greek-third-declension-basics','Third Declension', { charts:greekNounCharts.filter(item => item.id.includes('third-declension') || item.id.includes('irregular-nouns')) }),
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
      { title:'Present', body:[], recognitionTips:['Present forms usually use the present stem plus primary endings.'], charts:chartsFromTabs('greek-lyo-paradigm',['Present']).filter(item => !/Infinitive|Participle/.test(item.label)), examples:[] },
      { title:'Imperfect', body:[], recognitionTips:['Imperfect indicative commonly has augment plus present stem.'], charts:chartsFromTabs('greek-lyo-paradigm',['Imperfect']), examples:[] },
      { title:'Future', body:[], recognitionTips:['Future active and middle often show σ before the ending.'], charts:chartsFromTabs('greek-lyo-paradigm',['Future']), examples:[] },
      { title:'Aorist', body:[], recognitionTips:['Aorist passive forms commonly show θη; ἐλύθησαν is aorist passive indicative, third plural.'], charts:chartsFromTabs('greek-lyo-paradigm',['Aorist']).filter(item => !/Infinitive|Participle/.test(item.label)), examples:[ex('ἐλύθησαν','Representative','they were released')] },
      { title:'Perfect', body:[], recognitionTips:['Perfect forms often show reduplication and completed-result force.'], charts:chartsFromTabs('greek-lyo-paradigm',['Perfect']).filter(item => !/Infinitive|Participle/.test(item.label)), examples:[] },
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
      { title:'Strong Verb Paradigms', body:['קטל is Gesenius’ model strong root and is used here for form recognition, not as an ordinary vocabulary lemma.'], recognitionTips:['The charts reproduce the forms supplied in Paradigm B.','Pual and Hophal categories marked “wanting” by Gesenius remain omitted.'], charts:hebrewStrongVerbCharts, examples:[ex('קָטַל','Gesenius Paradigm B','Qal model form')] },
      { title:'Perfect', body:[], recognitionTips:['Perfect forms often use suffixes for person, gender, and number.'], charts:chartsFromHebrewStemTabs(['Perfect']), examples:[] },
      { title:'Imperfect', body:[], recognitionTips:['Imperfect forms use prefixes plus endings.'], charts:chartsFromHebrewStemTabs(['Imperfect']), examples:[] },
      { title:'Imperative', body:[], recognitionTips:['Imperatives are second-person command forms; passive stems are not filled with forced Qal-looking forms.'], charts:chartsFromHebrewStemTabs(['Imperative']), examples:[] },
      { title:'Infinitive Construct', body:[], recognitionTips:['Often appears with לְ. Passive stem entries without supplied forms are intentionally not presented as Qal forms.'], charts:chartsFromHebrewStemTabs(['Infinitive Construct']), examples:[] },
      { title:'Infinitive Absolute', body:[], recognitionTips:['Often reinforces a nearby finite verb. Passive stem entries without supplied forms are intentionally not presented as Qal forms.'], charts:chartsFromHebrewStemTabs(['Infinitive Absolute']), examples:[] },
      { title:'Participle', body:[], recognitionTips:['Participles often behave as verbal adjectives.'], charts:chartsFromHebrewStemTabs(['Participles']), examples:[] },
      { title:'Stems', body:['The stems modify the root idea in conventional active, passive, causative, intensive, reflexive, or reciprocal directions.'], recognitionTips:stemRelationships, charts:[chart('Stem overview', ['Stem','Typical value','Pattern','Recognition'], Object.entries(stemInfo).map(([s,v])=>[s,v[0],v[1],v[2]]))], examples:[] },
      ...['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'].map(hebrewStemSection),
      sectionFromTopic('hebrew-weak-verbs','Weak Verbs', { searchTerms:['I-Aleph','I-Nun','III-He','Geminate','Hollow'] }),
      { title:'I-Aleph', body:['I-א verbs can show vowel and guttural behavior that obscures the expected strong pattern.'], recognitionTips:['Watch for א as the first root consonant and compensating vowel patterns.'], charts:[chart('I-Aleph clue', ['Class','Recognition'], [['I-א','initial aleph with guttural vowel behavior']])], examples:[ex('אָמַר','Genesis 1:3','he said')] },
      { title:'Aspect', body:['Hebrew perfect and imperfect are better treated as aspectual forms whose time value comes from context, genre, and sequence.'], recognitionTips:['Do not translate perfect as mechanically past or imperfect as mechanically future.'], charts:[chart('Aspect reading', ['Form','Common reading task'], [['Perfect','completed, whole, or stative viewpoint'],['Imperfect','incomplete, habitual, modal, future, or sequenced action']])], examples:[] },
      sectionFromTopic('hebrew-wayyiqtol','Waw Consecutive', { searchTerms:['wayyiqtol','וַיֹּאמֶר'] }),
      sectionFromTopic('hebrew-stem-markers','Recognition Tips'),
      { title:'Examples', body:[], recognitionTips:[], charts:[], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said'), ...(oldTopic('hebrew-qal').examples||[]), ...(oldTopic('hebrew-wayyiqtol').examples||[])] }
    ], charts:[], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said'), ex('וַיִּקְטֹל','Gesenius §49','Qal wayyiqtol model form')], related:['hebrew-nouns','hebrew-particles'] },
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

  const topicById = id => topics.find(t => t.id === id);
  const sectionChartsByTitle = (topicId, title) => sectionByTitle(topicById(topicId)?.sections || [], title).charts || [];
  const tabSection = (topicId, tabId, sectionTitle) => (topicById(topicId)?.sectionTabs || [])
    .find(tab => tab.id === tabId)?.sections.find(section => section.title === sectionTitle) || { title:sectionTitle, body:[], recognitionTips:[], charts:[], examples:[] };
  const quickTopic = (language, title, sections, related) => ({
    id:`${language}-quick-reference`,
    language,
    title:'Quick Reference',
    category:'Quick Reference',
    summary:`Fast ${title} lookup for forms and reader-facing clues.`,
    body:['Use this page while reading. It keeps compact charts and reminders here; longer explanations belong in the Grammar Handbook.'],
    recognitionTips: language === 'greek'
      ? ['Check article, ending, and verb form before reading syntax.','Use the compact charts first; open the Handbook when the concept needs explanation.']
      : ['Check prefixes, suffixes, stem, and construct relationships before deciding the clause.','Use the compact charts first; open the Handbook when the concept needs explanation.'],
    searchTerms:['Quick Reference','fast lookup','noun endings','article','pronouns','verb endings','participles','infinitives','particles','prepositions','prefixes','suffixes','construct chain','stems'],
    sections,
    charts:[],
    examples:[],
    related
  });
  topics.push(
    quickTopic('greek', 'Greek', [
      { title:'Noun and Article Endings', body:['Use articles and endings as the fastest case, number, and gender anchors.'], recognitionTips:['Article endings often settle the parse before noun endings do.'], charts:[...sectionChartsByTitle('greek-nouns','Article'), ...sectionChartsByTitle('greek-nouns','Case Endings')], examples:[ex('ὁ λόγος','John 1:1','the Word')] },
      { title:'Pronouns and Adjectives', body:['Pronouns and adjectives read by agreement with their referent or head noun.'], recognitionTips:['Relative pronouns often introduce clauses.','Adjectives agree in case, number, and gender.'], charts:[...(topicById('greek-pronouns')?.charts || []), ...sectionChartsByTitle('greek-adjectives','Endings')], examples:[] },
      { title:'Verb Endings and Non-Finite Forms', body:['Identify tense-form, voice, mood, person, and number for finite verbs; identify case, number, and gender for participles.'], recognitionTips:['-ειν often marks present active infinitive.','-ων/-ουσα/-ον often marks present active participles.'], charts:[...sectionChartsByTitle('greek-verbs','Present'), ...tabSection('greek-verbs','paradigms','Participles').charts, ...tabSection('greek-verbs','paradigms','Infinitives').charts], examples:[ex('λύειν','Representative','to release')] },
      { title:'Particles and Prepositions', body:['Small words shape the sentence before a full syntax decision is possible.'], recognitionTips:['ἐν commonly takes the dative; εἰς commonly takes the accusative; ἐκ/ἐξ commonly takes the genitive.'], charts:[...(topicById('greek-prepositions')?.charts || [])], examples:[ex('ἐν ἀρχῇ','John 1:1','in the beginning')] }
    ], ['greek-grammar-handbook','greek-paradigm-charts','greek-morphology-guide']),
    quickTopic('hebrew', 'Hebrew', [
      { title:'Stems and Strong Forms', body:['Start with the binyan and the strong-form shape, then use Paradigm Charts for the source-backed forms.'], recognitionTips:['Qal is the simple baseline; Niphal is often passive/reflexive; Hiphil is often causative.'], charts:sectionChartsByTitle('hebrew-verbs','Stems'), examples:[] },
      { title:'Prefixes, Suffixes, and Pronouns', body:['Prefixed particles and pronominal suffixes often explain the word before the full parse is needed.'], recognitionTips:['וְ/וַ may be conjunction or sequence.','וֹ commonly marks his/its on nouns.'], charts:[...sectionChartsByTitle('hebrew-particles','Prefixes'), ...sectionChartsByTitle('hebrew-nouns','Pronominal Suffixes')], examples:[ex('סוּסוֹ','Representative','his horse')] },
      { title:'Construct Chain', body:['Translate the first pass with “of,” then refine by context.'], recognitionTips:['A construct noun is bound to the following noun and often receives definiteness from the final noun.'], charts:sectionChartsByTitle('hebrew-nouns','Construct State'), examples:[ex('דְּבַר יְהוָה','Jeremiah 1:2','word of YHWH')] },
      { title:'Particles and Prepositions', body:['Attached particles are ordinary in Hebrew reading; identify them before treating the remaining form.'], recognitionTips:['לְ, בְּ, and כְּ attach directly to nouns and infinitives.'], charts:[...(topicById('hebrew-particles')?.charts || [])], examples:[ex('בַּבַּיִת','Representative','in the house')] }
    ], ['hebrew-grammar-handbook','hebrew-paradigm-charts','hebrew-morphology-guide'])
  );
  const handbookTabs = (nominals, verbals) => [
    { id:'nominals', label:'Nouns & related forms', collapsible:true, jumpChips:nominals.map((section,index)=>({ label:section.title, target:referenceSectionSlug(section,index) })), sections:nominals },
    { id:'verbals', label:'Verbs & verbal forms', collapsible:true, jumpChips:verbals.map((section,index)=>({ label:section.title, target:referenceSectionSlug(section,index) })), sections:verbals }
  ];
  topics.push(
    { id:'greek-grammar-handbook', language:'greek', title:'Grammar Handbook', category:'Grammar', summary:'A lean, reading-oriented guide to Greek forms and sentence structure.', body:['Choose a section or search for the form, structure, or reading question you need.'], recognitionTips:[], searchTerms:['Grammar Handbook','Morphology Guide','Parsing Abbreviations','N-NSM','V-AAI-3S','cases','principal parts','deponent','middle voice','genitive absolute','articular infinitive','contract verb','mi verb','μί verb','verbal aspect','syntax'], handbookSections:handbookLibrary?.sectionsForLanguage('greek') || [], charts:[], examples:[], related:['greek-paradigm-charts'] },
    { id:'hebrew-grammar-handbook', language:'hebrew', title:'Grammar Handbook', category:'Grammar', summary:'A lean, reading-oriented guide to Hebrew forms and clause structure.', body:['Choose a section or search for the form, structure, or reading question you need.'], recognitionTips:[], searchTerms:['Grammar Handbook','Morphology Guide','Parsing Abbreviations','person gender number','construct chain','construct state','object suffix','pronominal suffix','segolate','wayyiqtol','waw consecutive','Qal','Hiphil','weak verb','I-Nun','III-He','hollow verb','geminate'], handbookSections:handbookLibrary?.sectionsForLanguage('hebrew') || [], charts:[], examples:[], related:['hebrew-paradigm-charts'] },
    { id:'greek-paradigm-charts', language:'greek', title:'Paradigm Charts', category:'Paradigm Charts', summary:'Fast access to Greek noun, article, pronoun, adjective, and verb forms.', body:['Select a category, then consult the chart family you need.'], recognitionTips:[], searchTerms:['Paradigm Charts','Verb Paradigms','Noun Declensions','article','pronouns','adjectives','participles','infinitives','imperative','subjunctive','Greek present active indicative','Greek first aorist indicative','Greek second aorist indicative','Greek aorist passive indicative','Greek perfect indicative','Greek pluperfect indicative','εἰμί indicative','Greek first declension nouns','Greek relative pronouns'], sectionTabs:[
      categoryTab('verbs','Verb Paradigms',[tabSection('greek-verbs','paradigms','Present'), tabSection('greek-verbs','paradigms','Imperfect'), tabSection('greek-verbs','paradigms','Future'), tabSection('greek-verbs','paradigms','Aorist'), tabSection('greek-verbs','paradigms','Perfect'), tabSection('greek-verbs','paradigms','Pluperfect'), tabSection('greek-verbs','paradigms','εἰμί'), tabSection('greek-verbs','paradigms','Contract Verbs'), tabSection('greek-verbs','paradigms','μι Verbs')]),
      categoryTab('nouns','Noun Declensions',[tabSection('greek-nouns','paradigms','Article'), tabSection('greek-nouns','paradigms','First Declension'), tabSection('greek-nouns','paradigms','Second Declension'), tabSection('greek-nouns','paradigms','Third Declension')]),
      categoryTab('participles','Participles',[tabSection('greek-verbs','paradigms','Participles')]),
      categoryTab('infinitives','Infinitives',[tabSection('greek-verbs','paradigms','Infinitives')]),
      categoryTab('adjectives','Adjectives',[tabSection('greek-adjectives','paradigms','Common Patterns')]),
      categoryTab('pronouns','Pronouns',[sectionFromTopic('greek-pronouns','Pronoun Forms')])
    ], charts:[], examples:[], breadcrumbs:['Reference','Paradigm Charts'], related:['greek-grammar-handbook'] },
    { id:'hebrew-paradigm-charts', language:'hebrew', title:'Paradigm Charts', category:'Paradigm Charts', summary:'Fast access to source-backed Hebrew verb, noun, construct, and suffix patterns.', body:['Choose one focused family. Charts show directly sourced forms; categories or person rows absent from the approved source remain omitted.'], recognitionTips:[], searchTerms:['Paradigm Charts','Strong Verbs by Stem','Strong Verbs by Form','Weak Verbs','Nouns and Construct Forms','Pronominal Suffixes','Prepositional Suffixes','Verbal Object Suffixes','Segolates','Peculiar Nouns','Pe-nun','Pe-yod','Pe-waw','Hollow','Geminate','Lamed-he','Guttural','Doubly weak','wayyiqtol','model strong root','קטל','Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'], sectionTabs:[
      categoryTab('strong-verb-stems','Strong Verbs — by Stem',['Qal','Niphal','Piel','Pual','Hiphil','Hophal','Hitpael'].map(strongStemSection)),
      categoryTab('strong-verb-forms','Strong Verbs — by Form',[strongFormSection('perfect','Perfect'),strongFormSection('imperfect','Imperfect'),strongFormSection('wayyiqtol','Wayyiqtol'),strongFormSection('imperative','Imperative'),strongFormSection('infinitive-construct','Infinitive Construct'),strongFormSection('infinitive-absolute','Infinitive Absolute'),strongFormSection('participle','Participles'),strongFormSection('shortened-imperfect','Shortened Imperfect')]),
      { ...categoryTab('weak-verbs','Weak Verbs',[tabSection('hebrew-verbs','paradigms','Weak Verbs')],[],false), filterableWeakCharts:true },
      { ...categoryTab('noun-construct','Construct State',[{ id:'state-and-number', title:'Construct State', body:[], recognitionTips:[], charts:hebrewNominalMorphologyCharts, examples:[] }]), filterableNominalCharts:true },
      { ...categoryTab('nominal-suffixes','Pronominal Suffixes on Nouns',[{ id:'nominal-suffixes', title:'Singular, Plural, and Feminine Noun Patterns', body:[], recognitionTips:[], charts:hebrewNominalSuffixCharts, examples:[] }]), filterableNominalCharts:true },
      { ...categoryTab('prepositional-suffixes','Pronominal Suffixes on Prepositions',[{ id:'prepositional-suffixes', title:'Common Prepositions with Pronominal Suffixes', body:[], recognitionTips:[], charts:hebrewPrepositionalSuffixCharts, examples:[] }]), filterableNominalCharts:true },
      { ...categoryTab('verbal-object-suffixes','Object Suffixes on Verbs',[{ id:'verbal-object-suffixes', title:'Limited Perfect Examples', body:[], recognitionTips:[], charts:hebrewVerbalObjectSuffixCharts, examples:[] }]), filterableNominalCharts:true },
      { ...categoryTab('noun-patterns','Segolate and Irregular Nouns',[{ id:'nominal-patterns', title:'Segolate Nouns', body:[], recognitionTips:[], charts:hebrewNominalPatternCharts.filter(chart=>chart.grammaticalCategory!=='peculiar-nouns'), examples:[] },{ id:'irregular-nouns', title:'Irregular Nouns', body:[], recognitionTips:[], charts:hebrewNominalPatternCharts.filter(chart=>chart.grammaticalCategory==='peculiar-nouns'), examples:[] }]), filterableNominalCharts:true }
    ], charts:[], examples:[], breadcrumbs:['Reference','Paradigm Charts'], related:['hebrew-grammar-handbook'] },
    { id:'greek-morphology-guide', language:'greek', title:'Morphology Guide', category:'Language Resources', summary:'How Greek words change form to express their role.', body:['Morphology connects a word’s form with the grammatical information it carries. Start with the category and visible form; compact labels are secondary.'], recognitionTips:['Read the part of speech first, then identify the categories that apply to it.'], searchTerms:['Morphology Guide','Parsing Abbreviations','N-NSM','V-AAI-3S','person gender number','tense voice mood','case number gender','abbreviations'], sections:[
      { title:'What morphology describes', body:['Nominal forms express case, number, and gender. Finite verb forms express tense-form, voice, mood, person, and number. Participles combine verbal features with case, number, and gender.'], recognitionTips:['Not every category applies to every part of speech.','Agreement links nouns with articles, adjectives, pronouns, and participles.'], charts:[], examples:[] },
      { title:'Core grammatical categories', body:['Case marks a nominal form’s relationship in a clause. Number distinguishes singular and plural. Gender is a grammatical classification. Tense-form and aspect present verbal action from a viewpoint; voice relates the subject to the action; mood presents the action as assertion, command, possibility, or another stance.'], recognitionTips:['Treat morphology as a description of form, then use syntax and context to interpret function.'], charts:[], examples:[] },
      { title:'Parsing Abbreviations', body:['Greek morphology codes commonly combine part of speech with case, number, gender, tense, voice, mood, person, and number.'], recognitionTips:['N-NSM means noun, nominative singular masculine.','V-PAI-3S means verb, present active indicative, third singular.'], charts:[chart('Common Greek code pieces', ['Piece','Meaning','Example'], [['N','noun','N-NSM'],['V','verb','V-PAI-3S'],['A','adjective','A-NSF'],['P','pronoun','P-DSM'],['RA / T','article','RA ----NSM-']])], examples:[ex('V-PAI-3S','Decoder example','present active indicative, third singular')] },
      sectionFromTopic('greek-common-parsing-clues','Common Parsing Clues'),
      sectionFromTopic('grammar-parsing-ambiguity','Ambiguity Checklist')
    ], charts:[], examples:[], related:['greek-grammar-handbook','grammar-parsing-ambiguity'] },
    { id:'hebrew-morphology-guide', language:'hebrew', title:'Morphology Guide', category:'Language Resources', summary:'How Hebrew roots and patterns build meaningful forms.', body:['Morphology connects roots, stems, prefixes, suffixes, and inflection with grammatical meaning. Labels summarize that analysis; they are not the learning goal.'], recognitionTips:['Separate attached elements, identify the verbal stem when relevant, then describe the remaining form.'], searchTerms:['Morphology Guide','Parsing Abbreviations','Qal','Niphal','Piel','Hiphil','person gender number','prefix suffix terminology','stem labels'], sections:[
      { title:'What morphology describes', body:['Hebrew words combine lexical roots with patterns and attached elements. Verbs express stem, conjugation, person, gender, and number; nominals may express gender, number, state, and pronominal suffixes.'], recognitionTips:['A stem describes a verbal pattern and its typical relationship to the root meaning.','Construct state expresses a close relationship between nominals.'], charts:[], examples:[] },
      { title:'Core grammatical categories', body:['Person identifies speaker, addressee, or third party. Gender and number distinguish participants. Verbal conjugations present action from different viewpoints, while stems such as Qal, Niphal, Piel, and Hiphil modify the root’s verbal pattern.'], recognitionTips:['Interpret a stem in context rather than assigning one English meaning mechanically.'], charts:[], examples:[] },
      sectionFromTopic('hebrew-stem-markers','Stem Labels'),
      sectionFromTopic('hebrew-prefixes','Prefixes'),
      sectionFromTopic('hebrew-pronominal-suffixes','Suffixes'),
      { title:'Person, Gender, Number', body:['Hebrew parsing frequently combines person, gender, and number labels such as 3ms, 2fp, or 1cp.'], recognitionTips:['3ms means third masculine singular.','1cp means first common plural.'], charts:[chart('Common Hebrew abbreviations', ['Label','Meaning'], [['3ms','third masculine singular'],['3fs','third feminine singular'],['2mp','second masculine plural'],['2fp','second feminine plural'],['1cs','first common singular'],['1cp','first common plural']])], examples:[ex('Qal Perfect 3ms','Decoder example','simple stem, completed form, third masculine singular')] }
    ], charts:[], examples:[], related:['hebrew-grammar-handbook'] },
    { id:'greek-reading-helps', language:'greek', title:'Reading Helps', category:'Reading Helps', summary:'Short practical guidance for approaching Greek sentences while reading.', body:['Reading Helps are practical reminders, not lessons to complete.'], recognitionTips:['Start with the main verb and its subject.','Use articles and agreement to assemble phrases.','Let Reader assistance answer enough to keep moving, then return to the sentence.'], searchTerms:['Reading Helps','approach a Greek sentence','reading participles','reader assistance','interlinear dependence'], sections:[
      { title:'Approach a Greek Sentence', body:['Find the main verb, identify its subject, then group articles, nouns, adjectives, pronouns, and participles by agreement.'], recognitionTips:['Do not parse every word before asking what the sentence is doing.'], charts:[chart('Greek reading pass', ['Step','Question'], [['1','What is the main verb?'],['2','Who or what is the subject?'],['3','Which words agree together?'],['4','Do prepositions or participles add supporting phrases?']])], examples:[] },
      { title:'Reading Participles', body:['Read participles as verbal adjectives. Identify their form, match agreement, then decide how they relate to the main clause.'], recognitionTips:['Agreement usually tells you what the participle modifies.'], charts:tabSection('greek-verbs','paradigms','Participles').charts, examples:[] }
    ], charts:[], examples:[], related:['greek-grammar-handbook'] },
    { id:'hebrew-reading-helps', language:'hebrew', title:'Reading Helps', category:'Reading Helps', summary:'Short practical guidance for approaching Hebrew clauses while reading.', body:['Reading Helps are practical reminders, not lessons to complete.'], recognitionTips:['Find the verbal form or clause anchor.','Identify prefixed particles before the root.','Watch construct chains before deciding noun relationships.'], searchTerms:['Reading Helps','approach a Hebrew clause','construct chains','wayyiqtol','reader assistance','interlinear dependence'], sections:[
      { title:'Approach a Hebrew Clause', body:['Identify the verbal form or verbless clause anchor, then work outward through prefixed particles, subject, objects, and modifiers.'], recognitionTips:['וַי plus an imperfect form usually advances narrative sequence.'], charts:[chart('Hebrew reading pass', ['Step','Question'], [['1','Is there a finite verb or verbless clause?'],['2','Are ו, ל, ב, כ, or ה attached?'],['3','What is the stem and form?'],['4','Are nouns absolute, construct, or suffixed?']])], examples:[ex('וַיֹּאמֶר','Genesis 1:3','and he said')] },
      sectionFromTopic('hebrew-construct-chains','Recognizing Construct Chains'),
      sectionFromTopic('hebrew-wayyiqtol','Recognizing Wayyiqtol')
    ], charts:[], examples:[], related:['hebrew-grammar-handbook'] }
  );

  const referenceTopicOrder = [
    'greek-paradigm-charts','greek-grammar-handbook','greek-verbs','greek-nouns','greek-pronouns','greek-adjectives',
    'hebrew-paradigm-charts','hebrew-grammar-handbook','hebrew-verbs','hebrew-nouns'
  ];
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
  function flattenHandbookArticle(item){ return [item.id,item.title,item.summary,...(item.aliases||[]),...(item.searchTerms||[]),...(item.overview||[]),...(item.recognitionCues||[]),...(item.commonFunctions||[]),...(item.commonPitfalls||[]),...flattenExamples(item.examples)].join(' '); }
  function flattenTopic(topic){ const handbookText=(topic.handbookSections||[]).flatMap(section=>[section.title,section.summary,...(handbookLibrary?.articlesForSection(section.id)||[]).map(flattenHandbookArticle)]); return [topic.id, topic.title, topic.category, topic.summary, topic.frequency, ...(topic.searchTerms||[]), ...(topic.body||[]), ...(topic.recognitionTips||[]), ...(topic.principalParts||[]), ...flattenSections(topic.sections), ...flattenSectionTabs(topic.sectionTabs), ...handbookText, ...(topic.paradigmTabs||[]).flatMap(tab=>[tab.label,...flattenCharts(tab.charts)]), ...flattenCharts(topic.charts), ...flattenExamples(topic.examples), ...(topic.related||[]).map(topicLabel), ...(topic.featureLinks||[]).flatMap(l=>[l.label,l.type,l.target]), topic.stemRelationships?.root, ...(topic.stemRelationships?.stems||[]), ...(topic.stemRelationships?.explanation||[])].join(' '); }
  function referenceSectionSlug(section, index=0){ return section.id || String(section.title || `section-${index}`).toLowerCase().replace(/[^a-z0-9\u0370-\u03ff\u0590-\u05ff]+/g,'-').replace(/^-|-$/g,''); }
  function searchReferenceTopics(query='', language='all'){
    const q = normalizeSearchText(String(query).trim());
    return visibleTopics.filter(t => (language === 'all' || t.language === language) && (!q || normalizeSearchText(flattenTopic(t)).includes(q)));
  }
  function referenceLandingSections(language='greek'){
    const prefix = language === 'hebrew' ? 'hebrew' : 'greek';
    const entry = (id, label, description='', featured=false) => ({ id, label, description, featured });
    return [
      { tier:'primary', title:'Reference', description:'Choose whether you need forms or explanation.', entries:[
        entry(`${prefix}-paradigm-charts`, 'Paradigm Charts', 'Consult Greek and Hebrew declensions, conjugations, stems, and form patterns.', true),
        entry(`${prefix}-grammar-handbook`, 'Grammar Handbook', 'Understand Greek and Hebrew grammar, morphology, and syntax.')
      ] }
    ];
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
  function findReferenceChart(chartId){
    const orderedTopics=['greek-paradigm-charts','hebrew-paradigm-charts',...visibleTopics.map(topic=>topic.id)];
    for(const topicId of [...new Set(orderedTopics)]){
      const topic=getReferenceTopic(topicId);
      for(const tab of topic?.sectionTabs||[]) for(const section of tab.sections||[]){ const chart=(section.charts||[]).find(item=>item.id===chartId); if(chart) return { chartId, chartLabel:chart.label, topicId, sectionTabId:tab.id }; }
      const chart=(topic?.charts||[]).find(item=>item.id===chartId); if(chart) return { chartId, chartLabel:chart.label, topicId, sectionTabId:'' };
    }
    return null;
  }
  function decodeParsing(input){ const key=String(input||'').trim().toUpperCase().replace(/\s+/g,' '); return decoderEntries[key] || null; }
  const api = { referenceTopics: visibleTopics, futureGrammarHooks, greekCoreIndicativeCharts, greekAdditionalParadigmCharts, hebrewStrongVerbCharts, hebrewWeakVerbCharts, hebrewNominalMorphologyCharts, hebrewNominalSuffixCharts, hebrewPrepositionalSuffixCharts, hebrewVerbalObjectSuffixCharts, hebrewNominalPatternCharts, hebrewNominalAndSuffixCharts, hebrewWeakClassLabels:HEBREW_WEAK_CLASS_LABELS, hebrewNominalClassroomLabels:HEBREW_NOMINAL_CLASSROOM_LABELS, filterHebrewWeakVerbCharts, filterHebrewNominalCharts, hebrewStrongVerbSource:GESENIUS_1910, handbookSources:handbookLibrary?.sources||{}, handbookSections:handbookLibrary?.sections||[], handbookArticles:handbookLibrary?.articles||[], getHandbookArticle:handbookLibrary?.getArticle||(()=>null), searchHandbookArticles:handbookLibrary?.searchArticles||(()=>[]), handbookArticlesForChart:handbookLibrary?.articlesForChart||(()=>[]), searchReferenceTopics, getReferenceTopic, topicLabel, findReferenceChart, referenceColors: COLORS, decodeParsing, decoderEntries, oldTopicAliases, canonicalTopicId, referenceParadigmGroups, referenceLandingSections };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PuritanReferenceLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis);
