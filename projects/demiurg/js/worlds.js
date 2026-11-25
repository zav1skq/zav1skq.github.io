/* ДЕМИУРГ — worlds.js: параметры планет.
   Мир — это просто плоский набор чисел и цветов. Любые два мира можно
   плавно смешать — на этом построены каталог и мастерская. */
(function () {
  'use strict';
  const D = window.DMG, hex = D.hex, srgb = D.srgb;

  /* базовый мир: всё, что не переопределено в пресете, берётся отсюда */
  const BASE = {
    seed: [0, 0, 0], freq: 1.55, warp: 0.45, sea: 0.06, mount: 0.3, bump: 1.0,
    colDeep: hex('#04142e'), colShallow: hex('#0f5a7a'), colCrack: hex('#000000'),
    oceanSpec: 1.0, oceanRough: 0.22, oceanCrack: 0.0, oceanEmis: [0, 0, 0],
    colA: hex('#2f5a1f'), colB: hex('#8a7a45'), colC: hex('#6b5a48'), colD: hex('#f2f2f2'), colShore: hex('#c9b98a'),
    ice: 0.22, colIce: hex('#eef4fa'),
    landEmis: [0, 0, 0], landCrack: 0,
    cloud: 0.52, colCloud: hex('#ffffff'), cloudFreq: 2.4, cloudBand: 0.12,
    atmoCol: [0.18, 0.42, 1.0], atmoDen: 1.0, atmoH: 0.0155, mie: 0.5, mieCol: [1, 1, 1], mieG: 0.76,
    city: 1.0, colCity: hex('#ffc47a'),
    gas: 0, bandFreq: 7.5, gasTurb: 0.55, storm: 1,
    gasA: hex('#e8cfa8'), gasB: hex('#b9783f'), gasC: hex('#7a4526'), gasD: hex('#efe6d4'), gasSpot: hex('#a83a1c'),
    ringIn: 1.45, ringOut: 2.35, ringA: 0, ringCol: hex('#d9c2a0'),
    moons: 1, moonCol: hex('#b9b4ac'),
    bio: 0, colBio: hex('#4dffd2'),
    aurora: 0.42, colAurora: hex('#5dffa0'),
    tilt: 0.41, spin: 1.0, zoom: 1.0,
    nebA: hex('#3a5bd0'), nebB: hex('#b0508a'),
    sunCol: [1.0, 0.96, 0.9],
    accent: srgb('#7cc4ff'),
  };

  const mk = (o) => Object.assign({}, BASE, o);

  const WORLDS = [
    {
      id: 'terra', name: 'Терра', tag: 'Бестселлер', num: '01',
      desc: 'Океаны, континенты, облака и смена сезонов. Проверена временем и одной цивилизацией.',
      specs: [['Гравитация', '1,00 g'], ['Сутки', '24 ч'], ['Океаны', '71 %'], ['Спутники', '1']],
      price: 'от 5,97 × 10²⁴ кг',
      p: mk({}),
    },
    {
      id: 'ignis', name: 'Игнис', tag: 'Для смелых', num: '02',
      desc: 'Моря расплавленного базальта и закаты цвета магмы. Отопление включено в стоимость.',
      specs: [['Гравитация', '1,30 g'], ['Сутки', '9 ч'], ['Лава', '54 %'], ['Климат', '+1 200 °C']],
      price: 'от 7,2 × 10²⁴ кг',
      p: mk({
        seed: [13.1, 4.2, 7.7], freq: 1.9, warp: 0.7, sea: 0.02, mount: 0.55, bump: 1.3,
        colDeep: hex('#3a0d02'), colShallow: hex('#160805'), colCrack: hex('#ff8a2a'),
        oceanSpec: 0.12, oceanRough: 0.5, oceanCrack: 1.0, oceanEmis: hex('#ff4a0a', 2.4),
        colA: hex('#1d1715'), colB: hex('#2c221d'), colC: hex('#3b2d26'), colD: hex('#151110'), colShore: hex('#6a2a0c'),
        ice: 0, landEmis: hex('#ff6a14', 1.8), landCrack: 1.0,
        cloud: 0.26, colCloud: hex('#3a2e2a'), cloudFreq: 2.0, cloudBand: 0.0,
        atmoCol: [1.0, 0.42, 0.18], atmoDen: 0.75, atmoH: 0.022, mie: 2.0, mieCol: [1.0, 0.6, 0.4],
        city: 0, aurora: 0, moons: 2, moonCol: hex('#8a7468'),
        tilt: 0.2, spin: 0.8,
        nebA: hex('#d0402a'), nebB: hex('#6a2a90'), sunCol: [1.0, 0.86, 0.72], accent: srgb('#ff6a2b'),
      }),
    },
    {
      id: 'krios', name: 'Криос', tag: 'Тихая роскошь', num: '03',
      desc: 'Ледяной панцирь, подлёдный океан и абсолютная тишина. Идеален для интровертов.',
      specs: [['Гравитация', '0,80 g'], ['Сутки', '61 ч'], ['Лёд', '100 %'], ['Климат', '−180 °C']],
      price: 'от 3,1 × 10²⁴ кг',
      p: mk({
        seed: [5.5, 21.3, 2.2], freq: 1.5, warp: 0.5, sea: 0.12, mount: 0.25, bump: 0.8,
        colDeep: hex('#b5d6ea'), colShallow: hex('#e9f3f9'), colCrack: hex('#3b6f9c'),
        oceanSpec: 0.45, oceanRough: 0.38, oceanCrack: 0.9,
        colA: hex('#9fb6c6'), colB: hex('#c9d6de'), colC: hex('#7f93a3'), colD: hex('#ffffff'), colShore: hex('#b9cbd6'),
        ice: 0.62, colIce: hex('#f4fbff'),
        cloud: 0.14, cloudFreq: 2.6, cloudBand: 0.25,
        atmoCol: [0.3, 0.6, 1.0], atmoDen: 0.55, atmoH: 0.014, mie: 0.6,
        city: 0, aurora: 1.0, colAurora: hex('#7df5ff'), moons: 3, moonCol: hex('#c8d2da'),
        tilt: 0.5, spin: 0.5,
        nebA: hex('#2a6ad0'), nebB: hex('#3ab0c0'), sunCol: [0.92, 0.96, 1.0], accent: srgb('#a8f0ff'),
      }),
    },
    {
      id: 'ohra', name: 'Охра', tag: 'Минимализм', num: '04',
      desc: 'Дюны до горизонта, каньоны глубиной в десять километров и два заката в день.',
      specs: [['Гравитация', '0,60 g'], ['Сутки', '25 ч'], ['Вода', '0,3 %'], ['Бури', 'по расписанию']],
      price: 'от 0,64 × 10²⁴ кг',
      p: mk({
        seed: [31.0, 8.8, 14.4], freq: 1.7, warp: 0.9, sea: -0.3, mount: 0.3, bump: 0.8,
        colDeep: hex('#2e1c14'), colShallow: hex('#6a4630'),
        oceanSpec: 0.04, oceanRough: 0.6,
        colA: hex('#b8743a'), colB: hex('#d9a066'), colC: hex('#7a3a1e'), colD: hex('#e8c49a'), colShore: hex('#a8683a'),
        ice: 0.05, colIce: hex('#f6efe4'),
        cloud: 0.1, colCloud: hex('#ecd2ac'), cloudFreq: 1.8, cloudBand: 0.1,
        atmoCol: [1.0, 0.62, 0.34], atmoDen: 0.8, atmoH: 0.02, mie: 2.2, mieCol: [1.0, 0.8, 0.6],
        city: 0.22, colCity: hex('#ffd9a0'), aurora: 0, moons: 2, moonCol: hex('#a99278'),
        tilt: 0.44, spin: 0.9,
        nebA: hex('#c07a2a'), nebB: hex('#8a3a5a'), sunCol: [1.0, 0.94, 0.84], accent: srgb('#f2b866'),
      }),
    },
    {
      id: 'goliaf', name: 'Голиаф', tag: 'Флагман', num: '05',
      desc: 'Газовый гигант с кольцами и штормом, который старше вашей цивилизации. Занимает полнеба.',
      specs: [['Гравитация', '2,50 g'], ['Сутки', '10 ч'], ['Колец', '7'], ['Спутники', '79']],
      price: 'от 1,9 × 10²⁷ кг',
      p: mk({
        seed: [7.0, 3.0, 11.0], gas: 1, bandFreq: 7.5, gasTurb: 0.55, storm: 1,
        atmoCol: [0.55, 0.7, 1.0], atmoDen: 0.35, atmoH: 0.03, mie: 0.8,
        ringIn: 1.45, ringOut: 2.35, ringA: 0.92, ringCol: hex('#d9c2a0'),
        moons: 3, moonCol: hex('#b8a894'), cloud: 0, city: 0, ice: 0,
        aurora: 0.5, colAurora: hex('#ff9ad0'),
        tilt: 0.3, spin: 1.6, zoom: 0.6,
        nebA: hex('#c08a4a'), nebB: hex('#5a4ab0'), sunCol: [1.0, 0.97, 0.92], accent: srgb('#ffc38a'),
      }),
    },
    {
      id: 'flora', name: 'Флора', tag: 'Экспериментальная серия', num: '06',
      desc: 'Фиолетовые леса, бирюзовые моря и биосфера, которая светится в темноте. Возможны сюрпризы.',
      specs: [['Гравитация', '0,90 g'], ['Сутки', '31 ч'], ['Биомасса', 'да'], ['Разум', 'уточняется']],
      price: 'от 5,1 × 10²⁴ кг',
      p: mk({
        seed: [2.7, 17.9, 33.3], freq: 1.35, warp: 1.0, sea: 0.0, mount: 0.3, bump: 0.9,
        colDeep: hex('#052a33'), colShallow: hex('#17a39a'),
        colA: hex('#5a1f8a'), colB: hex('#b23a8f'), colC: hex('#3a2550'), colD: hex('#ffd6f2'), colShore: hex('#e7b6d9'),
        ice: 0.08, colIce: hex('#ffe9f7'),
        cloud: 0.45, colCloud: hex('#ffe1ef'), cloudFreq: 2.0, cloudBand: 0.0,
        atmoCol: [0.75, 0.3, 1.0], atmoDen: 1.1, atmoH: 0.02,
        bio: 1.0, colBio: hex('#4dffd2'), city: 0, aurora: 0.8, colAurora: hex('#ff7de9'),
        moons: 2, moonCol: hex('#c9a8d8'),
        tilt: 0.35, spin: 0.7,
        nebA: hex('#8a3ad0'), nebB: hex('#2ab0a0'), sunCol: [1.0, 0.93, 0.98], accent: srgb('#c98bff'),
      }),
    },
  ];

  const KEYS = Object.keys(BASE);

  D.WORLD_BASE = BASE;
  D.WORLDS = WORLDS;
  D.worldById = (id) => WORLDS.find((w) => w.id === id) || WORLDS[0];

  D.cloneWorld = (w) => {
    const o = {};
    for (const k of KEYS) o[k] = Array.isArray(w[k]) ? w[k].slice() : w[k];
    return o;
  };
  /** out = a + (b − a)·t по всем параметрам.
      out должен владеть своими массивами (см. cloneWorld) — пишем на месте. */
  D.lerpWorld = (out, a, b, t) => {
    for (const k of KEYS) {
      const x = a[k], y = b[k];
      if (Array.isArray(x)) {
        const o = out[k] || (out[k] = [0, 0, 0]);
        o[0] = x[0] + (y[0] - x[0]) * t;
        o[1] = x[1] + (y[1] - x[1]) * t;
        o[2] = x[2] + (y[2] - x[2]) * t;
      } else out[k] = x + (y - x) * t;
    }
    return out;
  };
  /** экспоненциальное сглаживание cur → target */
  D.dampWorld = (cur, target, lambda, dt) => D.lerpWorld(cur, cur, target, 1 - Math.exp(-lambda * dt));

  /* спутники: [большая полуось, размер, угловая скорость, наклон орбиты, фаза] */
  const MOON_DEFS = [
    [2.25, 0.085, 0.3, 0.1, 0.4],
    [3.15, 0.055, 0.19, -0.16, 2.3],
    [4.1, 0.04, 0.12, 0.22, 4.4],
  ];
  /** положения спутников в мировых координатах; base — ориентация экватора (без суточного вращения) */
  D.moonPositions = (world, time, base) => {
    const m3 = D.m3;
    return MOON_DEFS.map((d, i) => {
      const k = D.sat(world.moons - i);
      if (k <= 0) return [0, 0, 0, 0];
      const th = d[4] + time * d[2];
      let p = [d[0] * Math.cos(th), 0, d[0] * Math.sin(th)];
      p = m3.mulV(m3.rotX(d[3]), p);
      p = m3.mulV(base, p);
      return [p[0], p[1], p[2], d[1] * k];
    });
  };
})();
