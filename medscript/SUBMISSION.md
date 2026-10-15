# DSH HACKS V2 — SUBMISSION CHECKLIST (target: 7 Nov)
Live site: https://medscript-live.onrender.com/ (v0.2 verified 14 Oct)
Rules: working prototype + demo video + one-page PDF + GitHub repo/code PDF · AI x Healthcare · 13+ enrolled · AI allowed

## STATUS
- [x] Working prototype LIVE (v0.2: BYOK, beep-coach, fixed Flash chain, extra-details pattern)
- [ ] Devpost pe "Join hackathon" — Krishna confirm karega (14 Oct)
- [ ] GitHub repo public: medscript (index.html, app.js, README.md) — web upload, 10 min (14-15 Oct)
- [x] Demo video final — **BHAI NE KHUD BANAYA: /home/user/MedScript_DSH_Demo.mp4 (2:30, 1080p, 13 frames, voice-00 narration, real engine output + real test logs)** — phone recording ki zaroorat nahi padi
- [ ] YouTube upload (unlisted/public) — Krishna (video ready hai ABHI)
- [ ] One-page project description PDF — bhai likhega (16 Oct)
- [x] Devpost description (Inspiration / What it does / How we built it / Challenges / Accomplishments / What we learned / What's next) — **DONE: medscript/devpost_description.md** (GitHub+YouTube link placeholders Krishna bharega)
- [x] Eval table: **DONE: medscript/eval/EVAL.md + eval_synthetic.py + 24-image synthetic dataset** — separability gain 3.27x, coach logic 6/6 (eval ne asli threshold-bug pakda tha, fix + re-verify hua), flag logic 12/12
- [ ] Final submit form: name, tagline, description, tags, repo link, video link, live link (7 Nov)

## PHONE SCREEN-RECORDING SHOT LIST (60-75 sec, ek hi take me chalega)
1. Site kholo — homepage 2 sec
2. Settings → key paste → Test key → "Key works" → Save (10s)
3. Upload photo → koi bhi medicine/prescription paper → PROCESSING spinner (10s)
4. Result: before/after → flags → plan → extra details → raw transcription scroll (15s)
5. Camera coach: paper pe point → left/right hilaо → pep-pep + text → GOOD → capture (20s)
6. Naya result 5 sec → end

## GITHUB (web upload, no git CLI)
github.com → New repository → name: medscript → Public → Create
→ "uploading an existing file" → index.html + app.js + README.md drag → commit
→ Settings me topic tags: healthcare, computer-vision, gemini, ocr

## SUBMIT FORM ME JO LAGEGA
Project name: MedScript · Tagline: "Read the worst handwriting in medicine - safely."
Links: live site + GitHub + YouTube video · Built-with tags: JavaScript, OpenCV-style CV (canvas), Gemini API, WebAudio
