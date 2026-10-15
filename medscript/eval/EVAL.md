# MedScript - Synthetic Rx Evaluation (v1, 14 Oct 2026)

Dataset: 24 synthetic prescription images (7 defect classes + clean, 3 seeds each), ground truth known by construction (`Dr. A. Verma, MBBS | City Clinic, Patna | Date: 14/10/2026 |...`).
Enhancement under test: exact port of the app.js engine (2-98% histogram stretch + 3x3 sharpen).

## 1 - Enhancement quality, before vs after (class means)

| class | contrast before | contrast after | sharpness before | sharpness after | text/bg separability before | after |
|---|---|---|---|---|---|---|
| clean | 28.1 | 38.0 | 27.6 | 67.7 | 747 | 1278 |
| blur | 19.9 | 44.2 | 8.6 | 20.7 | 352 | 1816 |
| dark | 12.6 | 38.5 | 12.9 | 75.3 | 151 | 1249 |
| glare | 25.2 | 39.2 | 24.0 | 75.1 | 591 | 1219 |
| tilt | 26.9 | 38.6 | 24.4 | 55.0 | 669 | 1420 |
| shadow | 49.2 | 77.8 | 21.4 | 53.6 | 1746 | 4554 |
| fold | 33.8 | 41.7 | 29.3 | 50.2 | 1070 | 1681 |
| combo | 48.3 | 79.2 | 9.1 | 19.9 | 1744 | 4695 |

Mean text/background separability gain across classes: **3.27x**.

## 2 - Capture coach decision logic (known-defect frames)

| defect injected | expected guidance | coach said | result |
|---|---|---|---|
| clean | GOOD | GOOD | PASS |
| blur | HOLD STEADY | HOLD STEADY | PASS |
| dark | TOO DARK | TOO DARK | PASS |
| glare | GLARE | GLARE | PASS |
| offset-left | MOVE LEFT | MOVE LEFT | PASS |
| offset-right | MOVE RIGHT | MOVE RIGHT | PASS |

Coach decision accuracy on known defects: **100%** (6/6).

## 3 - Safety / flag logic

Covered by the automated browser suite (12/12 PASS): dictionary fuzzy match, typo catch, nonsense rejection, low-confidence flag, uncertain-to-verify routing, plan grouping, extra-details pattern, live Gemini request-shape check.

## 4 - Known limits (honest)

- End-to-end transcription accuracy (characters vs ground truth) requires the Gemini Flash chain and therefore an API key; the harness ships in the repo and the numbers will be filled at submission time.
- Synthetic handwriting uses rendered glyphs with geometric degradation, not true cursive variance; cursive stress-testing uses the public prescription datasets.
- The coach measures framing on ink centroid; a page with two separated text blocks can read as centered when it is not.
