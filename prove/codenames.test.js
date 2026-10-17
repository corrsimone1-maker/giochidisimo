// Prove del motore di Codenames: Double Agents (giochi/codenames/motore.js), senza browser.
// Uso, dalla cartella della repo:  node prove/codenames.test.js
// Coprono generazione delle mappe, viste private e pubblica (anche come indistinguibilità:
// ciò che uno non deve sapere non cambia ciò che vede), punteggio, intercettazioni,
// messaggi criptati, indagine, turni, annullamenti, salvataggio e partite casuali.
'use strict';
const assert = require('assert');
const path = require('path');
const DA = require(path.join(__dirname, '..', 'giochi', 'codenames', 'motore.js'));
const rand = DA.randIntCrypto;
let ok = 0; const prova = (nome, f) => { f(); ok++; console.log('ok  ', nome); };
const errore = (f, re) => assert.throws(f, e => e instanceof DA.ErroreGioco && (!re || re.test(e.message)), 'doveva fallire' + (re ? ' con ' + re : ''));
function prng(seed) { let s = seed >>> 0; return n => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n); }; }
const chi2 = (obs, att) => obs.reduce((a, o, i) => a + (o - att[i]) ** 2 / att[i], 0);
const J = x => JSON.stringify(x);

/* Mappa fissa per le prove: A1–B2 rossi (0–6), C2–D3 blu (7–13), E3–B4 doppi (14–16),
   C4–D5 neutrali (17–23), E5 assassino (24). */
const FISSA = [...'RRRRRRR', ...'BBBBBBB', ...'DDD', ...'NNNNNNN', 'A'];
const R0 = [0, 1, 2, 3, 4, 5, 6], B0 = [7, 8, 9, 10, 11, 12, 13], D0 = [14, 15, 16], N0 = [17, 18, 19, 20, 21, 22, 23], ASS = 24;
const partita = (cfg = {}, primo = 'R', mappa = FISSA) => ({ v: 1, id: 'prova', cfg: DA.configura(cfg), mappa: mappa.slice(), primo, eventi: [], svelate: [], annullati: 0 });
const S = P => DA.stato(P);
const A = (P, ev) => DA.applica(P, ev);
const seq = (P, evs) => evs.reduce(A, P);
const tocca = (P, pos) => { const s = S(P); return A(P, { t: 'tocco', s: s.turno, pos, k: s.tentativi }); };
const indizio = (P, n = 2, parola) => A(P, { t: 'indizio', s: S(P).turno, n, parola });
const nessuna = P => A(P, { t: 'intercetta', s: DA.altra(S(P).turno), pos: null });
const pub = P => J(DA.vistaPubblica(S(P)));

/* ======================= Generazione ======================= */
prova('mappa: 25 posizioni, 7 rossi, 7 blu, 3 doppi, 7 neutrali, 1 assassino (10.000 mappe)', () => {
  for (let i = 0; i < 10000; i++) {
    const m = DA.generaMappa(rand);
    assert.equal(m.length, 25);
    const n = { R: 0, B: 0, D: 0, N: 0, A: 0 }; m.forEach(c => n[c]++);
    assert.deepEqual(n, { R: 7, B: 7, D: 3, N: 7, A: 1 });
    assert.ok(DA.mappaValida(m));
  }
});
prova('mappa: ogni categoria ugualmente probabile in ogni posizione (chi-quadro, 40.000 mappe)', () => {
  const T = 40000, cont = { R: Array(25).fill(0), D: Array(25).fill(0), A: Array(25).fill(0), N: Array(25).fill(0) };
  for (let i = 0; i < T; i++) DA.generaMappa(rand).forEach((c, p) => { if (cont[c]) cont[c][p]++; });
  // 24 gradi di libertà: il quantile 0,9999 è circa 58
  for (const [c, q] of [['R', 7], ['D', 3], ['A', 1], ['N', 7]]) {
    const x = chi2(cont[c], Array(25).fill(T * q / 25));
    assert.ok(x < 58, `${c}: chi-quadro ${x.toFixed(1)}`);
  }
});
prova('mappa: le coppie di doppi sono uniformi (le 300 coppie di posizioni, chi-quadro)', () => {
  // per un'assegnazione uniforme ogni coppia di posizioni è doppia-doppia con la stessa probabilità
  const T = 60000, c = new Map();
  for (let i = 0; i < T; i++) {
    const d = []; DA.generaMappa(rand).forEach((x, p) => { if (x === 'D') d.push(p); });
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) { const k = d[a] * 25 + d[b]; c.set(k, (c.get(k) || 0) + 1); }
  }
  const obs = []; for (let a = 0; a < 25; a++) for (let b = a + 1; b < 25; b++) obs.push(c.get(a * 25 + b) || 0);
  const att = T * 3 / 300, x = chi2(obs, Array(300).fill(att));
  // 299 gradi di libertà: media 299, deviazione ~24,5; 420 è oltre 4,9 deviazioni
  assert.ok(x < 420, 'chi-quadro ' + x.toFixed(1));
});
prova('nuova partita: chi inizia a sorte o scelto, id e configurazione di base', () => {
  const v = { R: 0, B: 0 };
  for (let i = 0; i < 4000; i++) v[DA.nuovaPartita({}, rand).primo]++;
  assert.ok(Math.abs(v.R - 2000) < 250, J(v));
  assert.equal(DA.nuovaPartita({ primo: 'B' }, rand).primo, 'B');
  const P = DA.nuovaPartita({}, rand);
  assert.match(P.id, /^[0-9a-f]{10}$/);
  assert.deepEqual(P.cfg, DA.DEF);
  errore(() => S(Object.assign({}, P, { mappa: P.mappa.slice(1) })), /non valida/);
});
prova('configurazione: soglia mai sopra 7 (vincere con i soli esclusivi deve restare possibile), limiti rispettati', () => {
  assert.equal(DA.configura({ soglia: 9 }).soglia, 7);
  assert.equal(DA.configura({ soglia: 2 }).soglia, 5);
  assert.equal(DA.configura({ nInt: 12 }).nInt, 5);
  assert.equal(DA.configura({ bonusRisposta: -1 }).bonusRisposta, 0);
  assert.equal(DA.configura({ indagine: 'sì' }).indagine, true);
  assert.equal(DA.punteggio(7, 0), 7);
  for (let soglia = 5; soglia <= 7; soglia++) assert.ok(DA.punteggio(7, 0) >= DA.configura({ soglia }).soglia);
});

/* ======================= Mappe private ======================= */
prova('viste private: 10 parole proprie tutte uguali, l’assassino, 14 sconosciute', () => {
  for (let i = 0; i < 2000; i++) {
    const P = DA.nuovaPartita({}, rand), st = S(P);
    for (const s of ['R', 'B']) {
      const v = DA.vistaPrivata(st, s), n = { mio: 0, assassino: 0, ignoto: 0 };
      v.forEach(c => n[c.tipo]++);
      assert.deepEqual(n, { mio: 10, assassino: 1, ignoto: 14 });
      // le 10 proprie sono proprio gli esclusivi più i doppi
      v.forEach((c, p) => { if (c.tipo === 'mio') assert.ok(P.mappa[p] === s || P.mappa[p] === 'D'); });
      // ogni cella privata ha solo i campi previsti
      v.forEach(c => assert.deepEqual(Object.keys(c).sort(), ['et', 'indagata', 'nota', 'pos', 'presa', 'rivelata', 'tipo']));
    }
  }
});
prova('viste private: il rosso non distingue esclusivi e doppi, né blu e neutrali (scambi invisibili)', () => {
  const r = prng(7);
  for (let i = 0; i < 1500; i++) {
    let P = DA.nuovaPartita({}, r);
    // qualche tocco pubblico prima del confronto, lontano dalle celle che si scambiano
    const m = P.mappa, idx = c => m.map((x, p) => x === c ? p : -1).filter(p => p >= 0);
    const [r1] = idx('R'), [d1] = idx('D'), [b1] = idx('B'), [n1] = idx('N');
    const scambia = (a, b) => { const q = m.slice(); [q[a], q[b]] = [q[b], q[a]]; return Object.assign({}, P, { mappa: q }); };
    const vR = J(DA.vistaPrivata(S(P), 'R'));
    assert.equal(J(DA.vistaPrivata(S(scambia(r1, d1)), 'R')), vR, 'esclusivo rosso ↔ doppio');
    assert.equal(J(DA.vistaPrivata(S(scambia(b1, n1)), 'R')), vR, 'blu ↔ neutrale');
    const vB = J(DA.vistaPrivata(S(P), 'B'));
    const [b2] = idx('B'), [r2] = idx('R');
    assert.equal(J(DA.vistaPrivata(S(scambia(b2, d1)), 'B')), vB, 'esclusivo blu ↔ doppio');
    assert.equal(J(DA.vistaPrivata(S(scambia(r2, n1)), 'B')), vB, 'rosso ↔ neutrale');
    // e la plancia non distingue nessuna di queste mappe
    const vP = pub(P);
    for (const [a, b] of [[r1, d1], [b1, n1], [r1, b1], [d1, n1]]) assert.equal(pub(scambia(a, b)), vP);
  }
});
prova('viste: un doppio catturato dal rosso risulta preso dal rosso anche sulla mappa blu', () => {
  let P = partita(); P = indizio(P); P = nessuna(P); P = tocca(P, 14);
  const st = S(P);
  const b = DA.vistaPrivata(st, 'B')[14], r = DA.vistaPrivata(st, 'R')[14], p = DA.vistaPubblica(st).celle[14];
  for (const c of [b, r, p]) { assert.equal(c.presa, 'R'); assert.equal(c.rivelata, 'D'); }
  assert.equal(b.tipo, 'mio');   // per il blu era una sua parola: ora sa che era un doppio, preso dal rosso
});

/* ======================= Punteggio ======================= */
prova('punteggio: doppi 0→0, 1→1, 2→3, 3→4; bonus di coppia una volta sola', () => {
  assert.deepEqual([0, 1, 2, 3].map(d => DA.punteggio(0, d)), [0, 1, 3, 4]);
  for (let e = 0; e <= 7; e++) for (let d = 0; d <= 3; d++) assert.equal(DA.punteggio(e, d), e + d + Math.floor(d / 2));
  assert.equal(DA.punteggio(7, 0), 7); assert.equal(DA.punteggio(6, 1), 7); assert.equal(DA.punteggio(4, 2), 7); assert.equal(DA.punteggio(3, 3), 7);
  assert.equal(DA.punteggio(5, 1), 6);
});
prova('punteggio in partita: il secondo doppio vale 2, il terzo 1', () => {
  let P = partita({ intercettazioni: false }); P = indizio(P, 3);
  P = tocca(P, 14); assert.equal(S(P).ultimo.guadagno.R, 1);
  P = tocca(P, 15); assert.equal(S(P).ultimo.guadagno.R, 2);
  P = tocca(P, 16); assert.equal(S(P).ultimo.guadagno.R, 1);
  const st = S(P); assert.equal(DA.vistaPubblica(st).punti.R, 4); assert.deepEqual(st.presi.R, { e: 0, d: 3 });
});
prova('vittoria: scatta subito a 7 punti, a metà indizio', () => {
  let P = partita({ intercettazioni: false });
  P = indizio(P, 4); P = tocca(P, 0); P = tocca(P, 1); P = tocca(P, 2); P = tocca(P, 3);   // 4 punti, tentativo finito al limite? no: max 5
  P = A(P, { t: 'stop', s: 'R' });
  P = indizio(P, 1); P = tocca(P, 17);                                                     // blu: neutrale
  P = indizio(P, 5); P = tocca(P, 14); P = tocca(P, 15);                                   // 4 + 1 + 2 = 7
  const st = S(P);
  assert.equal(st.fase, 'finita'); assert.equal(st.vincitore, 'R'); assert.equal(st.motivo, 'soglia');
  assert.equal(st.ultimo.fine, 'vittoria');
  errore(() => tocca(P, 4), /finita/);
});
prova('vittoria nel turno avversario: il rosso tocca l’ultimo agente che serviva al blu', () => {
  let P = partita({ intercettazioni: false }, 'B');
  P = indizio(P, 6); for (const p of [7, 8, 9, 10, 11, 12]) P = tocca(P, p);                // blu a 6
  P = A(P, { t: 'stop', s: 'B' });
  P = indizio(P, 2); P = tocca(P, 0); P = tocca(P, 13);                                     // il rosso tocca un blu
  const st = S(P);
  assert.equal(st.vincitore, 'B'); assert.equal(st.motivo, 'soglia'); assert.equal(st.ultimo.esito, 'avversario');
  assert.equal(DA.vistaPubblica(st).punti.B, 7);
});
prova('assassino: perde subito chi lo tocca', () => {
  let P = partita({ intercettazioni: false }); P = indizio(P); P = tocca(P, 0); P = tocca(P, ASS);
  const st = S(P);
  assert.equal(st.fase, 'finita'); assert.equal(st.vincitore, 'B'); assert.equal(st.motivo, 'assassino');
});
prova('cattura accidentale: il punto va all’altra squadra e il turno finisce', () => {
  let P = partita({ intercettazioni: false }); P = indizio(P, 3); P = tocca(P, 7);
  const st = S(P);
  assert.equal(st.presa[7], 'B'); assert.equal(DA.vistaPubblica(st).punti.B, 1); assert.equal(st.turno, 'B'); assert.equal(st.fase, 'indizio');
});

/* ======================= Intercettazioni ======================= */
prova('intercettazione: prima del primo tocco la plancia è identica con o senza, e ovunque sia', () => {
  for (let i = 0; i < 300; i++) {
    let P = DA.nuovaPartita({}, rand); P = indizio(P, 2, 'spazio');
    assert.equal(S(P).fase, 'controspionaggio');
    const o = DA.altra(S(P).turno);
    const libere = P.mappa.map((c, p) => c !== 'A' ? p : -1).filter(p => p >= 0);
    const viste = [A(P, { t: 'intercetta', s: o, pos: null }), A(P, { t: 'intercetta', s: o, pos: libere[rand(libere.length)] }), A(P, { t: 'intercetta', s: o, pos: libere[rand(libere.length)] })].map(pub);
    assert.equal(viste[1], viste[0]); assert.equal(viste[2], viste[0]);
    // anche la descrizione per «Annulla» non dice nulla
    assert.equal(DA.descrivi(A(P, { t: 'intercetta', s: o, pos: libere[0] })), DA.descrivi(A(P, { t: 'intercetta', s: o, pos: null })));
  }
});
prova('intercettazione riuscita: carta non rivelata, niente punti, turno finito, gettone consumato', () => {
  let P = partita(); P = indizio(P, 3);
  P = A(P, { t: 'intercetta', s: 'B', pos: 14 });
  P = tocca(P, 14);
  const st = S(P), v = DA.vistaPubblica(st);
  assert.equal(st.rivelata[14], false); assert.equal(st.presa[14], null); assert.equal(v.celle[14].rivelata, null);
  assert.deepEqual(v.punti, { R: 0, B: 0 });
  assert.equal(st.turno, 'B'); assert.equal(st.fase, 'indizio');
  assert.equal(st.int.B, 3);   // 3 + 1 di bonus (il blu gioca per secondo) − 1
  assert.equal(st.stat.intRiuscite.B, 1); assert.equal(st.ultimo.esito, 'intercettata');
  // la carta resta disponibile: il blu può prenderla al suo turno
  P = indizio(P, 1); P = A(P, { t: 'intercetta', s: 'R', pos: null }); P = tocca(P, 14);
  assert.equal(S(P).presa[14], 'B');
});
prova('intercettazione fallita: il primo tocco si risolve, si continua, i tocchi dopo non sono intercettabili', () => {
  let P = partita(); P = indizio(P, 3);
  P = A(P, { t: 'intercetta', s: 'B', pos: 1 });
  P = tocca(P, 0);
  let st = S(P);
  assert.equal(st.ultimo.intercetto, 'fallita'); assert.equal(st.presa[0], 'R'); assert.equal(st.turno, 'R'); assert.equal(st.int.B, 3);
  assert.equal(st.stat.intFallite.B, 1);
  // la plancia dice solo «fallita», non dove era: con l'intercettazione su B1 o su A2 si vede la stessa cosa
  const altrove = tocca(A(indizio(partita(), 3), { t: 'intercetta', s: 'B', pos: 5 }), 0);
  assert.equal(pub(altrove), pub(P));
  assert.ok(!DA.vistaPubblica(st).cronologia.some(x => /B1/.test(x.testo)));
  P = tocca(P, 1);   // proprio la casella intercettata, ma al secondo tocco: niente effetto
  st = S(P); assert.equal(st.presa[1], 'R'); assert.equal(st.ultimo.intercetto, null);
});
prova('intercettazione: niente sull’assassino, solo carte in gioco, una per turno, solo l’avversario', () => {
  let P = partita(); P = indizio(P);
  errore(() => A(P, { t: 'intercetta', s: 'B', pos: ASS }), /assassino/);
  errore(() => A(P, { t: 'intercetta', s: 'R', pos: 3 }), /avversaria/);
  errore(() => tocca(P, 0), /turno/);   // prima si decide il controspionaggio
  const Q = A(P, { t: 'intercetta', s: 'B', pos: 3 });
  errore(() => A(Q, { t: 'intercetta', s: 'B', pos: 4 }), /momento/);
  // carta già coperta
  let R = partita(); R = indizio(R, 1); R = nessuna(R); R = tocca(R, 17);   // neutrale, turno blu
  R = indizio(R, 1);
  errore(() => A(R, { t: 'intercetta', s: 'R', pos: 17 }), /in gioco/);
});
prova('intercettazione: senza gettoni o senza meccanica non c’è la fase di controspionaggio', () => {
  let P = partita({ nInt: 1, bonusRisposta: 0 });
  P = indizio(P); P = A(P, { t: 'intercetta', s: 'B', pos: 20 }); P = tocca(P, 0); P = A(P, { t: 'stop', s: 'R' });   // fallita: blu a 0
  P = indizio(P); P = A(P, { t: 'intercetta', s: 'R', pos: null }); P = tocca(P, 7); P = A(P, { t: 'stop', s: 'B' });
  P = indizio(P);
  assert.equal(S(P).fase, 'tocchi');
  assert.equal(DA.azioni(S(P)).intercetta, false);
  let Q = partita({ intercettazioni: false }); Q = indizio(Q);
  assert.equal(S(Q).fase, 'tocchi'); assert.deepEqual(S(Q).int, { R: 0, B: 0 });
  errore(() => A(Q, { t: 'intercetta', s: 'B', pos: 3 }), /momento/);
});
prova('bonus a chi risponde: intercettazioni in più solo per chi gioca per secondo', () => {
  assert.deepEqual(S(partita({}, 'R')).int, { R: 3, B: 4 });
  assert.deepEqual(S(partita({}, 'B')).int, { R: 4, B: 3 });
  assert.deepEqual(S(partita({ bonusRisposta: 0 }, 'R')).int, { R: 3, B: 3 });
  assert.deepEqual(S(partita({ bonusRisposta: 2, nInt: 2 }, 'R')).int, { R: 2, B: 4 });
});

/* ======================= Messaggi criptati ======================= */
prova('criptato: la plancia è identica qualunque sia il messaggio, e non si può intercettare', () => {
  const P = partita();
  const viste = [['luna', 1], ['razzo', 2], ['New York', 2]].map(([parola, n]) => A(P, { t: 'criptato', s: 'R', n, parola }));
  const v0 = pub(viste[0]);
  for (const Q of viste) {
    assert.equal(pub(Q), v0);
    assert.equal(S(Q).fase, 'tocchi');
    errore(() => A(Q, { t: 'intercetta', s: 'B', pos: 3 }), /momento/);
  }
  assert.ok(!v0.toLowerCase().includes('luna'));
  assert.equal(DA.vistaPubblica(S(viste[0])).indizio.modo, 'criptato');
  assert.equal(DA.vistaPubblica(S(viste[0])).indizio.n, undefined);
});
prova('criptato: solo 1 o 2, tentativi fino a n+1, gettoni scalati, non si recupera', () => {
  const P = partita({ intercettazioni: false });
  errore(() => A(P, { t: 'criptato', s: 'R', n: 3, parola: 'x' }), /1 o 2/);
  errore(() => A(P, { t: 'criptato', s: 'R', n: 2, parola: '' }), /parola/);
  errore(() => A(P, { t: 'criptato', s: 'R', n: 2, parola: 'una frase intera' }), /sola parola/);
  let Q = A(P, { t: 'criptato', s: 'R', n: 2, parola: 'orbita' });
  assert.deepEqual(DA.messaggio(S(Q), 'R'), { parola: 'orbita', n: 2, max: 3 });
  assert.equal(DA.messaggio(S(Q), 'B'), null);
  assert.equal(S(Q).cripto.R, 1);
  Q = tocca(Q, 0); Q = tocca(Q, 1); Q = tocca(Q, 2);
  assert.equal(S(Q).turno, 'B'); assert.equal(S(Q).ultimo.fine, 'limite');
  assert.equal(DA.puoAnnullare(A(P, { t: 'criptato', s: 'R', n: 1, parola: 'x' })), false);
  // finiti i gettoni non si cripta più
  let T = partita({ intercettazioni: false, nCripto: 1 });
  T = A(T, { t: 'criptato', s: 'R', n: 1, parola: 'a' }); T = tocca(T, 17);
  T = indizio(T, 1); T = tocca(T, 18);
  errore(() => A(T, { t: 'criptato', s: 'R', n: 1, parola: 'b' }), /finiti/);
  assert.equal(DA.azioni(S(T)).criptato, false);
});
prova('criptato: spento nelle impostazioni, anche la logica lo rifiuta', () => {
  const P = partita({ criptati: false });
  assert.deepEqual(S(P).cripto, { R: 0, B: 0 });
  assert.equal(DA.azioni(S(P)).criptato, false);
  errore(() => A(P, { t: 'criptato', s: 'R', n: 1, parola: 'x' }), /non sono attivi/);
});

/* ======================= Indagine ======================= */
prova('indagine: risposta sempre coerente con la mappa (2.000 partite)', () => {
  for (let i = 0; i < 2000; i++) {
    let P = DA.nuovaPartita({}, rand); const s = P.primo;
    const mie = P.mappa.map((c, p) => c === s || c === 'D' ? p : -1).filter(p => p >= 0);
    const pos = mie[rand(mie.length)];
    P = A(P, { t: 'indagine', s, pos });
    const st = S(P);
    assert.deepEqual(st.indagini[s], { pos, doppio: P.mappa[pos] === 'D', nTurno: 1 });
    assert.equal(DA.vistaPrivata(st, s)[pos].indagata, P.mappa[pos] === 'D' ? 'doppio' : 'esclusivo');
    assert.ok(DA.vistaPrivata(st, DA.altra(s)).every(c => c.indagata === null));
  }
});
prova('indagine: la plancia non dice né la parola né l’esito', () => {
  const P = partita();
  const viste = [0, 3, 14, 16].map(pos => pub(A(P, { t: 'indagine', s: 'R', pos })));
  for (const v of viste) assert.equal(v, viste[0]);
  assert.equal(DA.vistaPubblica(S(A(P, { t: 'indagine', s: 'R', pos: 14 }))).risorse.indagine.R, 0);
});
prova('indagine: una per squadra, solo su una propria parola in gioco, prima dell’indizio, non consuma il turno', () => {
  let P = partita({ intercettazioni: false });
  errore(() => A(P, { t: 'indagine', s: 'R', pos: 7 }), /propria/);
  errore(() => A(P, { t: 'indagine', s: 'R', pos: 17 }), /propria/);
  errore(() => A(P, { t: 'indagine', s: 'R', pos: ASS }), /propria/);
  errore(() => A(P, { t: 'indagine', s: 'B', pos: 7 }), /inizio del proprio turno/);
  P = A(P, { t: 'indagine', s: 'R', pos: 15 });
  assert.equal(S(P).turno, 'R'); assert.equal(S(P).fase, 'indizio');
  errore(() => A(P, { t: 'indagine', s: 'R', pos: 16 }), /già/);
  P = indizio(P, 2);
  P = tocca(P, 0); P = A(P, { t: 'stop', s: 'R' });
  P = indizio(P, 1);
  errore(() => A(P, { t: 'indagine', s: 'B', pos: 8 }), /inizio/);   // dopo l'indizio no
  P = tocca(P, 18);                                                      // blu: neutrale
  errore(() => A(P, { t: 'indagine', s: 'R', pos: 0 }), /in gioco|già/);
  assert.equal(DA.puoAnnullare(A(partita(), { t: 'indagine', s: 'R', pos: 0 })), false);
});
prova('indagine spenta: niente gettone, niente azione, la logica la rifiuta', () => {
  const P = partita({ indagine: false });
  assert.deepEqual(S(P).indagine, { R: 0, B: 0 });
  assert.equal(DA.azioni(S(P)).indagine, false);
  errore(() => A(P, { t: 'indagine', s: 'R', pos: 0 }), /non è attiva/);
});

/* ======================= Turni ======================= */
prova('turni: si alternano, al massimo n+1 tentativi, stop dopo almeno uno, errore = fine turno', () => {
  let P = partita({ intercettazioni: false });
  errore(() => A(P, { t: 'indizio', s: 'B', n: 2 }), /momento/);
  P = indizio(P, 1);
  errore(() => A(P, { t: 'stop', s: 'R' }), /almeno/);
  errore(() => A(P, { t: 'tocco', s: 'B', pos: 7, k: 0 }), /turno/);
  P = tocca(P, 0); assert.equal(DA.azioni(S(P)).rimasti, 1);
  P = tocca(P, 1); assert.equal(S(P).turno, 'B'); assert.equal(S(P).ultimo.fine, 'limite');
  P = indizio(P, 3); P = tocca(P, 7); P = tocca(P, 17);
  assert.equal(S(P).turno, 'R'); assert.equal(S(P).ultimo.esito, 'neutrale'); assert.equal(S(P).nTurno, 3);
  P = indizio(P, 2); P = tocca(P, 2); P = A(P, { t: 'stop', s: 'R' });
  assert.equal(S(P).turno, 'B'); assert.equal(S(P).stat.turni.R, 2);
});
prova('turni: un doppio tocco viene rifiutato (k), le carte coperte non si ritoccano', () => {
  let P = partita({ intercettazioni: false }); P = indizio(P, 3);
  P = A(P, { t: 'tocco', s: 'R', pos: 0, k: 0 });
  errore(() => A(P, { t: 'tocco', s: 'R', pos: 1, k: 0 }), /già registrato/);
  errore(() => tocca(P, 0), /coperta/);
});
prova('indizi 0 e ∞ solo con le regole avanzate, e allora tentativi senza limite', () => {
  const P = partita({ intercettazioni: false });
  errore(() => indizio(P, 0), /non valido/); errore(() => indizio(P, 'inf'), /non valido/); errore(() => indizio(P, 10), /non valido/);
  let Q = indizio(partita({ intercettazioni: false, avanzati: true }), 'inf');
  for (const p of [0, 1, 2, 3, 4, 5]) Q = tocca(Q, p);
  assert.equal(S(Q).turno, 'R'); assert.equal(DA.vistaPubblica(S(Q)).punti.R, 6);
});

/* ======================= Annullare ======================= */
prova('annulla: ripristina punti e bonus; la carta resta svelata a tutti', () => {
  let P = partita({ intercettazioni: false }); P = indizio(P, 3); P = tocca(P, 14); P = tocca(P, 15);
  assert.equal(DA.vistaPubblica(S(P)).punti.R, 3);
  assert.match(DA.descrivi(P), /doppio agente: resterà noto/);
  P = DA.annulla(P);
  const st = S(P), v = DA.vistaPubblica(st);
  assert.equal(v.punti.R, 1); assert.deepEqual(st.presi.R, { e: 0, d: 1 });
  assert.equal(st.rivelata[15], false); assert.equal(v.celle[15].nota, 'D'); assert.equal(v.annullati, 1);
  assert.equal(DA.vistaPrivata(st, 'B')[15].nota, 'D');
  P = tocca(P, 15); assert.equal(DA.vistaPubblica(S(P)).punti.R, 3);
});
prova('annulla: il primo tocco contro un’intercettazione non si annulla; contro una rinuncia sì', () => {
  let P = partita(); P = indizio(P, 2); P = A(P, { t: 'intercetta', s: 'B', pos: 5 });
  assert.equal(DA.puoAnnullare(P), true);   // la decisione del controspionaggio si può rifare
  const Q = tocca(P, 0);
  assert.equal(DA.puoAnnullare(Q), false); errore(() => DA.annulla(Q), /non si può/);
  assert.equal(DA.puoAnnullare(tocca(Q, 1)), true);   // il secondo tocco sì
  let R = partita(); R = indizio(R, 2); R = nessuna(R); R = tocca(R, 0);
  assert.equal(DA.puoAnnullare(R), true);
  R = DA.annulla(R); assert.equal(S(R).fase, 'tocchi'); assert.equal(S(R).tentativi, 0);
});
prova('annulla: anche dopo la vittoria, e la partita riprende', () => {
  let P = partita({ intercettazioni: false }); P = indizio(P, 1); P = tocca(P, 0); P = tocca(P, ASS);
  assert.equal(S(P).fase, 'finita');
  P = DA.annulla(P);
  assert.equal(S(P).fase, 'tocchi'); assert.equal(DA.vistaPubblica(S(P)).celle[ASS].nota, 'A');
});

/* ======================= Salvataggio e debriefing ======================= */
prova('salvataggio: la partita passa da JSON senza perdere niente (mappa, segreti, risorse, turno, tentativi)', () => {
  let P = DA.nuovaPartita({}, rand);
  const s = P.primo, o = DA.altra(s);
  const mie = P.mappa.map((c, p) => c === s || c === 'D' ? p : -1).filter(p => p >= 0);
  P = A(P, { t: 'indagine', s, pos: mie[0] });
  P = A(P, { t: 'indizio', s, n: 3, parola: 'mare' });
  P = A(P, { t: 'intercetta', s: o, pos: mie[1] });
  const Q = JSON.parse(JSON.stringify(P));
  assert.deepEqual(S(Q), S(P));
  assert.deepEqual(DA.vistaPrivata(S(Q), s), DA.vistaPrivata(S(P), s));
  assert.equal(S(Q).intercetto.pos, mie[1]);
});
prova('debriefing: solo a partita finita, con tutti i segreti', () => {
  let P = partita(); P = A(P, { t: 'indagine', s: 'R', pos: 14 }); P = indizio(P, 2, 'luna');
  errore(() => DA.debriefing(P), /partita finita/);
  P = A(P, { t: 'intercetta', s: 'B', pos: 3 }); P = tocca(P, 0); P = tocca(P, 1); P = A(P, { t: 'stop', s: 'R' });
  P = A(P, { t: 'criptato', s: 'B', n: 1, parola: 'stella' }); P = tocca(P, ASS);
  const d = DA.debriefing(P);
  assert.equal(d.finale.vincitore, 'R');
  assert.deepEqual(d.indagini.R, { pos: 14, doppio: true, nTurno: 1 });
  assert.ok(d.righe.some(r => r.t === 'intercetta' && r.pos === 3));
  assert.ok(d.righe.some(r => r.t === 'criptato' && r.parola === 'stella' && r.num === 1));
  assert.ok(d.righe.some(r => r.t === 'tocco' && r.pos === 0 && r.intercetto === 'fallita'));
  assert.deepEqual(d.mappa, FISSA);
});

/* ======================= Partite casuali ======================= */
prova('partite casuali con annullamenti (5.000): invarianti sempre vere', () => {
  const r = prng(2026);
  let finite = 0;
  for (let g = 0; g < 5000; g++) {
    const cfg = { intercettazioni: r(5) > 0, criptati: r(5) > 0, indagine: r(2) > 0, nInt: r(4), nCripto: r(3), soglia: 5 + r(3), bonusRisposta: r(3), avanzati: r(2) > 0 };
    let P = DA.nuovaPartita({ cfg }, r), guardia = 0, St = S(P);
    while (St.fase !== 'finita' && guardia++ < 600) {
      const s = St.turno, o = DA.altra(s), az = DA.azioni(St), lib = St.mappa.map((c, p) => St.rivelata[p] ? -1 : p).filter(p => p >= 0);
      let ev;
      if (DA.puoAnnullare(P) && r(12) === 0) { P = DA.annulla(P); St = S(P); continue; }
      if (St.fase === 'indizio') {
        if (az.indagine && r(3) === 0) { const m = lib.filter(p => St.mappa[p] === s || St.mappa[p] === 'D'); if (m.length) ev = { t: 'indagine', s, pos: m[r(m.length)] }; }
        if (!ev) ev = az.criptato && r(3) === 0 ? { t: 'criptato', s, n: 1 + r(2), parola: 'x' } : { t: 'indizio', s, n: cfg.avanzati && r(6) === 0 ? (r(2) ? 0 : 'inf') : 1 + r(4) };
      } else if (St.fase === 'controspionaggio') {
        const c = lib.filter(p => St.mappa[p] !== 'A');
        ev = { t: 'intercetta', s: o, pos: r(2) ? c[r(c.length)] : null };
      } else {
        // agenti «bravi a metà»: spesso una propria parola, a volte una qualsiasi
        const mie = lib.filter(p => St.mappa[p] === s || St.mappa[p] === 'D');
        ev = az.stop && r(4) === 0 ? { t: 'stop', s } : { t: 'tocco', s, pos: mie.length && r(10) < 7 ? mie[r(mie.length)] : lib[r(lib.length)], k: St.tentativi };
      }
      const prima = St;
      P = A(P, ev); St = S(P);
      // invarianti
      for (const x of ['R', 'B']) {
        const pr = St.presa.filter(c => c === x).length;
        assert.equal(St.presi[x].e + St.presi[x].d, pr);
        assert.ok(St.int[x] >= 0 && St.cripto[x] >= 0 && St.indagine[x] >= 0);
        const p = DA.punteggio(St.presi[x].e, St.presi[x].d);
        if (St.fase !== 'finita') assert.ok(p < St.cfg.soglia);
      }
      if (St.fase === 'tocchi') assert.ok(St.tentativi <= St.indizio.max);
      if (ev.t === 'tocco' && St.ultimo.esito === 'intercettata') assert.equal(St.rivelata[ev.pos], false);
      if (ev.t === 'tocco' && prima.tentativi > 0) assert.equal(St.ultimo.intercetto, null);
    }
    assert.equal(St.fase, 'finita', 'ogni partita finisce');
    finite++;
    const F = DA.finale(St);
    if (F.motivo === 'soglia') assert.ok(F.punti[F.vincitore] >= F.soglia && F.punti[DA.altra(F.vincitore)] < F.soglia);
    else assert.equal(F.motivo, 'assassino');
    const d = DA.debriefing(P); assert.equal(d.righe.length, P.eventi.length);
  }
  assert.equal(finite, 5000);
});

console.log(`\n${ok} prove superate`);
