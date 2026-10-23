/* =====================================================================
   MENTAL · CHI È CHI (logigramma, alla «indovinello di Einstein»)
   Alcune persone, e per ognuna una cosa per categoria (l'animale, la bevanda, la casa in cui abita…):
   ogni cosa appartiene a una persona sola. Dagli indizi si ricava chi ha cosa. Se c'è la categoria
   delle case, le case sono in fila e numerate da sinistra (1) a destra, e gli indizi possono dire
   chi abita accanto a chi o più a sinistra.

   Dati: { n, cat: [chiave categoria], nomi: [n nomi], ind: [indizio] }
         ogni categoria (dopo i nomi) ha i suoi valori in CATEGORIE[chiave].valori, i primi n;
         un attributo è [categoria, valore] con categoria 0 = i nomi.
         indizi: { t: 'si' | 'no', x, y }  x e y sono la stessa persona / persone diverse;
                 { t: 'accanto' | 'sinistra' | 'subito', x, y }  case vicine / x più a sinistra di y /
                 x subito a sinistra di y (servono le case);
   Risposta (forma 'tabella'): v[c][persona] = valore, per c ≥ 1.

   Tecniche del risolutore «umano»: incrocio (gli indizi «sì» e «no» sulla tabella), unico (in una
   colonna resta un solo posto, o in una casella un solo valore), case (gli indizi di posizione),
   ipotesi («se fosse così…» porta a una contraddizione).
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  incrocio: { nome: 'Incroci', descr: 'Un «sì» o un «no» toglie possibilità anche nelle altre categorie della stessa persona.', peso: 1 },
  unico: { nome: 'Un solo posto', descr: 'Una cosa che può andare a una sola persona, o una persona che può avere una sola cosa.', peso: 1 },
  case: { nome: 'Le case in fila', descr: 'Chi abita accanto, o più a sinistra: certi numeri di casa diventano impossibili.', peso: 2 },
  ipotesi: { nome: 'Per assurdo', descr: '«Se fosse così…»: si arriva a una contraddizione, quindi non lo è.', peso: 6 }
};
/* Le categorie: valori e come si dice «x ha questo» (verbo e resto, per poter dire «non»). */
const CATEGORIE = {
  animale: { nome: 'Animale', valori: ['il gatto', 'il cane', 'il criceto', 'il pappagallo', 'la tartaruga'], verbo: 'ha', corto: ['gatto', 'cane', 'criceto', 'pappagallo', 'tartaruga'] },
  bevanda: { nome: 'Bevanda', valori: ['il tè', 'il caffè', 'la cioccolata', 'la spremuta', 'la limonata'], verbo: 'beve', corto: ['tè', 'caffè', 'cioccolata', 'spremuta', 'limonata'] },
  sport: { nome: 'Sport', valori: ['a tennis', 'a calcio', 'a pallavolo', 'a scacchi', 'a basket'], verbo: 'gioca', corto: ['tennis', 'calcio', 'pallavolo', 'scacchi', 'basket'] },
  citta: { nome: 'Città', valori: ['da Torino', 'da Napoli', 'da Bari', 'da Trieste', 'da Firenze'], verbo: 'viene', corto: ['Torino', 'Napoli', 'Bari', 'Trieste', 'Firenze'] },
  sciarpa: { nome: 'Sciarpa', valori: ['la sciarpa rossa', 'la sciarpa verde', 'la sciarpa gialla', 'la sciarpa blu', 'la sciarpa viola'], verbo: 'ha', corto: ['rossa', 'verde', 'gialla', 'blu', 'viola'] },
  lettura: { nome: 'Legge', valori: ['i gialli', 'i fumetti', 'le poesie', 'i romanzi', 'i saggi'], verbo: 'legge', corto: ['gialli', 'fumetti', 'poesie', 'romanzi', 'saggi'] },
  frutto: { nome: 'Frutto', valori: ['la mela', 'la pera', 'la banana', 'l’arancia', 'la pesca'], verbo: 'mangia', corto: ['mela', 'pera', 'banana', 'arancia', 'pesca'] },
  casa: { nome: 'Casa', valori: ['nella casa 1', 'nella casa 2', 'nella casa 3', 'nella casa 4', 'nella casa 5'], verbo: 'abita', corto: ['1', '2', '3', '4', '5'], ordinata: true }
};
const NOMI = ['Ada', 'Bruno', 'Carla', 'Dario', 'Elena', 'Fabio', 'Giulia', 'Luca', 'Marta', 'Nico', 'Olga', 'Piero', 'Rita', 'Sergio', 'Tina', 'Ugo', 'Vera'];

/* ---------------- Testi ---------------- */
const maiu = s => s.charAt(0).toUpperCase() + s.slice(1);
function chiave(p, c) { return c === 0 ? null : p.cat[c - 1]; }
function soggetto(p, [c, v]) { if (c === 0) return p.nomi[v]; const C = CATEGORIE[chiave(p, c)]; return `chi ${C.verbo} ${C.valori[v]}`; }
function predicato(p, [c, v], no) { if (c === 0) return (no ? 'non è ' : 'è ') + p.nomi[v]; const C = CATEGORIE[chiave(p, c)]; return `${no ? 'non ' : ''}${C.verbo} ${C.valori[v]}`; }
const daChi = (p, x) => (x[0] === 0 ? 'di ' + p.nomi[x[1]] : 'di ' + soggetto(p, x));
const aChi = (p, x) => (x[0] === 0 ? 'a ' + p.nomi[x[1]] : 'a ' + soggetto(p, x));
function testoIndizio(p, d) {
  const s = maiu(soggetto(p, d.x));
  switch (d.t) {
    case 'si': return `${s} ${predicato(p, d.y)}.`;
    case 'no': return `${s} ${predicato(p, d.y, true)}.`;
    case 'accanto': return `${s} abita accanto ${aChi(p, d.y)}.`;
    case 'sinistra': return `${s} abita più a sinistra ${daChi(p, d.y)}.`;
    case 'subito': return `${s} abita subito a sinistra ${daChi(p, d.y)}.`;
  }
  return '';
}

/* ---------------- Verifica degli indizi su una soluzione completa ---------------- */
/* sol[c][persona] = valore; inversa: chi[c][valore] = persona */
function chiHa(sol, [c, v]) { return c === 0 ? v : sol[c].indexOf(v); }
function casaDi(p, sol, persona) { const k = p.cat.indexOf('casa'); return k < 0 ? null : sol[k + 1][persona]; }
function vale(p, sol, d) {
  const a = chiHa(sol, d.x), b = chiHa(sol, d.y);
  if (a < 0 || b < 0) return true;                     // ancora da assegnare
  switch (d.t) {
    case 'si': return a === b;
    case 'no': return a !== b;
    case 'accanto': return Math.abs(casaDi(p, sol, a) - casaDi(p, sol, b)) === 1;
    case 'sinistra': return casaDi(p, sol, a) < casaDi(p, sol, b);
    case 'subito': return casaDi(p, sol, a) === casaDi(p, sol, b) - 1;
  }
  return false;
}
const categorieDi = (p, d) => { const s = new Set([d.x[0], d.y[0]]); if (d.t !== 'si' && d.t !== 'no') s.add(p.cat.indexOf('casa') + 1); s.delete(0); return [...s]; };
const permCache = {};
function permutazioni(n) {
  if (permCache[n]) return permCache[n];
  const out = [], a = [...Array(n).keys()];
  const g = k => { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; g(k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
  g(0); return (permCache[n] = out);
}
/* Ricerca completa: una permutazione per categoria; gli indizi si controllano appena hanno le loro categorie */
function tutte(p, ind = p.ind, cap = 2) {
  const k = p.cat.length, P = permutazioni(p.n), out = [];
  const pronti = Array.from({ length: k + 1 }, () => []);
  for (const d of ind) { const cs = categorieDi(p, d); pronti[cs.length ? Math.max(...cs) : 0].push(d); }
  const sol = [P[0].map((_, i) => i)];
  const giro = c => {
    if (c > k) { out.push(sol.map(x => x.slice())); return out.length >= cap; }
    for (const perm of P) {
      sol[c] = perm;
      if (pronti[c].every(d => vale(p, sol, d)) && giro(c + 1)) return true;
    }
    sol.length = c;
    return false;
  };
  if (pronti[0].every(d => vale(p, sol, d))) giro(1);
  return out;
}

/* ---------------- Interfaccia ---------------- */
function nuovoStato(p) { return { v: p.cat.map(() => Array(p.n).fill(-1)), prove: [] }; }
function completo() { return false; }
function conflitti() { return []; }
function statoRisolto(p, sol) { return { v: sol.slice(1).map(x => x.slice()), prove: [] }; }
function conta(p, cap = 2) { const t = tutte(p, p.ind, cap); conta.ultima = t[0] || null; return t.length; }
function giusta(p, v) { const t = tutte(p, p.ind, 2); return t.length === 1 && Array.isArray(v) && v.every((riga, c) => riga.every((x, i) => x === t[0][c + 1][i])); }
function vuota(p, v) { return !Array.isArray(v) || v.some(r => r.some(x => x < 0)); }
function soluzione(p) {
  const s = tutte(p, p.ind, 1)[0];
  return { risposta: p.nomi.map((nm, i) => `${nm}: ${p.cat.map((k, c) => CATEGORIE[k].corto[s[c + 1][i]]).join(', ')}`).join(' · '), tabella: s };
}
function testoHTML(p) {
  const cats = p.cat.map(k => CATEGORIE[k]);
  const elenco = cats.map(C => `<b>${C.nome}</b>: ${C.corto.slice(0, p.n).join(', ')}`).join('<br>');
  const case_ = p.cat.includes('casa') ? ' Le case sono in fila, numerate da sinistra a destra.' : '';
  return `<p>${p.n} amici: ${p.nomi.map(x => `<b>${x}</b>`).join(', ')}. Ognuno ha una cosa diversa per ogni categoria.${case_}</p><p class="piccolo">${elenco}</p>
    <ol class="elenco-indizi">${p.ind.map(d => `<li>${testoIndizio(p, d)}</li>`).join('')}</ol><p>Chi ha cosa?</p>`;
}
const opzioniDi = (p, c) => CATEGORIE[p.cat[c]].corto.slice(0, p.n);
const intestazioni = p => p.cat.map(k => CATEGORIE[k].nome);

/* ---------------- Risolutore «umano» ----------------
   Per ogni persona e categoria, l'insieme dei valori possibili (bit). Gli indizi tolgono possibilità. */
function risolvi(p, opz = {}) {
  const n = p.n, k = p.cat.length, TUTTI = (1 << n) - 1, kc = p.cat.indexOf('casa') + 1;
  const P = Array.from({ length: k + 1 }, (_, c) => Array.from({ length: n }, (_, i) => (c === 0 ? 1 << i : TUTTI)));
  const passi = [], conteggio = {};
  const segna = t => { passi.push({ t }); conteggio[t] = (conteggio[t] || 0) + 1; };
  const pop = m => { let x = 0; while (m) { m &= m - 1; x++; } return x; };
  const puo = (Q, i, [c, v]) => !!(Q[c][i] & (1 << v));
  const togli = (Q, i, [c, v]) => { if (!(Q[c][i] & (1 << v))) return 0; Q[c][i] &= ~(1 << v); return Q[c][i] ? 1 : null; };
  const fissa = (Q, i, [c, v]) => { if (Q[c][i] === 1 << v) return 0; if (!(Q[c][i] & (1 << v))) return null; Q[c][i] = 1 << v; return 1; };
  // incrocio: indizi sì/no
  const incrocio = Q => {
    let f = 0;
    for (const d of p.ind) {
      if (d.t !== 'si' && d.t !== 'no') continue;
      for (let i = 0; i < n; i++) {
        if (d.t === 'si') {
          for (const [a, b] of [[d.x, d.y], [d.y, d.x]]) {
            if (!puo(Q, i, a) && puo(Q, i, b)) { const x = togli(Q, i, b); if (x === null) return null; f += x; }
            if (Q[a[0]][i] === 1 << a[1]) { const x = fissa(Q, i, b); if (x === null) return null; f += x; }
          }
        } else {
          for (const [a, b] of [[d.x, d.y], [d.y, d.x]]) if (Q[a[0]][i] === 1 << a[1] && puo(Q, i, b)) { const x = togli(Q, i, b); if (x === null) return null; f += x; }
        }
        if (f) return f;
      }
    }
    return f;
  };
  // unico: righe e colonne della tabella (ogni valore a una persona sola)
  const unico = Q => {
    for (let c = 1; c <= k; c++) {
      for (let i = 0; i < n; i++) if (pop(Q[c][i]) === 1) for (let j = 0; j < n; j++) if (j !== i && (Q[c][j] & Q[c][i])) { Q[c][j] &= ~Q[c][i]; if (!Q[c][j]) return null; return 1; }
      for (let v = 0; v < n; v++) {
        const chi = []; for (let i = 0; i < n; i++) if (Q[c][i] & (1 << v)) chi.push(i);
        if (!chi.length) return null;
        if (chi.length === 1 && Q[c][chi[0]] !== 1 << v) { Q[c][chi[0]] = 1 << v; return 1; }
      }
    }
    return 0;
  };
  // case: indizi di posizione, sulle case possibili di chi ha x e di chi ha y
  const case_ = Q => {
    if (!kc) return 0;
    let f = 0;
    for (const d of p.ind) {
      if (d.t === 'si' || d.t === 'no') continue;
      const caseDi = a => { let m = 0; for (let i = 0; i < n; i++) if (puo(Q, i, a)) m |= Q[kc][i]; return m; };
      const ok = (h1, h2) => (d.t === 'accanto' ? Math.abs(h1 - h2) === 1 : d.t === 'sinistra' ? h1 < h2 : h1 === h2 - 1);
      const hx = caseDi(d.x), hy = caseDi(d.y);
      // case ammesse per x (c'è una casa di y compatibile) e per y
      let ax = 0, ay = 0;
      for (let h1 = 0; h1 < n; h1++) if (hx & (1 << h1)) for (let h2 = 0; h2 < n; h2++) if ((hy & (1 << h2)) && h1 !== h2 && ok(h1, h2)) { ax |= 1 << h1; ay |= 1 << h2; }
      if (!ax || !ay) return null;
      for (const [a, m] of [[d.x, ax], [d.y, ay]]) for (let i = 0; i < n; i++) {
        if (!puo(Q, i, a)) continue;
        if (!(Q[kc][i] & m)) { const x = togli(Q, i, a); if (x === null) return null; f += x; }
        else if (Q[a[0]][i] === 1 << a[1] && (Q[kc][i] & ~m)) { Q[kc][i] &= m; f++; }
      }
      // x e y non sono la stessa persona
      for (let i = 0; i < n; i++) {
        if (Q[d.x[0]][i] === 1 << d.x[1] && puo(Q, i, d.y)) { const x = togli(Q, i, d.y); if (x === null) return null; f += x; }
        if (Q[d.y[0]][i] === 1 << d.y[1] && puo(Q, i, d.x)) { const x = togli(Q, i, d.x); if (x === null) return null; f += x; }
      }
      if (f) return f;
    }
    return f;
  };
  const tec = [['unico', unico], ['incrocio', incrocio], ['case', case_]];
  const chiudi = Q => {
    for (let g = 0; g < 2000; g++) {
      let mosso = false;
      for (const [, f] of tec) { const x = f(Q); if (x === null) return null; if (x) { mosso = true; break; } }
      if (!mosso) return Q;
    }
    return Q;
  };
  const finito = () => P.every(r => r.every(m => pop(m) === 1));
  for (let g = 0; g < 400; g++) {
    if (finito()) break;
    let mosso = false;
    for (const [t, f] of tec) { const x = f(P); if (x === null) return { risolto: false, contraddizione: true, passi, conteggio }; if (x) { segna(t); mosso = true; break; } }
    if (mosso) continue;
    if (opz.senzaIpotesi) break;
    let fatto = false;
    for (let c = 1; c <= k && !fatto; c++) for (let i = 0; i < n && !fatto; i++) {
      if (pop(P[c][i]) < 2) continue;
      for (let v = 0; v < n && !fatto; v++) {
        if (!(P[c][i] & (1 << v))) continue;
        const Q = P.map(r => r.slice()); Q[c][i] = 1 << v;
        if (chiudi(Q) === null) { P[c][i] &= ~(1 << v); segna('ipotesi'); fatto = true; }
      }
    }
    if (!fatto) break;
  }
  if (!finito()) return { risolto: false, passi, conteggio };
  const sol = P.map(r => r.map(m => 31 - Math.clz32(m)));
  const risolto = p.ind.every(d => vale(p, sol, d)) && sol.every(r => new Set(r).size === n);
  return { risolto, sol: risolto ? sol : null, passi, conteggio };
}
function livello(p, ris) {
  const ip = ris.conteggio.ipotesi || 0, k = p.cat.length;
  if (ip > 6) return null;
  if (p.n >= 5 && k >= 3) return 'estrema';
  if (p.n >= 5 || (p.n === 4 && k >= 3)) return ip ? 'estrema' : 'esperta';
  if (p.n === 4 && k === 2 && !ip) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [[4, 2]], esperta: [[4, 3], [5, 2]], estrema: [[5, 3]] };
function genera(r, voluto, tentativi = 200) {
  for (let q = 0; q < tentativi; q++) {
    const [n, k] = r.scegli(MISURE[voluto]);
    const conCase = r.f() < 0.7;
    const altre = r.mescola(Object.keys(CATEGORIE).filter(x => x !== 'casa')).slice(0, conCase ? k - 1 : k);
    const cat = conCase ? r.mescola(altre.concat(['casa'])) : altre;
    const p = { n, cat, nomi: r.mescola(NOMI.slice()).slice(0, n).sort(), ind: [] };
    const sol = [[...Array(n).keys()]].concat(cat.map(() => r.mescola([...Array(n).keys()])));
    // tutti gli indizi veri possibili
    const attr = []; for (let c = 0; c <= k; c++) for (let v = 0; v < n; v++) attr.push([c, v]);
    const pool = [];
    for (const x of attr) for (const y of attr) {
      if (x[0] >= y[0]) continue;
      const d1 = { t: 'si', x, y }, d2 = { t: 'no', x, y };
      if (vale(p, sol, d1)) { if (r.f() < 0.5) pool.push(d1); } else if (r.f() < 0.35) pool.push(d2);
    }
    if (conCase) {
      const kc = cat.indexOf('casa') + 1;
      for (const x of attr) for (const y of attr) {
        if (x[0] === kc || y[0] === kc || (x[0] === y[0] && x[1] === y[1])) continue;
        for (const t of ['accanto', 'sinistra', 'subito']) { const d = { t, x, y }; if (vale(p, sol, d) && chiHa(sol, x) !== chiHa(sol, y) && (t !== 'accanto' || x[0] < y[0] || (x[0] === y[0] && x[1] < y[1])) && r.f() < 0.25) pool.push(d); }
      }
    }
    const ordine = r.mescola(pool);
    // si aggiungono indizi finché la soluzione è unica, poi si tolgono quelli che non servono
    for (const d of ordine) { p.ind.push(d); if (p.ind.length >= n * k && tutte(p, p.ind, 2).length === 1) break; }
    if (tutte(p, p.ind, 2).length !== 1) continue;
    for (const d of r.mescola(p.ind.slice())) { const i = p.ind.indexOf(d); p.ind.splice(i, 1); if (tutte(p, p.ind, 2).length !== 1) p.ind.splice(i, 0, d); }
    if (p.ind.length > 9 + 2 * k) continue;
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    p.ind = r.mescola(p.ind);
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || !Array.isArray(p.cat) || !Array.isArray(p.nomi) || p.nomi.length !== p.n || !Array.isArray(p.ind)) return 'forma';
  if (p.cat.some(k => !CATEGORIE[k])) return 'categoria sconosciuta';
  if (p.ind.some(d => !['si', 'no', 'accanto', 'sinistra', 'subito'].includes(d.t))) return 'indizio sconosciuto';
  if (p.ind.some(d => d.t !== 'si' && d.t !== 'no') && !p.cat.includes('casa')) return 'indizio di posizione senza case';
  if (tutte(p, p.ind, 2).length !== 1) return 'soluzioni: ' + tutte(p, p.ind, 2).length;
  return null;
}

const E = {
  id: 'logigramma', nome: 'Chi è chi', tipo: 'risposta', famiglia: 'logica', TECNICHE, MISURE, CATEGORIE,
  breve: 'Pochi indizi e una tabella: chi ha cosa?',
  regole: [
    'Ogni persona ha <b>una cosa per categoria</b>, e ogni cosa è di <b>una persona sola</b>.',
    'Gli indizi bastano per capire tutto; nessuno è falso. Se ci sono le case, sono in fila e numerate da sinistra.',
    'Tocca una casella della tabella e poi una cosa per metterla. Quando la tabella è piena tocca <b>Consegna</b>: ogni consegna sbagliata aggiunge un minuto.'
  ],
  forma: () => 'tabella', nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  giusta, vuota, soluzione, testoHTML, opzioniDi, intestazioni, testoIndizio, tutte
};
if (M) M.motori.logigramma = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
