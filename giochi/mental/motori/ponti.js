/* =====================================================================
   MENTAL · PONTI (alla Hashiwokakero)
   Isole con un numero. Si collegano con ponti dritti, in orizzontale o in verticale, tra isole che si
   vedono (nessuna isola in mezzo). Tra due isole al massimo due ponti; i ponti non si incrociano.
   Il numero di un'isola dice quanti ponti partono da lei. Alla fine tutte le isole devono essere
   collegate tra loro, in un unico gruppo.

   Dati: { w, h, isole: [[i, numero]] }
   Stato: { x: [ponti per ogni collegamento possibile, nell'ordine di archi(p)] }

   Tecniche del risolutore «umano»:
     capacita    i conti di un'isola: se le altre strade non bastano, su questa servono per forza
                 dei ponti (e se ne bastano già abbastanza, non ne servono altri);
     incroci     un ponte sicuro taglia la strada ai ponti che lo incrocerebbero;
     isolamento  un gruppo di isole già tutte complete e chiuso in sé non va bene finché ne restano
                 fuori altre: certi ponti non si possono fare;
     ipotesi     «se qui ci fosse un ponte…»: con le tecniche sopra si arriva a una contraddizione.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  capacita: { nome: 'I conti dell’isola', descr: 'Se le altre strade non bastano a fare il numero, su questa servono per forza dei ponti.', peso: 1 },
  incroci: { nome: 'Incroci', descr: 'Un ponte sicuro taglia la strada a quelli che lo incrocerebbero.', peso: 1 },
  isolamento: { nome: 'Niente isole chiuse', descr: 'Un gruppo di isole complete e chiuso in sé lascerebbe fuori le altre: quel ponte non va.', peso: 3 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se qui ci fosse un ponte…»: si arriva a una contraddizione, quindi non va.', peso: 6 }
};

/* Collegamenti possibili tra isole che si vedono: { a, b (indici in p.isole), celle (in mezzo), orizz } */
const cacheArchi = new Map();
function archi(p) {
  const key = JSON.stringify(p.isole) + p.w + 'x' + p.h;
  if (cacheArchi.has(key)) return cacheArchi.get(key);
  const { w, h } = p, dove = new Map(p.isole.map(([i], k) => [i, k])), out = [];
  for (const [i] of p.isole) {
    const r = Math.floor(i / w), k = i % w;
    for (let x = k + 1, celle = []; x < w; x++) { const j = r * w + x; if (dove.has(j)) { out.push({ a: dove.get(i), b: dove.get(j), celle, orizz: true }); break; } celle.push(j); }
    for (let y = r + 1, celle = []; y < h; y++) { const j = y * w + k; if (dove.has(j)) { out.push({ a: dove.get(i), b: dove.get(j), celle, orizz: false }); break; } celle.push(j); }
  }
  // incroci: un orizzontale e un verticale con una casella in comune
  const perCella = new Map();
  out.forEach((e, q) => e.celle.forEach(c => { if (!perCella.has(c)) perCella.set(c, []); perCella.get(c).push(q); }));
  out.forEach(e => { e.incrocia = []; });
  for (const l of perCella.values()) if (l.length > 1) for (const x of l) for (const y of l) if (x !== y && !out[x].incrocia.includes(y)) out[x].incrocia.push(y);
  const res = { E: out, perIsola: p.isole.map((_, k) => out.map((e, q) => (e.a === k || e.b === k ? q : -1)).filter(q => q >= 0)) };
  cacheArchi.set(key, res);
  return res;
}
function collegate(p, A, quali) {
  const n = p.isole.length, adj = Array.from({ length: n }, () => []);
  A.E.forEach((e, q) => { if (quali(q)) { adj[e.a].push(e.b); adj[e.b].push(e.a); } });
  const vis = new Set([0]), coda = [0];
  while (coda.length) { const x = coda.pop(); for (const y of adj[x]) if (!vis.has(y)) { vis.add(y); coda.push(y); } }
  return vis.size === n;
}

/* ---------------- Regole sui limiti lo/hi di ogni collegamento ---------------- */
function regolaCapacita(p, A, lo, hi, soloUna) {
  let f = 0;
  for (let k = 0; k < p.isole.length; k++) {
    const N = p.isole[k][1], es = A.perIsola[k];
    const sLo = es.reduce((s, q) => s + lo[q], 0), sHi = es.reduce((s, q) => s + hi[q], 0);
    if (sLo > N || sHi < N) return null;
    for (const q of es) {
      const nLo = Math.max(lo[q], N - (sHi - hi[q])), nHi = Math.min(hi[q], N - (sLo - lo[q]));
      if (nLo > nHi) return null;
      if (nLo !== lo[q] || nHi !== hi[q]) { lo[q] = nLo; hi[q] = nHi; f++; if (soloUna) return f; }
    }
  }
  return f;
}
function regolaIncroci(p, A, lo, hi) {
  let f = 0;
  A.E.forEach((e, q) => { if (lo[q] >= 1) for (const z of e.incrocia) { if (lo[z] >= 1) f = -1e9; if (hi[z] > 0) { hi[z] = 0; f++; } } });
  return f < 0 ? null : f;
}
/* un gruppo «chiuso» (tutte le isole complete con i ponti sicuri) che non contiene tutte le isole */
function chiusoIsolato(p, A, lo, start) {
  const n = p.isole.length, vis = new Set([start]), coda = [start];
  while (coda.length) { const x = coda.pop(); for (const q of A.perIsola[x]) if (lo[q] >= 1) { const e = A.E[q], y = e.a === x ? e.b : e.a; if (!vis.has(y)) { vis.add(y); coda.push(y); } } }
  if (vis.size === n) return false;
  for (const x of vis) { const s = A.perIsola[x].reduce((t, q) => t + lo[q], 0); if (s !== p.isole[x][1]) return false; }
  return true;
}
function regolaIsolamento(p, A, lo, hi, soloUna) {
  let f = 0;
  for (let q = 0; q < A.E.length; q++) {
    for (let v = hi[q]; v > lo[q] && v >= 1; v--) {
      const vecchio = lo[q]; lo[q] = v;
      const male = chiusoIsolato(p, A, lo, A.E[q].a);
      lo[q] = vecchio;
      if (!male) break;
      hi[q] = v - 1; f++;
      if (soloUna) return f;
    }
  }
  // controlli: con i ponti ancora possibili tutto deve poter essere collegato; nessun gruppo già chiuso
  if (!collegate(p, A, q => hi[q] >= 1)) return null;
  for (let k = 0; k < p.isole.length; k++) if (chiusoIsolato(p, A, lo, k)) return null;
  return f;
}
function chiudi(p, A, lo, hi) {
  for (let g = 0; g < 1000; g++) {
    let f = 0;
    for (const reg of [regolaCapacita, regolaIncroci, regolaIsolamento]) { const x = reg(p, A, lo, hi); if (x === null) return null; f += x; }
    if (!f) return true;
  }
  return true;
}
function finale(p, A, x) {
  for (let k = 0; k < p.isole.length; k++) if (A.perIsola[k].reduce((s, q) => s + x[q], 0) !== p.isole[k][1]) return false;
  for (let q = 0; q < A.E.length; q++) if (x[q] && A.E[q].incrocia.some(z => x[z])) return false;
  return collegate(p, A, q => x[q] >= 1);
}

/* ---------------- Interfaccia ---------------- */
function nuovoStato(p) { return { x: Array(archi(p).E.length).fill(0) }; }
function conflitti(p, st) {
  const A = archi(p), out = new Set();
  A.E.forEach((e, q) => { if (st.x[q] && e.incrocia.some(z => st.x[z])) out.add(q); });
  return [...out];
}
/* isole con troppi ponti (o completate ma col conto sbagliato non si sa: si segnano solo quelle oltre) */
function isoleStato(p, st) {
  const A = archi(p);
  return p.isole.map(([, N], k) => { const s = A.perIsola[k].reduce((t, q) => t + st.x[q], 0); return s === N ? 'fatta' : s > N ? 'troppi' : ''; });
}
function completo(p, st) { return finale(p, archi(p), st.x); }
function statoRisolto(p, sol) { return { x: sol.slice() }; }

/* ---------------- Conteggio ---------------- */
function conta(p, cap = 2) {
  const A = archi(p), m = A.E.length;
  let tot = 0, prima = null; const tutte = [];
  const giro = (lo, hi) => {
    if (!chiudi(p, A, lo, hi)) return false;
    let q = -1, ampio = 0;
    for (let z = 0; z < m; z++) if (hi[z] - lo[z] > ampio) { ampio = hi[z] - lo[z]; q = z; if (ampio === 2) break; }
    if (q < 0) { if (!finale(p, A, lo)) return false; tot++; tutte.push(lo.slice()); prima = prima || tutte[0]; return tot >= cap; }
    for (let v = lo[q]; v <= hi[q]; v++) { const l2 = lo.slice(), h2 = hi.slice(); l2[q] = h2[q] = v; if (giro(l2, h2)) return true; }
    return false;
  };
  giro(Array(m).fill(0), Array(m).fill(2));
  conta.ultima = prima; conta.tutte = tutte;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, opz = {}) {
  const A = archi(p), m = A.E.length, lo = Array(m).fill(0), hi = Array(m).fill(2), passi = [], conteggio = {};
  const segna = t => { passi.push({ t }); conteggio[t] = (conteggio[t] || 0) + 1; };
  const tec = [['capacita', () => regolaCapacita(p, A, lo, hi, true)], ['incroci', () => regolaIncroci(p, A, lo, hi)], ['isolamento', () => regolaIsolamento(p, A, lo, hi, true)]];
  for (let g = 0; g < 20 * m + 50; g++) {
    if (lo.every((x, q) => x === hi[q])) break;
    let mosso = false;
    for (const [t, f] of tec) { const x = f(); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let fatto = false;
    for (let q = 0; q < m && !fatto; q++) {
      if (lo[q] === hi[q]) continue;
      for (const v of [lo[q], hi[q]]) {
        const l2 = lo.slice(), h2 = hi.slice(); l2[q] = h2[q] = v;
        if (!chiudi(p, A, l2, h2)) { if (v === lo[q]) lo[q]++; else hi[q]--; segna('ipotesi'); fatto = true; break; }
      }
    }
    if (!fatto) break;
  }
  const risolto = lo.every((x, q) => x === hi[q]) && finale(p, A, lo);
  return { risolto, sol: risolto ? lo.slice() : null, passi, conteggio };
}
function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, iso = ris.conteggio.isolamento || 0, lato = Math.max(p.w, p.h);
  if (ip > 8) return null;
  if (lato >= 9 && ip >= 1) return 'estrema';
  if (lato >= 9 && !ip && iso >= 1) return 'esperta';
  if (lato <= 8 && !ip && iso + (ris.conteggio.incroci || 0) >= 1) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [[7, 10, 13]], esperta: [[9, 16, 21]], estrema: [[9, 18, 23], [10, 22, 28]] };
function genera(r, voluto, tentativi = 300) {
  for (let t = 0; t < tentativi; t++) {
    const [n, minI, maxI] = r.scegli(MISURE[voluto]);
    const voluti = minI + r(maxI - minI + 1);
    const occ = Array(n * n).fill(0);              // 0 libera, 1 isola, 2 ponte
    const isole = [], ponti = [];                  // ponti: [isolaA, isolaB, quanti]
    const vicinaAIsola = i => { const rr = Math.floor(i / n), k = i % n; return [rr > 0 ? i - n : -1, rr < n - 1 ? i + n : -1, k > 0 ? i - 1 : -1, k < n - 1 ? i + 1 : -1].some(j => j >= 0 && occ[j] === 1); };
    const prima = r(n * n); occ[prima] = 1; isole.push(prima);
    for (let g = 0; g < 4000 && isole.length < voluti; g++) {
      const a = r.scegli(isole), [dr, dk] = r.scegli([[0, 1], [0, -1], [1, 0], [-1, 0]]), d = 2 + r(Math.max(1, Math.floor(n / 2)));
      const ra = Math.floor(a / n), ka = a % n, rb = ra + dr * d, kb = ka + dk * d;
      if (rb < 0 || kb < 0 || rb >= n || kb >= n) continue;
      const b = rb * n + kb; if (occ[b] || vicinaAIsola(b)) continue;
      let libero = true; const celle = [];
      for (let s = 1; s < d; s++) { const c = (ra + dr * s) * n + (ka + dk * s); if (occ[c]) { libero = false; break; } celle.push(c); }
      if (!libero) continue;
      occ[b] = 1; isole.push(b); celle.forEach(c => { occ[c] = 2; });
      ponti.push([a, b, r.f() < 0.4 ? 2 : 1]);
    }
    if (isole.length < minI) continue;
    // qualche ponte in più tra isole che si vedono, per fare dei giri
    const p0 = { w: n, h: n, isole: isole.slice().sort((x, y) => x - y).map(i => [i, 0]) };
    const A = archi(p0), idx = new Map(p0.isole.map(([i], k) => [i, k]));
    const x = Array(A.E.length).fill(0);
    for (const [a, b, v] of ponti) { const q = A.E.findIndex(e => (p0.isole[e.a][0] === a && p0.isole[e.b][0] === b) || (p0.isole[e.a][0] === b && p0.isole[e.b][0] === a)); if (q < 0) { x.length = 0; break; } x[q] = v; }
    if (!x.length) continue;
    for (const q of r.mescola([...Array(A.E.length).keys()])) {
      if (x[q] || r.f() < 0.75) continue;
      if (A.E[q].incrocia.some(z => x[z])) continue;
      x[q] = r.f() < 0.35 ? 2 : 1;
    }
    if (A.E.some((e, q) => x[q] && e.incrocia.some(z => x[z]))) continue;
    const p = { w: n, h: n, isole: p0.isole.map(([i], k) => [i, A.perIsola[k].reduce((s, q) => s + x[q], 0)]) };
    void idx;
    if (p.isole.some(([, v]) => v === 0)) continue;
    if (conta(p, 2) !== 1) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.w) || !Number.isInteger(p.h) || !Array.isArray(p.isole) || !p.isole.length) return 'forma';
  for (const [i, v] of p.isole) if (!(i >= 0 && i < p.w * p.h) || !(v >= 1 && v <= 8)) return 'isola storta';
  return null;
}

const E = {
  id: 'ponti', nome: 'Ponti', tipo: 'ponti', famiglia: 'griglia', TECNICHE, MISURE,
  breve: 'Collega tutte le isole con ponti dritti: il numero dice quanti ponti partono da ognuna.',
  regole: [
    'Collega le isole con <b>ponti dritti</b>, in orizzontale o in verticale, tra isole che si vedono.',
    'Tra due isole al massimo <b>due ponti</b>. I ponti <b>non si incrociano</b>.',
    'Il numero di un’isola dice quanti ponti partono da lei. Alla fine tutte le isole devono essere <b>collegate</b> in un solo gruppo.',
    'Tocca un’isola e poi un’altra che vede: un ponte, due ponti, nessuno. Puoi anche toccare direttamente un ponte.'
  ],
  nuovoStato, conflitti, isoleStato, completo, statoRisolto, conta, risolvi, livello, genera, valida, archi
};
if (M) M.motori.ponti = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
