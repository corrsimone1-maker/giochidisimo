/* =====================================================================
   MENTAL · ENIGMI scritti a mano (indovinelli, sciarade, problemi, probabilità…)
   Ogni enigma ha un testo, a volte una figura, e una risposta da scrivere. La risposta e la
   spiegazione stanno nel campo «ve», mescolate con il seme della sfida: non è una protezione, serve
   solo a non leggerle per sbaglio aprendo il file.

   Dati: { cat, forma, testo, figura?, campi?, opzioni?, unita?, seme, ve }
     cat     categoria (vedi CATEGORIE): decide il nome mostrato e la famiglia nel palinsesto;
     forma   come si risponde:
               'numero'   un numero (anche con la virgola se la risposta lo è);
               'frazione' una frazione a/b (o un intero), confrontata come numero razionale;
               'parola'   una parola o un'espressione (si ignorano maiuscole, accenti, articoli, spazi);
               'parole'   più parole, una per campo (campi: [etichetta…]);
               'ordine'   un ordine degli elementi di «opzioni» (si toccano in fila);
               'scelta'   una delle «opzioni».
     ve      { r, a, s } mescolato: r risposta (stringa, o lista per 'parole', lista di indici per
             'ordine', indice per 'scelta'), a varianti accettate (lista, o lista di liste per
             'parole'), s spiegazione (HTML).
   Stato: { v: risposta in corso, prove: [risposte sbagliate già consegnate] }

   Il catalogo da cui vengono sta in strumenti/mental-enigmi.js (con le verifiche).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const CATEGORIE = {
  indovinello: { nome: 'Indovinelli', famiglia: 'parole' },
  sciarada: { nome: 'Sciarade', famiglia: 'parole' },
  anagramma: { nome: 'Anagrammi', famiglia: 'parole' },
  cifrario: { nome: 'Cifrario', famiglia: 'parole' },
  problema: { nome: 'Problema', famiglia: 'numeri' },
  probabilita: { nome: 'Probabilità', famiglia: 'numeri' },
  contare: { nome: 'Contare', famiglia: 'numeri' },
  geometria: { nome: 'Geometria', famiglia: 'figure' },
  logica: { nome: 'Logica', famiglia: 'logica' },
  strategia: { nome: 'Strategia', famiglia: 'logica' }
};
const TECNICHE = {};

/* ---------------- Soluzione mescolata ---------------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function utf8(s) { return typeof TextEncoder !== 'undefined' ? Array.from(new TextEncoder().encode(s)) : Array.from(Buffer.from(s, 'utf8')); }
function daUtf8(b) { return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(new Uint8Array(b)) : Buffer.from(b).toString('utf8'); }
function chiave(seme, n) { const r = M.prng('enigma|' + seme); return Array.from({ length: n }, () => r(256)); }
function mescola(obj, seme) {
  const b = utf8(JSON.stringify(obj)), k = chiave(seme, b.length);
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const x = [0, 1, 2].map(j => (i + j < b.length ? b[i + j] ^ k[i + j] : 0)), resto = b.length - i;
    const n = (x[0] << 16) | (x[1] << 8) | x[2];
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (resto > 1 ? B64[(n >> 6) & 63] : '=') + (resto > 2 ? B64[n & 63] : '=');
  }
  return s;
}
function smescola(ve, seme) {
  const b = [];
  for (let i = 0; i < ve.length; i += 4) {
    const v = [0, 1, 2, 3].map(j => (ve[i + j] === '=' ? 0 : B64.indexOf(ve[i + j])));
    const n = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
    b.push((n >> 16) & 255); if (ve[i + 2] !== '=') b.push((n >> 8) & 255); if (ve[i + 3] !== '=') b.push(n & 255);
  }
  const k = chiave(seme, b.length);
  return JSON.parse(daUtf8(b.map((x, i) => x ^ k[i])));
}
const cache = new Map();
function segreto(p) { if (!cache.has(p.ve)) cache.set(p.ve, smescola(p.ve, p.seme)); return cache.get(p.ve); }

/* ---------------- Confronto delle risposte ---------------- */
const ARTICOLI = /^(il|lo|la|i|gli|le|l|un|uno|una|del|della|dello|dei|degli|delle)\s+/;
function normParola(s) {
  let x = String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  x = x.replace(/[’'`]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (let k = 0; k < 2; k++) x = x.replace(ARTICOLI, '');
  return x.replace(/ /g, '');
}
/* Numeri scritti all'italiana: «1.392», «1392», «2,5», «-3» */
function leggiNumero(s) {
  let x = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x)) x = x.replace(/\./g, '');
  x = x.replace(',', '.');
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(x)) return null;
  return x;
}
/* Razionale esatto da «a/b», intero o decimale: [num, den] ridotti (BigInt) */
function razionale(s) {
  const t = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/−/g, '-').replace(':', '/');
  const m = /^(-?\d+)\/(-?\d+)$/.exec(t);
  let n, d;
  if (m) { n = BigInt(m[1]); d = BigInt(m[2]); if (d === 0n) return null; }
  else {
    const x = leggiNumero(t); if (x == null) return null;
    const [a, b = ''] = x.replace('-', '').split('.');
    n = BigInt((a || '0') + b) * (x.startsWith('-') ? -1n : 1n); d = 10n ** BigInt(b.length);
  }
  if (d < 0n) { n = -n; d = -d; }
  const mcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; };
  const g = mcd(n, d) || 1n;
  return [n / g, d / g];
}
function ugualeNumero(a, b) { const x = leggiNumero(a), y = leggiNumero(b); return x != null && y != null && Math.abs(Number(x) - Number(y)) < 1e-9; }
function ugualeFrazione(a, b) { const x = razionale(a), y = razionale(b); return !!x && !!y && x[0] === y[0] && x[1] === y[1]; }

function giusta(p, v) {
  const S = segreto(p);
  switch (p.forma) {
    case 'numero': return [S.r, ...(S.a || [])].some(x => ugualeNumero(v, x));
    case 'frazione': return [S.r, ...(S.a || [])].some(x => ugualeFrazione(v, x));
    case 'parola': return [S.r, ...(S.a || [])].some(x => normParola(x) === normParola(v) && normParola(v) !== '');
    case 'parole': return Array.isArray(v) && S.r.every((x, i) => [x, ...((S.a || [])[i] || [])].some(y => normParola(y) === normParola(v[i]) && normParola(v[i]) !== ''));
    case 'ordine': return Array.isArray(v) && v.length === S.r.length && v.every((x, i) => x === S.r[i]);
    case 'scelta': return v === S.r;
  }
  return false;
}
/* Quali campi sono giusti (per 'parole'): la pagina li segna dopo una consegna sbagliata */
function campiGiusti(p, v) {
  const S = segreto(p);
  if (p.forma !== 'parole' || !Array.isArray(v)) return [];
  return S.r.map((x, i) => [x, ...((S.a || [])[i] || [])].some(y => normParola(y) === normParola(v[i]) && normParola(v[i]) !== ''));
}
/* Risposta da mostrare (testo) e spiegazione (HTML) */
function soluzione(p) {
  const S = segreto(p);
  let r = S.r;
  if (p.forma === 'parole') r = S.r.join(' · ');
  else if (p.forma === 'ordine') r = S.r.map(i => p.opzioni[i]).join(' → ');
  else if (p.forma === 'scelta') r = p.opzioni[S.r];
  return { risposta: String(r) + (p.unita && (p.forma === 'numero' || p.forma === 'frazione') ? ' ' + p.unita : ''), spiegazione: S.s || '' };
}
function vuota(p, v) {
  if (p.forma === 'parole') return !Array.isArray(v) || v.some(x => !normParola(x));
  if (p.forma === 'ordine') return !Array.isArray(v) || v.length !== p.opzioni.length;
  if (p.forma === 'scelta') return v == null || v < 0;
  return String(v == null ? '' : v).trim() === '';
}

/* ---------------- Interfaccia comune dei motori ---------------- */
function nuovoStato(p) { return { v: p.forma === 'parole' ? p.campi.map(() => '') : p.forma === 'ordine' ? [] : p.forma === 'scelta' ? -1 : '', prove: [] }; }
function completo() { return false; }                 // si consegna
function conflitti() { return []; }
function statoRisolto(p) { const S = segreto(p); return { v: S.r, prove: [] }; }
function conta() { conta.ultima = null; return 1; }    // la verifica degli enigmi sta nel catalogo
function risolvi(p) { return { risolto: true, sol: null, passi: [], conteggio: {} }; }
function livello(p) { return p.livello || null; }
function valida(p) {
  if (!p || !CATEGORIE[p.cat]) return 'categoria';
  if (!['numero', 'frazione', 'parola', 'parole', 'ordine', 'scelta'].includes(p.forma)) return 'forma';
  if (typeof p.testo !== 'string' || p.testo.length < 10) return 'testo';
  let S; try { S = segreto(p); } catch (e) { return 'soluzione illeggibile'; }
  if (p.forma === 'parole' && (!Array.isArray(p.campi) || !Array.isArray(S.r) || S.r.length !== p.campi.length)) return 'campi';
  if (p.forma === 'ordine' && (!Array.isArray(p.opzioni) || !Array.isArray(S.r) || [...S.r].sort((a, b) => a - b).join() !== p.opzioni.map((_, i) => i).join())) return 'ordine';
  if (p.forma === 'scelta' && (!Array.isArray(p.opzioni) || !(S.r >= 0 && S.r < p.opzioni.length))) return 'scelta';
  if (!giusta(p, S.r)) return 'la risposta non passa il suo stesso controllo';
  return null;
}
/* Prepara i dati pubblicabili da una voce del catalogo */
function daCatalogo(e, seme) {
  const p = { id: e.id, cat: e.cat, forma: e.forma, testo: e.testo, seme };
  for (const k of ['figura', 'campi', 'opzioni', 'unita', 'tastiera']) if (e[k] != null) p[k] = e[k];
  p.ve = mescola({ r: e.risposta, a: e.accetta || [], s: e.spiegazione || '' }, seme);
  return p;
}

const E = {
  id: 'enigma', nome: 'Enigma', tipo: 'risposta', famiglia: 'parole', TECNICHE, MISURE: {}, CATEGORIE,
  breve: 'Un enigma scritto a mano: leggi bene e rispondi.',
  regole: [
    'Leggi il testo con calma: c’è tutto quello che serve, e la risposta è <b>una sola</b>.',
    'Scrivi la risposta e tocca <b>Consegna</b>. Ogni consegna sbagliata aggiunge <b>un minuto</b>.',
    'Maiuscole, accenti e articoli non contano.'
  ],
  nomeDi: p => (CATEGORIE[p.cat] ? CATEGORIE[p.cat].nome : 'Enigma'),
  tipoDi: p => 'enigma:' + p.cat,
  famigliaDi: p => (CATEGORIE[p.cat] ? CATEGORIE[p.cat].famiglia : 'parole'),
  breveDi: p => ({ indovinello: 'Indovinelli da sciogliere: una parola per ognuno.', sciarada: 'Il primo, il secondo, l’intero: componi le parole.', anagramma: 'Lettere mescolate e un indizio per rimetterle in ordine.', cifrario: 'Un messaggio cifrato da decifrare.', problema: 'Un problema da risolvere ragionando: la risposta è un numero.', probabilita: 'Una probabilità da calcolare esattamente.', contare: 'Contare bene, senza dimenticare niente e senza contare due volte.', geometria: 'Una figura e un numero da trovare.', logica: 'Un problema di logica con una sola risposta.', strategia: 'Trova la mossa o il piano migliore.' }[p.cat] || 'Un enigma da risolvere.'),
  nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, valida,
  giusta, campiGiusti, soluzione, vuota, daCatalogo, mescola, smescola, normParola, razionale, leggiNumero
};
if (M) M.motori.enigma = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
