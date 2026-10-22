// Prove di MENTAL senza browser: date di Roma (anche nei giorni dell'ora legale), casualità riproducibile,
// ogni motore contro una forza bruta indipendente su griglie piccole, i risolutori «umani» che non sbagliano
// mai (anche passo per passo nel prato fiorito), il palinsesto su anni simulati, tutte le sfide pubblicate
// ricontrollate da zero, e lo strumento che aggiunge giorni senza toccare quelli già pubblicati.
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

/* ---------------- Ogni motore: generati e ricontrollati ---------------- */
prova('ogni motore e ogni livello: generato, soluzione unica, risolto dal risolutore umano, livello giusto', () => {
  for (const g of S.GIOCHI) for (const liv of ['impegnativa', 'esperta', 'estrema']) {
    if (g === 'stelle' && liv !== 'impegnativa') continue;                   // lente: le ricontrollano le sfide pubblicate
    const r = M.prng(`prova|${g}|${liv}`);
    let x = null; for (let k = 0; k < 20 && !x; k++) x = E[g].genera(r, liv, undefined, '2027-01-01');
    assert.ok(x, `${g} ${liv}`);
    const s = { data: '2027-01-01', n: M.numero('2027-01-01'), gioco: g, livello: liv, p: x.p };
    assert.equal(S.controlla(s), null, `${g} ${liv}`);
    assert.ok(E[g].completo(x.p, E[g].statoRisolto(x.p, x.ris.sol)));
    assert.ok(!E[g].completo(x.p, E[g].nuovoStato(x.p)) || g === 'cavalieri', `${g}: lo stato iniziale non è già completo`);
  }
});

/* ---------------- Palinsesto ---------------- */
function controllaPalinsesto(storia, primo) {
  const date = Object.keys(storia).sort();
  date.forEach((d, k) => {
    const x = storia[d], ieri = storia[M.piuGiorni(d, -1)], altro = storia[M.piuGiorni(d, -2)];
    if (ieri) assert.notEqual(x.gioco, ieri.gioco, d + ': due giorni di fila');
    if (ieri && altro) assert.ok(!(M.CIFRE.has(x.gioco) && M.CIFRE.has(ieri.gioco) && M.CIFRE.has(altro.gioco)), d + ': tre giochi di cifre di fila');
    const gs = M.giornoSettimana(d);
    if (gs === 0) assert.equal(x.livello, 'estrema', d); else if (gs === 6) assert.equal(x.livello, 'esperta', d);
    void k;
  });
  // in settimana ogni gioco alterna impegnativa ed esperta
  const ultimo = {};
  for (const d of date) { const x = storia[d], gs = M.giornoSettimana(d); if (gs === 0 || gs === 6) continue; if (ultimo[x.gioco]) assert.notEqual(x.livello, ultimo[x.gioco], d + ' ' + x.gioco + ': livello che non alterna'); ultimo[x.gioco] = x.livello; }
  // un gioco di parole in ogni settimana intera dopo il lancio
  for (let lun = M.piuGiorni(primo, (8 - M.giornoSettimana(primo)) % 7); M.piuGiorni(lun, 6) <= date[date.length - 1]; lun = M.piuGiorni(lun, 7)) {
    let c = 0; for (let k = 0; k < 7; k++) { const x = storia[M.piuGiorni(lun, k)]; if (x && x.gioco === 'cavalieri') c++; }
    assert.equal(c, 1, 'settimana del ' + lun);
  }
}
prova('palinsesto: due anni simulati rispettano tutte le regole e usano tutti i giochi', () => {
  const storia = {}, prec = {};
  for (let d = M.LANCIO; d <= '2028-10-21'; d = M.piuGiorni(d, 1)) {
    const g = M.giocoDelGiorno(d, prec, S.GIOCHI);
    storia[d] = { gioco: g, livello: M.livelloDelGiorno(d, g, storia) }; prec[d] = g;
  }
  controllaPalinsesto(storia, M.LANCIO);
  assert.equal(storia[M.LANCIO].gioco, 'corone');
  const cnt = {}; for (const x of Object.values(storia)) { const c = cnt[x.gioco] || (cnt[x.gioco] = { impegnativa: 0, esperta: 0, estrema: 0 }); c[x.livello]++; }
  for (const g of S.GIOCHI) { assert.ok(cnt[g], g); assert.ok(cnt[g].impegnativa > 10 && cnt[g].esperta > 10 && cnt[g].estrema > 3, g + ' ' + J(cnt[g])); }
  // il gioco di parole cambia giorno: in due anni capita in ogni giorno della settimana
  const giorni = new Set(Object.entries(storia).filter(([, x]) => x.gioco === 'cavalieri').map(([d]) => M.giornoSettimana(d)));
  assert.equal(giorni.size, 7);
});

/* ---------------- Sfide pubblicate ---------------- */
prova('sfide pubblicate: tutte ricontrollate da zero, numeri di fila, palinsesto, titoli, niente doppioni', () => {
  const I = S.leggiTutto();
  const date = Object.keys(M.dati).sort();
  assert.ok(date.length >= 30, 'almeno 30 giorni pronti');
  assert.equal(date[0], M.LANCIO); assert.equal(I.primo, date[0]); assert.equal(I.ultimo, date[date.length - 1]);
  assert.deepEqual(I.mesi, [...new Set(date.map(d => d.slice(0, 7)))]);
  const visti = new Set(), titoli = {};
  date.forEach((d, k) => {
    const s = M.dati[d];
    assert.equal(s.data, d); if (k) assert.equal(M.differenza(date[k - 1], d), 1, 'manca un giorno prima del ' + d);
    assert.equal(S.controlla(s), null, d + ' ' + s.gioco);
    const firma = s.gioco + J(s.p); assert.ok(!visti.has(firma), d + ': sfida doppia'); visti.add(firma);
    assert.ok(typeof s.titolo === 'string' && s.titolo.length > 2, d + ': titolo');
    const usati = titoli[s.gioco] || (titoli[s.gioco] = []);
    assert.ok(!usati.slice(-(M.TITOLI[s.gioco].length - 1)).includes(s.titolo), d + ': titolo ripetuto troppo presto');
    usati.push(s.titolo);
    assert.ok(s.tecniche && Object.keys(s.tecniche).every(t => E[s.gioco].TECNICHE[t]), d + ': tecniche');
    // (gioco e livello non si ricalcolano qui: se un giorno si aggiunge un gioco o si ritocca il palinsesto, le sfide
    // già pubblicate restano come sono; valgono le regole controllate qui sotto)
  });
  controllaPalinsesto(M.dati, M.LANCIO);
  // le mine del campo non si leggono a occhio nel file
  for (const s of Object.values(M.dati).filter(x => x.gioco === 'campo')) assert.ok(!/\[/.test(s.p.mine));
});

/* ---------------- Lo strumento ---------------- */
prova('strumento: aggiunge giorni dopo l’ultimo senza toccare quelli già pubblicati; stesso giorno, stessa sfida', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mental-'));
  fs.mkdirSync(path.join(tmp, 'strumenti')); fs.mkdirSync(path.join(tmp, 'giochi'));
  fs.copyFileSync(path.join(RADICE, 'strumenti', 'mental.js'), path.join(tmp, 'strumenti', 'mental.js'));
  fs.cpSync(path.join(RADICE, 'giochi', 'mental'), path.join(tmp, 'giochi', 'mental'), { recursive: true });
  const cart = path.join(tmp, 'giochi', 'mental', 'sfide');
  const prima = Object.fromEntries(fs.readdirSync(cart).map(f => [f, fs.readFileSync(path.join(cart, f), 'utf8')]));
  const ultimo = Object.keys(M.dati).sort().pop();
  const out = execFileSync('node', [path.join(tmp, 'strumenti', 'mental.js'), '--giorni', '3'], { encoding: 'utf8' });
  assert.match(out, /Fatto/);
  const dopo = Object.fromEntries(fs.readdirSync(cart).map(f => [f, fs.readFileSync(path.join(cart, f), 'utf8')]));
  const meseNuovo = M.piuGiorni(ultimo, 1).slice(0, 7);
  for (const f of Object.keys(prima)) if (f !== 'indice.js' && f !== meseNuovo + '.js') assert.equal(dopo[f], prima[f], f + ' non cambia');
  // le righe già scritte restano identiche anche nel mese toccato
  if (prima[meseNuovo + '.js']) for (const riga of prima[meseNuovo + '.js'].split('\n').filter(x => x.startsWith('{'))) assert.ok(dopo[meseNuovo + '.js'].includes(riga.replace(/,$/, '')));
  const ctl = execFileSync('node', [path.join(tmp, 'strumenti', 'mental.js'), '--controlla'], { encoding: 'utf8' });
  assert.match(ctl, /sono a posto/);
  // rifatto da capo, lo stesso giorno viene uguale
  const ctx = {}; new Function('self', fs.readFileSync(path.join(cart, 'indice.js'), 'utf8'))(ctx);
  assert.equal(ctx.MENTAL_INDICE.ultimo, M.piuGiorni(ultimo, 3));
  const nuovo = M.piuGiorni(ultimo, 1);
  const testo = dopo[meseNuovo + '.js'], riga = testo.split('\n').find(x => x.includes(`"data":"${nuovo}"`));
  const a = S.preparaGiorno(nuovo), b = S.preparaGiorno(nuovo);
  assert.equal(J(a), J(b)); assert.equal(J(a), riga.replace(/,$/, ''));
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log(`\n${ok} prove superate`);
