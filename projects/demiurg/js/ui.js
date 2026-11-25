/* ДЕМИУРГ — ui.js: курсор, магнитные кнопки, разбиение текста на буквы,
   появление по скроллу, счётчики, бегущая строка, наклон карточек,
   аккордеон, лента отзывов, тосты. */
(function () {
  'use strict';
  const D = window.DMG, $ = D.$, $$ = D.$$;
  const UI = (D.ui = {});

  /* ---------- текст → слова → буквы ---------- */
  UI.split = function (el) {
    let idx = 0;
    const walk = (node) => {
      for (const k of Array.from(node.childNodes)) {
        if (k.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of k.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const w = document.createElement('span');
            w.className = 'wd';
            for (const ch of Array.from(part)) {
              const c = document.createElement('span');
              c.className = 'ch';
              const i = document.createElement('span');
              i.className = 'ch__i';
              i.style.setProperty('--i', idx++);
              i.textContent = ch;
              c.appendChild(i);
              w.appendChild(c);
            }
            frag.appendChild(w);
          }
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1) walk(k);
      }
    };
    walk(el);
    return idx;
  };

  /** только слова (для манифеста) — возвращает список элементов-слов по порядку */
  UI.splitWords = function (el) {
    const out = [];
    const walk = (node) => {
      for (const k of Array.from(node.childNodes)) {
        if (k.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of k.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const w = document.createElement('span');
            w.className = 'wd';
            w.textContent = part;
            out.push(w);
            frag.appendChild(w);
          }
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1) walk(k);
      }
    };
    walk(el);
    return out;
  };

  /* ---------- подготовка разметки ---------- */
  UI.prep = function () {
    $$('[data-split]').forEach((el) => UI.split(el));
    $$('.btn > span').forEach((s) => s.setAttribute('data-t', s.textContent));
    $$('[data-stagger]').forEach((p) => Array.from(p.children).forEach((c, i) => c.style.setProperty('--i', i)));
  };

  /* ---------- появление по скроллу ---------- */
  UI.initReveal = function () {
    const io = new IntersectionObserver(
      (ents) => {
        for (const e of ents)
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
    );
    $$('[data-reveal], .manifesto__facts, .final__title').forEach((el) => io.observe(el));
  };

  /* ---------- счётчики ---------- */
  UI.initCounters = function () {
    const io = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0), from = +(el.dataset.from || 0);
          D.tween({
            from, to, dur: 2.4, ease: 'outExpo',
            update: (v) => { el.textContent = dec ? v.toFixed(dec).replace('.', ',') : D.fmtInt(v); },
          });
        }
      },
      { threshold: 0.6 }
    );
    $$('[data-count]').forEach((el) => io.observe(el));
  };

  /* ---------- бегущая строка: скорость и наклон зависят от скорости скролла ---------- */
  UI.initMarquee = function () {
    const m = $('#marquee');
    if (!m) return;
    const track = m.firstElementChild;
    const html = track.innerHTML;
    track.innerHTML = html + html + html + html;
    const q = (UI._mq = { el: m, track, x: 0, w: 0, dir: -1, vis: false });
    const measure = () => { q.w = track.scrollWidth / 4; };
    measure();
    UI._mqMeasure = measure;
    new IntersectionObserver((e) => { q.vis = e[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(m);
  };
  UI.tickMarquee = function (dt, vel) {
    const q = UI._mq;
    if (!q || !q.vis || !q.w) return;
    const speed = 60 + Math.min(Math.abs(vel) * 0.4, 1400);
    if (Math.abs(vel) > 40) q.dir = vel > 0 ? -1 : 1;
    q.x += q.dir * speed * dt;
    if (q.x <= -q.w) q.x += q.w;
    if (q.x > 0) q.x -= q.w;
    const skew = D.clamp(vel * 0.0045, -9, 9);
    q.track.style.transform = 'translate3d(' + q.x.toFixed(1) + 'px,0,0) skewX(' + (-skew).toFixed(2) + 'deg)';
  };

  /* ---------- наклон карточек за курсором ---------- */
  UI.initTilt = function () {
    if (D.isTouch()) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100).toFixed(1));
        el.style.setProperty('--gy', (py * 100).toFixed(1));
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  };

  /* ---------- магнитные кнопки ---------- */
  UI.initMagnetic = function () {
    if (D.isTouch()) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = (dx * 0.26).toFixed(1) + 'px ' + (dy * 0.34).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0px 0px'; });
    });
  };

  /* ---------- вопросы ---------- */
  UI.initFaq = function () {
    $$('.qa').forEach((qa) => {
      const b = $('.qa__q', qa);
      b.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        $$('.qa.is-open').forEach((o) => {
          if (o === qa) return;
          o.classList.remove('is-open');
          $('.qa__q', o).setAttribute('aria-expanded', 'false');
        });
        qa.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
        D.audio.blip(open ? 1.25 : 0.9);
        setTimeout(() => D.main && D.main.measure(), 720);
      });
    });
  };

  /* ---------- лента отзывов: тянем мышью/пальцем, с инерцией ---------- */
  UI.initReviews = function () {
    const wrap = $('#reviews'), track = $('#reviewsTrack');
    if (!wrap) return;
    const s = (UI._rv = { x: 0, tx: 0, min: 0, drag: false, lx: 0, v: 0, moved: 0, vis: false });
    const measure = () => {
      const cs = getComputedStyle(wrap);
      const inner = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      s.min = Math.min(0, inner - track.scrollWidth);
      s.tx = D.clamp(s.tx, s.min, 0);
    };
    measure();
    UI._rvMeasure = measure;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      s.drag = true; s.lx = e.clientX; s.v = 0; s.moved = 0;
      wrap.classList.add('is-drag');
      try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!s.drag) return;
      const dx = e.clientX - s.lx;
      s.lx = e.clientX;
      s.moved += Math.abs(dx);
      const over = s.tx > 0 || s.tx < s.min;
      s.tx += dx * (over ? 0.35 : 1);
      s.v = dx;
    });
    const end = () => {
      if (!s.drag) return;
      s.drag = false;
      wrap.classList.remove('is-drag');
      s.tx = D.clamp(s.tx + s.v * 14, s.min, 0);
    };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();
      s.tx = D.clamp(s.tx - e.deltaX, s.min, 0);
    }, { passive: false });
    wrap.addEventListener('dragstart', (e) => e.preventDefault());
    new IntersectionObserver((e) => { s.vis = e[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(wrap);
    s.track = track;
  };
  UI.tickReviews = function (dt) {
    const s = UI._rv;
    if (!s || !s.vis) return;
    if (!s.drag) s.tx = D.clamp(s.tx, s.min, 0);
    const nx = D.damp(s.x, s.tx, s.drag ? 22 : 7, dt);
    if (Math.abs(nx - s.x) < 0.01) return;
    s.x = nx;
    s.track.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,0,0)';
  };

  /* ---------- курсор ---------- */
  UI.initCursor = function () {
    if (D.isTouch()) return;
    const c = $('#cursor');
    if (!c) return;
    const s = (UI._cur = {
      c, dot: $('.cursor__dot', c), ring: $('.cursor__ring', c), label: $('#cursorLabel'),
      x: -100, y: -100, rx: -100, ry: -100, live: false, state: '', target: null,
    });
    document.documentElement.classList.add('has-cursor');
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      s.x = e.clientX; s.y = e.clientY; s.target = e.target;
      if (!s.live) { s.live = true; s.rx = s.x; s.ry = s.y; c.classList.add('is-live'); }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { s.live = false; c.classList.remove('is-live'); });
    window.addEventListener('pointerdown', () => c.classList.add('is-down'));
    window.addEventListener('pointerup', () => c.classList.remove('is-down'));
  };
  const LABELS = { grab: 'крутить', pull: 'тянуть' };
  UI.tickCursor = function (dt, hoverPlanet, dragging) {
    const s = UI._cur;
    if (!s || !s.live) return;
    s.rx = D.damp(s.rx, s.x, 18, dt);
    s.ry = D.damp(s.ry, s.y, 18, dt);
    s.dot.style.transform = 'translate3d(' + s.x + 'px,' + s.y + 'px,0)';
    s.ring.style.transform = 'translate3d(' + s.rx.toFixed(2) + 'px,' + s.ry.toFixed(2) + 'px,0)';
    let state = '';
    const t = s.target;
    if (dragging) state = 'grab';
    else if (t && t.closest) {
      if (t.closest('input[type="text"]')) state = 'text';
      else if (t.closest('a,button,input,label,.qa__q')) state = 'link';
      else if (t.closest('.reviews')) state = 'pull';
      else if (hoverPlanet) state = 'grab';
    }
    if (state !== s.state) {
      s.c.classList.remove('is-link', 'is-grab', 'is-text');
      if (state) s.c.classList.add(state === 'pull' ? 'is-grab' : 'is-' + state);
      s.label.textContent = LABELS[state] || '';
      s.state = state;
    }
  };

  /* ---------- мелочи ---------- */
  UI.toast = function (msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(UI._tt);
    UI._tt = setTimeout(() => t.classList.remove('is-on'), ms || 2800);
  };

  const GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789';
  /** «расшифровка» текста: буквы перебираются и встают на место слева направо */
  UI.scramble = function (el, text, dur) {
    if (el._scr) el._scr.stop();
    const n = Math.max(text.length, 1);
    el._scr = D.tween({
      dur: dur || 0.55, ease: 'linear',
      update: (k) => {
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          out += k * 1.25 > i / n + 0.25 || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
      },
      done: () => { el.textContent = text; el._scr = null; },
    });
  };

  UI.initAll = function () {
    UI.initReveal();
    UI.initCounters();
    UI.initMarquee();
    UI.initTilt();
    UI.initMagnetic();
    UI.initFaq();
    UI.initReviews();
    UI.initCursor();
  };
  UI.measure = function () {
    if (UI._mqMeasure) UI._mqMeasure();
    if (UI._rvMeasure) UI._rvMeasure();
  };
})();
