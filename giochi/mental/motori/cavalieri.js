/* =====================================================================
   MENTAL · SINCERI E BUGIARDI (id «cavalieri», dai «cavalieri e furfanti» di Smullyan)
   Su un'isola ognuno è sincero (dice sempre il vero) o bugiardo (mente sempre).
   Ognuno dice una frase; bisogna capire chi è sincero e chi è bugiardo.
   Si consegna una volta deciso tutto: ogni consegna sbagliata costa un minuto.

   Dati: { gente: [{ nome, f }], frasi: [frase] }  (f: true se femminile, per gli accordi)
   Frasi (x, y indici delle persone, v 1 sincero / 0 bugiardo):
     { t: 'tipo', x, v, forma }       «X è sincera.» / «X mente.»
     { t: 'stesso', x, y }            «X e Y sono dello stesso tipo.»
     { t: 'diverso', x, y }           «X e Y sono di tipo diverso.»
     { t: 'almeno', xs, v }           «Tra X, Y e Z c'è almeno un bugiardo.»
     { t: 'tutti', xs, v }            «X, Y e Z sono tutti sinceri.»
     { t: 'quanti', k, v }            «Tra tutti noi i sinceri sono esattamente k.»
     { t: 'se', x, a, y, b }          «Se X è sincero, allora Y è bugiardo.»
   Una frase può nominare chi la dice («io»).
   Stato: { c: [n] } 0 da decidere, 1 sincero, 2 bugiardo; e { errori } nella pagina.

   Tecniche del risolutore «umano»:
     deduzione  una frase e chi la dice, con quello che già si sa, permettono un solo tipo per
                qualcuno (per esempio: un sincero dice che X mente, quindi X è bugiardo);
     ipotesi    «se X fosse sincero…»: seguendo le deduzioni si arriva a una contraddizione;
     doppia     un'ipotesi dentro un'altra.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  deduzione: { nome: 'Deduzione', descr: 'Una frase, insieme a chi la dice e a quello che già si sa, lascia un solo tipo possibile per qualcuno.', peso: 1 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se fosse sincero…»: seguendo le conseguenze si arriva a una contraddizione.', peso: 4 },
  doppia: { nome: 'Doppio assurdo', descr: 'Un ragionamento per assurdo dentro un altro.', peso: 9 }
};
const NOMI = [
  ['Ada', 1], ['Bruno', 0], ['Carla', 1], ['Dario', 0], ['Elena', 1], ['Fabio', 0], ['Gemma', 1], ['Ivo', 0], ['Livia', 1],
  ['Marco', 0], ['Nina', 1], ['Oreste', 0], ['Pia', 1], ['Rocco', 0], ['Sara', 1], ['Tullio', 0], ['Ugo', 0], ['Vera', 1], ['Zeno', 0]
];

/* ---------------- Verità di una frase ---------------- */
function vera(fr, a) {                               // a: tipi (1 sincero, 0 bugiardo)
  switch (fr.t) {
    case 'tipo': return a[fr.x] === fr.v;
    case 'stesso': return a[fr.x] === a[fr.y];
    case 'diverso': return a[fr.x] !== a[fr.y];
    case 'almeno': return fr.xs.some(x => a[x] === fr.v);
    case 'tutti': return fr.xs.every(x => a[x] === fr.v);
    case 'quanti': return a.filter(x => x === fr.v).length === fr.k;
    case 'se': return a[fr.x] !== fr.a || a[fr.y] === fr.b;
  }
  throw new Error('frase sconosciuta ' + fr.t);
}
function nominati(fr, n) {
  switch (fr.t) {
    case 'tipo': return [fr.x];
    case 'stesso': case 'diverso': return [fr.x, fr.y];
    case 'almeno': case 'tutti': return fr.xs.slice();
    case 'quanti': return [...Array(n).keys()];
    case 'se': return [fr.x, fr.y];
  }
  return [];
}
/* Le persone coinvolte in un vincolo: chi parla e chi è nominato */
const coinvolti = (p, i) => [...new Set([i, ...nominati(p.frasi[i], p.gente.length)])];
const coerente = (p, a) => p.frasi.every((fr, i) => vera(fr, a) === (a[i] === 1));

/* ---------------- Testo ---------------- */
function testo(p, i) {
  const fr = p.frasi[i], g = p.gente, io = i;
  const nome = (x, me) => (x === io ? (me ? 'me' : 'io') : g[x].nome);
  const agg = (x, v) => (v ? (g[x].f ? 'sincera' : 'sincero') : (g[x].f ? 'bugiarda' : 'bugiardo'));
  const elenco = (xs, me) => { const s = xs.map(x => nome(x, me)); return s.length === 1 ? s[0] : s.slice(0, -1).join(', ') + ' e ' + s[s.length - 1]; };
  const conIo = xs => (xs.includes(io) ? xs.filter(x => x !== io).concat([io]) : xs);
  const plurale = (xs, v) => { const femm = xs.every(x => g[x].f); return v ? (femm ? 'sincere' : 'sinceri') : (femm ? 'bugiarde' : 'bugiardi'); };
  const maiusc = s => s.charAt(0).toUpperCase() + s.slice(1);
  switch (fr.t) {
    case 'tipo':
      if (fr.x === io) return fr.v ? 'Io sono ' + agg(io, 1) + '.' : 'Io mento.';
      if (fr.forma === 1) return fr.v ? `${g[fr.x].nome} dice il vero.` : `${g[fr.x].nome} mente.`;
      return `${g[fr.x].nome} è ${agg(fr.x, fr.v)}.`;
    case 'stesso': case 'diverso': {
      const tipo = fr.t === 'stesso' ? 'dello stesso tipo' : 'di tipo diverso';
      if (fr.x === io || fr.y === io) { const altro = fr.x === io ? fr.y : fr.x; return `Io e ${g[altro].nome} siamo ${tipo}.`; }
      return `${g[fr.x].nome} e ${g[fr.y].nome} sono ${tipo}.`;
    }
    case 'almeno': {
      const xs = conIo(fr.xs), femm = xs.every(x => g[x].f);
      const chi = fr.v ? (femm ? 'una sincera' : 'un sincero') : (femm ? 'una bugiarda' : 'un bugiardo');
      return `Tra ${elenco(xs, true)} c’è almeno ${chi}.`;
    }
    case 'tutti': {
      const xs = conIo(fr.xs), femm = xs.every(x => g[x].f);
      const tutti = xs.length === 2 ? (femm ? 'entrambe' : 'entrambi') : (femm ? 'tutte' : 'tutti');
      if (xs.includes(io)) return maiusc(`${elenco(xs)} siamo ${tutti} ${plurale(xs, fr.v)}.`);
      return `${elenco(xs)} sono ${tutti} ${plurale(xs, fr.v)}.`;
    }
    case 'quanti': {
      const chi = fr.v ? 'sinceri' : 'bugiardi';
      if (fr.k === 0) return fr.v ? 'Qui nessuno è sincero.' : 'Qui nessuno mente.';
      if (fr.k === 1) return fr.v ? 'Tra tutti noi c’è un solo sincero.' : 'Tra tutti noi c’è un solo bugiardo.';
      return `Tra tutti noi i ${chi} sono esattamente ${fr.k}.`;
    }
    case 'se': {
      const parte = (x, v) => (x === io ? (v ? 'io sono ' + agg(io, 1) : 'io mento') : `${g[x].nome} è ${agg(x, v)}`);
      return `Se ${parte(fr.x, fr.a)}, allora ${parte(fr.y, fr.b)}.`;
    }
  }
  return '';
}

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { c: Array(p.gente.length).fill(0) }; }
function conflitti() { return []; }                 // non si dice niente finché non si consegna
function completo(p, st) { return st.c.every(x => x > 0); }
function statoRisolto(p, sol) { return { c: sol.map(x => (x ? 1 : 2)) }; }
/* Consegna: quante risposte sono sbagliate (la pagina dice solo se è tutto giusto) */
function sbagliati(p, st, sol) { return st.c.filter((x, i) => (x === 1 ? 1 : 0) !== sol[i]).length; }

/* ---------------- Conteggio (tutte le 2^n possibilità) ---------------- */
function conta(p, cap = 2) {
  const n = p.gente.length; let tot = 0, prima = null;
  for (let m = 0; m < (1 << n); m++) {
    const a = Array.from({ length: n }, (_, i) => (m >> i) & 1);
    if (coerente(p, a)) { tot++; if (!prima) prima = a; if (tot >= cap) break; }
  }
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ----------------
   v: -1 non so, 0 bugiardo, 1 sincero. «deduzione»: per ogni frase si guardano i modi di
   assegnare chi è coinvolto (chi parla e chi è nominato) compatibili con quello che si sa;
   se qualcuno ha lo stesso tipo in tutti, si fissa. */
function deduci(p, v, segna) {
  const n = v.length;
  for (let giro = true; giro;) {
    giro = false;
    for (let i = 0; i < n; i++) {
      const cc = coinvolti(p, i), ignoti = cc.filter(x => v[x] < 0);
      if (!ignoti.length) { if (vera(p.frasi[i], v) !== (v[i] === 1)) return false; continue; }
      const sempre = ignoti.map(() => [false, false]); let alcuno = false;
      for (let m = 0; m < (1 << ignoti.length); m++) {
        const a = v.slice(); ignoti.forEach((x, k) => { a[x] = (m >> k) & 1; });
        // le frasi che nominano persone ancora ignote fuori dal vincolo non servono qui:
        // il vincolo riguarda solo chi è coinvolto
        if (vera(p.frasi[i], a) !== (a[i] === 1)) continue;
        alcuno = true; ignoti.forEach((x, k) => { sempre[k][a[x]] = true; });
      }
      if (!alcuno) return false;
      ignoti.forEach((x, k) => {
        if (sempre[k][0] !== sempre[k][1]) { v[x] = sempre[k][1] ? 1 : 0; giro = true; if (segna) segna('deduzione', { frase: i, chi: x }); }
      });
    }
  }
  return true;
}
function risolvi(p) {
  const n = p.gente.length, v = Array(n).fill(-1);
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const assurdo = (w, x, val) => { const u = w.slice(); u[x] = val; return !deduci(p, u); };
  if (!deduci(p, v, segna)) return { risolto: false, contraddizione: true, passi, conteggio };
  for (let giri = 0; giri < 4 * n && v.includes(-1); giri++) {
    let fatto = false;
    // per assurdo, un livello
    for (let x = 0; x < n && !fatto; x++) {
      if (v[x] >= 0) continue;
      for (const val of [1, 0]) if (assurdo(v, x, val)) { v[x] = 1 - val; segna('ipotesi', { chi: x, prova: val }); fatto = true; break; }
    }
    // per assurdo, due livelli: con x = val, qualunque tipo si dia a y si arriva a un assurdo
    for (let x = 0; x < n && !fatto; x++) {
      if (v[x] >= 0) continue;
      for (const val of [1, 0]) {
        const u = v.slice(); u[x] = val;
        if (!deduci(p, u)) continue;
        let rotto = false;
        for (let y = 0; y < n && !rotto; y++) if (u[y] < 0 && assurdo(u, y, 0) && assurdo(u, y, 1)) rotto = true;
        if (!rotto) {
          // oppure un'ipotesi interna porta a un assurdo dopo aver fissato y
          for (let y = 0; y < n && !rotto; y++) {
            if (u[y] >= 0) continue;
            for (const vy of [1, 0]) if (assurdo(u, y, vy)) { const w = u.slice(); w[y] = 1 - vy; if (!deduci(p, w)) { rotto = true; break; } }
          }
        }
        if (rotto) { v[x] = 1 - val; segna('doppia', { chi: x, prova: val }); fatto = true; break; }
      }
    }
    if (!fatto) break;
    if (!deduci(p, v, segna)) return { risolto: false, contraddizione: true, passi, conteggio };
  }
  const risolto = !v.includes(-1) && coerente(p, v);
  return { risolto, sol: risolto ? v.slice() : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const n = p.gente.length, ip = ris.conteggio.ipotesi || 0, dp = ris.conteggio.doppia || 0;
  if (n >= 7 && (dp >= 1 || ip >= 3)) return 'estrema';
  if (n === 6 && dp === 0 && ip >= 1 && ip <= 2) return 'esperta';
  if (n === 5 && dp === 0 && ip <= 1 && (ris.conteggio.deduzione || 0) >= 3) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [5], esperta: [6], estrema: [7] };
const SCHEMI = {
  impegnativa: ['tipo', 'tipo', 'stesso', 'diverso', 'almeno', 'tutti', 'se'],
  esperta: ['tipo', 'stesso', 'diverso', 'almeno', 'tutti', 'quanti', 'se', 'se'],
  estrema: ['tipo', 'stesso', 'diverso', 'almeno', 'tutti', 'quanti', 'se', 'se', 'almeno']
};
function fraseACaso(r, n, i, schema) {
  const altri = [...Array(n).keys()].filter(x => x !== i);
  const qualcuno = (conMe) => (conMe && r(4) === 0 ? i : r.scegli(altri));
  const t = r.scegli(schema);
  switch (t) {
    case 'tipo': return { t, x: r.scegli(altri), v: r(2), forma: r(2) };
    case 'stesso': case 'diverso': { const x = qualcuno(true); let y; do { y = r.scegli(altri); } while (y === x); return { t, x, y }; }
    case 'almeno': case 'tutti': {
      const k = r(3) === 0 ? 3 : 2, pool = r.mescola((r(3) === 0 ? [...Array(n).keys()] : altri).slice());
      return { t, xs: pool.slice(0, k).sort((a, b) => a - b), v: r(2) };
    }
    case 'quanti': return { t, k: r(n + 1), v: r(2) };
    case 'se': { const x = qualcuno(true); let y; do { y = r.scegli(altri); } while (y === x); return { t, x, a: r(2), y, b: r(2) }; }
  }
}
/* Una frase che chi parla può dire davvero (vera se è sincero, falsa se mente) e che non è
   vuota (non deve essere vera o falsa comunque stiano le cose: «io sono sincero» non dice niente) */
function fraseGiusta(r, n, i, sol, schema) {
  for (;;) {
    const fr = fraseACaso(r, n, i, schema);
    if (vera(fr, sol) !== (sol[i] === 1)) continue;
    // vincolo vuoto: soddisfatto da tutte le assegnazioni di chi è coinvolto
    const cc = [...new Set([i, ...nominati(fr, n)])];
    if (cc.length <= 6) {
      let tutte = true;
      for (let m = 0; m < (1 << cc.length) && tutte; m++) {
        const a = sol.slice(); cc.forEach((x, k) => { a[x] = (m >> k) & 1; });
        if (vera(fr, a) !== (a[i] === 1)) tutte = false;
      }
      if (tutte) continue;
    }
    return fr;
  }
}
function genera(r, voluto, tentativi = 4000) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto]);
    // nomi con iniziali diverse, in ordine alfabetico
    const gente = r.mescola(NOMI.slice()).slice(0, n).sort((a, b) => a[0].localeCompare(b[0])).map(([nome, f]) => ({ nome, f: !!f }));
    const sol = Array.from({ length: n }, () => r(2));
    const sinceri = sol.filter(x => x).length;
    if (sinceri < 2 || n - sinceri < 2) continue;
    const schema = SCHEMI[voluto];
    const p = { gente, frasi: Array.from({ length: n }, (_, i) => fraseGiusta(r, n, i, sol, schema)) };
    // si cambia una frase alla volta finché la soluzione è unica
    for (let k = 0; k < 60 && conta(p, 2) !== 1; k++) { const i = r(n); p.frasi[i] = fraseGiusta(r, n, i, sol, schema); }
    if (conta(p, 2) !== 1) continue;
    // non troppe frasi dello stesso tipo
    const tipi = {}; for (const fr of p.frasi) tipi[fr.t] = (tipi[fr.t] || 0) + 1;
    if (Object.values(tipi).some(x => x > Math.ceil(n / 2))) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Array.isArray(p.gente) || !Array.isArray(p.frasi) || p.gente.length !== p.frasi.length) return 'forma';
  const n = p.gente.length;
  for (const fr of p.frasi) for (const x of nominati(fr, n)) if (!(x >= 0 && x < n)) return 'persona inesistente';
  return null;
}

const E = {
  id: 'cavalieri', nome: 'Sinceri e bugiardi', tipo: 'testo', TECNICHE, MISURE,
  breve: 'Chi dice sempre il vero e chi mente sempre? Una frase a testa.',
  regole: [
    'Ognuno è <b>sincero</b> (dice sempre il vero) oppure <b>bugiardo</b> (mente sempre). Ognuno dice una frase.',
    'Una frase di un bugiardo è falsa per intero: se un bugiardo dice «X e Y sono sinceri», almeno uno dei due mente.',
    '«Dello stesso tipo» vuol dire entrambi sinceri o entrambi bugiardi. «Se A, allora B» è falsa solo quando A è vera e B no.',
    'Tocca una persona per segnarla sincera o bugiarda, poi <b>Consegna</b>. Ogni consegna sbagliata aggiunge <b>un minuto</b>.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida,
  testo, vera, sbagliati, coerente
};
if (M) M.motori.cavalieri = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
