// Prove di MENTAL senza browser: date di Roma (anche nei giorni dell'ora legale), casualità riproducibile,
// ogni motore contro una forza bruta indipendente (griglie piccole, codici, file, monete, tasti, brocche),
// i risolutori «umani» che non sbagliano mai (anche passo per passo nel prato fiorito), gli enigmi del
// catalogo con le loro verifiche, il palinsesto su anni simulati, tutte le sfide pubblicate e quelle in
// riserva ricontrollate da zero, e lo strumento che aggiunge o rimescola giorni senza toccare quelli già passati.
// Uso, dalla cartella della repo:  node prove/mental.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const RADICE = path.join(__dirname, '..');
const S = require(path.join(RADICE, 'strumenti', 'mental.js'));
const M = S.M, E = M.motori;
S.leggiTutto();                                       // le sfide pubblicate in M.dati
let ok = 0; const prova = (nome, f) => { const t = Date.now(); f(); ok++; console.log('ok  ', nome, `(${((Date.now() - t) / 1000).toFixed(1)} s)`); };
const J = x => JSON.stringify(x);
const R = M.prng('prove-mental');

/* ---------------- Date ---------------- */
prova('date di Roma: cambio a mezzanotte italiana, anche con l’ora legale', () => {
  assert.equal(M.giornoRoma(Date.parse('2026-10-24T21:59:59Z')), '2026-10-24');   // ora legale: UTC+2
  assert.equal(M.giornoRoma(Date.parse('2026-10-24T22:00:00Z')), '2026-10-25');
  assert.equal(M.giornoRoma(Date.parse('2026-10-25T22:59:59Z')), '2026-10-25');   // ora solare: UTC+1
  assert.equal(M.giornoRoma(Date.parse('2026-10-25T23:00:00Z')), '2026-10-26');
  // il 25 ottobre 2026 dura 25 ore, il 28 marzo 2027 23
  assert.equal(M.prossimaMezzanotte(Date.parse('2026-10-24T22:00:00Z')) - Date.parse('2026-10-24T22:00:00Z'), 25 * 3600e3);
  assert.equal(M.prossimaMezzanotte(Date.parse('2026-10-25T10:00:00Z')), Date.parse('2026-10-25T23:00:00Z'));
  assert.equal(M.prossimaMezzanotte(Date.parse('2027-03-28T10:00:00Z')), Date.parse('2027-03-28T22:00:00Z'));
  assert.equal(M.prossimaMezzanotte(Date.parse('2027-03-27T23:00:00Z')) - Date.parse('2027-03-27T23:00:00Z'), 23 * 3600e3);
  assert.equal(M.prossimaMezzanotte(Date.parse('2026-12-31T22:59:59Z')), Date.parse('2026-12-31T23:00:00Z'));
  // a caso: la mezzanotte trovata è l'istante esatto del cambio
  for (let k = 0; k < 300; k++) {
    const t = Date.parse('2026-01-01T00:00:00Z') + R(730) * 864e5 + R(864e5);
    const m = M.prossimaMezzanotte(t);
    assert.ok(m > t && M.giornoRoma(m) !== M.giornoRoma(t) && M.giornoRoma(m - 1000) === M.giornoRoma(t));
    assert.equal(M.giornoRoma(m), M.piuGiorni(M.giornoRoma(t), 1));
  }
  assert.equal(M.numero(M.LANCIO), 1); assert.equal(M.numero('2026-12-31'), 71); assert.equal(M.dataDelNumero(71), '2026-12-31');
  assert.equal(M.piuGiorni('2026-10-24', 2), '2026-10-26'); assert.equal(M.piuGiorni('2026-12-31', 1), '2027-01-01'); assert.equal(M.piuGiorni('2028-02-28', 1), '2028-02-29');
  assert.ok(M.dataValida('2026-10-22') && !M.dataValida('2026-02-30') && !M.dataValida('2026-1-2') && !M.dataValida(null));
  assert.equal(M.dataLunga('2026-10-22'), 'giovedì 22 ottobre');
  assert.deepEqual([M.tempo(0), M.tempo(59999), M.tempo(61000), M.tempo(3725000)], ['0:00', '0:59', '1:01', '1:02:05']);
});
prova('casualità: stesso seme, stessa sequenza; mescola è una permutazione', () => {
  const a = M.prng('x'), b = M.prng('x'), c = M.prng('y');
  const sa = Array.from({ length: 50 }, () => a(1000)), sb = Array.from({ length: 50 }, () => b(1000)), sc = Array.from({ length: 50 }, () => c(1000));
  assert.deepEqual(sa, sb); assert.notDeepEqual(sa, sc);
  const m = M.prng('z').mescola([...Array(20).keys()]); assert.deepEqual(m.slice().sort((x, y) => x - y), [...Array(20).keys()]);
  // uniformità grossolana di r(7) su semi diversi
  const cnt = Array(7).fill(0); for (let k = 0; k < 7000; k++) cnt[M.prng('u' + k)(7)]++;
  assert.ok(cnt.every(x => x > 850 && x < 1150), J(cnt));
});

/* ---------------- Forze brute ---------------- */
function permutazioni(n) { const out = [], a = [...Array(n).keys()]; const g = k => { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; g(k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; g(0); return out; }
function regioniACaso(n, r) {                         // n regioni connesse che coprono la griglia
  const reg = Array(n * n).fill(-1), semi = r.mescola([...Array(n * n).keys()]).slice(0, n);
  semi.forEach((s, g) => { reg[s] = g; });
  for (let libere = n * n - n; libere > 0;) {
    const i = r(n * n); if (reg[i] >= 0) continue;
    const v = M.intorno(n, i, false).filter(j => reg[j] >= 0); if (!v.length) continue;
    reg[i] = reg[r.scegli(v)]; libere--;
  }
  return reg;
}
const quadrati = n => { const out = [], v = Array(n * n).fill(0); const g = i => { if (i === n * n) { out.push(v.slice()); return; } const r = Math.floor(i / n), c = i % n; for (let d = 1; d <= n; d++) { let ok = true; for (let k = 0; k < n; k++) if (v[r * n + k] === d || v[k * n + c] === d) ok = false; if (!ok) continue; v[i] = d; g(i + 1); v[i] = 0; } }; g(0); return out; };

prova('corone: conteggio contro tutte le permutazioni (n = 5, 6, 7)', () => {
  for (const n of [5, 6, 7]) {
    const P = permutazioni(n);
    for (let t = 0; t < 60; t++) {
      const p = { n, reg: regioniACaso(n, R) };
      const bf = P.filter(q => q.every((c, r) => r === 0 || Math.abs(q[r - 1] - c) > 1) && new Set(q.map((c, r) => p.reg[r * n + c])).size === n).length;
      assert.equal(E.corone.conta(p, 1000), bf);
      if (bf === 1) { const ris = E.corone.risolvi(p); if (ris.risolto) assert.equal(J(ris.sol), J(E.corone.conta.ultima)); }
    }
  }
});
prova('stelle: conteggio contro una forza bruta (6×6 con due stelle)', () => {
  const n = 6, k = 2, righe = [];
  for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) righe.push([a, b]);
  let unici = 0;
  for (let t = 0; t < 25; t++) {
    const p = { n, k, reg: regioniACaso(n, R) };
    let bf = 0;
    const pos = [];
    const g = r => {
      if (r === n) {
        const col = Array(n).fill(0), reg = Array(n).fill(0);
        pos.forEach((q, rr) => q.forEach(c => { col[c]++; reg[p.reg[rr * n + c]]++; }));
        if (col.every(x => x === k) && reg.every(x => x === k)) bf++;
        return;
      }
      for (const q of righe) {
        if (r > 0 && q.some(c => pos[r - 1].some(c2 => Math.abs(c - c2) <= 1))) continue;
        pos.push(q); g(r + 1); pos.pop();
      }
    };
    g(0);
    assert.equal(E.stelle.conta(p, 100000), bf);
    if (bf === 1) { unici++; const ris = E.stelle.risolvi(p); if (ris.risolto) assert.equal(J(ris.sol), J(E.stelle.conta.ultima)); }
  }
});
prova('binario: conteggio contro tutte le 4.140 griglie 6×6', () => {
  const n = 6, tutte = [];
  const Rv = []; for (let m = 0; m < 64; m++) { const a = [0, 1, 2, 3, 4, 5].map(i => (m >> (5 - i)) & 1); if (a.filter(x => x).length !== 3) continue; let ok = true; for (let i = 0; i < 4; i++) if (a[i] === a[i + 1] && a[i] === a[i + 2]) ok = false; if (ok) Rv.push(a); }
  // righe valide una sotto l'altra, potando le colonne (mai tre uguali, mai più di tre uguali); alla fine
  // decidono le regole del motore (conflitti), che controllano anche righe e colonne tutte diverse
  const gr = [];
  const g = k => {
    if (k === 6) { const v = gr.flat(); if (E.binario.conflitti({ n }, { c: v }).length === 0) tutte.push(v); return; }
    for (const a of Rv) {
      let ok = true;
      for (let c = 0; c < 6 && ok; c++) { if (k >= 2 && gr[k - 1][c] === a[c] && gr[k - 2][c] === a[c]) ok = false; let u = a[c]; for (const r of gr) u += r[c]; if (u > 3 || k + 1 - u > 3) ok = false; }
      if (!ok) continue;
      gr.push(a); g(k + 1); gr.pop();
    }
  };
  g(0);
  assert.equal(tutte.length, 4140);
  for (let t = 0; t < 400; t++) {
    const sol = R.scegli(tutte), p = { n, g: sol.map(x => (R.f() < .35 ? x : -1)) };
    const bf = tutte.filter(q => q.every((x, i) => p.g[i] < 0 || p.g[i] === x)).length;
    assert.equal(E.binario.conta(p, 30), Math.min(bf, 30));
    if (bf === 1) { const ris = E.binario.risolvi(p); if (ris.risolto) assert.equal(J(ris.sol), J(sol)); }
  }
});
prova('sudoku: conteggio contro un risolutore ingenuo indipendente', () => {
  const ingenuo = (g, cap) => {
    const v = g.slice(); let tot = 0;
    const ok = (i, d) => { const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3; for (let k = 0; k < 9; k++) if (v[r * 9 + k] === d || v[k * 9 + c] === d || v[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d) return false; return true; };
    const giro = () => { const i = v.indexOf(0); if (i < 0) { tot++; return tot >= cap; } for (let d = 1; d <= 9; d++) if (ok(i, d)) { v[i] = d; if (giro()) return true; v[i] = 0; } return false; };
    giro(); return tot;
  };
  const pubblicati = Object.values(M.dati).filter(s => s.gioco === 'sudoku');
  assert.ok(pubblicati.length > 0);
  for (const s of pubblicati) {
    assert.equal(ingenuo(s.p.g, 2), 1);
    for (let t = 0; t < 3; t++) {
      const g = s.p.g.slice(); const dati = g.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
      for (const i of R.mescola(dati).slice(0, 4)) g[i] = 0;
      assert.equal(E.sudoku.conta({ g }, 2), Math.min(2, ingenuo(g, 2)));
    }
  }
});
prova('grattacieli: conteggio contro tutti i quadrati latini 4×4 e 5×5', () => {
  for (const n of [4, 5]) {
    const Q = quadrati(n);
    for (let t = 0; t < (n === 4 ? 300 : 60); t++) {
      const sol = R.scegli(Q), riga = k => sol.slice(k * n, k * n + n), col = k => Array.from({ length: n }, (_, q) => sol[q * n + k]);
      const pr = () => R.f() < .45;
      const p = { n, su: [...Array(n).keys()].map(k => (pr() ? E.grattacieli.visibili(col(k)) : 0)), giu: [...Array(n).keys()].map(k => (pr() ? E.grattacieli.visibili(col(k).reverse()) : 0)), sx: [...Array(n).keys()].map(k => (pr() ? E.grattacieli.visibili(riga(k)) : 0)), dx: [...Array(n).keys()].map(k => (pr() ? E.grattacieli.visibili(riga(k).reverse()) : 0)), dati: sol.map(x => (R.f() < .08 ? x : 0)) };
      const bf = Q.filter(q => { const R_ = k => q.slice(k * n, k * n + n), C = k => Array.from({ length: n }, (_, z) => q[z * n + k]); for (let k = 0; k < n; k++) { if (p.su[k] && E.grattacieli.visibili(C(k)) !== p.su[k]) return false; if (p.giu[k] && E.grattacieli.visibili(C(k).reverse()) !== p.giu[k]) return false; if (p.sx[k] && E.grattacieli.visibili(R_(k)) !== p.sx[k]) return false; if (p.dx[k] && E.grattacieli.visibili(R_(k).reverse()) !== p.dx[k]) return false; } return p.dati.every((d, i) => !d || d === q[i]); }).length;
      assert.equal(E.grattacieli.conta(p, 100000), bf);
      if (bf === 1) { const ris = E.grattacieli.risolvi(p); if (ris.risolto) assert.equal(J(ris.sol), J(sol)); }
    }
  }
});
prova('futoshiki: conteggio contro tutti i quadrati latini 4×4 e 5×5', () => {
  for (const n of [4, 5]) {
    const Q = quadrati(n);
    for (let t = 0; t < (n === 4 ? 300 : 60); t++) {
      const sol = R.scegli(Q), dis = [];
      for (let i = 0; i < n * n; i++) for (const j of [i % n < n - 1 ? i + 1 : -1, i + n < n * n ? i + n : -1]) if (j >= 0 && R.f() < .35) dis.push(sol[i] < sol[j] ? [i, j] : [j, i]);
      const p = { n, dis, dati: sol.map(x => (R.f() < .1 ? x : 0)) };
      assert.equal(E.futoshiki.valida(p), null);
      const bf = Q.filter(q => p.dis.every(([a, b]) => q[a] < q[b]) && p.dati.every((d, i) => !d || d === q[i])).length;
      assert.equal(E.futoshiki.conta(p, 100000), bf);
      if (bf === 1) { const ris = E.futoshiki.risolvi(p); if (ris.risolto) assert.equal(J(ris.sol), J(sol)); }
    }
  }
  assert.ok(E.futoshiki.valida({ n: 4, dis: [[3, 4]] }), 'un segno tra fine riga e inizio della successiva non è valido');
});
prova('nonogramma: analisi di una fila e conteggio contro la forza bruta (4×4, 5×4)', () => {
  const N = E.nonogramma;
  for (let t = 0; t < 5000; t++) {
    const L = 1 + R(9), pieno = Array.from({ length: L }, () => R(2)), b = N.blocchi(pieno);
    const s = Array.from({ length: L }, (_, i) => (R.f() < .3 ? (R.f() < .85 ? pieno[i] : 1 - pieno[i]) : -1));
    const pp = Array(L).fill(false), pv = Array(L).fill(false); let alcuno = false;
    for (let m = 0; m < (1 << L); m++) { const a = Array.from({ length: L }, (_, i) => (m >> i) & 1); if (s.some((x, i) => x >= 0 && x !== a[i])) continue; if (J(N.blocchi(a)) !== J(b)) continue; alcuno = true; a.forEach((x, i) => { if (x) pp[i] = true; else pv[i] = true; }); }
    const an = N.analizza(s, b);
    if (!alcuno) assert.equal(an, null); else assert.equal(J(an), J([pp, pv]));
  }
  for (const [w, h] of [[4, 4], [5, 4], [5, 5]]) for (let t = 0; t < 40; t++) {
    const a = Array.from({ length: w * h }, () => (R.f() < .5 ? 1 : 0));
    const p = { w, h, righe: Array.from({ length: h }, (_, y) => N.blocchi(a.slice(y * w, y * w + w))), colonne: Array.from({ length: w }, (_, x) => N.blocchi(Array.from({ length: h }, (_, y) => a[y * w + x]))) };
    // forza bruta: per ogni riga tutte le sequenze di w caselle con i suoi blocchi, poi le colonne
    const tutte = Array.from({ length: 1 << w }, (_, m) => Array.from({ length: w }, (_, i) => (m >> i) & 1));
    const perRiga = p.righe.map(b => tutte.filter(q => J(N.blocchi(q)) === J(b)));
    let bf = 0; const scelte = [];
    const g = y => {
      if (y === h) { for (let x = 0; x < w; x++) if (J(N.blocchi(scelte.map(q => q[x]))) !== J(p.colonne[x])) return; bf++; return; }
      for (const q of perRiga[y]) { scelte.push(q); g(y + 1); scelte.pop(); }
    };
    g(0);
    assert.equal(N.conta(p, 100000), bf);
    if (bf === 1) { const ris = N.risolvi(p); if (ris.risolto) assert.equal(J(ris.sol), J(a)); }
  }
});
prova('prato fiorito: ogni deduzione del risolutore vale in tutti i campi compatibili (5×4, passo per passo)', () => {
  const C = E.campo, w = 5, h = 4, N = w * h, V = Array.from({ length: N }, (_, i) => C.vicini(w, h, i));
  let controllati = 0;
  for (let t = 0; t < 300; t++) {
    const k = 3 + R(2), via = R(N), vietate = new Set([via, ...V[via]]);
    const libere = R.mescola([...Array(N).keys()].filter(i => !vietate.has(i))); if (libere.length < k) continue;
    const mine = libere.slice(0, k).sort((a, b) => a - b), p = { w, h, seme: 's' + t, mine: C.codifica(mine, w, h, 's' + t), via };
    assert.deepEqual(C.decodifica(p), mine);
    const num = C.numeri(w, h, mine), aperte = Array(N).fill(false), band = new Set(), viste = new Set();
    C.apri(w, h, num, aperte, via);
    // tutti gli insiemi di k mine; si tengono quelli compatibili con quello che si vede (che cresce soltanto)
    let comp = []; M.combinazioni([...Array(N).keys()], k, x => { comp.push(new Set(x)); });
    const aggiorna = () => {
      for (let i = 0; i < N; i++) if (aperte[i] && !viste.has(i)) { viste.add(i); comp = comp.filter(ms => !ms.has(i) && V[i].filter(j => ms.has(j)).length === num[i]); }
      for (const i of band) comp = comp.filter(ms => ms.has(i));
    };
    aggiorna();
    const ris = C.risolvi(p);
    for (const ps of ris.passi) {
      for (const i of ps.sicure || []) assert.ok(comp.every(ms => !ms.has(i)), 'casella sicura in tutti i campi compatibili');
      for (const i of ps.mine || []) assert.ok(comp.every(ms => ms.has(i)), 'mina in tutti i campi compatibili');
      for (const i of ps.sicure || []) C.apri(w, h, num, aperte, i);
      for (const i of ps.mine || []) band.add(i);
      aggiorna(); controllati++;
    }
    if (ris.risolto) assert.equal(comp.length, 1);
  }
  assert.ok(controllati > 200, 'passi controllati: ' + controllati);
});
prova('sinceri e bugiardi: il risolutore non sbaglia mai e le frasi sono dette giuste', () => {
  const K = E.cavalieri;
  for (const liv of ['impegnativa', 'esperta', 'estrema']) for (let t = 0; t < 25; t++) {
    const g = K.genera(R, liv); assert.ok(g, liv);
    assert.equal(K.conta(g.p, 3), 1);
    assert.equal(J(g.ris.sol), J(K.conta.ultima));
    assert.ok(K.coerente(g.p, g.ris.sol));
    g.p.frasi.forEach((fr, i) => {
      assert.equal(K.vera(fr, g.ris.sol), g.ris.sol[i] === 1, 'chi è sincero dice il vero, chi mente il falso');
      const tx = K.testo(g.p, i); assert.ok(/^[A-ZÈ].*\.$/.test(tx) && !/undefined|NaN/.test(tx), tx);
    });
  }
  // casi scritti a mano: «X mente» detto da un sincero; «io mento» è impossibile; frase vuota
  const p = { gente: [{ nome: 'Ada', f: true }, { nome: 'Bruno', f: false }], frasi: [{ t: 'tipo', x: 1, v: 0 }, { t: 'stesso', x: 0, y: 1 }] };
  assert.equal(K.conta(p, 5), 1); assert.equal(J(K.conta.ultima), J([1, 0]));
  assert.equal(K.testo(p, 0), 'Bruno è bugiardo.'); assert.equal(K.testo(p, 1), 'Io e Ada siamo dello stesso tipo.');
  p.frasi[0] = { t: 'almeno', xs: [0, 1], v: 0 };
  assert.equal(K.testo(p, 0), 'Tra Bruno e me c’è almeno un bugiardo.');
});

/* ---------------- Giochi nuovi contro forze brute ---------------- */
// Codice: la risposta di un tentativo calcolata in un altro modo (accoppiando i simboli uno per uno)
function rispostaLenta(t, s) {
  const usatoT = t.map(() => false), usatoS = s.map(() => false); let n = 0, b = 0;
  t.forEach((x, i) => { if (x === s[i]) { n++; usatoT[i] = usatoS[i] = true; } });
  t.forEach((x, i) => { if (usatoT[i]) return; const j = s.findIndex((y, k) => !usatoS[k] && y === x); if (j >= 0) { usatoS[j] = true; b++; } });
  return [n, b];
}
function tuttiICodici(L, K, rip) {
  let out = [[]];
  for (let i = 0; i < L; i++) out = [].concat(...out.map(c => [...Array(K).keys()].filter(k => rip || !c.includes(k)).map(k => c.concat([k]))));
  return out;
}
const compatibiliCodice = (p, prove) => tuttiICodici(p.L, p.K, p.rip).filter(s => prove.every(x => J(rispostaLenta(x.c, s)) === J([x.n, x.b])));
prova('codice: risposte contro un conteggio indipendente; codice unico, nessun tentativo è il codice, ogni tentativo serve', () => {
  for (let k = 0; k < 3000; k++) {
    const L = 3 + R(3), K = 6 + R(5), t = Array.from({ length: L }, () => R(K)), c = Array.from({ length: L }, () => R(K));
    assert.deepEqual(E.codice.risposta(t, c, K), rispostaLenta(t, c));
  }
  assert.equal(E.codice.aParole(0, 0), 'nessuna cifra giusta');
  assert.equal(E.codice.aParole(0, 1), 'una cifra giusta, al posto sbagliato');
  for (const liv of ['impegnativa', 'esperta', 'esperta', 'estrema']) for (let q = 0; q < 3; q++) {
    const x = E.codice.genera(M.prng(`prova-codice|${liv}|${q}`), liv), p = x.p;
    const c = compatibiliCodice(p, p.prove);
    assert.equal(c.length, 1, `${liv} ${q}`);
    assert.ok(E.codice.giusta(p, c[0]) && !E.codice.giusta(p, c[0].map((v, i) => (i ? v : (v + 1) % p.K))));
    assert.ok(p.prove.every(x => J(x.c) !== J(c[0])), 'un tentativo è già il codice');
    p.prove.forEach((_, i) => assert.ok(compatibiliCodice(p, p.prove.filter((__, j) => j !== i)).length > 1, `${liv}: il tentativo ${i + 1} non serve`));
    if (!p.rip) assert.ok(p.prove.every(x => new Set(x.c).size === x.c.length), 'lucchetto con cifre ripetute');
    assert.equal(E.codice.livello(p), liv);
  }
});
// In fila: la stessa semantica degli indizi riscritta a parte (con le posizioni come lista)
function valeLento(x, ordine) {
  const pos = e => ordine.indexOf(e), a = pos(x.a), b = x.b == null ? -1 : pos(x.b), n = ordine.length;
  switch (x.t) {
    case 'prima': return a < b;
    case 'subito': return b - a === 1;
    case 'lontani': return a - b > 1 || b - a > 1;
    case 'tra': return ordine.slice(Math.min(a, b) + 1, Math.max(a, b)).length === x.k;
    case 'posto': return a === x.k;
    case 'nonposto': return a !== x.k;
    case 'estremo': return a === 0 || a === n - 1;
    case 'mezzo': { const c = pos(x.c); return Math.min(b, c) < a && a < Math.max(b, c); }
  }
  throw new Error('indizio sconosciuto ' + x.t);
}
const ordiniCompatibili = (p, ind) => permutazioni(p.nomi.length).filter(o => ind.every(x => valeLento(x, o)));
prova('in fila: ordine unico contro una forza bruta scritta a parte; ogni indizio serve; il risolutore trova lo stesso ordine', () => {
  const tipi = new Set();
  for (const liv of ['impegnativa', 'esperta', 'estrema']) for (let q = 0; q < 4; q++) {
    const x = E.linea.genera(M.prng(`prova-linea|${liv}|${q}`), liv), p = x.p;
    const c = ordiniCompatibili(p, p.ind);
    assert.equal(c.length, 1, `${liv} ${q}`);
    assert.equal(E.linea.conta(p), 1); assert.deepEqual(E.linea.conta.ultima, c[0]);
    assert.ok(x.ris.risolto); assert.deepEqual(x.ris.sol, c[0]);
    assert.ok(E.linea.giusta(p, c[0]));
    p.ind.forEach((_, i) => assert.ok(ordiniCompatibili(p, p.ind.filter((__, j) => j !== i)).length > 1, `${liv}: l’indizio ${i + 1} non serve`));
    for (const ind of p.ind) { tipi.add(ind.t); assert.ok(E.linea.testoIndizio(p, ind).length > 10); }
    assert.equal(E.linea.livello(p, x.ris), liv);
  }
  assert.ok(tipi.size >= 6, 'tipi di indizi usati: ' + [...tipi]);
});
prova('moneta falsa: pesi simulati sui due piatti; risposta unica; ogni pesata serve', () => {
  const simula = (p, k, h, pesate = p.pesate) => pesate.every(ps => {
    const peso = m => (m === k ? 10 + h : 10), sx = ps.s.reduce((a, m) => a + peso(m), 0), dx = ps.d.reduce((a, m) => a + peso(m), 0);
    return (sx > dx ? 'S' : sx < dx ? 'D' : '=') === ps.e;
  });
  const tutte = (p, pesate) => { const out = []; for (let k = 0; k < p.n; k++) for (const h of [1, -1]) if (simula(p, k, h, pesate)) out.push({ k, h }); return out; };
  for (const liv of ['impegnativa', 'esperta', 'estrema']) for (let q = 0; q < 5; q++) {
    const x = E.bilancia.genera(M.prng(`prova-bilancia|${liv}|${q}`), liv), p = x.p;
    const c = tutte(p, p.pesate);
    assert.equal(c.length, 1, `${liv} ${q}`);
    assert.ok(E.bilancia.giusta(p, c[0]) && !E.bilancia.giusta(p, { k: c[0].k, h: -c[0].h }));
    p.pesate.forEach((ps, i) => { assert.equal(ps.s.length, ps.d.length); assert.ok(tutte(p, p.pesate.filter((_, j) => j !== i)).length > 1, `${liv}: la pesata ${i + 1} non serve`); });
    assert.equal(E.bilancia.livello(p), liv);
    assert.match(E.bilancia.figura(p), /^<svg/);
  }
});
prova('calcolatrice rotta: tasti su esempi; il minimo di mosse contro una ricerca in profondità indipendente', () => {
  const P = (v, t) => E.calcolatrice.premi(v, t);
  assert.equal(P(12, { t: 'app', k: 5 }), 125); assert.equal(P(-12, { t: 'app', k: 5 }), -125); assert.equal(P(0, { t: 'app', k: 7 }), 7);
  assert.equal(P(125, { t: 'canc' }), 12); assert.equal(P(7, { t: 'canc' }), 0); assert.equal(P(-37, { t: 'canc' }), -3);
  assert.equal(P(120, { t: 'inv' }), 21); assert.equal(P(-123, { t: 'inv' }), -321);
  assert.equal(P(9408, { t: 'somma' }), 21); assert.equal(P(56, { t: 'quad' }), 3136); assert.equal(P(5, { t: 'neg' }), -5); assert.equal(P(0, { t: 'neg' }), 0);
  assert.equal(P(7, { t: '/', k: 2 }), null); assert.equal(P(8, { t: '/', k: 2 }), 4);
  assert.equal(P(1213, { t: 'sost', a: 1, b: 4 }), 4243);
  assert.equal(P(999999, { t: '+', k: 1 }), null);                                      // oltre il limite del display
  const minimo = (p, max) => {                                                           // approfondimento iterativo
    for (let d = 0; d <= max; d++) {
      const giu = (v, r) => { if (r === 0) return v === p.a; return p.tasti.some(t => { const x = P(v, t); return x != null && giu(x, r - 1); }); };
      if (giu(p.da, d)) return d;
    }
    return null;
  };
  for (const liv of ['impegnativa', 'esperta', 'estrema']) for (let q = 0; q < 4; q++) {
    const x = E.calcolatrice.genera(M.prng(`prova-calc|${liv}|${q}`), liv), p = x.p;
    assert.equal(minimo(p, p.mosse), p.mosse, `${liv} ${q}`);
    assert.ok(E.calcolatrice.completo(p, E.calcolatrice.statoRisolto(p, x.ris.sol)));
    assert.equal(E.calcolatrice.livello(p, x.ris), liv);
  }
});
prova('travasi: il minimo di mosse contro una ricerca in profondità indipendente', () => {
  const versa = (cap, v, i, j) => { const w = v.slice(), q = Math.min(w[i], cap[j] - w[j]); w[i] -= q; w[j] += q; return w; };
  const minimo = (p, max) => {
    for (let d = 0; d <= max; d++) {
      const giu = (v, r) => {
        if (v.includes(p.obiettivo)) return true;
        if (r === 0) return false;
        const n = p.cap.length;
        for (let i = 0; i < n; i++) {
          if (p.fontana && giu(v.map((x, k) => (k === i ? p.cap[i] : x)), r - 1)) return true;
          if (p.fontana && giu(v.map((x, k) => (k === i ? 0 : x)), r - 1)) return true;
          for (let j = 0; j < n; j++) if (j !== i && giu(versa(p.cap, v, i, j), r - 1)) return true;
        }
        return false;
      };
      if (giu(p.ini, d)) return d;
    }
    return null;
  };
  for (const liv of ['impegnativa', 'esperta', 'estrema']) for (let q = 0; q < 3; q++) {
    const x = E.travasi.genera(M.prng(`prova-travasi|${liv}|${q}`), liv), p = x.p;
    assert.equal(minimo(p, p.mosse), p.mosse, `${liv} ${q}`);
    assert.ok(E.travasi.completo(p, E.travasi.statoRisolto(p, x.ris.sol)));
    assert.equal(E.travasi.livello(p), liv);
  }
});
prova('enigmi: ogni voce del catalogo verificata; risposte lette all’italiana; soluzione nascosta nei dati', () => {
  const N = E.enigma, ids = new Set();
  for (const e of S.CATALOGO) {
    assert.equal(S.controllaVoce(e), null, e.id);
    assert.ok(!ids.has(e.id), 'id doppio ' + e.id); ids.add(e.id);
    assert.ok(N.CATEGORIE[e.cat], e.id + ': categoria');
    const p = N.daCatalogo(e, 'prova|' + e.id);
    assert.ok(!('risposta' in p) && !('spiegazione' in p), e.id + ': soluzione in chiaro');
    const giusta = Array.isArray(e.risposta) ? e.risposta : e.risposta;
    assert.ok(N.giusta(p, giusta), e.id + ': la risposta del catalogo non è accettata');
    assert.ok(!N.vuota(p, giusta), e.id);
    assert.ok(N.vuota(p, N.nuovoStato(p).v), e.id + ': lo stato iniziale non è vuoto');
    // una risposta sbagliata non passa
    const sbagliata = e.forma === 'numero' || e.forma === 'frazione' ? '987654321' : e.forma === 'parola' ? 'zzzz' : e.forma === 'parole' ? e.risposta.map(() => 'zzzz') : e.forma === 'ordine' ? e.risposta.slice().reverse() : -1;
    assert.ok(!N.giusta(p, sbagliata), e.id + ': accetta una risposta sbagliata');
    // le parole della risposta non si leggono nel file
    const parole = [].concat(e.risposta).filter(x => typeof x === 'string' && x.length > 3);
    for (const w of parole) assert.ok(!J(p).toLowerCase().includes(w.toLowerCase()) || J(e.testo).toLowerCase().includes(w.toLowerCase()), e.id + ': «' + w + '» si legge nei dati');
    assert.equal(N.soluzione(p).risposta.length > 0, true);
  }
  // numeri e frazioni all'italiana
  const num = { id: 't', cat: 'problema', forma: 'numero', testo: 'x', risposta: 1392, livello: 'impegnativa' };
  const pn = N.daCatalogo(num, 's');
  for (const v of ['1392', '1.392', ' 1392 ', '1392,0']) assert.ok(N.giusta(pn, v), v);
  for (const v of ['139', '13920', '', 'mille']) assert.ok(!N.giusta(pn, v), v);
  const fr = N.daCatalogo({ id: 'f', cat: 'probabilita', forma: 'frazione', testo: 'x', risposta: '61/216', livello: 'impegnativa' }, 's');
  for (const v of ['61/216', '122/432', '61 / 216']) assert.ok(N.giusta(fr, v), v);
  for (const v of ['61/217', '0,28', '216/61', '61']) assert.ok(!N.giusta(fr, v), v);
  const pa = N.daCatalogo({ id: 'p', cat: 'indovinello', forma: 'parola', testo: 'x', risposta: 'mazzo di carte', accetta: ['carte'], livello: 'impegnativa' }, 's');
  for (const v of ['mazzo di carte', 'Il mazzo di carte', 'MAZZO DI CARTE ', 'le carte', 'mazzo  di carte']) assert.ok(N.giusta(pa, v), v);
  assert.ok(!N.giusta(pa, 'mazzo')); assert.ok(!N.giusta(pa, ''));
  assert.equal(N.normParola('L’àncora'), 'ancora'); assert.equal(N.normParola('gli Uffizi'), 'uffizi');
});

/* ---------------- Seconda ondata contro forze brute ---------------- */
function quadratiLatini(n) {
  const out = [], v = Array(n * n).fill(0);
  const g = i => { if (i === n * n) { out.push(v.slice()); return; } const r = Math.floor(i / n), c = i % n; for (let d = 1; d <= n; d++) { let ok = true; for (let k = 0; k < c && ok; k++) if (v[r * n + k] === d) ok = false; for (let k = 0; k < r && ok; k++) if (v[k * n + c] === d) ok = false; if (ok) { v[i] = d; g(i + 1); } } v[i] = 0; };
  g(0); return out;
}
prova('gabbie: conteggio contro tutti i quadrati latini 4×4', () => {
  const tutti = quadratiLatini(4), G_ = E.gabbie;
  const conti = (o, xs) => (o === '' ? xs[0] : o === '+' ? xs.reduce((a, b) => a + b, 0) : o === '×' ? xs.reduce((a, b) => a * b, 1) : o === '-' ? Math.abs(xs[0] - xs[1]) : Math.max(...xs) / Math.min(...xs));
  for (let k = 0; k < 120; k++) {
    const sol = R.scegli(tutti), gab = [], usate = new Set();
    for (let i = 0; i < 16; i++) {
      if (usate.has(i)) continue;
      const c = [i]; usate.add(i);
      const j = R.scegli([i + 1, i + 4].filter(x => x < 16 && !usate.has(x) && (x === i + 4 || x % 4 !== 0)));
      if (j != null && R.f() < 0.8) { c.push(j); usate.add(j); }
      const xs = c.map(x => sol[x]);
      let o = c.length === 1 ? '' : R.scegli(['+', '×', '-', '÷']);
      if (o === '÷' && Math.max(...xs) % Math.min(...xs)) o = '-';
      gab.push({ c, o, t: conti(o, xs) });
    }
    const p = { n: 4, gabbie: gab };
    assert.equal(G_.valida(p), null);
    const veri = tutti.filter(q => gab.every(g => g.t === conti(g.o, g.c.map(x => q[x]))));
    assert.equal(G_.conta(p, 99), veri.length, J(p));
    const ris = G_.risolvi(p);
    if (ris.risolto) { assert.equal(veri.length, 1); assert.deepEqual(ris.sol, veri[0]); }
  }
});
prova('somme (kakuro): conteggio contro una ricerca ingenua su griglie piccole', () => {
  const K_ = E.kakuro;
  for (let k = 0; k < 25; k++) {
    const x = K_.genera(M.prng('prova-kakuro|' + k), 'impegnativa'); assert.ok(x);
    const p = x.p, F = K_.fileDi(p), B = K_.bianche(p), v = Array(p.w * p.h).fill(0);
    let tot = 0;
    const giro = q => {
      if (tot > 1) return;
      if (q === B.length) { if (F.every(f => f.celle.reduce((a, i) => a + v[i], 0) === f.somma)) tot++; return; }
      const i = B[q];
      for (let d = 1; d <= 9; d++) {
        v[i] = d;
        // nessuna cifra ripetuta e nessuna somma superata nelle file della casella
        const ok = F.every(f => !f.celle.includes(i) || (new Set(f.celle.filter(j => v[j]).map(j => v[j])).size === f.celle.filter(j => v[j]).length && f.celle.reduce((a, j) => a + v[j], 0) <= f.somma && (f.celle.some(j => !v[j]) || f.celle.reduce((a, j) => a + v[j], 0) === f.somma)));
        if (ok) giro(q + 1);
      }
      v[i] = 0;
    };
    giro(0);
    assert.equal(tot, 1, 'kakuro ' + k);
    assert.equal(K_.conta(p, 2), 1);
    assert.deepEqual(x.ris.sol.filter((_, i) => B.includes(i)), K_.conta.ultima.filter((_, i) => B.includes(i)));
  }
});
prova('flotta: conteggio contro tutte le disposizioni della flotta (6×6)', () => {
  const F_ = E.flotta;
  // tutte le disposizioni di una flotta su n×n, nave per nave, senza toccarsi
  const disposizioni = (n, flotta) => {
    const out = [], sol = Array(n * n).fill(0);
    const giro = (k, minimo) => {
      if (k === flotta.length) { out.push(sol.slice()); return; }
      const L = flotta[k], stessa = k > 0 && flotta[k - 1] === L;
      for (let pos = stessa ? minimo : 0; pos < 2 * n * n; pos++) {
        const dir = pos % 2, i0 = pos >> 1, r0 = Math.floor(i0 / n), k0 = i0 % n;
        if (L === 1 && dir === 1) continue;
        const celle = []; for (let q = 0; q < L; q++) celle.push(dir ? [r0 + q, k0] : [r0, k0 + q]);
        if (celle.some(([r, c]) => r >= n || c >= n)) continue;
        if (celle.some(([r, c]) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const rr = r + a, cc = c + b; if (rr >= 0 && cc >= 0 && rr < n && cc < n && sol[rr * n + cc]) return true; } return false; })) continue;
        celle.forEach(([r, c]) => { sol[r * n + c] = 1; });
        giro(k + 1, pos + 1);
        celle.forEach(([r, c]) => { sol[r * n + c] = 0; });
      }
    };
    giro(0, 0);
    return out;
  };
  const tutte = disposizioni(6, [3, 2, 2, 1, 1, 1]);
  assert.ok(tutte.length > 1000);
  for (let k = 0; k < 40; k++) {
    const sol = R.scegli(tutte), n = 6;
    const p = { n, flotta: [3, 2, 2, 1, 1, 1], righe: [], colonne: [], dati: [] };
    for (let x = 0; x < n; x++) { p.righe.push(sol.slice(x * n, x * n + n).reduce((a, b) => a + b, 0)); let c = 0; for (let y = 0; y < n; y++) c += sol[y * n + x]; p.colonne.push(c); }
    for (let q = 0; q < R(3); q++) { const i = R(n * n); if (!p.dati.some(d => d[0] === i)) p.dati.push([i, sol[i] ? F_.formaDi(n, sol, i) : 'a']); }
    const veri = tutte.filter(q => p.righe.every((v, r) => q.slice(r * n, r * n + n).reduce((a, b) => a + b, 0) === v) && p.colonne.every((v, c) => { let t = 0; for (let y = 0; y < n; y++) t += q[y * n + c]; return t === v; }) && p.dati.every(([i, t]) => (t === 'a' ? !q[i] : q[i] && F_.formaDi(n, q, i) === t)));
    assert.equal(F_.conta(p, 999), veri.length, J(p));
    const ris = F_.risolvi(p);
    if (ris.risolto) { assert.equal(veri.length, 1); assert.deepEqual(ris.sol, veri[0]); }
  }
});
prova('tende: conteggio contro tutti gli insiemi di tende possibili (6×6)', () => {
  const T_ = E.tende;
  for (let k = 0; k < 30; k++) {
    const x = T_.genera(M.prng('prova-tende|' + k), 'impegnativa'); assert.ok(x);
    const p = x.p, n = p.n, alberi = new Set(p.alberi);
    const vic = i => { const r = Math.floor(i / n), c = i % n, o = []; if (r > 0) o.push(i - n); if (r < n - 1) o.push(i + n); if (c > 0) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
    const cand = []; for (let i = 0; i < n * n; i++) if (!alberi.has(i) && vic(i).some(j => alberi.has(j))) cand.push(i);
    let tot = 0; const scelte = [];
    const abbina = () => { // alberi → tende diverse, accanto (ricerca completa)
      const usate = new Set();
      const g = t => { if (t === p.alberi.length) return true; for (const j of vic(p.alberi[t])) if (scelte.includes(j) && !usate.has(j)) { usate.add(j); if (g(t + 1)) return true; usate.delete(j); } return false; };
      return g(0);
    };
    const giro = q => {
      if (scelte.length === p.alberi.length) {
        const ok = p.righe.every((v, r) => scelte.filter(i => Math.floor(i / n) === r).length === v) && p.colonne.every((v, c) => scelte.filter(i => i % n === c).length === v) && abbina();
        if (ok) tot++; return;
      }
      if (q === cand.length) return;
      const i = cand[q];
      const tocca = scelte.some(j => Math.abs(Math.floor(j / n) - Math.floor(i / n)) <= 1 && Math.abs(j % n - i % n) <= 1);
      if (!tocca && scelte.filter(j => Math.floor(j / n) === Math.floor(i / n)).length < p.righe[Math.floor(i / n)] && scelte.filter(j => j % n === i % n).length < p.colonne[i % n]) { scelte.push(i); giro(q + 1); scelte.pop(); }
      giro(q + 1);
    };
    giro(0);
    assert.equal(tot, 1, 'tende ' + k);
    assert.equal(T_.conta(p, 2), 1);
  }
});
prova('luci: conteggio contro una ricerca ingenua (griglie 6×6)', () => {
  const L_ = E.luci;
  for (let k = 0; k < 40; k++) {
    const n = 6, nere = [];
    for (let i = 0; i < n * n; i++) if (R.f() < 0.22) nere.push([i, -1]);
    const nero = new Set(nere.map(x => x[0])), bianche = [...Array(n * n).keys()].filter(i => !nero.has(i));
    const vede = (a, b) => { const ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n; if (ra !== rb && ca !== cb) return false; if (ra === rb) { for (let c = Math.min(ca, cb) + 1; c < Math.max(ca, cb); c++) if (nero.has(ra * n + c)) return false; return true; } for (let r = Math.min(ra, rb) + 1; r < Math.max(ra, rb); r++) if (nero.has(r * n + ca)) return false; return true; };
    // una soluzione a caso, poi tutti i numeri
    const lamp = [];
    for (const i of R.mescola(bianche.slice())) if (!lamp.some(j => vede(i, j)) && !lamp.includes(i)) { const buio = !lamp.some(j => j === i || vede(i, j)); if (buio) lamp.push(i); }
    const acc = i => [i - n, i + n, i % n ? i - 1 : -1, (i + 1) % n ? i + 1 : -1].filter(j => j >= 0 && j < n * n);
    const p = { w: n, h: n, nere: nere.map(([i]) => [i, R.f() < 0.6 ? acc(i).filter(j => lamp.includes(j)).length : -1]) };
    let tot = 0; const su = [];
    const giro = q => {
      if (tot > 5) return;
      if (q === bianche.length) {
        if (bianche.every(i => su.includes(i) || su.some(j => vede(i, j))) && p.nere.every(([i, x]) => x < 0 || acc(i).filter(j => su.includes(j)).length === x)) tot++;
        return;
      }
      const i = bianche[q];
      if (!su.some(j => vede(i, j))) { su.push(i); giro(q + 1); su.pop(); }
      giro(q + 1);
    };
    giro(0);
    assert.equal(L_.conta(p, 6), tot, J(p));
  }
});
prova('ponti: conteggio contro tutte le assegnazioni dei ponti (fino a 12 collegamenti)', () => {
  const P_ = E.ponti;
  let provate = 0;
  for (let k = 0; provate < 40 && k < 400; k++) {
    const n = 5, isole = [];
    for (let i = 0; i < n * n; i++) if (R.f() < 0.3) isole.push([i, 1]);
    if (isole.length < 3) continue;
    const p0 = { w: n, h: n, isole }, A = P_.archi(p0);
    if (A.E.length > 12 || !A.E.length) continue;
    // numeri da un'assegnazione a caso
    const x = A.E.map(() => R(3));
    A.E.forEach((e, q) => { if (x[q] && e.incrocia.some(z => x[z])) x[q] = 0; });
    const p = { w: n, h: n, isole: isole.map(([i], kk) => [i, A.perIsola[kk].reduce((s, q) => s + x[q], 0)]) };
    if (p.isole.some(([, v]) => v === 0)) continue;
    provate++;
    let tot = 0;
    const y = A.E.map(() => 0);
    const giro = q => {
      if (q === A.E.length) {
        if (!p.isole.every(([, v], kk) => A.perIsola[kk].reduce((s, z) => s + y[z], 0) === v)) return;
        if (A.E.some((e, z) => y[z] && e.incrocia.some(w => y[w]))) return;
        const vis = new Set([0]), coda = [0];
        while (coda.length) { const a = coda.pop(); A.E.forEach((e, z) => { if (!y[z]) return; const b = e.a === a ? e.b : e.b === a ? e.a : -1; if (b >= 0 && !vis.has(b)) { vis.add(b); coda.push(b); } }); }
        if (vis.size === p.isole.length) tot++;
        return;
      }
      for (let v = 0; v <= 2; v++) { y[q] = v; giro(q + 1); }
      y[q] = 0;
    };
    giro(0);
    assert.equal(P_.conta(p, 999), tot, J(p));
  }
  assert.ok(provate >= 20);
});
prova('chi è chi: indizi riletti su tutte le tabelle possibili; testi giusti', () => {
  const L_ = E.logigramma;
  for (const liv of ['impegnativa', 'esperta', 'estrema']) for (let q = 0; q < 3; q++) {
    const x = L_.genera(M.prng(`prova-logi|${liv}|${q}`), liv), p = x.p;
    // ricerca ingenua: tutte le combinazioni di permutazioni, indizi riletti a parte
    const perm = permutazioni(p.n), k = p.cat.length, kc = p.cat.indexOf('casa') + 1;
    const chi = (sol, [c, v]) => (c === 0 ? v : sol[c - 1].indexOf(v));
    const ok = (sol, d) => {
      const a = chi(sol, d.x), b = chi(sol, d.y), casa = i => sol[kc - 1][i];
      return d.t === 'si' ? a === b : d.t === 'no' ? a !== b : d.t === 'accanto' ? Math.abs(casa(a) - casa(b)) === 1 : d.t === 'sinistra' ? casa(a) < casa(b) : casa(a) + 1 === casa(b);
    };
    let tot = 0, trovata = null;
    const giro = (sol) => { if (sol.length === k) { if (p.ind.every(d => ok(sol, d))) { tot++; trovata = sol.map(s_ => s_.slice()); } return; } for (const pp of perm) giro(sol.concat([pp])); };
    giro([]);
    assert.equal(tot, 1, liv);
    assert.deepEqual(x.ris.sol.slice(1), trovata);
    for (const d of p.ind) assert.match(L_.testoIndizio(p, d), /^[A-Z][^.]+\.$/);
    assert.ok(L_.giusta(p, trovata) && !L_.giusta(p, trovata.map((r, c) => (c ? r : r.slice().reverse()))));
  }
});
prova('criptaritmo: soluzioni contro tutte le assegnazioni di cifre', () => {
  const C_ = E.criptaritmo;
  const prove = [{ addendi: ['SEND', 'MORE'], somma: 'MONEY' }];
  for (let k = 0; prove.length < 25 && k < 2000; k++) {
    const a = R.scegli(C_.PAROLE), b = R.scegli(C_.PAROLE), s = R.scegli(C_.PAROLE);
    const p = { addendi: [a, b], somma: s };
    if (C_.lettere(p).length <= 7 && s.length >= Math.max(a.length, b.length)) prove.push(p);
  }
  for (const p of prove) {
    const L = C_.lettere(p), prime = new Set(p.addendi.concat([p.somma]).map(w => w[0]));
    let tot = 0;
    const d = {}, usate = new Set();
    const val = w => [...w].reduce((x, c) => x * 10 + d[c], 0);
    const giro = q => {
      if (q === L.length) { if (p.addendi.reduce((x, w) => x + val(w), 0) === val(p.somma)) tot++; return; }
      for (let v = 0; v <= 9; v++) { if (usate.has(v) || (v === 0 && prime.has(L[q]))) continue; d[L[q]] = v; usate.add(v); giro(q + 1); usate.delete(v); }
    };
    if (L.length <= 8) { giro(0); assert.equal(C_.tutte(p, 999).length, tot, J(p)); }
  }
  assert.equal(C_.tutte(prove[0], 9).length, 1);
  assert.equal(C_.soluzione(prove[0]).risposta, '10652');
});

/* ---------------- Ogni motore: generati e ricontrollati ---------------- */
prova('ogni motore e ogni livello: generato, soluzione unica, risolto dal risolutore umano, livello giusto', () => {
  for (const g of S.GIOCHI) for (const liv of ['impegnativa', 'esperta', 'estrema']) {
    if (g === 'stelle' && liv !== 'impegnativa') continue;                   // lente: le ricontrollano le sfide pubblicate
    const x = S.generaSfida(g, liv, `prova|${g}|${liv}`);
    const s = { data: '2027-01-01', n: M.numero('2027-01-01'), gioco: g, livello: liv, titolo: 'Prova', tecniche: x.tecniche, p: x.p };
    assert.equal(S.controlla(s), null, `${g} ${liv}`);
    const st = E[g].nuovoStato(x.p);
    if (E[g].giusta) assert.ok(E[g].vuota(x.p, st.v), `${g}: lo stato iniziale non è vuoto`);
    else assert.ok(!E[g].completo(x.p, st) || g === 'cavalieri', `${g}: lo stato iniziale non è già completo`);
    assert.ok(Object.keys(x.tecniche).every(t => E[g].TECNICHE[t]), `${g}: tecniche`);
  }
});

/* ---------------- Palinsesto ---------------- */
// Le regole del palinsesto valgono dal primo giorno rimescolato (i primi due giorni sono usciti col palinsesto vecchio)
const PRIMO_NUOVO = '2026-10-24';
function controllaPalinsesto(storia, da) {
  const date = Object.keys(storia).filter(d => d >= da).sort();
  for (const d of date) {
    const x = storia[d], ieri = storia[M.piuGiorni(d, -1)];
    if (ieri) assert.notEqual(x.famiglia, ieri.famiglia, d + ': stessa famiglia di ieri (' + x.tipo + ', ' + ieri.tipo + ')');
    const gd = M.giorniDa(d, storia, 'tipo', x.tipo);
    assert.ok(gd == null || gd >= M.MINIMO, `${d}: ${x.tipo} di nuovo dopo ${gd} giorni`);
    assert.ok(M.livelliAmmessi(d).includes(x.livello), `${d}: livello ${x.livello} di ${M.GIORNI[M.giornoSettimana(d)]}`);
  }
}
prova('palinsesto: due anni simulati dopo l’ultimo giorno pronto rispettano tutte le regole', () => {
  const storia = S.storiaDi(M.dati), usati = new Set(Object.values(M.dati).filter(s => s.gioco === 'enigma').map(s => s.p.id));
  const ultimo = Object.keys(M.dati).sort().pop(), inizio = M.piuGiorni(ultimo, 1), cnt = {};
  for (let d = inizio, k = 0; k < 730; k++, d = M.piuGiorni(d, 1)) {
    const sc = M.scegliDelGiorno(d, storia, S.candidatiDelGiorno(usati), M.prng('giorno|' + d));
    assert.equal(sc.rilassa, 0, d + ': regole rilassate');
    if (sc.c.voci) usati.add((sc.c.voci.find(e => e.livello === sc.livello) || sc.c.voci[0]).id);
    storia[d] = { tipo: sc.c.tipo, famiglia: sc.c.famiglia, livello: sc.livello };
    cnt[sc.c.tipo] = (cnt[sc.c.tipo] || 0) + 1;
  }
  controllaPalinsesto(storia, inizio);
  for (const g of S.GIOCHI) assert.ok(Object.keys(cnt).some(t => t.split(':')[0] === g), g + ' non esce mai');
  // anche se tutti gli enigmi fossero ancora da usare
  const storia2 = {}, usati2 = new Set();
  for (let d = '2027-03-01', k = 0; k < 120; k++, d = M.piuGiorni(d, 1)) {
    const sc = M.scegliDelGiorno(d, storia2, S.candidatiDelGiorno(usati2), M.prng('g2|' + d));
    assert.equal(sc.rilassa, 0, d);
    if (sc.c.voci) usati2.add((sc.c.voci.find(e => e.livello === sc.livello) || sc.c.voci[0]).id);
    storia2[d] = { tipo: sc.c.tipo, famiglia: sc.c.famiglia, livello: sc.livello };
  }
  controllaPalinsesto(storia2, '2027-03-01');
  // livelli: sabato esperta o estrema, domenica estrema, in settimana un po' e un po'
  const fer = Object.entries(storia).filter(([d]) => d >= inizio && M.giornoSettimana(d) % 6 !== 0).map(([, x]) => x.livello);
  const imp = fer.filter(l => l === 'impegnativa').length;
  assert.ok(Math.abs(imp - fer.length / 2) < fer.length * 0.1, `impegnative in settimana: ${imp} su ${fer.length}`);
});

/* ---------------- Sfide pubblicate ---------------- */
prova('sfide pubblicate: tutte ricontrollate da zero, numeri di fila, palinsesto, titoli, niente doppioni', () => {
  const I = S.leggiTutto();
  const date = Object.keys(M.dati).sort();
  assert.ok(date.length >= 30, 'almeno 30 giorni pronti');
  assert.equal(date[0], M.LANCIO); assert.equal(I.primo, date[0]); assert.equal(I.ultimo, date[date.length - 1]);
  assert.deepEqual(I.mesi, [...new Set(date.map(d => d.slice(0, 7)))]);
  // i primi due giorni sono già usciti: non cambiano più
  assert.equal(M.dati['2026-10-22'].gioco, 'corone'); assert.equal(M.dati['2026-10-23'].gioco, 'cavalieri');
  const visti = new Set(), titoli = {}, enigmi = new Set();
  date.forEach((d, k) => {
    const s = M.dati[d];
    assert.equal(s.data, d); if (k) assert.equal(M.differenza(date[k - 1], d), 1, 'manca un giorno prima del ' + d);
    assert.equal(S.controlla(s), null, d + ' ' + s.gioco);
    const firma = s.gioco + J(s.p); assert.ok(!visti.has(firma), d + ': sfida doppia'); visti.add(firma);
    if (s.gioco === 'enigma') { assert.ok(!enigmi.has(s.p.id), d + ': enigma già usato'); enigmi.add(s.p.id); assert.ok(!('risposta' in s.p)); }
    assert.ok(typeof s.titolo === 'string' && s.titolo.length > 2, d + ': titolo');
    const tipo = M.tipoSfida(s.gioco, s.p), lista = M.TITOLI[tipo] || M.TITOLI[s.gioco];
    if (lista) {
      const usati = titoli[tipo] || (titoli[tipo] = []);
      assert.ok(!usati.slice(-(lista.length - 1)).includes(s.titolo), d + ': titolo ripetuto troppo presto');
      usati.push(s.titolo);
    }
    assert.ok(s.tecniche && Object.keys(s.tecniche).every(t => E[s.gioco].TECNICHE[t]), d + ': tecniche');
  });
  controllaPalinsesto(S.storiaDi(M.dati), PRIMO_NUOVO);
  // varietà: nelle prime dieci settimane rimescolate almeno 20 tipi diversi
  const tipi = new Set(date.filter(d => d >= PRIMO_NUOVO).slice(0, 70).map(d => M.tipoSfida(M.dati[d].gioco, M.dati[d].p)));
  assert.ok(tipi.size >= 20, 'tipi: ' + tipi.size);
  // le mine del campo non si leggono a occhio nel file
  for (const s of Object.values(M.dati).filter(x => x.gioco === 'campo')) assert.ok(!/\[/.test(s.p.mine));
});
prova('riserva: ogni sfida messa da parte è ancora valida', () => {
  const R0 = S.leggiRiserva();
  for (const x of R0) {
    if (x.gioco === 'stelle' && x.livello !== 'impegnativa') continue;      // lente: ricontrollate quando entrano in calendario
    const s = { data: '2027-06-01', n: M.numero('2027-06-01'), gioco: x.gioco, livello: x.livello, titolo: 'Riserva', tecniche: x.tecniche || {}, p: x.p };
    assert.equal(S.controlla(s), null, x.gioco + ' ' + x.livello);
  }
});

/* ---------------- Lo strumento ---------------- */
function copiaRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mental-'));
  fs.mkdirSync(path.join(tmp, 'strumenti')); fs.mkdirSync(path.join(tmp, 'giochi'));
  for (const f of ['mental.js', 'mental-enigmi.js', 'mental-riserva.json']) fs.copyFileSync(path.join(RADICE, 'strumenti', f), path.join(tmp, 'strumenti', f));
  fs.cpSync(path.join(RADICE, 'giochi', 'mental'), path.join(tmp, 'giochi', 'mental'), { recursive: true });
  return tmp;
}
const leggiCartella = c => Object.fromEntries(fs.readdirSync(c).map(f => [f, fs.readFileSync(path.join(c, f), 'utf8')]));
prova('strumento: aggiunge giorni dopo l’ultimo senza toccare quelli già pubblicati; chiunque lo lanci ottiene le stesse sfide', () => {
  const tmp = copiaRepo(), tmp2 = copiaRepo();
  const cart = path.join(tmp, 'giochi', 'mental', 'sfide');
  const prima = leggiCartella(cart);
  const ultimo = Object.keys(M.dati).sort().pop();
  const out = execFileSync('node', [path.join(tmp, 'strumenti', 'mental.js'), '--giorni', '3'], { encoding: 'utf8' });
  assert.match(out, /Fatto/);
  const dopo = leggiCartella(cart);
  const meseNuovo = M.piuGiorni(ultimo, 1).slice(0, 7);
  for (const f of Object.keys(prima)) if (f !== 'indice.js' && f !== meseNuovo + '.js') assert.equal(dopo[f], prima[f], f + ' non cambia');
  if (prima[meseNuovo + '.js']) for (const riga of prima[meseNuovo + '.js'].split('\n').filter(x => x.startsWith('{'))) assert.ok(dopo[meseNuovo + '.js'].includes(riga.replace(/,$/, '')));
  const ctl = execFileSync('node', [path.join(tmp, 'strumenti', 'mental.js'), '--controlla'], { encoding: 'utf8' });
  assert.match(ctl, /sono a posto/);
  const ctx = {}; new Function('self', dopo['indice.js'])(ctx);
  assert.equal(ctx.MENTAL_INDICE.ultimo, M.piuGiorni(ultimo, 3));
  // un'altra copia, stesso comando: file identici
  execFileSync('node', [path.join(tmp2, 'strumenti', 'mental.js'), '--giorni', '3'], { encoding: 'utf8' });
  assert.deepEqual(leggiCartella(path.join(tmp2, 'giochi', 'mental', 'sfide')), dopo);
  // di nuovo con le sfide che ci sono già: niente da fare
  const ancora = execFileSync('node', [path.join(tmp, 'strumenti', 'mental.js'), '--fino', ultimo], { encoding: 'utf8' });
  assert.match(ancora, /Niente da fare/);
  for (const t of [tmp, tmp2]) fs.rmSync(t, { recursive: true, force: true });
});
prova('strumento: il rimescolamento non tocca i giorni passati e rispetta il palinsesto', () => {
  const tmp = copiaRepo(), cart = path.join(tmp, 'giochi', 'mental', 'sfide');
  const limite = '2026-11-15';
  const out = execFileSync('node', [path.join(tmp, 'strumenti', 'mental.js'), '--rimescola', '--dopo', limite], { encoding: 'utf8' });
  assert.match(out, /Fatto/);
  const vecchi = { ...M.dati };
  const D = {}; const ctx = { mese: (m, l) => { for (const s of l) D[s.data] = s; } };
  const dopo = leggiCartella(cart);
  for (const f of Object.keys(dopo).filter(f => /^\d{4}-\d\d\.js$/.test(f))) new Function('MENTAL', dopo[f])(ctx);
  for (const d of Object.keys(vecchi)) if (d <= limite) assert.equal(J(D[d]), J(vecchi[d]), d + ' è cambiato');
  // tutto il resto: valido e con le regole del palinsesto
  M.dati = D;
  for (const d of Object.keys(D).filter(x => x > limite)) assert.equal(S.controlla(D[d]), null, d);
  controllaPalinsesto(S.storiaDi(D), M.piuGiorni(limite, 1));
  const id = Object.values(D).filter(s => s.gioco === 'enigma').map(s => s.p.id);
  assert.equal(new Set(id).size, id.length, 'enigma usato due volte');
  S.leggiTutto();
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log(`\n${ok} prove superate`);
