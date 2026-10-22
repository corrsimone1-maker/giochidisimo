// Prove del motore di 7 Wonders: Secret Societies (giochi/societa/motore.js), senza browser.
// Uso, dalla cartella della repo:  node prove/societa.test.js
// Coprono generazione (società, decreti, spareggi), fasi, validazioni, elezione (Sigillo, Pietra,
// veto, parità), matrice dei Patti, Patrocinio, Agente Libero, decreti, scommesse, poteri, missioni,
// privacy (lo schermo condiviso non dipende dalle scelte segrete), annullamenti e partite casuali.
'use strict';
const assert = require('assert');
const path = require('path');
const SS = require(path.join(__dirname, '..', 'giochi', 'societa', 'motore.js'));
const rand = SS.randIntCrypto;
let ok = 0; const prova = (nome, f) => { f(); ok++; console.log('ok  ', nome); };
const errore = (f, re) => assert.throws(f, e => e instanceof SS.ErroreGioco && (!re || re.test(e.message)), 'doveva fallire' + (re ? ' con ' + re : ''));
function prng(seed) { let s = seed >>> 0; return n => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n); }; }
const J = x => JSON.stringify(x);

const NOMI = ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena', 'Fabio', 'Gaia', 'Ivo'];
const SOC5 = ['araldi', 'oro', 'astrolabio', 'pietra', 'lame'];
/* Partita fissa: decreti e spareggi noti, società scelte a mano */
const partita = (cfg = {}, n = 5, soc = SOC5) => {
  const c = SS.configura(cfg);
  return { v: 1, id: 'prova', cfg: c, nomi: NOMI.slice(0, n), soc: c.societa ? soc.slice(0, n) : null,
    decreti: { 2: ['rinascimento', 'culto', 'popoli'], 3: ['mecenatismo', 'mobilitazione', 'gilde'] },
    spareggio: { 2: [0, 1, 2], 3: [2, 1, 0] }, eventi: [] };
};
const S = P => SS.stato(P);
const A = (P, ev) => SS.applica(P, ev);
const seq = (P, evs) => evs.reduce(A, P);
const V2 = 'col:v:2', B2 = 'col:b:2', R2 = 'col:r:2', G2 = 'col:g:2', ST2 = 'stadi:2';
/* Riempie la cabina: per ogni giocatore (in ordine) una scheda di base modificata da extra[g] */
function cabina(P, extra = {}) {
  let St = S(P);
  while (St.sub === 'cabina') {
    const g = SS.prossimoInCabina(St), op = SS.opzioniScheda(St, g);
    const sch = Object.assign({ t: 'scheda', g, voto: op.decreti[0], sigillo: false, intento: op.patto ? 'L' : null, scommessa: null, potere: null }, extra[g] || {});
    P = A(P, sch); St = S(P);
  }
  return P;
}
/* Dal Conclave al momento della verifica dell'Era */
const finoAllaVerifica = (P, rel = [], extra = {}) => { P = seq(P, rel.concat([{ t: 'urne' }])); P = cabina(P, extra); return seq(P, [{ t: 'apriEra' }, { t: 'fineEra' }]); };
const r = (...coppie) => Object.fromEntries(coppie.map(k => [k, true]));
const righe = (St, k, g, fonte) => St.risultati[k].righe.filter(x => x.g === g && (!fonte || x.fonte === fonte));
const pt = (St, k, g, fonte) => righe(St, k, g, fonte).reduce((a, x) => a + x.p, 0);

/* ======================= Generazione ======================= */
prova('nuova partita: da 3 a 8 giocatori, nomi unici e non vuoti', () => {
  errore(() => SS.nuovaPartita({ nomi: ['A', 'B'] }, rand), /da 3 a 8/);
  errore(() => SS.nuovaPartita({ nomi: NOMI.concat(['Zoe']) }, rand), /da 3 a 8/);
  errore(() => SS.nuovaPartita({ nomi: ['Ada', 'ada', 'Bruno'] }, rand), /stesso nome/);
  errore(() => SS.nuovaPartita({ nomi: ['Ada', ' ', 'Bruno'] }, rand), /nome/);
  const P = SS.nuovaPartita({ nomi: ['  Ada  Rossi ', 'Bruno', 'Chiara'] }, rand);
  assert.equal(P.nomi[0], 'Ada Rossi');
  assert.equal(S(P).fase, 'era'); assert.equal(S(P).era, 1);
});
prova('generazione: società tutte diverse, Velo solo con le scommesse, decreti uno per famiglia e mai ripetuti (20.000 partite)', () => {
  const cont = {};
  for (let i = 0; i < 20000; i++) {
    const n = 3 + (i % 6), scommesse = i % 3 !== 0;
    const P = SS.nuovaPartita({ nomi: NOMI.slice(0, n), cfg: { scommesse } }, rand);
    assert.equal(P.soc.length, n); assert.equal(new Set(P.soc).size, n);
    if (!scommesse) assert.ok(!P.soc.includes('velo'));
    if (scommesse && n === 8) P.soc.forEach(s => { cont[s] = (cont[s] || 0) + 1; });
    for (const c of [2, 3]) {
      const d = P.decreti[c].map(id => SS.DEC[id]);
      assert.deepEqual(d.map(x => x.fam), ['A', 'B', 'C']);
      d.forEach(x => assert.ok(x.ere.includes(c), x.id + ' non vale nell’Era ' + c));
      assert.deepEqual(P.spareggio[c].slice().sort(), [0, 1, 2]);
    }
    assert.equal(new Set(P.decreti[2].concat(P.decreti[3])).size, 6);
  }
  // con 8 giocatori e 9 società ognuna esce 8/9 delle volte
  const tot = Object.values(cont).reduce((a, b) => a + b, 0) / 8;
  for (const s of SS.SOCIETA) assert.ok(Math.abs(cont[s.id] / tot - 8 / 9) < 0.05, s.id + ' ' + cont[s.id] / tot);
});
prova('generazione: senza società niente missioni e niente fase delle missioni', () => {
  const P = SS.nuovaPartita({ nomi: NOMI.slice(0, 4), cfg: { societa: false } }, rand);
  assert.equal(P.soc, null);
  let Q = seq(P, [{ t: 'fineEra' }]); Q = finoAllaVerifica(Q); Q = A(Q, { t: 'verifica', r: {} });
  Q = finoAllaVerifica(Q); Q = A(Q, { t: 'verifica', r: {} });
  assert.equal(S(Q).fase, 'finita');
});
prova('ogni requisito usato ha un testo al presente e al passato', () => {
  const tutti = new Set(SS.DECRETI.map(d => d.req).concat(SS.SCOMMESSE, SS.obblighi(SS.configura({ soglia: 1 })), SS.obblighi(SS.configura({ soglia: 3 })), ['colori:3']));
  for (const a of tutti) {
    if (a !== 'rel') assert.ok(SS.requisitoValido(a), a);
    assert.ok(SS.requisito(a) !== a && SS.requisito(a, true) !== a && SS.breve(a) !== a, a);
  }
  assert.ok(!SS.requisitoValido('col:x:2') && !SS.requisitoValido('stadi:9') && !SS.requisitoValido(3));
});

/* ======================= Fasi e validazioni ======================= */
prova('fasi: Era I → Conclave II (mercato, cabina, esito) → Era II → verifica → Conclave III → … → missioni → fine', () => {
  let P = partita();
  assert.equal(S(P).fase, 'era');
  errore(() => A(P, { t: 'urne' }), /Mercato/);
  P = A(P, { t: 'fineEra' });
  let St = S(P); assert.equal(St.fase, 'conclave'); assert.equal(St.c, 2); assert.equal(St.sub, 'mercato');
  errore(() => A(P, { t: 'apriEra' }), /chiuso/);
  P = A(P, { t: 'urne' }); St = S(P);
  assert.deepEqual(St.conclavi[2].ordine, [0, 1, 2, 3, 4], 'il Conclave II comincia dal primo, poi a destra');
  P = cabina(P); St = S(P); assert.equal(St.sub, 'esito');
  P = A(P, { t: 'apriEra' }); St = S(P); assert.equal(St.fase, 'era'); assert.equal(St.era, 2);
  P = A(P, { t: 'fineEra' }); assert.equal(S(P).fase, 'verifica');
  P = A(P, { t: 'verifica', r: {} }); St = S(P); assert.equal(St.fase, 'conclave'); assert.equal(St.c, 3);
  P = A(P, { t: 'urne' }); assert.deepEqual(S(P).conclavi[3].ordine, [4, 0, 1, 2, 3], 'il Conclave III comincia dall’ultimo');
  P = cabina(P); P = seq(P, [{ t: 'apriEra' }, { t: 'fineEra' }, { t: 'verifica', r: {} }]);
  assert.equal(S(P).fase, 'missioni');
  P = A(P, { t: 'missioni', r: {} }); assert.equal(S(P).fase, 'finita');
  errore(() => A(P, { t: 'fineEra' }), /Era/);
});
prova('relazioni: una per persona, mai con sé stessi, obblighi del menu, Patrocinio solo se acceso', () => {
  let P = A(partita(), { t: 'fineEra' });
  errore(() => A(P, { t: 'relazione', tipo: 'patto', a: 0, b: 0, oa: V2, ob: V2 }), /diversi/);
  errore(() => A(P, { t: 'relazione', tipo: 'patto', a: 0, b: 9, oa: V2, ob: V2 }), /diversi/);
  errore(() => A(P, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: 'col:v:1', ob: V2 }), /Obbligo/);
  errore(() => A(P, { t: 'relazione', tipo: 'alleanza', a: 0, b: 1 }), /sconosciuto/);
  P = A(P, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: R2 });
  errore(() => A(P, { t: 'relazione', tipo: 'patrocinio', a: 1, b: 2, ob: B2 }), /una sola/);
  errore(() => A(P, { t: 'relazione', tipo: 'patrocinio', a: 3, b: 0, ob: B2 }), /una sola/);
  P = A(P, { t: 'relazione', tipo: 'patrocinio', a: 2, b: 3, ob: ST2 });
  assert.equal(S(P).conclavi[2].relazioni.length, 2);
  const Q = A(partita({ patrocinio: false }), { t: 'fineEra' });
  errore(() => A(Q, { t: 'relazione', tipo: 'patrocinio', a: 2, b: 3, ob: ST2 }), /spento/);
  // la soglia cambia il menu
  const T = A(partita({ soglia: 1 }), { t: 'fineEra' });
  assert.doesNotThrow(() => A(T, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: 'col:v:1', ob: 'stadi:1' }));
  errore(() => A(T, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: V2 }), /Obbligo/);
});
prova('cabina: ordine, voto valido, intenzione solo nei Patti, Sigillo una volta per partita', () => {
  let P = seq(partita(), [{ t: 'fineEra' }, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: V2 }, { t: 'urne' }]);
  errore(() => A(P, { t: 'scheda', g: 1, voto: 'culto', intento: 'L' }), /turno/);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'tregua', intento: 'L' }), /tre decreti/);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'culto' }), /Leale o Traditore/);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'culto', intento: 'X' }), /Leale o Traditore/);
  P = A(P, { t: 'scheda', g: 0, voto: 'culto', intento: 'T', sigillo: true });
  P = A(P, { t: 'scheda', g: 1, voto: 'culto', intento: 'L' });
  errore(() => A(P, { t: 'scheda', g: 2, voto: 'culto', intento: 'L' }), /solo in un Patto/);
  P = cabina(P); P = seq(P, [{ t: 'apriEra' }, { t: 'fineEra' }, { t: 'verifica', r: {} }, { t: 'urne' }]);
  // Conclave III: comincia Elena (4), poi Ada (0) che ha già usato il Sigillo
  P = A(P, { t: 'scheda', g: 4, voto: 'gilde', sigillo: true });
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'gilde', sigillo: true }), /già stato usato/);
  assert.equal(SS.opzioniScheda(S(P), 0).sigillo, false);
  assert.equal(SS.opzioniScheda(S(P), 1).sigillo, true);
});
prova('scommesse: mai su sé stessi né sul proprio partner, solo tipi del menu, solo se accese', () => {
  let P = seq(partita(), [{ t: 'fineEra' }, { t: 'relazione', tipo: 'patrocinio', a: 0, b: 1, ob: V2 }, { t: 'urne' }]);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'culto', scommessa: { b: 0, a: V2 } }), /te stesso/);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'culto', scommessa: { b: 1, a: V2 } }), /relazione/);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'culto', scommessa: { b: 2, a: 'col:v:1' } }), /non valida/);
  assert.deepEqual(SS.opzioniScheda(S(P), 0).scommessa.bersagli, [2, 3, 4]);
  assert.doesNotThrow(() => A(P, { t: 'scheda', g: 0, voto: 'culto', scommessa: { b: 2, a: 'vinci' } }));
  let Q = seq(partita({ scommesse: false }), [{ t: 'fineEra' }, { t: 'urne' }]);
  errore(() => A(Q, { t: 'scheda', g: 0, voto: 'culto', scommessa: { b: 2, a: V2 } }), /spente/);
  assert.equal(SS.opzioniScheda(S(Q), 0).scommessa, null);
});
prova('poteri: solo il proprio, una volta per partita, con le loro condizioni', () => {
  // Ada araldi, Bruno oro, Chiara astrolabio, Diego pietra, Elena lame
  let P = seq(partita(), [{ t: 'fineEra' }, { t: 'relazione', tipo: 'patto', a: 3, b: 4, oa: V2, ob: V2 }, { t: 'urne' }]);
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'culto', potere: { id: 'veto', decreto: 'culto' } }), /non è della tua/);
  P = A(P, { t: 'scheda', g: 0, voto: 'culto', potere: { id: 'proclama' } });
  errore(() => A(P, { t: 'scheda', g: 1, voto: 'culto', potere: { id: 'assicurazione' } }), /in un Patto/);
  assert.equal(SS.opzioniScheda(S(P), 1).potere.ok, false);
  P = A(P, { t: 'scheda', g: 1, voto: 'culto' });
  errore(() => A(P, { t: 'scheda', g: 2, voto: 'culto', potere: { id: 'cannocchiale', bersaglio: 0 } }), /Cannocchiale/);
  assert.deepEqual(SS.opzioniScheda(S(P), 2).potere.bersagli, [3, 4]);
  P = A(P, { t: 'scheda', g: 2, voto: 'culto', potere: { id: 'cannocchiale', bersaglio: 4 } });
  P = A(P, { t: 'scheda', g: 3, voto: 'culto', intento: 'L', potere: { id: 'voto' } });
  errore(() => A(P, { t: 'scheda', g: 4, voto: 'culto', intento: 'T', potere: { id: 'veto', decreto: 'tregua' } }), /tre decreti/);
  P = A(P, { t: 'scheda', g: 4, voto: 'culto', intento: 'T' });
  assert.deepEqual(S(P).potere, [true, false, true, true, false]);
  assert.deepEqual(SS.cannocchiale(S(P), 2), { chi: 2, bersaglio: 4, intento: 'T' });
  P = seq(P, [{ t: 'apriEra' }, { t: 'fineEra' }, { t: 'verifica', r: {} }, { t: 'urne' }]);
  P = A(P, { t: 'scheda', g: 4, voto: 'gilde', potere: { id: 'veto', decreto: 'gilde' } });
  errore(() => A(P, { t: 'scheda', g: 0, voto: 'gilde', potere: { id: 'proclama' } }), /già stato usato/);
  assert.equal(SS.opzioniScheda(S(P), 0).potere, null);
  // il Velo si dichiara solo con una scommessa
  let Q = seq(partita({}, 3, ['velo', 'oro', 'lame']), [{ t: 'fineEra' }, { t: 'urne' }]);
  errore(() => A(Q, { t: 'scheda', g: 0, voto: 'culto', potere: { id: 'velo' } }), /insieme a una scommessa/);
  assert.doesNotThrow(() => A(Q, { t: 'scheda', g: 0, voto: 'culto', scommessa: { b: 1, a: V2 }, potere: { id: 'velo' } }));
});

/* ======================= Elezione ======================= */
const vota = (voti, extra = {}) => { // voti[g] = indice del decreto (0,1,2) nel Conclave II
  let P = seq(partita(), [{ t: 'fineEra' }, { t: 'urne' }]);
  const dec = S(P).conclavi[2].decreti, e = {};
  voti.forEach((i, g) => { e[g] = Object.assign({ voto: dec[i] }, extra[g] || {}); });
  return S(cabina(P, e)).conclavi[2].elezione;
};
prova('elezione: maggioranza, Sigillo e Voce della Pietra valgono +1, parità allo spareggio sorteggiato', () => {
  assert.equal(vota([0, 1, 1, 2, 0]).eletto, 'rinascimento', '2-2-1: spareggio [0,1,2] → il primo');
  assert.deepEqual(vota([0, 1, 1, 2, 0]).voti, [2, 2, 1]);
  assert.equal(vota([0, 1, 1, 2, 2]).eletto, 'culto', '1-2-2: tra culto e popoli vince culto (prima nello spareggio)');
  assert.equal(vota([0, 1, 1, 2, 0], { 1: { sigillo: true } }).eletto, 'culto', 'il Sigillo rompe la parità');
  assert.equal(vota([0, 0, 1, 1, 2], { 3: { potere: { id: 'voto' } } }).eletto, 'culto', 'la Pietra (Diego) vale +1');
  assert.deepEqual(vota([0, 0, 1, 1, 2], { 3: { potere: { id: 'voto' }, sigillo: true } }).voti, [2, 4, 1], 'Pietra e Sigillo si sommano');
  assert.ok(vota([0, 0, 1, 1, 2]).parita && !vota([0, 0, 0, 1, 2]).parita);
});
prova('elezione: il veto scarta il decreto che avrebbe vinto e passa il secondo; se non colpisce, non succede niente', () => {
  const v = vota([0, 0, 0, 1, 2], { 4: { potere: { id: 'veto', decreto: 'rinascimento' } } });
  assert.equal(v.eletto, 'culto'); assert.deepEqual(v.veto, { chi: 4, vetato: 'rinascimento' });
  const w = vota([0, 0, 0, 1, 2], { 4: { potere: { id: 'veto', decreto: 'popoli' } } });
  assert.equal(w.eletto, 'rinascimento'); assert.equal(w.veto, null);
  // parità per il secondo posto: decide lo spareggio
  assert.equal(vota([0, 0, 1, 2, 0], { 4: { potere: { id: 'veto', decreto: 'rinascimento' } } }).eletto, 'culto');
});

/* ======================= Patti ======================= */
/* Patto tra Ada (0) e Bruno (1); risposte: ca, cb = obblighi completati */
function patto(ia, ib, ca, cb, cfg = {}, extra = {}) {
  let P = A(partita(cfg), { t: 'fineEra' });
  P = finoAllaVerifica(P, [{ t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: SS.obblighi(SS.configura(cfg))[0], ob: SS.obblighi(SS.configura(cfg))[2] }],
    Object.assign({ 0: { intento: ia }, 1: { intento: ib } }, extra));
  const oa = SS.obblighi(SS.configura(cfg))[0], ob = SS.obblighi(SS.configura(cfg))[2];
  const risp = {}; if (ca) risp['0|' + oa] = true; if (cb) risp['1|' + ob] = true;
  const St = S(A(P, { t: 'verifica', r: risp }));
  return [pt(St, 2, 0, 'patto'), pt(St, 2, 1, 'patto'), St];
}
prova('patto (v0.2): L/L riuscito +4/+4, L/L mancato 0/0, tradito −1, traditore +2 solo se il leale completa, doppio tradimento −1/−1', () => {
  assert.deepEqual(patto('L', 'L', 1, 1).slice(0, 2), [4, 4]);
  assert.deepEqual(patto('L', 'L', 1, 0).slice(0, 2), [0, 0]);
  assert.deepEqual(patto('L', 'L', 0, 0).slice(0, 2), [0, 0]);
  assert.deepEqual(patto('L', 'T', 1, 0).slice(0, 2), [-1, 2]);
  assert.deepEqual(patto('L', 'T', 1, 1).slice(0, 2), [-1, 2], 'il traditore non deve completare');
  assert.deepEqual(patto('L', 'T', 0, 1).slice(0, 2), [-1, 0], 'il leale che non completa nega il premio al traditore');
  assert.deepEqual(patto('T', 'L', 0, 1).slice(0, 2), [2, -1]);
  assert.deepEqual(patto('T', 'T', 1, 1).slice(0, 2), [-1, -1]);
  assert.deepEqual(patto('T', 'T', 0, 0).slice(0, 2), [-1, -1]);
});
prova('patto (proposta originale): +3/+3, tradito 0, soglia 1', () => {
  const o = { soglia: 1, pattoLL: 3, tradito: 0 };
  assert.deepEqual(patto('L', 'L', 1, 1, o).slice(0, 2), [3, 3]);
  assert.deepEqual(patto('L', 'T', 1, 0, o).slice(0, 2), [0, 2]);
  assert.deepEqual(patto('T', 'T', 1, 1, o).slice(0, 2), [-1, -1]);
});
prova('patto: Assicurazione (+1 al leale tradito) e Benedizione (+1 a entrambi solo se riesce)', () => {
  // Bruno è dell'Oro: assicura il patto
  assert.deepEqual(patto('T', 'L', 0, 1, {}, { 1: { intento: 'L', potere: { id: 'assicurazione' } } }).slice(0, 2), [2, 1]);
  assert.deepEqual(patto('T', 'T', 0, 1, {}, { 1: { intento: 'T', potere: { id: 'assicurazione' } } }).slice(0, 2), [-1, -1], 'non copre chi tradisce');
  const conc = ['concordia', 'oro', 'lame', 'pietra', 'araldi'];
  const conBen = (ca, cb, ib = 'L') => {
    let P = A(partita({}, 5, conc), { t: 'fineEra' });
    P = finoAllaVerifica(P, [{ t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: R2 }], { 0: { intento: 'L', potere: { id: 'benedizione' } }, 1: { intento: ib } });
    const St = S(A(P, { t: 'verifica', r: Object.assign(ca ? r('0|' + V2) : {}, cb ? r('1|' + R2) : {}) }));
    return [pt(St, 2, 0, 'patto') + pt(St, 2, 0, 'potere'), pt(St, 2, 1, 'patto') + pt(St, 2, 1, 'potere')];
  };
  assert.deepEqual(conBen(1, 1), [5, 5]);
  assert.deepEqual(conBen(1, 0), [0, 0]);
  assert.deepEqual(conBen(1, 1, 'T'), [-1, 2]);
});

/* ======================= Patrocinio, Agente Libero, decreti, scommesse ======================= */
prova('patrocinio: +3 al patrono e +1 al beneficiario se l’obiettivo riesce, altrimenti 0; conta per Patto tra Popoli', () => {
  let P = A(partita(), { t: 'fineEra' });
  P = finoAllaVerifica(P, [{ t: 'relazione', tipo: 'patrocinio', a: 0, b: 1, ob: B2 }], { 0: { voto: 'popoli' }, 1: { voto: 'popoli' }, 2: { voto: 'popoli' } });
  let St = S(P); assert.equal(St.conclavi[2].elezione.eletto, 'popoli');
  const si = S(A(P, { t: 'verifica', r: r('1|' + B2) })), no_ = S(A(P, { t: 'verifica', r: {} }));
  assert.deepEqual([pt(si, 2, 0, 'patrocinio'), pt(si, 2, 1, 'patrocinio')], [3, 1]);
  assert.deepEqual([pt(si, 2, 0, 'decreto'), pt(si, 2, 1, 'decreto'), pt(si, 2, 2, 'decreto')], [2, 2, 0], 'Patto tra Popoli premia le relazioni riuscite');
  assert.deepEqual([pt(no_, 2, 0, 'patrocinio'), pt(no_, 2, 1, 'patrocinio'), pt(no_, 2, 0, 'decreto')], [0, 0, 0]);
});
prova('agente libero: chi non ha relazioni prende +1 con carte di almeno 3 colori', () => {
  let P = A(partita(), { t: 'fineEra' });
  P = finoAllaVerifica(P, [{ t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: V2 }]);
  const q = SS.domande(S(P), 2).filter(x => x.a === 'colori:3').map(x => x.g);
  assert.deepEqual(q, [2, 3, 4]);
  const St = S(A(P, { t: 'verifica', r: r('2|colori:3', '4|colori:3') }));
  assert.deepEqual([2, 3, 4].map(g => pt(St, 2, g, 'agente')), [1, 0, 1]);
  assert.equal(righe(St, 2, 0, 'agente').length, 0);
});
prova('decreto: +2 a chiunque lo soddisfi, anche a chi ha votato contro; Privilegio raddoppia; Proclama +2 a chi lo ha votato', () => {
  const soc = ['araldi', 'loggia', 'oro', 'pietra', 'lame'];
  let P = A(partita({}, 5, soc), { t: 'fineEra' });
  P = finoAllaVerifica(P, [], { 0: { voto: 'culto', potere: { id: 'proclama' } }, 1: { voto: 'rinascimento', potere: { id: 'privilegio' } }, 2: { voto: 'culto' }, 3: { voto: 'culto' } });
  assert.equal(S(P).conclavi[2].elezione.eletto, 'culto');
  const St = S(A(P, { t: 'verifica', r: r('1|stadi:1', '2|stadi:1') }));
  assert.deepEqual([0, 1, 2, 3, 4].map(g => pt(St, 2, g, 'decreto')), [0, 2, 2, 0, 0]);
  assert.equal(pt(St, 2, 1, 'potere'), 2, 'Privilegio: il decreto vale doppio');
  assert.equal(pt(St, 2, 0, 'potere'), 2, 'Proclama: ha votato il decreto eletto');
});
prova('scommesse: +3 se vinta, −1 se persa, 0 col Velo', () => {
  const soc = ['velo', 'oro', 'lame', 'pietra', 'araldi'];
  let P = A(partita({}, 5, soc), { t: 'fineEra' });
  P = finoAllaVerifica(P, [], { 0: { scommessa: { b: 2, a: R2 }, potere: { id: 'velo' } }, 1: { scommessa: { b: 2, a: R2 } }, 2: { scommessa: { b: 3, a: 'vinci' } } });
  const St = S(A(P, { t: 'verifica', r: r('3|vinci') }));
  assert.deepEqual([0, 1, 2].map(g => pt(St, 2, g, 'scommessa')), [0, -1, 3]);
  assert.equal(SS.domande(S(P), 2).filter(x => x.key === '2|' + R2).length, 1, 'domande senza doppioni');
});
prova('domande: non dipendono da intenzioni né poteri (si chiedono anche gli obblighi dei traditori)', () => {
  const base = A(partita(), { t: 'fineEra' });
  const rel = [{ t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: G2 }, { t: 'relazione', tipo: 'patrocinio', a: 2, b: 3, ob: ST2 }];
  const d1 = SS.domande(S(finoAllaVerifica(base, rel, { 0: { intento: 'L' }, 1: { intento: 'L' } })), 2);
  const d2 = SS.domande(S(finoAllaVerifica(base, rel, { 0: { intento: 'T' }, 1: { intento: 'T' }, 2: { potere: { id: 'cannocchiale', bersaglio: 1 } } })), 2);
  assert.equal(J(d1), J(d2));
  assert.ok(d1.some(x => x.key === '0|' + V2) && d1.some(x => x.key === '1|' + G2) && d1.some(x => x.key === '3|' + ST2));
});

/* ======================= Missioni ======================= */
prova('missione del Velo: almeno una scommessa vinta e nessuna persa (anche coperta dal Velo)', () => {
  const soc = ['velo', 'oro', 'lame', 'pietra', 'araldi'];
  const gioca = (sc2, ok2, sc3, ok3, velo3) => {
    let P = A(partita({}, 5, soc), { t: 'fineEra' });
    P = finoAllaVerifica(P, [], sc2 ? { 0: { scommessa: { b: 1, a: R2 } } } : {});
    P = A(P, { t: 'verifica', r: ok2 ? r('1|' + R2) : {} });
    P = finoAllaVerifica(P, [], sc3 ? { 0: Object.assign({ scommessa: { b: 2, a: B2 } }, velo3 ? { potere: { id: 'velo' } } : {}) } : {});
    P = A(P, { t: 'verifica', r: ok3 ? r('2|' + B2) : {} });
    return S(A(P, { t: 'missioni', r: {} })).missioni[0];
  };
  assert.equal(gioca(true, true, true, true), true, 'due vinte');
  assert.equal(gioca(true, true, false), true, 'una vinta, l’altra non fatta');
  assert.equal(gioca(false, false, true, true), true);
  assert.equal(gioca(true, true, true, false), false, 'una persa');
  assert.equal(gioca(true, true, true, false, true), false, 'persa ma coperta dal Velo: conta come persa');
  assert.equal(gioca(false, false, false), false, 'nessuna scommessa');
});
prova('missioni: Concordia (due relazioni riuscite con persone diverse), Araldi (eletto due volte), Velo, le altre dal tavolo', () => {
  const soc = ['concordia', 'araldi', 'velo', 'pietra', 'lame'];
  let P = A(partita({}, 5, soc), { t: 'fineEra' });
  P = finoAllaVerifica(P, [{ t: 'relazione', tipo: 'patto', a: 0, b: 3, oa: V2, ob: V2 }], { 1: { voto: 'culto' }, 2: { voto: 'culto', scommessa: { b: 4, a: R2 } }, 4: { voto: 'culto' } });
  P = A(P, { t: 'verifica', r: r('0|' + V2, '3|' + V2, '4|' + R2) });
  P = finoAllaVerifica(P, [{ t: 'relazione', tipo: 'patrocinio', a: 4, b: 0, ob: B2 }], { 1: { voto: 'mobilitazione' }, 2: { voto: 'mobilitazione', scommessa: { b: 1, a: 'vinci' } }, 3: { voto: 'mobilitazione' } });
  P = A(P, { t: 'verifica', r: r('0|' + B2, '1|vinci') });
  assert.deepEqual(SS.domandeMissioni(S(P)).map(x => x.g), [3, 4]);
  const St = S(A(P, { t: 'missioni', r: { 3: true, 0: false, 1: false } }));
  assert.deepEqual(St.missioni, [true, true, true, true, false]);
  const F = SS.finale(St);
  const ada = F.find(x => x.g === 0);
  assert.equal(ada.punti, ada.voci.reduce((a, x) => a + x.p, 0));
  assert.ok(ada.voci.some(x => x.fonte === 'missione' && x.p === 4));
});

/* ======================= Privacy ======================= */
prova('privacy: lo schermo condiviso non cambia con voti, intenzioni, scommesse e poteri finché non si svela', () => {
  const base = seq(partita(), [{ t: 'fineEra' }, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: R2 }, { t: 'urne' }]);
  const pub = P => { const v = SS.vistaPubblica(S(P)); return J(v); };
  // durante la cabina: due mondi con scelte diverse, stessa vista
  const m1 = A(base, { t: 'scheda', g: 0, voto: 'rinascimento', intento: 'L', sigillo: true, potere: { id: 'proclama' } });
  const m2 = A(base, { t: 'scheda', g: 0, voto: 'popoli', intento: 'T', scommessa: { b: 3, a: 'vinci' } });
  assert.equal(pub(m1), pub(m2));
  // a urne chiuse: stesso decreto eletto, scelte segrete diverse → stessa vista, anche durante l'Era
  const w1 = cabina(base, { 0: { voto: 'culto', intento: 'L' }, 1: { voto: 'culto', intento: 'L' }, 2: { voto: 'culto', potere: { id: 'cannocchiale', bersaglio: 0 } } });
  const w2 = cabina(base, { 0: { voto: 'culto', intento: 'T', sigillo: true }, 1: { voto: 'rinascimento', intento: 'T', potere: { id: 'assicurazione' } }, 2: { voto: 'culto', scommessa: { b: 4, a: G2 } }, 3: { voto: 'culto' } });
  assert.equal(SS.vistaPubblica(S(w1)).conclave.eletto, 'culto');
  assert.equal(pub(w1), pub(w2));
  assert.equal(pub(A(w1, { t: 'apriEra' })), pub(A(w2, { t: 'apriEra' })));
  assert.equal(pub(seq(w1, [{ t: 'apriEra' }, { t: 'fineEra' }])), pub(seq(w2, [{ t: 'apriEra' }, { t: 'fineEra' }])));
  // le società non compaiono prima della fine
  const v = SS.vistaPubblica(S(w1)); assert.equal(v.socSvelate, null); assert.ok(!J(v).includes('astrolabio'));
});
prova('privacy: la vista privata di g contiene solo la sua società e le sue schede', () => {
  const P = cabina(seq(partita(), [{ t: 'fineEra' }, { t: 'urne' }]), { 1: { voto: 'popoli', sigillo: true } });
  const v = SS.vistaPrivata(S(P), 1);
  assert.equal(v.societa.id, 'oro'); assert.equal(v.sigilloUsato, true);
  assert.equal(v.schede.length, 1); assert.equal(v.schede[0].voto, 'popoli');
  assert.ok(!J(v).includes('araldi') && !J(v).includes('astrolabio'));
});

/* ======================= Annullamenti e salvataggio ======================= */
prova('annulla: le azioni pubbliche sì, le schede sigillate no', () => {
  let P = A(partita(), { t: 'fineEra' });
  assert.ok(SS.puoAnnullare(P));
  P = A(P, { t: 'relazione', tipo: 'patto', a: 0, b: 1, oa: V2, ob: V2 });
  assert.equal(S(SS.annulla(P)).conclavi[2].relazioni.length, 0);
  P = A(P, { t: 'urne' }); assert.ok(SS.puoAnnullare(P));
  P = A(P, { t: 'scheda', g: 0, voto: 'culto', intento: 'L' });
  assert.ok(!SS.puoAnnullare(P)); errore(() => SS.annulla(P), /non si può/);
  P = cabina(P); P = seq(P, [{ t: 'apriEra' }, { t: 'fineEra' }]);
  const Q = A(P, { t: 'verifica', r: r('0|' + V2, '1|' + V2) });
  assert.equal(S(Q).punti[0], 6, 'Patto +4 e Rinascimento (2 verdi) +2');
  const R = SS.annulla(Q); assert.equal(S(R).fase, 'verifica'); assert.deepEqual(S(R).punti, [0, 0, 0, 0, 0]);
});
prova('verifica: le risposte che non corrispondono a una domanda si ignorano', () => {
  let P = finoAllaVerifica(A(partita(), { t: 'fineEra' }));
  const St = S(A(P, { t: 'verifica', r: { '0|col:p:3': true, '9|stadi:1': true, 'x': true, '0|stadi:1': 'sì' } }));
  assert.deepEqual(St.risultati[2].risposte, {});
});

/* ======================= Partite casuali ======================= */
prova('5.000 partite casuali: si arriva sempre alla fine, punti = somma delle voci, salvataggio e rigioco coerenti', () => {
  for (let i = 0; i < 5000; i++) {
    const R = prng(1000 + i), n = 3 + R(6);
    const cfg = { patrocinio: R(4) > 0, scommesse: R(4) > 0, societa: R(5) > 0, soglia: 1 + R(3) };
    let P = SS.nuovaPartita({ nomi: NOMI.slice(0, n), cfg }, R);
    let passi = 0;
    while (S(P).fase !== 'finita') {
      if (++passi > 400) throw new Error('partita infinita');
      const St = S(P);
      if (St.fase === 'era') { P = A(P, { t: 'fineEra' }); continue; }
      if (St.fase === 'conclave' && St.sub === 'mercato') {
        const liberi = Array.from({ length: n }, (_, g) => g).filter(g => !SS.relazioneDi(St, St.c, g));
        if (liberi.length >= 2 && R(3) > 0) {
          const a = liberi[R(liberi.length)], resto = liberi.filter(x => x !== a), b = resto[R(resto.length)], men = SS.obblighi(St.cfg);
          const pat = St.cfg.patrocinio && R(2);
          P = A(P, pat ? { t: 'relazione', tipo: 'patrocinio', a, b, ob: men[R(men.length)] } : { t: 'relazione', tipo: 'patto', a, b, oa: men[R(men.length)], ob: men[R(men.length)] });
          if (R(10) === 0 && SS.puoAnnullare(P)) P = SS.annulla(P);
        } else P = A(P, { t: 'urne' });
        continue;
      }
      if (St.fase === 'conclave' && St.sub === 'cabina') {
        const g = SS.prossimoInCabina(St), op = SS.opzioniScheda(St, g);
        const ev = { t: 'scheda', g, voto: op.decreti[R(3)], sigillo: op.sigillo && R(3) === 0, intento: op.patto ? (R(2) ? 'L' : 'T') : null, scommessa: null, potere: null };
        if (op.scommessa && R(2)) ev.scommessa = { b: op.scommessa.bersagli[R(op.scommessa.bersagli.length)], a: op.scommessa.tipi[R(op.scommessa.tipi.length)] };
        if (op.potere && op.potere.ok && R(2) && (op.potere.id !== 'velo' || ev.scommessa)) {
          ev.potere = { id: op.potere.id };
          if (op.potere.id === 'cannocchiale') ev.potere.bersaglio = op.potere.bersagli[R(op.potere.bersagli.length)];
          if (op.potere.id === 'veto') ev.potere.decreto = op.decreti[R(3)];
        }
        P = A(P, ev); continue;
      }
      if (St.fase === 'conclave' && St.sub === 'esito') { P = A(P, { t: 'apriEra' }); continue; }
      if (St.fase === 'verifica') {
        const risp = {}; for (const q of SS.domande(St, St.era)) if (R(2)) risp[q.key] = true;
        P = A(P, { t: 'verifica', r: risp });
        if (R(8) === 0) { P = SS.annulla(P); P = A(P, { t: 'verifica', r: risp }); }
        continue;
      }
      if (St.fase === 'missioni') { const risp = {}; for (const q of SS.domandeMissioni(St)) if (R(2)) risp[q.g] = true; P = A(P, { t: 'missioni', r: risp }); continue; }
      throw new Error('fase inattesa ' + St.fase);
    }
    const St = S(P), F = SS.finale(St);
    for (const x of F) {
      assert.equal(x.punti, x.voci.reduce((a, v) => a + v.p, 0), 'punti = somma delle voci');
      assert.ok(Number.isInteger(x.punti));
    }
    assert.equal(J(S(JSON.parse(J(P)))), J(St), 'salvataggio e rigioco');
    assert.ok(St.sigillo.length === n && St.cronologia.length > 0);
    const ar = SS.archivio(St); assert.equal(ar.conclavi.length, 2);
    const ri = SS.riassunto(St, P); assert.equal(ri.punti.length, n);
  }
});

console.log(`\n${ok} prove superate`);
