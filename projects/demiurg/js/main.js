/* ДЕМИУРГ — main.js: режиссура.
   У каждой секции есть «поза» планеты (где она на экране, какого размера,
   откуда светит звезда). Пока вы листаете, позы смешиваются по тому, какую
   долю экрана занимает секция, — получается одно непрерывное движение камеры. */
(function () {
  'use strict';
  const D = window.DMG, m3 = D.m3, $ = D.$, $$ = D.$$;
  const RAD = Math.PI / 180;
  const root = document.documentElement;

  const st = (D.state = {
    W: window.innerWidth, H: window.innerHeight, wide: true,
    time: 0,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, sx: 0, sy: 0, target: null, seen: false },
    pose: null,
    world: D.cloneWorld(D.WORLDS[0].p),
    worldT: D.cloneWorld(D.WORLDS[0].p),
    user: D.cloneWorld(D.WORLDS[0].p),
    userRot: m3.ident(), rotV: [0, 0], drag: null, hoverPlanet: false,
    spinAng: 1.9, cloudAng: 0,
    flash: 0, fade: 0, intro: 0,
    sunAz: 335,
    secIdx: -1,
    running: false,
  });

  let R = null;
  const secs = [];
  const M = {};
  const cat = { idx: -1, world: D.cloneWorld(D.WORLDS[0].p), navs: [], p: 0 };
  const els = {};

  /* =====================================================================
     ПОЗЫ
     ===================================================================== */
  const FOCAL = () => (st.H * 0.5) / Math.tan(D.FOV / 2);
  const POSE = {
    hero(p, W, H, wide) {
      const r = wide ? 0.9 * H : Math.max(1.3 * W, 0.58 * H);
      const apex = M.heroApex === undefined ? H * 0.5 : M.heroApex;
      // звезда спрятана сразу за лимбом, чуть правее вершины дуги: предрассветное свечение
      const beta = Math.atan(r / FOCAL()) - 1.45 * RAD, th = 25 * RAD;
      const el = Math.asin(Math.sin(beta) * Math.cos(th));
      const az = Math.PI - Math.asin((Math.sin(beta) * Math.sin(th)) / Math.cos(el));
      return { cx: 0, cy: H / 2 - apex - r, rad: r, az: az / RAD, el: el / RAD, exp: 1.05, bp: 0, neb: 1, star: 1, yaw: 0, flare: 1, zoom: 0 };
    },
    manifesto(p, W, H, wide) {
      // на «квадратных» экранах планета ужимается, чтобы не залезать под текст слева
      if (wide) return { cx: 0.295 * W, cy: D.lerp(0.03, -0.03, p) * H, rad: Math.min(0.355 * H, 0.2 * W), az: D.lerp(236, 254, p), el: 10, exp: 1, bp: 0, neb: 1, star: 1, yaw: 0.25, flare: 0, zoom: 1 };
      return { cx: 0, cy: 0.2 * H, rad: Math.min(0.38 * W, 0.2 * H), az: D.lerp(236, 254, p), el: 10, exp: 1, bp: 0, neb: 1, star: 1, yaw: 0.25, flare: 0, zoom: 1 };
    },
    worlds(p, W, H, wide) {
      const az = 304 + 16 * Math.sin(p * 9.4);
      if (wide) return { cx: 0.2 * W, cy: 0.045 * H, rad: 0.33 * H, az, el: 12, exp: 1, bp: 0, neb: 1, star: 1, yaw: 0.6 + p * 0.8, flare: 0, zoom: 1 };
      const sp = M.wSpace || { cy: H * 0.3, h: H * 0.3 };
      return { cx: 0, cy: H / 2 - sp.cy, rad: Math.min(0.36 * W, sp.h * 0.47), az, el: 12, exp: 1, bp: 0, neb: 1, star: 1, yaw: 0.6 + p * 0.8, flare: 0, zoom: 1 };
    },
    workshop(p, W, H, wide) {
      if (wide) {
        const sg = M.stage || { left: W * 0.04, width: W * 0.55 };
        return { cx: sg.left + sg.width * 0.665 - W / 2, cy: 0.02 * H, rad: Math.min(0.275 * H, sg.width * 0.29), az: st.sunAz, el: 12, exp: 1, bp: 0, neb: 1, star: 1, yaw: 1.5, flare: 0, zoom: 1 };
      }
      const top = 64, hh = 0.44 * H;
      return { cx: 0.1 * W, cy: H / 2 - (top + (hh - top) * 0.6), rad: Math.min(0.3 * W, (hh - top) * 0.37), az: st.sunAz, el: 12, exp: 1, bp: 0, neb: 1, star: 1, yaw: 1.5, flare: 0, zoom: 1 };
    },
    process(p, W, H, wide) {
      if (wide) {
        // чертёж стоит справа от списка этапов: если места мало, планета ужимается
        // и уезжает за правый край, но на текст не наезжает
        const left = (M.stepsRight || 0.62 * W) + 0.03 * W;
        const rad = Math.min(0.46 * H, Math.max(0.75 * (W - left), 0.2 * H));
        return { cx: Math.max(0.275 * W, left + rad - W / 2), cy: -0.02 * H, rad, az: 320, el: 10, exp: 0.95, bp: 1, neb: 0.55, star: 0.9, yaw: 1.8, flare: 0, zoom: 1 };
      }
      return { cx: 0.46 * W, cy: 0.36 * H, rad: 0.5 * W, az: 320, el: 10, exp: 0.4, bp: 1, neb: 0.5, star: 0.8, yaw: 1.8, flare: 0, zoom: 1 };
    },
    proof(p, W, H, wide) {
      if (wide) return { cx: 0.36 * W, cy: 0.27 * H, rad: 0.085 * H, az: 300, el: 16, exp: 1, bp: 0, neb: 1.3, star: 1.25, yaw: 2.2, flare: 0, zoom: 1 };
      return { cx: 0.26 * W, cy: 0.36 * H, rad: 0.11 * W, az: 300, el: 16, exp: 1, bp: 0, neb: 1.3, star: 1.25, yaw: 2.2, flare: 0, zoom: 1 };
    },
    pricing(p, W, H, wide) {
      const r = wide ? 1.5 * H : 1.1 * H;
      return { cx: 0, cy: -(r + 0.37 * H), rad: r, az: 180, el: Math.atan(r / FOCAL()) / RAD - 5.5, exp: 0.92, bp: 0, neb: 1, star: 1, yaw: 2.6, flare: 1, zoom: 0 };
    },
    faq(p, W, H, wide) {
      const r = wide ? 1.5 * H : 1.1 * H;
      return { cx: 0, cy: -(r + 0.33 * H), rad: r, az: 180, el: Math.atan(r / FOCAL()) / RAD - 3.8, exp: 0.95, bp: 0, neb: 1, star: 1, yaw: 2.8, flare: 1, zoom: 0 };
    },
    final(p, W, H, wide) {
      const r = wide ? 2.2 * H : 1.5 * H;
      const al = Math.atan(r / FOCAL()) / RAD;
      const k = D.smoothstep(0.02, 0.9, p);
      return { cx: 0, cy: -(r + 0.1 * H), rad: r, az: 180, el: al + D.lerp(-2.4, 1.15, k), exp: D.lerp(1.02, 0.74, k), bp: 0, neb: 1, star: 1, yaw: 3.1, flare: 1, zoom: 0 };
    },
  };
  const PKEYS = ['cx', 'cy', 'lr', 'az', 'el', 'exp', 'bp', 'neb', 'star', 'yaw', 'flare', 'zoom'];

  function targetPose(y) {
    const W = st.W, H = st.H;
    const acc = {};
    for (const k of PKEYS) acc[k] = 0;
    let tw = 0, best = 0, bestI = 0;
    for (let i = 0; i < secs.length; i++) {
      const s = secs[i];
      s.w = 0;
      const vis = Math.min(y + H, s.top + s.h) - Math.max(y, s.top);
      let w = D.sat(vis / Math.min(H, s.h));
      if (w <= 0) continue;
      if (w > best) { best = w; bestI = i; }
      w = w * w * (3 - 2 * w);
      const p = D.sat((y - s.top) / Math.max(1, s.h - H));
      s.p = p; s.w = w;
      const ps = s.pose(p, W, H, st.wide);
      ps.lr = Math.log(Math.max(ps.rad, 1));
      for (const k of PKEYS) acc[k] += ps[k] * w;
      tw += w;
    }
    if (tw <= 0) return null;
    for (const k of PKEYS) acc[k] /= tw;
    acc.sec = bestI;
    return acc;
  }

  /* =====================================================================
     ИЗМЕРЕНИЯ
     ===================================================================== */
  function measure() {
    st.W = window.innerWidth;
    st.H = window.innerHeight;
    st.wide = st.W > 860;
    // холст сверяем при каждом измерении: окно могло вырасти, пока шла загрузка
    // (вкладка открылась в фоне с нулевым размером), а событие resize мы пропустили
    if (R) R.resize(st.W, st.H);
    const sy = window.scrollY;
    for (const s of secs) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + sy;
      s.h = r.height;
    }
    const l1 = $('.hero__l1');
    if (l1) {
      const r1 = l1.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(l1).fontSize);
      M.heroApex = r1.bottom + sy - fs * (st.wide ? 0.25 : 0.17);
      const b = behind.find((x) => x.el === l1);
      if (b) { b.maxf = fs * 0.2; b.key = ''; }
    }
    const sg = $('#wsStage');
    if (sg) {
      const r = sg.getBoundingClientRect();
      M.stage = { left: r.left, width: r.width };
    }
    const steps = $('.steps');
    if (steps) M.stepsRight = steps.getBoundingClientRect().right;
    const sp = $('.worlds__space'), pin = $('.worlds__pin');
    if (sp && pin) {
      const a = sp.getBoundingClientRect(), b = pin.getBoundingClientRect();
      M.wSpace = { cy: a.top - b.top + a.height / 2, h: a.height };
    }
    D.scroll.measure();
    D.ui.measure();
  }

  function resize() {
    st.W = window.innerWidth;
    st.H = window.innerHeight;
    if (R) R.resize(st.W, st.H);
    measure();
    D.viz.resize();
  }

  /* =====================================================================
     КАТАЛОГ
     ===================================================================== */
  function buildCatalog() {
    const nav = $('#wNav');
    D.WORLDS.forEach((w, i) => {
      const b = document.createElement('button');
      b.className = 'wnav';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.innerHTML = '<i></i><span>' + w.num + '</span><b>' + w.name + '</b>';
      b.addEventListener('click', () => {
        const s = secs.find((x) => x.id === 'worlds');
        D.scroll.to(s.top + ((i + 0.28) / D.WORLDS.length) * (s.h - st.H));
      });
      nav.appendChild(b);
      cat.navs.push(b);
    });
    $('#wTake').addEventListener('click', () => {
      const w = D.WORLDS[Math.max(cat.idx, 0)];
      D.workshop.cfg.custom = false;
      D.workshop.setBase(w.id);
      D.audio.blip(1.3);
      const s = secs.find((x) => x.id === 'workshop');
      D.scroll.to(s.top);
      D.ui.toast('«' + w.name + '» — в мастерской. Дальше вы сами');
    });
  }

  // гигантское имя мира должно помещаться по ширине: длинные имена на узких экранах уменьшаем
  function fitGiant(layer) {
    const giant = els.giant;
    layer = layer || (giant && giant.lastElementChild);
    if (!layer) return;
    giant.style.fontSize = '';
    const base = parseFloat(getComputedStyle(giant).fontSize);
    const need = layer.getBoundingClientRect().width, avail = giant.clientWidth;
    if (avail > 0 && need > avail) giant.style.fontSize = Math.floor(base * avail / need) + 'px';
  }
  window.addEventListener('resize', () => fitGiant());

  function setCatalog(idx, instant) {
    if (idx === cat.idx) return;
    const first = cat.idx < 0;
    cat.idx = idx;
    const w = D.WORLDS[idx];
    // гигантское имя: старые буквы уезжают вверх, новые приезжают снизу
    const giant = els.giant;
    Array.from(giant.children).forEach((old) => {
      old.classList.remove('is-in');
      old.classList.add('is-out');
      setTimeout(() => old.remove(), 900);
    });
    const layer = document.createElement('span');
    layer.className = 'giant__layer';
    Array.from(w.name).forEach((ch, i) => {
      const o = document.createElement('span');
      o.className = 'gl';
      const inn = document.createElement('span');
      inn.className = 'gl__i';
      inn.style.setProperty('--i', i);
      inn.textContent = ch;
      o.appendChild(inn);
      layer.appendChild(o);
    });
    giant.appendChild(layer);
    fitGiant(layer);
    void layer.offsetWidth;
    layer.classList.add('is-in');

    const fill = () => {
      els.wTag.textContent = w.tag;
      els.wDesc.textContent = w.desc;
      els.wSpecs.innerHTML = w.specs.map((s) => '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>').join('');
      els.wPrice.textContent = w.price;
    };
    if (first || instant) fill();
    else {
      els.wInfo.classList.add('is-swap');
      clearTimeout(cat._t);
      cat._t = setTimeout(() => { fill(); els.wInfo.classList.remove('is-swap'); }, 300);
      D.audio.whoosh(0.05);
    }
    D.ui.scramble(els.wIdx, w.num, 0.4);
    cat.navs.forEach((b, i) => {
      b.classList.toggle('is-active', i === idx);
      b.setAttribute('aria-selected', String(i === idx));
    });
    D.audio.setMood(idx);
  }

  function updateCatalog(p) {
    const n = D.WORLDS.length;
    const seg = Math.min(p * n, n - 1e-4), i = Math.floor(seg), u = seg - i;
    const tr = i < n - 1 ? D.smoothstep(0.58, 1.0, u) : 0;
    D.lerpWorld(cat.world, D.WORLDS[i].p, D.WORLDS[Math.min(i + 1, n - 1)].p, D.ease.inOutCubic(tr));
    setCatalog(tr > 0.5 ? i + 1 : i);
    for (let j = 0; j < n; j++) {
      const v = j < i ? 1 : j === i ? (i === n - 1 ? u : D.sat(u / 0.58)) : 0;
      if (cat.navs[j]._p !== v) {
        cat.navs[j]._p = v;
        cat.navs[j].style.setProperty('--p', v.toFixed(3));
      }
    }
  }

  /* =====================================================================
     УКАЗАТЕЛЬ И ВРАЩЕНИЕ ПЛАНЕТЫ
     ===================================================================== */
  const INTERACTIVE = 'a,button,input,label,select,textarea,.panel,.reviews,dialog,.passport,.nav';
  function planetHit(x, y) {
    if (!R) return false;
    const pl = R.planet, dx = x - pl.x, dy = y - pl.y;
    return dx * dx + dy * dy < pl.r * pl.r;
  }
  function initPointer() {
    window.addEventListener('pointermove', (e) => {
      const m = st.mouse;
      m.x = e.clientX; m.y = e.clientY; m.target = e.target; m.seen = e.pointerType !== 'touch';
      const d = st.drag;
      if (d && e.pointerId === d.id && R) {
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.x = e.clientX; d.y = e.clientY;
        const k = 1 / Math.max(R.planet.r, 60);
        const ay = dx * k, ax = dy * k;
        st.userRot = m3.mul(m3.mul(m3.rotY(ay), m3.rotX(ax)), st.userRot);
        const now = performance.now(), dtm = Math.max((now - d.t) / 1000, 0.004);
        d.t = now;
        st.rotV[0] = D.lerp(st.rotV[0], ay / dtm, 0.4);
        st.rotV[1] = D.lerp(st.rotV[1], ax / dtm, 0.4);
        d.moved = true;
      }
    }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !st.running || !R) return;
      const t = e.target;
      if (t.closest && t.closest(INTERACTIVE)) return;
      if (e.pointerType === 'touch' && !(t.closest && t.closest('[data-stage]'))) return;
      if (!planetHit(e.clientX, e.clientY)) return;
      st.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      st.rotV = [0, 0];
      if (e.pointerType !== 'touch') e.preventDefault();
    });
    const up = (e) => {
      const d = st.drag;
      if (!d || (e && e.pointerId !== d.id)) return;
      if (performance.now() - d.t > 90) st.rotV = [0, 0];
      st.drag = null;
      st.userRot = m3.ortho(st.userRot);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', () => up());
  }

  /* =====================================================================
     ОБНОВЛЕНИЕ СОСТОЯНИЯ
     ===================================================================== */
  const behind = [];
  let accentKey = '', accentRGB = [124, 196, 255];

  function update(dt) {
    const y = D.scroll.y, H = st.H;
    const tp = targetPose(y);
    if (tp) {
      if (!st.pose) st.pose = Object.assign({}, tp);
      const p = st.pose;
      const k = 1 - Math.exp(-5.2 * dt);
      for (const key of PKEYS) p[key] += (tp[key] - p[key]) * k;
      p.rad = Math.exp(p.lr);
      if (tp.sec !== st.secIdx) setSection(tp.sec);
    }

    // какой мир показываем: каталог перекрывает «мир пользователя»
    const cs = secs.find((s) => s.id === 'worlds');
    let wc = 0;
    if (cs) {
      const vis = Math.min(y + H, cs.top + cs.h) - Math.max(y, cs.top);
      wc = D.smoothstep(0.25, 0.85, D.sat(vis / H));
      if (vis > 0) updateCatalog(D.sat((y - cs.top) / Math.max(1, cs.h - H)));
    }
    D.lerpWorld(st.worldT, st.user, cat.world, wc);
    D.dampWorld(st.world, st.worldT, 5, dt);
    D.audio.setMood(wc >= 0.5 ? Math.max(cat.idx, 0) : moodOfUser());

    // вращение
    st.spinAng += dt * 0.045 * st.world.spin;
    st.cloudAng += dt * 0.006;
    if (!st.drag) {
      const v = st.rotV;
      if (Math.abs(v[0]) + Math.abs(v[1]) > 1e-4) {
        st.userRot = m3.mul(m3.mul(m3.rotY(v[0] * dt), m3.rotX(v[1] * dt)), st.userRot);
        const f = Math.exp(-2.4 * dt);
        v[0] *= f; v[1] *= f;
      }
    }

    // мышь (сглаженная, −1…1)
    const m = st.mouse;
    const nx = m.seen ? (m.x / st.W) * 2 - 1 : 0, ny = m.seen ? 1 - (m.y / st.H) * 2 : 0;
    m.sx = D.damp(m.sx, nx, 3.5, dt);
    m.sy = D.damp(m.sy, ny, 3.5, dt);
    const over = m.target && m.target.closest && m.target.closest(INTERACTIVE);
    st.hoverPlanet = m.seen && !over && planetHit(m.x, m.y);

    // акцентный цвет интерфейса
    const a = st.world.accent;
    const r = Math.round(D.sat(a[0]) * 255), g = Math.round(D.sat(a[1]) * 255), b = Math.round(D.sat(a[2]) * 255);
    const key = r + ' ' + g + ' ' + b;
    if (key !== accentKey) {
      accentKey = key;
      accentRGB = [r, g, b];
      root.style.setProperty('--accent', 'rgb(' + r + ' ' + g + ' ' + b + ')');
      root.style.setProperty('--accent-rgb', key);
    }
  }

  function moodOfUser() {
    const i = D.WORLDS.findIndex((w) => w.id === D.workshop.cfg.base);
    return i < 0 ? 0 : i;
  }

  function setSection(i) {
    st.secIdx = i;
    const s = secs[i];
    if (els.hudIdx) {
      els.hudIdx.textContent = D.pad2(i);
      D.ui.scramble(els.hudName, s.title, 0.45);
    }
    $$('.nav__links a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === s.id));
  }

  /* =====================================================================
     КАДР
     ===================================================================== */
  function renderFrame(dt, over) {
    const p = over || st.pose;
    if (!R || !p) return;
    const w = st.world, m = st.mouse;
    const par = over ? 0 : 1;
    const rad = p.rad * D.lerp(1, w.zoom, p.zoom);
    const az = (p.az + m.sx * 4 * par) * RAD, el = (p.el + m.sy * 2.5 * par) * RAD;
    const sunDir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    const base = m3.mul(st.userRot, m3.mul(m3.rotX(0.22), m3.rotZ(w.tilt)));
    const Rp = m3.mul(base, m3.rotY(st.spinAng));
    const sky = m3.mul(m3.rotX(0.32 + m.sy * 0.012 * par), m3.rotY(0.5 + st.time * 0.0035 + p.yaw * 0.32 + m.sx * 0.018 * par));
    const intro = over ? 1 : st.intro;
    const vel = Math.min(Math.abs(D.scroll.vel) / 3000, 1);
    R.render({
      time: st.time,
      cx: p.cx - m.sx * 9 * par,
      cy: p.cy + m.sy * 7 * par - (1 - intro) * st.H * 0.2,
      rad,
      sunDir, planetRot: Rp, skyRot: sky, world: w,
      exposure: p.exp * (0.25 + 0.75 * intro),
      bloom: 0.105,
      blueprint: p.bp,
      flash: over ? 0 : st.flash,
      fade: over ? 1 : st.fade,
      ca: 0.016 + vel * 0.07,
      grain: 0.05,
      vig: 0.55,
      nebI: 0.125 * p.neb,
      starI: p.star,
      cloudAng: st.cloudAng,
      cloudOff: [3.1, 7.7 + st.time * 0.004, 5.3],
      moons: D.moonPositions(w, st.time, base),
      flare: over ? 0 : p.flare,
    });
  }

  /** чистый кадр для открытки: планета по центру, без вспышек */
  function capture() {
    if (!R || !R.ready || !st.pose) return null;
    const S = Math.min(st.W, st.H);
    renderFrame(0, Object.assign({}, st.pose, { cx: 0, cy: S * 0.02, rad: S * 0.31, lr: 0, exp: 1, bp: 0, neb: 1.3, star: 1.3, zoom: 1, flare: 0, az: st.sunAz, el: 12 }));
    const c = document.createElement('canvas');
    c.width = R.canvas.width;
    c.height = R.canvas.height;
    c.getContext('2d').drawImage(R.canvas, 0, 0);
    return c;
  }

  function updateMasks() {
    if (!R) return;
    const pl = R.planet;
    for (const b of behind) {
      const r = b.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > st.H + 80) continue;
      const mx = pl.x - r.left, my = pl.y - r.top, mr = pl.r;
      const key = Math.round(mx * 2) + ',' + Math.round(my * 2) + ',' + Math.round(mr * 2);
      if (key === b.key) continue;
      b.key = key;
      const s = b.el.style;
      s.setProperty('--mx', mx.toFixed(1) + 'px');
      s.setProperty('--my', my.toFixed(1) + 'px');
      s.setProperty('--mr', Math.max(mr - 1, 0).toFixed(1) + 'px');
      s.setProperty('--mf', Math.max(1.5, Math.min(mr * b.feather, b.maxf || 1e9)).toFixed(1) + 'px');
    }
  }

  /* манифест: слова загораются по мере прокрутки */
  let words = [], wordsKey = -1;
  function updateManifesto() {
    const s = secs.find((x) => x.id === 'manifesto');
    if (!s || !(s.w > 0) || !words.length) return;
    const p = D.sat((s.p - 0.04) / 0.72);
    const key = Math.round(p * 400);
    if (key === wordsKey) return;
    wordsKey = key;
    const n = words.length;
    for (let i = 0; i < n; i++) {
      const o = D.sat(p * (n + 4) - i);
      words[i].style.opacity = (0.13 + 0.87 * o).toFixed(3);
    }
  }

  /* =====================================================================
     ПРОИЗВОДИТЕЛЬНОСТЬ: подстраиваем разрешение рендера под видеокарту
     ===================================================================== */
  const LEVELS = [1, 0.85, 0.72, 0.6, 0.5];
  const perf = { lvl: 0, ema: 16, bad: 0, good: 0, wait: 8, fpsT: 0, frames: 0 };
  function tickPerf(ms) {
    perf.frames++;
    perf.fpsT += ms;
    if (perf.fpsT >= 500) {
      if (els.hudFps) els.hudFps.textContent = Math.round((perf.frames * 1000) / perf.fpsT);
      perf.fpsT = 0;
      perf.frames = 0;
    }
    if (!R || ms > 120 || document.visibilityState !== 'visible' || st.time < 3) return;
    perf.ema += (ms - perf.ema) * 0.06;
    if (perf.ema > 21.5) {
      perf.bad += ms;
      perf.good = 0;
      if (perf.bad > 1400 && perf.lvl < LEVELS.length - 1) {
        perf.lvl++;
        perf.bad = 0;
        perf.wait = Math.min(perf.wait * 1.8, 90);
        applyLevel();
      }
    } else {
      perf.bad = Math.max(0, perf.bad - ms * 0.5);
      if (perf.ema < 15 && perf.lvl > 0) {
        perf.good += ms;
        if (perf.good > perf.wait * 1000) {
          perf.lvl--;
          perf.good = 0;
          applyLevel();
        }
      }
    }
  }
  function applyLevel() {
    R.setScale(LEVELS[perf.lvl]);
    if (els.hudRes) els.hudRes.textContent = Math.round(LEVELS[perf.lvl] * 100);
    perf.ema = 16;
  }

  /* =====================================================================
     ГЛАВНЫЙ ЦИКЛ
     ===================================================================== */
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = last ? now - last : 16.7;
    last = now;
    const dt = Math.min(raw / 1000, 0.05);
    st.time += dt;
    D.tickTweens(now);
    D.scroll.update(dt);
    update(dt);
    renderFrame(dt);
    updateMasks();
    updateManifesto();
    D.ui.tickCursor(dt, st.hoverPlanet, !!st.drag);
    D.ui.tickMarquee(dt, D.scroll.vel);
    D.ui.tickReviews(dt);
    D.viz.tick(dt, accentRGB);
    // шапка: прячется при прокрутке вниз, возвращается при прокрутке вверх
    const y = D.scroll.y, v = D.scroll.vel;
    els.nav.classList.toggle('is-scrolled', y > 40);
    if (y > st.H * 0.6 && v > 260) els.nav.classList.add('is-hidden');
    else if (v < -120 || y < st.H * 0.4) els.nav.classList.remove('is-hidden');
    if (els.hudRail) els.hudRail.style.setProperty('--p', (D.scroll.max > 0 ? y / D.scroll.max : 0).toFixed(4));
    tickPerf(raw);
  }

  /* =====================================================================
     ВСТУПЛЕНИЕ
     ===================================================================== */
  const STAGE = {
    noise: 'Сжимаем газопылевое облако',
    shaders: 'Зажигаем звезду',
    sky: 'Раскручиваем протопланетный диск',
    stars: 'Расставляем звёзды',
    done: 'Да будет свет',
  };

  function intro() {
    st.flash = 1;
    st.fade = 1;
    st.intro = 0;
    D.tween({ from: 1, to: 0, dur: 2.4, ease: 'outCubic', update: (v) => (st.flash = v) });
    D.tween({ from: 0, to: 1, dur: 3.4, ease: 'outQuart', update: (v) => (st.intro = v) });
    setTimeout(() => $('.hero').classList.add('is-in'), 260);
    setTimeout(() => {
      root.classList.remove('is-intro');
      if (els.hud) els.hud.classList.add('is-on');
    }, 1300);
  }

  function bigBang() {
    D.audio.boom();
    D.tween({
      from: st.flash, to: 1, dur: 0.55, ease: 'inCubic',
      update: (v) => (st.flash = v),
      done: () => {
        const hero = $('.hero');
        hero.classList.add('no-anim');
        hero.classList.remove('is-in');
        void hero.offsetWidth;
        hero.classList.remove('no-anim');
        D.scroll.jump(0);
        st.pose = null;
        st.userRot = m3.ident();
        root.classList.add('is-intro');
        if (els.hud) els.hud.classList.remove('is-on');
        intro();
      },
    });
  }

  async function boot() {
    root.classList.add('is-loading', 'is-intro');
    els.nav = $('#nav'); els.hud = $('#hud'); els.hudIdx = $('#hudIdx'); els.hudName = $('#hudName');
    els.hudRail = $('#hudRail'); els.hudFps = $('#hudFps'); els.hudRes = $('#hudRes');
    els.giant = $('#wGiant'); els.wTag = $('#wTag'); els.wDesc = $('#wDesc'); els.wSpecs = $('#wSpecs');
    els.wPrice = $('#wPrice'); els.wInfo = $('#wInfo'); els.wIdx = $('#wIdx');
    const loader = $('#loader'), lNum = $('#loaderNum'), lBar = $('#loaderBar'), lStatus = $('#loaderStatus');

    D.ui.prep();
    words = D.ui.splitWords($('#manifestoText'));
    $$('[data-sec]').forEach((el) => {
      const id = el.dataset.sec;
      secs.push({ id, el, title: el.dataset.title || id, top: 0, h: 1, pose: POSE[id], p: 0, w: 0 });
    });
    $$('.behind').forEach((el) => behind.push({ el, feather: +(el.dataset.feather || 0.004), key: '' }));
    D.scroll.init();
    buildCatalog();
    D.workshop.init();
    setCatalog(0, true);

    // прогресс прелоадера считается по времени — не зависит от частоты кадров
    let prog = 0, shown = 0, stage = 'noise', tPrev = performance.now(), alive = true;
    const tickLoader = () => {
      if (!alive) return;
      const now = performance.now(), d = Math.min((now - tPrev) / 1000, 0.1);
      tPrev = now;
      shown = Math.min(prog * 100, shown + Math.max((prog * 100 - shown) * 6 * d, 28 * d));
      const v = Math.floor(shown);
      if (lNum.textContent !== String(v)) lNum.textContent = v;
      lNum.parentNode.style.setProperty('--w', Math.round(200 + shown * 7));
      lBar.style.setProperty('--p', (shown / 100).toFixed(3));
      const txt = STAGE[stage] || STAGE.noise;
      if (lStatus.textContent !== txt) lStatus.textContent = txt;
    };
    const timer = setInterval(tickLoader, 33);

    const canvas = $('#cosmos');
    let ok = true;
    try {
      R = new D.Renderer(canvas);
      R.resize(st.W, st.H);
      await R.init((p, s) => { prog = p * 0.92; stage = s; });
      D.renderer = R;
    } catch (e) {
      console.warn('[ДЕМИУРГ] WebGL недоступен, включён упрощённый режим:', e && e.message);
      R = null;
      ok = false;
      root.classList.add('no-gl');
    }
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, D.wait(2.5)]);
    fitGiant();
    D.viz.init();
    D.ui.initAll();
    initPointer();
    measure();
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) {
      let t = 0;
      new ResizeObserver(() => { clearTimeout(t); t = setTimeout(measure, 120); }).observe(document.body);
    }

    st.running = true;
    st.fade = 0;
    requestAnimationFrame(frame);

    prog = 1;
    stage = 'done';
    const t0 = performance.now();
    while (shown < 99.4 && performance.now() - t0 < 4000) await D.wait(0.05);
    await D.wait(0.25);
    loader.classList.add('is-done');
    await D.wait(0.5);
    if (ok) {
      loader.classList.add('is-flash');
      await D.wait(0.44);
    }
    alive = false;
    clearInterval(timer);
    loader.classList.add('is-gone');
    root.classList.remove('is-loading');
    measure();
    if (ok) intro();
    else {
      st.intro = 1;
      $('.hero').classList.add('is-in');
      root.classList.remove('is-intro');
    }
  }

  /* =====================================================================
     ПРОЧЕЕ
     ===================================================================== */
  function initMisc() {
    // звук
    const sb = $('#soundBtn');
    sb.addEventListener('click', () => {
      const on = D.audio.toggle();
      sb.classList.toggle('is-on', on);
      sb.setAttribute('aria-pressed', String(on));
      if (on) {
        D.audio.setMood(st.secIdx >= 0 && secs[st.secIdx].id === 'worlds' ? Math.max(cat.idx, 0) : moodOfUser());
        D.ui.toast('Звук включён. Музыку прямо сейчас сочиняет ваш браузер', 3400);
      }
    });
    // лёгкие щелчки при наведении
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('a,button');
      if (t && t !== initMisc._h) { initMisc._h = t; D.audio.blip(1.6); }
      else if (!t) initMisc._h = null;
    });
    // счётчик миров в шапке первого экрана
    const wc = $('#worldCount');
    let count = 200000000412;
    setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      count += 1 + ((Math.random() * 3) | 0);
      wc.textContent = D.fmtInt(count);
    }, 1700);
    // тарифы → форма
    $$('[data-plan]').forEach((a) => a.addEventListener('click', () => D.ui.toast('Тариф «' + a.dataset.plan + '» — отличный выбор')));
    // заказ
    const form = $('#orderForm'), dlg = $('#doneDialog');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#orderWorld').value.trim(), contact = $('#orderContact').value.trim();
      if (!name || !contact) {
        form.classList.remove('is-error');
        void form.offsetWidth;
        form.classList.add('is-error');
        D.ui.toast(!name ? 'Миру нужно имя' : 'Оставьте способ связи — хоть радиосигнал');
        (name ? $('#orderContact') : $('#orderWorld')).focus();
        return;
      }
      form.classList.remove('is-error');
      $('#doneName').textContent = '«' + name + '»';
      $('#doneNo').textContent = String(D.hashStr(name + contact) % 1000000000).padStart(9, '0').replace(/(\d{3})(?=\d)/g, '$1 ');
      $('#doneText').textContent = 'Ориентировочная готовность — ' + (2026 + 4500000000).toLocaleString('ru-RU') + ' год. Мы сообщим, когда остынет кора.';
      D.tween({ from: 0.5, to: 0, dur: 1.6, ease: 'outCubic', update: (v) => (st.flash = v) });
      D.audio.boom();
      if (dlg.showModal) {
        dlg.showModal();
        D.scroll.locked = true;
      } else D.ui.toast('Заявка принята. Ждите 4,5 млрд лет');
    });
    form.addEventListener('input', () => form.classList.remove('is-error'));
    dlg.addEventListener('close', () => { D.scroll.locked = false; });
    $('#doneClose').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('#bangBtn').addEventListener('click', bigBang);
  }

  /** отладка: прокрутить к позиции и «домотать» сглаживание без ожидания кадров */
  function warp(y, n) {
    if (typeof y === 'number') D.scroll.jump(y);
    D.tickTweens(performance.now() + 1e7);
    D.tickTweens(performance.now() + 2e7);
    for (let i = 0; i < (n || 90); i++) {
      st.time += 0.05;
      D.scroll.update(0.05);
      update(0.05);
    }
    renderFrame(0.05);
    updateMasks();
    updateManifesto();
    return { y: D.scroll.y, sec: st.secIdx, max: D.scroll.max };
  }

  D.main = { measure, capture, bigBang, warp, secs };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { initMisc(); boot(); });
  else { initMisc(); boot(); }
})();
