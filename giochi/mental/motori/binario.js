/* =====================================================================
   MENTAL · BINARIO (regole in stile «0h h1» / Takuzu)
   Griglia n×n (n pari) di due simboli, 0 e 1. In ogni riga e colonna tanti 0 quanti 1;
   mai tre simboli uguali di fila (in orizzontale o verticale); due righe (o due colonne)
   non possono essere identiche.

   Dati: { n, g: [n·n] con -1 vuota, 0 o 1 data }     Stato: { c: [n·n] } -1, 0, 1.

   Tecniche del risolutore «umano»:
     coppia      due uguali vicini: le caselle ai lati sono dell'altro simbolo;
     panino      due uguali con un buco in mezzo: il buco è dell'altro simbolo;
     conta       una riga ha già metà di un simbolo: il resto è dell'altro;
     riga        analisi di una riga intera: tra i modi di completarla, le caselle che valgono
                 sempre la stessa cosa;
     unicita     come «riga», escludendo i completamenti identici a una riga già finita.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  coppia: { nome: 'Coppia', descr: 'Due simboli uguali vicini: ai due lati va l’altro simbolo.', peso: 1 },
  panino: { nome: 'Panino', descr: 'Due simboli uguali con un buco in mezzo: il buco è dell’altro simbolo.', peso: 1 },
  conta: { nome: 'Metà raggiunta', descr: 'Una riga o colonna ha già metà di un simbolo: il resto è dell’altro.', peso: 1 },
  riga: { nome: 'Analisi della riga', descr: 'Tra tutti i modi di completare una riga, alcune caselle valgono sempre uguale.', peso: 4 },
  unicita: { nome: 'Righe diverse', descr: 'Un completamento renderebbe la riga uguale a un’altra già finita: si scarta.', peso: 6 }
};

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { c: p.g.slice() }; }
const linee = n => {
  const L = [];
  for (let r = 0; r < n; r++) L.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) L.push(Array.from({ length: n }, (_, r) => r * n + c));
  return L;
};
function conflitti(p, st) {
  const n = p.n, out = new Set(), v = st.c;
  const L = linee(n);
  for (const l of L) {
    for (let x = 0; x + 2 < n; x++) { const a = v[l[x]]; if (a >= 0 && a === v[l[x + 1]] && a === v[l[x + 2]]) [l[x], l[x + 1], l[x + 2]].forEach(i => out.add(i)); }
    for (const s of [0, 1]) if (l.filter(i => v[i] === s).length > n / 2) l.filter(i => v[i] === s).forEach(i => out.add(i));
  }
  for (const [da, a] of [[0, n], [n, 2 * n]]) for (let x = da; x < a; x++) for (let y = x + 1; y < a; y++) {
    const lx = L[x], ly = L[y];
    if (lx.every(i => v[i] >= 0) && lx.every((i, q) => v[i] === v[ly[q]])) { lx.forEach(i => out.add(i)); ly.forEach(i => out.add(i)); }
  }
  return [...out];
}
function completo(p, st) { return st.c.every(x => x >= 0) && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { c: sol.slice() }; }

/* Tutte le righe valide di lunghezza n (bilanciate, senza tre uguali) */
const cacheRighe = {};
function righeValide(n) {
  if (cacheRighe[n]) return cacheRighe[n];
  const out = [];
  for (let m = 0; m < (1 << n); m++) {
    const r = Array.from({ length: n }, (_, i) => (m >> (n - 1 - i)) & 1);
    if (r.filter(x => x).length !== n / 2) continue;
    let ok = true; for (let i = 0; i + 2 < n; i++) if (r[i] === r[i + 1] && r[i] === r[i + 2]) { ok = false; break; }
    if (ok) out.push(r);
  }
  return (cacheRighe[n] = out);
}

/* ---------------- Conteggio ----------------
   Ricerca completa: a ogni nodo ogni riga e colonna tiene solo le righe valide compatibili
   con le caselle già fissate (riduzione esatta), e due file complete uguali chiudono il ramo;
   poi si prova la casella libera della fila con meno completamenti. */
function conta(p, cap = 2) {
  const n = p.n, N = n * n, L = linee(n), R = righeValide(n);
  let tot = 0, prima = null;
  const riduci = v => {
    for (let cambio = true; cambio;) {
      cambio = false;
      for (const l of L) {
        if (l.every(i => v[i] >= 0)) continue;
        let uno = 0, zero = 0, alcuna = false;
        for (const rr of R) {
          let ok = true;
          for (let k = 0; k < n; k++) { const x = v[l[k]]; if (x >= 0 && x !== rr[k]) { ok = false; break; } }
          if (!ok) continue;
          alcuna = true;
          for (let k = 0; k < n; k++) { if (rr[k]) uno |= 1 << k; else zero |= 1 << k; }
        }
        if (!alcuna) return false;
        for (let k = 0; k < n; k++) if (v[l[k]] < 0) {
          const pu = (uno >> k) & 1, pz = (zero >> k) & 1;
          if (pu && !pz) { v[l[k]] = 1; cambio = true; } else if (pz && !pu) { v[l[k]] = 0; cambio = true; }
        }
      }
    }
    // file complete identiche
    for (const [da, a] of [[0, n], [n, 2 * n]]) {
      const viste = new Set();
      for (let x = da; x < a; x++) {
        if (!L[x].every(i => v[i] >= 0)) continue;
        const k = L[x].map(i => v[i]).join('');
        if (viste.has(k)) return false; viste.add(k);
      }
    }
    // righe e colonne valide (bilanciate, senza tre uguali) sono garantite da R per le file complete
    for (const l of L) if (l.every(i => v[i] >= 0) && !R.some(rr => rr.every((x, k) => x === v[l[k]]))) return false;
    return true;
  };
  const giro = v => {
    if (!riduci(v)) return false;
    const i = v.indexOf(-1);
    if (i < 0) { tot++; if (!prima) prima = v.slice(); return tot >= cap; }
    for (const x of [0, 1]) { const w = v.slice(); w[i] = x; if (giro(w)) return true; }
    return false;
  };
  giro(p.g.slice());
  conta.ultima = prima;
  void N;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const n = p.n, v = p.g.slice(), L = linee(n), R = righeValide(n);
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const metti = (i, x) => { v[i] = x; };
  const contraddizione = () => conflitti(p, { c: v }).length > 0;
  const passoSemplice = () => {
    for (let li = 0; li < L.length; li++) {
      const l = L[li];
      for (let x = 0; x < n; x++) {
        const i = l[x]; if (v[i] >= 0) continue;
        // coppia a sinistra/destra
        if (x >= 2 && v[l[x - 1]] >= 0 && v[l[x - 1]] === v[l[x - 2]]) { metti(i, 1 - v[l[x - 1]]); segna('coppia', { cella: i }); return true; }
        if (x + 2 < n && v[l[x + 1]] >= 0 && v[l[x + 1]] === v[l[x + 2]]) { metti(i, 1 - v[l[x + 1]]); segna('coppia', { cella: i }); return true; }
        if (x >= 1 && x + 1 < n && v[l[x - 1]] >= 0 && v[l[x - 1]] === v[l[x + 1]]) { metti(i, 1 - v[l[x - 1]]); segna('panino', { cella: i }); return true; }
      }
      for (const s of [0, 1]) if (l.filter(i => v[i] === s).length === n / 2 && l.some(i => v[i] < 0)) {
        const e = l.filter(i => v[i] < 0); e.forEach(i => metti(i, 1 - s)); segna('conta', { celle: e }); return true;
      }
    }
    return false;
  };
  const passoRiga = conUnicita => {
    for (let li = 0; li < L.length; li++) {
      const l = L[li]; if (l.every(i => v[i] >= 0)) continue;
      let poss = R.filter(rr => rr.every((x, q) => v[l[q]] < 0 || v[l[q]] === x));
      if (conUnicita) {
        const stesse = li < n ? L.slice(0, n) : L.slice(n);
        const finite = stesse.filter(m => m !== l && m.every(i => v[i] >= 0)).map(m => m.map(i => v[i]).join(''));
        const prima = poss.length;
        poss = poss.filter(rr => !finite.includes(rr.join('')));
        if (poss.length === prima) continue;
      }
      if (!poss.length) return false;
      const fissi = [];
      for (let q = 0; q < n; q++) if (v[l[q]] < 0 && poss.every(rr => rr[q] === poss[0][q])) fissi.push([l[q], poss[0][q]]);
      if (fissi.length) { fissi.forEach(([i, x]) => metti(i, x)); segna(conUnicita ? 'unicita' : 'riga', { linea: li, celle: fissi.map(x => x[0]) }); return true; }
    }
    return false;
  };
  for (let giri = 0; giri < 10 * n * n; giri++) {
    if (v.every(x => x >= 0)) break;
    if (contraddizione()) return { risolto: false, contraddizione: true, passi, conteggio };
    if (passoSemplice() || passoRiga(false) || passoRiga(true)) continue;
    break;
  }
  const risolto = v.every(x => x >= 0) && !contraddizione();
  return { risolto, sol: risolto ? v.slice() : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const c = ris.conteggio, adv = (c.riga || 0) + 2 * (c.unicita || 0);
  if (p.n >= 12 && adv >= 8) return 'estrema';
  if (adv >= 4 && (p.n >= 12 || adv >= 7)) return 'esperta';
  if (adv >= 2) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ----------------
   Una griglia completa a caso, poi si tolgono simboli finché il risolutore ce la fa ancora:
   più se ne tolgono, più servono le analisi di riga. */
const MISURE = { impegnativa: [10], esperta: [10, 12], estrema: [12] };
function genera(r, voluto, tentativi = 60) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto] || [10]);
    const sol = grigliaACaso(r, n);
    if (!sol) continue;
    const g = sol.slice();
    for (const i of r.mescola([...Array(n * n).keys()])) {
      const x = g[i]; g[i] = -1;
      if (!risolvi({ n, g }).risolto) g[i] = x;
    }
    const p = { n, g };
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function grigliaACaso(r, n) {
  const R = righeValide(n), grid = [];
  let passi = 0;
  const giro = k => {
    if (++passi > 50000) return false;
    if (k === n) { const cols = Array.from({ length: n }, (_, c) => grid.map(rr => rr[c]).join('')); return new Set(cols).size === n; }
    for (const rr of r.mescola(R).slice(0, 60)) {
      if (grid.some(g => g.every((x, c) => x === rr[c]))) continue;
      let ok = true;
      for (let c = 0; c < n && ok; c++) {
        if (k >= 2 && grid[k - 1][c] === rr[c] && grid[k - 2][c] === rr[c]) ok = false;
        let uni = rr[c]; for (const g of grid) uni += g[c];
        if (uni > n / 2 || (k + 1) - uni > n / 2) ok = false;
      }
      if (!ok) continue;
      grid.push(rr); if (giro(k + 1)) return true; grid.pop();
    }
    return false;
  };
  return giro(0) ? grid.flat() : null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || p.n % 2 || !Array.isArray(p.g) || p.g.length !== p.n * p.n) return 'forma';
  if (p.g.some(x => x !== -1 && x !== 0 && x !== 1)) return 'valori';
  return null;
}

const E = {
  id: 'binario', nome: 'Binario', tipo: 'binario', TECNICHE, MISURE,
  breve: 'Due simboli: metà e metà, mai tre di fila, righe tutte diverse.',
  regole: [
    'Riempi la griglia con i due simboli: il <b>tondo</b> e il <b>quadrato</b>.',
    'In ogni riga e in ogni colonna ci sono <b>tanti tondi quanti quadrati</b>.',
    '<b>Mai tre</b> simboli uguali di fila, né in orizzontale né in verticale.',
    'Due righe non possono essere <b>identiche</b>, e nemmeno due colonne.',
    'Tocca una casella: tondo, quadrato, vuota. Le caselle date (col puntino) non si cambiano.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida, righeValide
};
if (M) M.motori.binario = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
