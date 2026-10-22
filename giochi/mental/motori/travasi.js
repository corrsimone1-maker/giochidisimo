/* =====================================================================
   MENTAL · TRAVASI
   Alcune brocche senza tacche, di capacità note. Si può versare da una brocca all'altra finché la
   prima è vuota o la seconda è piena; se c'è la fontana, si può anche riempire una brocca o vuotarla
   nel lavandino. Bisogna avere esattamente una certa quantità in una brocca, nel numero minimo di
   mosse (calcolato da un programma che prova tutte le strade).

   Dati: { cap: [litri], ini: [litri], fontana: bool, obiettivo: litri, mosse }
   Mosse: { t: 'riempi', i } { t: 'svuota', i } (solo con la fontana), { t: 'versa', i, j }
   Stato: { v: [litri], seq: [mosse] }
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  indietro: { nome: 'Ragionare all’indietro', descr: 'Una quantità strana si ottiene versando in una brocca che ha già dello spazio occupato.', peso: 3 },
  ciclo: { nome: 'Il giro', descr: 'Riempire, versare, vuotare, ripetere: ogni giro sposta la stessa quantità.', peso: 2 }
};

function mossePossibili(p, v) {
  const out = [];
  for (let i = 0; i < p.cap.length; i++) {
    if (p.fontana && v[i] < p.cap[i]) out.push({ t: 'riempi', i });
    if (p.fontana && v[i] > 0) out.push({ t: 'svuota', i });
    for (let j = 0; j < p.cap.length; j++) if (j !== i && v[i] > 0 && v[j] < p.cap[j]) out.push({ t: 'versa', i, j });
  }
  return out;
}
function applica(p, v, m) {
  const w = v.slice();
  if (m.t === 'riempi') { if (!p.fontana) return null; w[m.i] = p.cap[m.i]; }
  else if (m.t === 'svuota') { if (!p.fontana) return null; w[m.i] = 0; }
  else if (m.t === 'versa') { const q = Math.min(w[m.i], p.cap[m.j] - w[m.j]); if (q <= 0) return null; w[m.i] -= q; w[m.j] += q; }
  else return null;
  return w;
}
const fatto = (p, v) => v.includes(p.obiettivo);
function bfs(p) {
  const k0 = p.ini.join(','), dist = new Map([[k0, 0]]), padre = new Map(), strade = new Map([[k0, 1]]);
  let fronte = [p.ini];
  for (let d = 0; fronte.length && d < 40; d++) {
    const nuovo = [];
    for (const v of fronte) for (const m of mossePossibili(p, v)) {
      const w = applica(p, v, m), k = w.join(',');
      if (!dist.has(k)) { dist.set(k, d + 1); strade.set(k, strade.get(v.join(','))); padre.set(k, [v, m]); nuovo.push(w); }
      else if (dist.get(k) === d + 1) strade.set(k, strade.get(k) + strade.get(v.join(',')));
    }
    fronte = nuovo;
  }
  // stato finale più vicino che contiene l'obiettivo
  let migliore = null;
  for (const [k, d] of dist) { const v = k.split(',').map(Number); if (fatto(p, v) && (!migliore || d < migliore.d)) migliore = { k, d, v }; }
  if (!migliore) return { min: null };
  const seq = []; let k = migliore.k;
  while (padre.has(k)) { const [v, m] = padre.get(k); seq.unshift(m); k = v.join(','); }
  const minimi = [...dist].filter(([kk, d]) => d === migliore.d && fatto(p, kk.split(',').map(Number)));
  return { min: migliore.d, seq, strade: minimi.reduce((s, [kk]) => s + strade.get(kk), 0) };
}

/* ---------------- Interfaccia comune ---------------- */
function nuovoStato(p) { return { v: p.ini.slice(), seq: [] }; }
function completo(p, st) { return fatto(p, st.v) && st.seq.length <= p.mosse; }
function conflitti() { return []; }
function statoRisolto(p, sol) { let v = p.ini.slice(); for (const m of sol) v = applica(p, v, m); return { v, seq: sol.slice() }; }
function conta(p) { const b = bfs(p); conta.ultima = b.seq || null; return b.min === p.mosse ? 1 : 0; }
function risolvi(p) { const b = bfs(p); const conteggio = { indietro: 1 }; if (p.fontana) conteggio.ciclo = 1; return { risolto: b.min === p.mosse, sol: b.seq, passi: [], conteggio, strade: b.strade }; }
function livello(p) { if (p.mosse >= 9) return 'estrema'; if (p.mosse >= 7) return 'esperta'; if (p.mosse >= 5) return 'impegnativa'; return null; }
const MISURE = { impegnativa: [2], esperta: [2, 3], estrema: [3] };
function genera(r, voluto, tentativi = 4000) {
  for (let q = 0; q < tentativi; q++) {
    const n = r.scegli(MISURE[voluto]), fontana = n === 2 || r.f() < 0.4;
    const cap = []; while (cap.length < n) { const c = 3 + r(n === 2 ? 11 : 12); if (!cap.includes(c)) cap.push(c); }
    cap.sort((a, b) => b - a);
    const ini = fontana ? cap.map(() => 0) : cap.map((c, i) => (i === 0 ? c : 0));
    // obiettivo: una quantità che nessuna brocca ha di suo, raggiungibile, col minimo di mosse voluto
    const cand = [];
    for (let ob = 1; ob < cap[0]; ob++) {
      if (cap.includes(ob) || ini.includes(ob)) continue;
      const p = { cap, ini, fontana, obiettivo: ob, mosse: 0 };
      const b = bfs(p); if (b.min == null) continue;
      p.mosse = b.min;
      if (livello(p) === voluto && b.strade <= 2) cand.push(p);
    }
    if (!cand.length) continue;
    const p = r.scegli(cand), ris = risolvi(p);
    if (!ris.risolto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !Array.isArray(p.cap) || p.cap.length !== p.ini.length) return 'forma';
  if (bfs(p).min !== p.mosse) return 'il minimo non è ' + p.mosse;
  return null;
}
function testoMossa(p, m) {
  if (m.t === 'riempi') return `riempi la brocca da ${p.cap[m.i]}`;
  if (m.t === 'svuota') return `vuota la brocca da ${p.cap[m.i]}`;
  return `versa dalla ${p.cap[m.i]} alla ${p.cap[m.j]}`;
}

const E = {
  id: 'travasi', nome: 'Travasi', tipo: 'travasi', famiglia: 'numeri', TECNICHE, MISURE,
  breve: 'Brocche senza tacche: misura la quantità giusta con il minimo di mosse.',
  regole: [
    'Le brocche non hanno tacche: si sa solo quanto contengono quando sono piene.',
    'Versando da una brocca all’altra si va avanti finché la prima è vuota o la seconda è piena. Se c’è la fontana si può anche <b>riempire</b> una brocca o <b>vuotarla</b>.',
    'Ottieni la quantità richiesta in una brocca con al massimo le mosse indicate: è proprio il <b>minimo</b>. Se le finisci, annulla o ricomincia.'
  ],
  nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  mossePossibili, applica, testoMossa, bfs
};
if (M) M.motori.travasi = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
