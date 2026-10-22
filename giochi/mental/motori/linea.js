/* =====================================================================
   MENTAL · IN FILA (ordinare persone o cose da indizi)
   Cinque, sei o sette elementi in fila (chi arriva prima a una festa, chi abita a quale piano, libri
   su uno scaffale, ciclisti al traguardo). Gli indizi dicono chi viene prima di chi, chi è subito
   dopo, quanti ce ne sono in mezzo… L'ordine compatibile con tutti gli indizi è uno solo.

   Dati: { tema, nomi: [elementi], ind: [indizio] }    indizi (a, b, c indici in nomi):
     { t: 'prima', a, b }        a prima di b (non per forza subito)
     { t: 'subito', a, b }       b subito dopo a
     { t: 'lontani', a, b }      a e b non sono vicini
     { t: 'tra', a, b, k }       tra a e b ci sono esattamente k elementi (k ≥ 1)
     { t: 'posto', a, k }        a è al posto k (da 0)
     { t: 'nonposto', a, k }     a non è al posto k
     { t: 'estremo', a }         a è primo o ultimo
     { t: 'mezzo', a, b, c }     a sta tra b e c (in qualunque verso)
   Risposta: l'ordine, come lista di indici in nomi dal primo all'ultimo (forma 'ordine').
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  diretta: { nome: 'Lettura diretta', descr: 'Un indizio fissa un posto, o tiene insieme due elementi.', peso: 1 },
  esclusione: { nome: 'Esclusione', descr: 'Incrociando gli indizi, un elemento non può stare in certi posti; un posto resta a un solo elemento.', peso: 2 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se fosse qui…»: seguendo gli indizi si arriva a una contraddizione.', peso: 5 }
};
const ORD = ['primo', 'secondo', 'terzo', 'quarto', 'quinto', 'sesto', 'settimo'];
const TEMI = {
  festa: {
    intro: n => `${numero(n)} amici arrivano a una festa, uno alla volta. In che ordine arrivano?`,
    nomi: ['Ada', 'Bruno', 'Carla', 'Dario', 'Elena', 'Fabio', 'Gaia', 'Ivo', 'Lia', 'Marco', 'Nora', 'Paolo', 'Rita', 'Sergio', 'Tea', 'Ugo'],
    prima: (a, b) => `${a} arriva prima di ${b}.`, subito: (a, b) => `${b} arriva subito dopo ${a}.`,
    lontani: (a, b) => `${a} e ${b} non arrivano uno subito dopo l’altro.`, tra: (a, b, k) => `Tra l’arrivo di ${a} e quello di ${b} arriva${k > 1 ? 'no' : ''} esattamente ${k === 1 ? 'una persona' : numero(k).toLowerCase() + ' persone'}.`,
    posto: (a, k) => `${a} arriva in ${ORD[k]} posizione.`.replace('in primo posizione', 'in prima posizione').replace(/in (\w+)o posizione/, (m, x) => `in ${x}a posizione`),
    nonposto: (a, k) => `${a} non arriva in ${ORD[k].replace(/o$/, 'a')} posizione.`,
    estremo: a => `L’arrivo di ${a} è il primo oppure l’ultimo.`, mezzo: (a, b, c) => `${a} arriva dopo uno tra ${b} e ${c} e prima dell’altro.`
  },
  palazzo: {
    intro: n => `${numero(n)} amici abitano in un palazzo di ${numero(n).toLowerCase()} piani, uno per piano, dal 1° (il più basso) al ${n}°. Chi abita a quale piano? Mettili in ordine dal 1° piano in su.`,
    nomi: ['Alba', 'Bea', 'Ciro', 'Dina', 'Enzo', 'Furio', 'Gemma', 'Iris', 'Leo', 'Mia', 'Nino', 'Olga', 'Pino', 'Rosa', 'Teo', 'Vera'],
    prima: (a, b) => `${a} abita più in basso di ${b}.`, subito: (a, b) => `${b} abita al piano subito sopra quello di ${a}.`,
    lontani: (a, b) => `${a} e ${b} non abitano a piani vicini.`, tra: (a, b, k) => `Tra il piano di ${a} e quello di ${b} ${k === 1 ? 'c’è esattamente un piano' : 'ci sono esattamente ' + numero(k).toLowerCase() + ' piani'}.`,
    posto: (a, k) => `${a} abita al ${k + 1}° piano.`, nonposto: (a, k) => `${a} non abita al ${k + 1}° piano.`,
    estremo: a => `${a} abita al primo piano oppure all’ultimo.`, mezzo: (a, b, c) => `${a} abita più in alto di uno tra ${b} e ${c} e più in basso dell’altro.`
  },
  scaffale: {
    intro: n => `Su uno scaffale ci sono ${numero(n).toLowerCase()} libri in fila, ognuno di un colore diverso. In che ordine sono, da sinistra a destra?`,
    nomi: ['rosso', 'blu', 'verde', 'giallo', 'nero', 'bianco', 'viola', 'grigio', 'arancione', 'marrone'],
    prima: (a, b) => `${maiu(il(a))} sta più a sinistra ${del(b)}.`, subito: (a, b) => `${maiu(il(b))} sta subito a destra ${del(a)}.`,
    lontani: (a, b) => `${maiu(il(a))} e ${il(b)} non sono vicini.`, tra: (a, b, k) => `Tra ${il(a)} e ${il(b)} ${k === 1 ? 'c’è esattamente un libro' : 'ci sono esattamente ' + numero(k).toLowerCase() + ' libri'}.`,
    posto: (a, k) => `${maiu(il(a))} è il ${ORD[k]} da sinistra.`, nonposto: (a, k) => `${maiu(il(a))} non è il ${ORD[k]} da sinistra.`,
    estremo: a => `${maiu(il(a))} sta a uno dei due estremi dello scaffale.`, mezzo: (a, b, c) => `${maiu(il(a))} sta tra ${il(b)} e ${il(c)} (non per forza vicino).`
  },
  gara: {
    intro: n => `${numero(n)} ciclisti tagliano il traguardo uno dopo l’altro, senza arrivi a pari merito. Qual è l’ordine d’arrivo?`,
    nomi: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Gallo', 'Conti', 'Costa', 'Fontana'],
    prima: (a, b) => `${a} arriva prima di ${b}.`, subito: (a, b) => `${b} arriva subito dopo ${a}.`,
    lontani: (a, b) => `${a} e ${b} non arrivano uno dietro l’altro.`, tra: (a, b, k) => `Tra ${a} e ${b} arriva${k > 1 ? 'no' : ''} esattamente ${k === 1 ? 'un altro ciclista' : numero(k).toLowerCase() + ' ciclisti'}.`,
    posto: (a, k) => `${a} arriva ${ORD[k]}.`, nonposto: (a, k) => `${a} non arriva ${ORD[k]}.`,
    estremo: a => `${a} arriva primo oppure ultimo.`, mezzo: (a, b, c) => `${a} arriva tra ${b} e ${c} (non per forza subito).`
  }
};
const vocale = x => /^[aeiou]/i.test(x);
const il = x => (vocale(x) ? 'l’' : 'il ') + x, del = x => (vocale(x) ? 'dell’' : 'del ') + x, maiu = x => x.charAt(0).toUpperCase() + x.slice(1);
function numero(n) { return ['Zero', 'Uno', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto'][n]; }

/* ---------------- Indizi ---------------- */
function vale(x, pos) {                        // pos[elemento] = posto
  const pa = pos[x.a], pb = pos[x.b];
  switch (x.t) {
    case 'prima': return pa < pb;
    case 'subito': return pb === pa + 1;
    case 'lontani': return Math.abs(pa - pb) > 1;
    case 'tra': return Math.abs(pa - pb) === x.k + 1;
    case 'posto': return pa === x.k;
    case 'nonposto': return pa !== x.k;
    case 'estremo': return pa === 0 || pa === pos.length - 1;
    case 'mezzo': { const pc = pos[x.c]; return (pb < pa && pa < pc) || (pc < pa && pa < pb); }
  }
  return false;
}
const coinvolti = x => [x.a, x.b, x.c].filter(v => v != null);
function testoIndizio(p, x) {
  const T = TEMI[p.tema], n = i => p.nomi[i];
  switch (x.t) {
    case 'prima': return T.prima(n(x.a), n(x.b));
    case 'subito': return T.subito(n(x.a), n(x.b));
    case 'lontani': return T.lontani(n(x.a), n(x.b));
    case 'tra': return T.tra(n(x.a), n(x.b), x.k);
    case 'posto': return T.posto(n(x.a), x.k);
    case 'nonposto': return T.nonposto(n(x.a), x.k);
    case 'estremo': return T.estremo(n(x.a));
    case 'mezzo': return T.mezzo(n(x.a), n(x.b), n(x.c));
  }
  return '';
}
const permCache = {};
function permutazioni(n) {
  if (permCache[n]) return permCache[n];
  const out = [], a = [...Array(n).keys()];
  const g = k => { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; g(k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
  g(0);
  return (permCache[n] = out);
}
/* ordini compatibili (come pos[elemento] = posto) */
function compatibili(p, ind = p.ind) { return permutazioni(p.nomi.length).filter(pos => ind.every(x => vale(x, pos))); }
const ordineDa = pos => { const o = []; pos.forEach((k, e) => { o[k] = e; }); return o; };

/* ---------------- Risolutore «umano» (domini di posti per elemento) ---------------- */
function propaga(p, dom, conteggio) {
  const n = p.nomi.length;
  for (let giro = true; giro;) {
    giro = false;
    for (const x of p.ind) {
      const cc = coinvolti(x);
      for (const e of cc) for (const v of [...dom[e]]) {
        // c'è un modo di mettere gli altri coinvolti (in posti diversi) che rispetti l'indizio?
        const altri = cc.filter(f => f !== e);
        let ok = false;
        const pos = Array(n).fill(-1); pos[e] = v;
        const prova = i => {
          if (i === altri.length) { const pp = pos.slice(); return vale(x, pp); }
          for (const w of dom[altri[i]]) { if (pos.includes(w)) continue; pos[altri[i]] = w; if (prova(i + 1)) return true; pos[altri[i]] = -1; }
          return false;
        };
        // per gli indizi su un solo elemento basta il posto
        ok = prova(0);
        if (!ok) { dom[e].delete(v); giro = true; if (conteggio) conteggio[x.t === 'posto' || x.t === 'subito' ? 'diretta' : 'esclusione'] = (conteggio[x.t === 'posto' || x.t === 'subito' ? 'diretta' : 'esclusione'] || 0) + 1; }
        if (!dom[e].size) return false;
      }
    }
    // posti già presi e posti con un solo candidato
    for (let e = 0; e < n; e++) if (dom[e].size === 1) { const v = [...dom[e]][0]; for (let f = 0; f < n; f++) if (f !== e && dom[f].delete(v)) { giro = true; if (!dom[f].size) return false; } }
    for (let v = 0; v < n; v++) {
      const chi = []; for (let e = 0; e < n; e++) if (dom[e].has(v)) chi.push(e);
      if (!chi.length) return false;
      if (chi.length === 1 && dom[chi[0]].size > 1) { dom[chi[0]] = new Set([v]); giro = true; if (conteggio) conteggio.esclusione = (conteggio.esclusione || 0) + 1; }
    }
  }
  return true;
}
function risolvi(p) {
  const n = p.nomi.length, conteggio = {};
  let dom = Array.from({ length: n }, () => new Set([...Array(n).keys()]));
  if (!propaga(p, dom, conteggio)) return { risolto: false, passi: [], conteggio };
  for (let giri = 0; giri < 30 && dom.some(d => d.size > 1); giri++) {
    let fatto = false;
    for (let e = 0; e < n && !fatto; e++) for (const v of [...dom[e]]) {
      if (dom[e].size < 2) break;
      const copia = dom.map(d => new Set(d)); copia[e] = new Set([v]);
      if (!propaga(p, copia)) { dom[e].delete(v); conteggio.ipotesi = (conteggio.ipotesi || 0) + 1; fatto = true; break; }
    }
    if (!fatto || !propaga(p, dom, conteggio)) break;
  }
  const risolto = dom.every(d => d.size === 1);
  const pos = risolto ? dom.map(d => [...d][0]) : null;
  return { risolto: risolto && p.ind.every(x => vale(x, pos)), sol: risolto ? ordineDa(pos) : null, passi: [], conteggio };
}

/* ---------------- Interfaccia comune ---------------- */
function nuovoStato() { return { v: [], prove: [] }; }
function completo() { return false; }
function conflitti() { return []; }
function statoRisolto(p, sol) { return { v: sol.slice(), prove: [] }; }
function conta(p, cap = 2) { const c = compatibili(p); conta.ultima = c.length ? ordineDa(c[0]) : null; return Math.min(cap, c.length); }
function giusta(p, v) { const c = compatibili(p); return c.length === 1 && Array.isArray(v) && ordineDa(c[0]).every((x, i) => x === v[i]); }
function vuota(p, v) { return !Array.isArray(v) || v.length !== p.nomi.length; }
function soluzione(p) { const o = ordineDa(compatibili(p)[0]); return { risposta: o.map(i => p.nomi[i]).join(' → ') }; }
function livello(p, ris) {
  const n = p.nomi.length, ip = ris.conteggio.ipotesi || 0;
  if (n >= 7 && ip >= 1) return 'estrema';
  if (n === 6 && ip <= 2) return 'esperta';
  if (n === 5 && ip === 0) return 'impegnativa';
  return null;
}
const MISURE = { impegnativa: [5], esperta: [6], estrema: [7] };
function genera(r, voluto, tentativi = 200) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto]), tema = r.scegli(Object.keys(TEMI));
    const nomi = r.mescola(TEMI[tema].nomi).slice(0, n).sort((a, b) => a.localeCompare(b));
    const pos = r.mescola([...Array(n).keys()]);
    const p = { tema, nomi, ind: [] };
    // tutti gli indizi veri, poi se ne aggiungono a caso finché l'ordine è uno solo
    const veri = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) {
      veri.push({ t: 'prima', a, b }, { t: 'subito', a, b });
      if (a < b) veri.push({ t: 'lontani', a, b });
      if (a < b) for (let k = 1; k < n - 1; k++) veri.push({ t: 'tra', a, b, k });
      for (let c = b + 1; c < n; c++) if (c !== a) veri.push({ t: 'mezzo', a, b, c });
    }
    for (let a = 0; a < n; a++) { veri.push({ t: 'estremo', a }); for (let k = 0; k < n; k++) veri.push({ t: 'posto', a, k }, { t: 'nonposto', a, k }); }
    const pool = r.mescola(veri.filter(x => vale(x, pos) && !(voluto === 'estrema' && x.t === 'posto')));
    // pesi: pochi «posto» e «subito», che dicono molto
    let rest = permutazioni(n).length;
    for (const x of pool) {
      if (rest === 1) break;
      if ((x.t === 'posto' || x.t === 'subito') && r.f() < 0.6) continue;
      const prova = p.ind.concat([x]), c = compatibili(p, prova).length;
      if (c < rest) { p.ind = prova; rest = c; }
    }
    if (rest !== 1) continue;
    for (let i = p.ind.length - 1; i >= 0; i--) { const senza = p.ind.filter((_, j) => j !== i); if (compatibili(p, senza).length === 1) p.ind = senza; }
    if (p.ind.filter(x => x.t === 'posto').length > 1) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    p.ind = r.mescola(p.ind);
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !TEMI[p.tema] || !Array.isArray(p.nomi) || !Array.isArray(p.ind)) return 'forma';
  if (compatibili(p).length !== 1) return 'ordini possibili: ' + compatibili(p).length;
  return null;
}
function testoHTML(p) {
  const T = TEMI[p.tema];
  return `<p>${T.intro(p.nomi.length)}</p><ol class="indizi-lista">${p.ind.map(x => `<li>${testoIndizio(p, x)}</li>`).join('')}</ol>`;
}

const E = {
  id: 'linea', nome: 'In fila', tipo: 'risposta', famiglia: 'logica', TECNICHE, MISURE, TEMI,
  breve: 'Pochi indizi e un solo ordine possibile: mettili in fila.',
  regole: [
    'Leggi gli indizi: l’ordine che li rispetta tutti è <b>uno solo</b>.',
    'Tocca i nomi nell’ordine giusto, dal primo all’ultimo; tocca l’ultimo messo per toglierlo.',
    'Poi <b>Consegna</b>: ogni consegna sbagliata aggiunge un minuto.'
  ],
  forma: () => 'ordine', opzioniDi: p => p.nomi,
  nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  giusta, vuota, soluzione, testoHTML, testoIndizio, vale
};
if (M) M.motori.linea = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
