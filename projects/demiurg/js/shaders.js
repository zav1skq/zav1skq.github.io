/* ДЕМИУРГ — shaders.js
   Весь космос сайта — это код ниже. Ни одной картинки.
   scene  — планета: рельеф, океан, облака, огни, атмосфера, кольца, луны
   stars  — звёзды точками (чёткие при любом масштабе)
   sky    — туманности и Млечный Путь, запекаются один раз
   down/up — блум (dual kawase)
   final  — «оптика»: блик звезды, хроматика, тонмаппинг, зерно */
(function () {
  'use strict';
  const D = (window.DMG = window.DMG || {});
  const S = (D.shaders = {});

  /* один треугольник на весь экран */
  S.quadVS = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const CODEC = `
#ifdef LDR
vec3 dec(vec3 c){ return c * c * 16.0; }
vec3 enc(vec3 c){ return sqrt(clamp(c / 16.0, 0.0, 1.0)); }
#else
vec3 dec(vec3 c){ return c; }
vec3 enc(vec3 c){ return c; }
#endif
`;

  const NOISE = `
uniform sampler3D uNoise;
const float NPI = 0.0625;
const mat3 M3  = mat3( 0.00,  0.80,  0.60, -0.80,  0.36, -0.48, -0.60, -0.48,  0.64);
const mat3 M3I = mat3( 0.00, -0.80, -0.60,  0.80,  0.36, -0.48,  0.60, -0.48,  0.64);
vec4  nz(vec3 p){ return textureLod(uNoise, p * NPI, 0.0); }
float nzv(vec3 p){ return textureLod(uNoise, p * NPI, 0.0).x; }

// fBm с аналитической производной; lod — дробное число октав (плавная детализация)
vec4 fbmD(vec3 x, float lod, float gain){
  float a = 0.0, b = 0.5, dk = 1.0;
  vec3 d = vec3(0.0);
  mat3 m = mat3(1.0);
  int n = int(ceil(lod));
  for (int i = 0; i < n; i++){
    float w = min(lod - float(i), 1.0);
    vec4 v = nz(x);
    a += b * w * v.x;
    d += (b * w * dk) * (m * v.yzw);
    b *= gain; dk *= 0.78;
    x = 2.02 * (M3 * x);
    m = 2.02 * (M3I * m);
  }
  return vec4(a, d);
}
float fbm(vec3 x, float lod, float gain){
  float a = 0.0, b = 0.5;
  int n = int(ceil(lod));
  for (int i = 0; i < n; i++){
    float w = min(lod - float(i), 1.0);
    a += b * w * nzv(x);
    b *= gain;
    x = 2.02 * (M3 * x);
  }
  return a;
}
`;

  /* ===================================================================== */
  /*  СЦЕНА                                                                 */
  /* ===================================================================== */
  S.sceneFS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;
out vec4 outColor;

#define PI 3.14159265359

uniform vec2  uRes;
uniform float uTime;
uniform float uFrame;
uniform float uFocal;
uniform vec2  uShift;
uniform float uCamDist;
uniform vec3  uSunDir;
uniform vec3  uSunCol;
uniform mat3  uPlanetInv;
uniform vec3  uAxis;
uniform mat3  uSkyRot;
uniform sampler2D uSky;
uniform vec3  uNebA;
uniform vec3  uNebB;
uniform float uNebI;
uniform float uBlueprint;
uniform vec3  uAccent;
uniform float uLodT;
uniform float uLodC;
uniform float uZoomK;

uniform vec3  uSeed;
uniform float uFreq;
uniform float uWarp;
uniform float uSea;
uniform float uMount;
uniform float uBump;
uniform vec3  uColDeep;
uniform vec3  uColShallow;
uniform vec3  uColCrack;
uniform float uOceanSpec;
uniform float uOceanRough;
uniform float uOceanCrack;
uniform vec3  uOceanEmis;
uniform vec3  uColA;
uniform vec3  uColB;
uniform vec3  uColC;
uniform vec3  uColD;
uniform vec3  uColShore;
uniform vec3  uColIce;
uniform float uIce;
uniform vec3  uLandEmis;
uniform float uLandCrack;
uniform float uCloud;
uniform float uCloudFreq;
uniform float uCloudBand;
uniform float uCloudAng;
uniform vec3  uCloudOff;
uniform vec3  uColCloud;
uniform vec3  uBetaR;
uniform vec3  uBetaM;
uniform vec3  uAmb;
uniform float uHatm;
uniform float uRa;
uniform float uMieG;
uniform float uCity;
uniform vec3  uColCity;
uniform float uGas;
uniform float uBandFreq;
uniform float uGasTurb;
uniform float uStorm;
uniform vec3  uGasA;
uniform vec3  uGasB;
uniform vec3  uGasC;
uniform vec3  uGasD;
uniform vec3  uGasSpot;
uniform float uRingIn;
uniform float uRingOut;
uniform float uRingA;
uniform vec3  uRingCol;
uniform vec4  uMoon[3];
uniform vec3  uMoonCol;
uniform float uBio;
uniform vec3  uColBio;
uniform float uAurora;
uniform vec3  uColAurora;
${CODEC}
${NOISE}

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/* ---------- атмосфера ---------- */
// приближение функции Чепмена (Schüler): оптическая толща вдоль луча под зенитным углом
float chapman(float x, float c){
  float k = sqrt(1.5707963 * x);
  if (c >= 0.0) return k / ((k - 1.0) * c + 1.0);
  float s = sqrt(max(1.0 - c * c, 0.0));
  float xs = x * s;
  return 2.0 * sqrt(1.5707963 * xs) * exp(min(x - xs, 30.0)) - k / ((k - 1.0) * (-c) + 1.0);
}
// толща от точки на радиусе r в сторону звезды (c — косинус зенитного угла)
float sunDepth(float r, float c){
  float rho = exp(-(r - 1.0) / uHatm);
  float od = uHatm * rho * chapman(r / uHatm, c);
  if (c < 0.0){
    float graze = r * sqrt(max(1.0 - c * c, 0.0)) - 1.0;
    od += 60.0 * (1.0 - smoothstep(-uHatm * 0.4, uHatm * 0.8, graze));   // тень самой планеты
  }
  return od;
}
vec3 atmosphere(vec3 ro, vec3 rd, float tA, float tB, out vec3 trans){
  vec3 betaE = uBetaR + uBetaM * 1.1;
  float ds = (tB - tA) / 10.0;
  float mu = dot(rd, uSunDir);
  float pR = 0.0596831 * (1.0 + mu * mu);
  float g = uMieG, g2 = g * g;
  float pM = 0.1193662 * ((1.0 - g2) * (1.0 + mu * mu)) / ((2.0 + g2) * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5));
  float jit = hash12(gl_FragCoord.xy + uFrame * 7.31);
  vec3 acc = vec3(0.0);
  float od = 0.0;
  for (int i = 0; i < 10; i++){
    float t = tA + (float(i) + jit) * ds;
    vec3 p = ro + rd * t;
    float r = length(p);
    float rho = exp(-(r - 1.0) / uHatm);
    float c = dot(p, uSunDir) / r;
    float odl = sunDepth(r, c);
    acc += rho * exp(-betaE * (odl + od + rho * ds * jit));
    od += rho * ds;
  }
  trans = exp(-betaE * od);
  return acc * ds * (uBetaR * pR + uBetaM * pM) * uSunCol * PI;
}

/* ---------- поверхность ---------- */
struct Surf {
  vec3 alb; vec3 nrm; vec3 emis;
  float spec; float rough; float h; float land; float gtl; float city; float bio;
};

vec4 ridgedD(vec3 x){
  float a = 0.0, b = 0.5;
  vec3 d = vec3(0.0);
  mat3 m = mat3(1.0);
  for (int i = 0; i < 4; i++){
    vec4 v = nz(x);
    float r = max(1.0 - abs(v.x) * 2.4, 0.0);
    vec3 dr = (r > 0.0) ? (-sign(v.x) * 2.4) * v.yzw : vec3(0.0);
    a += b * r * r;
    d += (b * 2.0 * r) * (m * dr);
    b *= 0.5;
    x = 2.1 * (M3 * x);
    m = 2.1 * (M3I * m);
  }
  return vec4(a, d);
}

// высота и её градиент по положению на сфере
vec4 terrainD(vec3 q){
  vec3 x = q * uFreq + uSeed;
  vec4 wn = nz(x * 0.55 + vec3(11.3, 4.7, 8.1));
  x += uWarp * wn.yzw;
  vec4 b = fbmD(x, uLodT, 0.5);
  float h = b.x;
  vec3 g = b.yzw;
  if (uMount > 0.001){
    vec4 r = ridgedD(x * 2.3 + vec3(3.1, 7.7, 1.9));
    float e0 = uSea - 0.03, e1 = uSea + 0.24;
    float t = clamp((b.x - e0) / (e1 - e0), 0.0, 1.0);
    float mk = t * t * (3.0 - 2.0 * t);
    float dmk = 6.0 * t * (1.0 - t) / (e1 - e0);
    h += uMount * mk * r.x;
    g += uMount * (dmk * r.x * b.yzw + mk * 0.9 * r.yzw);
  }
  return vec4(h, g * uFreq);
}

void rockSurface(vec3 q, float pw, out Surf s){
  vec4 tr = terrainD(q);
  float h = tr.x;
  vec3 gt = tr.yzw - q * dot(tr.yzw, q);
  float glen = length(gt);
  float aa = glen * pw + 1e-5;
  float land = smoothstep(-aa, aa, h - uSea);
  float e = clamp((h - uSea) / (0.78 - uSea), 0.0, 1.0);

  vec3 xm = q * (uFreq * 1.9) + uSeed + vec3(40.0, 13.0, 27.0);
  float m = clamp(nzv(xm) * 1.5 + 0.5, 0.0, 1.0);
  float m2 = nzv(xm * 6.3);

  // суша: от низин к вершинам; сухие пояса в субтропиках, влажные — у экватора и в умеренных широтах
  float dryBelt = exp(-pow((abs(q.y) - 0.40) / 0.17, 2.0));
  float dry = clamp((1.0 - m) * 0.9 + dryBelt * 0.45 - 0.25 + e * 0.35, 0.0, 1.0);
  vec3 low = mix(uColA, uColB, smoothstep(0.35, 0.7, dry));
  vec3 la = mix(low, uColC, smoothstep(0.36, 0.7, e + (m - 0.5) * 0.25));
  la = mix(la, uColD, smoothstep(0.7, 0.92, e + m2 * 0.1));
  la = mix(uColShore, la, smoothstep(0.0, 0.035, e));
  la *= 0.82 + 0.6 * m2;

  // полярные шапки
  float iceLat = abs(q.y) + (m - 0.5) * 0.14 + m2 * 0.06;
  float iceLine = 1.03 - uIce * 1.08;
  float iceL = smoothstep(iceLine - 0.015, iceLine + 0.05, iceLat + e * 0.22);
  float iceO = smoothstep(iceLine + 0.02, iceLine + 0.08, iceLat);
  la = mix(la, uColIce, iceL);

  // «океан»: вода, лава или лёд — решают параметры
  float depth = clamp((uSea - h) / 0.2, 0.0, 1.0);
  vec3 oc = mix(uColShallow, uColDeep, smoothstep(0.0, 0.75, depth));
  float cr = 0.0;
  float heat = 1.0;
  if (uOceanCrack > 0.001){
    vec3 xc = q * (uFreq * 3.6) + uSeed.zxy + vec3(0.0, uTime * 0.003, 0.0);
    float n1 = nzv(xc), n2 = nzv(xc * 2.9 + 3.3);
    heat = smoothstep(-0.25, 0.35, nzv(xc * 0.31 + 7.0));          // где-то кора остыла, где-то кипит
    cr = pow(max(1.0 - abs(n1) * 10.0, 0.0), 2.0) + 0.55 * pow(max(1.0 - abs(n2) * 10.0, 0.0), 2.0) * heat;
    cr = min(cr, 1.0) * uOceanCrack * (0.35 + 0.65 * heat);
    oc = mix(oc, uColCrack, cr);
    oc *= 0.86 + 0.5 * m2;
  }
  oc = mix(oc, uColIce, iceO);

  s.alb = mix(oc, la, land);
  s.spec = uOceanSpec * (1.0 - land) * (1.0 - 0.7 * iceO) + 0.12 * land * iceL;
  s.rough = uOceanRough;
  vec3 nL = normalize(q - gt * (0.32 * uBump));
  vec3 wv = nz(q * 240.0 + vec3(0.0, uTime * 0.04, 0.0)).yzw;
  vec3 nO = normalize(q + (wv - q * dot(wv, q)) * 0.03);
  s.nrm = normalize(mix(nO, nL, land));
  s.emis = uOceanEmis * (0.02 + 2.4 * cr + 0.22 * depth * depth * heat) * (1.0 - land) * (1.0 - iceO);
  if (uLandCrack > 0.001){
    vec3 xl = q * (uFreq * 5.2) + uSeed.yzx;
    float lc = pow(max(1.0 - abs(nzv(xl)) * 9.0, 0.0), 3.0)
             + 0.5 * pow(max(1.0 - abs(nzv(xl * 3.1 + 1.7)) * 9.0, 0.0), 3.0);
    s.emis += uLandEmis * (lc * uLandCrack * land * (1.0 - smoothstep(0.08, 0.45, e)));
  }
  s.h = h; s.land = land; s.gtl = glen;

  // огни городов
  s.city = 0.0;
  if (uCity > 0.001){
    // населённые регионы тянутся к побережьям
    float pop = smoothstep(-0.02, 0.32, nzv(q * (uFreq * 2.4) + uSeed + 77.0) + 0.22 * (1.0 - smoothstep(0.0, 0.2, e)) - 0.06);
    vec3 xc = q * (uFreq * 16.0) + uSeed * 3.0;
    float n1 = nzv(xc), n2 = nzv(xc * 3.7 + 9.0);
    float cores = pow(smoothstep(0.12, 0.5, n1), 2.0) * 1.6;                    // агломерации
    float dots = smoothstep(0.25, 0.5, n2) * smoothstep(-0.15, 0.3, n1);        // россыпь городков
    float roads = pow(max(1.0 - abs(nzv(xc * 0.55 + 5.0)) * 20.0, 0.0), 2.0) * 0.4
                * (0.35 + 0.65 * smoothstep(-0.05, 0.3, nzv(xc * 2.3 + 1.0)));           // трассы пунктиром
    float c = (cores + dots * 0.8 + roads) * pop;
    // вблизи пятна агломераций распадаются на кварталы
    float fine = smoothstep(-0.05, 0.3, nzv(xc * 5.3 + 2.0)) * (0.35 + 1.3 * smoothstep(0.0, 0.35, nzv(xc * 17.0)));
    c *= mix(1.0, fine * 1.5, uZoomK);
    c *= land * (1.0 - iceL) * (1.0 - smoothstep(0.2, 0.62, e)) * smoothstep(0.0, 0.015, e);
    s.city = max(c, 0.0) * uCity;
  }
  // биолюминесценция
  s.bio = 0.0;
  if (uBio > 0.001){
    float v = smoothstep(0.35, 0.8, m) * (1.0 - smoothstep(0.3, 0.75, e));
    float veins = pow(max(1.0 - abs(nzv(q * (uFreq * 9.0) + uSeed.zxy)) * 5.0, 0.0), 2.0);
    s.bio = uBio * land * (1.0 - iceL) * (v * 0.5 + veins * 0.9 * (0.3 + v));
    s.bio += uBio * (1.0 - land) * (1.0 - smoothstep(0.0, 0.35, depth)) * 0.35 * (0.5 + m);
  }
}

vec3 rotAx(vec3 p, vec3 a, float w){
  float c = cos(w), sn = sin(w);
  return p * c + cross(a, p) * sn + a * (dot(a, p) * (1.0 - c));
}

void gasSurface(vec3 q, out Surf s){
  const vec3 S1 = vec3(0.7202, -0.3301, 0.6102);
  const vec3 S2 = vec3(-0.5028, 0.4224, 0.7542);
  const vec3 S3 = vec3(-0.2013, -0.6241, -0.7550);
  vec3 p = q;
  float d1 = distance(p, S1), d2 = distance(p, S2), d3 = distance(p, S3);
  float w1 = exp(-d1 * d1 / 0.03), w2 = exp(-d2 * d2 / 0.012), w3 = exp(-d3 * d3 / 0.008);
  p = rotAx(p, S1, w1 * 3.5 * uStorm);
  p = rotAx(p, S2, -w2 * 3.0 * uStorm);
  p = rotAx(p, S3, w3 * 3.0 * uStorm);
  vec3 x = vec3(p.x, p.y * 2.6, p.z) * 1.7 + uSeed * 0.37 + vec3(0.0, 0.0, uTime * 0.006);
  float tb = fbm(x, 5.0, 0.55);
  vec3 x2 = vec3(p.x * 3.0, p.y * 22.0, p.z * 3.0) + uSeed * 0.11 + vec3(uTime * 0.01, 0.0, 0.0);
  float st = fbm(x2, min(uLodC, 5.0), 0.5);
  float v = p.y * uBandFreq + tb * uGasTurb * 2.4 + st * 0.5;
  float b1 = nzv(vec3(v, 0.37, 0.71));
  float b2 = nzv(vec3(v * 2.3 + 5.0, 3.1, 1.7));
  float b3 = nzv(vec3(v * 0.45 + 2.0, 6.3, 9.1));
  vec3 col = mix(uGasA, uGasB, smoothstep(-0.25, 0.25, b1));
  col = mix(col, uGasC, smoothstep(0.05, 0.45, b2) * 0.75);
  col = mix(col, uGasD, smoothstep(0.0, 0.4, b3 + st * 0.6) * 0.6);
  col *= 0.74 + 0.6 * st + 0.3 * tb;
  col = mix(col, uGasSpot, clamp(w1 * 1.1, 0.0, 1.0) * 0.8 * uStorm);
  col = mix(col, uGasD * 0.9, w2 * 0.6 * uStorm);
  col = mix(col, uGasC * 0.55, smoothstep(0.72, 0.98, abs(q.y)));
  s.alb = col; s.nrm = q; s.emis = vec3(0.0);
  s.spec = 0.0; s.rough = 0.5; s.h = 0.0; s.land = 0.0; s.gtl = 0.0; s.city = 0.0; s.bio = 0.0;
}

Surf mixSurf(Surf a, Surf b, float t){
  Surf s;
  s.alb = mix(a.alb, b.alb, t);
  s.nrm = normalize(mix(a.nrm, b.nrm, t));
  s.emis = mix(a.emis, b.emis, t);
  s.spec = mix(a.spec, b.spec, t);
  s.rough = mix(a.rough, b.rough, t);
  s.h = mix(a.h, b.h, t);
  s.land = mix(a.land, b.land, t);
  s.gtl = mix(a.gtl, b.gtl, t);
  s.city = mix(a.city, b.city, t);
  s.bio = mix(a.bio, b.bio, t);
  return s;
}

float cloudField(vec3 qc, out vec3 grad){
  vec3 x = qc * uCloudFreq + uCloudOff;
  vec4 w = nz(x * 0.42 + vec3(5.2, 1.3, 9.7));
  x += w.yzw * 0.5;
  x.y *= 1.0 + uCloudBand;
  vec4 f = fbmD(x, uLodC, 0.56);
  grad = f.yzw;
  float thr = mix(0.42, -0.36, uCloud);
  return smoothstep(thr, thr + 0.3, f.x) * smoothstep(0.0, 0.06, uCloud);
}

/* ---------- кольца ---------- */
float ringProfile(float r, float fw){
  float t = (r - uRingIn) / (uRingOut - uRingIn);
  if (t <= 0.0 || t >= 1.0) return 0.0;
  float n = nzv(vec3(r * 9.0, 0.5, 0.5)) * 1.3
          + nzv(vec3(r * 31.0, 3.5, 7.5)) * 0.9 * (1.0 - smoothstep(0.25, 0.75, fw * 31.0))
          + nzv(vec3(r * 97.0, 1.5, 4.5)) * 0.6 * (1.0 - smoothstep(0.25, 0.75, fw * 97.0));
  float a = clamp(0.74 + n * 0.95, 0.06, 1.0);
  a *= smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.88, 1.0, t));
  a *= 1.0 - 0.92 * (1.0 - smoothstep(0.012, 0.03, abs(t - 0.64)));
  a *= 0.55 + 0.45 * smoothstep(0.15, 0.4, t);
  return a;
}

/* ---------- голограмма («чертёж») ---------- */
vec3 holo(vec3 q, Surf s, float pw, float NV){
  float lat = asin(clamp(q.y, -1.0, 1.0));
  float lon = atan(q.z, q.x);
  float aw = pw * 1.2;
  float cl = max(cos(lat), 0.02);
  float dl = abs(sin(lat * 12.0)) / 12.0;
  float dlo = abs(sin(lon * 12.0)) / 12.0 * cl;
  float grid = 1.0 - smoothstep(aw * 0.5, aw * 1.5, dl);
  grid = max(grid, (1.0 - smoothstep(aw * 0.5, aw * 1.5, dlo)) * smoothstep(0.02, 0.12, cl));
  float ch = (s.h - uSea) * 16.0;
  float dc = 0.5 - abs(fract(ch) - 0.5);
  float cw = s.gtl * 16.0 * pw + 1e-4;
  float rock = 1.0 - uGas;
  float cont = (1.0 - smoothstep(cw * 0.6, cw * 1.6, dc)) * step(0.0, ch) * rock;
  float coast = (1.0 - smoothstep(cw, cw * 2.6, abs(ch))) * rock;
  float sweep = exp(-pow((q.y - sin(uTime * 0.6) * 1.1) * 7.0, 2.0));
  float rim = pow(1.0 - NV, 3.0);
  vec3 c = uAccent * (0.015 + 0.03 * s.land * rock);
  c += uAccent * (grid * 0.22 + cont * 0.45 + coast * 1.2) * (0.7 + 1.6 * sweep);
  c += uAccent * rim * 0.9;
  c += vec3(1.0) * s.city * 0.5;
  return c;
}

/* ---------- сборка поверхности ---------- */
vec3 shadeSurface(vec3 P, vec3 rd, float pw){
  vec3 q = uPlanetInv * P;
  vec3 Lq = uPlanetInv * uSunDir;
  vec3 Vq = uPlanetInv * (-rd);
  float NL = dot(P, uSunDir);
  float NV = max(dot(P, -rd), 0.0);

  Surf s;
  if (uGas >= 0.999) gasSurface(q, s);
  else if (uGas <= 0.001) rockSurface(q, pw, s);
  else { Surf sa; Surf sb; rockSurface(q, pw, sa); gasSurface(q, sb); s = mixSurf(sa, sb, uGas); }

  vec3 betaE = uBetaR + uBetaM * 1.1;
  vec3 sunT = exp(-betaE * (uHatm * chapman(1.0 / uHatm, max(NL, 0.0))));
  float day = smoothstep(-0.04, 0.06, NL);
  vec3 E = uSunCol * sunT * day;

  // тень колец
  if (uRingA > 0.001){
    float dn = dot(uSunDir, uAxis);
    float tt = -dot(P, uAxis) / (abs(dn) < 1e-4 ? 1e-4 : dn);
    if (tt > 0.0){
      vec3 hp = P + uSunDir * tt;
      E *= 1.0 - 0.85 * ringProfile(length(hp), 0.004) * uRingA;
    }
  }

  // облака и их тень
  float cd = 0.0, csh = 0.0;
  vec3 cg = vec3(0.0);
  float ca = cos(uCloudAng), sa2 = sin(uCloudAng);
  bool hasCloud = (uCloud > 0.003) && (uGas < 0.999);
  if (hasCloud){
    vec3 qc = vec3(ca * q.x + sa2 * q.z, q.y, -sa2 * q.x + ca * q.z);
    cd = cloudField(qc, cg) * (1.0 - uGas);
    if (NL > -0.05){
      vec3 Lt = Lq - q * dot(Lq, q);
      vec3 q2 = normalize(q + Lt * 0.022);
      vec3 g2;
      csh = cloudField(vec3(ca * q2.x + sa2 * q2.z, q2.y, -sa2 * q2.x + ca * q2.z), g2) * (1.0 - uGas);
    }
  }

  float nl = max(dot(s.nrm, Lq), 0.0);
  float wrap = mix(nl, max(NL, 0.0), 0.25);
  float twi = smoothstep(-0.25, 0.25, NL);
  vec3 col = s.alb * (E * wrap * (1.0 - 0.6 * csh) + uAmb * twi);

  // блик звезды на океане
  vec3 Hv = normalize(Lq + Vq);
  float nh = max(dot(s.nrm, Hv), 0.0);
  float al = s.rough * s.rough;
  float a2 = al * al;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float Dg = a2 / (PI * dd * dd);
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(Vq, Hv), 0.0), 5.0);
  col += E * (s.spec * Dg * F * 0.25 * smoothstep(0.0, 0.15, nl) * (1.0 - csh));
  col += uAmb * (s.spec * 2.5 * pow(1.0 - NV, 4.0) * day);

  // свечение ночной стороны
  float night = 1.0 - smoothstep(-0.12, 0.1, NL);
  vec3 em = s.emis;
  em += uColCity * (s.city * night * 2.2);
  em += uColBio * (s.bio * night * 1.4);
  if (uAurora > 0.001){
    // овал сияния: тонкое волнистое кольцо у магнитного полюса с «занавесами»
    float wob = nzv(vec3(q.x * 2.6, uTime * 0.03, q.z * 2.6)) * 0.07;
    float da = abs(q.y) - 0.895 - wob;
    float band = exp(-da * da / 0.00034) + 0.35 * exp(-da * da / 0.004);
    float cur = clamp(nzv(vec3(q.x * 11.0, uTime * 0.07, q.z * 11.0)) * 2.4 + 0.45, 0.0, 1.0);
    float cur2 = clamp(nzv(vec3(q.x * 37.0, uTime * 0.16 + 5.0, q.z * 37.0)) * 2.0 + 0.6, 0.0, 1.0);
    em += uColAurora * (band * cur * cur * (0.35 + cur2) * uAurora * (0.2 + 0.8 * night) * 0.8);
  }
  col += em * (1.0 - 0.8 * cd);

  if (cd > 0.001){
    float NLc = NL + 0.035;
    vec3 sunTc = exp(-betaE * (uHatm * 0.7 * chapman(1.0 / uHatm, max(NLc, 0.0))));
    vec3 Ec = uSunCol * sunTc * smoothstep(-0.03, 0.08, NLc);
    vec3 Lqc = vec3(ca * Lq.x + sa2 * Lq.z, Lq.y, -sa2 * Lq.x + ca * Lq.z);
    float shade = clamp(0.8 - 0.22 * dot(cg, Lqc), 0.25, 1.15);
    vec3 cc = uColCloud * (Ec * ((0.2 + 0.8 * max(NLc, 0.0)) * shade) + uAmb * 1.5 * twi);
    col = mix(col, cc, cd * 0.97);
  }

  if (uBlueprint > 0.001) col = mix(col, holo(q, s, pw, NV), uBlueprint);
  return col;
}

/* ---------- спутники ---------- */
vec3 shadeMoon(vec3 n, vec3 P, float idx){
  vec3 x = n * 2.6 + vec3(idx * 7.3, 2.1, 4.4);
  vec4 f = fbmD(x, 4.0, 0.5);
  vec3 g = f.yzw - n * dot(f.yzw, n);
  vec3 nn = normalize(n - g * 0.45);
  float nl = max(dot(nn, uSunDir), 0.0) * smoothstep(-0.05, 0.1, dot(n, uSunDir));
  float b = dot(P, uSunDir);
  float d2 = dot(P, P) - b * b;
  float sh = (b < 0.0) ? smoothstep(0.97, 1.08, sqrt(max(d2, 0.0))) : 1.0;
  vec3 alb = uMoonCol * (0.55 + 0.9 * (f.x + 0.25));
  alb *= 0.7 + 0.3 * smoothstep(-0.1, 0.15, nzv(x * 0.6 + 3.0));
  return alb * uSunCol * (nl * sh) + alb * 0.004;
}

/* ---------- фон ---------- */
vec3 skyColor(vec3 rd){
  vec3 d = uSkyRot * rd;
  vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, acos(clamp(d.y, -1.0, 1.0)) * 0.31830989);
  vec4 s = textureLod(uSky, uv, 0.0);
  s *= s;
  float detail = 0.8 + 0.9 * nzv(d * 23.0);
  vec3 c = (uNebA * s.r + uNebB * s.g) * detail
         + vec3(0.55, 0.62, 0.82) * (s.b * 0.34)
         + vec3(0.92, 0.94, 1.0) * (s.a * 0.22 * (0.7 + 1.2 * nzv(d * 61.0)));
  return max(c, 0.0) * uNebI;
}

void main(){
  vec2 px = gl_FragCoord.xy - 0.5 * uRes - uShift;
  vec3 rd = normalize(vec3(px, -uFocal));
  vec3 ro = vec3(0.0, 0.0, uCamDist);

  float b = dot(ro, rd);
  float c0 = dot(ro, ro);
  float dp2 = c0 - b * b;
  float dp = sqrt(max(dp2, 0.0));
  float pwc = max(-b, 0.0) / uFocal;
  float cov = clamp((1.0 - dp) / max(pwc, 1e-6) + 0.5, 0.0, 1.0) * step(b, 0.0);
  bool hitA = (b < 0.0 && dp < uRa) || (c0 < uRa * uRa);
  float hA = sqrt(max(uRa * uRa - dp2, 0.0));
  float tA0 = max(-b - hA, 0.0);
  float tA1 = -b + hA;
  float tS = -b - sqrt(max(1.0 - dp2, 0.0));

  // --- фон и звезда ---
  vec3 col = skyColor(rd);
  float mu = dot(rd, uSunDir);
  if (mu > 0.9){
    float sd = length(cross(rd, uSunDir));
    col += uSunCol * ((1.0 - smoothstep(0.0068, 0.0086, sd)) * 40.0 + 0.00003 / (sd * sd + 0.00002));
  }

  // --- кольцо ---
  float tR = -1.0, aR = 0.0;
  vec3 cR = vec3(0.0);
  if (uRingA > 0.001){
    float dn = dot(rd, uAxis);
    if (abs(dn) > 1e-5){
      float t = -dot(ro, uAxis) / dn;
      if (t > 0.0){
        vec3 hp = ro + rd * t;
        float r = length(hp);
        if (r > uRingIn && r < uRingOut){
          float fw = t / uFocal / max(abs(dn), 0.03);
          float a = ringProfile(r, fw) * uRingA;
          float bs = dot(hp, uSunDir);
          float d2 = dot(hp, hp) - bs * bs;
          float sh = (bs < 0.0) ? smoothstep(0.97, 1.07, sqrt(max(d2, 0.0))) : 1.0;
          float sideL = dot(uSunDir, uAxis), sideV = -dn;
          float same = (sideL * sideV > 0.0) ? 1.0 : 0.0;
          float fwd = pow(max(mu, 0.0), 6.0);
          float lit = same * (0.5 + 0.3 * abs(sideL)) + (1.0 - same) * (0.3 * (1.0 - a) + 0.06) + fwd * 0.9;
          vec3 rc = uRingCol * (0.72 + 0.7 * nzv(vec3(r * 4.3, 8.5, 2.5)) + 0.25 * smoothstep(uRingIn, uRingOut, r));
          cR = rc * uSunCol * (sh * lit * 0.55) + rc * 0.003;
          tR = t; aR = a;
        }
      }
    }
  }

  // --- спутники ---
  float tM = 1e9, covM = 0.0;
  vec3 cM = vec3(0.0);
  for (int i = 0; i < 3; i++){
    vec4 mo = uMoon[i];
    if (mo.w <= 0.0005) continue;
    vec3 oc = ro - mo.xyz;
    float bb = dot(oc, rd);
    if (bb >= 0.0) continue;
    float dm2 = dot(oc, oc) - bb * bb;
    float dm = sqrt(max(dm2, 0.0));
    float pwm = -bb / uFocal;
    float cv = clamp((mo.w - dm) / pwm + 0.5, 0.0, 1.0);
    if (cv <= 0.0) continue;
    float t = -bb - sqrt(max(mo.w * mo.w - dm2, 0.0));
    if (t < tM){
      tM = t; covM = cv;
      vec3 Pm = ro + rd * t;
      cM = shadeMoon(normalize(Pm - mo.xyz), Pm, float(i));
    }
  }
  bool hasMoon = covM > 0.0;
  bool hasRing = tR > 0.0;
  bool ringBack = hasRing && hitA && (tR > tA0);
  bool moonBack = hasMoon && hitA && (tM > tA0);
  bool ringFront = hasRing && !ringBack;
  bool moonFront = hasMoon && !moonBack;

  if (cov < 1.0){
    if (ringBack && moonBack){
      if (tR > tM){ col = col * (1.0 - aR) + cR * aR; col = mix(col, cM, covM); }
      else { col = mix(col, cM, covM); col = col * (1.0 - aR) + cR * aR; }
    } else if (ringBack){ col = col * (1.0 - aR) + cR * aR; }
    else if (moonBack){ col = mix(col, cM, covM); }
  }

  // --- планета и её воздух ---
  if (hitA){
    float fade = 1.0 - uBlueprint;
    vec3 colMiss = col;
    if (cov < 1.0){
      vec3 T;
      vec3 ins = atmosphere(ro, rd, tA0, tA1, T);
      colMiss = col * mix(vec3(1.0), T, fade) + ins * fade;
      colMiss += uAccent * (uBlueprint * 0.5 * exp(-max(dp - 1.0, 0.0) * 60.0));
    }
    if (cov > 0.0){
      vec3 P = normalize(ro + rd * tS);
      float pws = max(tS, 0.0) / uFocal / max(dot(P, -rd), 0.08);
      vec3 surf = shadeSurface(P, rd, pws);
      vec3 T;
      vec3 ins = atmosphere(ro, rd, tA0, max(tS, tA0), T);
      vec3 colHit = surf * mix(vec3(1.0), T, fade) + ins * fade;
      col = mix(colMiss, colHit, cov);
    } else {
      col = colMiss;
    }
  }

  if (ringFront && moonFront){
    if (tR > tM){ col = col * (1.0 - aR) + cR * aR; col = mix(col, cM, covM); }
    else { col = mix(col, cM, covM); col = col * (1.0 - aR) + cR * aR; }
  } else if (ringFront){ col = col * (1.0 - aR) + cR * aR; }
  else if (moonFront){ col = mix(col, cM, covM); }

  outColor = vec4(enc(max(col, 0.0)), 1.0);
}`;

  /* ===================================================================== */
  /*  ЗВЁЗДЫ                                                                */
  /* ===================================================================== */
  S.starsVS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aDir;
layout(location = 1) in vec4 aCol;
uniform mat3  uSkyRotT;
uniform float uFocal;
uniform vec2  uShift;
uniform vec2  uRes;
uniform float uCamDist;
uniform float uRa;
uniform float uTime;
uniform float uPx;
uniform float uStarI;
uniform vec4  uMoon[3];
out vec4 vCol;
void main(){
  vec3 d = uSkyRotT * aDir.xyz;
  if (d.z > -0.05){ gl_Position = vec4(3.0, 3.0, 0.0, 1.0); gl_PointSize = 1.0; vCol = vec4(0.0); return; }
  vec2 px = uShift + uFocal * d.xy / (-d.z);
  gl_Position = vec4(px / (0.5 * uRes), 0.0, 1.0);
  // затмение планетой и её атмосферой
  float b = -uCamDist * d.z;
  float dp = sqrt(max(uCamDist * uCamDist - b * b, 0.0));
  float vis = smoothstep(1.0, max(uRa, 1.004), dp);
  for (int i = 0; i < 3; i++){
    vec4 mo = uMoon[i];
    if (mo.w <= 0.0005) continue;
    vec3 oc = vec3(0.0, 0.0, uCamDist) - mo.xyz;
    float bb = dot(oc, d);
    float dm = sqrt(max(dot(oc, oc) - bb * bb, 0.0));
    if (bb < 0.0) vis *= smoothstep(mo.w, mo.w * 1.15, dm);
  }
  float mag = aDir.w;
  float tw = 0.82 + 0.18 * sin(uTime * (0.6 + 2.6 * aCol.a) + aCol.a * 53.0);
  float I = uStarI * (0.16 + 1.6 * mag + 9.0 * mag * mag * mag) * tw * vis;
  float big = step(0.66, mag);
  vCol = vec4(aCol.rgb * I, big);
  gl_PointSize = max((1.5 + 2.4 * mag + big * 9.0 * mag) * uPx, 1.0);
}`;

  S.starsFS = `#version 300 es
precision highp float;
in vec4 vCol;
out vec4 outColor;
${CODEC}
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(p, p);
  float k = mix(5.0, 34.0, vCol.a);
  float core = exp(-d2 * k);
  float spike = vCol.a * 0.35 * (exp(-abs(p.x) * 5.0 - abs(p.y) * 40.0) + exp(-abs(p.y) * 5.0 - abs(p.x) * 40.0)) * (1.0 - smoothstep(0.6, 1.0, max(abs(p.x), abs(p.y))));
  vec3 c = vCol.rgb * (core + spike);
#ifdef LDR
  outColor = vec4(sqrt(clamp(c / 16.0, 0.0, 1.0)), 1.0);
#else
  outColor = vec4(c, 1.0);
#endif
}`;

  /* ===================================================================== */
  /*  НЕБО (запекается один раз в equirect-текстуру)                        */
  /* ===================================================================== */
  S.skyFS = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform vec2 uRes;
out vec4 outColor;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float lon = (uv.x - 0.5) * 6.2831853;
  float th = uv.y * 3.14159265;
  vec3 d = vec3(sin(th) * cos(lon), cos(th), sin(th) * sin(lon));
  vec3 gn = vec3(0.3403, 0.8518, -0.4004);
  float gl0 = dot(d, gn);
  vec3 x = d * 1.9 + 3.7;
  vec3 w = vec3(fbm(x * 1.1 + 1.7, 5.0, 0.5), fbm(x * 1.1 + 9.2, 5.0, 0.5), fbm(x * 1.1 + 4.4, 5.0, 0.5));
  float n1 = fbm(x * 1.6 + w * 3.2 + 2.0, 7.0, 0.55);
  float n2 = fbm(x * 1.25 - w * 3.6 + 11.0, 7.0, 0.55);
  float n3 = fbm(x * 4.0 + w * 2.0 + 21.0, 6.0, 0.55);
  float band = exp(-gl0 * gl0 * 7.0);
  float cA = pow(clamp(n1 * 2.6 + 0.30, 0.0, 1.0), 4.0) * (0.12 + 1.2 * band);
  float cB = pow(clamp(n2 * 2.6 + 0.28, 0.0, 1.0), 4.0) * (0.10 + 1.0 * exp(-gl0 * gl0 * 2.5));
  float dust = smoothstep(-0.05, 0.3, n3 + 0.15 * w.x);
  float mw = band * (0.35 + 0.65 * smoothstep(-0.3, 0.4, n2)) * (1.0 - 0.75 * dust * exp(-gl0 * gl0 * 30.0));
  float pwd = band * band * (0.4 + 0.6 * smoothstep(-0.2, 0.3, n1));
  outColor = sqrt(clamp(vec4(cA, cB, mw, pwd), 0.0, 1.0));
}`;

  /* ===================================================================== */
  /*  БЛУМ                                                                  */
  /* ===================================================================== */
  S.downFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2  uTexel;     // 1 / размер источника
uniform vec2  uOutRes;
uniform float uPrefilter;
uniform float uThreshold;
uniform float uKnee;
out vec4 outColor;
${CODEC}
vec3 pre(vec3 c){
  c = min(c, vec3(24.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  return c * (max(soft, br - uThreshold) / max(br, 1e-4));
}
void main(){
  vec2 uv = gl_FragCoord.xy / uOutRes;
  vec2 h = uTexel;
  vec3 a = dec(texture(uTex, uv).rgb);
  vec3 b = dec(texture(uTex, uv + vec2(-h.x, -h.y)).rgb);
  vec3 c = dec(texture(uTex, uv + vec2( h.x, -h.y)).rgb);
  vec3 d = dec(texture(uTex, uv + vec2(-h.x,  h.y)).rgb);
  vec3 e = dec(texture(uTex, uv + vec2( h.x,  h.y)).rgb);
  vec3 r;
  if (uPrefilter > 0.5){
    a = pre(a); b = pre(b); c = pre(c); d = pre(d); e = pre(e);
    // усреднение по Karis — гасит мерцание от ярких точек
    float wa = 4.0 / (1.0 + max(a.r, max(a.g, a.b)));
    float wb = 1.0 / (1.0 + max(b.r, max(b.g, b.b)));
    float wc = 1.0 / (1.0 + max(c.r, max(c.g, c.b)));
    float wd = 1.0 / (1.0 + max(d.r, max(d.g, d.b)));
    float we = 1.0 / (1.0 + max(e.r, max(e.g, e.b)));
    r = (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
  } else {
    r = (a * 4.0 + b + c + d + e) * 0.125;
  }
  outColor = vec4(enc(r), 1.0);
}`;

  S.upFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;   // более размытый уровень
uniform sampler2D uCur;   // текущий уровень
uniform vec2  uTexel;     // 1 / размер uTex
uniform vec2  uOutRes;
uniform float uSpread;
out vec4 outColor;
${CODEC}
void main(){
  vec2 uv = gl_FragCoord.xy / uOutRes;
  vec2 h = uTexel * 0.5;
  vec3 s = dec(texture(uTex, uv + vec2(-h.x * 2.0, 0.0)).rgb);
  s += dec(texture(uTex, uv + vec2(-h.x, h.y)).rgb) * 2.0;
  s += dec(texture(uTex, uv + vec2(0.0, h.y * 2.0)).rgb);
  s += dec(texture(uTex, uv + vec2(h.x, h.y)).rgb) * 2.0;
  s += dec(texture(uTex, uv + vec2(h.x * 2.0, 0.0)).rgb);
  s += dec(texture(uTex, uv + vec2(h.x, -h.y)).rgb) * 2.0;
  s += dec(texture(uTex, uv + vec2(0.0, -h.y * 2.0)).rgb);
  s += dec(texture(uTex, uv + vec2(-h.x, -h.y)).rgb) * 2.0;
  s /= 12.0;
  vec3 cur = dec(texture(uCur, uv).rgb);
  outColor = vec4(enc(cur + s * uSpread), 1.0);
}`;

  /* ===================================================================== */
  /*  ФИНАЛ                                                                 */
  /* ===================================================================== */
  S.finalFS = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2  uRes;
uniform float uExposure;
uniform float uBloomI;
uniform float uTime;
uniform float uGrain;
uniform float uVig;
uniform float uCA;
uniform float uFlare;
uniform float uAspect;
uniform float uFlash;
uniform float uFade;
uniform vec2  uSunPos;
uniform vec3  uSunVis;
out vec4 outColor;
${CODEC}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 flare(vec2 uv){
  vec2 p = uv - uSunPos;
  p.x *= uAspect;
  float d = length(p);
  vec3 f = uSunVis * (0.22 * exp(-d * 7.0) + 0.55 * exp(-d * 38.0) + 0.012 / (d + 0.012));
  // анаморфный штрих
  f += uSunVis * vec3(0.45, 0.68, 1.0) * (0.42 * exp(-abs(p.y) * 150.0) * exp(-abs(p.x) * 2.0));
  f += uSunVis * vec3(0.45, 0.68, 1.0) * (0.10 * exp(-abs(p.y) * 28.0) * exp(-abs(p.x) * 3.5));
  // лучи
  float ang = atan(p.y, p.x);
  float sb = pow(abs(sin(ang * 3.0 + 0.3)), 28.0) + 0.6 * pow(abs(sin(ang * 7.0 + 1.1)), 60.0);
  f += uSunVis * (sb * 0.16 * exp(-d * 5.0));
  // паразитные блики объектива
  vec2 sc = uSunPos - 0.5;
  vec2 q = uv - 0.5;
  vec2 as = vec2(uAspect, 1.0);
  float g1 = length((q + sc * 0.35) * as);
  float g2 = length((q + sc * 0.9) * as);
  float g3 = length((q - sc * 0.45) * as);
  float g4 = length((q + sc * 1.6) * as);
  f += uSunVis * vec3(0.3, 0.6, 1.0) * (0.016 * (1.0 - smoothstep(0.03, 0.085, g1)));
  f += uSunVis * vec3(1.0, 0.5, 0.3) * (0.014 * (1.0 - smoothstep(0.03, 0.15, g2)));
  f += uSunVis * vec3(0.5, 1.0, 0.7) * (0.014 * (1.0 - smoothstep(0.012, 0.04, g3)));
  f += uSunVis * vec3(0.7, 0.5, 1.0) * (0.012 * (smoothstep(0.2, 0.235, g4) - smoothstep(0.24, 0.275, g4)));
  return f * uFlare;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  vec2 o = c * (r2 * uCA);
  vec3 col;
  col.r = dec(texture(uScene, uv - o).rgb).r;
  col.g = dec(texture(uScene, uv).rgb).g;
  col.b = dec(texture(uScene, uv + o).rgb).b;
  vec3 bl;
  bl.r = dec(texture(uBloom, uv - o * 1.5).rgb).r;
  bl.g = dec(texture(uBloom, uv).rgb).g;
  bl.b = dec(texture(uBloom, uv + o * 1.5).rgb).b;
  col += bl * uBloomI;
  col += flare(uv);
  col += vec3(1.0, 0.94, 0.86) * (uFlash * uFlash * 14.0 * (0.35 + exp(-r2 * 6.0)));
  col *= uExposure;
  vec2 cv = c * vec2(mix(1.0, uAspect, 0.35), 1.0);
  col *= 1.0 - uVig * smoothstep(0.25, 1.05, length(cv) * 1.25);
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  float n = hash12(gl_FragCoord.xy + fract(uTime * 7.13) * vec2(311.7, 173.3));
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += (n - 0.5) * uGrain * (0.45 + 0.9 * (1.0 - lum));
  col *= uFade;
  outColor = vec4(col, 1.0);
}`;
})();
