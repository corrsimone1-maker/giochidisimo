// Prove del motore di ALIBI (giochi/alibi/motore.js), senza browser.
// Uso, dalla cartella della repo:  node prove/alibi.test.js
// Coprono parametri, codici, determinismo (stesso link = stesso caso su ogni telefono), mondo fisicamente
// possibile, il ragionamento completo (candidati) contro una forza bruta indipendente, bugie qualunque del
// colpevole nel modo traditore, rifiuti nel modo cooperativo, niente scorciatoie, spiegazione vera frase per
// frase, migliaia di casi.
'use strict';
const assert = require('assert');
const path = require('path');
const AL = require(path.join(__dirname, '..', 'giochi', 'alibi', 'motore.js'));
let ok = 0; const prova = (nome, f) => { const t = Date.now(); f(); ok++; console.log('ok  ', nome, `(${((Date.now() - t) / 1000).toFixed(1)} s)`); };
const errore = (f, re) => assert.throws(f, e => e instanceof AL.ErroreCaso && (!re || re.test(e.message)));
const J = x => JSON.stringify(x);
const NOMI = ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena', 'Fabio', 'Gaia', 'Ivo'];
const R = AL.prng('prove-alibi');
const codice = () => { let s = ''; for (let i = 0; i < 6; i++) s += AL.ALFABETO[R(AL.ALFABETO.length)]; return s; };
const p = (o = {}) => Object.assign({ codice: codice(), nomi: NOMI.slice(0, 5), livello: 'medio', modo: 'traditore', luogo: 'caso' }, o);
const indici = n => Array.from({ length: n }, (_, i) => i);

prova('parametri: codice, numero di giocatori, nomi doppi', () => {
  errore(() => AL.genera(p({ codice: 'ABC' })), /Codice/);
  errore(() => AL.genera(p({ codice: 'AAAAA0' })), /Codice/);
  errore(() => AL.genera(p({ nomi: ['Ada', 'Bruno'] })), /da 3 a 8/);
  errore(() => AL.genera(p({ nomi: NOMI.concat(['Zoe']) })), /3 a 8/);
  errore(() => AL.genera(p({ nomi: ['Ada', 'ADA', 'Bruno'] })), /stesso nome/);
  assert.doesNotThrow(() => AL.genera(p({ modo: 'coop', nomi: ['Ada'] })));
  const par = AL.parametri({ codice: 'ACDEFG', nomi: [' Ada  Rossi ', 'B', 'C'], livello: 'boh', modo: 'boh', luogo: 'boh' });
  assert.deepEqual(par, { codice: 'ACDEFG', nomi: ['Ada Rossi', 'B', 'C'], livello: 'medio', modo: 'traditore', luogo: 'caso' });
});
prova('codici: 6 caratteri dell’alfabeto, tutti ugualmente probabili (25.000 codici)', () => {
  const cont = {};
  for (let i = 0; i < 25000; i++) { const c = AL.nuovoCodice(); assert.ok(AL.codiceValido(c), c); for (const ch of c) cont[ch] = (cont[ch] || 0) + 1; }
  const att = 25000 * 6 / 25, chi2 = Object.values(cont).reduce((a, o) => a + (o - att) ** 2 / att, 0);
  assert.equal(Object.keys(cont).length, 25); assert.ok(chi2 < 52, 'chi-quadro ' + chi2.toFixed(1));   // 24 gradi di libertà, p ≈ 0.001
});
prova('determinismo: stessi parametri, stesso caso (anche dopo aver svuotato la cache); parametri diversi, casi diversi', () => {
  for (let i = 0; i < 60; i++) {
    const par = p({ modo: i % 2 ? 'coop' : 'traditore', livello: ['facile', 'medio', 'difficile'][i % 3] });
    const a = J(AL.genera(par)); AL.svuotaCache(); const b = J(AL.genera(par));
    assert.equal(a, b);
    AL.svuotaCache(); assert.notEqual(J(AL.genera(Object.assign({}, par, { codice: codice() }))), a);
  }
});
prova('salvataggio: un caso passato da JSON dà le stesse dichiarazioni, soluzione e candidati', () => {
  for (let i = 0; i < 40; i++) {
    const c1 = AL.genera(p({ modo: i % 2 ? 'coop' : 'traditore' })), c2 = JSON.parse(J(c1));
    const tutti = indici(c1.N);
    assert.equal(J(AL.dichiarazioni(c2)), J(AL.dichiarazioni(c1)));
    assert.equal(J(AL.soluzione(c2)), J(AL.soluzione(c1)));
    assert.equal(J(AL.candidati(c2, AL.dichiarazioni(c2), tutti)), J(AL.candidati(c1, AL.dichiarazioni(c1), tutti)));
  }
});

/* ---------------- Forza bruta indipendente ----------------
   Per ogni ipotesi e ogni persona si cercano DAVVERO i percorsi (ricerca in profondità stanza per stanza),
   controllando ogni dichiarazione dei fidati alla lettera. */
function candidatiBruta(caso, dich, disponibili) {
  const L = AL.LUOGO[caso.luogo], v = AL.vicini(L), nS = L.stanze.length, Q = caso.Q, mente = caso.par.modo === 'traditore';
  const out = [];
  for (const i of caso.sospettati) {
    const fid = mente ? disponibili.filter(w => w !== i) : disponibili;
    const lecito = (q, t, s) => {
      if (t === caso.T && (q === i) !== (s === caso.X)) return false;
      if (fid.includes(q) && dich[q][t].stanza !== null && dich[q][t].stanza !== s) return false;
      for (const w of fid) {
        if (w === q) continue;
        const d = dich[w][t];
        if (d.stanza === null || !d.ricorda) continue;
        if ((s === d.stanza) !== d.con.includes(q)) return false;
      }
      return true;
    };
    const esiste = (q, t, s) => {
      if (!lecito(q, t, s)) return false;
      if (t === Q - 1) return true;
      return v[s].concat([s]).some(y => esiste(q, t + 1, y));
    };
    if (indici(caso.N).every(q => indici(nS).some(s => esiste(q, 0, s)))) out.push(i);
  }
  return out;
}
/* Una bugia qualunque del colpevole: un percorso inventato (anche impossibile), ricordi e compagnie a caso */
function bugia(caso, rr) {
  const L = AL.LUOGO[caso.luogo], nS = L.stanze.length;
  return indici(caso.Q).map(t => ({ stanza: rr(nS), ricorda: rr(2) === 0, con: indici(caso.N).filter(j => j !== caso.colpevole && rr(3) === 0) }));
}
prova('ragionamento completo = forza bruta (400 casi; con tutto, con i soli verbali, con un fascicolo, con bugie del colpevole)', () => {
  const rr = AL.prng('bugie');
  for (let i = 0; i < 400; i++) {
    const modo = i % 2 ? 'coop' : 'traditore';
    const caso = AL.genera(p({ modo, livello: ['facile', 'medio', 'difficile'][i % 3], nomi: NOMI.slice(0, modo === 'coop' ? 1 + (i % 4) : 3 + (i % 4)), luogo: AL.LUOGHI[i % 4].id }));
    const dich = AL.dichiarazioni(caso), tutti = indici(caso.N), pub = AL.pubblici(caso), gi = tutti.filter(j => caso.persone[j].tipo === 'giocatore');
    for (const disp of [tutti, pub, pub.concat([gi[0]])]) assert.equal(J(AL.candidati(caso, dich, disp)), J(candidatiBruta(caso, dich, disp)));
    if (modo === 'traditore') {
      const d2 = dich.slice(); d2[caso.colpevole] = bugia(caso, rr);
      assert.equal(J(AL.candidati(caso, d2, tutti)), J(candidatiBruta(caso, d2, tutti)));
    }
  }
});
prova('il risolutore delle prove G1/G2 coincide con la forza bruta sui percorsi (300 casi, tutte le persone)', () => {
  function forzaBruta(caso, pp, testi) {
    const L = AL.LUOGO[caso.luogo], v = AL.vicini(L), nS = L.stanze.length, Q = caso.Q, out = Array.from({ length: Q }, () => new Set());
    const ok_ = (t, s) => testi.every(w => w === pp || !caso.ricorda[w][t] || caso.vuoti[w][t] || ((caso.via[w][t] === s) === (caso.via[w][t] === caso.via[pp][t])));
    const giro = (t, s, perc) => {
      if (!ok_(t, s)) return;
      perc.push(s);
      if (t === Q - 1) perc.forEach((x, k) => out[k].add(x)); else for (const y of v[s].concat([s])) giro(t + 1, y, perc);
      perc.pop();
    };
    for (let s = 0; s < nS; s++) giro(0, s, []);
    return out;
  }
  for (let i = 0; i < 300; i++) {
    const caso = AL.genera(p({ modo: i % 2 ? 'coop' : 'traditore', livello: i % 3 ? 'facile' : 'medio', nomi: NOMI.slice(0, 3 + (i % 4)) }));
    const tutti = indici(caso.N);
    for (const q of tutti) {
      const testi = tutti.filter(w => w !== q && (i % 5 ? true : w % 2 === 0));
      assert.equal(J(AL.possibili(caso, q, testi).map(s => [...s].sort())), J(forzaBruta(caso, q, testi).map(s => [...s].sort())));
    }
  }
});

/* Controlli su un caso qualunque */
function controlla(caso, rr) {
  const L = AL.LUOGO[caso.luogo], v = AL.vicini(L), d = AL.distanze(L), { via, T, X, Q, N } = caso, c = caso.colpevole;
  const coop = caso.par.modo === 'coop', Lv = AL.LIVELLI[caso.par.livello], tutti = indici(N);
  const pub = AL.pubblici(caso), gi = tutti.filter(i => caso.persone[i].tipo === 'giocatore'), dich = AL.dichiarazioni(caso);
  // mondo fisico: una porta al massimo per quarto d'ora; nella scena, all'ora del delitto, solo il colpevole
  for (let i = 0; i < N; i++) for (let t = 1; t < Q; t++) assert.ok(via[i][t] === via[i][t - 1] || v[via[i][t - 1]].includes(via[i][t]), 'mossa impossibile');
  for (let i = 0; i < N; i++) assert.equal(via[i][T] === X, i === c);
  for (let t = 0; t < Q; t++) if (t !== T) assert.notEqual(via[c][t], X);
  assert.ok(caso.sospettati.includes(c) && T >= 2 && T <= Q - 3);
  // chi sono i sospettati
  if (coop) assert.ok(caso.sospettati.every(i => caso.persone[i].tipo === 'sospetto'));
  else assert.ok(caso.sospettati.every(i => caso.persone[i].tipo === 'giocatore'));
  // dichiarazioni: chi si ricorda elenca esattamente chi era con lui; rifiuti solo dei sospettati nel modo coop
  for (let i = 0; i < N; i++) for (const r of AL.diario(caso, i)) {
    if (r.rifiuta) { assert.ok(coop && caso.persone[i].tipo === 'sospetto'); assert.equal(r.stanza, null); continue; }
    assert.equal(r.stanza, via[i][r.t]);
    if (r.ricorda) assert.deepEqual(r.con, tutti.filter(j => j !== i && via[j][r.t] === via[i][r.t])); else assert.deepEqual(r.con, []);
  }
  if (coop) {
    assert.ok(caso.vuoti[c][T], 'il colpevole tace all’ora del delitto');
    const tacciono = caso.sospettati.filter(i => caso.vuoti[i][T]);
    assert.ok(tacciono.length >= 1 + Math.min(Lv.rifiuti, caso.sospettati.length - 1), 'tacciono in pochi');
    assert.deepEqual(caso.spiegazione.tacciono, tacciono);
  } else assert.ok(caso.vuoti.every(r => r.every(x => !x)), 'nel modo traditore nessuno tace');
  // con tutto quello che si sa, un colpevole solo
  assert.deepEqual(AL.candidati(caso, dich, tutti), [c]);
  // modo traditore: vale per qualunque bugia del colpevole (G2), e G1 quando c'è la trappola
  if (!coop) {
    const { G1, G2 } = AL.verifica(caso);
    assert.ok(G2, 'G2');
    if (caso.spiegazione.trappola) assert.ok(G1, 'G1 con trappola');
    for (let k = 0; k < 8; k++) { const d2 = dich.slice(); d2[c] = bugia(caso, rr); assert.deepEqual(AL.candidati(caso, d2, tutti), [c], 'una bugia ha confuso il caso'); }
    assert.ok(caso.alibi.length >= 1);
    for (const s of caso.alibi) { assert.notEqual(s, X); assert.ok([via[c][T - 1], via[c][T + 1]].every(a => a === s || v[a].includes(s))); }
  }
  // niente scorciatoie
  assert.ok(AL.candidati(caso, dich, pub).length >= 2, 'bastano i verbali pubblici');
  if (caso.par.livello !== 'facile' && (coop ? gi.length >= 2 : gi.length >= 5))
    for (const j of gi) if (j !== c) assert.ok(AL.candidati(caso, dich, pub.concat([j])).filter(x => x !== j).length >= 2, 'un giocatore ci arriva da solo');
  // la spiegazione dice il vero, ragione per ragione, e usa solo testimoni ammessi
  const sp = caso.spiegazione;
  assert.equal(sp.innocenti.length, caso.sospettati.length - 1);
  const vista = (w, q, t) => w === q ? (coop && !caso.vuoti[q][t]) : (!caso.vuoti[w][t] && caso.ricorda[w][t] && via[w][t] === via[q][t]);
  for (const x of sp.innocenti) {
    assert.notEqual(x.p, c);
    if (!coop) assert.ok(x.teste !== c && x.teste !== x.p, 'nel modo traditore la ragione non usa né l’innocente né il colpevole');
    if (x.tipo === 'dice') { assert.ok(coop && x.teste === x.p && !caso.vuoti[x.p][T]); assert.equal(via[x.p][T], x.stanza); continue; }
    const t = x.tipo === 'con' ? T : x.t;
    assert.equal(via[x.p][t], x.stanza); assert.ok(vista(x.teste, x.p, t), 'testimone falso');
    if (x.tipo === 'prima') { assert.ok(t < T); assert.equal(x.dist, d[x.stanza][X]); assert.ok(x.dist > T - t); }
    if (x.tipo === 'dopo') { assert.ok(t > T); assert.equal(x.dist, d[X][x.stanza]); assert.ok(x.dist > t - T); }
  }
  if (sp.trappola) {
    assert.ok(!coop);
    for (const e of sp.trappola.esclusi) { assert.notEqual(e.teste, c); assert.equal(via[e.teste][T], e.stanza); assert.ok(caso.ricorda[e.teste][T]); }
    assert.deepEqual(sp.trappola.candidate.filter(s => s !== X), sp.trappola.esclusi.map(e => e.stanza));
  }
  for (const k of [sp.prima, sp.dopo]) if (k) { assert.equal(via[c][k.t], k.stanza); assert.ok(vista(k.teste, c, k.t)); }
  // nomi: nessun personaggio col primo nome di un giocatore
  const primi = new Set(caso.par.nomi.map(x => x.split(' ')[0].toLowerCase()));
  caso.persone.filter(q => q.tipo !== 'giocatore').forEach(q => assert.ok(!primi.has(q.nome.split(' ')[0].toLowerCase())));
  const sol = AL.soluzione(caso);
  assert.ok(sol.length >= 2 && sol.every(x => x.testo && !/undefined|null|NaN/.test(x.testo)));
  assert.ok(AL.testoDelitto(caso).includes(AL.ora(T)));
}
prova('3.000 casi (due modi, tre livelli, da 1 a 8 giocatori, quattro luoghi): tutte le garanzie', () => {
  const tent = {}, rr = AL.prng('controlli');
  let trappole = 0, trad = 0;
  for (let i = 0; i < 3000; i++) {
    const modo = i % 2 ? 'coop' : 'traditore', livello = ['facile', 'medio', 'difficile'][Math.floor(i / 2) % 3];
    const n = modo === 'coop' ? 1 + (i % 8) : 3 + (i % 6);
    const caso = AL.genera(p({ modo, livello, nomi: NOMI.slice(0, n), luogo: AL.LUOGHI[i % 4].id }));
    controlla(caso, rr);
    (tent[modo + ' ' + livello] = tent[modo + ' ' + livello] || []).push(caso.tentativi);
    if (modo === 'traditore') { trad++; if (caso.spiegazione.trappola) trappole++; }
  }
  for (const k in tent) { const a = tent[k].sort((x, y) => x - y); console.log(`     ${k}: tentativi mediana ${a[a.length >> 1]}, 99° percentile ${a[Math.floor(a.length * 0.99)]}`); }
  console.log(`     modo traditore: alibi del colpevole smentibile direttamente nel ${Math.round(100 * trappole / trad)}% dei casi (negli altri si arriva per eliminazione)`);
});
prova('luoghi: porte solo tra stanze che si toccano, grafo connesso, nomi e sigle delle stanze unici', () => {
  for (const L of AL.LUOGHI) {
    const d = AL.distanze(L);
    assert.ok(d.every(r => r.every(x => x < Infinity)), L.id + ' connesso');
    assert.equal(new Set(L.stanze.map(s => s.nome)).size, L.stanze.length);
    assert.equal(new Set(L.stanze.map(s => s.sigla)).size, L.stanze.length);
    for (const [a, b] of L.porte) {
      const A = L.stanze[a], B = L.stanze[b];
      const vert = (A.x + A.w === B.x || B.x + B.w === A.x) && Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) >= 20;
      const oriz = (A.y + A.h === B.y || B.y + B.h === A.y) && Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) >= 20;
      assert.ok(vert || oriz || L.forma === 'treno', `${L.id}: ${A.nome}–${B.nome} non si toccano`);
    }
  }
});

console.log(`\n${ok} prove superate`);
