// Prove del motore di Claude Machine (giochi/machine/motore.js), con controlli indipendenti.
// Uso, dalla cartella della repo:  node prove/machine.test.js [quanti puzzle per livello, base 60]
// I puzzle generati si ricontrollano qui senza le maschere del motore: tabelle di verità calcolate
// direttamente dalle regole, codice per codice.
const assert = require('assert');
const crypto = require('crypto');
const CM = require('../giochi/machine/motore.js');
const N = +process.argv[2] || 60;
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };
const caso = n => crypto.randomInt(n);
const CODICI = [];
for (let b = 1; b <= 5; b++) for (let g = 1; g <= 5; g++) for (let v = 1; v <= 5; v++) CODICI.push([b, g, v]);

/* 1. Carte: ogni regola è vera per qualche codice ma non per tutti; id unici; gruppi */
{
  const ids = new Set();
  for (const c of CM.CARTE) {
    assert.ok(!ids.has(c.id), 'id doppio ' + c.id); ids.add(c.id);
    assert.ok(['classico', 'malato'].includes(c.tipo));
    for (const r of c.regole) {
      const n = CODICI.filter(r.f).length;
      assert.ok(n > 0 && n < 125, `${c.id} «${r.t}» vale per ${n} codici`);
    }
    // due regole della stessa carta non sono mai identiche
    const tab = c.regole.map(r => CODICI.map(x => r.f(x) ? 1 : 0).join(''));
    assert.equal(new Set(tab).size, tab.length, 'regole uguali in ' + c.id);
  }
  // carte che dicono la stessa cosa stanno nello stesso gruppo
  const firma = c => c.regole.map(r => CODICI.map(x => r.f(x) ? 1 : 0).join('')).sort().join('|');
  const viste = {};
  for (const c of CM.CARTE) { const f = firma(c); if (viste[f]) assert.equal(viste[f].gruppo, c.gruppo, `${viste[f].id} e ${c.id} sono uguali ma in gruppi diversi`); viste[f] = c; }
  bene(`${CM.CARTE.length} carte (${CM.CARTE.filter(c => c.tipo === 'malato').length} malate): regole tutte sensate, nessun doppione`);
}

/* 2. Significato di alcune regole malate, a mano */
{
  const vale = (id, t, c) => CM.PER_ID[id].regole.find(r => r.t === t).f(c);
  assert.ok(vale('pit', '= {v}²', [3, 4, 5]));
  assert.ok(vale('pit', '> {v}²', [3, 4, 4]));
  assert.ok(vale('num3', 'è primo', [1, 1, 3]));                // 113
  assert.ok(vale('num3', 'è multiplo di 3', [1, 2, 3]));        // 123
  assert.ok(vale('num3', 'né primo né multiplo di 3', [1, 2, 5])); // 125
  assert.ok(vale('m7', 'resto 0', [1, 5, 4]));                 // 154 = 7·22
  assert.ok(vale('m7', 'resto da 4 a 6', [1, 2, 4]));          // 124 = 7·17 + 5
  assert.ok(vale('fis', 'tre', [1, 2, 3]));
  assert.ok(vale('inv', 'tre', [5, 3, 1]));
  assert.ok(vale('pot', '= 16', [2, 4, 1]) && vale('pot', '= 16', [4, 2, 5]));
  assert.ok(vale('spq', 'un quadrato perfetto', [2, 3, 4]));  // 9
  assert.ok(vale('aut', 'sì', [1, 2, 4]) && vale('aut', 'no', [2, 2, 4]));
  assert.ok(vale('med', '{g} in mezzo', [1, 3, 5]) && !vale('med', '{g} in mezzo', [3, 3, 5]));
  assert.ok(vale('mcd', 'MCD > 1', [2, 4, 4]) && vale('mcd', 'MCD = 1', [2, 3, 4]));
  bene('regole malate: Pitagora, primi, resti, potenze, punti fissi, inversioni, MCD fanno quello che dicono');
}

/* 3. Puzzle generati: le garanzie ricontrollate da zero */
function verita(ver) { return CM.regoleDi(ver).map(r => CODICI.map(c => r.f(c))); }
function codiciDi(tabelle, scelta, tranne = -1) {
  const out = [];
  for (let k = 0; k < 125; k++) if (scelta.every((r, i) => i === tranne || tabelle[i][r][k])) out.push(k);
  return out;
}
function candidati(p) {
  const tab = p.ver.map(verita);
  const n = tab.length, codici = new Set();
  const scelta = [];
  (function giro(i) {
    if (i === n) {
      const sol = codiciDi(tab, scelta);
      if (sol.length !== 1) return;
      for (let j = 0; j < n; j++) if (codiciDi(tab, scelta, j).length < 2) return;
      codici.add(sol[0]); return;
    }
    for (let r = 0; r < tab[i].length; r++) {
      // potatura: se nessun codice rispetta le scelte fatte finora, inutile andare avanti
      scelta[i] = r;
      let vivo = false;
      for (let k = 0; k < 125 && !vivo; k++) if (scelta.every((rr, q) => q > i || tab[q][rr][k])) vivo = true;
      if (vivo) giro(i + 1);
    }
    scelta.length = i;
  })(0);
  return codici;
}
for (const liv of Object.keys(CM.LIVELLI)) {
  const L = CM.LIVELLI[liv];
  const quanti = liv === 'insano' ? Math.max(8, Math.round(N / 4)) : N;
  const visti = new Set();
  for (let q = 0; q < quanti; q++) {
    const p = CM.genera(liv, caso);
    assert.equal(CM.controlla(p), null);
    assert.equal(p.ver.length, L.n, 'numero di verificatori');
    const carte = p.ver.flatMap(v => v.carte.map(id => CM.PER_ID[id]));
    p.ver.forEach(v => assert.equal(v.carte.length, L.doppie ? 2 : 1, 'carte per verificatore'));
    assert.equal(new Set(carte.map(c => c.gruppo)).size, carte.length, 'gruppi diversi');
    const malate = carte.filter(c => c.tipo === 'malato').length;
    assert.ok(malate >= L.malati[0] && malate <= L.malati[1], `${liv}: ${malate} carte malate`);
    // (U) da zero
    const tab = p.ver.map(verita), vere = p.ver.map(v => v.vera);
    const sol = codiciDi(tab, vere);
    assert.equal(sol.length, 1, '(U)');
    assert.deepEqual(CODICI[sol[0]], p.codice, 'codice');
    // (N) da zero
    for (let j = 0; j < vere.length; j++) assert.ok(codiciDi(tab, vere, j).length >= 2, '(N)');
    // la regola vera di un verificatore doppio viene da una sola delle due carte (per costruzione è un indice valido)
    // (D) e difficoltà da zero
    const cand = candidati(p);
    assert.ok(cand.has(sol[0]), 'il codice vero è tra i candidati');
    assert.ok(cand.size >= L.candidati[0] && cand.size <= L.candidati[1], `${liv}: ${cand.size} candidati`);
    // rispetta() coincide con la regola
    for (let i = 0; i < p.ver.length; i++) for (const c of [p.codice, [1, 1, 1], [5, 4, 3]]) assert.equal(CM.rispetta(p, i, c), CM.regoleDi(p.ver[i])[p.ver[i].vera].f(c));
    visti.add(p.codice.join(''));
  }
  assert.ok(visti.size > quanti / 3, `${liv}: codici abbastanza vari (${visti.size} su ${quanti})`);
  bene(`${liv}: ${quanti} puzzle, codice unico, nessun verificatore inutile, ${L.candidati[0]}–${L.candidati[1]} candidati dalle sole carte (ricontrollato da zero)`);
}

/* 4. Puzzle rotti: controlla() li riconosce */
{
  const p = CM.genera('medio', caso);
  const rotto = JSON.parse(JSON.stringify(p)); rotto.codice = rotto.codice.map(x => x === 5 ? 1 : x + 1);
  assert.equal(CM.controlla(rotto), 'codice diverso');
  const senza = JSON.parse(JSON.stringify(p)); senza.ver.pop();
  assert.ok(CM.controlla(senza), 'senza un verificatore il puzzle non vale più');
  const ignota = JSON.parse(JSON.stringify(p)); ignota.ver[0].carte = ['nessuna'];
  assert.equal(CM.controlla(ignota), 'carta sconosciuta');
  bene('controlla(): codice sbagliato, verificatore mancante e carta sconosciuta vengono scartati');
}

/* 5. Fine del round in versus */
{
  const p = { codice: [1, 2, 3] };
  const giusto = { codice: [1, 2, 3] }, sbagliato = { codice: [3, 2, 1] };
  let e = CM.fineRound(p, [{ id: 'a', attivo: true, dich: null, domande: 4 }, { id: 'b', attivo: true, dich: null, domande: 2 }]);
  assert.deepEqual(e, { fine: false, vincitori: [], eliminati: [] }, 'nessuno dichiara');
  e = CM.fineRound(p, [{ id: 'a', attivo: true, dich: giusto, domande: 5 }, { id: 'b', attivo: true, dich: giusto, domande: 3 }, { id: 'c', attivo: true, dich: sbagliato, domande: 1 }]);
  assert.deepEqual(e.vincitori, ['b'], 'vince chi ha fatto meno domande'); assert.ok(e.fine);
  e = CM.fineRound(p, [{ id: 'a', attivo: true, dich: giusto, domande: 3 }, { id: 'b', attivo: true, dich: giusto, domande: 3 }]);
  assert.deepEqual(e.vincitori, ['a', 'b'], 'a parità vincono insieme');
  e = CM.fineRound(p, [{ id: 'a', attivo: true, dich: sbagliato, domande: 3 }, { id: 'b', attivo: true, dich: null, domande: 7 }, { id: 'c', attivo: true, dich: null, domande: 2 }]);
  assert.deepEqual(e, { fine: false, vincitori: [], eliminati: ['a'] }, 'chi sbaglia è eliminato, si continua');
  e = CM.fineRound(p, [{ id: 'a', attivo: true, dich: sbagliato, domande: 3 }, { id: 'b', attivo: true, dich: null, domande: 7 }]);
  assert.deepEqual(e.vincitori, ['b']); assert.ok(e.ultimo, 'resta uno solo: vince lui');
  e = CM.fineRound(p, [{ id: 'a', attivo: true, dich: sbagliato, domande: 3 }, { id: 'b', attivo: true, dich: sbagliato, domande: 7 }]);
  assert.deepEqual(e.vincitori, []); assert.ok(e.fine, 'sbagliano tutti: nessun vincitore');
  e = CM.fineRound(p, [{ id: 'a', attivo: false, dich: giusto, domande: 1 }, { id: 'b', attivo: true, dich: null, domande: 7 }, { id: 'c', attivo: true, dich: null, domande: 7 }]);
  assert.ok(!e.fine, 'chi è già eliminato non conta');
  bene('fine del round: meno domande vince, pari merito, eliminazioni, ultimo rimasto, tutti sbagliati');
}

console.log(`\n${ok} prove superate`);
