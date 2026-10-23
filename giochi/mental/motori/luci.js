/* =====================================================================
   MENTAL · LUCI (illumina la griglia, alla Akari)
   Una griglia di caselle bianche e nere. Nelle bianche si mettono lampadine: ognuna illumina la sua
   casella e tutte quelle in riga e in colonna fino a una casella nera o al bordo. Tutte le caselle
   bianche devono essere illuminate, e due lampadine non devono illuminarsi a vicenda. Un numero su una
   casella nera dice quante lampadine ci sono accanto (sopra, sotto, a destra, a sinistra).

   Dati: { w, h, nere: [[i, numero]] }   numero −1 se la casella nera non ha numero.
   Stato: { c: [w·h] }  0 vuota, 1 punto (niente lampadina), 2 lampadina; le nere restano 0.

   Tecniche del risolutore «umano»:
     numeri     un numero con già tutte le sue lampadine ha il resto senza; se le caselle libere
                accanto sono quante ne mancano, sono tutte lampadine;
     luce       una lampadina illumina la sua riga e la sua colonna: lì non ne va un'altra;
     buio       una casella che può essere illuminata da un solo posto: lì c'è una lampadina;
     ipotesi    «se qui ci fosse una lampadina…»: con le tecniche sopra si arriva a una contraddizione.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  numeri: { nome: 'I numeri', descr: 'Un numero con tutte le sue lampadine ha il resto spento; se i posti liberi sono quanti ne mancano, sono lampadine.', peso: 1 },
  luce: { nome: 'Luce', descr: 'Una lampadina illumina riga e colonna fino al nero: lì non ne va un’altra.', peso: 1 },
  buio: { nome: 'Un solo interruttore', descr: 'Una casella al buio che può prendere luce da un solo posto: la lampadina è lì.', peso: 2 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se qui ci fosse una lampadina…»: si arriva a una contraddizione, quindi non va (o il contrario).', peso: 6 }
};
const NO = 0, SI = 1, IGNOTA = -1, NERA = 2;

/* per ogni casella bianca, le caselle che vede (riga e colonna fino al nero), lei esclusa */
function vista(p) {
  const { w, h } = p, nere = new Set(p.nere.map(x => x[0])), out = new Map();
  for (let i = 0; i < w * h; i++) {
    if (nere.has(i)) continue;
    const r = Math.floor(i / w), k = i % w, o = [];
    for (let x = k - 1; x >= 0 && !nere.has(r * w + x); x--) o.push(r * w + x);
    for (let x = k + 1; x < w && !nere.has(r * w + x); x++) o.push(r * w + x);
    for (let y = r - 1; y >= 0 && !nere.has(y * w + k); y--) o.push(y * w + k);
    for (let y = r + 1; y < h && !nere.has(y * w + k); y++) o.push(y * w + k);
    out.set(i, o);
  }
  return out;
}
const accanto = (p, i) => { const { w, h } = p, r = Math.floor(i / w), k = i % w, o = []; if (r > 0) o.push(i - w); if (r < h - 1) o.push(i + w); if (k > 0) o.push(i - 1); if (k < w - 1) o.push(i + 1); return o; };
function iniziale(p) { const a = Array(p.w * p.h).fill(IGNOTA); for (const [i] of p.nere) a[i] = NERA; return a; }

/* ---------------- Regole: null se contraddizione, altrimenti caselle decise ---------------- */
function regolaLuce(p, a, V) {
  let f = 0;
  for (const [i, o] of V) if (a[i] === SI) for (const j of o) { if (a[j] === SI) return null; if (a[j] === IGNOTA) { a[j] = NO; f++; } }
  return f;
}
function regolaNumeri(p, a) {
  let f = 0;
  for (const [i, num] of p.nere) {
    if (num < 0) continue;
    const vic = accanto(p, i).filter(j => a[j] !== NERA);
    const si = vic.filter(j => a[j] === SI).length, ig = vic.filter(j => a[j] === IGNOTA);
    if (si > num || si + ig.length < num) return null;
    if (!ig.length) continue;
    if (si === num) for (const j of ig) { a[j] = NO; f++; }
    else if (si + ig.length === num) for (const j of ig) { a[j] = SI; f++; }
  }
  return f;
}
function regolaBuio(p, a, V, soloUna) {
  let f = 0;
  for (const [i, o] of V) {
    if (a[i] === SI || o.some(j => a[j] === SI)) continue;          // già illuminata
    const posti = (a[i] === IGNOTA ? [i] : []).concat(o.filter(j => a[j] === IGNOTA));
    if (!posti.length) return null;
    if (posti.length === 1) { a[posti[0]] = SI; f++; if (soloUna) return f; if (regolaLuce(p, a, V) === null) return null; }
  }
  return f;
}
function chiudi(p, a, V) {
  for (let g = 0; g < 1000; g++) {
    let f = 0;
    for (const reg of [() => regolaLuce(p, a, V), () => regolaNumeri(p, a), () => regolaBuio(p, a, V)]) { const x = reg(); if (x === null) return null; f += x; }
    if (!f) return a;
  }
  return a;
}
function finale(p, a, V) {
  for (const [i, o] of V) {
    if (a[i] === IGNOTA) return false;
    if (a[i] === SI && o.some(j => a[j] === SI)) return false;
    if (a[i] !== SI && !o.some(j => a[j] === SI)) return false;
  }
  for (const [i, num] of p.nere) if (num >= 0 && accanto(p, i).filter(j => a[j] === SI).length !== num) return false;
  return true;
}

/* ---------------- Interfaccia ---------------- */
function nuovoStato(p) { return { c: Array(p.w * p.h).fill(0) }; }
/* caselle illuminate dalle lampadine dello stato */
function illuminate(p, st) {
  const V = vista(p), out = new Set();
  for (const [i, o] of V) if (st.c[i] === 2) { out.add(i); o.forEach(j => out.add(j)); }
  return out;
}
function conflitti(p, st) {
  const V = vista(p), out = new Set();
  for (const [i, o] of V) if (st.c[i] === 2) for (const j of o) if (st.c[j] === 2) { out.add(i); out.add(j); }
  return [...out];
}
/* numeri sbagliati: troppe lampadine, o tutte le caselle accanto decise e il conto non torna */
function numeriSbagliati(p, st) {
  const out = [];
  for (const [i, num] of p.nere) {
    if (num < 0) continue;
    const vic = accanto(p, i).filter(j => !p.nere.some(x => x[0] === j));
    const si = vic.filter(j => st.c[j] === 2).length;
    if (si > num || (vic.every(j => st.c[j]) && si !== num)) out.push(i);
  }
  return out;
}
function completo(p, st) { const a = iniziale(p); for (let i = 0; i < a.length; i++) if (a[i] !== NERA) a[i] = st.c[i] === 2 ? SI : NO; return finale(p, a, vista(p)); }
function statoRisolto(p, sol) { const nere = new Set(p.nere.map(x => x[0])); return { c: sol.map((x, i) => (nere.has(i) ? 0 : x ? 2 : 1)) }; }

/* ---------------- Conteggio ----------------
   Dopo la propagazione una casella ignota è sempre al buio (una casella illuminata non può avere una
   lampadina: vedrebbe quella che la illumina). Si sceglie la casella al buio con meno posti da cui
   prendere luce e si prova il primo: acceso o spento. */
function conta(p, cap = 2) {
  const V = vista(p);
  let tot = 0, prima = null; const tutte = [];
  const giro = a => {
    if (chiudi(p, a, V) === null) return false;
    let mp = null;
    for (const [i, o] of V) {
      if (a[i] === SI || o.some(j => a[j] === SI)) continue;
      const posti = (a[i] === IGNOTA ? [i] : []).concat(o.filter(j => a[j] === IGNOTA));
      if (!mp || posti.length < mp.length) mp = posti;
    }
    if (!mp) {
      if (a.includes(IGNOTA) || !finale(p, a, V)) return false;
      tot++; tutte.push(a.map(x => (x === SI ? 1 : 0))); prima = prima || tutte[0]; return tot >= cap;
    }
    for (const v of [SI, NO]) { const c = a.slice(); c[mp[0]] = v; if (giro(c)) return true; }
    return false;
  };
  giro(iniziale(p));
  conta.ultima = prima; conta.tutte = tutte;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, opz = {}) {
  const V = vista(p), a = iniziale(p), passi = [], conteggio = {};
  const segna = t => { passi.push({ t }); conteggio[t] = (conteggio[t] || 0) + 1; };
  const tec = [['luce', () => regolaLuce(p, a, V)], ['numeri', () => regolaNumeri(p, a)], ['buio', () => regolaBuio(p, a, V, true)]];
  const N = p.w * p.h;
  for (let g = 0; g < 4 * N; g++) {
    if (!a.includes(IGNOTA)) break;
    let mosso = false;
    for (const [t, f] of tec) { const x = f(); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let fatto = false;
    for (let i = 0; i < N && !fatto; i++) {
      if (a[i] !== IGNOTA) continue;
      for (const v of [SI, NO]) { const c = a.slice(); c[i] = v; if (chiudi(p, c, V) === null) { a[i] = v === SI ? NO : SI; segna('ipotesi'); fatto = true; break; } }
    }
    if (!fatto) break;
  }
  const risolto = !a.includes(IGNOTA) && finale(p, a, V);
  return { risolto, sol: risolto ? a.map(x => (x === SI ? 1 : 0)) : null, passi, conteggio };
}
function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, lato = Math.max(p.w, p.h);
  if (ip > 8) return null;
  if (lato >= 10 && ip >= 1) return 'estrema';
  if (lato >= 8 && ip >= 2) return 'estrema';
  if (lato >= 8 && !ip) return 'esperta';
  if (lato <= 7 && !ip) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [7], esperta: [8, 9], estrema: [9, 10] };
function genera(r, voluto, tentativi = 200) {
  for (let q = 0; q < tentativi; q++) {
    const n = r.scegli(MISURE[voluto]);
    // caselle nere simmetriche (mezzo giro)
    const nero = Array(n * n).fill(false);
    const quante = Math.round(n * n * (0.16 + r.f() * 0.06));
    for (let t = 0; t < 500 && nero.filter(Boolean).length < quante; t++) { const i = r(n * n); nero[i] = true; nero[n * n - 1 - i] = true; }
    const p0 = { w: n, h: n, nere: [] }; for (let i = 0; i < n * n; i++) if (nero[i]) p0.nere.push([i, -1]);
    const V = vista(p0);
    // lampadine: in una casella al buio a caso, finché tutto è illuminato
    const lamp = Array(n * n).fill(0), luce = Array(n * n).fill(false);
    for (let t = 0; t < 5000; t++) {
      const buie = [...V.keys()].filter(i => !luce[i]);
      if (!buie.length) break;
      const i = r.scegli(buie);
      lamp[i] = 1; luce[i] = true; for (const j of V.get(i)) luce[j] = true;
    }
    const p = { w: n, h: n, nere: p0.nere.map(([i]) => [i, accanto(p0, i).filter(j => lamp[j]).length]) };
    if (conta(p, 2) !== 1) continue;
    // via i numeri che non servono (prima quelli più «facili», gli zeri e i numeri alti), finché resta unica e risolvibile
    for (const x of r.mescola(p.nere.slice())) {
      const v = x[1]; x[1] = -1;
      if (conta(p, 2) !== 1 || !risolvi(p).risolto || (voluto !== 'impegnativa' && r.f() < 0.15)) x[1] = v;
    }
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.w) || !Number.isInteger(p.h) || !Array.isArray(p.nere)) return 'forma';
  for (const [i, x] of p.nere) if (!(i >= 0 && i < p.w * p.h) || !(x >= -1 && x <= 4)) return 'casella nera storta';
  return null;
}

const E = {
  id: 'luci', nome: 'Luci', tipo: 'luci', famiglia: 'griglia', TECNICHE, MISURE,
  breve: 'Accendi lampadine finché tutto è illuminato, senza che due si vedano.',
  regole: [
    'Metti lampadine nelle caselle bianche: ognuna illumina la sua casella e la riga e la colonna, <b>fino al nero</b> o al bordo.',
    'Tutte le caselle bianche devono essere <b>illuminate</b>, e due lampadine <b>non si vedono</b> mai.',
    'Un numero su una casella nera dice quante lampadine ci sono accanto (sopra, sotto, a destra, a sinistra).',
    'Tocca una casella: lampadina, poi punto (qui no), poi vuota. Trascinando si mettono i punti.'
  ],
  nuovoStato, conflitti, numeriSbagliati, illuminate, completo, statoRisolto, conta, risolvi, livello, genera, valida
};
if (M) M.motori.luci = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
