# Vorbereitung — clickable prototype

A fixture-driven, click-through mobile prototype of the "Appointment Preparation
Assistant" feature, built from:

- `4-prototype_m2-doctolib_design-context-brief.md` (behavior, copy, scope, a11y)
- `4-prototype_m2-doctolib_payloads-checklist.md` / `-payloads-answers.md` (fixture data)
- the Figma wireframe (`M2 Doctolib`, node 64:1494) — confirmed all 20 states
- `DesignSystem/` — visual language measured from real Doctolib screenshots

## Run it

Open `index.html` directly in a browser, or serve the folder (e.g.
`python3 -m http.server`) and visit it — either works, there's no backend.

Use the **State** dropdown at the top to jump straight into any of the 7
checklist states (high/mixed/low confidence, no result, failure, cold start,
waiting). The **Generic appointment type** toggle next to it switches the
appointment to a generic type ("Sprechstunde"): turning it on sends you
through the entry row, consent (if not already given) and the type pick
screen, where only "Gesundheits-Check-up" resolves to the State dropdown's
selected state with real default items — every other pick, including "Ich
bin mir nicht sicher", resolves to cold start regardless of the dropdown.
Toggling that control, in either direction, resets the phone to the entry
point (ticks, hidden items and notes), without touching consent. The badge on the
right names the matching Figma frame number for cross-reference, with
"· generic" appended while the toggle is on.

The **Language** dropdown switches the phone between German (the product's
default) and English, for testers who need to read and act on an English
version. It translates everything on the phone: UI chrome (headings, labels,
buttons) and the simulated content (item titles, quotes, patient notes,
questions/answers) — see `fixtures.js`'s `_EN` fixture sets. Switching
language, like the generic toggle, resets the phone to the entry point but
keeps the current State selection, the generic toggle and consent. The
reviewer control bar itself always stays in English, regardless of this
switch.

The **Appointment** dropdown switches between two people's appointments:
**Check-up** (the default, everything described above) and **MRT Knie**, a
knee MRI at a different practice ("Radiologie am Musterplatz" /
"Musterplatz Radiology"). The MRT appointment only has one checklist
state — high confidence, 4 practice items plus the 3 default items — so
while it's selected, the State dropdown and the Generic appointment type
toggle are disabled (the dropdown shows "High confidence", the toggle is
off). Its question sheet has 3 example chips instead of 5: a referral
question specific to the MRT, plus the check-up's parking and dizziness
chips reused verbatim (they don't reference a specific appointment type);
the water, coffee and error chips are check-up-only and don't appear.
Preparation notes and the note-to-item simulation work exactly as for the
check-up. Switching appointments, in either direction, resets the phone to
the entry point and clears ticks, hidden items, notes **and consent** — a
fuller reset than the Generic toggle or Language switch, since it's a
different person's appointment, not just a different view of the same one.
The State dropdown's last value is remembered per appointment, so a trip
through MRT and back doesn't lose your place in the check-up's states. The
frame badge appends "· MRT" while this appointment is active.

## What's real vs. simulated

This is a frontend prototype with **no live model calls** (per your choice).
Concretely:

- Checklist content for each scenario starts as the exact fixture payload
  from the spec files, but a note you add or edit goes through a simulated
  "AI extraction" step (see below) rather than just replaying the same
  fixture — there's still no live NLP, so the rule is a simple literal text
  match, not real understanding of what you typed.
- Adding, editing or deleting a preparation note re-runs the "waiting" state
  (per the brief); the notes list and the items derived from it are fully
  live (add/edit/delete, 5-note limit).
- Simulated note-to-item rule: typing (or picking the example chip for) "Das
  in der Sprechstunde besprochene Medikament pausieren" or any other text
  produces one patient item (title = the full note, action `do_or_avoid`,
  band `high`). The other example chip, "Impfpass mitbringen", produces no
  item — it repeats default item d3, so its note status reads "Steht schon
  auf der allgemeinen Liste" instead. Editing a note replaces its item(s);
  deleting one removes them. This doesn't run in failure (no notes section
  shown there) or cold start (no model call — the note still shows, just
  without a status line).
- The question sheet has one example chip per available answer state (5 for
  the check-up, 3 for the MRT — see the Appointment section above) that fill
  in the exact canned questions from the payload doc — tap one, then
  "Fragen" to see that exact answer state. Typing anything else resolves to
  `no_answer` (a safe fallback; there's no live NLP to match arbitrary text).
- "Erneut versuchen" (both on the failure screen and the error answer)
  simulates a successful retry rather than repeating the same failure, to
  demonstrate recovery.

## Interpretations I made where the spec didn't fully pin something down

- **Item ordering**: practice → default → patient, for every state. The
  wireframe showed low confidence as practice → patient (unclear note) →
  default, but the unclear note is no longer rendered as a checklist item at
  all (it stays in the notes section instead), and a live-added item in low
  confidence is a plain patient item like any other, so there's no longer a
  case where low confidence's patient bucket needs its own position.
- **"Warum sehe ich das?" sheet**: has no dedicated wireframe frame, but
  full copy exists in the brief (§5/§6). Built as a bottom sheet matching
  the note composer's pattern.
- **Cold start + notes**: "no model call" is taken literally — adding a
  note while in cold start updates the notes list but never shows a
  waiting spinner or changes the screen, since there's no practice source
  to re-check.

## Files

- `index.html` — shell, Google Fonts (Montserrat/Roboto), scenario switcher
- `styles.css` — design tokens from `DesignSystem/tokens.json`, components
- `fixtures.js` — appointment contexts + checklist/answer payloads for both
  appointments (check-up, MRT Knie), verbatim German from the spec files
  plus a hand-translated English mirror for each
- `app.js` — state machine, rendering, interactions
- `assets/` — Doctolib wordmark + doctor avatar, copied from `DesignSystem/`
