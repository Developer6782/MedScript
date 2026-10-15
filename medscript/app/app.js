/* MedScript v0.2 — client-only, BYOK, beep-coach, no voice, fixed Flash model chain */
const $ = (s) => document.querySelector(s);
const KEY = () => localStorage.getItem('ms_key') || '';

/* fixed model chain: always a Flash model, auto-shift if one is unavailable */
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
let usedModel = '';

/* ---------- audio: pep-pep horn + soft good beep ---------- */
let audioCtx = null;
function ctx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function tone(freq, start, dur, type) {
  const c = ctx(), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
}
function beepWarn() { tone(880, 0, 0.12, 'square'); tone(880, 0.18, 0.12, 'square'); }   // pep-pep
function beepGood() { tone(660, 0, 0.16, 'sine'); }
let lastWarnBeep = 0;

/* ---------- settings (key only; model is fixed by code) ---------- */
$('#settingsBtn').onclick = () => { $('#keyInput').value = KEY(); $('#settingsModal').classList.add('open'); };
$('#closeSettings').onclick = () => $('#settingsModal').classList.remove('open');
$('#saveKeyBtn').onclick = () => {
  localStorage.setItem('ms_key', $('#keyInput').value.trim());
  $('#keyStatus').textContent = 'Saved in this browser only.';
};
$('#testKeyBtn').onclick = async () => {
  $('#keyStatus').textContent = 'Testing…';
  const k = $('#keyInput').value.trim();
  let msg = '';
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': k, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }] })
      });
      if (r.ok) { $('#keyStatus').textContent = 'Key works (model ' + m + ').'; return; }
      msg = 'HTTP ' + r.status;
      if (r.status === 400 || r.status === 401 || r.status === 403) break;
    } catch (e) { msg = e.message; }
  }
  $('#keyStatus').textContent = 'Error ' + msg + ' - check the key.';
};

/* ---------- processing indicator ---------- */
function setProcessing(on, txt) {
  $('#proc').style.display = on ? 'flex' : 'none';
  if (txt) $('#procText').textContent = txt;
  document.querySelectorAll('main .btn').forEach(b => { b.disabled = on; });
}

/* ---------- capture coach (live camera) ---------- */
let stream = null, coachTimer = null, wasGood = false;
$('#camBtn').onclick = async () => {
  stopCam();                       // never leave an orphan timer behind
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    $('#video').srcObject = stream;
    $('#camWrap').style.display = 'block';
    coachTimer = setInterval(coachTick, 350);
  } catch (e) { setBanner('Camera blocked - use Upload instead', 'warn'); }
};
function stopCam() {
  if (coachTimer) { clearInterval(coachTimer); coachTimer = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  $('#camWrap').style.display = 'none';
  wasGood = false;
}

function setBanner(text, cls) { const b = $('#coachBanner'); b.textContent = text; b.className = cls; }

function coachTick() {
  if (!stream) return;             // hard guard: no camera, no beeps
  const v = $('#video'); if (!v.videoWidth) return;
  const W = 160, H = 120, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(v, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const g = new Float32Array(W * H);
  let sum = 0, glare = 0;
  for (let i = 0; i < W * H; i++) { const p = i * 4; g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; sum += g[i]; if (g[i] > 250) glare++; }
  const mean = sum / (W * H), glareF = glare / (W * H);
  let ls = 0, ls2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const i = y * W + xx, lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W];
    ls += lap; ls2 += lap * lap; n++;
  }
  const blurVar = ls2 / n - (ls / n) ** 2;
  let ink = 0, cx = 0;
  const thr = mean - 30;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const i = y * W + xx; if (g[i] < thr) { ink++; cx += xx; } }
  const inkF = ink / (W * H); cx = ink ? cx / ink / W : 0.5;
  $('#mBlur').textContent = 'blur: ' + blurVar.toFixed(0);
  $('#mLight').textContent = 'light: ' + mean.toFixed(0) + (glareF > 0.15 ? ' glare' : '');
  $('#mFill').textContent = 'fill: ' + (inkF * 100).toFixed(1) + '% x:' + cx.toFixed(2);

  let msg = null;
  if (blurVar < 55) msg = ['HOLD STEADY - image is blurry', 'warn'];
  else if (mean < 70) msg = ['TOO DARK - move to better light', 'warn'];
  else if (glareF > 0.15) msg = ['GLARE - shift your angle slightly', 'warn'];
  else if (inkF < 0.015) msg = ['MOVE CLOSER - fill frame with the prescription', 'warn'];
  else if (cx > 0.65) msg = ['MOVE RIGHT', 'warn'];
  else if (cx < 0.35) msg = ['MOVE LEFT', 'warn'];
  if (msg) {
    setBanner(msg[0], msg[1]);
    const now = Date.now();
    if (now - lastWarnBeep > 1200) { beepWarn(); lastWarnBeep = now; }
    wasGood = false;
  } else {
    setBanner('GOOD - tap the button to capture', 'good');
    if (!wasGood) { beepGood(); wasGood = true; }
  }
}

$('#captureBtn').onclick = () => {
  const v = $('#video');
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  stopCam();
  analyzeCanvas(c);
};

/* ---------- upload ---------- */
$('#uploadBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  setProcessing(true, 'Loading photo…');
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); analyzeCanvas(c); };
  img.onerror = () => setProcessing(false);
  img.src = URL.createObjectURL(f);
};

/* ---------- enhancement (histogram stretch + sharpen) ---------- */
function enhance(canvas) {
  const w = canvas.width, h = canvas.height;
  const x = canvas.getContext('2d', { willReadFrequently: true });
  const img = x.getImageData(0, 0, w, h), d = img.data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) { const v = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0; hist[v]++; }
  const total = w * h; let acc = 0, lo = 0, hi = 255;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.02) { hi = i; break; } }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    for (let k = 0; k < 3; k++) { d[i + k] = Math.max(0, Math.min(255, ((d[i + k] - lo) * 255) / span)); }
  }
  x.putImageData(img, 0, 0);
  const src = x.getImageData(0, 0, w, h), out = x.createImageData(w, h), s = src.data, o = out.data;
  const kern = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const i = (y * w + xx) * 4;
    for (let k = 0; k < 3; k++) {
      let v = 0, ki = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += s[i + (dy * w + dx) * 4 + k] * kern[ki++];
      o[i + k] = Math.max(0, Math.min(255, v));
    }
    o[i + 3] = 255;
  }
  x.putImageData(out, 0, 0);
  return canvas;
}

/* ---------- safety layer: medicine dictionary + fuzzy match ---------- */
const MEDS = ['amoxicillin','amoxiclav','augmentin','ampicillin','azithromycin','clarithromycin','erythromycin','doxycycline','cefixime','ceftriaxone','cephalexin','ciprofloxacin','levofloxacin','metronidazole','ornidazole','paracetamol','acetaminophen','ibuprofen','diclofenac','mefenamic','aceclofenac','amlodipine','atenolol','metoprolol','losartan','telmisartan','bisoprolol','pantoprazole','omeprazole','esomeprazole','ranitidine','famotidine','metformin','glimepiride','glibenclamide','insulin','atorvastatin','rosuvastatin','cetirizine','levocetirizine','fexofenadine','montelukast','salbutamol','albuterol','budesonide','prednisolone','dexamethasone','ondansetron','domperidone','metoclopramide','ors','zinc','iron','ferrous','folic','calcium','cholecalciferol','vitamin'];
function norm(s) { return s.toLowerCase().replace(/[^a-z]/g, ''); }
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function inDictionary(name) {
  const t = norm(name); if (!t) return false;
  return MEDS.some(m => t.includes(m) || lev(t, m) <= 2 || (t.length > 5 && lev(t.slice(0, m.length), m) <= 1));
}

/* ---------- Gemini (BYOK, fixed Flash chain with auto-shift) ---------- */
const PROMPT = `You are MedScript's transcription engine for handwritten prescriptions and medicine notes, in ANY language or script (English, Hindi, Devanagari, mixed).
Transcribe ONLY what is written. Do NOT diagnose, do NOT advise, do NOT invent medicines.
Always return this exact JSON pattern:
{"lines":[{"text":string,"confidence":0-1}],
 "medicines":[{"name":string,"dose":string,"timing":"morning"|"noon"|"night"|"as-needed"|"unknown","duration":string,"confidence":0-1}],
 "uncertain":[{"text":string,"reason":string}],
 "extra":{"doctor":string,"clinic":string,"date":string,"patient":string,"instructions":[string],"notes":[string],"other":[string]}}
"extra" must capture EVERYTHING else written on the paper that is not a medicine line: doctor name, clinic/hospital name, dates, patient info, advice sentences, stamp text, miscellaneous notes. Use empty strings and empty arrays when absent.
If a word is not readable with confidence, put it in "uncertain" instead of guessing.`;

async function geminiAnalyze(b64, mime) {
  let lastErr = '';
  for (const m of MODELS) {
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': KEY(), 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        })
      });
    } catch (e) { lastErr = e.message; continue; }
    if (res.ok) {
      usedModel = m;
      const j = await res.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    }
    lastErr = 'HTTP ' + res.status + ' on ' + m;
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error('Gemini API error ' + res.status + ' - check your key in Settings');
    }
    /* 404 / 429 / 5xx: shift to the next Flash model on our own */
  }
  throw new Error('All Flash models failed (' + lastErr + '). Check key and internet.');
}

/* ---------- main flow ---------- */
function setStatus(t) { $('#status').textContent = t; }

async function analyzeCanvas(canvas) {
  if (!KEY()) { setStatus('No API key yet - open Settings and paste your Gemini key first.'); $('#settingsModal').classList.add('open'); return; }
  setProcessing(true, 'Enhancing image…');
  const before = document.createElement('canvas'); before.width = canvas.width; before.height = canvas.height;
  before.getContext('2d').drawImage(canvas, 0, 0);
  const enh = enhance(canvas);
  const maxW = 1200; let w = enh.width, h = enh.height;
  if (w > maxW) { h = h * maxW / w; w = maxW; }
  const small = document.createElement('canvas'); small.width = w; small.height = h;
  small.getContext('2d').drawImage(enh, 0, 0, w, h);
  $('#beforeImg').src = before.toDataURL('image/jpeg', 0.8);
  $('#afterImg').src = small.toDataURL('image/jpeg', 0.85);
  $('#resultCard').style.display = 'block';
  setProcessing(true, 'Processing - reading handwriting…');
  try {
    const b64 = small.toDataURL('image/jpeg', 0.85).split(',')[1];
    const r = await geminiAnalyze(b64, 'image/jpeg');
    render(r);
    setStatus('Done - model: ' + usedModel);
  } catch (e) { setStatus('Error: ' + e.message); }
  setProcessing(false);
}

function render(r) {
  const flags = [];
  (r.uncertain || []).forEach(u => flags.push(`<b>Verify - unreadable:</b> “${u.text}” - ${u.reason || 'low confidence'}. Show this line to the pharmacist.`));
  (r.medicines || []).forEach(m => {
    if ((m.confidence ?? 1) < 0.75) flags.push(`<b>Verify - low confidence (${Math.round((m.confidence ?? 0) * 100)}%):</b> “${m.name} ${m.dose}” - confirm with pharmacist.`);
    else if (!inDictionary(m.name)) flags.push(`<b>Verify - not in medicine dictionary:</b> “${m.name}” - double-check spelling with pharmacist.`);
  });
  $('#flags').innerHTML = flags.length ? flags.map(f => `<div class="flag">${f}</div>`).join('') : '<div class="flag okflag"><b>All items matched the medicine dictionary with good confidence.</b> Still verify at the pharmacy.</div>';

  const groups = { morning: [], noon: [], night: [], 'as-needed': [], unknown: [] };
  (r.medicines || []).forEach(m => (groups[m.timing] || groups.unknown).push(m));
  const labels = { morning: 'Morning', noon: 'Afternoon', night: 'Night', 'as-needed': 'As needed', unknown: 'Timing unclear - ask pharmacist' };
  let html = '';
  for (const k of Object.keys(groups)) if (groups[k].length) {
    html += `<div class="plan-group"><h3>${labels[k]}</h3>` + groups[k].map(m =>
      `<div class="med"><span class="conf">${Math.round((m.confidence ?? 0) * 100)}%</span><b>${m.name}</b> ${m.dose || ''}${m.duration ? ' - ' + m.duration : ''}</div>`).join('') + '</div>';
  }
  $('#plan').innerHTML = html || '<div class="med">No medicines detected.</div>';

  /* fixed pattern: extra details from the paper */
  const ex = r.extra || {};
  const rows = [];
  const push = (label, val) => { if (typeof val === 'string' && val.trim()) rows.push([label, val.trim()]); };
  push('Doctor', ex.doctor); push('Clinic / hospital', ex.clinic); push('Date', ex.date); push('Patient', ex.patient);
  (ex.instructions || []).forEach(v => rows.push(['Instruction', v]));
  (ex.notes || []).forEach(v => rows.push(['Note', v]));
  (ex.other || []).forEach(v => rows.push(['Also written', v]));
  if (rows.length) {
    $('#extraWrap').style.display = 'block';
    $('#extra').innerHTML = rows.map(([l, v]) => `<div class="xrow"><b>${l}</b><span>${v}</span></div>`).join('');
  } else {
    $('#extraWrap').style.display = 'none';
    $('#extra').innerHTML = '';
  }

  $('#rawLines').textContent = (r.lines || []).map(l => `[${Math.round((l.confidence ?? 0) * 100)}%] ${l.text}`).join('\n') || '(no lines)';
  $('#resultCard').scrollIntoView({ behavior: 'smooth' });
}
