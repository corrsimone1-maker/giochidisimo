/* =====================================================================
   MENTAL · NONOGRAMMA
   Griglia w×h da annerire. I numeri a sinistra di ogni riga (e sopra ogni colonna) dicono
   i blocchi di caselle piene, in ordine, separati da almeno una casella vuota.
   Alla fine compare un disegno (astratto: macchie generate a caso, a volte simmetriche).

   Dati: { w, h, righe: [[blocchi]], colonne: [[blocchi]] }   ([] = fila vuota)
   Stato: { c: [w·h] } 0 da decidere, 1 piena, 2 segnata vuota (croce).

   Tecniche del risolutore «umano»:
     linea     analisi di una fila: tra tutti i modi di sistemare i suoi blocchi compatibili con
               quello che si sa, le caselle piene (o vuote) in tutti;
     ipotesi   «se questa casella fosse piena…»: ragionando solo per file si arriva a una
               contraddizione, quindi è vuota (o il contrario).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  linea: { nome: 'Analisi della fila', descr: 'Tra tutti i modi di sistemare i blocchi di una fila, alcune caselle sono piene (o vuote) in tutti.', peso: 1 },
  ipotesi: { nome: 'Se fosse piena…', descr: 'Annerendo una casella, ragionando fila per fila si arriva a una contraddizione: quindi è vuota (o il contrario).', peso: 6 }
};

/* Blocchi di una sequenza di 0/1 */
function blocchi(a) { const out = []; let k = 0; for (const x of a) { if (x) k++; else if (k) { out.push(k); k = 0; } } if (k) out.push(k); return out; }
const uguali = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
/* Le file: { celle, b (blocchi), nome } */
function file(p) {
  const out = [];
  for (let r = 0; r < p.h; r++) out.push({ celle: Array.from({ length: p.w }, (_, c) => r * p.w + c), b: p.righe[r], nome: 'riga ' + (r + 1) });
  for (let c = 0; c < p.w; c++) out.push({ celle: Array.from({ length: p.h }, (_, r) => r * p.w + c), b: p.colonne[c], nome: 'colonna ' + (c + 1) });
  return out;
}

/* ---------------- Analisi di una fila (programmazione dinamica) ----------------
   s: celle note (-1 non so, 0 vuota, 1 piena). Restituisce null se nessun modo è
   compatibile, altrimenti [puòPiena, puòVuota] per ogni casella. */
function analizza(s, b) {
  const L = s.length, k = b.length;
  // vuoto[i][j]: le celle da i a j−1 possono essere vuote (prefissi)
  const vuoteFino = Array(L + 1).fill(0);           // quante celle «piene per forza» fino a i
  for (let i = 0; i < L; i++) vuoteFino[i + 1] = vuoteFino[i] + (s[i] === 1 ? 1 : 0);
  const nienteVuote = Array(L + 1).fill(0);          // quante «vuote per forza» fino a i
  for (let i = 0; i < L; i++) nienteVuote[i + 1] = nienteVuote[i] + (s[i] === 0 ? 1 : 0);
  const sta = (j, i) => i + b[j] <= L && nienteVuote[i + b[j]] - nienteVuote[i] === 0 && (i + b[j] === L || s[i + b[j]] !== 1);
  // F[i][j]: le celle prima di i sistemano esattamente i primi j blocchi (e i è libera di iniziare)
  const F = Array.from({ length: L + 2 }, () => Array(k + 1).fill(false));
  F[0][0] = true;
  for (let i = 0; i < L; i++) for (let j = 0; j <= k; j++) {
    if (!F[i][j]) continue;
    if (s[i] !== 1) F[i + 1][j] = true;
    if (j < k && sta(j, i)) { const e = i + b[j]; F[e === L ? L : e + 1][j + 1] = true; }
  }
  if (!F[L][k]) return null;
  // B[i][j]: dalle celle da i in poi si sistemano esattamente i blocchi da j in poi
  const B = Array.from({ length: L + 2 }, () => Array(k + 1).fill(false));
  B[L][k] = true;
  for (let i = L - 1; i >= 0; i--) for (let j = 0; j <= k; j++) {
    let ok = s[i] !== 1 && B[i + 1][j];
    if (!ok && j < k && sta(j, i)) { const e = i + b[j]; ok = e === L ? B[L][j + 1] : B[e + 1][j + 1]; }
    B[i][j] = ok;
  }
  const piena = Array(L).fill(false), vuota = Array(L).fill(false), diff = Array(L + 1).fill(0);
  for (let i = 0; i < L; i++) for (let j = 0; j <= k; j++) {
    if (!F[i][j]) continue;
    if (s[i] !== 1 && B[i + 1][j]) vuota[i] = true;
    if (j < k && sta(j, i)) {
      const e = i + b[j];
      const dopo = e === L ? B[L][j + 1] : B[e + 1][j + 1];
      if (dopo) { diff[i]++; diff[e]--; if (e < L) vuota[e] = true; }
    }
  }
  for (let i = 0, acc = 0; i < L; i++) { acc += diff[i]; if (acc > 0) piena[i] = true; }
  void vuoteFino;
  return [piena, vuota];
}

/* Propagazione per file su v (-1, 0, 1). Restituisce false se trova una contraddizione.
   conta: callback(nomeFila) a ogni fila che ha deciso qualcosa. */
function propaga(L, v, conta) {
  const coda = L.map((_, k) => k), inCoda = L.map(() => true);
  const delleCelle = new Map();
  L.forEach((f, k) => f.celle.forEach(i => { if (!delleCelle.has(i)) delleCelle.set(i, []); delleCelle.get(i).push(k); }));
  while (coda.length) {
    const k = coda.shift(); inCoda[k] = false;
    const f = L[k], s = f.celle.map(i => v[i]);
    const a = analizza(s, f.b);
    if (!a) return false;
    let fatto = false;
    for (let q = 0; q < s.length; q++) {
      if (s[q] >= 0) continue;
      const [pp, pv] = [a[0][q], a[1][q]];
      if (!pp && !pv) return false;
      if (pp && pv) continue;
      const i = f.celle[q]; v[i] = pp ? 1 : 0; fatto = true;
      for (const k2 of delleCelle.get(i)) if (!inCoda[k2]) { inCoda[k2] = true; coda.push(k2); }
    }
    if (fatto && conta) conta(f.nome);
  }
  return true;
}

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { c: Array(p.w * p.h).fill(0) }; }
/* File già a posto (i blocchi pieni sono esattamente i numeri): 'r3', 'c0', … */
function fileFatte(p, st) {
  const out = [];
  for (const [k, f] of file(p).entries()) if (uguali(blocchi(f.celle.map(i => st.c[i] === 1 ? 1 : 0)), f.b)) out.push(k < p.h ? 'r' + k : 'c' + (k - p.h));
  return out;
}
/* File con più caselle piene del dovuto o blocchi impossibili */
function conflitti(p, st) {
  const out = new Set();
  for (const f of file(p)) {
    const s = f.celle.map(i => (st.c[i] === 1 ? 1 : st.c[i] === 2 ? 0 : -1));
    if (!analizza(s, f.b)) f.celle.forEach(i => { if (st.c[i] === 1) out.add(i); });
  }
  return [...out];
}
function completo(p, st) { return file(p).every(f => uguali(blocchi(f.celle.map(i => st.c[i] === 1 ? 1 : 0)), f.b)); }
function statoRisolto(p, sol) { return { c: sol.map(x => (x ? 1 : 2)) }; }

/* ---------------- Conteggio (ricerca completa con propagazione per file) ---------------- */
function conta(p, cap = 2) {
  const L = file(p), N = p.w * p.h;
  let tot = 0, prima = null;
  const giro = v => {
    if (!propaga(L, v)) return false;
    const i = v.indexOf(-1);
    if (i < 0) { tot++; if (!prima) prima = v.slice(); return tot >= cap; }
    for (const x of [1, 0]) { const w = v.slice(); w[i] = x; if (giro(w)) return true; }
    return false;
  };
  giro(Array(N).fill(-1));
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const L = file(p), N = p.w * p.h, v = Array(N).fill(-1);
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  if (!propaga(L, v, nome => segna('linea', { fila: nome }))) return { risolto: false, contraddizione: true, passi, conteggio };
  // ipotesi: tra tutte le caselle e i due valori, quella che porta prima a una contraddizione
  // (catena di file più corta), così il ragionamento resta alla portata di una persona
  for (let giri = 0; giri < N && v.includes(-1); giri++) {
    let meglio = null;
    for (let i = 0; i < N; i++) {
      if (v[i] >= 0) continue;
      for (const x of [1, 0]) {
        const w = v.slice(); w[i] = x;
        let lung = 0;
        if (!propaga(L, w, () => { lung++; }) && (!meglio || lung < meglio.lung)) meglio = { i, x, lung };
      }
    }
    if (!meglio) break;
    v[meglio.i] = 1 - meglio.x; segna('ipotesi', { cella: meglio.i, prova: meglio.x, catena: meglio.lung });
    if (!propaga(L, v, nome => segna('linea', { fila: nome }))) return { risolto: false, contraddizione: true, passi, conteggio };
  }
  const risolto = !v.includes(-1) && L.every(f => uguali(blocchi(f.celle.map(i => v[i])), f.b));
  return { risolto, sol: risolto ? v.slice() : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, li = ris.conteggio.linea || 0;
  const catena = Math.max(0, ...ris.passi.filter(x => x.t === 'ipotesi').map(x => x.catena));
  if (p.w >= 12 && ip >= 2 && ip <= 6 && catena <= 6) return 'estrema';
  if (p.w >= 12 && ip <= 1 && li >= 40) return 'esperta';
  if (p.w <= 10 && ip === 0 && li >= 25) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ----------------
   Macchie: rumore a caso lisciato un paio di volte (una casella diventa piena se lo è la
   maggioranza delle sue vicine), a volte specchiato a metà. */
const MISURE = { impegnativa: [[10, 10]], esperta: [[12, 12]], estrema: [[12, 12]] };
function disegno(r, w, h) {
  const dens = 0.42 + r(15) / 100, simm = r(2) === 0;
  let a = Array.from({ length: w * h }, () => (r.f() < dens ? 1 : 0));
  for (let giro = 0; giro < 2; giro++) {
    const b = a.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue; s += a[yy * w + xx]; n++; }
      b[y * w + x] = 2 * s > n ? 1 : 2 * s < n ? 0 : a[y * w + x];
    }
    a = b;
  }
  if (simm) for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) a[y * w + (w - 1 - x)] = a[y * w + x];
  return a;
}
function daDisegno(a, w, h) {
  return {
    w, h,
    righe: Array.from({ length: h }, (_, y) => blocchi(a.slice(y * w, y * w + w))),
    colonne: Array.from({ length: w }, (_, x) => blocchi(Array.from({ length: h }, (_, y) => a[y * w + x])))
  };
}
function genera(r, voluto, tentativi = 3000) {
  for (let t = 0; t < tentativi; t++) {
    const [w, h] = r.scegli(MISURE[voluto]);
    const a = disegno(r, w, h);
    const piene = a.reduce((s, x) => s + x, 0);
    if (piene < 0.35 * w * h || piene > 0.68 * w * h) continue;
    const p = daDisegno(a, w, h);
    // niente file vuote o piene del tutto: sono gratis e brutte
    if ([...p.righe, ...p.colonne].some(b => !b.length)) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.w) || !Number.isInteger(p.h) || !Array.isArray(p.righe) || !Array.isArray(p.colonne)) return 'forma';
  if (p.righe.length !== p.h || p.colonne.length !== p.w) return 'misure';
  const sr = p.righe.flat().reduce((s, x) => s + x, 0), sc = p.colonne.flat().reduce((s, x) => s + x, 0);
  if (sr !== sc) return 'somme diverse';
  return null;
}

const E = {
  id: 'nonogramma', nome: 'Nonogramma', tipo: 'nonogramma', TECNICHE, MISURE,
  breve: 'Annerisci le caselle seguendo i numeri: alla fine compare un disegno.',
  regole: [
    'I numeri accanto a ogni riga (e sopra ogni colonna) sono i <b>blocchi di caselle piene</b>, nell’ordine.',
    'Tra due blocchi c’è almeno una casella vuota. Esempio: <b>3 1</b> vuol dire tre piene di fila, almeno una vuota, poi una piena.',
    'Tocca per annerire; con <b>Croce</b> acceso segni le caselle che sai vuote. Puoi trascinare il dito per riempirne tante.',
    'Le righe e colonne già a posto si spengono. Il disegno è unico: si trova sempre ragionando.'
  ],
  nuovoStato, conflitti, fileFatte, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida,
  analizza, blocchi
};
if (M) M.motori.nonogramma = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
