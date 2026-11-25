/* ДЕМИУРГ — viz.js: четыре маленькие живые схемы для раздела «Процесс».
   Обычный Canvas 2D; рисуются только пока видны на экране. */
(function () {
  'use strict';
  const D = window.DMG;
  const V = (D.viz = { items: [] });
  const TAU = Math.PI * 2;
  const col = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const INIT = {}, DRAW = {};

  function fit(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    const w = Math.max(40, Math.round(r.width)), h = Math.max(40, Math.round(r.height));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ---------- 01: аккреция — пыль по спирали падает на растущий зародыш ---------- */
  INIT.accretion = function () {
    const rnd = D.rng(11), ps = [];
    for (let i = 0; i < 120; i++) ps.push({ r: 0.1 + rnd() * 0.36, a: rnd() * TAU, s: 0.6 + rnd() * 1.2, z: rnd() });
    return { ps, core: 0.045, pulse: 0, hold: 0 };
  };
  DRAW.accretion = function (it, dt, c) {
    const ctx = it.ctx, s = it.s, cx = it.w / 2, cy = it.h / 2, R = Math.min(it.w, it.h);
    const tilt = -0.35, ct = Math.cos(tilt), sn = Math.sin(tilt);
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const rr = R * (0.13 * i + 0.03);
      ctx.strokeStyle = col(c, 0.06 + 0.035 * i);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 0.42, tilt, 0, TAU);
      ctx.stroke();
    }
    for (const p of s.ps) {
      p.a += (dt * p.s * 0.9) / Math.pow(p.r * 3, 1.5);
      p.r -= dt * 0.013 * p.s;
      if (p.r < s.core + 0.015) {
        p.r = 0.42 + Math.random() * 0.06;
        p.a = Math.random() * TAU;
        s.core = Math.min(s.core + 0.0015, 0.125);
        s.pulse = 1;
      }
    }
    if (s.core >= 0.125) {
      s.hold += dt;
      if (s.hold > 3) { s.core = 0.045; s.hold = 0; }
    }
    s.pulse = Math.max(0, s.pulse - dt * 3);
    const dots = (front) => {
      for (const p of s.ps) {
        const sa = Math.sin(p.a);
        if (sa > 0 !== front) continue;
        const x0 = p.r * R * Math.cos(p.a), y0 = p.r * R * sa * 0.42;
        ctx.fillStyle = col(c, (0.25 + 0.75 * p.z) * (front ? 1 : 0.5));
        ctx.beginPath();
        ctx.arc(cx + x0 * ct - y0 * sn, cy + x0 * sn + y0 * ct, 0.6 + p.z * 1.2, 0, TAU);
        ctx.fill();
      }
    };
    dots(false);
    const cr = s.core * R * (1 + 0.07 * s.pulse);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 3.4);
    g.addColorStop(0, col(c, 0.6));
    g.addColorStop(0.32, col(c, 0.18));
    g.addColorStop(1, col(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f4f0e8';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TAU);
    ctx.fill();
    dots(true);
  };

  /* ---------- 02: ядро — тяжёлое тонет, лёгкое всплывает, включается магнитное поле ---------- */
  INIT.core = function () {
    const rnd = D.rng(5), ps = [];
    for (let i = 0; i < 28; i++) ps.push({ a: rnd() * TAU, r: 0.32 + rnd() * 0.6, heavy: i % 2 === 0, s: 0.5 + rnd() });
    return { ps };
  };
  DRAW.core = function (it, dt, c) {
    const ctx = it.ctx, s = it.s, t = it.t, cx = it.w / 2, cy = it.h / 2, R = Math.min(it.w, it.h) * 0.29;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = -t * 12;
    for (let i = 1; i <= 3; i++) {
      const rx = R * (0.5 + i * 0.3), ry = R * (0.72 + i * 0.3);
      ctx.strokeStyle = col(c, 0.3 - i * 0.065);
      ctx.beginPath();
      ctx.ellipse(cx - rx, cy, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx + rx, cy, rx, ry, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#07090f';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();
    const layers = [[1.0, 0.1], [0.8, 0.16], [0.52, 0.28]];
    for (const l of layers) {
      ctx.fillStyle = col(c, l[1]);
      ctx.beginPath();
      ctx.arc(cx, cy, R * l[0], 0, TAU);
      ctx.fill();
    }
    for (const p of s.ps) {
      p.r += dt * 0.12 * p.s * (p.heavy ? -1 : 1);
      if (p.heavy && p.r < 0.3) { p.r = 0.95; p.a = Math.random() * TAU; }
      if (!p.heavy && p.r > 0.97) { p.r = 0.34; p.a = Math.random() * TAU; }
      const x = cx + Math.cos(p.a) * p.r * R, y = cy + Math.sin(p.a) * p.r * R;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, TAU);
      if (p.heavy) { ctx.fillStyle = col(c, 0.95); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(244,240,232,.55)'; ctx.stroke(); }
    }
    const pulse = 1 + 0.06 * Math.sin(t * 3);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.32 * pulse);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, col(c, 1));
    g.addColorStop(1, col(c, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.3 * pulse, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col(c, 0.6);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
  };

  /* ---------- 03: вода и воздух — кометы наполняют океан ---------- */
  INIT.water = function () {
    return { level: 0.14, comets: [], rings: [], next: 0.2, drain: false };
  };
  DRAW.water = function (it, dt, c) {
    const ctx = it.ctx, s = it.s, t = it.t, w = it.w, h = it.h;
    const cx = w * 0.57, cy = h * 0.6, R = Math.min(w, h) * 0.27;
    s.next -= dt;
    if (s.next <= 0) {
      s.next = 0.22 + Math.random() * 0.5;
      const sx = Math.random() < 0.6 ? Math.random() * w * 0.5 : -6, sy = sx < 0 ? Math.random() * h * 0.5 : -6;
      const tx = cx + (Math.random() - 0.5) * R * 1.2, ty = cy + (Math.random() - 0.5) * R * 1.2;
      const d = Math.hypot(tx - sx, ty - sy) || 1, sp = 95 + Math.random() * 50;
      s.comets.push({ x: sx, y: sy, vx: ((tx - sx) / d) * sp, vy: ((ty - sy) / d) * sp });
    }
    if (s.drain) { s.level -= dt * 0.28; if (s.level < 0.14) s.drain = false; }
    else if (s.level > 0.84) s.drain = true;

    // атмосфера
    const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5);
    g.addColorStop(0, col(c, 0.1 + 0.3 * s.level));
    g.addColorStop(1, col(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.5, 0, TAU);
    ctx.fill();
    // планета и вода
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#07090f';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const yl = cy + R - s.level * 2 * R;
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = col(c, k ? 0.5 : 0.22);
      ctx.beginPath();
      ctx.moveTo(cx - R, cy + R);
      for (let x = -R; x <= R; x += 3) ctx.lineTo(cx + x, yl + Math.sin(x * 0.13 + t * (k ? 2.2 : -1.6) + k * 2) * (k ? 1.6 : 2.6) - (k ? 0 : 2));
      ctx.lineTo(cx + R, cy + R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = col(c, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    // кометы
    for (let i = s.comets.length - 1; i >= 0; i--) {
      const p = s.comets[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.hypot(p.x - cx, p.y - cy) < R) {
        s.rings.push({ x: p.x, y: p.y, r: 2, a: 1 });
        if (!s.drain) s.level += 0.03;
        s.comets.splice(i, 1);
        continue;
      }
      const lg = ctx.createLinearGradient(p.x - p.vx * 0.2, p.y - p.vy * 0.2, p.x, p.y);
      lg.addColorStop(0, 'rgba(244,240,232,0)');
      lg.addColorStop(1, 'rgba(244,240,232,.9)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.2, p.y - p.vy * 0.2);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const r = s.rings[i];
      r.r += dt * 26; r.a -= dt * 1.7;
      if (r.a <= 0) { s.rings.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(244,240,232,' + (r.a * 0.6).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
  };

  /* ---------- 04: жизнь — клеточный автомат Конвея в чашке Петри ---------- */
  INIT.life = function () {
    const n = 22, g = new Uint8Array(n * n), g2 = new Uint8Array(n * n), fade = new Float32Array(n * n);
    const seed = () => { for (let i = 0; i < n * n; i++) g[i] = Math.random() < 0.34 ? 1 : 0; };
    seed();
    return { n, g, g2, fade, seed, acc: 0, age: 0, pop: 0, same: 0 };
  };
  DRAW.life = function (it, dt, c) {
    const ctx = it.ctx, s = it.s, n = s.n, cx = it.w / 2, cy = it.h / 2, R = Math.min(it.w, it.h) * 0.42;
    const cell = (R * 2) / n;
    s.acc += dt; s.age += dt;
    if (s.acc > 0.17) {
      s.acc = 0;
      let pop = 0;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          let k = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              k += s.g[((y + dy + n) % n) * n + ((x + dx + n) % n)];
            }
          const alive = s.g[y * n + x];
          const v = alive ? (k === 2 || k === 3 ? 1 : 0) : k === 3 ? 1 : 0;
          s.g2[y * n + x] = v;
          pop += v;
        }
      const tmp = s.g; s.g = s.g2; s.g2 = tmp;
      s.same = pop === s.pop ? s.same + 1 : 0;
      s.pop = pop;
      if (pop < n * n * 0.05 || s.same > 14 || s.age > 22) {
        const g = s.g;
        for (let i = 0; i < n * n; i++) g[i] = Math.random() < 0.34 ? 1 : 0;
        s.age = 0; s.same = 0;
      }
    }
    const k = 1 - Math.exp(-12 * dt);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        s.fade[i] += (s.g[i] - s.fade[i]) * k;
        const f = s.fade[i];
        if (f < 0.03) continue;
        const px = cx - R + (x + 0.5) * cell, py = cy - R + (y + 0.5) * cell;
        const d = Math.hypot(px - cx, py - cy);
        if (d > R - cell * 0.4) continue;
        ctx.fillStyle = col(c, f * (0.35 + 0.65 * (1 - d / R)));
        const sz = cell * 0.74 * (0.55 + 0.45 * f);
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    ctx.strokeStyle = col(c, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
  };

  V.init = function () {
    const io = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          const it = V.items.find((i) => i.cv === e.target);
          if (it) it.visible = e.isIntersecting;
        }
      },
      { rootMargin: '8% 0px' }
    );
    D.$$('canvas[data-viz]').forEach((cv) => {
      const kind = cv.dataset.viz;
      if (!INIT[kind]) return;
      const it = Object.assign({ cv, kind, visible: false, t: 0 }, fit(cv));
      it.s = INIT[kind](it);
      V.items.push(it);
      io.observe(cv);
    });
  };
  V.resize = function () {
    V.items.forEach((it) => Object.assign(it, fit(it.cv)));
  };
  V.tick = function (dt, accent) {
    for (const it of V.items) {
      if (!it.visible) continue;
      it.t += dt;
      it.ctx.clearRect(0, 0, it.w, it.h);
      DRAW[it.kind](it, dt, accent);
    }
  };
})();
