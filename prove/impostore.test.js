// Controllo dei contenuti di Impostore: parole.js, numeri.js e luoghi.js.
// Uso, dalla cartella della repo:  node prove/impostore.test.js
const fs = require('fs');
const assert = require('assert');
const self = {};
for (const f of ['parole', 'numeri', 'luoghi']) eval(fs.readFileSync(`giochi/impostore/${f}.js`, 'utf8'));
const n = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };
const pulita = (t, dove) => {
  assert.equal(typeof t, 'string', dove);
  assert.ok(t.length > 1, dove + ': vuota');
  assert.equal(t, t.trim().replace(/\s+/g, ' '), dove + ': spazi in più');
  assert.ok(!t.includes("'"), dove + ': apostrofo dritto (usa ’)');
};

/* Parole: niente doppioni tra i pacchetti (come dice CLAUDE.md) */
{
  const visti = new Map();
  for (const p of self.PACCHETTI) for (const [c, ws] of Object.entries(p.categorie)) for (const w of ws) {
    const k = n(w); assert.ok(!visti.has(k), `parola doppia: ${w} (${visti.get(k)} e ${p.id}/${c})`); visti.set(k, p.id + '/' + c);
  }
  bene(`parole: ${visti.size} senza doppioni`);
}

/* Luoghi: categorie con almeno due gruppi, gruppi con almeno due luoghi, niente doppioni */
{
  const visti = new Map(); let gruppi = 0;
  for (const c of self.LUOGHI) {
    pulita(c.cat, 'categoria');
    assert.ok(Array.isArray(c.gruppi) && c.gruppi.length >= 2, `${c.cat}: servono almeno due gruppi (l’indizio non deve bastare)`);
    for (const g of c.gruppi) {
      gruppi++;
      assert.ok(g.length >= 2, `${c.cat}: gruppo con un luogo solo (${g})`);
      for (const l of g) { pulita(l, c.cat); const k = n(l); assert.ok(!visti.has(k), `luogo doppio: ${l}`); visti.set(k, c.cat); }
    }
  }
  bene(`luoghi: ${visti.size} in ${gruppi} gruppi e ${self.LUOGHI.length} categorie, senza doppioni`);
}

/* Numeri: domande che finiscono con «?», gruppi di almeno due, un tipo per gruppo, niente doppioni */
{
  const viste = new Set(); let tot = 0;
  for (const g of self.NUMERI) {
    pulita(g.tipo, 'tipo');
    assert.ok(/^(un|una|un’)/.test(g.tipo), `tipo «${g.tipo}»: deve completare «La risposta è …»`);
    assert.ok(Array.isArray(g.domande) && g.domande.length >= 2, `gruppo con una domanda sola: ${g.domande}`);
    for (const d of g.domande) {
      pulita(d, 'domanda'); tot++;
      assert.ok(d.endsWith('?'), `senza punto di domanda: ${d}`);
      assert.ok(!viste.has(n(d)), `domanda doppia: ${d}`); viste.add(n(d));
    }
  }
  bene(`numeri: ${tot} domande in ${self.NUMERI.length} gruppi, senza doppioni`);
}
console.log(`\n${ok} prove superate`);
