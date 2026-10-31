/*
  Fixture data copied verbatim from:
  - 4-prototype_m2-doctolib_payloads-checklist.md
  - 4-prototype_m2-doctolib_payloads-answers.md
  This is a fixture-driven prototype: no live model calls. Each scenario below
  pairs a deterministic appointment context with a canned checklist payload,
  exactly as specified in the design-context brief.
*/

const DEFAULT_ITEMS_BASE = [
  { id: "d1", title: "Versichertenkarte mitbringen", action: "bring" },
  { id: "d2", title: "10 Minuten vor dem Termin da sein", action: "do_or_avoid" },
  { id: "d3", title: "Impfpass mitbringen, falls vorhanden", action: "bring" }
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

const NOTE_N1 = {
  id: "n1",
  text: "Blutverdünner 2 Tage vorher pausieren, hat Dr. Musterfrau beim letzten Termin gesagt. Brille für die Formulare einpacken."
};

const NOTE_N2 = {
  id: "n2",
  text: "Bei der Anmeldung wurde noch irgendetwas wegen der Blutsache gesagt, ich weiß nicht mehr genau was, vielleicht vorher nichts essen oder doch etwas mitbringen?!?"
};

const TYPE_OPTIONS = [
  "Gesundheits-Check-up",
  "Blutabnahme",
  "Impfung",
  "Nachkontrolle",
  "Ich bin mir nicht sicher"
];

const CHECKLIST_PAYLOADS = {
  high_confidence: {
    state: "high_confidence",
    framing: "Das hat Ihre Praxis für diese Terminart angegeben.",
    error_code: null,
    results: [
      { id: "p1", title: "Bringen Sie die Überweisung (Original) Ihrer Hausarztpraxis zu diesem Termin mit", source: "practice", action: "bring", band: "high", confidence: 0.62, source_quote: "Bitte bringen Sie Überweisungen immer im Original mit, Kopien oder Fotos davon können wir leider nicht annehmen." },
      { id: "p2", title: "8 Stunden vorher nichts essen, nur Wasser oder ungesüßten Tee trinken", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.88, source_quote: "Für die Blutabnahme müssen Sie nüchtern sein: Bitte essen Sie in den 8 Stunden vor Ihrem Termin nichts und trinken Sie nur Wasser oder ungesüßten Tee, ohne Milch und ohne Zucker, da sonst die Blutzucker- und Fettwerte verfälscht werden und wir die Blutabnahme an einem anderen Tag wiederholen müssen." },
      { id: "p3", title: "Blutverdünner 2 Tage vorher pausieren", source: "patient", action: "do_or_avoid", band: "high", confidence: 0.81, source_quote: NOTE_N1.text },
      { id: "p4", title: "Brille für die Formulare einpacken", source: "patient", action: "bring", band: "high", confidence: 0.79, source_quote: NOTE_N1.text },
      { id: "p5", title: "Fragebogen zur Krankengeschichte vor dem Termin online ausfüllen", source: "practice", action: "fill_in", band: "high", confidence: 0.84, source_quote: "Bitte füllen Sie vor jedem Check-up unseren Fragebogen zu Ihrer Krankengeschichte aus, den Link dazu finden Sie in Ihrer Terminbestätigung." },
      { id: "p6", title: "Befunde anderer Praxen vorab über Doctolib hochladen", source: "practice", action: "upload", band: "high", confidence: 0.73, source_quote: "Befunde von anderen Ärztinnen und Ärzten laden Sie bitte vorab über Doctolib hoch, damit wir sie vor dem Termin ansehen können." },
      { id: "p7", title: "Ihren aktuellen Medikamentenplan mitbringen", source: "practice", action: "bring", band: "high", confidence: 0.9, source_quote: "Bringen Sie bitte Ihren aktuellen Medikamentenplan mit, auch wenn sich seit dem letzten Besuch nichts geändert hat." },
      { id: "p8", title: "Kleidung tragen, deren Ärmel sich leicht hochschieben lassen", source: "practice", action: "do_or_avoid", band: "high", confidence: 0.86, source_quote: "Tragen Sie zur Blutabnahme bitte Kleidung, deren Ärmel sich leicht bis über den Ellenbogen hochschieben lassen." }
    ]
  },
  mixed_confidence: {
    state: "mixed_confidence",
    framing: "Hinweise Ihrer Praxis für diese Terminart. Bitte prüfen Sie die markierten Punkte.",
    error_code: null,
    results: [
      { id: "m1", title: "Bringen Sie die Überweisung (Original) Ihrer Hausarztpraxis zu diesem Termin mit", source: "practice", action: "bring", band: "high", confidence: 0.62, source_quote: "Bitte bringen Sie Überweisungen immer im Original mit, Kopien oder Fotos davon können wir leider nicht annehmen." },
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

// Scenarios drive the demo switcher. Each builds a fresh, independent
// appointment context so interactions in one scenario never leak into another.
function buildScenario(id) {
  switch (id) {
    case "high_confidence":
      return {
        id,
        label: "3 — High confidence",
        context: { ...CONTEXT_BASE, default_items: clone(DEFAULT_ITEMS_BASE), patient_notes: [clone(NOTE_N1)], consent_given: true },
        payload: clone(CHECKLIST_PAYLOADS.high_confidence)
      };
    case "mixed_confidence":
      return {
        id,
        label: "8 — Mixed confidence",
        context: { ...CONTEXT_BASE, default_items: clone(DEFAULT_ITEMS_BASE), patient_notes: [], consent_given: true },
        payload: clone(CHECKLIST_PAYLOADS.mixed_confidence)
      };
    case "low_confidence":
      return {
        id,
        label: "4 — Low confidence",
        context: { ...CONTEXT_BASE, default_items: clone(DEFAULT_ITEMS_BASE), patient_notes: [clone(NOTE_N2)], consent_given: true },
        payload: clone(CHECKLIST_PAYLOADS.low_confidence)
      };
    case "no_result":
      return {
        id,
        label: "5 — No result",
        context: { ...CONTEXT_BASE, default_items: clone(DEFAULT_ITEMS_BASE), patient_notes: [], consent_given: true },
        payload: clone(CHECKLIST_PAYLOADS.no_result)
      };
    case "error":
      return {
        id,
        label: "6 — Failure",
        context: { ...CONTEXT_BASE, default_items: clone(DEFAULT_ITEMS_BASE), patient_notes: [], consent_given: true },
        payload: clone(CHECKLIST_PAYLOADS.error)
      };
    case "cold_start":
      return {
        id,
        label: "7 — Cold start",
        context: { ...CONTEXT_BASE, default_items: [], patient_notes: [], consent_given: true },
        payload: clone(CHECKLIST_PAYLOADS.no_result)
      };
    case "type_pick":
      return {
        id,
        label: "9 — Type pick (generic appointment)",
        context: {
          ...CONTEXT_BASE,
          appointment_type: "Sprechstunde",
          appointment_type_is_generic: true,
          type_options: clone(TYPE_OPTIONS),
          default_items: [],
          patient_notes: [],
          consent_given: true
        },
        payload: clone(CHECKLIST_PAYLOADS.no_result)
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
  { id: "type_pick", label: "Type pick (generic)" }
];

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
