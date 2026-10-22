/* =====================================================================
   MENTAL · PRATO FIORITO senza fortuna
   Campo w×h con le mine fissate per tutti e la stessa apertura iniziale. Il campo si
   pubblica solo se il risolutore, partendo da quell'apertura, arriva in fondo SENZA mai
   tirare a indovinare: ogni casella scoperta è sicura per deduzione.

   Dati: { w, h, mine: 'codice', via: indice della casella di partenza }
         (le mine sono scritte in esadecimale e mescolate con la data, solo per non leggerle
          per sbaglio aprendo il file: non è una protezione)
   Stato: { s: [w·h] } 0 coperta, 1 scoperta, 2 bandiera; { boom: indice } se è saltata.

   Tecniche del risolutore «umano»:
     base      un numero ha già tutte le sue mine (il resto è sicuro) o tante caselle coperte
               quante mine mancano (sono tutte mine);
     coppia    due numeri vicini che condividono caselle: dalla differenza si deduce il resto
               (il classico 1-2, 1-1 contro il bordo…);
     conteggio alla fine, il numero di mine rimaste decide le ultime caselle (solo quando
               restano poche caselle coperte, al massimo 10).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  base: { nome: 'Numero completo', descr: 'Un numero ha già tutte le sue mine, oppure tante caselle coperte quante mine gli mancano.', peso: 1 },
  coppia: { nome: 'Due numeri insieme', descr: 'Due numeri che condividono caselle: dalla differenza si capisce dove sono le mine (1-2, 1-1…).', peso: 3 },
  conteggio: { nome: 'Conta finale', descr: 'Alla fine il numero di mine rimaste decide le ultime caselle.', peso: 5 }
};

/* ---------------- Codifica delle mine ---------------- */
function chiave(seme, k) { const r = M.prng('campo|' + seme); return Array.from({ length: k }, () => r(256)); }
function codifica(mine, w, h, seme) {
  const k = Math.ceil(w * h / 8), b = Array(k).fill(0);
  for (const i of mine) b[i >> 3] |= 1 << (i & 7);
  const ch = chiave(seme, k);
  return b.map((x, q) => (x ^ ch[q]).toString(16).padStart(2, '0')).join('');
}
function decodifica(p) {
  const k = Math.ceil(p.w * p.h / 8), ch = chiave(p.seme, k), out = [];
  for (let q = 0; q < k; q++) { const x = parseInt(p.mine.slice(2 * q, 2 * q + 2), 16) ^ ch[q]; for (let t = 0; t < 8; t++) if (x & (1 << t)) out.push(q * 8 + t); }
  return out.filter(i => i < p.w * p.h);
}

/* ---------------- Geometria ---------------- */
function vicini(w, h, i) {
  const r = Math.floor(i / w), c = i % w, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < h && cc >= 0 && cc < w) out.push(rr * w + cc);
  }
  return out;
}
function numeri(w, h, mine) {
  const m = new Set(mine);
  return Array.from({ length: w * h }, (_, i) => (m.has(i) ? -1 : vicini(w, h, i).filter(j => m.has(j)).length));
}
/* Scopre i a partire da una casella sicura, allargando sugli zeri (come nel gioco vero) */
function apri(w, h, num, aperte, i) {
  const coda = [i], nuove = [];
  while (coda.length) {
    const x = coda.pop();
    if (aperte[x] || num[x] < 0) continue;
    aperte[x] = true; nuove.push(x);
    if (num[x] === 0) for (const y of vicini(w, h, x)) if (!aperte[y]) coda.push(y);
  }
  return nuove;
}

/* ---------------- Regole ---------------- */
function nuovoStato(p) {
  const mine = decodifica(p), num = numeri(p.w, p.h, mine), aperte = Array(p.w * p.h).fill(false);
  apri(p.w, p.h, num, aperte, p.via);
  return { s: aperte.map(x => (x ? 1 : 0)), boom: null };
}
function conflitti(p, st) {
  // un numero con più bandiere intorno di quante mine ha: regola visibile, non svela niente
  const num = numeri(p.w, p.h, decodifica(p)), out = [];
  for (let i = 0; i < num.length; i++) if (st.s[i] === 1 && num[i] > 0) {
    if (vicini(p.w, p.h, i).filter(j => st.s[j] === 2).length > num[i]) out.push(i);
  }
  return out;
}
function completo(p, st) {
  if (st.boom != null) return false;
  const mine = new Set(decodifica(p));
  for (let i = 0; i < p.w * p.h; i++) if (!mine.has(i) && st.s[i] !== 1) return false;
  return true;
}
function statoRisolto(p, sol) { const mine = new Set(decodifica(p)); return { s: Array.from({ length: p.w * p.h }, (_, i) => (mine.has(i) ? 2 : 1)), boom: null }; }

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p, conTraccia = true) {
  const { w, h } = p, N = w * h, mine = decodifica(p), num = numeri(w, h, mine), tot = mine.length;
  const aperte = Array(N).fill(false), band = Array(N).fill(false);
  apri(w, h, num, aperte, p.via);
  const passi = [], conteggio = {};
  const segna = (t, info) => { if (conTraccia) passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const V = Array.from({ length: N }, (_, i) => vicini(w, h, i));
  const scopri = i => { if (num[i] < 0) throw new Error('il risolutore ha scoperto una mina'); apri(w, h, num, aperte, i); };
  const metti = i => { if (num[i] >= 0) throw new Error('il risolutore ha messo una bandiera su una casella libera'); band[i] = true; };
  const vincolo = i => { const U = V[i].filter(j => !aperte[j] && !band[j]); return { U, m: num[i] - V[i].filter(j => band[j]).length }; };
  const numeriUtili = () => { const o = []; for (let i = 0; i < N; i++) if (aperte[i] && num[i] > 0 && V[i].some(j => !aperte[j] && !band[j])) o.push(i); return o; };
  const base = () => {
    for (const i of numeriUtili()) {
      const { U, m } = vincolo(i);
      if (m === 0) { U.forEach(scopri); segna('base', { da: i, sicure: U }); return true; }
      if (m === U.length) { U.forEach(metti); segna('base', { da: i, mine: U }); return true; }
    }
    return false;
  };
  const coppia = () => {
    const nu = numeriUtili();
    for (const a of nu) for (const b of nu) {
      if (a === b) continue;
      const A = vincolo(a), B = vincolo(b);
      const I = A.U.filter(x => B.U.includes(x)); if (!I.length) continue;
      const soloA = A.U.filter(x => !I.includes(x));
      // mine nell'intersezione: tra max(0, a - |soloA|, b - |soloB|) e min(|I|, a, b)
      const soloB = B.U.filter(x => !I.includes(x));
      const minI = Math.max(0, A.m - soloA.length, B.m - soloB.length), maxI = Math.min(I.length, A.m, B.m);
      // in soloA ci sono A.m - mI mine con mI tra minI e maxI
      if (soloA.length && A.m - minI === 0) { soloA.forEach(scopri); segna('coppia', { a, b, sicure: soloA }); return true; }
      if (soloA.length && A.m - maxI === soloA.length) { soloA.forEach(metti); segna('coppia', { a, b, mine: soloA }); return true; }
    }
    return false;
  };
  const conteggio_ = () => {
    const coperte = []; for (let i = 0; i < N; i++) if (!aperte[i] && !band[i]) coperte.push(i);
    const resto = tot - band.filter(Boolean).length;
    if (!coperte.length) return false;
    if (resto === 0) { coperte.forEach(scopri); segna('conteggio', { sicure: coperte }); return true; }
    if (resto === coperte.length) { coperte.forEach(metti); segna('conteggio', { mine: coperte }); return true; }
    if (coperte.length > 10) return false;
    // tutte le disposizioni delle mine rimaste compatibili con i numeri
    const nu = numeriUtili().map(i => ({ i, ...vincolo(i) }));
    const sempre = Array(coperte.length).fill(true), mai = Array(coperte.length).fill(true);
    let quante = 0;
    for (let m = 0; m < (1 << coperte.length); m++) {
      let c = 0; for (let x = m; x; x &= x - 1) c++;
      if (c !== resto) continue;
      const mina = new Set(coperte.filter((_, q) => m & (1 << q)));
      if (!nu.every(v => v.U.filter(x => mina.has(x)).length === v.m)) continue;
      quante++;
      coperte.forEach((x, q) => { if (mina.has(x)) mai[q] = false; else sempre[q] = false; });
    }
    if (!quante) return false;
    const sic = coperte.filter((_, q) => mai[q]), min = coperte.filter((_, q) => sempre[q]);
    if (sic.length) { sic.forEach(scopri); segna('conteggio', { sicure: sic }); return true; }
    if (min.length) { min.forEach(metti); segna('conteggio', { mine: min }); return true; }
    return false;
  };
  for (let giri = 0; giri < 4 * N; giri++) {
    let finito = true; for (let i = 0; i < N; i++) if (num[i] >= 0 && !aperte[i]) { finito = false; break; }
    if (finito) break;
    if (base() || coppia() || conteggio_()) continue;
    break;
  }
  let risolto = true; for (let i = 0; i < N; i++) if (num[i] >= 0 && !aperte[i]) { risolto = false; break; }
  return { risolto, sol: risolto ? Array.from({ length: N }, (_, i) => (num[i] < 0 ? 1 : 0)) : null, passi, conteggio };
}
/* Il prato fiorito non ha un «conteggio delle soluzioni» in senso stretto: le mine sono date.
   conta() restituisce 1 se il campo si risolve senza fortuna, 0 se no (per uniformità). */
function conta(p) { const r = risolvi(p, false); conta.ultima = r.sol; return r.risolto ? 1 : 0; }

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const c = ris.conteggio, cop = c.coppia || 0, fin = c.conteggio || 0, mine = decodifica(p).length / (p.w * p.h);
  if (cop >= 14 && mine >= 0.2) return 'estrema';
  if (cop >= 8 && mine >= 0.18) return 'esperta';
  if (cop >= 4 || fin >= 1) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [[9, 12, 20]], esperta: [[9, 13, 24]], estrema: [[9, 14, 29]] };
function genera(r, voluto, tentativi = 4000, seme = 'x') {
  for (let t = 0; t < tentativi; t++) {
    const [w, h, k] = r.scegli(MISURE[voluto]);
    const N = w * h;
    // partenza vicino al centro; nessuna mina attorno, così si apre una zona
    const via = (Math.floor(h / 2) + r(3) - 1) * w + Math.floor(w / 2) + r(3) - 1;
    const vietate = new Set([via, ...vicini(w, h, via)]);
    const libere = r.mescola([...Array(N).keys()].filter(i => !vietate.has(i)));
    const mine = libere.slice(0, k).sort((a, b) => a - b);
    const p = { w, h, seme, mine: codifica(mine, w, h, seme), via };
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.w) || !Number.isInteger(p.h) || typeof p.mine !== 'string' || !Number.isInteger(p.via)) return 'forma';
  const m = decodifica(p);
  if (m.includes(p.via) || vicini(p.w, p.h, p.via).some(j => m.includes(j))) return 'partenza non sicura';
  return null;
}

const E = {
  id: 'campo', nome: 'Prato fiorito', tipo: 'campo', TECNICHE, MISURE,
  breve: 'Campo minato senza fortuna: si arriva in fondo solo ragionando.',
  regole: [
    'Scopri tutte le caselle <b>senza mine</b>. Un numero dice quante mine ci sono nelle 8 caselle intorno.',
    'Il campo è lo stesso per tutti e si risolve <b>sempre per deduzione</b>: non c’è mai bisogno di tirare a indovinare.',
    'Tocca per scoprire; con <b>Bandiera</b> acceso (o tenendo premuto) segni una mina. Toccando un numero che ha già tutte le sue bandiere si scoprono le caselle intorno.',
    'Se scopri una mina la sfida è <b>persa</b>; dopo puoi rigiocarla per allenamento.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida,
  decodifica, numeri, vicini, apri, codifica
};
if (M) M.motori.campo = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
