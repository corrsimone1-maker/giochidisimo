/* =====================================================================
   MENTAL · CRIPTARITMO
   Una somma in colonna scritta con le lettere: lettere uguali sono cifre uguali, lettere diverse
   cifre diverse, e nessun numero comincia con lo zero. La soluzione è una sola: si chiede quanto vale
   la parola del risultato.

   Dati: { addendi: [parole], somma: parola }   parole in maiuscolo, senza accenti.
   Risposta (forma 'numero'): il valore della parola della somma.

   Tecniche del risolutore «umano» (sulle cifre possibili di ogni lettera, colonna per colonna con
   i riporti): riporto (la prima lettera di una somma più lunga è 1, e i riporti di una colonna
   limitano le cifre), colonna (in una colonna le cifre possibili si escludono a vicenda), diverse
   (una cifra già presa non va ad altre lettere), ipotesi («se questa lettera valesse…»).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  riporto: { nome: 'Il riporto', descr: 'Una somma più lunga degli addendi comincia per 1; i riporti di una colonna limitano le cifre.', peso: 1 },
  colonna: { nome: 'Colonna per colonna', descr: 'Le cifre di una colonna, col riporto, devono tornare: molte combinazioni cadono.', peso: 2 },
  diverse: { nome: 'Cifre diverse', descr: 'Una cifra già presa da una lettera non può andare a un’altra.', peso: 1 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se questa lettera valesse…»: si arriva a una contraddizione.', peso: 6 }
};
/* Parole comuni (senza accenti), per costruire le somme */
const PAROLE = ('acqua aria arte asino barca bello bosco botte bravo brodo bruno campo cane canto capra carne carro carta casa casco cena cielo cima coda colle conto corda corno corpo corsa costa cuore dado dente dieci dito dono dorso duca erba festa fiato filo fiore foca foglia fonte forno forte forza fuoco gallo gamba gatto gelo gesto giro gola gomma grano gufo idea isola lago lama lana lato latte lavoro lega legno letto lima lince lino lira lupo luna luce madre male mano mare masso mela mente mese meta miele mondo monte moro mosca moto mulo muro nave neve nido nome nonno nota notte nube onda oro orso orto osso pace padre pane panna parco pasta pera pesce piano pietra pino pista poeta ponte porta posta prato rana rete riso roba rosa ruota sale salto sasso scala scena secco sedia segno sella seme sera sette sole sonno spada stella strada suono tana tela tempo terra testa tetto tigre topo torre torta treno uomo uovo uva vaso vela vento verde vero vetro via vino viola vita voce volo zero zona zucca').split(' ').map(x => x.toUpperCase());

const PER_LUNGHEZZA = {};
const ordinato = d => Object.fromEntries(Object.keys(d).sort().map(k => [k, d[k]]));
function lettere(p) { const s = []; for (const w of p.addendi.concat([p.somma])) for (const c of w) if (!s.includes(c)) s.push(c); return s; }
const valore = (w, d) => { let x = 0; for (const c of w) x = x * 10 + d[c]; return x; };
/* Tutte le soluzioni (fino a cap): colonna per colonna da destra, con il riporto */
function tutte(p, cap = 2) {
  const L = lettere(p), out = [], prime = new Set(p.addendi.concat([p.somma]).filter(w => w.length > 1).map(w => w[0]));
  const lun = p.somma.length;
  if (p.addendi.some(w => w.length > lun)) return out;
  const col = k => ({ add: p.addendi.map(w => w[w.length - 1 - k]).filter(Boolean), s: p.somma[lun - 1 - k] });
  const d = {}, usate = new Set();
  // colonna k: si assegnano una per una le sue lettere ancora libere (lista fissata all'inizio della colonna)
  const giro = (k, riporto, j, lett) => {
    if (k === lun) { if (riporto === 0) out.push(ordinato(d)); return out.length >= cap; }
    const c = col(k);
    if (!lett) lett = c.add.concat([c.s]).filter((x, q, a) => d[x] == null && a.indexOf(x) === q);
    if (j < lett.length) {
      const x = lett[j];
      for (let v = prime.has(x) ? 1 : 0; v <= 9; v++) {
        if (usate.has(v)) continue;
        d[x] = v; usate.add(v);
        if (giro(k, riporto, j + 1, lett)) return true;
        delete d[x]; usate.delete(v);
      }
      return false;
    }
    const t = c.add.reduce((a, x) => a + d[x], 0) + riporto;
    if (t % 10 !== d[c.s]) return false;
    return giro(k + 1, Math.floor(t / 10), 0, null);
  };
  giro(0, 0, 0, null);
  return out;
}

/* ---------------- Interfaccia (si risponde con un numero) ---------------- */
function nuovoStato() { return { v: '', prove: [] }; }
function completo() { return false; }
function conflitti() { return []; }
function conta(p, cap = 2) { const t = tutte(p, cap); conta.ultima = t[0] || null; return t.length; }
function statoRisolto(p, sol) { return { v: String(valore(p.somma, sol || tutte(p, 1)[0])), prove: [] }; }
function leggi(s) { const x = String(s == null ? '' : s).replace(/[\s.]/g, ''); return /^\d+$/.test(x) ? Number(x) : null; }
function giusta(p, v) { const t = tutte(p, 2); return t.length === 1 && leggi(v) === valore(p.somma, t[0]); }
function vuota(p, v) { return leggi(v) == null; }
function soluzione(p) {
  const d = tutte(p, 1)[0], L = lettere(p).sort();
  return {
    risposta: String(valore(p.somma, d)),
    spiegazione: `<p>${L.map(c => `<b>${c}</b> = ${d[c]}`).join(', ')}.</p><p>${p.addendi.map(w => valore(w, d)).join(' + ')} = <b>${valore(p.somma, d)}</b></p>`
  };
}
function testoHTML(p) {
  const lun = Math.max(p.somma.length, ...p.addendi.map(w => w.length)) + 1;
  const riga = (w, segno = '') => `<div class="cr-riga">${segno ? `<span class="cr-segno">${segno}</span>` : ''}${Array.from({ length: lun - w.length }, () => '<span></span>').join('')}${[...w].map(c => `<span>${c}</span>`).join('')}</div>`;
  return `<p>Ogni lettera è una cifra: lettere uguali, cifre uguali; lettere diverse, cifre diverse. Nessun numero comincia con lo zero.</p>
    <div class="criptaritmo" style="--col:${lun}">${p.addendi.map((w, i) => riga(w, i === p.addendi.length - 1 ? '+' : '')).join('')}<div class="cr-linea"></div>${riga(p.somma)}</div>
    <p>La soluzione è una sola. Quanto vale <b>${p.somma}</b>?</p>`;
}

/* ---------------- Risolutore «umano» ----------------
   Cifre possibili per ogni lettera (bit), riporti possibili per ogni colonna; ogni colonna si
   controlla provando le combinazioni delle sue lettere ancora libere. */
function risolvi(p, opz = {}) {
  const L = lettere(p), lun = p.somma.length, prime = new Set(p.addendi.concat([p.somma]).filter(w => w.length > 1).map(w => w[0]));
  const D = {}; for (const c of L) D[c] = prime.has(c) ? 0x3FE : 0x3FF;
  const passi = [], conteggio = {};
  const segna = t => { passi.push({ t }); conteggio[t] = (conteggio[t] || 0) + 1; };
  const pop = m => { let x = 0; while (m) { m &= m - 1; x++; } return x; };
  const cols = Array.from({ length: lun }, (_, k) => ({ add: p.addendi.map(w => w[w.length - 1 - k]).filter(Boolean), s: p.somma[lun - 1 - k] }));
  const maxAdd = p.addendi.length;
  // riporti possibili entranti in ogni colonna (0 nella prima a destra); uscente dall'ultima = 0
  const riporto = Dd => {
    // una somma più lunga degli addendi comincia con il riporto dell'ultima colonna: da 1 a (addendi − 1)
    if (lun <= Math.max(...p.addendi.map(w => w.length))) return 0;
    const c = p.somma[0], m = ((1 << maxAdd) - 1) & ~1;
    if (!(Dd[c] & ~m)) return 0;
    Dd[c] &= m; return Dd[c] ? 1 : null;
  };
  const colonna = Dd => {
    // per ogni colonna, con i riporti possibili entranti e uscenti, si tengono solo le cifre che compaiono in qualche combinazione
    const entra = [[0]];                                // riporti possibili che entrano in ogni colonna
    for (let k = 0; k < lun; k++) {
      const c = cols[k], lett = c.add.concat([c.s]).filter((x, q, a) => a.indexOf(x) === q);
      const vista = {}; lett.forEach(x => { vista[x] = 0; });
      const esce = new Set();
      const ass = {};
      const prova = j => {
        if (j === lett.length) {
          const vals = Object.values(ass);
          if (new Set(vals).size !== vals.length) return;
          for (const r of entra[k]) {
            const t = c.add.reduce((a, x) => a + ass[x], 0) + r;
            if (t % 10 === ass[c.s]) { esce.add(Math.floor(t / 10)); for (const x of lett) vista[x] |= 1 << ass[x]; }
          }
          return;
        }
        const x = lett[j];
        for (let v = 0; v <= 9; v++) if (Dd[x] & (1 << v)) { ass[x] = v; prova(j + 1); }
        delete ass[x];
      };
      prova(0);
      if (!esce.size) return null;
      entra[k + 1] = [...esce];
      for (const x of lett) if (Dd[x] & ~vista[x]) { Dd[x] &= vista[x]; if (!Dd[x]) return null; return 1; }
    }
    if (!entra[lun].includes(0)) return null;
    return 0;
  };
  const diverse = Dd => {
    for (const x of L) if (pop(Dd[x]) === 1) for (const y of L) if (y !== x && (Dd[y] & Dd[x])) { Dd[y] &= ~Dd[x]; if (!Dd[y]) return null; return 1; }
    // una cifra possibile per una sola lettera, se servono tutte (10 lettere)
    return 0;
  };
  const tec = [['diverse', diverse], ['riporto', riporto], ['colonna', colonna]];
  const chiudi = Dd => {
    for (let g = 0; g < 500; g++) {
      let mosso = false;
      for (const [, f] of tec) { const x = f(Dd); if (x === null) return null; if (x) { mosso = true; break; } }
      if (!mosso) return Dd;
    }
    return Dd;
  };
  const finito = () => L.every(x => pop(D[x]) === 1);
  for (let g = 0; g < 400; g++) {
    if (finito()) break;
    let mosso = false;
    for (const [t, f] of tec) { const x = f(D); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let fatto = false;
    for (const x of L) {
      if (pop(D[x]) < 2) continue;
      for (let v = 0; v <= 9 && !fatto; v++) {
        if (!(D[x] & (1 << v))) continue;
        const Dd = Object.assign({}, D); Dd[x] = 1 << v;
        if (chiudi(Dd) === null) { D[x] &= ~(1 << v); segna('ipotesi'); fatto = true; }
      }
      if (fatto) break;
    }
    if (!fatto) break;
  }
  if (!finito()) return { risolto: false, passi, conteggio };
  const d = {}; for (const x of L.slice().sort()) d[x] = 31 - Math.clz32(D[x]);
  const risolto = p.addendi.reduce((a, w) => a + valore(w, d), 0) === valore(p.somma, d) && new Set(Object.values(d)).size === L.length;
  return { risolto, sol: risolto ? d : null, passi, conteggio };
}
function livello(p, ris) {
  // nei criptaritmi i casi da provare fanno parte del gioco: si contano, ma con un tetto
  const ip = ris.conteggio.ipotesi || 0, L = lettere(p).length;
  if (!ris.risolto || ip > 25) return null;
  if (L <= 7 && ip <= 2) return 'impegnativa';
  if (L >= 6 && ip <= 8) return 'esperta';
  if (L >= 8) return 'estrema';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [2], esperta: [2], estrema: [2, 3] };
function genera(r, voluto, tentativi = 60000) {
  for (let q = 0; q < tentativi; q++) {
    const k = r.scegli(MISURE[voluto]);
    const somma = r.scegli(PAROLE);
    const add = [], adatte = PER_LUNGHEZZA[somma.length] || (PER_LUNGHEZZA[somma.length] = PAROLE.filter(w => w.length <= somma.length && w.length >= somma.length - 1));
    for (let j = 0; j < k; j++) add.push(r.scegli(adatte));
    if (!add.some(w => w.length === somma.length || w.length === somma.length - 1)) continue;
    if (new Set(add.concat([somma])).size !== k + 1) continue;
    const p = { addendi: add, somma }, L = lettere(p).length;
    if (L > 10 || (voluto === 'impegnativa' && L > 7) || (voluto === 'esperta' && L < 6) || (voluto === 'estrema' && L < 8)) continue;
    // stima rapida: la somma più grande possibile deve poter avere la lunghezza giusta
    if (Math.max(...add.map(w => w.length)) < somma.length - 1) continue;
    if (tutte(p, 2).length !== 1) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Array.isArray(p.addendi) || p.addendi.length < 2 || typeof p.somma !== 'string') return 'forma';
  if (p.addendi.concat([p.somma]).some(w => !/^[A-Z]+$/.test(w))) return 'parole storte';
  if (lettere(p).length > 10) return 'più di dieci lettere';
  const t = tutte(p, 2).length; if (t !== 1) return 'soluzioni: ' + t;
  return null;
}

const E = {
  id: 'criptaritmo', nome: 'Criptaritmo', tipo: 'risposta', famiglia: 'numeri', TECNICHE, MISURE,
  breve: 'Una somma scritta con le lettere: trova le cifre nascoste.',
  regole: [
    'Ogni lettera sta per una cifra: <b>lettere uguali, cifre uguali</b>; lettere diverse, cifre diverse.',
    'Nessun numero comincia con lo zero. La somma in colonna deve tornare, e la soluzione è una sola.',
    'Scrivi quanto vale la parola del risultato e tocca <b>Consegna</b>: ogni consegna sbagliata aggiunge un minuto.'
  ],
  forma: () => 'numero', nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  giusta, vuota, soluzione, testoHTML, tutte, lettere, PAROLE
};
if (M) M.motori.criptaritmo = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
