// Prove del motore di Camel Up: Economics (giochi/camelup/motore.js), senza browser.
// Uso, dalla cartella della repo:  node prove/camelup.test.js
// Coprono piramide digitale, impegno SHA-256, asta e spionaggio, Borsa LMSR, turni, annullamenti e casi limite.
const assert = require('assert');
const path = require('path');
const CU = require(path.join(__dirname, '..', 'giochi', 'camelup', 'motore.js'));
const rand = CU.randIntCrypto;
let ok = 0; const prova = (nome, f) => { f(); ok++; console.log('ok  ', nome); };
const NOMI = ['Anna', 'Bruno', 'Carla', 'Dario'];

/* PRNG riproducibile per le prove che vogliono partite ripetibili (la casualità vera è randIntCrypto) */
function prng(seed) { let s = seed >>> 0; return n => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n); }; }
function partita(opz = {}) {
  const r = opz.rand || prng(opz.seed || 1);
  const P = CU.nuovaPartita({ nomi: opz.nomi || NOMI, cfg: opz.cfg || {}, primo: opz.primo || 0 }, r);
  P._r = r;
  return P;
}
const S = P => CU.stato(P);
const A = (P, ev) => CU.applica(P, ev);
/* Chiude l'asta con queste offerte (di base tutti zero) */
const asta = (P, off) => A(P, { t: 'asta', offerte: off || P.nomi.map(() => 0) });
const tocca = P => S(P).turno;
const dado = P => { const s = S(P); return A(P, { t: 'dado', g: s.turno, k: s.estratti }); };
const tavolo = P => A(P, { t: 'tavolo', g: tocca(P), tipo: 'tessera' });
const errore = (f, re) => assert.throws(f, e => e instanceof CU.ErroreGioco && (!re || re.test(e.message)), 'doveva fallire' + (re ? ' con ' + re : ''));
/* Chi-quadro di conteggi osservati contro attesi uniformi */
const chi2 = obs => { const n = obs.reduce((a, b) => a + b, 0), e = n / obs.length; return obs.reduce((a, o) => a + (o - e) ** 2 / e, 0); };

/* ======================= Piramide ======================= */
prova('sequenza: sei dadi diversi, ognuno una volta, con risultati validi', () => {
  for (let i = 0; i < 2000; i++) {
    const s = CU.generaSequenza(rand);
    assert.equal(s.length, 6);
    assert.deepEqual(s.map(x => x.d).sort(), [0, 1, 2, 3, 4, 5]);
    for (const x of s) {
      assert.ok([1, 2, 3].includes(x.v));
      if (x.d === CU.GRIGIO) assert.ok(x.col === 'b' || x.col === 'n'); else assert.equal(x.col, undefined);
    }
  }
});

prova('distribuzioni uniformi (120.000 sequenze, soglie chi-quadro al livello 0,001)', () => {
  const N = 120000, val = [0, 1, 2, 3, 4].map(() => [0, 0, 0]), grigio = [0, 0, 0, 0, 0, 0], pos = Array.from({ length: 6 }, () => Array(6).fill(0)), escluso = Array(6).fill(0);
  for (let i = 0; i < N; i++) {
    const s = CU.generaSequenza(rand);
    s.forEach((x, k) => { pos[x.d][k]++; if (x.d === CU.GRIGIO) grigio[(x.v - 1) + (x.col === 'n' ? 3 : 0)]++; else val[x.d][x.v - 1]++; });
    escluso[s[5].d]++;
  }
  val.forEach((v, d) => assert.ok(chi2(v) < 13.82, `dado ${d}: chi2 ${chi2(v)}`));      // 2 gradi di libertà
  assert.ok(chi2(grigio) < 20.52, 'grigio: chi2 ' + chi2(grigio));                       // 5 gradi
  assert.ok(chi2(pos.flat()) < 63, 'posizioni: chi2 ' + chi2(pos.flat()));              // 35 gradi (marginali fissi: soglia prudente)
  assert.ok(chi2(escluso) < 20.52, 'dado escluso: chi2 ' + chi2(escluso));
});

prova('la quinta estrazione chiude la tappa e la sesta non esce mai', () => {
  let P = asta(partita());
  const seq = P.tappe[1].seq;
  for (let k = 0; k < 5; k++) { P = dado(P); assert.deepEqual(S(P).estrazioni[k].d, seq[k].d); }
  const s = S(P);
  assert.equal(s.fase, 'liquidare'); assert.equal(s.estrazioni.length, 5);
  errore(() => A(P, { t: 'dado', g: s.turno, k: 5 }));
  errore(() => A(P, { t: 'tavolo', g: s.turno, tipo: 'tessera' }), /liquidare/);
});

prova('la sequenza resta uguale dopo un salvataggio e una riapertura', () => {
  let P = asta(partita());
  P = dado(dado(P));
  const salvata = JSON.parse(JSON.stringify(P));
  assert.deepEqual(salvata.tappe[1], P.tappe[1]);
  assert.deepEqual(S(salvata).estrazioni, S(P).estrazioni);
  CU.preparaTappa(salvata, 1, rand);                     // non la rigenera
  assert.deepEqual(salvata.tappe[1].seq, P.tappe[1].seq);
  const dopo = dado(salvata);
  assert.equal(S(dopo).estrazioni[2].d, P.tappe[1].seq[2].d);
});

prova('impegno SHA-256: si verifica, e cambiare un dado lo rompe', () => {
  const c = require('crypto');
  for (const t of ['', 'abc', 'camel up · economics', 'x'.repeat(200)]) assert.equal(CU.sha256(t), c.createHash('sha256').update(t).digest('hex'));
  const P = partita();
  assert.ok(CU.verificaTappa(P, 1));
  const falsa = JSON.parse(JSON.stringify(P)); falsa.tappe[1].seq[0].v = falsa.tappe[1].seq[0].v % 3 + 1;
  assert.ok(!CU.verificaTappa(falsa, 1));
});

prova('partenza: cinque cammelli su 1–3, pazzi su 14–16, classifica coerente con le pile', () => {
  for (let i = 0; i < 500; i++) {
    const p = CU.generaPartenza(rand), pile = CU.pilePartenza(p), cl = CU.classificaPartenza(p);
    assert.deepEqual(cl.slice().sort(), [0, 1, 2, 3, 4]);
    for (const k of Object.keys(pile)) assert.ok((+k >= 1 && +k <= 3) || (+k >= 14 && +k <= 16));
    const pos = c => { for (const k of Object.keys(pile)) { const j = pile[k].indexOf(c); if (j >= 0) return [+k, j]; } };
    for (let r = 0; r < 4; r++) { const [a, ha] = pos(cl[r]), [b, hb] = pos(cl[r + 1]); assert.ok(a > b || (a === b && ha > hb)); }
  }
});

/* ======================= Spionaggio ======================= */
prova('asta: paga solo il vincitore, quanto ha offerto', () => {
  let P = partita();
  P = asta(P, [3, 7, 0, 5]);
  const s = S(P);
  assert.deepEqual(s.crediti, [6000, 5300, 6000, 6000]);
  assert.equal(s.licenza.di, 1); assert.equal(s.licenza.usata, false); assert.equal(s.fase, 'gioco');
});

prova('asta: tutti a zero, nessuna licenza; offerte oltre il saldo o non intere rifiutate', () => {
  const s = S(asta(partita()));
  assert.equal(s.licenza, null); assert.deepEqual(s.crediti, [6000, 6000, 6000, 6000]);
  errore(() => asta(partita(), [61, 0, 0, 0]), /abbastanza/);
  errore(() => asta(partita(), [2.5, 0, 0, 0]), /interi/);
  errore(() => asta(partita(), [1, 0, 0]), /non valide/);
});

prova('asta: lo spareggio ruota di un posto a ogni tappa', () => {
  let P = partita();
  const vincitori = [];
  for (let t = 1; t <= 6; t++) {
    P = asta(P, [2, 2, 2, 2]);
    vincitori.push(S(P).licenza.di);
    P = tavolo(P);
    while (S(P).fase === 'gioco') P = dado(P);
    CU.preparaTappa(P, t + 1, P._r);
    P = A(P, { t: 'liquida', classifica: [0, 1, 2, 3, 4] });
  }
  assert.deepEqual(vincitori, [0, 1, 2, 3, 0, 1]);
});

prova('spionaggio: risposte coerenti con la sequenza fissata', () => {
  for (let i = 0; i < 300; i++) {
    let P = partita({ seed: 100 + i });
    P = asta(P, [5, 0, 0, 0]);                      // licenza ad Anna, che è la prima di turno
    const k = i % 4;                                 // usa la licenza dopo k dadi
    while (S(P).estratti < k) { P = dado(P); while (tocca(P) !== 0) P = tavolo(P); }
    while (tocca(P) !== 0) P = tavolo(P);
    const s = S(P), seq = P.tappe[1].seq, tipo = ['A', 'B', 'C'][i % 3], rim = CU.rimasti(s);
    const [a, b] = [rim[0], rim[rim.length - 1]];
    const r = CU.risposta(s, tipo, a, b);
    P = A(P, { t: 'spia', g: 0, tipo, a, b });
    if (tipo === 'A') { const prima = S(P).estratti; P = dado(P); const uscito = S(P).estrazioni[prima]; assert.equal(uscito.d, r.dado.d); assert.equal(uscito.v, r.dado.v); assert.equal(uscito.col, r.dado.col); }
    if (tipo === 'B') { while (S(P).fase === 'gioco') P = dado(P); assert.ok(!S(P).estrazioni.some(x => x.d === r.d)); assert.equal(seq[5].d, r.d); }
    if (tipo === 'C') assert.ok(seq.findIndex(x => x.d === r.prima) < seq.findIndex(x => x.d === r.dopo));
  }
});

prova('spionaggio: la licenza si usa una volta sola, solo dal proprietario nel suo turno, e non consuma il turno', () => {
  let P = asta(partita(), [0, 4, 0, 0]);             // licenza a Bruno
  errore(() => A(P, { t: 'spia', g: 1, tipo: 'A' }), /turno/);   // tocca ad Anna
  P = tavolo(P);                                     // ora tocca a Bruno
  errore(() => A(P, { t: 'spia', g: 2, tipo: 'A' }));
  const prima = S(P).crediti[1];
  P = A(P, { t: 'spia', g: 1, tipo: 'A' });
  assert.equal(S(P).turno, 1, 'il turno resta a Bruno');
  assert.equal(S(P).crediti[1], prima - 500);
  errore(() => A(P, { t: 'spia', g: 1, tipo: 'C', a: 0, b: 1 }), /licenza/);
  assert.ok(!CU.puoAnnullare(P).ok, 'lo spionaggio non si annulla');
  P = tavolo(P);
  assert.equal(S(P).turno, 2);
});

prova('spionaggio: dado escluso disattivato con due dadi rimasti, crediti insufficienti, precedenza solo su dadi in piramide', () => {
  let P = asta(partita({ cfg: { capitale: 60 } }), [59, 0, 0, 0]);   // ad Anna resta 1 credito
  let o = CU.opzioniSpia(S(P), 0);
  assert.ok(!o.A.ok && /insufficienti/.test(o.A.motivo));
  P = partita({ seed: 9 }); P = asta(P, [1, 0, 0, 0]);
  for (let i = 0; i < 4; i++) { P = dado(P); }
  while (tocca(P) !== 0) P = tavolo(P);
  o = CU.opzioniSpia(S(P), 0);
  assert.ok(!o.B.ok && o.A.ok && o.C.ok);
  const fuori = S(P).estrazioni[0].d, dentro = CU.rimasti(S(P));
  errore(() => A(P, { t: 'spia', g: 0, tipo: 'C', a: fuori, b: dentro[0] }), /piramide/);
  errore(() => A(P, { t: 'spia', g: 0, tipo: 'C', a: dentro[0], b: dentro[0] }), /piramide/);
});

/* ======================= Borsa ======================= */
const L = CU.Lmsr;
prova('LMSR: probabilità positive che sommano a 1, anche con q estremi', () => {
  const r = prng(5);
  for (let i = 0; i < 5000; i++) {
    const q = [0, 1, 2, 3, 4].map(() => (r(2001) - 1000) * (i % 3 === 0 ? 10 : 0.05));
    const p = L.probabilita(q, 4);
    assert.ok(p.every(x => x >= 0 && Number.isFinite(x)));
    assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-12);
    const c = L.acquisto(q, i % 5, 4, 70), v = L.vendita(q, i % 5, 4, 70);
    assert.ok(Number.isFinite(c) && Number.isFinite(v) && c >= 0 && v >= 0);
  }
});

prova('LMSR: forme chiuse uguali a C(q+e)−C(q) e C(q)−C(q−e); apertura uniforme 14 crediti, primo acquisto 15,48', () => {
  const r = prng(6);
  for (let i = 0; i < 2000; i++) {
    const q = [0, 1, 2, 3, 4].map(() => (r(200) - 100) / 7), e = i % 5, qp = q.slice(), qm = q.slice(); qp[e]++; qm[e]--;
    assert.ok(Math.abs(L.acquisto(q, e, 4, 70) - (L.C(qp, 4, 70) - L.C(q, 4, 70))) < 1e-8);
    assert.ok(Math.abs(L.vendita(q, e, 4, 70) - (L.C(q, 4, 70) - L.C(qm, 4, 70))) < 1e-8);
  }
  const p = L.probabilita([0, 0, 0, 0, 0], 4);
  assert.ok(p.every(x => Math.abs(x * 70 - 14) < 1e-12));
  assert.equal(CU.centAcquisto(L.acquisto([0, 0, 0, 0, 0], 0, 4, 70)), 1548);
});

prova('comprare alza il prezzo di quell’esito e abbassa gli altri; vendere fa il contrario', () => {
  let P = asta(partita());
  const prima = CU.prezzi(S(P));
  P = A(P, { t: 'compra', g: 0, e: 2 });
  const dopo = CU.prezzi(S(P));
  assert.ok(dopo[2] > prima[2]); [0, 1, 3, 4].forEach(i => assert.ok(dopo[i] < prima[i]));
  for (let i = 0; i < 3; i++) P = tavolo(P);
  P = A(P, { t: 'vendi', g: 0, e: 2 });
  const fine = CU.prezzi(S(P));
  assert.ok(fine[2] < dopo[2]);
  fine.forEach((x, i) => assert.ok(Math.abs(x - prima[i]) < 1e-12, 'torna ai prezzi di prima'));
});

prova('comprare e subito rivendere restituisce lo stesso valore (al massimo un centesimo al banco)', () => {
  for (const apertura of ['classifica', 'uniforme']) for (let e = 0; e < 5; e++) {
    let P = asta(partita({ cfg: { apertura, maxAzioni: 9 }, nomi: ['Anna', 'Bruno'] }));
    const c0 = S(P).crediti[0];
    P = A(P, { t: 'compra', g: 0, e }); P = tavolo(P);
    P = A(P, { t: 'vendi', g: 0, e });
    const diff = c0 - S(P).crediti[0];
    assert.ok(diff >= 0 && diff <= 1, `differenza ${diff} centesimi`);
  }
});

prova('nessun arbitraggio dagli arrotondamenti: 3.000 giri chiusi di compravendite a caso', () => {
  const r = prng(7);
  for (let i = 0; i < 3000; i++) {
    let P = asta(partita({ cfg: { maxAzioni: 99, maxContratti: 5, maxPerCammello: 3, capitale: 500 }, nomi: ['A', 'B', 'C'], seed: i }));
    const tot0 = S(P).crediti.reduce((a, b) => a + b);
    const tenuti = [];
    for (let k = 0; k < 8; k++) {
      const s = S(P), g = s.turno;
      const mie = tenuti.filter(x => x.g === g);
      if (mie.length && r(2)) { const x = mie[r(mie.length)]; P = A(P, { t: 'vendi', g, e: x.e }); tenuti.splice(tenuti.indexOf(x), 1); }
      else { const e = r(5); if (CU.puoComprare(s, g, e).ok) { P = A(P, { t: 'compra', g, e }); tenuti.push({ g, e }); } else P = tavolo(P); }
    }
    while (tenuti.length) { const s = S(P), g = s.turno, x = tenuti.find(y => y.g === g); if (x) { P = A(P, { t: 'vendi', g, e: x.e }); tenuti.splice(tenuti.indexOf(x), 1); } else P = tavolo(P); }
    const s = S(P);
    assert.ok(s.crediti.reduce((a, b) => a + b) <= tot0, 'i giocatori insieme non guadagnano su un giro chiuso');
    assert.deepEqual(s.mercati.vincitore.qt, [0, 0, 0, 0, 0]);
  }
});

prova('liquidazione: 70 crediti esatti per contratto vincente, zero agli altri, e mai due volte', () => {
  let P = asta(partita());
  P = A(P, { t: 'compra', g: 0, e: 3 });
  P = A(P, { t: 'compra', g: 1, e: 1 });
  P = A(P, { t: 'compra', g: 2, e: 3 });
  while (S(P).fase === 'gioco') P = dado(P);
  const prima = S(P).crediti;
  CU.preparaTappa(P, 2, P._r);
  P = A(P, { t: 'liquida', classifica: [3, 1, 0, 2, 4] });
  const s = S(P);
  assert.deepEqual(s.crediti.map((c, g) => c - prima[g]), [7000, 0, 7000, 0]);
  assert.equal(s.tappa, 2); assert.deepEqual(s.mercati.vincitore.qt, [0, 0, 0, 0, 0]);
  assert.equal(CU.totaleContratti(s, 0), 0, 'portafogli svuotati');
  errore(() => A(P, { t: 'liquida', classifica: [3, 1, 0, 2, 4] }), /liquidare/);
  errore(() => A(P, { t: 'liquida', classifica: [3, 1, 0, 2, 2] }));
});

prova('apertura dalla classifica: prezzi uguali alla tabella, probabilità al 100%', () => {
  let P = partita({ seed: 3 });
  const s = S(P), cl = s.classificaInizio, p = CU.prezzi(s);
  cl.forEach((c, r) => assert.ok(Math.abs(p[c] - CU.APERTURA.prima[r]) < 1e-12));
  P = asta(P); while (S(P).fase === 'gioco') P = dado(P);
  CU.preparaTappa(P, 2, P._r);
  P = A(P, { t: 'liquida', classifica: [4, 2, 0, 1, 3] });
  const p2 = CU.prezzi(S(P));
  [4, 2, 0, 1, 3].forEach((c, r) => assert.ok(Math.abs(p2[c] - CU.APERTURA.dopo[r]) < 1e-12));
  assert.ok(Math.abs(p2.reduce((a, b) => a + b) - 1) < 1e-12);
});

prova('limiti: due operazioni a tappa, due contratti, uno per cammello; finestre di acquisto e vendita', () => {
  let P = asta(partita({ nomi: ['Anna', 'Bruno'] }));
  P = A(P, { t: 'compra', g: 0, e: 0 }); P = tavolo(P);
  errore(() => A(P, { t: 'compra', g: 0, e: 0 }), /già un contratto/);
  P = A(P, { t: 'compra', g: 0, e: 1 }); P = tavolo(P);
  errore(() => A(P, { t: 'compra', g: 0, e: 2 }), /operazioni/);
  errore(() => A(P, { t: 'vendi', g: 0, e: 0 }), /operazioni/);
  // tre contratti: no
  let Q = asta(partita({ nomi: ['Anna', 'Bruno'], cfg: { maxAzioni: 5 } }));
  Q = A(Q, { t: 'compra', g: 0, e: 0 }); Q = tavolo(Q); Q = A(Q, { t: 'compra', g: 0, e: 1 }); Q = tavolo(Q);
  errore(() => A(Q, { t: 'compra', g: 0, e: 2 }), /2 contratti/);
  // finestre: si compra con 0, 1, 2 dadi usciti; con 3 no; si vende fino a 4
  let W = asta(partita({ nomi: ['Anna', 'Bruno'], cfg: { maxAzioni: 9 } }));
  W = A(W, { t: 'compra', g: 0, e: 0 });
  for (let i = 0; i < 3; i++) W = dado(W);          // Bruno, Anna, Bruno estraggono: 3 dadi
  assert.equal(CU.statoBorsa(S(W)), 'vendite');
  errore(() => A(W, { t: 'compra', g: S(W).turno, e: 1 }), /Acquisti chiusi/);
  W = tavolo(W);                                      // Anna al tavolo
  W = dado(W);                                        // Bruno estrae il 4º: si vende ancora
  assert.equal(S(W).turno, 0); assert.equal(S(W).estratti, 4);
  W = A(W, { t: 'vendi', g: 0, e: 0 });
  assert.equal(CU.totaleContratti(S(W), 0), 0);
  const Z = dado(W);                                  // 5 dadi: chiuso
  assert.equal(CU.statoBorsa(S(Z)), 'chiusa');
});

prova('niente vendite allo scoperto, niente saldi negativi, niente acquisti senza crediti', () => {
  let P = asta(partita({ nomi: ['Anna', 'Bruno'], cfg: { capitale: 20 } }));
  errore(() => A(P, { t: 'vendi', g: 0, e: 0 }), /Non hai contratti/);
  const cl = S(P).classificaInizio;
  errore(() => A(P, { t: 'compra', g: 0, e: cl[0] }), /insufficienti/);   // il favorito costa più di 20
  // fuzz: migliaia di eventi a caso, validi o no: i saldi non vanno mai sotto zero
  const r = prng(11);
  for (let i = 0; i < 150; i++) {
    let Q = partita({ seed: 500 + i, nomi: ['A', 'B', 'C', 'D', 'E', 'F'], cfg: { capitale: 15 + r(40), maxAzioni: 4, maxContratti: 3 } });
    for (let k = 0; k < 120; k++) {
      const s = S(Q), g = r(7) < 6 ? s.turno : r(6);
      const evs = [{ t: 'asta', offerte: s.nomi.map(() => r(30)) }, { t: 'compra', g, e: r(5) }, { t: 'vendi', g, e: r(5) }, { t: 'dado', g, k: s.estratti },
        { t: 'tavolo', g, tipo: ['tessera', 'spettatore', 'finale', 'partnership'][r(4)] }, { t: 'spia', g, tipo: 'ABC'[r(3)], a: r(6), b: r(6) },
        { t: 'liquida', classifica: CU.mescola([0, 1, 2, 3, 4], r) }, { t: 'traguardo' }, { t: 'punteggi', ep: s.nomi.map(() => r(40)) }];
      const ev = evs[r(evs.length)];
      if (ev.t === 'liquida') CU.preparaTappa(Q, s.tappa + 1, r);
      try { Q = A(Q, ev); } catch (e) { if (!(e instanceof CU.ErroreGioco)) throw e; }
      const t = S(Q);
      assert.ok(t.crediti.every(c => c >= 0 && Number.isInteger(c)), 'saldi interi e non negativi');
      assert.ok(t.mercati.vincitore.qt.every(x => x >= 0));
    }
  }
});

/* ======================= Turni ======================= */
prova('ogni azione ordinaria (dado, Borsa, tavolo) consuma il turno; il turno gira in ordine', () => {
  let P = asta(partita());
  const seq = [];
  P = dado(P); seq.push(tocca(P));
  P = A(P, { t: 'compra', g: 1, e: 0 }); seq.push(tocca(P));
  P = tavolo(P); seq.push(tocca(P));
  P = tavolo(P); seq.push(tocca(P));
  assert.deepEqual(seq, [1, 2, 3, 0]);
});

prova('lo stesso tocco due volte non fa due azioni (evento del turno precedente rifiutato)', () => {
  let P = asta(partita());
  const ev = { t: 'tavolo', g: 0, tipo: 'tessera' };
  P = A(P, ev);
  errore(() => A(P, ev), /turno/);
  const s = S(P), d = { t: 'dado', g: s.turno, k: s.estratti };
  P = A(P, d);
  errore(() => A(P, Object.assign({}, d, { g: S(P).turno })), /già stato estratto/);
});

prova('partnership solo da 6 giocatori; azioni al tavolo registrate', () => {
  const P = asta(partita());
  errore(() => A(P, { t: 'tavolo', g: 0, tipo: 'partnership' }), /6 giocatori/);
  const Q = asta(partita({ nomi: ['A', 'B', 'C', 'D', 'E', 'F'] }));
  const R = A(Q, { t: 'tavolo', g: 0, tipo: 'partnership' });
  assert.ok(/partnership/.test(S(R).cronologia.at(-1).testo));
});

prova('la tappa nuova comincia dal giocatore a sinistra di chi ha estratto l’ultimo dado', () => {
  let P = asta(partita());                       // Anna inizia
  P = tavolo(P);                                  // Anna
  for (let i = 0; i < 5; i++) P = dado(P);        // Bruno, Carla, Dario, Anna, Bruno: l'ultimo è di Bruno
  assert.equal(S(P).ultimoPiramide, 1);
  CU.preparaTappa(P, 2, P._r);
  P = A(P, { t: 'liquida', classifica: [0, 1, 2, 3, 4] });
  assert.equal(S(P).primo, 2); assert.equal(S(P).turno, 2);
  P = A(P, { t: 'primo', g: 3 });                 // si può cambiare prima di cominciare
  assert.equal(S(P).turno, 3);
  P = asta(P); P = tavolo(P);
  errore(() => A(P, { t: 'primo', g: 0 }), /cominciata/);
});

prova('annullare un’estrazione rimette il dado nella piramide e riestraendo esce lo stesso', () => {
  let P = asta(partita());
  P = dado(P);
  const uscito = S(P).estrazioni[0];
  P = CU.annulla(P);
  assert.equal(S(P).estratti, 0); assert.equal(S(P).turno, 0);
  P = dado(P);
  assert.deepEqual(S(P).estrazioni[0], uscito);
  // l'asta non si annulla
  const Q = asta(partita(), [1, 0, 0, 0]);
  assert.ok(!CU.puoAnnullare(Q).ok);
});

prova('fine corsa: liquidazione, punteggi, e poi nessuna azione', () => {
  let P = asta(partita());
  P = A(P, { t: 'compra', g: 0, e: 0 });
  P = dado(P);
  P = A(P, { t: 'traguardo' });
  assert.equal(S(P).fase, 'liquidare');
  P = A(P, { t: 'liquida', classifica: [0, 1, 2, 3, 4] });
  assert.equal(S(P).fase, 'punteggi');
  P = A(P, { t: 'punteggi', ep: [20, 18, 25, 3] });
  const s = S(P), f = CU.finale(s);
  assert.equal(s.fase, 'finita');
  const anna = f.righe[0];
  assert.ok(Math.abs(anna.totale - (20 + (s.crediti[0] - 6000) / 1000)) < 1e-12);
  assert.equal(f.ordine[0].nome, 'Anna', 'Anna ha vinto il contratto: +70 − costo');
  errore(() => A(P, { t: 'tavolo', g: s.turno, tipo: 'tessera' }), /finita/);
  errore(() => A(P, { t: 'punteggi', ep: [1, 1, 1, 1] }), /finita/);
});

prova('Borsa o spionaggio spenti: niente asta o niente compravendite', () => {
  const s = S(partita({ cfg: { spionaggio: false } }));
  assert.equal(s.fase, 'gioco');
  const P = asta(partita({ cfg: { borsa: false } }));
  errore(() => A(P, { t: 'compra', g: 0, e: 0 }), /spenta/);
});

prova('mercato testa a testa (pronto nel motore, spento nell’interfaccia): esito dalla classifica', () => {
  const T = CU.TIPI_MERCATO.testa;
  assert.equal(T.attivo, false);
  assert.equal(T.vince([2, 0, 1, 3, 4], { a: 0, b: 1 }), 0);
  assert.equal(T.vince([2, 1, 0, 3, 4], { a: 0, b: 1 }), 1);
  assert.equal(CU.TIPI_MERCATO.vincitore.vince([2, 1, 0, 3, 4]), 2);
});

console.log(`\n${ok} prove superate.`);
