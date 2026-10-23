/* =====================================================================
   MENTAL · SOMME (kakuro)
   Una griglia di caselle bianche e nere. Le caselle nere portano le somme: il numero in basso a
   sinistra è la somma della fila bianca che scende sotto, quello in alto a destra della fila che va
   a destra. Nelle caselle bianche vanno cifre da 1 a 9, senza ripetizioni dentro la stessa fila.

   Dati: { w, h, nere: [[i, giù, destra], …] }   (0 = nessuna somma da quel lato); le altre caselle sono bianche.
   Stato: { v: [w·h] (0 vuota; le nere restano 0), note: [w·h bitmask] }

   Tecniche del risolutore «umano»:
     combinazioni  per ogni fila, i gruppi di cifre diverse che danno la somma e stanno nelle caselle:
                   le cifre che non compaiono in nessun gruppo si tolgono (anche incrociando le file);
     singolo       una casella con una sola cifra possibile, o una cifra che nella fila ha un solo posto;
     ipotesi       «se qui ci fosse questa cifra…»: con le tecniche sopra si arriva a una contraddizione.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  combinazioni: { nome: 'Combinazioni', descr: 'Le somme si fanno solo con certi gruppi di cifre: le cifre fuori da quei gruppi si tolgono.', peso: 1 },
  singolo: { nome: 'Singolo', descr: 'Una casella ha una sola cifra possibile, o una cifra ha un solo posto nella fila.', peso: 1 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se qui ci fosse questa cifra…»: si arriva a una contraddizione, quindi non va.', peso: 6 }
};
const bit = d => 1 << (d - 1);
const TUTTE = 511;
const bits = m => { const o = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) o.push(d); return o; };
const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
/* GRUPPI[L][S]: maschere di L cifre diverse che sommano a S */
const GRUPPI = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
for (let m = 1; m <= TUTTE; m++) { let s = 0; for (const d of bits(m)) s += d; GRUPPI[pop(m)][s].push(m); }

/* Le file: { celle, somma, verso: 'g' | 'd', da: casella nera } */
function fileDi(p) {
  const nera = new Map(p.nere.map(([i, g, d]) => [i, [g, d]])), out = [];
  for (const [i, [g, d]] of nera) {
    const r = Math.floor(i / p.w), k = i % p.w;
    if (d) { const celle = []; for (let x = k + 1; x < p.w && !nera.has(r * p.w + x); x++) celle.push(r * p.w + x); out.push({ celle, somma: d, verso: 'd', da: i }); }
    if (g) { const celle = []; for (let y = r + 1; y < p.h && !nera.has(y * p.w + k); y++) celle.push(y * p.w + k); out.push({ celle, somma: g, verso: 'g', da: i }); }
  }
  return out;
}
const bianche = p => { const nere = new Set(p.nere.map(x => x[0])), o = []; for (let i = 0; i < p.w * p.h; i++) if (!nere.has(i)) o.push(i); return o; };

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { v: Array(p.w * p.h).fill(0), note: Array(p.w * p.h).fill(0) }; }
function conflitti(p, st) {
  const out = new Set();
  for (const f of fileDi(p)) {
    const xs = f.celle.map(i => st.v[i]);
    f.celle.forEach((i, a) => { if (xs[a] && xs.some((y, b) => b !== a && y === xs[a])) out.add(i); });
    const s = xs.reduce((a, b) => a + b, 0);
    if (s > f.somma || (xs.every(x => x) && s !== f.somma)) f.celle.forEach(i => out.add(i));
  }
  return [...out];
}
/* Somme sbagliate (indici delle file), da colorare */
function sommeSbagliate(p, st) {
  return fileDi(p).filter(f => { const xs = f.celle.map(i => st.v[i]), s = xs.reduce((a, b) => a + b, 0); return s > f.somma || (xs.every(x => x) && s !== f.somma); }).map(f => f.da + f.verso);
}
function completo(p, st) { return bianche(p).every(i => st.v[i] > 0) && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { v: sol.slice(), note: Array(p.w * p.h).fill(0) }; }
/* Caselle che stanno in una fila con i (per le note e per evidenziare) */
function gruppiDi(p, i) { const o = new Set(); for (const f of fileDi(p)) if (f.celle.includes(i)) f.celle.forEach(j => o.add(j)); return [...o]; }

/* ---------------- Propagazione ---------------- */
/* Esiste un modo di dare alle celle cifre diverse prese da m, ognuna tra i suoi candidati? */
function abbina(cand, m) {
  const n = cand.length, usate = new Set();
  const giro = k => {
    if (k === n) return true;
    for (const d of bits(cand[k] & m)) { if (usate.has(d)) continue; usate.add(d); if (giro(k + 1)) return true; usate.delete(d); }
    return false;
  };
  return giro(0);
}
/* Riduce i candidati di una fila: true se cambia, null se impossibile */
function riduciFila(f, c) {
  const cand = f.celle.map(i => c[i]);
  let unione = 0, alcuno = false;
  for (const m of GRUPPI[f.celle.length][f.somma] || []) {
    if (!cand.every(x => x & m)) continue;
    if (!abbina(cand, m)) continue;
    alcuno = true; unione |= m;
  }
  if (!alcuno) return null;
  let cambio = false;
  // cifre fuori da ogni gruppo possibile
  for (const i of f.celle) if (c[i] & ~unione) { c[i] &= unione; cambio = true; if (!c[i]) return null; }
  // cifre fisse: via dalle altre caselle della fila
  for (const i of f.celle) if (pop(c[i]) === 1) for (const j of f.celle) if (j !== i && (c[j] & c[i])) { c[j] &= ~c[i]; cambio = true; if (!c[j]) return null; }
  return cambio;
}

/* ---------------- Conteggio: ricerca completa ---------------- */
function conta(p, cap = 2, raccolte = null) {
  const F = fileDi(p), B = bianche(p), N = p.w * p.h;
  let tot = 0, prima = null;
  const giro = c => {
    for (let cambio = true; cambio;) {
      cambio = false;
      for (const f of F) { const x = riduciFila(f, c); if (x === null) return false; if (x) cambio = true; }
    }
    let mi = -1, mp = 99;
    for (const i of B) { const q = pop(c[i]); if (!q) return false; if (q > 1 && q < mp) { mp = q; mi = i; } }
    if (mi < 0) {
      // controllo finale delle somme (la propagazione non sempre basta da sola)
      const v = c.map(m => (m ? bits(m)[0] : 0));
      if (F.some(f => f.celle.reduce((a, i) => a + v[i], 0) !== f.somma || new Set(f.celle.map(i => v[i])).size !== f.celle.length)) return false;
      tot++; if (!prima) prima = v; if (raccolte) raccolte.push(v); return tot >= cap;
    }
    for (const d of bits(c[mi])) { const c2 = c.slice(); c2[mi] = bit(d); if (giro(c2)) return true; }
    return false;
  };
  const c0 = Array(N).fill(0); for (const i of B) c0[i] = TUTTE;
  giro(c0);
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, opz = {}) {
  const F = fileDi(p), B = bianche(p), N = p.w * p.h;
  const c = Array(N).fill(0); for (const i of B) c[i] = TUTTE;
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const singolo = cc => {
    for (const f of F) for (const i of f.celle) if (pop(cc[i]) === 1) for (const j of f.celle) if (j !== i && (cc[j] & cc[i])) { cc[j] &= ~cc[i]; return cc[j] ? true : null; }
    // una cifra che serve a tutti i gruppi possibili della fila e ha un solo posto
    for (const f of F) {
      const cand = f.celle.map(i => cc[i]);
      let tutti = TUTTE, alcuno = false;
      for (const m of GRUPPI[f.celle.length][f.somma] || []) if (cand.every(x => x & m) && abbina(cand, m)) { tutti &= m; alcuno = true; }
      if (!alcuno) return null;
      for (const d of bits(tutti)) {
        const pos = f.celle.filter(i => cc[i] & bit(d));
        if (!pos.length) return null;
        if (pos.length === 1 && cc[pos[0]] !== bit(d)) { cc[pos[0]] = bit(d); return true; }
      }
    }
    return false;
  };
  const combinazioni = cc => {
    for (const f of F) {
      const cand = f.celle.map(i => cc[i]);
      let unione = 0, alcuno = false;
      for (const m of GRUPPI[f.celle.length][f.somma] || []) if (cand.every(x => x & m) && abbina(cand, m)) { unione |= m; alcuno = true; }
      if (!alcuno) return null;
      let cambio = false;
      for (const i of f.celle) if (cc[i] & ~unione) { cc[i] &= unione; cambio = true; if (!cc[i]) return null; }
      if (cambio) return true;
    }
    return false;
  };
  const semplici = [['singolo', singolo], ['combinazioni', combinazioni]];
  const chiudi = cc => {
    for (let k = 0; k < 2000; k++) {
      let mosso = false;
      for (const [, f] of semplici) { const x = f(cc); if (x === null) return null; if (x) { mosso = true; break; } }
      if (!mosso) return cc;
    }
    return cc;
  };
  const fatto = () => B.every(i => pop(c[i]) === 1);
  for (let giri = 0; giri < 80 * B.length; giri++) {
    if (fatto()) break;
    let mosso = false;
    for (const [t, f] of semplici) { const x = f(c); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let tolto = false;
    for (const i of B) {
      if (pop(c[i]) < 2) continue;
      for (const d of bits(c[i])) {
        const cc = c.slice(); cc[i] = bit(d);
        if (chiudi(cc) === null) { c[i] &= ~bit(d); segna('ipotesi', { cella: i, cifra: d }); tolto = true; break; }
      }
      if (tolto) break;
    }
    if (!tolto) break;
  }
  const v = c.map(m => (pop(m) === 1 ? bits(m)[0] : 0));
  const risolto = B.every(i => v[i]) && conflitti(p, { v }).length === 0;
  return { risolto, sol: risolto ? v : null, passi, conteggio };
}

function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, lato = Math.max(p.w, p.h);
  if (ip > 10) return null;
  if (lato >= 8 && ip >= 1) return 'estrema';
  if (lato >= 7 && !ip) return 'esperta';
  if (lato <= 6 && !ip) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [[6, 4]], esperta: [[7, 4], [8, 4]], estrema: [[8, 5], [9, 4]] };
/* Disegno delle caselle nere, simmetrico (mezzo giro intorno al centro), con file bianche lunghe da 2 a lmax */
function disegno(r, n, lmax) {
  for (let t = 0; t < 200; t++) {
    const nero = Array(n * n).fill(false);
    for (let k = 0; k < n; k++) { nero[k] = true; nero[k * n] = true; }
    const metti = i => { nero[i] = true; const rr = Math.floor(i / n), k = i % n; if (rr > 0 && k > 0) nero[(n - rr) * n + (n - k)] = true; };
    for (let q = 0; q < Math.floor(n * n * 0.07); q++) { const rr = 1 + r(n - 1), k = 1 + r(n - 1); metti(rr * n + k); }
    for (let giro = 0; giro < 60; giro++) {
      let cambiato = false;
      // file troppo lunghe: si spezzano senza lasciare pezzi da una casella, se si può
      const spezza = celle => {
        const l = celle.length, buoni = [];
        for (let j = 0; j < l; j++) if ((j === 0 || j >= 2) && (j === l - 1 || l - 1 - j >= 2)) buoni.push(j);
        metti(celle[r.scegli(buoni.length ? buoni : [...Array(l).keys()])]); cambiato = true;
      };
      for (let rr = 1; rr < n; rr++) { let run = []; for (let k = 1; k <= n; k++) { if (k < n && !nero[rr * n + k]) { run.push(rr * n + k); continue; } if (run.length > lmax) spezza(run); run = []; } }
      for (let k = 1; k < n; k++) { let run = []; for (let rr = 1; rr <= n; rr++) { if (rr < n && !nero[rr * n + k]) { run.push(rr * n + k); continue; } if (run.length > lmax) spezza(run); run = []; } }
      // caselle bianche senza vicine bianche in una direzione: diventano nere
      for (let i = 0; i < n * n; i++) {
        if (nero[i]) continue;
        const rr = Math.floor(i / n), k = i % n;
        const o = (k > 0 && !nero[i - 1]) || (k < n - 1 && !nero[i + 1]), v = (rr > 0 && !nero[i - n]) || (rr < n - 1 && !nero[i + n]);
        if (!o || !v) { metti(i); cambiato = true; }
      }
      if (!cambiato) break;
    }
    // controlli finali: file giuste, abbastanza bianche, tutte collegate
    let male = false;
    for (let i = 0; i < n * n && !male; i++) {
      if (nero[i]) continue;
      const rr = Math.floor(i / n), k = i % n;
      const o = (k > 0 && !nero[i - 1]) || (k < n - 1 && !nero[i + 1]), v = (rr > 0 && !nero[i - n]) || (rr < n - 1 && !nero[i + n]);
      if (!o || !v) male = true;
    }
    if (male) continue;
    const B = []; for (let i = 0; i < n * n; i++) if (!nero[i]) B.push(i);
    if (B.length < (n - 1) * (n - 1) * 0.55) continue;
    const vis = new Set([B[0]]), coda = [B[0]];
    while (coda.length) { const i = coda.pop(), rr = Math.floor(i / n), k = i % n; for (const j of [rr > 0 ? i - n : -1, rr < n - 1 ? i + n : -1, k > 0 ? i - 1 : -1, k < n - 1 ? i + 1 : -1]) if (j >= 0 && !nero[j] && !vis.has(j)) { vis.add(j); coda.push(j); } }
    if (vis.size !== B.length) continue;
    return nero;
  }
  return null;
}
/* Riempie le bianche con cifre diverse in ogni fila. Ogni fila tende a cifre basse o alte (le somme
   così hanno pochi modi di farsi, e la soluzione unica è più facile da ottenere): ogni casella
   sceglie le cifre vicino a un bersaglio che dipende dalle sue due file. */
function riempi(r, n, nero) {
  const v = Array(n * n).fill(0), B = []; for (let i = 0; i < n * n; i++) if (!nero[i]) B.push(i);
  const inizioO = i => { let k = i; while (k % n > 0 && !nero[k - 1]) k--; return k; };
  const inizioV = i => { let k = i; while (k >= n && !nero[k - n]) k -= n; return k; };
  const tendenza = new Map();
  const tend = k => { if (!tendenza.has(k)) tendenza.set(k, r.scegli([-1, -1, 1, 1, 0])); return tendenza.get(k); };
  const fila = i => { const rr = Math.floor(i / n), k = i % n, o = []; for (let x = k - 1; x >= 0 && !nero[rr * n + x]; x--) o.push(rr * n + x); for (let x = k + 1; x < n && !nero[rr * n + x]; x++) o.push(rr * n + x); for (let y = rr - 1; y >= 0 && !nero[y * n + k]; y--) o.push(y * n + k); for (let y = rr + 1; y < n && !nero[y * n + k]; y++) o.push(y * n + k); return o; };
  const vic = B.map(fila);
  const ordine = B.map(i => {
    const t = tend('o' + inizioO(i)) + tend('v' + inizioV(i)), bersaglio = 5 + t * 2;
    // cifre ordinate per distanza dal bersaglio, con un po' di caso
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => [d, Math.abs(d - bersaglio) + r.f() * 2.5]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  });
  let passi = 0;
  const giro = k => {
    if (++passi > 20000) return false;
    if (k === B.length) return true;
    const i = B[k];
    for (const d of ordine[k]) {
      if (vic[k].some(j => v[j] === d)) continue;
      v[i] = d; if (giro(k + 1)) return true;
    }
    v[i] = 0; return false;
  };
  return giro(0) ? v : null;
}
function sommeDi(n, nero, v) {
  const p = { w: n, h: n, nere: [] };
  for (let i = 0; i < n * n; i++) {
    if (!nero[i]) continue;
    const rr = Math.floor(i / n), k = i % n;
    let giu = 0, dx = 0;
    for (let y = rr + 1; y < n && !nero[y * n + k]; y++) giu += v[y * n + k];
    for (let x = k + 1; x < n && !nero[rr * n + x]; x++) dx += v[rr * n + x];
    p.nere.push([i, giu, dx]);
  }
  return p;
}
const punti = (p, c, sol) => c * 1000 + bianche(p).filter(i => sol.some(x => x[i] !== sol[0][i])).length;
/* Si parte da un riempimento a caso e lo si ritocca finché le somme hanno una soluzione sola:
   ogni volta si cambia una cifra in una casella dove le soluzioni trovate non sono d'accordo. */
function genera(r, voluto, tentativi = 60) {
  for (let q = 0; q < tentativi; q++) {
    const [n, lmax] = r.scegli(MISURE[voluto]);
    const nero = disegno(r, n, lmax); if (!nero) continue;
    let v = riempi(r, n, nero); if (!v) continue;
    const compagne = i => gruppiDi({ w: n, h: n, nere: sommeDi(n, nero, v).nere }, i).filter(j => j !== i);
    let p = sommeDi(n, nero, v), sol = [], c = conta(p, 12, sol);
    for (let passo = 0; passo < 60 && c > 1; passo++) {
      const varie = bianche(p).filter(i => sol.some(x => x[i] !== sol[0][i]));
      const i = r.scegli(varie.length ? varie : bianche(p));
      const vietate = new Set(compagne(i).map(j => v[j]));
      let meglio = null;
      for (const d of r.mescola([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => x !== v[i] && !vietate.has(x)))) {
        const w = v.slice(); w[i] = d;
        const p2 = sommeDi(n, nero, w), sol2 = [], c2 = conta(p2, 12, sol2);
        if (c2 < 1) continue;
        const pu = punti(p2, c2, sol2);
        if (!meglio || pu < meglio.pu) meglio = { w, p: p2, sol: sol2, c: c2, pu };
        if (c2 === 1) break;
      }
      if (meglio && (meglio.pu <= punti(p, c, sol) || r.f() < 0.15)) { v = meglio.w; p = meglio.p; sol = meglio.sol; c = meglio.c; }
    }
    if (c !== 1) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.w) || !Number.isInteger(p.h) || !Array.isArray(p.nere)) return 'forma';
  const F = fileDi(p), dove = new Map();
  for (const f of F) {
    if (f.celle.length < 2 || f.celle.length > 9) return 'fila di lunghezza ' + f.celle.length;
    if (!(GRUPPI[f.celle.length][f.somma] || []).length) return 'somma impossibile ' + f.somma;
    for (const i of f.celle) { const k = (dove.get(i) || '') + f.verso; dove.set(i, k); }
  }
  for (const i of bianche(p)) { const k = dove.get(i) || ''; if (k.length !== 2 || !k.includes('g') || !k.includes('d')) return 'casella bianca senza le sue due file'; }
  return null;
}

const E = {
  id: 'kakuro', nome: 'Somme', tipo: 'cifre', famiglia: 'cifre', TECNICHE, MISURE,
  breve: 'Cifre da 1 a 9 senza ripetizioni, che diano le somme scritte.',
  regole: [
    'Nelle caselle bianche vanno cifre da 1 a 9.',
    'Le caselle nere portano le somme: il numero <b>in basso</b> è la somma della fila che scende, quello <b>a destra</b> della fila che va a destra.',
    'In una fila <b>nessuna cifra si ripete</b>.',
    'Tocca una casella, poi una cifra. Con <b>Note</b> acceso scrivi i candidati.'
  ],
  nuovoStato, conflitti, sommeSbagliate, completo, statoRisolto, conta, risolvi, livello, genera, valida,
  cifre: () => 9, fileDi, gruppiDi, bianche, GRUPPI
};
if (M) M.motori.kakuro = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
