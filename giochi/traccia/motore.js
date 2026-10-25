/* =====================================================================
   TRACCIA: motore (senza pagina). Lo usano la pagina, le prove e lo
   strumento che controlla le tavole (self.TR, oppure require da node).

   TAVOLA
     { id, w, h, sup, start: [x, y], end: [x, y] | null, endDir, gaps, s, stella }
     id      unico, non si cambia: è la chiave dei progressi salvati
     w, h    caselle in larghezza e altezza; i vertici vanno da (0,0) a (w,h),
             la y cresce verso il basso
     sup     superficie: 'piano' | 'cilindro' | 'mobius' | 'toro' | 'klein' | 'rp2'
             (lati incollati: vedi SUP qui sotto)
     start   vertice di partenza (il cerchio)
     end     vertice d'uscita; null sulle superfici chiuse: la linea deve
             tornare al cerchio (un anello)
     endDir  da che parte sporge l'uscita: 'up' | 'down' | 'left' | 'right'
     gaps    lati interrotti [[x1, y1, x2, y2], ...]
     s       simboli per casella { 'i,j': codice }
               frecce   'N' 'S' 'E' 'W' 'NE' 'NW' 'SE' 'SW'
               numeri   '1' … '99'
               lati     'sole' (a sinistra di chi cammina), 'luna' (a destra)
               specchi  'mv' (asse verticale), 'mo' (asse orizzontale)
     stella  facoltativo: quante soluzioni diverse ha la tavola (2 o 3);
             trovarle tutte dà una stella

   REGOLE (in ogni zona delimitata dalla linea e dai bordi veri)
     frecce   la somma dei vettori è zero (una diagonale vale due passi)
     numeri   ogni numero è il numero di caselle della sua zona
     lati     camminando dal cerchio all'uscita, i soli stanno a sinistra
              e le lune a destra (solo sul piano)
     specchi  la zona è simmetrica rispetto all'asse dello specchio, che
              passa per il centro della sua casella (solo sul piano)

   Due soluzioni sono uguali se usano gli stessi lati (un anello percorso
   al contrario è la stessa soluzione).
   ===================================================================== */
(function (root) {
  'use strict';

  /* Lati incollati: lr = destra con sinistra, tb = sopra con sotto.
     'dritto' incolla alla stessa altezza (o colonna), 'rovescio' capovolto. */
  const SUP = {
    piano:    { lr: null,       tb: null,       nome: 'piano',              chiusa: false, orientabile: true },
    cilindro: { lr: 'dritto',   tb: null,       nome: 'cilindro',           chiusa: false, orientabile: true },
    mobius:   { lr: 'rovescio', tb: null,       nome: 'nastro di Möbius',   chiusa: false, orientabile: false },
    toro:     { lr: 'dritto',   tb: 'dritto',   nome: 'toro',               chiusa: true,  orientabile: true },
    klein:    { lr: 'dritto',   tb: 'rovescio', nome: 'bottiglia di Klein', chiusa: true,  orientabile: false },
    rp2:      { lr: 'rovescio', tb: 'rovescio', nome: 'piano proiettivo',   chiusa: true,  orientabile: false }
  };

  const FRECCE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
  const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function tipo(c) {
    if (FRECCE[c]) return 'freccia';
    if (c === 'sole' || c === 'luna') return 'lato';
    if (c === 'mv' || c === 'mo') return 'specchio';
    if (/^[1-9][0-9]?$/.test(c)) return 'numero';
    return null;
  }

  function trova(p, i) { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }
  function unisci(p, a, b) { a = trova(p, a); b = trova(p, b); if (a !== b) { if (a < b) p[b] = a; else p[a] = b; } }

  /* Il grafo di una tavola: vertici ed lati identificati dagli incollamenti. */
  const cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function grafo(p) {
    if (cache && cache.has(p)) return cache.get(p);
    const w = p.w, h = p.h, S = SUP[p.sup || 'piano'];
    if (!S) throw new Error('superficie sconosciuta: ' + p.sup);
    const NV = (w + 1) * (h + 1), NH = (h + 1) * w, NE = NH + h * (w + 1);
    const vi = (x, y) => y * (w + 1) + x;
    const hi = (x, y) => y * w + x;               // lato (x,y)-(x+1,y)
    const vti = (x, y) => NH + y * (w + 1) + x;   // lato (x,y)-(x,y+1)
    const rawEdge = (a, b) => {
      if (a[1] === b[1]) return hi(Math.min(a[0], b[0]), a[1]);
      return vti(a[0], Math.min(a[1], b[1]));
    };
    // incollamenti di un punto del bordo
    const lr = (q) => S.lr === 'dritto' ? [w - q[0], q[1]] : [w - q[0], h - q[1]];   // q su x=0 o x=w
    const tb = (q) => S.tb === 'dritto' ? [q[0], h - q[1]] : [w - q[0], h - q[1]];   // q su y=0 o y=h
    const pv = Array.from({ length: NV }, (_, i) => i);
    const pe = Array.from({ length: NE }, (_, i) => i);
    if (S.lr) {
      for (let y = 0; y <= h; y++) unisci(pv, vi(0, y), vi(...lr([0, y])));
      for (let y = 0; y < h; y++) { const a = lr([0, y]), b = lr([0, y + 1]); unisci(pe, vti(0, y), rawEdge(a, b)); }
    }
    if (S.tb) {
      for (let x = 0; x <= w; x++) unisci(pv, vi(x, 0), vi(...tb([x, 0])));
      for (let x = 0; x < w; x++) { const a = tb([x, 0]), b = tb([x + 1, 0]); unisci(pe, hi(x, 0), rawEdge(a, b)); }
    }
    const V = new Int32Array(NV), E = new Int32Array(NE);
    for (let i = 0; i < NV; i++) V[i] = trova(pv, i);
    for (let i = 0; i < NE; i++) E[i] = trova(pe, i);
    const vid = (x, y) => V[vi(x, y)];
    const eid = (a, b) => E[rawEdge(a, b)];
    // coordinate (una copia) di ogni vertice canonico
    const coord = {};
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) { const k = vid(x, y); if (!coord[k]) coord[k] = [x, y]; }
    // lati interrotti
    const rotti = new Set();
    for (const g of (p.gaps || [])) rotti.add(eid([g[0], g[1]], [g[2], g[3]]));
    // estremi e caselle di ogni lato canonico
    const estremi = {}, caselleDi = {};
    const metti = (a, b) => { const e = eid(a, b); if (!estremi[e]) estremi[e] = [vid(...a), vid(...b)]; };
    for (let y = 0; y <= h; y++) for (let x = 0; x < w; x++) metti([x, y], [x + 1, y]);
    for (let y = 0; y < h; y++) for (let x = 0; x <= w; x++) metti([x, y], [x, y + 1]);
    const lati = [];   // per casella: i quattro lati canonici (su, giù, sinistra, destra)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c = j * w + i, l = [eid([i, j], [i + 1, j]), eid([i, j + 1], [i + 1, j + 1]), eid([i, j], [i, j + 1]), eid([i + 1, j], [i + 1, j + 1])];
      lati.push(l);
      for (const e of l) (caselleDi[e] || (caselleDi[e] = [])).push(c);
    }
    // vicini nel grafo (senza i lati interrotti)
    const adj = {};
    for (const e in estremi) {
      const k = +e; if (rotti.has(k)) continue;
      const [a, b] = estremi[k];
      if (a === b) continue;
      (adj[a] || (adj[a] = [])).push([b, k]);
      (adj[b] || (adj[b] = [])).push([a, k]);
    }
    const G = { p, w, h, S, sup: p.sup || 'piano', vid, eid, coord, rotti, estremi, caselleDi, lati, adj, lr, tb,
      start: vid(...p.start), end: p.end ? vid(...p.end) : null, anello: !p.end };
    if (cache) cache.set(p, G);
    return G;
  }

  const dentro = (G, q) => q[0] >= 0 && q[1] >= 0 && q[0] <= G.w && q[1] <= G.h;

  /* Un passo della linea dalla copia r di un vertice, nella direzione d dello schermo.
     Se si esce da un lato incollato si rientra dal lato gemello: r2 è la copia di r da
     cui si riparte e j = r2 − r il salto. Restituisce null se il passo non si può fare. */
  function passo(G, r, d) {
    let a = r, b = [r[0] + d[0], r[1] + d[1]];
    if (!dentro(G, b)) {
      let r2 = null;
      if (b[0] > G.w || b[0] < 0) { if (G.S.lr) r2 = G.lr(r); }
      else if (G.S.tb) r2 = G.tb(r);
      if (!r2) return null;
      a = r2; b = [r2[0] + d[0], r2[1] + d[1]];
      if (!dentro(G, b)) return null;
    }
    const e = G.eid(a, b);
    if (G.rotti.has(e)) return null;
    return { a, b, j: [a[0] - r[0], a[1] - r[1]], d, v: G.vid(b[0], b[1]), e };
  }

  /* Zone: caselle collegate dai lati che la linea non usa. Restituisce l'indice
     della zona di ogni casella e l'elenco delle zone. */
  function zone(G, usati) {
    const n = G.w * G.h, pc = Array.from({ length: n }, (_, i) => i);
    for (const e in G.caselleDi) {
      if (usati.has(+e)) continue;
      const cs = G.caselleDi[e];
      for (let k = 1; k < cs.length; k++) unisci(pc, cs[0], cs[k]);
    }
    const id = new Int32Array(n), mappa = {}, elenco = [];
    for (let c = 0; c < n; c++) {
      const r = trova(pc, c);
      if (mappa[r] == null) { mappa[r] = elenco.length; elenco.push([]); }
      id[c] = mappa[r]; elenco[mappa[r]].push(c);
    }
    return { id, elenco };
  }

  /* Da che parte di chi cammina sta ogni zona (solo sul piano): 'sx', 'dx' o null. */
  function parti(G, vs, Z) {
    const lato = new Array(Z.elenco.length).fill(null), w = G.w, h = G.h;
    for (let k = 1; k < vs.length; k++) {
      const a = G.coord[vs[k - 1]], b = G.coord[vs[k]];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      for (const [s, nome] of [[1, 'sx'], [-1, 'dx']]) {
        const cx = Math.floor(mx + s * dy * 0.5), cy = Math.floor(my - s * dx * 0.5);
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        const z = Z.id[cy * w + cx];
        lato[z] = lato[z] && lato[z] !== nome ? 'entrambi' : nome;
      }
    }
    return lato;
  }

  /* Controllo delle regole. cammino = { vs: [vertici canonici], es: [lati canonici] }.
     Restituisce { ok, male: ['i,j', ...] } con le caselle dei simboli che non vanno. */
  function controlla(p, cammino) {
    const G = grafo(p), w = G.w;
    const Z = zone(G, new Set(cammino.es));
    const male = [];
    const s = p.s || {};
    const somma = Z.elenco.map(() => [0, 0]), frecceIn = Z.elenco.map(() => []);
    let lato = null;
    for (const k in s) {
      const [i, j] = k.split(',').map(Number), c = j * w + i, z = Z.id[c], t = tipo(s[k]);
      if (t === 'freccia') { const v = FRECCE[s[k]]; somma[z][0] += v[0]; somma[z][1] += v[1]; frecceIn[z].push(k); }
      else if (t === 'numero') { if (Z.elenco[z].length !== +s[k]) male.push(k); }
      else if (t === 'lato') {
        if (!lato) lato = parti(G, cammino.vs, Z);
        if (lato[z] !== (s[k] === 'sole' ? 'sx' : 'dx')) male.push(k);
      } else if (t === 'specchio') {
        const set = new Set(Z.elenco[z]);
        let ok = true;
        for (const c2 of Z.elenco[z]) {
          const x = c2 % w, y = (c2 - x) / w;
          const rx = s[k] === 'mv' ? 2 * i - x : x, ry = s[k] === 'mo' ? 2 * j - y : y;
          if (rx < 0 || ry < 0 || rx >= w || ry >= G.h || !set.has(ry * w + rx)) { ok = false; break; }
        }
        if (!ok) male.push(k);
      }
    }
    for (let z = 0; z < somma.length; z++) if (somma[z][0] || somma[z][1]) male.push(...frecceIn[z]);
    return { ok: male.length === 0, male };
  }

  /* Il cammino è una linea giusta per la tavola (dal cerchio all'uscita, o anello)? */
  function valido(p, cammino) {
    const G = grafo(p), vs = cammino && cammino.vs, es = cammino && cammino.es;
    if (!Array.isArray(vs) || !Array.isArray(es) || es.length !== vs.length - 1 || vs.length < 2) return false;
    if (vs[0] !== G.start) return false;
    const fine = vs[vs.length - 1];
    if (G.anello ? fine !== G.start || es.length < 3 : fine !== G.end) return false;
    const visti = new Set(), lati = new Set();
    for (let k = 0; k < vs.length; k++) {
      const v = vs[k];
      if (k < vs.length - 1 || !G.anello) { if (visti.has(v)) return false; visti.add(v); }
      if (k > 0) {
        const e = es[k - 1], ab = G.estremi[e];
        if (!ab || G.rotti.has(e) || lati.has(e)) return false;
        if (!((ab[0] === vs[k - 1] && ab[1] === v) || (ab[1] === vs[k - 1] && ab[0] === v))) return false;
        lati.add(e);
      }
    }
    return true;
  }

  const chiave = es => es.slice().sort((a, b) => a - b).join('.');

  /* Tutti i cammini possibili (senza guardare i simboli). f(vs, es) per ognuno;
     se f restituisce true la ricerca si ferma. */
  function cammini(p, f) {
    const G = grafo(p), visti = new Set([G.start]), vs = [G.start], es = [];
    let stop = false;
    (function dfs(u) {
      for (const [v, e] of (G.adj[u] || [])) {
        if (stop) return;
        if (G.anello && v === G.start) {
          if (es.length >= 2 && e !== es[es.length - 1]) { vs.push(v); es.push(e); if (f(vs, es)) stop = true; vs.pop(); es.pop(); }
          continue;
        }
        if (visti.has(v)) continue;
        vs.push(v); es.push(e);
        if (!G.anello && v === G.end) { if (f(vs, es)) stop = true; }
        else { visti.add(v); dfs(v); visti.delete(v); }
        vs.pop(); es.pop();
      }
    })(G.start);
  }

  /* Tutte le soluzioni diverse (per insieme di lati). */
  function soluzioni(p, limite) {
    const trovate = new Map();
    let totali = 0;
    cammini(p, (vs, es) => {
      totali++;
      if (!controlla(p, { vs, es }).ok) return false;
      const k = chiave(es);
      if (!trovate.has(k)) trovate.set(k, { vs: vs.slice(), es: es.slice(), k });
      return limite != null && trovate.size >= limite;
    });
    return { totali, soluzioni: [...trovate.values()] };
  }

  const TR = { SUP, FRECCE, DV, tipo, grafo, passo, zone, parti, controlla, valido, chiave, cammini, soluzioni, dentro };
  if (typeof module !== 'undefined' && module.exports) module.exports = TR;
  root.TR = TR;
})(typeof self !== 'undefined' ? self : this);
