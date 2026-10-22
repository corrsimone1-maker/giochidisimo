/* =====================================================================
   MENTAL · FUTOSHIKI
   Griglia n×n con le cifre da 1 a n, ognuna una volta per riga e per colonna.
   Tra alcune caselle vicine c'è un segno < o >: va rispettato.

   Dati: { n, dati: [n·n] (0 vuota), dis: [[a, b], …] }   ogni coppia vuol dire v[a] < v[b],
         con a e b vicine (stessa riga o stessa colonna, accanto). La pagina ricava il verso.
   Stato: { v: [n·n], note: [n·n bitmask] }

   Tecniche del risolutore «umano»:
     segno      un segno toglie gli estremi: dal lato «minore» non può esserci il massimo
                possibile dall'altro lato, e viceversa (anche a catena);
     singolo    singoli nudi e nascosti di riga e colonna;
     coppia     coppie nude in una riga o colonna;
     fila       analisi di una fila intera: tra i modi di completarla con i suoi segni e i
                candidati, le cifre che restano possibili.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  segno: { nome: 'Lettura dei segni', descr: 'Dal lato «minore» di un segno non può stare la cifra più alta rimasta dall’altro lato.', peso: 1 },
  singolo: { nome: 'Singolo', descr: 'Una casella ha una sola cifra possibile, o una cifra ha un solo posto nella fila.', peso: 1 },
  coppia: { nome: 'Coppia', descr: 'Due caselle di una fila con le stesse due cifre possibili: quelle cifre sono loro.', peso: 3 },
  fila: { nome: 'Analisi della fila', descr: 'Provando tutti i modi di completare una fila con i suoi segni, alcune cifre restano impossibili.', peso: 5 }
};
const bit = d => 1 << (d - 1);
const bits = (m, n) => { const o = []; for (let d = 1; d <= n; d++) if (m & bit(d)) o.push(d); return o; };
const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const alto = m => 31 - Math.clz32(m) + 1;            // cifra più alta nella maschera
const basso = m => 31 - Math.clz32(m & -m) + 1;      // cifra più bassa

function file(n) {
  const out = [];
  for (let r = 0; r < n; r++) out.push({ celle: Array.from({ length: n }, (_, c) => r * n + c), nome: 'riga ' + (r + 1) });
  for (let c = 0; c < n; c++) out.push({ celle: Array.from({ length: n }, (_, r) => r * n + c), nome: 'colonna ' + (c + 1) });
  return out;
}
const permCache = {};
function permutazioni(n) {
  if (permCache[n]) return permCache[n];
  const out = [], a = [...Array(n).keys()].map(x => x + 1);
  const giro = k => { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; giro(k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
  giro(0);
  return (permCache[n] = out);
}
/* Segni interni a una fila, come coppie di posizioni [k1, k2] con x[k1] < x[k2] */
function segniDellaFila(p, f) {
  const pos = new Map(f.celle.map((i, k) => [i, k])), out = [];
  for (const [a, b] of p.dis) if (pos.has(a) && pos.has(b)) out.push([pos.get(a), pos.get(b)]);
  return out;
}
function permDellaFila(p, f) {
  const s = segniDellaFila(p, f);
  return permutazioni(p.n).filter(x => s.every(([a, b]) => x[a] < x[b]));
}

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { v: (p.dati || Array(p.n * p.n).fill(0)).slice(), note: Array(p.n * p.n).fill(0) }; }
function conflitti(p, st) {
  const out = new Set();
  for (const f of file(p.n))
    for (let a = 0; a < p.n; a++) for (let b = a + 1; b < p.n; b++) { const x = st.v[f.celle[a]]; if (x && x === st.v[f.celle[b]]) { out.add(f.celle[a]); out.add(f.celle[b]); } }
  for (const [a, b] of p.dis) if (st.v[a] && st.v[b] && !(st.v[a] < st.v[b])) { out.add(a); out.add(b); }
  return [...out];
}
/* Segni non rispettati (indici in p.dis), da colorare */
function segniSbagliati(p, st) { const out = []; p.dis.forEach(([a, b], k) => { if (st.v[a] && st.v[b] && !(st.v[a] < st.v[b])) out.push(k); }); return out; }
function completo(p, st) { return st.v.every(x => x > 0) && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { v: sol.slice(), note: Array(p.n * p.n).fill(0) }; }

/* ---------------- Conteggio ----------------
   Ricerca completa con riduzione esatta: in ogni fila restano solo le permutazioni
   compatibili con i candidati e con i segni interni; i segni tra file tolgono gli estremi.
   Poi si prova la casella con meno candidati. */
function conta(p, cap = 2) {
  const n = p.n, N = n * n, L = file(n), TUTTE = (1 << n) - 1;
  const perFila = L.map(f => permDellaFila(p, f));
  const c0 = Array(N).fill(TUTTE);
  if (p.dati) p.dati.forEach((d, i) => { if (d) c0[i] = bit(d); });
  let tot = 0, prima = null;
  const riduci = c => {
    for (let cambio = true; cambio;) {
      cambio = false;
      for (const [a, b] of p.dis) {
        if (!c[a] || !c[b]) return false;
        const ma = c[a] & ((1 << (alto(c[b]) - 1)) - 1);          // a < max(b)
        const mb = c[b] & ~((1 << basso(c[a])) - 1);               // b > min(a)
        if (ma !== c[a]) { c[a] = ma; cambio = true; }
        if (mb !== c[b]) { c[b] = mb; cambio = true; }
        if (!c[a] || !c[b]) return false;
      }
      for (let li = 0; li < L.length; li++) {
        const ce = L[li].celle, m = Array(n).fill(0);
        let alcuna = false;
        for (const x of perFila[li]) {
          let ok = true;
          for (let k = 0; k < n; k++) if (!(c[ce[k]] & bit(x[k]))) { ok = false; break; }
          if (!ok) continue;
          alcuna = true;
          for (let k = 0; k < n; k++) m[k] |= bit(x[k]);
        }
        if (!alcuna) return false;
        for (let k = 0; k < n; k++) if (c[ce[k]] & ~m[k]) { c[ce[k]] &= m[k]; cambio = true; }
      }
    }
    return true;
  };
  const giro = c => {
    if (!riduci(c)) return false;
    let mi = -1, mp = 99;
    for (let i = 0; i < N; i++) { const q = pop(c[i]); if (q > 1 && q < mp) { mp = q; mi = i; } }
    if (mi < 0) { tot++; if (!prima) prima = c.map(m => bits(m, n)[0]); return tot >= cap; }
    for (const d of bits(c[mi], n)) { const c2 = c.slice(); c2[mi] = bit(d); if (giro(c2)) return true; }
    return false;
  };
  giro(c0);
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const n = p.n, N = n * n, L = file(n), TUTTE = (1 << n) - 1;
  const c = Array(N).fill(TUTTE), v = Array(N).fill(0);
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const dellaCella = Array.from({ length: N }, () => []);
  L.forEach((f, k) => f.celle.forEach(i => dellaCella[i].push(k)));
  const metti = (i, d) => { v[i] = d; c[i] = bit(d); for (const k of dellaCella[i]) for (const j of L[k].celle) if (j !== i) c[j] &= ~bit(d); };
  if (p.dati) p.dati.forEach((d, i) => { if (d) metti(i, d); });
  const perFila = L.map(f => permDellaFila(p, f));
  const rotto = () => c.some((m, i) => !m && !v[i]);
  const segno = () => {
    let tolte = 0;
    for (let giro = true; giro;) {
      giro = false;
      for (const [a, b] of p.dis) {
        if (!c[a] || !c[b]) return false;
        const ma = c[a] & ((1 << (alto(c[b]) - 1)) - 1), mb = c[b] & ~((1 << basso(c[a])) - 1);
        if (ma !== c[a] && !v[a]) { c[a] = ma; tolte++; giro = true; }
        if (mb !== c[b] && !v[b]) { c[b] = mb; tolte++; giro = true; }
      }
    }
    if (tolte) { segna('segno', { tolte }); return true; }
    return false;
  };
  const singolo = () => {
    for (let i = 0; i < N; i++) if (!v[i] && pop(c[i]) === 1) { metti(i, bits(c[i], n)[0]); segna('singolo', { cella: i }); return true; }
    for (const f of L) for (let d = 1; d <= n; d++) {
      if (f.celle.some(i => v[i] === d)) continue;
      const pos = f.celle.filter(i => !v[i] && (c[i] & bit(d)));
      if (pos.length === 1) { metti(pos[0], d); segna('singolo', { cella: pos[0] }); return true; }
    }
    return false;
  };
  const coppia = () => {
    for (const f of L) {
      const vuote = f.celle.filter(i => !v[i]);
      for (let a = 0; a < vuote.length; a++) for (let b = a + 1; b < vuote.length; b++) {
        const m = c[vuote[a]];
        if (pop(m) !== 2 || c[vuote[b]] !== m) continue;
        let fatto = false;
        for (const j of vuote) if (j !== vuote[a] && j !== vuote[b] && (c[j] & m)) { c[j] &= ~m; fatto = true; }
        if (fatto) { segna('coppia', { fila: f.nome }); return true; }
      }
    }
    return false;
  };
  const fila = () => {
    for (let li = 0; li < L.length; li++) {
      const f = L[li];
      if (f.celle.every(i => v[i])) continue;
      const poss = perFila[li].filter(x => x.every((d, k) => c[f.celle[k]] & bit(d)));
      if (!poss.length) return false;
      let fatto = false;
      f.celle.forEach((i, k) => {
        let m = 0; for (const x of poss) m |= bit(x[k]);
        if ((c[i] & ~m) && !v[i]) { c[i] &= m; fatto = true; }
      });
      if (fatto) { segna('fila', { fila: f.nome }); return true; }
    }
    return false;
  };
  for (let giri = 0; giri < 50 * N; giri++) {
    if (v.every(x => x)) break;
    if (rotto()) return { risolto: false, contraddizione: true, passi, conteggio };
    if (singolo() || segno() || coppia() || fila()) continue;
    break;
  }
  const risolto = v.every(x => x) && conflitti(p, { v }).length === 0;
  return { risolto, sol: risolto ? v.slice() : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const f = ris.conteggio.fila || 0, cp = ris.conteggio.coppia || 0;
  if (p.n >= 7 && f >= 5) return 'estrema';
  if (p.n >= 6 && (f >= 3 || (f >= 1 && cp >= 3))) return 'esperta';
  if (f >= 1 || cp >= 1) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [5, 6], esperta: [6, 7], estrema: [7] };
function genera(r, voluto, tentativi = 300) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto]);
    const sol = M.quadratoLatino(r, n);
    // tutti i segni tra caselle vicine
    const dis = [];
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) {
      const i = rr * n + cc;
      for (const j of [cc + 1 < n ? i + 1 : -1, rr + 1 < n ? i + n : -1]) if (j >= 0) dis.push(sol[i] < sol[j] ? [i, j] : [j, i]);
    }
    const p = { n, dati: Array(n * n).fill(0), dis };
    // se i soli segni non bastano si aggiunge qualche cifra già messa
    for (let k = 0; k < 12 && !risolvi(p).risolto; k++) {
      const vuote = []; for (let i = 0; i < n * n; i++) if (!p.dati[i]) vuote.push(i);
      const i = r.scegli(vuote); p.dati[i] = sol[i];
    }
    if (!risolvi(p).risolto) continue;
    // si tolgono segni e cifre finché il risolutore ce la fa
    for (const s of r.mescola(p.dis.slice())) { const k = p.dis.indexOf(s); p.dis.splice(k, 1); if (!risolvi(p).risolto) p.dis.splice(k, 0, s); }
    for (const i of r.mescola([...Array(n * n).keys()])) if (p.dati[i]) { const x = p.dati[i]; p.dati[i] = 0; if (!risolvi(p).risolto) p.dati[i] = x; }
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    p.dis.sort((a, b) => Math.min(...a) - Math.min(...b) || Math.max(...a) - Math.max(...b));
    if (p.dati.every(x => !x)) delete p.dati;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || !Array.isArray(p.dis)) return 'forma';
  for (const [a, b] of p.dis) {
    const n = p.n, ra = Math.floor(a / n), rb = Math.floor(b / n);
    const vicine = (ra === rb && Math.abs(a - b) === 1) || Math.abs(a - b) === n;
    if (!vicine || a < 0 || b < 0 || a >= n * n || b >= n * n) return 'segno tra caselle non vicine';
  }
  return null;
}

const E = {
  id: 'futoshiki', nome: 'Futoshiki', tipo: 'cifre', TECNICHE, MISURE,
  breve: 'Cifre da 1 a n senza ripetizioni, rispettando i segni < e >.',
  regole: [
    'In ogni casella va una cifra da 1 a n: ogni cifra <b>una volta per riga e per colonna</b>.',
    'Tra alcune caselle vicine c’è un segno <b>&lt;</b> o <b>&gt;</b> (in verticale ∧ e ∨): la punta indica la cifra più piccola.',
    'Tocca una casella, poi una cifra. Con <b>Note</b> acceso scrivi i candidati.'
  ],
  nuovoStato, conflitti, segniSbagliati, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida,
  cifre: p => p.n
};
if (M) M.motori.futoshiki = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
