// Prova delle regole del narratore automatico di Lupus (giochi/lupus/motore.js), senza browser.
// Uso, dalla cartella della repo:  node prove/lupus.test.js
const assert = require('assert');
const fs = require('fs');
global.self = global;
eval(fs.readFileSync('giochi/lupus/ruoli.js', 'utf8'));
require('../giochi/lupus/motore.js');
const L = self.LUPUS;
const R = id => ({ ...self.RUOLI.find(r => r.id === id) });
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

// partita con i ruoli dati, seduti nell'ordine dell'elenco
function partita(ids) {
  const G = { carte: ids.map((id, i) => ({ nome: `G${i}`, ruolo: R(id) })), morti: [] };
  L.nuovo(G);
  return G;
}
const ordine = G => L.passi(G).map(p => p.id + (p.finto ? '*' : ''));

/* ---------- passi della notte ---------- */
{
  const G = partita(['lupo', 'lupo', 'veggente', 'guardia', 'strega', 'medium', 'cupido', 'massone', 'massone', 'cacciatore']);
  assert.deepStrictEqual(ordine(G), ['cupido', 'massone', 'veggente', 'guardia', 'branco', 'strega']);
  const m = L.passi(G).find(p => p.id === 'massone');
  assert.ok(m.molti && m.nome === 'Massoni' && m.tipo === 'guarda');
  bene('prima notte: cupido, massoni, veggente, guardia, lupi, strega (niente medium)');
  G.A.n = 2;
  assert.deepStrictEqual(ordine(G), ['veggente', 'guardia', 'branco', 'strega', 'medium*']);
  bene('dalla seconda: niente ruoli della prima notte; medium finta finché nessuno è stato votato');
  G.morti.push(2);
  assert.ok(L.passi(G).find(p => p.id === 'veggente').finto);
  bene('ruolo morto: si chiama lo stesso, ma è finto');
  G.A.poz = { vita: false, morte: false };
  assert.ok(L.passi(G).find(p => p.id === 'strega').finto);
  bene('strega senza pozioni: finta');
}
{
  const G = partita(['lupo', 'padre', 'grandelupo', 'lupobianco', 'veggente', 'contadino']);
  assert.deepStrictEqual(ordine(G), ['veggente', 'branco', 'lupobianco*', 'padre', 'grandelupo']);
  G.A.n = 2;
  assert.deepStrictEqual(ordine(G), ['veggente', 'branco', 'lupobianco', 'padre', 'grandelupo']);
  G.A.padre = true; G.morti.push(0);
  assert.deepStrictEqual(ordine(G), ['veggente', 'branco', 'lupobianco', 'padre*', 'grandelupo*']);
  bene('lupo bianco a notti pari, padre una volta, grande lupo finché non muore un lupo');
}
{
  const G = partita(['contadino', 'mitomane', 'veggente']);
  assert.ok(ordine(G).includes('branco*'), 'la mitomane può diventare lupo: il turno del branco c’è (finto)');
  bene('turno del branco anche senza lupi, se qualcuno può diventarlo');
}

/* ---------- vicini ---------- */
{
  const G = partita(['contadino', 'contadino', 'lupo', 'contadino', 'contadino']);
  assert.deepStrictEqual(L.vicini(G, 0), [4, 1]);
  G.morti.push(4, 1);
  assert.deepStrictEqual(L.vicini(G, 0), [3, 2]);
  bene('vicini vivi in cerchio');
}

/* ---------- alba ---------- */
{
  const G = partita(['lupo', 'veggente', 'guardia', 'strega', 'contadino', 'contadino']);
  G.A.nd = { vittima: 4, protetto: 4 };
  assert.deepStrictEqual(L.alba(G).morti, []);
  bene('guardia: la vittima protetta non muore');
  G.A.nd = { vittima: 4, salva: true };
  assert.deepStrictEqual(L.alba(G).morti, []);
  bene('strega: salvata');
  G.A.nd = { vittima: 4, veleno: 5 };
  assert.deepStrictEqual(L.alba(G).morti.map(m => [m.i, m.causa]), [[4, 'lupi'], [5, 'veleno']]);
  bene('sbranato e avvelenato');
}
{
  const G = partita(['lupo', 'criceto', 'veggente', 'anziano', 'contadino']);
  G.A.nd = { vittima: 1 };
  assert.deepStrictEqual(L.alba(G).morti, []);
  G.A.nd = { veggente: 1 };
  assert.deepStrictEqual(L.alba(G).morti.map(m => m.causa), ['veggente']);
  bene('criceto: i lupi non lo uccidono, la veggente sì');
  G.A.nd = { vittima: 3 };
  assert.deepStrictEqual(L.alba(G).morti, []);
  G.A.nd = { vittima: 3 };
  assert.deepStrictEqual(L.alba(G).morti.map(m => m.i), [3]);
  bene('anziano: regge il primo attacco, muore al secondo');
}
{
  // cavaliere sbranato: si ammala il primo lupo alla sua sinistra (il precedente nell'elenco), muore all'alba dopo
  const G = partita(['lupo', 'contadino', 'lupo', 'cavaliere', 'contadino']);
  G.A.nd = { vittima: 3 };
  assert.deepStrictEqual(L.alba(G).morti.map(m => m.i), [3]);
  assert.strictEqual(G.A.malato, 2);
  G.A.nd = {};
  assert.deepStrictEqual(L.alba(G).morti.map(m => [m.i, m.causa]), [[2, 'malattia']]);
  bene('cavaliere: il lupo alla sua sinistra muore la notte dopo');
}
{
  const G = partita(['lupo', 'contadino', 'contadino', 'cacciatore', 'contadino']);
  G.A.amanti = [1, 2];
  G.A.nd = { vittima: 1 };
  assert.deepStrictEqual(L.alba(G).morti.map(m => [m.i, m.causa]), [[1, 'lupi'], [2, 'amore']]);
  bene('innamorati: muore anche l’altro');
  G.A.nd = { vittima: 3 };
  L.alba(G);
  assert.deepStrictEqual(L.cacciatori(G), [3]);
  assert.deepStrictEqual(L.sparo(G, 3, 0).map(m => [m.i, m.causa]), [[0, 'cacciatore']]);
  assert.deepStrictEqual(L.cacciatori(G), []);
  assert.strictEqual(L.vittoria(G).chi, 'villaggio');
  bene('cacciatore: spara e il villaggio vince');
}
{
  const G = partita(['lupo', 'padre', 'grandelupo', 'veggente', 'contadino', 'contadino', 'contadino']);
  G.A.nd = { vittima: 3, infetta: true, vittima2: 4 };
  const r = L.alba(G);
  assert.deepStrictEqual(r.morti.map(m => m.i), [4]);
  assert.ok(G.A.p[3].lupo && G.A.p[3].branco && G.A.padre && G.A.msg[3][0].includes('infettato'));
  bene('padre dei lupi: la vittima diventa lupo (con messaggio), il grande lupo uccide la seconda');
}
{
  const G = partita(['lupo', 'lupo', 'lupobianco', 'contadino', 'contadino', 'contadino']);
  G.A.n = 2; G.A.nd = { vittima: 3, bianco: 0 };
  assert.deepStrictEqual(L.alba(G).morti.map(m => m.i), [3, 0]);
  bene('lupo bianco: elimina un lupo');
}
{
  const G = partita(['lupo', 'selvaggio', 'contadino', 'contadino', 'contadino']);
  G.A.modello = 2; G.A.nd = { vittima: 2 };
  L.alba(G);
  assert.ok(G.A.p[1].lupo && G.A.p[1].branco);
  bene('bambino selvaggio: morto il modello diventa lupo');
}

/* ---------- voto ---------- */
{
  const G = partita(['lupo', 'idiota', 'anziano', 'veggente', 'medium', 'contadino']);
  assert.deepStrictEqual(L.voto(G, 1), { morti: [], idiota: 1 });
  bene('idiota votato: resta vivo');
  L.voto(G, 0);
  assert.deepStrictEqual(G.A.ultimo, { i: 0, lupo: true });
  G.A.n = 2;
  assert.ok(!L.passi(G).find(p => p.id === 'medium').finto);
  bene('medium: sa dell’eliminato di oggi');
  L.voto(G, null);
  assert.strictEqual(G.A.ultimo, null);
  bene('medium: niente se oggi non è stato eliminato nessuno');
  L.voto(G, 2);
  assert.ok(G.A.senzaPoteri);
  assert.ok(L.passi(G).find(p => p.id === 'veggente').finto);
  bene('anziano eliminato dal villaggio: gli abitanti perdono i poteri');
}

/* ---------- vittoria ---------- */
{
  const G = partita(['lupo', 'lupo', 'contadino', 'contadino', 'contadino']);
  assert.strictEqual(L.vittoria(G), null);
  G.morti.push(2);
  assert.strictEqual(L.vittoria(G).chi, 'lupi');
  bene('lupi: vincono quando sono almeno quanti gli altri');
}
{
  const G = partita(['angelo', 'lupo', 'contadino', 'contadino', 'veggente']);
  assert.strictEqual(G.A.n, 0);
  L.voto(G, 0);
  assert.strictEqual(L.vittoria(G).chi, 'angelo');
  bene('angelo: eliminato al giorno zero vince');
  const H = partita(['angelo', 'lupo', 'contadino', 'contadino', 'veggente']);
  H.A.n = 1; H.A.nd = {}; L.alba(H);
  assert.strictEqual(H.A.p[0].r, 'contadino');
  L.voto(H, 0);
  assert.strictEqual(L.vittoria(H), null);
  bene('angelo: dopo la prima notte è un contadino');
}
{
  const G = partita(['lupo', 'contadino', 'contadino', 'contadino']);
  G.A.amanti = [0, 1]; G.morti.push(2, 3);
  assert.strictEqual(L.vittoria(G).chi, 'amanti');
  bene('innamorati lupo e umano ultimi due: vincono loro');
}
{
  const G = partita(['pifferaio', 'lupo', 'contadino', 'contadino']);
  G.A.incantati = [1, 2, 3];
  assert.strictEqual(L.vittoria(G).chi, 'pifferaio');
  bene('pifferaio: tutti gli altri incantati');
}
{
  const G = partita(['lupobianco', 'lupo', 'contadino']);
  G.morti.push(1, 2);
  assert.strictEqual(L.vittoria(G).chi, 'lupobianco');
  bene('lupo bianco: ultimo vivo');
}

/* ---------- giro dei messaggi ---------- */
{
  assert.ok(L.serveGiro(partita(['cupido', 'lupo', 'contadino'])));
  const G = partita(['cupido', 'lupo', 'contadino']); G.A.n = 2;
  assert.ok(!L.serveGiro(G));
  assert.ok(L.serveGiro(partita(['pifferaio', 'lupo', 'contadino'])));
  assert.ok(!L.serveGiro(partita(['veggente', 'lupo', 'contadino'])));
  bene('giro dei messaggi solo coi ruoli che possono mandarne');
}

console.log(`\n${ok} controlli passati`);
