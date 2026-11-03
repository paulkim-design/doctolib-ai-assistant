/*
  Prototype app logic. Single state object + full re-render on every change.
  Fixture-driven: scenarios come from fixtures.js, no live model calls.
  Adding/editing/deleting a note "re-runs the model" by simulating the waiting
  state and then re-showing the SAME scenario payload (the brief's checklist
  content is fixed fixture data; only the notes list and tick/hide state are
  truly dynamic in this prototype). Cold start never shows a waiting spinner,
  per the brief ("Cold start: No model call").

  German is the product's default language. The reviewer control bar always
  stays in English; a "Language" switch in that control bar lets a tester
  flip the PHONE's language between German (default) and English, using the
  COPY dictionary below for UI chrome and fixtures.js's per-language fixture
  sets (via fx()) for simulated content (item titles, quotes, notes, Q&A).
*/

const WAIT_MS = 2000;
const QUESTION_WAIT_MS = 1000;

let state = null;
let lastFocusedEl = null;
let prevPhase = null;
let prevSheet = null;
let prevQuestionWaiting = false;
let stateGen = 0; // invalidates in-flight waiting timers when the State control changes
let genericOn = false; // "Generic appointment type" toggle
let lang = "de"; // phone UI language: "de" (default) | "en"
let appointment = "checkup"; // "Appointment" control: "checkup" (default) | "mrt"
let lastCheckupScenarioId = "high_confidence"; // remembers the State dropdown's value across a trip through "mrt"

/* ---------------------------- Copy (UI chrome) ---------------------------- */

const COPY = {
  // App bar / navigation
  back: { de: "Zurück", en: "Back" },
  appointmentInfoTitle: { de: "Informationen zum Termin", en: "Appointment information" },
  prepTitle: { de: "Vorbereitung", en: "Preparation" },
  prepTitleForName: { de: (name) => `Vorbereitung · Für ${name}`, en: (name) => `Preparation · For ${name}` },

  // Entry row / appointment screen
  entrySubtitleBeforeConsent: { de: "Hilfe bei der Vorbereitung auf Ihren Termin", en: "Help preparing for your appointment" },
  entrySubtitleAfterConsent: {
    de: (n) => (n === 1 ? "1 Punkt vor Ihrem Termin prüfen" : `${n} Punkte vor Ihrem Termin prüfen`),
    en: (n) => (n === 1 ? "1 item to check before your appointment" : `${n} items to check before your appointment`)
  },
  reschedule: { de: "Verschieben", en: "Reschedule" },
  cancelAppointment: { de: "Termin absagen", en: "Cancel appointment" },

  // Type pick
  typePickHeading: { de: "Worum geht es bei diesem Termin?", en: "What is this appointment about?" },
  typePickIntro: {
    de: (type) => `Ihre Praxis hat den Termin als „${type}" eingetragen. Wählen Sie, worum es geht.`,
    en: (type) => `Your practice entered the appointment as "${type}". Please choose what it's about.`
  },
  typePickAriaLabel: { de: "Terminart wählen", en: "Choose appointment type" },
  continueBtn: { de: "Weiter", en: "Continue" },
  typePickFootnote: { de: "Ihre Auswahl wird nach dem Termin gelöscht.", en: "Your choice will be deleted after the appointment." },
  practiceEnteredType: { de: "Sprechstunde", en: "General consultation" },

  // Checklist chip
  chosenByYou: { de: (pick) => `Von Ihnen gewählt: ${pick}`, en: (pick) => `You selected: ${pick}` },
  change: { de: "Ändern", en: "Change" },

  // Waiting
  waitingStatus: { de: "Ihre Vorbereitungsinfos werden geprüft …", en: "Checking your preparation info …" },
  waitingSubline: { de: "In der Zwischenzeit, das wird meistens benötigt:", en: "In the meantime, here's what's usually needed:" },
  checklistUpdated: { de: "Ihre Checkliste wurde aktualisiert.", en: "Your checklist has been updated." },

  // Failure
  failureSubline: { de: "Bitte versuchen Sie es erneut oder wenden Sie sich an Ihre Praxis.", en: "Please try again or contact your practice." },
  retry: { de: "Erneut versuchen", en: "Try again" },

  // Cold start
  coldStartHeading: { de: "Für diesen Termin gibt es noch keine Vorbereitungsinfos.", en: "There's no preparation info for this appointment yet." },

  // Resolved / no result
  noResultSubline: { de: "Die allgemeine Liste für diese Terminart:", en: "The general list for this appointment type:" },

  // Item card
  defaultLabel: { de: "Für diese Terminart meist nötig", en: "Usually needed for this appointment type" },
  fromPractice: { de: (name) => `Von ${name}`, en: (name) => `From ${name}` },
  hedge: { de: "Bitte prüfen", en: "Please check" },
  addedByYou: { de: "Von Ihnen hinzugefügt", en: "Added by you" },
  showMore: { de: "Mehr anzeigen", en: "Show more" },
  showLess: { de: "Weniger anzeigen", en: "Show less" },
  kiBadge: { de: "KI", en: "AI" },
  kiBadgeAriaLabel: { de: "Von KI in den Informationen Ihrer Praxis gefunden", en: "Found by AI in your practice's information" },
  dismissItem: { de: "Trifft auf mich nicht zu", en: "Doesn't apply to me" },
  whySeeThis: { de: "Warum sehe ich das?", en: "Why am I seeing this?" },

  // Notes section
  noteUnclear: { de: "Unklar. Bitte klären Sie das mit Ihrer Praxis.", en: "Unclear. Please check this with your practice." },
  noteRepeatsDefault: { de: "Steht schon auf der allgemeinen Liste", en: "Already on the general list" },
  noteItemCount: {
    de: (n) => (n === 1 ? "1 Punkt in Ihrer Checkliste" : `${n} Punkte in Ihrer Checkliste`),
    en: (n) => (n === 1 ? "1 item in your checklist" : `${n} items in your checklist`)
  },
  notesHeading: { de: "Ihre Vorbereitungsnotizen", en: "Your preparation notes" },
  edit: { de: "Bearbeiten", en: "Edit" },
  delete: { de: "Löschen", en: "Delete" },
  editNoteAriaLabel: { de: (text) => `Notiz bearbeiten: ${text}`, en: (text) => `Edit note: ${text}` },
  deleteNoteAriaLabel: { de: (text) => `Notiz löschen: ${text}`, en: (text) => `Delete note: ${text}` },
  notesFootnote: { de: "Ihre Notizen werden nach dem Termin gelöscht.", en: "Your notes will be deleted after the appointment." },
  noteDeletedLive: { de: "Notiz gelöscht.", en: "Note deleted." },

  // Contact / urgent card
  contactCardTitle: { de: "Kontaktdaten der Praxis", en: "Practice contact details" },
  contactDisclaimer: { de: "Antworten hängen von der Praxis ab.", en: "Responses depend on the practice." },
  urgentTitle: { de: "Sie können nicht bis zu Ihrem Termin warten?", en: "Can't wait until your appointment?" },
  urgentText: {
    de: "Rufen Sie den ärztlichen Bereitschaftsdienst unter 116117 an. Im Notfall rufen Sie die 112.",
    en: "Call the medical on-call service at 116117. In an emergency, call 112."
  },

  // Footer
  addNote: { de: "+ Vorbereitungsnotiz hinzufügen", en: "+ Add preparation note" },
  noteLimitMsg: { de: "Sie können bis zu 5 Notizen hinzufügen.", en: "You can add up to 5 notes." },
  askQuestionFooter: { de: "Frage zur Vorbereitung stellen", en: "Ask a question about preparation" },

  // Consent sheet
  close: { de: "Schließen", en: "Close" },
  consentHeading: { de: (name) => `Wir helfen bei der Vorbereitung auf den Termin für ${name}`, en: (name) => `We'll help prepare for the appointment for ${name}` },
  consentBody: {
    de: "Eine KI prüft die Informationen, die Ihre Praxis für diese Terminart bereitstellt, und Ihre eigenen Vorbereitungsnotizen. Daraus entsteht eine persönliche Checkliste. Gesundheitsangaben werden nicht gelesen oder bewertet, nur Organisatorisches wie Dokumente, Nüchternheit oder Formulare. Ihre Checkliste und Ihre Notizen werden nach dem Termin gelöscht.",
    en: "An AI checks the information your practice provides for this appointment type, and your own preparation notes. This creates a personal checklist. Health information isn't read or assessed, only logistics like documents, fasting or forms. Your checklist and your notes are deleted after the appointment."
  },
  consentFootnote: {
    de: "Wird einmal gefragt. Sie können die Vorbereitungshilfe jederzeit in den Einstellungen ausschalten. Für jedes Familienmitglied gibt es eine eigene Einstellung.",
    en: "Asked once. You can turn off preparation help at any time in settings. Each family member has their own setting."
  },
  consentAccept: { de: "Vorbereitungshilfe einschalten", en: "Turn on preparation help" },
  consentDecline: { de: "Nicht jetzt", en: "Not now" },

  // Note composer
  addNoteTitle: { de: "Vorbereitungsnotiz hinzufügen", en: "Add preparation note" },
  editNoteTitle: { de: "Vorbereitungsnotiz bearbeiten", en: "Edit preparation note" },
  noteComposerIntro: {
    de: "Notieren Sie, was Ihre Praxis Ihnen zur Vorbereitung gesagt hat, zum Beispiel beim letzten Termin.",
    en: "Note down what your practice told you about preparation, for example at your last appointment."
  },
  noteFieldLabel: { de: "Ihre Notiz", en: "Your note" },
  examplesLabel: { de: "Beispiele", en: "Examples" },
  noteHelperText: {
    de: "Nur für die Vorbereitung, nicht für Beschwerden. Die Notiz wird nach dem Termin gelöscht.",
    en: "Only for preparation, not for symptoms. The note will be deleted after the appointment."
  },
  noteValidationMsg: { de: "Bitte geben Sie mindestens 3 Zeichen ein.", en: "Please enter at least 3 characters." },
  save: { de: "Speichern", en: "Save" },
  cancel: { de: "Abbrechen", en: "Cancel" },

  // Question sheet
  questionSheetTitle: { de: "Frage zur Vorbereitung", en: "Question about preparation" },
  questionSheetIntro: {
    de: "Antworten kommen nur aus den Informationen Ihrer Praxis, Ihren Notizen und der allgemeinen Liste. Fragen zu Beschwerden werden nicht beantwortet.",
    en: "Answers only come from your practice's information, your notes and the general list. Questions about symptoms won't be answered."
  },
  questionFieldLabel: { de: "Ihre Frage", en: "Your question" },
  exampleQuestionsLabel: { de: "Beispielfragen (zum Ausprobieren der Antwortzustände)", en: "Example questions (to try out the answer states)" },
  ask: { de: "Fragen", en: "Ask" },
  answerSearching: { de: "Antwort wird gesucht …", en: "Looking for an answer …" },

  // Answers
  aiAnswerBadge: { de: "KI-Antwort", en: "AI answer" },
  uncertainChip: { de: "Unsicher, bitte bei Ihrer Praxis prüfen", en: "Uncertain, please check with your practice" },
  fromGeneralList: { de: "Aus der allgemeinen Liste", en: "From the general list" },
  noAnswerMsg: { de: "Die Informationen Ihrer Praxis sagen dazu nichts.", en: "Your practice's information doesn't say anything about this." },
  refusedSymptomMsg: { de: "Fragen zu Beschwerden kann ich nicht beantworten.", en: "I can't answer questions about symptoms." },
  answerErrorMsg: { de: "Ihre Frage konnte gerade nicht beantwortet werden.", en: "Your question couldn't be answered right now." },

  // Why sheet
  whyDefault: {
    de: (type) => `Dieser Punkt steht auf der allgemeinen Liste für die Terminart „${type}". Die Liste wird von Doctolib erstellt und medizinisch geprüft.`,
    en: (type) => `This item is on the general list for the appointment type "${type}". The list is created by Doctolib and medically reviewed.`
  },
  whyPracticeIntro: {
    de: (practice, type) => `Eine KI hat diesen Punkt in den Informationen von ${practice} zur Terminart „${type}" gefunden. Er stammt aus diesem Satz:`,
    en: (practice, type) => `An AI found this item in ${practice}'s information for the appointment type "${type}". It comes from this sentence:`
  },
  whyPracticeLowNote: {
    de: "Der Satz ist nicht eindeutig. Bitte klären Sie mit Ihrer Praxis, ob er für Sie gilt.",
    en: "The sentence isn't clear-cut. Please check with your practice whether it applies to you."
  },
  whyPatientIntro: {
    de: "Eine KI hat diesen Punkt aus Ihrer Vorbereitungsnotiz übernommen:",
    en: "An AI took this item from your preparation note:"
  },
  whyPatientNote: {
    de: "Die Notiz wird nach dem Termin gelöscht.",
    en: "The note will be deleted after the appointment."
  },

  // Delete dialog
  deleteNoteTitle: { de: "Notiz löschen?", en: "Delete note?" },
  deleteNoteBody: { de: "Punkte aus dieser Notiz werden aus Ihrer Checkliste entfernt.", en: "Items from this note will be removed from your checklist." }
};

function t(key, ...args) {
  const entry = COPY[key][lang];
  return typeof entry === "function" ? entry(...args) : entry;
}

// The appointment type pick that loads the fixture default items ("Health
// check-up" in English); kept language-aware since app.js compares the
// patient's pick against it.
function checkupPickLabel() {
  return fx().typeOptions[0];
}

function guardedTimeout(fn, delay) {
  const gen = stateGen;
  setTimeout(() => {
    if (gen !== stateGen) return; // a newer state change (e.g. the control) superseded this
    fn();
  }, delay);
}

function freshState(scenarioId) {
  const s = buildScenario(scenarioId);
  return {
    scenarioId,
    screen: "appointment", // appointment | typepick | checklist
    sheet: null, // consent | notecomposer | question | why
    dialog: null, // delete
    consentGiven: false,
    ctx: s.context,
    payload: s.payload,
    itemState: {}, // id -> { ticked, hidden }
    checklistPhase: "idle", // idle | waiting | resolved
    typePickSelection: null,
    noteComposer: { mode: "add", editingId: null, text: "", error: "" },
    deleteTarget: null,
    why: null, // { kind, item }
    question: { text: "", answerState: null, waiting: false, exampleKey: null },
    liveMessage: "",
    focusNotesHeadingNext: false
  };
}

// "Zurücksetzen": resets consent, the appointment (to check-up), the State
// (to the given id, always "high_confidence" from the reset button), the
// generic toggle, ticks, hidden items and notes. The language is a viewing
// preference, not a feature setting, so it's left as it was.
function fullReset(id) {
  stateGen++;
  genericOn = false;
  appointment = "checkup";
  lastCheckupScenarioId = id;
  state = freshState(id);
  render();
}

// Switching appointments, in either direction, returns the phone to the
// entry point and resets ticks, hidden items and notes, but leaves consent
// as it was: consent is given once for the whole feature, not per
// appointment, and both appointments belong to the same patient. The
// generic toggle always turns off too: "mrt" has no type pick flow, and a
// stale "on" shouldn't resurface when switching back. The State dropdown's
// value is remembered per appointment so flipping to "mrt" and back doesn't
// lose a reviewer's place in the check-up's states.
function setAppointment(newAppointment) {
  if (newAppointment === appointment) return;
  stateGen++;
  appointment = newAppointment;
  genericOn = false;
  const consentWasGiven = state.consentGiven;
  const targetScenario = appointment === "mrt" ? "high_confidence" : lastCheckupScenarioId;
  state = freshState(targetScenario);
  state.consentGiven = consentWasGiven;
  render();
}

// Derives the "Generic appointment type" variant of a checklist state, as if
// the check-up pick had just been made in the type pick screen: a generic
// appointment has no practice information, so practice-sourced items are
// stripped for every state (high/mixed confidence collapse to the no result
// payload, low confidence keeps only its patient item). Nothing here touches
// fixtures.js's payload objects; it only reshapes clones of them.
function buildGenericCheckupVariant(id) {
  const base = buildScenario(id);
  const pick = checkupPickLabel();
  const ctx = {
    ...base.context,
    appointment_type: pick, // the pick, everywhere the feature describes the type
    appointment_type_is_generic: true,
    type_options: clone(fx().typeOptions),
    patient_type_pick: pick,
    default_items: id === "cold_start" ? [] : clone(fx().defaultItemsBase)
  };

  let payload;
  let notes;
  switch (id) {
    case "high_confidence":
    case "mixed_confidence":
      payload = clone(fx().checklistPayloads.no_result);
      notes = [clone(fx().noteN1)];
      break;
    case "low_confidence":
      payload = clone(fx().checklistPayloads.low_confidence);
      payload.results = payload.results.filter((r) => r.source !== "practice");
      notes = [clone(fx().noteN2)];
      break;
    case "error":
      payload = clone(fx().checklistPayloads.error);
      notes = [];
      break;
    default: // no_result, cold_start, waiting
      payload = clone(fx().checklistPayloads.no_result);
      notes = [];
      break;
  }
  ctx.patient_notes = notes;
  return { context: ctx, payload };
}

// Switches the State control's selected checklist state in place: the phone
// stays on (or jumps straight to) the checklist with consent already given,
// instead of replaying entry point + consent. When the generic toggle is on,
// this simulates a completed check-up pick so every state stays instantly
// previewable; the entry-row flow (typepick-weiter) is the other way to
// reach the same states and is the only path that can land on cold start via
// a different pick.
function changeState(id) {
  if (appointment === "mrt") return; // the State dropdown is disabled while "mrt" is active
  stateGen++;
  lastCheckupScenarioId = id;
  const fresh = freshState(id);
  if (genericOn) {
    const variant = buildGenericCheckupVariant(id);
    fresh.ctx = variant.context;
    fresh.payload = variant.payload;
  }
  fresh.consentGiven = true;
  fresh.screen = "checklist";
  fresh.checklistPhase = id === "waiting" ? "waiting" : "resolved";
  if (id === "waiting") fresh.liveMessage = t("waitingStatus");
  state = fresh;
  render();
}

// Toggling "Generic appointment type", in either direction, returns the
// phone to the entry point and resets ticks, hidden items and notes, but
// leaves consent as it was (so the consent sheet only reappears if consent
// was never given).
function toggleGeneric(isOn) {
  if (appointment === "mrt") return; // disabled and forced off while "mrt" is active
  stateGen++;
  genericOn = isOn;
  const consentWasGiven = state.consentGiven;
  const fresh = freshState(state.scenarioId);
  if (genericOn) {
    fresh.ctx = {
      ...fresh.ctx,
      appointment_type: t("practiceEnteredType"), // no pick made yet
      appointment_type_is_generic: true,
      type_options: clone(fx().typeOptions),
      patient_type_pick: null,
      default_items: [],
      patient_notes: []
    };
  }
  fresh.consentGiven = consentWasGiven;
  state = fresh;
  render();
}

// Switching the phone's language, in either direction, returns the phone to
// the entry point and rebuilds the context from that language's fixtures
// (so item titles, quotes, notes etc. are consistent), but keeps the current
// State selection, the generic toggle and consent as they were.
function setLang(newLang) {
  if (newLang === lang) return;
  stateGen++;
  lang = newLang;
  const consentWasGiven = state.consentGiven;
  const fresh = freshState(state.scenarioId);
  if (genericOn) {
    fresh.ctx = {
      ...fresh.ctx,
      appointment_type: t("practiceEnteredType"),
      appointment_type_is_generic: true,
      type_options: clone(fx().typeOptions),
      patient_type_pick: null,
      default_items: [],
      patient_notes: []
    };
  }
  fresh.consentGiven = consentWasGiven;
  state = fresh;
  render();
}

function formatDate(iso) {
  const d = new Date(iso);
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat(locale, { month: "long" }).format(d);
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return lang === "de" ? `${weekday}, ${day}. ${month} ${year} · ${hh}:${mm}` : `${weekday}, ${day} ${month} ${year} · ${hh}:${mm}`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isColdStart() {
  return state.payload.state === "no_result" && state.ctx.default_items.length === 0;
}

function visibleItems() {
  const p = state.payload;
  const def = state.ctx.default_items;
  const practice = p.results.filter((r) => r.source === "practice");
  // Unclear patient notes stay in the notes section (with their own status
  // line) but are no longer rendered as checklist items.
  const patient = p.results.filter((r) => r.source === "patient" && r.action !== "unclear");
  let ordered = [];
  if (p.state === "no_result" || p.state === "error") {
    // Simulated patient items can still land here (e.g. a note added while
    // viewing "No result"); cold start and failure never show any items.
    ordered = isColdStart() || p.state === "error" ? [] : [...def, ...patient];
  } else {
    // high_confidence / mixed_confidence / low_confidence: practice → default
    // → patient. (Low confidence's fixture never has a non-unclear patient
    // item, so this only changes ordering once a note adds one live.)
    ordered = [...practice, ...def, ...patient];
  }
  return ordered
    .map((it) => normalizeItem(it))
    .filter((it) => !(state.itemState[it.id] && state.itemState[it.id].hidden));
}

function normalizeItem(raw) {
  if (raw.source === "practice" || raw.source === "patient") {
    return raw;
  }
  // default item
  return { id: raw.id, title: raw.title, source: "default", action: raw.action, band: null };
}

function itemKind(item) {
  if (item.source === "default") return "default";
  if (item.source === "practice" && item.band === "high") return "practice-high";
  if (item.source === "practice" && item.band === "low") return "practice-low";
  // Unclear patient items never reach here: visibleItems() excludes them.
  return "patient-high";
}

function unresolvedCount() {
  return visibleItems().filter((it) => !(state.itemState[it.id] && state.itemState[it.id].ticked)).length;
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
  // Cold start never calls the model.
  if (isColdStart()) {
    render();
    return;
  }
  state.checklistPhase = "waiting";
  state.liveMessage = t("waitingStatus");
  render();
  guardedTimeout(() => {
    state.checklistPhase = "resolved";
    state.liveMessage = t("checklistUpdated");
    render();
  }, WAIT_MS);
}

function enterChecklistFlow() {
  if (state.ctx.appointment_type_is_generic && !state.ctx.patient_type_pick) {
    state.screen = "typepick";
    render();
    return;
  }
  state.screen = "checklist";
  if (isColdStart()) {
    state.checklistPhase = "resolved";
  } else if (state.checklistPhase !== "resolved") {
    state.checklistPhase = "waiting";
    guardedTimeout(() => {
      if (state.screen === "checklist") {
        state.checklistPhase = "resolved";
        render();
      }
    }, WAIT_MS);
  }
  render();
}

function currentFrameLabel() {
  let label = baseFrameLabel();
  if (!label) return label;
  if (genericOn) label += " · generic";
  if (appointment === "mrt") label += " · MRT";
  return label;
}

function baseFrameLabel() {
  // Overlays take priority: a sheet/dialog can sit on top of any screen.
  if (state.dialog === "delete") return "13 · Delete confirmation";
  if (state.sheet === "consent") return "1 · Consent (bottom sheet)";
  if (state.sheet === "notecomposer") return state.noteComposer.mode === "add" ? "10 · Note composer (add)" : "11 · Note composer (edit)";
  if (state.sheet === "why") return "Warum sehe ich das? sheet";
  if (state.sheet === "question") {
    const m = { answered: "15", uncertain: "16", no_answer: "17", refused_symptom: "18", error: "19" };
    if (state.question.answerState) return `${m[state.question.answerState]} · Answer: ${state.question.answerState}`;
    return "14 · Question sheet (empty)";
  }
  if (state.screen === "appointment") return state.consentGiven ? "0 · Entry point (after consent)" : "0 · Entry point";
  if (state.screen === "typepick") return "9 · Type pick";
  if (state.screen === "checklist") {
    if (state.checklistPhase === "waiting") return "2 · Waiting";
    if (isColdStart()) return "7 · Cold start";
    if (state.payload.state === "error") return "6 · Failure";
    if (state.payload.state === "no_result") return "5 · No result";
    if (state.payload.state === "high_confidence") return "3 · High confidence";
    if (state.payload.state === "low_confidence") return "4 · Low confidence";
    if (state.payload.state === "mixed_confidence") return "8 · Mixed confidence";
  }
  return "";
}

/* ---------------------------- Rendering ---------------------------- */

function render() {
  document.getElementById("frame-badge").textContent = currentFrameLabel();
  document.getElementById("appointment-select").value = appointment;
  document.getElementById("scenario-select").value = state.scenarioId;
  document.getElementById("scenario-select").disabled = appointment === "mrt";
  document.getElementById("generic-toggle").checked = genericOn;
  document.getElementById("generic-toggle").disabled = appointment === "mrt";
  document.getElementById("lang-select").value = lang;
  // The phone is the page's dominant content; follow its language so screen
  // readers pronounce it correctly. The reviewer control bar stays English
  // regardless (it's a separate, smaller reviewer-tooling region).
  document.documentElement.lang = lang;

  const screen = document.getElementById("screen");
  screen.innerHTML = renderStatusAndAppbar() + renderScreenBody() + renderOverlays();

  // Sheets slide up only when they open, not on every re-render inside them.
  if (state.sheet && state.sheet !== prevSheet) {
    const sh = screen.querySelector(".sheet");
    if (sh) sh.classList.add("enter");
  }
  prevSheet = state.sheet || null;

  // Arrival animation: only on the render where waiting turns into a result,
  // so later re-renders (ticks, hides) don't replay it.
  const checklistArrived = state.screen === "checklist" && prevPhase === "waiting" && state.checklistPhase === "resolved";
  prevPhase = state.screen === "checklist" ? state.checklistPhase : null;
  if (checklistArrived) {
    // Every item card arrives here, not just AI ones: a note-triggered
    // "model re-run" can add a plain patient item too.
    screen.querySelectorAll(".body-scroll .framing, .body-scroll .item-card").forEach((el, i) => {
      el.style.setProperty("--i", i);
      el.classList.add("arrive");
    });
  }
  const answerArrived = prevQuestionWaiting && !(state.question && state.question.waiting);
  prevQuestionWaiting = !!(state.question && state.question.waiting);
  if (answerArrived) {
    const card = screen.querySelector(".answer-result");
    if (card) card.classList.add("arrive");
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
  } else if (state.screen === "typepick") {
    appbar = `<div class="appbar"><button class="back" data-action="back-to-appointment" aria-label="${esc(t("back"))}">‹</button><span class="title">${esc(t("prepTitle"))}</span><span class="spacer"></span></div>`;
  } else if (state.screen === "checklist") {
    appbar = `<div class="appbar"><button class="back" data-action="back-to-appointment" aria-label="${esc(t("back"))}">‹</button><span class="title">${esc(t("prepTitleForName", state.ctx.patient_display_name))}</span><span class="spacer"></span></div>`;
  }
  return statusbar + appbar;
}

function renderScreenBody() {
  if (state.screen === "appointment") return renderAppointment();
  if (state.screen === "typepick") return renderTypePick();
  if (state.screen === "checklist") return renderChecklist();
  return "";
}

function renderAppointment() {
  const subtitle = !state.consentGiven ? t("entrySubtitleBeforeConsent") : t("entrySubtitleAfterConsent", unresolvedCount());
  // A radiology practice has no single named doctor to show, so "mrt" gets a
  // neutral placeholder instead of the (specific-doctor) avatar photo.
  const avatar =
    appointment === "mrt"
      ? `<div class="avatar-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M4 21V7l8-4 8 4v14M4 21h16M9 21v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
      : `<img src="assets/doctor-avatar.jpg" alt="" />`;

  return `
  <div class="body-scroll">
    <div class="appointment-body">
      <div style="font-size:14px;color:var(--navy-900);font-weight:500;margin-bottom:14px;">${esc(formatDate(state.ctx.appointment_datetime))}</div>
      <div class="doctor-row">
        ${avatar}
        <div>
          <div class="name">${esc(fx().doctorName)}</div>
          <div class="role">${esc(fx().doctorRole)}</div>
        </div>
      </div>
      <div class="actions-row">
        <span class="link move">${esc(t("reschedule"))}</span>
        <span class="link cancel">${esc(t("cancelAppointment"))}</span>
      </div>
      <button class="entry-row" data-action="open-entry" aria-haspopup="dialog">
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span class="text">
          <div class="title">${esc(t("prepTitle"))}</div>
          <div class="subtitle">${esc(subtitle)}</div>
        </span>
        <span class="chevron">›</span>
      </button>
    </div>
  </div>`;
}

function renderTypePick() {
  const opts = state.ctx.type_options
    .map((opt) => {
      const selected = state.typePickSelection === opt;
      return `<button class="typepick-option${selected ? " selected" : ""}" role="radio" aria-checked="${selected}" data-action="select-type" data-value="${esc(opt)}">
        <span class="radio"></span><span>${esc(opt)}</span>
      </button>`;
    })
    .join("");

  return `
  <div class="body-scroll">
    <div class="framing">
      <h2>${esc(t("typePickHeading"))}</h2>
      <p class="sub">${esc(t("typePickIntro", t("practiceEnteredType")))}</p>
    </div>
    <div class="typepick-options" role="radiogroup" aria-label="${esc(t("typePickAriaLabel"))}">${opts}</div>
  </div>
  <div class="typepick-footer">
    <button class="btn-primary" data-action="typepick-weiter" ${state.typePickSelection ? "" : "disabled"}>${esc(t("continueBtn"))}</button>
    <p class="footnote">${esc(t("typePickFootnote"))}</p>
  </div>`;
}

function renderChecklist() {
  let chip = "";
  if (state.ctx.appointment_type_is_generic && state.ctx.patient_type_pick) {
    chip = `<div class="checklist-header-chip"><span>${esc(t("chosenByYou", state.ctx.patient_type_pick))}</span><button data-action="change-type">${esc(t("change"))}</button></div>`;
  }

  let body = "";
  if (state.checklistPhase === "waiting") {
    body = renderWaitingBody();
  } else if (state.payload.state === "error") {
    body = renderFailureBody();
  } else if (isColdStart()) {
    body = renderColdStartBody();
  } else {
    body = renderResolvedBody();
  }

  return `${chip}<div class="body-scroll">${body}</div>${renderFooter()}`;
}

function renderWaitingBody() {
  const hasDefaults = state.ctx.default_items.length > 0;
  const body = hasDefaults
    ? `<div class="item-list">${state.ctx.default_items.map((it) => renderItemCard(normalizeItem(it))).join("")}</div>`
    : `<div class="card-stack">${renderContactCard()}</div>`;
  return `
    <div class="status-line" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>${esc(t("waitingStatus"))}</span></div>
    <div class="item-list"><div class="item-card ai skeleton" aria-hidden="true">
      <span class="ki-badge">${esc(t("kiBadge"))}</span>
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
      <h2>${esc(state.payload.framing)}</h2>
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
  const items = visibleItems().map((it) => renderItemCard(it)).join("");
  return `
    <div class="framing"><h2>${esc(state.payload.framing)}</h2>${sub}</div>
    <div class="item-list">${items}</div>
    ${renderNotesSection()}
  `;
}

function renderItemCard(item) {
  const kind = itemKind(item);
  const st = state.itemState[item.id] || { ticked: false, hidden: false };
  const isAi = kind === "practice-high" || kind === "practice-low";
  let labelChips = "";
  if (kind === "default") labelChips = `<span class="chip">${esc(t("defaultLabel"))}</span>`;
  if (kind === "practice-high") labelChips = `<span class="chip">${esc(t("fromPractice", state.ctx.practice_name))}</span>`;
  if (kind === "practice-low") labelChips = `<span class="chip">${esc(t("fromPractice", state.ctx.practice_name))}</span><span class="chip hedge">${esc(t("hedge"))}</span>`;
  if (kind === "patient-high") labelChips = `<span class="chip">${esc(t("addedByYou"))}</span>`;

  let quote = "";
  if (isAi) {
    quote = `<p class="quote-line" id="quote-${item.id}">„${esc(item.source_quote)}"</p>
      <button class="quote-toggle" data-action="toggle-quote" data-id="${item.id}">${esc(t("showMore"))}</button>`;
  }

  return `
  <div class="item-card${isAi ? " ai" : ""}${st.ticked ? " done" : ""}" data-item-id="${item.id}">
    ${isAi ? `<span class="ki-badge" aria-label="${esc(t("kiBadgeAriaLabel"))}">${esc(t("kiBadge"))}</span>` : ""}
    <div class="item-top">
      <button class="item-checkbox${st.ticked ? " checked" : ""}" role="checkbox" aria-checked="${st.ticked}" aria-label="${esc(item.title)}" data-action="toggle-tick" data-id="${item.id}"></button>
      <div class="item-main">
        <div class="item-title">${esc(item.title)}</div>
        <div class="label-row">${labelChips}</div>
        ${quote}
      </div>
    </div>
    <div class="item-actions">
      <button data-action="dismiss-item" data-id="${item.id}">${esc(t("dismissItem"))}</button>
      <button data-action="why-item" data-id="${item.id}" data-kind="${kind}">${esc(t("whySeeThis"))}</button>
    </div>
  </div>`;
}

// Simulates the AI extraction step for a note: there is no live NLP, so the
// rule is a simple, literal text match against the active language's
// "vaccine card" example chip, which repeats default item d3 and is
// deliberately left out (decision 2026-10-28, matching its "Already on the
// general list" note status). Any other text, including an edited example
// chip, becomes one patient item.
function simulatedItemForNote(note) {
  if (note.text === fx().noteExamples.vaccineCard) return null;
  return {
    id: "sim-" + note.id,
    title: note.text,
    source: "patient",
    action: "do_or_avoid",
    band: "high",
    confidence: 0.8,
    source_quote: note.text
  };
}

// Removes whatever items a note (by its current text) produced, so editing
// or deleting a note cleanly replaces or clears its items.
function removeItemsForNoteText(text) {
  state.payload.results = state.payload.results.filter((r) => !(r.source === "patient" && r.source_quote === text));
}

// Derives each note's status line from the patient items (in the current
// payload) whose source_quote equals the note's own text. Items are matched
// regardless of whether they're rendered as checklist items (unclear ones
// aren't, but still determine the note's status).
function noteStatus(note) {
  const matches = state.payload.results.filter((r) => r.source === "patient" && r.source_quote === note.text);
  if (matches.some((r) => r.action === "unclear")) {
    return { unclear: true, text: t("noteUnclear") };
  }
  const n = matches.length;
  if (n === 0) return { unclear: false, text: t("noteRepeatsDefault") };
  return { unclear: false, text: t("noteItemCount", n) };
}

function renderNotesSection() {
  const notes = state.ctx.patient_notes;
  if (notes.length === 0) return "";
  // Cold start makes no model call, so a note's status can't be derived there.
  const showStatus = !isColdStart();
  let anyUnclear = false;
  const rows = notes
    .map((n) => {
      let statusHtml = "";
      if (showStatus) {
        const status = noteStatus(n);
        if (status.unclear) anyUnclear = true;
        statusHtml = `<p class="status">${esc(status.text)}</p>`;
      }
      return `
    <div class="note-row">
      <div class="text">${esc(n.text)}</div>
      ${statusHtml}
      <div class="row-actions">
        <button data-action="edit-note" data-id="${n.id}" aria-label="${esc(t("editNoteAriaLabel", n.text.slice(0, 40)))}">${esc(t("edit"))}</button>
        <button class="delete" data-action="delete-note" data-id="${n.id}" aria-label="${esc(t("deleteNoteAriaLabel", n.text.slice(0, 40)))}">${esc(t("delete"))}</button>
      </div>
    </div>`;
    })
    .join("");
  return `
  <div class="notes-section">
    <h3 id="notes-heading" tabindex="-1">${esc(t("notesHeading"))}</h3>
    ${rows}
    <p class="notes-footnote">${esc(t("notesFootnote"))}</p>
  </div>
  ${anyUnclear ? `<div class="card-stack">${renderContactCard()}</div>` : ""}`;
}

function renderContactCard() {
  if (state.ctx.practice_contact_lines.length === 0) return "";
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
    <button data-action="open-question">${esc(t("askQuestionFooter"))}</button>
  </div>`;
}

/* ---------------------------- Overlays ---------------------------- */

function renderOverlays() {
  let out = "";
  if (state.sheet === "consent") out += renderConsentSheet();
  if (state.sheet === "notecomposer") out += renderNoteComposerSheet();
  if (state.sheet === "question") out += renderQuestionSheet();
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
  const examples = isAdd
    ? `<div class="example-row">
        <span class="ex-label">${esc(t("examplesLabel"))}</span>
        <button class="example-chip" data-action="fill-example-note" data-text="${esc(fx().noteExamples.medication)}">${esc(fx().noteExamples.medication)}</button>
        <button class="example-chip" data-action="fill-example-note" data-text="${esc(fx().noteExamples.vaccineCard)}">${esc(fx().noteExamples.vaccineCard)}</button>
      </div>`
    : "";
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

function renderQuestionSheet() {
  const q = state.question;
  let resultBlock = "";
  if (q.waiting) {
    resultBlock = `<div class="status-line" aria-live="polite" style="padding:14px 0 0;"><span class="spinner" aria-hidden="true"></span><span>${esc(t("answerSearching"))}</span></div>`;
  } else if (q.answerState) {
    resultBlock = `<div class="answer-result">${renderAnswer(q.answerState)}</div>`;
  }
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="question-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="question-title">${esc(t("questionSheetTitle"))}</h2>
        <button class="sheet-close" data-action="close-sheet" aria-label="${esc(t("close"))}">✕</button>
      </div>
      <p class="intro">${esc(t("questionSheetIntro"))}</p>
      <div class="field-label-row">
        <label for="question-field">${esc(t("questionFieldLabel"))}</label>
        <span class="counter">${q.text.length}/200</span>
      </div>
      <textarea id="question-field" class="field" maxlength="200" data-action="question-text-input">${esc(q.text)}</textarea>
      <div class="example-row">
        <span class="ex-label">${esc(t("exampleQuestionsLabel"))}</span>
        ${Object.keys(fx().answerPayloads)
          .map((k) => `<button class="example-chip" data-action="fill-example-question" data-key="${k}">${esc(fx().answerPayloads[k].question)}</button>`)
          .join("")}
      </div>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="ask-question" ${q.text.trim().length === 0 || q.waiting ? "disabled" : ""}>${esc(t("ask"))}</button>
      </div>
      ${resultBlock}
    </div>
  </div>`;
}

function renderAnswer(key) {
  const a = fx().answerPayloads[key];
  if (a.state === "answered" || a.state === "uncertain") {
    const srcLabel = a.source === "practice" ? t("fromPractice", state.ctx.practice_name) : a.source === "patient" ? t("addedByYou") : t("fromGeneralList");
    return `
    <div class="answer-card">
      <div class="badges">
        <span class="chip">${esc(t("aiAnswerBadge"))}</span>
        ${a.state === "uncertain" ? `<span class="chip hedge">${esc(t("uncertainChip"))}</span>` : ""}
      </div>
      <p class="answer-text">${esc(a.answer)}</p>
      <div class="src-label">${esc(srcLabel)}</div>
      <p class="quote-line">„${esc(a.source_quote)}"</p>
    </div>`;
  }
  if (a.state === "no_answer") {
    return `<div class="msg-block"><p class="msg">${esc(t("noAnswerMsg"))}</p></div><div class="card-stack">${renderContactCard()}</div>`;
  }
  if (a.state === "refused_symptom") {
    return `<div class="msg-block"><p class="msg">${esc(t("refusedSymptomMsg"))}</p></div><div class="card-stack">${renderUrgentCard()}</div>`;
  }
  if (a.state === "error") {
    return `<div class="msg-block"><p class="msg">${esc(t("answerErrorMsg"))}</p></div><button class="retry-btn" data-action="retry-question">${esc(t("retry"))}</button>`;
  }
  return "";
}

function renderWhySheet() {
  const { kind, item } = state.why;
  const title = t("whySeeThis");
  let body = "";
  if (kind === "default") {
    body = `<p class="body-text">${esc(t("whyDefault", state.ctx.appointment_type))}</p>`;
  } else if (kind === "practice-high") {
    body = `<p class="body-text">${esc(t("whyPracticeIntro", state.ctx.practice_name, state.ctx.appointment_type))}</p><p class="quote-line" style="-webkit-line-clamp:unset;">„${esc(item.source_quote)}"</p>`;
  } else if (kind === "practice-low") {
    body = `<p class="body-text">${esc(t("whyPracticeIntro", state.ctx.practice_name, state.ctx.appointment_type))}</p><p class="quote-line" style="-webkit-line-clamp:unset;">„${esc(item.source_quote)}"</p><p class="body-text">${esc(t("whyPracticeLowNote"))}</p>`;
  } else {
    body = `<p class="body-text">${esc(t("whyPatientIntro"))}</p><p class="quote-line" style="-webkit-line-clamp:unset;">„${esc(item.source_quote)}"</p><p class="body-text">${esc(t("whyPatientNote"))}</p>`;
  }
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="why-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row"><h2 id="why-title">${esc(title)}</h2></div>
      ${body}
      <div class="sheet-actions"><button class="btn-primary" data-action="close-sheet">${esc(t("close"))}</button></div>
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

function findItem(id) {
  const all = [...state.payload.results, ...state.ctx.default_items.map((d) => ({ ...d, source: "default" }))];
  return all.find((i) => i.id === id);
}

function onRootClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
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
    case "select-type":
      state.typePickSelection = el.dataset.value;
      render();
      break;
    case "typepick-weiter": {
      const pick = state.typePickSelection;
      state.screen = "checklist";
      if (pick === checkupPickLabel()) {
        // Only this pick loads the fixture default items; the result is
        // whichever state the State control names.
        const variant = buildGenericCheckupVariant(state.scenarioId);
        state.ctx = variant.context;
        state.payload = variant.payload;
        if (state.scenarioId === "waiting") {
          state.checklistPhase = "waiting";
          state.liveMessage = t("waitingStatus");
        } else if (state.scenarioId === "cold_start") {
          state.checklistPhase = "resolved"; // cold start: no model call
        } else {
          state.checklistPhase = "waiting";
          guardedTimeout(() => {
            state.checklistPhase = "resolved";
            render();
          }, WAIT_MS);
        }
      } else {
        // Every other pick, including "I'm not sure", leads to cold start
        // whatever the State control says. The pick still sets both the
        // appointment type and patient_type_pick, so the chip and "Change"
        // stay available from cold start.
        state.ctx.appointment_type = pick;
        state.ctx.patient_type_pick = pick;
        state.payload = clone(fx().checklistPayloads.no_result);
        state.ctx.default_items = [];
        state.ctx.patient_notes = [];
        state.checklistPhase = "resolved";
      }
      render();
      break;
    }
    case "change-type":
      // Preselect the current pick so "Continue" is already enabled and the
      // same choice is highlighted.
      state.typePickSelection = state.ctx.patient_type_pick;
      state.screen = "typepick";
      render();
      break;
    case "toggle-tick": {
      const id = el.dataset.id;
      const cur = state.itemState[id] || { ticked: false, hidden: false };
      state.itemState[id] = { ...cur, ticked: !cur.ticked };
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
    case "why-item": {
      const id = el.dataset.id;
      const kind = el.dataset.kind;
      const item = findItem(id);
      openSheet("why", { why: { kind, item } });
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
      // Demonstrates a successful retry recovering from a transient failure.
      if (genericOn) {
        const variant = buildGenericCheckupVariant("high_confidence");
        state.ctx = variant.context;
        state.payload = variant.payload;
      } else {
        state.payload = clone(fx().checklistPayloads.high_confidence);
        state.ctx.default_items = clone(fx().defaultItemsBase);
        state.ctx.patient_notes = [clone(fx().noteN1)];
      }
      state.checklistPhase = "waiting";
      render();
      guardedTimeout(() => {
        state.checklistPhase = "resolved";
        render();
      }, WAIT_MS);
      break;
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
        const note = { id: "u" + Date.now(), text };
        state.ctx.patient_notes.push(note);
        if (!isColdStart()) {
          const item = simulatedItemForNote(note);
          if (item) state.payload.results.push(item);
        }
      } else {
        const note = state.ctx.patient_notes.find((n) => n.id === state.noteComposer.editingId);
        if (note) {
          removeItemsForNoteText(note.text); // replaces this note's old items
          note.text = text;
          if (!isColdStart()) {
            const item = simulatedItemForNote(note);
            if (item) state.payload.results.push(item);
          }
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
    case "open-question":
      openSheet("question", { question: { text: "", answerState: null, waiting: false, exampleKey: null } });
      break;
    case "fill-example-question":
      state.question.text = fx().answerPayloads[el.dataset.key].question;
      state.question.exampleKey = el.dataset.key;
      state.question.answerState = null;
      render();
      break;
    case "ask-question": {
      // Prefer the example chip that was tapped: two canned questions share
      // identical wording (answered/error both use the same example text in
      // the spec), so text-matching alone can't disambiguate them.
      let matchKey = state.question.exampleKey;
      if (!matchKey) {
        const typed = state.question.text.trim().toLowerCase();
        matchKey = Object.keys(fx().answerPayloads).find((k) => fx().answerPayloads[k].question.trim().toLowerCase() === typed);
      }
      if (!matchKey) matchKey = "no_answer";
      state.question.waiting = true;
      state.question.answerState = null;
      render();
      setTimeout(() => {
        state.question.waiting = false;
        state.question.answerState = matchKey;
        render();
      }, QUESTION_WAIT_MS);
      break;
    }
    case "retry-question":
      state.question.waiting = true;
      state.question.answerState = null;
      render();
      setTimeout(() => {
        state.question.waiting = false;
        state.question.answerState = "answered";
        render();
      }, QUESTION_WAIT_MS);
      break;
  }
}

function onRootInput(e) {
  if (e.target.dataset.action === "note-text-input") {
    state.noteComposer.text = e.target.value;
    state.noteComposer.error = "";
    const counter = e.target.parentElement.querySelector(".counter");
    if (counter) counter.textContent = `${e.target.value.length}/160`;
    return; // avoid full re-render stealing textarea focus/caret
  }
  if (e.target.dataset.action === "question-text-input") {
    state.question.text = e.target.value;
    state.question.exampleKey = null;
    const counter = e.target.parentElement.querySelector(".counter");
    if (counter) counter.textContent = `${e.target.value.length}/200`;
    const askBtn = document.querySelector('[data-action="ask-question"]');
    if (askBtn) askBtn.disabled = e.target.value.trim().length === 0;
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
  const select = document.getElementById("scenario-select");
  SCENARIO_LIST.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    select.appendChild(opt);
  });
  select.addEventListener("change", (e) => changeState(e.target.value));
  document.getElementById("appointment-select").addEventListener("change", (e) => setAppointment(e.target.value));
  document.getElementById("generic-toggle").addEventListener("change", (e) => toggleGeneric(e.target.checked));
  document.getElementById("lang-select").addEventListener("change", (e) => setLang(e.target.value));
  document.getElementById("reset-btn").addEventListener("click", () => fullReset("high_confidence"));

  const root = document.getElementById("screen");
  root.addEventListener("click", onRootClick);
  root.addEventListener("input", onRootInput);
  document.addEventListener("keydown", onKeydown);
}

initControls();
fullReset("high_confidence");
