/* =====================================================================
   7 WONDERS: SECRET SOCIETIES — motore di gioco
   Solo logica, niente pagina: lo usano giochi/societa/index.html, le prove
   (prove/societa.test.js) e i conti del bilanciamento (prove/societa.bilanciamento.js).
   Tutto il caso si estrae in nuovaPartita (società, decreti, spareggi): da lì
   in poi il motore è deterministico e lo stato si ricava rigiocando gli eventi.

   Il 7 Wonders vero non si tocca: carte, monete, conflitti e punteggio restano
   quelli del gioco. Il telefono gestisce solo il Concilio, le relazioni
   (Patti e Patrocini), le scommesse e le società, e alla fine di ogni Era fa
   al tavolo le sole domande sì/no che servono.

   La partita salvata è
     { v, id, cfg, nomi, soc, decreti: { 2: [id×3], 3: [id×3] }, spareggio: { 2: [...], 3: [...] }, eventi: [] }
   - nomi: in ordine di posto, in senso antiorario (il prossimo è a destra).
   - soc: id della società di ogni giocatore (null se le società sono spente).
   - spareggio: ordine sorteggiato tra i tre decreti di ogni Conclave, usato solo in caso di parità.

   Fasi: era 1 → conclave 2 (mercato → cabina → esito) → era 2 → verifica 2
         → conclave 3 → era 3 → verifica 3 → missioni (se ci sono le società) → finita.
   Il Conclave c scrive la legge dell'Era c.

   Eventi:
     { t: 'fineEra' }                                   l'Era in corso è finita (conflitti compresi)
     { t: 'relazione', tipo: 'patto', a, b, oa, ob }    Patto pubblico: oa/ob obblighi di a e di b
     { t: 'relazione', tipo: 'patrocinio', a, b, ob }   a patrocina b (b deve fare ob)
     { t: 'urne' }                                      si chiudono le trattative, inizia la cabina
     { t: 'scheda', g, voto, sigillo, intento, scommessa, potere }
                                                        scheda segreta di g (in ordine di cabina)
       voto: id del decreto · sigillo: true/false · intento: 'L' | 'T' | null (solo nei Patti)
       scommessa: { b, a } | null (b bersaglio, a requisito) · potere: { id, ... } | null
     { t: 'apriEra' }                                   letto l'esito, si gioca l'Era
     { t: 'verifica', r: { 'g|requisito': true } }      risposte del tavolo a fine Era
     { t: 'missioni', r: { g: true } }                  missioni controllate al tavolo

   Privacy. vistaPubblica(S) è tutto ciò che può comparire sullo schermo condiviso:
   niente voti, intenzioni, scommesse, poteri o società finché non si svelano.
   Le prove controllano che non dipenda dalle scelte segrete.
   ===================================================================== */
(function () {
'use strict';

/* ---------------- Requisiti (cose verificabili al tavolo) ----------------
   'col:v:2'  almeno 2 carte verdi costruite nell'Era (v b r g m s p = verde blu rossa gialla marrone grigia viola)
   'stadi:1'  almeno 1 stadio di Meraviglia costruito nell'Era
   'colori:3' carte di almeno 3 colori diversi costruite nell'Era
   'vinci'    vittoria in entrambi i conflitti dell'Era
   'norosse'  nessuna carta rossa costruita nell'Era
   'gialla+6' almeno 1 gialla nell'Era e almeno 6 monete a fine Era
   'verde+blu', 'officina' (1 marrone o grigia e 1 blu)
   'rel'      relazione riuscita: lo calcola il motore, non si chiede */
const COLORI = {
  v: { s: 'verde', p: 'verdi' }, b: { s: 'blu', p: 'blu' }, r: { s: 'rossa', p: 'rosse' }, g: { s: 'gialla', p: 'gialle' },
  m: { s: 'marrone', p: 'marroni' }, s: { s: 'grigia', p: 'grigie' }, p: { s: 'viola', p: 'viola' }
};
const FISSI = {
  vinci: ['vince entrambi i conflitti dell’Era', 'ha vinto entrambi i conflitti'],
  norosse: ['non costruisce nessuna carta rossa', 'non ha costruito carte rosse'],
  'gialla+6': ['costruisce almeno 1 gialla e chiude l’Era con almeno 6 monete', 'ha costruito almeno 1 gialla e ha almeno 6 monete'],
  'verde+blu': ['costruisce almeno 1 carta verde e almeno 1 blu', 'ha costruito almeno 1 verde e almeno 1 blu'],
  officina: ['costruisce almeno 1 carta marrone o grigia e almeno 1 blu', 'ha costruito almeno 1 marrone o grigia e almeno 1 blu'],
  rel: ['chiude con successo un Patto o un Patrocinio', 'ha chiuso con successo una relazione']
};
function requisitoValido(a) {
  if (typeof a !== 'string') return false;
  const [k, x, y] = a.split(':');
  if (k === 'col') return a.split(':').length === 3 && !!COLORI[x] && /^[1-4]$/.test(y);
  if (k === 'stadi') return a.split(':').length === 2 && /^[1-4]$/.test(x);
  if (k === 'colori') return a.split(':').length === 2 && /^[2-7]$/.test(x);
  return Object.prototype.hasOwnProperty.call(FISSI, a);
}
/* Verbo al presente («+2 a chi costruisce…») o al passato («Ada ha costruito…») */
function requisito(a, passato = false) {
  const [k, x, y] = a.split(':');
  const fa = passato ? 'ha costruito' : 'costruisce';
  if (k === 'col') { const n = +y, c = COLORI[x]; return `${fa} almeno ${n} ${n === 1 ? 'carta ' + c.s : 'carte ' + c.p}`; }
  if (k === 'stadi') { const n = +x; return `${fa} almeno ${n} ${n === 1 ? 'stadio' : 'stadi'} della Meraviglia`; }
  if (k === 'colori') return `${fa} carte di almeno ${x} colori diversi`;
  return FISSI[a] ? FISSI[a][passato ? 1 : 0] : a;
}
/* Nome breve per le etichette («2 verdi», «2 stadi», «vince 2 conflitti») */
function breve(a) {
  const [k, x, y] = a.split(':');
  if (k === 'col') { const n = +y, c = COLORI[x]; return `${n} ${n === 1 ? c.s : c.p}`; }
  if (k === 'stadi') return `${x} ${+x === 1 ? 'stadio' : 'stadi'}`;
  if (k === 'colori') return `${x} colori`;
  return ({ vinci: 'due vittorie', norosse: 'niente rosse', 'gialla+6': 'gialla e 6 monete', 'verde+blu': 'verde e blu', officina: 'materiali e blu', rel: 'relazione riuscita' })[a] || a;
}
/* Obblighi di Patti e Patrocini: un colore o la Meraviglia, alla soglia scelta */
const OBBLIGHI_BASE = ['v', 'b', 'r', 'g', 'stadi'];
const obblighi = cfg => OBBLIGHI_BASE.map(x => x === 'stadi' ? 'stadi:' + cfg.soglia : `col:${x}:${cfg.soglia}`);
const SCOMMESSE = ['col:v:2', 'col:b:2', 'col:r:2', 'col:g:2', 'stadi:2', 'vinci'];
/* Nome del Patto secondo gli obblighi (stesso obbligo → patto con nome, diversi → Scambio di Saperi) */
function nomePatto(oa, ob) {
  if (oa !== ob) return 'Scambio di Saperi';
  if (oa.startsWith('stadi')) return 'Giuramento degli Architetti';
  return { v: 'Accademia Segreta', b: 'Congrega dei Mecenati', r: 'Fratellanza d’Arme', g: 'Rotte Nascoste' }[oa.split(':')[1]] || 'Patto';
}

/* ---------------- Decreti ---------------- */
const FAMIGLIE = { A: 'Sapere e commercio', B: 'Potenza', C: 'Intrigo e varietà' };
const DECRETI = [
  { id: 'rinascimento', nome: 'Rinascimento Scientifico', fam: 'A', ere: [2, 3], req: 'col:v:2' },
  { id: 'mecenatismo', nome: 'Mecenatismo Civico', fam: 'A', ere: [2, 3], req: 'col:b:2' },
  { id: 'borse', nome: 'Borse Mercantili', fam: 'A', ere: [2, 3], req: 'gialla+6' },
  { id: 'equilibrio', nome: 'Equilibrio delle Arti', fam: 'A', ere: [2, 3], req: 'verde+blu' },
  { id: 'mobilitazione', nome: 'Mobilitazione Imperiale', fam: 'B', ere: [2, 3], req: 'vinci' },
  { id: 'scudi', nome: 'Scudi e Prestigio', fam: 'B', ere: [2, 3], req: 'col:r:2' },
  { id: 'culto', nome: 'Culto delle Meraviglie', fam: 'B', ere: [2, 3], req: 'stadi:1' },
  { id: 'tregua', nome: 'Tregua Sacra', fam: 'B', ere: [2, 3], req: 'norosse' },
  { id: 'popoli', nome: 'Patto tra Popoli', fam: 'C', ere: [2, 3], req: 'rel' },
  { id: 'officine', nome: 'Officine delle Città', fam: 'C', ere: [2], req: 'officina' },
  { id: 'gilde', nome: 'Età delle Gilde', fam: 'C', ere: [3], req: 'col:p:1' },
  { id: 'mosaico', nome: 'Mosaico dei Popoli', fam: 'C', ere: [2, 3], req: 'colori:4' }
];
const DEC = Object.fromEntries(DECRETI.map(d => [d.id, d]));

/* ---------------- Società segrete ----------------
   verifica: 'tavolo' (la missione si controlla sulla città) o 'app' (la calcola il motore).
   Ogni potere si usa una volta per partita, dalla cabina. */
const SOCIETA = [
  { id: 'astrolabio', nome: 'Ordine dell’Astrolabio', simbolo: 'astrolabio', verifica: 'tavolo',
    missione: 'Avere almeno 3 carte verdi con almeno 2 simboli scientifici diversi.',
    potere: { id: 'cannocchiale', nome: 'Cannocchiale', testo: 'In un Conclave scegli un firmatario di un Patto: a urne chiuse il telefono ti mostra, solo a te, se ha scelto Leale o Traditore.' } },
  { id: 'oro', nome: 'Congregazione dell’Oro', simbolo: 'moneta', verifica: 'tavolo',
    missione: 'Avere almeno 4 carte gialle e almeno 6 monete a fine partita.',
    potere: { id: 'assicurazione', nome: 'Assicurazione', testo: 'Dichiarala in cabina quando sei in un Patto: se scegli Leale e vieni tradito, prendi +1 invece della penalità.' } },
  { id: 'lame', nome: 'Fratellanza delle Lame', simbolo: 'lame', verifica: 'tavolo',
    missione: 'Vincere entrambi i conflitti in almeno due Ere.',
    potere: { id: 'veto', nome: 'Veto', testo: 'In cabina scegli un decreto: se sarebbe stato eletto, viene scartato e passa il secondo più votato.' } },
  { id: 'pietra', nome: 'Figli della Pietra', simbolo: 'piramide', verifica: 'tavolo',
    missione: 'Completare la propria Meraviglia (tutti gli stadi).',
    potere: { id: 'voto', nome: 'Voce della Pietra', testo: 'In un Conclave il tuo voto vale 1 in più, in segreto. Si somma al Sigillo.' } },
  { id: 'concordia', nome: 'Custodi della Concordia', simbolo: 'ulivo', verifica: 'app',
    missione: 'Chiudere con successo due relazioni (Patti o Patrocini) con due persone diverse.',
    potere: { id: 'benedizione', nome: 'Benedizione', testo: 'Dichiarala in cabina quando sei in un Patto: se il Patto riesce Leale e Leale, +1 a te e +1 al partner.' } },
  { id: 'araldi', nome: 'Araldi del Concilio', simbolo: 'tromba', verifica: 'app',
    missione: 'Votare il decreto eletto in entrambi i Conclavi.',
    potere: { id: 'proclama', nome: 'Proclama', testo: 'Dichiaralo in cabina: se il decreto che voti viene eletto, +2.' } },
  { id: 'cartografi', nome: 'Collegio dei Cartografi', simbolo: 'rosa', verifica: 'tavolo',
    missione: 'Avere almeno una carta di ciascuno dei sette colori.',
    potere: { id: 'scrutinio', nome: 'Scrutinio', testo: 'In cabina, prima di votare, vedi quanti voti ha già ogni decreto (solo le schede già sigillate).' } },
  { id: 'loggia', nome: 'Loggia delle Gilde', simbolo: 'chiavi', verifica: 'tavolo',
    missione: 'Avere almeno 2 carte viola.',
    potere: { id: 'privilegio', nome: 'Privilegio', testo: 'Dichiaralo in cabina: nell’Era che segue, se il decreto eletto ti premia, prendi il doppio.' } },
  { id: 'velo', nome: 'Società del Velo', simbolo: 'velo', verifica: 'app', richiede: 'scommesse',
    missione: 'Vincere entrambe le scommesse (una per Conclave).',
    potere: { id: 'velo', nome: 'Velo', testo: 'Dichiaralo insieme a una scommessa: se la perdi, niente penalità.' } }
];
const SOC = Object.fromEntries(SOCIETA.map(s => [s.id, s]));
const PROCLAMA = 2;

/* ---------------- Parametri ----------------
   Quelli diversi dalla proposta originale sono spiegati nel regolamento
   («Scelte di bilanciamento») e in prove/societa.bilanciamento.js. */
const DEF = {
  patrocinio: true,      // modulo Patrocinio
  scommesse: true,       // modulo Scommesse di Palazzo
  societa: true,         // società segrete con missione e potere
  soglia: 2,             // carte di un colore (o stadi) per Patti e Patrocini (originale 1)
  decreto: 2,            // premio del decreto eletto
  pattoLL: 4,            // Leale/Leale riuscito, a testa (originale 3)
  tradimento: 2,         // traditore, se il leale ha completato
  tradito: -1,           // leale tradito (originale 0)
  doppio: -1,            // doppio tradimento, a testa
  patrono: 3, beneficiario: 1, costoPatrocinio: 2,
  vinta: 3, persa: -1,   // scommessa (originale: in più 1 moneta alla banca)
  agente: 1,             // Agente Libero con carte di almeno 3 colori (originale: 2 colori)
  missione: 4,
  timer: 90              // secondi di trattativa nel Conclave (0 = niente timer)
};
const LIMITI = {
  soglia: [1, 3], decreto: [1, 4], pattoLL: [2, 6], tradimento: [0, 4], tradito: [-3, 0], doppio: [-3, 0],
  patrono: [1, 5], beneficiario: [0, 3], costoPatrocinio: [1, 3], vinta: [1, 5], persa: [-3, 0],
  agente: [0, 3], missione: [2, 6], timer: [0, 300]
};
/* Configurazioni pronte (si scelgono in Bilanciamento; i moduli restano quelli accesi) */
const PRESET = [
  { id: 'consigliata', nome: 'Consigliata', tag: 'v0.2', c: { soglia: 2, decreto: 2, pattoLL: 4, tradimento: 2, tradito: -1, doppio: -1, patrono: 3, beneficiario: 1, costoPatrocinio: 2, vinta: 3, persa: -1, agente: 1, missione: 4, timer: 90 },
    desc: 'Patti come «caccia al cervo»: lealtà conviene solo se ti fidi. Obblighi da 2 carte, che costano davvero qualcosa.' },
  { id: 'originale', nome: 'Numeri della proposta', tag: 'CONFRONTO', c: { soglia: 1, decreto: 2, pattoLL: 3, tradimento: 2, tradito: 0, doppio: -1, patrono: 3, beneficiario: 1, costoPatrocinio: 2, vinta: 3, persa: -1, agente: 1, missione: 4, timer: 90 },
    desc: 'I valori del documento di partenza (obblighi da 1 carta, Patto +3/+3, tradito 0). Con questi tradire o no non dipende dal partner.' },
  { id: 'altaposta', nome: 'Alta posta', tag: 'SPERIMENTALE', c: { soglia: 2, decreto: 2, pattoLL: 5, tradimento: 2, tradito: -2, doppio: -1, patrono: 3, beneficiario: 1, costoPatrocinio: 2, vinta: 3, persa: -1, agente: 1, missione: 4, timer: 150 },
    desc: 'Patti più ricchi e tradimenti che bruciano di più, trattative più lunghe. Per gruppi che amano bluff e diplomazia.' }
];
function configura(c) {
  const o = Object.assign({}, DEF);
  if (c && typeof c === 'object') {
    for (const k of ['patrocinio', 'scommesse', 'societa']) if (typeof c[k] === 'boolean') o[k] = c[k];
    for (const k in LIMITI) if (Number.isInteger(c[k])) o[k] = Math.min(LIMITI[k][1], Math.max(LIMITI[k][0], c[k]));
  }
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
function generaId(rand) { let s = ''; for (let i = 0; i < 10; i++) s += '0123456789abcdef'[rand(16)]; return s; }

class ErroreGioco extends Error {}
const no = m => { throw new ErroreGioco(m); };
const MIN_G = 3, MAX_G = 8;

/* Tre decreti per l'Era: uno per famiglia, mai uno già proposto */
function estraiDecreti(era, esclusi, rand) {
  return ['A', 'B', 'C'].map(f => {
    const pool = DECRETI.filter(d => d.fam === f && d.ere.includes(era) && !esclusi.includes(d.id));
    return pool[rand(pool.length)].id;
  });
}
function societaDisponibili(cfg) { return SOCIETA.filter(s => !s.richiede || cfg[s.richiede]); }
function nuovaPartita({ nomi, cfg, id } = {}, rand = randIntCrypto) {
  if (!Array.isArray(nomi) || nomi.length < MIN_G || nomi.length > MAX_G) no(`Servono da ${MIN_G} a ${MAX_G} giocatori.`);
  nomi = nomi.map(x => String(x).trim().replace(/\s+/g, ' '));
  if (nomi.some(x => !x)) no('Ogni giocatore ha bisogno di un nome.');
  if (new Set(nomi.map(x => x.toLocaleLowerCase('it'))).size !== nomi.length) no('Due giocatori hanno lo stesso nome.');
  const c = configura(cfg);
  const soc = c.societa ? mescola(societaDisponibili(c).map(s => s.id), rand).slice(0, nomi.length) : null;
  const d2 = estraiDecreti(2, [], rand), d3 = estraiDecreti(3, d2, rand);
  return {
    v: 1, id: id || generaId(rand), cfg: c, nomi, soc,
    decreti: { 2: d2, 3: d3 },
    spareggio: { 2: mescola([0, 1, 2], rand), 3: mescola([0, 1, 2], rand) },
    eventi: []
  };
}

/* ---------------- Stato ---------------- */
function iniziale(P) {
  const n = P.nomi.length;
  const conclave = c => ({ c, decreti: P.decreti[c].slice(), relazioni: [], schede: {}, ordine: null, elezione: null });
  return {
    n, nomi: P.nomi.slice(), cfg: P.cfg, soc: P.soc ? P.soc.slice() : null, spareggio: P.spareggio,
    fase: 'era', era: 1, c: null, sub: null,
    conclavi: { 2: conclave(2), 3: conclave(3) },
    sigillo: Array(n).fill(false),    // Sigillo d'Influenza già usato
    potere: Array(n).fill(false),     // potere di società già usato
    risultati: {}, missioni: null,
    punti: Array(n).fill(0),
    cronologia: []
  };
}
const log = (S, testo, tipo = '') => S.cronologia.push({ era: S.era, c: S.c, testo, tipo });
const intero = (S, g) => Number.isInteger(g) && g >= 0 && g < S.n;
const ROMANI = { 1: 'I', 2: 'II', 3: 'III' };
/* La relazione di g nel Conclave c (o null) */
function relazioneDi(S, c, g) {
  const K = S.conclavi[c];
  for (const R of K.relazioni) if (R.a === g || R.b === g) {
    const ruolo = R.tipo === 'patto' ? 'firmatario' : R.a === g ? 'patrono' : 'beneficiario';
    return { R, partner: R.a === g ? R.b : R.a, ruolo, mio: R.tipo === 'patto' ? (R.a === g ? R.oa : R.ob) : (R.b === g ? R.ob : null), suo: R.a === g ? R.ob : (R.tipo === 'patto' ? R.oa : null) };
  }
  return null;
}
const nelPatto = (S, c, g) => { const r = relazioneDi(S, c, g); return !!r && r.R.tipo === 'patto'; };
function ordineCabina(S, c) {
  const start = c === 2 ? 0 : S.n - 1;
  return Array.from({ length: S.n }, (_, i) => (start + i) % S.n);
}
function prossimoInCabina(S) {
  if (S.fase !== 'conclave' || S.sub !== 'cabina') return null;
  const K = S.conclavi[S.c];
  return K.ordine.find(g => !K.schede[g]) ?? null;
}
const socDi = (S, g) => (S.soc ? SOC[S.soc[g]] : null);

/* Voti: 1 a testa, +1 col Sigillo, +1 con la Voce della Pietra. Parità: ordine sorteggiato. */
function conta(S, c, schede) {
  const K = S.conclavi[c], voti = [0, 0, 0];
  for (const k in schede) {
    const s = schede[k], i = K.decreti.indexOf(s.voto);
    voti[i] += 1 + (s.sigillo ? 1 : 0) + (s.potere && s.potere.id === 'voto' ? 1 : 0);
  }
  return voti;
}
function elezione(S, c) {
  const K = S.conclavi[c], voti = conta(S, c, K.schede), sp = S.spareggio[c];
  const ordine = [0, 1, 2].sort((x, y) => voti[y] - voti[x] || sp.indexOf(x) - sp.indexOf(y));
  const parita = voti[ordine[0]] === voti[ordine[1]];
  let el = ordine[0], veto = null;
  for (const k in K.schede) {
    const s = K.schede[k];
    if (s.potere && s.potere.id === 'veto' && s.potere.decreto === K.decreti[ordine[0]]) veto = { chi: +k, vetato: K.decreti[ordine[0]] };
  }
  if (veto) el = ordine[1];
  return { voti, ordine, eletto: K.decreti[el], parita, veto };
}

/* ---------------- Verifica di fine Era ---------------- */
/* Domande al tavolo per l'Era k: non dipendono dalle intenzioni segrete
   (si chiedono tutti gli obblighi, anche quelli dei traditori) */
function domande(S, k) {
  const K = S.conclavi[k], out = [], visti = new Set();
  const add = (g, a) => { if (a === 'rel') return; const key = g + '|' + a; if (!visti.has(key)) { visti.add(key); out.push({ g, a, key }); } };
  const d = DEC[K.elezione.eletto];
  for (let g = 0; g < S.n; g++) add(g, d.req);
  for (const R of K.relazioni) { if (R.tipo === 'patto') add(R.a, R.oa); add(R.b, R.ob); }
  for (let g = 0; g < S.n; g++) if (!relazioneDi(S, k, g)) add(g, 'colori:3');
  for (let g = 0; g < S.n; g++) { const s = K.schede[g]; if (s && s.scommessa) add(s.scommessa.b, s.scommessa.a); }
  return out.sort((x, y) => x.g - y.g);
}
function calcolaEra(S, k, r) {
  const K = S.conclavi[k], cfg = S.cfg, n = S.n, nm = g => S.nomi[g];
  const righe = [], punti = Array(n).fill(0), relOk = Array(n).fill(false), riuscite = [], patti = [], patrocini = [], scommesse = [];
  const add = (g, p, fonte, testo) => { righe.push({ g, p, fonte, testo }); punti[g] += p; };
  const val = (g, a) => (a === 'rel' ? relOk[g] : r[g + '|' + a] === true);
  const pot = g => (K.schede[g] && K.schede[g].potere ? K.schede[g].potere.id : null);
  for (const R of K.relazioni) {
    if (R.tipo === 'patto') {
      const ia = K.schede[R.a].intento, ib = K.schede[R.b].intento, ca = val(R.a, R.oa), cb = val(R.b, R.ob);
      const esito = ia === 'L' && ib === 'L' ? 'LL' : ia === 'T' && ib === 'T' ? 'TT' : 'LT';
      const titolo = nomePatto(R.oa, R.ob);
      if (esito === 'LL') {
        if (ca && cb) {
          add(R.a, cfg.pattoLL, 'patto', `${titolo} con ${nm(R.b)}: onorato da entrambi`);
          add(R.b, cfg.pattoLL, 'patto', `${titolo} con ${nm(R.a)}: onorato da entrambi`);
          relOk[R.a] = relOk[R.b] = true; riuscite.push([R.a, R.b]);
          if (pot(R.a) === 'benedizione' || pot(R.b) === 'benedizione') {
            add(R.a, 1, 'potere', 'Benedizione della Concordia'); add(R.b, 1, 'potere', 'Benedizione della Concordia');
          }
        } else {
          const chi = !ca && !cb ? 'nessuno dei due ha' : (!ca ? nm(R.a) : nm(R.b)) + ' non ha';
          add(R.a, 0, 'patto', `${titolo} con ${nm(R.b)}: leali, ma ${chi} completato l’obbligo`);
          add(R.b, 0, 'patto', `${titolo} con ${nm(R.a)}: leali, ma ${chi} completato l’obbligo`);
        }
      } else if (esito === 'TT') {
        add(R.a, cfg.doppio, 'patto', `${titolo} con ${nm(R.b)}: doppio tradimento`);
        add(R.b, cfg.doppio, 'patto', `${titolo} con ${nm(R.a)}: doppio tradimento`);
      } else {
        const L = ia === 'L' ? R.a : R.b, T = ia === 'L' ? R.b : R.a, cl = L === R.a ? ca : cb;
        if (pot(L) === 'assicurazione') add(L, 1, 'patto', `${titolo}: tradito da ${nm(T)}, ma assicurato (Congregazione dell’Oro)`);
        else add(L, cfg.tradito, 'patto', `${titolo}: tradito da ${nm(T)}`);
        add(T, cl ? cfg.tradimento : 0, 'patto', cl ? `${titolo}: ha tradito ${nm(L)}, che aveva completato` : `${titolo}: ha tradito ${nm(L)}, che però non aveva completato`);
      }
      patti.push({ a: R.a, b: R.b, ia, ib, ca, cb, esito, riuscito: esito === 'LL' && ca && cb });
    } else {
      const cb = val(R.b, R.ob);
      if (cb) {
        add(R.a, cfg.patrono, 'patrocinio', `Patrocinio a ${nm(R.b)}: obiettivo raggiunto`);
        add(R.b, cfg.beneficiario, 'patrocinio', `Patrocinio di ${nm(R.a)}: obiettivo raggiunto`);
        relOk[R.a] = relOk[R.b] = true; riuscite.push([R.a, R.b]);
      } else {
        add(R.a, 0, 'patrocinio', `Patrocinio a ${nm(R.b)}: obiettivo mancato`);
        add(R.b, 0, 'patrocinio', `Patrocinio di ${nm(R.a)}: obiettivo mancato`);
      }
      patrocini.push({ a: R.a, b: R.b, ok: cb });
    }
  }
  for (let g = 0; g < n; g++) if (!relazioneDi(S, k, g)) {
    const ok = val(g, 'colori:3');
    add(g, ok ? cfg.agente : 0, 'agente', ok ? 'Agente Libero: carte di almeno 3 colori' : 'Agente Libero: meno di 3 colori');
  }
  const d = DEC[K.elezione.eletto], soddisfatti = [];
  for (let g = 0; g < n; g++) if (val(g, d.req)) {
    soddisfatti.push(g);
    add(g, cfg.decreto, 'decreto', d.nome);
    if (pot(g) === 'privilegio') add(g, cfg.decreto, 'potere', 'Privilegio della Loggia: decreto doppio');
  }
  for (let g = 0; g < n; g++) if (pot(g) === 'proclama' && K.schede[g].voto === K.elezione.eletto) add(g, PROCLAMA, 'potere', 'Proclama degli Araldi');
  for (let g = 0; g < n; g++) {
    const s = K.schede[g];
    if (!s || !s.scommessa) continue;
    const { b, a } = s.scommessa, ok = val(b, a);
    if (ok) add(g, cfg.vinta, 'scommessa', `Scommessa vinta su ${nm(b)}: ${breve(a)}`);
    else if (pot(g) === 'velo') add(g, 0, 'scommessa', `Scommessa persa su ${nm(b)}: ${breve(a)} (coperta dal Velo)`);
    else add(g, cfg.persa, 'scommessa', `Scommessa persa su ${nm(b)}: ${breve(a)}`);
    scommesse.push({ g, b, a, ok });
  }
  return { righe, punti, relOk, riuscite, patti, patrocini, scommesse, decreto: { id: d.id, soddisfatti } };
}

/* ---------------- Missioni ---------------- */
function missioneApp(S, g) {
  const s = S.soc[g];
  if (s === 'concordia') {
    const partner = new Set();
    for (const k of [2, 3]) for (const [a, b] of S.risultati[k].riuscite) { if (a === g) partner.add(b); if (b === g) partner.add(a); }
    return partner.size >= 2;
  }
  if (s === 'araldi') return [2, 3].every(c => S.conclavi[c].schede[g].voto === S.conclavi[c].elezione.eletto);
  if (s === 'velo') return [2, 3].reduce((t, k) => t + S.risultati[k].scommesse.filter(x => x.g === g && x.ok).length, 0) >= 2;
  return false;
}
function domandeMissioni(S) {
  if (!S.soc) return [];
  return S.soc.map((id, g) => ({ g, soc: id })).filter(x => SOC[x.soc].verifica === 'tavolo');
}

/* ---------------- Passo ---------------- */
function passo(S, ev) {
  if (!ev || typeof ev !== 'object') no('Azione non valida.');
  const cfg = S.cfg, nm = g => S.nomi[g];
  switch (ev.t) {
    case 'fineEra': {
      if (S.fase !== 'era') no('Non si sta giocando un’Era.');
      log(S, `Fine dell’Era ${ROMANI[S.era]}`, 'era');
      if (S.era === 1) { S.fase = 'conclave'; S.c = 2; S.sub = 'mercato'; log(S, 'Si apre il Conclave II', 'conclave'); }
      else S.fase = 'verifica';
      return;
    }
    case 'relazione': {
      if (S.fase !== 'conclave' || S.sub !== 'mercato') no('Le relazioni si registrano durante il Mercato.');
      const { tipo, a, b } = ev;
      if (!intero(S, a) || !intero(S, b) || a === b) no('Scegli due giocatori diversi.');
      if (relazioneDi(S, S.c, a) || relazioneDi(S, S.c, b)) no('Ognuno può avere una sola relazione per Era.');
      const menu = obblighi(cfg);
      if (tipo === 'patto') {
        if (!menu.includes(ev.oa) || !menu.includes(ev.ob)) no('Obbligo non valido.');
        S.conclavi[S.c].relazioni.push({ tipo, a, b, oa: ev.oa, ob: ev.ob });
        log(S, `${nomePatto(ev.oa, ev.ob)}: ${nm(a)} (${breve(ev.oa)}) e ${nm(b)} (${breve(ev.ob)})`, 'relazione');
      } else if (tipo === 'patrocinio') {
        if (!cfg.patrocinio) no('Il Patrocinio è spento in questa partita.');
        if (!menu.includes(ev.ob)) no('Obiettivo non valido.');
        S.conclavi[S.c].relazioni.push({ tipo, a, b, ob: ev.ob });
        log(S, `Patrocinio: ${nm(a)} finanzia ${nm(b)} (${breve(ev.ob)}) con ${cfg.costoPatrocinio} monete`, 'relazione');
      } else no('Tipo di relazione sconosciuto.');
      return;
    }
    case 'urne': {
      if (S.fase !== 'conclave' || S.sub !== 'mercato') no('Le urne si aprono alla fine del Mercato.');
      S.sub = 'cabina'; S.conclavi[S.c].ordine = ordineCabina(S, S.c);
      log(S, 'Trattative chiuse: si vota in cabina', 'conclave');
      return;
    }
    case 'scheda': {
      if (S.fase !== 'conclave' || S.sub !== 'cabina') no('Non si sta votando.');
      const g = ev.g, K = S.conclavi[S.c];
      if (g !== prossimoInCabina(S)) no('Non è il turno di questa scheda.');
      if (!K.decreti.includes(ev.voto)) no('Scegli uno dei tre decreti.');
      const sigillo = ev.sigillo === true;
      if (sigillo && S.sigillo[g]) no('Il Sigillo d’Influenza è già stato usato.');
      const rel = relazioneDi(S, S.c, g), patto = !!rel && rel.R.tipo === 'patto';
      let intento = null;
      if (patto) { if (ev.intento !== 'L' && ev.intento !== 'T') no('Scegli Leale o Traditore.'); intento = ev.intento; }
      else if (ev.intento != null) no('Leale o Traditore si sceglie solo in un Patto.');
      let scommessa = null;
      if (ev.scommessa) {
        if (!cfg.scommesse) no('Le scommesse sono spente in questa partita.');
        const { b, a } = ev.scommessa;
        if (!intero(S, b) || b === g) no('Non puoi scommettere su te stesso.');
        if (rel && rel.partner === b) no('Non puoi scommettere su chi è in relazione con te in questa Era.');
        if (!SCOMMESSE.includes(a)) no('Scommessa non valida.');
        scommessa = { b, a };
      }
      let potere = null;
      if (ev.potere) {
        if (!S.soc) no('Le società sono spente in questa partita.');
        if (S.potere[g]) no('Il potere della società è già stato usato.');
        const so = socDi(S, g), id = ev.potere.id;
        if (!so || so.potere.id !== id) no('Questo potere non è della tua società.');
        if (id === 'cannocchiale') {
          const t = ev.potere.bersaglio;
          if (!intero(S, t) || t === g || !nelPatto(S, S.c, t)) no('Il Cannocchiale guarda solo un altro firmatario di un Patto.');
          potere = { id, bersaglio: t };
        } else if (id === 'veto') {
          if (!K.decreti.includes(ev.potere.decreto)) no('Il veto va posto su uno dei tre decreti.');
          potere = { id, decreto: ev.potere.decreto };
        } else if (id === 'assicurazione' || id === 'benedizione') {
          if (!patto) no('Questo potere si usa solo quando sei in un Patto.');
          potere = { id };
        } else if (id === 'velo') {
          if (!scommessa) no('Il Velo si dichiara insieme a una scommessa.');
          potere = { id };
        } else potere = { id };
        S.potere[g] = true;
      }
      if (sigillo) S.sigillo[g] = true;
      K.schede[g] = { voto: ev.voto, sigillo, intento, scommessa, potere };
      log(S, `${nm(g)} ha sigillato la scheda`, 'scheda');
      if (Object.keys(K.schede).length === S.n) {
        K.elezione = elezione(S, S.c);
        S.sub = 'esito';
        if (K.elezione.veto) log(S, `Veto della Fratellanza delle Lame su «${DEC[K.elezione.veto.vetato].nome}»`, 'veto');
        log(S, `Il Concilio approva «${DEC[K.elezione.eletto].nome}» per l’Era ${ROMANI[S.c]}`, 'decreto');
      }
      return;
    }
    case 'apriEra': {
      if (S.fase !== 'conclave' || S.sub !== 'esito') no('Il Conclave non è ancora chiuso.');
      S.fase = 'era'; S.era = S.c; S.sub = null;
      log(S, `Inizia l’Era ${ROMANI[S.era]}`, 'era');
      return;
    }
    case 'verifica': {
      if (S.fase !== 'verifica') no('Non è il momento della verifica.');
      const r = {};
      if (ev.r && typeof ev.r === 'object') for (const q of domande(S, S.era)) if (ev.r[q.key] === true) r[q.key] = true;
      const R = calcolaEra(S, S.era, r);
      R.risposte = r;
      S.risultati[S.era] = R;
      for (let g = 0; g < S.n; g++) S.punti[g] += R.punti[g];
      log(S, `Verifica dell’Era ${ROMANI[S.era]}: punti assegnati`, 'verifica');
      for (const p of R.patti) if (p.esito !== 'LL') log(S, p.esito === 'TT' ? `${nm(p.a)} e ${nm(p.b)} si sono traditi a vicenda` : `${nm(p.ia === 'T' ? p.a : p.b)} ha tradito ${nm(p.ia === 'T' ? p.b : p.a)}`, 'tradimento');
      if (S.era === 2) { S.fase = 'conclave'; S.c = 3; S.sub = 'mercato'; log(S, 'Si apre il Conclave III', 'conclave'); }
      else if (S.soc) S.fase = 'missioni';
      else { S.fase = 'finita'; log(S, 'Fine della partita', 'fine'); }
      return;
    }
    case 'missioni': {
      if (S.fase !== 'missioni') no('Non è il momento delle missioni.');
      const ok = S.soc.map((id, g) => (SOC[id].verifica === 'app' ? missioneApp(S, g) : !!(ev.r && ev.r[g] === true)));
      S.missioni = ok;
      ok.forEach((v, g) => { if (v) S.punti[g] += cfg.missione; });
      S.fase = 'finita';
      log(S, 'Società svelate: fine della partita', 'fine');
      return;
    }
    default: no('Azione sconosciuta.');
  }
}
function stato(P) {
  const S = iniziale(P);
  for (const ev of P.eventi) passo(S, ev);
  return S;
}
function applica(P, ev) {
  const S = stato(P);
  passo(S, ev);   // lancia ErroreGioco se l'azione non è valida
  return Object.assign({}, P, { eventi: P.eventi.concat([ev]) });
}
/* Annulla: solo azioni pubbliche. Una scheda sigillata non si riapre. */
const ANNULLABILI = new Set(['fineEra', 'relazione', 'urne', 'apriEra', 'verifica', 'missioni']);
function puoAnnullare(P) { return P.eventi.length > 0 && ANNULLABILI.has(P.eventi[P.eventi.length - 1].t); }
function annulla(P) {
  if (!puoAnnullare(P)) no('L’ultima azione non si può annullare.');
  return Object.assign({}, P, { eventi: P.eventi.slice(0, -1) });
}

/* ---------------- Viste ---------------- */
/* Tutto ciò che può stare sullo schermo condiviso */
function vistaPubblica(S) {
  const conclave = S.fase === 'conclave' ? (() => {
    const K = S.conclavi[S.c];
    return {
      c: S.c, decreti: K.decreti.slice(), relazioni: K.relazioni.map(R => Object.assign({}, R)),
      fatte: Object.keys(K.schede).length, ordine: K.ordine ? K.ordine.slice() : null, prossimo: prossimoInCabina(S),
      eletto: S.sub === 'esito' ? K.elezione.eletto : null,
      veto: S.sub === 'esito' && K.elezione.veto ? K.elezione.veto.vetato : null
    };
  })() : null;
  const inCorso = S.era >= 2 && (S.fase === 'era' || S.fase === 'verifica') ? (() => {
    const K = S.conclavi[S.era];
    return { era: S.era, decreto: K.elezione.eletto, relazioni: K.relazioni.map(R => Object.assign({}, R)) };
  })() : null;
  return {
    fase: S.fase, era: S.era, sub: S.sub, n: S.n, nomi: S.nomi.slice(),
    cfg: Object.assign({}, S.cfg), societa: !!S.soc,
    conclave, inCorso,
    risultati: Object.fromEntries(Object.entries(S.risultati).map(([k, R]) => [k, { righe: R.righe.map(x => Object.assign({}, x)), punti: R.punti.slice(), decreto: R.decreto.id }])),
    punti: S.punti.slice(),
    missioni: S.missioni ? S.missioni.slice() : null,
    socSvelate: S.fase === 'finita' && S.soc ? S.soc.slice() : null,
    cronologia: S.cronologia.map(x => Object.assign({}, x))
  };
}
/* Quello che vede g nella sua cabina o quando rilegge la società */
function vistaPrivata(S, g) {
  const so = socDi(S, g), c = S.fase === 'conclave' ? S.c : null;
  return {
    g, nome: S.nomi[g],
    societa: so ? { id: so.id, nome: so.nome, simbolo: so.simbolo, missione: so.missione, potere: Object.assign({}, so.potere), usato: S.potere[g], verifica: so.verifica } : null,
    sigilloUsato: S.sigillo[g],
    relazione: c ? relazioneDi(S, c, g) : null,
    schede: [2, 3].filter(k => S.conclavi[k].schede[g]).map(k => Object.assign({ c: k }, S.conclavi[k].schede[g]))
  };
}
/* Cosa può scegliere g nella cabina in corso */
function opzioniScheda(S, g) {
  if (S.fase !== 'conclave' || S.sub !== 'cabina') return null;
  const K = S.conclavi[S.c], rel = relazioneDi(S, S.c, g), so = socDi(S, g);
  const firmatari = [];
  for (const R of K.relazioni) if (R.tipo === 'patto') firmatari.push(R.a, R.b);
  let potere = null;
  if (so && !S.potere[g]) {
    const p = so.potere;
    let ok = true, motivo = '', bersagli = null;
    if (p.id === 'cannocchiale') { bersagli = firmatari.filter(x => x !== g); ok = bersagli.length > 0; motivo = 'Nessun altro ha firmato un Patto in questo Conclave.'; }
    if ((p.id === 'assicurazione' || p.id === 'benedizione') && !(rel && rel.R.tipo === 'patto')) { ok = false; motivo = 'Si usa solo quando sei in un Patto.'; }
    if (p.id === 'velo' && !S.cfg.scommesse) { ok = false; motivo = 'Le scommesse sono spente.'; }
    potere = { id: p.id, nome: p.nome, testo: p.testo, ok, motivo, bersagli };
  }
  return {
    c: S.c, decreti: K.decreti.slice(),
    sigillo: !S.sigillo[g],
    patto: rel && rel.R.tipo === 'patto' ? { partner: rel.partner, mio: rel.mio, suo: rel.suo, nome: nomePatto(rel.R.oa, rel.R.ob) } : null,
    relazione: rel,
    scommessa: S.cfg.scommesse ? { bersagli: Array.from({ length: S.n }, (_, i) => i).filter(b => b !== g && !(rel && rel.partner === b)), tipi: SCOMMESSE.slice() } : null,
    potere
  };
}
/* Voti già sigillati (potere Scrutinio dei Cartografi) */
function scrutinio(S) {
  if (S.fase !== 'conclave' || S.sub !== 'cabina') return null;
  const K = S.conclavi[S.c];
  return { decreti: K.decreti.slice(), voti: conta(S, S.c, K.schede), schede: Object.keys(K.schede).length };
}
/* Cannocchiale usato nel Conclave c: chi lo ha usato e cosa vede (solo a urne chiuse) */
function cannocchiale(S, c) {
  const K = S.conclavi[c];
  if (!K.elezione) return null;
  for (const k in K.schede) {
    const p = K.schede[k].potere;
    if (p && p.id === 'cannocchiale') return { chi: +k, bersaglio: p.bersaglio, intento: K.schede[p.bersaglio].intento };
  }
  return null;
}
/* Archivio segreto: tutto, solo a partita finita */
function archivio(S) {
  if (S.fase !== 'finita') return null;
  return {
    soc: S.soc ? S.soc.slice() : null, missioni: S.missioni ? S.missioni.slice() : null,
    conclavi: [2, 3].map(c => {
      const K = S.conclavi[c];
      return { c, decreti: K.decreti.slice(), elezione: JSON.parse(JSON.stringify(K.elezione)), relazioni: K.relazioni.map(R => Object.assign({}, R)), schede: JSON.parse(JSON.stringify(K.schede)) };
    })
  };
}
/* Classifica dei punti dell'espansione, con le voci per giocatore */
function finale(S) {
  const voci = Array.from({ length: S.n }, () => []);
  for (const k of [2, 3]) if (S.risultati[k]) for (const r of S.risultati[k].righe) voci[r.g].push(Object.assign({ era: k }, r));
  if (S.missioni) S.missioni.forEach((ok, g) => voci[g].push({ era: 'fine', g, p: ok ? S.cfg.missione : 0, fonte: 'missione', testo: `${SOC[S.soc[g]].nome}: missione ${ok ? 'compiuta' : 'fallita'}` }));
  return S.nomi.map((nome, g) => ({ g, nome, punti: S.punti[g], voci: voci[g], soc: S.soc ? S.soc[g] : null })).sort((a, b) => b.punti - a.punti);
}
/* Riassunto per lo storico (serve a bilanciare) */
function riassunto(S, P) {
  const R2 = S.risultati[2], R3 = S.risultati[3];
  const ere = [R2, R3].filter(Boolean);
  return {
    id: P.id, t: Date.now(), n: S.n,
    cfg: { soglia: S.cfg.soglia, pattoLL: S.cfg.pattoLL, tradimento: S.cfg.tradimento, tradito: S.cfg.tradito, doppio: S.cfg.doppio, patrocinio: S.cfg.patrocinio, scommesse: S.cfg.scommesse, societa: S.cfg.societa },
    patti: ere.flatMap(R => R.patti.map(p => ({ esito: p.esito, riuscito: p.riuscito, ca: p.ca, cb: p.cb }))),
    patrocini: ere.flatMap(R => R.patrocini.map(p => ({ ok: p.ok }))),
    scommesse: ere.flatMap(R => R.scommesse.map(s => ({ a: s.a, ok: s.ok }))),
    decreti: ere.map(R => ({ id: R.decreto.id, sodd: R.decreto.soddisfatti.length })),
    punti: S.punti.slice(),
    missioni: S.missioni ? S.soc.map((id, g) => ({ soc: id, ok: S.missioni[g] })) : null
  };
}

const SS = {
  COLORI, DECRETI, DEC, FAMIGLIE, SOCIETA, SOC, DEF, LIMITI, PRESET, SCOMMESSE, OBBLIGHI_BASE, ROMANI, MIN_G, MAX_G, PROCLAMA,
  configura, randIntCrypto, mescola, nuovaPartita, stato, applica, puoAnnullare, annulla, ErroreGioco,
  requisito, requisitoValido, breve, obblighi, nomePatto, relazioneDi, prossimoInCabina, ordineCabina, conta, elezione,
  domande, calcolaEra, domandeMissioni, missioneApp,
  vistaPubblica, vistaPrivata, opzioniScheda, scrutinio, cannocchiale, archivio, finale, riassunto, societaDisponibili
};
if (typeof module !== 'undefined' && module.exports) module.exports = SS; else self.SS = SS;
})();
