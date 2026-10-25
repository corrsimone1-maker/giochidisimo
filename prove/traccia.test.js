// Prove del motore di TRACCIA e di tutte le tavole: node prove/traccia.test.js
// Il motore (giochi/traccia/motore.js) si confronta con una seconda implementazione scritta qui da
// zero, che incolla i lati con le mappe geometriche (orbite dei punti di bordo) invece che con
// l'union-find, conta le zone a mano e ricontrolla le regole. Per ogni tavola le due enumerano
// tutte le linee possibili e devono trovare gli stessi cammini e le stesse soluzioni.
const assert = require('assert');
const TR = require('../giochi/traccia/motore.js');
const self = {}; eval(require('fs').readFileSync(__dirname + '/../giochi/traccia/tavole.js', 'utf8'));
const AREE = self.TRACCIA_AREE;
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

/* ---------- Implementazione indipendente ---------- */
function indip(p) {
  const w = p.w, h = p.h, S = { piano: [0, 0], cilindro: [1, 0], mobius: [2, 0], toro: [1, 1], klein: [1, 2], rp2: [2, 2] }[p.sup];
  const lr = q => S[0] === 1 ? [w - q[0], q[1]] : [w - q[0], h - q[1]];
  const tb = q => S[1] === 1 ? [q[0], h - q[1]] : [w - q[0], h - q[1]];
  const K = q => q[0] + ',' + q[1];
  const orbitaV = q => {
    const vis = new Map([[K(q), q]]), coda = [q];
    while (coda.length) {
      const a = coda.pop(), nx = [];
      if (S[0] && (a[0] === 0 || a[0] === w)) nx.push(lr(a));
      if (S[1] && (a[1] === 0 || a[1] === h)) nx.push(tb(a));
      for (const b of nx) if (!vis.has(K(b))) { vis.set(K(b), b); coda.push(b); }
    }
    return [...vis.keys()].sort()[0];
  };
  const chiaveL = (a, b) => {
    const cand = [[a, b]];
    if (S[0] && a[0] === b[0] && (a[0] === 0 || a[0] === w)) cand.push([lr(a), lr(b)]);
    if (S[1] && a[1] === b[1] && (a[1] === 0 || a[1] === h)) cand.push([tb(a), tb(b)]);
    return cand.map(([x, y]) => [K(x), K(y)].sort().join('|')).sort()[0];
  };
  const dentro = q => q[0] >= 0 && q[1] >= 0 && q[0] <= w && q[1] <= h;
  const rotti = new Set((p.gaps || []).map(g => chiaveL([g[0], g[1]], [g[2], g[3]])));
  function passo(r, d) {
    let a = r, b = [r[0] + d[0], r[1] + d[1]];
    if (!dentro(b)) {
      if (b[0] < 0 || b[0] > w) { if (!S[0]) return null; a = lr(r); } else { if (!S[1]) return null; a = tb(r); }
      b = [a[0] + d[0], a[1] + d[1]]; if (!dentro(b)) return null;
    }
    const e = chiaveL(a, b); if (rotti.has(e)) return null;
    return { a, b, d, e, v: orbitaV(b) };
  }
  // vicini delle caselle, attraverso i lati (incollati compresi), con la chiave del lato in comune
  const vicini = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const l = [];
    const metti = (ii, jj, a, b) => l.push([jj * w + ii, chiaveL(a, b)]);
    if (i + 1 < w) metti(i + 1, j, [i + 1, j], [i + 1, j + 1]); else if (S[0]) metti(0, S[0] === 1 ? j : h - 1 - j, [w, j], [w, j + 1]);
    if (i > 0) metti(i - 1, j, [i, j], [i, j + 1]); else if (S[0]) metti(w - 1, S[0] === 1 ? j : h - 1 - j, [0, j], [0, j + 1]);
    if (j + 1 < h) metti(i, j + 1, [i, j + 1], [i + 1, j + 1]); else if (S[1]) metti(S[1] === 1 ? i : w - 1 - i, 0, [i, h], [i + 1, h]);
    if (j > 0) metti(i, j - 1, [i, j], [i + 1, j]); else if (S[1]) metti(S[1] === 1 ? i : w - 1 - i, h - 1, [i, 0], [i + 1, 0]);
    vicini.push(l);
  }
  function zone(usati) {
    const z = new Array(w * h).fill(-1), el = [];
    for (let c = 0; c < w * h; c++) {
      if (z[c] >= 0) continue;
      const lista = [c], coda = [c]; z[c] = el.length;
      while (coda.length) { const x = coda.pop(); for (const [y, e] of vicini[x]) if (z[y] < 0 && !usati.has(e)) { z[y] = el.length; lista.push(y); coda.push(y); } }
      el.push(lista);
    }
    return { z, el };
  }
  const FR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
  function regole(passi) {
    const usati = new Set(passi.map(s => s.e)), Z = zone(usati), s = p.s || {};
    // lato di ogni zona (solo piano): casella a sinistra e a destra di ogni passo
    const lato = {};
    if (p.sup === 'piano') for (const st of passi) {
      const [ax, ay] = st.a, [dx, dy] = st.d;
      // casella a sinistra di un passo verso destra (y in giù) è quella sopra, ecc.
      const cel = { '1,0': [[ax, ay - 1], [ax, ay]], '-1,0': [[ax - 1, ay], [ax - 1, ay - 1]], '0,1': [[ax, ay], [ax - 1, ay]], '0,-1': [[ax - 1, ay - 1], [ax, ay - 1]] }[dx + ',' + dy];
      const [sin, des] = cel;
      for (const [q, n] of [[sin, 'sx'], [des, 'dx']]) if (q[0] >= 0 && q[1] >= 0 && q[0] < w && q[1] < h) { const zz = Z.z[q[1] * w + q[0]]; lato[zz] = lato[zz] && lato[zz] !== n ? 'x' : n; }
    }
    const somma = {};
    for (const k in s) {
      const [i, j] = k.split(',').map(Number), c = j * w + i, zz = Z.z[c], v = s[k];
      if (FR[v]) { somma[zz] = somma[zz] || [0, 0]; somma[zz][0] += FR[v][0]; somma[zz][1] += FR[v][1]; }
      else if (/^\d+$/.test(v)) { if (Z.el[zz].length !== +v) return false; }
      else if (v === 'sole' || v === 'luna') { if (lato[zz] !== (v === 'sole' ? 'sx' : 'dx')) return false; }
      else if (v === 'mv' || v === 'mo') {
        const set = new Set(Z.el[zz]);
        for (const c2 of Z.el[zz]) { const x = c2 % w, y = (c2 - x) / w, rx = v === 'mv' ? 2 * i - x : x, ry = v === 'mo' ? 2 * j - y : y; if (rx < 0 || ry < 0 || rx >= w || ry >= h || !set.has(ry * w + rx)) return false; }
      } else throw new Error('simbolo sconosciuto ' + v);
    }
    return Object.values(somma).every(([x, y]) => x === 0 && y === 0);
  }
  // tutte le linee: dal cerchio, quattro direzioni dalla copia mostrata del vertice
  function tutte() {
    const start = orbitaV(p.start), fine = p.end ? orbitaV(p.end) : null, cammini = new Map(), passi = [], visti = new Set([start]);
    (function dfs(r) {
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const st = passo(r, d); if (!st) continue;
        if (passi.length && st.e === passi[passi.length - 1].e) continue;
        if (!p.end && st.v === start) { if (passi.length >= 2) { passi.push(st); const k = passi.map(x => x.e).sort().join(' '); if (!cammini.has(k)) cammini.set(k, regole(passi)); passi.pop(); } continue; }
        if (visti.has(st.v)) continue;
        passi.push(st);
        if (p.end && st.v === fine) { const k = passi.map(x => x.e).sort().join(' '); if (!cammini.has(k)) cammini.set(k, regole(passi)); }
        else { visti.add(st.v); dfs(st.b); visti.delete(st.v); }
        passi.pop();
      }
    })(p.start);
    return cammini;
  }
  return { tutte, orbitaV, chiaveL, zone, vicini };
}

/* ---------- 1. Superfici: caratteristica di Eulero e gradi ---------- */
{
  const chi = { piano: 1, cilindro: 0, mobius: 0, toro: 0, klein: 0, rp2: 1 };
  for (const sup in chi) for (const [w, h] of [[3, 3], [4, 3], [3, 4], [5, 4]]) {
    const p = { w, h, sup, start: [1, 1], end: TR.SUP[sup].chiusa ? null : [w, 0], gaps: [] }, G = TR.grafo(p);
    const V = new Set(); for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) V.add(G.vid(x, y));
    const E = Object.keys(G.estremi).length;
    assert.equal(V.size - E + w * h, chi[sup], `${sup} ${w}x${h}: χ`);
    const I = indip(p), Vi = new Set(); for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) Vi.add(I.orbitaV([x, y]));
    assert.equal(Vi.size, V.size, `${sup}: stessi vertici delle due implementazioni`);
    if (sup === 'toro' || sup === 'klein') for (const v of V) assert.equal(G.adj[v].length, 4, 'grado 4');
  }
  bene('superfici: χ = 1, 0, 0, 0, 0, 1 (piano, cilindro, Möbius, toro, Klein, RP²) e vertici uguali nelle due implementazioni');
}

/* ---------- 2. Zone: motore contro implementazione indipendente su linee a caso ---------- */
{
  let s = 12345; const rnd = n => { s = (s * 1103515245 + 12345) >>> 0; return s % n; };
  let prove = 0;
  for (const sup of ['piano', 'cilindro', 'mobius', 'toro', 'klein', 'rp2']) for (let t = 0; t < 400; t++) {
    const w = 3 + rnd(3), h = 3 + rnd(2), p = { w, h, sup, start: [rnd(w + 1), rnd(h + 1)], end: null, gaps: [] };
    const G = TR.grafo(p), I = indip(p);
    // passeggiata a caso senza ripassare
    let r = p.start.slice(); const visti = new Set([G.vid(...r)]), es = [], ei = [];
    for (let k = 0; k < 4 + rnd(10); k++) {
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rnd(4)], st = TR.passo(G, r, d);
      if (!st || visti.has(st.v)) continue;
      visti.add(st.v); es.push(st.e); ei.push(I.chiaveL(st.a, st.b)); r = st.b;
    }
    const Z1 = TR.zone(G, new Set(es)), Z2 = I.zone(new Set(ei));
    for (let a = 0; a < w * h; a++) for (let b = a + 1; b < w * h; b++)
      assert.equal(Z1.id[a] === Z1.id[b], Z2.z[a] === Z2.z[b], `${sup} ${w}x${h}: zone diverse`);
    prove++;
  }
  bene(`zone uguali nelle due implementazioni su ${prove} linee a caso, sulle sei superfici`);
}

/* ---------- 3. Tavole ---------- */
{
  const ids = new Set();
  let tavole = 0, stelle = 0;
  for (const a of AREE) {
    assert.ok(['regola', 'forma', 'segreto'].includes(a.tipo) && a.regola && a.nome && a.sigla, a.id + ': campi');
    for (const t of a.tavole) {
      assert.ok(!ids.has(t.id), 'id doppio ' + t.id); ids.add(t.id);
      assert.ok(TR.SUP[t.sup], t.id + ': superficie');
      assert.equal(!t.end, TR.SUP[t.sup].chiusa, t.id + ': uscita solo sulle superfici con bordo');
      if (t.end) {
        const d = TR.DV[t.endDir], fuori = [t.end[0] + d[0], t.end[1] + d[1]];
        assert.ok(fuori[0] < 0 || fuori[1] < 0 || fuori[0] > t.w || fuori[1] > t.h, t.id + ': l’uscita sporge dal bordo');
        const G = TR.grafo(t);
        assert.equal(TR.passo(G, t.end, d), null, t.id + ': l’uscita non è su un lato incollato');
      }
      for (const k in t.s) {
        const [i, j] = k.split(',').map(Number), ti = TR.tipo(t.s[k]);
        assert.ok(ti && i >= 0 && j >= 0 && i < t.w && j < t.h, t.id + ': simbolo ' + k);
        if ((ti === 'lato' || ti === 'specchio')) assert.equal(t.sup, 'piano', t.id + ': lati e specchi solo sul piano');
        if (ti === 'freccia') assert.ok(TR.SUP[t.sup].orientabile, t.id + ': frecce solo su superfici orientabili');
      }
      const r = TR.soluzioni(t), I = indip(t).tutte();
      const buone = [...I.values()].filter(Boolean).length;
      // stessi cammini (distinti) e stesse soluzioni nelle due implementazioni
      const distinti = new Set(); TR.cammini(t, (vs, es) => { distinti.add(TR.chiave(es)); });
      assert.equal(I.size, distinti.size, t.id + ': stessi cammini nelle due implementazioni');
      const atteso = Object.keys(t.s).length ? (t.stella || 1) : null;
      assert.equal(buone, r.soluzioni.length, t.id + ': soluzioni diverse nelle due implementazioni');
      if (atteso) assert.equal(r.soluzioni.length, atteso, `${t.id}: ${r.soluzioni.length} soluzioni invece di ${atteso}`);
      else assert.ok(r.soluzioni.length >= 1, t.id + ': labirinto risolvibile');
      if (t.stella) { assert.ok(t.stella >= 2 && t.stella <= 3); stelle++; }
      // ogni soluzione è una linea valida
      for (const sol of r.soluzioni) assert.ok(TR.valido(t, sol), t.id + ': soluzione valida');
      tavole++;
    }
    assert.ok(a.tipo === 'segreto' || a.tavole.some(t => t.stella), a.id + ': almeno una stella');
  }
  assert.ok(AREE.filter(a => a.tipo === 'segreto').length === 1 && AREE.find(a => a.tipo === 'segreto').tavole.every(t => !t.stella), 'un solo Segreto, senza stelle');
  bene(`${tavole} tavole: soluzione unica (o esattamente quelle della stella, ${stelle} stelle), uguale nelle due implementazioni`);
}

/* ---------- 4. Validità di una linea ---------- */
{
  const t = AREE[0].tavole[0], sol = TR.soluzioni(t).soluzioni[0];
  assert.ok(TR.valido(t, sol));
  assert.ok(!TR.valido(t, { vs: sol.vs.slice(0, -1), es: sol.es.slice(0, -1) }), 'non arriva all’uscita');
  assert.ok(!TR.valido(t, { vs: sol.vs, es: sol.es.slice().reverse() }), 'lati nell’ordine sbagliato');
  assert.ok(!TR.valido(t, null));
  const toro = AREE.find(a => a.id === 'toro').tavole[1], anello = TR.soluzioni(toro).soluzioni[0];
  assert.ok(TR.valido(toro, anello) && anello.vs[0] === anello.vs[anello.vs.length - 1], 'anello chiuso sul toro');
  bene('linee valide e non valide riconosciute');
}

/* ---------- 5. «Guarda da fuori»: le forme in R³ e R⁴ rispettano gli incollamenti ---------- */
{
  const V3 = require('../giochi/traccia/vista3d.js');
  const d = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
  let prove = 0;
  for (const sup of ['cilindro', 'mobius', 'toro', 'klein', 'rp2']) {
    const S = TR.SUP[sup];
    for (const [w, h] of [[3, 3], [4, 3], [4, 4]]) {
      const p = { w, h, sup };
      for (const modo of V3.ha4(sup) ? ['r3', 'r4'] : ['r3']) {
        const f = (s, t) => modo === 'r3' ? V3.punto3(sup, s, t, p) : V3.punto4(sup, s, t, p);
        let scala = 0; for (let k = 0; k <= 20; k++) scala = Math.max(scala, Math.hypot(...f(k / 20, 0.37)));
        for (let k = 0; k <= 40; k++) {
          const q = k / 40;
          for (const v of [f(q, 0.5), f(0.5, q)]) assert.ok(v.every(Number.isFinite), `${sup} ${modo}: punto finito`);
          if (S.lr) assert.ok(d(f(1, q), f(0, S.lr === 'dritto' ? q : 1 - q)) < 1e-9 * scala + 1e-9, `${sup} ${modo}: destra e sinistra incollate (t=${q})`);
          if (S.tb) assert.ok(d(f(q, 1), f(S.tb === 'dritto' ? q : 1 - q, 0)) < 1e-9 * scala + 1e-9, `${sup} ${modo}: sopra e sotto incollati (s=${q})`);
          prove++;
        }
      }
    }
  }
  // R⁴: niente autointersezioni (punti lontani sulla superficie restano lontani), a differenza di R³
  for (const sup of ['klein', 'rp2']) {
    const p = { w: 4, h: 3, sup }, S = TR.SUP[sup], N = 36, pts = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push([(i + 0.5) / N, (j + 0.5) / N]);
    // distanza sulla superficie (nel quadrato, tenendo conto degli incollamenti), approssimata dalle copie vicine
    const copie = (s, t) => {
      const out = [[s, t]];
      if (S.lr) for (const o of [-1, 1]) out.push([s + o, S.lr === 'dritto' ? t : 1 - t]);
      if (S.tb) for (const o of [-1, 1]) out.push([S.tb === 'dritto' ? s : 1 - s, t + o]);
      if (S.lr && S.tb) for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([(S.tb === 'dritto' ? s : 1 - s) + a, (S.lr === 'dritto' ? t : 1 - t) + b]);
      return out;
    };
    const dq = (a, b) => Math.min(...copie(...b).map(c => Math.hypot(a[0] - c[0], a[1] - c[1])));
    let min4 = Infinity, min3 = Infinity;
    for (let i = 0; i < pts.length; i += 3) for (let j = i + 1; j < pts.length; j += 2) {
      if (dq(pts[i], pts[j]) < 0.25) continue;
      min4 = Math.min(min4, d(V3.punto4(sup, ...pts[i], p), V3.punto4(sup, ...pts[j], p)));
      min3 = Math.min(min3, d(V3.punto3(sup, ...pts[i], p), V3.punto3(sup, ...pts[j], p)));
    }
    assert.ok(min4 > 0.08, `${sup}: in R⁴ punti lontani restano separati (${min4.toFixed(3)})`);
    assert.ok(min3 < min4 / 2, `${sup}: in R³ invece si avvicinano (autointersezione, ${min3.toFixed(3)})`);
  }
  bene(`«Guarda da fuori»: forme in R³ e R⁴ coerenti con gli incollamenti (${prove} controlli); in R⁴ Klein e RP² senza autointersezioni`);
}

console.log(`\n${ok} prove superate`);
