# MedScript — Devpost Description (DSH Hacks V2, AI x Healthcare)

**Tagline:** Read the worst handwriting in medicine - safely.

**Live:** https://medscript-live.onrender.com/
**Repo:** [GitHub link yahan aayega]
**Video:** [YouTube link yahan aayega]

## Inspiration

In a 2026 study from Karnataka, India, 48% of patients believed language or communication barriers had led to a missed or incorrect diagnosis. Providers struggled to read prescriptions written in unfamiliar hands and languages. One patient in that study took medication incorrectly until a family member intervened.

The artifact at the center of all of this is ordinary: a slip of paper, handwritten in a hurry, folded into a pocket. Every existing report-explainer app we tested assumes a clean PDF or a typed report. Several openly admit that handwritten or blurry input means "please enter values manually." But in most Indian clinics and pharmacies, handwritten paper IS the system. MedScript starts exactly where the others stop: the worst handwriting in medicine.

## What it does

MedScript is a verification-first prescription reader.

1. **Capture with a coach.** The live camera view measures blur, light, glare, framing and left-right alignment in real time. When something is wrong it signals with a double beep and on-screen text (HOLD STEADY, TOO DARK, GLARE, MOVE CLOSER, MOVE LEFT, MOVE RIGHT). No voice - beeps and text only. When the frame is good, it says GOOD.
2. **Enhance.** A client-side image engine (histogram stretch + sharpening) turns a shadowy phone photo into clean, readable paper, shown as a before/after pair.
3. **Transcribe.** A Gemini Flash model (user's own API key) reads the handwriting in any language or script and returns strict JSON: medicine lines with per-line confidence, structured medicines (name, dose, timing, duration), and an "extra" block that captures everything else on the paper - doctor, clinic, date, patient, instructions, stamps.
4. **Verify.** A deterministic safety layer fuzzy-matches every medicine name against a built-in dictionary and raises amber VERIFY flags for low-confidence or unknown items: confirm with pharmacist. Unreadable words are never guessed silently.
5. **Plan.** The output is a draft plan grouped by morning / afternoon / night / as-needed, plus the extra-details block and the raw transcription with confidences.

MedScript never diagnoses, never advises, and never substitutes. Every screen states that the result is a draft for professional verification.

## How we built it

- **Zero backend, zero dependencies.** One HTML file, one JavaScript file, inline SVG icons. No frameworks, no CDNs. Hosted as a static site on Render.
- **Bring Your Own Key.** The Gemini API key lives only in the browser's localStorage and is sent only to Google's Gemini endpoint. There is no server to leak it.
- **Fixed model chain with auto-shift:** gemini-2.5-flash, falling back on its own to gemini-2.0-flash and gemini-flash-latest if one is unavailable. Every fallback is still a Flash model.
- **Capture coach math:** Laplacian variance for blur, mean luminance and clipped-pixel fraction for light and glare, ink-pixel centroid for left/right alignment - computed on a 160x120 downsample every 350 ms.
- **Safety math is not AI:** flags come from Levenshtein-distance dictionary matching and confidence thresholds, computed in plain JavaScript.
- **Testing:** an automated suite covers fuzzy matching, flag logic, plan grouping, the extra-details pattern, and a live request-shape check against the Gemini API.

## Challenges we ran into

- **Orphan timers.** The first build kept beeping after the camera was closed because an old interval survived. Fixed with a hard stop before every start plus a stream guard in the tick function.
- **Handwriting is the worst-case OCR domain.** Instead of hiding low confidence, we made it a first-class UI element: amber VERIFY rows. Doubt became a feature.
- **Safety without a clinician.** We removed every place the model could invent anything: strict JSON schema, an "uncertain" bucket by design, and a deterministic dictionary layer that the LLM cannot override.
- **No backend meant no secrets,** which forced the BYOK design - and turned out to be a privacy advantage worth keeping.

## Accomplishments that we're proud of

- A live, public, verification-first prescription reader at medscript-live.onrender.com, built solo by a 15-year-old.
- 12/12 automated tests green, including a live Gemini request-shape validation.
- A fixed output pattern that never drops anything written on the paper: medicines, timings, confidences, and every extra detail.
- A capture coach that communicates with beeps and text only - usable by people who cannot read the screen language fluently, and by low-vision users through sound.

## What we learned

- Patients do not fail at accessing medical paper; they fail at reading it. Format and verification design carry more clinical value than raw model intelligence.
- Deterministic checks earn more trust than confident models. Judges, pharmacists and families all ask "how do you know?" - a dictionary match and a confidence threshold are answerable; a vibe is not.
- Honesty about failure cases (blank pages, torn corners, upside-down sheets) made the evaluation stronger, not weaker.

## What's next for MedScript

- End-to-end transcription accuracy numbers on the synthetic Rx dataset, measured with the Gemini Flash chain at submission time (harness included in the repo).
- A caregiver share view and a read-aloud mode in local languages for low-literacy users.
- A pharmacy-mode pilot: one counter, one week, real feedback from one pharmacist.
- Open-sourcing the synthetic prescription generator so others can evaluate handwriting pipelines honestly.
