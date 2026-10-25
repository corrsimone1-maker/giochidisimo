/* =====================================================================
   TRACCIA: «Guarda da fuori». Una tavola risolta su una superficie
   incollata, avvolta sulla superficie vera in R³ (e per Klein e RP² anche
   in R⁴, ruotata e proiettata). La tavola (x da 0 a w, y da 0 a h) diventa
   s = x/w, t = y/h; ogni forma qui sotto rispetta gli stessi incollamenti
   del motore (lo controlla prove/traccia.test.js):
     cilindro  (1, t) ~ (0, t)                       arrotolato senza deformare
     mobius    (1, t) ~ (0, 1 − t)                   nastro allungato: con le nostre
               proporzioni un nastro di carta non esiste (Schwartz 2025: serve un
               rapporto lunghezza/larghezza > √3), quindi le caselle diventano rettangoli
     toro      (1, t) ~ (0, t), (s, 1) ~ (s, 0)      ciambella (il toro piatto non sta
               in R³ senza deformarsi)
     klein     (1, t) ~ (0, t), (s, 1) ~ (1 − s, 0)  R³: la bottiglia, che si
               autointerseca lungo un cerchio; R⁴: embedding vero
     rp2       (1, t) ~ (0, 1 − t), (s, 1) ~ (1 − s, 0): il quadrato è un disco col
               bordo incollato per antipodi. R³: superficie di Boy (parametrizzazione di
               Bryant–Kusner); R⁴: (x² − y², xy, xz, yz) sulla semisfera
     sfera     (s, 0) ~ (1, 1 − s), (0, t) ~ (1 − t, 1): la busta. Con u = s + t − 1 e
               v = s − t i due incollamenti diventano (u, v) ~ (−u, v) sul bordo, quindi
               ogni riga v = costante è un cerchio: v dà la latitudine (gli angoli piegati
               sono i poli) e u la longitudine
     bitoro    la L (A in basso a sinistra, B a destra, C in alto, L = [a, c]) su una palla
               con due manici, una costruzione a pezzi (vedi bitoro() qui sotto): A copre la
               palla tranne quattro foglie che si toccano in cima, nel punto singolare; le
               foglie a est e a ovest sono le estremità di B, che è il manico sopra, quelle a
               nord e a sud le estremità di C, il manico sotto. I bordi in comune si
               costruiscono con le stesse curve dalle due parti: gli incollamenti sono esatti.
   La parte di calcolo (FORME, punto3, punto4) non usa la pagina; il
   visualizzatore WebGL (Vista) è scritto a mano, senza librerie, così
   funziona anche senza connessione.
   ===================================================================== */
(function (root) {
  'use strict';
  const { cos, sin, PI, sqrt, hypot } = Math;

  /* quadrato [-1,1]² → disco, dispari (punti opposti → punti opposti): il bordo va sul cerchio */
  function disco(s, t) {
    const X = 2 * s - 1, Y = 2 * t - 1;
    return [X * sqrt(Math.max(0, 1 - Y * Y / 2)), Y * sqrt(Math.max(0, 1 - X * X / 2))];
  }
  function boy(a, b) {
    // Bryant–Kusner: w nel disco unitario, i punti opposti del bordo vanno nello stesso punto
    const mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
    const div = (p, q) => { const n = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / n, (p[1] * q[0] - p[0] * q[1]) / n]; };
    const w = [a, b], w2 = mul(w, w), w3 = mul(w2, w), w4 = mul(w2, w2), w6 = mul(w3, w3);
    const den = [w6[0] + sqrt(5) * w3[0] - 1, w6[1] + sqrt(5) * w3[1]];
    const g1 = -1.5 * div(mul(w, [1 - w4[0], -w4[1]]), den)[1];
    const g2 = -1.5 * div(mul(w, [1 + w4[0], w4[1]]), den)[0];
    const g3 = div([1 + w6[0], w6[1]], den)[1] - 0.5;
    const g = g1 * g1 + g2 * g2 + g3 * g3;
    return [g1 / g, g3 / g, g2 / g];
  }
  function bottiglia(u, v) {
    const cu = cos(u), su = sin(u), cv = cos(v), sv = sin(v);
    const x = -2 / 15 * cu * (3 * cv - 30 * su + 90 * cu ** 4 * su - 60 * cu ** 6 * su + 5 * cu * cv * su);
    const y = -1 / 15 * su * (3 * cv - 3 * cu ** 2 * cv - 48 * cu ** 4 * cv + 48 * cu ** 6 * cv - 60 * su + 5 * cu * cv * su - 5 * cu ** 3 * cv * su - 80 * cu ** 5 * cv * su + 80 * cu ** 7 * cv * su);
    const z = 2 / 15 * (3 + 5 * cu * su) * sv;
    return [x, -y, z];
  }

  function busta(s, t) {
    const u = s + t - 1, v = s - t, L = 1 - Math.abs(v), th = L > 1e-12 ? PI * u / L : 0;
    const r = cos(PI * v / 2);
    return [r * cos(th), sin(PI * v / 2), -r * sin(th)];   // il segno: la tavola si legge da fuori, non allo specchio
  }

  /* ---------- Bitoro: palla con due manici ----------
     Assi con y in alto. Sulla palla (raggio 1) θ è l'angolo dal polo nord, che è il punto singolare, e φ l'azimut.
     Intorno al polo i 12 angoli delle caselle (6π) diventano un giro solo: le quattro foglie (B, C, B, C) si prendono
     90° ciascuna, gli angoli di A diventano punte sottili tra una foglia e l'altra. */
  const BT = { thM: 2.0, thC: 0.95, rho: 0.3, R: 1.5, t1: 0.24 };
  const palla = (th, ph) => [sin(th) * cos(ph), cos(th), sin(th) * sin(ph)];
  const pscal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const pvett = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const versore = a => { const n = hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  // A: il quadrato (U verso destra, V verso l'alto, in [−1, 1]) sulla palla. Per ogni direzione φ del quadrato
  // il raggio va dal polo sud (centro) al bordo della foglia θ_b(φ), che vale 0 sulle diagonali: gli angoli al polo nord.
  function bitoroA(U, V) {
    const r = Math.max(Math.abs(U), Math.abs(V));
    if (r < 1e-12) return [0, -1, 0];
    const ph = Math.atan2(V, U), thB = BT.thM * Math.abs(cos(2 * ph));
    return palla(PI - (PI - thB) * r, ph);
  }
  // il colletto di un manico, sulla palla: nella carta azimutale attorno al centro c della foglia, il punto q del
  // petalo (mu = 0) scende lungo il suo raggio fino al cerchio del piede, di raggio angolare rho (mu = 1)
  function colletto(c, q, mu) {
    if (mu <= 0) return q;
    const cq = Math.min(1, Math.max(-1, pscal(q, c))), al = Math.acos(cq);
    const d = versore([q[0] - cq * c[0], q[1] - cq * c[1], q[2] - cq * c[2]]), rr = (1 - mu) * al + mu * BT.rho;
    return [cos(rr) * c[0] + sin(rr) * d[0], cos(rr) * c[1] + sin(rr) * d[1], cos(rr) * c[2] + sin(rr) * d[2]];
  }
  // angolo, nel piano (e1, e2), della direzione dal centro c del piede verso il petalo; decresce da a0 ad a0 − 2π
  function angoloPiede(c, q, e1, e2, a0, sg) {
    const cq = pscal(q, c), d = [q[0] - cq * c[0], q[1] - cq * c[1], q[2] - cq * c[2]];
    const raw = Math.atan2(pscal(d, e2), pscal(d, e1));
    let del = ((a0 - raw) % (2 * PI) + 2 * PI) % (2 * PI);
    if (sg > 0.5 && del < 0.5) del += 2 * PI;
    if (sg < 0.5 && del > 2 * PI - 0.5) del -= 2 * PI;
    return a0 - del;
  }
  // un manico: m = { c0, c1, p0(σ), p1(σ), oriz, thA, thB, e2, a0 }. t va da 0 (foglia c0) a 1 (foglia c1), σ fa il giro.
  function manico(t, sg, m) {
    const t1 = BT.t1, rho = BT.rho;
    if (t <= t1) return colletto(m.c0, m.p0(sg), t / t1);
    if (t >= 1 - t1) return colletto(m.c1, m.p1(sg), (1 - t) / t1);
    const tau = (t - t1) / (1 - 2 * t1);
    const centro = x => {
      const th = m.thA + (m.thB - m.thA) * x, rr = cos(rho) + (BT.R - cos(rho)) * Math.sqrt(Math.max(0, sin(PI * x)));
      return [rr * (sin(th) * m.oriz[0]), rr * cos(th), rr * (sin(th) * m.oriz[2])];
    };
    const C = centro(tau), e = 1e-4;
    let T;
    if (tau < e) T = m.c0; else if (tau > 1 - e) T = m.c1.map(x => -x);
    else { const a = centro(tau - e), b = centro(tau + e); T = versore([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); }
    const e1 = versore(pvett(T, m.e2)), e1a = versore(pvett(m.c0, m.e2)), e1b = versore(pvett(m.c1.map(x => -x), m.e2));
    const b0 = angoloPiede(m.c0, m.p0(sg), e1a, m.e2, m.a0, sg), b1 = angoloPiede(m.c1, m.p1(sg), e1b, m.e2, m.a0, sg);
    const w = tau * tau * (3 - 2 * tau), be = (1 - w) * b0 + w * b1, r = sin(rho);
    return [C[0] + r * (cos(be) * e1[0] + sin(be) * m.e2[0]), C[1] + r * (cos(be) * e1[1] + sin(be) * m.e2[1]), C[2] + r * (cos(be) * e1[2] + sin(be) * m.e2[2])];
  }
  // B, manico sopra: da est (bordo destro di A) a ovest (bordo sinistro di A), nel piano xy
  const MB = { c0: palla(BT.thC, 0), c1: palla(BT.thC, PI), p0: sg => bitoroA(1, 1 - 2 * sg), p1: sg => bitoroA(-1, 1 - 2 * sg),
    oriz: [1, 0, 0], thA: BT.thC, thB: -BT.thC, e2: [0, 0, 1], a0: PI };
  // C, manico sotto: da nord (bordo di sopra di A) a sud (bordo di sotto), nel piano yz, passando sotto la palla
  const MC = { c0: palla(BT.thC, PI / 2), c1: palla(BT.thC, 3 * PI / 2), p0: sg => bitoroA(2 * sg - 1, 1), p1: sg => bitoroA(2 * sg - 1, -1),
    oriz: [0, 0, 1], thA: BT.thC, thB: 2 * PI - BT.thC, e2: [1, 0, 0], a0: 0 };
  function bitoro(s, t, p) {
    const [a, c] = p.L, x = s * p.w, y = t * p.h;
    if (x <= a && y >= c) return bitoroA(2 * x / a - 1, 1 - 2 * (y - c) / (p.h - c));
    if (x >= a && y >= c) return manico((x - a) / (p.w - a), (y - c) / (p.h - c), MB);
    if (x <= a && y <= c) return manico(1 - y / c, x / a, MC);
    return null;                                   // il blocco che manca alla L
  }
  const fuoriL = (s, t, p) => p.L && s * p.w > p.L[0] + 1e-9 && t * p.h < p.L[1] - 1e-9;

  const FORME = {
    cilindro: {
      r3: (s, t, p) => { const R = p.w / (2 * PI), th = 2 * PI * s; return [R * cos(th), (0.5 - t) * p.h, -R * sin(th)]; },   // da fuori, non allo specchio
      nota3: 'Il cilindro: i due lati con la freccia verde sono diventati la stessa linea, e la tavola non si deforma.'
    },
    mobius: {
      r3: (s, t) => { const th = 2 * PI * s, sg = 1 - 2 * t, W = 0.55, A = 1 + W * sg * cos(th / 2); return [A * cos(th), W * sg * sin(th / 2), A * sin(th)]; },
      nota3: 'Il nastro di Möbius, allungato: con le proporzioni della tavola un nastro di carta non si può fare (Schwartz, 2025: serve un rapporto lunghezza/larghezza oltre √3).'
    },
    toro: {
      r3: (s, t, p) => { const r = 1, R = Math.max(p.w / p.h, 1.7), th = 2 * PI * s, ph = 2 * PI * t, A = R + r * cos(ph); return [A * cos(th), r * sin(ph), A * sin(th)]; },
      nota3: 'La ciambella: verso il buco le caselle si stringono, perché un toro piatto non entra in R³ senza deformarsi.'
    },
    klein: {
      r3: (s, t) => bottiglia(PI * t, 2 * PI * s - PI / 2),
      r4: (s, t) => { const u = 2 * PI * t, v = 2 * PI * s, R = 2, r = 1, A = R + r * cos(v); return [A * cos(u), A * sin(u), r * sin(v) * cos(u / 2), r * sin(v) * sin(u / 2)]; },
      nota3: 'La bottiglia di Klein in R³: per chiudersi deve passare attraverso sé stessa. L’autointersezione è il cerchio dove il collo entra nel fianco.',
      nota4: 'In R⁴ non si autointerseca: il colore è la quarta coordinata. Dove due fogli sembrano incrociarsi hanno colori diversi, quindi non si toccano.'
    },
    sfera: {
      r3: (s, t) => busta(s, t),
      nota3: 'La sfera: la busta chiusa. I quattro lati della tavola sono finiti tutti sullo stesso meridiano, i due angoli piegati sono i poli e la diagonale tra loro è il meridiano opposto.'
    },
    bitoro: {
      r3: (s, t, p) => bitoro(s, t, p),
      dist: 2.3,                                     // è lunga in verticale: la camera si avvicina un po'
      nota3: 'Il bitoro: una palla con due manici. La palla è il blocco in basso a sinistra della L, il manico sopra è il blocco a destra, quello sotto il blocco in alto. In cima si toccano le quattro foglie: è il punto singolare, dove i 6π di angolo si stringono in un giro solo.'
    },
    rp2: {
      r3: (s, t) => boy(...disco(s, t)),
      // semisfera sopra il disco: 1 − a² − b² = (1 − X²)(1 − Y²), che sul bordo vale esattamente 0
      r4: (s, t) => { const [a, b] = disco(s, t), X = 2 * s - 1, Y = 2 * t - 1, z = sqrt(Math.max(0, (1 - X * X) * (1 - Y * Y))); return [a * a - b * b, 2 * a * b, 2 * a * z, 2 * b * z]; },
      nota3: 'Il piano proiettivo in R³: la superficie di Boy. Si autointerseca lungo una curva chiusa con tre anelli, che si incontrano in un punto triplo.',
      nota4: 'In R⁴ il piano proiettivo non si autointerseca: il colore è la quarta coordinata. Dove due fogli sembrano incrociarsi hanno colori diversi.'
    }
  };
  const punto3 = (sup, s, t, p) => FORME[sup].r3(s, t, p);
  const punto4 = (sup, s, t, p) => FORME[sup].r4(s, t, p);
  const ha4 = sup => !!(FORME[sup] && FORME[sup].r4);

  const V3 = { FORME, punto3, punto4, ha4, disco, fuoriL, BT };
  if (typeof module !== 'undefined' && module.exports) { module.exports = V3; return; }
  root.V3 = V3;
  if (typeof document === 'undefined') return;

  /* ---------------- Visualizzatore WebGL ---------------- */
  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUV; attribute float aW;
uniform mat4 uP; uniform mat4 uV;
varying vec2 vUV; varying vec3 vN; varying float vW;
void main(){ vUV = aUV; vW = aW; vN = mat3(uV) * aNor; gl_Position = uP * uV * vec4(aPos, 1.0); }`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform float uTinta;
varying vec2 vUV; varying vec3 vN; varying float vW;
void main(){
  vec3 c = texture2D(uTex, vUV).rgb;
  vec3 n = normalize(vN);
  float l = 0.38 + 0.62 * abs(dot(n, normalize(vec3(0.35, 0.55, 0.75))));
  if (uTinta > 0.5) { vec3 a = vec3(0.435, 0.839, 0.769), b = vec3(0.769, 0.659, 1.0); c = mix(c, mix(a, b, clamp(vW * 0.5 + 0.5, 0.0, 1.0)), 0.42); }
  gl_FragColor = vec4(c * l, 1.0);
}`;

  function mat4mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function prospettiva(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
  function daQuat(q, dist) {
    const [x, y, z, w] = q, o = new Float32Array(16);
    o[0] = 1 - 2 * (y * y + z * z); o[1] = 2 * (x * y + z * w); o[2] = 2 * (x * z - y * w);
    o[4] = 2 * (x * y - z * w); o[5] = 1 - 2 * (x * x + z * z); o[6] = 2 * (y * z + x * w);
    o[8] = 2 * (x * z + y * w); o[9] = 2 * (y * z - x * w); o[10] = 1 - 2 * (x * x + y * y);
    o[14] = -dist; o[15] = 1;
    return o;
  }
  function qmul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
  function qasse(ax, ay, az, ang) { const n = hypot(ax, ay, az) || 1, s = sin(ang / 2); return [ax / n * s, ay / n * s, az / n * s, cos(ang / 2)]; }
  const Q0 = () => qmul(qasse(1, 0, 0, 0.42), qasse(0, 1, 0, -0.5));

  class Vista {
    constructor(canvas) {
      this.c = canvas;
      const gl = this.gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
      if (!gl) return;
      const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const pr = this.pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      gl.useProgram(pr);
      this.loc = { aPos: gl.getAttribLocation(pr, 'aPos'), aNor: gl.getAttribLocation(pr, 'aNor'), aUV: gl.getAttribLocation(pr, 'aUV'), aW: gl.getAttribLocation(pr, 'aW'),
        uP: gl.getUniformLocation(pr, 'uP'), uV: gl.getUniformLocation(pr, 'uV'), uTex: gl.getUniformLocation(pr, 'uTex'), uTinta: gl.getUniformLocation(pr, 'uTinta') };
      this.buf = { pos: gl.createBuffer(), nor: gl.createBuffer(), uv: gl.createBuffer(), w: gl.createBuffer(), idx: gl.createBuffer() };
      this.tex = gl.createTexture();
      this.q = Q0(); this.dist = 2.9; this.giro = true; this.alfa = 0; this.anima4 = true;
      this.dita = new Map(); this.ultimoTocco = 0;
      this.gesti();
    }
    get ok() { return !!this.gl; }
    /* tavola: { p, immagine (canvas o img), sup }, modo: 'r3' | 'r4' */
    carica(p, immagine, modo) {
      const gl = this.gl; if (!gl) return;
      this.p = p; this.sup = p.sup; this.modo = modo || 'r3';
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, immagine);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.griglia();
      this.q = Q0(); this.dist = this.dist0 = (FORME[this.sup] && FORME[this.sup].dist) || 2.9; this.giro = true;
    }
    imposta(modo) { this.modo = modo; this.griglia(); }
    griglia() {
      const gl = this.gl, p = this.p;
      const nx = this.nx = Math.max(72, 30 * p.w), ny = this.ny = Math.max(56, 30 * p.h);
      const nv = (nx + 1) * (ny + 1);
      this.uv = new Float32Array(nv * 2); this.pos = new Float32Array(nv * 3); this.nor = new Float32Array(nv * 3); this.w4 = new Float32Array(nv);
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const k = j * (nx + 1) + i; this.uv[2 * k] = i / nx; this.uv[2 * k + 1] = j / ny; }
      const idx = new Uint16Array(nx * ny * 6); let n = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        if (fuoriL((i + 0.5) / nx, (j + 0.5) / ny, p)) continue;     // il blocco che manca alla L del bitoro
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d;
      }
      this.nIdx = n;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.uv); gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
      // scala: raggio 1 (in R⁴ si misura una volta sola, così la figura non pulsa mentre gira)
      this.scala = 1; this.centro = [0, 0, 0, 0];
      const pts = [];
      for (let j = 0; j <= ny; j += 4) for (let i = 0; i <= nx; i += 4) {
        if (fuoriL(i / nx, j / ny, p)) continue;
        pts.push(this.modo === 'r4' ? punto4(this.sup, i / nx, j / ny, p) : punto3(this.sup, i / nx, j / ny, p));
      }
      const dim = pts[0].length, c = new Array(dim).fill(0);
      for (const q of pts) for (let k = 0; k < dim; k++) c[k] += q[k] / pts.length;
      let r = 0; for (const q of pts) r = Math.max(r, hypot(...q.map((x, k) => x - c[k])));
      this.centro = c.concat([0]).slice(0, 4); this.scala = 1 / (r || 1);
      this.posizioni();
    }
    posizioni() {
      const { nx, ny, p } = this, pos = this.pos, w4 = this.w4, c = this.centro, sc = this.scala;
      const ca = cos(this.alfa), sa = sin(this.alfa), cb = cos(this.alfa * 0.61), sb = sin(this.alfa * 0.61);
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const k = j * (nx + 1) + i, s = i / nx, t = j / ny;
        if (this.modo === 'r4') {
          let [x, y, z, w] = punto4(this.sup, s, t, p).map((v, m) => (v - c[m]) * sc);
          // rotazione nei piani (x, w) e (y, w), poi proiezione: si toglie w, che resta come colore
          [x, w] = [x * ca - w * sa, x * sa + w * ca];
          [y, w] = [y * cb - w * sb, y * sb + w * cb];
          pos[3 * k] = x; pos[3 * k + 1] = y; pos[3 * k + 2] = z; w4[k] = w * 1.6;
        } else {
          const q = punto3(this.sup, s, t, p) || c;      // fuori dalla L: punto qualunque, non è in nessun triangolo
          pos[3 * k] = (q[0] - c[0]) * sc; pos[3 * k + 1] = (q[1] - c[1]) * sc; pos[3 * k + 2] = (q[2] - c[2]) * sc; w4[k] = 0;
        }
      }
      // normali dalle facce (la luce usa |n·l|: le due facce si vedono uguali)
      const nor = this.nor; nor.fill(0);
      const acc = (a, b, d) => {
        const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
        const vx = pos[3 * d] - pos[3 * a], vy = pos[3 * d + 1] - pos[3 * a + 1], vz = pos[3 * d + 2] - pos[3 * a + 2];
        const nx_ = uy * vz - uz * vy, ny_ = uz * vx - ux * vz, nz_ = ux * vy - uy * vx;
        for (const m of [a, b, d]) { nor[3 * m] += nx_; nor[3 * m + 1] += ny_; nor[3 * m + 2] += nz_; }
      };
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, cc = a + nx + 1, d = cc + 1; acc(a, cc, b); acc(b, cc, d); }
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pos); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.nor); gl.bufferData(gl.ARRAY_BUFFER, nor, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.w); gl.bufferData(gl.ARRAY_BUFFER, w4, gl.DYNAMIC_DRAW);
    }
    disegna() {
      const gl = this.gl, c = this.c, L = this.loc;
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      gl.viewport(0, 0, W, H);
      gl.clearColor(0.051, 0.153, 0.278, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.useProgram(this.pr);
      const lega = (b, loc, n) => { if (loc < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
      lega(this.buf.pos, L.aPos, 3); lega(this.buf.nor, L.aNor, 3); lega(this.buf.uv, L.aUV, 2); lega(this.buf.w, L.aW, 1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf.idx);
      // in verticale l'angolo di vista vale per la larghezza, così la figura entra tutta
      const asp = W / Math.max(1, H), fov = asp < 1 ? 2 * Math.atan(Math.tan(0.375) / asp) : 0.75;
      gl.uniformMatrix4fv(L.uP, false, prospettiva(fov, asp, 0.1, 50));
      gl.uniformMatrix4fv(L.uV, false, daQuat(this.q, this.dist));
      gl.uniform1f(L.uTinta, this.modo === 'r4' ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(L.uTex, 0);
      gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_SHORT, 0);
    }
    avvia(cambioAlfa) {
      this.attiva = true; let prima = performance.now();
      const passo = ora => {
        if (!this.attiva) return;
        const dt = Math.min(0.05, (ora - prima) / 1000); prima = ora;
        if (this.giro) this.q = qmul(qasse(0, 1, 0, dt * 0.35), this.q);
        if (this.modo === 'r4' && this.anima4) { this.alfa = (this.alfa + dt * 0.45) % (2 * PI); this.posizioni(); cambioAlfa && cambioAlfa(this.alfa); }
        this.disegna();
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }
    ferma() { this.attiva = false; }
    impostaAlfa(a) { this.alfa = a; if (this.modo === 'r4') this.posizioni(); }
    gesti() {
      const c = this.c;
      const giu = e => {
        e.preventDefault(); this.giro = false;
        try { c.setPointerCapture(e.pointerId); } catch (_) {}
        this.dita.set(e.pointerId, [e.clientX, e.clientY]);
        if (this.dita.size === 1) {
          const ora = performance.now();
          if (ora - this.ultimoTocco < 300) { this.q = Q0(); this.dist = this.dist0 || 2.9; }   // doppio tocco: vista iniziale
          this.ultimoTocco = ora;
        }
      };
      const muovi = e => {
        if (!this.dita.has(e.pointerId)) return;
        e.preventDefault();
        const prima = this.dita.get(e.pointerId), ora = [e.clientX, e.clientY];
        if (this.dita.size === 1) {
          const dx = ora[0] - prima[0], dy = ora[1] - prima[1], len = hypot(dx, dy);
          if (len > 0) this.q = qmul(qasse(dy, dx, 0, len * 0.009), this.q);
        } else if (this.dita.size === 2) {
          const altri = [...this.dita.entries()].find(([id]) => id !== e.pointerId)[1];
          const d0 = hypot(prima[0] - altri[0], prima[1] - altri[1]), d1 = hypot(ora[0] - altri[0], ora[1] - altri[1]);
          if (d0 > 0 && d1 > 0) this.dist = Math.min(7, Math.max(1.5, this.dist * d0 / d1));
        }
        this.dita.set(e.pointerId, ora);
      };
      const su = e => { this.dita.delete(e.pointerId); };
      c.addEventListener('pointerdown', giu);
      c.addEventListener('pointermove', muovi);
      c.addEventListener('pointerup', su); c.addEventListener('pointercancel', su);
      c.addEventListener('wheel', e => { e.preventDefault(); this.giro = false; this.dist = Math.min(7, Math.max(1.5, this.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
    }
  }
  root.Vista3D = Vista;
})(typeof self !== 'undefined' ? self : this);
