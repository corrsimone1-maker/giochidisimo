/* =====================================================================
   MENTAL · CODICE (deduzione alla «Mastermind», o il lucchetto con gli indizi)
   Un codice segreto e qualche tentativo già fatto, ognuno con la sua risposta: quanti simboli
   sono giusti al posto giusto e quanti giusti ma al posto sbagliato. Dai tentativi si ricava il
   codice, che è uno solo.

   Due stili:
     'lucchetto'  cifre da 0 a 9 tutte diverse, 3 o 4 cifre; le risposte sono scritte a parole;
     'colori'     da 6 a 8 colori, 4 o 5 posti, colori ripetibili; le risposte sono pallini
                  (● giusto al posto giusto, ○ giusto al posto sbagliato).
   Dati: { stile, L, K, rip, prove: [{ c: [simboli], n: al posto giusto, b: al posto sbagliato }] }
   Stato: { v: [simbolo o -1 per posto] }   (si consegna; ogni consegna sbagliata +1 minuto)

   Garanzie (controlla genera, ricontrolla conta): il codice compatibile con tutte le risposte è uno
   solo; nessun tentativo è il codice; togliendo un tentativo qualunque i codici possibili diventano
   più d'uno (ogni indizio serve).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  incrocio: { nome: 'Incrocio dei tentativi', descr: 'Confrontare due tentativi simili: la differenza nelle risposte dice quale simbolo conta.', peso: 3 },
  esclusione: { nome: 'Esclusione', descr: 'Un tentativo con risposta «niente» toglie di mezzo tutti i suoi simboli.', peso: 1 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se questo simbolo fosse qui…»: un altro tentativo lo smentisce.', peso: 4 }
};

/* Risposta di un tentativo t al codice s: [al posto giusto, giusti al posto sbagliato] */
function risposta(t, s, K) {
  let n = 0; const ct = Array(K).fill(0), cs = Array(K).fill(0);
  for (let i = 0; i < t.length; i++) { if (t[i] === s[i]) n++; ct[t[i]]++; cs[s[i]]++; }
  let tot = 0; for (let k = 0; k < K; k++) tot += Math.min(ct[k], cs[k]);
  return [n, tot - n];
}
/* Tutti i codici possibili */
const cacheCodici = {};
function codici(L, K, rip) {
  const key = L + '|' + K + '|' + rip;
  if (cacheCodici[key]) return cacheCodici[key];
  const out = [], c = [];
  const giro = () => {
    if (c.length === L) { out.push(c.slice()); return; }
    for (let k = 0; k < K; k++) { if (!rip && c.includes(k)) continue; c.push(k); giro(); c.pop(); }
  };
  giro();
  return (cacheCodici[key] = out);
}
const compatibili = (p, prove) => codici(p.L, p.K, p.rip).filter(s => prove.every(x => { const [n, b] = risposta(x.c, s, p.K); return n === x.n && b === x.b; }));

/* ---------------- Interfaccia comune ---------------- */
function nuovoStato(p) { return { v: Array(p.L).fill(-1), prove: [] }; }
function completo() { return false; }
function conflitti(p, st) {
  // nel lucchetto le cifre sono tutte diverse: due posti con la stessa cifra si segnalano
  if (p.rip) return [];
  const out = [];
  st.v.forEach((x, i) => { if (x >= 0 && st.v.some((y, j) => j !== i && y === x)) out.push(i); });
  return out;
}
function statoRisolto(p, sol) { return { v: sol.slice(), prove: [] }; }
function giusta(p, v) { const c = compatibili(p, p.prove); return c.length === 1 && Array.isArray(v) && v.every((x, i) => x === c[0][i]); }
function vuota(p, v) { return !Array.isArray(v) || v.some(x => x < 0); }
function soluzione(p) { const c = compatibili(p, p.prove)[0]; return { risposta: c ? c.join(p.stile === 'lucchetto' ? '' : ' ') : '', codice: c }; }
function conta(p, cap = 2) { const c = compatibili(p, p.prove); conta.ultima = c[0] || null; return Math.min(c.length, cap); }
/* Risolutore: non c'è un elenco di tecniche come nelle griglie; si misura quanto lavoro chiede
   il codice: quanti codici restano usando i tentativi uno alla volta, nell'ordine migliore. */
function risolvi(p) {
  const c = compatibili(p, p.prove);
  const conteggio = {};
  if (p.prove.some(x => x.n === 0 && x.b === 0)) conteggio.esclusione = 1;
  // tentativi che, da soli, lasciano molti codici: servono incroci
  const tutti = codici(p.L, p.K, p.rip).length;
  let difficili = 0;
  for (const x of p.prove) { const rest = compatibili(p, [x]).length; if (rest > tutti / 6) difficili++; }
  if (difficili) conteggio.incrocio = difficili;
  // necessità di ipotesi: nessun simbolo/posto si fissa usando i tentativi a coppie
  let fissati = false;
  for (let i = 0; i < p.prove.length && !fissati; i++) for (let j = i + 1; j < p.prove.length && !fissati; j++) {
    const cc = compatibili(p, [p.prove[i], p.prove[j]]);
    for (let q = 0; q < p.L && !fissati; q++) if (cc.length && cc.every(s => s[q] === cc[0][q])) fissati = true;
  }
  if (!fissati) conteggio.ipotesi = 1;
  return { risolto: c.length === 1, sol: c.length === 1 ? c[0] : null, passi: [], conteggio };
}
function livello(p) {
  if (p.stile === 'lucchetto') return p.L === 3 ? 'impegnativa' : 'esperta';
  return p.L >= 5 ? 'estrema' : 'esperta';
}
const MISURE = { impegnativa: [['lucchetto', 3, 10, false]], esperta: [['lucchetto', 4, 10, false], ['colori', 4, 6, true]], estrema: [['colori', 5, 7, true]] };

/* ---------------- Generatore ---------------- */
function genera(r, voluto, tentativi = 60) {
  for (let t = 0; t < tentativi; t++) {
    const [stile, L, K, rip] = r.scegli(MISURE[voluto]);
    const p = { stile, L, K, rip, prove: [] };
    const tutti = codici(L, K, rip);
    const segreto = r.scegli(tutti);
    let rest = tutti.slice();
    // tentativi a caso, scegliendo tra pochi candidati quello che lascia meno codici (ma non troppo
    // pochi: niente indizi che dicono quasi tutto)
    for (let k = 0; k < 14 && rest.length > 1; k++) {
      let migliore = null;
      for (let q = 0; q < 12; q++) {
        const g = r.scegli(r.f() < 0.5 ? rest : tutti);
        if (g.every((x, i) => x === segreto[i])) continue;
        const [n, b] = risposta(g, segreto, K);
        if (n + b === L && stile === 'lucchetto') continue;          // tutte le cifre giuste: troppo facile
        const dopo = rest.filter(s => { const [n2, b2] = risposta(g, s, K); return n2 === n && b2 === b; });
        if (dopo.length === rest.length) continue;
        const punteggio = Math.abs(Math.log(dopo.length + 1) - Math.log(rest.length) * 0.55) + r.f() * 0.4;
        if (!migliore || punteggio < migliore.punteggio) migliore = { g, n, b, dopo, punteggio };
      }
      if (!migliore) break;
      p.prove.push({ c: migliore.g.slice(), n: migliore.n, b: migliore.b });
      rest = migliore.dopo;
    }
    if (rest.length !== 1) continue;
    // ogni tentativo deve servire: si tolgono quelli superflui
    for (let i = p.prove.length - 1; i >= 0; i--) {
      const senza = p.prove.filter((_, j) => j !== i);
      if (compatibili(p, senza).length === 1) p.prove = senza;
    }
    const nMax = { impegnativa: 5, esperta: 6, estrema: 7 }[voluto], nMin = { impegnativa: 4, esperta: 4, estrema: 5 }[voluto];
    if (p.prove.length < nMin || p.prove.length > nMax) continue;
    p.prove = r.mescola(p.prove);
    const ris = risolvi(p);
    if (!ris.risolto || livello(p) !== voluto) continue;
    if (voluto !== 'impegnativa' && !ris.conteggio.incrocio) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !['lucchetto', 'colori'].includes(p.stile) || !Array.isArray(p.prove) || !p.prove.length) return 'forma';
  for (const x of p.prove) {
    if (!Array.isArray(x.c) || x.c.length !== p.L || x.c.some(k => !(k >= 0 && k < p.K))) return 'tentativo';
    if (!p.rip && new Set(x.c).size !== p.L) return 'cifre ripetute nel lucchetto';
  }
  const c = compatibili(p, p.prove);
  if (c.length !== 1) return 'codici possibili: ' + c.length;
  for (let i = 0; i < p.prove.length; i++) if (compatibili(p, p.prove.filter((_, j) => j !== i)).length === 1) return 'un tentativo non serve';
  return null;
}
/* Testo di una risposta, per il lucchetto */
const NUMERI = ['nessuna', 'una', 'due', 'tre', 'quattro'];
function aParole(n, b) {
  const tot = n + b;
  if (tot === 0) return 'nessuna cifra giusta';
  if (tot === 1) return n ? 'una cifra giusta, al posto giusto' : 'una cifra giusta, al posto sbagliato';
  const tutte = tot === 2 ? 'entrambe' : 'tutte e ' + NUMERI[tot];
  const resto = !b ? `${tutte} al posto giusto` : !n ? `${tutte} al posto sbagliato` : `${NUMERI[n]} al posto giusto e ${NUMERI[b]} al posto sbagliato`;
  return `${NUMERI[tot]} cifre giuste: ${resto}`;
}

const E = {
  id: 'codice', nome: 'Codice', tipo: 'codice', famiglia: 'logica', TECNICHE, MISURE,
  breve: 'Pochi tentativi con le loro risposte: ricava il codice segreto.',
  nomeDi: p => (p.stile === 'lucchetto' ? 'Lucchetto' : 'Codice a colori'),
  tipoDi: p => 'codice:' + p.stile,
  breveDi: p => (p.stile === 'lucchetto' ? 'Un lucchetto a combinazione e qualche indizio: trova la combinazione.' : 'Tentativi già fatti e le loro risposte: ricava il codice di colori.'),
  regoleDi: p => (p.stile === 'lucchetto' ? [
    `La combinazione ha <b>${p.L} cifre tutte diverse</b>, da 0 a 9.`,
    'Per ogni tentativo è scritto quante delle sue cifre ci sono nella combinazione, e quante di queste sono anche <b>al posto giusto</b>.',
    'Dagli indizi la combinazione è <b>una sola</b>. Componila e tocca <b>Consegna</b>: ogni consegna sbagliata aggiunge un minuto.'
  ] : [
    `Il codice ha <b>${p.L} posti</b>, ognuno di uno tra ${p.K} colori; lo stesso colore può ripetersi.`,
    'Per ogni tentativo, <b>●</b> conta i colori giusti al posto giusto, <b>○</b> quelli giusti ma al posto sbagliato (ogni colore del codice conta una volta sola).',
    'Il codice compatibile con tutte le risposte è <b>uno solo</b>. Componilo e tocca <b>Consegna</b>: ogni consegna sbagliata aggiunge un minuto.'
  ]),
  regole: ['Dai tentativi e dalle loro risposte si ricava il codice, che è uno solo.'],
  nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  giusta, vuota, soluzione, risposta, aParole, codici
};
if (M) M.motori.codice = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
