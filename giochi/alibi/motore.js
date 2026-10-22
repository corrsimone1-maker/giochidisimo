/* =====================================================================
   ALIBI — generatore e verificatore di casi
   Solo logica, niente pagina: lo usano giochi/alibi/index.html e le prove
   (prove/alibi.test.js). Nato dal dossier di progetto: «un mistero coerente,
   non una storia improvvisata». Per questo il caso non si scrive, si simula:

   1. un luogo con stanze e porte (una pianta disegnata a mano);
   2. le mosse di tutti, un quarto d'ora alla volta (si resta o si passa in una
      stanza confinante), costruite attorno all'ora del delitto; nella scena,
      all'ora del delitto, c'è solo il colpevole;
   3. le dichiarazioni: ognuno dice dov'era e, se se lo ricorda, chi c'era con lui;
   4. il verificatore, che rifà il ragionamento dei giocatori per intero
      (candidati): il caso si tiene solo se porta a un colpevole solo, con una
      spiegazione semplice per ogni innocente, e senza scorciatoie.

   Due modi, con due modi di nascondere la verità:
   - 'traditore': i sospettati sono i giocatori. Il colpevole può mentire su tutto,
     gli innocenti dicono il vero. Il caso è garantito QUALUNQUE bugia racconti:
     ogni innocente è scagionato da testimonianze di altri innocenti (G2).
     Il personale (non sospettato) ha verbali pubblici veri.
   - 'coop': i sospettati sono personaggi con un verbale pubblico. Nessuno mente,
     ma i sospettati possono rifiutarsi di dire dove erano in qualche quarto d'ora;
     all'ora del delitto si rifiutano in diversi, colpevole compreso. I giocatori
     sono testimoni con un fascicolo vero e privato.

   Tutto il caso dipende solo dai parametri { codice, nomi, livello, modo, luogo }
   e da VERSIONE: con lo stesso link ogni telefono genera lo stesso caso, senza rete.
   ===================================================================== */
(function () {
'use strict';

/* ---------------- Luoghi ----------------
   Stanze come rettangoli in una pianta 300×210 (servono anche al disegno);
   porte tra stanze che hanno un muro in comune. «in» è la stanza con la preposizione. */
const R = (nome, inn, x, y, w, h) => ({ nome, in: inn, x, y, w, h });
/* Sigle di due lettere per il taccuino e per la pianta */
const SIGLE = {
  villa: ['SE', 'BI', 'ST', 'PR', 'SA', 'BL', 'CU', 'AT', 'TE'], teatro: ['CA', 'RE', 'PV', 'PS', 'GU', 'PL', 'PR', 'FO'],
  treno: ['BG', 'LA', 'LB', 'RI', 'SL', 'LC', 'PA'], museo: ['AR', 'LB', 'MA', 'AM', 'GA', 'CF', 'AT', 'GM']
};
const LUOGHI = [
  { id: 'villa', nome: 'Villa Ardenza', dove: 'sul lago, una sera di temporale', occasione: 'la cena per i settant’anni del conte',
    stanze: [R('Serra', 'nella Serra', 6, 6, 92, 64), R('Biblioteca', 'in Biblioteca', 98, 6, 104, 64), R('Studio', 'nello Studio', 202, 6, 92, 64),
      R('Sala da pranzo', 'in Sala da pranzo', 6, 70, 92, 66), R('Salone', 'nel Salone', 98, 70, 104, 66), R('Sala del biliardo', 'in Sala del biliardo', 202, 70, 92, 66),
      R('Cucina', 'in Cucina', 6, 136, 92, 68), R('Atrio', 'nell’Atrio', 98, 136, 104, 68), R('Terrazza', 'in Terrazza', 202, 136, 92, 68)],
    porte: [[0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 4], [3, 6], [4, 7], [5, 8], [7, 8]],
    png: [['Ottavio', 'il maggiordomo'], ['Marta', 'la cuoca'], ['Ines', 'la cameriera'], ['Remo', 'il giardiniere']],
    sospetti: [['Ludovica Ferri', 'la nipote del conte'], ['Carlo Basile', 'il socio in affari'], ['Elvira Monti', 'la governante'], ['Tancredi Sala', 'il ritrattista'], ['Bianca Orsini', 'la vedova del notaio'], ['Saverio Galli', 'il medico di famiglia']],
    delitti: [{ t: 'furto', cosa: 'il collier di zaffiri della contessa' }, { t: 'omicidio', cosa: 'il notaio Bellandi' }, { t: 'veleno', cosa: 'il calice del conte' }, { t: 'furto', cosa: 'il testamento del conte' }] },
  { id: 'teatro', nome: 'Teatro Politeama', dove: 'in centro, a sipario chiuso', occasione: 'la prova generale della prima',
    stanze: [R('Camerini', 'nei Camerini', 6, 6, 92, 62), R('Retroscena', 'nel Retroscena', 98, 6, 104, 62), R('Sala prove', 'in Sala prove', 202, 6, 92, 62),
      R('Palcoscenico', 'sul Palcoscenico', 6, 68, 288, 46), R('Guardaroba', 'nel Guardaroba', 6, 114, 58, 90), R('Platea', 'in Platea', 64, 114, 146, 90),
      R('Palco reale', 'nel Palco reale', 210, 114, 84, 42), R('Foyer', 'nel Foyer', 210, 156, 84, 48)],
    porte: [[0, 1], [1, 2], [0, 3], [1, 3], [3, 5], [4, 5], [5, 7], [6, 7]],
    png: [['Amedeo', 'il custode'], ['Gina', 'la sarta'], ['Nello', 'il macchinista'], ['Iole', 'la maschera']],
    sospetti: [['Viola Ranieri', 'la prima donna'], ['Ettore Mancini', 'il tenore'], ['Achille Rota', 'il regista'], ['Nora Cattaneo', 'la scenografa'], ['Fulvio Gatti', 'il critico'], ['Ada Morello', 'la suggeritrice']],
    delitti: [{ t: 'sabotaggio', cosa: 'il contrappeso del sipario' }, { t: 'furto', cosa: 'la partitura autografa' }, { t: 'omicidio', cosa: 'l’impresario Gualtieri' }, { t: 'veleno', cosa: 'la tisana del maestro' }] },
  { id: 'treno', nome: 'Espresso del Brennero', dove: 'nella neve, tra Bolzano e il confine', occasione: 'il viaggio notturno verso Vienna',
    forma: 'treno',
    stanze: [R('Bagagliaio', 'nel Bagagliaio', 6, 8, 66, 74), R('Vettura letti A', 'nella Vettura letti A', 78, 8, 66, 74), R('Vettura letti B', 'nella Vettura letti B', 150, 8, 66, 74), R('Vagone ristorante', 'nel Vagone ristorante', 222, 8, 72, 74),
      R('Salottino', 'nel Salottino', 222, 122, 72, 80), R('Vettura letti C', 'nella Vettura letti C', 150, 122, 66, 80), R('Vettura panoramica', 'nella Vettura panoramica', 78, 122, 66, 80)],
    porte: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    png: [['Ferri', 'il capotreno'], ['Aldo', 'il cameriere'], ['Rina', 'la cuccettista'], ['Otto', 'il frenatore']],
    sospetti: [['Irene Visconti', 'la contessa in viaggio'], ['Bruno Kessler', 'il commerciante di orologi'], ['Livia Neri', 'la giornalista'], ['Matteo Arnaldi', 'il diplomatico'], ['Greta Holm', 'la pianista'], ['Pietro Lanza', 'l’ufficiale in licenza']],
    delitti: [{ t: 'furto', cosa: 'la valigetta del diplomatico' }, { t: 'omicidio', cosa: 'il commendator Rossetti' }, { t: 'sabotaggio', cosa: 'il freno di emergenza' }, { t: 'furto', cosa: 'i diamanti della contessa' }] },
  { id: 'museo', nome: 'Museo Civico', dove: 'a porte chiuse, dopo l’orario di visita', occasione: 'l’inaugurazione della mostra sui codici miniati',
    stanze: [R('Archivio', 'in Archivio', 6, 6, 92, 62), R('Laboratorio', 'in Laboratorio', 98, 6, 96, 62), R('Sala delle mappe', 'nella Sala delle mappe', 194, 6, 100, 62),
      R('Sala delle armi', 'nella Sala delle armi', 6, 68, 92, 68), R('Galleria antica', 'nella Galleria antica', 98, 68, 196, 68),
      R('Caffetteria', 'in Caffetteria', 6, 136, 92, 68), R('Atrio', 'nell’Atrio', 98, 136, 96, 68), R('Galleria moderna', 'nella Galleria moderna', 194, 136, 100, 68)],
    porte: [[0, 1], [1, 2], [1, 4], [2, 4], [3, 4], [5, 6], [4, 6], [6, 7], [4, 7]],
    png: [['Lia', 'la custode'], ['Enzo', 'il restauratore'], ['Pio', 'il guardiano notturno'], ['Dora', 'la bibliotecaria']],
    sospetti: [['Ernesto Varani', 'il direttore'], ['Clara Bassi', 'la curatrice'], ['Ugo Fontana', 'il collezionista'], ['Sofia Re', 'la mecenate'], ['Gianni Pace', 'l’assicuratore'], ['Marta Leoni', 'la studiosa']],
    delitti: [{ t: 'furto', cosa: 'il codice miniato di Bobbio' }, { t: 'sabotaggio', cosa: 'l’impianto d’allarme' }, { t: 'furto', cosa: 'il cammeo di Livia' }, { t: 'omicidio', cosa: 'il professor Arduini' }] }
];
LUOGHI.forEach(L => L.stanze.forEach((st, i) => { st.sigla = SIGLE[L.id][i]; }));
const LUOGO = Object.fromEntries(LUOGHI.map(l => [l.id, l]));
const MOVENTI = [
  'Ti doveva molti soldi e non te li avrebbe mai resi.', 'Conosceva un tuo segreto e minacciava di dirlo.', 'Ti aveva umiliato davanti a tutti.',
  'Ti aveva escluso da un affare che era anche tuo.', 'Ti aveva promesso qualcosa e non l’ha mantenuto.', 'Volevi da tempo quello che aveva.',
  'Aveva rovinato una persona a cui tieni.', 'Sapeva del tuo debito di gioco.'
];

/* ---------------- Livelli ----------------
   quarti: quarti d'ora del racconto · resta: probabilità di restare nella stessa stanza
   memoria: probabilità che un giocatore ricordi chi c'era · memoriaPub: lo stesso per i verbali
   pubblici (interrogatori sommari: ricordano meno, così i fascicoli dei giocatori contano)
   Modo traditore — soli: innocenti senza nessuno che li abbia visti all'ora del delitto
   Modo coop — rifiuti: innocenti che si rifiutano di dire dov'erano all'ora del delitto;
   vicino: probabilità che chi si rifiuta taccia anche su un quarto d'ora accanto;
   buchi: probabilità di un rifiuto in un altro quarto d'ora qualunque */
const LIVELLI = {
  facile: { nome: 'Facile', quarti: 6, resta: 0.45, memoria: 0.8, memoriaPub: 0.55, soli: 1, rifiuti: 1, vicino: 0, buchi: 0 },
  medio: { nome: 'Medio', quarti: 7, resta: 0.4, memoria: 0.7, memoriaPub: 0.45, soli: 1, rifiuti: 2, vicino: 0.3, buchi: 0.08 },
  difficile: { nome: 'Difficile', quarti: 8, resta: 0.38, memoria: 0.62, memoriaPub: 0.4, soli: 2, rifiuti: 3, vicino: 0.5, buchi: 0.12 }
};
/* Versione dei casi: cambia quando lo stesso codice darebbe un caso diverso. Va nel link,
   così due telefoni con versioni diverse dell'app se ne accorgono. */
const VERSIONE = 2;
const MODI = { traditore: 'Un colpevole al tavolo', coop: 'Tutti investigatori' };
const LIMITI_GIOCATORI = { traditore: [3, 8], coop: [1, 8] };
const ORA0 = 21 * 60;
const ora = t => { const m = ORA0 + 15 * t; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

/* ---------------- Casualità deterministica ----------------
   Dal codice e dai parametri nasce un seme; mulberry32 dà sempre la stessa sequenza
   su ogni telefono (solo operazioni intere e divisioni esatte per 2^32). */
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function prng(seme) {
  let a = hash(seme)();
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = n => Math.floor(next() * n);
  r.p = p => next() < p;
  return r;
}
/* Codice del caso: 6 caratteri senza simboli che si confondono (0/O, 1/I, 5/S…) */
const ALFABETO = 'ACDEFGHJKLMNPQRTUVWXY3479';
function randIntCrypto(n) {
  const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  do (globalThis.crypto || self.crypto).getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}
function nuovoCodice() { let s = ''; for (let i = 0; i < 6; i++) s += ALFABETO[randIntCrypto(ALFABETO.length)]; return s; }
const codiceValido = c => typeof c === 'string' && /^[ACDEFGHJKLMNPQRTUVWXY3479]{6}$/.test(c);

/* ---------------- Grafo ---------------- */
function vicini(L) {
  const v = L.stanze.map(() => []);
  for (const [a, b] of L.porte) { v[a].push(b); v[b].push(a); }
  return v;
}
function distanze(L) {
  const v = vicini(L), n = L.stanze.length;
  return Array.from({ length: n }, (_, s) => {
    const d = Array(n).fill(Infinity); d[s] = 0; const q = [s];
    while (q.length) { const x = q.shift(); for (const y of v[x]) if (d[y] === Infinity) { d[y] = d[x] + 1; q.push(y); } }
    return d;
  });
}

class ErroreCaso extends Error {}
const no = m => { throw new ErroreCaso(m); };
const norm = s => String(s).trim().replace(/\s+/g, ' ');

/* ---------------- Parametri ---------------- */
function parametri(p) {
  if (!p || typeof p !== 'object') no('Parametri mancanti.');
  const modo = MODI[p.modo] ? p.modo : 'traditore', livello = LIVELLI[p.livello] ? p.livello : 'medio';
  const luogo = LUOGO[p.luogo] ? p.luogo : 'caso';
  if (!codiceValido(p.codice)) no('Codice del caso non valido.');
  const nomi = (Array.isArray(p.nomi) ? p.nomi : []).map(norm).filter(Boolean);
  const [lo, hi] = LIMITI_GIOCATORI[modo];
  if (nomi.length < lo || nomi.length > hi) no(modo === 'coop' ? `Da ${lo} a ${hi} giocatori.` : `Servono da ${lo} a ${hi} giocatori.`);
  if (new Set(nomi.map(x => x.toLocaleLowerCase('it'))).size !== nomi.length) no('Due giocatori hanno lo stesso nome.');
  return { codice: p.codice, nomi, livello, modo, luogo };
}

/* ---------------- Generazione ---------------- */
/* Un passo a caso: si resta con probabilità «resta», se no si va in una stanza confinante.
   «evita» è una stanza da non scegliere se si può. */
function passo(v, x, r, resta, evita) {
  const opz = r.p(resta) ? [x] : v[x];
  const ok = opz.filter(y => y !== evita);
  const pool = ok.length ? ok : v[x].concat([x]).filter(y => y !== evita);
  return pool.length ? pool[r(pool.length)] : null;
}
function mescolaR(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = r(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function tentativo(par, L, r) {
  const Lv = LIVELLI[par.livello], Q = Lv.quarti, v = vicini(L), d = distanze(L), nS = L.stanze.length, coop = par.modo === 'coop';
  // persone: { nome, tipo: 'giocatore' | 'png' | 'sospetto', ruolo }
  const chiave = s => s.toLocaleLowerCase('it');
  const usati = new Set(par.nomi.map(chiave));
  const persone = par.nomi.map(nome => ({ nome, tipo: 'giocatore' }));
  // un personaggio non può avere il nome (o il primo nome) di un giocatore: «Bruno» e «Bruno Kessler» si confondono
  const primi = new Set(par.nomi.map(x => chiave(x.split(' ')[0])));
  const libero = ([nome, ruolo], tipo) => {
    if (usati.has(chiave(nome)) || primi.has(chiave(nome.split(' ')[0]))) return false;
    usati.add(chiave(nome)); persone.push({ nome, ruolo, tipo }); return true;
  };
  if (!coop) {
    const k = Math.max(1, Math.min(4, 7 - par.nomi.length));
    let presi = 0; for (const x of mescolaR(L.png, r)) { if (presi >= k) break; if (libero(x, 'png')) presi++; }
  } else {
    const k = { facile: 4, medio: 5, difficile: 6 }[par.livello];
    let presi = 0; for (const x of mescolaR(L.sospetti, r)) { if (presi >= k) break; if (libero(x, 'sospetto')) presi++; }
    if (par.nomi.length <= 2) { for (const x of mescolaR(L.png, r)) if (libero(x, 'png')) break; }
  }
  const N = persone.length;
  if (persone.filter(x => x.tipo !== 'giocatore').length < (coop ? 3 : 1)) return null;
  const sospettati = persone.map((p, i) => i).filter(i => persone[i].tipo === (coop ? 'sospetto' : 'giocatore'));
  const c = sospettati[r(sospettati.length)], T = 2 + r(Q - 4), X = r(nS);
  // percorsi, costruiti attorno all'ora del delitto: prima dov'è ognuno alle T, poi
  // all'indietro e in avanti un quarto d'ora alla volta (una passeggiata a caso)
  const via = Array.from({ length: N }, () => Array(Q).fill(null));
  const cammina = (i, evita) => {
    for (let t = T - 1; t >= 0; t--) { const y = passo(v, via[i][t + 1], r, Lv.resta, evita); if (y === null || y === evita) return false; via[i][t] = y; }
    for (let t = T + 1; t < Q; t++) { const y = passo(v, via[i][t - 1], r, Lv.resta, evita); if (y === null || y === evita) return false; via[i][t] = y; }
    return true;
  };
  via[c][T] = X;
  if (!cammina(c, X)) return null;                          // il colpevole passa dalla scena solo all'ora del delitto
  // gli altri alle T: spesso nelle stanze vicine al percorso del colpevole (sono loro i testimoni che contano)
  const vicine = [];
  for (let s = 0; s < nS; s++) if (s !== X && [via[c][T - 1], via[c][T + 1]].some(a => a === s || v[a].includes(s))) vicine.push(s);
  const altrove = Array.from({ length: nS }, (_, s) => s).filter(s => s !== X);
  for (let i = 0; i < N; i++) {
    if (i === c) continue;
    via[i][T] = vicine.length && r.p(0.55) ? vicine[r(vicine.length)] : altrove[r(altrove.length)];
    if (!cammina(i, -1)) return null;
  }
  // ricordi: i verbali pubblici ricordano meno dei fascicoli dei giocatori
  const ricorda = persone.map(p => Array.from({ length: Q }, () => r.p(p.tipo === 'giocatore' ? Lv.memoria : Lv.memoriaPub)));
  // rifiuti (solo modo cooperativo, solo sospettati): il colpevole tace all'ora del delitto, e con lui altri
  const vuoti = persone.map(() => Array(Q).fill(false));
  if (coop) {
    const accanto = () => T + (r.p(0.5) ? 1 : -1);
    const tace = [c].concat(mescolaR(sospettati.filter(i => i !== c), r).slice(0, Lv.rifiuti));
    for (const i of tace) { vuoti[i][T] = true; if (r.p(Lv.vicino)) vuoti[i][accanto()] = true; }
    for (const i of sospettati) for (let t = 0; t < Q; t++) if (t !== T && r.p(Lv.buchi)) vuoti[i][t] = true;
  }
  const caso = { par, luogo: L.id, Q, N, persone, sospettati, colpevole: c, T, X, via, ricorda, vuoti };
  const sp = spiega(caso, d);
  if (!sp) return null;
  if (!coop) {
    // non deve bastare chiedere «chi era solo?»: qualche innocente non l'ha visto nessuno
    const soli = sp.innocenti.filter(x => x.tipo !== 'con').length;
    if (soli < Math.min(Lv.soli, sp.innocenti.length - 1)) return null;
    // il colpevole deve avere almeno una stanza da dichiarare senza smentirsi da solo
    caso.alibi = alibiPossibili(caso);
    if (!caso.alibi.length) return null;
  }
  caso.spiegazione = sp;
  // niente scorciatoie, misurate col ragionamento completo:
  // - i soli verbali pubblici non bastano a trovare il colpevole;
  // - a Medio e Difficile nessun giocatore ci arriva da solo col suo fascicolo e i verbali.
  const pub = persone.map((p, i) => i).filter(i => persone[i].tipo !== 'giocatore');
  const gi = persone.map((p, i) => i).filter(i => persone[i].tipo === 'giocatore');
  const dich = dichiarazioni(caso);
  if (candidati(caso, dich, pub).length < 2) return null;
  // Nel modo traditore servono almeno 4 innocenti (5 giocatori). Ogni innocente è scagionato da UN
  // testimone (la ragione semplice di spiega). Con 2 innocenti ognuno scagiona l'altro, quindi ognuno
  // arriva da solo al colpevole. Con 3 (j, k, l): se k è scagionato da l e l da k, allora k esclude
  // l da solo e deve non riuscire a escludere j, quindi j dipende da l; per lo stesso motivo da l
  // dipende k… e j finisce per dipendere da due testimoni insieme, che una ragione semplice non può.
  if (par.livello !== 'facile' && (coop ? gi.length >= 2 : gi.length >= 5))
    for (const j of gi) if (j !== c && candidati(caso, dich, pub.concat([j])).filter(x => x !== j).length < 2) return null;
  // con tutto quello che si sa, il colpevole è uno solo (nel modo traditore vale per qualunque bugia: vedi G2)
  const tutti = persone.map((p, i) => i);
  if (coop && JSON.stringify(candidati(caso, dich, tutti)) !== JSON.stringify([c])) return null;
  // dettagli del racconto
  const del = L.delitti[r(L.delitti.length)];
  caso.delitto = { t: del.t, cosa: del.cosa };
  const mot = mescolaR(MOVENTI, r);
  sospettati.forEach((i, k) => { persone[i].movente = mot[k % mot.length]; });
  return caso;
}

/* ---------------- Dichiarazioni ----------------
   dich[p][t] = { stanza, ricorda, con }: stanza null se p si rifiuta di rispondere (modo coop).
   Sono tutte vere: nel modo traditore le bugie le dice il giocatore colpevole a voce. */
function ricordo(caso, i, t) {
  const L = LUOGO[caso.luogo];
  if (caso.vuoti && caso.vuoti[i][t]) return { t, ora: ora(t), stanza: null, nomeStanza: null, ricorda: false, con: [], rifiuta: true };
  const s = caso.via[i][t];
  const con = caso.ricorda[i][t] ? caso.via.map((v, j) => (j !== i && v[t] === s ? j : -1)).filter(j => j >= 0) : [];
  return { t, ora: ora(t), stanza: s, nomeStanza: L.stanze[s].nome, ricorda: caso.ricorda[i][t], con };
}
function diario(caso, i) { return Array.from({ length: caso.Q }, (_, t) => ricordo(caso, i, t)); }
function dichiarazioni(caso) { return Array.from({ length: caso.N }, (_, i) => diario(caso, i)); }

/* ---------------- Chi può essere il colpevole? ----------------
   Il ragionamento dei giocatori, fatto per intero. Si conoscono le dichiarazioni dei «disponibili».
   Per ogni sospettato i si prova l'ipotesi «i è il colpevole»: all'ora del delitto nella scena c'era
   solo i. Nel modo traditore, se i è il colpevole può aver mentito: non ci si fida di lui (gli altri
   dicono il vero); nel modo coop nessuno mente. L'ipotesi regge se ognuno ha almeno un percorso
   (una porta al massimo per quarto d'ora) compatibile con tutto ciò che dicono i fidati:
   - un fidato che dice dov'era, era lì;
   - un fidato che si ricorda chi c'era elenca esattamente chi era nella sua stanza.
   Restituisce i sospettati per cui l'ipotesi regge. */
function candidati(caso, dich, disponibili) {
  const L = LUOGO[caso.luogo], v = vicini(L), nS = L.stanze.length, Q = caso.Q, N = caso.N, T = caso.T, X = caso.X;
  const mente = caso.par.modo === 'traditore';
  const tutte = () => new Set(Array.from({ length: nS }, (_, s) => s));
  const out = [];
  for (const i of caso.sospettati) {
    const fid = mente ? disponibili.filter(w => w !== i) : disponibili;
    const amm = Array.from({ length: N }, () => Array.from({ length: Q }, tutte));
    for (const p of fid) for (let t = 0; t < Q; t++) { const s = dich[p][t].stanza; if (s !== null) amm[p][t] = new Set(amm[p][t].has(s) ? [s] : []); }
    for (const w of fid) for (let t = 0; t < Q; t++) {
      const dw = dich[w][t]; if (dw.stanza === null || !dw.ricorda) continue;
      for (let p = 0; p < N; p++) {
        if (p === w) continue;
        if (dw.con.includes(p)) amm[p][t] = new Set(amm[p][t].has(dw.stanza) ? [dw.stanza] : []);
        else amm[p][t].delete(dw.stanza);
      }
    }
    for (let p = 0; p < N; p++) { if (p === i) amm[p][T] = new Set(amm[p][T].has(X) ? [X] : []); else amm[p][T].delete(X); }
    let ok = true;
    for (let p = 0; p < N && ok; p++) {
      let cur = amm[p][0];
      for (let t = 1; t < Q && cur.size; t++) { const s = new Set(); for (const x of cur) for (const y of v[x].concat([x])) if (amm[p][t].has(y)) s.add(y); cur = s; }
      if (!cur.size) ok = false;
    }
    if (ok) out.push(i);
  }
  return out;
}

/* ---------------- La spiegazione ----------------
   Per ogni innocente una ragione semplice, che i giocatori possono dire a voce:
     'dice'   (coop) ha detto dov'era all'ora del delitto, e nessuno mente;
     'con'    qualcuno l'ha visto altrove all'ora del delitto;
     'prima'  si sa dov'era un po' prima, e da lì la scena è troppo lontana;
     'dopo'   si sa dov'era un po' dopo, e la scena è troppo lontana per esserci passato.
   Nel modo traditore le ragioni usano solo testimoni diversi dall'innocente e dal colpevole, così
   valgono qualunque cosa dica il colpevole (G2). Per il colpevole:
     traditore: se possibile la «trappola» G1: visto prima e dopo, e in ogni stanza dove poteva dire
                di essere c'era qualcuno che non l'ha visto; se no basta l'eliminazione;
     coop:      si è rifiutato di rispondere all'ora del delitto e la scena era alla sua portata. */
function spiega(caso, d) {
  const { via, ricorda, vuoti, colpevole: c, T, X, N, Q } = caso, coop = caso.par.modo === 'coop';
  const noto = (w, t) => !vuoti[w][t];
  const vede = (w, p, t) => w !== p && noto(w, t) && ricorda[w][t] && via[w][t] === via[p][t];
  const tutti = Array.from({ length: N }, (_, i) => i);
  // dov'era p al quarto t secondo i testimoni W (e secondo p stesso, se si crede a p)
  const nota = (p, t, W, se) => {
    if (se && noto(p, t)) return { stanza: via[p][t], teste: p };
    for (const w of W) if (vede(w, p, t)) return { stanza: via[p][t], teste: w };
    return null;
  };
  const innocenti = [];
  for (const i of caso.sospettati) {
    if (i === c) continue;
    const W = tutti.filter(w => w !== i && (coop || w !== c));
    const qui = nota(i, T, W, coop);
    if (qui) { innocenti.push({ p: i, tipo: qui.teste === i ? 'dice' : 'con', teste: qui.teste, stanza: qui.stanza }); continue; }
    let ra = null;
    for (let t = T - 1; t >= 0 && !ra; t--) { const k = nota(i, t, W, coop); if (k && d[k.stanza][X] > T - t) ra = { p: i, tipo: 'prima', t, stanza: k.stanza, teste: k.teste, dist: d[k.stanza][X] }; }
    for (let t = T + 1; t < Q && !ra; t++) { const k = nota(i, t, W, coop); if (k && d[X][k.stanza] > t - T) ra = { p: i, tipo: 'dopo', t, stanza: k.stanza, teste: k.teste, dist: d[X][k.stanza] }; }
    if (!ra) return null;
    innocenti.push(ra);
  }
  // il colpevole: dove si sa che era prima e dopo
  const W1 = tutti.filter(w => w !== c);
  let prima = null, dopo = null;
  for (let t = T - 1; t >= 0 && !prima; t--) { const k = nota(c, t, W1, coop); if (k) prima = { t, stanza: k.stanza, teste: k.teste }; }
  for (let t = T + 1; t < Q && !dopo; t++) { const k = nota(c, t, W1, coop); if (k) dopo = { t, stanza: k.stanza, teste: k.teste }; }
  let trappola = null;
  if (!coop && prima && dopo && prima.teste !== c && dopo.teste !== c) {
    const candidate = d.map((_, s) => s).filter(s => d[prima.stanza][s] <= T - prima.t && d[s][dopo.stanza] <= dopo.t - T);
    const esclusi = [];
    for (const s of candidate) {
      if (s === X) continue;
      const w = W1.find(w => noto(w, T) && ricorda[w][T] && via[w][T] === s);
      if (w === undefined) { esclusi.length = 0; esclusi.push(null); break; }
      esclusi.push({ stanza: s, teste: w });
    }
    if (!esclusi.includes(null)) trappola = { candidate, esclusi };
  }
  const tacciono = coop ? caso.sospettati.filter(i => vuoti[i][T]) : null;
  return { innocenti, prima, dopo, trappola, tacciono };
}

/* ---------------- Verifiche indipendenti (per le prove) ----------------
   possibili(): in quali stanze poteva essere p a ogni quarto secondo le testimonianze vere di «testi»
   (dove l'hanno visto, dove non c'era) e i movimenti. verifica(): G1 e G2 del modo traditore. */
function possibili(caso, p, testi) {
  const { via, ricorda, vuoti, Q } = caso, L = LUOGO[caso.luogo], v = vicini(L), nS = L.stanze.length;
  const ammesse = [];
  for (let t = 0; t < Q; t++) {
    let a = new Set(Array.from({ length: nS }, (_, s) => s));
    for (const w of testi) {
      if (w === p || !ricorda[w][t] || vuoti[w][t]) continue;
      if (via[w][t] === via[p][t]) a = new Set([...a].filter(s => s === via[w][t]));
      else a.delete(via[w][t]);
    }
    ammesse.push(a);
  }
  const av = [new Set(ammesse[0])];
  for (let t = 1; t < Q; t++) { const s = new Set(); for (const x of av[t - 1]) for (const y of v[x].concat([x])) if (ammesse[t].has(y)) s.add(y); av.push(s); }
  const ind = Array(Q); ind[Q - 1] = new Set(av[Q - 1]);
  for (let t = Q - 2; t >= 0; t--) { const s = new Set(); for (const x of av[t]) if (v[x].concat([x]).some(y => ind[t + 1].has(y))) s.add(x); ind[t] = s; }
  return ind;
}
function verifica(caso) {
  const tutti = Array.from({ length: caso.N }, (_, i) => i), c = caso.colpevole;
  const g1 = possibili(caso, c, tutti.filter(i => i !== c))[caso.T];
  const G1 = g1.size === 1 && g1.has(caso.X);
  const G2 = caso.sospettati.filter(i => i !== c).every(i => !possibili(caso, i, tutti.filter(w => w !== i && w !== c))[caso.T].has(caso.X));
  return { G1, G2 };
}
/* Stanze che il colpevole può dichiarare all'ora del delitto senza contraddire i suoi quarti d'ora vicini */
function alibiPossibili(caso) {
  const L = LUOGO[caso.luogo], v = vicini(L), c = caso.colpevole, a = caso.via[c][caso.T - 1], b = caso.via[c][caso.T + 1];
  const adiac = (x, y) => x === y || v[x].includes(y);
  return L.stanze.map((_, s) => s).filter(s => s !== caso.X && adiac(a, s) && adiac(s, b));
}

/* ---------------- API ---------------- */
const cache = new Map();
function genera(p) {
  const par = parametri(p);
  const k = JSON.stringify(par);
  if (cache.has(k)) return cache.get(k);
  const r = prng(VERSIONE + '|' + k);
  const luogo = par.luogo === 'caso' ? LUOGHI[r(LUOGHI.length)] : LUOGO[par.luogo];
  let caso = null, n = 0;
  while (!caso) { if (++n > 60000) no('Non trovo un caso valido con questi parametri.'); caso = tentativo(par, luogo, r); }
  caso.tentativi = n;
  caso.v = VERSIONE;
  if (cache.size > 20) cache.clear();
  cache.set(k, caso);
  return caso;
}
const svuotaCache = () => cache.clear();
const nomeDi = (caso, i) => caso.persone[i].nome;
/* Chi ha un verbale pubblico */
const pubblici = caso => caso.persone.map((p, i) => i).filter(i => caso.persone[i].tipo !== 'giocatore');
/* Il testo del delitto */
function testoDelitto(caso) {
  const L = LUOGO[caso.luogo], s = L.stanze[caso.X].in, h = ora(caso.T), { t, cosa } = caso.delitto;
  if (t === 'furto') return `Alle ${h}, ${s}, qualcuno ha rubato ${cosa}.`;
  if (t === 'omicidio') return `Alle ${h}, ${s}, è stato ucciso ${cosa}.`;
  if (t === 'veleno') return `Alle ${h}, ${s}, qualcuno ha avvelenato ${cosa}.`;
  return `Alle ${h}, ${s}, qualcuno ha manomesso ${cosa}.`;
}
const ESITI = { furto: 'il furto', omicidio: 'l’omicidio', veleno: 'l’avvelenamento', sabotaggio: 'il sabotaggio' };
/* Soluzione ragionata, in frasi senza genere (non si sa se un nome è maschile o femminile) */
function soluzione(caso) {
  const L = LUOGO[caso.luogo], sp = caso.spiegazione, c = caso.colpevole, nm = i => caso.persone[i].nome, st = s => L.stanze[s].in, coop = caso.par.modo === 'coop';
  const Su = s => s[0].toUpperCase() + s.slice(1);
  const porte = n => (n === 1 ? 'una porta' : `${n} porte`);
  const quarti = n => (n === 1 ? 'un quarto d’ora' : `${n} quarti d’ora`);
  const elenco = arr => arr.length === 1 ? arr[0] : arr.slice(0, -1).join(', ') + (coop ? ' e ' : ' o ') + arr[arr.length - 1];
  const fonte = (x, p) => (x.teste === p ? 'dal suo verbale' : `con ${nm(x.teste)}`);
  const passi = [];
  if (coop) passi.push({ k: 'colpevole', testo: `Alle ${ora(caso.T)} si sono rifiutati di dire dove fossero: ${elenco(sp.tacciono.map(nm))}. Tutti gli altri l’hanno detto, e nessuno mente.` });
  else if (sp.trappola) {
    const tr = sp.trappola;
    passi.push({ k: 'colpevole', testo: `Alle ${ora(sp.prima.t)} ${nm(c)} era ${st(sp.prima.stanza)} con ${nm(sp.prima.teste)}; alle ${ora(sp.dopo.t)} era ${st(sp.dopo.stanza)} con ${nm(sp.dopo.teste)}.` });
    passi.push({ k: 'colpevole', testo: `Si passa al massimo una porta ogni quarto d’ora: alle ${ora(caso.T)} ${nm(c)} poteva essere solo ${elenco(tr.candidate.map(st))}.` });
    for (const e of tr.esclusi) passi.push({ k: 'colpevole', testo: `${Su(st(e.stanza))}, alle ${ora(caso.T)}, c’era ${nm(e.teste)}, e ${nm(c)} lì non c’era.` });
    passi.push({ k: 'colpevole', testo: `Resta una sola possibilità: ${st(caso.X)}, la scena del delitto. Qualunque alibi abbia raccontato, ${nm(c)} mentiva.` });
  }
  for (const x of sp.innocenti) {
    let t;
    if (x.tipo === 'dice') continue;
    if (x.tipo === 'con') t = `${nm(x.p)} alle ${ora(caso.T)} era ${st(x.stanza)} con ${nm(x.teste)}.`;
    else if (x.tipo === 'prima') t = `${nm(x.p)} alle ${ora(x.t)} era ${st(x.stanza)} (${fonte(x, x.p)}): da lì alla scena del delitto ci sono ${porte(x.dist)}, troppe in ${quarti(caso.T - x.t)}.`;
    else t = `${nm(x.p)} alle ${ora(x.t)} era ${st(x.stanza)} (${fonte(x, x.p)}): dalla scena del delitto ci sono ${porte(x.dist)}, troppe in ${quarti(x.t - caso.T)}.`;
    passi.push({ k: 'innocente', p: x.p, testo: t });
  }
  if (coop) {
    const pz = [sp.prima, sp.dopo].filter(Boolean);
    const fonti = [...new Set(pz.map(x => (x.teste === c ? 'il suo verbale' : nm(x.teste))))];
    const dove = pz.map(x => `alle ${ora(x.t)} ${st(x.stanza)}`).join(' e ');
    passi.push({ k: 'colpevole', testo: pz.length
      ? `${nm(c)} invece era ${dove} (${fonti.length > 1 ? 'fonti' : 'fonte'}: ${fonti.join(', ')}): la scena del delitto era alla sua portata. Resta solo ${nm(c)}: è il colpevole.`
      : `Di ${nm(c)} non si sa dove fosse prima e dopo: la scena del delitto era alla sua portata. Resta solo ${nm(c)}: è il colpevole.` });
  } else if (!sp.trappola) passi.push({ k: 'colpevole', testo: `Tutti gli altri sono esclusi: resta solo ${nm(c)}, che è il colpevole. Non serve smentire il suo alibi: se gli altri non potevano esserci, mentiva.` });
  return passi;
}

const AL = {
  LUOGHI, LUOGO, LIVELLI, MODI, LIMITI_GIOCATORI, ALFABETO, ESITI, VERSIONE,
  ora, prng, randIntCrypto, nuovoCodice, codiceValido, parametri, genera, vicini, distanze, spiega, possibili, verifica,
  candidati, dichiarazioni, alibiPossibili,
  diario, ricordo, pubblici, nomeDi, testoDelitto, soluzione, svuotaCache, ErroreCaso
};
if (typeof module !== 'undefined' && module.exports) module.exports = AL; else self.AL = AL;
})();
