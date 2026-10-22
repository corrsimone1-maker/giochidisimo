/* =====================================================================
   MENTAL — la sfida del giorno: parte comune
   Lo usano la pagina (giochi/mental/index.html), i motori (giochi/mental/motori/*.js),
   lo strumento che prepara le sfide (strumenti/mental.js) e le prove (prove/mental.test.js).

   Regole del gioco quotidiano:
   - il giorno è quello di Roma (Europe/Rome): la sfida cambia a mezzanotte italiana,
     anche con l'ora legale, e anche per chi è all'estero;
   - ogni giorno c'è una sola sfida, già preparata e verificata (strumenti/mental.js),
     uguale per tutti: sta nei file giochi/mental/sfide/AAAA-MM.js;
   - il numero della sfida conta i giorni dal lancio (LANCIO è la #1).
   Non c'è un server: la data viene dall'orologio del telefono e i risultati restano
   sul telefono. Niente classifica: ognuno si salva tempi e giorni completati.
   ===================================================================== */
(function () {
'use strict';
const M = (typeof self !== 'undefined' ? self : globalThis).MENTAL = (typeof self !== 'undefined' ? self : globalThis).MENTAL || {};
M.motori = M.motori || {};

const LANCIO = '2026-10-22';
const FUSO = 'Europe/Rome';

/* ---------------- Date ----------------
   Le date sono stringhe 'AAAA-MM-GG'. I conti sui giorni si fanno in UTC a mezzogiorno,
   così l'ora legale non sposta mai una data. */
const fmt = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return null; } })();
function giornoRoma(t) {
  const d = t instanceof Date ? t : new Date(t == null ? Date.now() : t);
  if (fmt) {
    const p = {}; for (const x of fmt.formatToParts(d)) p[x.type] = x.value;
    return `${p.year}-${p.month}-${p.day}`;
  }
  // senza Intl (non dovrebbe succedere): ora italiana approssimata con UTC+1
  return new Date(d.getTime() + 3600e3).toISOString().slice(0, 10);
}
const aUTC = s => { const [a, m, g] = s.split('-').map(Number); return Date.UTC(a, m - 1, g, 12); };
const daUTC = t => new Date(t).toISOString().slice(0, 10);
const piuGiorni = (s, k) => daUTC(aUTC(s) + k * 864e5);
const differenza = (a, b) => Math.round((aUTC(b) - aUTC(a)) / 864e5);   // giorni da a a b
const numero = s => differenza(LANCIO, s) + 1;
const dataDelNumero = n => piuGiorni(LANCIO, n - 1);
const dataValida = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && daUTC(aUTC(s)) === s;
/* Il primo istante (ms) in cui a Roma è già il giorno dopo: ricerca binaria, giusta anche nei
   giorni da 23 e 25 ore */
function prossimaMezzanotte(t) {
  const ora = t == null ? Date.now() : +t, oggi = giornoRoma(ora);
  let lo = ora, hi = ora + 26 * 3600e3;
  while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (giornoRoma(mid) === oggi) lo = mid; else hi = mid; }
  // il cambio di giorno cade su un secondo intero, in (lo, hi]
  for (let s = Math.floor(lo / 1000) * 1000 + 1000; s <= hi + 1000; s += 1000) if (giornoRoma(s) !== oggi) return s;
  return hi;
}
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const giornoSettimana = s => new Date(aUTC(s)).getUTCDay();          // 0 = domenica
function dataLunga(s) { const [a, m, g] = s.split('-').map(Number); return `${GIORNI[giornoSettimana(s)]} ${g} ${MESI[m - 1]}`; }
function dataCorta(s) { const [, m, g] = s.split('-').map(Number); return `${g} ${MESI[m - 1].slice(0, 3)}`; }
const meseDi = s => s.slice(0, 7);

/* ---------------- Tempi ---------------- */
function tempo(ms) {
  if (ms == null || !isFinite(ms)) return '—';
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
}

/* ---------------- Casualità ----------------
   prng(seme): stessa sequenza su ogni computer (mulberry32, solo interi). Serve allo strumento
   che prepara le sfide: lo stesso seme dà la stessa sfida. */
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function prng(seme) {
  let a = hash(String(seme))();
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = n => Math.floor(next() * n);
  r.p = p => next() < p;
  r.f = next;
  r.mescola = arr => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = r(i + 1); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  r.scegli = arr => arr[r(arr.length)];
  return r;
}

/* ---------------- Livelli ---------------- */
const LIVELLI = {
  impegnativa: { nome: 'Impegnativa', ordine: 1 },
  esperta: { nome: 'Esperta', ordine: 2 },
  estrema: { nome: 'Estrema', ordine: 3 }
};

/* ---------------- Palinsesto ----------------
   Ogni giorno, se si può, una sfida di un tipo diverso. Un «tipo» è un gioco generato (corone,
   sudoku, lucchetto…) o una categoria di enigmi scritti a mano (enigma:problema, enigma:sciarada…);
   ogni tipo ha una famiglia (griglia, cifre, logica, numeri, parole, figure).
   Regole (le controllano le prove):
   - mai la stessa famiglia due giorni di fila, se si può;
   - lo stesso tipo torna il più tardi possibile: si sceglie il tipo più «in ritardo» rispetto al
     suo ritmo (giorni dall'ultima volta / intervallo ideale), e mai prima di MINIMO giorni se si può;
   - livelli: domenica estrema; sabato esperta o estrema; in settimana impegnativa o esperta,
     un po' dell'una e un po' dell'altra. */
const FAMIGLIE = { corone: 'griglia', stelle: 'griglia', binario: 'griglia', campo: 'griglia', nonogramma: 'griglia', sudoku: 'cifre', grattacieli: 'cifre', futoshiki: 'cifre', cavalieri: 'logica' };
const MINIMO = 6;
function tipoSfida(gioco, p) { const E = M.motori[gioco]; return E && E.tipoDi && p ? E.tipoDi(p) : gioco; }
function famigliaSfida(gioco, p) { const E = M.motori[gioco]; return (E && E.famigliaDi && p ? E.famigliaDi(p) : E && E.famiglia) || FAMIGLIE[gioco] || 'altro'; }
function nomeSfida(s) { const E = M.motori[s.gioco]; return E ? (E.nomeDi ? E.nomeDi(s.p) : E.nome) : s.gioco; }
function livelliAmmessi(data) { const g = giornoSettimana(data); return g === 0 ? ['estrema'] : g === 6 ? ['esperta', 'estrema'] : ['impegnativa', 'esperta']; }
/* Livello preferito per un giorno feriale: quello meno usato da lunedì a ieri; a parità, l'opposto di ieri */
function livelloPreferito(data, storia) {
  const g = giornoSettimana(data);
  if (g === 0) return 'estrema';
  if (g === 6) return 'esperta';
  const conta = { impegnativa: 0, esperta: 0 };
  for (let k = 1; k <= (g + 6) % 7; k++) { const x = storia[piuGiorni(data, -k)]; if (x && conta[x.livello] != null) conta[x.livello]++; }
  if (conta.impegnativa !== conta.esperta) return conta.impegnativa < conta.esperta ? 'impegnativa' : 'esperta';
  const ieri = storia[piuGiorni(data, -1)];
  return ieri && ieri.livello === 'impegnativa' ? 'esperta' : 'impegnativa';
}
function giorniDa(data, storia, chiave, valore, max = 400) {
  for (let k = 1; k <= max; k++) { const x = storia[piuGiorni(data, -k)]; if (x && x[chiave] === valore) return k; }
  return null;
}
/* Sceglie tra i candidati quello del giorno.
   candidati: [{ tipo, famiglia, livelli: [livelli disponibili], periodo, ultimo (data «virtuale» se non c'è nella storia) }]
   storia: mappa data → { tipo, famiglia, livello }. Restituisce { c, livello, u, rilassa } o null
   (rilassa 0: tutte le regole rispettate; 1: tipo troppo vicino o stessa famiglia di ieri; 2: livello fuori dal giorno). */
function scegliDelGiorno(data, storia, candidati, r) {
  const ammessi = livelliAmmessi(data), pref = livelloPreferito(data, storia);
  const ieri = storia[piuGiorni(data, -1)], altroieri = storia[piuGiorni(data, -2)];
  const valuta = (c, rilassa) => {
    const livs = c.livelli.filter(l => ammessi.includes(l));
    if (!livs.length && rilassa < 2) return null;
    let gd = giorniDa(data, storia, 'tipo', c.tipo);
    if (gd == null) gd = c.ultimo ? differenza(c.ultimo, data) : c.periodo;
    if (gd < MINIMO && rilassa < 1) return null;
    if (ieri && ieri.famiglia === c.famiglia && rilassa < 1) return null;
    let u = gd / c.periodo;
    if (altroieri && altroieri.famiglia === c.famiglia) u -= 0.15;
    if (ieri && ieri.famiglia === c.famiglia) u -= 5;
    u += r.f() * 0.05;
    const livello = livs.length ? (livs.includes(pref) ? pref : livs.includes('estrema') && ammessi.includes('estrema') ? 'estrema' : livs[0]) : (c.livelli.includes('esperta') ? 'esperta' : c.livelli[0]);
    return { c, livello, u, rilassa };
  };
  for (const rilassa of [0, 1, 2]) {
    const v = candidati.map(c => valuta(c, rilassa)).filter(Boolean);
    if (v.length) { v.sort((a, b) => b.u - a.u); return v[0]; }
  }
  return null;
}

/* ---------------- Titoli ----------------
   Un titolo per sfida, dal suo gioco, senza ripetersi finché la lista non finisce. */
const TITOLI = {
  corone: ['L’ultima corona', 'Regni stretti', 'Il trono vacante', 'Le regine', 'La corte divisa', 'Corone di confine', 'Il regno storto', 'Dinastie', 'La successione', 'Feudi', 'Il consiglio delle regine', 'Corona contesa', 'Il palazzo delle stanze', 'Terre di nessuno', 'L’incoronazione'],
  stelle: ['Il cielo impossibile', 'Costellazione stretta', 'Due per volta', 'Notte senza luna', 'Polvere di stelle', 'Le gemelle', 'Cielo d’agosto', 'Orsa minore', 'Il carro', 'Stelle fisse', 'Firmamento', 'Doppia luce', 'Via Lattea', 'Le Pleiadi', 'Cielo a scacchi'],
  binario: ['Uno e zero', 'Bianco e nero', 'Il codice binario', 'Pari e dispari', 'Equilibrio', 'Né tre né due', 'Il bit mancante', 'Interruttori', 'Testa o croce', 'Doppio filo', 'Simmetrie', 'Luce e ombra', 'Acceso spento', 'Il registro', 'Contrappunto'],
  sudoku: ['La nona cifra', 'Nove per nove', 'Il quadrato perfetto', 'Blocchi', 'Cifre in fila', 'Il riquadro', 'Senza ripetizioni', 'La griglia', 'Ottantuno', 'Il numero mancante', 'Incastri', 'Il nodo', 'Candidati', 'Tre per tre', 'L’ultima casella'],
  campo: ['Campo minato', 'Passi leggeri', 'Il prato', 'Terreno incerto', 'Nessun azzardo', 'Sentiero sicuro', 'Bandiere rosse', 'La radura', 'Sotto l’erba', 'Il guado', 'Sminatori', 'Mappa del rischio', 'Il campo fiorito', 'Passo dopo passo', 'Zona rossa'],
  grattacieli: ['Orizzonte cieco', 'Skyline', 'Torri', 'Vista dall’alto', 'La città verticale', 'Chi vede chi', 'Prospettive', 'Il belvedere', 'Profili', 'Palazzi', 'Dal tetto', 'La quinta torre', 'Panorama', 'Linea di vista', 'Altezze'],
  futoshiki: ['Più o meno', 'Disuguaglianze', 'Maggiore di', 'Catene', 'Il verso giusto', 'Frecce', 'Ordine sparso', 'Scalini', 'Pendenze', 'Gerarchie', 'La salita', 'Minore uguale', 'Confronti', 'Sotto e sopra', 'La scala'],
  nonogramma: ['Pixel nascosti', 'L’immagine sepolta', 'Mosaico', 'Ricamo', 'Tessere', 'Il disegno segreto', 'Punti e linee', 'Trama', 'Il negativo', 'Pixel per pixel', 'Ombre', 'Intarsio', 'La tela', 'Puntinismo', 'Ordito'],
  'codice:lucchetto': ['La combinazione', 'Il lucchetto', 'Cassaforte', 'Il catenaccio', 'Lo scrigno', 'Chiuso a chiave', 'Il forziere', 'La valigetta', 'Lucchetto da bici', 'Il diario segreto', 'Tre cifre', 'Il portone'],
  'codice:colori': ['Codice a colori', 'Pioli', 'Tentativi', 'Il codice segreto', 'Arcobaleno nascosto', 'Pennarelli', 'Biglie', 'Vetrate', 'Tavolozza', 'Coriandoli', 'Gettoni', 'Perline'],
  linea: ['In fila', 'Chi arriva prima', 'L’ordine giusto', 'Uno dopo l’altro', 'La coda', 'Scaffali', 'Il condominio', 'Il traguardo', 'Prima e dopo', 'Sopra e sotto', 'La processione', 'In ordine sparso'],
  bilancia: ['La moneta falsa', 'Il falsario', 'Pesi e contrappesi', 'Due piatti', 'La zecca', 'L’intruso', 'Equilibri', 'Il tesoretto', 'Monete sospette', 'La bilancia', 'Il conio', 'Il sacchetto'],
  calcolatrice: ['La calcolatrice rotta', 'Tasti strani', 'Il display', 'Mosse contate', 'Cifre al contrario', 'Quattro tasti', 'Il numero giusto', 'Scorciatoie', 'La tastiera matta', 'Calcoli storti', 'Solo questi tasti', 'Pochi tasti'],
  travasi: ['Travasi', 'La brocca giusta', 'Mezzo pieno', 'Senza tacche', 'L’oste', 'Alla fontana', 'Le botti', 'Misure', 'Litri contati', 'La cantina', 'Il pozzo', 'Acqua e pazienza'],
  cavalieri: ['Se mento, dico il vero', 'L’isola dei bugiardi', 'Parola d’onore', 'Mezze verità', 'Il villaggio', 'Chi mente?', 'Giuramenti', 'Testimoni', 'La riunione', 'Fiducia', 'Al tramonto', 'Voci di piazza', 'Il patto', 'Accuse', 'Sulla spiaggia']
};
function titoloDelGiorno(tipo, s, usati) {
  const lista = TITOLI[tipo] || TITOLI[tipo.split(':')[0]] || [tipo];
  const liberi = lista.filter(t => !usati.has(t));
  const r = prng('titolo|' + s);
  return r.scegli(liberi.length ? liberi : lista);
}

/* ---------------- Sfide pubblicate ----------------
   I file giochi/mental/sfide/AAAA-MM.js chiamano MENTAL.mese('AAAA-MM', [sfide]).
   giochi/mental/sfide/indice.js dice quali mesi esistono e fino a che giorno arrivano. */
M.dati = M.dati || {};
M.mese = function (m, sfide) { M.mesiCaricati = M.mesiCaricati || {}; M.mesiCaricati[m] = true; for (const s of sfide) M.dati[s.data] = s; };

/* Piccoli aiuti per i motori */
const intorno = (n, i, diag = true) => {             // vicini di i in una griglia n×n (8 o 4 direzioni)
  const r = Math.floor(i / n), c = i % n, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue; if (!diag && dr && dc) continue;
    const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
  }
  return out;
};
/* Quadrato latino n×n a caso (righe e colonne con 1…n una volta), con ripartenza:
   il riempimento in avanti a volte si incastra per minuti */
function quadratoLatino(r, n) {
  for (;;) {
    const v = Array(n * n).fill(0);
    let passi = 0;
    const giro = i => {
      if (++passi > 4000) return false;
      if (i === n * n) return true;
      const rr = Math.floor(i / n), cc = i % n;
      for (const d of r.mescola([...Array(n).keys()].map(x => x + 1))) {
        let ok = true;
        for (let k = 0; k < cc && ok; k++) if (v[rr * n + k] === d) ok = false;
        for (let k = 0; k < rr && ok; k++) if (v[k * n + cc] === d) ok = false;
        if (!ok) continue;
        v[i] = d; if (giro(i + 1)) return true;
      }
      v[i] = 0; return false;
    };
    if (giro(0)) return v;
  }
}
function combinazioni(arr, k, f) {                    // chiama f su ogni sottoinsieme di k elementi (si ferma se f restituisce true)
  const sc = [];
  const giro = (i) => {
    if (sc.length === k) return f(sc.slice());
    for (let j = i; j <= arr.length - (k - sc.length); j++) { sc.push(arr[j]); if (giro(j + 1)) return true; sc.pop(); }
    return false;
  };
  return giro(0);
}

Object.assign(M, {
  LANCIO, FUSO, LIVELLI, TITOLI,
  giornoRoma, piuGiorni, differenza, numero, dataDelNumero, dataValida, prossimaMezzanotte, dataLunga, dataCorta, meseDi, giornoSettimana, MESI, GIORNI,
  tempo, prng, titoloDelGiorno, intorno, combinazioni, quadratoLatino,
  FAMIGLIE, MINIMO, tipoSfida, famigliaSfida, nomeSfida, livelliAmmessi, livelloPreferito, giorniDa, scegliDelGiorno
});
if (typeof module !== 'undefined' && module.exports) module.exports = M;
})();
