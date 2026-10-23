/* =====================================================================
   MENTAL · GABBIE (aritmetica nelle gabbie, alla KenKen)
   Griglia n×n con le cifre da 1 a n, ognuna una volta per riga e per colonna. La griglia è divisa
   in gabbie: ogni gabbia ha un risultato e un'operazione, e le sue cifre, combinate con quella
   operazione, devono dare quel risultato. Nelle gabbie di due caselle la sottrazione e la divisione
   si fanno tra la più grande e la più piccola. Una gabbia di una casella dice la cifra.

   Dati: { n, gabbie: [{ c: [celle], o: '+' | '-' | '×' | '÷' | '', t }] }
   Stato: { v: [n·n], note: [n·n bitmask] }

   Tecniche del risolutore «umano»:
     gabbia     i conti di una gabbia: tra i modi di ottenere il risultato con le cifre ancora
                possibili, alcune cifre restano impossibili;
     singolo    singoli nudi e nascosti di riga e colonna;
     coppia     coppie nude in una riga o colonna;
     ipotesi    «se qui ci fosse questa cifra…»: con le tecniche sopra si arriva a una
                contraddizione, quindi quella cifra non va (un passo solo, mai tentativi alla cieca).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  gabbia: { nome: 'I conti della gabbia', descr: 'Tra i modi di fare il risultato con le cifre rimaste, alcune cifre non compaiono mai.', peso: 1 },
  singolo: { nome: 'Singolo', descr: 'Una casella ha una sola cifra possibile, o una cifra ha un solo posto nella fila.', peso: 1 },
  coppia: { nome: 'Coppia', descr: 'Due caselle di una fila con le stesse due cifre possibili: quelle cifre sono loro.', peso: 3 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se qui ci fosse questa cifra…»: si arriva a una contraddizione, quindi non va.', peso: 6 }
};
const bit = d => 1 << (d - 1);
const bits = (m, n) => { const o = []; for (let d = 1; d <= n; d++) if (m & bit(d)) o.push(d); return o; };
const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

function file(n) {
  const out = [];
  for (let r = 0; r < n; r++) out.push({ celle: Array.from({ length: n }, (_, c) => r * n + c), nome: 'riga ' + (r + 1) });
  for (let c = 0; c < n; c++) out.push({ celle: Array.from({ length: n }, (_, r) => r * n + c), nome: 'colonna ' + (c + 1) });
  return out;
}
function vale(o, t, xs) {
  if (o === '') return xs.length === 1 && xs[0] === t;
  if (o === '+') return xs.reduce((a, b) => a + b, 0) === t;
  if (o === '×') return xs.reduce((a, b) => a * b, 1) === t;
  if (xs.length !== 2) return false;
  const a = Math.max(xs[0], xs[1]), b = Math.min(xs[0], xs[1]);
  if (o === '-') return a - b === t;
  if (o === '÷') return a % b === 0 && a / b === t;
  return false;
}
/* Tutti i modi di riempire una gabbia (in ordine di celle), senza ripetere cifre nella stessa riga o colonna */
const cacheTuple = new Map();
function tupleDi(n, g) {
  const key = n + '|' + g.o + '|' + g.t + '|' + g.c.join(',');
  if (cacheTuple.has(key)) return cacheTuple.get(key);
  const out = [], xs = [];
  const r = i => Math.floor(i / n), k = i => i % n;
  const giro = j => {
    if (j === g.c.length) { if (vale(g.o, g.t, xs)) out.push(xs.slice()); return; }
    for (let d = 1; d <= n; d++) {
      let ok = true;
      for (let q = 0; q < j && ok; q++) if (xs[q] === d && (r(g.c[q]) === r(g.c[j]) || k(g.c[q]) === k(g.c[j]))) ok = false;
      if (!ok) continue;
      // tagli: la somma o il prodotto non possono già superare il risultato
      if (g.o === '+' && xs.reduce((a, b) => a + b, 0) + d > g.t) continue;
      if (g.o === '×' && g.t % (xs.reduce((a, b) => a * b, 1) * d) !== 0) continue;
      xs.push(d); giro(j + 1); xs.pop();
    }
  };
  giro(0);
  cacheTuple.set(key, out);
  return out;
}

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { v: Array(p.n * p.n).fill(0), note: Array(p.n * p.n).fill(0) }; }
function gabbiaDi(p) { const g = Array(p.n * p.n).fill(-1); p.gabbie.forEach((x, k) => x.c.forEach(i => { g[i] = k; })); return g; }
function conflitti(p, st) {
  const out = new Set();
  for (const f of file(p.n))
    for (let a = 0; a < p.n; a++) for (let b = a + 1; b < p.n; b++) { const x = st.v[f.celle[a]]; if (x && x === st.v[f.celle[b]]) { out.add(f.celle[a]); out.add(f.celle[b]); } }
  for (const g of p.gabbie) {
    const xs = g.c.map(i => st.v[i]);
    if (xs.every(x => x) && !vale(g.o, g.t, xs)) g.c.forEach(i => out.add(i));
  }
  return [...out];
}
function completo(p, st) { return st.v.every(x => x > 0) && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { v: sol.slice(), note: Array(p.n * p.n).fill(0) }; }
function etichetta(g) { return g.o === '' ? String(g.t) : g.t + (g.o === '-' ? '−' : g.o); }

/* ---------------- Propagazione comune ---------------- */
function riduciGabbie(p, c, tuple, soloUna = false) {
  let cambio = false;
  for (let k = 0; k < p.gabbie.length; k++) {
    const g = p.gabbie[k], m = g.c.map(() => 0);
    let alcuna = false;
    for (const x of tuple[k]) {
      let ok = true;
      for (let q = 0; q < x.length; q++) if (!(c[g.c[q]] & bit(x[q]))) { ok = false; break; }
      if (!ok) continue;
      alcuna = true;
      for (let q = 0; q < x.length; q++) m[q] |= bit(x[q]);
    }
    if (!alcuna) return null;
    g.c.forEach((i, q) => { if (c[i] & ~m[q]) { c[i] &= m[q]; cambio = true; } });
    if (cambio && soloUna) return true;
  }
  return cambio;
}
function riduciFile(n, c, L) {
  let cambio = false;
  for (const f of L) {
    for (const i of f.celle) if (pop(c[i]) === 1) for (const j of f.celle) if (j !== i && (c[j] & c[i])) { c[j] &= ~c[i]; cambio = true; if (!c[j]) return null; }
    for (let d = 1; d <= n; d++) {
      const pos = f.celle.filter(i => c[i] & bit(d));
      if (!pos.length) return null;
      if (pos.length === 1 && c[pos[0]] !== bit(d)) { c[pos[0]] = bit(d); cambio = true; }
    }
  }
  return cambio;
}

/* ---------------- Conteggio: ricerca completa ---------------- */
function conta(p, cap = 2) {
  const n = p.n, N = n * n, L = file(n), TUTTE = (1 << n) - 1;
  const tuple = p.gabbie.map(g => tupleDi(n, g));
  let tot = 0, prima = null;
  const giro = c => {
    for (;;) {
      const a = riduciGabbie(p, c, tuple); if (a === null) return false;
      const b = riduciFile(n, c, L); if (b === null) return false;
      if (!a && !b) break;
    }
    let mi = -1, mp = 99;
    for (let i = 0; i < N; i++) { const q = pop(c[i]); if (q === 0) return false; if (q > 1 && q < mp) { mp = q; mi = i; } }
    if (mi < 0) { tot++; if (!prima) prima = c.map(m => bits(m, n)[0]); return tot >= cap; }
    for (const d of bits(c[mi], n)) { const c2 = c.slice(); c2[mi] = bit(d); if (giro(c2)) return true; }
    return false;
  };
  giro(Array(N).fill(TUTTE));
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, opz = {}) {
  const n = p.n, N = n * n, L = file(n), TUTTE = (1 << n) - 1;
  const tuple = p.gabbie.map(g => tupleDi(n, g));
  const c = Array(N).fill(TUTTE);
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  // le tecniche semplici, su una copia dei candidati: true se cambia qualcosa, null se c'è una contraddizione
  const gabbia = cc => riduciGabbie(p, cc, tuple, true);          // una gabbia per volta
  const singolo = cc => {
    for (const f of L) for (const i of f.celle) if (pop(cc[i]) === 1) for (const j of f.celle) if (j !== i && (cc[j] & cc[i])) { cc[j] &= ~cc[i]; if (!cc[j]) return null; return true; }
    for (const f of L) for (let d = 1; d <= n; d++) {
      const pos = f.celle.filter(i => cc[i] & bit(d));
      if (!pos.length) return null;
      if (pos.length === 1 && cc[pos[0]] !== bit(d)) { cc[pos[0]] = bit(d); return true; }
    }
    return false;
  };
  const coppia = cc => {
    for (const f of L) {
      const aperte = f.celle.filter(i => pop(cc[i]) > 1);
      for (let a = 0; a < aperte.length; a++) for (let b = a + 1; b < aperte.length; b++) {
        const m = cc[aperte[a]]; if (pop(m) !== 2 || cc[aperte[b]] !== m) continue;
        let fatto = false;
        for (const j of aperte) if (j !== aperte[a] && j !== aperte[b] && (cc[j] & m)) { cc[j] &= ~m; fatto = true; if (!cc[j]) return null; }
        if (fatto) return true;
      }
    }
    return false;
  };
  const semplici = [['singolo', singolo], ['gabbia', gabbia], ['coppia', coppia]];
  // propaga con le tecniche semplici fino a fermarsi; null se contraddizione
  const chiudi = cc => {
    for (let k = 0; k < 400; k++) {
      let mosso = false;
      for (const [, f] of semplici) { const x = f(cc); if (x === null) return null; if (x) { mosso = true; break; } }
      if (!mosso) return cc;
    }
    return cc;
  };
  const fatto = () => c.every(m => pop(m) === 1);
  for (let giri = 0; giri < 60 * N; giri++) {
    if (fatto()) break;
    let mosso = false;
    for (const [t, f] of semplici) { const x = f(c); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    // ipotesi: un candidato che porta subito a una contraddizione si toglie
    let tolto = false;
    for (let i = 0; i < N && !tolto; i++) {
      if (pop(c[i]) < 2) continue;
      for (const d of bits(c[i], n)) {
        const cc = c.slice(); cc[i] = bit(d);
        if (chiudi(cc) === null) { c[i] &= ~bit(d); segna('ipotesi', { cella: i, cifra: d }); tolto = true; break; }
      }
    }
    if (!tolto) break;
  }
  const v = c.map(m => (pop(m) === 1 ? bits(m, n)[0] : 0));
  const risolto = v.every(x => x) && conflitti(p, { v }).length === 0;
  return { risolto, sol: risolto ? v : null, passi, conteggio };
}

function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, cp = ris.conteggio.coppia || 0;
  if (ip > 10) return null;                                   // troppe ipotesi: non è più ragionamento
  if (p.n >= 6 && ip >= 1) return 'estrema';
  if (p.n === 7 && cp >= 2) return 'estrema';
  if (p.n === 6 && cp >= 1) return 'esperta';
  if (p.n === 5 && !ip) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [5], esperta: [6], estrema: [6, 7] };
/* Divide la griglia in gabbie connesse (per lo più di 2 e 3 caselle) */
const TAGLIE = { impegnativa: [1, 2, 2, 2, 3, 3, 3, 3, 4], esperta: [2, 2, 3, 3, 3, 3, 4, 4], estrema: [2, 3, 3, 3, 4, 4, 4] };
function dividi(r, n, taglie) {
  const N = n * n, g = Array(N).fill(-1), gabbie = [];
  const vicini = i => { const rr = Math.floor(i / n), k = i % n, o = []; if (rr > 0) o.push(i - n); if (rr < n - 1) o.push(i + n); if (k > 0) o.push(i - 1); if (k < n - 1) o.push(i + 1); return o; };
  for (const i of r.mescola([...Array(N).keys()])) {
    if (g[i] >= 0) continue;
    const voluta = r.scegli(taglie), celle = [i]; g[i] = gabbie.length;
    while (celle.length < voluta) {
      const liberi = [...new Set(celle.flatMap(vicini))].filter(j => g[j] < 0);
      if (!liberi.length) break;
      const j = r.scegli(liberi); g[j] = gabbie.length; celle.push(j);
    }
    gabbie.push(celle.sort((a, b) => a - b));
  }
  return gabbie;
}
function operazione(r, xs, voluto) {
  if (xs.length === 1) return { o: '', t: xs[0] };
  if (xs.length === 2) {
    const a = Math.max(...xs), b = Math.min(...xs), scelte = ['+', '×', '-', '-'];
    if (a % b === 0) scelte.push('÷', '÷', '÷');
    const o = r.scegli(scelte);
    return { o, t: o === '+' ? a + b : o === '×' ? a * b : o === '-' ? a - b : a / b };
  }
  const prod = xs.reduce((a, b) => a * b, 1);
  const o = prod <= 240 && r.f() < (voluto === 'impegnativa' ? 0.45 : 0.3) ? '×' : '+';
  return { o, t: o === '+' ? xs.reduce((a, b) => a + b, 0) : prod };
}
function genera(r, voluto, tentativi = 3000) {
  for (let q = 0; q < tentativi; q++) {
    const n = r.scegli(MISURE[voluto]);
    const sol = M.quadratoLatino(r, n);
    const parti = dividi(r, n, TAGLIE[voluto]);
    // al massimo una casella sola ogni dieci caselle
    if (parti.filter(c => c.length === 1).length > Math.max(1, Math.floor(n * n / 12))) continue;
    const p = { n, gabbie: parti.map(c => Object.assign({ c }, operazione(r, c.map(i => sol[i]), voluto))) };
    if (conta(p, 2) !== 1) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || !Array.isArray(p.gabbie)) return 'forma';
  const visto = Array(p.n * p.n).fill(0);
  for (const g of p.gabbie) {
    if (!Array.isArray(g.c) || !g.c.length || !['', '+', '-', '×', '÷'].includes(g.o) || !(g.t > 0)) return 'gabbia storta';
    if ((g.o === '-' || g.o === '÷') && g.c.length !== 2) return 'sottrazione o divisione con più di due caselle';
    if (g.o === '' && g.c.length !== 1) return 'gabbia senza operazione con più caselle';
    for (const i of g.c) { if (i < 0 || i >= p.n * p.n) return 'casella fuori'; visto[i]++; }
    // connessa
    const dentro = new Set(g.c), vis = new Set([g.c[0]]), coda = [g.c[0]];
    while (coda.length) { const i = coda.pop(), rr = Math.floor(i / p.n), k = i % p.n; for (const j of [rr > 0 ? i - p.n : -1, rr < p.n - 1 ? i + p.n : -1, k > 0 ? i - 1 : -1, k < p.n - 1 ? i + 1 : -1]) if (j >= 0 && dentro.has(j) && !vis.has(j)) { vis.add(j); coda.push(j); } }
    if (vis.size !== g.c.length) return 'gabbia non connessa';
  }
  if (visto.some(x => x !== 1)) return 'le gabbie non coprono la griglia una volta sola';
  return null;
}

const E = {
  id: 'gabbie', nome: 'Gabbie', tipo: 'cifre', famiglia: 'cifre', TECNICHE, MISURE,
  breve: 'Cifre da 1 a n senza ripetizioni, con i conti di ogni gabbia.',
  regole: [
    'In ogni casella va una cifra da 1 a n: ogni cifra <b>una volta per riga e per colonna</b>.',
    'Le linee spesse dividono la griglia in <b>gabbie</b>. Le cifre di una gabbia, con l’operazione scritta, danno il numero scritto: «12×» vuol dire che moltiplicate fanno 12.',
    'Con − e ÷ (solo in gabbie di due caselle) si parte dalla cifra più grande. Dentro una gabbia una cifra si può ripetere, se non è nella stessa riga o colonna.',
    'Tocca una casella, poi una cifra. Con <b>Note</b> acceso scrivi i candidati.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, genera, valida,
  cifre: p => p.n, etichetta, gabbiaDi, tupleDi, vale
};
if (M) M.motori.gabbie = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
