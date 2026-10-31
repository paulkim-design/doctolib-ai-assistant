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

Use the **Szenario** dropdown at the top to jump straight into any of the 7
checklist states (high/mixed/low confidence, no result, failure, cold start,
generic type pick). The badge on the right names the matching Figma frame
number for cross-reference.

## What's real vs. simulated

This is a frontend prototype with **no live model calls** (per your choice).
Concretely:

- Checklist content for each scenario is the exact fixture payload from the
  spec files — it never regenerates from what you type.
- Adding, editing or deleting a preparation note re-runs the "waiting" state
  (per the brief) but then re-shows the same fixture payload — the notes
  list itself is fully live (add/edit/delete, 5-note limit), only the AI
  checklist content is static.
- The question sheet has 5 example chips (one per answer state) that fill
  in the exact canned questions from the payload doc — tap one, then
  "Fragen" to see that exact answer state. Typing anything else resolves to
  `no_answer` (a safe fallback; there's no live NLP to match arbitrary text).
- "Erneut versuchen" (both on the failure screen and the error answer)
  simulates a successful retry rather than repeating the same failure, to
  demonstrate recovery.

## Interpretations I made where the spec didn't fully pin something down

- **Item ordering**: the brief's prose and the wireframe agree for
  high/mixed confidence (practice → default → patient) but the wireframe
  shows low confidence ordering practice → patient (unclear note) →
  default. I followed the wireframe where prose was silent.
- **"Warum sehe ich das?" sheet**: has no dedicated wireframe frame, but
  full copy exists in the brief (§5/§6). Built as a bottom sheet matching
  the note composer's pattern.
- **Post-type-pick result**: no fixture is specified for what a generic
  appointment resolves to after a type is picked. Picking "Ich bin mir
  nicht sicher" correctly goes to cold start (per spec); any other pick
  resolves to the mixed-confidence fixture as a representative result.
- **Cold start + notes**: "no model call" is taken literally — adding a
  note while in cold start updates the notes list but never shows a
  waiting spinner or changes the screen, since there's no practice source
  to re-check.

## Files

- `index.html` — shell, Google Fonts (Montserrat/Roboto), scenario switcher
- `styles.css` — design tokens from `DesignSystem/tokens.json`, components
- `fixtures.js` — appointment contexts + checklist/answer payloads, verbatim
- `app.js` — state machine, rendering, interactions
- `assets/` — Doctolib wordmark + doctor avatar, copied from `DesignSystem/`
