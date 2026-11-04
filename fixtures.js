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
// note, any flow). "vaccineCard" repeats default item d1 in every flow's
// fixture, so it's simulated as producing no item (see simulatedItemForNote
// in app.js).
const NOTE_EXAMPLES = {
  medication: { de: "Das in der Sprechstunde besprochene Medikament pausieren", en: "Pause the medication discussed during the appointment" },
  vaccineCard: { de: "Impfpass mitbringen", en: "Bring the vaccination booklet" }
};

/* ------------------------------- Flow 1 -------------------------------
   "What the AI does for me" — MRT Knie at a radiology practice, consent not
   yet given. Entry: appointment details page. */

const FLOW1_DE = {
  context: {
    patient_display_name: "Lena Brückner",
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
      { id: "p3", title: "Am Untersuchungstag keinen Schmuck, keine Piercings und keine Uhr tragen", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "high", confidence: 0.86, source_quote: "Bitte legen Sie am Untersuchungstag keinen Schmuck an und lassen Sie Piercings und Uhren zu Hause." }
    ]
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

const FLOW1_EN = {
  context: {
    patient_display_name: "Lena Brückner",
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
      { id: "p3", title: "Don't wear jewelry, piercings or a watch on the day of the exam", source: "practice", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "high", confidence: 0.86, source_quote: "Please don't wear any jewelry on the day of the exam, and leave piercings and watches at home." }
    ]
  },
  interfaceState: { ticked: [], reminders_off: [] }
};

/* ------------------------------- Flow 2 -------------------------------
   "My note becomes items, and I'm reminded" — check-up with blood draw,
   consent already given. Entry: appointment details page. The patient
   writes the note themselves (only the two universal suggestion chips are
   shown); simulatedItemForNote() in app.js matches this exact text to
   reproduce the fixture's two-item split, since there's no live NLP to
   generalize it — whoever drives the prototype types it verbatim. */

const FLOW2_NOTE_TEXT_DE = "Blutverdünner 2 Tage vorher pausieren, hat Dr. Musterfrau gesagt. Genügend Wasser trinken.";
const FLOW2_NOTE_TEXT_EN = "Pause blood thinner 2 days before, Dr. Musterfrau said. Drink enough water.";

const FLOW2_DE = {
  context: {
    patient_display_name: "Lena Brückner",
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
  interfaceState: { ticked: [], reminders_off: [] },
  noteSimRule: {
    matchText: FLOW2_NOTE_TEXT_DE,
    items: [
      { idSuffix: "a", title: "Blutverdünner 2 Tage vorher pausieren", action: "do_or_avoid", group: "before_appointment", due_before: { value: 2, unit: "days" }, band: "high", confidence: 0.84 },
      { idSuffix: "b", title: "Genügend Wasser trinken", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "high", confidence: 0.81 }
    ]
  }
};

const FLOW2_EN = {
  context: {
    patient_display_name: "Lena Brückner",
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
  interfaceState: { ticked: [], reminders_off: [] },
  noteSimRule: {
    matchText: FLOW2_NOTE_TEXT_EN,
    items: [
      { idSuffix: "a", title: "Pause blood thinner 2 days before", action: "do_or_avoid", group: "before_appointment", due_before: { value: 2, unit: "days" }, band: "high", confidence: 0.84 },
      { idSuffix: "b", title: "Drink enough water", action: "do_or_avoid", group: "appointment_day", due_before: null, band: "high", confidence: 0.81 }
    ]
  }
};

/* ------------------------------- Flow 3 -------------------------------
   "What's still open" — the Flow 1 fixture revisited: consent already
   given, a general reminder already set, and the two "prepare_now" items
   already ticked. Entry: the simulated push/lock screen. */

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
  flow2: { entry: "appointment", today: "2027-05-12", de: FLOW2_DE, en: FLOW2_EN },
  flow3: { entry: "push", today: "2027-06-09", de: FLOW3_DE, en: FLOW3_EN }
};

// Reads the active flow + language's fixture set. FLOW_ID and LANG are set
// once by app.js at boot (from the URL) and read here at call time, so the
// load order of the two files doesn't matter and nothing needs to re-read
// this after boot (no in-app routing/language change).
function fx() {
  return FLOWS[FLOW_ID][LANG];
}
