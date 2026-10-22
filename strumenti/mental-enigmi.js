/* =====================================================================
   MENTAL — catalogo degli enigmi scritti a mano
   Ogni voce diventa una sfida del giorno (gioco 'enigma'), una volta sola: lo strumento
   (strumenti/mental.js) le prende da qui, le mette in calendario e ne mescola la soluzione.

   Campi: id (unico, non si cambia), cat (vedi CATEGORIE in giochi/mental/motori/enigma.js), livello,
   titolo, forma ('numero' | 'frazione' | 'parola' | 'parole' | 'ordine' | 'scelta'), testo (HTML),
   figura (SVG, facoltativa), campi (per 'parole'), opzioni (per 'ordine' e 'scelta'), unita,
   risposta, accetta (varianti accettate), spiegazione (HTML), verifica.

   Regole per scriverne di nuovi:
   - originali, in italiano, senza bisogno di sapere cose (tutto quello che serve è nel testo);
   - una sola risposta giusta: scrivi tra le varianti accettate tutti i modi ragionevoli di dirla;
   - «verifica» è una funzione che ricalcola la risposta da zero (forza bruta, simulazione):
     la prova node/prove/mental.test.js la confronta con «risposta». Per indovinelli e giochi di
     parole, dove un programma non può controllare, «verifica» manca e «controllo» dice perché la
     risposta è unica.
   ===================================================================== */
'use strict';

const C = { linea: '#A3A8D6', testo: '#ECEEFF', menta: '#3DDCA0', ambra: '#F2B84B', fondo: '#1C2048', corallo: '#FF6B6B' };
const svg = (w, h, corpo) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="Figtree, system-ui, sans-serif">${corpo}</svg>`;

/* Figure */
function figuraStanze() {
  // rettangolo diviso da una riga e una colonna, aree 6, 8, 12, ? (in scala: larghezze 3:4, altezze 1:2)
  const W = 280, H = 180, x = Math.round(W * 3 / 7), y = Math.round(H / 3), o = 10;
  const t = (cx, cy, s, col = C.testo) => `<text x="${cx}" y="${cy}" fill="${col}" font-size="26" font-weight="800" text-anchor="middle" dominant-baseline="central">${s}</text>`;
  return svg(W + 2 * o, H + 2 * o, `<g transform="translate(${o},${o})" fill="none" stroke="${C.linea}" stroke-width="3"><rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="${C.fondo}"/><path d="M${x} 0V${H}M0 ${y}H${W}"/></g>` +
    t(o + x / 2, o + y / 2, 6) + t(o + x + (W - x) / 2, o + y / 2, 8) + t(o + x / 2, o + y + (H - y) / 2, 12) + t(o + x + (W - x) / 2, o + y + (H - y) / 2, '?', C.ambra));
}
function figuraGriglia() {
  const w = 5, h = 4, s = 50, o = 26, X = 2, Y = 2;
  let g = '';
  for (let i = 0; i <= w; i++) g += `<path d="M${o + i * s} ${o}V${o + h * s}"/>`;
  for (let j = 0; j <= h; j++) g += `<path d="M${o} ${o + j * s}H${o + w * s}"/>`;
  const px = i => o + i * s, py = j => o + (h - j) * s;
  return svg(w * s + 2 * o, h * s + 2 * o, `<g stroke="${C.linea}" stroke-width="3" stroke-linecap="round">${g}</g>
    <g stroke="${C.corallo}" stroke-width="5" stroke-linecap="round"><path d="M${px(X) - 11} ${py(Y) - 11}l22 22M${px(X) + 11} ${py(Y) - 11}l-22 22"/></g>
    <circle cx="${px(0)}" cy="${py(0)}" r="11" fill="${C.menta}"/><text x="${px(0)}" y="${py(0)}" fill="#05261A" font-size="13" font-weight="800" text-anchor="middle" dominant-baseline="central">A</text>
    <circle cx="${px(w)}" cy="${py(h)}" r="11" fill="${C.menta}"/><text x="${px(w)}" y="${py(h)}" fill="#05261A" font-size="13" font-weight="800" text-anchor="middle" dominant-baseline="central">B</text>`);
}
function figuraIngranaggi() {
  const ruota = (cx, cy, r, denti) => {
    let d = '';
    for (let k = 0; k < denti; k++) {
      const a = (2 * Math.PI * k) / denti, passo = Math.PI / denti;
      const p = (ang, rr) => `${(cx + rr * Math.cos(ang)).toFixed(1)} ${(cy + rr * Math.sin(ang)).toFixed(1)}`;
      d += `${k ? 'L' : 'M'}${p(a, r + 6)}L${p(a + passo * .6, r + 6)}L${p(a + passo, r)}L${p(a + passo * 1.4, r)}`;
    }
    return `<path d="${d}Z" fill="${C.fondo}" stroke="${C.linea}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="5" fill="${C.linea}"/>`;
  };
  const scritta = (x, y, t) => `<text x="${x}" y="${y}" fill="${C.testo}" font-size="15" font-weight="800" text-anchor="middle" dominant-baseline="central">${t}</text>`;
  return svg(300, 150, ruota(52, 75, 42, 24) + ruota(154, 75, 54, 36) + ruota(250, 75, 30, 16) + scritta(52, 100, '24') + scritta(154, 108, '36') + scritta(250, 94, '16'));
}

/* Piccoli aiuti per le verifiche */
const mcd = (a, b) => { while (b) [a, b] = [b, a % b]; return Math.abs(a); };
const frazione = (n, d) => { const g = mcd(n, d); return `${n / g}/${d / g}`; };
const cesare = (s, k) => s.replace(/[A-Z]/g, c => String.fromCharCode(((c.charCodeAt(0) - 65 + k) % 26 + 26) % 26 + 65));

const ENIGMI = [
  {
    id: 'orologi-nonna', cat: 'problema', livello: 'impegnativa', titolo: 'Due orologi testardi', forma: 'numero', unita: 'ore',
    testo: 'Nel salotto di nonna Ada ci sono due orologi a lancette. Lunedì a mezzogiorno segnano entrambi l’ora esatta. Da quel momento il primo va <b>avanti di 2 minuti ogni ora</b>, il secondo resta <b>indietro di 1 minuto ogni ora</b>.<br><br>Dopo quante ore i due orologi torneranno, per la prima volta, a segnare la stessa ora?',
    risposta: '240',
    spiegazione: 'Ogni ora la distanza tra i due orologi cresce di 2 + 1 = 3 minuti. Due orologi a lancette segnano la stessa ora quando la distanza è un multiplo di 12 ore, cioè di 720 minuti: la prima volta dopo 720 / 3 = <b>240 ore</b>, cioè 10 giorni.',
    verifica: () => { for (let h = 1; ; h++) if ((3 * h) % 720 === 0) return String(h); }
  },
  {
    id: 'venerdi-13', cat: 'problema', livello: 'impegnativa', titolo: 'Venerdì 13', forma: 'numero',
    testo: 'Un anno comincia di <b>giovedì</b> e non è bisestile.<br><br>Quanti venerdì 13 ci saranno in quell’anno?',
    risposta: '3',
    spiegazione: 'Il 13 gennaio cade 12 giorni dopo il 1°: giovedì + 12 = martedì. Da un mese al successivo il 13 si sposta di tanti giorni della settimana quanti sono i giorni del mese (31 → +3, 30 → +2, 28 → +0). Andando avanti: gennaio martedì, febbraio <b>venerdì</b>, marzo <b>venerdì</b>, aprile lunedì, maggio mercoledì, giugno sabato, luglio lunedì, agosto giovedì, settembre domenica, ottobre martedì, novembre <b>venerdì</b>, dicembre domenica. In tutto <b>3</b>.',
    verifica: () => { const g = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let d = 0, n = 0; for (let m = 0; m < 12; m++) { if ((4 + d + 12) % 7 === 5) n++; d += g[m]; } return String(n); }
  },
  {
    id: 'scala-bruno', cat: 'contare', livello: 'esperta', titolo: 'La scala di Bruno', forma: 'numero', unita: 'modi',
    testo: 'Bruno sale una scala di <b>12 gradini</b>. A ogni passo sale di 1 oppure di 2 gradini, ma non fa mai <b>due passi da 2</b> uno dopo l’altro.<br><br>In quanti modi diversi può arrivare in cima?',
    risposta: '88',
    spiegazione: 'Sia U(n) il numero di modi di arrivare al gradino n con l’ultimo passo da 1, D(n) con l’ultimo passo da 2. Allora U(n) = U(n−1) + D(n−1) (dopo qualunque passo se ne può fare uno da 1) e D(n) = U(n−2) (un passo da 2 solo dopo uno da 1, o all’inizio: D(2) = 1). Il totale T(n) = U(n) + D(n) vale 1, 2, 3, 4, 6, 9, 13, 19, 28, 41, 60, <b>88</b> per n = 1…12: ogni termine è T(n−1) + T(n−3).',
    verifica: () => { const m = (n, p) => (n === 0 ? 1 : (n >= 1 ? m(n - 1, 1) : 0) + (n >= 2 && p !== 2 ? m(n - 2, 2) : 0)); return String(m(12, 0)); }
  },
  {
    id: 'dado-alto', cat: 'probabilita', livello: 'impegnativa', titolo: 'Il dado più alto', forma: 'frazione',
    testo: 'Lanci <b>tre dadi</b> normali a sei facce.<br><br>Qual è la probabilità che il numero più alto uscito sia <b>esattamente 5</b>? Scrivi la risposta come frazione, per esempio 3/8.',
    risposta: '61/216',
    spiegazione: 'Il più alto è al massimo 5 quando tutti e tre i dadi fanno da 1 a 5: 5³ = 125 casi su 6³ = 216. Il più alto è al massimo 4 in 4³ = 64 casi. Il più alto è esattamente 5 nei casi rimasti: 125 − 64 = 61. Probabilità <b>61/216</b>.',
    verifica: () => { let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if (Math.max(a, b, c) === 5) n++; return frazione(n, 216); }
  },
  {
    id: 'calze-buio', cat: 'logica', livello: 'impegnativa', titolo: 'Calze al buio', forma: 'numero', unita: 'calze',
    testo: 'Al buio, in un cassetto, ci sono <b>6 calze rosse, 4 blu e 2 verdi</b>, tutte sparse. Un paio sono due calze dello stesso colore.<br><br>Quante calze devi prendere, al minimo, per essere <b>sicuro</b> di avere in mano almeno <b>due paia</b>? (Le due paia possono essere anche di colori diversi.)',
    risposta: '6',
    spiegazione: 'Con 5 calze può andarti male: 3 rosse, 1 blu e 1 verde fanno un paio solo. Con 6 calze no: se in un colore ne hai almeno 4 hai già due paia; altrimenti ogni colore ne ha al massimo 3 e, con 6 calze divise in 3 colori, almeno due colori ne hanno 2 o più, quindi due paia. Risposta: <b>6</b>.',
    verifica: () => { for (let k = 1; ; k++) { let ok = true; for (let r = 0; r <= 6; r++) for (let b = 0; b <= 4; b++) { const g = k - r - b; if (g < 0 || g > 2) continue; if (Math.floor(r / 2) + Math.floor(b / 2) + Math.floor(g / 2) < 2) ok = false; } if (ok) return String(k); } }
  },
  {
    id: 'girone', cat: 'problema', livello: 'impegnativa', titolo: 'Il girone all’italiana', forma: 'numero', unita: 'pareggi',
    testo: 'In un girone all’italiana con <b>6 squadre</b> ognuna gioca una volta contro tutte le altre. La vittoria vale 3 punti, il pareggio 1 punto a testa, la sconfitta 0.<br><br>Alla fine, sommando i punti di tutte le squadre, si ottiene <b>40</b>. Quante partite sono finite in pareggio?',
    risposta: '5',
    spiegazione: 'Le partite sono 6 × 5 / 2 = 15. Una partita con un vincitore porta 3 punti in classifica, un pareggio ne porta 2. Se V sono le vittorie e P i pareggi: V + P = 15 e 3V + 2P = 40. Togliendo due volte la prima dalla seconda: V = 10, quindi <b>P = 5</b>.',
    verifica: () => { for (let p = 0; p <= 15; p++) if (3 * (15 - p) + 2 * p === 40) return String(p); }
  },
  {
    id: 'uova-pia', cat: 'problema', livello: 'esperta', titolo: 'Le uova della signora Pia', forma: 'numero', unita: 'uova',
    testo: 'La signora Pia conta le sue uova a 2 a 2, poi a 3 a 3, a 4 a 4, a 5 a 5 e a 6 a 6: ogni volta ne avanza <b>una</b>. Contandole a 11 a 11 non ne avanza <b>nessuna</b>.<br><br>Quante uova ha, al minimo?',
    risposta: '121',
    spiegazione: 'Se ne avanza una contando a 2, 3, 4, 5 e 6, il numero meno 1 è multiplo di tutti questi, cioè di 60: le uova sono 61, 121, 181… Il primo multiplo di 11 della lista è <b>121</b> (= 11 × 11).',
    verifica: () => { for (let x = 1; ; x++) if ([2, 3, 4, 5, 6].every(d => x % d === 1) && x % 11 === 0) return String(x); }
  },
  {
    id: 'ponte-torcia', cat: 'strategia', livello: 'esperta', titolo: 'Il ponte di notte', forma: 'numero', unita: 'minuti',
    testo: 'Di notte cinque amici devono attraversare un ponte stretto. Hanno <b>una sola torcia</b>: sul ponte si passa al massimo in due, chi attraversa deve avere la torcia con sé e la torcia non si può lanciare dall’altra parte.<br><br>Da soli ci mettono <b>1, 2, 5, 9 e 13 minuti</b>; in coppia si va al passo del più lento.<br><br>Qual è il tempo minimo per portare tutti dall’altra parte?',
    risposta: '26',
    spiegazione: 'Il trucco è far passare insieme i due più lenti. Per 9 e 13: passano 1 e 2 (2 min), torna 1 (1), passano 9 e 13 (13), torna 2 (2): 18 minuti, e di qua restano 1, 2 e 5. Poi: passano 1 e 5 (5), torna 1 (1), passano 1 e 2 (2): altri 8 minuti. Totale <b>26</b>. Un programma che prova tutte le sequenze di traversate conferma che meno di 26 non si può.',
    verifica: () => {
      const t = [1, 2, 5, 9, 13], n = t.length, tutti = (1 << n) - 1, dist = new Map([[0, 0]]), coda = [[0, 0, 0]];
      while (coda.length) {
        coda.sort((a, b) => a[0] - b[0]); const [c, m, f] = coda.shift();
        if (m === tutti) return String(c);
        if (dist.get(m * 2 + f) < c) continue;
        const lato = [...Array(n).keys()].filter(i => (((m >> i) & 1) === 1) === (f === 1));
        for (let a = 0; a < lato.length; a++) for (let b = a; b < lato.length; b++) {
          const nm = m ^ (1 << lato[a]) ^ (b === a ? 0 : 1 << lato[b]), nc = c + Math.max(t[lato[a]], t[lato[b]]), k = nm * 2 + (1 - f);
          if (!dist.has(k) || dist.get(k) > nc) { dist.set(k, nc); coda.push([nc, nm, 1 - f]); }
        }
      }
    }
  },
  {
    id: 'armadietti', cat: 'logica', livello: 'esperta', titolo: 'Gli armadietti', forma: 'numero', unita: 'armadietti',
    testo: 'Nel corridoio di una scuola ci sono <b>150 armadietti</b>, tutti chiusi, numerati da 1 a 150. Il primo studente li apre tutti. Il secondo cambia lo stato di un armadietto ogni due (il 2°, il 4°, il 6°…): apre quelli chiusi e chiude quelli aperti. Il terzo fa lo stesso con uno ogni tre, e così via, fino al 150° studente.<br><br>Quanti armadietti restano aperti alla fine?',
    risposta: '12',
    spiegazione: 'L’armadietto n viene toccato una volta per ogni divisore di n. Resta aperto se è toccato un numero dispari di volte, cioè se n ha un numero dispari di divisori. I divisori vanno a coppie (d e n/d), tranne quando d = n/d: succede solo per i quadrati perfetti. I quadrati fino a 150 sono 1, 4, 9, …, 144 = 12²: <b>12</b> armadietti.',
    verifica: () => { const a = Array(151).fill(false); for (let s = 1; s <= 150; s++) for (let k = s; k <= 150; k += s) a[k] = !a[k]; return String(a.filter(Boolean).length); }
  },
  {
    id: 'somma-dieci', cat: 'contare', livello: 'esperta', titolo: 'Somma dieci', forma: 'numero', unita: 'numeri',
    testo: 'Quanti numeri interi <b>da 1 a 999</b> hanno la somma delle cifre uguale a <b>10</b>?<br><br>(Per esempio 19, 352 e 901 vanno contati.)',
    risposta: '63',
    spiegazione: 'Scrivi ogni numero con tre cifre, aggiungendo zeri davanti (19 = 019). Si cercano le terne di cifre da 0 a 9 con somma 10. Senza il limite «al massimo 9» le terne di numeri naturali con somma 10 sono C(12, 2) = 66 (stelle e barre). Vanno tolte quelle con una cifra uguale a 10: (10, 0, 0) e le sue due permutazioni. Restano <b>63</b>.',
    verifica: () => { let n = 0; for (let x = 1; x <= 999; x++) if (String(x).split('').reduce((a, b) => a + +b, 0) === 10) n++; return String(n); }
  },
  {
    id: 'zeri-250', cat: 'problema', livello: 'esperta', titolo: 'Quanti zeri', forma: 'numero', unita: 'zeri',
    testo: 'Moltiplichi tra loro tutti i numeri interi da 1 a 250:<br><b>1 × 2 × 3 × … × 250</b>.<br><br>Con quanti zeri finisce il risultato?',
    risposta: '62',
    spiegazione: 'Ogni zero finale viene da un fattore 10 = 2 × 5, e di fattori 2 ce ne sono molti più che di 5: basta contare i 5. I multipli di 5 fino a 250 sono 50, i multipli di 25 (che danno un 5 in più) sono 10, i multipli di 125 sono 2. Totale 50 + 10 + 2 = <b>62</b>.',
    verifica: () => { let f = 1n; for (let i = 1n; i <= 250n; i++) f *= i; return String(f.toString().match(/0*$/)[0].length); }
  },
  {
    id: 'numero-triplo', cat: 'problema', livello: 'estrema', titolo: 'Il numero che triplica', forma: 'numero',
    testo: 'Cerco un numero di <b>sei cifre</b> con questa proprietà: se sposti la sua prima cifra in fondo, il numero diventa esattamente il <b>triplo</b>. (Per esempio, spostando la prima cifra in fondo, 123456 diventerebbe 234561.)<br><br>Qual è il più piccolo numero così?',
    risposta: '142857',
    spiegazione: 'Sia a la prima cifra e x il numero formato dalle altre cinque: il numero è 100000·a + x e diventa 10·x + a. Deve valere 10x + a = 3(100000a + x), cioè 7x = 299999·a, quindi x = 42857·a. Perché x abbia cinque cifre serve a ≤ 2: con a = 1 viene <b>142857</b> (e infatti 428571 = 3 × 142857); con a = 2 viene 285714.',
    verifica: () => { for (let x = 100000; x < 1000000; x++) { const s = String(x); if (+(s.slice(1) + s[0]) === 3 * x) return String(x); } }
  },
  {
    id: 'ultimo-fiammifero', cat: 'strategia', livello: 'impegnativa', titolo: 'L’ultimo fiammifero', forma: 'numero', unita: 'fiammiferi',
    testo: 'Sul tavolo ci sono <b>23 fiammiferi</b>. Tu e un amico ne togliete a turno 1, 2 oppure 3. <b>Chi prende l’ultimo fiammifero perde.</b> Cominci tu.<br><br>Quanti fiammiferi devi togliere alla prima mossa per essere sicuro di vincere, comunque giochi l’amico?',
    risposta: '2',
    spiegazione: 'Chi deve muovere con 1 fiammifero davanti perde. Allora chi lascia all’altro 1, 5, 9, 13, 17, 21… fiammiferi (cioè 4k + 1) vince: qualunque cosa tolga l’altro (1, 2 o 3), basta togliere quanto serve per arrivare a 4 in tutto e lasciargli di nuovo un numero della lista. Da 23 si arriva a 21 togliendo <b>2</b>; ogni altra prima mossa lascia all’amico la stessa strategia.',
    verifica: () => { const vince = [false]; for (let n = 1; n <= 23; n++) vince[n] = [1, 2, 3].some(k => k < n && !vince[n - k]); const buone = [1, 2, 3].filter(k => k < 23 && !vince[23 - k]); return buone.length === 1 ? String(buone[0]) : 'ambiguo'; }
  },
  {
    id: 'torta-spicchi', cat: 'contare', livello: 'esperta', titolo: 'La torta a spicchi', forma: 'numero', unita: 'modi',
    testo: 'Una torta rotonda è divisa in <b>5 spicchi</b> e ogni spicchio va colorato di rosso, verde o blu. Due spicchi vicini (con un lato in comune) devono avere colori diversi.<br><br>In quanti modi si può colorare? La torta non si gira: due colorazioni che differiscono per una rotazione contano come diverse.',
    risposta: '30',
    spiegazione: 'Se gli spicchi fossero in fila (non in cerchio) ci sarebbero 3 · 2⁴ = 48 colorazioni. Tra queste vanno tolte quelle dove il primo e l’ultimo hanno lo stesso colore: «incollandoli» diventano colorazioni corrette di un cerchio di 4 spicchi. Così C(5) = 48 − C(4), C(4) = 24 − C(3) e C(3) = 6 (tre colori tutti diversi). Quindi C(4) = 18 e C(5) = <b>30</b>. In generale C(n) = 2ⁿ + 2·(−1)ⁿ.',
    verifica: () => { let n = 0; for (let m = 0; m < 243; m++) { const c = []; let x = m; for (let i = 0; i < 5; i++) { c.push(x % 3); x = Math.floor(x / 3); } if (c.every((v, i) => v !== c[(i + 1) % 5])) n++; } return String(n); }
  },
  {
    id: 'lancette-tre', cat: 'problema', livello: 'esperta', titolo: 'L’inseguimento delle lancette', forma: 'frazione', unita: 'minuti',
    testo: 'Sono le <b>3 in punto</b>.<br><br>Dopo quanti minuti la lancetta dei minuti raggiunge esattamente quella delle ore? Scrivi la risposta come frazione, per esempio 47/3.',
    risposta: '180/11',
    spiegazione: 'Alle 3 la lancetta delle ore è 90° avanti. In un minuto quella dei minuti fa 6° e quella delle ore 0,5°: la distanza cala di 5,5° al minuto. Si azzera dopo 90 / 5,5 = <b>180/11</b> minuti, cioè 16 minuti e circa 22 secondi.',
    verifica: () => frazione(90 * 2, 11)
  },
  {
    id: 'piccione-treni', cat: 'problema', livello: 'impegnativa', titolo: 'Il piccione e i treni', forma: 'numero', unita: 'km',
    testo: 'Due treni partono alla stessa ora, uno da Roma e uno da Milano, a 560 km di distanza, e si vengono incontro su binari paralleli: il primo a <b>120 km/h</b>, il secondo a <b>160 km/h</b>. Nello stesso istante un piccione parte dal muso del primo treno e vola avanti e indietro tra i due musi a <b>200 km/h</b>, senza mai fermarsi, finché i treni si incrociano.<br><br>Quanti chilometri vola il piccione?',
    risposta: '400',
    spiegazione: 'Non serve sommare tutti i viaggi del piccione. I treni si avvicinano di 120 + 160 = 280 km ogni ora, quindi si incrociano dopo 560 / 280 = 2 ore. In 2 ore il piccione, a 200 km/h, vola <b>400 km</b>.',
    verifica: () => String(200 * 560 / (120 + 160))
  },
  {
    id: 'quattro-stanze', cat: 'geometria', livello: 'impegnativa', titolo: 'Quattro stanze', forma: 'numero', unita: 'm²',
    testo: 'Un rettangolo è diviso in quattro rettangoli più piccoli da una linea orizzontale e da una verticale. Tre di loro hanno area <b>6, 8 e 12</b> metri quadri, come in figura.<br><br>Qual è l’area del quarto?',
    figura: figuraStanze(),
    risposta: '16',
    spiegazione: 'Chiama a e b le larghezze delle due colonne, c e d le altezze delle due righe. Le aree sono ac = 6, bc = 8, ad = 12 e quella cercata è bd. Allora bd = (bc · ad) / (ac) = 8 · 12 / 6 = <b>16</b>.',
    verifica: () => String(8 * 12 / 6)
  },
  {
    id: 'incrocio-chiuso', cat: 'contare', livello: 'esperta', titolo: 'L’incrocio chiuso', forma: 'numero', unita: 'percorsi',
    testo: 'Da <b>A</b> a <b>B</b> si va lungo le strade della griglia, muovendosi sempre <b>verso destra o verso l’alto</b>. L’incrocio segnato con la croce è chiuso e non si può attraversare.<br><br>Quanti percorsi diversi ci sono?',
    figura: figuraGriglia(),
    risposta: '66',
    spiegazione: 'Senza incroci chiusi, un percorso è una sequenza di 5 passi a destra e 4 in su: C(9, 4) = 126 percorsi. Quelli che passano dall’incrocio chiuso (2 a destra e 2 in su da A) sono C(4, 2) · C(5, 2) = 6 · 10 = 60. Restano 126 − 60 = <b>66</b>.',
    verifica: () => { const W = 5, H = 4, d = []; for (let x = 0; x <= W; x++) { d[x] = []; for (let y = 0; y <= H; y++) d[x][y] = x === 2 && y === 2 ? 0 : x === 0 && y === 0 ? 1 : (x ? d[x - 1][y] : 0) + (y ? d[x][y - 1] : 0); } return String(d[W][H]); }
  },
  {
    id: 'lettere-nascoste', cat: 'indovinello', livello: 'impegnativa', titolo: 'Lettere nascoste', forma: 'parole',
    testo: 'Tre indovinelli, e ogni risposta è <b>una lettera</b>.<br><br><b>1.</b> Sono due volte in TERRA, una volta in MARE e mai in CIELO.<br><b>2.</b> Apro ogni ORA, chiudo ogni ANNO e in un GIORNO ci sono due volte.<br><b>3.</b> Sono tre volte in BANANA, una volta in PERA e mai in MELONE.',
    campi: ['1', '2', '3'],
    risposta: ['r', 'o', 'a'], accetta: [['erre', 'lettera r'], ['lettera o'], ['lettera a']],
    spiegazione: '<b>1. R</b>: è l’unica lettera che compare due volte in TERRA (e infatti c’è una volta in MARE e mai in CIELO). <b>2. O</b>: è la prima lettera di ORA, l’ultima di ANNO, e GIORNO ne ha due. <b>3. A</b>: in BANANA solo la A compare tre volte.',
    controllo: 'Per ogni frase una sola lettera soddisfa la prima condizione (verificato a mano: TERRA ha solo la R doppia; ORA comincia con la O; BANANA ha tre volte solo la A); le altre condizioni sono coerenti.',
    verifica: () => {
      const q = (w, l) => w.split('').filter(x => x === l).length, L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const a = L.filter(l => q('TERRA', l) === 2 && q('MARE', l) === 1 && q('CIELO', l) === 0);
      const b = L.filter(l => 'ORA'[0] === l && 'ANNO'.slice(-1) === l && q('GIORNO', l) === 2);
      const c = L.filter(l => q('BANANA', l) === 3 && q('PERA', l) === 1 && q('MELONE', l) === 0);
      return [a, b, c].every(x => x.length === 1) ? [a[0], b[0], c[0]].join(',').toLowerCase() : 'ambiguo';
    }
  },
  {
    id: 'sciarade-uno', cat: 'sciarada', livello: 'impegnativa', titolo: 'Il primo e il secondo', forma: 'parole',
    testo: 'In una sciarada due parole, una dopo l’altra, formano una parola nuova: «il mio primo» è la prima, «il mio secondo» la seconda, «il mio intero» quella che formano insieme. Trova l’intero.<br><br><b>1.</b> Il mio primo scocca le frecce, il mio secondo è un lampo improvviso: il mio intero, dopo la pioggia, ha sette colori.<br><b>2.</b> Il mio primo è salato e pieno di pesci, il mio secondo ha due ruote e il motore: il mio intero fa tremare le coste.<br><b>3.</b> Il mio primo si apre e si chiude, il mio secondo si scrive e si piega: il mio intero sta in tasca e tiene i soldi.',
    campi: ['1', '2', '3'],
    risposta: ['arcobaleno', 'maremoto', 'portafoglio'], accetta: [[], [], ['portafogli']],
    spiegazione: '<b>1.</b> ARCO + BALENO = <b>ARCOBALENO</b>. <b>2.</b> MARE + MOTO = <b>MAREMOTO</b>. <b>3.</b> PORTA + FOGLIO = <b>PORTAFOGLIO</b>.',
    controllo: 'Le definizioni dell’intero (sette colori dopo la pioggia; fa tremare le coste; tiene i soldi in tasca) bastano da sole a indicare una sola parola, e le due parti la confermano.'
  },
  {
    id: 'sciarade-due', cat: 'sciarada', livello: 'impegnativa', titolo: 'Parole incollate', forma: 'parole',
    testo: 'Tre sciarade: «il mio primo» e «il mio secondo», uno dopo l’altro, formano «il mio intero». Trova l’intero.<br><br><b>1.</b> Il mio primo comanda, il mio secondo si ripara (o si risarcisce): il mio intero si festeggia a mezzanotte.<br><b>2.</b> Il mio primo nuota, il mio secondo abbaia: il mio intero ha tante file di denti.<br><b>3.</b> Il mio primo fa la trottola, il mio secondo scalda l’estate: il mio intero è un fiore che non gli toglie mai gli occhi di dosso.',
    campi: ['1', '2', '3'],
    risposta: ['capodanno', 'pescecane', 'girasole'], accetta: [['capo d anno', 'il capodanno'], ['pesce cane', 'squalo'], []],
    spiegazione: '<b>1.</b> CAPO + DANNO = <b>CAPODANNO</b>. <b>2.</b> PESCE + CANE = <b>PESCECANE</b> (lo squalo). <b>3.</b> GIRA + SOLE = <b>GIRASOLE</b>.',
    controllo: 'Ogni intero è definito in modo univoco e confermato dalle parti; per il 2 si accetta anche «squalo», che è la stessa cosa.'
  },
  {
    id: 'anagrammi-uno', cat: 'anagramma', livello: 'esperta', titolo: 'Lettere in disordine', forma: 'parole',
    testo: 'Rimetti in ordine le lettere di ogni parola per trovarne un’altra, seguendo l’indizio. Si usano tutte le lettere, una volta ciascuna.<br><br><b>1.</b> ATTORE — è lì che l’attore recita.<br><b>2.</b> CALORE — si canta in chiesa.<br><b>3.</b> STELLA — ci dormono le mucche.',
    campi: ['1', '2', '3'],
    risposta: ['teatro', 'corale', 'stalle'], accetta: [[], [], ['stalla']],
    spiegazione: '<b>1.</b> ATTORE → <b>TEATRO</b>. <b>2.</b> CALORE → <b>CORALE</b>. <b>3.</b> STELLA → <b>STALLE</b>.',
    controllo: 'Gli anagrammi sono controllati dalla verifica; che siano le sole parole adatte all’indizio è controllato a mano (CALORE dà anche COLARE, che non si canta).',
    verifica: () => { const s = w => w.split('').sort().join(''); return [['ATTORE', 'TEATRO'], ['CALORE', 'CORALE'], ['STELLA', 'STALLE']].every(([a, b]) => s(a) === s(b)) ? 'teatro,corale,stalle' : 'no'; }
  },
  {
    id: 'anagrammi-due', cat: 'anagramma', livello: 'esperta', titolo: 'Rimescolando', forma: 'parole',
    testo: 'Rimetti in ordine le lettere di ogni parola per trovarne un’altra, seguendo l’indizio. Si usano tutte le lettere, una volta ciascuna.<br><br><b>1.</b> SPERONE — siamo noi, tutti quanti.<br><b>2.</b> MARTE — le tessono i congiurati e gli sceneggiatori.<br><b>3.</b> PIANTE — col tempo velano il bronzo e il rame.',
    campi: ['1', '2', '3'],
    risposta: ['persone', 'trame', 'patine'], accetta: [[], [], []],
    spiegazione: '<b>1.</b> SPERONE → <b>PERSONE</b>. <b>2.</b> MARTE → <b>TRAME</b>. <b>3.</b> PIANTE → <b>PATINE</b>.',
    controllo: 'Anagrammi controllati dalla verifica; l’indizio esclude gli altri anagrammi possibili.',
    verifica: () => { const s = w => w.split('').sort().join(''); return [['SPERONE', 'PERSONE'], ['MARTE', 'TRAME'], ['PIANTE', 'PATINE']].every(([a, b]) => s(a) === s(b)) ? 'persone,trame,patine' : 'no'; }
  },
  {
    id: 'tre-indovinelli', cat: 'indovinello', livello: 'impegnativa', titolo: 'Tre oggetti di casa', forma: 'parole',
    testo: 'Tre indovinelli: ogni risposta è un oggetto che si trova in casa.<br><br><b>1.</b> Ho un occhio solo ma non vedo niente; mi porto dietro una coda che si accorcia mentre lavoro.<br><b>2.</b> Ho i denti ma non mordo, e senza di me la porta di casa non si apre.<br><b>3.</b> Mi posano sul tavolo, mi tagliano, mi dividono tra tutti, ma nessuno mi mangia.',
    campi: ['1', '2', '3'],
    risposta: ['ago', 'chiave', 'mazzo di carte'], accetta: [['ago da cucito'], ['chiavi'], ['carte', 'mazzo', 'carte da gioco', 'mazzo di carte da gioco']],
    spiegazione: '<b>1. L’ago</b>: l’occhio è la cruna, la coda è il filo che si accorcia cucendo. <b>2. La chiave</b>: i denti sono le punte della mappa. <b>3. Il mazzo di carte</b>: si posa sul tavolo, si taglia (si alza) e si distribuisce tra i giocatori.',
    controllo: 'Ogni indovinello ha due indizi che insieme lasciano un solo oggetto (occhio + coda che si accorcia lavorando; denti + apre la porta; tagliato + distribuito ma non mangiato).'
  },
  {
    id: 'messaggio-cesare', cat: 'cifrario', livello: 'impegnativa', titolo: 'Il messaggio spostato', forma: 'parola',
    testo: 'Un messaggio è stato cifrato spostando <b>ogni lettera dello stesso numero di posti</b> in avanti nell’alfabeto inglese di 26 lettere (dopo la Z si ricomincia dalla A). Gli spazi sono rimasti dove erano.<br><br><b style="letter-spacing:.12em">' + cesare('OGNI GIORNO UNA SFIDA NUOVA', 11) + '</b><br><br>Scrivi il messaggio in chiaro.',
    risposta: 'ogni giorno una sfida nuova',
    spiegazione: 'Lo spostamento è di 11 posti (A → L, O → Z, U → F…). Un modo per trovarlo: FYL è una parola italiana di tre lettere, e tra quelle comuni (CHE, PER, UNA, NON…) solo UNA dà lo stesso spostamento per tutte e tre le lettere; poi si controlla sul resto. Tornando indietro di 11 posti si legge <b>OGNI GIORNO UNA SFIDA NUOVA</b>.',
    verifica: () => cesare(cesare('OGNI GIORNO UNA SFIDA NUOVA', 11), 15).toLowerCase()
  },
  {
    id: 'proverbio-cifrato', cat: 'cifrario', livello: 'esperta', titolo: 'Il proverbio nascosto', forma: 'parola',
    testo: 'Ogni lettera di un proverbio italiano è stata sostituita con un’altra, sempre la stessa (lettere uguali restano uguali, lettere diverse restano diverse). Gli spazi sono rimasti dove erano.<br><br><b style="letter-spacing:.12em">' + 'CHI VA PIANO VA SANO E VA LONTANO'.replace(/[A-Z]/g, c => 'QWERTYUIOPASDFGHJKLZXCVBNM'[c.charCodeAt(0) - 65]) + '</b><br><br>Scrivi il proverbio in chiaro.',
    risposta: 'chi va piano va sano e va lontano',
    spiegazione: 'La parola di due lettere che torna tre volte è un verbo corto e comune: «VA». Con V e A al loro posto, «?A?O» con le lettere di PIANO diventa SANO, e il resto viene da sé: <b>CHI VA PIANO VA SANO E VA LONTANO</b>.',
    verifica: () => { const k = 'QWERTYUIOPASDFGHJKLZXCVBNM'; const cif = 'CHI VA PIANO VA SANO E VA LONTANO'.replace(/[A-Z]/g, c => k[c.charCodeAt(0) - 65]); return cif.replace(/[A-Z]/g, c => String.fromCharCode(65 + k.indexOf(c))).toLowerCase(); }
  },
  {
    id: 'numero-tre-cifre', cat: 'logica', livello: 'impegnativa', titolo: 'Il numero di tre cifre', forma: 'numero',
    testo: 'Penso un numero di tre cifre, tutte diverse.<br>• È divisibile per 9.<br>• La cifra delle centinaia è il triplo di quella delle unità.<br>• Tra tutti i numeri con queste due proprietà, è quello con la somma delle cifre più grande.<br><br>Che numero penso?',
    risposta: '963',
    spiegazione: 'Le unità possono essere 1, 2 o 3 (le centinaia sono il triplo, al massimo 9). Divisibile per 9 vuol dire somma delle cifre multipla di 9: con 3_1 viene 351 (somma 9); con 6_2 viene 612 (somma 9); con 9_3 viene 963 (somma 18). La somma più grande è quella di <b>963</b>.',
    verifica: () => { let best = null, s = -1; for (let x = 100; x < 1000; x++) { const [a, b, c] = String(x).split('').map(Number); if (new Set([a, b, c]).size < 3 || x % 9 || a !== 3 * c) continue; if (a + b + c > s) { s = a + b + c; best = x; } else if (a + b + c === s) best = 'ambiguo'; } return String(best); }
  },
  {
    id: 'mai-due-teste', cat: 'probabilita', livello: 'esperta', titolo: 'Mai due teste', forma: 'frazione',
    testo: 'Lanci una moneta <b>6 volte</b>.<br><br>Qual è la probabilità di non ottenere mai <b>due teste di fila</b>? Scrivi la risposta come frazione.',
    risposta: '21/64',
    spiegazione: 'Sia S(n) il numero di sequenze di n lanci senza due teste di fila. Una sequenza buona di n lanci finisce con croce (e prima c’è una qualunque buona di n−1) oppure con «croce, testa» (e prima una buona di n−2): S(n) = S(n−1) + S(n−2), con S(1) = 2 e S(2) = 3. Quindi 2, 3, 5, 8, 13, 21: S(6) = 21 su 2⁶ = 64. Probabilità <b>21/64</b>.',
    verifica: () => { let n = 0; for (let m = 0; m < 64; m++) if (!(m & (m >> 1))) n++; return frazione(n, 64); }
  },
  {
    id: 'stesso-seme', cat: 'probabilita', livello: 'esperta', titolo: 'Due carte dello stesso seme', forma: 'frazione',
    testo: 'Da un mazzo di <b>40 carte</b> (4 semi da 10 carte) peschi due carte a caso.<br><br>Qual è la probabilità che siano dello <b>stesso seme</b>? Scrivi la risposta come frazione.',
    risposta: '3/13',
    spiegazione: 'La prima carta è qualsiasi. Restano 39 carte, di cui 9 dello stesso seme della prima: probabilità 9/39 = <b>3/13</b>.',
    verifica: () => { let n = 0, t = 0; for (let a = 0; a < 40; a++) for (let b = a + 1; b < 40; b++) { t++; if (Math.floor(a / 10) === Math.floor(b / 10)) n++; } return frazione(n, t); }
  },
  {
    id: 'pesi-farmacista', cat: 'strategia', livello: 'esperta', titolo: 'I pesi del farmacista', forma: 'numero', unita: 'pesi',
    testo: 'Un farmacista ha una bilancia a due piatti e vuole poter pesare <b>qualsiasi quantità intera da 1 a 100 grammi</b>. Può mettere i suoi pesi su entrambi i piatti (anche insieme alla merce).<br><br>Qual è il numero minimo di pesi che gli servono?',
    risposta: '5',
    spiegazione: 'Ogni peso può stare sul piatto della merce, sull’altro piatto o restare fuori: con k pesi ci sono al massimo 3ᵏ combinazioni, e togliendo quella «tutti fuori» e contando ogni valore positivo una volta sola (il suo opposto è la stessa pesata a piatti scambiati) si pesano al massimo (3ᵏ − 1)/2 valori. Con 4 pesi sono 40, troppo pochi. Con <b>5</b> pesi da 1, 3, 9, 27 e 81 grammi si arriva a 121 e si pesa ogni intero fino a 100.',
    verifica: () => { const ok = p => { const v = new Set([0]); for (const w of p) for (const x of [...v]) { v.add(x + w); v.add(x - w); } for (let g = 1; g <= 100; g++) if (!v.has(g)) return false; return true; }; for (let k = 1; k <= 5; k++) if ((3 ** k - 1) / 2 >= 100 && ok([1, 3, 9, 27, 81].slice(0, k))) return String(k); return 'no'; }
  },
  {
    id: 'cavallo-angoli', cat: 'logica', livello: 'impegnativa', titolo: 'Il cavallo in diagonale', forma: 'numero', unita: 'mosse',
    testo: 'Su una scacchiera 8 × 8 un cavallo (che si muove a «L»: due caselle in una direzione e una di lato) parte dall’angolo in basso a sinistra.<br><br>Qual è il numero minimo di mosse per raggiungere l’angolo in alto a destra?',
    risposta: '6',
    spiegazione: 'Ogni mossa del cavallo sposta al massimo di 3 in tutto tra righe e colonne, e qui ne servono 7 + 7 = 14: almeno 5 mosse. Ma ogni mossa cambia il colore della casella e i due angoli sono dello stesso colore: il numero di mosse deve essere pari, quindi almeno 6. E 6 bastano, per esempio a1 → b3 → c5 → d7 → f8 → g6 → h8. Risposta: <b>6</b>.',
    verifica: () => { const q = [[0, 0, 0]], v = new Set(['0,0']); while (q.length) { const [x, y, d] = q.shift(); if (x === 7 && y === 7) return String(d); for (const [a, b] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const nx = x + a, ny = y + b, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx > 7 || ny > 7 || v.has(k)) continue; v.add(k); q.push([nx, ny, d + 1]); } } }
  },
  {
    id: 'puntini-domino', cat: 'contare', livello: 'impegnativa', titolo: 'Tutti i puntini', forma: 'numero', unita: 'puntini',
    testo: 'Un set completo di domino contiene una tessera per ogni coppia di numeri da 0 a 6, doppi compresi (da 0–0 a 6–6), ognuna una volta sola.<br><br>Quanti puntini ci sono in tutto?',
    risposta: '168',
    spiegazione: 'Le tessere sono 28 (7 doppie + 21 con numeri diversi). Ogni numero da 0 a 6 compare 8 volte in tutto il set: una volta in ciascuna delle 6 tessere con un altro numero e due volte nel suo doppio. Totale 8 · (0 + 1 + … + 6) = 8 · 21 = <b>168</b>.',
    verifica: () => { let n = 0; for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) n += i + j; return String(n); }
  },
  {
    id: 'tipografo', cat: 'problema', livello: 'impegnativa', titolo: 'Il tipografo', forma: 'numero', unita: 'pagine',
    testo: 'Per numerare le pagine di un libro, dalla 1 all’ultima, il tipografo ha usato <b>1.392 cifre</b> in tutto.<br><br>Quante pagine ha il libro?',
    risposta: '500',
    spiegazione: 'Le pagine da 1 a 9 usano 9 cifre, quelle da 10 a 99 ne usano 90 · 2 = 180: in tutto 189. Restano 1.392 − 189 = 1.203 cifre per le pagine a tre cifre, cioè 401 pagine: dalla 100 alla <b>500</b>.',
    verifica: () => { let c = 0, p = 0; while (c < 1392) { p++; c += String(p).length; } return c === 1392 ? String(p) : 'no'; }
  },
  {
    id: 'mille-in-fila', cat: 'problema', livello: 'esperta', titolo: 'Mille in fila', forma: 'numero', unita: 'modi',
    testo: 'In quanti modi si può scrivere <b>1000</b> come somma di <b>due o più</b> numeri interi positivi <b>consecutivi</b>?<br><br>(Per esempio 9 = 4 + 5 = 2 + 3 + 4: per 9 i modi sono due.)',
    risposta: '3',
    spiegazione: 'Una somma di k consecutivi a partire da a vale k·a + k(k−1)/2, cioè k(2a + k − 1)/2 = 1000: quindi k(2a + k − 1) = 2000, con i due fattori di parità diversa (la differenza è 2a − 1, dispari). Le scomposizioni di 2000 = 2⁴·5³ in un fattore dispari e uno pari, con k ≥ 2 il più piccolo, danno: 5 numeri da 198 a 202, 16 numeri da 55 a 70, 25 numeri da 28 a 52. In tutto <b>3</b> (in generale: i divisori dispari di 1000 meno uno).',
    verifica: () => { let n = 0; for (let a = 1; a < 1000; a++) { let s = 0; for (let b = a; s < 1000; b++) { s += b; if (s === 1000 && b > a) n++; } } return String(n); }
  },
  {
    id: 'ingranaggi', cat: 'geometria', livello: 'impegnativa', titolo: 'Ingranaggi', forma: 'numero', unita: 'giri',
    testo: 'Tre ruote dentate sono ingranate in fila, come in figura: la prima ha <b>24 denti</b>, quella di mezzo <b>36</b>, l’ultima <b>16</b>.<br><br>Mentre la prima ruota fa <b>10 giri</b>, quanti giri fa l’ultima?',
    figura: figuraIngranaggi(),
    risposta: '15',
    spiegazione: 'Dove due ruote si toccano passano tanti denti dell’una quanti dell’altra. In 10 giri la prima fa passare 240 denti; la ruota di mezzo li trasmette tutti all’ultima (il suo numero di denti non conta), che ne ha 16: 240 / 16 = <b>15</b> giri, nello stesso verso della prima.',
    verifica: () => String(10 * 24 / 16)
  },
  {
    id: 'dado-pari', cat: 'probabilita', livello: 'estrema', titolo: 'Solo numeri pari', forma: 'frazione',
    testo: 'Lanci un dado normale ripetutamente, e ti fermi appena esce il <b>6</b>.<br><br>Qual è la probabilità che <b>tutti</b> i numeri usciti, compreso il 6 finale, siano pari? Scrivi la risposta come frazione.',
    risposta: '1/4',
    spiegazione: 'Sia P la probabilità cercata, guardando il primo lancio. Con probabilità 1/6 esce subito il 6: va bene. Con probabilità 2/6 esce 2 o 4: si ricomincia da capo, e la probabilità di finire bene è di nuovo P. Con probabilità 3/6 esce un dispari: è già andata male. Quindi P = 1/6 + (2/6)·P, cioè (4/6)·P = 1/6 e <b>P = 1/4</b>. (Molti rispondono di più, pensando ai soli lanci prima del 6: ma bisogna contare anche tutte le sequenze rovinate da un dispari.)',
    verifica: () => { let n = 1, d = 6; /* P·(1 − 2/6) = 1/6  →  P = (1/6) / (4/6) */ return frazione(n * 6, d * 4); }
  },
  {
    id: 'sette-pirati', cat: 'strategia', livello: 'estrema', titolo: 'Sette pirati', forma: 'numero', unita: 'monete',
    testo: 'Sette pirati, tutti di età diversa, devono dividersi <b>100 monete d’oro</b>. Il più anziano propone una divisione (in monete intere) e votano tutti, lui compreso. Se <b>almeno la metà</b> dei voti è a favore, la proposta passa; altrimenti chi l’ha fatta finisce in mare e propone il più anziano tra quelli rimasti, e così via.<br><br>Ogni pirata è perfettamente logico e vuole, nell’ordine: 1) restare vivo; 2) avere più monete possibile; 3) a parità di monete, vedere qualcuno finire in mare.<br><br>Quante monete tiene per sé il pirata più anziano?',
    risposta: '97',
    spiegazione: 'Si ragiona dalla fine. Con un solo pirata, tiene 100. Con due, il più anziano vota per sé ed è già metà: tiene 100. Con tre, gli serve un voto in più: lo compra con 1 moneta dal più giovane, che altrimenti avrebbe 0 → 99, 0, 1. Con quattro gli servono 2 voti: il suo e quello di chi nel caso da tre avrebbe 0 (il secondo) → 99, 0, 1, 0. In generale ogni volta si comprano con 1 moneta i pirati che nel caso successivo resterebbero a 0. Con sette servono 4 voti: il suo e tre pirati a 1 moneta ciascuno. Tiene <b>97</b> monete.',
    verifica: () => {
      const n = 7, C = 100, es = []; es[n - 1] = Array(n).fill(0).map((_, i) => (i === n - 1 ? C : 0));
      for (let k = n - 2; k >= 0; k--) {
        const vivi = n - k, servono = Math.ceil(vivi / 2), dopo = es[k + 1], altri = [];
        for (let i = k + 1; i < n; i++) altri.push([dopo[i] + 1, i]);
        altri.sort((a, b) => a[0] - b[0]);
        const presi = altri.slice(0, servono - 1), soglia = presi.length ? presi[presi.length - 1][0] : -1;
        if (altri.filter(x => x[0] === soglia).length !== presi.filter(x => x[0] === soglia).length) return 'ambiguo';
        const d = Array(n).fill(0); presi.forEach(([c, i]) => { d[i] = c; }); d[k] = C - presi.reduce((s, x) => s + x[0], 0); es[k] = d;
      }
      return String(es[0][0]);
    }
  },
  {
    id: 'quadrato-aabb', cat: 'problema', livello: 'esperta', titolo: 'Quattro cifre a coppie', forma: 'numero',
    testo: 'Un numero di quattro cifre è un <b>quadrato perfetto</b>. Le sue prime due cifre sono uguali tra loro, e anche le ultime due sono uguali tra loro (è del tipo AABB, con A diverso da zero).<br><br>Qual è il numero?',
    risposta: '7744',
    spiegazione: 'AABB = 1100·A + 11·B = 11 · (100A + B): essendo un quadrato ed essendo divisibile per 11, è divisibile per 121, quindi 100A + B (= 99A + A + B) è multiplo di 11, cioè A + B = 11. Allora AABB = 11² · (9A + 1) e 9A + 1 deve essere un quadrato: con A da 2 a 9 (B = 11 − A ≤ 9) va bene solo A = 7 (9·7 + 1 = 64). Il numero è <b>7744</b> = 88².',
    verifica: () => { const r = []; for (let x = 32; x < 100; x++) { const s = String(x * x); if (s[0] === s[1] && s[2] === s[3]) r.push(x * x); } return r.length === 1 ? String(r[0]) : 'ambiguo'; }
  },
  {
    id: 'eta-anna-bea', cat: 'logica', livello: 'esperta', titolo: 'Anna e Bea', forma: 'numero', unita: 'anni',
    testo: 'Anna oggi ha il <b>doppio</b> degli anni che aveva Bea quando Anna aveva l’età che Bea ha oggi. Quando Bea avrà l’età che Anna ha oggi, in due avranno <b>63 anni</b>.<br><br>Quanti anni ha Anna oggi?',
    risposta: '28',
    spiegazione: 'Siano A e B le età di oggi, con A > B, e d = A − B. Anna aveva l’età di Bea d anni fa, quando Bea aveva B − d. Prima frase: A = 2(B − d) = 2(2B − A), cioè 3A = 4B. Seconda frase: tra d anni Anna avrà A + d e Bea avrà A: A + d + A = 63, cioè 3A − B = 63. Con B = 3A/4: 9A/4 = 63, <b>A = 28</b> (e Bea ne ha 21).',
    verifica: () => { const r = []; for (let A = 1; A < 120; A++) for (let B = 1; B < A; B++) { const d = A - B; if (A === 2 * (B - d) && A + d + A === 63) r.push(A); } return r.length === 1 ? String(r[0]) : 'ambiguo'; }
  },
  {
    id: 'tre-rubinetti', cat: 'problema', livello: 'impegnativa', titolo: 'La vasca', forma: 'numero', unita: 'ore',
    testo: 'Un rubinetto da solo riempie una vasca in <b>6 ore</b>, un altro in <b>3 ore</b>. Lo scarico, da solo, la svuota piena in <b>4 ore</b>.<br><br>Se la vasca è vuota e si aprono insieme i due rubinetti e lo scarico, in quante ore si riempie?',
    risposta: '4',
    spiegazione: 'In un’ora il primo rubinetto riempie 1/6 di vasca, il secondo 1/3, e lo scarico ne toglie 1/4: in tutto 2/12 + 4/12 − 3/12 = 3/12 = 1/4 di vasca all’ora. Servono <b>4 ore</b>.',
    verifica: () => { const ora = 1 / 6 + 1 / 3 - 1 / 4; return String(Math.round(1 / ora)); }
  },
  {
    id: 'treno-galleria', cat: 'problema', livello: 'impegnativa', titolo: 'La galleria', forma: 'numero', unita: 'secondi',
    testo: 'Un treno lungo <b>300 metri</b> viaggia a <b>90 km/h</b> ed entra in una galleria lunga <b>1,2 km</b>.<br><br>Quanti secondi passano da quando la locomotiva entra nella galleria a quando l’ultima carrozza ne esce?',
    risposta: '60',
    spiegazione: 'Dall’ingresso della locomotiva all’uscita della coda il treno percorre la galleria più la sua lunghezza: 1.200 + 300 = 1.500 metri. A 90 km/h = 25 metri al secondo servono 1.500 / 25 = <b>60 secondi</b>.',
    verifica: () => String((1200 + 300) / (90000 / 3600))
  }
];

module.exports = ENIGMI;
