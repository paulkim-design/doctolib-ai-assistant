/*
  Fixture data copied verbatim (German) from:
  - 4-prototype_m2-doctolib_payloads-checklist.md
  - 4-prototype_m2-doctolib_payloads-answers.md
  This is a fixture-driven prototype: no live model calls. Each scenario below
  pairs a deterministic appointment context with a canned checklist payload,
  exactly as specified in the design-context brief.

  German is the product's default language. The _EN sets are a hand-translated
  mirror added for English-language testing (see app.js's language switch);
  the German data above is never altered by it.
*/

const DEFAULT_ITEMS_BASE = [
  { id: "d1", title: "Versichertenkarte mitbringen", action: "bring" },
  { id: "d2", title: "10 Minuten vor dem Termin da sein", action: "do_or_avoid" },
  { id: "d3", title: "Impfpass mitbringen, falls vorhanden", action: "bring" }
];

const DEFAULT_ITEMS_BASE_EN = [
  { id: "d1", title: "Bring your insurance card", action: "bring" },
  { id: "d2", title: "Arrive 10 minutes before your appointment", action: "do_or_avoid" },
  { id: "d3", title: "Bring your vaccination record, if you have one", action: "bring" }
];

const CONTEXT_BASE = {
  patient_display_name: "Lena Brückner",
  appointment_datetime: "2027-06-03T17:00",
  practice_name: "Praxis Dr. Jane Musterfrau",
  practice_contact_lines: ["Brandenburger Tor 100, 10178 Berlin"],
  appointment_type: "Gesundheits-Check-up mit Blutabnahme",
  appointment_type_is_generic: false,
  type_options: [],
  patient_type_pick: null
};

const CONTEXT_BASE_EN = {
  patient_display_name: "Lena Brückner",
  appointment_datetime: "2027-06-03T17:00",
  practice_name: "Dr. Jane Musterfrau Practice",
  practice_contact_lines: ["Brandenburger Tor 100, 10178 Berlin"],
  appointment_type: "Health check-up with blood draw",
  appointment_type_is_generic: false,
  type_options: [],
  patient_type_pick: null
};

const NOTE_N1 = {
  id: "n1",
  text: "Blutverdünner 2 Tage vorher pausieren, hat Dr. Musterfrau beim letzten Termin gesagt. Brille für die Formulare einpacken."
};

const NOTE_N1_EN = {
  id: "n1",
  text: "Pause blood thinners 2 days before, Dr. Musterfrau said at the last appointment. Pack glasses for the forms."
};

const NOTE_N2 = {
  id: "n2",
  text: "Bei der Anmeldung wurde noch irgendetwas wegen der Blutsache gesagt, ich weiß nicht mehr genau was, vielleicht vorher nichts essen oder doch etwas mitbringen?!?"
};

const NOTE_N2_EN = {
  id: "n2",
  text: "At check-in they said something else about the blood test, I don't remember exactly what, maybe don't eat beforehand or bring something?!?"
};

const TYPE_OPTIONS = [
  "Gesundheits-Check-up",
  "Blutabnahme",
  "Impfung",
  "Nachkontrolle",
  "Ich bin mir nicht sicher"
];

const TYPE_OPTIONS_EN = [
  "Health check-up",
  "Blood draw",
  "Vaccination",
  "Follow-up",
  "I'm not sure"
];

// The two note composer example chips. simulatedItemForNote() in app.js
// matches the exact text of "vaccineCard" to decide "no item" (it repeats
// default item d3), so this must stay in step with whichever language is
// active, not hardcoded to German.
const NOTE_EXAMPLES = {
  medication: "Das in der Sprechstunde besprochene Medikament pausieren",
  vaccineCard: "Impfpass mitbringen"
};

const NOTE_EXAMPLES_EN = {
  medication: "Pause the medication discussed during the appointment",
  vaccineCard: "Bring vaccination record"
};

const CHECKLIST_PAYLOADS = {
  high_confidence: {
    state: "high_confidence",
    framing: "Das hat Ihre Praxis für diese Terminart angegeben.",
    error_code: null,
    results: [
      { id: "p2", title: "8 Stunden vorher nichts essen, nur Wasser oder ungesüßten Tee trinken", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.88, source_quote: "Für die Blutabnahme müssen Sie nüchtern sein: Bitte essen Sie in den 8 Stunden vor Ihrem Termin nichts und trinken Sie nur Wasser oder ungesüßten Tee, ohne Milch und ohne Zucker, da sonst die Blutzucker- und Fettwerte verfälscht werden und wir die Blutabnahme an einem anderen Tag wiederholen müssen." },
      { id: "p3", title: "Blutverdünner 2 Tage vorher pausieren", source: "patient", action: "do_or_avoid", band: "high", confidence: 0.81, source_quote: NOTE_N1.text },
      { id: "p4", title: "Brille für die Formulare einpacken", source: "patient", action: "bring", band: "high", confidence: 0.79, source_quote: NOTE_N1.text },
      { id: "p5", title: "Fragebogen zur Krankengeschichte vor dem Termin online ausfüllen", source: "practice", action: "fill_in", band: "high", confidence: 0.84, source_quote: "Bitte füllen Sie vor jedem Check-up unseren Fragebogen zu Ihrer Krankengeschichte aus, den Link dazu finden Sie in Ihrer Terminbestätigung." },
      { id: "p6", title: "Befunde anderer Praxen vorab über Doctolib hochladen", source: "practice", action: "upload", band: "high", confidence: 0.62, source_quote: "Befunde von anderen Ärztinnen und Ärzten laden Sie bitte vorab über Doctolib hoch, damit wir sie vor dem Termin ansehen können." },
      { id: "p7", title: "Ihren aktuellen Medikamentenplan mitbringen", source: "practice", action: "bring", band: "high", confidence: 0.9, source_quote: "Bringen Sie bitte Ihren aktuellen Medikamentenplan mit, auch wenn sich seit dem letzten Besuch nichts geändert hat." },
      { id: "p8", title: "Kleidung tragen, deren Ärmel sich leicht hochschieben lassen", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.86, source_quote: "Tragen Sie zur Blutabnahme bitte Kleidung, deren Ärmel sich leicht bis über den Ellenbogen hochschieben lassen." }
    ]
  },
  mixed_confidence: {
    state: "mixed_confidence",
    framing: "Hinweise Ihrer Praxis für diese Terminart. Bitte prüfen Sie die markierten Punkte.",
    error_code: null,
    results: [
      { id: "m2", title: "8 Stunden vorher nichts essen, nur Wasser oder ungesüßten Tee trinken", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.88, source_quote: "Für die Blutabnahme müssen Sie nüchtern sein: Bitte essen Sie in den 8 Stunden vor Ihrem Termin nichts und trinken Sie nur Wasser oder ungesüßten Tee, ohne Milch und ohne Zucker, da sonst die Blutzucker- und Fettwerte verfälscht werden und wir die Blutabnahme an einem anderen Tag wiederholen müssen." },
      { id: "m3", title: "Eventuell aktuelle Laborwerte aus anderen Praxen mitbringen, bitte vorher klären", source: "practice", action: "bring", band: "low", confidence: 0.41, source_quote: "Patientinnen und Patienten werden manchmal gebeten, aktuelle Laborwerte mitzubringen, zum Beispiel wenn eine andere Arztpraxis kürzlich Blut abgenommen hat oder wenn Werte aus dem Krankenhaus vorliegen, die für die Besprechung wichtig sein könnten, bei Fragen dazu sprechen Sie uns gern jederzeit an." }
    ]
  },
  low_confidence: {
    state: "low_confidence",
    framing: "Bei diesen Punkten sind wir unsicher. Bitte prüfen Sie sie vor Ihrem Termin.",
    error_code: null,
    results: [
      { id: "l1", title: "Eventuell aktuelle Laborwerte aus anderen Praxen mitbringen, bitte vorher klären", source: "practice", action: "bring", band: "low", confidence: 0.44, source_quote: "Patientinnen und Patienten werden manchmal gebeten, aktuelle Laborwerte mitzubringen, zum Beispiel wenn eine andere Arztpraxis kürzlich Blut abgenommen hat oder wenn Werte aus dem Krankenhaus vorliegen, die für die Besprechung wichtig sein könnten, bei Fragen dazu sprechen Sie uns gern jederzeit an." },
      { id: "l2", title: NOTE_N2.text, source: "patient", action: "unclear", band: "low", confidence: 0.22, source_quote: NOTE_N2.text }
    ]
  },
  no_result: {
    state: "no_result",
    framing: "Keine zusätzlichen Hinweise von Ihrer Praxis.",
    error_code: null,
    results: []
  },
  error: {
    state: "error",
    framing: "Die Informationen Ihrer Praxis konnten nicht geladen werden.",
    error_code: "timeout",
    results: []
  }
};

const CHECKLIST_PAYLOADS_EN = {
  high_confidence: {
    state: "high_confidence",
    framing: "This is what your practice provided for this appointment type.",
    error_code: null,
    results: [
      { id: "p2", title: "Don't eat for 8 hours beforehand, only drink water or unsweetened tea", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.88, source_quote: "You need to be fasting for the blood draw: please don't eat anything in the 8 hours before your appointment and only drink water or unsweetened tea, without milk and without sugar, otherwise the blood sugar and fat values will be distorted and we'll have to repeat the blood draw on another day." },
      { id: "p3", title: "Pause blood thinners 2 days before", source: "patient", action: "do_or_avoid", band: "high", confidence: 0.81, source_quote: NOTE_N1_EN.text },
      { id: "p4", title: "Pack glasses for the forms", source: "patient", action: "bring", band: "high", confidence: 0.79, source_quote: NOTE_N1_EN.text },
      { id: "p5", title: "Fill in the medical history questionnaire online before the appointment", source: "practice", action: "fill_in", band: "high", confidence: 0.84, source_quote: "Before every check-up, please fill in our medical history questionnaire; you'll find the link in your appointment confirmation." },
      { id: "p6", title: "Upload findings from other practices via Doctolib in advance", source: "practice", action: "upload", band: "high", confidence: 0.62, source_quote: "Please upload findings from other doctors via Doctolib in advance, so we can review them before the appointment." },
      { id: "p7", title: "Bring your current medication plan", source: "practice", action: "bring", band: "high", confidence: 0.9, source_quote: "Please bring your current medication plan, even if nothing has changed since your last visit." },
      { id: "p8", title: "Wear clothing with sleeves that can be easily rolled up", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.86, source_quote: "For the blood draw, please wear clothing with sleeves that can easily be rolled up past the elbow." }
    ]
  },
  mixed_confidence: {
    state: "mixed_confidence",
    framing: "Notes from your practice for this appointment type. Please check the marked points.",
    error_code: null,
    results: [
      { id: "m2", title: "Don't eat for 8 hours beforehand, only drink water or unsweetened tea", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.88, source_quote: "You need to be fasting for the blood draw: please don't eat anything in the 8 hours before your appointment and only drink water or unsweetened tea, without milk and without sugar, otherwise the blood sugar and fat values will be distorted and we'll have to repeat the blood draw on another day." },
      { id: "m3", title: "Possibly bring recent lab results from other practices, please check beforehand", source: "practice", action: "bring", band: "low", confidence: 0.41, source_quote: "Patients are sometimes asked to bring recent lab results, for example if another practice recently drew blood or if hospital results are available that could be important for the discussion; please feel free to ask us about this at any time." }
    ]
  },
  low_confidence: {
    state: "low_confidence",
    framing: "We're not sure about these points. Please check them before your appointment.",
    error_code: null,
    results: [
      { id: "l1", title: "Possibly bring recent lab results from other practices, please check beforehand", source: "practice", action: "bring", band: "low", confidence: 0.44, source_quote: "Patients are sometimes asked to bring recent lab results, for example if another practice recently drew blood or if hospital results are available that could be important for the discussion; please feel free to ask us about this at any time." },
      { id: "l2", title: NOTE_N2_EN.text, source: "patient", action: "unclear", band: "low", confidence: 0.22, source_quote: NOTE_N2_EN.text }
    ]
  },
  no_result: {
    state: "no_result",
    framing: "No additional notes from your practice.",
    error_code: null,
    results: []
  },
  error: {
    state: "error",
    framing: "Your practice's information could not be loaded.",
    error_code: "timeout",
    results: []
  }
};

const ANSWER_PAYLOADS = {
  answered: {
    state: "answered",
    question: "Darf ich vor der Blutabnahme Wasser trinken?",
    answer: "Ja. Ihre Praxis schreibt, dass Sie 8 Stunden vor der Blutabnahme nur Wasser oder ungesüßten Tee trinken sollen, jeweils ohne Milch und ohne Zucker. Wasser ist also erlaubt. Essen sollen Sie in dieser Zeit nichts, sonst muss die Blutabnahme an einem neuen Termin wiederholt werden.",
    source: "practice",
    source_quote: "Für die Blutabnahme müssen Sie nüchtern sein: Bitte essen Sie in den 8 Stunden vor Ihrem Termin nichts und trinken Sie nur Wasser oder ungesüßten Tee, ohne Milch und ohne Zucker, da sonst die Blutzucker- und Fettwerte verfälscht werden und wir die Blutabnahme an einem anderen Tag wiederholen müssen.",
    error_code: null
  },
  uncertain: {
    state: "uncertain",
    question: "Ich trinke frühmorgens immer schwarzen Kaffee ohne Milch und ohne Zucker, darf ich den vor der Blutabnahme trinken, oder zählt das schon als Essen und ich sollte ihn lieber an diesem Morgen weglassen?",
    answer: "Ihre Praxis nennt nur Wasser und ungesüßten Tee. Ob schwarzer Kaffee erlaubt ist, steht in ihren Informationen nicht. Bitte fragen Sie im Zweifel Ihre Praxis.",
    source: "practice",
    source_quote: "Für die Blutabnahme müssen Sie nüchtern sein: Bitte essen Sie in den 8 Stunden vor Ihrem Termin nichts und trinken Sie nur Wasser oder ungesüßten Tee, ohne Milch und ohne Zucker, da sonst die Blutzucker- und Fettwerte verfälscht werden und wir die Blutabnahme an einem anderen Tag wiederholen müssen.",
    error_code: null
  },
  no_answer: {
    state: "no_answer",
    question: "Gibt es in der Nähe der Praxis Parkplätze?",
    answer: "",
    source: null,
    source_quote: null,
    error_code: null
  },
  refused_symptom: {
    state: "refused_symptom",
    question: "Mir ist seit gestern schwindelig, soll ich den Termin trotzdem wahrnehmen?",
    answer: "",
    source: null,
    source_quote: null,
    error_code: null
  },
  error: {
    state: "error",
    question: "Darf ich vor der Blutabnahme Wasser trinken?",
    answer: "",
    source: null,
    source_quote: null,
    error_code: "timeout"
  }
};

const ANSWER_PAYLOADS_EN = {
  answered: {
    state: "answered",
    question: "Am I allowed to drink water before the blood draw?",
    answer: "Yes. Your practice says that for 8 hours before the blood draw you should only drink water or unsweetened tea, without milk and without sugar. So water is allowed. You shouldn't eat anything during that time, otherwise the blood draw will have to be repeated at a new appointment.",
    source: "practice",
    source_quote: "You need to be fasting for the blood draw: please don't eat anything in the 8 hours before your appointment and only drink water or unsweetened tea, without milk and without sugar, otherwise the blood sugar and fat values will be distorted and we'll have to repeat the blood draw on another day.",
    error_code: null
  },
  uncertain: {
    state: "uncertain",
    question: "I always drink black coffee without milk or sugar first thing in the morning — am I allowed to drink it before the blood draw, or does that count as eating and should I skip it that morning?",
    answer: "Your practice only mentions water and unsweetened tea. Whether black coffee is allowed isn't stated in their information. If in doubt, please ask your practice.",
    source: "practice",
    source_quote: "You need to be fasting for the blood draw: please don't eat anything in the 8 hours before your appointment and only drink water or unsweetened tea, without milk and without sugar, otherwise the blood sugar and fat values will be distorted and we'll have to repeat the blood draw on another day.",
    error_code: null
  },
  no_answer: {
    state: "no_answer",
    question: "Are there parking spaces near the practice?",
    answer: "",
    source: null,
    source_quote: null,
    error_code: null
  },
  refused_symptom: {
    state: "refused_symptom",
    question: "I've been dizzy since yesterday, should I still go to the appointment?",
    answer: "",
    source: null,
    source_quote: null,
    error_code: null
  },
  error: {
    state: "error",
    question: "Am I allowed to drink water before the blood draw?",
    answer: "",
    source: null,
    source_quote: null,
    error_code: "timeout"
  }
};

// One lookup per language, read via fx() (app.js sets `lang`). Keeps every
// language-dependent fixture reference in one place instead of scattering
// "if lang === ..." checks through buildScenario and app.js.
const FIXTURE_SETS = {
  de: {
    contextBase: CONTEXT_BASE,
    noteN1: NOTE_N1,
    noteN2: NOTE_N2,
    typeOptions: TYPE_OPTIONS,
    noteExamples: NOTE_EXAMPLES,
    defaultItemsBase: DEFAULT_ITEMS_BASE,
    checklistPayloads: CHECKLIST_PAYLOADS,
    answerPayloads: ANSWER_PAYLOADS
  },
  en: {
    contextBase: CONTEXT_BASE_EN,
    noteN1: NOTE_N1_EN,
    noteN2: NOTE_N2_EN,
    typeOptions: TYPE_OPTIONS_EN,
    noteExamples: NOTE_EXAMPLES_EN,
    defaultItemsBase: DEFAULT_ITEMS_BASE_EN,
    checklistPayloads: CHECKLIST_PAYLOADS_EN,
    answerPayloads: ANSWER_PAYLOADS_EN
  }
};

// Reads the active language's fixture set. `lang` is declared in app.js;
// this is only ever called at runtime (after app.js has set it), never at
// script load time, so the load order of the two files doesn't matter.
function fx() {
  return FIXTURE_SETS[lang];
}

// Scenarios drive the demo switcher. Each builds a fresh, independent
// appointment context so interactions in one scenario never leak into another.
function buildScenario(id) {
  const f = fx();
  switch (id) {
    case "high_confidence":
      return {
        id,
        label: "3 · High confidence",
        context: { ...f.contextBase, default_items: clone(f.defaultItemsBase), patient_notes: [clone(f.noteN1)], consent_given: true },
        payload: clone(f.checklistPayloads.high_confidence)
      };
    case "mixed_confidence":
      return {
        id,
        label: "8 · Mixed confidence",
        context: { ...f.contextBase, default_items: clone(f.defaultItemsBase), patient_notes: [], consent_given: true },
        payload: clone(f.checklistPayloads.mixed_confidence)
      };
    case "low_confidence":
      return {
        id,
        label: "4 · Low confidence",
        context: { ...f.contextBase, default_items: clone(f.defaultItemsBase), patient_notes: [clone(f.noteN2)], consent_given: true },
        payload: clone(f.checklistPayloads.low_confidence)
      };
    case "no_result":
      return {
        id,
        label: "5 · No result",
        context: { ...f.contextBase, default_items: clone(f.defaultItemsBase), patient_notes: [], consent_given: true },
        payload: clone(f.checklistPayloads.no_result)
      };
    case "error":
      return {
        id,
        label: "6 · Failure",
        context: { ...f.contextBase, default_items: clone(f.defaultItemsBase), patient_notes: [], consent_given: true },
        payload: clone(f.checklistPayloads.error)
      };
    case "cold_start":
      return {
        id,
        label: "7 · Cold start",
        context: { ...f.contextBase, default_items: [], patient_notes: [], consent_given: true },
        payload: clone(f.checklistPayloads.no_result)
      };
    case "waiting":
      return {
        id,
        label: "2 · Waiting",
        context: { ...f.contextBase, default_items: clone(f.defaultItemsBase), patient_notes: [], consent_given: true },
        payload: clone(f.checklistPayloads.no_result)
      };
    default:
      throw new Error("Unknown scenario: " + id);
  }
}

const SCENARIO_LIST = [
  { id: "high_confidence", label: "High confidence" },
  { id: "mixed_confidence", label: "Mixed confidence" },
  { id: "low_confidence", label: "Low confidence" },
  { id: "no_result", label: "No result" },
  { id: "error", label: "Failure" },
  { id: "cold_start", label: "Cold start" },
  { id: "waiting", label: "Waiting" }
];

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
