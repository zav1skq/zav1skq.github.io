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
  const THEMES = { neon: 'Неон', yellow: 'Жёлтый', red: 'Красный код', acid: 'Кислота' };
  const META = { neon: '#09050f', yellow: '#07080a', red: '#0b0405', acid: '#050607' };
  let C = {};
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  function readColors() { const cs = getComputedStyle(root); C = { p: cs.getPropertyValue('--p').trim(), s: cs.getPropertyValue('--s').trim(), f: cs.getPropertyValue('--fg').trim(), bg: hex(cs.getPropertyValue('--bg').trim()) }; }
  function glitchFlash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  function setTheme(t, silent) {
    if (!THEMES[t]) return; root.dataset.theme = t; readColors();
    $$('#pal button').forEach(b => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-pressed', b.dataset.t === t); });
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = META[t];
    try { localStorage.setItem('zv-theme', t); } catch (e) { }
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
  const cv = $('#px'), ctx = cv.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
  const steps = $$('.step');
  let W = 0, H = 0, DPR = Math.min(devicePixelRatio || 1, 2), P = [], N = 0, active = -1, offY = 0, offYT = 0, excite = 0, dust = false, fade = 1;
  const mouse = { x: -9999, y: -9999 };
  const bursts = []; let glitch = null, nextGlitch = performance.now() + 2500;
  const cache = new Map();

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
    P.forEach(p => { const a = Math.atan2(p.y - H / 2, p.x - W / 2), s = power * (.5 + Math.random());
      p.vx += -Math.sin(a) * s + (Math.random() - .5) * power; p.vy += Math.cos(a) * s + (Math.random() - .5) * power; });
  }
  function target(i, doKick) {
    const s = steps[i], pts = points(s.dataset.word, +s.dataset.y || .22);
    P.forEach((p, k) => { const t = pts[k % pts.length]; const dup = k >= pts.length; p.tx = t[0] + (dup ? (Math.random() - .5) * 3 : 0); p.ty = t[1] + (dup ? (Math.random() - .5) * 3 : 0); });
    if (doKick) kick(14);
  }
  function resize() {
    W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const want = W < 760 ? 2400 : 5600;
    while (P.length < want) P.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, tx: W / 2, ty: H / 2, hx: 0, hy: 0, ph: Math.random() * 6.28, k: .55 + Math.random() * .9, s: Math.random() < .18 ? 2.6 : 1.8, c: Math.random() < .68 ? 0 : (Math.random() < .7 ? 1 : 2) });
    P.length = want; N = want; $('#pc').textContent = pad(N, 4);
    P.forEach(p => { p.hx = Math.random() * W; p.hy = Math.random() * H; });
    cache.clear(); if (active >= 0) target(active, false);
  }

  function frame(now) {
    const [r, g, b] = C.bg; ctx.globalAlpha = 1; ctx.fillStyle = `rgba(${r},${g},${b},.3)`; ctx.fillRect(0, 0, W, H);
    offY += (offYT - offY) * .1;
    fade += ((dust ? (W < 760 ? .22 : .3) : 1) - fade) * .05;
    if (!reduce && now > nextGlitch) { glitch = { until: now + 140 + Math.random() * 160, bands: Array.from({ length: 1 + Math.random() * 3 | 0 }, () => ({ y: Math.random() * H * .7, h: 6 + Math.random() * 40, dx: (Math.random() - .5) * 70 })) }; nextGlitch = now + 1800 + Math.random() * 3200; }
    const gl = glitch && now < glitch.until ? glitch.bands : null;
    const R = W < 760 ? 70 : 115, R2 = R * R, cols = [C.p, C.s, C.f], ks = dust ? .0045 : .016;
    ctx.globalAlpha = fade;
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = cols[c];
      for (let i = 0; i < N; i++) {
        const p = P[i]; if (p.c !== c) continue;
        let tx, ty;
        if (dust) { tx = p.hx + Math.sin(now * .00028 * p.k + p.ph) * 42; ty = p.hy + Math.cos(now * .00021 * p.k + p.ph) * 42; }
        else { tx = p.tx; ty = p.ty + offY; }
        let ax = (tx - p.x) * ks * p.k, ay = (ty - p.y) * ks * p.k;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 7; ax += dx / d * f; ay += dy / d * f; }
        if (excite) { ax += (Math.random() - .5) * excite; ay += (Math.random() - .5) * excite; }
        p.vx = (p.vx + ax) * .87; p.vy = (p.vy + ay) * .87; p.x += p.vx; p.y += p.vy;
        let x = p.x;
        if (gl) for (const band of gl) if (p.y > band.y && p.y < band.y + band.h) { x += band.dx; break; }
        ctx.fillRect(x, p.y, p.s, p.s);
      }
    }
    // кольца от кликов
    for (let i = bursts.length - 1; i >= 0; i--) {
      const bu = bursts[i], t = (now - bu.t) / 600; if (t > 1) { bursts.splice(i, 1); continue; }
      ctx.lineWidth = 2; ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = C.p; ctx.beginPath(); ctx.arc(bu.x, bu.y, 20 + t * 260, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = C.s; ctx.beginPath(); ctx.arc(bu.x, bu.y, 10 + t * 180, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  /* ================= АКТИВНЫЙ РАЗДЕЛ ================= */
  const side = $('#side'), secName = $('#secName');
  steps.forEach(s => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span>${s.dataset.name}</span>`; b.setAttribute('aria-label', s.dataset.name); b.onclick = () => s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); side.appendChild(b); });
  function pick() {
    const mid = innerHeight / 2; let idx = active < 0 ? 0 : active;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) idx = i; });
    const rc = steps[idx].getBoundingClientRect();
    offYT = Math.max(-innerHeight * .5, Math.min(innerHeight * .25, rc.top));
    // в длинных разделах слово распадается на «пыль», чтобы не мешать тексту
    const nd = rc.height > innerHeight * 1.4 && rc.top < -innerHeight * .35;
    if (idx !== active) {
      const first = active < 0; active = idx; target(idx, !first && !nd);
      [...side.children].forEach((b, i) => b.classList.toggle('on', i === idx));
      secName.dataset.final = steps[idx].dataset.name.toUpperCase(); secName.textContent = secName.dataset.final; scramble(secName);
      if (!first) sweep(160, 900, .3, .02);
    }
    if (nd !== dust) { dust = nd; if (!dust) kick(6); }
    const m = root.scrollHeight - innerHeight; $('#sp').textContent = pad(Math.round(scrollY / (m || 1) * 100), 3);
  }

  /* ================= ВЗАИМОДЕЙСТВИЕ ================= */
  const cur = $('#cur'), lbl = $('#lbl');
  let cx = innerWidth / 2, cy = innerHeight / 2;
  addEventListener('mousemove', e => { if (mouse.x < -999) { cx = e.clientX; cy = e.clientY; cur.classList.add('on'); } mouse.x = e.clientX; mouse.y = e.clientY; $('#cx').textContent = pad(e.clientX | 0, 4); $('#cy').textContent = pad(e.clientY | 0, 4); });
  document.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
  addEventListener('touchmove', e => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', () => { mouse.x = mouse.y = -9999; });
  document.addEventListener('click', e => {
    if (e.target.closest('a, button, input, form, .term, .boot, .lb')) return;
    bursts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    P.forEach(p => { const dx = p.x - e.clientX, dy = p.y - e.clientY, d = Math.hypot(dx, dy) || 1; if (d < 260) { const f = (1 - d / 260) * 42; p.vx += dx / d * f; p.vy += dy / d * f; } });
    sweep(900, 90, .35, .04, 'square');
  });
  $$('a, button').forEach(a => {
    a.addEventListener('mouseenter', () => { cur.classList.add('hot'); lbl.textContent = a.dataset.label || ''; blip(2400, .02, 'square', .01); });
    a.addEventListener('mouseleave', () => { cur.classList.remove('hot'); lbl.textContent = ''; });
  });
  $$('.shot').forEach(s => { s.addEventListener('mouseenter', () => { excite = 2.2; }); s.addEventListener('mouseleave', () => { excite = 0; }); });
  (function loop() { cx += (mouse.x - cx) * .25; cy += (mouse.y - cy) * .25; if (mouse.x > -999) cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); })();

  /* ================= ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ ================= */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); e.target.classList.add('on');
    blip(e.target.classList.contains('panel') ? 140 : 320, .16, 'sawtooth', .016);
    e.target.querySelectorAll('[data-scramble]').forEach(s => setTimeout(() => scramble(s), 380));
  }), { threshold: .15 });
  $$('.panel, .rv, .flow').forEach(p => io.observe(p));

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
    help: () => print('Команды: <b>projects</b> · <b>skills</b> · <b>stack</b> · <b>process</b> · <b>about</b> · <b>contact</b> · <b>theme</b> [neon|yellow|red|acid] · <b>clear</b>'),
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
  setTheme(THEMES[root.dataset.theme] ? root.dataset.theme : 'neon', true);
  const startHero = () => { setTimeout(() => type(lead), 300); };
  const boot = $('#boot'), log = $('#log'), bar = $('#bar');
  const lines = ['> init zav1skq.portfolio', '  нейроинтерфейс ........... <i>ok</i>', '  частицы [' + (innerWidth < 760 ? 2400 : 5600) + '] ......... <i>ok</i>', '  проекты [03] ............. <i>ok</i>', '  модули  [06] ............. <i>ok</i>', '> вход в систему_'];
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
  addEventListener('scroll', pick, { passive: true });
  addEventListener('resize', () => { resize(); pick(); });
})();
