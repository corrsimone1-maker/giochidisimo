/* =====================================================================
   MENTAL · TENDE (il campeggio)
   In una griglia ci sono degli alberi. Accanto a ogni albero (sopra, sotto, a destra o a sinistra)
   va piantata una tenda: tante tende quanti alberi, e ogni albero ha la sua. Le tende non si toccano,
   nemmeno in diagonale. I numeri ai bordi dicono quante tende ci sono in ogni riga e colonna.

   Dati: { n, alberi: [i], righe: [n], colonne: [n] }
   Stato: { c: [n·n] }  0 vuota, 1 prato (niente tenda), 2 tenda; gli alberi restano 0.

   Tecniche del risolutore «umano»:
     prato      una casella che non tocca nessun albero (né sopra né sotto né di lato) è prato;
                intorno a una tenda, tutte e otto le caselle sono prato;
     conti      una riga o colonna con tutte le sue tende ha il resto a prato; se le caselle libere
                sono quante ne mancano, sono tutte tende;
     albero     un albero con una sola casella libera accanto: lì c'è la sua tenda;
     abbinamenti ogni tenda va con un albero diverso: se gli alberi rimasti non bastano più per
                le tende di una zona (o viceversa), alcune caselle sono prato;
     ipotesi    «se qui ci fosse una tenda…»: con le tecniche sopra si arriva a una contraddizione.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  prato: { nome: 'Prato', descr: 'Lontano dagli alberi, e tutto intorno a una tenda, c’è solo prato.', peso: 1 },
  conti: { nome: 'Conti di riga e colonna', descr: 'Una fila con tutte le sue tende è prato; se le caselle libere sono quante ne mancano, sono tende.', peso: 1 },
  albero: { nome: 'Un solo posto', descr: 'Un albero con una sola casella libera accanto: la sua tenda è lì.', peso: 2 },
  abbinamenti: { nome: 'Abbinamenti', descr: 'Ogni tenda ha il suo albero: se una tenda non potrebbe più avere un albero tutto suo, lì non va.', peso: 4 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se qui ci fosse una tenda…»: si arriva a una contraddizione, quindi è prato (o il contrario).', peso: 6 }
};
const PRATO = 0, TENDA = 1, IGNOTA = -1, ALBERO = 2;

const orto = (n, i) => { const r = Math.floor(i / n), k = i % n, o = []; if (r > 0) o.push(i - n); if (r < n - 1) o.push(i + n); if (k > 0) o.push(i - 1); if (k < n - 1) o.push(i + 1); return o; };
const otto = (n, i) => M.intorno(n, i, true);

/* abbinamento massimo alberi → caselle tenda/ignote (accanto); restituisce quanti alberi si abbinano */
function abbinamento(n, alberi, a, soloTende = false) {
  const posti = alberi.map(t => orto(n, t).filter(j => a[j] === TENDA || (!soloTende && a[j] === IGNOTA)));
  const di = new Map();
  const prova = (k, visti) => {
    for (const j of posti[k]) {
      if (visti.has(j)) continue; visti.add(j);
      if (!di.has(j) || prova(di.get(j), visti)) { di.set(j, k); return true; }
    }
    return false;
  };
  let m = 0; for (let k = 0; k < alberi.length; k++) if (prova(k, new Set())) m++;
  return { m, di };
}
/* ogni tenda deve poter avere il suo albero: abbinamento tende → alberi che copra tutte le tende */
function tendeCoperte(n, alberi, a) {
  const tende = []; for (let i = 0; i < a.length; i++) if (a[i] === TENDA) tende.push(i);
  const isAlbero = new Set(alberi);
  const di = new Map();
  const prova = (t, visti) => {
    for (const j of orto(n, t)) {
      if (!isAlbero.has(j) || visti.has(j)) continue; visti.add(j);
      if (!di.has(j) || prova(di.get(j), visti)) { di.set(j, t); return true; }
    }
    return false;
  };
  for (const t of tende) if (!prova(t, new Set())) return false;
  return true;
}

/* ---------------- Regole: null se contraddizione, altrimenti caselle decise ---------------- */
function regolaPrato(p, a) {
  const n = p.n; let f = 0;
  for (let i = 0; i < n * n; i++) {
    if (a[i] === IGNOTA && !orto(n, i).some(j => a[j] === ALBERO)) { a[i] = PRATO; f++; }
    if (a[i] === TENDA) for (const j of otto(n, i)) { if (a[j] === TENDA) return null; if (a[j] === IGNOTA) { a[j] = PRATO; f++; } }
  }
  return f;
}
function regolaConti(p, a) {
  const n = p.n; let f = 0;
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    const voluto = q < n ? p.righe[q] : p.colonne[q - n];
    let t = 0, ig = 0; for (const i of celle) { if (a[i] === TENDA) t++; else if (a[i] === IGNOTA) ig++; }
    if (t > voluto || t + ig < voluto) return null;
    if (!ig) continue;
    if (t === voluto) { for (const i of celle) if (a[i] === IGNOTA) { a[i] = PRATO; f++; } }
    else if (t + ig === voluto) {
      // tutte tende: ma due ignote vicine nella stessa fila non possono esserlo entrambe
      const ign = celle.filter(i => a[i] === IGNOTA);
      if (ign.some((i, x) => x && orto(n, i).includes(ign[x - 1]))) return null;
      for (const i of ign) { a[i] = TENDA; f++; }
    }
  }
  return f;
}
function regolaAlbero(p, a) {
  const n = p.n; let f = 0;
  for (const t of p.alberi) {
    const lib = orto(n, t).filter(j => a[j] === TENDA || a[j] === IGNOTA);
    if (!lib.length) return null;
    if (lib.length === 1 && a[lib[0]] === IGNOTA) { a[lib[0]] = TENDA; f++; }
  }
  return f;
}
/* Abbinamenti: (1) tutti gli alberi devono potersi abbinare a caselle diverse; (2) ogni tenda deve
   avere un albero tutto suo; (3) una casella ignota che, diventando tenda, renderebbe impossibile (2)
   è prato. */
function regolaAbbinamenti(p, a) {
  const n = p.n;
  if (abbinamento(n, p.alberi, a).m < p.alberi.length) return null;
  if (!tendeCoperte(n, p.alberi, a)) return null;
  let f = 0;
  for (let i = 0; i < n * n; i++) {
    if (a[i] !== IGNOTA) continue;
    a[i] = TENDA;
    const ok = tendeCoperte(n, p.alberi, a) && !otto(n, i).some(j => a[j] === TENDA);
    a[i] = IGNOTA;
    if (!ok) { a[i] = PRATO; f++; return f; }
  }
  return f;
}
function iniziale(p) { const a = Array(p.n * p.n).fill(IGNOTA); for (const t of p.alberi) a[t] = ALBERO; return a; }
function chiudi(p, a) {
  for (let g = 0; g < 500; g++) {
    let f = 0;
    for (const reg of [regolaPrato, regolaConti, regolaAlbero, regolaAbbinamenti]) { const x = reg(p, a); if (x === null) return null; f += x; }
    if (!f) return a;
  }
  return a;
}
function finale(p, a) {
  const n = p.n;
  if (a.includes(IGNOTA)) return false;
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    if (celle.filter(i => a[i] === TENDA).length !== (q < n ? p.righe[q] : p.colonne[q - n])) return false;
  }
  for (let i = 0; i < n * n; i++) if (a[i] === TENDA && otto(n, i).some(j => a[j] === TENDA)) return false;
  const tende = a.filter(x => x === TENDA).length;
  return tende === p.alberi.length && abbinamento(n, p.alberi, a, true).m === p.alberi.length;
}

/* ---------------- Interfaccia ---------------- */
function nuovoStato(p) { return { c: Array(p.n * p.n).fill(0) }; }
const daStato = (p, st) => { const a = st.c.map(x => (x === 2 ? TENDA : PRATO)); for (const t of p.alberi) a[t] = ALBERO; return a; };
function conflitti(p, st) {
  const n = p.n, out = new Set();
  for (let i = 0; i < n * n; i++) if (st.c[i] === 2) for (const j of otto(n, i)) if (st.c[j] === 2) { out.add(i); out.add(j); }
  // una tenda senza alberi accanto
  for (let i = 0; i < n * n; i++) if (st.c[i] === 2 && !orto(n, i).some(j => p.alberi.includes(j))) out.add(i);
  return [...out];
}
function contiSbagliati(p, st) {
  const n = p.n, out = [];
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    const voluto = q < n ? p.righe[q] : p.colonne[q - n], t = celle.filter(i => st.c[i] === 2).length;
    if (t > voluto || (celle.every(i => st.c[i] || p.alberi.includes(i)) && t !== voluto)) out.push((q < n ? 'r' : 'k') + (q % n));
  }
  return out;
}
function contiFatti(p, st) {
  const n = p.n, out = [];
  for (let q = 0; q < 2 * n; q++) {
    const celle = q < n ? Array.from({ length: n }, (_, k) => q * n + k) : Array.from({ length: n }, (_, r) => r * n + (q - n));
    if (celle.filter(i => st.c[i] === 2).length === (q < n ? p.righe[q] : p.colonne[q - n])) out.push((q < n ? 'r' : 'k') + (q % n));
  }
  return out;
}
function completo(p, st) { return finale(p, daStato(p, st)); }
function statoRisolto(p, sol) { return { c: sol.map((x, i) => (p.alberi.includes(i) ? 0 : x ? 2 : 1)) }; }

/* ---------------- Conteggio ---------------- */
function conta(p, cap = 2) {
  const n = p.n;
  let tot = 0, prima = null; const tutte = [];
  const giro = a => {
    if (chiudi(p, a) === null) return false;
    let mi = -1, mv = 1e9;
    for (let i = 0; i < n * n; i++) if (a[i] === IGNOTA) {
      const r = Math.floor(i / n), k = i % n; let q = 0;
      for (let x = 0; x < n; x++) { if (a[r * n + x] === IGNOTA) q++; if (a[x * n + k] === IGNOTA) q++; }
      if (q < mv) { mv = q; mi = i; }
    }
    if (mi < 0) { if (!finale(p, a)) return false; tot++; tutte.push(a.map(x => (x === TENDA ? 1 : 0))); prima = prima || tutte[0]; return tot >= cap; }
    for (const v of [TENDA, PRATO]) { const b = a.slice(); b[mi] = v; if (giro(b)) return true; }
    return false;
  };
  giro(iniziale(p));
  conta.ultima = prima; conta.tutte = tutte;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, opz = {}) {
  const n = p.n, a = iniziale(p), passi = [], conteggio = {};
  const segna = t => { passi.push({ t }); conteggio[t] = (conteggio[t] || 0) + 1; };
  const tec = [['prato', regolaPrato], ['conti', regolaConti], ['albero', regolaAlbero], ['abbinamenti', regolaAbbinamenti]];
  for (let g = 0; g < 4 * n * n; g++) {
    if (!a.includes(IGNOTA)) break;
    let mosso = false;
    for (const [t, f] of tec) { const x = f(p, a); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let fatto = false;
    for (let i = 0; i < n * n && !fatto; i++) {
      if (a[i] !== IGNOTA) continue;
      for (const v of [TENDA, PRATO]) { const b = a.slice(); b[i] = v; if (chiudi(p, b) === null) { a[i] = v === TENDA ? PRATO : TENDA; segna('ipotesi'); fatto = true; break; } }
    }
    if (!fatto) break;
  }
  const risolto = finale(p, a);
  return { risolto, sol: risolto ? a.map(x => (x === TENDA ? 1 : 0)) : null, passi, conteggio };
}
function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, ab = ris.conteggio.abbinamenti || 0;
  if (ip > 8) return null;
  if (p.n >= 10 && ip >= 1) return 'estrema';
  if (p.n >= 8 && ip >= 2) return 'estrema';
  if (p.n >= 8 && !ip && ab >= 1) return 'esperta';
  if (p.n <= 7 && !ip && ((ris.conteggio.albero || 0) + ab) >= 1) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [6, 7], esperta: [8], estrema: [8, 10] };
function genera(r, voluto, tentativi = 300) {
  for (let q = 0; q < tentativi; q++) {
    const n = r.scegli(MISURE[voluto]);
    const quanti = Math.round(n * n * (0.17 + r.f() * 0.04));
    const a = Array(n * n).fill(0); // 0 libera, 1 tenda, 2 albero
    const alberi = [], tende = [];
    for (let t = 0; t < 2000 && tende.length < quanti; t++) {
      const i = r(n * n);
      if (a[i] || otto(n, i).some(j => a[j] === 1)) continue;
      const lib = orto(n, i).filter(j => !a[j]);
      if (!lib.length) continue;
      const j = r.scegli(lib);
      a[i] = 1; a[j] = 2; tende.push(i); alberi.push(j);
    }
    if (tende.length < quanti) continue;
    const p = { n, alberi: alberi.sort((x, y) => x - y), righe: [], colonne: [] };
    for (let x = 0; x < n; x++) { let rr = 0, kk = 0; for (let y = 0; y < n; y++) { if (a[x * n + y] === 1) rr++; if (a[y * n + x] === 1) kk++; } p.righe.push(rr); p.colonne.push(kk); }
    if (conta(p, 2) !== 1) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || !Array.isArray(p.alberi) || p.righe.length !== p.n || p.colonne.length !== p.n) return 'forma';
  const t = p.alberi.length;
  if (p.righe.reduce((x, y) => x + y, 0) !== t || p.colonne.reduce((x, y) => x + y, 0) !== t) return 'conti diversi dagli alberi';
  return null;
}

const E = {
  id: 'tende', nome: 'Tende', tipo: 'tende', famiglia: 'griglia', TECNICHE, MISURE,
  breve: 'Una tenda accanto a ogni albero: le tende non si toccano, i numeri dicono quante per fila.',
  regole: [
    'Accanto a ogni albero (sopra, sotto, a destra o a sinistra, non in diagonale) va <b>una tenda</b>: tante tende quanti alberi, ognuna con il suo albero.',
    'Le tende <b>non si toccano</b>, nemmeno in diagonale.',
    'I numeri ai bordi dicono quante tende ci sono in quella riga o colonna.',
    'Tocca una casella: tenda, poi prato, poi vuota. Trascinando si mette il prato.'
  ],
  nuovoStato, conflitti, contiSbagliati, contiFatti, completo, statoRisolto, conta, risolvi, livello, genera, valida
};
if (M) M.motori.tende = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
