/* =====================================================================
   MENTAL · GRATTACIELI
   Griglia n×n di torri alte da 1 a n: ogni altezza una volta per riga e per colonna.
   Un numero sul bordo dice quante torri si vedono guardando da lì: una torre nasconde
   tutte quelle più basse dietro di lei.

   Dati: { n, su: [n], giu: [n], sx: [n], dx: [n] } (0 = nessun numero), dati: [n·n] (0 vuota)
   Stato: { v: [n·n], note: [n·n bitmask] }

   Tecniche del risolutore «umano»:
     bordo      i numeri sul bordo: 1 vuol dire la torre più alta subito lì, n tutte in fila
                crescente, e in generale vicino a un numero c le torri non possono essere
                troppo alte (al passo d: al massimo n − c + 1 + d);
     singolo    singoli nudi e nascosti di riga e colonna;
     coppia     coppie nude in una riga o colonna;
     fila       analisi di una fila intera: tra i modi di completarla compatibili con i suoi
                numeri e i candidati, le altezze che restano possibili.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  bordo: { nome: 'Lettura dei bordi', descr: 'Vicino a un numero alto le torri sono basse; un 1 vuol dire la torre più alta subito lì.', peso: 1 },
  singolo: { nome: 'Singolo', descr: 'Una casella ha una sola altezza possibile, o un’altezza ha un solo posto nella fila.', peso: 1 },
  coppia: { nome: 'Coppia', descr: 'Due caselle di una fila con le stesse due altezze possibili: quelle altezze sono loro.', peso: 3 },
  fila: { nome: 'Analisi della fila', descr: 'Provando tutti i modi di completare una fila con i suoi numeri, alcune altezze restano impossibili.', peso: 5 }
};
const bit = d => 1 << (d - 1);
const bits = (m, n) => { const o = []; for (let d = 1; d <= n; d++) if (m & bit(d)) o.push(d); return o; };
const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const visibili = a => { let mx = 0, c = 0; for (const x of a) if (x > mx) { mx = x; c++; } return c; };

/* Le file con i due numeri alle estremità: { celle (dal primo numero), a (numero iniziale), b (numero finale) } */
function file(p) {
  const n = p.n, out = [];
  for (let r = 0; r < n; r++) out.push({ celle: Array.from({ length: n }, (_, c) => r * n + c), a: p.sx[r], b: p.dx[r], nome: 'riga ' + (r + 1) });
  for (let c = 0; c < n; c++) out.push({ celle: Array.from({ length: n }, (_, r) => r * n + c), a: p.su[c], b: p.giu[c], nome: 'colonna ' + (c + 1) });
  return out;
}
const permCache = {};
function permutazioni(n) {
  if (permCache[n]) return permCache[n];
  const out = [], a = [...Array(n).keys()].map(x => x + 1);
  const giro = k => { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; giro(k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
  giro(0);
  return (permCache[n] = out.map(x => ({ x, va: visibili(x), vb: visibili(x.slice().reverse()) })));
}

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { v: (p.dati || Array(p.n * p.n).fill(0)).slice(), note: Array(p.n * p.n).fill(0) }; }
function conflitti(p, st) {
  const out = new Set();
  for (const f of file(p)) {
    for (let a = 0; a < p.n; a++) for (let b = a + 1; b < p.n; b++) { const x = st.v[f.celle[a]]; if (x && x === st.v[f.celle[b]]) { out.add(f.celle[a]); out.add(f.celle[b]); } }
    if (f.celle.every(i => st.v[i])) {
      const vals = f.celle.map(i => st.v[i]);
      if ((f.a && visibili(vals) !== f.a) || (f.b && visibili(vals.slice().reverse()) !== f.b)) f.celle.forEach(i => out.add(i));
    }
  }
  return [...out];
}
/* Numeri del bordo non rispettati (da colorare): 'su3', 'sx1', … */
function indiziSbagliati(p, st) {
  const out = [], n = p.n;
  const L = file(p);
  L.forEach((f, k) => {
    if (!f.celle.every(i => st.v[i])) return;
    const vals = f.celle.map(i => st.v[i]);
    const [lA, lB] = k < n ? ['sx', 'dx'] : ['su', 'giu'], idx = k % n;
    if (f.a && visibili(vals) !== f.a) out.push(lA + idx);
    if (f.b && visibili(vals.slice().reverse()) !== f.b) out.push(lB + idx);
  });
  return out;
}
function completo(p, st) { return st.v.every(x => x > 0) && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { v: sol.slice(), note: Array(p.n * p.n).fill(0) }; }

/* ---------------- Conteggio ----------------
   Ricerca completa: candidati per casella, a ogni nodo si tengono in ogni fila solo le
   permutazioni compatibili con i candidati e con i numeri del bordo (riduzione esatta,
   non toglie mai una soluzione), poi si prova la casella con meno candidati. */
function conta(p, cap = 2) {
  const n = p.n, N = n * n, L = file(p), P = permutazioni(n), TUTTE = (1 << n) - 1;
  const perFila = L.map(f => P.filter(q => (!f.a || q.va === f.a) && (!f.b || q.vb === f.b)));
  const c0 = Array(N).fill(TUTTE);
  if (p.dati) p.dati.forEach((d, i) => { if (d) c0[i] = bit(d); });
  let tot = 0, prima = null;
  const riduci = c => {
    for (let cambio = true; cambio;) {
      cambio = false;
      for (let li = 0; li < L.length; li++) {
        const ce = L[li].celle, m = Array(n).fill(0);
        let alcuna = false;
        for (const q of perFila[li]) {
          let ok = true;
          for (let k = 0; k < n; k++) if (!(c[ce[k]] & bit(q.x[k]))) { ok = false; break; }
          if (!ok) continue;
          alcuna = true;
          for (let k = 0; k < n; k++) m[k] |= bit(q.x[k]);
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
    for (const d of bits(c[mi], n)) {
      const c2 = c.slice(); c2[mi] = bit(d);
      if (giro(c2)) return true;
    }
    return false;
  };
  giro(c0);
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const n = p.n, N = n * n, L = file(p), P = permutazioni(n), TUTTE = (1 << n) - 1;
  const c = Array(N).fill(TUTTE), v = Array(N).fill(0);
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const dellaCella = Array.from({ length: N }, () => []);
  L.forEach((f, k) => f.celle.forEach(i => dellaCella[i].push(k)));
  const metti = (i, d) => { v[i] = d; c[i] = bit(d); for (const k of dellaCella[i]) for (const j of L[k].celle) if (j !== i) c[j] &= ~bit(d); };
  if (p.dati) p.dati.forEach((d, i) => { if (d) metti(i, d); });
  // bordo (una volta, all'inizio)
  let tolte = 0;
  for (const f of L) for (const [num, celle] of [[f.a, f.celle], [f.b, f.celle.slice().reverse()]]) {
    if (!num) continue;
    celle.forEach((i, d) => { const max = n - num + 1 + d; for (let h = max + 1; h <= n; h++) if (c[i] & bit(h)) { c[i] &= ~bit(h); tolte++; } });
    if (num === n) celle.forEach((i, d) => { if (c[i] !== bit(d + 1)) { c[i] &= bit(d + 1); tolte++; } });
  }
  if (tolte) segna('bordo', { tolte });
  const rotto = () => c.some((m, i) => !m && !v[i]);
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
  const perFila = L.map(f => (f.a || f.b ? P.filter(q => (!f.a || q.va === f.a) && (!f.b || q.vb === f.b)) : null));
  const fila = () => {
    for (let li = 0; li < L.length; li++) {
      const f = L[li];
      if (!perFila[li]) continue;
      if (f.celle.every(i => v[i])) continue;
      const poss = perFila[li].filter(q => q.x.every((x, k) => c[f.celle[k]] & bit(x)));
      if (!poss.length) return false;
      let fatto = false;
      f.celle.forEach((i, k) => {
        let m = 0; for (const q of poss) m |= bit(q.x[k]);
        if ((c[i] & ~m) && !v[i]) { c[i] &= m; fatto = true; }
      });
      if (fatto) { segna('fila', { fila: f.nome }); return true; }
    }
    return false;
  };
  for (let giri = 0; giri < 50 * N; giri++) {
    if (v.every(x => x)) break;
    if (rotto()) return { risolto: false, contraddizione: true, passi, conteggio };
    if (singolo() || coppia() || fila()) continue;
    break;
  }
  const risolto = v.every(x => x) && conflitti(p, { v }).length === 0;
  return { risolto, sol: risolto ? v.slice() : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const f = ris.conteggio.fila || 0, cp = ris.conteggio.coppia || 0;
  if (p.n >= 7 && f >= 6) return 'estrema';
  if (p.n >= 6 && (f >= 5 || (f >= 3 && cp >= 2))) return 'esperta';
  if (f >= 2) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [5, 6], esperta: [6], estrema: [7] };
const quadratoLatino = (r, n) => M.quadratoLatino(r, n);
function genera(r, voluto, tentativi = 300) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto]);
    const sol = quadratoLatino(r, n);
    const riga = k => sol.slice(k * n, k * n + n), col = k => Array.from({ length: n }, (_, q) => sol[q * n + k]);
    const p = {
      n, dati: Array(n * n).fill(0),
      su: Array.from({ length: n }, (_, k) => visibili(col(k))), giu: Array.from({ length: n }, (_, k) => visibili(col(k).reverse())),
      sx: Array.from({ length: n }, (_, k) => visibili(riga(k))), dx: Array.from({ length: n }, (_, k) => visibili(riga(k).reverse()))
    };
    // con i soli numeri del bordo a volte non basta (soprattutto 7×7): si aggiunge qualche torre
    // già messa, dove il risolutore si ferma, finché ce la fa
    for (let k = 0; k < 10 && !risolvi(p).risolto; k++) {
      const ris0 = risolvi(p), vuote = [];
      for (let i = 0; i < n * n; i++) if (!p.dati[i]) vuote.push(i);
      const i = r.scegli(vuote); p.dati[i] = sol[i]; void ris0;
    }
    if (!risolvi(p).risolto) continue;
    // si tolgono numeri dal bordo (e torri date) finché il risolutore ce la fa
    const tutti = r.mescola([].concat(...['su', 'giu', 'sx', 'dx'].map(l => [...Array(n).keys()].map(k => [l, k]))));
    for (const [l, k] of tutti) { const x = p[l][k]; p[l][k] = 0; if (!risolvi(p).risolto) p[l][k] = x; }
    for (let i = 0; i < n * n; i++) if (p.dati[i]) { const x = p.dati[i]; p.dati[i] = 0; if (!risolvi(p).risolto) p.dati[i] = x; }
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    if (p.dati.every(x => !x)) delete p.dati;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || !['su', 'giu', 'sx', 'dx'].every(l => Array.isArray(p[l]) && p[l].length === p.n)) return 'forma';
  return null;
}

const E = {
  id: 'grattacieli', nome: 'Grattacieli', tipo: 'cifre', TECNICHE, MISURE,
  breve: 'Torri da 1 a n: i numeri sul bordo dicono quante se ne vedono.',
  regole: [
    'In ogni casella c’è una torre alta da 1 a n: ogni altezza <b>una volta per riga e per colonna</b>.',
    'Un numero sul bordo dice <b>quante torri si vedono</b> guardando da lì: una torre più alta nasconde quelle più basse dietro di lei.',
    'Esempio: la fila 2 · 4 · 1 · 3 vista da sinistra mostra 2 torri (la 2 e la 4).',
    'Tocca una casella, poi un’altezza. Con <b>Note</b> acceso scrivi i candidati.'
  ],
  nuovoStato, conflitti, indiziSbagliati, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida,
  cifre: p => p.n, visibili
};
if (M) M.motori.grattacieli = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
