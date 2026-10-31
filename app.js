/*
  Prototype app logic. Single state object + full re-render on every change.
  Fixture-driven: scenarios come from fixtures.js, no live model calls.
  Adding/editing/deleting a note "re-runs the model" by simulating the waiting
  state and then re-showing the SAME scenario payload (the brief's checklist
  content is fixed fixture data; only the notes list and tick/hide state are
  truly dynamic in this prototype). Cold start never shows a waiting spinner,
  per the brief ("Cold start: No model call").
*/

const WAIT_MS = 1400;
const QUESTION_WAIT_MS = 1000;

let state = null;
let lastFocusedEl = null;

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

function resetToScenario(id) {
  state = freshState(id);
  render();
}

function formatDateDE(iso) {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(d);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat("de-DE", { month: "long" }).format(d);
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${weekday}, ${day}. ${month} ${year} · ${hh}:${mm}`;
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
  const patient = p.results.filter((r) => r.source === "patient");
  let ordered = [];
  if (p.state === "low_confidence") {
    ordered = [...practice, ...patient, ...def];
  } else if (p.state === "no_result" || p.state === "error") {
    ordered = isColdStart() || p.state === "error" ? [] : [...def];
  } else {
    // high_confidence / mixed_confidence
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
  if (item.source === "patient" && item.action === "unclear") return "patient-unclear";
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
  state.liveMessage = "Ihre Vorbereitungsinfos werden geprüft …";
  render();
  setTimeout(() => {
    state.checklistPhase = "resolved";
    state.liveMessage = "Ihre Checkliste wurde aktualisiert.";
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
    setTimeout(() => {
      if (state.screen === "checklist") {
        state.checklistPhase = "resolved";
        render();
      }
    }, WAIT_MS);
  }
  render();
}

function currentFrameLabel() {
  // Overlays take priority: a sheet/dialog can sit on top of any screen.
  if (state.dialog === "delete") return "13 — Delete confirmation";
  if (state.sheet === "consent") return "1 — Consent (bottom sheet)";
  if (state.sheet === "notecomposer") return state.noteComposer.mode === "add" ? "10 — Note composer (add)" : "11 — Note composer (edit)";
  if (state.sheet === "why") return "Warum sehe ich das? sheet";
  if (state.sheet === "question") {
    const m = { answered: "15", uncertain: "16", no_answer: "17", refused_symptom: "18", error: "19" };
    if (state.question.answerState) return `${m[state.question.answerState]} — Answer: ${state.question.answerState}`;
    return "14 — Question sheet (empty)";
  }
  if (state.screen === "appointment") return state.consentGiven ? "0 — Entry point (after consent)" : "0 — Entry point";
  if (state.screen === "typepick") return "9 — Type pick";
  if (state.screen === "checklist") {
    if (state.checklistPhase === "waiting") return "2 — Waiting";
    if (isColdStart()) return "7 — Cold start";
    if (state.payload.state === "error") return "6 — Failure";
    if (state.payload.state === "no_result") return "5 — No result";
    if (state.payload.state === "high_confidence") return "3 — High confidence";
    if (state.payload.state === "low_confidence") return "4 — Low confidence";
    if (state.payload.state === "mixed_confidence") return "8 — Mixed confidence";
  }
  return "";
}

/* ---------------------------- Rendering ---------------------------- */

function render() {
  document.getElementById("frame-badge").textContent = currentFrameLabel();
  document.getElementById("scenario-select").value = state.scenarioId;

  const screen = document.getElementById("screen");
  screen.innerHTML = renderStatusAndAppbar() + renderScreenBody() + renderOverlays();

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
    appbar = `<div class="appbar"><span class="spacer"></span><span class="title">Informationen zum Termin</span><span class="spacer"></span></div>`;
  } else if (state.screen === "typepick") {
    appbar = `<div class="appbar"><button class="back" data-action="back-to-appointment" aria-label="Zurück">‹</button><span class="title">Vorbereitung</span><span class="spacer"></span></div>`;
  } else if (state.screen === "checklist") {
    appbar = `<div class="appbar"><button class="back" data-action="back-to-appointment" aria-label="Zurück">‹</button><span class="title">Vorbereitung · Für ${esc(state.ctx.patient_display_name)}</span><span class="spacer"></span></div>`;
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
  const subtitle = !state.consentGiven
    ? "Hilfe bei der Vorbereitung auf Ihren Termin"
    : (() => {
        const n = unresolvedCount();
        return n === 1 ? "1 Punkt vor Ihrem Termin prüfen" : `${n} Punkte vor Ihrem Termin prüfen`;
      })();

  return `
  <div class="body-scroll">
    <div class="appointment-body">
      <div style="font-size:14px;color:var(--navy-900);font-weight:500;margin-bottom:14px;">${esc(formatDateDE(state.ctx.appointment_datetime))}</div>
      <div class="doctor-row">
        <img src="assets/doctor-avatar.jpg" alt="" />
        <div>
          <div class="name">Frau Dr. Jane Musterfrau</div>
          <div class="role">Hausärztin / Allgemeinmedizinerin</div>
        </div>
      </div>
      <div class="actions-row">
        <span class="link move">Verschieben</span>
        <span class="link cancel">Termin absagen</span>
      </div>
      <button class="entry-row" data-action="open-entry" aria-haspopup="dialog">
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span class="text">
          <div class="title">Vorbereitung</div>
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
      <h2>Worum geht es bei diesem Termin?</h2>
      <p class="sub">Ihre Praxis hat den Termin als „${esc(state.ctx.appointment_type)}" eingetragen. Wählen Sie, worum es geht.</p>
    </div>
    <div class="typepick-options" role="radiogroup" aria-label="Terminart wählen">${opts}</div>
  </div>
  <div class="typepick-footer">
    <button class="btn-primary" data-action="typepick-weiter" ${state.typePickSelection ? "" : "disabled"}>Weiter</button>
    <p class="footnote">Ihre Auswahl wird nach dem Termin gelöscht.</p>
  </div>`;
}

function renderChecklist() {
  let chip = "";
  if (state.ctx.appointment_type_is_generic && state.ctx.patient_type_pick) {
    chip = `<div class="checklist-header-chip"><span>Von Ihnen gewählt: ${esc(state.ctx.patient_type_pick)}</span><button data-action="change-type">Ändern</button></div>`;
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
  const items = state.ctx.default_items.map((it) => renderItemCard(normalizeItem(it))).join("");
  return `
    <div class="status-line" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>Ihre Vorbereitungsinfos werden geprüft …</span></div>
    <p class="framing sub" style="padding-top:0;">In der Zwischenzeit, das wird meistens benötigt:</p>
    <div class="item-list">${items}</div>
    ${renderNotesSection()}
  `;
}

function renderFailureBody() {
  return `
    <div class="framing">
      <h2>${esc(state.payload.framing)}</h2>
      <p class="sub">Bitte versuchen Sie es erneut oder wenden Sie sich an Ihre Praxis.</p>
    </div>
    <button class="retry-btn" data-action="retry-checklist">Erneut versuchen</button>
    <div class="card-stack">
      ${renderContactCard()}
      ${renderUrgentCard()}
    </div>
  `;
}

function renderColdStartBody() {
  return `
    <div class="framing"><h2>Für diesen Termin gibt es noch keine Vorbereitungsinfos.</h2></div>
    <div class="card-stack">
      ${renderContactCard()}
      ${renderUrgentCard()}
    </div>
    ${renderNotesSection()}
  `;
}

function renderResolvedBody() {
  const sub = state.payload.state === "no_result" ? `<p class="sub">Die allgemeine Liste für diese Terminart:</p>` : "";
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
  if (kind === "default") labelChips = `<span class="chip">Für diese Terminart meist nötig</span>`;
  if (kind === "practice-high") labelChips = `<span class="chip">Von ${esc(state.ctx.practice_name)}</span>`;
  if (kind === "practice-low") labelChips = `<span class="chip">Von ${esc(state.ctx.practice_name)}</span><span class="chip hedge">Bitte prüfen</span>`;
  if (kind === "patient-high") labelChips = `<span class="chip">Von Ihnen hinzugefügt</span>`;
  if (kind === "patient-unclear") labelChips = `<span class="chip">Von Ihnen hinzugefügt (unklar)</span>`;

  let quote = "";
  if (isAi) {
    quote = `<p class="quote-line" id="quote-${item.id}">„${esc(item.source_quote)}"</p>
      <button class="quote-toggle" data-action="toggle-quote" data-id="${item.id}">Mehr anzeigen</button>`;
  }

  return `
  <div class="item-card${isAi ? " ai" : ""}${st.ticked ? " done" : ""}" data-item-id="${item.id}">
    ${isAi ? `<span class="ki-badge" aria-label="Von KI in den Informationen Ihrer Praxis gefunden">KI</span>` : ""}
    <div class="item-top">
      <button class="item-checkbox${st.ticked ? " checked" : ""}" role="checkbox" aria-checked="${st.ticked}" aria-label="${esc(item.title)}" data-action="toggle-tick" data-id="${item.id}"></button>
      <div class="item-main">
        <div class="item-title">${esc(item.title)}</div>
        <div class="label-row">${labelChips}</div>
        ${quote}
      </div>
    </div>
    <div class="item-actions">
      <button data-action="dismiss-item" data-id="${item.id}">Trifft auf mich nicht zu</button>
      <button data-action="why-item" data-id="${item.id}" data-kind="${kind}">Warum sehe ich das?</button>
    </div>
  </div>`;
}

function renderNotesSection() {
  const notes = state.ctx.patient_notes;
  if (notes.length === 0) return "";
  const rows = notes
    .map(
      (n) => `
    <div class="note-row">
      <div class="text">${esc(n.text)}</div>
      <div class="row-actions">
        <button data-action="edit-note" data-id="${n.id}" aria-label="Notiz bearbeiten: ${esc(n.text.slice(0, 40))}">Bearbeiten</button>
        <button class="delete" data-action="delete-note" data-id="${n.id}" aria-label="Notiz löschen: ${esc(n.text.slice(0, 40))}">Löschen</button>
      </div>
    </div>`
    )
    .join("");
  return `
  <div class="notes-section">
    <h3 id="notes-heading" tabindex="-1">Ihre Vorbereitungsnotizen</h3>
    ${rows}
    <p class="notes-footnote">Ihre Notizen werden nach dem Termin gelöscht.</p>
  </div>`;
}

function renderContactCard() {
  if (state.ctx.practice_contact_lines.length === 0) return "";
  return `
  <div class="info-card">
    <h4>Kontaktdaten der Praxis</h4>
    <p>${esc(state.ctx.practice_name)}</p>
    ${state.ctx.practice_contact_lines.map((l) => `<p>${esc(l)}</p>`).join("")}
    <p class="disclaimer">Antworten hängen von der Praxis ab.</p>
  </div>`;
}

function renderUrgentCard() {
  return `
  <div class="info-card urgent">
    <h4>Sie können nicht bis zu Ihrem Termin warten?</h4>
    <p>Rufen Sie den ärztlichen Bereitschaftsdienst unter 116117 an. Im Notfall rufen Sie die 112.</p>
  </div>`;
}

function renderFooter() {
  const notes = state.ctx.patient_notes;
  const atLimit = notes.length >= 5;
  return `
  <div class="checklist-footer">
    <button data-action="open-note-composer" ${atLimit ? "disabled" : ""}>+ Vorbereitungsnotiz hinzufügen</button>
    ${atLimit ? `<span class="notes-limit-msg">Sie können bis zu 5 Notizen hinzufügen.</span>` : ""}
    <button data-action="open-question">Frage zur Vorbereitung stellen</button>
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
        <h2 id="consent-title">Vorbereitung</h2>
        <button class="sheet-close" data-action="decline-consent" aria-label="Schließen">✕</button>
      </div>
      <div class="sheet-illustration" aria-hidden="true"></div>
      <h3 class="heading">Wir helfen bei der Vorbereitung auf den Termin für ${esc(state.ctx.patient_display_name)}</h3>
      <p class="body-text">Eine KI prüft die Informationen, die Ihre Praxis für diese Terminart bereitstellt, und Ihre eigenen Vorbereitungsnotizen. Daraus entsteht eine persönliche Checkliste. Gesundheitsangaben werden nicht gelesen oder bewertet, nur Organisatorisches wie Dokumente, Nüchternheit oder Formulare. Ihre Checkliste und Ihre Notizen werden nach dem Termin gelöscht.</p>
      <p class="footnote">Wird einmal gefragt. Sie können die Vorbereitungshilfe jederzeit in den Einstellungen ausschalten. Für jedes Familienmitglied gibt es eine eigene Einstellung.</p>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="accept-consent">Vorbereitungshilfe einschalten</button>
        <button class="btn-text" data-action="decline-consent">Nicht jetzt</button>
      </div>
    </div>
  </div>`;
}

function renderNoteComposerSheet() {
  const nc = state.noteComposer;
  const isAdd = nc.mode === "add";
  const title = isAdd ? "Vorbereitungsnotiz hinzufügen" : "Vorbereitungsnotiz bearbeiten";
  const examples = isAdd
    ? `<div class="example-row">
        <span class="ex-label">Beispiele</span>
        <button class="example-chip" data-action="fill-example-note" data-text="Das in der Sprechstunde besprochene Medikament pausieren">Das in der Sprechstunde besprochene Medikament pausieren</button>
        <button class="example-chip" data-action="fill-example-note" data-text="Impfpass mitbringen">Impfpass mitbringen</button>
      </div>`
    : "";
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="note-title">${title}</h2>
        <button class="sheet-close" data-action="close-sheet" aria-label="Schließen">✕</button>
      </div>
      <p class="intro">Notieren Sie, was Ihre Praxis Ihnen zur Vorbereitung gesagt hat, zum Beispiel beim letzten Termin.</p>
      <div class="field-label-row">
        <label for="note-field">Ihre Notiz</label>
        <span class="counter">${nc.text.length}/160</span>
      </div>
      <textarea id="note-field" class="field" maxlength="160" data-action="note-text-input">${esc(nc.text)}</textarea>
      <div class="validation-msg">${nc.error ? esc(nc.error) : ""}</div>
      ${examples}
      <p class="helper-text">Nur für die Vorbereitung, nicht für Beschwerden. Die Notiz wird nach dem Termin gelöscht.</p>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="save-note">Speichern</button>
        <button class="btn-text" data-action="close-sheet">Abbrechen</button>
      </div>
    </div>
  </div>`;
}

function renderQuestionSheet() {
  const q = state.question;
  let resultBlock = "";
  if (q.waiting) {
    resultBlock = `<div class="status-line" aria-live="polite" style="padding:14px 0 0;"><span class="spinner" aria-hidden="true"></span><span>Antwort wird gesucht …</span></div>`;
  } else if (q.answerState) {
    resultBlock = renderAnswer(q.answerState);
  }
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="question-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row">
        <h2 id="question-title">Frage zur Vorbereitung</h2>
        <button class="sheet-close" data-action="close-sheet" aria-label="Schließen">✕</button>
      </div>
      <p class="intro">Antworten kommen nur aus den Informationen Ihrer Praxis, Ihren Notizen und der allgemeinen Liste. Fragen zu Beschwerden werden nicht beantwortet.</p>
      <div class="field-label-row">
        <label for="question-field">Ihre Frage</label>
        <span class="counter">${q.text.length}/200</span>
      </div>
      <textarea id="question-field" class="field" maxlength="200" data-action="question-text-input">${esc(q.text)}</textarea>
      <div class="example-row">
        <span class="ex-label">Beispielfragen (zum Ausprobieren der Antwortzustände)</span>
        ${Object.keys(ANSWER_PAYLOADS)
          .map((k) => `<button class="example-chip" data-action="fill-example-question" data-key="${k}">${esc(ANSWER_PAYLOADS[k].question)}</button>`)
          .join("")}
      </div>
      <div class="sheet-actions">
        <button class="btn-primary" data-action="ask-question" ${q.text.trim().length === 0 || q.waiting ? "disabled" : ""}>Fragen</button>
      </div>
      ${resultBlock}
    </div>
  </div>`;
}

function renderAnswer(key) {
  const a = ANSWER_PAYLOADS[key];
  if (a.state === "answered" || a.state === "uncertain") {
    const srcLabel = a.source === "practice" ? `Von ${esc(state.ctx.practice_name)}` : a.source === "patient" ? "Von Ihnen hinzugefügt" : "Aus der allgemeinen Liste";
    return `
    <div class="answer-card">
      <div class="badges">
        <span class="chip">KI-Antwort</span>
        ${a.state === "uncertain" ? `<span class="chip hedge">Unsicher, bitte bei Ihrer Praxis prüfen</span>` : ""}
      </div>
      <p class="answer-text">${esc(a.answer)}</p>
      <div class="src-label">${srcLabel}</div>
      <p class="quote-line">„${esc(a.source_quote)}"</p>
    </div>`;
  }
  if (a.state === "no_answer") {
    return `<div class="msg-block"><p class="msg">Die Informationen Ihrer Praxis sagen dazu nichts.</p></div><div class="card-stack">${renderContactCard()}</div>`;
  }
  if (a.state === "refused_symptom") {
    return `<div class="msg-block"><p class="msg">Fragen zu Beschwerden kann ich nicht beantworten.</p></div><div class="card-stack">${renderUrgentCard()}</div>`;
  }
  if (a.state === "error") {
    return `<div class="msg-block"><p class="msg">Ihre Frage konnte gerade nicht beantwortet werden.</p></div><button class="retry-btn" data-action="retry-question">Erneut versuchen</button>`;
  }
  return "";
}

function renderWhySheet() {
  const { kind, item } = state.why;
  let title = "Warum sehe ich das?";
  let body = "";
  if (kind === "default") {
    body = `<p class="body-text">Dieser Punkt steht auf der allgemeinen Liste für die Terminart „${esc(state.ctx.appointment_type)}". Die Liste wird von Doctolib erstellt und medizinisch geprüft.</p>`;
  } else if (kind === "practice-high") {
    body = `<p class="body-text">Eine KI hat diesen Punkt in den Informationen von ${esc(state.ctx.practice_name)} zur Terminart „${esc(state.ctx.appointment_type)}" gefunden. Er stammt aus diesem Satz:</p><p class="quote-line" style="-webkit-line-clamp:unset;">„${esc(item.source_quote)}"</p>`;
  } else if (kind === "practice-low") {
    body = `<p class="body-text">Eine KI hat diesen Punkt in den Informationen von ${esc(state.ctx.practice_name)} zur Terminart „${esc(state.ctx.appointment_type)}" gefunden. Er stammt aus diesem Satz:</p><p class="quote-line" style="-webkit-line-clamp:unset;">„${esc(item.source_quote)}"</p><p class="body-text">Der Satz ist nicht eindeutig. Bitte klären Sie mit Ihrer Praxis, ob er für Sie gilt.</p>`;
  } else {
    body = `<p class="body-text">Diesen Punkt haben Sie in einer Vorbereitungsnotiz hinzugefügt. Die Notiz wird nach dem Termin gelöscht.</p>`;
  }
  return `
  <div class="backdrop" data-action="close-sheet-backdrop">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="why-title">
      <div class="sheet-handle"></div>
      <div class="sheet-title-row"><h2 id="why-title">${title}</h2></div>
      ${body}
      <div class="sheet-actions"><button class="btn-primary" data-action="close-sheet">Schließen</button></div>
    </div>
  </div>`;
}

function renderDeleteDialog() {
  return `
  <div class="backdrop center" data-action="cancel-delete">
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
      <h2 id="del-title">Notiz löschen?</h2>
      <p>Punkte aus dieser Notiz werden aus Ihrer Checkliste entfernt.</p>
      <div class="dialog-actions">
        <button class="cancel" data-action="cancel-delete">Abbrechen</button>
        <button class="confirm" data-action="confirm-delete">Löschen</button>
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
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const action = t.dataset.action;

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
      if (e.target === t) closeSheet();
      break;
    case "close-sheet":
      closeSheet();
      break;
    case "back-to-appointment":
      state.screen = "appointment";
      render();
      break;
    case "select-type":
      state.typePickSelection = t.dataset.value;
      render();
      break;
    case "typepick-weiter": {
      const pick = state.typePickSelection;
      state.ctx.patient_type_pick = pick;
      if (pick === "Ich bin mir nicht sicher") {
        state.payload = clone(CHECKLIST_PAYLOADS.no_result);
        state.ctx.default_items = [];
        state.screen = "checklist";
        state.checklistPhase = "resolved";
      } else {
        // No fixture is specified for a post-type-pick appointment in the brief;
        // this prototype resolves it to a representative practice-only result.
        state.payload = clone(CHECKLIST_PAYLOADS.mixed_confidence);
        state.ctx.default_items = clone(DEFAULT_ITEMS_BASE);
        state.screen = "checklist";
        state.checklistPhase = "waiting";
        setTimeout(() => {
          state.checklistPhase = "resolved";
          render();
        }, WAIT_MS);
      }
      render();
      break;
    }
    case "change-type":
      state.screen = "typepick";
      render();
      break;
    case "toggle-tick": {
      const id = t.dataset.id;
      const cur = state.itemState[id] || { ticked: false, hidden: false };
      state.itemState[id] = { ...cur, ticked: !cur.ticked };
      render();
      break;
    }
    case "dismiss-item": {
      const id = t.dataset.id;
      const cur = state.itemState[id] || { ticked: false, hidden: false };
      state.itemState[id] = { ...cur, hidden: true };
      render();
      break;
    }
    case "why-item": {
      const id = t.dataset.id;
      const kind = t.dataset.kind;
      const item = findItem(id);
      openSheet("why", { why: { kind, item } });
      break;
    }
    case "toggle-quote": {
      const el = document.getElementById("quote-" + t.dataset.id);
      if (el) {
        el.classList.toggle("expanded");
        t.textContent = el.classList.contains("expanded") ? "Weniger anzeigen" : "Mehr anzeigen";
      }
      break;
    }
    case "retry-checklist":
      // Demonstrates a successful retry recovering from a transient failure.
      state.payload = clone(CHECKLIST_PAYLOADS.high_confidence);
      state.ctx.default_items = clone(DEFAULT_ITEMS_BASE);
      state.ctx.patient_notes = [clone(NOTE_N1)];
      state.checklistPhase = "waiting";
      render();
      setTimeout(() => {
        state.checklistPhase = "resolved";
        render();
      }, WAIT_MS);
      break;
    case "open-note-composer":
      openSheet("notecomposer", { noteComposer: { mode: "add", editingId: null, text: "", error: "" } });
      break;
    case "edit-note": {
      const note = state.ctx.patient_notes.find((n) => n.id === t.dataset.id);
      openSheet("notecomposer", { noteComposer: { mode: "edit", editingId: note.id, text: note.text, error: "" } });
      break;
    }
    case "fill-example-note":
      state.noteComposer.text = t.dataset.text;
      render();
      document.getElementById("note-field").focus();
      break;
    case "save-note": {
      const text = state.noteComposer.text.trim();
      if (text.length < 3) {
        state.noteComposer.error = "Bitte geben Sie mindestens 3 Zeichen ein.";
        render();
        return;
      }
      if (state.noteComposer.mode === "add") {
        state.ctx.patient_notes.push({ id: "u" + Date.now(), text });
      } else {
        const note = state.ctx.patient_notes.find((n) => n.id === state.noteComposer.editingId);
        if (note) note.text = text;
      }
      state.sheet = null;
      runModelReRun();
      break;
    }
    case "delete-note":
      openDialog("delete", { deleteTarget: t.dataset.id });
      break;
    case "cancel-delete":
      if (e.target === t || t.dataset.action === "cancel-delete") closeDialog();
      break;
    case "confirm-delete":
      state.ctx.patient_notes = state.ctx.patient_notes.filter((n) => n.id !== state.deleteTarget);
      state.deleteTarget = null;
      state.dialog = null;
      state.liveMessage = "Notiz gelöscht.";
      state.focusNotesHeadingNext = true;
      runModelReRun();
      break;
    case "open-question":
      openSheet("question", { question: { text: "", answerState: null, waiting: false, exampleKey: null } });
      break;
    case "fill-example-question":
      state.question.text = ANSWER_PAYLOADS[t.dataset.key].question;
      state.question.exampleKey = t.dataset.key;
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
        matchKey = Object.keys(ANSWER_PAYLOADS).find((k) => ANSWER_PAYLOADS[k].question.trim().toLowerCase() === typed);
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
  select.addEventListener("change", (e) => resetToScenario(e.target.value));
  document.getElementById("reset-btn").addEventListener("click", () => resetToScenario(state.scenarioId));

  const root = document.getElementById("screen");
  root.addEventListener("click", onRootClick);
  root.addEventListener("input", onRootInput);
  document.addEventListener("keydown", onKeydown);
}

initControls();
resetToScenario("high_confidence");
