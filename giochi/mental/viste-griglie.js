/* =====================================================================
   MENTAL — viste delle griglie della seconda ondata: flotta, tende, luci, ponti.
   Come viste.js: si carica prima dello script della pagina e ne usa le funzioni (G, mossa, cellaDa,
   disegnaGioco, annulla, ICO…) solo quando viene chiamata.

   Ogni vista: disegna(tav, s, st, o)   la griglia (o.interattivo false = solo da guardare)
               strumenti(box)           la barra in basso (Annulla)
               griglia: true            nell'esito la soluzione si disegna con disegna()
   ===================================================================== */
'use strict';

const DISEGNI = {
  tenda: '<svg viewBox="0 0 24 24"><path d="M12 3.5L2.5 20h19z" fill="#F2B84B"/><path d="M12 3.5l-3.4 16.5h6.8z" fill="#B97E1E"/><path d="M12 12l-2 8h4z" fill="#3A2A0A"/></svg>',
  albero: '<svg viewBox="0 0 24 24"><rect x="10.6" y="15" width="2.8" height="6.5" rx="1" fill="#8A6A44"/><circle cx="12" cy="9.5" r="7" fill="#4FA06A"/><circle cx="9.2" cy="8" r="2.4" fill="#6BC285" opacity=".7"/></svg>',
  lampadina: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="6.6" fill="#FFD66B"/><path d="M9 16.2h6v2.3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 18.5z" fill="#C9C3A6"/><circle cx="10" cy="8.2" r="2" fill="#FFF3C4"/></svg>',
  onda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 10c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0M3 16c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0"/></svg>'
};
const lato2 = (W, H, colonne, righe, max) => Math.max(16, Math.floor(Math.min(W / colonne, H / righe, max)));

/* Tocco: vuota → pezzo (2) → segno (1) → vuota; trascinando si mette il segno sulle vuote */
function gestoTre(tav, fisse) {
  let start = -1, trascina = false, toccate = null;
  tav.onpointerdown = e => {
    const i = cellaDa(e); if (i < 0 || fisse.has(i)) return;
    e.preventDefault(); try { tav.setPointerCapture(e.pointerId); } catch (x) { /* */ }
    start = i; trascina = false; toccate = new Set([i]);
  };
  tav.onpointermove = e => {
    if (start < 0) return;
    const i = cellaDa(e); if (i < 0 || fisse.has(i) || toccate.has(i)) return;
    trascina = true; toccate.add(i);
    toccate.forEach(j => { const el = tav.querySelector(`[data-i="${j}"]`); if (el && G.P.st.c[j] === 0) el.classList.add('ant'); });
  };
  tav.onpointerup = () => {
    if (start < 0) return;
    const i0 = start; start = -1;
    if (!trascina) { mossa(st => { st.c[i0] = st.c[i0] === 0 ? 2 : st.c[i0] === 2 ? 1 : 0; }); return; }
    const ins = toccate; toccate = null;
    mossa(st => { ins.forEach(i => { if (st.c[i] === 0) st.c[i] = 1; }); });
    disegnaGioco();
  };
  tav.onpointercancel = () => { start = -1; disegnaGioco(); };
}
function soloAnnulla(box) {
  box.innerHTML = `<div class="barra"><button class="stru" id="sAnn">${ICO.annulla}Annulla</button></div>`;
  $('sAnn').onclick = annulla;
}
/* Griglia n×n con i numeri delle file a sinistra e in alto; celle(i) dà [classi, contenuto] */
function grigliaConConti(tav, s, st, o, celle, extraSopra = '') {
  const E = M.motori[s.gioco], p = s.p, n = p.n;
  const sopra = extraSopra ? 34 : 0;
  const c = lato2(o.W - 4, o.H - sopra - 6, n + 0.8, n + 0.8, 50);
  const fatti = new Set(E.contiFatti(p, st)), sbagliati = new Set(E.contiSbagliati(p, st));
  tav.className = 'tav conti-griglia';
  tav.style.gridTemplateColumns = `${Math.round(c * 0.8)}px repeat(${n},${c}px)`;
  const fc = Math.round(c * 0.46);
  const conto = (k, v) => `<div class="conto${sbagliati.has(k) ? ' sbagliato' : fatti.has(k) ? ' fatto' : ''}" style="font-size:${fc}px">${v}</div>`;
  let h = extraSopra ? `<div class="sopra" style="grid-column:1 / -1">${extraSopra}</div>` : '';
  h += '<div></div>';
  for (let k = 0; k < n; k++) h += conto('k' + k, p.colonne[k]);
  for (let r = 0; r < n; r++) {
    h += conto('r' + r, p.righe[r]);
    for (let k = 0; k < n; k++) { const i = r * n + k, [cl, dentro] = celle(i, c); h += `<div class="c ${cl}" data-i="${i}" style="width:${c}px;height:${c}px">${dentro}</div>`; }
  }
  tav.innerHTML = h;
  return c;
}

/* ---------------- Flotta ---------------- */
VISTE.flotta = {
  griglia: true,
  disegna(tav, s, st, o) {
    const E = M.motori.flotta, p = s.p, n = p.n, errori = new Set(E.conflitti(p, st));
    const dati = new Map((p.dati || []).map(([i, t]) => [i, t]));
    const nave = i => i >= 0 && i < n * n && st.c[i] === 2;
    // navi già chiuse dal giocatore (contornate d'acqua o dal bordo), per spuntare la flotta
    const trovate = []; const vis = new Set();
    for (let i = 0; i < n * n; i++) if (nave(i) && !vis.has(i)) {
      const comp = [], coda = [i]; vis.add(i);
      while (coda.length) { const x = coda.pop(); comp.push(x); const r = Math.floor(x / n), k = x % n; for (const j of [r > 0 ? x - n : -1, r < n - 1 ? x + n : -1, k > 0 ? x - 1 : -1, k < n - 1 ? x + 1 : -1]) if (j >= 0 && nave(j) && !vis.has(j)) { vis.add(j); coda.push(j); } }
      const chiusa = comp.every(x => { const r = Math.floor(x / n), k = x % n; return [[r - 1, k], [r + 1, k], [r, k - 1], [r, k + 1]].every(([rr, kk]) => rr < 0 || kk < 0 || rr >= n || kk >= n || st.c[rr * n + kk] === 1 || comp.includes(rr * n + kk)); });
      const dritta = new Set(comp.map(x => Math.floor(x / n))).size === 1 || new Set(comp.map(x => x % n)).size === 1;
      if (chiusa && dritta) trovate.push(comp.length);
    }
    const usate = {};
    const legenda = p.flotta.map(L => { const presa = (usate[L] || 0) < trovate.filter(x => x === L).length; usate[L] = (usate[L] || 0) + (presa ? 1 : 0); return `<span class="navetta${presa ? ' presa' : ''}">${Array.from({ length: L }, () => '<i></i>').join('')}</span>`; }).join('');
    grigliaConConti(tav, s, st, o, (i, c) => {
      const v = st.c[i], dato = dati.has(i);
      let cl = dato ? 'dato' : '', dentro = '';
      if (v === 2) {
        const r = Math.floor(i / n), k = i % n;
        const su = r > 0 && nave(i - n), giu = r < n - 1 && nave(i + n), sx = k > 0 && nave(i - 1), dx = k < n - 1 && nave(i + 1);
        const R = Math.round(c * 0.36), t = x => (x ? 2 : R);
        dentro = `<i class="pezzo" style="border-radius:${t(su || sx)}px ${t(su || dx)}px ${t(giu || dx)}px ${t(giu || sx)}px;margin:${su ? 0 : 12}% ${dx ? 0 : 12}% ${giu ? 0 : 12}% ${sx ? 0 : 12}%"></i>`;
      } else if (v === 1) { cl += ' acqua'; dentro = `<span class="segno-acqua">${DISEGNI.onda}</span>`; }
      if (errori.has(i)) cl += ' errore';
      return [cl, dentro];
    }, `<div class="flotta-legenda">${legenda}</div>`);
    if (o.interattivo) gestoTre(tav, new Set(dati.keys()));
  },
  strumenti: soloAnnulla,
  esito() { return ''; }
};

/* ---------------- Tende ---------------- */
VISTE.tende = {
  griglia: true,
  disegna(tav, s, st, o) {
    const E = M.motori.tende, p = s.p, alberi = new Set(p.alberi), errori = new Set(E.conflitti(p, st));
    grigliaConConti(tav, s, st, o, i => {
      if (alberi.has(i)) return ['albero', DISEGNI.albero];
      const v = st.c[i];
      let cl = v === 1 ? 'prato' : '', dentro = v === 2 ? DISEGNI.tenda : v === 1 ? '<i class="filo"></i>' : '';
      if (errori.has(i)) cl += ' errore';
      return [cl, dentro];
    });
    if (o.interattivo) gestoTre(tav, alberi);
  },
  strumenti: soloAnnulla,
  esito() { return ''; }
};

/* ---------------- Luci ---------------- */
VISTE.luci = {
  griglia: true,
  disegna(tav, s, st, o) {
    const E = M.motori.luci, p = s.p, { w, h } = p, nere = new Map(p.nere);
    const luce = E.illuminate(p, st), errori = new Set(E.conflitti(p, st)), sbagliati = new Set(E.numeriSbagliati(p, st));
    const c = lato2(o.W - 4, o.H - 4, w, h, 50);
    tav.className = 'tav luci';
    tav.style.gridTemplateColumns = `repeat(${w},${c}px)`;
    const f = Math.round(c * 0.5);
    let html = '';
    for (let i = 0; i < w * h; i++) {
      if (nere.has(i)) {
        const x = nere.get(i), vic = [i - w, i + w, i % w ? i - 1 : -1, (i + 1) % w ? i + 1 : -1].filter(j => j >= 0 && j < w * h && !nere.has(j));
        const ok = x >= 0 && vic.filter(j => st.c[j] === 2).length === x;
        html += `<div class="nera${sbagliati.has(i) ? ' sbagliato' : ok ? ' ok' : ''}" style="width:${c}px;height:${c}px;font-size:${f}px">${x >= 0 ? x : ''}</div>`;
        continue;
      }
      const v = st.c[i];
      let cl = 'c';
      if (luce.has(i)) cl += ' luce';
      if (errori.has(i)) cl += ' errore';
      html += `<div class="${cl}" data-i="${i}" style="width:${c}px;height:${c}px">${v === 2 ? DISEGNI.lampadina : v === 1 ? '<i class="punto"></i>' : ''}</div>`;
    }
    tav.innerHTML = html;
    if (o.interattivo) gestoTre(tav, new Set(nere.keys()));
  },
  strumenti: soloAnnulla,
  esito() { return ''; }
};

/* ---------------- Ponti ---------------- */
VISTE.ponti = {
  griglia: true,
  disegna(tav, s, st, o) {
    const E = M.motori.ponti, p = s.p, { w, h } = p, A = E.archi(p);
    const c = lato2(o.W - 4, o.H - 4, w, h, 54), R = c * 0.4;
    const xy = i => [(i % w) * c + c / 2, Math.floor(i / w) * c + c / 2];
    const stati = E.isoleStato(p, st), errori = new Set(E.conflitti(p, st));
    const sel = G && G.s === s && o.interattivo ? G.sel : -1;
    let svg = '';
    // puntini sulle caselle vuote, per orientarsi
    const isole = new Set(p.isole.map(x => x[0]));
    for (let i = 0; i < w * h; i++) if (!isole.has(i)) { const [x, y] = xy(i); svg += `<circle cx="${x}" cy="${y}" r="${Math.max(1.2, c * 0.03)}" fill="rgba(200,205,255,.16)"/>`; }
    // zone da toccare per ogni collegamento possibile
    A.E.forEach((e, q) => { const [x1, y1] = xy(p.isole[e.a][0]), [x2, y2] = xy(p.isole[e.b][0]); svg += `<line class="tocco-arco" data-arco="${q}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="${c * 0.62}"/>`; });
    // ponti
    A.E.forEach((e, q) => {
      if (!st.x[q]) return;
      const [x1, y1] = xy(p.isole[e.a][0]), [x2, y2] = xy(p.isole[e.b][0]);
      const col = errori.has(q) ? 'var(--corallo)' : '#C9C3FF', d = c * 0.09;
      const ox = e.orizz ? 0 : d, oy = e.orizz ? d : 0;
      const linea = (a, b) => `<line x1="${x1 + a}" y1="${y1 + b}" x2="${x2 + a}" y2="${y2 + b}" stroke="${col}" stroke-width="${Math.max(2, c * 0.07)}" stroke-linecap="round" pointer-events="none"/>`;
      svg += st.x[q] === 1 ? linea(0, 0) : linea(ox, oy) + linea(-ox, -oy);
    });
    // isole
    p.isole.forEach(([i, v], k) => {
      const [x, y] = xy(i), stato = stati[k];
      const fill = stato === 'fatta' ? 'var(--menta)' : 'var(--piano-3)', testo = stato === 'fatta' ? '#05261A' : stato === 'troppi' ? 'var(--corallo)' : 'var(--testo)';
      const bordo = k === sel ? 'var(--ambra)' : stato === 'troppi' ? 'var(--corallo)' : 'rgba(200,205,255,.45)';
      svg += `<g class="isola" data-isola="${k}"><circle cx="${x}" cy="${y}" r="${R}" fill="${fill}" stroke="${bordo}" stroke-width="${k === sel ? 3 : 1.6}"/><text x="${x}" y="${y + 0.5}" fill="${testo}" font-size="${Math.round(c * 0.46)}" font-weight="800" text-anchor="middle" dominant-baseline="central" pointer-events="none">${v}</text></g>`;
    });
    tav.className = 'tav ponti';
    tav.innerHTML = `<svg width="${w * c}" height="${h * c}" viewBox="0 0 ${w * c} ${h * c}" xmlns="http://www.w3.org/2000/svg" font-family="Figtree, system-ui, sans-serif">${svg}</svg>`;
    if (!o.interattivo) return;
    const giraArco = q => mossa(st2 => { st2.x[q] = (st2.x[q] + 1) % 3; });
    tav.onpointerdown = e => {
      const el = e.target.closest ? e.target.closest('[data-isola],[data-arco]') : null;
      if (!el) { if (G.sel >= 0) { G.sel = -1; disegnaGioco(); } return; }
      e.preventDefault();
      if (el.dataset.arco != null) { G.sel = -1; giraArco(+el.dataset.arco); return; }
      const k = +el.dataset.isola;
      if (G.sel < 0 || G.sel === k) { G.sel = G.sel === k ? -1 : k; disegnaGioco(); return; }
      const q = A.E.findIndex(x => (x.a === G.sel && x.b === k) || (x.a === k && x.b === G.sel));
      if (q < 0) { G.sel = k; disegnaGioco(); return; }
      G.sel = -1; giraArco(q);
    };
  },
  strumenti: soloAnnulla,
  esito() { return ''; }
};
