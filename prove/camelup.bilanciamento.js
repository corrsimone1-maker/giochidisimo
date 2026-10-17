// Simulazioni di bilanciamento di Camel Up: Economics (non è una prova che passa o fallisce: stampa numeri).
// Uso, dalla cartella della repo:   node prove/camelup.bilanciamento.js [corse] [campioni]
// Di base 400 corse e 1500 campioni Monte Carlo per stato: circa un minuto. Con 3000 corse escono
// le tabelle d'apertura usate in giochi/camelup/motore.js (APERTURA).
//
// Il motore di corsa qui sotto segue il regolamento della 2ª edizione: 16 caselle, cinque cammelli da corsa
// che partono da 1–3, due pazzi da 14–16 che vanno all'indietro, pile che si portano dietro chi sta sopra,
// dado grigio a sei facce (1–3 bianche e nere) con le due eccezioni (un solo pazzo che porta cammelli da corsa;
// un pazzo direttamente sopra l'altro). Tessere spettatore escluse: a inizio tappa non ci sono mai.
'use strict';
const path = require('path');
const CU = require(path.join(__dirname, '..', 'giochi', 'camelup', 'motore.js'));
const NCORSE = +process.argv[2] || 400, NMC = +process.argv[3] || 1500;

/* PRNG veloce e riproducibile (qui non serve la casualità crittografica) */
let seme = 20261017;
const rnd = () => { seme = (seme + 0x6D2B79F5) >>> 0; let t = seme; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = n => Math.floor(rnd() * n);
const mescola = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* Cammelli 0..4 da corsa, 5 pazzo bianco, 6 pazzo nero; pile[k] dal basso all'alto, k = 0..17 */
const clona = S => ({ pile: S.pile.map(p => p.slice()), fine: S.fine });
const dove = (S, c) => { for (let k = 0; k < 18; k++) { const i = S.pile[k].indexOf(c); if (i >= 0) return [k, i]; } };
function partenza() {
  const S = { pile: Array.from({ length: 18 }, () => []), fine: false };
  for (const c of mescola([0, 1, 2, 3, 4])) S.pile[1 + ri(3)].push(c);
  for (const c of [5, 6]) S.pile[17 - (1 + ri(3))].push(c);
  return S;
}
function pazzo(S, col) {
  const [kw, iw] = dove(S, 5), [kb, ib] = dove(S, 6);
  const porta = (k, i) => S.pile[k].slice(i + 1).some(x => x < 5);
  const pw = porta(kw, iw), pb = porta(kb, ib);
  if (pw !== pb) return pw ? 5 : 6;
  if (kw === kb) { if (iw === ib + 1) return 5; if (ib === iw + 1) return 6; }
  return col;
}
function muovi(S, d, v, col) {
  const c = d < 5 ? d : pazzo(S, col), [k, i] = dove(S, c), gruppo = S.pile[k].splice(i);
  let to = c < 5 ? k + v : k - v;
  if (c < 5 && to > 16) { to = 17; S.fine = true; }
  if (c >= 5 && to < 1) { to = 0; S.fine = true; }
  S.pile[to].push(...gruppo);
}
const tira = d => [d, 1 + ri(3), d === 5 ? (ri(2) ? 5 : 6) : 0];
const classifica = S => { const o = []; for (let k = 17; k >= 0; k--) for (let i = S.pile[k].length - 1; i >= 0; i--) if (S.pile[k][i] < 5) o.push(S.pile[k][i]); return o; };
/* Probabilità di vincere la tappa (p1) e di essere secondo (p2); gen() dà le estrazioni rimaste */
function prob(S, gen, n = NMC) {
  const p1 = [0, 0, 0, 0, 0], p2 = [0, 0, 0, 0, 0];
  for (let t = 0; t < n; t++) { const X = clona(S); for (const e of gen()) { muovi(X, ...e); if (X.fine) break; } const c = classifica(X); p1[c[0]]++; p2[c[1]]++; }
  return { p1: p1.map(x => x / n), p2: p2.map(x => x / n) };
}
const caso = (rim, m) => () => mescola(rim.slice()).slice(0, m).map(tira);

/* Stati a inizio tappa e dopo 1..4 dadi, da corse intere giocate a caso */
const stati = [];
for (let g = 0; g < NCORSE; g++) {
  const S = partenza(); let tappa = 1;
  while (!S.fine) {
    const seq = mescola([0, 1, 2, 3, 4, 5]), rank0 = classifica(S);
    for (let k = 0; k < 5 && !S.fine; k++) { stati.push({ S: clona(S), rim: seq.slice(k), k, tappa, rank0, g }); muovi(S, ...tira(seq[k])); }
    tappa++;
  }
}
for (const c of stati) c.pr = prob(c.S, caso(c.rim, 5 - c.k));
const f3 = x => x.toFixed(3), media = a => a.reduce((x, y) => x + y, 0) / a.length;

console.log(`${NCORSE} corse, ${stati.length} stati, ${NMC} campioni per stato\n`);
/* 1. Probabilità media di vincere la tappa per posto in classifica a inizio tappa (tabelle d'apertura) */
for (const [nome, filtro] of [['tappa 1', c => c.k === 0 && c.tappa === 1], ['tappe 2+', c => c.k === 0 && c.tappa > 1]]) {
  const sel = stati.filter(filtro), m = [0, 1, 2, 3, 4].map(r => media(sel.map(c => c.pr.p1[c.rank0[r]])));
  console.log(`apertura ${nome} (n=${sel.length}): ${m.map(f3).join(' ')}   (motore: ${(nome === 'tappa 1' ? CU.APERTURA.prima : CU.APERTURA.dopo).join(' ')})`);
}
for (const k of [0, 1, 2, 3, 4]) {
  const pm = stati.filter(c => c.k === k).map(c => Math.max(...c.pr.p1)).sort((a, b) => a - b);
  console.log(`favorito vero dopo ${k} dadi: media ${f3(media(pm))}, mediana ${f3(pm[pm.length >> 1])}, 90° percentile ${f3(pm[Math.floor(pm.length * 0.9)])}`);
}

/* 2. Guadagno atteso del miglior acquisto a prezzi d'apertura (fermi: il banco non vede il tabellone) */
const cfgU = CU.configura({ apertura: 'uniforme' }), cfgC = CU.configura({});
const q0 = (cfg, c) => CU.TIPI_MERCATO.vincitore.q0(cfg, c.tappa, c.rank0);
const costo = (cfg, q, i) => CU.Lmsr.acquisto(q, i, cfg.b, cfg.R);
console.log('\nmiglior acquisto a prezzi d’apertura (crediti; 10 crediti = 1 sterlina) e tessera da 5 sul favorito (sterline):');
for (const k of [0, 1, 2, 3]) {
  const sel = stati.filter(c => c.k === k);
  const ev = cfg => media(sel.map(c => Math.max(...[0, 1, 2, 3, 4].map(i => cfg.R * c.pr.p1[i] - costo(cfg, q0(cfg, c), i)))));
  const t5 = media(sel.map(c => { const i = c.pr.p1.indexOf(Math.max(...c.pr.p1)); return 6 * c.pr.p1[i] + 2 * c.pr.p2[i] - 1; }));
  console.log(`  dopo ${k} dadi: uniforme +${ev(cfgU).toFixed(1)}, dalla classifica +${ev(cfgC).toFixed(1)}; tessera da 5 ${t5.toFixed(2)}`);
}

/* 3. Valore dell'azione di vendita tenuta di riserva: si compra all'apertura il miglior acquisto e,
      dopo 3 o 4 dadi, si rivende a quanto pagato (se nessuno ha toccato quel cammello) quando conviene */
const tappe = new Map(); for (const c of stati) { const key = c.g + ':' + c.tappa; if (!tappe.has(key)) tappe.set(key, []); tappe.get(key)[c.k] = c; }
for (const [nome, cfg] of [['uniforme', cfgU], ['dalla classifica', cfgC]]) {
  let v3 = 0, v4 = 0, n = 0;
  for (const a of tappe.values()) {
    if (!a[0] || !a[4]) continue;
    const q = q0(cfg, a[0]); let bi = 0, bv = -1e9;
    for (let i = 0; i < 5; i++) { const v = cfg.R * a[0].pr.p1[i] - costo(cfg, q, i); if (v > bv) { bv = v; bi = i; } }
    const c = costo(cfg, q, bi); v3 += Math.max(0, c - cfg.R * a[3].pr.p1[bi]); v4 += Math.max(0, c - cfg.R * a[4].pr.p1[bi]); n++;
  }
  console.log(`rivendita di riserva (${nome}): vale +${(v3 / n).toFixed(1)} crediti dopo 3 dadi, +${(v4 / n).toFixed(1)} dopo 4`);
}

/* 4. Spionaggio: quanto rende ogni domanda (miglior scommessa subito dopo: contratto fino a 2 dadi, poi tessera da 5) */
const NS = Math.min(80, Math.floor(stati.length / 5)), NC = Math.max(400, NMC >> 1);
const valore = (c, pr) => {
  const q = q0(cfgC, c);
  let mk = 0; for (let i = 0; i < 5; i++) mk = Math.max(mk, cfgC.R * pr.p1[i] - costo(cfgC, q, i));
  let tl = -1e9; for (let i = 0; i < 5; i++) tl = Math.max(tl, 10 * (6 * pr.p1[i] + 2 * pr.p2[i] - 1));
  return c.k <= cfgC.finestraAcquisti ? Math.max(mk, tl) : tl;
};
const facce = d => d === 5 ? [[1, 5], [2, 5], [3, 5], [1, 6], [2, 6], [3, 6]] : [[1, 0], [2, 0], [3, 0]];
const valori = [];
for (const k of [0, 1, 2, 3, 4]) for (const c of stati.filter(x => x.k === k).slice(0, NS)) {
  const rim = c.rim, m = 5 - k, base = valore(c, c.pr), v = { k };
  v.A = -base; for (const d of rim) for (const [vv, col] of facce(d)) v.A += valore(c, prob(c.S, () => [[d, vv, col], ...mescola(rim.filter(x => x !== d)).slice(0, m - 1).map(tira)], NC)) / (rim.length * facce(d).length);
  v.B = -base; for (const d of rim) v.B += valore(c, prob(c.S, () => mescola(rim.filter(x => x !== d)).map(tira), NC)) / rim.length;
  let best = -1e9;
  for (let a = 0; a < rim.length; a++) for (let b = a + 1; b < rim.length; b++) {
    let t = 0; for (const [x, y] of [[rim[a], rim[b]], [rim[b], rim[a]]]) t += valore(c, prob(c.S, () => { const s = mescola(rim.slice()); const ix = s.indexOf(x), iy = s.indexOf(y); if (ix > iy) { s[ix] = y; s[iy] = x; } return s.slice(0, m).map(tira); }, NC)) / 2;
    best = Math.max(best, t);
  }
  v.C = best - base; valori.push(v);
}
console.log('\nvalore medio delle domande (crediti in più sulla miglior scommessa):');
for (const k of [0, 1, 2, 3, 4]) { const s = valori.filter(v => v.k === k); console.log(`  dopo ${k} dadi: prossimo dado +${media(s.map(v => v.A)).toFixed(1)}, dado escluso +${media(s.map(v => v.B)).toFixed(1)}, precedenza +${media(s.map(v => v.C)).toFixed(1)}`); }
for (const [nome, costi] of [['prima proposta 6/4/2', { A: 6, B: 4, C: 2 }], ['motore ' + Object.values(cfgC.costi).join('/'), cfgC.costi]]) {
  const conta = { A: 0, B: 0, C: 0, nessuna: 0 };
  for (const v of valori) { let best = 'nessuna', bv = 0; for (const q of ['A', 'B', 'C']) if (v[q] - costi[q] > bv) { bv = v[q] - costi[q]; best = q; } conta[best]++; }
  console.log(`  ${nome}: conviene di più ${Object.entries(conta).map(([q, x]) => `${{ A: 'prossimo dado', B: 'escluso', C: 'precedenza', nessuna: 'nessuna' }[q]} ${Math.round(100 * x / valori.length)}%`).join(', ')}`);
}
