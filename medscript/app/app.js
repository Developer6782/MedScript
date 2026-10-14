/* MedScript v0 — client-only, BYOK, beep-coach, no voice */
const $ = (s) => document.querySelector(s);
const KEY = () => localStorage.getItem('ms_key') || '';
const MODEL = () => localStorage.getItem('ms_model') || 'gemini-2.5-flash';

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

/* ---------- settings ---------- */
$('#settingsBtn').onclick = () => { $('#keyInput').value = KEY(); $('#modelInput').value = MODEL(); $('#settingsModal').classList.add('open'); };
$('#closeSettings').onclick = () => $('#settingsModal').classList.remove('open');
$('#saveKeyBtn').onclick = () => {
  localStorage.setItem('ms_key', $('#keyInput').value.trim());
  localStorage.setItem('ms_model', $('#modelInput').value.trim() || 'gemini-2.5-flash');
  $('#keyStatus').textContent = 'Saved in this browser only.';
};
$('#testKeyBtn').onclick = async () => {
  $('#keyStatus').textContent = 'Testing…';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${$('#modelInput').value.trim() || 'gemini-2.5-flash'}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': $('#keyInput').value.trim(), 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }] })
    });
    $('#keyStatus').textContent = r.ok ? 'Key works.' : 'Error ' + r.status + ' — check key/model.';
  } catch (e) { $('#keyStatus').textContent = 'Network error: ' + e.message; }
};

/* ---------- capture coach (live camera) ---------- */
let stream = null, coachTimer = null, wasGood = false;
$('#camBtn').onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    $('#video').srcObject = stream;
    $('#camWrap').style.display = 'block';
    coachTimer = setInterval(coachTick, 350);
  } catch (e) { setBanner('Camera blocked - use Upload instead', 'warn'); }
};
function stopCam() { if (coachTimer) clearInterval(coachTimer); coachTimer = null; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } $('#camWrap').style.display = 'none'; }

function setBanner(text, cls) { const b = $('#coachBanner'); b.textContent = text; b.className = cls; }

function coachTick() {
  const v = $('#video'); if (!v.videoWidth) return;
  const W = 160, H = 120, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(v, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const g = new Float32Array(W * H);
  let sum = 0, glare = 0;
  for (let i = 0; i < W * H; i++) { const p = i * 4; g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; sum += g[i]; if (g[i] > 250) glare++; }
  const mean = sum / (W * H), glareF = glare / (W * H);
  // laplacian variance = blur score
  let ls = 0, ls2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const i = y * W + xx, lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W];
    ls += lap; ls2 += lap * lap; n++;
  }
  const blurVar = ls2 / n - (ls / n) ** 2;
  // ink coverage + centroid (dark ink on light paper)
  let ink = 0, cx = 0;
  const thr = mean - 30;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const i = y * W + xx; if (g[i] < thr) { ink++; cx += xx; } }
  const inkF = ink / (W * H); cx = ink ? cx / ink / W : 0.5;
  $('#mBlur').textContent = 'blur: ' + blurVar.toFixed(0);
  $('#mLight').textContent = 'light: ' + mean.toFixed(0) + (glareF > 0.15 ? ' glare' : '');
  $('#mFill').textContent = 'fill: ' + (inkF * 100).toFixed(1) + '% x:' + cx.toFixed(2);

  let msg = null;
  if (blurVar < 55) msg = ['HOLD STEADY — image is blurry', 'warn'];
  else if (mean < 70) msg = ['TOO DARK — move to better light', 'warn'];
  else if (glareF > 0.15) msg = ['GLARE — shift your angle slightly', 'warn'];
  else if (inkF < 0.015) msg = ['MOVE CLOSER — fill frame with the prescription', 'warn'];
  else if (cx > 0.62) msg = ['MOVE RIGHT', 'warn'];
  else if (cx < 0.38) msg = ['MOVE LEFT', 'warn'];
  if (msg) {
    setBanner(msg[0], msg[1]);
    const now = Date.now();
    if (now - lastWarnBeep > 1200) { beepWarn(); lastWarnBeep = now; }
    wasGood = false;
  } else {
    setBanner('GOOD — tap the button to capture', 'good');
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

/* ---------- upload + sample ---------- */
$('#uploadBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); analyzeCanvas(c); };
  img.src = URL.createObjectURL(f);
};
$('#sampleBtn').onclick = async () => {
  setStatus('Loading sample prescription…');
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); analyzeCanvas(c); };
  img.src = 'samples/rx1.jpg';
};

/* ---------- enhancement (v0: histogram stretch + sharpen) ---------- */
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
  // unsharp-ish sharpen 3x3
  const src = x.getImageData(0, 0, w, h), out = x.createImageData(w, h), s = src.data, o = out.data;
  const kern = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w; xx++) {
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

/* ---------- Gemini (BYOK) ---------- */
const PROMPT = `You are MedScript's transcription engine for handwritten prescriptions and medicine notes.
Transcribe ONLY what is written. Do NOT diagnose, do NOT advise, do NOT invent medicines.
Return strict JSON:
{"lines":[{"text":string,"confidence":0-1}],
 "medicines":[{"name":string,"dose":string,"timing":"morning"|"noon"|"night"|"as-needed"|"unknown","duration":string,"confidence":0-1}],
 "uncertain":[{"text":string,"reason":string}]}
If a word is not readable with confidence, put it in "uncertain" instead of guessing.`;

async function geminiAnalyze(b64, mime) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY(), 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    })
  });
  if (!res.ok) throw new Error('Gemini API error ' + res.status + ' (check Settings -> key/model)');
  const j = await res.json();
  const txt = j.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(txt);
}

/* ---------- main flow ---------- */
function setStatus(t) { $('#status').textContent = t; }

async function analyzeCanvas(canvas) {
  if (!KEY()) { setStatus('No API key yet — open Settings and paste your Gemini key first.'); $('#settingsModal').classList.add('open'); return; }
  setStatus('Enhancing image…');
  const before = document.createElement('canvas'); before.width = canvas.width; before.height = canvas.height;
  before.getContext('2d').drawImage(canvas, 0, 0);
  const enh = enhance(canvas);
  // downscale for API
  const maxW = 1200; let w = enh.width, h = enh.height;
  if (w > maxW) { h = h * maxW / w; w = maxW; }
  const small = document.createElement('canvas'); small.width = w; small.height = h;
  small.getContext('2d').drawImage(enh, 0, 0, w, h);
  $('#beforeImg').src = before.toDataURL('image/jpeg', 0.8);
  $('#afterImg').src = small.toDataURL('image/jpeg', 0.85);
  $('#resultCard').style.display = 'block';
  setStatus('Reading handwriting with Gemini…');
  try {
    const b64 = small.toDataURL('image/jpeg', 0.85).split(',')[1];
    const r = await geminiAnalyze(b64, 'image/jpeg');
    render(r);
    setStatus('Done.');
  } catch (e) { setStatus('Error: ' + e.message); }
}

function render(r) {
  const flags = [];
  (r.uncertain || []).forEach(u => flags.push(`<b>Verify · unreadable:</b> “${u.text}” — ${u.reason || 'low confidence'}. Show this line to the pharmacist.`));
  (r.medicines || []).forEach(m => {
    if ((m.confidence ?? 1) < 0.75) flags.push(`<b>Verify · low confidence (${Math.round((m.confidence ?? 0) * 100)}%):</b> “${m.name} ${m.dose}” — confirm with pharmacist.`);
    else if (!inDictionary(m.name)) flags.push(`<b>Verify · not in medicine dictionary:</b> “${m.name}” — double-check spelling with pharmacist.`);
  });
  $('#flags').innerHTML = flags.length ? flags.map(f => `<div class="flag">${f}</div>`).join('') : '<div class="flag okflag"><b style="color:#14532d">All items matched the medicine dictionary with good confidence.</b> Still verify at the pharmacy.</div>';

  const groups = { morning: [], noon: [], night: [], 'as-needed': [], unknown: [] };
  (r.medicines || []).forEach(m => (groups[m.timing] || groups.unknown).push(m));
  const labels = { morning: 'Morning', noon: 'Afternoon', night: 'Night', 'as-needed': 'As needed', unknown: 'Timing unclear — ask pharmacist' };
  let html = '';
  for (const k of Object.keys(groups)) if (groups[k].length) {
    html += `<div class="plan-group"><h3>${labels[k]}</h3>` + groups[k].map(m =>
      `<div class="med"><span class="conf">${Math.round((m.confidence ?? 0) * 100)}%</span><b>${m.name}</b> ${m.dose || ''}${m.duration ? ' · ' + m.duration : ''}</div>`).join('') + '</div>';
  }
  $('#plan').innerHTML = html || '<div class="med">No medicines detected.</div>';
  $('#rawLines').textContent = (r.lines || []).map(l => `[${Math.round((l.confidence ?? 0) * 100)}%] ${l.text}`).join('\n') || '(no lines)';
  $('#resultCard').scrollIntoView({ behavior: 'smooth' });
}
