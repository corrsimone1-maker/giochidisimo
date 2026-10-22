// Prova nel browser di ALIBI a schermo iPhone (390×844, tocco): partita con un telefono che gira
// (consegna dei fascicoli, rilettura, taccuino, accusa sbagliata e soluzione), modalità «ognuno col suo»
// (il link apre lo stesso caso su un altro telefono, che sceglie chi è) e modalità cooperativa da soli.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/alibi.pagina.test.js
// Gli screenshot finiscono nella cartella temporanea del sistema (alibi-schermate), o in SCATTI=cartella.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const OUT = process.env.SCATTI || require('path').join(require('os').tmpdir(), 'alibi-schermate');
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8765/';
(async () => {
  const browser = await chromium.launch();
  const nuovoTel = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errori.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errori.push('console: ' + m.text()); });
    return page;
  };
  const errori = [];
  let n = 0;
  const shot = async (page, nome, full = false) => { await page.waitForTimeout(260); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${nome}.png`, fullPage: full }); };
  const tieni = async (page, sel, ms = 1250) => { const el = await page.$(sel); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(200); };
  const vis = async (page, id) => page.isVisible('#' + id);
  const bene = m => console.log('ok  ', m);
  const NOMI = ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena'];

  // ---------- un telefono che gira
  const a = await nuovoTel();
  await a.goto(BASE + 'giochi/alibi/'); await a.evaluate(() => localStorage.clear()); await a.reload();
  for (const nm of NOMI) { await a.fill('#playerName', nm); await a.press('#playerName', 'Enter'); }
  await a.click('#segLuogo [data-v="villa"]');
  await shot(a, 'inizio', true);
  await a.click('#rulesBtn'); await shot(a, 'regole'); await a.evaluate(() => document.getElementById('r-giusto').scrollIntoView()); await shot(a, 'regole-giusto'); await a.click('#reBack2');
  await a.click('#playBtn'); await a.waitForSelector('#passa:not([hidden])');
  const caso = await a.evaluate(() => ({ c: C.colpevole, nomi: C.persone.map(p => p.nome), codice: C.par.codice }));
  for (let i = 0; i < 5; i++) {
    assert.ok(await vis(a, 'passa')); assert.equal(await a.textContent('#paNome'), NOMI[i]);
    await a.click('#paApri'); await a.waitForTimeout(200); assert.ok(await vis(a, 'passa'), 'un tocco breve non apre');
    await tieni(a, '#paApri'); assert.ok(await vis(a, 'dossier'));
    const t = await a.textContent('#doCorpo');
    assert.equal(t.includes('Il colpevole sei tu'), i === caso.c, 'ruolo giusto per ' + NOMI[i]);
    assert.ok(t.includes('non si mostra'), 'regola del fascicolo');
    if (i === caso.c) assert.ok(/puoi dichiarare/.test(t), 'alibi suggeriti al colpevole');
    if (i === 0) await shot(a, 'fascicolo-' + (i === caso.c ? 'colpevole' : 'innocente'), true);
    if (i === caso.c) await shot(a, 'fascicolo-colpevole', true);
    await a.click('#doChiudi');
  }
  assert.ok(await vis(a, 'caso')); await shot(a, 'caso', true);
  bene('consegna dei fascicoli: un solo colpevole, quello del motore');
  // rilettura e telefono bloccato
  await a.click('#caMio'); await a.click('#rlChips [data-i="2"]'); await tieni(a, '#paApri'); assert.ok(await vis(a, 'dossier'));
  await a.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.ok(await vis(a, 'caso')); assert.equal(await a.innerHTML('#doCorpo'), '');
  await a.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });
  // taccuino
  await a.click('#caTac'); await a.click('#taGriglia button[data-k="0:2"]'); await a.click('#tcChips [data-r="4"]');
  await a.click('#taGriglia button[data-k="1:3"]'); await a.click('#tcChips [data-r="?"]');
  await shot(a, 'taccuino', true);
  assert.equal(await a.evaluate(() => JSON.stringify(P.tac)), '{"0:2":4,"1:3":"?"}');
  await a.reload(); assert.ok(await vis(a, 'caso'), 'dopo la ricarica si torna al caso');
  await a.click('#taBack').catch(() => {});
  // accusa sbagliata
  const sbagliato = (caso.c + 1) % 5;
  await a.click('#caAccusa'); await a.click(`#acChips [data-i="${sbagliato}"]`); await tieni(a, '#ifBtns .btn.hold', 1400);
  assert.ok(await vis(a, 'soluzione')); await shot(a, 'soluzione', true);
  assert.ok((await a.textContent('#soCorpo')).includes('L’ha fatta franca'));
  { const sol = await a.textContent('#soCorpo'); assert.ok(sol.includes(caso.nomi[caso.c]) && /colpevole|mentiva/.test(sol)); }
  const st = await a.evaluate(() => JSON.parse(localStorage.getItem('gds-alibi-storico')));
  assert.equal(st.length, 1); assert.equal(st[0].giusto, false);
  bene('rilettura, telefono bloccato, taccuino, accusa e soluzione');

  // ---------- ognuno col suo telefono, con nomi difficili da mettere in un link
  const NOMI2 = ['Gian Maria', 'Zoë', 'D’Amico & C.', 'Ana+Lu', 'Élise #2'];
  await a.click('#soInizio');
  await a.evaluate(() => { players = []; savePl(); renderInizio(); });
  for (const nm of NOMI2) { await a.fill('#playerName', nm); await a.press('#playerName', 'Enter'); }
  await a.click('#segTel [data-v="tanti"]'); await a.click('#segLuogo [data-v="treno"]'); await a.click('#playBtn');
  await a.waitForSelector('#condividi:not([hidden])'); await shot(a, 'condividi', true);
  const link = await a.textContent('#coLink');
  await a.click('#coIo [data-i="0"]'); await a.click('#coVai'); assert.ok(await vis(a, 'caso'));
  const host = await a.evaluate(() => JSON.stringify({ c: C.colpevole, via: C.via, ric: C.ricorda, codice: C.par.codice }));
  const b = await nuovoTel();
  await b.goto(link); await b.waitForSelector('#unisciti:not([hidden])');
  await shot(b, 'unisciti', true);
  assert.deepEqual(await b.evaluate(() => C.par.nomi), NOMI2, 'nomi intatti nel link');
  assert.equal(await b.evaluate(() => location.hash), '', 'il link sparisce dalla barra');
  await b.click('#unIo [data-i="3"]'); await b.click('#unVai'); assert.ok(await vis(b, 'caso'));
  const ospite = await b.evaluate(() => JSON.stringify({ c: C.colpevole, via: C.via, ric: C.ricorda, codice: C.par.codice }));
  assert.equal(ospite, host, 'stesso caso su due telefoni');
  await b.click('#caMio'); await tieni(b, '#paApri'); assert.ok(await vis(b, 'dossier'));
  assert.ok((await b.textContent('#doTitolo')).includes(NOMI2[3]));
  await b.click('#doChiudi'); await b.reload(); assert.ok(await vis(b, 'caso'), 'l’ospite ritrova il caso');
  // un link di un'altra versione del motore non apre un caso diverso
  const d = await nuovoTel();
  await d.goto(link.replace(/([#&])v=\d+/, '$1v=1')); await d.waitForTimeout(300);
  assert.ok((await d.textContent('#ifTitolo')).includes('Versioni diverse'), 'avviso di versione');
  assert.equal(await d.evaluate(() => localStorage.getItem('gds-alibi-partita')), null);
  bene('ognuno col suo: lo stesso caso su un altro telefono (nomi con accenti, apostrofi, + e #), avviso di versione');

  // ---------- cooperativo da soli
  const c = await nuovoTel();
  await c.goto(BASE + 'giochi/alibi/'); await c.evaluate(() => localStorage.clear()); await c.reload();
  await c.click('#segModo [data-v="coop"]'); await c.fill('#playerName', 'Simo'); await c.press('#playerName', 'Enter');
  await c.click('#segLivello [data-v="difficile"]'); await c.click('#segLuogo [data-v="museo"]'); await c.click('#playBtn');
  await c.waitForSelector('#passa:not([hidden])'); await tieni(c, '#paApri'); assert.ok((await c.textContent('#doCorpo')).includes('Sei un testimone')); await c.click('#doChiudi');
  assert.ok(await vis(c, 'caso'));
  await c.evaluate(() => document.querySelectorAll('#caVerbali details').forEach(d => { d.open = true; }));
  await shot(c, 'coop-caso', true);
  const colp = await c.evaluate(() => C.colpevole);
  await c.click('#caAccusa'); await c.click(`#acChips [data-i="${colp}"]`); await tieni(c, '#ifBtns .btn.hold', 1400);
  assert.ok((await c.textContent('#soCorpo')).includes('Caso risolto'));
  assert.ok((await c.textContent('#soCorpo')).includes('si sono rifiutati'));
  await shot(c, 'coop-soluzione', true);
  const tacc = await c.evaluate(() => C.sospettati.filter(i => C.vuoti[i][C.T]).length);
  assert.ok(tacc >= 3, 'a Difficile tacciono almeno in 3');
  bene('cooperativo da soli: verbali con rifiuti, soluzione');

  // ---------- la home elenca ALIBI tra i Giochi
  await c.goto(BASE + '#giochi'); await c.waitForTimeout(500); await shot(c, 'home-giochi', true);
  assert.ok((await c.textContent('body')).includes('ALIBI'));

  assert.equal(errori.length, 0, errori.join('\n'));
  console.log('nessun errore nelle pagine; schermate in', OUT);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
