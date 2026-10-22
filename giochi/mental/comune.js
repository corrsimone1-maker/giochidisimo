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
   Che gioco e che livello esce in un giorno: lo decide lo strumento quando prepara le sfide,
   con queste regole (le controllano anche le prove):
   - mai lo stesso gioco due giorni di fila, né due volte in 8 giorni se si può;
   - mai più di due giochi «di cifre» (sudoku, grattacieli, futoshiki) di fila;
   - ogni settimana (da lunedì a domenica) un gioco di parole (cavalieri), in un giorno a caso;
   - il primo giorno (LANCIO) escono le Corone;
   - livelli: sabato esperta, domenica estrema; in settimana ogni gioco alterna impegnativa ed esperta. */
const CIFRE = new Set(['sudoku', 'grattacieli', 'futoshiki']);
/* Livello del giorno s per il gioco già scelto. storia: mappa data → { gioco, livello } dei giorni prima.
   In settimana ogni gioco alterna: se l'ultima volta (in settimana) era impegnativa ora è esperta e
   viceversa; la prima volta decide il numero della sfida. */
function livelloDelGiorno(s, gioco, storia) {
  const g = giornoSettimana(s);
  if (g === 0) return 'estrema';
  if (g === 6) return 'esperta';
  if (gioco && storia) {
    for (let k = 1; k <= 400; k++) {
      const d = piuGiorni(s, -k), x = storia[d];
      if (!x) { if (d < LANCIO) break; continue; }
      const gg = giornoSettimana(d);
      if (x.gioco === gioco && gg !== 0 && gg !== 6) return x.livello === 'impegnativa' ? 'esperta' : 'impegnativa';
    }
  }
  return numero(s) % 2 ? 'impegnativa' : 'esperta';
}
/* Sceglie il gioco del giorno s conoscendo quelli dei giorni prima (mappa data → id).
   Il gioco di parole ha un giorno suo in ogni settimana: a blocchi di 7 settimane, ogni giorno
   della settimana una volta in ordine sparso (così cambia giorno e livello senza capitare sempre di
   domenica); negli altri giorni non esce. */
function giornoDiParole(lun) {                                       // 0 = lunedì … 6 = domenica
  const lun0 = piuGiorni(LANCIO, -((giornoSettimana(LANCIO) + 6) % 7));
  const k = Math.floor(differenza(lun0, lun) / 7), blocco = Math.floor(k / 7);
  return prng('parole|' + blocco).mescola([0, 1, 2, 3, 4, 5, 6])[((k % 7) + 7) % 7];
}
function giocoDelGiorno(s, precedenti, disponibili) {
  if (s === LANCIO && disponibili.includes('corone')) return 'corone';          // si parte con le Corone
  const r = prng('palinsesto|' + s);
  const ieri = precedenti[piuGiorni(s, -1)], altroieri = precedenti[piuGiorni(s, -2)];
  // giochi usati negli ultimi 7 giorni (per variare, anche il giorno della settimana) e nella settimana in corso
  const recenti = new Set(); for (let k = 1; k <= 7; k++) { const x = precedenti[piuGiorni(s, -k)]; if (x) recenti.add(x); }
  const g = (giornoSettimana(s) + 6) % 7, lun = piuGiorni(s, -g);
  const settimana = []; for (let d = lun; d < s; d = piuGiorni(d, 1)) if (precedenti[d]) settimana.push(precedenti[d]);
  if (disponibili.includes('cavalieri')) {
    // il suo giorno (o il primo utile dopo, se ieri c'era già) se nella settimana non c'è ancora stato
    const giorno = giornoDiParole(lun), primo = differenza(lun, LANCIO);
    if (giorno >= primo && g >= giorno && !settimana.includes('cavalieri') && ieri !== 'cavalieri') return 'cavalieri';
  }
  let pool = disponibili.filter(x => x !== ieri && x !== 'cavalieri');
  if (CIFRE.has(ieri) && CIFRE.has(altroieri)) pool = pool.filter(x => !CIFRE.has(x));
  const nuovi = pool.filter(x => !recenti.has(x));
  return r.scegli(nuovi.length ? nuovi : pool);
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
  cavalieri: ['Se mento, dico il vero', 'L’isola dei bugiardi', 'Parola d’onore', 'Mezze verità', 'Il villaggio', 'Chi mente?', 'Giuramenti', 'Testimoni', 'La riunione', 'Fiducia', 'Al tramonto', 'Voci di piazza', 'Il patto', 'Accuse', 'Sulla spiaggia']
};
function titoloDelGiorno(gioco, s, usati) {
  const lista = TITOLI[gioco] || [gioco];
  const liberi = lista.filter(t => !usati.has(gioco + '|' + t));
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
  LANCIO, FUSO, LIVELLI, CIFRE, TITOLI,
  giornoRoma, piuGiorni, differenza, numero, dataDelNumero, dataValida, prossimaMezzanotte, dataLunga, dataCorta, meseDi, giornoSettimana, MESI, GIORNI,
  tempo, prng, livelloDelGiorno, giocoDelGiorno, titoloDelGiorno, giornoDiParole, intorno, combinazioni, quadratoLatino
});
if (typeof module !== 'undefined' && module.exports) module.exports = M;
})();
