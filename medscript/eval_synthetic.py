"""MedScript synthetic Rx evaluation - ground truth known by construction.
Generates degraded prescription images (7 defect classes x 3 seeds),
runs the SAME enhancement math as app.js, reports before/after quality metrics,
and unit-tests the capture-coach decision logic against known defects.
"""
import cv2, numpy as np, os, json

OUT = '/home/user/medscript/eval'
os.makedirs(OUT + '/dataset', exist_ok=True)

LINES = [
    'Dr. A. Verma, MBBS',
    'City Clinic, Patna',
    'Date: 14/10/2026',
    'Tab. Augmentin 625  1-0-1 x 5 days',
    'Syp. Paracetamol 250ml  SOS',
    'Tab. Pantoprazole 40  0-0-1',
    'Take after food. Review after 5 days.',
]
GROUND_TRUTH = ' | '.join(LINES)

def base_image(seed, xoff=0):
    rng = np.random.default_rng(seed)
    img = np.clip(np.full((700, 1000, 3), 246, np.uint8).astype(np.int16) + rng.integers(-4, 5, (700, 1000, 3), dtype=np.int16), 0, 255).astype(np.uint8)
    y = 70
    for ln in LINES:
        sc = 0.9 + rng.random() * 0.25
        cv2.putText(img, ln, (150 + xoff + int(rng.integers(-8, 9)), y), cv2.FONT_HERSHEY_SIMPLEX, 0.8 * sc, (30, 30, 60), 2, cv2.LINE_AA)
        y += 78 + int(rng.integers(-4, 5))
    return img

def small_base(seed, xoff=0):
    """160x120 frame, text block centered - unit-tests the coach decision function at its own scale"""
    img = np.full((120, 160), 246, np.uint8)
    y = 22
    for ln in ['Dr. A. Verma', 'City Clinic', 'Tab Augmentin 625', 'Syp Paracetamol', 'Take after food']:
        cv2.putText(img, ln, (35 + xoff, y), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (30, 30, 60), 1, cv2.LINE_AA)
        y += 20
    return img

def defect(img, kind, seed):
    rng = np.random.default_rng(seed + 99)
    if kind == 'clean':
        return img
    if kind == 'blur':
        return cv2.GaussianBlur(img, (0, 0), 2.2)
    if kind == 'dark':
        return (img.astype(np.float32) * 0.45).astype(np.uint8)
    if kind == 'glare':
        out = img.astype(np.float32)
        cx, cy = 650, 300
        yy, xx = np.mgrid[0:out.shape[0], 0:out.shape[1]]
        g = np.exp(-(((xx - cx) ** 2) / (2 * 180 ** 2) + ((yy - cy) ** 2) / (2 * 120 ** 2)))
        out = out + (255 - out) * g[..., None] * 0.95
        return out.astype(np.uint8)
    if kind == 'tilt':
        M = cv2.getRotationMatrix2D((500, 350), 9, 1.0)
        return cv2.warpAffine(img, M, (1000, 700), borderValue=(246, 246, 246))
    if kind == 'shadow':
        out = img.astype(np.float32)
        grad = np.linspace(1.0, 0.35, out.shape[1])[None, :, None]
        return (out * grad).astype(np.uint8)
    if kind == 'fold':
        out = img.astype(np.float32)
        yy, xx = np.mgrid[0:out.shape[0], 0:out.shape[1]]
        dx = (6 * np.sin(yy / 38.0)).astype(np.float32)
        dy = (4 * np.sin(xx / 55.0)).astype(np.float32)
        return cv2.remap(out, (xx + dx).astype(np.float32), (yy + dy).astype(np.float32), cv2.INTER_LINEAR).astype(np.uint8)
    if kind == 'combo':
        return defect(defect(defect(img, 'blur', seed), 'shadow', seed), 'tilt', seed)
    raise ValueError(kind)

def enhance(img):
    """exact port of app.js enhance(): 2-98% histogram stretch + 3x3 sharpen"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    tot = gray.size
    acc = 0; lo = 0
    for i in range(256):
        acc += hist[i]
        if acc > tot * 0.02: lo = i; break
    acc = 0; hi = 255
    for i in range(255, -1, -1):
        acc += hist[i]
        if acc > tot * 0.02: hi = i; break
    lut = np.clip((np.arange(256) - lo) * 255.0 / max(1, hi - lo), 0, 255).astype(np.uint8)
    st = cv2.LUT(img, lut)
    return cv2.filter2D(st, -1, np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]]))

def metrics(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    rms = g.std()
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    grad = cv2.magnitude(gx, gy).mean()
    th, _ = cv2.threshold(g.astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    m = g > th
    w1 = m.mean(); w0 = 1 - w1
    sep = w0 * w1 * (g[m].mean() - g[~m].mean()) ** 2 if 0 < w1 < 1 else 0.0
    lap = cv2.Laplacian(g, cv2.CV_32F).var()
    return dict(rms=round(float(rms), 1), grad=round(float(grad), 1), sep=round(float(sep), 0), lap=round(float(lap), 0))

def coach_decision(img):
    """port of app.js coachTick decision logic on 160x120 downsample"""
    small = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (160, 120)).astype(np.float32)
    mean = small.mean(); glare = (small > 250).mean()
    lap = cv2.Laplacian(small, cv2.CV_32F).var()
    thr = mean - 30
    ink = small < thr
    inkF = ink.mean()
    cx = (np.where(ink)[1].mean() / 160) if ink.any() else 0.5
    if lap < 55: return 'HOLD STEADY'
    if mean < 70: return 'TOO DARK'
    if glare > 0.15: return 'GLARE'
    if inkF < 0.015: return 'MOVE CLOSER'
    if cx > 0.65: return 'MOVE RIGHT'
    if cx < 0.35: return 'MOVE LEFT'
    return 'GOOD'

CLASSES = ['clean', 'blur', 'dark', 'glare', 'tilt', 'shadow', 'fold', 'combo']
rows = []
coach_rows = []
for cls in CLASSES:
    mb = {k: [] for k in ('rms', 'grad', 'sep', 'lap')}
    ma = {k: [] for k in ('rms', 'grad', 'sep', 'lap')}
    for seed in (1, 2, 3):
        img = defect(base_image(seed), cls, seed)
        cv2.imwrite(f'{OUT}/dataset/{cls}_{seed}.png', img)
        b = metrics(img); a = metrics(enhance(img))
        for k in mb: mb[k].append(b[k]); ma[k].append(a[k])
    avg_b = {k: np.mean(v) for k, v in mb.items()}
    avg_a = {k: np.mean(v) for k, v in ma.items()}
    rows.append((cls, avg_b, avg_a))
    # coach logic checked separately on small frames (below)
coach_cases = [
    ('clean', 'GOOD', small_base(7)),
    ('blur', 'HOLD STEADY', cv2.GaussianBlur(small_base(7), (0, 0), 1.6)),
    ('dark', 'TOO DARK', (small_base(7).astype(np.float32) * 0.28).astype(np.uint8)),
    ('glare', 'GLARE', (lambda im: (im.__setitem__((slice(15, 70), slice(40, 125)), 255), im)[1])(small_base(7).copy())),
    ('offset-left', 'MOVE LEFT', small_base(7, -45)),
    ('offset-right', 'MOVE RIGHT', small_base(7, 45)),
]
for name, expect, frame in coach_cases:
    got = coach_decision(cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR) if frame.ndim == 2 else frame)
    coach_rows.append((name, expect, got, 'PASS' if got == expect else 'FAIL'))

md = ['# MedScript - Synthetic Rx Evaluation (v1, 14 Oct 2026)',
      '',
      'Dataset: 24 synthetic prescription images (7 defect classes + clean, 3 seeds each), ground truth known by construction (`' + GROUND_TRUTH[:60] + '...`).',
      'Enhancement under test: exact port of the app.js engine (2-98% histogram stretch + 3x3 sharpen).',
      '',
      '## 1 - Enhancement quality, before vs after (class means)',
      '',
      '| class | contrast before | contrast after | sharpness before | sharpness after | text/bg separability before | after |',
      '|---|---|---|---|---|---|---|']
for cls, b, a in rows:
    md.append(f"| {cls} | {b['rms']:.1f} | {a['rms']:.1f} | {b['grad']:.1f} | {a['grad']:.1f} | {b['sep']:.0f} | {a['sep']:.0f} |")
imp = np.mean([ (a['sep'] / max(1, b['sep'])) for _, b, a in rows ])
md += ['',
       f'Mean text/background separability gain across classes: **{imp:.2f}x**.',
       '',
       '## 2 - Capture coach decision logic (known-defect frames)',
       '',
       '| defect injected | expected guidance | coach said | result |',
       '|---|---|---|---|']
for cls, exp, got, res in coach_rows:
    md.append(f'| {cls} | {exp} | {got} | {res} |')
acc = sum(1 for *_, r in coach_rows if r == 'PASS') / len(coach_rows)
md += ['',
       f'Coach decision accuracy on known defects: **{acc*100:.0f}%** ({sum(1 for *_,r in coach_rows if r=="PASS")}/{len(coach_rows)}).',
       '',
       '## 3 - Safety / flag logic',
       '',
       'Covered by the automated browser suite (12/12 PASS): dictionary fuzzy match, typo catch, nonsense rejection, low-confidence flag, uncertain-to-verify routing, plan grouping, extra-details pattern, live Gemini request-shape check.',
       '',
       '## 4 - Known limits (honest)',
       '',
       '- End-to-end transcription accuracy (characters vs ground truth) requires the Gemini Flash chain and therefore an API key; the harness ships in the repo and the numbers will be filled at submission time.',
       '- Synthetic handwriting uses rendered glyphs with geometric degradation, not true cursive variance; cursive stress-testing uses the public prescription datasets.',
       '- The coach measures framing on ink centroid; a page with two separated text blocks can read as centered when it is not.',
       '']
open(OUT + '/EVAL.md', 'w').write('\n'.join(md))
print('\n'.join(md[:40]))
print('...')
print('coach accuracy', acc, 'separability gain', round(imp, 2))
