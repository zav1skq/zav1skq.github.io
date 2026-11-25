/* ДЕМИУРГ — renderer.js: WebGL2-конвейер.
   сцена (HDR) → звёзды → блум → финальная «оптика».
   Камера неподвижна и смотрит на планету; положение планеты на экране
   задаётся сдвигом объектива — поэтому её диск всегда идеальный круг
   и DOM может «прятать» за него текст обычной CSS-маской. */
(function () {
  'use strict';
  const D = window.DMG, S = D.shaders;
  const FOV = (24 * Math.PI) / 180;
  const NOISE_N = 96, NOISE_P = 16;
  const SUN_I = 2.6;
  const SKY_W = 2048, SKY_H = 1024;

  function excerpt(src, log) {
    const m = /ERROR:\s*\d+:(\d+)/.exec(log || '');
    if (!m) return '';
    const n = +m[1], lines = src.split('\n');
    let out = '\n';
    for (let i = Math.max(1, n - 2); i <= Math.min(lines.length, n + 2); i++) out += (i === n ? '>> ' : '   ') + i + ': ' + lines[i - 1] + '\n';
    return out;
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = (this.gl = canvas.getContext('webgl2', {
        antialias: false, alpha: false, depth: false, stencil: false,
        powerPreference: 'high-performance', preserveDrawingBuffer: false,
      }));
      if (!gl) throw new Error('WebGL2 недоступен');
      this.hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
      this.parallel = gl.getExtension('KHR_parallel_shader_compile');
      this.scale = 1;
      this.cssW = 2; this.cssH = 2; this.dpr = 1;
      this.frame = 0;
      this.ready = false;
      this.lost = false;
      this.prog = {};
      this.planet = { x: 0, y: 0, r: 0 };     // положение диска планеты в CSS-пикселях
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
      canvas.addEventListener('webglcontextrestored', () => window.location.reload());
    }

    /* ---------- сборка шейдеров ---------- */
    _start(vs, fs) {
      const gl = this.gl;
      const defs = this.hdr ? '' : '#define LDR 1\n';
      const fix = (s) => s.replace('#version 300 es', '#version 300 es\n' + defs);
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const vsrc = fix(vs), fsrc = fix(fs);
      const v = mk(gl.VERTEX_SHADER, vsrc), f = mk(gl.FRAGMENT_SHADER, fsrc);
      const p = gl.createProgram();
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.linkProgram(p);
      return { p, v, f, vsrc, fsrc };
    }
    async _finish(h, name) {
      const gl = this.gl, ext = this.parallel;
      if (ext) {
        let guard = 0;
        while (!gl.getProgramParameter(h.p, ext.COMPLETION_STATUS_KHR) && guard++ < 1500) await new Promise((r) => setTimeout(r, 12));
      }
      if (!gl.getProgramParameter(h.p, gl.LINK_STATUS)) {
        const lv = gl.getShaderInfoLog(h.v) || '', lf = gl.getShaderInfoLog(h.f) || '', lp = gl.getProgramInfoLog(h.p) || '';
        console.error('[ДЕМИУРГ] шейдер «' + name + '» не собрался:\n' + [lv, lf, lp].filter(Boolean).join('\n') + excerpt(h.fsrc, lf) + excerpt(h.vsrc, lv));
        throw new Error('shader ' + name);
      }
      const u = {};
      const n = gl.getProgramParameter(h.p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(h.p, i);
        u[info.name.replace(/\[0\]$/, '')] = { loc: gl.getUniformLocation(h.p, info.name), type: info.type, size: info.size };
      }
      return { p: h.p, u };
    }
    _set(P, name, v) {
      const gl = this.gl, u = P.u[name];
      if (!u) return;
      switch (u.type) {
        case gl.FLOAT: u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
        case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
        default: gl.uniform1i(u.loc, v);
      }
    }

    /* ---------- инициализация ---------- */
    async init(progress) {
      const gl = this.gl, pr = progress || function () {};
      const specs = {
        scene: [S.quadVS, S.sceneFS], stars: [S.starsVS, S.starsFS], sky: [S.quadVS, S.skyFS],
        down: [S.quadVS, S.downFS], up: [S.quadVS, S.upFS], final: [S.quadVS, S.finalFS],
      };
      const handles = {};
      for (const k in specs) handles[k] = this._start(specs[k][0], specs[k][1]);
      pr(0.04, 'noise');

      // пока драйвер компилирует шейдеры — считаем шум
      const vol = await D.makeNoiseVolume(NOISE_N, NOISE_P, (p) => pr(0.04 + p * 0.5, 'noise'));
      this.noiseTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_3D, this.noiseTex);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, NOISE_N, NOISE_N, NOISE_N, 0, gl.RGBA, gl.FLOAT, vol);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
      pr(0.58, 'shaders');

      let i = 0;
      const names = Object.keys(handles);
      for (const k of names) {
        this.prog[k] = await this._finish(handles[k], k);
        pr(0.58 + (++i / names.length) * 0.3, 'shaders');
      }

      this.emptyVAO = gl.createVertexArray();
      this._bakeSky();
      pr(0.93, 'sky');
      this._makeStars();
      pr(0.97, 'stars');
      this._alloc();
      this.ready = true;
      pr(1, 'done');
    }

    _bakeSky() {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SKY_W, SKY_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, SKY_W, SKY_H);
      gl.disable(gl.BLEND);
      const P = this.prog.sky;
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, this.noiseTex);
      this._set(P, 'uNoise', 0);
      this._set(P, 'uRes', [SKY_W, SKY_H]);
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      this.skyTex = tex;
    }

    _makeStars() {
      const gl = this.gl;
      const n = D.isTouch() ? 5000 : 9500;
      const rnd = D.rng(4242);
      const buf = new Float32Array(n * 8);
      const gn = [0.3403, 0.8518, -0.4004];
      let i = 0;
      while (i < n) {
        const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
        const x = r * Math.cos(a), y = r * Math.sin(a);
        const g = x * gn[0] + y * gn[1] + z * gn[2];
        if (rnd() > 0.2 + 0.8 * Math.exp(-g * g * 9)) continue;
        const mag = Math.pow(rnd(), 4.4);
        const t = rnd();
        let c;
        if (t < 0.16) c = [0.72, 0.82, 1.0];
        else if (t < 0.6) c = [1.0, 0.98, 0.95];
        else if (t < 0.86) c = [1.0, 0.9, 0.72];
        else c = [1.0, 0.72, 0.5];
        const o = i * 8;
        buf[o] = x; buf[o + 1] = y; buf[o + 2] = z; buf[o + 3] = mag;
        buf[o + 4] = c[0]; buf[o + 5] = c[1]; buf[o + 6] = c[2]; buf[o + 7] = rnd();
        i++;
      }
      this.starVAO = gl.createVertexArray();
      gl.bindVertexArray(this.starVAO);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
      gl.bindVertexArray(null);
      this.starCount = n;
    }

    /* ---------- буферы ---------- */
    _target(w, h) {
      const gl = this.gl, tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (this.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo, w, h };
    }
    _free(t) {
      if (!t) return;
      this.gl.deleteTexture(t.tex);
      this.gl.deleteFramebuffer(t.fbo);
    }
    _alloc() {
      const gl = this.gl, c = this.canvas;
      this._free(this.scene);
      (this.down || []).forEach((t) => this._free(t));
      (this.up || []).forEach((t) => this._free(t));
      let w = Math.max(2, Math.round(c.width * this.scale)), h = Math.max(2, Math.round(c.height * this.scale));
      this.scene = this._target(w, h);
      this.down = [];
      this.up = [];
      for (let i = 0; i < 6; i++) {
        w = Math.max(2, w >> 1);
        h = Math.max(2, h >> 1);
        this.down.push(this._target(w, h));
        if (w <= 6 || h <= 6) break;
      }
      for (let i = 0; i < this.down.length - 1; i++) this.up.push(this._target(this.down[i].w, this.down[i].h));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    resize(cssW, cssH) {
      const c = this.canvas;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      const maxPx = 3.4e6;
      if (cssW * cssH * dpr * dpr > maxPx) dpr = Math.sqrt(maxPx / (cssW * cssH));
      this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
      const bw = Math.max(2, Math.round(cssW * dpr)), bh = Math.max(2, Math.round(cssH * dpr));
      if (c.width !== bw || c.height !== bh) {
        c.width = bw;
        c.height = bh;
        if (this.ready) this._alloc();
      }
    }
    setScale(s) {
      if (Math.abs(s - this.scale) < 1e-3) return;
      this.scale = s;
      if (this.ready) this._alloc();
    }

    /* ---------- кадр ---------- */
    render(st) {
      const gl = this.gl;
      if (this.lost || !this.ready) return;
      this.frame = (this.frame + 1) % 4096;
      const w = st.world;
      const W = this.scene.w, H = this.scene.h;
      const k = W / this.cssW;
      const focal = ((this.cssH * 0.5) / Math.tan(FOV / 2)) * k;
      const radPx = Math.max(st.rad * k, 0.5);
      const camDist = 1 / Math.sin(Math.atan(radPx / focal));
      const shift = [st.cx * k, st.cy * k];
      this.planet.x = this.cssW * 0.5 + st.cx;
      this.planet.y = this.cssH * 0.5 - st.cy;
      this.planet.r = st.rad;

      // атмосфера
      const Hh = Math.max(w.atmoH, 0.004), den = Math.max(w.atmoDen, 0);
      const kR = (0.32 * den) / Hh, kM = (0.035 * den * w.mie) / Hh;
      const bR = [w.atmoCol[0] * kR, w.atmoCol[1] * kR, w.atmoCol[2] * kR];
      const bM = [w.mieCol[0] * kM, w.mieCol[1] * kM, w.mieCol[2] * kM];
      const Ra = 1 + Hh * (den > 0.01 ? 6.5 : 0.02);
      const sunCol = [w.sunCol[0] * SUN_I, w.sunCol[1] * SUN_I, w.sunCol[2] * SUN_I];
      const ak = 0.085 * Math.min(den, 1.6) * SUN_I;
      const amb = [(w.atmoCol[0] * 0.6 + 0.12) * ak, (w.atmoCol[1] * 0.6 + 0.12) * ak, (w.atmoCol[2] * 0.6 + 0.12) * ak];
      const lodT = D.clamp(5.0 + Math.log2(radPx / 110), 4.5, 10);
      const lodC = D.clamp(3.4 + Math.log2(radPx / 110), 3, 7.5);
      const accent = [D.toLin(w.accent[0]) * 1.5, D.toLin(w.accent[1]) * 1.5, D.toLin(w.accent[2]) * 1.5];
      const Rp = st.planetRot;
      const planetInv = D.m3.transpose(Rp);
      const axis = [Rp[3], Rp[4], Rp[5]];
      const moons = new Float32Array(12);
      for (let i = 0; i < 3; i++) {
        const m = st.moons && st.moons[i];
        if (m) { moons[i * 4] = m[0]; moons[i * 4 + 1] = m[1]; moons[i * 4 + 2] = m[2]; moons[i * 4 + 3] = m[3]; }
      }

      /* --- сцена --- */
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
      gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND);
      let P = this.prog.scene;
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, this.noiseTex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.skyTex);
      const set = (n, v) => this._set(P, n, v);
      set('uNoise', 0); set('uSky', 1);
      set('uRes', [W, H]); set('uTime', st.time); set('uFrame', this.frame % 64);
      set('uFocal', focal); set('uShift', shift); set('uCamDist', camDist);
      set('uSunDir', st.sunDir); set('uSunCol', sunCol);
      set('uPlanetInv', planetInv); set('uAxis', axis); set('uSkyRot', st.skyRot);
      set('uNebA', w.nebA); set('uNebB', w.nebB); set('uNebI', st.nebI);
      set('uBlueprint', st.blueprint); set('uAccent', accent);
      set('uLodT', lodT); set('uLodC', lodC); set('uZoomK', D.smoothstep(300, 820, radPx));
      set('uSeed', w.seed); set('uFreq', w.freq); set('uWarp', w.warp); set('uSea', w.sea);
      set('uMount', w.mount); set('uBump', w.bump);
      set('uColDeep', w.colDeep); set('uColShallow', w.colShallow); set('uColCrack', w.colCrack);
      set('uOceanSpec', w.oceanSpec); set('uOceanRough', w.oceanRough); set('uOceanCrack', w.oceanCrack);
      set('uOceanEmis', w.oceanEmis);
      set('uColA', w.colA); set('uColB', w.colB); set('uColC', w.colC); set('uColD', w.colD);
      set('uColShore', w.colShore); set('uColIce', w.colIce); set('uIce', w.ice);
      set('uLandEmis', w.landEmis); set('uLandCrack', w.landCrack);
      set('uCloud', w.cloud); set('uCloudFreq', w.cloudFreq); set('uCloudBand', w.cloudBand);
      set('uCloudAng', st.cloudAng); set('uCloudOff', st.cloudOff); set('uColCloud', w.colCloud);
      set('uBetaR', bR); set('uBetaM', bM); set('uAmb', amb);
      set('uHatm', Hh); set('uRa', Ra); set('uMieG', w.mieG);
      set('uCity', w.city); set('uColCity', w.colCity);
      set('uGas', w.gas); set('uBandFreq', w.bandFreq); set('uGasTurb', w.gasTurb); set('uStorm', w.storm);
      set('uGasA', w.gasA); set('uGasB', w.gasB); set('uGasC', w.gasC); set('uGasD', w.gasD); set('uGasSpot', w.gasSpot);
      set('uRingIn', w.ringIn); set('uRingOut', w.ringOut); set('uRingA', w.ringA); set('uRingCol', w.ringCol);
      set('uMoon', moons); set('uMoonCol', w.moonCol);
      set('uBio', w.bio); set('uColBio', w.colBio);
      set('uAurora', w.aurora); set('uColAurora', w.colAurora);
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* --- звёзды --- */
      if (st.starI > 0.001) {
        P = this.prog.stars;
        gl.useProgram(P.p);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        this._set(P, 'uSkyRotT', D.m3.transpose(st.skyRot));
        this._set(P, 'uFocal', focal); this._set(P, 'uShift', shift); this._set(P, 'uRes', [W, H]);
        this._set(P, 'uCamDist', camDist); this._set(P, 'uRa', 1 + (Ra - 1) * 0.55);
        this._set(P, 'uTime', st.time); this._set(P, 'uPx', k); this._set(P, 'uStarI', st.starI);
        this._set(P, 'uMoon', moons);
        gl.bindVertexArray(this.starVAO);
        gl.drawArrays(gl.POINTS, 0, this.starCount);
        gl.disable(gl.BLEND);
      }

      /* --- блум: вниз --- */
      gl.bindVertexArray(this.emptyVAO);
      P = this.prog.down;
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0);
      this._set(P, 'uTex', 0);
      this._set(P, 'uThreshold', 0.95);
      this._set(P, 'uKnee', 0.6);
      let src = this.scene;
      for (let i = 0; i < this.down.length; i++) {
        const dst = this.down[i];
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
        gl.viewport(0, 0, dst.w, dst.h);
        gl.bindTexture(gl.TEXTURE_2D, src.tex);
        this._set(P, 'uTexel', [1 / src.w, 1 / src.h]);
        this._set(P, 'uOutRes', [dst.w, dst.h]);
        this._set(P, 'uPrefilter', i === 0 ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        src = dst;
      }
      /* --- блум: вверх --- */
      P = this.prog.up;
      gl.useProgram(P.p);
      this._set(P, 'uTex', 0);
      this._set(P, 'uCur', 1);
      this._set(P, 'uSpread', 1.0);
      let low = this.down[this.down.length - 1];
      for (let i = this.up.length - 1; i >= 0; i--) {
        const dst = this.up[i];
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
        gl.viewport(0, 0, dst.w, dst.h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, low.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.down[i].tex);
        this._set(P, 'uTexel', [1 / low.w, 1 / low.h]);
        this._set(P, 'uOutRes', [dst.w, dst.h]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        low = dst;
      }

      /* --- блик звезды: где она на экране и сколько её видно из-за планеты --- */
      const L = st.sunDir;
      let sunPos = [-5, -5], vis = [0, 0, 0];
      if (L[2] < -0.02) {
        const sx = shift[0] + (focal * L[0]) / -L[2], sy = shift[1] + (focal * L[1]) / -L[2];
        sunPos = [0.5 + sx / W, 0.5 + sy / H];
        const b = -camDist * L[2];
        const dp = Math.sqrt(Math.max(camDist * camDist - b * b, 0));
        if (dp > 1) {
          const rho = Math.exp(-(dp - 1) / Hh), chord = rho * Math.sqrt(2 * Math.PI * dp * Hh);
          const edge = D.smoothstep(1.0, 1.0 + Hh * 0.7, dp);
          const off = 1 - D.smoothstep(0.62, 1.15, Math.max(Math.abs(sunPos[0] - 0.5), Math.abs(sunPos[1] - 0.5)));
          for (let i = 0; i < 3; i++) vis[i] = Math.exp(-(bR[i] + bM[i] * 1.1) * chord) * edge * off * w.sunCol[i];
        }
      }

      /* --- финал --- */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      P = this.prog.final;
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.up.length ? this.up[0].tex : this.down[0].tex);
      this._set(P, 'uScene', 0); this._set(P, 'uBloom', 1);
      this._set(P, 'uRes', [this.canvas.width, this.canvas.height]);
      this._set(P, 'uExposure', st.exposure); this._set(P, 'uBloomI', st.bloom);
      this._set(P, 'uTime', st.time); this._set(P, 'uGrain', st.grain); this._set(P, 'uVig', st.vig);
      this._set(P, 'uCA', st.ca); this._set(P, 'uFlare', st.flare);
      this._set(P, 'uAspect', this.canvas.width / this.canvas.height);
      this._set(P, 'uFlash', st.flash); this._set(P, 'uFade', st.fade);
      this._set(P, 'uSunPos', sunPos); this._set(P, 'uSunVis', vis);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  D.Renderer = Renderer;
  D.FOV = FOV;
})();
