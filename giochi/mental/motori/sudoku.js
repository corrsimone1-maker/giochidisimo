/* =====================================================================
   MENTAL · SUDOKU (9×9 classico)
   Dati: { g: [81] con 0 vuota, 1..9 data }    Stato: { v: [81], note: [81 bitmask] }

   Tecniche del risolutore «umano», in ordine:
     nascosto   singolo nascosto: in un'unità una cifra ha un solo posto;
     nudo       singolo nudo: una casella ha un solo candidato;
     blocco     candidati bloccati (pointing/claiming);
     coppia     coppia o tripla nuda;
     nascoste   coppia o tripla nascosta;
     xwing      X-Wing;
     swordfish  Swordfish;
     xywing     XY-Wing.
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  nascosto: { nome: 'Singolo nascosto', descr: 'In una riga, colonna o riquadro una cifra può andare in un solo posto.', peso: 1 },
  nudo: { nome: 'Singolo nudo', descr: 'In una casella resta una sola cifra possibile.', peso: 1 },
  blocco: { nome: 'Candidati bloccati', descr: 'In un riquadro una cifra sta solo su una riga (o colonna): fuori dal riquadro, su quella riga, non c’è.', peso: 3 },
  coppia: { nome: 'Coppie e triple nude', descr: 'Due caselle con gli stessi due candidati (o tre con tre): quelle cifre sono loro.', peso: 4 },
  nascoste: { nome: 'Coppie e triple nascoste', descr: 'Due cifre che in un’unità possono stare solo in due caselle: le altre cifre lì sono da togliere.', peso: 5 },
  xwing: { nome: 'X-Wing', descr: 'Una cifra in due righe può stare solo nelle stesse due colonne: dalle colonne si toglie altrove.', peso: 8 },
  swordfish: { nome: 'Swordfish', descr: 'Come l’X-Wing, con tre righe e tre colonne.', peso: 10 },
  xywing: { nome: 'XY-Wing', descr: 'Tre caselle con due candidati che si incastrano: la cifra comune alle «ali» si toglie dove le vedono entrambe.', peso: 10 }
};

const UNITA = [], DI = Array.from({ length: 81 }, () => []), VEDE = Array.from({ length: 81 }, () => new Set());
for (let r = 0; r < 9; r++) UNITA.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITA.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) { const r0 = Math.floor(b / 3) * 3, c0 = (b % 3) * 3; UNITA.push(Array.from({ length: 9 }, (_, k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3))); }
UNITA.forEach((u, k) => u.forEach(i => { DI[i].push(k); u.forEach(j => { if (j !== i) VEDE[i].add(j); }); }));
const VEDE_A = VEDE.map(s => [...s]);
const bit = d => 1 << (d - 1), bits = m => { const o = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) o.push(d); return o; };
const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

/* ---------------- Regole ---------------- */
function nuovoStato(p) { return { v: p.g.slice(), note: Array(81).fill(0) }; }
function conflitti(p, st) {
  const out = new Set();
  for (const u of UNITA) for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
    const x = st.v[u[a]], y = st.v[u[b]];
    if (x && x === y) { out.add(u[a]); out.add(u[b]); }
  }
  return [...out];
}
function completo(p, st) { return st.v.every(x => x > 0) && conflitti(p, st).length === 0; }
function statoRisolto(p, sol) { return { v: sol.slice(), note: Array(81).fill(0) }; }

/* ---------------- Conteggio (cerca la casella con meno candidati) ---------------- */
function conta(p, cap = 2) {
  const v = p.g.slice(); let tot = 0, prima = null;
  const cand = i => { let m = 511; for (const j of VEDE_A[i]) if (v[j]) m &= ~bit(v[j]); return m; };
  const giro = () => {
    let mi = -1, mm = 0, mc = 10;
    for (let i = 0; i < 81; i++) if (!v[i]) { const m = cand(i), c = pop(m); if (c < mc) { mc = c; mi = i; mm = m; if (c <= 1) break; } }
    if (mi < 0) { tot++; if (!prima) prima = v.slice(); return tot >= cap; }
    if (mc === 0) return false;
    for (const d of bits(mm)) { v[mi] = d; if (giro()) return true; }
    v[mi] = 0;
    return false;
  };
  for (let i = 0; i < 81; i++) if (p.g[i]) { const d = p.g[i]; for (const j of VEDE_A[i]) if (p.g[j] === d) return 0; }
  giro();
  conta.ultima = prima;
  return tot;
}

/* ---------------- Risolutore «umano» ---------------- */
function risolvi(p) {
  const v = p.g.slice(), c = Array(81).fill(0);
  for (let i = 0; i < 81; i++) if (!v[i]) { let m = 511; for (const j of VEDE_A[i]) if (v[j]) m &= ~bit(v[j]); c[i] = m; }
  const passi = [], conteggio = {};
  const segna = (t, info) => { passi.push(Object.assign({ t }, info)); conteggio[t] = (conteggio[t] || 0) + 1; };
  const metti = (i, d) => { v[i] = d; c[i] = 0; for (const j of VEDE_A[i]) c[j] &= ~bit(d); };
  const togli = (celle, m) => { let fatto = false; for (const i of celle) if (!v[i] && (c[i] & m)) { c[i] &= ~m; fatto = true; } return fatto; };
  const rotto = () => { for (let i = 0; i < 81; i++) if (!v[i] && !c[i]) return true; return false; };

  const nascosto = () => {
    for (const u of UNITA) for (let d = 1; d <= 9; d++) {
      if (u.some(i => v[i] === d)) continue;
      const pos = u.filter(i => c[i] & bit(d));
      if (pos.length === 1) { metti(pos[0], d); segna('nascosto', { cella: pos[0], d }); return true; }
    }
    return false;
  };
  const nudo = () => {
    for (let i = 0; i < 81; i++) if (!v[i] && pop(c[i]) === 1) { const d = bits(c[i])[0]; metti(i, d); segna('nudo', { cella: i, d }); return true; }
    return false;
  };
  const blocco = () => {
    for (let b = 18; b < 27; b++) for (let d = 1; d <= 9; d++) {
      const pos = UNITA[b].filter(i => c[i] & bit(d)); if (pos.length < 2) continue;
      for (const k of [0, 9]) {                         // stessa riga (0) o colonna (9)
        const quale = k === 0 ? i => Math.floor(i / 9) : i => i % 9;
        if (pos.every(i => quale(i) === quale(pos[0]))) {
          const u = UNITA[k + quale(pos[0])].filter(i => !UNITA[b].includes(i));
          if (togli(u, bit(d))) { segna('blocco', { d, tipo: 'pointing' }); return true; }
        }
      }
    }
    for (let k = 0; k < 18; k++) for (let d = 1; d <= 9; d++) {
      const pos = UNITA[k].filter(i => c[i] & bit(d)); if (pos.length < 2) continue;
      const box = i => 18 + Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);
      if (pos.every(i => box(i) === box(pos[0]))) {
        const u = UNITA[box(pos[0])].filter(i => !UNITA[k].includes(i));
        if (togli(u, bit(d))) { segna('blocco', { d, tipo: 'claiming' }); return true; }
      }
    }
    return false;
  };
  const sottoinsiemi = (nascosti) => {
    for (const q of [2, 3]) for (const u of UNITA) {
      const vuote = u.filter(i => !v[i]);
      if (!nascosti) {
        let fatto = false;
        M.combinazioni(vuote.filter(i => pop(c[i]) <= q), q, gr => {
          let m = 0; gr.forEach(i => { m |= c[i]; });
          if (pop(m) !== q) return false;
          if (togli(vuote.filter(i => !gr.includes(i)), m)) { fatto = true; return true; }
          return false;
        });
        if (fatto) { segna('coppia', { q }); return true; }
      } else {
        const cifre = []; for (let d = 1; d <= 9; d++) if (!u.some(i => v[i] === d)) cifre.push(d);
        let fatto = false;
        M.combinazioni(cifre, q, ds => {
          const m = ds.reduce((s, d) => s | bit(d), 0);
          const pos = vuote.filter(i => c[i] & m);
          if (pos.length !== q) return false;
          if (ds.some(d => !pos.some(i => c[i] & bit(d)))) return false;
          let tolto = false; for (const i of pos) if (c[i] & ~m) { c[i] &= m; tolto = true; }
          if (tolto) { fatto = true; return true; }
          return false;
        });
        if (fatto) { segna('nascoste', { q }); return true; }
      }
    }
    return false;
  };
  const pesce = (q, nome) => {
    for (let d = 1; d <= 9; d++) for (const [base, croce] of [[0, 9], [9, 0]]) {
      const linee = [];
      for (let k = 0; k < 9; k++) {
        const pos = UNITA[base + k].filter(i => c[i] & bit(d));
        if (pos.length >= 2 && pos.length <= q) linee.push({ k, croci: pos.map(i => (base === 0 ? i % 9 : Math.floor(i / 9))) });
      }
      let fatto = false;
      M.combinazioni(linee, q, gr => {
        const cs = new Set(); gr.forEach(l => l.croci.forEach(x => cs.add(x)));
        if (cs.size !== q) return false;
        const ks = gr.map(l => l.k), celle = [];
        for (const x of cs) for (const i of UNITA[croce + x]) if (!ks.includes(base === 0 ? Math.floor(i / 9) : i % 9)) celle.push(i);
        if (togli(celle, bit(d))) { fatto = true; return true; }
        return false;
      });
      if (fatto) { segna(nome, { d }); return true; }
    }
    return false;
  };
  const xywing = () => {
    const due = []; for (let i = 0; i < 81; i++) if (!v[i] && pop(c[i]) === 2) due.push(i);
    for (const perno of due) {
      const [x, y] = bits(c[perno]);
      const ali = due.filter(j => j !== perno && VEDE[perno].has(j));
      for (const a of ali) for (const b of ali) {
        if (a >= b) continue;
        const ma = c[a], mb = c[b];
        // a = {x,z}, b = {y,z}
        for (const [px, py] of [[x, y], [y, x]]) {
          if (!(ma & bit(px)) || !(mb & bit(py)) || ma === c[perno] || mb === c[perno]) continue;
          const za = ma & ~bit(px), zb = mb & ~bit(py);
          if (pop(za) !== 1 || za !== zb || (za & c[perno])) continue;
          const celle = VEDE_A[a].filter(j => j !== b && j !== perno && VEDE[b].has(j));
          if (togli(celle, za)) { segna('xywing', { perno }); return true; }
        }
      }
    }
    return false;
  };
  for (let giri = 0; giri < 2000; giri++) {
    if (v.every(x => x)) break;
    if (rotto()) return { risolto: false, contraddizione: true, passi, conteggio };
    if (nascosto() || nudo() || blocco() || sottoinsiemi(false) || sottoinsiemi(true) || pesce(2, 'xwing') || pesce(3, 'swordfish') || xywing()) continue;
    break;
  }
  const risolto = v.every(x => x) && conflitti(p, { v }).length === 0;
  return { risolto, sol: risolto ? v.slice() : null, passi, conteggio };
}

function punteggio(ris) { let s = 0; for (const t in ris.conteggio) s += TECNICHE[t].peso * ris.conteggio[t]; return s; }
function livello(p, ris) {
  const c = ris.conteggio, avanz = (c.xwing || 0) + (c.swordfish || 0) + (c.xywing || 0), medie = (c.coppia || 0) + (c.nascoste || 0);
  if (avanz >= 2 || (c.swordfish || 0) >= 1 || ((c.xywing || 0) >= 1 && medie >= 3)) return 'estrema';
  if (avanz >= 1 || medie >= 3) return 'esperta';
  if (medie >= 1 || (c.blocco || 0) >= 2) return 'impegnativa';
  return null;
}

/* ---------------- Generatore ---------------- */
const MISURE = { impegnativa: [9], esperta: [9], estrema: [9] };
function grigliaACaso(r) {
  const v = Array(81).fill(0);
  const giro = i => {
    if (i === 81) return true;
    let m = 511; for (const j of VEDE_A[i]) if (v[j]) m &= ~bit(v[j]);
    for (const d of r.mescola(bits(m))) { v[i] = d; if (giro(i + 1)) return true; }
    v[i] = 0; return false;
  };
  giro(0);
  return v;
}
function genera(r, voluto, tentativi = 3000) {
  for (let t = 0; t < tentativi; t++) {
    const sol = grigliaACaso(r), g = sol.slice();
    // si tolgono coppie simmetriche finché la soluzione resta unica
    const ordine = r.mescola([...Array(41).keys()]);
    for (const i of ordine) {
      const j = 80 - i, a = g[i], b = g[j];
      g[i] = 0; g[j] = 0;
      if (conta({ g }, 2) !== 1) { g[i] = a; g[j] = b; }
    }
    const p = { g };
    const ris = risolvi(p);
    if (!ris.risolto || livello(p, ris) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Array.isArray(p.g) || p.g.length !== 81 || p.g.some(x => !Number.isInteger(x) || x < 0 || x > 9)) return 'forma';
  return null;
}

const E = {
  id: 'sudoku', nome: 'Sudoku', tipo: 'cifre', TECNICHE, MISURE,
  breve: 'Il classico 9×9, scelto tra quelli che chiedono tecniche vere.',
  regole: [
    'Ogni <b>riga</b>, ogni <b>colonna</b> e ogni <b>riquadro 3×3</b> contiene le cifre da 1 a 9, una volta sola.',
    'Tocca una casella, poi una cifra. Con <b>Note</b> acceso le cifre diventano candidati a matita.',
    'La soluzione è unica e si trova ragionando: niente tentativi a caso.'
  ],
  nuovoStato, conflitti, completo, statoRisolto, conta, risolvi, livello, punteggio, genera, valida,
  cifre: () => 9
};
if (M) M.motori.sudoku = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
