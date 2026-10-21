/* Motore di Claude Machine: carte dei criteri, generatore dei puzzle, regole del round.
   Nessuna pagina qui dentro: lo usano la pagina (self.CM) e le prove da node (require).

   Il codice segreto ha tre cifre da 1 a 5, nell'ordine [blu, giallo, viola]
   (triangolo, quadrato, cerchio). In tutto 5³ = 125 codici.

   Una CARTA è un criterio con le sue regole possibili (per esempio «{b} rispetto a 3»: <, =, >).
   Un VERIFICATORE mostra una carta (due a livello Insano) e controlla in segreto UNA sola regola
   tra quelle scritte: risponde ✓ se il codice di prova la rispetta, ✗ se no.

   Ogni puzzle generato rispetta tre garanzie, controllate in genera():
   (U) le regole vere insieme lasciano un solo codice;
   (N) nessun verificatore è inutile: togliendone uno qualsiasi, i codici possibili sono almeno due;
   (D) dalle sole carte il codice non si deduce: tra tutte le combinazioni di regole che rispettano
       (U) e (N) i codici possibili sono almeno due, quindi serve almeno una domanda.

   Nei testi {b}, {g}, {v} diventano le forme colorate (la pagina le disegna, qui restano parole). */
(function (root) {
  'use strict';

  /* ---------- Codici e maschere ---------- */
  const CODICI = [];
  for (let b = 1; b <= 5; b++) for (let g = 1; g <= 5; g++) for (let v = 1; v <= 5; v++) CODICI.push([b, g, v]);
  const TUTTI = (1n << 125n) - 1n;
  const indiceCodice = c => (c[0] - 1) * 25 + (c[1] - 1) * 5 + (c[2] - 1);
  const maschera = f => { let m = 0n; CODICI.forEach((c, k) => { if (f(c)) m |= 1n << BigInt(k); }); return m; };
  const unico = m => m !== 0n && (m & (m - 1n)) === 0n;
  const almenoDue = m => m !== 0n && (m & (m - 1n)) !== 0n;
  const bitIndice = m => m.toString(2).length - 1;
  const conta = m => { let n = 0; while (m) { m &= m - 1n; n++; } return n; };

  /* ---------- Funzioni d'aiuto per le carte ---------- */
  const somma = c => c[0] + c[1] + c[2];
  const quanti = (c, k) => c.filter(x => x === k).length;
  const pari = c => c.filter(x => x % 2 === 0).length;
  const numero = c => c[0] * 100 + c[1] * 10 + c[2];
  const primo = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  const mcd = (a, b) => b ? mcd(b, a % b) : a;
  const solo = (c, i, piu) => c.every((x, j) => j === i || (piu ? c[i] > x : c[i] < x));
  const inMezzo = (c, i) => { const a = c.filter((_, j) => j !== i); return Math.min(...a) < c[i] && c[i] < Math.max(...a); };
  const confronto = (x, k) => [x < k, x === k, x > k];
  const CMP = ['<', '=', '>'];
  const NOMI = ['{b}', '{g}', '{v}'];

  /* Carta che confronta un valore con una soglia: tre regole <, =, >. */
  function cartaConfronto(id, nome, etichetta, valore, k, extra) {
    return Object.assign({ id, nome, regole: [0, 1, 2].map(j => ({ t: `${etichetta} ${CMP[j]} ${k}`, f: c => confronto(valore(c), k)[j] })) }, extra);
  }
  function cartaConta(id, nome, valore, testi, extra) {
    return Object.assign({ id, nome, regole: testi.map((t, j) => ({ t, f: c => valore(c) === j })) }, extra);
  }

  /* ---------- Le carte ----------
     tipo: 'classico' (Medio e oltre) o 'malato' (Difficile e Insano).
     gruppo: due carte dello stesso gruppo non finiscono mai nello stesso puzzle (dicono quasi la stessa cosa).
     Gli id non si cambiano: finiscono nelle stanze salvate sui server. */
  const CARTE = [];
  const aggiungi = (carta, tipo, gruppo) => { carta.tipo = tipo; carta.gruppo = gruppo || carta.id; CARTE.push(carta); };

  // Classici
  aggiungi({ id: 'b1', nome: '{b} rispetto a 1', regole: [
    { t: '{b} = 1', f: c => c[0] === 1 }, { t: '{b} > 1', f: c => c[0] > 1 }] }, 'classico', 'b1');
  [3, 4].forEach(k => [0, 1, 2].forEach(i => aggiungi(
    cartaConfronto('cv' + i + k, `${NOMI[i]} rispetto a ${k}`, NOMI[i], c => c[i], k), 'classico')));
  [0, 1, 2].forEach(i => aggiungi({ id: 'p' + i, nome: `Parità di ${NOMI[i]}`, regole: [
    { t: `${NOMI[i]} pari`, f: c => c[i] % 2 === 0 }, { t: `${NOMI[i]} dispari`, f: c => c[i] % 2 === 1 }] }, 'classico'));
  [1, 3, 4].forEach(k => aggiungi(cartaConta('n' + k, `Quanti ${k} ci sono`, c => quanti(c, k),
    [`nessun ${k}`, `un solo ${k}`, `due ${k}`]), 'classico', 'n' + k));
  aggiungi(cartaConfronto('s6', 'Somma delle tre cifre rispetto a 6', 'somma', somma, 6), 'classico');
  aggiungi({ id: 'sp', nome: 'Somma pari o dispari', regole: [
    { t: 'somma pari', f: c => somma(c) % 2 === 0 }, { t: 'somma dispari', f: c => somma(c) % 2 === 1 }] }, 'classico', 'parita-somma');
  aggiungi({ id: 'smul', nome: 'La somma è multipla di…', regole: [3, 4, 5].map(k =>
    ({ t: `multipla di ${k}`, f: c => somma(c) % k === 0 })) }, 'classico', 'mod3');
  aggiungi(cartaConta('np', 'Quante cifre pari ci sono', pari,
    ['nessuna cifra pari', 'una cifra pari', 'due cifre pari', 'tre cifre pari']), 'classico', 'pari');
  [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => aggiungi({ id: 'c' + i + j, nome: `${NOMI[i]} rispetto a ${NOMI[j]}`,
    regole: [0, 1, 2].map(r => ({ t: `${NOMI[i]} ${CMP[r]} ${NOMI[j]}`, f: c => confronto(c[i], c[j])[r] })) }, 'classico'));
  [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => aggiungi(
    cartaConfronto('s' + i + j, `${NOMI[i]} + ${NOMI[j]} rispetto a 6`, `${NOMI[i]} + ${NOMI[j]}`, c => c[i] + c[j], 6), 'classico'));
  aggiungi({ id: 'min', nome: 'Colore con la cifra più bassa', nota: 'Più bassa di entrambe le altre: con un pari merito nessuna regola vale.',
    regole: [0, 1, 2].map(i => ({ t: `${NOMI[i]} più basso`, f: c => solo(c, i, false) })) }, 'classico');
  aggiungi({ id: 'max', nome: 'Colore con la cifra più alta', nota: 'Più alta di entrambe le altre: con un pari merito nessuna regola vale.',
    regole: [0, 1, 2].map(i => ({ t: `${NOMI[i]} più alto`, f: c => solo(c, i, true) })) }, 'classico');
  aggiungi({ id: 'ord', nome: 'Ordine di {b} {g} {v}', regole: [
    { t: 'crescente', f: c => c[0] < c[1] && c[1] < c[2] },
    { t: 'decrescente', f: c => c[0] > c[1] && c[1] > c[2] },
    { t: 'né l’uno né l’altro', f: c => !(c[0] < c[1] && c[1] < c[2]) && !(c[0] > c[1] && c[1] > c[2]) }] }, 'classico');
  aggiungi(cartaConta('rip', 'Cifre ripetute', c => 3 - new Set(c).size, ['tutte diverse', 'una coppia', 'tutte uguali']), 'classico');
  aggiungi({ id: 'mag', nome: 'Pari o dispari in maggioranza', regole: [
    { t: 'più cifre pari', f: c => pari(c) >= 2 }, { t: 'più cifre dispari', f: c => pari(c) <= 1 }] }, 'classico', 'pari');

  // Malati
  aggiungi({ id: 'num3', nome: 'Il numero {b}{g}{v} letto intero (es. 314)', regole: [
    { t: 'è primo', f: c => primo(numero(c)) },
    { t: 'è multiplo di 3', f: c => numero(c) % 3 === 0 },
    { t: 'né primo né multiplo di 3', f: c => !primo(numero(c)) && numero(c) % 3 !== 0 }] }, 'malato', 'mod3');
  aggiungi({ id: 'spq', nome: 'La somma delle tre cifre è…', regole: [
    { t: 'un numero primo', f: c => primo(somma(c)) },
    { t: 'un quadrato perfetto', f: c => [4, 9].includes(somma(c)) },
    { t: 'né primo né quadrato', f: c => !primo(somma(c)) && ![4, 9].includes(somma(c)) }] }, 'malato');
  aggiungi(cartaConta('npr', 'Quante cifre sono numeri primi (2, 3, 5)', c => c.filter(primo).length,
    ['nessuna', 'una', 'due', 'tre']), 'malato');
  aggiungi(cartaConfronto('pit', '{b}² + {g}² rispetto a {v}²', '{b}² + {g}²', c => c[0] * c[0] + c[1] * c[1] - c[2] * c[2], 0, {}), 'malato');
  // la carta pitagorica confronta la differenza con 0: si riscrive il testo delle regole
  CARTE[CARTE.length - 1].regole.forEach((r, j) => r.t = `{b}² + {g}² ${CMP[j]} {v}²`);
  aggiungi(cartaConfronto('pr20', 'Prodotto delle tre cifre rispetto a 20', 'prodotto', c => c[0] * c[1] * c[2], 20), 'malato');
  aggiungi(cartaConfronto('pot', '{b} elevato alla {g} rispetto a 16', '{b} alla {g}', c => Math.pow(c[0], c[1]), 16), 'malato');
  aggiungi({ id: 'm7', nome: 'Il numero {b}{g}{v} diviso per 7', regole: [
    { t: 'resto 0', f: c => numero(c) % 7 === 0 },
    { t: 'resto da 1 a 3', f: c => [1, 2, 3].includes(numero(c) % 7) },
    { t: 'resto da 4 a 6', f: c => numero(c) % 7 >= 4 }] }, 'malato');
  aggiungi(cartaConta('inv', 'Coppie fuori ordine tra {b}, {g}, {v}', c => (c[0] > c[1]) + (c[0] > c[2]) + (c[1] > c[2]),
    ['nessuna', 'una', 'due', 'tre']), 'malato', 'ordine');
  aggiungi(cartaConta('fis', 'Cifre al loro posto ({b} = 1, {g} = 2, {v} = 3)', c => (c[0] === 1) + (c[1] === 2) + (c[2] === 3),
    ['nessuna', 'una', 'due', 'tre']), 'malato');
  aggiungi({ id: 'pa', nome: '{b}, {g}, {v} in progressione aritmetica', regole: [
    { t: 'sì: {g} − {b} = {v} − {g}', f: c => c[1] - c[0] === c[2] - c[1] },
    { t: 'no', f: c => c[1] - c[0] !== c[2] - c[1] }] }, 'malato');
  aggiungi({ id: 'div', nome: '{b} divide {v}', regole: [
    { t: 'sì, {v} è multiplo di {b}', f: c => c[2] % c[0] === 0 },
    { t: 'no', f: c => c[2] % c[0] !== 0 }] }, 'malato');
  aggiungi({ id: 'amp', nome: 'Cifra più alta meno cifra più bassa', regole: [
    { t: '0 o 1', f: c => Math.max(...c) - Math.min(...c) <= 1 },
    ...[2, 3, 4].map(k => ({ t: String(k), f: c => Math.max(...c) - Math.min(...c) === k }))] }, 'malato');
  aggiungi({ id: 'med', nome: 'Colore con la cifra di mezzo', nota: 'Strettamente tra le altre due: con un pari merito nessuna regola vale.',
    regole: [0, 1, 2].map(i => ({ t: `${NOMI[i]} in mezzo`, f: c => inMezzo(c, i) })) }, 'malato');
  aggiungi(cartaConfronto('pes', '{b} + 2·{g} + 3·{v} rispetto a 18', '{b} + 2·{g} + 3·{v}', c => c[0] + 2 * c[1] + 3 * c[2], 18), 'malato');
  aggiungi(cartaConta('m4', 'Resto della somma diviso 4', c => somma(c) % 4, ['resto 0', 'resto 1', 'resto 2', 'resto 3']), 'malato', 'parita-somma');
  aggiungi({ id: 'mcd', nome: 'Massimo comun divisore delle tre cifre', regole: [
    { t: 'MCD = 1', f: c => mcd(mcd(c[0], c[1]), c[2]) === 1 },
    { t: 'MCD > 1', f: c => mcd(mcd(c[0], c[1]), c[2]) > 1 }] }, 'malato');
  aggiungi(cartaConta('vic', 'Vicine che differiscono di 1 ({b}–{g} e {g}–{v})',
    c => (Math.abs(c[0] - c[1]) === 1) + (Math.abs(c[1] - c[2]) === 1), ['nessuna coppia', 'una coppia', 'tutte e due']), 'malato');
  aggiungi(cartaConta('sop', 'Cifre sopra la media delle tre', c => c.filter(x => 3 * x > somma(c)).length,
    ['nessuna', 'una', 'due']), 'malato');
  aggiungi({ id: 'bxg', nome: '{b} × {g} rispetto a {v}', regole: [0, 1, 2].map(j => ({ t: `{b} × {g} ${CMP[j]} {v}`, f: c => confronto(c[0] * c[1], c[2])[j] })) }, 'malato');
  aggiungi(cartaConfronto('q30', 'Somma dei quadrati delle cifre rispetto a 30', 'quadrati', c => c[0] * c[0] + c[1] * c[1] + c[2] * c[2], 30), 'malato');
  aggiungi(cartaConta('fib', 'Quante cifre sono numeri di Fibonacci', c => c.filter(x => [1, 2, 3, 5].includes(x)).length,
    ['nessuna', 'una', 'due', 'tre']), 'malato', 'n4');
  aggiungi({ id: 'aut', nome: '{b} e il numero di cifre dispari', regole: [
    { t: '{b} = numero di cifre dispari', f: c => c[0] === 3 - pari(c) },
    { t: '{b} ≠ numero di cifre dispari', f: c => c[0] !== 3 - pari(c) }] }, 'malato');

  const PER_ID = Object.fromEntries(CARTE.map(c => [c.id, c]));
  CARTE.forEach(c => c.regole.forEach(r => { r.m = maschera(r.f); }));

  /* ---------- Livelli ----------
     n: verificatori; doppie: ogni verificatore mostra due carte; malati: quante carte malate (min, max);
     candidati: quanti codici restano possibili dopo il ragionamento perfetto sulle sole carte (min, max). */
  const LIVELLI = {
    medio:     { nome: 'Medio',     n: 4, doppie: false, malati: [0, 0], candidati: [2, 6] },
    difficile: { nome: 'Difficile', n: 5, doppie: false, malati: [2, 3], candidati: [4, 12] },
    insano:    { nome: 'Insano',    n: 6, doppie: true,  malati: [7, 12], candidati: [8, 40] }
  };

  /* ---------- Puzzle ----------
     Formato (finisce anche nelle stanze): { v: 1, livello, ver: [{ carte: ['cv03'], vera: 2 }], codice: [b, g, v] }
     «vera» è l'indice della regola vera nell'elenco di tutte le regole delle carte del verificatore, in ordine. */
  const regoleDi = ver => ver.carte.flatMap(id => PER_ID[id].regole);

  function combinazioni(ver) {
    const M = ver.map(v => regoleDi(v).map(r => r.m));
    const n = M.length, out = [], t = [], pref = [TUTTI];
    (function dfs(i) {
      if (i === n) {
        if (!unico(pref[n])) return;
        for (let j = 0; j < n; j++) {
          let x = TUTTI;
          for (let k = 0; k < n; k++) if (k !== j) x &= M[k][t[k]];
          if (!almenoDue(x)) return;
        }
        out.push({ t: t.slice(), codice: CODICI[bitIndice(pref[n])] });
        return;
      }
      for (let r = 0; r < M[i].length; r++) {
        const x = pref[i] & M[i][r];
        if (x === 0n) continue;
        t[i] = r; pref[i + 1] = x; dfs(i + 1);
      }
    })(0);
    return out;
  }

  /* Controllo completo di un puzzle: le tre garanzie e il codice. Restituisce un messaggio d'errore o null. */
  function controlla(p) {
    if (!p || !Array.isArray(p.ver) || !p.ver.length) return 'formato';
    for (const v of p.ver) {
      if (!v.carte.every(id => PER_ID[id])) return 'carta sconosciuta';
      if (!(v.vera >= 0 && v.vera < regoleDi(v).length)) return 'regola vera';
    }
    const vere = p.ver.map(v => regoleDi(v)[v.vera].m);
    const tutte = vere.reduce((a, m) => a & m, TUTTI);
    if (!unico(tutte)) return '(U) codice non unico';
    if (p.codice && indiceCodice(p.codice) !== bitIndice(tutte)) return 'codice diverso';
    for (let j = 0; j < vere.length; j++) if (!almenoDue(vere.reduce((a, m, k) => k === j ? a : a & m, TUTTI))) return '(N) verificatore inutile';
    const codici = new Set(combinazioni(p.ver).map(x => x.codice.join('')));
    if (codici.size < 2) return '(D) si deduce senza domande';
    return null;
  }

  /* Genera un puzzle del livello dato. caso(n) deve dare un intero uniforme in [0, n). */
  function genera(livello, caso) {
    const L = LIVELLI[livello];
    if (!L) throw new Error('livello sconosciuto');
    const classici = CARTE.filter(c => c.tipo === 'classico'), malati = CARTE.filter(c => c.tipo === 'malato');
    const quanteCarte = L.n * (L.doppie ? 2 : 1);
    for (let tentativo = 0; tentativo < 20000; tentativo++) {
      const codice = CODICI[caso(125)];
      const k = indiceCodice(codice);
      // quante carte malate
      const nm = Math.min(quanteCarte, L.malati[0] + caso(L.malati[1] - L.malati[0] + 1));
      const scelte = [], gruppi = new Set();
      const pesca = (mazzo, quante) => {
        const disponibili = mazzo.filter(c => !gruppi.has(c.gruppo) && c.regole.some(r => (r.m >> BigInt(k)) & 1n));
        for (let q = 0; q < quante; q++) {
          const ok = disponibili.filter(c => !gruppi.has(c.gruppo));
          if (!ok.length) return false;
          const c = ok[caso(ok.length)];
          scelte.push(c); gruppi.add(c.gruppo);
        }
        return true;
      };
      if (!pesca(malati, nm) || !pesca(classici, quanteCarte - nm)) continue;
      // mescola le carte e le divide tra i verificatori
      for (let i = scelte.length - 1; i > 0; i--) { const j = caso(i + 1); [scelte[i], scelte[j]] = [scelte[j], scelte[i]]; }
      const ver = [];
      let buono = true;
      for (let i = 0; i < L.n; i++) {
        const carte = L.doppie ? [scelte[2 * i], scelte[2 * i + 1]] : [scelte[i]];
        // la regola vera viene da una sola delle carte: si sceglie la carta, poi una regola vera per il codice
        const quale = caso(carte.length);
        const offset = carte.slice(0, quale).reduce((a, c) => a + c.regole.length, 0);
        const vere = carte[quale].regole.map((r, j) => ((r.m >> BigInt(k)) & 1n) ? j : -1).filter(j => j >= 0);
        if (!vere.length) { buono = false; break; }
        ver.push({ carte: carte.map(c => c.id), vera: offset + vere[caso(vere.length)] });
      }
      if (!buono) continue;
      // (U) e (N) sulle regole vere
      const m = ver.map(v => regoleDi(v)[v.vera].m);
      if (!unico(m.reduce((a, x) => a & x, TUTTI))) continue;
      let utili = true;
      for (let j = 0; j < m.length && utili; j++) if (!almenoDue(m.reduce((a, x, q) => q === j ? a : a & x, TUTTI))) utili = false;
      if (!utili) continue;
      // (D) e difficoltà: codici ancora possibili ragionando solo sulle carte
      const candidati = new Set(combinazioni(ver).map(x => x.codice.join(''))).size;
      if (candidati < L.candidati[0] || candidati > L.candidati[1]) continue;
      return { v: 1, livello, ver, codice: codice.slice() };
    }
    throw new Error('nessun puzzle trovato');
  }

  /* ---------- Domande e round ---------- */
  const rispetta = (p, i, codice) => regoleDi(p.ver[i])[p.ver[i].vera].f(codice);
  const giusto = (p, codice) => !!codice && codice.join('') === p.codice.join('');

  /* Fine di un round in versus. giocatori: [{ id, attivo, dich: { codice } | null, domande }] per chi era in gioco nel round.
     Regole (come nel gioco originale): se qualcuno ha dichiarato il codice giusto la partita finisce e vince,
     tra loro, chi ha fatto meno domande (a pari domande vincono insieme). Altrimenti chi ha dichiarato è eliminato;
     se resta un solo giocatore vince lui, se non resta nessuno la partita finisce senza vincitori. */
  function fineRound(p, giocatori) {
    const inGioco = giocatori.filter(g => g.attivo);
    const dichiarano = inGioco.filter(g => g.dich);
    const giusti = dichiarano.filter(g => giusto(p, g.dich.codice));
    if (giusti.length) {
      const min = Math.min(...giusti.map(g => g.domande));
      return { fine: true, vincitori: giusti.filter(g => g.domande === min).map(g => g.id), eliminati: dichiarano.filter(g => !giusto(p, g.dich.codice)).map(g => g.id) };
    }
    const eliminati = dichiarano.map(g => g.id);
    const restano = inGioco.filter(g => !eliminati.includes(g.id));
    if (restano.length === 1 && inGioco.length > 1) return { fine: true, vincitori: [restano[0].id], eliminati, ultimo: true };
    if (restano.length === 0) return { fine: true, vincitori: [], eliminati };
    return { fine: false, vincitori: [], eliminati };
  }

  const CM = { CODICI, CARTE, PER_ID, LIVELLI, regoleDi, combinazioni, controlla, genera, rispetta, giusto, fineRound, conta, maschera };
  if (typeof module !== 'undefined' && module.exports) module.exports = CM;
  else root.CM = CM;
})(typeof self !== 'undefined' ? self : this);
