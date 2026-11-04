/*
  Fixture data for the three Vorbereitung test flows (flows.md), copied
  verbatim (German) from 4-prototype_m2-doctolib_payloads-checklist.md §2.
  This is a fixture-driven prototype: no live model calls.

  German is the product's default; the English fixtures are a hand-translated
  mirror for ?lang=en (design-context-brief.md §6: "English copy mirrors it
  and must not add, soften or drop anything"), read via fx(). There is no
  in-app switch for this: FLOW_ID and LANG are set once at boot by app.js from
  the URL (#flow1/#flow2/#flow3, ?lang=en) and never change afterwards.

  Only "high_confidence" states are reachable, because none of the three
  flows passes through mixed/low/no_result/error/cold_start — per flows.md's
  own note on the urgent card, those states "stay designed but aren't in
  these flows." The renderer in app.js still handles them generically (from
  any payload.state), just with no fixture here ever triggering them.
*/

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

// The two universal note-composer suggestion chips (shown when adding a
// note, any flow).
const NOTE_EXAMPLES = {
  medication: { de: "Das in der Sprechstunde besprochene Medikament pausieren", en: "Pause the medication discussed during the appointment" },
  vaccineCard: { de: "Impfpass mitbringen", en: "Bring the vaccination booklet" }
};

/* ------------------------- Note-to-item simulation -------------------------
   Shared across every flow (no live NLP): simulatedItemForNote() in app.js
   matches these concepts' keywords (case-insensitive) against the sentence
   of the note they appear in, so a day/hour count only applies to the
   concept mentioned in that same sentence. Most keywords use substring
   matching so German verb stems ("pausier-", "absetz-") catch their
   conjugations; "form" is flagged wholeWord since it's a substring of
   "Information" and similar words. A concept with no match anywhere in the
   note is simply absent; if nothing at all matches, the note becomes the
   low-confidence "unclear note" item instead of a guess. */

const NOTE_CONCEPTS = [
  {
    key: "medication_list",
    keywords: ["medikamentenliste", "medikamentenplan", "medication list"],
    item: {
      de: { title: "Medikamentenliste mitbringen", action: "bring", group: "appointment_day" },
      en: { title: "Bring your medication list", action: "bring", group: "appointment_day" }
    }
  },
  {
    key: "medication_pause",
    keywords: ["pausier", "absetz", "weglassen", "nicht nehmen", "pause", "stop taking"],
    item: {
      de: { title: "Medikament wie besprochen pausieren", action: "do_or_avoid", group: "before_appointment" },
      en: { title: "Pause medication as discussed", action: "do_or_avoid", group: "before_appointment" }
    }
  },
  {
    key: "vaccination",
    keywords: ["impfpass", "impfausweis", "vaccination", "vaccine"],
    item: {
      de: { title: "Impfpass mitbringen", action: "bring", group: "appointment_day" },
      en: { title: "Bring the vaccination booklet", action: "bring", group: "appointment_day" }
    }
  },
  {
    key: "insurance_card",
    keywords: ["versichertenkarte", "versicherungskarte", "insurance card", "insurance"],
    noItem: true // already a default item in every flow
  },
  {
    key: "referral",
    keywords: ["überweisung", "referral"],
    item: {
      de: { title: "Überweisung besorgen und mitbringen", action: "bring", group: "prepare_now" },
      en: { title: "Get and bring the referral", action: "bring", group: "prepare_now" }
    }
  },
  {
    key: "fasting",
    keywords: ["nüchtern", "fasting"],
    item: {
      de: { title: "Nüchtern zum Termin kommen", action: "do_or_avoid", group: "appointment_day" },
      en: { title: "Come to the appointment fasting", action: "do_or_avoid", group: "appointment_day" }
    }
  },
  {
    key: "form",
    keywords: ["formular", "fragebogen", "form", "questionnaire"],
    wholeWord: true,
    item: {
      de: { title: "Formular ausfüllen", action: "fill_in", group: "prepare_now" },
      en: { title: "Fill in the form", action: "fill_in", group: "prepare_now" }
    }
  }
];

// Resolves NOTE_CONCEPTS plus the active flow's overrides/extra concepts
// (e.g. Flow 2's specific medication-pause wording and its water concept)
// into a flat, language-resolved list ready for matching. FLOW_ID and LANG
// are set once by app.js at boot.
function resolvedNoteConcepts() {
  const flow = FLOWS[FLOW_ID];
  const overrides = flow.noteConceptOverrides || {};
  const extras = flow.noteExtraConcepts || [];
  const base = NOTE_CONCEPTS.map((c) => ({
    key: c.key,
    keywords: c.keywords,
    wholeWord: c.wholeWord,
    noItem: c.noItem,
    item: overrides[c.key] ? overrides[c.key][LANG] : c.item ? c.item[LANG] : null
  }));
  extras.forEach((c) => base.push({ key: c.key, keywords: c.keywords, wholeWord: c.wholeWord, noItem: c.noItem, item: c.item[LANG] }));
  return base;
}

/* ------------------------------- Flow 1 -------------------------------
   "What the AI does for me" — MRT Knie at a radiology practice, consent not
   yet given. Entry: appointment details page. */

const FLOW1_DE = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-10T09:30",
    practice_name: "Radiologie Musterstadt",
    practice_contact_lines: ["Musterstraße 1, 12345 Musterstadt", "Telefon 01234 567890"],
    appointment_type: "MRT Knie",
    consent_given: false,
    general_reminders: [],
    default_items: [
      { id: "d1", title: "Versichertenkarte mitbringen", action: "bring", group: "appointment_day" },
      { id: "d2", title: "10 Minuten vor dem Termin da sein", action: "do_or_avoid", group: "appointment_day" }
    ],
    patient_notes: []
  },
  payload: {
    state: "high_confidence",
    framing: "Das hat Ihre Praxis für diese Terminart angegeben.",
    error_code: null,
    results: [
      { id: "p1", title: "Überweisung im Original besorgen und mitbringen", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.91, source_quote: "Bitte bringen Sie die Überweisung Ihrer Hausarzt- oder Facharztpraxis im Original mit, Kopien können wir nicht annehmen." },
      { id: "p2", title: "Vorbefunde oder MRT-Bilder aus anderen Praxen auf CD mitbringen", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.78, source_quote: "Falls Sie Vorbefunde oder MRT-Bilder aus einer anderen Praxis haben, bringen Sie diese bitte auf CD mit." },
      { id: "p4", title: "Sicherheitsfragebogen vor dem Termin ausfüllen", source: "practice", action: "fill_in", group: "prepare_now", due_before: null, band: "high", confidence: 0.87, source_quote: "Bitte füllen Sie vor Ihrem Termin den Sicherheitsfragebogen zu Herzschrittmachern und Metallimplantaten aus." },
      { id: "p3", title: "Am Untersuchungstag keinen Schmuck, keine Piercings und keine Uhr tragen", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "high", confidence: 0.86, source_quote: "Bitte legen Sie am Untersuchungstag keinen Schmuck an und lassen Sie Piercings und Uhren zu Hause." }
    ]
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

const FLOW1_EN = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-10T09:30",
    practice_name: "Musterstadt Radiology",
    practice_contact_lines: ["Musterstraße 1, 12345 Musterstadt", "Phone 01234 567890"],
    appointment_type: "Knee MRI",
    consent_given: false,
    general_reminders: [],
    default_items: [
      { id: "d1", title: "Bring your insurance card", action: "bring", group: "appointment_day" },
      { id: "d2", title: "Arrive 10 minutes before your appointment", action: "do_or_avoid", group: "appointment_day" }
    ],
    patient_notes: []
  },
  payload: {
    state: "high_confidence",
    framing: "This is what your practice has stated for this appointment type.",
    error_code: null,
    results: [
      { id: "p1", title: "Get the referral and bring the original", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.91, source_quote: "Please bring the referral from your GP or specialist practice in the original; we can't accept copies." },
      { id: "p2", title: "Bring previous findings or MRI images from other practices on CD", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.78, source_quote: "If you have previous findings or MRI images from another practice, please bring them on CD." },
      { id: "p4", title: "Fill in the safety questionnaire before the appointment", source: "practice", action: "fill_in", group: "prepare_now", due_before: null, band: "high", confidence: 0.87, source_quote: "Please fill in the safety questionnaire about pacemakers and metal implants before your appointment." },
      { id: "p3", title: "Don't wear jewelry, piercings or a watch on the day of the exam", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "high", confidence: 0.86, source_quote: "Please don't wear any jewelry on the day of the exam, and leave piercings and watches at home." }
    ]
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

/* ------------------------------- Flow 2 -------------------------------
   "My note becomes items, and I'm reminded" — check-up with blood draw,
   consent already given. Entry: appointment details page. The patient
   writes the note themselves, in their own words, describing the two
   instructions from the scenario (pause the blood thinner 2 days before,
   drink enough water). Its medication-pause item keeps the scenario's
   specific wording and 2-day fallback due time (used only if the note's
   medication-pause sentence doesn't itself name a day/hour count); "water"
   is a Flow-2-only concept, not part of the shared list. */

const FLOW2_DE = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-03T08:00",
    practice_name: "Praxis Dr. Jane Musterfrau",
    practice_contact_lines: ["Musterweg 2, 12345 Musterstadt", "Telefon 01234 112233"],
    appointment_type: "Gesundheits-Check-up mit Blutabnahme",
    consent_given: true,
    general_reminders: [],
    default_items: [
      { id: "d1", title: "Versichertenkarte mitbringen", action: "bring", group: "appointment_day" }
    ],
    patient_notes: []
  },
  payload: {
    state: "high_confidence",
    framing: "Das hat Ihre Praxis für diese Terminart angegeben.",
    error_code: null,
    results: [
      { id: "p1", title: "8 Stunden vorher nichts essen, nur Wasser oder ungesüßten Tee trinken", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: { value: 8, unit: "hours" }, band: "high", confidence: 0.89, source_quote: "Für die Blutabnahme kommen Sie bitte nüchtern: In den 8 Stunden vor Ihrem Termin bitte nichts essen und nur Wasser oder ungesüßten Tee trinken." }
    ]
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

const FLOW2_EN = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-03T08:00",
    practice_name: "Dr. Jane Musterfrau Practice",
    practice_contact_lines: ["Musterweg 2, 12345 Musterstadt", "Phone 01234 112233"],
    appointment_type: "Health check-up with blood draw",
    consent_given: true,
    general_reminders: [],
    default_items: [
      { id: "d1", title: "Bring your insurance card", action: "bring", group: "appointment_day" }
    ],
    patient_notes: []
  },
  payload: {
    state: "high_confidence",
    framing: "This is what your practice has stated for this appointment type.",
    error_code: null,
    results: [
      { id: "p1", title: "Don't eat for 8 hours beforehand, only drink water or unsweetened tea", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: { value: 8, unit: "hours" }, band: "high", confidence: 0.89, source_quote: "Please come fasting for the blood draw: don't eat anything in the 8 hours before your appointment, and only drink water or unsweetened tea." }
    ]
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

const FLOW2_NOTE_CONCEPT_OVERRIDES = {
  medication_pause: {
    de: { title: "Blutverdünner 2 Tage vorher pausieren", action: "do_or_avoid", group: "before_appointment", due_before: { value: 2, unit: "days" } },
    en: { title: "Pause blood thinner 2 days before", action: "do_or_avoid", group: "before_appointment", due_before: { value: 2, unit: "days" } }
  }
};

const FLOW2_EXTRA_NOTE_CONCEPTS = [
  {
    key: "water",
    keywords: ["wasser", "trink", "water", "drink"],
    item: {
      de: { title: "Genügend Wasser trinken", action: "do_or_avoid", group: "appointment_day" },
      en: { title: "Drink enough water", action: "do_or_avoid", group: "appointment_day" }
    }
  }
];

/* ------------------------------- Flow 3 -------------------------------
   "What's still open" — the Flow 1 fixture revisited: consent already
   given, a general reminder already set, and the two "prepare_now" items
   already ticked (the new safety questionnaire, p4, stays open). Entry: the
   simulated push/lock screen. */

const FLOW3_DE = {
  context: { ...clone(FLOW1_DE.context), consent_given: true, general_reminders: ["day_before"] },
  payload: clone(FLOW1_DE.payload),
  interfaceState: { ticked: ["p1", "p2"], reminders_off: [] }
};

const FLOW3_EN = {
  context: { ...clone(FLOW1_EN.context), consent_given: true, general_reminders: ["day_before"] },
  payload: clone(FLOW1_EN.payload),
  interfaceState: { ticked: ["p1", "p2"], reminders_off: [] }
};

// `today` is a fixed simulated "today" per flow (not the real current date),
// so due times, reminder labels and note dates stay deterministic regardless
// of when the prototype is actually opened. Flow 1: appointment in 10 days.
// Flow 2: the day the note is written. Flow 3: appointment tomorrow.
const FLOWS = {
  flow1: { entry: "appointment", today: "2027-05-31", de: FLOW1_DE, en: FLOW1_EN },
  flow2: {
    entry: "appointment",
    today: "2027-05-12",
    de: FLOW2_DE,
    en: FLOW2_EN,
    noteConceptOverrides: FLOW2_NOTE_CONCEPT_OVERRIDES,
    noteExtraConcepts: FLOW2_EXTRA_NOTE_CONCEPTS
  },
  flow3: { entry: "push", today: "2027-06-09", de: FLOW3_DE, en: FLOW3_EN }
};

// Reads the active flow + language's fixture set. FLOW_ID and LANG are set
// once by app.js at boot (from the URL) and read here at call time, so the
// load order of the two files doesn't matter and nothing needs to re-read
// this after boot (no in-app routing/language change).
function fx() {
  return FLOWS[FLOW_ID][LANG];
}
