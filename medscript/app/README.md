# MedScript

**Read the worst handwriting in medicine — safely.**
Verification-first transcription of handwritten prescriptions and medicine notes.
Built for DSH Hacks V2 (AI x Healthcare), November 2026.

## What it does
1. Capture a prescription photo (live camera with a quality coach, or upload).
2. The coach checks blur / light / glare / framing / left-right alignment in real time and signals with a double beep ("pep-pep") plus on-screen text: HOLD STEADY, TOO DARK, GLARE, MOVE CLOSER, MOVE LEFT, MOVE RIGHT, GOOD.
3. The image is enhanced (histogram stretch + sharpen) and shown before/after.
4. A Gemini vision model (user's own API key) transcribes the handwriting into strict JSON.
5. A deterministic safety layer cross-checks every medicine name against a built-in dictionary (fuzzy match) and flags low-confidence or unknown items: "Verify with pharmacist".
6. Output is a draft plan grouped by timing (morning / afternoon / night / as needed), plus raw transcription with per-line confidence.

MedScript never diagnoses and never advises. Every output is a draft for professional verification.

## Bring Your Own Key (BYOK)
- The Gemini API key is stored only in the browser (localStorage).
- It is sent only to Google's Gemini API endpoint.
- There is no backend, no database, no tracking.

## Run locally
```
cd app
python3 -m http.server 8000
open http://localhost:8000
```
Any static host works (GitHub Pages, Netlify, Render static). HTTPS is required for live camera access.

## Stack
- Vanilla JavaScript, zero dependencies, zero CDNs. All icons and the logo are inline SVG.
- WebAudio for coach beeps. Canvas for capture analysis and enhancement.
- Gemini API (vision) for handwriting transcription, called client-side with the user's key.

## Safety design
- Flags are computed deterministically (dictionary fuzzy match + confidence thresholds), not by the LLM.
- Unreadable words are returned as "uncertain" by design; the UI always shows them as verify-items.
- A permanent disclaimer states the draft-for-verification nature of every result.

## Status
v0 — internal test build. Evaluation table, synthetic Rx dataset and demo video in progress for the Nov 7 submission.
