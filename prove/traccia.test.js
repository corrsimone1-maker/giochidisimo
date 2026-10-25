// Prove del motore di TRACCIA e di tutte le tavole: node prove/traccia.test.js
// Il motore (giochi/traccia/motore.js) si confronta con una seconda implementazione scritta qui da
// zero, che incolla i lati con le mappe geometriche scritte a mano per ogni superficie (orbite dei punti
// di bordo) invece che con l'union-find sulle cuciture, conta le zone a mano e ricontrolla le regole.
// Per ogni tavola le due enumerano le linee possibili e devono trovare le stesse soluzioni.
const assert = require('assert');
const TR = require('../giochi/traccia/motore.js');
const self = {}; eval(require('fs').readFileSync(__dirname + '/../giochi/traccia/tavole.js', 'utf8'));
const AREE = self.TRACCIA_AREE;
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

/* ---------- Implementazione indipendente ---------- */
function indip(p) {
  const w = p.w, h = p.h, sup = p.sup || 'piano';
  const [A, C] = p.L || [w, 0];                                   // bitoro: colonna sinistra larga A, riga di sopra alta C
  const cella = (i, j) => i >= 0 && j >= 0 && i < w && j < h && !(sup === 'bitoro' && i >= A && j < C);
  const K = q => q[0] + ',' + q[1];
  const tra = (q, lo, hi, k) => q[k] >= lo && q[k] <= hi;
  // le identificazioni dei punti di bordo: [dominio, mappa]
  const id = [];
  const lr = (rov) => { id.push([q => q[0] === 0, q => [w, rov ? h - q[1] : q[1]]], [q => q[0] === w, q => [0, rov ? h - q[1] : q[1]]]); };
  const tb = (rov) => { id.push([q => q[1] === 0, q => [rov ? w - q[0] : q[0], h]], [q => q[1] === h, q => [rov ? w - q[0] : q[0], 0]]); };
  if (sup === 'cilindro') lr(false);
  if (sup === 'mobius') lr(true);
  if (sup === 'toro') { lr(false); tb(false); }
  if (sup === 'klein') { lr(false); tb(true); }
  if (sup === 'rp2') { lr(true); tb(true); }
  if (sup === 'sfera') {                                          // la busta: (x, 0) ~ (w, w − x), (0, y) ~ (w − y, w)
    id.push([q => q[1] === 0, q => [w, w - q[0]]], [q => q[0] === w, q => [w - q[1], 0]]);
    id.push([q => q[0] === 0, q => [w - q[1], w]], [q => q[1] === h, q => [0, w - q[0]]]);
  }
  if (sup === 'bitoro') {
    id.push([q => q[0] === 0 && tra(q, 0, C, 1), q => [A, q[1]]], [q => q[0] === A && tra(q, 0, C, 1), q => [0, q[1]]]);
    id.push([q => q[0] === 0 && tra(q, C, h, 1), q => [w, q[1]]], [q => q[0] === w && tra(q, C, h, 1), q => [0, q[1]]]);
    id.push([q => q[1] === 0 && tra(q, 0, A, 0), q => [q[0], h]], [q => q[1] === h && tra(q, 0, A, 0), q => [q[0], 0]]);
    id.push([q => q[1] === C && tra(q, A, w, 0), q => [q[0], h]], [q => q[1] === h && tra(q, A, w, 0), q => [q[0], C]]);
  }
  const orbita = q => {
    const vis = new Map([[K(q), q]]), coda = [q];
    while (coda.length) { const a = coda.pop(); for (const [dom, f] of id) if (dom(a)) { const b = f(a); if (!vis.has(K(b))) { vis.set(K(b), b); coda.push(b); } } }
    return [...vis.values()];
  };
  const memoV = new Map(), memoL = new Map();
  const orbitaV = q => { const k = K(q); let r = memoV.get(k); if (r === undefined) { r = orbita(q).map(K).sort()[0]; memoV.set(k, r); } return r; };
  const latoC = (a, b) => [a[1] === b[1] ? [Math.min(a[0], b[0]), a[1] - 1] : [a[0] - 1, Math.min(a[1], b[1])], a[1] === b[1] ? [Math.min(a[0], b[0]), a[1]] : [a[0], Math.min(a[1], b[1])]];
  const esisteL = (a, b) => latoC(a, b).some(c => cella(...c));
  const chiaveL = (a, b) => {
    const mk = K(a) + '>' + K(b); let r = memoL.get(mk); if (r === undefined) { r = chiaveL0(a, b); memoL.set(mk, r); } return r;
  };
  const chiaveL0 = (a, b) => {
    const vis = new Set(), coda = [[a, b]], ks = [];
    while (coda.length) {
      const [x, y] = coda.pop(), k = [K(x), K(y)].sort().join('|'); if (vis.has(k)) continue; vis.add(k); ks.push(k);
      for (const [dom, f] of id) if (dom(x) && dom(y)) coda.push([f(x), f(y)]);
    }
    return ks.sort()[0];
  };
  // angolo attorno a ogni vertice (in quarti di giro): i punti con più di un giro non si attraversano
  const angolo = {};
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    const n = [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]].filter(c => cella(...c)).length;
    if (n) angolo[orbitaV([x, y])] = (angolo[orbitaV([x, y])] || 0) + n;
  }
  const singolare = v => angolo[v] > 4;
  const rotti = new Set((p.gaps || []).map(g => chiaveL([g[0], g[1]], [g[2], g[3]])));
  // un passo dalla copia r verso d: se si esce dalla tavola si rientra dal gemello (sulla sfera girando)
  function passo(r, d) {
    let a = r, b = [r[0] + d[0], r[1] + d[1]], dd = d;
    if (!(b[0] >= 0 && b[1] >= 0 && b[0] <= w && b[1] <= h && esisteL(a, b))) {
      const x = r[0], y = r[1];
      let n = null;
      if (sup === 'sfera') {
        if (d[1] === -1 && y === 0) n = [[w, w - x], [-1, 0]];
        else if (d[0] === 1 && x === w) n = [[w - y, 0], [0, 1]];
        else if (d[0] === -1 && x === 0) n = [[w - y, w], [0, -1]];
        else if (d[1] === 1 && y === h) n = [[0, w - x], [1, 0]];
      } else if (sup === 'bitoro') {
        if (d[0] === -1 && x === 0) n = y < C ? [[A, y], d] : y > C ? [[w, y], d] : null;
        else if (d[0] === 1 && x === A && y < C) n = [[0, y], d];
        else if (d[0] === 1 && x === w && y > C) n = [[0, y], d];
        else if (d[1] === -1 && y === 0 && x < A) n = [[x, h], d];
        else if (d[1] === -1 && y === C && x > A) n = [[x, h], d];
        else if (d[1] === 1 && y === h) n = x < A ? [[x, 0], d] : x > A ? [[x, C], d] : null;
      } else {
        const L = { cilindro: [1, 0], mobius: [2, 0], toro: [1, 1], klein: [1, 2], rp2: [2, 2] }[sup] || [0, 0];
        if (d[0] && (x === 0 || x === w) && L[0]) n = [[w - x, L[0] === 1 ? y : h - y], d];
        else if (d[1] && (y === 0 || y === h) && L[1]) n = [[L[1] === 1 ? x : w - x, h - y], d];
      }
      if (!n) return null;
      [a, dd] = n; b = [a[0] + dd[0], a[1] + dd[1]];
      if (!(b[0] >= 0 && b[1] >= 0 && b[0] <= w && b[1] <= h && esisteL(a, b))) return null;
    }
    const e = chiaveL(a, b); if (rotti.has(e)) return null;
    const v = orbitaV(b); if (singolare(v) || singolare(orbitaV(a))) return null;
    return { a, b, d, dd, e, v };
  }
  // vicini delle caselle, attraverso i lati (incollati compresi), con la chiave del lato in comune
  const vicini = {};
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!cella(i, j)) continue;
    const l = [], c = j * w + i;
    for (const [a, b] of [[[i, j], [i + 1, j]], [[i, j + 1], [i + 1, j + 1]], [[i, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1]]]) {
      const k = chiaveL(a, b);
      // tutte le caselle che hanno una copia di questo lato
      for (let jj = 0; jj < h; jj++) for (let ii = 0; ii < w; ii++) {
        if (!cella(ii, jj) || (ii === i && jj === j)) continue;
        const s = [[[ii, jj], [ii + 1, jj]], [[ii, jj + 1], [ii + 1, jj + 1]], [[ii, jj], [ii, jj + 1]], [[ii + 1, jj], [ii + 1, jj + 1]]];
        if (s.some(([x, y]) => chiaveL(x, y) === k)) l.push([jj * w + ii, k]);
      }
    }
    vicini[c] = l;
  }
  const celle = Object.keys(vicini).map(Number);
  function zone(usati) {
    const z = {}, el = [];
    for (const c of celle) {
      if (z[c] != null) continue;
      const lista = [c], coda = [c]; z[c] = el.length;
      while (coda.length) { const x = coda.pop(); for (const [y, e] of vicini[x]) if (z[y] == null && !usati.has(e)) { z[y] = el.length; lista.push(y); coda.push(y); } }
      el.push(lista);
    }
    return { z, el };
  }
  const latiCasella = (i, j) => [[[i, j], [i + 1, j]], [[i, j + 1], [i + 1, j + 1]], [[i, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1]]].map(([a, b]) => chiaveL(a, b));
  // quante caselle vede (i, j) sul piano, fermandosi ai lati usati
  function vede(i, j, usato) {
    let n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let x = i, y = j; ; ) {
        const nx = x + dx, ny = y + dy; if (!cella(nx, ny)) break;
        const a = dx ? [Math.max(x, nx), y] : [x, Math.max(y, ny)], b = dx ? [Math.max(x, nx), y + 1] : [x + 1, Math.max(y, ny)];
        if (usato(chiaveL(a, b))) break;
        n++; x = nx; y = ny;
      }
    }
    return n;
  }
  const FR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
  function regole(passi) {
    const usati = new Set(passi.map(s => s.e)), s = p.s || {};
    const Z = zone(usati);
    // lato di ogni zona (solo piano): casella a sinistra e a destra di ogni passo
    const lato = {};
    if (sup === 'piano') for (const st of passi) {
      const [ax, ay] = st.a, [dx, dy] = st.dd;
      const cel = { '1,0': [[ax, ay - 1], [ax, ay]], '-1,0': [[ax - 1, ay], [ax - 1, ay - 1]], '0,1': [[ax, ay], [ax - 1, ay]], '0,-1': [[ax - 1, ay - 1], [ax, ay - 1]] }[dx + ',' + dy];
      const [sin, des] = cel;
      for (const [q, n] of [[sin, 'sx'], [des, 'dx']]) if (cella(...q)) { const zz = Z.z[q[1] * w + q[0]]; lato[zz] = lato[zz] && lato[zz] !== n ? 'x' : n; }
    }
    const somma = {};
    for (const k in s) {
      const [i, j] = k.split(',').map(Number), c = j * w + i, zz = Z.z[c], v = s[k];
      if (FR[v]) { somma[zz] = somma[zz] || [0, 0]; somma[zz][0] += FR[v][0]; somma[zz][1] += FR[v][1]; }
      else if (/^\d+$/.test(v)) { if (Z.el[zz].length !== +v) return false; }
      else if (/^c\d$/.test(v)) { if (latiCasella(i, j).filter(e => usati.has(e)).length !== +v.slice(1)) return false; }
      else if (/^o\d+$/.test(v)) { if (vede(i, j, e => usati.has(e)) !== +v.slice(1)) return false; }
      else if (v === 'sole' || v === 'luna') { if (lato[zz] !== (v === 'sole' ? 'sx' : 'dx')) return false; }
      else if (v === 'mv' || v === 'mo') {
        const set = new Set(Z.el[zz]);
        for (const c2 of Z.el[zz]) { const x = c2 % w, y = (c2 - x) / w, rx = v === 'mv' ? 2 * i - x : x, ry = v === 'mo' ? 2 * j - y : y; if (rx < 0 || ry < 0 || rx >= w || ry >= h || !set.has(ry * w + rx)) return false; }
      } else throw new Error('simbolo sconosciuto ' + v);
    }
    return Object.values(somma).every(([x, y]) => x === 0 && y === 0);
  }
  // potatura (scritta qui da capo): contorni e occhi dal cammino a metà
  const monotoni = Object.keys(p.s || {}).filter(k => /^[co]\d+$/.test(p.s[k]));
  function pota(usati, visti, testa) {
    if (!monotoni.length) return false;
    const libero = v => !visti.has(v) || v === testa || (!p.end && v === orbitaV(p.start));
    const forse = (a, b) => { const e = chiaveL(a, b); return usati.has(e) || (!rotti.has(e) && libero(orbitaV(a)) && libero(orbitaV(b)) && !singolare(orbitaV(a)) && !singolare(orbitaV(b))); };
    for (const k of monotoni) {
      const [i, j] = k.split(',').map(Number), v = p.s[k], n = +v.slice(1);
      if (v[0] === 'c') {
        const ls = [[[i, j], [i + 1, j]], [[i, j + 1], [i + 1, j + 1]], [[i, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1]]];
        const fatti = ls.filter(([a, b]) => usati.has(chiaveL(a, b))).length, possibili = ls.filter(([a, b]) => forse(a, b)).length;
        if (fatti > n || possibili < n) return true;
      } else {
        if (vede(i, j, e => usati.has(e)) < n) return true;
        // minimo: lo sguardo si ferma a ogni lato fatto o ancora possibile
        let mn = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let x = i, y = j; ; ) {
          const nx = x + dx, ny = y + dy; if (!cella(nx, ny)) break;
          const a = dx ? [Math.max(x, nx), y] : [x, Math.max(y, ny)], b = dx ? [Math.max(x, nx), y + 1] : [x + 1, Math.max(y, ny)];
          if (forse(a, b)) break;
          mn++; x = nx; y = ny;
        }
        if (mn > n) return true;
      }
    }
    return false;
  }
  // le linee: dal cerchio, quattro direzioni dalla copia mostrata del vertice
  function tutte(conPotatura) {
    const start = orbitaV(p.start), fine = p.end ? orbitaV(p.end) : null, cammini = new Map(), passi = [], visti = new Set([start]), usati = new Set();
    if (singolare(start)) return cammini;
    (function dfs(r) {
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const st = passo(r, d); if (!st) continue;
        if (passi.length && st.e === passi[passi.length - 1].e) continue;
        if (!p.end && st.v === start) {
          if (passi.length >= 1) {
            passi.push(st); usati.add(st.e);
            if (!(conPotatura && pota(usati, visti, st.v))) { const k = passi.map(x => x.e).sort().join(' '); if (!cammini.has(k)) cammini.set(k, regole(passi)); }
            usati.delete(st.e); passi.pop();
          }
          continue;
        }
        if (visti.has(st.v)) continue;
        passi.push(st); visti.add(st.v); usati.add(st.e);
        if (!(conPotatura && pota(usati, visti, st.v))) {
          if (p.end && st.v === fine) { const k = passi.map(x => x.e).sort().join(' '); if (!cammini.has(k)) cammini.set(k, regole(passi)); }
          else dfs(st.b);
        }
        usati.delete(st.e); visti.delete(st.v); passi.pop();
      }
    })(p.start);
    return cammini;
  }
  return { tutte, orbitaV, chiaveL, zone, vicini, passo, singolare, angolo, cella };
}

/* ---------- 1. Superfici: caratteristica di Eulero, gradi, punti singolari ---------- */
{
  const chi = { piano: 1, cilindro: 0, mobius: 0, toro: 0, klein: 0, rp2: 1, sfera: 2, bitoro: -2 };
  const misure = sup => sup === 'sfera' ? [[3, 3], [4, 4], [5, 5]] : sup === 'bitoro' ? [[4, 4, [2, 2]], [5, 4, [3, 2]], [6, 6, [3, 3]], [5, 6, [2, 4]]] : [[3, 3], [4, 3], [3, 4], [5, 4]];
  for (const sup in chi) for (const [w, h, L] of misure(sup)) {
    const p = { w, h, L, sup, start: [1, 1], end: TR.SUP[sup].chiusa ? null : [w, 0], gaps: [] }, G = TR.grafo(p);
    const V = new Set(); for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) if (G.vertEsiste([x, y])) V.add(G.vid(x, y));
    const E = Object.keys(G.estremi).length;
    assert.equal(V.size - E + G.celle.length, chi[sup], `${sup} ${w}x${h}: χ`);
    const I = indip(p), Vi = new Set(); for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) if (G.vertEsiste([x, y])) Vi.add(I.orbitaV([x, y]));
    assert.equal(Vi.size, V.size, `${sup}: stessi vertici delle due implementazioni`);
    assert.equal(Object.keys(I.vicini).length, G.celle.length, `${sup}: stesse caselle`);
    // stessi punti singolari: sul bitoro uno solo, con angolo 6π (12 quarti di giro); altrove nessuno
    const sing = [...V].filter(v => G.singolari.has(v)).length, singI = [...Vi].filter(I.singolare).length;
    assert.equal(sing, singI, `${sup}: punti singolari`);
    assert.equal(sing, sup === 'bitoro' ? 1 : 0, `${sup}: quanti punti singolari`);
    if (sup === 'bitoro') assert.equal(G.angolo[[...G.singolari][0]], 12, 'bitoro: angolo 6π');
    if (sup === 'toro' || sup === 'klein') for (const v of V) assert.equal(G.adj[v].length, 4, 'grado 4');
    // Gauss–Bonnet discreto: la somma dei difetti d'angolo (4 − angolo, in quarti di giro) è 4χ, i bordi contano 2 − angolo
    if (TR.SUP[sup].chiusa) { let dif = 0; for (const v of V) dif += 4 - G.angolo[v]; assert.equal(dif, 4 * chi[sup], `${sup}: Gauss–Bonnet`); }
  }
  bene('superfici: χ = 1, 0, 0, 0, 0, 1, 2, −2 (piano, cilindro, Möbius, toro, Klein, RP², sfera, bitoro), stessi vertici e punti singolari nelle due implementazioni, Gauss–Bonnet sulle chiuse');
}

/* ---------- 2. Passi e zone: motore contro implementazione indipendente su linee a caso ---------- */
{
  let s = 12345; const rnd = n => { s = (s * 1103515245 + 12345) >>> 0; return s % n; };
  let prove = 0, passiProvati = 0;
  for (const sup of ['piano', 'cilindro', 'mobius', 'toro', 'klein', 'rp2', 'sfera', 'bitoro']) for (let t = 0; t < 300; t++) {
    let w = 3 + rnd(3), h = 3 + rnd(2), L;
    if (sup === 'sfera') h = w;
    if (sup === 'bitoro') { w = 4 + rnd(3); h = 4 + rnd(3); L = [1 + rnd(w - 1), 1 + rnd(h - 1)]; }
    const p = { w, h, L, sup, start: [0, 0], end: null, gaps: [] };
    const G = TR.grafo(p), I = indip(p);
    // ogni passo da ogni copia di ogni vertice: stesso arrivo, stessa direzione, stesso lato
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
      if (!G.vertEsiste([x, y])) continue;
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = TR.passo(G, [x, y], d), b = I.passo([x, y], d); passiProvati++;
        assert.equal(!!a, !!b, `${sup} ${w}x${h}: passo da ${x},${y} verso ${d}`);
        if (a) { assert.deepEqual([a.a, a.b, a.dd], [b.a, b.b, b.dd], `${sup}: stesso passo`); assert.equal(I.orbitaV(a.b), b.v); }
      }
    }
    // passeggiata a caso senza ripassare, da un vertice non singolare
    let r = null;
    for (let k = 0; k < 50 && !r; k++) { const q = [rnd(w + 1), rnd(h + 1)]; if (G.vertEsiste(q) && !G.singolari.has(G.vid(...q))) r = q; }
    const visti = new Set([G.vid(...r)]), es = [], ei = [];
    for (let k = 0; k < 4 + rnd(12); k++) {
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rnd(4)], st = TR.passo(G, r, d);
      if (!st || visti.has(st.v)) continue;
      visti.add(st.v); es.push(st.e); ei.push(I.chiaveL(st.a, st.b)); r = st.b;
    }
    const Z1 = TR.zone(G, new Set(es)), Z2 = I.zone(new Set(ei));
    for (const a of G.celle) for (const b of G.celle) if (a < b) assert.equal(Z1.id[a] === Z1.id[b], Z2.z[a] === Z2.z[b], `${sup} ${w}x${h}: zone diverse`);
    prove++;
  }
  bene(`${passiProvati} passi e le zone di ${prove} linee a caso uguali nelle due implementazioni, sulle otto superfici`);
}

/* ---------- 3. Contorni e occhi: regole e potatura ---------- */
{
  // su linee a caso del piano, contorni e occhi del motore uguali a quelli contati a mano
  let s = 99; const rnd = n => { s = (s * 1103515245 + 12345) >>> 0; return s % n; };
  let n = 0;
  for (let t = 0; t < 300; t++) {
    const w = 3 + rnd(4), h = 3 + rnd(4), p = { w, h, sup: 'piano', start: [0, h], end: [w, 0], endDir: 'up', gaps: [] }, G = TR.grafo(p), I = indip(p);
    let trovato = null, conta = 0;
    TR.cammini(p, (vs, es) => { if (rnd(40) === 0 || ++conta > 4000) { trovato = { vs: vs.slice(), es: es.slice() }; return true; } });
    if (!trovato) continue;
    // la stessa linea con le chiavi dell'altra implementazione
    const usati = new Set(trovato.es), ei = new Set();
    let q = p.start.slice();
    for (let k = 0; k < trovato.es.length; k++) {
      const st = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => TR.passo(G, q, d)).find(x => x && x.e === trovato.es[k] && x.v === trovato.vs[k + 1]);
      ei.add(I.chiaveL(st.a, st.b)); q = st.b;
    }
    for (const c of G.celle) {
      const i = c % w, j = (c - i) / w;
      // contorno: i lati della casella fatti dalla linea, contati sui quattro lati disegnati
      const fatti = [[[i, j], [i + 1, j]], [[i, j + 1], [i + 1, j + 1]], [[i, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1]]].filter(([a, b]) => ei.has(I.chiaveL(a, b))).length;
      assert.ok(TR.controlla({ ...p, s: { [`${i},${j}`]: 'c' + fatti } }, trovato).ok, 'contorno');
      assert.ok(!TR.controlla({ ...p, s: { [`${i},${j}`]: 'c' + ((fatti + 1) % 4) } }, trovato).ok, 'contorno sbagliato');
      // occhio: lo sguardo contato a mano
      let vis = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let x = i, y = j; ; ) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
        const a = dx ? [Math.max(x, nx), y] : [x, Math.max(y, ny)], b = dx ? [Math.max(x, nx), y + 1] : [x + 1, Math.max(y, ny)];
        if (ei.has(I.chiaveL(a, b))) break;
        vis++; x = nx; y = ny;
      }
      assert.equal(TR.vede(G, i, j, e => usati.has(e)), vis, 'occhio');
      if (vis) assert.ok(TR.controlla({ ...p, s: { [`${i},${j}`]: 'o' + vis } }, trovato).ok, 'occhio giusto');
      n++;
    }
  }
  // potatura: su tavole piccole con contorni e occhi a caso, con e senza potatura le soluzioni sono le stesse
  let tav = 0;
  for (let t = 0; t < 120; t++) {
    const w = 3 + rnd(2), h = 3 + rnd(2), s2 = {};
    for (let k = 0; k < 2 + rnd(4); k++) s2[`${rnd(w)},${rnd(h)}`] = rnd(2) ? 'c' + rnd(4) : 'o' + (1 + rnd(w + h - 2));
    const p = { w, h, sup: 'piano', start: [0, h], end: [w, rnd(h + 1)], endDir: 'right', gaps: [], s: s2 };
    const conP = TR.soluzioni(p).soluzioni.map(x => x.k).sort().join(';');
    const senza = []; TR.cammini(p, (vs, es) => { if (TR.controlla(p, { vs, es }).ok) senza.push(TR.chiave(es)); });
    assert.equal(conP, senza.sort().join(';'), 'la potatura non perde soluzioni');
    const I = indip(p), a = [...I.tutte(true).values()].filter(Boolean).length, b = [...I.tutte(false).values()].filter(Boolean).length;
    assert.equal(a, b, 'potatura indipendente'); assert.equal(a, senza.length, 'stesse soluzioni');
    tav++;
  }
  bene(`contorni e occhi contati a mano su ${n} caselle; potatura senza perdite su ${tav} tavole a caso (nelle due implementazioni)`);
}

/* ---------- 4. Tavole ---------- */
{
  const ids = new Set();
  let tavole = 0, stelle = 0;
  for (const a of AREE) {
    assert.ok(['regola', 'forma', 'segreto'].includes(a.tipo) && a.regola && a.nome && a.sigla, a.id + ': campi');
    for (const t of a.tavole) {
      assert.ok(!ids.has(t.id), 'id doppio ' + t.id); ids.add(t.id);
      assert.ok(TR.SUP[t.sup], t.id + ': superficie');
      assert.equal(!t.end, TR.SUP[t.sup].chiusa, t.id + ': uscita solo sulle superfici con bordo');
      const G = TR.grafo(t);
      assert.ok(G.vertEsiste(t.start) && !G.singolari.has(G.start), t.id + ': il cerchio su un vertice vero');
      if (t.end) {
        const d = TR.DV[t.endDir], fuori = [t.end[0] + d[0], t.end[1] + d[1]];
        assert.ok(fuori[0] < 0 || fuori[1] < 0 || fuori[0] > t.w || fuori[1] > t.h, t.id + ': l’uscita sporge dal bordo');
        assert.equal(TR.passo(G, t.end, d), null, t.id + ': l’uscita non è su un lato incollato');
      }
      for (const k in t.s) {
        const [i, j] = k.split(',').map(Number), ti = TR.tipo(t.s[k]);
        assert.ok(ti && G.esiste(i, j), t.id + ': simbolo ' + k);
        if (ti === 'lato' || ti === 'specchio' || ti === 'occhio') assert.equal(t.sup, 'piano', t.id + ': lati, specchi e occhi solo sul piano');
        if (ti === 'freccia') assert.ok(TR.SUP[t.sup].orientabile, t.id + ': frecce solo su superfici orientabili');
        if (ti === 'contorno') assert.equal(new Set(G.lati[j * t.w + i]).size, 4, t.id + ': contorno su una casella con quattro lati diversi');
      }
      const r = TR.soluzioni(t), I = indip(t);
      const grande = (t.w + 1) * (t.h + 1) > 30 && Object.values(t.s || {}).some(v => /^[co]/.test(v));
      const tuttiI = I.tutte(grande);
      const buone = [...tuttiI.values()].filter(Boolean).length;
      // stessi cammini (distinti) nelle due implementazioni, dove si possono enumerare tutti
      if (!grande) { const distinti = new Set(); TR.cammini(t, (vs, es) => { distinti.add(TR.chiave(es)); }); assert.equal(tuttiI.size, distinti.size, t.id + ': stessi cammini nelle due implementazioni'); }
      const atteso = Object.keys(t.s).length ? (t.stella || 1) : null;
      assert.equal(buone, r.soluzioni.length, t.id + ': soluzioni diverse nelle due implementazioni');
      if (atteso) assert.equal(r.soluzioni.length, atteso, `${t.id}: ${r.soluzioni.length} soluzioni invece di ${atteso}`);
      else assert.ok(r.soluzioni.length >= 1, t.id + ': labirinto risolvibile');
      if (t.stella) { assert.ok(t.stella >= 2 && t.stella <= 3); stelle++; }
      // ogni soluzione è una linea valida e si può tracciare col dito: dalle quattro direzioni di ogni copia
      for (const sol of r.soluzioni) {
        assert.ok(TR.valido(t, sol), t.id + ': soluzione valida');
        let q = t.start.slice();
        for (let k = 0; k < sol.es.length; k++) {
          const st = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => TR.passo(G, q, d)).find(x => x && x.e === sol.es[k] && x.v === sol.vs[k + 1]);
          assert.ok(st, t.id + ': soluzione tracciabile'); q = st.b;
        }
      }
      tavole++;
    }
    assert.ok(a.tipo === 'segreto' || a.tavole.some(t => t.stella), a.id + ': almeno una stella');
  }
  assert.ok(AREE.filter(a => a.tipo === 'segreto').length === 1 && AREE.find(a => a.tipo === 'segreto').tavole.every(t => !t.stella), 'un solo Segreto, senza stelle');
  bene(`${tavole} tavole: soluzione unica (o esattamente quelle della stella, ${stelle} stelle), uguale nelle due implementazioni e tracciabile`);
}

/* ---------- 5. Validità di una linea ---------- */
{
  const t = AREE[0].tavole[0], sol = TR.soluzioni(t).soluzioni[0];
  assert.ok(TR.valido(t, sol));
  assert.ok(!TR.valido(t, { vs: sol.vs.slice(0, -1), es: sol.es.slice(0, -1) }), 'non arriva all’uscita');
  assert.ok(!TR.valido(t, { vs: sol.vs, es: sol.es.slice().reverse() }), 'lati nell’ordine sbagliato');
  assert.ok(!TR.valido(t, null));
  const toro = AREE.find(a => a.id === 'toro').tavole[1], anello = TR.soluzioni(toro).soluzioni[0];
  assert.ok(TR.valido(toro, anello) && anello.vs[0] === anello.vs[anello.vs.length - 1], 'anello chiuso sul toro');
  // sul bitoro una linea non passa dal punto singolare
  const bt = { w: 4, h: 4, L: [2, 2], sup: 'bitoro', start: [1, 3], end: null, gaps: [] }, G = TR.grafo(bt), sing = [...G.singolari][0];
  assert.ok(!Object.values(G.adj).some(l => l.some(([v]) => v === sing)) && !G.adj[sing], 'il punto singolare non ha vicini');
  bene('linee valide e non valide riconosciute; il punto singolare del bitoro non si attraversa');
}

/* ---------- 6. «Guarda da fuori»: le forme in R³ e R⁴ rispettano gli incollamenti ---------- */
{
  const V3 = require('../giochi/traccia/vista3d.js');
  const d = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
  let prove = 0;
  for (const sup of Object.keys(V3.FORME)) {
    for (const [w, h] of sup === 'sfera' ? [[3, 3], [4, 4], [5, 5]] : [[3, 3], [4, 3], [4, 4]]) {
      const p = { w, h, sup };
      for (const modo of V3.ha4(sup) ? ['r3', 'r4'] : ['r3']) {
        const f = (s, t) => modo === 'r3' ? V3.punto3(sup, s, t, p) : V3.punto4(sup, s, t, p);
        let scala = 0; for (let k = 0; k <= 20; k++) scala = Math.max(scala, Math.hypot(...f(k / 20, 0.37)));
        for (let k = 0; k <= 40; k++) for (const v of [f(k / 40, 0.5), f(0.5, k / 40)]) assert.ok(v.every(Number.isFinite), `${sup} ${modo}: punto finito`);
        // ogni cucitura: il punto t del lato a e il punto t del lato b vanno nello stesso punto
        for (const cu of TR.cuciture(p)) for (let k = 0; k <= 40; k++) {
          const t = k / 40 * cu.a.n, pa = [cu.a.da[0] + t * cu.a.dir[0], cu.a.da[1] + t * cu.a.dir[1]], pb = [cu.b.da[0] + t * cu.b.dir[0], cu.b.da[1] + t * cu.b.dir[1]];
          assert.ok(d(f(pa[0] / w, pa[1] / h), f(pb[0] / w, pb[1] / h)) < 1e-9 * scala + 1e-9, `${sup} ${modo}: cucitura (${pa} ~ ${pb})`);
          prove++;
        }
      }
    }
  }
  // R⁴: niente autointersezioni (punti lontani sulla superficie restano lontani), a differenza di R³
  for (const sup of ['klein', 'rp2']) {
    const p = { w: 4, h: 3, sup }, N = 36, pts = [], lr = sup === 'klein' ? 'dritto' : 'rovescio', tb = 'rovescio';
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push([(i + 0.5) / N, (j + 0.5) / N]);
    // distanza sulla superficie (nel quadrato, tenendo conto degli incollamenti), approssimata dalle copie vicine
    const copie = (s, t) => {
      const out = [[s, t]];
      for (const o of [-1, 1]) out.push([s + o, lr === 'dritto' ? t : 1 - t]);
      for (const o of [-1, 1]) out.push([1 - s, t + o]);
      for (const a of [-1, 1]) for (const b of [-1, 1]) out.push([1 - s + a, (lr === 'dritto' ? t : 1 - t) + b]);
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
  // la sfera è un embedding: punti diversi del quadrato (non incollati) vanno in punti diversi
  {
    const p = { w: 4, h: 4, sup: 'sfera' }, N = 30; let min = Infinity;
    const pts = []; for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) pts.push([i / N, j / N]);
    for (let a = 0; a < pts.length; a += 2) for (let b = a + 1; b < pts.length; b += 3) {
      if (Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) < 0.2) continue;
      min = Math.min(min, d(V3.punto3('sfera', ...pts[a], p), V3.punto3('sfera', ...pts[b], p)));
    }
    assert.ok(min > 0.02, `sfera: niente autointersezioni (${min.toFixed(3)})`);
  }
  bene(`«Guarda da fuori»: forme coerenti con le cuciture (${prove} controlli); in R⁴ Klein e RP² senza autointersezioni, la sfera senza autointersezioni`);
}

console.log(`\n${ok} prove superate`);
