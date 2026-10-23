/* =====================================================================
   MENTAL · FLOTTA (battaglia navale in solitario)
   Una flotta nascosta in una griglia n×n: navi dritte (in orizzontale o in verticale) di lunghezze
   date, che non si toccano, nemmeno in diagonale. I numeri ai bordi dicono quante caselle di nave
   ci sono in ogni riga e colonna. Alcune caselle sono già scoperte: acqua, oppure un pezzo di nave
   con la sua forma (nave da una casella, punta, pezzo di mezzo).

   Dati: { n, flotta: [lunghezze, dalla più lunga], righe: [n], colonne: [n], dati: [[i, forma]] }
         forme: 'a' acqua, 'o' nave da una casella, 'su' | 'giu' | 'sx' | 'dx' punta (la nave continua
         verso il basso, verso l'alto, a destra, a sinistra), 'm' pezzo di mezzo.
   Stato: { c: [n·n] }  0 vuota, 1 acqua, 2 nave.

   Tecniche del risolutore «umano»:
     conti      una riga o colonna con tutte le sue navi ha il resto d'acqua; se le caselle libere
                sono proprio quelle che mancano, sono tutte nave;
     intorno    intorno a un pezzo di nave le diagonali sono acqua; le forme scoperte dicono anche
                dove la nave continua e dove no;
     flotta     i conti della flotta: una nave che ha già la lunghezza più grande rimasta è finita;
                la nave più lunga rimasta ha pochi posti possibili, e le caselle comuni sono nave;
     ipotesi    «se qui ci fosse una nave…»: con le tecniche sopra si arriva a una contraddizione.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  conti: { nome: 'Conti di riga e colonna', descr: 'Una fila che ha già tutte le sue navi è acqua; se le caselle libere sono quante ne mancano, sono nave.', peso: 1 },
  intorno: { nome: 'Intorno alle navi', descr: 'Le navi non si toccano: le diagonali di un pezzo di nave sono acqua, e la forma dice dove continua.', peso: 1 },
  flotta: { nome: 'I conti della flotta', descr: 'La nave più lunga rimasta ha pochi posti possibili: le caselle che hanno in comune sono nave.', peso: 3 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se qui ci fosse una nave…»: si arriva a una contraddizione, quindi è acqua (o il contrario).', peso: 6 }
};
const ACQUA = 0, NAVE = 1, IGNOTA = -1;

/* forma di una casella di nave nella soluzione */
function formaDi(n, sol, i) {
  const r = Math.floor(i / n), k = i % n, s = j => j >= 0 && sol[j] === 1;
  const su = r > 0 && s(i - n), giu = r < n - 1 && s(i + n), sx = k > 0 && s(i - 1), dx = k < n - 1 && s(i + 1);
  if (!su && !giu && !sx && !dx) return 'o';
  if ((su && giu) || (sx && dx)) return 'm';
  if (giu) return 'su'; if (su) return 'giu'; if (dx) return 'sx'; return 'dx';
}
/* navi (componenti) di una soluzione completa: lunghezze */
function navi(n, sol) {
  const vis = new Set(), out = [];
  for (let i = 0; i < n * n; i++) {
    if (sol[i] !== 1 || vis.has(i)) continue;
    let l = 0; const coda = [i]; vis.add(i);
    while (coda.length) { const x = coda.pop(); l++; const r = Math.floor(x / n), k = x % n; for (const j of [r > 0 ? x - n : -1, r < n - 1 ? x + n : -1, k > 0 ? x - 1 : -1, k < n - 1 ? x + 1 : -1]) if (j >= 0 && sol[j] === 1 && !vis.has(j)) { vis.add(j); coda.push(j); } }
    out.push(l);
  }
  return out.sort((a, b) => b - a);
}

/* ---------------- Propagazione (comune a conteggio e risolutore) ----------------
   a: [n·n] con -1 ignota, 0 acqua, 1 nave. Ogni regola restituisce null se trova una contraddizione,
   altrimenti quante caselle ha deciso. */
function metti(a, i, v) { if (a[i] === v) return 0; if (a[i] !== IGNOTA) return null; a[i] = v; return 1; }
function regolaDati(p, a) {
  const n = p.n; let f = 0;
  const set = (r, k, v) => { if (r < 0 || k < 0 || r >= n || k >= n) return v === ACQUA ? 0 : null; const x = metti(a, r * n + k, v); if (x === null) return null; f += x; return x; };
  for (const [i, t] of p.dati || []) {
    const r = Math.floor(i / n), k = i % n;
    if (set(r, k, t === 'a' ? ACQUA : NAVE) === null) return null;
    if (t === 'a') continue;
    const vuole = { o: [0, 0, 0, 0], su: [0, 1, 0, 0], giu: [1, 0, 0, 0], sx: [0, 0, 0, 1], dx: [0, 0, 1, 0] }[t];
    if (vuole) {
      const dir = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (let q = 0; q < 4; q++) if (set(r + dir[q][0], k + dir[q][1], vuole[q] ? NAVE : ACQUA) === null) return null;
    } else if (t === 'm') {
      // pezzo di mezzo: o orizzontale o verticale
      const v = j => (j[0] < 0 || j[1] < 0 || j[0] >= n || j[1] >= n ? ACQUA : a[j[0] * n + j[1]]);
      const S = v([r - 1, k]), Gi = v([r + 1, k]), X = v([r, k - 1]), D = v([r, k + 1]);
      const orizz = X === NAVE || D === NAVE || S === ACQUA || Gi === ACQUA, vert = S === NAVE || Gi === NAVE || X === ACQUA || D === ACQUA;
      if (orizz && vert) return null;
      if (orizz) { if (set(r, k - 1, NAVE) === null || set(r, k + 1, NAVE) === null || set(r - 1, k, ACQUA) === null || set(r + 1, k, ACQUA) === null) return null; }
      if (vert) { if (set(r - 1, k, NAVE) === null || set(r + 1, k, NAVE) === null || set(r, k - 1, ACQUA) === null || set(r, k + 1, ACQUA) === null) return null; }
    }
  }
  return f;
}
function regolaIntorno(n, a) {
  let f = 0;
  for (let i = 0; i < n * n; i++) {
    if (a[i] !== NAVE) continue;
    const r = Math.floor(i / n), k = i % n;
    for (const [dr, dk] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const rr = r + dr, kk = k + dk; if (rr < 0 || kk < 0 || rr >= n || kk >= n) continue;
      const x = metti(a, rr * n + kk, ACQUA); if (x === null) return null; f += x;
    }
  }
  return f;
}
function regolaConti(p, a) {
  const n = p.n; let f = 0;
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    const voluto = q < n ? p.righe[q] : p.colonne[q - n];
    let navi_ = 0, ignote = 0;
    for (const i of celle) { if (a[i] === NAVE) navi_++; else if (a[i] === IGNOTA) ignote++; }
    if (navi_ > voluto || navi_ + ignote < voluto) return null;
    if (!ignote) continue;
    if (navi_ === voluto) for (const i of celle) { if (a[i] === IGNOTA) { a[i] = ACQUA; f++; } }
    else if (navi_ + ignote === voluto) for (const i of celle) { if (a[i] === IGNOTA) { a[i] = NAVE; f++; } }
  }
  return f;
}
/* Pezzi di nave già visti: segmenti dritti di caselle nave, con le estremità */
function pezzi(n, a) {
  const vis = new Set(), out = [];
  for (let i = 0; i < n * n; i++) {
    if (a[i] !== NAVE || vis.has(i)) continue;
    const celle = [], coda = [i]; vis.add(i);
    while (coda.length) { const x = coda.pop(); celle.push(x); const r = Math.floor(x / n), k = x % n; for (const j of [r > 0 ? x - n : -1, r < n - 1 ? x + n : -1, k > 0 ? x - 1 : -1, k < n - 1 ? x + 1 : -1]) if (j >= 0 && a[j] === NAVE && !vis.has(j)) { vis.add(j); coda.push(j); } }
    celle.sort((x, y) => x - y);
    const righe = new Set(celle.map(x => Math.floor(x / n))), cols = new Set(celle.map(x => x % n));
    if (righe.size > 1 && cols.size > 1) { out.push({ storto: true, celle }); continue; }
    const orizz = righe.size === 1 && celle.length > 1, vert = cols.size === 1 && celle.length > 1;
    // estremità: le caselle subito prima e subito dopo (anche in tutte e quattro le direzioni se è lungo 1)
    const a0 = celle[0], a1 = celle[celle.length - 1], r0 = Math.floor(a0 / n), k0 = a0 % n, r1 = Math.floor(a1 / n), k1 = a1 % n;
    const fuori = [];
    const agg = (r, k) => fuori.push(r < 0 || k < 0 || r >= n || k >= n ? -1 : r * n + k);
    if (!vert) { agg(r0, k0 - 1); agg(r1, k1 + 1); }
    if (!orizz) { agg(r0 - 1, k0); agg(r1 + 1, k1); }
    const chiuso = fuori.every(j => j < 0 || a[j] === ACQUA);
    out.push({ celle, orizz, vert, fuori, chiuso, l: celle.length });
  }
  return out;
}
/* Navi ancora da trovare (la flotta meno le navi già chiuse); null se la flotta non torna */
function rimaste(p, ps) {
  const r = p.flotta.slice();
  for (const x of ps) {
    if (x.storto) return null;
    if (x.l > p.flotta[0]) return null;
    if (!x.chiuso) continue;
    const j = r.indexOf(x.l); if (j < 0) return null; r.splice(j, 1);
  }
  return r;
}
/* La flotta: una nave già lunga quanto la più lunga rimasta è finita; i posti della nave più lunga */
function regolaFlotta(p, a, soloUna) {
  const n = p.n, ps = pezzi(n, a), r = rimaste(p, ps);
  if (r === null) return null;
  // pezzi aperti più lunghi di qualunque nave rimasta: impossibile
  const maxR = r.length ? r[0] : 0;
  let f = 0;
  for (const x of ps) if (!x.chiuso && !x.storto) {
    if (x.l > maxR) return null;
    if (x.l === maxR) for (const j of x.fuori) if (j >= 0 && a[j] === IGNOTA) { a[j] = ACQUA; f++; }
  }
  if (f && soloUna) return f;
  if (!r.length) return f;
  // posti possibili per la nave più lunga rimasta
  const L = maxR, quante = r.filter(x => x === L).length;
  const contaRiga = Array(n).fill(0), contaCol = Array(n).fill(0);
  for (let i = 0; i < n * n; i++) if (a[i] === NAVE) { contaRiga[Math.floor(i / n)]++; contaCol[i % n]++; }
  const chiusiDentro = new Set(); for (const x of ps) if (x.chiuso) x.celle.forEach(i => chiusiDentro.add(i));
  const posti = [];
  for (let r0 = 0; r0 < n; r0++) for (let k0 = 0; k0 < n; k0++) for (const [dr, dk] of L === 1 ? [[0, 1]] : [[0, 1], [1, 0]]) {
    const rL = r0 + dr * (L - 1), kL = k0 + dk * (L - 1); if (rL >= n || kL >= n) continue;
    const celle = []; let ok = true, nuove = 0;
    for (let q = 0; q < L && ok; q++) { const i = (r0 + dr * q) * n + (k0 + dk * q); if (a[i] === ACQUA || chiusiDentro.has(i)) ok = false; if (a[i] === IGNOTA) nuove++; celle.push(i); }
    if (!ok) continue;
    // prima e dopo niente nave; ai lati niente nave
    const prima = [r0 - dr, k0 - dk], dopo = [rL + dr, kL + dk];
    for (const [rr, kk] of [prima, dopo]) if (rr >= 0 && kk >= 0 && rr < n && kk < n && a[rr * n + kk] === NAVE) ok = false;
    for (const i of celle) { const rr = Math.floor(i / n), kk = i % n; for (const [sr, sk] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) { const r2 = rr + sr, k2 = kk + sk; if (r2 >= 0 && k2 >= 0 && r2 < n && k2 < n && a[r2 * n + k2] === NAVE) ok = false; } }
    if (!ok) continue;
    // i conti di righe e colonne reggono
    if (dr === 0) { if (contaRiga[r0] + nuove > p.righe[r0]) continue; if (celle.some(i => a[i] === IGNOTA && contaCol[i % n] + 1 > p.colonne[i % n])) continue; }
    else { if (contaCol[k0] + nuove > p.colonne[k0]) continue; if (celle.some(i => a[i] === IGNOTA && contaRiga[Math.floor(i / n)] + 1 > p.righe[Math.floor(i / n)])) continue; }
    posti.push(celle);
  }
  if (posti.length < quante) return null;
  if (quante === 1) {
    const comuni = posti.reduce((s, c) => s.filter(i => c.includes(i)), posti[0]);
    for (const i of comuni) if (a[i] === IGNOTA) { a[i] = NAVE; f++; }
  } else if (posti.length === quante) {
    for (const c of posti) for (const i of c) if (a[i] === IGNOTA) { a[i] = NAVE; f++; }
  }
  return f;
}
/* Tutte le regole fino a fermarsi; null se contraddizione */
function chiudi(p, a, conFlotta = true) {
  for (let g = 0; g < 500; g++) {
    let f = 0;
    for (const reg of [() => regolaDati(p, a), () => regolaIntorno(p.n, a), () => regolaConti(p, a), () => (conFlotta ? regolaFlotta(p, a) : 0)]) {
      const x = reg(); if (x === null) return null; f += x;
    }
    if (!f) return a;
  }
  return a;
}
function finale(p, a) {
  const n = p.n;
  if (a.some(x => x === IGNOTA)) return false;
  for (let r = 0; r < n; r++) if (a.slice(r * n, r * n + n).filter(x => x === NAVE).length !== p.righe[r]) return false;
  for (let k = 0; k < n; k++) { let c = 0; for (let r = 0; r < n; r++) if (a[r * n + k] === NAVE) c++; if (c !== p.colonne[k]) return false; }
  if (regolaIntorno(n, a.slice()) === null) return false;
  const sol = a.map(x => (x === NAVE ? 1 : 0));
  if (navi(n, sol).join() !== p.flotta.join()) return false;
  for (const [i, t] of p.dati || []) { if (t === 'a' ? sol[i] !== 0 : sol[i] !== 1 || formaDi(n, sol, i) !== t) return false; }
  return true;
}

/* ---------------- Interfaccia ---------------- */
function nuovoStato(p) {
  const c = Array(p.n * p.n).fill(0);
  for (const [i, t] of p.dati || []) c[i] = t === 'a' ? 1 : 2;
  return { c };
}
function conflitti(p, st) {
  const n = p.n, out = new Set(), nave = i => st.c[i] === 2;
  // navi che si toccano in diagonale
  for (let i = 0; i < n * n; i++) if (nave(i)) {
    const r = Math.floor(i / n), k = i % n;
    for (const [dr, dk] of [[1, -1], [1, 1]]) { const rr = r + dr, kk = k + dk; if (rr < n && kk >= 0 && kk < n && nave(rr * n + kk)) { out.add(i); out.add(rr * n + kk); } }
  }
  // navi troppo lunghe
  const sol = st.c.map(x => (x === 2 ? 1 : 0)), max = p.flotta[0];
  const vis = new Set();
  for (let i = 0; i < n * n; i++) if (sol[i] && !vis.has(i)) {
    const celle = [], coda = [i]; vis.add(i);
    while (coda.length) { const x = coda.pop(); celle.push(x); const r = Math.floor(x / n), k = x % n; for (const j of [r > 0 ? x - n : -1, r < n - 1 ? x + n : -1, k > 0 ? x - 1 : -1, k < n - 1 ? x + 1 : -1]) if (j >= 0 && sol[j] && !vis.has(j)) { vis.add(j); coda.push(j); } }
    if (celle.length > max) celle.forEach(x => out.add(x));
  }
  return [...out];
}
/* righe e colonne con troppe navi (o con tutte le caselle decise e il conto sbagliato) */
function contiSbagliati(p, st) {
  const n = p.n, out = [];
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    const voluto = q < n ? p.righe[q] : p.colonne[q - n], navi_ = celle.filter(i => st.c[i] === 2).length;
    if (navi_ > voluto || (celle.every(i => st.c[i]) && navi_ !== voluto)) out.push((q < n ? 'r' : 'k') + (q % n));
  }
  return out;
}
/* righe e colonne già a posto (tutte le navi messe) */
function contiFatti(p, st) {
  const n = p.n, out = [];
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    const voluto = q < n ? p.righe[q] : p.colonne[q - n];
    if (celle.filter(i => st.c[i] === 2).length === voluto) out.push((q < n ? 'r' : 'k') + (q % n));
  }
  return out;
}
function completo(p, st) { return finale(p, st.c.map(x => (x === 2 ? NAVE : ACQUA))); }
function statoRisolto(p, sol) { return { c: sol.map(x => (x ? 2 : 1)) }; }

/* ---------------- Conteggio: ricerca completa ---------------- */
function conta(p, cap = 2) {
  const n = p.n;
  let tot = 0, prima = null; const tutte = [];
  const giro = a => {
    if (chiudi(p, a, true) === null) return false;
    // casella da provare: nella riga o colonna con meno caselle ignote
    let mi = -1, mv = 1e9;
    for (let i = 0; i < n * n; i++) if (a[i] === IGNOTA) {
      const r = Math.floor(i / n), k = i % n;
      let q = 0; for (let x = 0; x < n; x++) { if (a[r * n + x] === IGNOTA) q++; if (a[x * n + k] === IGNOTA) q++; }
      if (q < mv) { mv = q; mi = i; }
    }
    if (mi < 0) { if (!finale(p, a)) return false; tot++; tutte.push(a.map(x => (x === NAVE ? 1 : 0))); if (!prima) prima = tutte[0]; return tot >= cap; }
    for (const v of [NAVE, ACQUA]) { const b = a.slice(); b[mi] = v; if (giro(b)) return true; }
    return false;
  };
  giro(Array(n * n).fill(IGNOTA));
  conta.ultima = prima; conta.tutte = tutte;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, opz = {}) {
  const n = p.n, a = Array(n * n).fill(IGNOTA);
  const passi = [], conteggio = {};
  const segna = (t, q) => { passi.push({ t, q }); conteggio[t] = (conteggio[t] || 0) + 1; };
  const tec = [['intorno', () => { const x = regolaDati(p, a); if (x === null) return null; const y = regolaIntorno(n, a); return y === null ? null : x + y; }],
    ['conti', () => regolaConti(p, a)], ['flotta', () => regolaFlotta(p, a, true)]];
  for (let g = 0; g < 4 * n * n; g++) {
    if (!a.includes(IGNOTA)) break;
    let mosso = false;
    for (const [t, f] of tec) { const x = f(); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t, x); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let fatto = false;
    for (let i = 0; i < n * n && !fatto; i++) {
      if (a[i] !== IGNOTA) continue;
      for (const v of [NAVE, ACQUA]) {
        const b = a.slice(); b[i] = v;
        if (chiudi(p, b, true) === null) { a[i] = v === NAVE ? ACQUA : NAVE; segna('ipotesi', 1); fatto = true; break; }
      }
    }
    if (!fatto) break;
  }
  const risolto = finale(p, a);
  return { risolto, sol: risolto ? a.map(x => (x === NAVE ? 1 : 0)) : null, passi, conteggio };
}
function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0;
  if (ip > 8) return null;
  if (p.n >= 10 && ip <= 8) return 'estrema';
  if (p.n === 8 && ip >= 1) return 'estrema';
  if (p.n === 8 && !ip) return 'esperta';
  if (p.n === 6 && !ip) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [[6, [3, 2, 2, 1, 1, 1]]], esperta: [[8, [4, 3, 3, 2, 2, 1, 1, 1]]], estrema: [[8, [4, 3, 3, 2, 2, 1, 1, 1]], [10, [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]]] };
function piazza(r, n, flotta) {
  for (let t = 0; t < 200; t++) {
    const sol = Array(n * n).fill(0); let ok = true;
    for (const L of flotta) {
      const posti = [];
      for (let r0 = 0; r0 < n; r0++) for (let k0 = 0; k0 < n; k0++) for (const [dr, dk] of L === 1 ? [[0, 1]] : [[0, 1], [1, 0]]) {
        if (r0 + dr * (L - 1) >= n || k0 + dk * (L - 1) >= n) continue;
        let libero = true;
        for (let q = 0; q < L && libero; q++) {
          const rr = r0 + dr * q, kk = k0 + dk * q;
          for (let a = -1; a <= 1 && libero; a++) for (let b = -1; b <= 1 && libero; b++) { const r2 = rr + a, k2 = kk + b; if (r2 >= 0 && k2 >= 0 && r2 < n && k2 < n && sol[r2 * n + k2]) libero = false; }
        }
        if (libero) posti.push([r0, k0, dr, dk]);
      }
      if (!posti.length) { ok = false; break; }
      const [r0, k0, dr, dk] = r.scegli(posti);
      for (let q = 0; q < L; q++) sol[(r0 + dr * q) * n + (k0 + dk * q)] = 1;
    }
    if (ok) return sol;
  }
  return null;
}
function genera(r, voluto, tentativi = 80) {
  for (let q = 0; q < tentativi; q++) {
    const [n, flotta] = r.scegli(MISURE[voluto]);
    const sol = piazza(r, n, flotta); if (!sol) continue;
    const p = { n, flotta: flotta.slice(), righe: [], colonne: [], dati: [] };
    for (let x = 0; x < n; x++) { p.righe.push(sol.slice(x * n, x * n + n).reduce((s, v) => s + v, 0)); let c = 0; for (let y = 0; y < n; y++) c += sol[y * n + x]; p.colonne.push(c); }
    const svela = i => [i, sol[i] ? formaDi(n, sol, i) : 'a'];
    // si scoprono caselle finché la soluzione è unica e il risolutore ci arriva
    for (let k = 0; k < 3 * n; k++) {
      if (conta(p, 2) === 1 && risolvi(p).risolto) break;
      // una casella dove le soluzioni trovate non sono d'accordo, o una nave a caso
      const tutte = conta.tutte.concat([sol]);
      const diverse = [];
      for (let i = 0; i < n * n; i++) if (!p.dati.some(d => d[0] === i) && tutte.some(x => x[i] !== sol[i])) diverse.push(i);
      const navi_ = diverse.filter(i => sol[i]);
      const i = r.scegli(navi_.length && r.f() < 0.75 ? navi_ : diverse.length ? diverse : [...Array(n * n).keys()].filter(j => !p.dati.some(d => d[0] === j)));
      p.dati.push(svela(i));
    }
    if (conta(p, 2) !== 1 || !risolvi(p).risolto) continue;
    // via le caselle scoperte che non servono
    for (const d of r.mescola(p.dati.slice())) {
      const k = p.dati.indexOf(d); p.dati.splice(k, 1);
      if (conta(p, 2) !== 1 || !risolvi(p).risolto) p.dati.splice(k, 0, d);
    }
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    p.dati.sort((x, y) => x[0] - y[0]);
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || !Array.isArray(p.flotta) || p.righe.length !== p.n || p.colonne.length !== p.n) return 'forma';
  const tot = p.flotta.reduce((a, b) => a + b, 0);
  if (p.righe.reduce((a, b) => a + b, 0) !== tot || p.colonne.reduce((a, b) => a + b, 0) !== tot) return 'conti diversi dalla flotta';
  for (const [i, t] of p.dati || []) if (!(i >= 0 && i < p.n * p.n) || !['a', 'o', 'su', 'giu', 'sx', 'dx', 'm'].includes(t)) return 'casella scoperta storta';
  return null;
}

const E = {
  id: 'flotta', nome: 'Flotta', tipo: 'flotta', famiglia: 'griglia', TECNICHE, MISURE,
  breve: 'Trova la flotta nascosta: i numeri dicono quante caselle di nave ci sono in ogni fila.',
  regole: [
    'Nella griglia è nascosta la flotta disegnata sopra: navi <b>dritte</b>, in orizzontale o in verticale.',
    'Le navi <b>non si toccano</b>, nemmeno in diagonale.',
    'I numeri ai bordi dicono quante caselle di nave ci sono in quella riga o colonna.',
    'Alcune caselle sono già scoperte: acqua, oppure un pezzo di nave con la sua forma (tondo = nave da una casella, punta = fine della nave).',
    'Tocca una casella: nave, poi acqua, poi vuota. Trascinando si mette acqua.'
  ],
  nuovoStato, conflitti, contiSbagliati, contiFatti, completo, statoRisolto, conta, risolvi, livello, genera, valida,
  formaDi, navi
};
if (M) M.motori.flotta = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
