/* ДЕМИУРГ — scroll.js: плавная прокрутка.
   Колесо не двигает страницу напрямую, а задаёт цель; реальная позиция
   догоняет её по экспоненте. Тач, полоса прокрутки и клавиатура остаются
   нативными — мы лишь синхронизируемся. Sticky-секции работают как обычно,
   потому что двигается настоящий scroll, а не transform. */
(function () {
  'use strict';
  const D = window.DMG;

  const S = (D.scroll = {
    y: 0, target: 0, vel: 0, max: 0,
    smooth: true, locked: false,
    _anim: false, _tween: null, _set: 0,

    init() {
      this.smooth = !D.isTouch() && !D.reducedMotion();
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      this.y = this.target = 0;
      this.measure();
      window.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
      window.addEventListener('keydown', (e) => this._key(e));
      window.addEventListener('scroll', () => this._native(), { passive: true });
      document.addEventListener('click', (e) => this._anchor(e));
    },

    measure() {
      this.max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      this.target = D.clamp(this.target, 0, this.max);
    },

    _stopTween() {
      if (this._tween) {
        this._tween.stop();
        this._tween = null;
      }
    },

    _wheel(e) {
      if (e.ctrlKey) return;
      if (this.locked) { e.preventDefault(); return; }
      if (!this.smooth) return;
      // вложенные области с собственной прокруткой (панель мастерской)
      let n = e.target;
      while (n && n !== document.body && n.nodeType === 1) {
        if (n.hasAttribute('data-native-scroll') && n.scrollHeight > n.clientHeight + 1) {
          const atTop = n.scrollTop <= 0, atBot = n.scrollTop + n.clientHeight >= n.scrollHeight - 1;
          if (!((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBot))) return;
        }
        n = n.parentNode;
      }
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 36;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      this._stopTween();
      if (!this._anim) this.target = window.scrollY;
      this.target = D.clamp(this.target + d, 0, this.max);
      this._anim = true;
    },

    _key(e) {
      if (!this.smooth || this.locked || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      const H = window.innerHeight;
      let d = 0, abs = null;
      switch (e.key) {
        case 'ArrowDown': d = 90; break;
        case 'ArrowUp': d = -90; break;
        case 'PageDown': d = H * 0.88; break;
        case 'PageUp': d = -H * 0.88; break;
        case ' ': if (tag === 'BUTTON' || tag === 'A') return; d = (e.shiftKey ? -1 : 1) * H * 0.88; break;
        case 'Home': abs = 0; break;
        case 'End': abs = this.max; break;
        default: return;
      }
      e.preventDefault();
      if (abs !== null) return this.to(abs);
      this._stopTween();
      if (!this._anim) this.target = window.scrollY;
      this.target = D.clamp(this.target + d, 0, this.max);
      this._anim = true;
    },

    _native() {
      // пользователь схватил полосу прокрутки посреди нашей анимации — уступаем
      if ((this._anim || this._tween) && Math.abs(window.scrollY - this._set) > 4) {
        this._anim = false;
        this._stopTween();
        this.y = this.target = window.scrollY;
      }
    },

    _anchor(e) {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      const off = +(el.getAttribute('data-anchor-offset') || 0);
      this.to(el.getBoundingClientRect().top + window.scrollY + off * window.innerHeight);
    },

    /** плавно доехать до позиции */
    to(y, dur) {
      this.measure();
      y = D.clamp(y, 0, this.max);
      const from = window.scrollY;
      this._stopTween();
      this._anim = false;
      if (D.reducedMotion()) {
        window.scrollTo(0, y);
        this.y = this.target = y;
        return;
      }
      const d = dur || D.clamp(Math.abs(y - from) / 2600, 1.0, 2.6);
      this.y = this.target = from;
      this._tween = D.tween({
        from, to: y, dur: d, ease: 'inOutCubic',
        update: (v) => { this.y = this.target = v; },
        done: () => { this._tween = null; },
      });
    },

    /** мгновенный прыжок (для «Большого взрыва») */
    jump(y) {
      this._stopTween();
      this._anim = false;
      window.scrollTo(0, y);
      this.y = this.target = y;
      this.vel = 0;
    },

    update(dt) {
      const prev = this.y;
      if (this._tween) {
        window.scrollTo(0, this.y);
        this._set = this.y;
      } else if (this._anim) {
        this.y = D.damp(this.y, this.target, 7.2, dt);
        if (Math.abs(this.target - this.y) < 0.35) {
          this.y = this.target;
          this._anim = false;
        }
        window.scrollTo(0, this.y);
        this._set = this.y;
      } else {
        this.y = this.target = window.scrollY;
      }
      const v = (this.y - prev) / Math.max(dt, 1e-3);
      this.vel = D.damp(this.vel, v, 12, dt);
    },
  });
})();
