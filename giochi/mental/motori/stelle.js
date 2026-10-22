/* =====================================================================
   MENTAL · STELLE (regole in stile «Star Battle», due stelle)
   Griglia n×n (di solito 10×10) divisa in n regioni. Due stelle in ogni riga, colonna e
   regione; due stelle non si toccano, neanche in diagonale.

   Dati: { n, k: 2, reg: [n·n] }        Stato: { c: [n·n] } 0 vuota, 1 croce, 2 stella.

   Tecniche del risolutore «umano»:
     completa   un'unità ha esattamente tanti posti quante stelle mancano (o le ha già tutte);
     spazio     in un'unità le stelle che mancano ci stanno in un solo modo, o una casella non
                compare in nessun modo di sistemarle (es. tre caselle in fila: due stelle solo
                agli estremi);
     vicinanza  qualunque modo di completare un'unità tocca una certa casella fuori: è vuota;
     confine1   una regione (o riga, colonna) con tutti i posti dentro un'altra unità con lo stesso
                numero di stelle mancanti: il resto di quell'unità è vuoto;
     ipotesi    una stella qui lascerebbe un'unità senza spazio per le sue stelle;
     confine2   lo stesso del confine con 2 unità contro 2;
     confine3   con 3 o più.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  completa: { nome: 'Unità completa', descr: 'Un’unità ha tanti posti quante stelle le mancano, oppure le ha già tutte.', peso: 1 },
  spazio: { nome: 'Spazio stretto', descr: 'Le stelle che mancano a un’unità ci stanno in pochi modi: le caselle comuni a tutti sono stelle, quelle in nessuno sono vuote.', peso: 2 },
  vicinanza: { nome: 'Vicinato', descr: 'Comunque si completi un’unità, una certa casella vicina resta toccata da una stella: è vuota.', peso: 3 },
  confine1: { nome: 'Unità chiusa', descr: 'Tutti i posti di una regione stanno in una riga (o colonna) che ha bisogno delle stesse stelle: il resto della riga è vuoto.', peso: 3 },
  ipotesi: { nome: 'Se fosse qui…', descr: 'Una stella qui lascerebbe un’unità senza spazio per le sue stelle.', peso: 4 },
  confine2: { nome: 'Due contro due', descr: 'Due regioni chiuse in due righe (o colonne) con le stesse stelle mancanti.', peso: 6 },
  confine3: { nome: 'Gruppi chiusi', descr: 'Tre o più regioni chiuse in altrettante righe o colonne.', peso: 9 }
};

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { c: Array(p.n * p.n).fill(0) }; }
function conflitti(p, st) {
  const n = p.n, out = new Set(), st2 = [];
  st.c.forEach((v, i) => { if (v === 2) st2.push(i); });
  for (const i of st2) for (const j of M.intorno(n, i)) if (st.c[j] === 2) { out.add(i); out.add(j); }
  const conta_ = new Map();
  for (const i of st2) for (const key of ['r' + Math.floor(i / n), 'c' + (i % n), 'g' + p.reg[i]]) { if (!conta_.has(key)) conta_.set(key, []); conta_.get(key).push(i); }
  for (const l of conta_.values()) if (l.length > p.k) l.forEach(i => out.add(i));
  return [...out];
}
function completo(p, st) { return st.c.filter(v => v === 2).length === p.n * p.k && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { c: sol.map(v => (v ? 2 : 1)) }; }

/* ---------------- Conteggio (riga per riga) ---------------- */
function conta(p, cap = 2) {
  const n = p.n, k = p.k, colC = Array(n).fill(0), regC = Array(n).fill(0);
  // per potare: quante caselle di ogni regione restano nelle righe da r in giù
  const restoReg = Array.from({ length: n + 1 }, () => Array(n).fill(0));
  for (let r = n - 1; r >= 0; r--) { restoReg[r] = restoReg[r + 1].slice(); for (let c = 0; c < n; c++) restoReg[r][p.reg[r * n + c]]++; }
  const righe = [];                                    // tutti i modi di mettere k stelle non vicine in una riga
  const scegli = (da, sc) => { if (sc.length === k) { righe.push(sc.slice()); return; } for (let c = da; c < n; c++) { if (sc.length && c - sc[sc.length - 1] <= 1) continue; sc.push(c); scegli(c + 1, sc); sc.pop(); } };
  scegli(0, []);
  let tot = 0, prima = null; const pos = [];
  const giro = r => {
    if (r === n) { tot++; if (!prima) prima = pos.map(x => x.slice()); return tot >= cap; }
    const prec = r ? pos[r - 1] : [];
    for (const cs of righe) {
      if (cs.some(c => colC[c] >= k || prec.some(q => Math.abs(q - c) <= 1))) continue;
      let ok = true;
      for (const c of cs) { const g = p.reg[r * n + c]; regC[g]++; colC[c]++; if (regC[g] > k) ok = false; }
      if (ok) for (let g = 0; g < n && ok; g++) if (k - regC[g] > restoReg[r + 1][g] * 1) ok = k - regC[g] <= restoReg[r + 1][g];
      if (ok) for (let c = 0; c < n && ok; c++) if (k - colC[c] > n - 1 - r) ok = false;
      if (ok) { pos.push(cs); if (giro(r + 1)) return true; pos.pop(); }
      for (const c of cs) { regC[p.reg[r * n + c]]--; colC[c]--; }
    }
    return false;
  };
  giro(0);
  conta.ultima = prima ? Array.from({ length: n * n }, (_, i) => (prima[Math.floor(i / n)].includes(i % n) ? 1 : 0)) : null;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const n = p.n, k = p.k, N = n * n;
  const cand = Array(N).fill(true), st = Array(N).fill(false);
  const unita = [];
  for (let r = 0; r < n; r++) unita.push({ t: 'riga', k: r, celle: Array.from({ length: n }, (_, c) => r * n + c) });
  for (let c = 0; c < n; c++) unita.push({ t: 'colonna', k: c, celle: Array.from({ length: n }, (_, r) => r * n + c) });
  for (let g = 0; g < n; g++) unita.push({ t: 'regione', k: g, celle: [] });
  for (let i = 0; i < N; i++) unita[2 * n + p.reg[i]].celle.push(i);
  const dell = i => [unita[Math.floor(i / n)], unita[n + (i % n)], unita[2 * n + p.reg[i]]];
  const vic = Array.from({ length: N }, (_, i) => M.intorno(n, i));
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const manca = u => k - u.celle.filter(i => st[i]).length;
  const liberi = u => u.celle.filter(i => cand[i] && !st[i]);
  const metti = i => {
    st[i] = true; cand[i] = false;
    for (const j of vic[i]) cand[j] = false;
    for (const u of dell(i)) if (manca(u) === 0) for (const j of u.celle) if (!st[j]) cand[j] = false;
  };
  // tutti i modi di mettere s stelle non vicine tra le caselle l
  const modi = (l, s) => {
    const out = [], sc = [];
    const giro = a => {
      if (sc.length === s) { out.push(sc.slice()); return; }
      for (let x = a; x < l.length; x++) { if (sc.some(y => vic[y].includes(l[x]))) continue; sc.push(l[x]); giro(x + 1); sc.pop(); if (out.length > 400) return; }
    };
    giro(0);
    return out;
  };
  const coerente = () => unita.every(u => { const m = manca(u); return m >= 0 && (m === 0 || modi(liberi(u), m).length > 0); });
  const passoCompleta = () => {
    for (const u of unita) {
      const m = manca(u), l = liberi(u);
      if (m === 0 && l.length) { l.forEach(i => { cand[i] = false; }); segna('completa', { unita: u.t + u.k, elim: l }); return true; }
      if (m > 0 && l.length === m) { l.forEach(metti); segna('completa', { unita: u.t + u.k, stelle: l }); return true; }
    }
    return false;
  };
  const passoSpazio = () => {
    for (const u of unita) {
      const m = manca(u); if (m <= 0) continue;
      const l = liberi(u), md = modi(l, m);
      if (!md.length || md.length > 400) continue;
      const sempre = l.filter(i => md.every(x => x.includes(i))), mai = l.filter(i => md.every(x => !x.includes(i)));
      if (sempre.length) { sempre.forEach(metti); segna('spazio', { unita: u.t + u.k, stelle: sempre }); return true; }
      if (mai.length) { mai.forEach(i => { cand[i] = false; }); segna('spazio', { unita: u.t + u.k, elim: mai }); return true; }
    }
    return false;
  };
  const passoVicinanza = () => {
    for (const u of unita) {
      const m = manca(u); if (m <= 0) continue;
      const l = liberi(u), md = modi(l, m);
      if (!md.length || md.length > 400) continue;
      const tocca = new Set(); let primo = true;
      for (const x of md) {
        const t = new Set(); for (const s of x) for (const j of vic[s]) if (!u.celle.includes(j) && cand[j] && !st[j]) t.add(j);
        if (primo) { t.forEach(j => tocca.add(j)); primo = false; } else for (const j of [...tocca]) if (!t.has(j)) tocca.delete(j);
      }
      if (tocca.size) { const e = [...tocca]; e.forEach(j => { cand[j] = false; }); segna('vicinanza', { unita: u.t + u.k, elim: e }); return true; }
    }
    return false;
  };
  const indice = (t, i) => (t === 'riga' ? Math.floor(i / n) : t === 'colonna' ? i % n : p.reg[i]);
  const base = t => (t === 'riga' ? 0 : t === 'colonna' ? n : 2 * n);
  const passoConfine = q => {
    const tipi = ['regione', 'riga', 'colonna'];
    for (const ta of tipi) for (const tb of tipi) {
      if (ta === tb) continue;
      const A = unita.filter(u => u.t === ta && manca(u) > 0);
      let fatto = false;
      M.combinazioni(A, q, gr => {
        const celle = new Set(), b = new Set();
        for (const u of gr) for (const i of liberi(u)) { celle.add(i); b.add(indice(tb, i)); }
        if (b.size !== q) return false;
        const B = [...b].map(x => unita[base(tb) + x]);
        if (gr.reduce((s, u) => s + manca(u), 0) !== B.reduce((s, u) => s + manca(u), 0)) return false;
        const elim = [];
        for (const u of B) for (const j of u.celle) if (cand[j] && !st[j] && !celle.has(j)) elim.push(j);
        if (!elim.length) return false;
        elim.forEach(j => { cand[j] = false; });
        segna(q === 1 ? 'confine1' : q === 2 ? 'confine2' : 'confine3', { gruppo: gr.map(u => u.t + u.k), dentro: B.map(u => u.t + u.k), elim });
        fatto = true; return true;
      });
      if (fatto) return true;
    }
    return false;
  };
  const passoIpotesi = () => {
    for (let i = 0; i < N; i++) {
      if (!cand[i] || st[i]) continue;
      // stella in i: via i vicini e, nelle unità che si completano, il resto
      const via = new Set(vic[i]);
      for (const u of dell(i)) if (manca(u) === 1) for (const j of u.celle) if (j !== i) via.add(j);
      for (const u of unita) {
        const m = manca(u) - (u.celle.includes(i) ? 1 : 0);
        if (m <= 0) continue;
        const l = liberi(u).filter(j => j !== i && !via.has(j));
        if (modi(l, m).length === 0) { cand[i] = false; segna('ipotesi', { cella: i, rompe: u.t + u.k }); return true; }
      }
    }
    return false;
  };
  for (let giri = 0; giri < 20 * N; giri++) {
    if (st.filter(Boolean).length === n * k) break;
    if (!coerente()) return { risolto: false, contraddizione: true, passi, conteggio };
    if (passoCompleta() || passoSpazio() || passoVicinanza() || passoConfine(1) || passoIpotesi() || passoConfine(2)) continue;
    let ok = false;
    for (let q = 3; q <= Math.floor(n / 2) && !ok; q++) ok = passoConfine(q);
    if (ok) continue;
    break;
  }
  const risolto = st.filter(Boolean).length === n * k;
  return { risolto, sol: risolto ? st.map(x => (x ? 1 : 0)) : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const c = ris.conteggio, alte = (c.confine2 || 0) + 2 * (c.confine3 || 0) + (c.ipotesi || 0);
  if (alte >= 6 || (c.confine3 || 0) >= 1) return 'estrema';
  if (alte >= 2) return 'esperta';
  if ((c.vicinanza || 0) + (c.confine1 || 0) + alte >= 2) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [8], esperta: [10], estrema: [10] };
function genera(r, voluto, tentativi = 300) {
  for (let t = 0; t < tentativi; t++) {
    const n = r.scegli(MISURE[voluto] || [10]);
    const p = candidato(r, n);
    if (!p) continue;
    const ris = risolvi(p);
    if (!ris.risolto) continue;
    if (livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function soluzioneACaso(r, n, k) {
  const pos = [], colC = Array(n).fill(0);
  const righe = [];
  const scegli = (da, sc) => { if (sc.length === k) { righe.push(sc.slice()); return; } for (let c = da; c < n; c++) { if (sc.length && c - sc[sc.length - 1] <= 1) continue; sc.push(c); scegli(c + 1, sc); sc.pop(); } };
  scegli(0, []);
  let passi = 0;
  const giro = rr => {
    if (++passi > 20000) return false;
    if (rr === n) return colC.every(x => x === k);
    const prec = rr ? pos[rr - 1] : [];
    for (const cs of r.mescola(righe)) {
      if (cs.some(c => colC[c] >= k || prec.some(q => Math.abs(q - c) <= 1))) continue;
      cs.forEach(c => colC[c]++);
      let ok = true; for (let c = 0; c < n; c++) if (k - colC[c] > n - 1 - rr) ok = false;
      if (ok) { pos.push(cs); if (giro(rr + 1)) return true; pos.pop(); }
      cs.forEach(c => colC[c]--);
    }
    return false;
  };
  return giro(0) ? pos : null;
}
function candidato(r, n) {
  const k = 2, N = n * n, pos = soluzioneACaso(r, n, k);
  if (!pos) return null;
  const stelle = []; pos.forEach((cs, rr) => cs.forEach(c => stelle.push(rr * n + c)));
  const isStella = new Set(stelle);
  // coppie di stelle vicine (distanza di Manhattan piccola), a caso
  const libere = r.mescola(stelle), coppie = [];
  const dist = (a, b) => Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs(a % n - b % n);
  while (libere.length) {
    const a = libere.pop();
    let mig = -1, md = 1e9;
    for (let j = 0; j < libere.length; j++) { const d = dist(a, libere[j]) + r.f() * 2; if (d < md) { md = d; mig = j; } }
    coppie.push([a, libere.splice(mig, 1)[0]]);
  }
  // ogni coppia diventa una regione: un cammino che le unisce, senza passare da altre stelle
  const reg = Array(N).fill(-1);
  for (let g = 0; g < coppie.length; g++) {
    const [a, b] = coppie[g];
    const prev = new Map([[a, -1]]), coda = [a];
    while (coda.length && !prev.has(b)) {
      const x = coda.shift();
      for (const y of r.mescola(M.intorno(n, x, false))) {
        if (prev.has(y) || reg[y] >= 0 || (isStella.has(y) && y !== b)) continue;
        prev.set(y, x); coda.push(y);
      }
    }
    if (!prev.has(b)) return null;
    for (let x = b; x !== -1; x = prev.get(x)) reg[x] = g;
  }
  let liberi = reg.filter(x => x < 0).length;
  while (liberi > 0) {
    const bordo = [];
    for (let i = 0; i < N; i++) if (reg[i] < 0) for (const j of M.intorno(n, i, false)) if (reg[j] >= 0) bordo.push([i, reg[j]]);
    if (!bordo.length) return null;
    const [i, g] = r.scegli(bordo);
    if (reg[i] < 0) { reg[i] = g; liberi--; }
  }
  const p = { n, k, reg };
  // spostamenti di confine finché la soluzione è unica
  let q = conta(p, 30);
  for (let it = 0; it < 900 && q > 1; it++) {
    const altra = conta.ultima;
    const cand = [];
    for (let i = 0; i < N; i++) {
      if (isStella.has(i)) continue;
      for (const j of M.intorno(n, i, false)) if (reg[j] !== reg[i]) cand.push([i, reg[j]]);
    }
    const sbagliate = altra ? cand.filter(([i]) => altra[i]) : [];
    const [i, g] = r.scegli(sbagliate.length && r.p(0.6) ? sbagliate : cand);
    const vecchia = reg[i]; reg[i] = g;
    if (!connessa(n, reg, vecchia)) { reg[i] = vecchia; continue; }
    const q2 = conta(p, 30);
    if (q2 <= q || r.p(0.04)) q = q2; else reg[i] = vecchia;
  }
  if (conta(p, 2) !== 1) return null;
  return p;
}
function connessa(n, reg, g) {
  const celle = []; for (let i = 0; i < reg.length; i++) if (reg[i] === g) celle.push(i);
  if (!celle.length) return false;
  const vista = new Set([celle[0]]), coda = [celle[0]];
  while (coda.length) { const x = coda.pop(); for (const y of M.intorno(n, x, false)) if (reg[y] === g && !vista.has(y)) { vista.add(y); coda.push(y); } }
  return vista.size === celle.length;
}
function valida(p) {
  if (!p || !Number.isInteger(p.n) || p.k !== 2 || !Array.isArray(p.reg) || p.reg.length !== p.n * p.n) return 'forma';
  for (let g = 0; g < p.n; g++) if (!connessa(p.n, p.reg, g)) return 'regione ' + g + ' non connessa';
  return null;
}

const E = {
  id: 'stelle', nome: 'Stelle', tipo: 'segni', TECNICHE, MISURE,
  breve: 'Due stelle per riga, colonna e regione, mai a contatto.',
  regole: [
    'Metti <b>due stelle</b> in ogni riga, in ogni colonna e in ogni regione.',
    'Due stelle <b>non si toccano</b>, nemmeno in diagonale.',
    'Tocca una casella per la croce, ancora per la stella. Trascina per segnare croci in fila.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida
};
if (M) M.motori.stelle = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
