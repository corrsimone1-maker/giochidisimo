/* =====================================================================
   TRACCIA: strumento per cercare tavole nuove (non lo usa la pagina).

     node strumenti/traccia.js contorni '<base>' [quante] [seme]
     node strumenti/traccia.js occhi    '<base>' [quante] [seme]
     node strumenti/traccia.js numeri   '<base>' [quante] [seme]

   <base> è una tavola senza simboli, in JSON, per esempio
     '{"w":5,"h":5,"sup":"piano","start":[0,5],"end":[5,0],"endDir":"up","gaps":[]}'
   Opzioni in più nello stesso JSON (si tolgono prima di scrivere la tavola):
     minLen    lunghezza minima della soluzione
     stella    2 o 3: cerca tavole con esattamente quelle soluzioni
     maxI      quanti simboli al massimo
     minSalti  (numeri) quante volte almeno la soluzione passa da una cucitura
     zone      (numeri) in quante zone la soluzione divide la superficie

   CONTORNI E OCCHI. Si sceglie una linea a caso, si mettono i simboli in tutte le caselle e
   si tolgono finché la tavola resta risolvibile ragionando (vedi sotto): così la soluzione è
   unica e si trova senza tentare. Per ogni tavola si stampa la «fatica»:
     idee   quante volte le regole semplici non bastano e serve un'idea, cioè una prova
            «se questo lato ci fosse, allora…» che finisce in una contraddizione
     max    la prova più lunga (quanti lati si deducono prima della contraddizione)
   Le regole semplici: un vertice ha 0 o 2 lati (il cerchio e l'uscita 1), i simboli
   (combinazioni dei quattro lati o delle quattro direzioni), niente anelli, niente linea
   chiusa prima del tempo. Le tavole facili hanno idee = 0, le ultime di un'area 15–25.

   NUMERI (anelli sulle superfici chiuse, o linee). Si enumerano tutte le linee una volta,
   con le grandezze delle zone in array; poi si sceglie una soluzione, si mettono i numeri
   veri e si tolgono finché resta unica.

   Dopo aver scelto, la tavola va in giochi/traccia/tavole.js con un id nuovo, e poi
   node prove/traccia.test.js  (ricontrolla tutto con la forza bruta).
   ===================================================================== */
'use strict';
const TR = require('../giochi/traccia/motore.js');

function rng(seme) { let s = seme >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function mescola(a, R) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- Ragionamento ---------- */
function prepara(p) {
  const G = TR.grafo(p), EL = Object.keys(G.estremi).map(Number), inc = {};
  for (const e of EL) { const [a, b] = G.estremi[e]; (inc[a] || (inc[a] = [])).push(e); (inc[b] || (inc[b] = [])).push(e); }
  const req = v => G.anello ? (v === G.start ? 2 : null) : (v === G.start || v === G.end ? 1 : null);
  const contorni = [], occhi = [];
  for (const k in (p.s || {})) {
    const [i, j] = k.split(',').map(Number), t = TR.tipo(p.s[k]);
    if (t === 'contorno') contorni.push({ l: G.lati[j * p.w + i], n: TR.valore(p.s[k]) });
    else if (t === 'occhio') occhi.push({ r: TR.raggi(G, i, j), n: TR.valore(p.s[k]) });
    else throw new Error('il ragionamento conosce solo contorni e occhi: ' + p.s[k]);
  }
  return { G, EL, inc, VL: Object.keys(inc).map(Number), req, contorni, occhi };
}
// st: -1 ignoto, 0 spento, 1 acceso. Applica le regole semplici finché cambiano qualcosa; false = contraddizione.
function propaga(P, st) {
  const { G, EL, inc, VL, req, contorni, occhi } = P;
  let cambiato = true;
  const metti = (e, v) => { if (st[e] === -1) { st[e] = v; cambiato = true; } };
  while (cambiato) {
    cambiato = false;
    for (const v of VL) {
      let on = 0, un = 0;
      for (const e of inc[v]) { if (st[e] === 1) on++; else if (st[e] === -1) un++; }
      const r = req(v);
      if (r != null) {
        if (on > r || on + un < r) return false;
        if (on === r) for (const e of inc[v]) metti(e, 0);
        else if (on + un === r) for (const e of inc[v]) metti(e, 1);
      } else {
        if (on > 2 || (on === 1 && un === 0)) return false;
        if (on === 2) for (const e of inc[v]) metti(e, 0);
        else if (on === 1 && un === 1) for (const e of inc[v]) metti(e, 1);
        else if (on === 0 && un === 1) for (const e of inc[v]) metti(e, 0);
      }
    }
    for (const c of contorni) {
      let on = 0; const un = [];
      for (const e of c.l) { if (st[e] === 1) on++; else if (st[e] === -1) un.push(e); }
      if (on > c.n || on + un.length < c.n) return false;
      if (on === c.n) for (const e of un) metti(e, 0);
      else if (on + un.length === c.n) for (const e of un) metti(e, 1);
    }
    for (const o of occhi) {
      // lunghezze possibili di ogni raggio (lati spenti fino a l, acceso il successivo)
      const opz = o.r.map(r => {
        const out = [];
        for (let l = 0; l <= r.length; l++) {
          if (l < r.length && st[r[l]] === 0) continue;      // lato spento: lo sguardo non si ferma qui
          out.push(l);
          if (l < r.length && st[r[l]] === 1) break;
        }
        return out;
      });
      const poss = o.r.map(() => new Set());
      let trovate = false;
      for (const a of opz[0]) for (const b of opz[1]) for (const c of opz[2]) {
        const d = o.n - a - b - c; if (!opz[3].includes(d)) continue;
        trovate = true; poss[0].add(a); poss[1].add(b); poss[2].add(c); poss[3].add(d);
      }
      if (!trovate) return false;
      o.r.forEach((r, q) => {
        const ls = [...poss[q]];
        for (let k = 0; k < r.length; k++) {
          if (ls.every(l => k < l)) metti(r[k], 0);
          else if (ls.every(l => k === l)) metti(r[k], 1);
        }
      });
    }
    // niente anelli prima del tempo e niente linea finita con pezzi accesi fuori
    const par = {}, f = x => { if (par[x] == null) par[x] = x; while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    let nOn = 0;
    for (const e of EL) if (st[e] === 1) { nOn++; const ra = f(G.estremi[e][0]), rb = f(G.estremi[e][1]); if (ra === rb) { if (!G.anello) return false; } else par[ra] = rb; }
    if (G.anello) continue;
    const quanti = {};
    for (const e of EL) if (st[e] === 1) { const r = f(G.estremi[e][0]); quanti[r] = (quanti[r] || 0) + 1; }
    const rs = f(G.start), re = f(G.end);
    for (const e of EL) if (st[e] === -1) {
      const ra = f(G.estremi[e][0]), rb = f(G.estremi[e][1]);
      if (ra === rb) metti(e, 0);
      else if (((ra === rs && rb === re) || (ra === re && rb === rs)) && (quanti[rs] || 0) + (quanti[re] || 0) < nOn) metti(e, 0);
    }
  }
  return true;
}
// Risolve ragionando: regole semplici e, quando non bastano, l'idea più corta. Restituisce { risolto, idee, max }.
function fatica(p) {
  const P = prepara(p), G = P.G, st = new Int8Array(G.NE).fill(-1);
  for (const e of P.EL) if (G.rotti.has(e) || G.singolari.has(G.estremi[e][0]) || G.singolari.has(G.estremi[e][1])) st[e] = 0;
  if (!propaga(P, st)) return { risolto: false };
  const costi = [];
  for (;;) {
    const ignoti = P.EL.filter(e => st[e] === -1);
    if (!ignoti.length) break;
    let meglio = null;
    for (const e of ignoti) for (const v of [1, 0]) {
      const s = st.slice(); s[e] = v;
      if (!propaga(P, s)) { const c = ignoti.filter(x => s[x] !== -1).length; if (!meglio || c < meglio.c) meglio = { e, v: 1 - v, c }; }
    }
    if (!meglio) return { risolto: false, idee: costi.length };
    costi.push(meglio.c); st[meglio.e] = meglio.v;
    if (!propaga(P, st)) return { risolto: false };
  }
  return { risolto: true, idee: costi.length, max: Math.max(0, ...costi) };
}
// Più veloce: risolvibile ragionando? (prova ogni lato, senza cercare l'idea più corta)
function risolvibile(p) {
  const P = prepara(p), G = P.G, st = new Int8Array(G.NE).fill(-1);
  for (const e of P.EL) if (G.rotti.has(e)) st[e] = 0;
  if (!propaga(P, st)) return false;
  for (let cambiato = true; cambiato;) {
    cambiato = false;
    for (const e of P.EL) {
      if (st[e] !== -1) continue;
      for (const v of [1, 0]) {
        const s = st.slice(); s[e] = v;
        if (!propaga(P, s)) { st[e] = 1 - v; if (!propaga(P, st)) return false; cambiato = true; break; }
      }
    }
  }
  return P.EL.every(e => st[e] !== -1);
}

/* ---------- Linee ---------- */
function lineaCasuale(base, R, minLen) {
  const G = TR.grafo(base);
  for (let t = 0; t < 2000; t++) {
    const vs = [G.start], es = [], visti = new Set([G.start]);
    let passi = 0, ok = null;
    (function dfs(u) {
      if (ok || passi++ > 4000) return;
      for (const [v, e] of mescola((G.adj[u] || []).slice(), R)) {
        if (ok) return;
        if (visti.has(v)) continue;
        vs.push(v); es.push(e);
        if (v === G.end) { if (es.length >= minLen) ok = { vs: vs.slice(), es: es.slice() }; }
        else { visti.add(v); dfs(v); visti.delete(v); }
        vs.pop(); es.pop();
      }
    })(G.start);
    if (ok) return ok;
  }
  return null;
}
// le direzioni da salvare (come le scrive la pagina) e quante volte la linea salta da un lato incollato
function direzioni(p, sol) {
  const G = TR.grafo(p); let r = p.start.slice(), str = '', salti = 0;
  for (let k = 0; k < sol.es.length; k++) {
    let scelto = null;
    for (const [d, ch] of [[[0, -1], 'U'], [[0, 1], 'D'], [[-1, 0], 'L'], [[1, 0], 'R']]) {
      const st = TR.passo(G, r, d);
      if (!st || st.e !== sol.es[k] || st.v !== sol.vs[k + 1]) continue;
      const salto = st.a[0] !== r[0] || st.a[1] !== r[1];
      if (!scelto || (scelto.salto && !salto)) scelto = { st, ch, salto };
    }
    str += scelto.ch; if (scelto.salto) salti++; r = scelto.st.b;
  }
  return { str, salti };
}

/* ---------- Contorni e occhi ---------- */
function cercaCaselle(tipo, base, opz, R) {
  const T = lineaCasuale(base, R, opz.minLen || 0);
  if (!T) return null;
  const G = TR.grafo(base), usati = new Set(T.es);
  let indizi = [];
  for (const c of G.celle) {
    const i = c % base.w, j = (c - i) / base.w;
    if (tipo === 'contorni') indizi.push([`${i},${j}`, 'c' + G.lati[c].filter(e => usati.has(e)).length]);
    else { const n = TR.vede(G, i, j, e => usati.has(e)); if (n) indizi.push([`${i},${j}`, 'o' + n]); }
  }
  const tav = ind => ({ ...base, s: Object.fromEntries(ind) });
  if (!risolvibile(tav(indizi))) return null;
  for (const x of mescola(indizi.slice(), R)) { const prova = indizi.filter(y => y !== x); if (risolvibile(tav(prova))) indizi = prova; }
  if (opz.stella) {
    // un simbolo in meno, finché le soluzioni sono esattamente opz.stella
    for (const x of mescola(indizi.slice(), R)) {
      const q = tav(indizi.filter(y => y !== x));
      if (TR.soluzioni(q, opz.stella + 1).soluzioni.length === opz.stella) return { p: { ...q, stella: opz.stella } };
    }
    return null;
  }
  const p = tav(indizi);
  return { p, f: fatica(p), sol: direzioni(p, T).str };
}

/* ---------- Numeri ---------- */
function cercaNumeri(base, opz, quante, R) {
  const G = TR.grafo(base), N = base.w * base.h, visti = new Set(), linee = [], dim = [];
  TR.cammini(base, (vs, es) => {
    const k = TR.chiave(es); if (visti.has(k)) return; visti.add(k);
    const Z = TR.zone(G, new Set(es)), r = new Uint8Array(N);
    for (let c = 0; c < N; c++) r[c] = Z.id[c] >= 0 ? Z.elenco[Z.id[c]].length : 0;
    linee.push({ vs: vs.slice(), es: es.slice(), zone: Z.elenco.length }); dim.push(r);
  });
  const quali = ind => { const out = []; for (let i = 0; i < linee.length && out.length < 4; i++) if (ind.every(([c, v]) => dim[i][c] === v)) out.push(i); return out; };
  const adatta = i => { const x = linee[i]; if (x.es.length < (opz.minLen || 0) || (opz.zone && x.zone !== opz.zone)) return false; if (opz.minSalti) { x.d = x.d || direzioni(base, x); if (x.d.salti < opz.minSalti) return false; } return true; };
  const out = [], firme = new Set();
  console.log('linee possibili', linee.length);
  for (let t = 0; t < quante * 20 && out.length < quante; t++) {
    const k = opz.stella || 1, T = [];
    for (let u = 0; u < 400 && T.length < k; u++) { const i = Math.floor(R() * linee.length); if (!T.includes(i) && adatta(i)) T.push(i); }
    if (T.length < k) continue;
    let ind = [];
    for (const c of G.celle) if (T.every(i => dim[i][c] === dim[T[0]][c])) ind.push([c, dim[T[0]][c]]);
    const voluto = T.slice().sort((a, b) => a - b).join();
    if (quali(ind).sort((a, b) => a - b).join() !== voluto) continue;
    for (const x of mescola(ind.slice(), R)) { const prova = ind.filter(y => y !== x); if (quali(prova).sort((a, b) => a - b).join() === voluto) ind = prova; }
    if (opz.maxI && ind.length > opz.maxI) continue;
    const s = Object.fromEntries(ind.map(([c, v]) => [`${c % base.w},${Math.floor(c / base.w)}`, String(v)]));
    if (firme.has(JSON.stringify(s))) continue; firme.add(JSON.stringify(s));
    const p = { ...base, s }; if (opz.stella) p.stella = opz.stella;
    out.push({ p, sol: T.map(i => direzioni(p, linee[i]).str) });
  }
  return out;
}

module.exports = { prepara, propaga, fatica, risolvibile, lineaCasuale, direzioni, cercaCaselle, cercaNumeri };

if (require.main === module) {
  const [cosa, js, quante = '20', seme = '1'] = process.argv.slice(2);
  if (!cosa || !js) { console.log('uso: node strumenti/traccia.js contorni|occhi|numeri \'<base json>\' [quante] [seme]'); process.exit(1); }
  const tutto = JSON.parse(js), opz = {};
  for (const k of ['minLen', 'stella', 'maxI', 'minSalti', 'zone']) if (k in tutto) { opz[k] = tutto[k]; delete tutto[k]; }
  const base = { gaps: [], ...tutto }, R = rng(+seme);
  if (cosa === 'numeri') {
    for (const x of cercaNumeri(base, opz, +quante, R)) console.log(JSON.stringify(x.p), ' soluzioni:', x.sol.join(' '));
  } else {
    const ris = [];
    for (let k = 0; k < +quante; k++) {
      const x = cercaCaselle(cosa, base, opz, R);
      if (x && (!opz.maxI || Object.keys(x.p.s).length <= opz.maxI)) ris.push(x);
    }
    ris.sort((a, b) => ((b.f && b.f.idee) || 0) - ((a.f && a.f.idee) || 0));
    for (const x of ris) console.log(x.f ? `idee ${x.f.idee} max ${x.f.max}  ` : '', JSON.stringify(x.p));
  }
}
