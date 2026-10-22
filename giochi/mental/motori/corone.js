/* =====================================================================
   MENTAL · CORONE (regole in stile «Queens»)
   Griglia n×n divisa in n regioni colorate. Una corona per riga, per colonna e per
   regione; due corone non si toccano, neanche in diagonale.

   Dati della sfida: { n, reg: [n·n id di regione 0..n-1] }
   Stato del giocatore: { c: [n·n] } con 0 vuota, 1 croce, 2 corona.

   Il risolutore «umano» usa solo queste tecniche (dalla più semplice):
     unico     una riga, colonna o regione ha un solo posto libero;
     confine1  una regione sta tutta in una riga (o colonna), o una riga/colonna tutta in una
               regione: il resto di quella riga (regione) è vuoto;
     conflitto una corona qui lascerebbe senza posto una riga, colonna o regione;
     confine2  lo stesso ragionamento del confine con 2 regioni e 2 righe (o colonne);
     confine3  …con 3 o più.
   Se finisce la griglia con queste tecniche, la soluzione è unica (ogni passo è una deduzione).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  unico: { nome: 'Posto obbligato', descr: 'Una riga, una colonna o una regione ha un solo posto libero.', peso: 1 },
  confine1: { nome: 'Regione chiusa', descr: 'Una regione sta tutta in una riga o in una colonna (o il contrario): lì non c’è posto per altre corone.', peso: 2 },
  conflitto: { nome: 'Se fosse qui…', descr: 'Una corona in questa casella lascerebbe senza posto una riga, una colonna o una regione.', peso: 3 },
  confine2: { nome: 'Due regioni, due righe', descr: 'Due regioni stanno tutte in due righe (o colonne): le altre caselle di quelle righe sono vuote.', peso: 5 },
  confine3: { nome: 'Gruppi chiusi', descr: 'Tre o più regioni chiuse in altrettante righe o colonne.', peso: 8 }
};

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { c: Array(p.n * p.n).fill(0) }; }
function conflitti(p, st) {
  const n = p.n, cor = [], out = new Set();
  st.c.forEach((v, i) => { if (v === 2) cor.push(i); });
  for (let a = 0; a < cor.length; a++) for (let b = a + 1; b < cor.length; b++) {
    const x = cor[a], y = cor[b], rx = Math.floor(x / n), cx = x % n, ry = Math.floor(y / n), cy = y % n;
    if (rx === ry || cx === cy || p.reg[x] === p.reg[y] || (Math.abs(rx - ry) <= 1 && Math.abs(cx - cy) <= 1)) { out.add(x); out.add(y); }
  }
  return [...out];
}
function completo(p, st) { return st.c.filter(v => v === 2).length === p.n && conflitti(p, st).length === 0; }
/* Il riempimento finale: le corone della soluzione e croci sul resto */
function statoRisolto(p, sol) { return { c: sol.map(v => (v ? 2 : 1)) }; }

/* ---------------- Conteggio delle soluzioni (fino a cap) ---------------- */
function conta(p, cap = 2) {
  const n = p.n, usaCol = Array(n).fill(false), usaReg = Array(n).fill(false);
  let tot = 0, prima = null; const pos = Array(n).fill(-1);
  const giro = r => {
    if (r === n) { tot++; if (!prima) prima = pos.slice(); return tot >= cap; }
    for (let c = 0; c < n; c++) {
      const g = p.reg[r * n + c];
      if (usaCol[c] || usaReg[g]) continue;
      if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
      usaCol[c] = usaReg[g] = true; pos[r] = c;
      if (giro(r + 1)) return true;
      usaCol[c] = usaReg[g] = false;
    }
    return false;
  };
  giro(0);
  conta.ultima = prima ? Array.from({ length: n * n }, (_, i) => (prima[Math.floor(i / n)] === i % n ? 1 : 0)) : null;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const n = p.n, N = n * n;
  const cand = Array(N).fill(true), cor = Array(N).fill(false);
  const unita = [];                                    // righe, colonne, regioni come liste di caselle
  for (let r = 0; r < n; r++) unita.push({ t: 'riga', k: r, celle: Array.from({ length: n }, (_, c) => r * n + c) });
  for (let c = 0; c < n; c++) unita.push({ t: 'colonna', k: c, celle: Array.from({ length: n }, (_, r) => r * n + c) });
  for (let g = 0; g < n; g++) unita.push({ t: 'regione', k: g, celle: [] });
  for (let i = 0; i < N; i++) unita[2 * n + p.reg[i]].celle.push(i);
  const dell = i => [unita[Math.floor(i / n)], unita[n + (i % n)], unita[2 * n + p.reg[i]]];
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const piena = u => u.celle.some(i => cor[i]);
  const liberi = u => u.celle.filter(i => cand[i] && !cor[i]);
  const metti = i => {
    cor[i] = true; cand[i] = false;
    for (const u of dell(i)) for (const j of u.celle) if (j !== i) cand[j] = false;
    for (const j of M.intorno(n, i)) cand[j] = false;
  };
  // ci sono corone in tutte le unità piene e ogni unità vuota ha almeno un posto?
  const coerente = () => unita.every(u => piena(u) || liberi(u).length > 0);
  const passoUnico = () => {
    for (const u of unita) {
      if (piena(u)) continue;
      const l = liberi(u);
      if (l.length === 1) { metti(l[0]); segna('unico', { cella: l[0], unita: u.t }); return true; }
    }
    return false;
  };
  // confine: k unità di tipo A (vuote) con tutti i posti dentro k unità di tipo B → il resto di B è vuoto
  const passoConfine = (k, tipiA, tipiB) => {
    for (const ta of tipiA) for (const tb of tipiB) {
      if (ta === tb) continue;
      const A = unita.filter(u => u.t === ta && !piena(u));
      const idxB = i => (tb === 'riga' ? Math.floor(i / n) : tb === 'colonna' ? i % n : p.reg[i]);
      let fatto = false;
      M.combinazioni(A, k, gruppo => {
        const celle = new Set(), b = new Set();
        for (const u of gruppo) for (const i of liberi(u)) { celle.add(i); b.add(idxB(i)); }
        if (b.size !== k) return false;
        const elim = [];
        for (const kb of b) for (const j of unita[(tb === 'riga' ? 0 : tb === 'colonna' ? n : 2 * n) + kb].celle) if (cand[j] && !celle.has(j)) elim.push(j);
        if (!elim.length) return false;
        elim.forEach(j => { cand[j] = false; });
        segna(k === 1 ? 'confine1' : k === 2 ? 'confine2' : 'confine3', { k, gruppo: gruppo.map(u => u.t + u.k), elim });
        fatto = true; return true;
      });
      if (fatto) return true;
    }
    return false;
  };
  const passoConflitto = () => {
    for (let i = 0; i < N; i++) {
      if (!cand[i] || cor[i]) continue;
      const via = new Set([i]);
      for (const u of dell(i)) for (const j of u.celle) via.add(j);
      for (const j of M.intorno(n, i)) via.add(j);
      const rotta = unita.find(u => !piena(u) && !u.celle.includes(i) && liberi(u).every(j => via.has(j)));
      if (rotta) { cand[i] = false; segna('conflitto', { cella: i, rompe: rotta.t + rotta.k }); return true; }
    }
    return false;
  };
  const tutti = ['riga', 'colonna', 'regione'];
  for (let giri = 0; giri < 10 * N; giri++) {
    if (cor.filter(Boolean).length === n) break;
    if (!coerente()) return { risolto: false, contraddizione: true, passi, conteggio };
    if (passoUnico()) continue;
    if (passoConfine(1, tutti, tutti)) continue;
    if (passoConflitto()) continue;
    if (passoConfine(2, tutti, tutti)) continue;
    let ok = false;
    for (let k = 3; k <= Math.floor(n / 2) && !ok; k++) ok = passoConfine(k, tutti, tutti);
    if (ok) continue;
    break;
  }
  const risolto = cor.filter(Boolean).length === n;
  return { risolto, sol: risolto ? cor.map(x => (x ? 1 : 0)) : null, passi, conteggio };
}

/* ---------------- Livello ----------------
   Dai passi del risolutore. Calibrato sulle statistiche dei generati (strumenti/mental.js --statistiche). */
function punteggio(ris) {
  let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t];
  return s;
}
function livello(p, ris) {
  const c = ris.conteggio, alte = (c.confine2 || 0) + 2 * (c.confine3 || 0), base = (c.confine1 || 0) + (c.conflitto || 0);
  if (alte >= 3 || (c.confine3 || 0) >= 1) return 'estrema';
  if (alte >= 1 || (c.conflitto || 0) >= 5) return 'esperta';
  if (base >= 3) return 'impegnativa';
  return null;                                         // troppo facile: solo posti obbligati
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [8, 9], esperta: [9, 10], estrema: [10, 11] };
function genera(r, voluto, tentativi = 400) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto] || [9]);
    const p = candidato(r, n);
    if (!p) continue;
    const ris = risolvi(p);
    if (!ris.risolto) continue;
    if (livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function candidato(r, n) {
  // 1. una soluzione: una corona per riga e per colonna, mai a contatto
  const pos = Array(n).fill(-1), usa = Array(n).fill(false);
  const giro = k => {
    if (k === n) return true;
    for (const c of r.mescola([...Array(n).keys()])) {
      if (usa[c] || (k > 0 && Math.abs(pos[k - 1] - c) <= 1)) continue;
      usa[c] = true; pos[k] = c;
      if (giro(k + 1)) return true;
      usa[c] = false;
    }
    return false;
  };
  if (!giro(0)) return null;
  const N = n * n, reg = Array(N).fill(-1), regine = pos.map((c, k) => k * n + c);
  // 2. regioni: ogni regione parte da una corona e cresce a caso (caselle confinanti di lato)
  regine.forEach((i, g) => { reg[i] = g; });
  let liberi = N - n;
  while (liberi > 0) {
    const bordo = [];
    for (let i = 0; i < N; i++) if (reg[i] < 0) for (const j of M.intorno(n, i, false)) if (reg[j] >= 0) bordo.push([i, reg[j]]);
    const [i, g] = r.scegli(bordo);
    if (reg[i] < 0) { reg[i] = g; liberi--; }
  }
  const p = { n, reg };
  // 3. si spostano caselle di confine finché la soluzione è unica
  let k = conta(p, 40);
  for (let it = 0; it < 600 && k > 1; it++) {
    const altra = conta.ultima;                       // una soluzione (forse quella vera)
    const cand = [];
    for (let i = 0; i < N; i++) {
      if (regine.includes(i)) continue;
      for (const j of M.intorno(n, i, false)) if (reg[j] !== reg[i]) cand.push([i, reg[j]]);
    }
    // preferisce le caselle dove la soluzione sbagliata mette una corona
    const sbagliate = altra ? cand.filter(([i]) => altra[i] && !regine.includes(i)) : [];
    const [i, g] = r.scegli(sbagliate.length && r.p(0.6) ? sbagliate : cand);
    const vecchia = reg[i];
    reg[i] = g;
    if (!connessa(n, reg, vecchia)) { reg[i] = vecchia; continue; }
    const k2 = conta(p, 40);
    if (k2 <= k || r.p(0.05)) k = k2; else reg[i] = vecchia;
  }
  if (conta(p, 2) !== 1) return null;
  return p;
}
function connessa(n, reg, g) {
  const celle = []; for (let i = 0; i < reg.length; i++) if (reg[i] === g) celle.push(i);
  if (!celle.length) return false;
  const vista = new Set([celle[0]]), coda = [celle[0]];
  while (coda.length) { const x = coda.pop(); for (const y of M.intorno(n, x, false)) if (reg[y] === g && !vista.has(y)) { vista.add(y); coda.push(y); } }
  return vista.size === celle.length;
}
/* Controllo di una sfida già pronta (lo usano le prove e lo strumento) */
function valida(p) {
  if (!p || !Number.isInteger(p.n) || p.n < 5 || p.n > 12 || !Array.isArray(p.reg) || p.reg.length !== p.n * p.n) return 'forma';
  for (let g = 0; g < p.n; g++) if (!connessa(p.n, p.reg, g)) return 'regione ' + g + ' non connessa';
  if (p.reg.some(g => !Number.isInteger(g) || g < 0 || g >= p.n)) return 'regioni';
  return null;
}

const E = {
  id: 'corone', nome: 'Corone', tipo: 'segni', TECNICHE, MISURE,
  breve: 'Una corona per riga, colonna e regione, mai a contatto.',
  regole: [
    'Metti una <b>corona</b> in ogni riga, in ogni colonna e in ogni regione colorata.',
    'Due corone <b>non si toccano</b>, nemmeno in diagonale.',
    'Tocca una casella per segnare una croce (vuota di sicuro), tocca ancora per la corona. Trascina per segnare croci in fila.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida
};
if (M) M.motori.corone = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
