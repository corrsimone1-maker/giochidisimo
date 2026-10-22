/* =====================================================================
   MENTAL · LA CALCOLATRICE ROTTA
   Una calcolatrice con pochi tasti strani (+3, ×2, «cancella l'ultima cifra», «rovescia»…), un
   numero di partenza e uno da raggiungere in al massimo un certo numero di mosse. Il numero di
   mosse è proprio il minimo: un programma ha provato tutte le strade (ricerca in ampiezza).

   Dati: { da, a, mosse, tasti: [tasto] }    tasto: { t, k? }
     '+' '-' '*' k      somma, sottrae, moltiplica per k
     '/' k              divide per k (solo se viene intero; se no il tasto non fa niente)
     'app' k            scrive la cifra k in fondo (12 → 125)
     'canc'             cancella l'ultima cifra (125 → 12; una cifra sola → 0)
     'inv'              rovescia le cifre (120 → 21), il segno resta
     'neg'              cambia segno
     'quad'             eleva al quadrato
     'somma'            somma delle cifre (con il segno)
     'sost' a b         sostituisce ogni cifra a con b (161 con 1→2 → 262)
   Stato: { v: valore sul display, seq: [indici dei tasti premuti] }
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const LIMITE = 999999;
const TECNICHE = {
  indietro: { nome: 'Ragionare all’indietro', descr: 'Partire dal numero da raggiungere e chiedersi da dove si può arrivare.', peso: 3 },
  strada: { nome: 'Una sola strada corta', descr: 'Le strade più corte sono pochissime: ogni tasto sbagliato costa una mossa che non c’è.', peso: 4 }
};

function premi(v, t) {
  const s = v < 0 ? -1 : 1, a = Math.abs(v), cifre = String(a);
  let x;
  switch (t.t) {
    case '+': x = v + t.k; break;
    case '-': x = v - t.k; break;
    case '*': x = v * t.k; break;
    case '/': if (v % t.k !== 0) return null; x = v / t.k; break;
    case 'app': x = s * (a * 10 + t.k); if (v === 0) x = t.k; break;
    case 'canc': x = cifre.length <= 1 ? 0 : s * Math.floor(a / 10); break;
    case 'inv': x = s * Number(cifre.split('').reverse().join('')); break;
    case 'neg': x = -v; break;
    case 'quad': x = v * v; break;
    case 'somma': x = s * cifre.split('').reduce((q, c) => q + +c, 0); break;
    case 'sost': x = s * Number(cifre.split(String(t.a)).join(String(t.b))); break;
    default: return null;
  }
  if (!Number.isInteger(x) || Math.abs(x) > LIMITE) return null;
  return x === 0 ? 0 : x;                     // niente «-0»
}
function etichetta(t) {
  switch (t.t) {
    case '+': return '+' + t.k;
    case '-': return '−' + t.k;
    case '*': return '×' + t.k;
    case '/': return '÷' + t.k;
    case 'app': return String(t.k);
    case 'canc': return '⌫';
    case 'inv': return '⇄';
    case 'neg': return '+/−';
    case 'quad': return 'x²';
    case 'somma': return 'Σ';
    case 'sost': return t.a + '→' + t.b;
  }
  return '?';
}
function spiegaTasto(t) {
  switch (t.t) {
    case 'app': return `scrive un ${t.k} in fondo`;
    case 'canc': return 'cancella l’ultima cifra';
    case 'inv': return 'rovescia le cifre';
    case 'neg': return 'cambia il segno';
    case 'quad': return 'eleva al quadrato';
    case 'somma': return 'somma le cifre';
    case 'sost': return `cambia ogni ${t.a} in ${t.b}`;
    case '/': return `divide per ${t.k} (solo se viene intero)`;
  }
  return null;
}
/* Ricerca in ampiezza: distanza minima di ogni numero dalla partenza, e quante strade minime */
function bfs(p, maxProf) {
  const dist = new Map([[p.da, 0]]), strade = new Map([[p.da, 1]]), padre = new Map();
  let fronte = [p.da];
  for (let d = 0; d < maxProf && fronte.length; d++) {
    const nuovo = [];
    for (const v of fronte) p.tasti.forEach((t, i) => {
      const x = premi(v, t); if (x == null) return;
      if (!dist.has(x)) { dist.set(x, d + 1); strade.set(x, strade.get(v)); padre.set(x, [v, i]); nuovo.push(x); }
      else if (dist.get(x) === d + 1) strade.set(x, strade.get(x) + strade.get(v));
    });
    fronte = nuovo;
  }
  return { dist, strade, padre };
}
function strada(p) {
  const { dist, padre } = bfs(p, p.mosse);
  if (!dist.has(p.a)) return null;
  const seq = []; let v = p.a;
  while (v !== p.da) { const [u, i] = padre.get(v); seq.unshift(i); v = u; }
  return seq;
}

/* ---------------- Interfaccia comune ---------------- */
function nuovoStato(p) { return { v: p.da, seq: [] }; }
function completo(p, st) { return st.v === p.a && st.seq.length <= p.mosse; }
function conflitti() { return []; }
function statoRisolto(p, sol) { let v = p.da; for (const i of sol) v = premi(v, p.tasti[i]); return { v, seq: sol.slice() }; }
function conta(p) { const { dist } = bfs(p, p.mosse); const ok = dist.get(p.a) === p.mosse; conta.ultima = ok ? strada(p) : null; return ok ? 1 : 0; }
function risolvi(p) {
  const { dist, strade } = bfs(p, p.mosse), s = strada(p);
  const conteggio = { indietro: 1 };
  if (strade.get(p.a) <= 2) conteggio.strada = 1;
  return { risolto: dist.get(p.a) === p.mosse && !!s, sol: s, passi: [], conteggio, strade: strade.get(p.a) };
}
function livello(p, ris) {
  if (p.mosse >= 7) return 'estrema';
  if (p.mosse >= 5) return 'esperta';
  if (p.mosse >= 4) return 'impegnativa';
  return null;
}
const MISURE = { impegnativa: [[3, 4]], esperta: [[4, 5], [4, 6]], estrema: [[4, 7], [4, 8]] };
function tastoACaso(r) {
  const tipo = r.scegli(['+', '+', '-', '*', '*', '/', 'app', 'app', 'canc', 'inv', 'inv', 'neg', 'quad', 'somma', 'sost']);
  switch (tipo) {
    case '+': return { t: '+', k: 1 + r(9) };
    case '-': return { t: '-', k: 1 + r(9) };
    case '*': return { t: '*', k: 2 + r(4) };
    case '/': return { t: '/', k: 2 + r(3) };
    case 'app': return { t: 'app', k: r(10) };
    case 'sost': { const a = 1 + r(9); let b = r(10); while (b === a) b = r(10); return { t: 'sost', a, b }; }
    default: return { t: tipo };
  }
}
function genera(r, voluto, tentativi = 3000) {
  for (let q = 0; q < tentativi; q++) {
    const [nt, D] = r.scegli(MISURE[voluto]);
    const tasti = [];
    while (tasti.length < nt) { const t = tastoACaso(r); if (!tasti.some(x => JSON.stringify(x) === JSON.stringify(t))) tasti.push(t); }
    // almeno un tasto «strano» (non + − × ÷)
    if (!tasti.some(t => !['+', '-', '*', '/'].includes(t.t))) continue;
    const da = r(r.f() < 0.5 ? 10 : 60);
    const p = { da, a: null, mosse: D, tasti };
    const { dist, strade } = bfs(p, D);
    // bersagli a distanza esattamente D, non troppo grandi, con poche strade minime
    const cand = [...dist.entries()].filter(([v, d]) => d === D && Math.abs(v) <= 9999 && v !== da && strade.get(v) <= (voluto === 'impegnativa' ? 3 : 2));
    if (!cand.length) continue;
    p.a = r.scegli(cand)[0];
    // ogni tasto deve servire in almeno una strada minima? Basta che la strada trovata usi più tasti diversi
    const s = strada(p);
    if (new Set(s).size < Math.min(3, nt)) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Array.isArray(p.tasti) || !Number.isInteger(p.da) || !Number.isInteger(p.a) || !(p.mosse > 0)) return 'forma';
  const { dist } = bfs(p, p.mosse);
  if (dist.get(p.a) !== p.mosse) return 'il minimo non è ' + p.mosse;
  return null;
}

const E = {
  id: 'calcolatrice', nome: 'La calcolatrice rotta', tipo: 'calcolatrice', famiglia: 'numeri', TECNICHE, MISURE,
  breve: 'Pochi tasti strani: arriva al numero giusto nelle mosse che hai.',
  regole: [
    'Parti dal numero sul display e premi i tasti per arrivare al <b>numero da raggiungere</b>.',
    'Hai un numero massimo di mosse, ed è proprio il <b>minimo possibile</b>: ogni tasto conta.',
    'Se finisci le mosse, annulla o ricomincia: il tempo continua, ma non ci sono penalità.'
  ],
  nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  premi, etichetta, spiegaTasto, strada
};
if (M) M.motori.calcolatrice = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
