(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const TG = 'https://t.me/zav1skq', TG_NAME = '@zav1skq';

  /* ================= ЗВУК ================= */
  let AC = null, soundOn = false;
  const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
  function blip(f = 880, d = .05, type = 'square', v = .025) {
    if (!soundOn) return; const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  function sweep(f1, f2, d = .28, v = .03, type = 'sawtooth') {
    if (!soundOn) return; const a = ac(), o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter(), t = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    fl.type = 'lowpass'; fl.frequency.value = 1800; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(fl).connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  const snd = $('#snd');
  snd.addEventListener('click', () => { soundOn = !soundOn; snd.classList.toggle('on', soundOn); snd.setAttribute('aria-pressed', soundOn); if (soundOn) { ac().resume(); blip(660, .08); setTimeout(() => blip(990, .1), 90); } });

  /* ================= ПАЛИТРЫ ================= */
  const THEMES = { neon: 'Неон', yellow: 'Жёлтый', red: 'Красный код', acid: 'Кислота', ash: 'Пепел', smoke: 'Дым', ember: 'Угли', fog: 'Туман' };
  const META = { neon: '#09050f', yellow: '#07080a', red: '#0b0405', acid: '#050607', ash: '#0f0e0d', smoke: '#0c0d10', ember: '#0e0b0a', fog: '#cfccc6' };
  let C = { bg: [0, 0, 0] };
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function readColors() {
    const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
    C = { p: v('--p'), s: v('--s'), f: v('--fg'), bg: hex(v('--bg')), smoke: v('--smoke').replace(/\s+/g, ''), smokeA: parseFloat(v('--smoke-o')) || 0 };
    if (typeof smokeReset === 'function') smokeReset();
  }
  function glitchFlash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  function setTheme(t, silent) {
    if (!THEMES[t]) return; root.dataset.theme = t; readColors();
    $$('#pal button').forEach(b => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-pressed', b.dataset.t === t); });
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = META[t];
    try { localStorage.setItem('zv-theme2', t); } catch (e) { }
    if (!silent) { glitchFlash(); sweep(220, 1400, .22); kick(9); }
  }
  $$('#pal button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.t)));

  /* ================= ТЕКСТ: РАСШИФРОВКА И ПЕЧАТЬ ================= */
  const CH = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%&@$<>/\\_=+*アイウエオカキクケコ';
  function scramble(el) {
    const target = el.dataset.final || el.textContent; el.dataset.final = target;
    if (reduce) { el.textContent = target; return; }
    const rv = [...target].map((c, i) => Math.floor(Math.random() * 12 + i * 1.1)); let f = 0;
    (function tick() { let done = true; el.textContent = [...target].map((c, i) => { if (c === ' ' || f >= rv[i]) return c; done = false; return CH[Math.random() * CH.length | 0]; }).join(''); f++; if (!done) requestAnimationFrame(tick); })();
  }
  const lead = $('#lead'); lead.dataset.text = lead.textContent.trim();
  function type(el) {
    const t = el.dataset.text; let i = 0; el.classList.add('go');
    if (reduce) { el.textContent = t; return; }
    el.textContent = '';
    (function st() { el.textContent = t.slice(0, ++i); if (i % 3 === 0) blip(1800 + Math.random() * 400, .015, 'square', .008); if (i < t.length) setTimeout(st, 12 + Math.random() * 18); })();
  }

  /* ================= ЧАСТИЦЫ ================= */
  // Уровень устройства: 2 — мощный компьютер, 1 — телефон или средний ПК, 0 — слабое устройство
  // (мало памяти или ядер, включена экономия трафика). От уровня зависят число частиц, разрешение и частота кадров.
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const tier = saveData || mem <= 2 || cores <= 2 ? 0 : (coarse || mem <= 4 || cores <= 4) ? 1 : 2;
  const DPR = tier === 2 ? Math.min(devicePixelRatio || 1, 2) : 1;   // на телефонах рисуем в 1x — в 4–9 раз меньше пикселей
  const pix = DPR < (devicePixelRatio || 1);                            // тогда частицы — чёткие квадраты по целым пикселям
  let perf = 1; try { perf = Math.min(1, +sessionStorage.getItem('zv-perf') || 1); } catch (e) { }   // запоминаем, если уже снижали нагрузку
  let fpsCap = tier === 0 ? 30 : 60;
  if (tier < 2) root.classList.add('lite');            // телефоны: без «шума» поверх экрана
  if (tier === 0) root.classList.add('lite0');         // слабые: ещё и без сканлайнов
  const CAP = 5600;
  // данные частиц — в типизированных массивах: быстрее и без мусора для сборщика
  const X = new Float32Array(CAP), Y = new Float32Array(CAP), VX = new Float32Array(CAP), VY = new Float32Array(CAP),
    TX = new Float32Array(CAP), TY = new Float32Array(CAP), HX = new Float32Array(CAP), HY = new Float32Array(CAP),
    PH = new Float32Array(CAP), KK = new Float32Array(CAP), SZ = new Float32Array(CAP);
  for (let i = 0; i < CAP; i++) {
    X[i] = Math.random() * innerWidth; Y[i] = Math.random() * innerHeight; PH[i] = Math.random() * 6.283; KK[i] = .55 + Math.random() * .9;
    SZ[i] = Math.random() < .18 ? 1 : 0;           // 1 — крупная частица (на пиксель больше)
  }
  const cv = $('#px'), ctx = cv.getContext('2d', { alpha: false });
  if (pix) cv.style.imageRendering = 'pixelated';
  const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
  const steps = $$('.step');
  let W = 0, H = 0, N = 0, active = -1, offY = 0, offYT = 0, excite = 0, dust = false, fade = 1, energy = 1e9;
  const mouse = { x: -9999, y: -9999 };
  const bursts = []; let glitch = null, nextGlitch = performance.now() + 2500;
  const cache = new Map();
  // когда всё замерло, кадры не рисуются; любое событие «будит» анимацию на время
  let wakeUntil = 0; const wake = (ms = 1500) => { wakeUntil = Math.max(wakeUntil, performance.now() + ms); };
  function wantCount(w = W) {
    const narrow = w < 760;
    const base = tier === 2 ? (narrow ? 2400 : 5600) : tier === 1 ? (narrow ? 1700 : 3200) : (narrow ? 900 : 1600);
    return Math.max(500, Math.min(CAP, Math.round(base * perf)));
  }

  function points(word, yr) {
    if (!W || !H) return [[W / 2, H / 2]]; // окно ещё не имеет размера (например, вкладка в фоне)
    const key = word + W + 'x' + H + yr; if (cache.has(key)) return cache.get(key);
    off.width = W; off.height = H; octx.clearRect(0, 0, W, H); octx.fillStyle = '#fff'; octx.textAlign = 'center'; octx.textBaseline = 'middle';
    const narrow = W < 760;
    octx.font = '900 200px Unbounded, sans-serif';
    const fs = Math.min(200 * (W * (narrow ? .9 : .78)) / octx.measureText(word).width, H * (narrow ? .15 : .24));
    octx.font = `900 ${fs}px Unbounded, sans-serif`; octx.fillText(word, W / 2, H * yr);
    const d = octx.getImageData(0, 0, W, H).data, g = narrow ? 3 : 4, pts = [];
    for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) if (d[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    if (!pts.length) pts.push([W / 2, H / 2]);
    cache.set(key, pts); return pts;
  }
  function kick(power = 14) {
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < N; i++) {
      const a = Math.atan2(Y[i] - cy, X[i] - cx), s = power * (.5 + Math.random());
      VX[i] += -Math.sin(a) * s + (Math.random() - .5) * power; VY[i] += Math.cos(a) * s + (Math.random() - .5) * power;
    }
    wake(2500);
  }
  let wb = null;                                      // рамка текущего слова (без сдвига прокрутки)
  function target(idx, doKick) {
    const s = steps[idx], pts = points(s.dataset.word, +s.dataset.y || .22), L = pts.length;
    for (let k = 0; k < CAP; k++) { const t = pts[k % L], dup = k >= L; TX[k] = t[0] + (dup ? (Math.random() - .5) * 3 : 0); TY[k] = t[1] + (dup ? (Math.random() - .5) * 3 : 0); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let k = 0; k < L; k++) { const p = pts[k]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    wb = L > 1 ? { x0, y0, x1, y1 } : null;
    if (doKick) kick(14); else wake();
  }

  // На телефоне: невидимая зона поверх слова из частиц с touch-action: none.
  // Палец, начавший движение на частицах, гоняет их, а страница стоит. Свайп в любом другом месте листает как обычно.
  // Зона включается, только когда слово «приклеено» к своему разделу и не может перекрыть кнопки и текст.
  const grab = coarse ? $('#grab') : null;
  function placeGrab() {
    if (!grab) return;
    const vh = innerHeight, top = tops[active] - scrollY, pad = 18;
    const ok = !!wb && !dust && !reduce && top <= vh * .25 && top >= -vh * .5 && wb.y1 + offYT > 0;
    grab.classList.toggle('on', ok);
    if (ok) {
      grab.style.transform = `translate(${Math.round(wb.x0 - pad)}px, ${Math.round(wb.y0 + offYT - pad)}px)`;
      grab.style.width = Math.round(wb.x1 - wb.x0 + pad * 2) + 'px';
      grab.style.height = Math.round(wb.y1 - wb.y0 + pad * 2) + 'px';
    }
  }
  function resize() {
    W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const [r, g, b] = C.bg; ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, W, H);
    N = wantCount(); $('#pc').textContent = pad(N, 4);
    for (let i = 0; i < CAP; i++) { HX[i] = Math.random() * W; HY[i] = Math.random() * H; }
    cache.clear(); if (active >= 0) target(active, false);
    smokeSize(); wake();
  }

  // Следим за частотой кадров: если устройство не тянет, плавно убираем часть частиц (и запоминаем это до конца визита)
  let lastT = 0, fAcc = 0, fCnt = 0, slow = 0;
  function monitor(dt) {
    if (dt > 200) return;                          // вкладка была в фоне или анимация спала
    fAcc += dt; fCnt++;
    if (fAcc < 2500) return;
    const fps = fCnt * 1000 / fAcc; fAcc = fCnt = 0;
    if (fps >= (fpsCap === 30 ? 24 : 44)) { slow = 0; return; }
    if (++slow < 2) return;                        // ждём две медленные проверки подряд
    slow = 0;
    if (N > 600) { perf *= .7; N = wantCount(); $('#pc').textContent = pad(N, 4); try { sessionStorage.setItem('zv-perf', perf.toFixed(3)); } catch (e) { } }
    else { fpsCap = 30; root.classList.add('lite0'); }   // совсем слабое устройство — убираем и декоративные слои
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastT < 1000 / fpsCap - 2) return;   // ограничение частоты кадров
    const dt = now - lastT; lastT = now;
    smokeFrame(now);
    if (tier > 0 && !reduce && now > nextGlitch) {
      glitch = { until: now + 140 + Math.random() * 160, bands: Array.from({ length: 1 + Math.random() * 3 | 0 }, () => ({ y: Math.random() * H * .7, h: 6 + Math.random() * 40, dx: (Math.random() - .5) * 70 })) };
      nextGlitch = now + 1800 + Math.random() * 3200; wake(450);
    }
    // всё замерло — не тратим ни кадра (важно для батареи и слабых телефонов)
    if (now > wakeUntil && !dust && !bursts.length && !excite && energy < N * .05) return;
    monitor(dt);

    const [r, g, b] = C.bg; ctx.globalAlpha = 1; ctx.fillStyle = `rgba(${r},${g},${b},.3)`; ctx.fillRect(0, 0, W, H);
    offY += (offYT - offY) * .1;
    fade += ((dust ? (W < 760 ? .22 : .3) : 1) - fade) * .05;
    const gl = glitch && now < glitch.until ? glitch.bands : null;
    const hasM = mouse.x > -999, mx = mouse.x, my = mouse.y;
    const R = W < 760 ? 70 : 115, R2 = R * R, ks = dust ? .0045 : .016;
    const n0 = N * .68 | 0, n1 = n0 + (N * .22 | 0), bounds = [0, n0, n1, N], cols = [C.p, C.s, C.f];
    // размер частицы = шаг сетки слова − 1 px (+1 у крупных): буквы выглядят плотными, «насыпанными», как на телефоне
    const s0 = (W < 760 ? 3 : 4) - 1;
    let en = 0;
    ctx.globalAlpha = fade;
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = cols[c];
      for (let i = bounds[c], e = bounds[c + 1]; i < e; i++) {
        const k = KK[i]; let tx, ty;
        if (dust) { tx = HX[i] + Math.sin(now * .00028 * k + PH[i]) * 42; ty = HY[i] + Math.cos(now * .00021 * k + PH[i]) * 42; }
        else { tx = TX[i]; ty = TY[i] + offY; }
        let x = X[i], y = Y[i];
        let ax = (tx - x) * ks * k, ay = (ty - y) * ks * k;
        if (hasM) { const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy; if (d2 < R2) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 7; ax += dx / d * f; ay += dy / d * f; } }
        if (excite) { ax += (Math.random() - .5) * excite; ay += (Math.random() - .5) * excite; }
        const vx = (VX[i] + ax) * .87, vy = (VY[i] + ay) * .87;
        VX[i] = vx; VY[i] = vy; x += vx; y += vy; X[i] = x; Y[i] = y;
        en += (vx < 0 ? -vx : vx) + (vy < 0 ? -vy : vy);
        if (gl) for (let j = 0; j < gl.length; j++) { const bd = gl[j]; if (y > bd.y && y < bd.y + bd.h) { x += bd.dx; break; } }
        const sz = s0 + SZ[i]; ctx.fillRect(x | 0, y | 0, sz, sz);
      }
    }
    energy = en;
    // кольца от кликов
    for (let i = bursts.length - 1; i >= 0; i--) {
      const bu = bursts[i], t = (now - bu.t) / 600; if (t > 1) { bursts.splice(i, 1); continue; }
      ctx.lineWidth = 2; ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = C.p; ctx.beginPath(); ctx.arc(bu.x, bu.y, 20 + t * 260, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = C.s; ctx.beginPath(); ctx.arc(bu.x, bu.y, 10 + t * 180, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ================= ДЫМ ================= */
  // Несколько мягких облаков на крошечном холсте (192 px), который браузер растягивает на весь экран — получается туман.
  const sm = $('#smoke'), sctx = sm.getContext('2d');
  let SW = 0, SH = 0, sLast = 0;
  const puffs = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random() * 1.4 - .2, r: .3 + Math.random() * .38, ph: Math.random() * 6.283, sp: .6 + Math.random() * .8 }));
  const trail = { x: .5, y: .5, a: 0 };            // клуб дыма, который тянется за курсором или пальцем
  // RS — масштаб облаков от площади экрана, а не от ширины: на широком мониторе дым не затягивает весь экран,
  // плотность такая же, как на телефоне
  let RS = 130;
  function smokeSize() { SW = 192; SH = Math.max(60, Math.round(SW * (H || 1) / (W || 1))); RS = Math.sqrt(SW * SH) * .68; sm.width = SW; sm.height = SH; sLast = 0; }
  function smokeReset() { sLast = 0; if (!C.smokeA && SW) sctx.clearRect(0, 0, SW, SH); }
  function puff(x, y, rr, a) {
    const g = sctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(${C.smoke},${a})`); g.addColorStop(.55, `rgba(${C.smoke},${a * .4})`); g.addColorStop(1, `rgba(${C.smoke},0)`);
    sctx.fillStyle = g; sctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  function smokeFrame(now) {
    if (!C.smokeA || !SW) return;
    if (reduce && sLast) return;                   // без анимации — один кадр
    if (now - sLast < (tier === 0 ? 120 : 55)) return; sLast = now;
    sctx.clearRect(0, 0, SW, SH);
    const par = scrollY / (H || 1) * .1;           // дым медленно уплывает вверх при прокрутке
    for (const p of puffs) {
      const t = now * .00004 * p.sp;
      const x = (p.x + Math.sin(t + p.ph) * .22) * SW;
      const y = ((((p.y - par * p.sp + Math.cos(t * 1.3 + p.ph) * .12) % 1.6) + 1.6) % 1.6 - .3) * SH;
      puff(x, y, p.r * RS * (1 + .18 * Math.sin(t * 2 + p.ph)), .5);
    }
    if (mouse.x > -999) { trail.x += (mouse.x / W - trail.x) * .07; trail.y += (mouse.y / H - trail.y) * .07; trail.a += (.4 - trail.a) * .06; } else trail.a *= .94;
    if (trail.a > .02) puff(trail.x * SW, trail.y * SH, SW * .13, trail.a);
  }

  /* ================= АКТИВНЫЙ РАЗДЕЛ ================= */
  const side = $('#side'), secName = $('#secName');
  steps.forEach(s => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${s.dataset.name}</span>`; b.setAttribute('aria-label', s.dataset.name); b.onclick = () => s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); side.appendChild(b); });
  // Положения разделов меряем один раз (и при изменении размеров), а при прокрутке только сравниваем с scrollY —
  // без замеров страницы на каждое событие прокрутки. Сам расчёт — не чаще одного раза за кадр.
  let tops = [], hts = [], docH = 1, spLast = -1, pickQ = false;
  function measure() {
    const y = scrollY;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(); tops[i] = r.top + y; hts[i] = r.height; });
    docH = root.scrollHeight;
  }
  const schedulePick = () => { if (!pickQ) { pickQ = true; requestAnimationFrame(() => { pickQ = false; pick(); }); } };
  function pick() {
    if (!tops.length) measure();
    const y = scrollY, vh = innerHeight, mid = y + vh / 2;
    let idx = active < 0 ? 0 : active;
    for (let i = 0; i < steps.length; i++) if (tops[i] <= mid && tops[i] + hts[i] > mid) idx = i;
    const top = tops[idx] - y;
    offYT = Math.max(-vh * .5, Math.min(vh * .25, top));
    // в длинных разделах слово распадается на «пыль», чтобы не мешать тексту
    const nd = hts[idx] > vh * 1.4 && top < -vh * .35;
    if (idx !== active) {
      const first = active < 0; active = idx; target(idx, !first && !nd);
      [...side.children].forEach((b, i) => b.classList.toggle('on', i === idx));
      secName.dataset.final = steps[idx].dataset.name.toUpperCase(); secName.textContent = secName.dataset.final; scramble(secName);
      if (!first) sweep(160, 900, .3, .02);
    }
    if (nd !== dust) { dust = nd; if (!dust) kick(6); }
    wake(900);
    placeGrab();
    const sp = Math.round(y / ((docH - vh) || 1) * 100);
    if (sp !== spLast) { spLast = sp; $('#sp').textContent = pad(sp, 3); }
  }
  // высоты разделов меняются, когда догружаются шрифты и картинки
  if (window.ResizeObserver) { let rt = 0; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { measure(); schedulePick(); }, 150); }).observe($('main')); }
  addEventListener('load', () => { measure(); schedulePick(); });

  /* ================= ВЗАИМОДЕЙСТВИЕ ================= */
  const cur = $('#cur'), lbl = $('#lbl');
  let cx = innerWidth / 2, cy = innerHeight / 2;
  addEventListener('mousemove', e => { if (mouse.x < -999) { cx = e.clientX; cy = e.clientY; cur.classList.add('on'); } mouse.x = e.clientX; mouse.y = e.clientY; $('#cx').textContent = pad(e.clientX | 0, 4); $('#cy').textContent = pad(e.clientY | 0, 4); wake(700); });
  document.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; wake(700); });
  addEventListener('touchmove', e => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; wake(700); }, { passive: true });
  addEventListener('touchend', () => { mouse.x = mouse.y = -9999; wake(700); });
  document.addEventListener('click', e => {
    if (e.target.closest('a, button, input, form, .term, .boot, .lb')) return;
    bursts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    for (let i = 0; i < N; i++) { const dx = X[i] - e.clientX, dy = Y[i] - e.clientY, d = Math.hypot(dx, dy) || 1; if (d < 260) { const f = (1 - d / 260) * 42; VX[i] += dx / d * f; VY[i] += dy / d * f; } }
    wake(2500); sweep(900, 90, .35, .04, 'square');
  });
  $$('a, button').forEach(a => {
    a.addEventListener('mouseenter', () => { cur.classList.add('hot'); lbl.textContent = a.dataset.label || ''; blip(2400, .02, 'square', .01); });
    a.addEventListener('mouseleave', () => { cur.classList.remove('hot'); lbl.textContent = ''; });
  });
  $$('.shot').forEach(s => { s.addEventListener('mouseenter', () => { excite = 2.2; }); s.addEventListener('mouseleave', () => { excite = 0; }); });
  // прицел нужен только там, где есть мышь; на телефонах цикл не запускаем
  if (!coarse) (function loop() { if (mouse.x > -999 && (Math.abs(mouse.x - cx) > .3 || Math.abs(mouse.y - cy) > .3)) { cx += (mouse.x - cx) * .25; cy += (mouse.y - cy) * .25; cur.style.transform = `translate(${cx}px, ${cy}px)`; } requestAnimationFrame(loop); })();

  /* ================= ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ ================= */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); e.target.classList.add('on');
    blip(e.target.classList.contains('panel') ? 140 : 320, .16, 'sawtooth', .016);
    e.target.querySelectorAll('[data-scramble]').forEach(s => setTimeout(() => scramble(s), 380));
  }), { threshold: .15 });
  $$('.panel, .rv, .flow').forEach(p => io.observe(p));
  // глитч-заголовки анимируются, только пока видны
  const gio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('live', e.isIntersecting)));
  $$('.gt').forEach(g => gio.observe(g));

  /* ================= ПРОСМОТР СКРИНШОТОВ ================= */
  const lb = $('#lb'), lbFrame = $('#lbFrame'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lbNum = $('#lbNum');
  const SETS = {}; let lbSet = null, lbI = 0, lastFocus = null;
  $$('.thumbs').forEach(t => {
    const bs = [...t.querySelectorAll('button')];
    SETS[t.dataset.set] = bs.map(b => ({ src: b.dataset.src, cap: b.dataset.cap }));
    bs.forEach((b, i) => b.addEventListener('click', () => openLb(t.dataset.set, i)));
  });
  function showLb() {
    const list = SETS[lbSet], it = list[lbI];
    lbImg.src = it.src; lbImg.alt = it.cap; lbCap.textContent = it.cap; lbNum.textContent = pad(lbI + 1) + '/' + pad(list.length);
    lbFrame.classList.remove('on'); void lbFrame.offsetWidth; lbFrame.classList.add('on'); blip(180, .14, 'sawtooth', .02);
  }
  function openLb(set, i) {
    if (!SETS[set]) return; lbSet = set; lbI = i; lastFocus = document.activeElement;
    lb.hidden = false; document.body.classList.add('lb-open'); showLb(); lb.querySelector('.lb__close').focus({ preventScroll: true });
  }
  function closeLb() { lb.hidden = true; document.body.classList.remove('lb-open'); cur.classList.remove('hot'); lbl.textContent = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); }
  const stepLb = d => { const n = SETS[lbSet].length; lbI = (lbI + d + n) % n; showLb(); };
  lb.querySelector('.prev').addEventListener('click', () => stepLb(-1));
  lb.querySelector('.next').addEventListener('click', () => stepLb(1));
  lb.querySelector('.lb__close').addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowLeft') stepLb(-1); else if (e.key === 'ArrowRight') stepLb(1);
    else if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button')], i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
  });
  let tsx = 0; lb.addEventListener('touchstart', e => { tsx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tsx; if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1); });

  /* ================= ПЕРЕХОД В ДЕМО И ВОЗВРАТ ================= */
  const warpEl = $('#warp'), warpName = $('#warpName'), warpVerb = $('#warpVerb'), warpTag = $('#warpTag');
  let warping = false;
  function warp(href, name) {
    if (warping) return; warping = true;
    warpTag.textContent = '// переход'; warpVerb.textContent = 'подключение к'; warpName.textContent = name;
    warpEl.hidden = false; warpEl.classList.remove('out'); void warpEl.offsetWidth; warpEl.classList.add('on');
    kick(30); glitchFlash(); sweep(160, 2200, .6, .035);
    try { sessionStorage.setItem('zv-warp', '1'); } catch (e) { }
    setTimeout(() => { location.href = href; }, reduce ? 30 : 950);
  }
  function warpOut() {
    warping = false;
    warpTag.textContent = '// возврат'; warpVerb.textContent = 'возврат в'; warpName.textContent = 'портфолио';
    if (reduce) { warpEl.hidden = true; return; }
    warpEl.hidden = false; warpEl.classList.remove('on'); void warpEl.offsetWidth; warpEl.classList.add('out');
    setTimeout(() => { warpEl.hidden = true; warpEl.classList.remove('out'); }, 750);
  }
  // ссылки с data-demo открываются в этой же вкладке с переходом; Ctrl/колёсико — как обычно, в новой вкладке
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-demo]'); if (!a) return;
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    warp(innerWidth < 760 && a.dataset.mobile ? a.dataset.mobile : a.getAttribute('href'), a.dataset.demo);
  });
  addEventListener('pageshow', e => {
    let back = false; try { back = sessionStorage.getItem('zv-back') === '1'; sessionStorage.removeItem('zv-back'); } catch (er) { }
    if (e.persisted || back) { warpOut(); kick(12); }
  });

  /* ================= ТЕРМИНАЛ ================= */
  const out = $('#tout'), form = $('#tform'), input = $('#tin');
  const print = (html, cls = '') => { const d = document.createElement('div'); d.className = 'ln ' + cls; d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; };
  const tg = `<a href="${TG}" target="_blank" rel="noopener">${TG_NAME}</a>`;
  const SK = ['Сайты и лендинги', 'Telegram Mini Apps', 'Telegram-боты', 'Бэкенд и интеграции', 'Дизайн интерфейсов', 'Анимации, 3D и WebGL'];
  const CMDS = {
    help: () => print('Команды: <b>projects</b> · <b>skills</b> · <b>stack</b> · <b>process</b> · <b>about</b> · <b>contact</b> · <b>theme</b> [ash|smoke|ember|fog] · <b>clear</b>'),
    projects: () => { print('01 АГАВА тур — <a href="https://agavatour.ru" target="_blank" rel="noopener">agavatour.ru</a>'); print('02 Mini App фитнес-клуба — <a href="mini-app.html" data-demo="MINI APP" data-mobile="projects/fitness/index.html">демо</a>'); print('03 Демиург — <a href="projects/demiurg/index.html" data-demo="ДЕМИУРГ">демо</a>'); },
    skills: () => { SK.forEach((s, i) => print(`<b>MOD_0${i + 1}</b> ${s}`)); print('Подробно — в разделе <a href="#skills">«Что я умею»</a>'); },
    stack: () => { print('<b>FRONTEND</b> HTML · CSS · JavaScript'); print('<b>GRAPHICS</b> Canvas · WebGL 2 · GLSL · SVG · Web Audio'); print('<b>TELEGRAM</b> Mini Apps SDK · Bot API'); print('<b>BACKEND</b> PHP · REST API · JSON'); },
    process: () => { ['Бриф', 'Структура', 'Дизайн', 'Разработка', 'Запуск'].forEach((s, i) => print(`<b>0${i + 1}</b> ${s}`)); },
    about: () => print('Nikita Zavarzin — веб-разработчик. Делаю сайты, Telegram Mini Apps и ботов: от идеи и дизайна до сервера и запуска.'),
    contact: () => { print('Открываю канал связи → ' + tg); window.open(TG, '_blank', 'noopener'); },
    theme: arg => { if (THEMES[arg]) { setTheme(arg); print('Палитра переключена: <b>' + THEMES[arg] + '</b>'); } else { const keys = Object.keys(THEMES), next = keys[(keys.indexOf(root.dataset.theme) + 1) % keys.length]; setTheme(next); print('Палитра: <b>' + THEMES[next] + '</b>. Можно сразу: theme neon | yellow | red | acid'); } },
    clear: () => { out.innerHTML = ''; },
    sudo: () => print('Доступ запрещён. Но можно просто написать ' + tg, 'err'),
  };
  const ALIAS = { hire: 'contact', tg: 'contact', telegram: 'contact', 'помощь': 'help', 'проекты': 'projects', 'навыки': 'skills', 'умею': 'skills', 'стек': 'stack', 'этапы': 'process', 'контакт': 'contact', 'тема': 'theme', ls: 'projects', whoami: 'about', cls: 'clear' };
  function run(raw) {
    raw = raw.trim(); if (!raw) return; print('<span>&gt;</span> ' + esc(raw), 'cmd');
    const [c0, arg] = raw.toLowerCase().split(/\s+/), c = ALIAS[c0] || c0;
    (CMDS[c] || (() => print('Команда не найдена: ' + esc(c0) + '. Наберите <b>help</b>', 'err')))(arg); blip(1200, .04);
  }
  form.addEventListener('submit', e => { e.preventDefault(); run(input.value); input.value = ''; });
  $$('#qc button').forEach(b => b.addEventListener('click', () => run(b.dataset.cmd)));
  print('Связь установлена. Наберите <b>help</b> или нажмите кнопку ниже.');

  /* ================= ПОЛОСА, ЧАСЫ, ГОД ================= */
  const hz = 'Принимаю заказы ▲ Сайты ▲ Лендинги ▲ Telegram Mini Apps ▲ Боты ▲ Дизайн под бренд ▲ Интеграции ▲ WebGL ▲ ';
  $('#haz').innerHTML = `<span>${hz.repeat(3)}</span><span>${hz.repeat(3)}</span>`;
  const clock = $('#clock'); const tick = () => { clock.textContent = new Date().toLocaleTimeString('ru-RU'); }; tick(); setInterval(tick, 1000);
  $('#year').textContent = new Date().getFullYear();

  /* ================= ЗАГРУЗКА ================= */
  setTheme(THEMES[root.dataset.theme] ? root.dataset.theme : 'ash', true);
  const startHero = () => { setTimeout(() => type(lead), 300); };
  const boot = $('#boot'), log = $('#log'), bar = $('#bar');
  const lines = ['> init zav1skq.portfolio', '  нейроинтерфейс ........... <i>ok</i>', '  частицы [' + pad(wantCount(innerWidth), 4) + '] ......... <i>ok</i>', '  проекты [03] ............. <i>ok</i>', '  модули  [06] ............. <i>ok</i>', '> вход в систему_'];
  let bootDone = false;
  const endBoot = () => {
    if (bootDone) return; bootDone = true; boot.classList.add('off'); kick(22); sweep(120, 1600, .4, .03); setTimeout(startHero, 300); setTimeout(() => boot.remove(), 700);
    try { sessionStorage.setItem('zv-boot', '1'); } catch (e) { }
  };
  const go = () => { resize(); pick(); requestAnimationFrame(frame); };
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('900 100px Unbounded', steps.map(s => s.dataset.word).join(' ')) : Promise.resolve();
  Promise.race([fontReady, new Promise(r => setTimeout(r, 2500))]).then(go);
  if (reduce || root.classList.contains('noboot')) { boot.remove(); bootDone = true; startHero(); }
  else {
    boot.addEventListener('click', endBoot); addEventListener('keydown', endBoot, { once: true });
    let i = 0; (function next() { if (bootDone) return; if (i < lines.length) { log.innerHTML += lines[i] + '\n'; bar.style.width = (++i / lines.length * 100) + '%'; setTimeout(next, 140 + Math.random() * 100); } else setTimeout(endBoot, 220); })();
  }
  addEventListener('scroll', schedulePick, { passive: true });
  addEventListener('resize', () => { resize(); measure(); pick(); });
})();
