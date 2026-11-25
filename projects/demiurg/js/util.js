/* ДЕМИУРГ — util.js: математика, твины, цвет, матрицы, мелкие помощники */
(function () {
  'use strict';
  const D = (window.DMG = window.DMG || {});

  /* ---------- числа ---------- */
  D.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  D.sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  D.lerp = (a, b, t) => a + (b - a) * t;
  D.smoothstep = (a, b, x) => {
    const t = D.sat((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  D.damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
  D.remap = (x, a, b, c, d) => c + (d - c) * D.sat((x - a) / (b - a));
  D.mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  /* ---------- кривые ---------- */
  D.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };

  /* ---------- твины (тикаются из главного цикла) ---------- */
  const tweens = new Set();
  D.tween = function (o) {
    const t = {
      from: o.from === undefined ? 0 : o.from,
      to: o.to === undefined ? 1 : o.to,
      dur: Math.max(o.dur === undefined ? 1 : o.dur, 0.0001) * 1000,
      delay: (o.delay || 0) * 1000,
      ease: typeof o.ease === 'function' ? o.ease : D.ease[o.ease || 'outCubic'],
      update: o.update || null,
      done: o.done || null,
      start: -1,
      dead: false,
      stop() {
        this.dead = true;
        tweens.delete(this);
      },
    };
    tweens.add(t);
    return t;
  };
  D.tickTweens = function (now) {
    tweens.forEach((t) => {
      if (t.dead) return;
      if (t.start < 0) t.start = now + t.delay;
      const k = D.sat((now - t.start) / t.dur);
      if (now < t.start) return;
      const e = t.ease(k);
      if (t.update) t.update(t.from + (t.to - t.from) * e, k);
      if (k >= 1) {
        t.dead = true;
        tweens.delete(t);
        if (t.done) t.done();
      }
    });
  };
  D.wait = (sec) => new Promise((r) => setTimeout(r, sec * 1000));

  /* ---------- цвет ---------- */
  D.srgb = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  D.toLin = toLin;
  /** hex → линейный RGB (с множителем яркости для HDR-свечения) */
  D.hex = (h, k) => {
    const c = D.srgb(h);
    const m = k === undefined ? 1 : k;
    return [toLin(c[0]) * m, toLin(c[1]) * m, toLin(c[2]) * m];
  };
  D.linToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  /** поворот оттенка линейного цвета вокруг серой оси */
  D.hueRotate = (c, ang) => {
    const cs = Math.cos(ang), sn = Math.sin(ang), k = 1 / 3, s3 = Math.sqrt(1 / 3);
    const m = [
      cs + (1 - cs) * k, k * (1 - cs) - s3 * sn, k * (1 - cs) + s3 * sn,
      k * (1 - cs) + s3 * sn, cs + k * (1 - cs), k * (1 - cs) - s3 * sn,
      k * (1 - cs) - s3 * sn, k * (1 - cs) + s3 * sn, cs + k * (1 - cs),
    ];
    return [
      Math.max(0, c[0] * m[0] + c[1] * m[1] + c[2] * m[2]),
      Math.max(0, c[0] * m[3] + c[1] * m[4] + c[2] * m[5]),
      Math.max(0, c[0] * m[6] + c[1] * m[7] + c[2] * m[8]),
    ];
  };

  /* ---------- случайность ---------- */
  D.hashStr = (s) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    return h >>> 0;
  };
  D.rng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- mat3, хранение по столбцам (как в GLSL) ---------- */
  const m3 = (D.m3 = {
    ident: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
    mul(a, b) {
      const o = new Array(9);
      for (let c = 0; c < 3; c++)
        for (let r = 0; r < 3; r++)
          o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
      return o;
    },
    transpose: (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
    axisAngle(ax, ang) {
      const l = Math.hypot(ax[0], ax[1], ax[2]) || 1;
      const x = ax[0] / l, y = ax[1] / l, z = ax[2] / l;
      const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
      return [
        c + x * x * t, y * x * t + z * s, z * x * t - y * s,
        x * y * t - z * s, c + y * y * t, z * y * t + x * s,
        x * z * t + y * s, y * z * t - x * s, c + z * z * t,
      ];
    },
    rotX: (a) => m3.axisAngle([1, 0, 0], a),
    rotY: (a) => m3.axisAngle([0, 1, 0], a),
    rotZ: (a) => m3.axisAngle([0, 0, 1], a),
    mulV: (m, v) => [
      m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
      m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
      m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
    ],
    /** возвращает ортонормированную копию (снимает накопленную погрешность) */
    ortho(m) {
      let x = [m[0], m[1], m[2]], y = [m[3], m[4], m[5]];
      const nx = Math.hypot(x[0], x[1], x[2]) || 1;
      x = [x[0] / nx, x[1] / nx, x[2] / nx];
      const d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
      y = [y[0] - d * x[0], y[1] - d * x[1], y[2] - d * x[2]];
      const ny = Math.hypot(y[0], y[1], y[2]) || 1;
      y = [y[0] / ny, y[1] / ny, y[2] / ny];
      const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
      return [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
    },
  });

  /* ---------- DOM ---------- */
  D.$ = (s, r) => (r || document).querySelector(s);
  D.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  D.on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);
  /** 1234567 → «1 234 567» (с тонкими неразрывными пробелами) */
  D.fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  D.pad2 = (n) => (n < 10 ? '0' + n : '' + n);
  D.isTouch = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;
  D.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
})();
