/* ДЕМИУРГ — noise.js
   Периодический 3D-шум Перлина с аналитическим градиентом.
   Считается один раз на CPU и кладётся в 3D-текстуру RGBA16F:
   R — значение, GBA — градиент (на единицу решётки).
   В шейдере один texture-fetch даёт сразу высоту и уклон — отсюда скорость. */
(function () {
  'use strict';
  const D = (window.DMG = window.DMG || {});

  /**
   * @param {number} N        размер текстуры по стороне (вокселей)
   * @param {number} P        период в ячейках решётки
   * @param {(p:number)=>void} onProgress
   * @returns {Promise<Float32Array>} N³·4 значений
   */
  D.makeNoiseVolume = async function (N, P, onProgress) {
    const T = N / P;
    const rnd = D.rng(20261113);

    // таблица перестановок и случайные единичные градиенты
    const perm = new Uint8Array(512);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = base[i];
      base[i] = base[j];
      base[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const gx = new Float32Array(256), gy = new Float32Array(256), gz = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      gx[i] = r * Math.cos(a);
      gy[i] = r * Math.sin(a);
      gz[i] = z;
    }

    // по каждой оси всё одинаково — считаем заранее
    const I0 = new Int32Array(N), I1 = new Int32Array(N);
    const F = new Float32Array(N), U = new Float32Array(N), DU = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / T;
      const ix = Math.floor(x);
      const f = x - ix;
      I0[i] = ((ix % P) + P) % P;
      I1[i] = (I0[i] + 1) % P;
      F[i] = f;
      U[i] = f * f * f * (f * (f * 6 - 15) + 10);
      DU[i] = 30 * f * f * (f * (f - 2) + 1);
    }

    const data = new Float32Array(N * N * N * 4);
    let o = 0, sum2 = 0;
    let last = performance.now();

    for (let k = 0; k < N; k++) {
      const z0 = I0[k], z1 = I1[k], fz = F[k], w = U[k], dw = DU[k], fz1 = fz - 1;
      for (let j = 0; j < N; j++) {
        const y0 = I0[j], y1 = I1[j], fy = F[j], v = U[j], dv = DU[j], fy1 = fy - 1;
        for (let i = 0; i < N; i++) {
          const pA = perm[I0[i]], pB = perm[I1[i]];
          const fx = F[i], u = U[i], du = DU[i], fx1 = fx - 1;

          const hA = perm[perm[pA + y0] + z0], hB = perm[perm[pB + y0] + z0];
          const hC = perm[perm[pA + y1] + z0], hD = perm[perm[pB + y1] + z0];
          const hE = perm[perm[pA + y0] + z1], hF = perm[perm[pB + y0] + z1];
          const hG = perm[perm[pA + y1] + z1], hH = perm[perm[pB + y1] + z1];

          const a = gx[hA] * fx + gy[hA] * fy + gz[hA] * fz;
          const b = gx[hB] * fx1 + gy[hB] * fy + gz[hB] * fz;
          const c = gx[hC] * fx + gy[hC] * fy1 + gz[hC] * fz;
          const d = gx[hD] * fx1 + gy[hD] * fy1 + gz[hD] * fz;
          const e = gx[hE] * fx + gy[hE] * fy + gz[hE] * fz1;
          const f = gx[hF] * fx1 + gy[hF] * fy + gz[hF] * fz1;
          const g = gx[hG] * fx + gy[hG] * fy1 + gz[hG] * fz1;
          const h = gx[hH] * fx1 + gy[hH] * fy1 + gz[hH] * fz1;

          const k1 = b - a, k2 = c - a, k3 = e - a;
          const k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f;
          const k7 = -a + b + c - d + e - f - g + h;

          const uv = u * v, vw = v * w, wu = w * u, uvw = uv * w;
          const val = a + k1 * u + k2 * v + k3 * w + k4 * uv + k5 * vw + k6 * wu + k7 * uvw;

          // веса углов для интерполяции самих векторов градиента
          const wA = 1 - u - v - w + uv + vw + wu - uvw;
          const wB = u - uv - wu + uvw;
          const wC = v - uv - vw + uvw;
          const wD = uv - uvw;
          const wE = w - vw - wu + uvw;
          const wF = wu - uvw;
          const wG = vw - uvw;
          const wH = uvw;

          const dx =
            gx[hA] * wA + gx[hB] * wB + gx[hC] * wC + gx[hD] * wD + gx[hE] * wE + gx[hF] * wF + gx[hG] * wG + gx[hH] * wH +
            du * (k1 + k4 * v + k6 * w + k7 * vw);
          const dy =
            gy[hA] * wA + gy[hB] * wB + gy[hC] * wC + gy[hD] * wD + gy[hE] * wE + gy[hF] * wF + gy[hG] * wG + gy[hH] * wH +
            dv * (k2 + k5 * w + k4 * u + k7 * wu);
          const dz =
            gz[hA] * wA + gz[hB] * wB + gz[hC] * wC + gz[hD] * wD + gz[hE] * wE + gz[hF] * wF + gz[hG] * wG + gz[hH] * wH +
            dw * (k3 + k6 * u + k5 * v + k7 * uv);

          data[o] = val;
          data[o + 1] = dx;
          data[o + 2] = dy;
          data[o + 3] = dz;
          o += 4;
          sum2 += val * val;
        }
      }
      // отдаём управление браузеру, чтобы прелоадер не замирал
      if ((k & 7) === 7) {
        const now = performance.now();
        if (now - last > 24) {
          if (onProgress) onProgress((k + 1) / N);
          await new Promise((r) => setTimeout(r, 0));
          last = performance.now();
        }
      }
    }

    // нормируем: СКО значения = 0.3 (под это настроены все пороги в шейдере)
    const std = Math.sqrt(sum2 / (N * N * N));
    const s = 0.3 / (std || 1);
    for (let i = 0; i < data.length; i++) data[i] *= s;
    if (onProgress) onProgress(1);
    return data;
  };
})();
