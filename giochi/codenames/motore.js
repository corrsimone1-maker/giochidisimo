/* =====================================================================
   CODENAMES: DOUBLE AGENTS — motore di gioco
   Solo logica, niente pagina: lo usano giochi/codenames/index.html, le prove
   (prove/codenames.test.js) e le simulazioni (prove/codenames.bilanciamento.js).
   Tutto deterministico tranne la generazione della mappa, che riceve la
   funzione casuale come argomento.

   La partita salvata è
     { v, id, cfg, mappa, primo, eventi: [], svelate: [], annullati }
   - mappa: 25 categorie vere, una per posizione (A1 = 0, B1 = 1, …, E5 = 24):
       'R' agente solo rosso, 'B' agente solo blu, 'D' doppio agente (di tutte e due),
       'N' neutrale, 'A' assassino. La conosce solo il motore.
   - eventi: le azioni confermate; lo stato si ricava sempre rigiocandole
     dall'inizio (stato(P)), quindi non esistono stati a metà.
   - svelate: posizioni di tocchi annullati. La carta era già stata mostrata a
     tutti: annullare corregge punteggio e turno, non il segreto, e da lì in poi
     l'identità di quella carta resta pubblica.

   Eventi (s = squadra che agisce, 'R' o 'B'):
     { t: 'indagine',   s, pos }        capospia: la sua parola è un doppio agente?
     { t: 'indizio',    s, n, parola }  indizio pubblico (n da 1 a 9; 0 e 'inf' con le regole avanzate)
     { t: 'criptato',   s, n, parola }  messaggio criptato (n = 1 o 2)
     { t: 'intercetta', s, pos }        capospia avversario: pos da intercettare, o null per rinunciare
     { t: 'tocco',      s, pos, k }     agenti: la carta toccata (k = numero del tentativo, contro i doppi tocchi)
     { t: 'stop',       s }             agenti: si fermano dopo almeno un tentativo

   Privacy. vistaPubblica(S) è tutto ciò che può comparire sulla plancia;
   vistaPrivata(S, s) è la mappa del capospia s. Le prove controllano che non
   dipendano da ciò che non devono sapere (dove sono i doppi, se e dove è stata
   messa un'intercettazione, il contenuto di un messaggio criptato, l'esito di
   un'indagine).
   ===================================================================== */
(function () {
'use strict';

/* ---------------- Componenti ---------------- */
const SQUADRE = ['R', 'B'];
const altra = s => (s === 'R' ? 'B' : 'R');
const NOMI = {
  R: { plur: 'Rossi', agg: 'rosso', sq: 'squadra rossa' },
  B: { plur: 'Blu', agg: 'blu', sq: 'squadra blu' }
};
const COMPOSIZIONE = { R: 7, B: 7, D: 3, N: 7, A: 1 };
const LATO = 5, CELLE = 25;
const etichetta = pos => 'ABCDE'[pos % LATO] + (Math.floor(pos / LATO) + 1);

/* Parametri di base. Quelli diversi dalla proposta originale sono spiegati nel
   regolamento (capitolo «Scelte di bilanciamento») e in prove/codenames.bilanciamento.js. */
const DEF = {
  intercettazioni: true,   // meccanica Interceptions
  criptati: true,          // meccanica Encrypted Messages
  indagine: true,          // meccanica Investigation
  nInt: 3,                 // intercettazioni per squadra
  nCripto: 2,              // messaggi criptati per squadra
  soglia: 7,               // punti intelligence per vincere
  bonusRisposta: 1,        // intercettazioni in più per chi gioca per secondo (proposta originale: 0)
  avanzati: false          // indizi 0 e ∞ delle regole avanzate di Codenames
};
/* La soglia non supera 7: con i soli 7 agenti esclusivi una squadra deve poter
   sempre vincere, anche se perde tutti i doppi agenti. */
const LIMITI = { nInt: [0, 5], nCripto: [0, 4], soglia: [5, 7], bonusRisposta: [0, 2] };
function configura(c) {
  const o = Object.assign({}, DEF);
  if (c && typeof c === 'object') {
    for (const k of ['intercettazioni', 'criptati', 'indagine', 'avanzati']) if (typeof c[k] === 'boolean') o[k] = c[k];
    for (const k in LIMITI) if (Number.isInteger(c[k])) o[k] = Math.min(LIMITI[k][1], Math.max(LIMITI[k][0], c[k]));
  }
  return o;
}

/* Punti intelligence: un punto per agente, più un bonus (una volta sola) dal secondo doppio.
   Con tre doppi coincide con e + d + ⌊d/2⌋. */
const punteggio = (e, d) => e + d + (d >= 2 ? 1 : 0);

/* ---------------- Casualità ---------------- */
/* Intero uniforme in [0, n): scarta i valori che distorcerebbero il modulo */
function randIntCrypto(n) {
  const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  do (globalThis.crypto || self.crypto).getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}
/* Fisher–Yates: ogni permutazione delle 25 posizioni è ugualmente probabile, quindi lo è
   anche ogni assegnazione delle categorie (ognuna ha 7!·7!·3!·7!·1! permutazioni che la danno). */
function mescola(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function generaMappa(rand) {
  const m = [];
  for (const k of ['R', 'B', 'D', 'N', 'A']) for (let i = 0; i < COMPOSIZIONE[k]; i++) m.push(k);
  return mescola(m, rand);
}
function generaId(rand) { let s = ''; for (let i = 0; i < 10; i++) s += '0123456789abcdef'[rand(16)]; return s; }
function mappaValida(m) {
  if (!Array.isArray(m) || m.length !== CELLE) return false;
  const n = { R: 0, B: 0, D: 0, N: 0, A: 0 };
  for (const c of m) { if (!(c in n)) return false; n[c]++; }
  return Object.keys(COMPOSIZIONE).every(k => n[k] === COMPOSIZIONE[k]);
}

/* ---------------- Errori ---------------- */
class ErroreGioco extends Error {}
const no = m => { throw new ErroreGioco(m); };

/* La parola di un indizio: una parola (al massimo due, per nomi come «New York»), niente frasi */
function pulisciParola(p) {
  if (p == null) return '';
  const t = String(p).trim().replace(/\s+/g, ' ');
  if (!t) return '';
  if (t.length > 24 || !/^[\p{L}\p{N}'’\-]+( [\p{L}\p{N}'’\-]+)?$/u.test(t)) no('L’indizio è una sola parola (niente frasi né simboli)');
  return t;
}

/* ---------------- Partita ---------------- */
function nuovaPartita({ cfg, primo, id } = {}, rand) {
  const c = configura(cfg);
  const p = primo === 'R' || primo === 'B' ? primo : (rand(2) ? 'B' : 'R');
  return { v: 1, id: id || generaId(rand), cfg: c, mappa: generaMappa(rand), primo: p, eventi: [], svelate: [], annullati: 0 };
}

function iniziale(P) {
  if (!P || !mappaValida(P.mappa) || (P.primo !== 'R' && P.primo !== 'B')) no('Partita salvata non valida');
  const cfg = configura(P.cfg), sec = altra(P.primo);
  const S = {
    cfg, mappa: P.mappa.slice(), primo: P.primo,
    turno: P.primo, nTurno: 1, fase: 'indizio',
    rivelata: Array(CELLE).fill(false),   // la carta è coperta da una tessera (presa, neutrale o assassino)
    presa: Array(CELLE).fill(null),       // squadra che ha preso l'agente
    presi: { R: { e: 0, d: 0 }, B: { e: 0, d: 0 } },
    int: { R: cfg.intercettazioni ? cfg.nInt : 0, B: cfg.intercettazioni ? cfg.nInt : 0 },
    cripto: { R: cfg.criptati ? cfg.nCripto : 0, B: cfg.criptati ? cfg.nCripto : 0 },
    indagine: { R: cfg.indagine ? 1 : 0, B: cfg.indagine ? 1 : 0 },
    indagini: { R: null, B: null },       // privato: { pos, doppio, nTurno }
    indizio: null,                        // { modo: 'pubblico'|'criptato', n, parola, max }
    intercetto: null,                     // privato finché non si tocca: { da, pos } (pos null = rinuncia)
    tentativi: 0, esitoIntercetto: null,  // esito pubblico dopo il primo tocco: 'nessuna'|'fallita'|'riuscita'
    vincitore: null, motivo: null,
    ultimo: null,
    stat: {
      intRiuscite: { R: 0, B: 0 }, intFallite: { R: 0, B: 0 }, intRinunce: { R: 0, B: 0 },
      criptati: { R: 0, B: 0 }, indagini: { R: 0, B: 0 }, turni: { R: 0, B: 0 }
    },
    cronologia: [],
    svelate: Array(CELLE).fill(false),
    annullati: P.annullati || 0
  };
  if (cfg.intercettazioni) S.int[sec] += cfg.bonusRisposta;
  for (const x of P.svelate || []) if (Number.isInteger(x) && x >= 0 && x < CELLE) S.svelate[x] = true;
  return S;
}

const punti = (S, s) => punteggio(S.presi[s].e, S.presi[s].d);
const libera = (S, pos) => Number.isInteger(pos) && pos >= 0 && pos < CELLE && !S.rivelata[pos];
const mia = (S, s, pos) => S.mappa[pos] === s || S.mappa[pos] === 'D';
function log(S, s, testo, tipo = '') { S.cronologia.push({ n: S.nTurno, s, testo, tipo }); }
const testoIndizio = ind => (ind.parola ? `«${ind.parola.toLocaleUpperCase('it')}» · ` : '') + (ind.n === 'inf' ? '∞' : ind.n);

function fineTurno(S) {
  S.stat.turni[S.turno]++;
  S.turno = altra(S.turno); S.nTurno++; S.fase = 'indizio';
  S.indizio = null; S.intercetto = null; S.tentativi = 0; S.esitoIntercetto = null;
}

function passo(S, ev) {
  if (!ev || typeof ev !== 'object') no('Azione non valida');
  if (S.fase === 'finita') no('La partita è finita');
  const s = ev.s;
  if (s !== 'R' && s !== 'B') no('Squadra non valida');
  const N = NOMI[s];
  switch (ev.t) {
    case 'indagine': {
      if (!S.cfg.indagine) no('L’indagine non è attiva in questa partita');
      if (S.fase !== 'indizio' || s !== S.turno) no('L’indagine si usa all’inizio del proprio turno, prima dell’indizio');
      if (S.indagine[s] < 1) no('L’indagine è già stata usata');
      if (!libera(S, ev.pos)) no('Quella parola non è più in gioco');
      if (!mia(S, s, ev.pos)) no('Si indaga solo su una propria parola');
      S.indagine[s]--; S.stat.indagini[s]++;
      S.indagini[s] = { pos: ev.pos, doppio: S.mappa[ev.pos] === 'D', nTurno: S.nTurno };
      log(S, s, `Il capospia ${N.agg} ha usato l’indagine.`, 'indagine');
      S.ultimo = { t: 'indagine', s };
      return;
    }
    case 'indizio': {
      if (S.fase !== 'indizio' || s !== S.turno) no('Non è il momento dell’indizio per questa squadra');
      const n = ev.n;
      if (!((Number.isInteger(n) && n >= 1 && n <= 9) || (S.cfg.avanzati && (n === 0 || n === 'inf')))) no('Numero dell’indizio non valido');
      const parola = pulisciParola(ev.parola);
      S.indizio = { modo: 'pubblico', n, parola, max: n === 0 || n === 'inf' ? Infinity : n + 1 };
      S.tentativi = 0; S.intercetto = null; S.esitoIntercetto = null;
      S.fase = S.cfg.intercettazioni && S.int[altra(s)] > 0 ? 'controspionaggio' : 'tocchi';
      log(S, s, `Indizio ${N.agg}: ${testoIndizio(S.indizio)}.`, 'indizio');
      S.ultimo = { t: 'indizio', s };
      return;
    }
    case 'criptato': {
      if (!S.cfg.criptati) no('I messaggi criptati non sono attivi in questa partita');
      if (S.fase !== 'indizio' || s !== S.turno) no('Non è il momento dell’indizio per questa squadra');
      if (S.cripto[s] < 1) no('Messaggi criptati finiti');
      if (ev.n !== 1 && ev.n !== 2) no('Un messaggio criptato vale 1 o 2');
      const parola = pulisciParola(ev.parola);
      if (!parola) no('Scrivi la parola dell’indizio');
      S.cripto[s]--; S.stat.criptati[s]++;
      S.indizio = { modo: 'criptato', n: ev.n, parola, max: ev.n + 1 };
      S.tentativi = 0; S.intercetto = null; S.esitoIntercetto = null; S.fase = 'tocchi';
      log(S, s, `Messaggio criptato dei ${N.plur}: non si può intercettare.`, 'criptato');
      S.ultimo = { t: 'criptato', s };
      return;
    }
    case 'intercetta': {
      if (S.fase !== 'controspionaggio') no('Non è il momento del controspionaggio');
      if (s !== altra(S.turno)) no('Si intercetta solo la squadra avversaria');
      const pos = ev.pos === undefined ? null : ev.pos;
      if (pos !== null) {
        if (S.int[s] < 1) no('Intercettazioni finite');
        if (!libera(S, pos)) no('Si intercetta solo una parola ancora in gioco');
        if (S.mappa[pos] === 'A') no('Sull’assassino non si intercetta');
      }
      S.intercetto = { da: s, pos };
      S.fase = 'tocchi';
      log(S, s, `Controspionaggio ${N.agg}: decisione registrata.`, 'contro');
      S.ultimo = { t: 'intercetta', s };
      return;
    }
    case 'tocco': {
      if (S.fase !== 'tocchi' || s !== S.turno) no('Non è il turno di questa squadra');
      if (ev.k !== undefined && ev.k !== S.tentativi) no('Tocco già registrato');
      if (!libera(S, ev.pos)) no('Quella carta è già coperta');
      if (S.tentativi >= S.indizio.max) no('Tentativi finiti per questo indizio');
      const pos = ev.pos, o = altra(s), primo = S.tentativi === 0;
      const ult = { t: 'tocco', s, pos, k: S.tentativi, intercetto: null, esito: null, fine: null, guadagno: { R: 0, B: 0 } };
      if (primo && S.intercetto) {
        const da = S.intercetto.da;
        if (S.intercetto.pos === null) { S.stat.intRinunce[da]++; S.esitoIntercetto = ult.intercetto = 'nessuna'; }
        else {
          S.int[da]--;
          if (S.intercetto.pos === pos) {
            S.stat.intRiuscite[da]++; S.esitoIntercetto = ult.intercetto = 'riuscita';
            S.tentativi++;
            ult.esito = 'intercettata'; ult.fine = 'intercettazione';
            log(S, da, `Intercettazione ${NOMI[da].agg} riuscita su ${etichetta(pos)}: la carta resta in gioco, turno ${N.agg} finito.`, 'int-ok');
            S.ultimo = ult;
            fineTurno(S);
            return;
          }
          S.stat.intFallite[da]++; S.esitoIntercetto = ult.intercetto = 'fallita';
          log(S, da, `Intercettazione ${NOMI[da].agg} fallita.`, 'int-ko');
        }
      }
      S.tentativi++;
      const c = S.mappa[pos], prima = { R: punti(S, 'R'), B: punti(S, 'B') };
      S.rivelata[pos] = true;
      if (c === 'A') {
        ult.esito = 'assassino'; S.vincitore = o; S.motivo = 'assassino';
        log(S, s, `${etichetta(pos)}: l’assassino. I ${N.plur} perdono.`, 'assassino');
      } else if (c === 'N') {
        ult.esito = 'neutrale'; ult.fine = 'errore';
        log(S, s, `${etichetta(pos)}: neutrale. Turno ${N.agg} finito.`, 'neutrale');
      } else if (c === 'D') {
        S.presa[pos] = s; S.presi[s].d++; ult.esito = 'doppio';
        log(S, s, `${etichetta(pos)}: doppio agente catturato dai ${N.plur}!`, 'doppio');
      } else if (c === s) {
        S.presa[pos] = s; S.presi[s].e++; ult.esito = 'proprio';
        log(S, s, `${etichetta(pos)}: agente ${N.agg}.`, 'proprio');
      } else {
        S.presa[pos] = o; S.presi[o].e++; ult.esito = 'avversario'; ult.fine = 'errore';
        log(S, s, `${etichetta(pos)}: agente ${NOMI[o].agg}, punto ai ${NOMI[o].plur}. Turno ${N.agg} finito.`, 'avversario');
      }
      for (const x of SQUADRE) ult.guadagno[x] = punti(S, x) - prima[x];
      if (!S.vincitore) for (const x of SQUADRE) if (punti(S, x) >= S.cfg.soglia) { S.vincitore = x; S.motivo = 'soglia'; }
      if (S.vincitore) {
        S.fase = 'finita'; ult.fine = 'vittoria';
        S.stat.turni[S.turno]++;
        if (S.motivo === 'soglia') log(S, S.vincitore, `I ${NOMI[S.vincitore].plur} arrivano a ${punti(S, S.vincitore)} punti e vincono.`, 'vittoria');
      } else if (ult.fine) fineTurno(S);
      else if (S.tentativi >= S.indizio.max) { ult.fine = 'limite'; log(S, s, `Tentativi finiti: turno ${N.agg} concluso.`, 'fine'); fineTurno(S); }
      S.ultimo = ult;
      return;
    }
    case 'stop': {
      if (S.fase !== 'tocchi' || s !== S.turno) no('Non è il turno di questa squadra');
      if (S.tentativi < 1) no('Prima serve almeno un tentativo');
      log(S, s, `I ${N.plur} si fermano.`, 'fine');
      S.ultimo = { t: 'stop', s };
      fineTurno(S);
      return;
    }
    default: no('Azione sconosciuta');
  }
}

function stato(P) {
  const S = iniziale(P);
  for (const ev of P.eventi || []) passo(S, ev);
  return S;
}
function clona(P) { return Object.assign({}, P, { eventi: P.eventi.slice(), svelate: (P.svelate || []).slice() }); }
/* Aggiunge un evento: se il motore lo rifiuta, la partita non cambia */
function applica(P, ev) {
  const S = stato(P);
  passo(S, ev);
  const Q = clona(P);
  Q.eventi.push(Object.assign({}, ev));
  return Q;
}

/* ---------------- Annullare ---------------- */
/* Non si annullano le azioni che hanno mostrato un segreto a qualcuno che non lo
   avrebbe potuto vedere altrimenti:
   - l'indagine (il capospia ha già letto la risposta);
   - il messaggio criptato (gli agenti l'hanno già letto; e non si recupera, da regolamento);
   - il primo tocco di un turno con un'intercettazione piazzata: l'esito ha già detto a
     tutti dov'era (riuscita) o dove non era (fallita).
   Gli altri tocchi si annullano, ma la carta è stata vista da tutti: diventa «svelata». */
const ANNULLABILI = new Set(['indizio', 'intercetta', 'tocco', 'stop']);
function prima(P) { return Object.assign({}, P, { eventi: P.eventi.slice(0, -1) }); }
function puoAnnullare(P) {
  const ev = P && P.eventi && P.eventi[P.eventi.length - 1];
  if (!ev || !ANNULLABILI.has(ev.t)) return false;
  if (ev.t === 'tocco') {
    const S0 = stato(prima(P));
    if (S0.tentativi === 0 && S0.intercetto && S0.intercetto.pos !== null) return false;
  }
  return true;
}
function annulla(P) {
  if (!puoAnnullare(P)) no('Questa azione non si può annullare');
  const ev = P.eventi[P.eventi.length - 1];
  const Q = clona(P);
  Q.eventi.pop();
  if (ev.t === 'tocco' && !Q.svelate.includes(ev.pos)) Q.svelate.push(ev.pos);
  Q.annullati = (P.annullati || 0) + 1;
  return Q;
}
const NOMI_CAT = { R: 'un agente rosso', B: 'un agente blu', D: 'un doppio agente', N: 'un neutrale', A: 'l’assassino' };
/* Descrizione dell'ultima azione per la conferma di «Annulla»: niente che non sia già pubblico */
function descrivi(P) {
  const ev = P.eventi[P.eventi.length - 1];
  if (!ev) return '';
  const N = NOMI[ev.s] || NOMI.R;
  switch (ev.t) {
    case 'indagine': return `l’indagine del capospia ${N.agg}`;
    case 'indizio': return `l’indizio ${N.agg} ${testoIndizio({ n: ev.n, parola: ev.parola })}`;
    case 'criptato': return `il messaggio criptato dei ${N.plur}`;
    case 'intercetta': return `la decisione del controspionaggio ${N.agg}`;
    case 'tocco': return `il tocco dei ${N.plur} su ${etichetta(ev.pos)} (era ${NOMI_CAT[P.mappa[ev.pos]]}: resterà noto a tutti)`;
    case 'stop': return `la fine del turno ${N.agg}`;
    default: return 'l’ultima azione';
  }
}

/* ---------------- Viste ---------------- */
/* Tutto ciò che si può mostrare a chiunque guardi la plancia */
function vistaPubblica(S) {
  const ind = S.indizio;
  const u = S.ultimo;
  let ultimo = null;
  if (u) ultimo = u.t === 'tocco' ? JSON.parse(JSON.stringify(u)) : { t: u.t, s: u.s };
  return {
    turno: S.turno, nTurno: S.nTurno, fase: S.fase, primo: S.primo, soglia: S.cfg.soglia,
    celle: S.mappa.map((c, i) => ({
      pos: i, et: etichetta(i),
      rivelata: S.rivelata[i] ? c : null,
      presa: S.presa[i],
      nota: !S.rivelata[i] && S.svelate[i] ? c : null
    })),
    punti: { R: punti(S, 'R'), B: punti(S, 'B') },
    presi: { R: Object.assign({}, S.presi.R), B: Object.assign({}, S.presi.B) },
    risorse: { int: Object.assign({}, S.int), cripto: Object.assign({}, S.cripto), indagine: Object.assign({}, S.indagine) },
    indizio: ind ? (ind.modo === 'pubblico' ? { modo: 'pubblico', n: ind.n, parola: ind.parola, max: ind.max } : { modo: 'criptato' }) : null,
    tentativi: S.tentativi, esitoIntercetto: S.esitoIntercetto,
    vincitore: S.vincitore, motivo: S.motivo,
    ultimo,
    cronologia: S.cronologia.map(x => Object.assign({}, x)),
    stat: JSON.parse(JSON.stringify(S.stat)), annullati: S.annullati,
    cfg: Object.assign({}, S.cfg)
  };
}
/* La mappa del capospia s: le sue 10 parole tutte uguali (esclusivi e doppi), l'assassino,
   le altre 14 sconosciute; più ciò che è pubblico e l'esito della sua indagine. */
function vistaPrivata(S, s) {
  const ind = S.indagini[s];
  return S.mappa.map((c, i) => ({
    pos: i, et: etichetta(i),
    tipo: c === 'A' ? 'assassino' : (c === s || c === 'D') ? 'mio' : 'ignoto',
    rivelata: S.rivelata[i] ? c : null,
    presa: S.presa[i],
    nota: !S.rivelata[i] && S.svelate[i] ? c : null,
    indagata: ind && ind.pos === i ? (ind.doppio ? 'doppio' : 'esclusivo') : null
  }));
}
/* Il messaggio criptato in corso, per gli agenti della squadra che l'ha ricevuto */
function messaggio(S, s) {
  const ind = S.indizio;
  if (!ind || ind.modo !== 'criptato' || S.turno !== s || S.fase !== 'tocchi') return null;
  return { parola: ind.parola, n: ind.n, max: ind.max };
}
/* Cosa si può fare adesso */
function azioni(S) {
  const s = S.turno, o = altra(s), f = S.fase;
  return {
    indagine: f === 'indizio' && S.cfg.indagine && S.indagine[s] > 0,
    indizio: f === 'indizio',
    criptato: f === 'indizio' && S.cfg.criptati && S.cripto[s] > 0,
    intercetta: f === 'controspionaggio' && S.int[o] > 0,
    tocco: f === 'tocchi' && S.tentativi < (S.indizio ? S.indizio.max : 0),
    stop: f === 'tocchi' && S.tentativi > 0,
    rimasti: f === 'tocchi' && S.indizio ? S.indizio.max - S.tentativi : 0
  };
}

/* ---------------- Fine partita ---------------- */
function finale(S) {
  return {
    vincitore: S.vincitore, motivo: S.motivo, soglia: S.cfg.soglia,
    punti: { R: punti(S, 'R'), B: punti(S, 'B') },
    presi: { R: Object.assign({}, S.presi.R), B: Object.assign({}, S.presi.B) },
    stat: JSON.parse(JSON.stringify(S.stat)), turni: S.nTurno, annullati: S.annullati,
    cfg: Object.assign({}, S.cfg), primo: S.primo
  };
}
/* Debriefing: tutta la storia, segreti compresi. Solo a partita finita. */
function debriefing(P) {
  const Sf = stato(P);
  if (Sf.fase !== 'finita') no('Il debriefing si apre solo a partita finita');
  const S = iniziale(P), righe = [];
  for (const ev of P.eventi) {
    const n = S.nTurno, att = S.turno;
    passo(S, ev);
    const r = { n, att, t: ev.t, s: ev.s };
    if (ev.t === 'indagine') Object.assign(r, { pos: ev.pos, doppio: P.mappa[ev.pos] === 'D' });
    else if (ev.t === 'indizio' || ev.t === 'criptato') Object.assign(r, { num: ev.n, parola: pulisciParola(ev.parola) });
    else if (ev.t === 'intercetta') Object.assign(r, { pos: ev.pos === undefined ? null : ev.pos });
    else if (ev.t === 'tocco') Object.assign(r, { pos: ev.pos, cat: P.mappa[ev.pos], esito: S.ultimo.esito, intercetto: S.ultimo.intercetto, fine: S.ultimo.fine });
    righe.push(r);
  }
  return { mappa: P.mappa.slice(), svelate: (P.svelate || []).slice(), annullati: P.annullati || 0, righe, finale: finale(Sf), indagini: { R: Sf.indagini.R, B: Sf.indagini.B } };
}

const DA = {
  SQUADRE, NOMI, COMPOSIZIONE, DEF, LIMITI, ErroreGioco,
  altra, etichetta, configura, punteggio, randIntCrypto, mescola, generaMappa, mappaValida, pulisciParola,
  nuovaPartita, stato, applica, puoAnnullare, annulla, descrivi,
  vistaPubblica, vistaPrivata, messaggio, azioni, finale, debriefing, testoIndizio
};
if (typeof module !== 'undefined' && module.exports) module.exports = DA; else self.DA = DA;
})();
