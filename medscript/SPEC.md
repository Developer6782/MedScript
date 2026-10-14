# MEDSCRIPT v2 — DSH HACKS V2 FINAL SPEC (research-locked 13 Oct 2026)
Tagline: "The worst handwriting in medicine, read safely."
Deadline: Nov 8 (hum Nov 7) · Winners Nov 17 · 13+ enrolled ✅ · AI allowed ✅ · no consent form ✅

## PROBLEM (research-backed, citations for report)
- Karnataka study 2026 (Frontiers): 48% patients believe language barrier → missed/wrong diagnosis; patient took medicine incorrectly until family intervened; providers struggle reading prescriptions/vaccination cards in unfamiliar languages
- JMIR 2020: 35.2% patients unsure they understood lab results; 67% confusion re terminology/reference ranges
- PMC 2014: low literacy/numeracy → 38% vs 77% identifying out-of-range values
- JAMA 2025 Michigan: standard report = 39% correct cancer identification vs 93% patient-centered format → FORMAT redesign works
- Crowded market gap: 7+ apps explain clean PDFs (TestResult.ai, MedReport, Kantesti, NirogGyan, Soka...) but NirogGyan admits: handwritten/blurry = "manually enter values" → NOBODY owns worst-case paper

## PRODUCT LOOP (read → verify → schedule → speak → share)
1. Photo of handwritten Rx/medicine note
2. OpenCV: blur score, glare, skew → enhance/deskew/segment lines (engine v1 ready)
3. Gemini Vision: handwriting transcription (per-line)
4. Deterministic safety layer: fuzzy match vs medicine-name dictionary (common Indian + global generics); per-word confidence; mismatch/low-conf = YELLOW FLAG "pharmacist se confirm karo"
5. Structured plan: medicine / dose / timing / duration + audio readout (Hindi/English) + caregiver share link
6. Red lines: NO diagnosis, NO dose advice, NO substitutions — output = "draft for professional verification", disclaimer always

## TECH STACK (local-first, zero cost)
OpenCV (enhance/measure) + Gemini Vision API (transcription) + local rules/dictionary (safety math) + simple web UI (upload, before/after slider, flags, audio button)
Repo: pinned deps, build steps, 40+ automated tests (safety-layer tests = judge candy)

## DATASET (ethics lock)
- Synthetic handwritten Rx generator (hum likhwa ke generate karenge: styles, languages, folds, shadows, glare)
- Public prescription datasets (Kaggle) for eval
- NO real patient prescriptions without consent — report me likhna hai

## EVAL TABLE (report ka hero)
per-image: blur score, transcription accuracy vs ground truth (synthetic = truth pata hai!), flag precision, latency, failure cases (blank, upside-down, torn)

## VIDEO BEATS (≤3 min)
1. Hook: Karnataka story line + worst Rx photo 2. Engine before/after 3. Flags appear 4. Hindi audio readout 5. Caregiver share 6. Eval numbers + limitations honest

## JUDGING MAP
Clinical insight: verification-first + pharmacist loop · Technical: OpenCV+Gemini+deterministic flags+tests · Impact: citations above + India Rx reality · Creativity: owns worst-case paper nobody touches · Feasibility: 3.5 wk solo realistic · Docs: eval table + limitations + ethics

## BUILD ORDER
14-20 Oct: synthetic Rx generator + Gemini-vs-Tesseract handwriting test + engine v2 (skew/glare)
21-27 Oct: safety dictionary layer + structuring + flags
28 Oct-3 Nov: UI + audio + share + eval run
4-6 Nov: video + 1-pager + repo polish · 7 Nov SUBMIT

## KILLED IDEAS (research se)
LabLens/lab-report explainer = crowded (7+ apps) · Discharge Bridge = frequency low · Vaccine card = OCR risk high, audience narrow
