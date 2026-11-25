/* ДЕМИУРГ — audio.js: генеративный саундтрек на Web Audio.
   Ни одного файла: пад из расстроенных осцилляторов, «ветер» из шума,
   редкие колокольчики и реверберация из синтезированного импульса.
   У каждого мира своя тональность. По умолчанию звук выключен. */
(function () {
  'use strict';
  const D = window.DMG;
  const A = (D.audio = { on: false, ctx: null, mood: -1 });

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MOODS = [
    { root: 45, chord: [0, 7, 14, 16], cut: 640, scale: [0, 2, 4, 7, 9, 11, 14] },   // Терра — тёплый мажор
    { root: 40, chord: [0, 7, 10, 15], cut: 380, scale: [0, 3, 5, 7, 10, 12, 15] },  // Игнис — низкий минор
    { root: 48, chord: [0, 7, 14, 19], cut: 920, scale: [0, 2, 7, 9, 14, 16, 19] },  // Криос — пустые квинты
    { root: 43, chord: [0, 7, 10, 17], cut: 520, scale: [0, 2, 3, 7, 9, 10, 14] },   // Охра — дорийский
    { root: 38, chord: [0, 7, 12, 16], cut: 430, scale: [0, 4, 7, 11, 12, 16, 19] }, // Голиаф — глубокий мажор
    { root: 46, chord: [0, 6, 11, 16], cut: 780, scale: [0, 2, 4, 6, 7, 9, 11] },    // Флора — лидийский
  ];

  function impulse(ctx, sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        lp += (Math.random() * 2 - 1 - lp) * (0.5 - 0.42 * t);      // хвост темнеет со временем
        d[i] = lp * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }
  function noiseBuf(ctx, sec) {
    const n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  A._build = function () {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    const master = (A.master = ctx.createGain());
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    master.connect(comp);
    comp.connect(ctx.destination);

    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 4.6, 2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.62;
    conv.connect(wet);
    wet.connect(master);
    const dry = ctx.createGain();
    dry.gain.value = 0.5;
    dry.connect(master);
    const bus = (A.bus = ctx.createGain());
    bus.connect(dry);
    bus.connect(conv);

    // пад
    const filt = (A.filt = ctx.createBiquadFilter());
    filt.type = 'lowpass'; filt.frequency.value = 520; filt.Q.value = 0.7;
    filt.connect(bus);
    A.voices = [];
    const lev = [0.05, 0.04, 0.03, 0.024];
    for (let i = 0; i < 4; i++) {
      const g = ctx.createGain();
      g.gain.value = lev[i];
      g.connect(filt);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'triangle';
      o1.detune.value = -7; o2.detune.value = 6 + i * 2;
      o1.connect(g); o2.connect(g);
      o1.start(); o2.start();
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.045 + i * 0.027;
      lg.gain.value = lev[i] * 0.45;
      lfo.connect(lg); lg.connect(g.gain);
      lfo.start();
      A.voices.push({ o1, o2 });
    }
    const fl = ctx.createOscillator(), fg = ctx.createGain();
    fl.frequency.value = 0.06; fg.gain.value = 170;
    fl.connect(fg); fg.connect(filt.frequency);
    fl.start();

    // «ветер»
    A.noise = noiseBuf(ctx, 3);
    const ns = ctx.createBufferSource();
    ns.buffer = A.noise; ns.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 520; nf.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.value = 0.013;
    ns.connect(nf); nf.connect(ng); ng.connect(bus);
    ns.start();
    const nl = ctx.createOscillator(), nlg = ctx.createGain();
    nl.frequency.value = 0.04; nlg.gain.value = 280;
    nl.connect(nlg); nlg.connect(nf.frequency);
    nl.start();

    const m = A.mood < 0 ? 0 : A.mood;
    A.mood = -1;
    A.setMood(m, true);
    A._bells();
  };

  A.toggle = function () {
    if (!A.ctx) A._build();
    if (!A.ctx) return false;
    A.on = !A.on;
    const t = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    clearTimeout(A._sleep);
    if (A.on) {
      A.ctx.resume();
      A.master.gain.setTargetAtTime(0.9, t, 0.9);
    } else {
      A.master.gain.setTargetAtTime(0, t, 0.2);
      // звук затух — усыпляем граф, чтобы осцилляторы не грели процессор впустую
      A._sleep = setTimeout(() => { if (!A.on && A.ctx.state === 'running') A.ctx.suspend(); }, 1500);
    }
    return A.on;
  };

  /** сменить тональность под мир */
  A.setMood = function (i, instant) {
    i = ((i % MOODS.length) + MOODS.length) % MOODS.length;
    if (i === A.mood) return;
    A.mood = i;
    if (!A.ctx) return;
    const m = MOODS[i], t = A.ctx.currentTime, tc = instant ? 0.01 : 1.4;
    A.voices.forEach((v, k) => {
      const f = mtof(m.root + m.chord[k]);
      v.o1.frequency.setTargetAtTime(f, t, tc);
      v.o2.frequency.setTargetAtTime(f * (k > 1 ? 2 : 1), t, tc);
    });
    A.filt.frequency.setTargetAtTime(m.cut, t, instant ? 0.01 : 2);
  };

  A._bells = function () {
    const next = () => {
      setTimeout(() => {
        if (A.on && A.ctx && document.visibilityState === 'visible') {
          const m = MOODS[A.mood < 0 ? 0 : A.mood];
          const note = m.root + 24 + m.scale[(Math.random() * m.scale.length) | 0] + (Math.random() < 0.25 ? 12 : 0);
          A._bell(mtof(note), 0.035 + Math.random() * 0.03, Math.random() * 1.6 - 0.8);
          if (Math.random() < 0.3) setTimeout(() => A.on && A._bell(mtof(note + 7), 0.025, Math.random() * 1.6 - 0.8), 260 + Math.random() * 300);
        }
        next();
      }, 2200 + Math.random() * 4200);
    };
    next();
  };
  A._bell = function (f, vol, pan) {
    const ctx = A.ctx, t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 2.76;
    g2.gain.value = 0.22;
    o.connect(g); o2.connect(g2); g2.connect(g);
    let out = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    out.connect(A.bus);
    o.start(t); o2.start(t);
    o.stop(t + 3.4); o2.stop(t + 3.4);
  };

  /* ---------- звуки интерфейса ---------- */
  A.blip = function (pitch) {
    if (!A.on) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(660 * (pitch || 1), t);
    o.frequency.exponentialRampToValueAtTime(440 * (pitch || 1), t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(A.bus);
    o.start(t); o.stop(t + 0.2);
  };
  let lastTick = 0;
  /** ползунки «играют»: высота ноты зависит от значения */
  A.tick = function (v) {
    if (!A.on) return;
    const now = performance.now();
    if (now - lastTick < 45) return;
    lastTick = now;
    const ctx = A.ctx, t = ctx.currentTime;
    const m = MOODS[A.mood < 0 ? 0 : A.mood];
    const note = m.root + 24 + m.scale[Math.min(m.scale.length - 1, Math.floor(D.sat(v) * m.scale.length))];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = mtof(note);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(A.bus);
    o.start(t); o.stop(t + 0.25);
  };
  A.whoosh = function (vol) {
    if (!A.on) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = A.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.55);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.07, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    s.connect(f); f.connect(g); g.connect(A.bus);
    s.start(t); s.stop(t + 0.9);
  };
  A.boom = function () {
    if (!A.on) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 1.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g); g.connect(A.bus);
    o.start(t); o.stop(t + 2.5);
    A.whoosh(0.16);
  };
})();
