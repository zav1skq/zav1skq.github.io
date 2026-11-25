/* ДЕМИУРГ — workshop.js: мастерская миров.
   Ползунки → параметры планеты. Любой мир каталога можно взять за основу,
   заморозить, раскалить, перекрасить небо и жизнь, надеть кольца.
   Имя мира — это зерно: каждое имя даёт свои континенты. */
(function () {
  'use strict';
  const D = window.DMG, $ = D.$;
  const WS = (D.workshop = {});

  const SEA_MIN = -0.42, SEA_MAX = 0.4;
  const BASE_T = { terra: 15, ignis: 1200, krios: -180, ohra: 42, goliaf: -140, flora: 24 };
  const DEFAULT_NAME = 'Терра Нова';

  const cfg = (WS.cfg = {
    base: 'terra', name: DEFAULT_NAME, custom: false,
    ocean: 0.585, temp: 0.5, cloud: 0.52, atmo: 0.5, hue: 0.5, relief: 0.5, life: 0.5, civ: 0.8, rings: 0, moons: 1, sun: 0.42,
  });

  const words = (v, arr) => arr[Math.min(arr.length - 1, Math.floor(D.sat(v) * arr.length))];
  const pct = (v) => Math.round(v * 100) + ' %';
  const deg = (v) => { const d = Math.round((v - 0.5) * 360); return (d > 0 ? '+' : '') + d + '°'; };
  const SL = [
    { k: 'ocean', name: 'Океан', fmt: pct, rock: true },
    { k: 'temp', name: 'Климат', fmt: (v) => words(v, ['ледник', 'холодно', 'как есть', 'жарко', 'пекло']), rock: true },
    { k: 'cloud', name: 'Облака', fmt: pct, rock: true },
    { k: 'atmo', name: 'Атмосфера', fmt: (v) => (v < 0.04 ? 'вакуум' : (v * 2).toFixed(1).replace('.', ',') + ' атм') },
    { k: 'hue', name: 'Цвет неба', fmt: deg },
    { k: 'relief', name: 'Рельеф', fmt: (v) => words(v, ['равнины', 'холмы', 'горы', 'хребты']), rock: true },
    { k: 'life', name: 'Цвет жизни', fmt: deg, rock: true },
    { k: 'civ', name: 'Цивилизация', fmt: (v) => (v < 0.05 ? 'нет' : words(v, ['хутора', 'города', 'мегаполисы'])), rock: true },
    { k: 'rings', name: 'Кольца', fmt: (v) => (v < 0.04 ? 'нет' : pct(v)) },
    { k: 'moons', name: 'Спутники', min: 0, max: 3, step: 1, fmt: (v) => String(Math.round(v)) },
    { k: 'sun', name: 'Звезда', fmt: (v) => words(v, ['позади слева', 'слева', 'в лицо', 'справа', 'позади справа']), wide: true },
  ];
  const norm = (s, v) => (v - (s.min || 0)) / ((s.max || 1) - (s.min || 0));

  /* ---------- климат ---------- */
  const mixc = (a, b, t) => { a[0] += (b[0] - a[0]) * t; a[1] += (b[1] - a[1]) * t; a[2] += (b[2] - a[2]) * t; };
  const scl = (a, k) => { a[0] *= k; a[1] *= k; a[2] *= k; };

  function freeze(w, k) {
    const K = D.worldById('krios').p;
    w.ice = D.lerp(w.ice, 1.06, k);
    mixc(w.colShallow, K.colShallow, k * 0.9); mixc(w.colDeep, K.colDeep, k * 0.9); mixc(w.colCrack, K.colCrack, k);
    w.oceanCrack = D.lerp(w.oceanCrack, 0.9, k); w.oceanSpec = D.lerp(w.oceanSpec, 0.45, k); w.oceanRough = D.lerp(w.oceanRough, 0.38, k);
    scl(w.oceanEmis, 1 - k); scl(w.landEmis, 1 - k); w.landCrack *= 1 - k;
    mixc(w.colA, K.colA, k * 0.8); mixc(w.colB, K.colB, k * 0.8); mixc(w.colC, K.colC, k * 0.6); mixc(w.colShore, K.colShore, k * 0.8);
    w.bio *= 1 - 0.8 * k;
    w.aurora = D.lerp(w.aurora, 1, k);
    mixc(w.colAurora, K.colAurora, k * 0.6);
  }
  function scorch(w, k) {
    const O = D.worldById('ohra').p, I = D.worldById('ignis').p;
    const a = D.sat(k * 2), b = D.sat(k * 2 - 1);
    w.ice *= 1 - a;
    w.sea += -0.42 * a + 0.38 * b;
    mixc(w.colA, O.colA, a * 0.85); mixc(w.colB, O.colB, a * 0.85); mixc(w.colC, O.colC, a * 0.7); mixc(w.colD, O.colD, a * 0.7);
    mixc(w.colShore, O.colShore, a * 0.85);
    mixc(w.colShallow, O.colShallow, a); mixc(w.colDeep, O.colDeep, a);
    mixc(w.colCloud, O.colCloud, a * 0.8);
    mixc(w.atmoCol, O.atmoCol, a * 0.8); mixc(w.mieCol, O.mieCol, a);
    w.mie = D.lerp(w.mie, O.mie, a);
    w.oceanSpec = D.lerp(w.oceanSpec, 0.06, a); w.oceanRough = D.lerp(w.oceanRough, 0.55, a);
    w.bio *= 1 - a; w.aurora *= 1 - 0.7 * a;
    if (b > 0) {
      for (const key of ['colDeep', 'colShallow', 'colCrack', 'colA', 'colB', 'colC', 'colD', 'colShore', 'colCloud', 'atmoCol', 'mieCol'])
        mixc(w[key], I[key], b);
      w.oceanEmis = [I.oceanEmis[0] * b, I.oceanEmis[1] * b, I.oceanEmis[2] * b];
      w.landEmis = [I.landEmis[0] * b, I.landEmis[1] * b, I.landEmis[2] * b];
      w.oceanCrack = D.lerp(w.oceanCrack, 1, b); w.landCrack = D.lerp(w.landCrack, 1, b);
      w.oceanSpec = D.lerp(w.oceanSpec, 0.12, b);
      w.bump = D.lerp(w.bump, w.bump * 1.25, b);
    }
  }

  /* ---------- сборка мира из настроек ---------- */
  WS.compose = function () {
    const B = D.worldById(cfg.base), base = B.p;
    const w = D.cloneWorld(base);
    const gas = base.gas > 0.5;
    const nameKey = (cfg.name || '').trim().toLowerCase() || 'безымянный';
    const h = D.hashStr(nameKey);

    if (cfg.custom) {
      const r = D.rng(h);
      w.seed = [base.seed[0] + r() * 60, base.seed[1] + r() * 60, base.seed[2] + r() * 60];
    }
    if (!gas) {
      w.sea = D.lerp(SEA_MIN, SEA_MAX, cfg.ocean);
      if (cfg.temp < 0.5) freeze(w, (0.5 - cfg.temp) * 2);
      else if (cfg.temp > 0.5) scorch(w, (cfg.temp - 0.5) * 2);
      w.mount = base.mount * D.lerp(0.15, 1.85, cfg.relief);
      w.bump = w.bump * D.lerp(0.45, 1.55, cfg.relief);
      w.cloud = cfg.cloud;
      const hot = D.sat((cfg.temp - 0.72) * 4), cold = D.sat((0.22 - cfg.temp) * 5);
      w.city = cfg.civ * 1.25 * (1 - hot) * (1 - cold);
      const la = (cfg.life - 0.5) * Math.PI * 2;
      if (Math.abs(la) > 0.01) {
        w.colA = D.hueRotate(w.colA, la);
        w.colB = D.hueRotate(w.colB, la * 0.7);
        w.colBio = D.hueRotate(w.colBio, la);
      }
    }
    w.atmoDen = cfg.atmo * 2;
    const ha = (cfg.hue - 0.5) * Math.PI * 2;
    if (Math.abs(ha) > 0.01) {
      const c = D.hueRotate(w.atmoCol, ha), mx = Math.max(c[0], c[1], c[2], 1e-3);
      w.atmoCol = [c[0] / mx, c[1] / mx, c[2] / mx];
    }
    w.ringA = cfg.rings * 0.95;
    w.moons = cfg.moons;

    // акцент интерфейса и туманности тянутся за климатом
    if (!gas && cfg.temp !== 0.5) {
      const K = D.worldById('krios').p, O = D.worldById('ohra').p, I = D.worldById('ignis').p;
      if (cfg.temp < 0.5) {
        const k = (0.5 - cfg.temp) * 1.7;
        mixc(w.accent, K.accent, k); mixc(w.nebA, K.nebA, k); mixc(w.nebB, K.nebB, k);
      } else {
        const a = D.sat((cfg.temp - 0.5) * 4) * 0.85, b = D.sat((cfg.temp - 0.5) * 4 - 1);
        mixc(w.accent, O.accent, a); mixc(w.nebA, O.nebA, a); mixc(w.nebB, O.nebB, a);
        mixc(w.accent, I.accent, b); mixc(w.nebA, I.nebA, b); mixc(w.nebB, I.nebB, b);
      }
    }

    D.lerpWorld(D.state.user, w, w, 0);
    D.state.sunAz = 205 + cfg.sun * 310;
    passport(w, gas, h);
    return w;
  };

  /* ---------- паспорт ---------- */
  function barcode(h) {
    const r = D.rng(h ^ 0x51ed);
    const parts = [];
    let x = 0;
    while (x < 104) {
      const a = 1 + ((r() * 3) | 0), b = 1 + ((r() * 3) | 0);
      parts.push('var(--fg) ' + x + 'px ' + (x + a) + 'px', 'transparent ' + (x + a) + 'px ' + (x + a + b) + 'px');
      x += a + b;
    }
    return 'linear-gradient(90deg,' + parts.join(',') + ')';
  }
  function passport(w, gas, h) {
    const r = D.rng(h ^ 0x9e3779b9);
    const t = cfg.temp, bt = BASE_T[cfg.base] === undefined ? 15 : BASE_T[cfg.base];
    const tC = gas ? bt : t < 0.5 ? D.lerp(bt, Math.min(bt, -195), Math.pow((0.5 - t) * 2, 1.3)) : D.lerp(bt, Math.max(bt, 1350), Math.pow((t - 0.5) * 2, 2.2));
    const cover = 1 / (1 + Math.exp((-1.702 * w.sea) / 0.108));
    const lava = w.oceanEmis[0] + w.oceanEmis[1] > 0.4;
    const frozen = w.ice > 0.85;
    const g = gas ? 1.9 + r() * 1.1 : 0.42 + r() * 1.25;
    const day = Math.round(8 + r() * 54);
    let surf, cls, hab;
    if (gas) { surf = 'газ 100 %'; cls = 'Газовый гигант · класс J'; hab = 0; }
    else {
      surf = lava ? 'лава ' + pct(cover) : frozen ? 'лёд 100 %' : 'вода ' + pct(cover);
      const ts = Math.exp(-Math.pow((tC - 18) / 46, 2));
      const wsr = lava ? 0 : D.smoothstep(0.02, 0.3, cover) * (1 - 0.45 * D.smoothstep(0.9, 1, cover));
      const as = Math.exp(-Math.pow((w.atmoDen - 1) / 0.75, 2));
      hab = Math.round(100 * ts * wsr * as);
      if (lava || tC > 600) cls = 'Вулканическая · класс Y';
      else if (tC < -60 || frozen) cls = 'Ледяная · класс P';
      else if (cover < 0.22) cls = 'Пустынная · класс H';
      else if (cover > 0.9) cls = 'Океаническая · класс O';
      else if (w.bio > 0.4) cls = 'Экзобиосфера · класс X';
      else cls = 'Землеподобная · класс M';
    }
    if (w.ringA > 0.3 && !gas) cls += ', с кольцами';
    const verdict = gas ? 'Любоваться издалека'
      : hab > 80 ? 'Рекомендуем к заселению'
      : hab > 45 ? 'Жить можно, но с оговорками'
      : hab > 10 ? 'Только для экстремалов'
      : 'Красиво. Но жить нельзя';
    const no = String(h % 1000000000).padStart(9, '0').replace(/(\d{3})(?=\d)/g, '$1 ');
    const info = (WS.info = {
      name: cfg.name.trim() || 'Безымянный', no, cls,
      g: g.toFixed(2).replace('.', ',') + ' g',
      day: day + ' ч',
      t: (tC > 0 ? '+' : tC < 0 ? '−' : '') + D.fmtInt(Math.abs(tC)) + ' °C',
      surf, hab: hab + ' %',
      eta: (3.2 + r() * 2.6).toFixed(1).replace('.', ',') + ' млрд лет',
      verdict,
    });
    const set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };
    set('#ppName', info.name); set('#ppNo', '№ ' + no); set('#ppClass', cls);
    set('#ppG', info.g); set('#ppDay', info.day); set('#ppT', info.t); set('#ppSea', surf);
    set('#ppHab', info.hab); set('#ppEta', info.eta); set('#ppVerdict', verdict);
    const bar = $('#ppBar');
    if (bar && bar._h !== h) { bar._h = h; bar.style.background = barcode(h); }
    const q = '«' + info.name + '»';
    set('#finName', q);
    const ow = $('#orderWorld');
    if (ow && document.activeElement !== ow && ow.value !== info.name) ow.value = info.name;
  }

  /* ---------- интерфейс ---------- */
  function syncUI() {
    const gas = D.worldById(cfg.base).p.gas > 0.5;
    for (const s of SL) {
      if (!s.inp) continue;
      if (document.activeElement !== s.inp || +s.inp.value !== cfg[s.k]) s.inp.value = cfg[s.k];
      s.inp.style.setProperty('--v', (norm(s, cfg[s.k]) * 100).toFixed(1) + '%');
      const txt = s.fmt(cfg[s.k]);
      if (s.val.textContent !== txt) s.val.textContent = txt;
      s.el.classList.toggle('is-off', !!(gas && s.rock));
    }
    D.$$('#wsBases button').forEach((b) => b.classList.toggle('is-active', b.dataset.base === cfg.base));
  }
  WS.sync = function () { syncUI(); WS.compose(); };

  /** взять мир каталога за основу */
  WS.setBase = function (id) {
    const p = D.worldById(id).p;
    cfg.base = id;
    cfg.ocean = D.sat((p.sea - SEA_MIN) / (SEA_MAX - SEA_MIN));
    cfg.temp = 0.5; cfg.cloud = p.cloud; cfg.atmo = D.sat(p.atmoDen / 2);
    cfg.hue = 0.5; cfg.relief = 0.5; cfg.life = 0.5;
    cfg.civ = D.sat(p.city / 1.25); cfg.rings = D.sat(p.ringA / 0.95); cfg.moons = Math.round(p.moons);
    if (!cfg.custom) {
      cfg.name = id === 'terra' ? DEFAULT_NAME : D.worldById(id).name;
      const inp = $('#wsName');
      if (inp) inp.value = cfg.name;
    }
    WS.sync();
  };

  const N1 = ['Ае', 'Ве', 'Зе', 'Ио', 'Ка', 'Ли', 'Ми', 'Но', 'Ор', 'Па', 'Ри', 'Са', 'Та', 'Эл', 'Ари', 'Тал', 'Кеп', 'Нов', 'Гел', 'Ат', 'Ум', 'Ир'];
  const N2 = ['ри', 'ла', 'но', 'ве', 'та', 'ми', 'ди', 'ра', 'ле', 'то', 'ги', 'зо', ''];
  const N3 = ['я', 'ус', 'ида', 'ея', 'он', 'ара', 'ис', 'ум', 'ия', 'ос', 'ель', 'ена'];
  const N4 = ['', '', '', ' Прайм', ' II', '-7', ' b', ' Минор', '-9'];
  WS.genName = function () {
    const p = (a) => a[(Math.random() * a.length) | 0];
    let n = p(N1) + p(N2) + p(N3) + p(N4);
    if (n.length > 16) n = n.slice(0, 16).trim();
    return n;
  };

  WS.random = function () {
    const r = Math.random;
    const ids = ['terra', 'terra', 'ohra', 'krios', 'flora', 'flora', 'ignis', 'goliaf'];
    const id = ids[(r() * ids.length) | 0];
    const from = Object.assign({}, cfg);
    cfg.custom = true;
    cfg.name = WS.genName();
    const inp = $('#wsName');
    if (inp) inp.value = cfg.name;
    WS.setBase(id);
    const gas = D.worldById(id).p.gas > 0.5;
    const to = {
      ocean: 0.12 + r() * 0.78,
      temp: D.sat(0.5 + (r() - 0.5) * (r() < 0.28 ? 0.95 : 0.3)),
      cloud: r() * 0.8, atmo: 0.14 + r() * 0.72, hue: r(), relief: r(), life: r(),
      civ: r() < 0.45 ? 0 : 0.3 + r() * 0.7,
      rings: gas ? 0.7 + r() * 0.3 : r() < 0.3 ? 0.4 + r() * 0.6 : 0,
      sun: cfg.sun,
    };
    cfg.moons = (r() * 4) | 0;
    const keys = Object.keys(to);
    if (WS._rt) WS._rt.stop();
    WS._rt = D.tween({
      dur: 1.2, ease: 'inOutCubic',
      update: (k) => { for (const key of keys) cfg[key] = D.lerp(from[key], to[key], k); WS.sync(); },
    });
    D.audio.whoosh(0.06);
  };

  WS.reset = function () {
    cfg.custom = false;
    cfg.sun = 0.42;
    WS.setBase('terra');
  };

  /* ---------- открытка ---------- */
  WS.postcard = function () {
    const src = D.main && D.main.capture ? D.main.capture() : null;
    if (!src) { D.ui.toast('Открытке нужен WebGL — а он не завёлся'); return; }
    const info = WS.info, W = 1200, H = 1500;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#04050a';
    g.fillRect(0, 0, W, H);
    const s = Math.min(src.width, src.height);
    g.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, W, W);
    const gr = g.createLinearGradient(0, W - 300, 0, W);
    gr.addColorStop(0, 'rgba(4,5,10,0)');
    gr.addColorStop(1, 'rgba(4,5,10,1)');
    g.fillStyle = gr;
    g.fillRect(0, W - 300, W, 300);
    g.strokeStyle = 'rgba(244,240,232,.22)';
    g.lineWidth = 2;
    g.strokeRect(36, 36, W - 72, H - 72);
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7cc4ff';
    const mono = (txt, x, y, color, align) => {
      g.font = '500 22px "JetBrains Mono", monospace';
      if ('letterSpacing' in g) g.letterSpacing = '3px';
      g.fillStyle = color; g.textAlign = align || 'left';
      g.fillText(txt.toUpperCase(), x, y);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    };
    g.textBaseline = 'alphabetic';
    mono('Демиург · ателье миров', 76, 96, 'rgba(244,240,232,.7)');
    mono('№ ' + info.no, W - 76, 96, 'rgba(244,240,232,.7)', 'right');
    let fs = 104;
    const name = info.name.toUpperCase();
    do { g.font = '800 ' + fs + 'px Unbounded, "Arial Black", sans-serif'; fs -= 4; } while (g.measureText(name).width > W - 152 && fs > 40);
    g.fillStyle = '#f4f0e8'; g.textAlign = 'left';
    g.fillText(name, 72, W + 30);
    mono(info.cls, 76, W + 78, acc);
    const rows = [['Гравитация', info.g], ['Сутки', info.day], ['Средняя t°', info.t], ['Поверхность', info.surf], ['Обитаемость', info.hab], ['Срок сборки', info.eta]];
    g.strokeStyle = 'rgba(244,240,232,.2)';
    g.lineWidth = 1;
    rows.forEach((row, i) => {
      const cx = 76 + (i % 3) * ((W - 152) / 3), cy = W + 138 + Math.floor(i / 3) * 96;
      g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx + (W - 152) / 3 - 24, cy - 26); g.stroke();
      mono(row[0], cx, cy + 4, 'rgba(244,240,232,.5)');
      g.font = '600 30px Manrope, "Segoe UI", sans-serif';
      g.fillStyle = '#f4f0e8';
      g.fillText(row[1], cx, cy + 44);
    });
    g.font = 'italic 400 40px "Cormorant Garamond", Georgia, serif';
    g.fillStyle = 'rgba(244,240,232,.8)'; g.textAlign = 'right';
    g.fillText('Привет с орбиты', W - 76, H - 78);
    mono(info.verdict, 76, H - 82, 'rgba(244,240,232,.5)');
    cv.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'demiurg-' + info.no.replace(/\s/g, '') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      D.ui.toast('Открытка «' + info.name + '» сохранена');
    }, 'image/png');
  };

  /* ---------- запуск ---------- */
  WS.init = function () {
    const box = $('#wsSliders');
    SL.forEach((s) => {
      const el = document.createElement('label');
      el.className = 'sl' + (s.wide ? ' sl--wide' : '');
      el.innerHTML =
        '<span class="sl__top"><span class="sl__name">' + s.name + '</span><span class="sl__val"></span></span>' +
        '<input type="range" min="' + (s.min || 0) + '" max="' + (s.max || 1) + '" step="' + (s.step || 0.001) + '" aria-label="' + s.name + '">';
      s.el = el; s.inp = el.querySelector('input'); s.val = el.querySelector('.sl__val');
      s.inp.value = cfg[s.k];
      s.inp.addEventListener('input', () => {
        if (WS._rt) { WS._rt.stop(); WS._rt = null; }
        cfg[s.k] = +s.inp.value;
        WS.sync();
        D.audio.tick(norm(s, cfg[s.k]));
      });
      box.appendChild(el);
    });
    const bb = $('#wsBases');
    D.WORLDS.forEach((w) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = w.name;
      b.dataset.base = w.id;
      b.addEventListener('click', () => { WS.setBase(w.id); D.audio.blip(1.1); });
      bb.appendChild(b);
    });
    const nameInp = $('#wsName'), orderInp = $('#orderWorld');
    const onName = (src) => {
      cfg.name = src.value.slice(0, 16);
      cfg.custom = true;
      if (src !== nameInp) nameInp.value = cfg.name;
      WS.compose();
    };
    nameInp.addEventListener('input', () => onName(nameInp));
    orderInp.addEventListener('input', () => onName(orderInp));
    $('#wsRandom').addEventListener('click', WS.random);
    $('#wsReset').addEventListener('click', () => { WS.reset(); D.audio.blip(0.8); });
    $('#wsShot').addEventListener('click', WS.postcard);
    WS.sync();
  };
})();
