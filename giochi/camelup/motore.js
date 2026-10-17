/* =====================================================================
   CAMEL UP: ECONOMICS — motore di gioco
   Solo logica, niente pagina: lo usano giochi/camelup/index.html e le prove
   in node (prove/camelup.test.js). Tutto deterministico tranne le funzioni
   che generano i segreti (partenza, sequenze dei dadi, sale), che ricevono
   la funzione casuale come argomento.

   Idea dello stato: la partita salvata è
     { v, id, cfg, nomi, primo, partenza, tappe: { n: { seq, sale, hash } }, eventi: [] }
   e lo stato del gioco si ricava sempre rigiocando gli eventi dall'inizio
   (stato(partita)). Ogni evento cambia saldo, portafoglio e mercato insieme,
   quindi non esistono stati a metà; «Annulla» toglie l'ultimo evento, ma solo
   se è annullabile: l'asta segreta e lo spionaggio non si annullano, e i dadi
   sono già fissati a inizio tappa, quindi riestrarre dopo un annullamento dà
   lo stesso risultato.

   Soldi: i crediti sono tenuti in centesimi interi. Chi compra paga il costo
   LMSR arrotondato per eccesso, chi vende riceve il ricavo arrotondato per
   difetto: gli arrotondamenti vanno sempre a favore del banco (meno di un
   centesimo), quindi non si può guadagnare comprando e rivendendo.
   ===================================================================== */
(function () {
'use strict';

/* ---------------- Componenti ---------------- */
const CAMMELLI = [
  { id: 'blu', nome: 'Blu', colore: '#4C86E0' },
  { id: 'verde', nome: 'Verde', colore: '#4FAE6A' },
  { id: 'giallo', nome: 'Giallo', colore: '#E3C04A' },
  { id: 'rosso', nome: 'Rosso', colore: '#D85A4E' },
  { id: 'viola', nome: 'Viola', colore: '#9B6BD6' }
];
const GRIGIO = 5;   // indice del dado grigio; i dadi 0..4 sono quelli dei cammelli
const nomeDado = d => d === GRIGIO ? 'Grigio' : CAMMELLI[d].nome;

/* Prezzi d'apertura della Borsa: probabilità media di vincere la tappa per posto in
   classifica a inizio tappa, stimata simulando migliaia di corse della 2ª edizione
   (3.000 prime tappe, 13.825 tappe successive). Non guardano il tabellone: sono la
   stessa stima per ogni tappa con quella classifica. */
const APERTURA = {
  prima: [0.32, 0.21, 0.20, 0.18, 0.09],
  dopo: [0.495, 0.225, 0.15, 0.09, 0.04]
};

const AZIONI_TAVOLO = {
  tessera: 'Tessera scommessa di tappa',
  spettatore: 'Tessera spettatore',
  finale: 'Scommessa sul vincitore o sul perdente',
  partnership: 'Partnership',
  altro: 'Azione al tavolo'
};

/* Parametri. Quelli marcati sono diversi dalla prima proposta, con le simulazioni a supporto
   (vedi README e la schermata Regole): apertura dalla classifica invece che al 20% per tutti,
   capitale 60 invece di 40, interrogazioni 5/2/2 invece di 6/4/2. */
const DEF = {
  capitale: 60,           // crediti a testa (prima proposta: 40)
  R: 70,                  // quanto paga un contratto vincente
  b: 4,                   // liquidità del market maker
  tasso: 10,              // 10 crediti di guadagno = 1 sterlina egiziana
  spionaggio: true,
  borsa: true,
  maxAzioni: 2,           // operazioni di Borsa per giocatore per tappa
  maxContratti: 2,        // contratti tenuti insieme
  maxPerCammello: 1,
  finestraAcquisti: 2,    // si compra finché sono usciti al massimo 2 dadi
  finestraVendite: 4,     // si vende finché sono usciti al massimo 4 dadi
  apertura: 'classifica', // 'classifica' | 'uniforme' (prima proposta: uniforme)
  costi: { A: 5, B: 2, C: 2 }  // prossimo dado, dado escluso, precedenza (prima proposta: 6, 4, 2)
};
function configura(c) {
  const o = Object.assign({}, DEF, c || {});
  o.costi = Object.assign({}, DEF.costi, (c && c.costi) || {});
  return o;
}

/* ---------------- Casualità ---------------- */
/* Intero uniforme in [0, n): scarta i valori che distorcerebbero il modulo */
function randIntCrypto(n) {
  const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  do (globalThis.crypto || self.crypto).getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}
function mescola(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* Sequenza di una tappa: i sei dadi in ordine di uscita, ognuno col suo risultato.
   Il grigio ha sei facce: 1, 2, 3 bianche e 1, 2, 3 nere. */
function generaSequenza(rand) {
  return mescola([0, 1, 2, 3, 4, GRIGIO], rand).map(d => {
    if (d !== GRIGIO) return { d, v: 1 + rand(3) };
    const f = rand(6);
    return { d, v: 1 + (f % 3), col: f < 3 ? 'b' : 'n' };
  });
}
function generaSale(rand) { let s = ''; for (let i = 0; i < 32; i++) s += '0123456789abcdef'[rand(16)]; return s; }

/* Partenza (regolamento 2ª edizione): i dadi dei cammelli escono uno alla volta e ogni cammello
   va sulla casella 1, 2 o 3 del suo dado, sopra quelli già lì. Il grigio si tira per ciascun
   pazzo: 1 → casella 16, 2 → 15, 3 → 14; se finiscono sulla stessa casella il secondo va sopra. */
function generaPartenza(rand) {
  return {
    corsa: mescola([0, 1, 2, 3, 4], rand).map(c => ({ c, v: 1 + rand(3) })),
    pazzi: [{ c: 'bianco', v: 1 + rand(3) }, { c: 'nero', v: 1 + rand(3) }]
  };
}
/* Pile della partenza: { casella: [dal basso all'alto] } con 'bianco'/'nero' per i pazzi */
function pilePartenza(p) {
  const pile = {};
  for (const { c, v } of p.corsa) (pile[v] = pile[v] || []).push(c);
  for (const { c, v } of p.pazzi) (pile[17 - v] = pile[17 - v] || []).push(c);
  return pile;
}
function classificaPartenza(p) {
  const pile = pilePartenza(p), out = [];
  for (let k = 16; k >= 1; k--) { const s = pile[k] || []; for (let i = s.length - 1; i >= 0; i--) if (typeof s[i] === 'number') out.push(s[i]); }
  return out;
}

/* ---------------- SHA-256 (sincrono, per l'impegno sulla sequenza) ---------------- */
const K256 = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(str) {
  const bytes = Array.from(new TextEncoder().encode(str)), l = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64);
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) | 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
/* Testo su cui si calcola l'impegno: partita, tappa, sale e sequenza completa.
   Esempio: «camelup-economics|k3x9|2|9f…|blu3,grigio2n,verde1,…» */
const codiceDado = x => (x.d === GRIGIO ? 'grigio' : CAMMELLI[x.d].id) + x.v + (x.col || '');
function testoImpegno(id, tappa, sale, seq) { return `camelup-economics|${id}|${tappa}|${sale}|${seq.map(codiceDado).join(',')}`; }

/* ---------------- LMSR ---------------- */
/* C(q) = R·b·log Σ exp(q_i / b), calcolata con log-sum-exp. */
function lse(z) { let m = -Infinity; for (const x of z) if (x > m) m = x; let s = 0; for (const x of z) s += Math.exp(x - m); return m + Math.log(s); }
const Lmsr = {
  C: (q, b, R) => R * b * lse(q.map(x => x / b)),
  /* probabilità implicite: softmax(q / b); sommano a 1 e sono tutte positive */
  probabilita(q, b) { const z = q.map(x => x / b), m = Math.max(...z), e = z.map(x => Math.exp(x - m)), t = e.reduce((a, x) => a + x, 0); return e.map(x => x / t); },
  /* C(q + e_i) − C(q) = R·b·log(1 + p_i (e^{1/b} − 1)): stessa quantità, senza sottrarre numeri grandi */
  acquisto(q, i, b, R) { const p = Lmsr.probabilita(q, b)[i]; return R * b * Math.log1p(p * Math.expm1(1 / b)); },
  /* C(q) − C(q − e_i) = −R·b·log(1 + p_i (e^{−1/b} − 1)) */
  vendita(q, i, b, R) { const p = Lmsr.probabilita(q, b)[i]; return -R * b * Math.log1p(p * Math.expm1(-1 / b)); }
};
const centAcquisto = x => Math.ceil(x * 100 - 1e-6);
const centVendita = x => Math.floor(x * 100 + 1e-6);

/* ---------------- Tipi di mercato ----------------
   Ogni mercato è un LMSR su alcuni esiti, con un esito vincente ricavato dalla classifica
   di fine tappa. Oggi si gioca solo «vincitore». «testa» (un cammello davanti a un altro)
   è pronto qui ma non è ancora nell'interfaccia: per accenderlo servono le schermate e la
   scelta delle coppie. */
const TIPI_MERCATO = {
  vincitore: {
    attivo: true,
    esiti: () => 5,
    nomeEsito: e => CAMMELLI[e].nome,
    /* q iniziale: b·log(prior) dà prezzi d'apertura uguali alla prior */
    q0(cfg, tappa, classifica) {
      if (cfg.apertura === 'uniforme') return [0, 0, 0, 0, 0];
      const pr = tappa === 1 ? APERTURA.prima : APERTURA.dopo;
      return [0, 1, 2, 3, 4].map(c => cfg.b * Math.log(pr[classifica.indexOf(c)]));
    },
    vince: classifica => classifica[0]
  },
  testa: {
    attivo: false,
    esiti: () => 2,              // per la coppia (a, b): esito 0 «a davanti a b», esito 1 «b davanti ad a»
    nomeEsito: (e, m) => e === 0 ? `${CAMMELLI[m.a].nome} davanti a ${CAMMELLI[m.b].nome}` : `${CAMMELLI[m.b].nome} davanti a ${CAMMELLI[m.a].nome}`,
    q0: () => [0, 0],
    vince: (classifica, m) => classifica.indexOf(m.a) < classifica.indexOf(m.b) ? 0 : 1
  }
};
function idMercati(cfg) { return ['vincitore']; }

/* ---------------- Errori ---------------- */
class ErroreGioco extends Error {}
const no = m => { throw new ErroreGioco(m); };

/* ---------------- Partita ---------------- */
function nuovaPartita({ nomi, cfg, primo = 0, id }, rand) {
  if (!Array.isArray(nomi) || nomi.length < 2 || nomi.length > 8) no('Servono da 2 a 8 giocatori.');
  const P = {
    v: 1, id: id || generaSale(rand).slice(0, 8), creata: Date.now(), cfg: configura(cfg),
    nomi: nomi.slice(), primo: primo % nomi.length, partenza: generaPartenza(rand), tappe: {}, eventi: []
  };
  preparaTappa(P, 1, rand);
  return P;
}
/* Fissa la sequenza della tappa n (se non c'è già) e il suo impegno. Una volta fissata non cambia più,
   anche se si annulla e si rifà la liquidazione della tappa prima. */
function preparaTappa(P, n, rand) {
  if (P.tappe[n]) return P.tappe[n];
  const seq = generaSequenza(rand), sale = generaSale(rand);
  P.tappe[n] = { seq, sale, hash: sha256(testoImpegno(P.id, n, sale, seq)) };
  return P.tappe[n];
}
function verificaTappa(P, n) {
  const t = P.tappe[n]; if (!t) return false;
  return sha256(testoImpegno(P.id, n, t.sale, t.seq)) === t.hash;
}

const zeri = n => Array(n).fill(0);
const fmt = c => (c / 100).toFixed(2).replace('.', ',');
const somma = a => a.reduce((x, y) => x + y, 0);

function iniziale(P) {
  const n = P.nomi.length, cfg = P.cfg;
  const S = {
    n, nomi: P.nomi, cfg, fase: null, tappa: 0, primo: P.primo, turno: P.primo,
    estratti: 0, estrazioni: [], ultimoPiramide: null, fineCorsa: false,
    crediti: Array(n).fill(cfg.capitale * 100), creditiInizioTappa: null,
    mercati: {}, port: [], pagato: [], azioniBorsa: zeri(n), licenza: null, asta: null, azioniTappa: 0,
    classificaInizio: classificaPartenza(P.partenza), storiaPrezzi: [], cronologia: [], riepiloghi: [],
    stat: { spia: zeri(n), scambi: zeri(n), investimenti: [] }, ep: null, seq: null, ultimo: null
  };
  apriTappa(S, P, 1, S.classificaInizio);
  return S;
}
function log(S, testo, tipo = '') { S.cronologia.push({ tappa: S.tappa, testo, tipo }); }
function apriTappa(S, P, n, classifica) {
  const cfg = S.cfg;
  S.tappa = n; S.estratti = 0; S.estrazioni = []; S.classificaInizio = classifica.slice();
  S.seq = P.tappe[n] ? P.tappe[n].seq : null;
  S.mercati = {};
  for (const id of idMercati(cfg)) {
    const T = TIPI_MERCATO[id];
    S.mercati[id] = { id, q0: T.q0(cfg, n, classifica), qt: zeri(T.esiti()) };
  }
  S.port = S.nomi.map(() => { const o = {}; for (const id in S.mercati) o[id] = zeri(S.mercati[id].qt.length); return o; });
  S.pagato = S.nomi.map(() => { const o = {}; for (const id in S.mercati) o[id] = zeri(S.mercati[id].qt.length); return o; });
  S.azioniBorsa = zeri(S.n); S.licenza = null; S.asta = null; S.azioniTappa = 0;
  S.creditiInizioTappa = S.crediti.slice();
  S.storiaPrezzi = [prezzi(S)];
  S.turno = S.primo;
  S.fase = cfg.spionaggio ? 'asta' : 'gioco';
  log(S, `Inizia la tappa ${n}. Primo di turno: ${S.nomi[S.primo]}.`, 'tappa');
}
const qDi = m => m.q0.map((x, i) => x + m.qt[i]);
/* Probabilità implicite del mercato del vincitore */
function prezzi(S, id = 'vincitore') { const m = S.mercati[id]; return m ? Lmsr.probabilita(qDi(m), S.cfg.b) : null; }
function contratti(S, g, id = 'vincitore') { return somma(S.port[g][id]); }
function totaleContratti(S, g) { let t = 0; for (const id in S.port[g]) t += somma(S.port[g][id]); return t; }

/* Priorità di spareggio dell'asta: ruota di un posto a ogni tappa (tappa 1 dal primo giocatore inserito) */
function prioritaAsta(S) { const s = (S.tappa - 1) % S.n; return Array.from({ length: S.n }, (_, k) => (s + k) % S.n); }

/* ---------------- Controlli delle operazioni ---------------- */
function puoComprare(S, g, e, id = 'vincitore') {
  const cfg = S.cfg, m = S.mercati[id];
  if (!cfg.borsa) return { ok: false, motivo: 'La Borsa è spenta in questa partita.' };
  if (S.fase !== 'gioco') return { ok: false, motivo: 'La Borsa è chiusa.' };
  if (S.estratti > cfg.finestraAcquisti) return { ok: false, motivo: `Acquisti chiusi: sono già usciti ${S.estratti} dadi.` };
  if (S.azioniBorsa[g] >= cfg.maxAzioni) return { ok: false, motivo: `Hai già fatto ${cfg.maxAzioni} operazioni di Borsa in questa tappa.` };
  if (totaleContratti(S, g) >= cfg.maxContratti) return { ok: false, motivo: `Hai già ${cfg.maxContratti} contratti.` };
  if (S.port[g][id][e] >= cfg.maxPerCammello) return { ok: false, motivo: cfg.maxPerCammello === 1 ? `Hai già un contratto su ${TIPI_MERCATO[id].nomeEsito(e, m)}.` : `Hai già ${cfg.maxPerCammello} contratti su ${TIPI_MERCATO[id].nomeEsito(e, m)}.` };
  const cent = centAcquisto(Lmsr.acquisto(qDi(m), e, cfg.b, cfg.R));
  if (cent > S.crediti[g]) return { ok: false, motivo: `Crediti insufficienti: servono ${fmt(cent)}.`, cent };
  return { ok: true, cent };
}
function puoVendere(S, g, e, id = 'vincitore') {
  const cfg = S.cfg, m = S.mercati[id];
  if (!cfg.borsa) return { ok: false, motivo: 'La Borsa è spenta in questa partita.' };
  if (S.fase !== 'gioco') return { ok: false, motivo: 'La Borsa è chiusa.' };
  if (!S.port[g][id][e]) return { ok: false, motivo: 'Non hai contratti su questo esito.' };
  if (S.estratti > cfg.finestraVendite) return { ok: false, motivo: `Vendite chiuse: sono già usciti ${S.estratti} dadi.` };
  if (S.azioniBorsa[g] >= cfg.maxAzioni) return { ok: false, motivo: `Hai già fatto ${cfg.maxAzioni} operazioni di Borsa in questa tappa.` };
  return { ok: true, cent: centVendita(Lmsr.vendita(qDi(m), e, cfg.b, cfg.R)) };
}
/* Costo e ricavo di riferimento per un contratto (senza guardare chi compra) */
function quotazione(S, e, id = 'vincitore') {
  const m = S.mercati[id], q = qDi(m), cfg = S.cfg;
  const p = Lmsr.probabilita(q, cfg.b)[e];
  return {
    p, prezzo: p * cfg.R,
    acquisto: centAcquisto(Lmsr.acquisto(q, e, cfg.b, cfg.R)),
    vendita: m.qt[e] > 0 ? centVendita(Lmsr.vendita(q, e, cfg.b, cfg.R)) : null,
    emessi: m.qt[e]
  };
}
/* Fase della Borsa: 'aperta' | 'vendite' | 'chiusa' */
function statoBorsa(S) {
  if (!S.cfg.borsa) return 'spenta';
  if (S.fase !== 'gioco') return 'chiusa';
  if (S.estratti <= S.cfg.finestraAcquisti) return 'aperta';
  if (S.estratti <= S.cfg.finestraVendite) return 'vendite';
  return 'chiusa';
}

/* ---------------- Spionaggio ---------------- */
const SPIA = {
  A: { nome: 'Prossimo dado', desc: 'Quale dado uscirà alla prossima estrazione e con che numero (per il grigio anche il colore della faccia).' },
  B: { nome: 'Dado escluso', desc: 'Quale dado resterà nella piramide alla fine della tappa: quel cammello in questa tappa non si muove con il suo dado.' },
  C: { nome: 'Precedenza', desc: 'Scegli due dadi ancora nella piramide: scopri quale dei due esce prima. Il secondo potrebbe anche essere il dado escluso.' }
};
function opzioniSpia(S, g) {
  const out = {}, lic = S.licenza;
  for (const k of ['A', 'B', 'C']) {
    const costo = S.cfg.costi[k] * 100;
    let ok = true, motivo = '';
    if (S.fase !== 'gioco' || !lic || lic.di !== g || lic.usata || S.turno !== g) { ok = false; motivo = 'Non puoi usare la licenza adesso.'; }
    else if (k === 'B' && S.estratti >= 4) { ok = false; motivo = 'Restano due dadi: la Precedenza tra quei due dice la stessa cosa.'; }
    else if (costo > S.crediti[g]) { ok = false; motivo = `Crediti insufficienti: servono ${fmt(costo)}.`; }
    out[k] = { ok, motivo, costo };
  }
  return out;
}
const rimasti = S => S.seq ? S.seq.slice(S.estratti).map(x => x.d) : [];
/* Risposta a un'interrogazione, ricavata dalla sequenza già fissata */
function risposta(S, tipo, a, b) {
  const seq = S.seq;
  if (tipo === 'A') return { tipo, dado: Object.assign({}, seq[S.estratti]) };
  if (tipo === 'B') return { tipo, d: seq[5].d };
  if (tipo === 'C') { const ia = seq.findIndex(x => x.d === a), ib = seq.findIndex(x => x.d === b); return { tipo, prima: ia < ib ? a : b, dopo: ia < ib ? b : a }; }
  return null;
}

/* ---------------- Eventi ----------------
   asta {offerte}            fine dell'asta segreta per la licenza (non annullabile)
   primo {g}                 cambia chi inizia la tappa, prima della prima azione
   dado {g, k}               g estrae il dado k-esimo della tappa
   compra {g, e, m?}         g compra un contratto (mercato m, di base 'vincitore')
   vendi {g, e, m?}          g vende un contratto
   tavolo {g, tipo}          g fa un'azione del gioco fisico
   spia {g, tipo, a?, b?}    g usa la licenza prima della sua azione (non annullabile)
   traguardo {}              un cammello ha tagliato il traguardo: la corsa è finita
   liquida {classifica}      classifica di fine tappa dei cinque cammelli, dal primo all'ultimo
   punteggi {ep}             sterline egiziane finali di ciascuno */
const ANNULLABILI = new Set(['primo', 'dado', 'compra', 'vendi', 'tavolo', 'traguardo', 'liquida', 'punteggi']);

function avanti(S) { S.turno = (S.turno + 1) % S.n; S.azioniTappa++; }
function chiTocca(S, ev) {
  if (S.fase !== 'gioco') no(S.fase === 'liquidare' ? 'La tappa è finita: c’è da liquidare.' : 'Non è il momento.');
  if (ev.g !== S.turno) no(`Non è il turno di ${S.nomi[ev.g] || 'questo giocatore'}: tocca a ${S.nomi[S.turno]}.`);
}

function passo(S, ev, P) {
  if (S.fase === 'finita') no('La partita è finita.');
  const cfg = S.cfg, n = S.n;
  S.ultimo = ev;
  switch (ev.t) {
    case 'asta': {
      if (S.fase !== 'asta') no('Non c’è un’asta in corso.');
      const off = ev.offerte;
      if (!Array.isArray(off) || off.length !== n) no('Offerte non valide.');
      off.forEach((o, g) => { if (!Number.isInteger(o) || o < 0) no('Le offerte sono numeri interi di crediti.'); if (o * 100 > S.crediti[g]) no(`${S.nomi[g]} non ha abbastanza crediti per offrire ${o}.`); });
      const max = Math.max(...off);
      const pri = prioritaAsta(S);
      let vince = null;
      if (max > 0) vince = pri.find(g => off[g] === max);
      S.asta = { offerte: off.slice(), vince, priorita: pri };
      if (vince != null) {
        S.crediti[vince] -= max * 100; S.stat.spia[vince] += max * 100;
        S.licenza = { di: vince, prezzo: max, usata: false };
        const pari = off.filter(o => o === max).length > 1;
        log(S, `Asta: ${S.nomi[vince]} compra la licenza per ${max} crediti${pari ? ' (pareggio vinto per priorità)' : ''}.`, 'spia');
      } else log(S, 'Asta: nessuna offerta, niente licenza in questa tappa.', 'spia');
      S.fase = 'gioco';
      if (!S.seq) no('Manca la sequenza dei dadi della tappa.');
      return;
    }
    case 'primo': {
      if (S.fase !== 'asta' && S.fase !== 'gioco') no('Non è il momento.');
      if (S.azioniTappa > 0 || (S.licenza && S.licenza.usata)) no('La tappa è già cominciata.');
      if (!Number.isInteger(ev.g) || ev.g < 0 || ev.g >= n) no('Giocatore non valido.');
      S.primo = S.turno = ev.g;
      log(S, `Inizia ${S.nomi[ev.g]}.`, 'tappa');
      return;
    }
    case 'dado': {
      chiTocca(S, ev);
      if (ev.k !== S.estratti) no('Questo dado è già stato estratto.');
      const x = S.seq[S.estratti];
      S.estrazioni.push(Object.assign({ g: ev.g }, x));
      S.estratti++; S.ultimoPiramide = ev.g;
      log(S, `${S.nomi[ev.g]} estrae: ${nomeDado(x.d)} ${x.v}${x.col ? (x.col === 'b' ? ' bianco' : ' nero') : ''}.`, 'dado');
      avanti(S);
      if (S.estratti >= 5) { S.fase = 'liquidare'; log(S, 'Quinta estrazione: la tappa è finita.', 'tappa'); }
      return;
    }
    case 'compra': case 'vendi': {
      chiTocca(S, ev);
      const id = ev.m || 'vincitore', m = S.mercati[id];
      if (!m) no('Mercato sconosciuto.');
      if (!Number.isInteger(ev.e) || ev.e < 0 || ev.e >= m.qt.length) no('Esito non valido.');
      const T = TIPI_MERCATO[id], g = ev.g, e = ev.e;
      if (ev.t === 'compra') {
        const ck = puoComprare(S, g, e, id); if (!ck.ok) no(ck.motivo);
        S.crediti[g] -= ck.cent; S.port[g][id][e]++; S.pagato[g][id][e] += ck.cent; m.qt[e]++;
        log(S, `${S.nomi[g]} compra ${T.nomeEsito(e, m)} per ${fmt(ck.cent)}.`, 'borsa');
      } else {
        const ck = puoVendere(S, g, e, id); if (!ck.ok) no(ck.motivo);
        const k = S.port[g][id][e], costoMedio = Math.round(S.pagato[g][id][e] / k);
        S.crediti[g] += ck.cent; S.port[g][id][e]--; S.pagato[g][id][e] = k === 1 ? 0 : S.pagato[g][id][e] - costoMedio; m.qt[e]--;
        S.stat.investimenti.push({ g, tappa: S.tappa, m: id, e, costo: costoMedio, incasso: ck.cent, come: 'vendita' });
        log(S, `${S.nomi[g]} vende ${T.nomeEsito(e, m)} per ${fmt(ck.cent)}.`, 'borsa');
      }
      S.azioniBorsa[g]++; S.stat.scambi[g]++;
      S.storiaPrezzi.push(prezzi(S));
      avanti(S);
      return;
    }
    case 'tavolo': {
      chiTocca(S, ev);
      if (!AZIONI_TAVOLO[ev.tipo]) no('Azione sconosciuta.');
      if (ev.tipo === 'partnership' && n < 6) no('La partnership c’è solo dai 6 giocatori in su.');
      log(S, `${S.nomi[ev.g]}: ${AZIONI_TAVOLO[ev.tipo].toLowerCase()}.`, 'tavolo');
      avanti(S);
      return;
    }
    case 'spia': {
      chiTocca(S, ev);
      const op = opzioniSpia(S, ev.g)[ev.tipo];
      if (!op) no('Interrogazione sconosciuta.');
      if (!op.ok) no(op.motivo);
      if (ev.tipo === 'C') {
        const r = rimasti(S);
        if (ev.a === ev.b || !r.includes(ev.a) || !r.includes(ev.b)) no('Scegli due dadi diversi ancora nella piramide.');
      }
      S.crediti[ev.g] -= op.costo; S.stat.spia[ev.g] += op.costo;
      S.licenza.usata = true; S.licenza.estratti = S.estratti;
      log(S, `${S.nomi[ev.g]} usa la licenza di spionaggio (${fmt(op.costo)} crediti).`, 'spia');
      return;
    }
    case 'traguardo': {
      if (S.fase !== 'gioco' && S.fase !== 'liquidare') no('Non è il momento.');
      if (S.fineCorsa) no('La corsa è già finita.');
      if (!S.estratti) no('In questa tappa non si è ancora mosso nessun cammello.');
      S.fineCorsa = true; S.fase = 'liquidare';
      log(S, 'Un cammello ha tagliato il traguardo: la corsa è finita.', 'tappa');
      return;
    }
    case 'liquida': {
      if (S.fase !== 'liquidare') no('Non c’è una tappa da liquidare.');
      const cl = ev.classifica;
      if (!Array.isArray(cl) || cl.length !== 5 || [...cl].sort().join() !== '0,1,2,3,4') no('Serve la classifica completa dei cinque cammelli.');
      const pagamenti = zeri(n), tenuti = S.nomi.map(() => []);
      for (const id in S.mercati) {
        const m = S.mercati[id], T = TIPI_MERCATO[id], w = T.vince(cl, m);
        for (let g = 0; g < n; g++) {
          S.port[g][id].forEach((k, e) => {
            if (!k) return;
            const inc = e === w ? k * cfg.R * 100 : 0;
            pagamenti[g] += inc;
            tenuti[g].push({ m: id, e, k, vince: e === w });
            S.stat.investimenti.push({ g, tappa: S.tappa, m: id, e, costo: S.pagato[g][id][e], incasso: inc, come: 'liquidazione' });
          });
        }
      }
      for (let g = 0; g < n; g++) S.crediti[g] += pagamenti[g];
      const vince = cl[0];
      S.riepiloghi.push({
        tappa: S.tappa, classifica: cl.slice(), vince, pagamenti, tenuti, creditiInizio: S.creditiInizioTappa.slice(), creditiFine: S.crediti.slice(),
        asta: S.asta, licenzaDi: S.licenza ? S.licenza.di : null, estrazioni: S.estrazioni.slice(), fineCorsa: S.fineCorsa, ultimoPiramide: S.ultimoPiramide
      });
      log(S, `Tappa ${S.tappa} liquidata: vince ${CAMMELLI[vince].nome}.`, 'tappa');
      if (S.fineCorsa) { S.fase = 'punteggi'; S.seq = null; return; }
      if (S.ultimoPiramide != null) S.primo = (S.ultimoPiramide + 1) % n;
      apriTappa(S, P, S.tappa + 1, cl);
      if (!S.seq) no('Manca la sequenza dei dadi della tappa nuova.');
      return;
    }
    case 'punteggi': {
      if (S.fase !== 'punteggi') no('Non è il momento dei punteggi.');
      if (!Array.isArray(ev.ep) || ev.ep.length !== n || ev.ep.some(x => !Number.isFinite(x) || x < 0)) no('Servono le sterline di tutti (numeri da zero in su).');
      S.ep = ev.ep.slice(); S.fase = 'finita';
      log(S, 'Partita finita.', 'tappa');
      return;
    }
    default: no('Evento sconosciuto.');
  }
}

function stato(P) {
  const S = iniziale(P);
  for (const ev of P.eventi) passo(S, ev, P);
  return S;
}
/* Prova l'evento e, se è valido, restituisce la partita con l'evento aggiunto (altrimenti ErroreGioco) */
function applica(P, ev) {
  const S = stato(P);
  passo(S, ev, P);
  return Object.assign({}, P, { eventi: P.eventi.concat([ev]) });
}
function puoAnnullare(P) {
  const ev = P.eventi[P.eventi.length - 1];
  if (!ev) return { ok: false, motivo: 'Niente da annullare.' };
  if (!ANNULLABILI.has(ev.t)) return { ok: false, motivo: ev.t === 'asta' ? 'L’asta segreta non si annulla.' : 'L’uso della licenza non si annulla.' };
  return { ok: true, ev };
}
function annulla(P) {
  const c = puoAnnullare(P); if (!c.ok) no(c.motivo);
  return Object.assign({}, P, { eventi: P.eventi.slice(0, -1) });
}
/* Descrizione corta di un evento, per «Annulla …» */
function descrivi(P, ev) {
  const N = g => P.nomi[g];
  switch (ev.t) {
    case 'dado': return `l’estrazione di ${N(ev.g)}`;
    case 'compra': return `l’acquisto di ${N(ev.g)} (${CAMMELLI[ev.e].nome})`;
    case 'vendi': return `la vendita di ${N(ev.g)} (${CAMMELLI[ev.e].nome})`;
    case 'tavolo': return `l’azione al tavolo di ${N(ev.g)}`;
    case 'traguardo': return 'la fine della corsa';
    case 'liquida': return 'la liquidazione della tappa';
    case 'primo': return 'il cambio del primo giocatore';
    case 'punteggi': return 'i punteggi finali';
    default: return 'l’ultima azione';
  }
}

/* ---------------- Fine partita ---------------- */
function finale(S) {
  const cfg = S.cfg, base = cfg.capitale * 100;
  const righe = S.nomi.map((nome, g) => {
    const borsa = (S.crediti[g] - base) / (100 * cfg.tasso);
    return { g, nome, ep: S.ep ? S.ep[g] : 0, crediti: S.crediti[g], profitto: S.crediti[g] - base, borsa, totale: (S.ep ? S.ep[g] : 0) + borsa,
      spia: S.stat.spia[g], scambi: S.stat.scambi[g] };
  });
  const ordine = righe.slice().sort((a, b) => b.totale - a.totale || b.ep - a.ep);
  const inv = S.stat.investimenti.map(x => Object.assign({ profitto: x.incasso - x.costo }, x));
  const miglior = inv.length ? inv.reduce((a, b) => b.profitto > a.profitto ? b : a) : null;
  const peggior = inv.length ? inv.reduce((a, b) => b.profitto < a.profitto ? b : a) : null;
  return { righe, ordine, miglior, peggior };
}

const CU = {
  CAMMELLI, GRIGIO, APERTURA, AZIONI_TAVOLO, DEF, SPIA, TIPI_MERCATO, ErroreGioco,
  configura, nomeDado, randIntCrypto, mescola, generaSequenza, generaSale, generaPartenza, pilePartenza, classificaPartenza,
  sha256, testoImpegno, codiceDado, Lmsr, centAcquisto, centVendita,
  nuovaPartita, preparaTappa, verificaTappa, stato, applica, puoAnnullare, annulla, descrivi,
  prezzi, quotazione, puoComprare, puoVendere, statoBorsa, contratti, totaleContratti, prioritaAsta,
  opzioniSpia, risposta, rimasti, finale, fmt, qDi
};
if (typeof module !== 'undefined' && module.exports) module.exports = CU; else self.CU = CU;
})();
