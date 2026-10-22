/* =====================================================================
   MENTAL · LA MONETA FALSA
   n monete uguali, tranne una falsa che pesa un po' di più o un po' di meno (non si sa quale delle due).
   Sono già state fatte alcune pesate su una bilancia a due piatti, e se ne vede l'esito. Dagli esiti si
   capisce quale moneta è falsa e se pesa di più o di meno: una sola risposta è compatibile.

   Dati: { n, pesate: [{ s: [monete a sinistra], d: [a destra], e: 'S' | '=' | 'D' }] }
         monete da 0 a n−1 (si mostrano da 1 a n); 'S' = pende a sinistra (il piatto di sinistra pesa di più).
   Risposta: { k: moneta, h: 1 se pesa di più, −1 se pesa di meno } (forma 'moneta').
   ===================================================================== */
(function () {
'use strict';
const G = typeof self !== 'undefined' ? self : globalThis;
const M = G.MENTAL || (typeof require !== 'undefined' ? require('../comune.js') : null);

const TECNICHE = {
  equilibrio: { nome: 'Equilibrio', descr: 'Le monete di una pesata in equilibrio sono tutte buone.', peso: 1 },
  verso: { nome: 'Verso della bilancia', descr: 'Se la falsa è a sinistra e la bilancia pende a sinistra, pesa di più; se pende a destra, di meno.', peso: 2 },
  incrocio: { nome: 'Incrocio', descr: 'Una moneta che compare in pesate con versi contraddittori non può essere la falsa.', peso: 3 }
};

function esito(ps, k, h) {
  if (ps.s.includes(k)) return h > 0 ? 'S' : 'D';
  if (ps.d.includes(k)) return h > 0 ? 'D' : 'S';
  return '=';
}
function compatibili(p, pesate = p.pesate) {
  const out = [];
  for (let k = 0; k < p.n; k++) for (const h of [1, -1]) if (pesate.every(ps => esito(ps, k, h) === ps.e)) out.push({ k, h });
  return out;
}

/* ---------------- Interfaccia comune ---------------- */
function nuovoStato() { return { v: { k: -1, h: 0 }, prove: [] }; }
function completo() { return false; }
function conflitti() { return []; }
function statoRisolto(p, sol) { return { v: sol, prove: [] }; }
function conta(p, cap = 2) { const c = compatibili(p); conta.ultima = c[0] || null; return Math.min(cap, c.length); }
function risolvi(p) {
  const c = compatibili(p), conteggio = { equilibrio: p.pesate.filter(x => x.e === '=').length, verso: 1 };
  if (p.pesate.length > 2) conteggio.incrocio = 1;
  return { risolto: c.length === 1, sol: c[0] || null, passi: [], conteggio };
}
function giusta(p, v) { const c = compatibili(p); return c.length === 1 && v && v.k === c[0].k && v.h === c[0].h; }
function vuota(p, v) { return !v || v.k < 0 || !v.h; }
function soluzione(p) { const c = compatibili(p)[0]; return { risposta: `la moneta ${c.k + 1}, che pesa di ${c.h > 0 ? 'più' : 'meno'}` }; }
function livello(p) { return p.n <= 8 ? 'impegnativa' : p.pesate.length >= 4 ? 'estrema' : 'esperta'; }
const MISURE = { impegnativa: [[8, 3]], esperta: [[12, 3]], estrema: [[16, 4], [18, 4]] };

function genera(r, voluto, tentativi = 4000) {
  for (let t = 0; t < tentativi; t++) {
    const [n, np] = r.scegli(MISURE[voluto]);
    const k = r(n), h = r(2) ? 1 : -1;
    const pesate = [];
    for (let q = 0; q < np; q++) {
      const quante = 2 + r(Math.floor(n / 2) - 1), m = r.mescola([...Array(n).keys()]);
      const s = m.slice(0, quante).sort((a, b) => a - b), d = m.slice(quante, 2 * quante).sort((a, b) => a - b);
      pesate.push({ s, d, e: '' });
    }
    pesate.forEach(ps => { ps.e = esito(ps, k, h); });
    const p = { n, pesate };
    if (compatibili(p).length !== 1) continue;
    // ogni pesata serve
    if (pesate.some((_, i) => compatibili(p, pesate.filter((__, j) => j !== i)).length === 1)) continue;
    // la falsa non deve essere l'unica moneta fuori da tutte le pesate «storte»: almeno una pesata pende
    if (pesate.every(ps => ps.e === '=')) continue;
    const ris = risolvi(p);
    if (livello(p) !== voluto) continue;
    return { p, ris };
  }
  return null;
}
function valida(p) {
  if (!p || !(p.n >= 3) || !Array.isArray(p.pesate)) return 'forma';
  for (const ps of p.pesate) {
    if (ps.s.length !== ps.d.length || ps.s.some(x => ps.d.includes(x))) return 'pesata storta';
    if (!['S', '=', 'D'].includes(ps.e)) return 'esito';
  }
  if (compatibili(p).length !== 1) return 'risposte possibili: ' + compatibili(p).length;
  return null;
}
function testoHTML(p) {
  return `<p>Ci sono <b>${p.n} monete</b>, numerate da 1 a ${p.n}. Sembrano tutte uguali, ma una è <b>falsa</b>: pesa un po’ di più o un po’ di meno delle altre, che pesano tutte lo stesso. Non si sa se la falsa è più pesante o più leggera.</p>
    <p>Sono già state fatte ${p.pesate.length} pesate con una bilancia a due piatti; qui sotto c’è com’è andata. Quale moneta è falsa, e pesa di più o di meno?</p>`;
}
/* Disegno delle pesate (originale): un giogo inclinato con due piatti e le monete numerate */
function figura(p) {
  const W = 340, H = 92, righe = p.pesate.map((ps, i) => {
    const y0 = i * H, ang = ps.e === 'S' ? -7 : ps.e === 'D' ? 7 : 0;
    const cx = W / 2, cy = y0 + 30, L = 102, rad = ang * Math.PI / 180;
    const lx = cx - L * Math.cos(rad), ly = cy - L * Math.sin(rad), rx = cx + L * Math.cos(rad), ry = cy + L * Math.sin(rad);
    const piatto = (x, y, monete) => {
      // fili dal giogo al piatto, il piatto 26 più in basso, le monete appoggiate sopra (7 per fila)
      const base = y + 26;
      const g = monete.map((m, j) => {
        const per = 7, col = j % per, riga = Math.floor(j / per), tot = Math.min(per, monete.length - riga * per);
        const mx = x + (col - (tot - 1) / 2) * 18, my = base - 10 - riga * 17;
        return `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="8.5" fill="#E6B25E" stroke="#8A6420" stroke-width="1.5"/><text x="${mx.toFixed(1)}" y="${(my + .5).toFixed(1)}" fill="#2B1B05" font-size="10" font-weight="800" text-anchor="middle" dominant-baseline="central">${m + 1}</text>`;
      }).join('');
      return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}L${(x - 52).toFixed(1)} ${base.toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}L${(x + 52).toFixed(1)} ${base.toFixed(1)}" stroke="#A3A8D6" stroke-width="1.5" opacity=".5"/><path d="M${(x - 64).toFixed(1)} ${base.toFixed(1)}h128" stroke="#A3A8D6" stroke-width="4" stroke-linecap="round"/>${g}`;
    };
    const scritta = ps.e === 'S' ? 'pende a sinistra' : ps.e === 'D' ? 'pende a destra' : 'in equilibrio';
    return `<g><text x="${cx}" y="${y0 + 11}" fill="#A3A8D6" font-size="11.5" font-weight="800" text-anchor="middle">${i + 1}ª pesata · ${scritta}</text>
      <path d="M${cx} ${cy}V${y0 + 84}M${cx - 24} ${y0 + 84}h48" stroke="#6C71A3" stroke-width="5" stroke-linecap="round"/>
      <path d="M${lx.toFixed(1)} ${ly.toFixed(1)}L${rx.toFixed(1)} ${ry.toFixed(1)}" stroke="#ECEEFF" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="5" fill="#F2B84B"/>
      ${piatto(lx, ly, ps.s)}${piatto(rx, ry, ps.d)}</g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H * p.pesate.length}" xmlns="http://www.w3.org/2000/svg" font-family="Figtree, system-ui, sans-serif">${righe.join('')}</svg>`;
}

const E = {
  id: 'bilancia', nome: 'La moneta falsa', tipo: 'risposta', famiglia: 'figure', TECNICHE, MISURE,
  breve: 'Una moneta falsa tra tante, e le pesate già fatte: trovala.',
  regole: [
    'Una sola moneta è falsa: pesa di più o di meno delle altre, che pesano tutte uguale.',
    'Guarda le pesate: un piatto più basso vuol dire più pesante. Dagli esiti la risposta è <b>una sola</b>.',
    'Tocca la moneta falsa, scegli se pesa di più o di meno e tocca <b>Consegna</b>: ogni consegna sbagliata aggiunge un minuto.'
  ],
  forma: () => 'moneta',
  nuovoStato, completo, conflitti, statoRisolto, conta, risolvi, livello, genera, valida,
  giusta, vuota, soluzione, testoHTML, figura, esito
};
if (M) M.motori.bilancia = E;
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})();
