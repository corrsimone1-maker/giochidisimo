/* =====================================================================
   TRACCIA: motore (senza pagina). Lo usano la pagina, le prove e lo
   strumento che controlla le tavole (self.TR, oppure require da node).

   TAVOLA
     { id, w, h, sup, L, start: [x, y], end: [x, y] | null, endDir, gaps, s, stella }
     id      unico, non si cambia: è la chiave dei progressi salvati
     w, h    caselle in larghezza e altezza; i vertici vanno da (0,0) a (w,h),
             la y cresce verso il basso
     sup     superficie: 'piano' | 'cilindro' | 'mobius' | 'toro' | 'klein' | 'rp2'
             | 'sfera' | 'bitoro' (lati incollati: vedi SUP e cuciture())
     L       solo per il bitoro: [a, c]. La tavola è una L: manca il blocco in alto
             a destra, cioè le caselle con i >= a e j < c
     start   vertice di partenza (il cerchio)
     end     vertice d'uscita; null sulle superfici chiuse: la linea deve
             tornare al cerchio (un anello)
     endDir  da che parte sporge l'uscita: 'up' | 'down' | 'left' | 'right'
     gaps    lati interrotti [[x1, y1, x2, y2], ...]
     s       simboli per casella { 'i,j': codice }
               frecce    'N' 'S' 'E' 'W' 'NE' 'NW' 'SE' 'SW'
               numeri    '1' … '99'
               lati      'sole' (a sinistra di chi cammina), 'luna' (a destra)
               specchi   'mv' (asse verticale), 'mo' (asse orizzontale)
               contorni  'c0' … 'c3'
               occhi     'o1' … 'o99'
     stella  facoltativo: quante soluzioni diverse ha la tavola (2 o 3);
             trovarle tutte dà una stella

   REGOLE
     Nelle zone delimitate dalla linea e dai bordi veri:
     frecce   la somma dei vettori è zero (una diagonale vale due passi)
     numeri   ogni numero è il numero di caselle della sua zona
     lati     camminando dal cerchio all'uscita, i soli stanno a sinistra
              e le lune a destra (solo sul piano)
     specchi  la zona è simmetrica rispetto all'asse dello specchio, che
              passa per il centro della sua casella (solo sul piano)
     Nelle caselle:
     contorni il numero è quanti dei quattro lati della casella fa la linea
     occhi    il numero è quante caselle vede la casella guardando in su, in giù,
              a sinistra e a destra, finché non trova la linea o il bordo (la sua
              non conta; solo sul piano)

   Due soluzioni sono uguali se usano gli stessi lati (un anello percorso
   al contrario è la stessa soluzione).

   PUNTI SINGOLARI. Dove gli angoli delle caselle incollate fanno più di un
   giro (sul bitoro si incontrano tutti gli angoli della L: 6π) la linea non
   può passare: da lì non c'è un modo solo di andare «dritto».
   ===================================================================== */
(function (root) {
  'use strict';

  const SUP = {
    piano:    { nome: 'piano',              chiusa: false, orientabile: true },
    cilindro: { nome: 'cilindro',           chiusa: false, orientabile: true },
    mobius:   { nome: 'nastro di Möbius',   chiusa: false, orientabile: false },
    toro:     { nome: 'toro',               chiusa: true,  orientabile: true },
    klein:    { nome: 'bottiglia di Klein', chiusa: true,  orientabile: false },
    rp2:      { nome: 'piano proiettivo',   chiusa: true,  orientabile: false },
    sfera:    { nome: 'sfera',              chiusa: true,  orientabile: true, quadrata: true },
    bitoro:   { nome: 'bitoro',             chiusa: true,  orientabile: true, conL: true }
  };

  /* Cuciture: coppie di segmenti del bordo incollati punto per punto.
     Un segmento { da: [x, y], dir: [dx, dy], n } è fatto dei punti da + t·dir, t = 0…n.
     Una cucitura { a, b, col, segni } incolla a(t) con b(t). col ('a' verde acqua, 'b' lilla)
     e segni (quante frecce) servono al disegno, per riconoscere i lati gemelli. */
  function cuciture(p) {
    const w = p.w, h = p.h, sup = p.sup || 'piano';
    const sx = { da: [0, h], dir: [0, -1], n: h }, sopra = { da: [0, 0], dir: [1, 0], n: w };
    const dxDritto = { da: [w, h], dir: [0, -1], n: h }, dxRov = { da: [w, 0], dir: [0, 1], n: h };
    const sottoDritto = { da: [0, h], dir: [1, 0], n: w }, sottoRov = { da: [w, h], dir: [-1, 0], n: w };
    const lr = (rov) => ({ a: sx, b: rov ? dxRov : dxDritto, col: 'a', segni: 1 });
    const tb = (rov) => ({ a: sopra, b: rov ? sottoRov : sottoDritto, col: 'b', segni: 2 });
    switch (sup) {
      case 'piano': return [];
      case 'cilindro': return [lr(false)];
      case 'mobius': return [lr(true)];
      case 'toro': return [lr(false), tb(false)];
      case 'klein': return [lr(false), tb(true)];
      case 'rp2': return [lr(true), tb(true)];
      case 'sfera':
        // la busta: sopra con destra e sinistra con sotto, piegando lungo la diagonale
        // da (0, h) a (w, 0); serve w = h
        return [
          { a: { da: [0, 0], dir: [1, 0], n: w }, b: { da: [w, h], dir: [0, -1], n: h }, col: 'a', segni: 1 },
          { a: { da: [0, 0], dir: [0, 1], n: h }, b: { da: [w, h], dir: [-1, 0], n: w }, col: 'b', segni: 2 }
        ];
      case 'bitoro': {
        // la L: colonna di sinistra larga a, riga di sopra alta c; tutto per traslazione
        const [a, c] = p.L;
        return [
          { a: { da: [0, c], dir: [0, -1], n: c }, b: { da: [a, c], dir: [0, -1], n: c }, col: 'a', segni: 1 },
          { a: { da: [0, h], dir: [0, -1], n: h - c }, b: { da: [w, h], dir: [0, -1], n: h - c }, col: 'a', segni: 2 },
          { a: { da: [0, 0], dir: [1, 0], n: a }, b: { da: [0, h], dir: [1, 0], n: a }, col: 'b', segni: 1 },
          { a: { da: [a, c], dir: [1, 0], n: w - a }, b: { da: [a, h], dir: [1, 0], n: w - a }, col: 'b', segni: 2 }
        ];
      }
    }
    throw new Error('superficie sconosciuta: ' + sup);
  }

  /* Quali caselle ci sono (tutte, tranne il blocco mancante della L). */
  function caselleDella(p) {
    const w = p.w, h = p.h;
    if ((p.sup || 'piano') === 'bitoro') { const [a, c] = p.L; return (i, j) => i >= 0 && j >= 0 && i < w && j < h && !(i >= a && j < c); }
    return (i, j) => i >= 0 && j >= 0 && i < w && j < h;
  }

  const FRECCE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [1, -1], NW: [-1, -1], SE: [1, 1], SW: [-1, 1] };
  const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function tipo(c) {
    if (typeof c !== 'string') return null;
    if (FRECCE[c]) return 'freccia';
    if (c === 'sole' || c === 'luna') return 'lato';
    if (c === 'mv' || c === 'mo') return 'specchio';
    if (/^[1-9][0-9]?$/.test(c)) return 'numero';
    if (/^c[0-3]$/.test(c)) return 'contorno';
    if (/^o[1-9][0-9]?$/.test(c)) return 'occhio';
    return null;
  }
  const valore = c => +c.replace(/^[co]/, '');

  function trova(p, i) { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }
  function unisci(p, a, b) { a = trova(p, a); b = trova(p, b); if (a !== b) { if (a < b) p[b] = a; else p[a] = b; } }

  // matrici 2×2 intere [m00, m01, m10, m11]: M·(x, y) = (m00 x + m01 y, m10 x + m11 y)
  const per = (M, q) => [M[0] * q[0] + M[1] * q[1], M[2] * q[0] + M[3] * q[1]];
  const trasposta = M => [M[0], M[2], M[1], M[3]];
  const uguali = (a, b) => a[0] === b[0] && a[1] === b[1];
  /* La rotazione (di un multiplo di 90°) che porta la direzione d in e. */
  function giro(d, e) {
    if (uguali(d, e)) return null;
    if (d[0] === -e[0] && d[1] === -e[1]) return [-1, 0, 0, -1];
    const R = [0, -1, 1, 0];                    // (x, y) → (−y, x)
    const q = per(R, d);
    return uguali(q, e) ? R : [0, 1, -1, 0];
  }

  /* Il grafo di una tavola: vertici e lati identificati dagli incollamenti. */
  const cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function grafo(p) {
    if (cache && cache.has(p)) return cache.get(p);
    const w = p.w, h = p.h, sup = p.sup || 'piano', S = SUP[sup];
    if (!S) throw new Error('superficie sconosciuta: ' + p.sup);
    if (S.quadrata && w !== h) throw new Error('la sfera vuole una tavola quadrata');
    if (S.conL && !(Array.isArray(p.L) && p.L[0] >= 1 && p.L[0] < w && p.L[1] >= 1 && p.L[1] < h)) throw new Error('il bitoro vuole L = [a, c]');
    const esiste = caselleDella(p);
    const NV = (w + 1) * (h + 1), NH = (h + 1) * w, NE = NH + h * (w + 1);
    const vi = (x, y) => y * (w + 1) + x;
    const hi = (x, y) => y * w + x;               // lato (x,y)-(x+1,y)
    const vti = (x, y) => NH + y * (w + 1) + x;   // lato (x,y)-(x,y+1)
    const rawEdge = (a, b) => a[1] === b[1] ? hi(Math.min(a[0], b[0]), a[1]) : vti(a[0], Math.min(a[1], b[1]));
    // le due caselle ai lati di un lato (anche fuori dalla tavola)
    const caselleLato = (a, b) => a[1] === b[1]
      ? [[Math.min(a[0], b[0]), a[1] - 1], [Math.min(a[0], b[0]), a[1]]]
      : [[a[0] - 1, Math.min(a[1], b[1])], [a[0], Math.min(a[1], b[1])]];
    const dentro = q => q[0] >= 0 && q[1] >= 0 && q[0] <= w && q[1] <= h;
    const latoEsiste = (a, b) => dentro(a) && dentro(b) && caselleLato(a, b).some(c => esiste(c[0], c[1]));
    const vertEsiste = q => dentro(q) && (esiste(q[0] - 1, q[1] - 1) || esiste(q[0], q[1] - 1) || esiste(q[0] - 1, q[1]) || esiste(q[0], q[1]));

    // i lati del bordo incollati: per ognuno la normale verso fuori e la mappa verso il gemello
    const bordi = [], cus = cuciture(p);
    const segPunto = (s, t) => [s.da[0] + t * s.dir[0], s.da[1] + t * s.dir[1]];
    const normale = (s) => {
      const a = s.da, b = segPunto(s, 1), [c1, c2] = caselleLato(a, b);
      const e1 = esiste(...c1), e2 = esiste(...c2);
      if (e1 === e2) throw new Error('cucitura non sul bordo');
      const fuori = e1 ? c2 : c1, dentroC = e1 ? c1 : c2;
      return [fuori[0] - dentroC[0], fuori[1] - dentroC[1]];
    };
    for (const cu of cus) {
      const nA = normale(cu.a), nB = normale(cu.b);
      for (let t = 0; t < cu.a.n; t++) {     // tutto il segmento deve stare sul bordo
        const [c1, c2] = caselleLato(segPunto(cu.a, t), segPunto(cu.a, t + 1)), [d1, d2] = caselleLato(segPunto(cu.b, t), segPunto(cu.b, t + 1));
        if (esiste(...c1) === esiste(...c2) || esiste(...d1) === esiste(...d2)) throw new Error('cucitura non sul bordo');
      }
      // M·dirA = dirB, M·nA = −nB: M = [dirB | −nB]·[dirA | nA]ᵀ
      const B = [cu.b.dir[0], -nB[0], cu.b.dir[1], -nB[1]], A = [cu.a.dir[0], nA[0], cu.a.dir[1], nA[1]];
      const At = trasposta(A);
      const M = [B[0] * At[0] + B[1] * At[2], B[0] * At[1] + B[1] * At[3], B[2] * At[0] + B[3] * At[2], B[2] * At[1] + B[3] * At[3]];
      const Ma = per(M, cu.a.da), t = [cu.b.da[0] - Ma[0], cu.b.da[1] - Ma[1]];
      const Mi = trasposta(M), Mit = per(Mi, t), ti = [-Mit[0], -Mit[1]];
      const latoA = { seg: cu.a, nrm: nA, M, t, col: cu.col, segni: cu.segni };
      const latoB = { seg: cu.b, nrm: nB, M: Mi, t: ti, col: cu.col, segni: cu.segni };
      latoA.gemello = latoB; latoB.gemello = latoA;
      bordi.push(latoA, latoB);
    }

    const pv = Array.from({ length: NV }, (_, i) => i);
    const pe = Array.from({ length: NE }, (_, i) => i);
    for (const cu of cus) {
      for (let t = 0; t <= cu.a.n; t++) unisci(pv, vi(...segPunto(cu.a, t)), vi(...segPunto(cu.b, t)));
      for (let t = 0; t < cu.a.n; t++) unisci(pe, rawEdge(segPunto(cu.a, t), segPunto(cu.a, t + 1)), rawEdge(segPunto(cu.b, t), segPunto(cu.b, t + 1)));
    }
    const V = new Int32Array(NV), E = new Int32Array(NE);
    for (let i = 0; i < NV; i++) V[i] = trova(pv, i);
    for (let i = 0; i < NE; i++) E[i] = trova(pe, i);
    const vid = (x, y) => V[vi(x, y)];
    const eid = (a, b) => E[rawEdge(a, b)];
    // coordinate (una copia) di ogni vertice canonico; angolo attorno al vertice in quarti di giro
    const coord = {}, angolo = {};
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
      if (!vertEsiste([x, y])) continue;
      const k = vid(x, y);
      if (!coord[k]) coord[k] = [x, y];
      const n = [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]].filter(c => esiste(...c)).length;
      angolo[k] = (angolo[k] || 0) + n;
    }
    const singolari = new Set();
    for (const k in angolo) if (angolo[k] > 4) singolari.add(+k);
    // lati interrotti
    const rotti = new Set();
    for (const g of (p.gaps || [])) rotti.add(eid([g[0], g[1]], [g[2], g[3]]));
    // estremi e caselle di ogni lato canonico
    const estremi = {}, caselleDi = {};
    const metti = (a, b) => { if (!latoEsiste(a, b)) return; const e = eid(a, b); if (!estremi[e]) estremi[e] = [vid(...a), vid(...b)]; };
    for (let y = 0; y <= h; y++) for (let x = 0; x < w; x++) metti([x, y], [x + 1, y]);
    for (let y = 0; y < h; y++) for (let x = 0; x <= w; x++) metti([x, y], [x, y + 1]);
    const lati = [], celle = [];   // per casella: i quattro lati canonici (su, giù, sinistra, destra)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!esiste(i, j)) { lati.push(null); continue; }
      const c = j * w + i, l = [eid([i, j], [i + 1, j]), eid([i, j + 1], [i + 1, j + 1]), eid([i, j], [i, j + 1]), eid([i + 1, j], [i + 1, j + 1])];
      lati.push(l); celle.push(c);
      for (const e of l) (caselleDi[e] || (caselleDi[e] = [])).push(c);
    }
    // vicini nel grafo (senza i lati interrotti e i punti singolari)
    const adj = {};
    for (const e in estremi) {
      const k = +e; if (rotti.has(k)) continue;
      const [a, b] = estremi[k];
      if (a === b || singolari.has(a) || singolari.has(b)) continue;
      (adj[a] || (adj[a] = [])).push([b, k]);
      (adj[b] || (adj[b] = [])).push([a, k]);
    }
    const G = { p, w, h, S, sup, vid, eid, coord, angolo, singolari, rotti, estremi, caselleDi, lati, celle, adj, bordi,
      esiste, latoEsiste, vertEsiste, NE, start: vid(...p.start), end: p.end ? vid(...p.end) : null, anello: !p.end };
    if (cache) cache.set(p, G);
    return G;
  }

  const dentro = (G, q) => q[0] >= 0 && q[1] >= 0 && q[0] <= G.w && q[1] <= G.h;

  /* Il lato del bordo incollato su cui sta il punto q, con la normale verso fuori nrm (o null). */
  function bordoDi(G, q, nrm) {
    for (const L of G.bordi) {
      if (nrm && !uguali(L.nrm, nrm)) continue;
      const s = L.seg, dx = q[0] - s.da[0], dy = q[1] - s.da[1], t = dx * s.dir[0] + dy * s.dir[1];
      if (t < 0 || t > s.n || dx !== t * s.dir[0] || dy !== t * s.dir[1]) continue;
      return L;
    }
    return null;
  }
  const mappa = (L, q) => { const m = per(L.M, q); return [m[0] + L.t[0], m[1] + L.t[1]]; };

  /* Un passo della linea dalla copia r di un vertice, nella direzione d dello schermo.
     Se si esce da un lato incollato si rientra dal lato gemello: a è la copia di r da cui si
     riparte, dd la direzione del passo da lì (sulla sfera gira) e giro la rotazione che porta
     d in dd (null se non gira). Restituisce null se il passo non si può fare. */
  function passo(G, r, d) {
    let a = r, b = [r[0] + d[0], r[1] + d[1]], dd = d;
    if (!G.latoEsiste(a, b)) {
      const L = bordoDi(G, r, d);
      if (!L) return null;
      a = mappa(L, r); dd = per(L.M, d); b = [a[0] + dd[0], a[1] + dd[1]];
      if (!G.latoEsiste(a, b)) return null;
    }
    const e = G.eid(a, b);
    if (G.rotti.has(e)) return null;
    const v = G.vid(b[0], b[1]);
    if (G.singolari.has(v) || G.singolari.has(G.vid(a[0], a[1]))) return null;
    return { r, a, b, d, dd, giro: giro(d, dd), j: [a[0] - r[0], a[1] - r[1]], v, e };
  }

  /* Se il lato a–b sta su un lato incollato, la sua copia sul gemello (per disegnarlo due volte). */
  function gemello(G, a, b) {
    const d = [b[0] - a[0], b[1] - a[1]];
    for (const L of G.bordi) {
      const s = L.seg;
      if (!(uguali(d, s.dir) || (d[0] === -s.dir[0] && d[1] === -s.dir[1]))) continue;
      if (bordoDi({ bordi: [L] }, a) && bordoDi({ bordi: [L] }, b)) return [mappa(L, a), mappa(L, b)];
    }
    return null;
  }

  /* Zone: caselle collegate dai lati che la linea non usa. Restituisce l'indice
     della zona di ogni casella (−1 per le caselle che non ci sono) e l'elenco delle zone. */
  function zone(G, usati) {
    const n = G.w * G.h, pc = Array.from({ length: n }, (_, i) => i);
    for (const e in G.caselleDi) {
      if (usati.has(+e)) continue;
      const cs = G.caselleDi[e];
      for (let k = 1; k < cs.length; k++) unisci(pc, cs[0], cs[k]);
    }
    const id = new Int32Array(n).fill(-1), mappaZ = {}, elenco = [];
    for (const c of G.celle) {
      const r = trova(pc, c);
      if (mappaZ[r] == null) { mappaZ[r] = elenco.length; elenco.push([]); }
      id[c] = mappaZ[r]; elenco[mappaZ[r]].push(c);
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

  /* I raggi di una casella (solo sul piano): per ognuna delle quattro direzioni, i lati che lo
     sguardo attraversa uno dopo l'altro, finché ci sono caselle. */
  function raggi(G, i, j) {
    const out = [];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const r = [];
      for (let k = 1; G.esiste(i + k * dx, j + k * dy); k++) {
        const x = i + (k - 1) * dx, y = j + (k - 1) * dy;   // dalla casella (x, y) alla prossima
        if (dx === 1) r.push(G.eid([x + 1, y], [x + 1, y + 1]));
        else if (dx === -1) r.push(G.eid([x, y], [x, y + 1]));
        else if (dy === 1) r.push(G.eid([x, y + 1], [x + 1, y + 1]));
        else r.push(G.eid([x, y], [x + 1, y]));
      }
      out.push(r);
    }
    return out;
  }
  /* Quante caselle vede la casella (i, j). usato(e) dice se la linea usa il lato e. */
  function vede(G, i, j, usato) {
    let n = 0;
    for (const r of raggi(G, i, j)) for (const e of r) { if (usato(e)) break; n++; }
    return n;
  }

  /* Controllo delle regole. cammino = { vs: [vertici canonici], es: [lati canonici] }.
     Restituisce { ok, male: ['i,j', ...] } con le caselle dei simboli che non vanno. */
  function controlla(p, cammino) {
    const G = grafo(p), w = G.w;
    const usati = new Set(cammino.es);
    let Z = null;
    const zon = () => Z || (Z = zone(G, usati));
    const male = [];
    const s = p.s || {};
    const somma = {}, frecceIn = {};
    let lato = null;
    for (const k in s) {
      const [i, j] = k.split(',').map(Number), c = j * w + i, t = tipo(s[k]);
      if (t === 'contorno') { if (G.lati[c].filter(e => usati.has(e)).length !== valore(s[k])) male.push(k); continue; }
      if (t === 'occhio') { if (vede(G, i, j, e => usati.has(e)) !== valore(s[k])) male.push(k); continue; }
      const z = zon().id[c];
      if (t === 'freccia') {
        const v = FRECCE[s[k]];
        if (!somma[z]) { somma[z] = [0, 0]; frecceIn[z] = []; }
        somma[z][0] += v[0]; somma[z][1] += v[1]; frecceIn[z].push(k);
      }
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
    for (const z in somma) if (somma[z][0] || somma[z][1]) male.push(...frecceIn[z]);
    return { ok: male.length === 0, male };
  }

  /* Potatura per la ricerca dei cammini. Un lato si può ancora aggiungere solo se ognuno dei suoi
     estremi è libero (non ancora toccato dalla linea, o il cerchio di un anello) oppure è la punta
     della linea. Quindi, per un cammino a metà:
       contorni  i lati già fatti sono un minimo e quelli fatti o ancora possibili un massimo;
       occhi     lo sguardo fermato dai lati fatti è un massimo, quello fermato dai lati fatti o
                 ancora possibili è un minimo.
     Se il numero sta fuori da questi limiti il cammino non può diventare giusto e si scarta.
     Restituisce null se la tavola non ha simboli di questo tipo. */
  function potatura(p) {
    const G = grafo(p), s = p.s || {}, contorni = [], occhi = [];
    for (const k in s) {
      const [i, j] = k.split(',').map(Number), t = tipo(s[k]);
      if (t === 'contorno') contorni.push([G.lati[j * G.w + i], valore(s[k])]);
      else if (t === 'occhio') occhi.push([raggi(G, i, j), valore(s[k])]);
    }
    if (!contorni.length && !occhi.length) return null;
    const E = G.estremi, anello = G.anello, st = G.start;
    return (uso, vis, testa) => {
      const libero = q => !vis[q] || q === testa || (anello && q === st);
      const forse = e => uso[e] || (!G.rotti.has(e) && libero(E[e][0]) && libero(E[e][1]) && !G.singolari.has(E[e][0]) && !G.singolari.has(E[e][1]));
      for (const [l, n] of contorni) {
        let c = 0, f = 0;
        for (const e of l) { c += uso[e]; if (forse(e)) f++; }
        if (c > n || f < n) return true;
      }
      for (const [rs, n] of occhi) {
        let mx = 0, mn = 0;
        for (const r of rs) {
          for (const e of r) { if (uso[e]) break; mx++; }
          for (const e of r) { if (forse(e)) break; mn++; }
        }
        if (mx < n || mn > n) return true;
      }
      return false;
    };
  }

  /* Il cammino è una linea giusta per la tavola (dal cerchio all'uscita, o anello)? */
  function valido(p, cammino) {
    const G = grafo(p), vs = cammino && cammino.vs, es = cammino && cammino.es;
    if (!Array.isArray(vs) || !Array.isArray(es) || es.length !== vs.length - 1 || vs.length < 2) return false;
    if (vs[0] !== G.start || G.singolari.has(G.start)) return false;
    const fine = vs[vs.length - 1];
    if (G.anello ? fine !== G.start || es.length < 2 : fine !== G.end) return false;
    const visti = new Set(), lati = new Set();
    for (let k = 0; k < vs.length; k++) {
      const v = vs[k];
      if (G.singolari.has(v)) return false;
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
     se f restituisce true la ricerca si ferma. pota(uso), se c'è, scarta i cammini a metà
     che non possono più diventare giusti (uso[e] = 1 per i lati usati). */
  function cammini(p, f, pota) {
    const G = grafo(p), vs = [G.start], es = [], uso = new Uint8Array(G.NE), vis = new Uint8Array((G.w + 1) * (G.h + 1));
    let stop = false;
    if (G.singolari.has(G.start)) return;
    vis[G.start] = 1;
    (function dfs(u) {
      for (const [v, e] of (G.adj[u] || [])) {
        if (stop) return;
        if (G.anello && v === G.start) {
          if (es.length >= 1 && e !== es[es.length - 1]) {
            vs.push(v); es.push(e); uso[e] = 1;
            if (!(pota && pota(uso, vis, v)) && f(vs, es)) stop = true;
            uso[e] = 0; vs.pop(); es.pop();
          }
          continue;
        }
        if (vis[v]) continue;
        vs.push(v); es.push(e); uso[e] = 1; vis[v] = 1;
        if (!(pota && pota(uso, vis, v))) {
          if (!G.anello && v === G.end) { if (f(vs, es)) stop = true; }
          else dfs(v);
        }
        vis[v] = 0; uso[e] = 0; vs.pop(); es.pop();
      }
    })(G.start);
  }

  /* Tutte le soluzioni diverse (per insieme di lati). totali conta le linee guardate fino in fondo. */
  function soluzioni(p, limite) {
    const trovate = new Map();
    let totali = 0;
    cammini(p, (vs, es) => {
      totali++;
      if (!controlla(p, { vs, es }).ok) return false;
      const k = chiave(es);
      if (!trovate.has(k)) trovate.set(k, { vs: vs.slice(), es: es.slice(), k });
      return limite != null && trovate.size >= limite;
    }, potatura(p));
    return { totali, soluzioni: [...trovate.values()] };
  }

  const TR = { SUP, FRECCE, DV, tipo, valore, cuciture, grafo, passo, gemello, bordoDi, mappa, giro, per, trasposta, zone, parti,
    raggi, vede, controlla, potatura, valido, chiave, cammini, soluzioni, dentro };
  if (typeof module !== 'undefined' && module.exports) module.exports = TR;
  root.TR = TR;
})(typeof self !== 'undefined' ? self : this);
