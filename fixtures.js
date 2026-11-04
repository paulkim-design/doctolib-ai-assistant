/*
  Fixture data for the three Vorbereitung test flows (flows.md), copied
  verbatim (German) from 4-prototype_m2-doctolib_payloads-checklist.md §2.
  This is a fixture-driven prototype: no live model calls.

  German is the product's default; the English fixtures are a hand-translated
  mirror for ?lang=en (design-context-brief.md §6: "English copy mirrors it
  and must not add, soften or drop anything"), read via fx(). There is no
  in-app switch for this: FLOW_ID and LANG are set once at boot by app.js from
  the URL (#flow1/#flow2/#flow3, ?lang=en) and never change afterwards.

  Flow 1 is high_confidence throughout. Flow 2 starts cold (no practice
  information, no default items) and moves to high_confidence once the
  patient's note becomes items. Flow 3 is mixed_confidence: two high-band
  practice items already done, one low-band item still open with the
  warning strip. error/low_confidence stay reachable generically (from any
  payload.state) but no fixture here ever triggers them.
*/

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

// The note-composer suggestion chips (shown when adding a note, any flow).
// Each matches an existing NOTE_CONCEPTS keyword, so saving it as typed
// produces that concept's item. The medication-pause suggestion stays
// removed: it always names no day/hour count, so it always produced a
// low-confidence item.
const NOTE_EXAMPLES = {
  insuranceCard: { de: "Versichertenkarte mitbringen", en: "Bring your insurance card" },
  referral: { de: "Überweisung besorgen", en: "Get the referral" },
  medicationList: { de: "Medikamentenliste mitbringen", en: "Bring your medication list" },
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
    // Pausing a medication is meaningless without knowing when, unlike e.g.
    // "bring your insurance card" — so this concept alone drops to low
    // confidence when its sentence names no day/hour count. Without a time,
    // the title is the sentence as the patient wrote it (verbatimWhenUnclear
    // in app.js), not this fixed phrase — it only applies when a day/hour
    // count IS given (and no flow override fires instead).
    requiresTime: true,
    verbatimWhenUnclear: true,
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
    noItem: true, // already a default item in every flow except Flow 2 — see its noItem override below
    item: {
      de: { title: "Versichertenkarte mitbringen", action: "bring", group: "appointment_day" },
      en: { title: "Bring your insurance card", action: "bring", group: "appointment_day" }
    }
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
    // Fasting instructions without a stated time get their own reminder
    // default (1 day before, not the usual 1 hour) — see the `fasting` flag
    // threaded through resolvedNoteConcepts()/simulatedItemForNote() into
    // reminderDueDays() in app.js.
    fasting: true,
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
// into a flat list ready for matching. An override (e.g. Flow 2's
// medication-pause wording) is a `resolve(sentence, dueBefore)` function,
// not a fixed item — simulatedItemForNote() (app.js) calls it with the
// matched sentence and the extracted due time, and it returns null (use the
// concept's generic item) or a fully-formed { title, action, group,
// lowConfidence }, built only from what that sentence actually says. FLOW_ID
// and LANG are set once by app.js at boot; resolve functions read LANG
// directly since their wording depends on it too.
function resolvedNoteConcepts() {
  const flow = FLOWS[FLOW_ID];
  const overrides = flow.noteConceptOverrides || {};
  const extras = flow.noteExtraConcepts || [];
  const base = NOTE_CONCEPTS.map((c) => {
    const override = overrides[c.key];
    return {
      key: c.key,
      keywords: c.keywords,
      wholeWord: c.wholeWord,
      // A flow's override can flip noItem itself (Flow 2's insurance_card,
      // which has no default item to rely on instead), not just the title.
      noItem: override && override.noItem !== undefined ? override.noItem : c.noItem,
      requiresTime: c.requiresTime,
      fasting: c.fasting,
      verbatimWhenUnclear: c.verbatimWhenUnclear,
      item: c.item ? c.item[LANG] : null,
      resolveOverride: override ? override.resolve : null
    };
  });
  extras.forEach((c) => base.push({ key: c.key, keywords: c.keywords, wholeWord: c.wholeWord, noItem: c.noItem, requiresTime: c.requiresTime, fasting: c.fasting, verbatimWhenUnclear: c.verbatimWhenUnclear, item: c.item[LANG], resolveOverride: null }));
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
   "My note becomes items, and I'm reminded" — cold start, then notes. A
   routine check-up at the same GP practice, consent already given, but no
   practice information and no default items at all: tapping "Vorbereitung"
   shows the cold-start screen directly (brief §3/§5), no model call. The
   patient writes their own note, in their own words; whatever it matches
   becomes items via the shared keyword matching (plus this flow's own
   medication-pause/water concepts below), moving the checklist out of cold
   start entirely — no default list, so the framing reads "Hinweise aus
   Ihren Notizen." once the note resolves. */

const FLOW2_DE = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-03T08:00",
    practice_name: "Praxis Dr. Jane Musterfrau",
    practice_contact_lines: ["Musterweg 2, 12345 Musterstadt", "Telefon 01234 112233"],
    appointment_type: "Kontrolltermin",
    consent_given: true,
    general_reminders: [],
    default_items: [],
    patient_notes: []
  },
  payload: {
    state: "no_result",
    framing: "Keine zusätzlichen Hinweise von Ihrer Praxis.",
    error_code: null,
    results: []
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

const FLOW2_EN = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-03T08:00",
    practice_name: "Dr. Jane Musterfrau Practice",
    practice_contact_lines: ["Musterweg 2, 12345 Musterstadt", "Phone 01234 112233"],
    appointment_type: "Check-up appointment",
    consent_given: true,
    general_reminders: [],
    default_items: [],
    patient_notes: []
  },
  payload: {
    state: "no_result",
    framing: "No extra information from your practice.",
    error_code: null,
    results: []
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

// The medication-pause title names the blood thinner and day count only
// when the note actually states both — mentioning the blood thinner with no
// day count returns null instead, same as no mention at all, so it falls
// through to the generic concept's own low-confidence handling (the
// sentence as written, verbatimWhenUnclear — see simulatedItemForNote() in
// app.js), not a fixed "as discussed" phrase.
// Flow 2 has no default insurance-card item (cold start), so a note
// mentioning it must produce one of its own instead of the usual noItem.
const FLOW2_NOTE_CONCEPT_OVERRIDES = {
  medication_pause: {
    resolve: (sentence, dueBefore) => {
      if (!/blutverdünner|blood thinner/i.test(sentence)) return null;
      const hasDayCount = dueBefore != null && dueBefore.unit === "days";
      if (!hasDayCount) return null;
      const title = LANG === "de" ? `Blutverdünner ${dueBefore.value} Tage vorher pausieren` : `Pause blood thinner ${dueBefore.value} days before`;
      return { title, action: "do_or_avoid", group: "before_appointment", lowConfidence: false };
    }
  },
  insurance_card: { noItem: false }
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
   "What's still open" — a new appointment the day before: CT Bauch at
   Radiologie Musterstadt (the same practice as Flow 1), consent already
   given, a general reminder already set. The referral and previous-findings
   items are already done; the practice's fasting-for-contrast-agent
   sentence doesn't say when, so that item stays low confidence and open,
   with the warning strip, next to the two still-open default items. Entry:
   the simulated push/lock screen. */

const FLOW3_DE = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-15T08:00",
    practice_name: "Radiologie Musterstadt",
    practice_contact_lines: ["Musterstraße 1, 12345 Musterstadt", "Telefon 01234 567890"],
    appointment_type: "CT Bauch",
    consent_given: true,
    general_reminders: ["day_before"],
    default_items: [
      { id: "d1", title: "Versichertenkarte mitbringen", action: "bring", group: "appointment_day" },
      { id: "d2", title: "10 Minuten vor dem Termin da sein", action: "do_or_avoid", group: "appointment_day" }
    ],
    patient_notes: []
  },
  payload: {
    state: "mixed_confidence",
    framing: "Hinweise Ihrer Praxis für diese Terminart. Bitte prüfen Sie die markierten Punkte.",
    error_code: null,
    results: [
      { id: "p1", title: "Überweisung im Original besorgen und mitbringen", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.9, source_quote: "Bitte bringen Sie die Überweisung Ihrer Hausarzt- oder Facharztpraxis im Original mit." },
      { id: "p2", title: "Vorbefunde mitbringen", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.83, source_quote: "Falls Sie Vorbefunde haben, bringen Sie diese bitte mit." },
      { id: "p3", title: "Nüchtern kommen, falls Kontrastmittel nötig ist", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "low", confidence: 0.42, fasting: true, source_quote: "Je nach Fragestellung kann ein Kontrastmittel nötig sein, in diesem Fall kommen Sie bitte nüchtern." }
    ]
  },
  interfaceState: { ticked: ["p1", "p2"], reminders_off: [] }
};

const FLOW3_EN = {
  context: {
    patient_display_name: "Tessa Beispiel",
    appointment_datetime: "2027-06-15T08:00",
    practice_name: "Musterstadt Radiology",
    practice_contact_lines: ["Musterstraße 1, 12345 Musterstadt", "Phone 01234 567890"],
    appointment_type: "Abdominal CT",
    consent_given: true,
    general_reminders: ["day_before"],
    default_items: [
      { id: "d1", title: "Bring your insurance card", action: "bring", group: "appointment_day" },
      { id: "d2", title: "Arrive 10 minutes before your appointment", action: "do_or_avoid", group: "appointment_day" }
    ],
    patient_notes: []
  },
  payload: {
    state: "mixed_confidence",
    framing: "Information from your practice for this appointment type. Please check the marked items.",
    error_code: null,
    results: [
      { id: "p1", title: "Get the referral and bring the original", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.9, source_quote: "Please bring the referral from your GP or specialist practice in the original." },
      { id: "p2", title: "Bring previous findings", source: "practice", action: "bring", group: "prepare_now", due_before: null, band: "high", confidence: 0.83, source_quote: "If you have previous findings, please bring them." },
      { id: "p3", title: "Come fasting if contrast agent is needed", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "low", confidence: 0.42, fasting: true, source_quote: "Depending on the question being examined, a contrast agent may be needed; in that case, please come fasting." }
    ]
  },
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
  flow3: { entry: "push", today: "2027-06-14", de: FLOW3_DE, en: FLOW3_EN }
};

// Reads the active flow + language's fixture set. FLOW_ID and LANG are set
// once by app.js at boot (from the URL) and read here at call time, so the
// load order of the two files doesn't matter and nothing needs to re-read
// this after boot (no in-app routing/language change).
function fx() {
  return FLOWS[FLOW_ID][LANG];
}
