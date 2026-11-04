/*
  Prototype app logic. Single state object + full re-render on every change.
  Fixture-driven: scenarios come from fixtures.js, no live model calls.

  Routing (no reviewer controls, per design-context-brief.md §6):
  - Flow: URL hash #flow1 | #flow2 | #flow3 (default: flow1).
  - Language: ?lang=en switches the whole phone to English; default German.
    The query string must precede the hash (?lang=en#flow1, not the reverse).
  Both are read once at boot into FLOW_ID/LANG and never change at runtime;
  changing the hash reloads the page rather than hot-swapping state.
*/

const WAIT_MS = 2000;

function parseRouting() {
  const hash = (location.hash || "").replace("#", "");
  const flowId = FLOWS[hash] ? hash : "flow1";
  const lang = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "de";
  return { flowId, lang };
}

const { flowId: FLOW_ID, lang: LANG } = parseRouting();
// A fixed simulated "today" per flow (fixtures.js), not the real current
// date, so due times, reminder labels and note dates stay deterministic.
const SIMULATED_TODAY = FLOWS[FLOW_ID].today;

let state = null;
let lastFocusedEl = null;
let prevPhase = null;
let prevSheet = null;
let prevScreenForScroll = null;

const GROUPS = ["prepare_now", "before_appointment", "appointment_day"];
const SOURCE_ORDER = { practice: 0, default: 1, patient: 2 };

/* ---------------------------- Copy (UI chrome) ---------------------------- */
/* German is the source (design-context-brief.md §5); English mirrors it
   without adding, softening or dropping meaning (§6). */

const COPY = {
  back: { de: "Zurück", en: "Back" },
  appointmentInfoTitle: { de: "Informationen zum Termin", en: "Appointment information" },
  prepTitle: { de: "Vorbereitung", en: "Preparation" },
  prepTitleForName: { de: (name) => `Vorbereitung · Für ${name}`, en: (name) => `Preparation · For ${name}` },
  reschedule: { de: "Verschieben", en: "Reschedule" },
  cancelAppointment: { de: "Termin absagen", en: "Cancel appointment" },
  uploadDocuments: { de: "Dokumente hochladen", en: "Upload documents" },
  patientCardTitle: { de: "Patient", en: "Patient" },
  patientStatus: { de: "Gesetzlich versichert", en: "Statutory health insurance" },
  shareAppointmentDetails: { de: "Termindetails teilen", en: "Share appointment details" },
  facilityDetailsTitle: { de: "Einzelheiten der Gesundheitseinrichtung", en: "Health facility details" },
  addressLabel: { de: "Adresse", en: "Address" },
  openMap: { de: "Karte öffnen", en: "Open map" },
  billingTypesLabel: { de: "Abrechnungsarten", en: "Billing types" },
  billingTypesValue: { de: "Gesetzlich und privat Versicherte", en: "Statutory and private patients" },

  entryBefore: { de: "Vorbereitung", en: "Preparation" },
  entryAfter: {
    de: (n) => `Vorbereitung · ${n} offen`,
    en: (n) => `Preparation · ${n} open`
  },

  waitingStatus: { de: "Ihre Vorbereitungsinfos werden geprüft …", en: "Checking your preparation info …" },
  waitingSubline: { de: "In der Zwischenzeit, das wird meistens benötigt:", en: "In the meantime, here's what's usually needed:" },
  checklistUpdated: { de: "Ihre Checkliste wurde aktualisiert.", en: "Your checklist has been updated." },

  failureSubline: { de: "Bitte versuchen Sie es erneut oder wenden Sie sich an Ihre Praxis.", en: "Please try again or contact your practice." },
  retry: { de: "Erneut versuchen", en: "Try again" },

  coldStartHeading: { de: "Für diesen Termin gibt es noch keine Vorbereitungsinfos.", en: "There's no preparation info for this appointment yet." },

  noResultSubline: { de: "Die allgemeine Liste für diese Terminart:", en: "The general list for this appointment type:" },

  defaultLabel: { de: "Für diese Terminart meist nötig", en: "Usually needed for this appointment type" },
  fromPractice: { de: (name) => `Von ${name}`, en: (name) => `From ${name}` },
  fromNote: { de: "Aus Ihrer Notiz", en: "From your note" },
  unclearNote: { de: "Von Ihnen notiert (unklar)", en: "Noted by you (unclear)" },
  hedge: { de: "Bitte prüfen", en: "Please check" },
  showMore: { de: "Mehr anzeigen", en: "Show more" },
  showLess: { de: "Weniger anzeigen", en: "Show less" },
  kiBadge: { de: "KI", en: "AI" },
  kiBadgeAriaLabel: { de: "Von KI gefunden", en: "Found by AI" },
  dismissItem: { de: "Trifft auf mich nicht zu", en: "Doesn't apply to me" },
  undoDismiss: { de: "Rückgängig", en: "Undo" },
  whySeeThis: { de: "Warum sehe ich das?", en: "Why am I seeing this?" },

  reminderPrefix: { de: "Erinnerung", en: "Reminder" },
  whenOneDayBefore: { de: "1 Tag vorher", en: "1 day before" },
  whenNDaysBefore: { de: (n) => `${n} Tage vorher`, en: (n) => `${n} days before` },
  noReminderOption: { de: "Keine Erinnerung", en: "No reminder" },
  otherReminderOption: { de: "Andere …", en: "Other …" },
  decreaseDays: { de: "Weniger Tage", en: "Fewer days" },
  increaseDays: { de: "Mehr Tage", en: "More days" },

  addGeneralReminder: { de: "+ Allgemeine Erinnerung hinzufügen", en: "+ Add general reminder" },
  generalReminderSet: {
    de: (times) => `Allgemeine Erinnerung: ${times} · Ändern`,
    en: (times) => `General reminder: ${times} · Change`
  },
  generalReminderTitle: { de: "Allgemeine Erinnerung", en: "General reminder" },
  generalReminderIntro: { de: "Zusätzlich zu den Erinnerungen für einzelne Punkte.", en: "In addition to the reminders for individual items." },
  reminderOption_week_before: { de: "1 Woche vorher", en: "1 week before" },
  reminderOption_day_before: { de: "1 Tag vorher", en: "1 day before" },
  reminderOption_hour_before: { de: "1 Stunde vorher", en: "1 hour before" },

  notesHeading: { de: "Ihre Vorbereitungsnotizen", en: "Your preparation notes" },
  notedOn: { de: (date) => `Notiert am ${date}`, en: (date) => `Noted on ${date}` },
  edit: { de: "Bearbeiten", en: "Edit" },
  delete: { de: "Löschen", en: "Delete" },
  editNoteAriaLabel: { de: (text) => `Notiz bearbeiten: ${text}`, en: (text) => `Edit note: ${text}` },
  deleteNoteAriaLabel: { de: (text) => `Notiz löschen: ${text}`, en: (text) => `Delete note: ${text}` },
  notesFootnote: { de: "Ihre Notizen werden nach dem Termin gelöscht.", en: "Your notes will be deleted after the appointment." },
  noteDeletedLive: { de: "Notiz gelöscht.", en: "Note deleted." },

  contactCardTitle: { de: "Kontaktdaten der Praxis", en: "Practice contact details" },
  contactDisclaimer: { de: "Antworten hängen von der Praxis ab.", en: "Responses depend on the practice." },
  urgentTitle: { de: "Sie können nicht bis zu Ihrem Termin warten?", en: "Can't wait until your appointment?" },
  urgentText: {
    de: "Rufen Sie den ärztlichen Bereitschaftsdienst unter 116117 an. Im Notfall rufen Sie die 112.",
    en: "Call the medical on-call service at 116117. In an emergency, call 112."
  },

  addNote: { de: "+ Vorbereitungsnotiz hinzufügen", en: "+ Add preparation note" },
  noteLimitMsg: { de: "Sie können bis zu 5 Notizen hinzufügen.", en: "You can add up to 5 notes." },

  closingLine: {
    de: "Hat sich seit der Buchung etwas geändert? Wenden Sie sich vor Ihrem Termin an Ihre Praxis.",
    en: "Has something changed since you booked? Contact your practice before your appointment."
  },

  close: { de: "Schließen", en: "Close" },
  consentHeading: {
    de: (name) => `Wir helfen bei der Vorbereitung auf den Termin für ${name}`,
    en: (name) => `We'll help you prepare for ${name}'s appointment`
  },
  consentBody: {
    de: "Eine KI prüft die Informationen, die Ihre Praxis für diese Terminart bereitstellt, und Ihre eigenen Vorbereitungsnotizen. Daraus entsteht eine persönliche Checkliste. Gesundheitsangaben werden nicht gelesen oder bewertet, nur Organisatorisches wie Dokumente, Nüchternheit oder Formulare. Ihre Checkliste und Ihre Notizen werden nach dem Termin gelöscht.",
    en: "An AI checks the information your practice provides for this appointment type, and your own preparation notes. This creates a personal checklist. Health information isn't read or assessed, only logistics like documents, fasting or forms. Your checklist and your notes are deleted after the appointment."
  },
  consentReminderParagraph: {
    de: "Sie werden an jedem Punkt erinnert, wenn er fällig ist. Sie können Erinnerungen einzeln ausschalten.",
    en: "You'll be reminded of each item when it's due. You can turn off reminders individually."
  },
  consentFootnote: {
    de: "Wird einmal gefragt. Sie können die Vorbereitungshilfe jederzeit in den Einstellungen ausschalten. Für jedes Familienmitglied gibt es eine eigene Einstellung.",
    en: "Asked once. You can turn off preparation help at any time in settings. Each family member has their own setting."
  },
  consentAccept: { de: "Vorbereitungshilfe einschalten", en: "Turn on preparation help" },
  consentDecline: { de: "Nicht jetzt", en: "Not now" },

  addNoteTitle: { de: "Vorbereitungsnotiz hinzufügen", en: "Add preparation note" },
  editNoteTitle: { de: "Vorbereitungsnotiz bearbeiten", en: "Edit preparation note" },
  noteComposerIntro: {
    de: "Notieren Sie, was Ihre Praxis Ihnen zur Vorbereitung gesagt hat, zum Beispiel beim letzten Termin.",
    en: "Note down what your practice told you about preparation, for example at your last appointment."
  },
  noteFieldLabel: { de: "Ihre Notiz", en: "Your note" },
  examplesLabel: { de: "Vorschläge", en: "Suggestions" },
  noteHelperText: {
    de: "Nur für die Vorbereitung, nicht für Beschwerden. Eine KI macht daraus Punkte für Ihre Checkliste. Die Notiz wird nach dem Termin gelöscht.",
    en: "Only for preparation, not for symptoms. An AI turns this into items for your checklist. The note will be deleted after the appointment."
  },
  noteValidationMsg: { de: "Bitte geben Sie mindestens 3 Zeichen ein.", en: "Please enter at least 3 characters." },
  save: { de: "Speichern", en: "Save" },
  cancel: { de: "Abbrechen", en: "Cancel" },

  whyDefault: {
    de: (type) => `Dieser Punkt steht auf der allgemeinen Liste für die Terminart „${type}“. Die Liste wird von Doctolib erstellt und medizinisch geprüft.`,
    en: (type) => `This item is on the general list for the appointment type “${type}”. The list is created by Doctolib and medically reviewed.`
  },
  whyPracticeIntro: {
    de: (practice, type) => `Eine KI hat diesen Punkt in den Informationen von ${practice} zur Terminart „${type}“ gefunden. Er stammt aus diesem Satz:`,
    en: (practice, type) => `An AI found this item in ${practice}'s information for the appointment type “${type}”. It comes from this sentence:`
  },
  whyPracticeLowNote: {
    de: "Der Satz ist nicht eindeutig. Bitte klären Sie mit Ihrer Praxis, ob er für Sie gilt.",
    en: "This sentence isn't clear. Please check with your practice whether it applies to you."
  },
  whyNoteIntro: {
    de: "Eine KI hat diesen Punkt in Ihrer Vorbereitungsnotiz gefunden. Er stammt aus dieser Notiz:",
    en: "An AI found this item in your preparation note. It comes from this note:"
  },
  whyNoteFootnote: {
    de: "Die Notiz wird nach dem Termin gelöscht.",
    en: "The note will be deleted after the appointment."
  },
  whyReminderFromSource: {
    de: (when) => `Erinnerung: ${when}. Der Zeitpunkt steht im zitierten Text.`,
    en: (when) => `Reminder: ${when}. The time is stated in the quoted text.`
  },
  whyReminderFromDefault: {
    de: (when, group) => `Erinnerung: ${when}. Der Text nennt keinen Zeitpunkt, deshalb gilt der Standard für „${group}“.`,
    en: (when, group) => `Reminder: ${when}. The text doesn't name a time, so the default for “${group}” applies.`
  },
  whyReminderUnclear: {
    de: (when) => `Erinnerung: ${when}. Ihre Notiz nennt keinen Zeitpunkt.`,
    en: (when) => `Reminder: ${when}. Your note doesn't name a time.`
  },
  whyMedicationPauseUnclear: {
    de: "Ihre Notiz nennt keinen Zeitpunkt. Bitte klären Sie mit Ihrer Praxis, wann Sie das Medikament pausieren.",
    en: "Your note doesn't name a time. Please check with your practice when to pause the medication."
  },

  feedbackQuestionPractice: { de: "Gibt dieser Punkt den Satz richtig wieder?", en: "Does this item reflect the sentence correctly?" },
  feedbackQuestionNote: { de: "Gibt dieser Punkt Ihre Notiz richtig wieder?", en: "Does this item reflect your note correctly?" },
  yes: { de: "Ja", en: "Yes" },
  no: { de: "Nein", en: "No" },
  feedbackThanks: { de: "Danke für Ihre Rückmeldung.", en: "Thanks for your feedback." },
  feedbackReason_not_in_text: { de: "Der Punkt steht so nicht im Text", en: "The item isn't in the text like this" },
  feedbackReason_wrong_timing: { de: "Der Zeitpunkt stimmt nicht", en: "The timing is wrong" },
  feedbackReason_something_else: { de: "Etwas anderes", en: "Something else" },
  send: { de: "Senden", en: "Send" },
  feedbackMarkedUnsure: {
    de: "Danke. Der Punkt ist jetzt als unsicher markiert. Bitte klären Sie ihn mit Ihrer Praxis.",
    en: "Thanks. The item is now marked as uncertain. Please check it with your practice."
  },
  editNoteLink: { de: "Notiz bearbeiten", en: "Edit note" },

  deleteNoteTitle: { de: "Notiz löschen?", en: "Delete note?" },
  deleteNoteBody: {
    de: "Punkte aus dieser Notiz und ihre Erinnerungen werden aus Ihrer Checkliste entfernt.",
    en: "Items from this note and their reminders will be removed from your checklist."
  },

  pushMessage: {
    de: (name) => `Erinnerung an den Termin für ${name}`,
    en: (name) => `Reminder for ${name}'s appointment`
  },

  group_prepare_now: { de: "Jetzt vorbereiten", en: "Organise now" },
  group_before_appointment: { de: "Vor dem Termin", en: "Before the day" },
  group_appointment_day: { de: "Am Tag des Termins", en: "On the day" },
  doneHeading: { de: "Erledigt", en: "Done" },

  itemDoneLive: { de: (title) => `${title}: erledigt.`, en: (title) => `${title}: done.` },
  itemReopenedLive: { de: (title) => `${title}: wieder offen.`, en: (title) => `${title}: open again.` }
};

function t(key, ...args) {
  const entry = COPY[key][LANG];
  return typeof entry === "function" ? entry(...args) : entry;
}

// framing is "model output" per the payloads doc, so the fixtures carry it,
// but it must track the sources actually present in results (practice/
// patient/both) as notes are added, edited or deleted — so it's recomputed
// here rather than read as a static fixture field.
const FRAMING = {
  high_confidence: {
    practice: { de: "Das hat Ihre Praxis für diese Terminart angegeben.", en: "This is what your practice has stated for this appointment type." },
    both: { de: "Hinweise Ihrer Praxis und aus Ihren Notizen.", en: "Information from your practice and from your notes." },
    patient: { de: "Hinweise aus Ihren Notizen.", en: "Information from your notes." }
  },
  mixed_confidence: {
    practice: { de: "Hinweise Ihrer Praxis für diese Terminart. Bitte prüfen Sie die markierten Punkte.", en: "Information from your practice for this appointment type. Please check the marked items." },
    both: { de: "Hinweise Ihrer Praxis und aus Ihren Notizen. Bitte prüfen Sie die markierten Punkte.", en: "Information from your practice and from your notes. Please check the marked items." },
    patient: { de: "Hinweise aus Ihren Notizen. Bitte prüfen Sie die markierten Punkte.", en: "Information from your notes. Please check the marked items." }
  },
  low_confidence: { any: { de: "Bei diesen Punkten sind wir unsicher. Bitte prüfen Sie sie vor Ihrem Termin.", en: "We're not sure about these items. Please check them before your appointment." } },
  no_result: { any: { de: "Keine zusätzlichen Hinweise von Ihrer Praxis.", en: "No extra information from your practice." } },
  error: { any: { de: "Die Informationen Ihrer Praxis konnten nicht geladen werden.", en: "Your practice's information couldn't be loaded." } }
};

function computeFraming() {
  const p = state.payload;
  if (p.state === "no_result") return FRAMING.no_result.any[LANG];
  if (p.state === "error") return FRAMING.error.any[LANG];
  // high_confidence/mixed_confidence/low_confidence are derived from the
  // bands actually present in results, not trusted as a static fixture
  // field — an unclear note (band "low") added next to a high practice item
  // must read as mixed, never silently stay "high_confidence".
  const bands = p.results.map((r) => r.band);
  const hasHigh = bands.includes("high");
  const hasLow = bands.includes("low");
  const effectiveState = hasHigh && hasLow ? "mixed_confidence" : hasLow ? "low_confidence" : "high_confidence";
  if (effectiveState === "low_confidence") return FRAMING.low_confidence.any[LANG];
  const hasPractice = p.results.some((r) => r.source === "practice");
  const hasPatient = p.results.some((r) => r.source === "patient");
  const key = hasPractice && hasPatient ? "both" : hasPatient ? "patient" : "practice";
  return FRAMING[effectiveState][key][LANG];
}

/* ---------------------------- Due times & reminders ---------------------------- */

// Whole calendar days between the flow's simulated "today" and the
// appointment (ignoring time of day).
function daysUntilAppointment() {
  const today = new Date(SIMULATED_TODAY + "T00:00:00");
  const appt = new Date(state.ctx.appointment_datetime);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const apptMid = new Date(appt.getFullYear(), appt.getMonth(), appt.getDate());
  return Math.round((apptMid - todayMid) / 86400000);
}

// An item's default due time, as a plain "days before the appointment"
// number (0 = the appointment day itself), or null if it has none at all.
// Per design-context-brief.md §5: the payload's due_before if given (hours
// round up to 1 day before, since their due time can fall before that day's
// push), else the group default — before_appointment: 3 days before;
// appointment_day: the appointment day; prepare_now: 1 week before, unless
// the appointment is under a week away, in which case there's no reminder at
// all (the item just sorts to the top of its group instead). Unclear items
// have no group, but always default to 1 day before — they still need a
// reminder, just not a group to derive one from.
function reminderDueDays(item) {
  if (item.action === "unclear") return 1;
  if (item.group == null) return null;
  if (item.due_before) {
    return item.due_before.unit === "hours" ? 1 : item.due_before.value;
  }
  if (item.group === "prepare_now") return daysUntilAppointment() < 7 ? null : 7;
  if (item.group === "before_appointment") return 3;
  return 0; // appointment_day
}

function labelForDays(days) {
  // The appointment_day group default's push actually arrives 1 hour before
  // the appointment (not at some unspecified point that day), so it's
  // labelled the same way as the "1 Stunde vorher" ladder choice.
  if (days === 0) return t("reminderOption_hour_before");
  if (days === 1) return t("whenOneDayBefore");
  if (days === 7) return t("reminderOption_week_before");
  return t("whenNDaysBefore", days);
}

// The literal time the source text states, in hours before the appointment
// (independent of the collapsed day-based default above) — null if the item
// has no explicit due_before at all (a group-default-only item).
function sourceDueHours(item) {
  if (!item.due_before) return null;
  return item.due_before.unit === "hours" ? item.due_before.value : item.due_before.value * 24;
}

// The reminder actually in effect right now: the default, unless the patient
// overrode it via the per-item sheet. Interface state, not model output.
// Shape: null (no reminder), { days: N } or { hours: 1 }. reminderOverrides
// starts from the fixture's reminders_off ids (mapped to "none").
function effectiveReminder(item) {
  const override = state.reminderOverrides.get(item.id);
  if (override === "none") return null;
  if (override === "week") return { days: 7 };
  if (override === "three_days") return { days: 3 };
  if (override === "one_day") return { days: 1 };
  if (override === "one_hour") return { hours: 1 };
  if (override && typeof override === "object" && override.other != null) return { days: override.other };
  const defaultDays = reminderDueDays(item);
  return defaultDays === null ? null : { days: defaultDays };
}

function labelForReminder(r) {
  return r.hours === 1 ? t("reminderOption_hour_before") : labelForDays(r.days);
}

// The per-item reminder sheet's fixed ladder, always in the same time order
// (1 week / 3 days / 1 day / 1 hour before) — there's no separate "default"
// entry; whichever of these already matches the item's own default is just
// pre-selected (see ladderKeyForDays). For an item with an explicit
// due_before from the source text, options later than that time are
// excluded — the patient can move the reminder earlier, never later than
// what the practice or note actually said. A group-default-only item (no
// source due_before) gets every option, including ones later than its own
// default. Returns null if the item has no due time at all (nothing to pick
// a reminder for).
function itemReminderOptions(item) {
  if (reminderDueDays(item) === null) return null;
  const sourceHours = sourceDueHours(item);
  const LADDER = [
    { key: "week", label: t("reminderOption_week_before"), hours: 168 },
    { key: "three_days", label: t("whenNDaysBefore", 3), hours: 72 },
    { key: "one_day", label: t("whenOneDayBefore"), hours: 24 },
    { key: "one_hour", label: t("reminderOption_hour_before"), hours: 1 }
  ];
  return LADDER.filter((o) => sourceHours === null || o.hours >= sourceHours);
}

// Which ladder key (if any) a plain day count corresponds to — 0 maps to
// "one_hour" since the appointment_day default is itself labelled "1 Stunde
// vorher" (the bundled push fires 1 hour before). A non-standard count (e.g.
// a note's own "2 Tage") matches none of these, so the sheet opens on
// "Andere …" pre-filled with that value instead.
function ladderKeyForDays(days) {
  if (days === 7) return "week";
  if (days === 3) return "three_days";
  if (days === 1) return "one_day";
  if (days === 0) return "one_hour";
  return null;
}

// The minimum day count the "Andere …" stepper allows: never later than an
// explicit source due time (rounded up to whole days); otherwise 1.
function minOtherDays(item) {
  const sourceHours = sourceDueHours(item);
  return sourceHours === null ? 1 : Math.max(1, Math.ceil(sourceHours / 24));
}

/* ---------------------------- Helpers ---------------------------- */

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Typographic quotes around a verbatim quote, language-aware: German uses
// „...“, English uses “...” — never a straight ".
function quoteWrap(text) {
  return LANG === "de" ? `„${text}“` : `“${text}”`;
}

function todayISO() {
  return SIMULATED_TODAY;
}

function formatDatePart(iso) {
  const d = new Date(iso);
  const locale = LANG === "de" ? "de-DE" : "en-GB";
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(d);
  const year = d.getFullYear();
  return LANG === "de" ? `${weekday}, ${day}. ${month} ${year}` : `${weekday}, ${day} ${month} ${year}`;
}

function formatTimePart(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatNoteDate(iso) {
  const locale = LANG === "de" ? "de-DE" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function formatLockDate() {
  const locale = LANG === "de" ? "de-DE" : "en-GB";
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(SIMULATED_TODAY + "T00:00:00"));
}

/* ---------------------------- State ---------------------------- */

function freshState() {
  const f = fx();
  const itemState = {};
  (f.interfaceState.ticked || []).forEach((id) => {
    itemState[id] = { ticked: true, hidden: false };
  });
  const reminderOverrides = new Map();
  (f.interfaceState.reminders_off || []).forEach((id) => reminderOverrides.set(id, "none"));
  return {
    screen: FLOWS[FLOW_ID].entry === "push" ? "push" : "appointment", // push | appointment | checklist
    sheet: null, // consent | notecomposer | reminder | itemreminder | why
    dialog: null, // delete
    consentGiven: !!f.context.consent_given,
    ctx: clone(f.context),
    payload: clone(f.payload),
    itemState, // id -> { ticked, hidden }
    reminderOverrides, // id -> "none" | "week" | "three_days" | "one_day" | "one_hour" | { other: N }
    checklistPhase: "idle", // idle | waiting | resolved
    noteComposer: { mode: "add", editingId: null, text: "", error: "" },
    deleteTarget: null,
    why: null, // { kind, item }
    itemFeedback: new Map(), // id -> "yes" | "sent" (persists across sheet opens)
    whyFeedbackStep: "initial", // initial | followup — reset each time the why-sheet opens
    whyFeedbackReason: null, // selected reason key in the practice-item followup
    reminderDraft: [], // general-reminder sheet's in-progress selection
    itemReminderTarget: null, // per-item reminder sheet's target item id
    itemReminderDraft: null, // per-item reminder sheet's in-progress choice key
    itemReminderOtherDays: null, // "Andere …" stepper's in-progress day count
    liveMessage: "",
    focusNotesHeadingNext: false
  };
}

function isColdStart() {
  return state.payload.state === "no_result" && state.ctx.default_items.length === 0;
}

function normalizeItem(raw) {
  if (raw.source === "practice" || raw.source === "patient") return raw;
  return { id: raw.id, title: raw.title, source: "default", action: raw.action, group: raw.group, due_before: null, band: null };
}

function itemKind(item) {
  if (item.source === "default") return "default";
  if (item.source === "practice") return item.band === "high" ? "practice-high" : "practice-low";
  if (item.action === "unclear") return "unclear";
  return item.band === "high" ? "note" : "note-low";
}

// Dismissed ("Trifft auf mich nicht zu") items stay in the list — they
// collapse in place into a compact row instead of disappearing — so this no
// longer filters by hidden state; renderItemCard decides how to draw each one.
function visibleItems() {
  const p = state.payload;
  if (p.state === "error" || isColdStart()) return [];
  const def = state.ctx.default_items.map(normalizeItem);
  const results = p.results.map(normalizeItem);
  return [...def, ...results];
}

// Splits visible items into the three named groups (in spec order, each
// shown only if non-empty) plus anything ungrouped (the unclear-note item,
// which has no group). Within a group: practice, then default, then note —
// except in "prepare_now", where an item with no reminder at all (appointment
// under a week away) sorts above everything else in that group.
function groupItems() {
  const items = visibleItems();
  const byGroup = { prepare_now: [], before_appointment: [], appointment_day: [] };
  const ungrouped = [];
  items.forEach((it) => {
    if (it.group && byGroup[it.group]) byGroup[it.group].push(it);
    else ungrouped.push(it);
  });
  GROUPS.forEach((g) => byGroup[g].sort((a, b) => SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source]));
  byGroup.prepare_now.sort((a, b) => (reminderDueDays(a) === null ? 0 : 1) - (reminderDueDays(b) === null ? 0 : 1));
  return { byGroup, ungrouped };
}

// Dismissed items don't count as "open" (they don't apply), nor as done.
function unresolvedCount() {
  return visibleItems().filter((it) => {
    const st = state.itemState[it.id];
    return !(st && (st.ticked || st.hidden));
  }).length;
}

function findItem(id) {
  const all = [...state.payload.results, ...state.ctx.default_items.map((d) => ({ ...d, source: "default" }))];
  return all.find((i) => i.id === id);
}

function openSheet(name, opts) {
  lastFocusedEl = document.activeElement;
  state.sheet = name;
  if (opts) Object.assign(state, opts);
  render();
  focusOverlay();
}

function closeSheet() {
  state.sheet = null;
  state.why = null;
  render();
  if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();
}

function openDialog(name, opts) {
  lastFocusedEl = document.activeElement;
  state.dialog = name;
  if (opts) Object.assign(state, opts);
  render();
  focusOverlay();
}

function closeDialog() {
  state.dialog = null;
  render();
  if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();
}

function focusOverlay() {
  requestAnimationFrame(() => {
    const overlay = document.querySelector(".sheet, .dialog");
    if (overlay) {
      const focusable = overlay.querySelector("textarea, button, [tabindex]");
      if (focusable) focusable.focus();
    }
  });
}

function runModelReRun() {
  if (isColdStart()) {
    render();
    return;
  }
  state.checklistPhase = "waiting";
  state.liveMessage = t("waitingStatus");
  render();
  setTimeout(() => {
    state.checklistPhase = "resolved";
    state.liveMessage = t("checklistUpdated");
    render();
  }, WAIT_MS);
}

function enterChecklistFlow() {
  state.screen = "checklist";
  if (isColdStart()) {
    state.checklistPhase = "resolved";
  } else if (state.checklistPhase !== "resolved") {
    state.checklistPhase = "waiting";
    state.liveMessage = t("waitingStatus");
    setTimeout(() => {
      if (state.screen === "checklist") {
        state.checklistPhase = "resolved";
        render();
      }
    }, WAIT_MS);
  }
  render();
}

// Splits a note into sentences, so a day/hour count only applies to the
// concept named in that same sentence, not the whole note.
function splitSentences(text) {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [text];
}

function sentenceMatchesConcept(sentence, concept) {
  const lower = sentence.toLowerCase();
  return concept.keywords.some((kw) =>
    concept.wholeWord ? new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower) : lower.includes(kw)
  );
}

// A day or hour count named in the sentence, within the schema's ranges
// (days 1-30, hours 1-72) — or null if none is named.
function extractDueBefore(sentence) {
  const dayMatch = sentence.match(/(\d+)\s*(tage?|days?)/i);
  if (dayMatch) {
    const n = parseInt(dayMatch[1], 10);
    if (n >= 1 && n <= 30) return { value: n, unit: "days" };
  }
  const hourMatch = sentence.match(/(\d+)\s*(stunden?|hours?)/i);
  if (hourMatch) {
    const n = parseInt(hourMatch[1], 10);
    if (n >= 1 && n <= 72) return { value: n, unit: "hours" };
  }
  return null;
}

// Simulates the AI extraction step for a note: there is no live NLP.
// resolvedNoteConcepts() (fixtures.js) matches keywords (case-insensitive,
// German and English) against the sentence they appear in — mentioning a
// concept produces that concept's fixture item, quoted with what the patient
// actually wrote, using a day/hour count from that same sentence if it names
// one (never fabricated). A flow's resolveOverride for a concept (e.g. Flow
// 2's medication-pause wording) gets the matched sentence and extracted due
// time and returns null (use the generic item) or a fully-formed item
// (including its own lowConfidence verdict) built only from what that
// sentence says. Otherwise a concept flagged requiresTime (medication pause:
// meaningless without a time) drops to low confidence, with the hedge, when
// its sentence names no day/hour count. A concept flagged noItem (the
// insurance card, already a default item) is recognized but produces
// nothing, per the system prompt's duplicate-avoidance rule. If nothing at
// all matches, the note becomes the low-confidence "unclear note" item
// instead of a guess (system prompt §4). Always returns an array (possibly
// empty) of result-shaped objects sharing source_quote = the full note text.
function simulatedItemForNote(note) {
  const sentences = splitSentences(note.text);
  const concepts = resolvedNoteConcepts();
  const items = [];
  let anyMatched = false;
  concepts.forEach((c) => {
    const sentence = sentences.find((s) => sentenceMatchesConcept(s, c));
    if (!sentence) return;
    anyMatched = true;
    if (c.noItem) return;
    const dueBefore = extractDueBefore(sentence);
    const overridden = c.resolveOverride ? c.resolveOverride(sentence, dueBefore) : null;
    const resolvedItem = overridden || c.item;
    const lowConfidence = overridden ? overridden.lowConfidence : c.requiresTime && !dueBefore;
    items.push({
      id: `sim-${note.id}-${c.key}`,
      title: resolvedItem.title,
      source: "patient",
      action: resolvedItem.action,
      group: resolvedItem.group,
      due_before: dueBefore,
      band: lowConfidence ? "low" : "high",
      confidence: lowConfidence ? 0.4 : 0.8,
      source_quote: note.text
    });
  });
  if (items.length > 0 || anyMatched) return items;
  return [
    {
      id: `sim-${note.id}`,
      title: note.text,
      source: "patient",
      action: "unclear",
      group: null,
      due_before: null,
      band: "low",
      confidence: 0.2,
      source_quote: note.text
    }
  ];
}

function removeItemsForNoteText(text) {
  state.payload.results = state.payload.results.filter((r) => !(r.source === "patient" && r.source_quote === text));
}

/* ---------------------------- Rendering ---------------------------- */

function render() {
  document.documentElement.lang = LANG;
  const screen = document.getElementById("screen");

  const prevScrollEl = screen.querySelector(".body-scroll");
  const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

  if (state.screen === "push") {
    screen.innerHTML = renderPushScreen();
  } else {
    screen.innerHTML = renderStatusAndAppbar() + renderScreenBody() + renderOverlays();
  }

  // Preserve scroll position across re-renders that stay on the same
  // screen (ticking an item, opening a sheet, etc.) — a genuine navigation
  // to a different screen still starts scrolled to the top.
  if (prevScreenForScroll === state.screen) {
    const newScrollEl = screen.querySelector(".body-scroll");
    if (newScrollEl) newScrollEl.scrollTop = prevScrollTop;
  }
  prevScreenForScroll = state.screen;

  if (state.sheet && state.sheet !== prevSheet) {
    const sh = screen.querySelector(".sheet");
    if (sh) sh.classList.add("enter");
  }
  prevSheet = state.sheet || null;

  // "Mehr anzeigen" only makes sense when the 2-line clamp is actually
  // cutting the quote off — a short quote that already fits gets no toggle.
  screen.querySelectorAll(".quote-toggle").forEach((btn) => {
    const quoteEl = document.getElementById("quote-" + btn.dataset.id);
    if (quoteEl && quoteEl.scrollHeight <= quoteEl.clientHeight + 1) btn.style.display = "none";
  });

  const checklistArrived = state.screen === "checklist" && prevPhase === "waiting" && state.checklistPhase === "resolved";
  prevPhase = state.screen === "checklist" ? state.checklistPhase : null;
  if (checklistArrived) {
    screen.querySelectorAll(".body-scroll .framing, .body-scroll .item-card").forEach((el, i) => {
      el.style.setProperty("--i", i);
      el.classList.add("arrive");
    });
  }

  const live = document.getElementById("live-region");
  live.textContent = state.liveMessage;

  if (state.focusNotesHeadingNext) {
    state.focusNotesHeadingNext = false;
    requestAnimationFrame(() => {
      const h = document.getElementById("notes-heading");
      if (h) h.focus();
    });
  }
}

function renderStatusAndAppbar() {
  const statusbar = `<div class="statusbar"><span>9:41</span><span class="glyphs">●●●&nbsp;LTE&nbsp;🔋</span></div>`;
  let appbar = "";
  if (state.screen === "appointment") {
    appbar = `<div class="appbar"><span class="spacer"></span><span class="title">${esc(t("appointmentInfoTitle"))}</span><span class="spacer"></span></div>`;
  } else if (state.screen === "checklist") {
    appbar = `<div class="appbar"><button class="back" data-action="back-to-appointment" aria-label="${esc(t("back"))}">‹</button><span class="title">${esc(t("prepTitleForName", state.ctx.patient_display_name))}</span><span class="spacer"></span></div>`;
  }
  return statusbar + appbar;
}

function renderScreenBody() {
  if (state.screen === "appointment") return renderAppointment();
  if (state.screen === "checklist") return renderChecklist();
  return "";
}

function renderAppointment() {
  const label = !state.consentGiven ? t("entryBefore") : t("entryAfter", unresolvedCount());
  // Flow 2's practice is a named GP, so it gets the doctor photo; the two MRT
  // flows are a radiology practice with no single named doctor to show.
  const usesPhoto = FLOW_ID === "flow2";
  const avatar = usesPhoto
    ? `<img src="assets/doctor-avatar.jpg" alt="" />`
    : `<div class="avatar-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M4 21V7l8-4 8 4v14M4 21h16M9 21v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;

  return `
  <div class="body-scroll">
    <div class="datestrip">
      <span class="ds-item"><svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>${esc(formatDatePart(state.ctx.appointment_datetime))}</span></span>
      <span class="ds-item"><svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${esc(formatTimePart(state.ctx.appointment_datetime))}</span></span>
    </div>
    <div class="appointment-body">
      <div class="doctor-row">
        ${avatar}
        <div>
          <div class="name">${esc(state.ctx.practice_name)}</div>
          <div class="role">${esc(state.ctx.appointment_type)}</div>
        </div>
      </div>
      <div class="actions-row">
        <span class="link move"><svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true"><path d="M4 4v6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 14a8 8 0 1 0 2-9.5L4 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${esc(t("reschedule"))}</span></span>
        <span class="link cancel"><svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18M8 3v4M16 3v4M9.5 13.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>${esc(t("cancelAppointment"))}</span></span>
      </div>
    </div>
    <div class="action-card-list">
      <div class="action-card" aria-disabled="true">
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 2h8l4 4v16H6V2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 18v-6m-2.5 2.5L12 12l2.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="label">${esc(t("uploadDocuments"))}</span>
        <span class="chevron">›</span>
      </div>
      <button class="action-card" data-action="open-entry" aria-haspopup="dialog">
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span class="label">${esc(label)}</span>
        <span class="chevron">›</span>
      </button>
      <div class="info-card flat">
        <h4>${esc(t("patientCardTitle"))}</h4>
        <div class="patient-row">
          <span class="patient-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" width="20" height="20"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>
          <div>
            <div class="patient-name">Tessa Beispiel</div>
            <div class="patient-status">${esc(t("patientStatus"))}</div>
          </div>
        </div>
        <div class="info-card-divider"></div>
        <span class="info-card-row">${esc(t("shareAppointmentDetails"))} <span class="chevron">›</span></span>
      </div>
      <div class="info-card flat">
        <h4>${esc(t("facilityDetailsTitle"))}</h4>
        <div class="info-subheading">${esc(t("addressLabel"))}</div>
        <p class="practice-name-line">${esc(state.ctx.practice_name)}</p>
        <p>${esc(mockFacilityAddress().street)}</p>
        <p>${esc(mockFacilityAddress().city)}</p>
        <span class="info-card-row">${esc(t("openMap"))}</span>
        <div class="info-card-divider"></div>
        <div class="info-subheading">${esc(t("billingTypesLabel"))}</div>
        <p>${esc(t("billingTypesValue"))}</p>
      </div>
    </div>
  </div>`;
}

// Mock address lines for the facility-details card — presentational "as
// today" page content, not part of the Vorbereitung feature's own contact
// data. Flow 2 uses its own street; the two MRT flows share Flow 1's.
function mockFacilityAddress() {
  if (FLOW_ID === "flow2") return { street: "Musterweg 2", city: "12345 Musterstadt" };
  return { street: "Musterstraße 12", city: "12345 Musterstadt" };
}

function renderPushScreen() {
  return `
  <div class="lockscreen">
    <div class="lock-time">9:41</div>
    <div class="lock-date">${esc(formatLockDate())}</div>
    <button class="notification-card" data-action="open-push">
      <div class="notif-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 21V7l8-4 8 4v14M4 21h16M9 21v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="notif-text">
        <div class="notif-title">Doctolib</div>
        <div class="notif-body">${esc(t("pushMessage", state.ctx.patient_display_name))}</div>
      </div>
    </button>
  </div>`;
}

function renderChecklist() {
  let body = "";
  if (state.checklistPhase === "waiting") body = renderWaitingBody();
  else if (state.payload.state === "error") body = renderFailureBody();
  else if (isColdStart()) body = renderColdStartBody();
  else body = renderResolvedBody();

  return `<div class="body-scroll">${body}</div>${renderFooter()}`;
}

// Brief §3's state table: waiting shows "default items in their groups," not
// a flat list. payload.results must stay untouched here (it already holds
// the fixture's final AI results) — only default_items are grouped and shown.
function renderWaitingDefaults() {
  const byGroup = { prepare_now: [], before_appointment: [], appointment_day: [] };
  state.ctx.default_items.map(normalizeItem).forEach((it) => {
    if (byGroup[it.group]) byGroup[it.group].push(it);
  });
  return GROUPS.map((g) =>
    byGroup[g].length
      ? `<div class="group-section">
          <h3 class="group-heading">${esc(t("group_" + g))}</h3>
          <div class="item-list">${byGroup[g].map((it) => renderItemCard(it)).join("")}</div>
        </div>`
      : ""
  ).join("");
}

function renderWaitingBody() {
  const hasDefaults = state.ctx.default_items.length > 0;
  const body = hasDefaults ? renderWaitingDefaults() : `<div class="card-stack">${renderContactCard()}${renderUrgentCard()}</div>`;
  return `
    <div class="status-line" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>${esc(t("waitingStatus"))}</span></div>
    <div class="item-list"><div class="item-card skeleton" aria-hidden="true">
      <div class="sk-row"><span class="sk-box"></span><span class="sk-bar" style="width:72%"></span></div>
      <span class="sk-bar sk-indent" style="width:44%"></span>
      <span class="sk-bar sk-indent" style="width:58%"></span>
    </div></div>
    <p class="framing sub" style="padding-top:0;">${esc(t("waitingSubline"))}</p>
    ${body}
    ${renderNotesSection()}
  `;
}

function renderFailureBody() {
  return `
    <div class="framing">
      <h2>${esc(computeFraming())}</h2>
      <p class="sub">${esc(t("failureSubline"))}</p>
    </div>
    <button class="retry-btn" data-action="retry-checklist">${esc(t("retry"))}</button>
    <div class="card-stack">
      ${renderContactCard()}
      ${renderUrgentCard()}
    </div>
  `;
}

function renderColdStartBody() {
  return `
    <div class="framing"><h2>${esc(t("coldStartHeading"))}</h2></div>
    <div class="card-stack">
      ${renderContactCard()}
      ${renderUrgentCard()}
    </div>
    ${renderNotesSection()}
  `;
}

function renderResolvedBody() {
  const sub = state.payload.state === "no_result" ? `<p class="sub">${esc(t("noResultSubline"))}</p>` : "";
  const { byGroup, ungrouped } = groupItems();
  const groupsHtml = GROUPS.map((g) => renderGroupSection(g, byGroup[g])).join("");
  const ungroupedHtml = ungrouped.length ? `<div class="item-list">${ungrouped.map((it) => renderItemCard(it)).join("")}</div>` : "";
  const anyVisible = GROUPS.some((g) => byGroup[g].length > 0) || ungrouped.length > 0;
  return `
    ${renderReminderLine()}
    <div class="framing"><h2>${esc(computeFraming())}</h2>${sub}</div>
    ${ungroupedHtml}
    ${groupsHtml}
    ${renderNotesSection()}
    ${anyVisible ? `<p class="closing-line">${esc(t("closingLine"))}</p>` : ""}
  `;
}

function renderReminderLine() {
  const gr = state.ctx.general_reminders;
  const label = gr.length === 0 ? t("addGeneralReminder") : t("generalReminderSet", gr.map((g) => t("reminderOption_" + g)).join(", "));
  return `<button class="reminder-line" data-action="open-reminder-sheet">${esc(label)}</button>`;
}

// The three buckets are mutually exclusive — dismissed wins over ticked, so
// a hidden item never also qualifies as "open" (it was appearing twice,
// once where it naturally sorted and once at the end).
function renderGroupSection(groupId, items) {
  if (items.length === 0) return "";
  const open = items.filter((it) => {
    const st = state.itemState[it.id];
    return !(st && (st.ticked || st.hidden));
  });
  const done = items.filter((it) => {
    const st = state.itemState[it.id];
    return st && st.ticked && !st.hidden;
  });
  const dismissed = items.filter((it) => state.itemState[it.id] && state.itemState[it.id].hidden);
  return `
  <div class="group-section">
    <h3 class="group-heading">${esc(t("group_" + groupId))}</h3>
    <div class="item-list">${open.map((it) => renderItemCard(it)).join("")}</div>
    ${done.length ? `<div class="done-heading">${esc(t("doneHeading"))}</div><div class="item-list">${done.map((it) => renderItemCard(it, true)).join("")}</div>` : ""}
    ${dismissed.length ? `<div class="item-list">${dismissed.map((it) => renderItemCard(it)).join("")}</div>` : ""}
  </div>`;
}

// `compact`: true for a ticked item — always visible (no collapse), just a
// muted checkbox+title row (plus the KI badge for practice/note items, no
// quote), no strikethrough. A dismissed item ("Trifft auf mich nicht zu")
// takes priority over both: it collapses in place into one compact muted row
// with "Rückgängig" to restore it, no timer — open.filter() already keeps it
// out of the open bucket, and the caller places dismissed items at the end
// of the group, below "Erledigt".
function renderItemCard(item, compact) {
  const st = state.itemState[item.id] || { ticked: false, hidden: false };
  const kind = itemKind(item);
  const isAi = kind === "practice-high" || kind === "practice-low" || kind === "note" || kind === "note-low";
  if (st.hidden) {
    return `
    <div class="item-card dismissed" data-item-id="${item.id}">
      <span class="dismissed-text">${esc(t("dismissItem"))} · <button data-action="undo-dismiss" data-id="${item.id}">${esc(t("undoDismiss"))}</button></span>
    </div>`;
  }
  if (compact) {
    return `
    <div class="item-card done-compact" data-item-id="${item.id}">
      <button class="item-checkbox checked" role="checkbox" aria-checked="true" aria-label="${esc(item.title)}" data-action="toggle-tick" data-id="${item.id}"></button>
      ${isAi ? `<span class="ki-badge-inline muted" aria-label="${esc(t("kiBadgeAriaLabel"))}">${esc(t("kiBadge"))}</span>` : ""}
      <span class="item-title-compact">${esc(item.title)}</span>
    </div>`;
  }

  let sourceLine = "";
  if (kind === "default") sourceLine = `<div class="item-source">${esc(t("defaultLabel"))}</div>`;
  if (kind === "practice-high") sourceLine = `<div class="item-source"><span class="ki-badge-inline" aria-label="${esc(t("kiBadgeAriaLabel"))}">${esc(t("kiBadge"))}</span>${esc(t("fromPractice", state.ctx.practice_name))}</div>`;
  if (kind === "practice-low") sourceLine = `<div class="item-source"><span class="ki-badge-inline" aria-label="${esc(t("kiBadgeAriaLabel"))}">${esc(t("kiBadge"))}</span>${esc(t("fromPractice", state.ctx.practice_name))}<span class="chip hedge">${esc(t("hedge"))}</span></div>`;
  if (kind === "note") sourceLine = `<div class="item-source"><span class="ki-badge-inline" aria-label="${esc(t("kiBadgeAriaLabel"))}">${esc(t("kiBadge"))}</span>${esc(t("fromNote"))}</div>`;
  if (kind === "note-low") sourceLine = `<div class="item-source"><span class="ki-badge-inline" aria-label="${esc(t("kiBadgeAriaLabel"))}">${esc(t("kiBadge"))}</span>${esc(t("fromNote"))}<span class="chip hedge">${esc(t("hedge"))}</span></div>`;
  if (kind === "unclear") sourceLine = `<div class="item-source">${esc(t("unclearNote"))}<span class="chip hedge">${esc(t("hedge"))}</span></div>`;

  let quote = "";
  if (isAi) {
    quote = `<p class="quote-line" id="quote-${item.id}">${quoteWrap(esc(item.source_quote))}</p>
      <button class="quote-toggle" data-action="toggle-quote" data-id="${item.id}">${esc(t("showMore"))}</button>`;
  }

  return `
  <div class="item-card" data-item-id="${item.id}">
    <div class="item-top">
      <button class="item-checkbox${st.ticked ? " checked" : ""}" role="checkbox" aria-checked="${st.ticked}" aria-label="${esc(item.title)}" data-action="toggle-tick" data-id="${item.id}"></button>
      <div class="item-main">
        <div class="item-title">${esc(item.title)}</div>
        ${sourceLine}
        ${quote}
        ${renderItemReminderLine(item)}
      </div>
    </div>
    <div class="item-actions">
      <button data-action="dismiss-item" data-id="${item.id}">${esc(t("dismissItem"))}</button>
      <button data-action="why-item" data-id="${item.id}" data-kind="${kind}">${esc(t("whySeeThis"))}</button>
    </div>
  </div>`;
}

// One tappable line with a bell icon, replacing the old on/off switch:
// "Erinnerung: {current} ›". Renders nothing if the item has no due time at
// all (unclear items, or a prepare_now item too close to the appointment).
function renderItemReminderLine(item) {
  const defaultDays = reminderDueDays(item);
  if (defaultDays === null) return "";
  const eff = effectiveReminder(item);
  const label = eff === null ? t("noReminderOption") : labelForReminder(eff);
  return `<button class="item-reminder-line" data-action="open-item-reminder" data-id="${item.id}">
    <span class="reminder-label"><svg class="bell-icon" viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.2c0 .6-.2 1.2-.6 1.7L4 16h16l-1.4-2.1c-.4-.5-.6-1.1-.6-1.7V9a6 6 0 0 0-6-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>${esc(t("reminderPrefix"))}: ${esc(label)}</span>
    <span class="chevron" aria-hidden="true">›</span>
  </button>`;
}

function renderNotesSection() {
  const notes = state.ctx.patient_notes;
  if (notes.length === 0) return "";
  const rows = notes
    .map(
      (n) => `
    <div class="note-row">
      <div class="text">${esc(n.text)}</div>
      <p class="note-date">${esc(t("notedOn", formatNoteDate(n.created_on)))}</p>
      <div class="row-actions">
        <button data-action="edit-note" data-id="${n.id}" aria-label="${esc(t("editNoteAriaLabel", n.text.slice(0, 40)))}">${esc(t("edit"))}</button>
        <button class="delete" data-action="delete-note" data-id="${n.id}" aria-label="${esc(t("deleteNoteAriaLabel", n.text.slice(0, 40)))}">${esc(t("delete"))}</button>
      </div>
    </div>`
    )
    .join("");
  return `
  <div class="notes-section">
    <h3 id="notes-heading" tabindex="-1">${esc(t("notesHeading"))}</h3>
    ${rows}
    <p class="notes-footnote">${esc(t("notesFootnote"))}</p>
  </div>`;
}

function renderContactCard() {
  return `
  <div class="info-card">
    <h4>${esc(t("contactCardTitle"))}</h4>
    <p>${esc(state.ctx.practice_name)}</p>
    ${state.ctx.practice_contact_lines.map((l) => `<p>${esc(l)}</p>`).join("")}
    <p class="disclaimer">${esc(t("contactDisclaimer"))}</p>
  </div>`;
}

function renderUrgentCard() {
  return `
  <div class="info-card urgent">
    <h4>${esc(t("urgentTitle"))}</h4>
    <p>${esc(t("urgentText"))}</p>
  </div>`;
}

function renderFooter() {
  const notes = state.ctx.patient_notes;
  const atLimit = notes.length >= 5;
  return `
  <div class="checklist-footer">
    <button data-action="open-note-composer" ${atLimit ? "disabled" : ""}>${esc(t("addNote"))}</button>
    ${atLimit ? `<span class="notes-limit-msg">${esc(t("noteLimitMsg"))}</span>` : ""}
  </div>`;
}

/* ---------------------------- Overlays ---------------------------- */

function renderOverlays() {
  let out = "";
  if (state.sheet === "consent") out += renderConsentSheet();
  if (state.sheet === "notecomposer") out += renderNoteComposerSheet();
  if (state.sheet === "reminder") out += renderReminderSheet();
  if (state.sheet === "itemreminder") out += renderItemReminderSheet();
  if (state.sheet === "why") out += renderWhySheet();
  if (state.dialog === "delete") out += renderDeleteDialog();
  return out;
}

function renderConsentSheet() {
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="consent-title">${esc(t("prepTitle"))}</h2>
        <button class="sheet-close" data-action="decline-consent" aria-label="${esc(t("close"))}">✕</button>
      </div>
      <div class="sheet-illustration" aria-hidden="true"></div>
      <h3 class="heading">${esc(t("consentHeading", state.ctx.patient_display_name))}</h3>
      <p class="body-text">${esc(t("consentBody"))}</p>
      <p class="body-text">${esc(t("consentReminderParagraph"))}</p>
      <p class="footnote">${esc(t("consentFootnote"))}</p>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="accept-consent">${esc(t("consentAccept"))}</button>
        <button class="btn-text" data-action="decline-consent">${esc(t("consentDecline"))}</button>
      </div>
    </div>
  </div>`;
}

function renderNoteComposerSheet() {
  const nc = state.noteComposer;
  const isAdd = nc.mode === "add";
  const title = isAdd ? t("addNoteTitle") : t("editNoteTitle");
  let examples = "";
  if (isAdd) {
    // Only the two universal chips from brief §5 — participants write the
    // note themselves, so no flow-specific chip hands them the answer.
    const chips = [NOTE_EXAMPLES.medication[LANG], NOTE_EXAMPLES.vaccineCard[LANG]];
    examples = `<div class="example-row">
        <span class="ex-label">${esc(t("examplesLabel"))}</span>
        ${chips.map((c) => `<button class="example-chip" data-action="fill-example-note" data-text="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>`;
  }
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="note-title">${esc(title)}</h2>
        <button class="sheet-close" data-action="close-sheet" aria-label="${esc(t("close"))}">✕</button>
      </div>
      <p class="intro">${esc(t("noteComposerIntro"))}</p>
      <div class="field-label-row">
        <label for="note-field">${esc(t("noteFieldLabel"))}</label>
        <span class="counter">${nc.text.length}/160</span>
      </div>
      <textarea id="note-field" class="field" maxlength="160" data-action="note-text-input">${esc(nc.text)}</textarea>
      <div class="validation-msg">${nc.error ? esc(nc.error) : ""}</div>
      ${examples}
      <p class="helper-text">${esc(t("noteHelperText"))}</p>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="save-note">${esc(t("save"))}</button>
        <button class="btn-text" data-action="close-sheet">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

function renderReminderSheet() {
  const opts = ["week_before", "day_before", "hour_before"];
  const checked = state.reminderDraft;
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="reminder-title">${esc(t("generalReminderTitle"))}</h2>
        <button class="sheet-close" data-action="close-sheet" aria-label="${esc(t("close"))}">✕</button>
      </div>
      <p class="intro">${esc(t("generalReminderIntro"))}</p>
      <div class="reminder-options">
        ${opts
          .map(
            (o) => `<label class="reminder-option">
          <input type="checkbox" data-action="toggle-reminder-draft" data-value="${o}" ${checked.includes(o) ? "checked" : ""} />
          <span>${esc(t("reminderOption_" + o))}</span>
        </label>`
          )
          .join("")}
      </div>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="save-reminder">${esc(t("save"))}</button>
        <button class="btn-text" data-action="close-sheet">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

function renderItemReminderSheet() {
  const item = findItem(state.itemReminderTarget);
  const ladder = itemReminderOptions(item) || [];
  const current = state.itemReminderDraft;
  const radio = (key, label) => `<label class="reminder-option">
          <input type="radio" name="item-reminder" data-action="select-item-reminder" data-key="${key}" ${current === key ? "checked" : ""} />
          <span>${esc(label)}</span>
        </label>`;
  const stepper =
    current === "other"
      ? `<div class="day-stepper">
          <button type="button" data-action="dec-other-days" aria-label="${esc(t("decreaseDays"))}">−</button>
          <span>${esc(labelForDays(state.itemReminderOtherDays))}</span>
          <button type="button" data-action="inc-other-days" aria-label="${esc(t("increaseDays"))}">+</button>
        </div>`
      : "";
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="item-reminder-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="item-reminder-title">${esc(t("reminderPrefix"))}</h2>
        <button class="sheet-close" data-action="close-sheet" aria-label="${esc(t("close"))}">✕</button>
      </div>
      <div class="reminder-options" role="radiogroup" aria-labelledby="item-reminder-title">
        ${ladder.map((o) => radio(o.key, o.label)).join("")}
        ${radio("other", t("otherReminderOption"))}
        ${stepper}
        <div class="reminder-divider"></div>
        ${radio("none", t("noReminderOption"))}
      </div>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="save-item-reminder">${esc(t("save"))}</button>
        <button class="btn-text" data-action="close-sheet">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

function renderWhySheet() {
  const { kind, item } = state.why;
  let body = "";
  if (kind === "default") {
    body = `<p class="body-text">${esc(t("whyDefault", state.ctx.appointment_type))}</p>`;
  } else if (kind === "practice-high" || kind === "practice-low") {
    body = `<p class="body-text">${esc(t("whyPracticeIntro", state.ctx.practice_name, state.ctx.appointment_type))}</p><p class="quote-line" style="-webkit-line-clamp:unset;">${quoteWrap(esc(item.source_quote))}</p>`;
    if (kind === "practice-low") body += `<p class="body-text">${esc(t("whyPracticeLowNote"))}</p>`;
  } else {
    // note and unclear both reuse the note explanation
    body = `<p class="body-text">${esc(t("whyNoteIntro"))}</p><p class="quote-line" style="-webkit-line-clamp:unset;">${quoteWrap(esc(item.source_quote))}</p><p class="body-text">${esc(t("whyNoteFootnote"))}</p>`;
  }
  const defaultDays = reminderDueDays(item);
  if (defaultDays !== null && effectiveReminder(item) !== null) {
    const when = labelForDays(defaultDays);
    if (kind === "unclear") {
      body += `<p class="body-text">${esc(t("whyReminderUnclear", when))}</p>`;
    } else if (kind === "note-low") {
      body += `<p class="body-text">${esc(t("whyMedicationPauseUnclear"))}</p>`;
    } else {
      body += item.due_before
        ? `<p class="body-text">${esc(t("whyReminderFromSource", when))}</p>`
        : `<p class="body-text">${esc(t("whyReminderFromDefault", when, t("group_" + item.group)))}</p>`;
    }
  }
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="why-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row"><h2 id="why-title">${esc(t("whySeeThis"))}</h2></div>
      ${body}
      ${renderFeedbackBlock(kind, item)}
      <div class="sheet-actions"><button class="btn-secondary" data-action="close-sheet">${esc(t("close"))}</button></div>
    </div>
  </div>`;
}

// Quiet feedback block at the bottom of "Warum sehe ich das?" — never shown
// for default items. Practice items get a 3-reason single-select followed by
// "Senden," which marks the live item object's band "low" directly (the
// same reference held in state.payload.results, so the hedge and the
// dynamically-derived mixed-confidence framing both update immediately).
// Note, note-low and unclear items get "Notiz bearbeiten" instead, opening
// the note composer. No free text anywhere.
function renderFeedbackBlock(kind, item) {
  if (kind === "default") return "";
  const isPractice = kind === "practice-high" || kind === "practice-low";
  const feedback = state.itemFeedback.get(item.id);
  if (feedback === "yes") {
    return `<div class="why-feedback"><p class="feedback-confirm">${esc(t("feedbackThanks"))}</p></div>`;
  }
  if (feedback === "sent") {
    return `<div class="why-feedback"><p class="feedback-confirm">${esc(t("feedbackMarkedUnsure"))}</p></div>`;
  }
  const question = isPractice ? t("feedbackQuestionPractice") : t("feedbackQuestionNote");
  if (state.whyFeedbackStep === "followup") {
    if (isPractice) {
      const reasons = ["not_in_text", "wrong_timing", "something_else"];
      return `<div class="why-feedback">
        <p class="feedback-question">${esc(question)}</p>
        <div class="feedback-reasons" role="radiogroup" aria-label="${esc(question)}">
          ${reasons
            .map(
              (r) => `<label class="feedback-reason">
            <input type="radio" name="feedback-reason" data-action="select-feedback-reason" data-reason="${r}" ${state.whyFeedbackReason === r ? "checked" : ""} />
            <span>${esc(t("feedbackReason_" + r))}</span>
          </label>`
            )
            .join("")}
        </div>
        <button class="feedback-link" data-action="send-feedback" ${state.whyFeedbackReason ? "" : "disabled"}>${esc(t("send"))}</button>
      </div>`;
    }
    return `<div class="why-feedback">
      <p class="feedback-question">${esc(question)}</p>
      <button class="feedback-link" data-action="edit-note-from-why">${esc(t("editNoteLink"))}</button>
    </div>`;
  }
  return `<div class="why-feedback">
    <p class="feedback-question">${esc(question)}</p>
    <div class="feedback-actions">
      <button class="feedback-link feedback-yesno" data-action="feedback-yes" data-id="${item.id}">${esc(t("yes"))}</button>
      <button class="feedback-link feedback-yesno" data-action="feedback-no">${esc(t("no"))}</button>
    </div>
  </div>`;
}

function renderDeleteDialog() {
  return `
  <div class="backdrop center" data-action="cancel-delete">
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
      <h2 id="del-title">${esc(t("deleteNoteTitle"))}</h2>
      <p>${esc(t("deleteNoteBody"))}</p>
      <div class="dialog-actions">
        <button class="cancel" data-action="cancel-delete">${esc(t("cancel"))}</button>
        <button class="confirm" data-action="confirm-delete">${esc(t("delete"))}</button>
      </div>
    </div>
  </div>`;
}

/* ---------------------------- Event handling ---------------------------- */

function onRootClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case "open-push":
      state.screen = "checklist";
      state.checklistPhase = "resolved";
      render();
      break;
    case "open-entry":
      if (!state.consentGiven) openSheet("consent");
      else enterChecklistFlow();
      break;
    case "accept-consent":
      state.consentGiven = true;
      state.sheet = null;
      enterChecklistFlow();
      break;
    case "decline-consent":
      closeSheet();
      break;
    case "close-sheet-backdrop":
      if (e.target === el) closeSheet();
      break;
    case "close-sheet":
      closeSheet();
      break;
    case "back-to-appointment":
      state.screen = "appointment";
      render();
      break;
    case "toggle-tick": {
      const id = el.dataset.id;
      const cur = state.itemState[id] || { ticked: false, hidden: false };
      const nowTicked = !cur.ticked;
      state.itemState[id] = { ...cur, ticked: nowTicked };
      const item = findItem(id);
      if (item) state.liveMessage = nowTicked ? t("itemDoneLive", item.title) : t("itemReopenedLive", item.title);
      render();
      break;
    }
    case "dismiss-item": {
      const id = el.dataset.id;
      const cur = state.itemState[id] || { ticked: false, hidden: false };
      state.itemState[id] = { ...cur, hidden: true };
      render();
      break;
    }
    case "undo-dismiss": {
      const id = el.dataset.id;
      const cur = state.itemState[id] || { ticked: false, hidden: false };
      state.itemState[id] = { ...cur, hidden: false };
      render();
      break;
    }
    case "why-item": {
      const id = el.dataset.id;
      const kind = el.dataset.kind;
      const item = findItem(id);
      openSheet("why", { why: { kind, item }, whyFeedbackStep: "initial", whyFeedbackReason: null });
      break;
    }
    case "feedback-yes": {
      const id = el.dataset.id;
      state.itemFeedback.set(id, "yes");
      state.liveMessage = t("feedbackThanks");
      render();
      break;
    }
    case "feedback-no":
      state.whyFeedbackStep = "followup";
      render();
      break;
    case "select-feedback-reason":
      state.whyFeedbackReason = el.dataset.reason;
      render();
      break;
    case "send-feedback": {
      state.itemFeedback.set(state.why.item.id, "sent");
      state.why.item.band = "low"; // same object reference as in payload.results
      state.liveMessage = t("feedbackMarkedUnsure");
      render();
      break;
    }
    case "edit-note-from-why": {
      const item = state.why.item;
      const note = state.ctx.patient_notes.find((n) => n.text === item.source_quote);
      if (note) openSheet("notecomposer", { noteComposer: { mode: "edit", editingId: note.id, text: note.text, error: "" } });
      break;
    }
    case "toggle-quote": {
      const quoteEl = document.getElementById("quote-" + el.dataset.id);
      if (quoteEl) {
        quoteEl.classList.toggle("expanded");
        el.textContent = quoteEl.classList.contains("expanded") ? t("showLess") : t("showMore");
      }
      break;
    }
    case "retry-checklist":
      // Demonstrates a successful retry recovering from a transient failure
      // (unreachable from any of the three flows' fixtures, but kept
      // code-complete per the brief's scope).
      state.checklistPhase = "waiting";
      render();
      setTimeout(() => {
        state.checklistPhase = "resolved";
        render();
      }, WAIT_MS);
      break;
    case "open-reminder-sheet":
      openSheet("reminder", { reminderDraft: [...state.ctx.general_reminders] });
      break;
    case "toggle-reminder-draft": {
      const v = el.dataset.value;
      const idx = state.reminderDraft.indexOf(v);
      if (el.checked && idx === -1) state.reminderDraft.push(v);
      else if (!el.checked && idx !== -1) state.reminderDraft.splice(idx, 1);
      break;
    }
    case "save-reminder":
      state.ctx.general_reminders = [...state.reminderDraft];
      closeSheet();
      break;
    case "open-item-reminder": {
      const id = el.dataset.id;
      const item = findItem(id);
      const override = state.reminderOverrides.get(id);
      let draftKey;
      let otherDays = null;
      if (override === "none" || override === "week" || override === "three_days" || override === "one_day" || override === "one_hour") {
        draftKey = override;
      } else if (override && typeof override === "object" && override.other != null) {
        draftKey = "other";
        otherDays = override.other;
      } else {
        // No override: pick the ladder entry matching the item's own
        // default, or fall to "Andere …" pre-filled with it if it's a
        // non-standard count (e.g. a note's own "2 Tage").
        const standardKey = ladderKeyForDays(reminderDueDays(item));
        draftKey = standardKey || "other";
        if (!standardKey) otherDays = reminderDueDays(item);
      }
      openSheet("itemreminder", { itemReminderTarget: id, itemReminderDraft: draftKey, itemReminderOtherDays: otherDays || minOtherDays(item) });
      break;
    }
    case "select-item-reminder":
      state.itemReminderDraft = el.dataset.key;
      render();
      break;
    case "inc-other-days":
      state.itemReminderOtherDays = Math.min(30, state.itemReminderOtherDays + 1);
      render();
      break;
    case "dec-other-days": {
      const min = minOtherDays(findItem(state.itemReminderTarget));
      state.itemReminderOtherDays = Math.max(min, state.itemReminderOtherDays - 1);
      render();
      break;
    }
    case "save-item-reminder": {
      const id = state.itemReminderTarget;
      const key = state.itemReminderDraft;
      if (key === "default") state.reminderOverrides.delete(id);
      else if (key === "other") state.reminderOverrides.set(id, { other: state.itemReminderOtherDays });
      else state.reminderOverrides.set(id, key);
      closeSheet();
      break;
    }
    case "open-note-composer":
      openSheet("notecomposer", { noteComposer: { mode: "add", editingId: null, text: "", error: "" } });
      break;
    case "edit-note": {
      const note = state.ctx.patient_notes.find((n) => n.id === el.dataset.id);
      openSheet("notecomposer", { noteComposer: { mode: "edit", editingId: note.id, text: note.text, error: "" } });
      break;
    }
    case "fill-example-note":
      state.noteComposer.text = el.dataset.text;
      render();
      document.getElementById("note-field").focus();
      break;
    case "save-note": {
      const text = state.noteComposer.text.trim();
      if (text.length < 3) {
        state.noteComposer.error = t("noteValidationMsg");
        render();
        return;
      }
      if (state.noteComposer.mode === "add") {
        const note = { id: "u" + Date.now(), text, created_on: todayISO() };
        state.ctx.patient_notes.push(note);
        if (!isColdStart()) simulatedItemForNote(note).forEach((item) => state.payload.results.push(item));
      } else {
        const note = state.ctx.patient_notes.find((n) => n.id === state.noteComposer.editingId);
        if (note) {
          removeItemsForNoteText(note.text);
          note.text = text;
          if (!isColdStart()) simulatedItemForNote(note).forEach((item) => state.payload.results.push(item));
        }
      }
      state.sheet = null;
      runModelReRun();
      break;
    }
    case "delete-note":
      openDialog("delete", { deleteTarget: el.dataset.id });
      break;
    case "cancel-delete":
      if (e.target === el || el.dataset.action === "cancel-delete") closeDialog();
      break;
    case "confirm-delete": {
      const deletedNote = state.ctx.patient_notes.find((n) => n.id === state.deleteTarget);
      if (deletedNote) removeItemsForNoteText(deletedNote.text);
      state.ctx.patient_notes = state.ctx.patient_notes.filter((n) => n.id !== state.deleteTarget);
      state.deleteTarget = null;
      state.dialog = null;
      state.liveMessage = t("noteDeletedLive");
      state.focusNotesHeadingNext = true;
      runModelReRun();
      break;
    }
  }
}

function onRootInput(e) {
  if (e.target.dataset.action === "note-text-input") {
    state.noteComposer.text = e.target.value;
    state.noteComposer.error = "";
    const counter = e.target.parentElement.querySelector(".counter");
    if (counter) counter.textContent = `${e.target.value.length}/160`;
  }
}

function onKeydown(e) {
  if (e.key === "Escape") {
    if (state.dialog) closeDialog();
    else if (state.sheet) closeSheet();
  }
  if (e.key === "Tab" && (state.sheet || state.dialog)) {
    const overlay = document.querySelector(".sheet, .dialog");
    if (!overlay) return;
    const focusables = overlay.querySelectorAll('button, [href], textarea, input, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/* ---------------------------- Boot ---------------------------- */

function initControls() {
  const root = document.getElementById("screen");
  root.addEventListener("click", onRootClick);
  root.addEventListener("input", onRootInput);
  document.addEventListener("keydown", onKeydown);
  // The hash is read once at boot; changing it reloads rather than
  // hot-swapping state, since there's no in-app flow switch.
  window.addEventListener("hashchange", () => location.reload());
}

initControls();
state = freshState();
render();
