// Prova nel browser di Impostore con le tre varianti (Parole, Numeri, Luoghi) e i modi dell'impostore
// (sa di esserlo, sa con indizio, non sa di esserlo): carte di tutti, risposte coi numeri, giro di domande,
// elenco dei luoghi, rivelazione, impostazioni vecchie e Reset.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/impostore.pagina.test.js
// Con SCATTI=cartella salva gli screenshot.
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const fs = require('fs');
const BASE = process.env.ROOT || 'http://localhost:8765/';
const SCATTI = process.env.SCATTI || '';
if (SCATTI) fs.mkdirSync(SCATTI, { recursive: true });
const self = {};
for (const f of ['numeri', 'luoghi']) eval(fs.readFileSync(`giochi/impostore/${f}.js`, 'utf8'));
const gruppoLuogo = l => self.LUOGHI.flatMap(c => c.gruppi.map(g => ({ cat: c.cat, g }))).find(x => x.g.includes(l));
const gruppoDomanda = d => self.NUMERI.find(x => x.domande.includes(d));
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => errori.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errori.push('console: ' + m.text()); });
  let n = 0;
  const shot = async nome => { if (SCATTI) { await page.waitForTimeout(260); await page.screenshot({ path: `${SCATTI}/${String(++n).padStart(2, '0')}-${nome}.png` }); } };
  const ev = (f, a) => page.evaluate(f, a);
  const cfg = () => ev(() => JSON.parse(localStorage.getItem('gds-impostore-v2')));
  const vis = id => page.isVisible('#' + id);

  /* Un giro di carte: ognuno guarda (e con Numeri scrive il suo numero) */
  async function giro(numeri = []) {
    const carte = [];
    const np = await ev(() => players.length);
    for (let i = 0; i < np; i++) {
      assert.ok(await vis('pass'), 'schermata passa il telefono');
      await page.click('#showBtn');
      carte.push(await ev(() => ({ testo: document.getElementById('card').innerText, imp: document.getElementById('card').classList.contains('imp') })));
      if (i === 0) await shot('carta');
      if (await vis('risp')) {
        await page.fill('#numIn', numeri[i] ?? String(10 + i));
        await page.click('#risp button');
      } else await page.click('#hideBtn');
    }
    return carte;
  }
  const scegli = async (v, m) => { await page.click(`#varSeg [data-v="${v}"]`); if (m) await page.click(`#modi [data-modo="${m}"]`); };
  const rivela = async () => { await page.click('#revealBtn'); await page.click('#revealYes'); assert.ok(await vis('end')); };

  /* 0. Impostazioni salvate dalla versione di prima: restano e l'indizio diventa il modo «con indizio» */
  await page.goto(BASE + 'giochi/impostore/');
  await ev(() => { localStorage.clear(); localStorage.setItem('gds-impostore-v2', JSON.stringify({ pacchetti: { meme: true }, imp: 1, indizio: true, usate: ['pizza'] })); localStorage.setItem('gds-giocatori', JSON.stringify(['Simo', 'Luca', 'Marta', 'Eva'])); });
  await page.reload(); await page.waitForTimeout(200);
  assert.equal(await page.getAttribute('#varSeg [data-v="parole"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('#modi [data-modo="indizio"]', 'aria-pressed'), 'true', 'indizio di prima = Sa, con indizio');
  assert.equal(await page.locator('#modi [data-modo]').count(), 2, 'con Parole due modi');
  assert.ok(await page.isVisible('#settingsBtn'));
  await shot('setup-parole');
  bene('dati di prima: variante Parole, indizio diventato «Sa, con indizio», due modi');

  /* 1. Parole: come prima */
  await page.click('#playBtn');
  let c = await giro(), R = await ev(() => ({ imp: [...R.imp], parola: R.parola, cat: R.cat }));
  assert.equal(c.filter(x => x.imp).length, 1);
  c.forEach((x, i) => { if (R.imp.includes(i)) assert.match(x.testo, new RegExp('Categoria: ' + R.cat)); else assert.ok(x.testo.includes(R.parola)); });
  assert.ok((await page.textContent('#talkText')).includes('parola legata'));
  await rivela();
  assert.ok((await page.textContent('#endBody')).includes(R.parola));
  await page.click('#toSetup');
  bene('Parole: una carta d’impostore con la categoria, gli altri la parola, fine con la parola');

  /* 2. Luoghi */
  await scegli('luoghi', 'sa');
  assert.equal(await page.locator('#modi [data-modo]').count(), 3);
  assert.ok(!(await page.isVisible('#settingsBtn')), 'niente Impostazioni dei pacchetti');
  assert.match(await page.textContent('#recap'), /141/);
  await shot('setup-luoghi');
  await page.click('#playBtn');
  c = await giro(); R = await ev(() => ({ imp: [...R.imp], luogo: R.luogo, cat: R.cat, primo: R.primo }));
  assert.equal(c.filter(x => x.imp).length, 1);
  c.forEach((x, i) => { if (R.imp.includes(i)) { assert.ok(!x.testo.includes(R.luogo) && !x.testo.includes('categoria')); } else assert.ok(x.testo.includes(R.luogo)); });
  assert.equal(await page.textContent('#firstKicker'), 'Fa la prima domanda');
  assert.match(await page.textContent('#talkText'), /alla sua destra.*antiorario.*indovinare il luogo/);
  await shot('luoghi-domande');
  await page.click('#elencoBtn'); await page.waitForTimeout(150);
  const elenco = await page.textContent('#elencoLista');
  for (const cc of self.LUOGHI) for (const l of cc.gruppi.flat()) assert.ok(elenco.includes(l), 'elenco: ' + l);
  await shot('luoghi-elenco');
  await page.click('#elencoOk');
  await rivela();
  assert.ok(await page.isVisible('#luogoBtn') && !(await page.textContent('#endBody')).includes(R.luogo), 'prima indovina, poi si mostra');
  await shot('luoghi-fine-nascosto');
  await page.click('#luogoBtn');
  assert.ok((await page.textContent('#endBody')).includes(R.luogo));
  bene('Luoghi, sa di esserlo: impostore senza luogo né categoria, gli altri lo stesso luogo, elenco completo, luogo mostrato dopo il tentativo');

  await page.click('#toSetup'); await scegli('luoghi', 'indizio'); await page.click('#playBtn');
  c = await giro(); R = await ev(() => ({ imp: [...R.imp], luogo: R.luogo, cat: R.cat }));
  assert.ok(c[R.imp[0]].imp && c[R.imp[0]].testo.includes('Il luogo è nella categoria: ' + R.cat) && !c[R.imp[0]].testo.includes(R.luogo));
  await page.click('#quit2'); await page.click('#quit2');
  assert.ok(await vis('setup'), 'Esci due volte torna all’inizio');
  bene('Luoghi, con indizio: l’impostore vede la categoria');

  await ev(() => { players.push('Gio', 'Ale'); savePl(); cfg.imp = 2; saveCfg(); renderSetup(); });
  await scegli('luoghi', 'nonsa'); await page.click('#playBtn');
  c = await giro(); R = await ev(() => ({ imp: [...R.imp], luogo: R.luogo, altro: R.altro, cat: R.cat }));
  assert.equal(R.imp.length, 2);
  assert.ok(c.every(x => !x.imp), 'nessuna carta rossa');
  assert.notEqual(R.luogo, R.altro);
  const gl = gruppoLuogo(R.luogo); assert.ok(gl.g.includes(R.altro) && gl.cat === R.cat, 'luogo dell’impostore dallo stesso gruppo');
  c.forEach((x, i) => assert.ok(x.testo.includes(R.imp.includes(i) ? R.altro : R.luogo) && x.testo.includes(R.cat)));
  const forma = t => t.replace(R.luogo, 'X').replace(R.altro, 'X').replace(/^.*, il luogo è/, '');
  assert.equal(forma(c[R.imp[0]].testo), forma(c.find((_, i) => !R.imp.includes(i)).testo), 'carta dell’impostore uguale alle altre');
  assert.match(await page.textContent('#talkText'), /non lo sa/);
  await rivela();
  const fineL = await page.textContent('#endBody');
  assert.ok(fineL.includes(R.luogo) && fineL.includes(R.altro) && /avevano/.test(fineL));
  await shot('luoghi-fine-nonsa');
  bene('Luoghi, non sa di esserlo: due impostori con lo stesso luogo simile dello stesso gruppo, carte identiche, fine con i due luoghi');

  /* 3. Numeri */
  await page.click('#toSetup');
  await ev(() => { players.splice(4); savePl(); cfg.imp = 1; saveCfg(); renderSetup(); });
  await scegli('numeri', 'sa');
  assert.match(await page.textContent('#recap'), /132/);
  await shot('setup-numeri');
  await page.click('#playBtn');
  await page.click('#showBtn');
  assert.ok(await vis('risp') && !(await vis('hideArea')));
  await page.click('#risp button'); assert.match(await page.textContent('#toast'), /Scrivi un numero/);
  await page.fill('#numIn', 'tanti'); await page.click('#risp button'); assert.match(await page.textContent('#toast'), /Solo un numero/);
  assert.ok(await vis('show'), 'senza numero non si va avanti');
  await page.fill('#numIn', '7,5'); await page.click('#risp button');
  assert.ok(await vis('pass'));
  await page.click('#showBtn'); assert.equal(await page.inputValue('#numIn'), '', 'il numero di prima non si vede');
  await page.fill('#numIn', '1.000'); await page.click('#risp button');
  for (const v of ['3', '-2']) { await page.click('#showBtn'); await page.fill('#numIn', v); await page.click('#risp button'); }
  R = await ev(() => ({ imp: [...R.imp], domanda: R.domanda, risp: R.risp }));
  assert.deepEqual(R.risp, ['7,5', '1.000', '3', '-2']);
  assert.ok(await vis('talk'));
  assert.ok((await page.textContent('#talkTop')).includes(R.domanda));
  assert.deepEqual(await page.$$eval('.risposte div', ds => ds.map(d => d.innerText.replace(/\s+/g, ' '))), ['Simo 7,5', 'Luca 1.000', 'Marta 3', 'Eva -2']);
  await shot('numeri-risposte');
  await rivela();
  assert.ok((await page.textContent('#endBody')).includes('ha scritto ' + R.risp[R.imp[0]]));
  await shot('numeri-fine');
  bene('Numeri, sa di esserlo: numero obbligatorio e solo numeri, campo vuoto per il successivo, risposte di tutti con la domanda vera');

  await page.click('#toSetup'); await scegli('numeri', 'indizio'); await page.click('#playBtn');
  c = await giro(); R = await ev(() => ({ imp: [...R.imp], domanda: R.domanda, tipo: R.tipo }));
  assert.ok(c[R.imp[0]].imp && c[R.imp[0]].testo.includes('La risposta è ' + R.tipo) && !c[R.imp[0]].testo.includes(R.domanda));
  c.forEach((x, i) => { if (!R.imp.includes(i)) assert.ok(x.testo.includes(R.domanda)); });
  await page.click('#quit2'); await page.click('#quit2');
  bene('Numeri, con indizio: l’impostore sa che tipo di numero serve');

  await scegli('numeri', 'nonsa'); await page.click('#playBtn');
  c = await giro(); R = await ev(() => ({ imp: [...R.imp], domanda: R.domanda, altra: R.altra }));
  assert.ok(c.every(x => !x.imp)); assert.notEqual(R.domanda, R.altra);
  assert.ok(gruppoDomanda(R.domanda).domande.includes(R.altra), 'domanda dell’impostore dallo stesso gruppo');
  c.forEach((x, i) => assert.ok(x.testo.includes(R.imp.includes(i) ? R.altra : R.domanda)));
  assert.match(await page.textContent('#talkText'), /se n’è appena accorto/);
  await rivela();
  const fineN = await page.textContent('#endBody');
  assert.ok(fineN.includes(R.domanda) && fineN.includes(R.altra));
  await shot('numeri-fine-nonsa');
  bene('Numeri, non sa di esserlo: domanda simile dello stesso gruppo, fine con le due domande');

  /* 4. Si ricorda tutto; niente ripetizioni a breve; Reset */
  await page.reload(); await page.waitForTimeout(200);
  assert.equal(await page.getAttribute('#varSeg [data-v="numeri"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('#modi [data-modo="nonsa"]', 'aria-pressed'), 'true');
  await scegli('luoghi'); assert.equal(await page.getAttribute('#modi [data-modo="nonsa"]', 'aria-pressed'), 'true', 'ogni variante ha il suo modo');
  const visti = new Set();
  await ev(() => { cfg.usateL = []; saveCfg(); });
  for (let i = 0; i < 20; i++) { await ev(() => newRound()); visti.add(await ev(() => R.cat + '|' + R.luogo)); }
  const gr = await ev(() => cfg.usateL.length);
  assert.equal(gr, 20, '20 gruppi diversi di fila');
  await page.click('#quit1'); await page.click('#quit1');
  const prima = await cfg();
  await page.click('#resetBtn'); await page.click('#resetBtn');
  const dopo = await cfg();
  assert.equal(dopo.variante, 'parole'); assert.equal(dopo.modoN, 'sa'); assert.equal(dopo.modoL, 'sa'); assert.equal(dopo.indizio, false);
  assert.deepEqual(dopo.usateL, prima.usateL, 'i luoghi usciti restano');
  assert.deepEqual(await ev(() => players), []);
  bene('variante e modi si ricordano, 20 round senza ripetere un gruppo, Reset torna a Parole e tiene gli usciti');

  console.log(errori.length ? 'ERRORI:\n' + errori.join('\n') : 'nessun errore nella pagina');
  assert.equal(errori.length, 0);
  await browser.close();
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
