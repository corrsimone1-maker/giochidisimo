// Simulazioni di bilanciamento per Codenames: Double Agents (giochi/codenames/motore.js).
// Uso, dalla cartella della repo:  node prove/codenames.bilanciamento.js [partite per configurazione]
//
// ATTENZIONE: è un modello, non Codenames vero. Le parole e le associazioni non si
// possono simulare: qui ogni indizio «punta» ad alcune carte e gli agenti le trovano
// con probabilità fissate (sotto, in MODELLO). Le regole invece sono quelle vere: ogni
// azione passa dal motore, quindi limiti di tentativi, intercettazioni, criptati,
// doppi agenti, punteggio e vittoria sono applicati esattamente come nell'app.
// I numeri servono a confrontare le configurazioni tra loro (chi inizia vince
// più spesso? quanto dura una partita? quanto pesa un'intercettazione?), non a
// prevedere percentuali assolute. Per questo c'è anche una prova di sensibilità.
'use strict';
const path = require('path');
const DA = require(path.join(__dirname, '..', 'giochi', 'codenames', 'motore.js'));
const N = +process.argv[2] || 20000;

/* PRNG riproducibile (mulberry32) */
function prng(seed) { let s = seed >>> 0; return n => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n); }; }
const u = r => r(1e9) / 1e9;

/* Parametri del modello di gioco (stime ragionevoli, non misure) */
const MODELLO = {
  numeri: [[1, .20], [2, .45], [3, .28], [4, .07]],    // quante parole collega un indizio
  centro: [.90, .82, .74, .66, .60],                   // prob. che l'i-esimo tocco sia una parola voluta
  pesoAssassino: .3,                                   // i capispia evitano gli indizi vicini all'assassino
  avanzo: { prob: .5, centro: .75 },                   // tentativo in più su parole indicate in turni precedenti
  deduzione: .5,                                       // prob. di capire che una propria parola, indicata dall'avversario, è un doppio
  intuito: { 1: .55, 2: .40, 3: .32, 4: .28 },         // prob. che l'intercettore indovini la prima parola voluta, per numero dell'indizio
  intuitoErrore: .03                                   // ...se invece gli agenti sbagliano parola al primo tocco
};

function pesca(r, pesi) { let x = u(r) * pesi.reduce((a, [, p]) => a + p, 0); for (const [v, p] of pesi) { x -= p; if (x <= 0) return v; } return pesi[pesi.length - 1][0]; }
function campione(r, a, k) { const b = DA.mescola(a, r); return b.slice(0, k); }

function simula(cfg, seed, M = MODELLO) {
  const r = prng(seed);
  let P = DA.nuovaPartita({ cfg, primo: 'R' }, r);
  const mappa = P.mappa;
  const mie = s => mappa.map((c, i) => (c === s || c === 'D') ? i : -1).filter(i => i >= 0);
  // conoscenza di ogni squadra: doppi sospettati o noti, esclusivi noti, parole indicate e non ancora trovate
  const K = { R: { dbl: new Set(), escl: new Set(), avanzi: new Set() }, B: { dbl: new Set(), escl: new Set(), avanzi: new Set() } };
  const A = ev => { P = DA.applica(P, ev); return DA.stato(P); };
  let S = DA.stato(P), guardia = 0;
  const st = { intTentate: 0, intRiuscite: 0, criptati: 0, deduzioni: 0 };
  while (S.fase !== 'finita' && guardia++ < 400) {
    const s = S.turno, o = DA.altra(s), k = K[s];
    const libere = mie(s).filter(i => !S.rivelata[i]);
    for (const x of [...k.dbl, ...k.escl, ...k.avanzi]) if (S.rivelata[x]) { k.dbl.delete(x); k.escl.delete(x); k.avanzi.delete(x); }
    // indagine al primo turno utile, su una parola non ancora classificata
    if (S.cfg.indagine && S.indagine[s] > 0) {
      const cand = libere.filter(i => !k.dbl.has(i) && !k.escl.has(i));
      if (cand.length) { const pos = cand[r(cand.length)]; S = A({ t: 'indagine', s, pos }); (mappa[pos] === 'D' ? k.dbl : k.escl).add(pos); }
    }
    // l'indizio: prima i doppi sospettati, poi parole a caso tra le proprie, gli esclusivi noti per ultimi
    const doppi = libere.filter(i => k.dbl.has(i));
    const altri = DA.mescola(libere.filter(i => !k.dbl.has(i) && !k.escl.has(i)), r);
    const sicuri = DA.mescola(libere.filter(i => k.escl.has(i)), r);
    const ordine = [...doppi, ...altri, ...sicuri];
    const puntiMiei = DA.punteggio(S.presi[s].e, S.presi[s].d);
    const usaCripto = S.cfg.criptati && S.cripto[s] > 0 && (doppi.length > 0 || puntiMiei >= S.cfg.soglia - 2);
    let n = Math.max(1, Math.min(ordine.length, usaCripto ? Math.min(2, pesca(r, M.numeri)) : pesca(r, M.numeri)));
    const voluti = ordine.slice(0, n);
    if (usaCripto) { S = A({ t: 'criptato', s, n, parola: 'X' }); st.criptati++; }
    else {
      S = A({ t: 'indizio', s, n });
      // chi ascolta può capire che alcune sue parole indicate dall'avversario sono doppi
      for (const x of voluti) if (mappa[x] === 'D' && u(r) < M.deduzione) { K[o].dbl.add(x); st.deduzioni++; }
    }
    // controspionaggio
    let bersaglio = null;
    if (S.fase === 'controspionaggio') {
      const sospetti = voluti.filter(x => K[o].dbl.has(x));
      const turniAvv = Math.max(1, Math.ceil((S.cfg.soglia - DA.punteggio(S.presi[s].e, S.presi[s].d)) / 1.8));
      const decide = sospetti.length ? .9 : Math.min(1, S.int[o] / turniAvv);
      if (u(r) < decide) bersaglio = sospetti.length ? sospetti[0] : 'intuito';
      // l'intercettazione «a intuito» si risolve al primo tocco (serve sapere che cosa toccano gli agenti)
      S = A({ t: 'intercetta', s: o, pos: typeof bersaglio === 'number' ? bersaglio : null });
      if (bersaglio !== null) st.intTentate++;
    }
    // gli agenti toccano: un tocco alla volta, dentro il limite del motore
    const daTrovare = DA.mescola(voluti, r);
    let i = 0, usaAvanzo = false;
    while (S.fase === 'tocchi' && S.turno === s) {
      const disp = daTrovare.filter(x => !S.rivelata[x]);
      let pos;
      if (disp.length) {
        if (u(r) < M.centro[Math.min(i, M.centro.length - 1)]) pos = disp[0];
        else {
          const resto = mappa.map((c, j) => j).filter(j => !S.rivelata[j] && !disp.includes(j));
          const pesi = resto.map(j => [j, mappa[j] === 'A' ? M.pesoAssassino : 1]);
          pos = pesca(r, pesi);
        }
      } else {
        // parole del turno trovate: un tentativo in più su un avanzo dei turni precedenti, oppure ci si ferma
        const av = [...k.avanzi].filter(x => !S.rivelata[x]);
        if (!usaAvanzo && av.length && S.tentativi < S.indizio.max && u(r) < M.avanzo.prob) {
          usaAvanzo = true;
          if (u(r) < M.avanzo.centro) pos = av[0];
          else { const resto = mappa.map((c, j) => j).filter(j => !S.rivelata[j]); pos = pesca(r, resto.map(j => [j, mappa[j] === 'A' ? M.pesoAssassino : 1])); }
        } else { S = A({ t: 'stop', s }); break; }
      }
      // intercettazione a intuito: piazzata adesso, quando si sa che cosa toccano gli agenti
      if (i === 0 && bersaglio === 'intuito') {
        const voluto = voluti.includes(pos);
        const prob = voluto ? M.intuito[Math.min(4, voluti.length)] : M.intuitoErrore;
        // ricostruisce l'evento di controspionaggio con la posizione giusta (o un'altra) al posto della rinuncia segnaposto
        P = Object.assign({}, P, { eventi: P.eventi.slice(0, -1) });
        const alt = mappa.map((c, j) => j).filter(j => !S.rivelata[j] && j !== pos && mappa[j] !== 'A');
        const scelta = mappa[pos] !== 'A' && u(r) < prob ? pos : alt[r(alt.length)];   // sull'assassino non si intercetta
        S = A({ t: 'intercetta', s: o, pos: scelta });
      }
      S = A({ t: 'tocco', s, pos, k: S.tentativi });
      if (S.ultimo && S.ultimo.esito === 'intercettata') st.intRiuscite++;
      i++;
    }
    // le parole indicate e non trovate diventano avanzi per i turni dopo
    for (const x of voluti) if (!S.rivelata[x]) k.avanzi.add(x);
  }
  const F = DA.finale(S);
  return { F, st, P };
}

function riassumi(nome, cfg, n = N, M = MODELLO, base = 1) {
  let vR = 0, turni = 0, assassino = 0, intT = 0, intR = 0, cri = 0, dedu = 0, dR = 0, dB = 0, tuttiDoppi = 0, bloccate = 0;
  for (let g = 0; g < n; g++) {
    const { F, st } = simula(cfg, base * 1e6 + g, M);
    if (!F.vincitore) { bloccate++; continue; }
    if (F.vincitore === 'R') vR++;
    turni += F.turni; if (F.motivo === 'assassino') assassino++;
    intT += st.intTentate; intR += st.intRiuscite; cri += st.criptati; dedu += st.deduzioni;
    dR += F.presi.R.d; dB += F.presi.B.d;
    if (F.presi[F.vincitore].d === 3) tuttiDoppi++;
  }
  const m = n - bloccate, p = vR / m, ic = 1.96 * Math.sqrt(p * (1 - p) / m);
  return { nome, p, ic, turni: turni / m, assassino: assassino / m, intT: intT / m, intR: intR / m, succ: intT ? intR / intT : 0, cri: cri / m, dR: dR / m, dB: dB / m, tuttiDoppi: tuttiDoppi / m, bloccate };
}
const pct = x => (100 * x).toFixed(1).padStart(5) + '%';
function stampa(r) {
  console.log(`${r.nome.padEnd(44)} inizia e vince ${pct(r.p)} ±${(100 * r.ic).toFixed(1)}  turni ${r.turni.toFixed(1).padStart(4)}  assassino ${pct(r.assassino)}  intercett. ${r.intT.toFixed(2)} (riuscite ${pct(r.succ)})  criptati ${r.cri.toFixed(2)}  doppi R/B ${r.dR.toFixed(2)}/${r.dB.toFixed(2)}` + (r.bloccate ? `  BLOCCATE ${r.bloccate}` : ''));
}

if (require.main === module) {
  const BASE = { intercettazioni: true, criptati: true, indagine: true, nInt: 3, nCripto: 2, soglia: 7, bonusRisposta: 0 };
  const conf = [
    ['Proposta originale (bonus 0)', BASE],
    ['Bonus a chi risponde: +1 intercettazione', { ...BASE, bonusRisposta: 1 }],
    ['Bonus a chi risponde: +2 intercettazioni', { ...BASE, bonusRisposta: 2 }],
    ['Senza meccaniche (solo doppi agenti)', { ...BASE, intercettazioni: false, criptati: false, indagine: false }],
    ['Senza intercettazioni', { ...BASE, intercettazioni: false }],
    ['2 intercettazioni', { ...BASE, nInt: 2 }],
    ['4 intercettazioni', { ...BASE, nInt: 4 }],
    ['Senza messaggi criptati', { ...BASE, criptati: false }],
    ['Senza indagine', { ...BASE, indagine: false }],
    ['Soglia 6', { ...BASE, soglia: 6 }],
    ['Soglia 6, bonus a chi risponde', { ...BASE, soglia: 6, bonusRisposta: 1 }]
  ];
  console.log(`Codenames: Double Agents — ${N} partite simulate per configurazione (Rossi iniziano sempre)\n`);
  conf.forEach(([nome, cfg], i) => stampa(riassumi(nome, cfg, N, MODELLO, i + 1)));

  console.log('\nSensibilità: vantaggio di chi inizia con agenti più o meno bravi e intercettori più o meno intuitivi');
  const varianti = [
    ['agenti bravi (+0,05), intuito basso', { centro: MODELLO.centro.map(x => x + .05), intuito: { 1: .4, 2: .3, 3: .24, 4: .2 } }],
    ['agenti bravi (+0,05), intuito alto', { centro: MODELLO.centro.map(x => x + .05), intuito: { 1: .7, 2: .5, 3: .42, 4: .36 } }],
    ['agenti incerti (−0,08), intuito basso', { centro: MODELLO.centro.map(x => x - .08), intuito: { 1: .4, 2: .3, 3: .24, 4: .2 } }],
    ['agenti incerti (−0,08), intuito alto', { centro: MODELLO.centro.map(x => x - .08), intuito: { 1: .7, 2: .5, 3: .42, 4: .36 } }]
  ];
  varianti.push(['partite lente (indizi più piccoli)', { numeri: [[1, .35], [2, .45], [3, .17], [4, .03]], centro: [.85, .75, .66, .6, .55] }]);
  varianti.forEach(([nome, d], i) => {
    const M = Object.assign({}, MODELLO, d), n = Math.round(N / 2);
    stampa(riassumi(`${nome} · bonus 0`, { ...BASE }, n, M, 100 + i));
    stampa(riassumi(`${nome} · bonus 1`, { ...BASE, bonusRisposta: 1 }, n, M, 100 + i));
    stampa(riassumi(`${nome} · bonus 2`, { ...BASE, bonusRisposta: 2 }, n, M, 100 + i));
  });
}
module.exports = { simula, riassumi, MODELLO };
