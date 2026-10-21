// Prova nel browser di 7 Wonders: Secret Societies: una partita intera a schermo iPhone (390×844, tocco),
// con consegna delle società, Patto e Patrocinio, timer, cabina con scommesse e poteri, telefono bloccato
// durante la cabina, ricarica a metà, verifica, annullamento, missioni, archivio e punti portati nel conteggio di 7 Wonders.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/societa.pagina.test.js
// Gli screenshot finiscono nella cartella temporanea del sistema (societa-schermate), o in SCATTI=cartella.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const OUT = process.env.SCATTI || require('path').join(require('os').tmpdir(), 'societa-schermate');
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8765/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => errori.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errori.push('console: ' + m.text()); });
  let n = 0;
  const shot = async (nome, full = false) => { await page.waitForTimeout(280); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${nome}.png`, fullPage: full }); };
  const vis = async id => page.isVisible('#' + id);
  const tieni = async (sel, ms = 1000) => { const el = await page.$(sel); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(200); };
  const P = async () => page.evaluate(() => JSON.parse(localStorage.getItem('gds-societa-partita')));
  const St = async () => page.evaluate(() => SS.stato(JSON.parse(localStorage.getItem('gds-societa-partita'))));
  const bene = m => console.log('ok  ', m);

  await page.goto(BASE + 'giochi/societa/');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  for (const nm of ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena']) { await page.fill('#playerName', nm); await page.press('#playerName', 'Enter'); }
  await shot('inizio', true);
  assert.equal(await page.isDisabled('#playBtn'), false);
  await page.click('#bilBtn'); await shot('bilanciamento', true); await page.click('#bilBack');
  await page.click('#rulesBtn'); await shot('regole');
  await page.evaluate(() => document.getElementById('r-patti').scrollIntoView()); await shot('regole-patti');
  await page.evaluate(() => document.getElementById('r-bilanciamento').scrollIntoView()); await shot('regole-bilanciamento');
  await page.click('#regBack2');
  bene('inizio, bilanciamento e regolamento');

  // ---- consegna delle società
  await page.click('#playBtn');
  assert.ok(await vis('passa')); await shot('passa-consegna');
  await page.click('#paApri'); await page.waitForTimeout(250); assert.ok(await vis('passa'), 'un tocco breve non apre');
  const soc = (await P()).soc;
  for (let g = 0; g < 5; g++) {
    assert.equal(await page.textContent('#paNome'), ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena'][g]);
    await tieni('#paApri'); assert.ok(await vis('segreto'));
    if (g === 0) await shot('societa-consegnata');
    await page.click('#sgCopri');
  }
  assert.ok(await vis('plancia')); await shot('plancia-era1', true);
  bene('consegna delle società: ' + soc.join(', '));

  // ---- Conclave II
  await tieni('#cFineEra'); assert.ok(await vis('plancia'));
  assert.equal((await St()).sub, 'mercato');
  await page.click('#tmVia'); await page.waitForTimeout(1300);
  assert.notEqual(await page.textContent('#tmVal'), '1:30', 'il timer scorre');
  await page.click('#tmVia');
  await shot('conclave-mercato', true);
  await page.click('#cRel'); assert.ok(await vis('relVelo'));
  await page.click('#rvCorpo [data-c="a"][data-g="0"]'); await page.click('#rvCorpo [data-c="oa"][data-a="col:v:2"]');
  await page.click('#rvCorpo [data-c="b"][data-g="2"]'); await page.click('#rvCorpo [data-c="ob"][data-a="col:r:2"]');
  await shot('nuovo-patto');
  await page.click('#rvOk'); assert.ok(!(await vis('relVelo')));
  await page.click('#cRel'); await page.click('#rvCorpo [data-tipo="patrocinio"]');
  await page.click('#rvCorpo [data-c="a"][data-g="3"]'); await page.click('#rvCorpo [data-c="b"][data-g="4"]'); await page.click('#rvCorpo [data-c="ob"][data-a="col:b:2"]');
  await page.click('#rvOk');
  // annulla l'ultimo accordo e lo rifà
  await tieni('#pAnnulla'); assert.equal((await St()).conclavi[2].relazioni.length, 1, 'annullato il Patrocinio');
  await page.click('#cRel'); await page.click('#rvCorpo [data-tipo="patrocinio"]');
  await page.click('#rvCorpo [data-c="a"][data-g="3"]'); await page.click('#rvCorpo [data-c="b"][data-g="4"]'); await page.click('#rvCorpo [data-c="ob"][data-a="col:b:2"]');
  await page.click('#rvOk');
  assert.equal((await St()).conclavi[2].relazioni.length, 2);
  await shot('conclave-accordi', true);
  bene('mercato: timer, Patto, Patrocinio, annulla');

  // ---- cabina
  await tieni('#cUrne'); assert.ok(await vis('passa'));
  const scelte = { 0: { voto: 0, int: 'L' }, 1: { voto: 1, scom: [3, 'col:b:2'] }, 2: { voto: 0, int: 'T', sigillo: true }, 3: { voto: 0 }, 4: { voto: 2, scom: [0, 'col:v:2'] } };
  for (const g of [0, 1, 2, 3, 4]) {
    assert.equal(await page.textContent('#paNome'), ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena'][g]);
    await tieni('#paApri'); assert.ok(await vis('cabina'));
    const x = scelte[g];
    assert.ok(await page.isDisabled('#cbSigilla'), 'senza voto non si sigilla');
    await page.click(`#cbCorpo .dec[data-voto]:nth-of-type(${x.voto + 1})`);
    if (x.int) { assert.ok(await page.isDisabled('#cbSigilla'), 'nel Patto serve Leale o Traditore'); await page.click(`#cbCorpo [data-int="${x.int}"]`); }
    if (x.sigillo) await page.click('#cbCorpo [data-x="sigillo"]');
    if (x.scom) { await page.click(`#cbCorpo [data-sb="${x.scom[0]}"]`); await page.click(`#cbCorpo [data-sa="${x.scom[1]}"]`); }
    if (g === 0) {
      await shot('cabina-ada', true);
      // telefono bloccato: la cabina si copre e torna la schermata neutra
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      assert.ok(await vis('passa')); assert.equal(await page.innerHTML('#cbCorpo'), '');
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });
      // ricarica a metà: si riparte dalla plancia, mai da una schermata riservata
      await page.reload(); assert.ok(await vis('plancia')); await page.click('#cPassa');
      await tieni('#paApri');
      await page.click(`#cbCorpo .dec[data-voto]:nth-of-type(1)`); await page.click('#cbCorpo [data-int="L"]');
    }
    if (g === 1) await shot('cabina-bruno-scommessa', true);
    await tieni('#cbSigilla');
  }
  let st = await St();
  assert.equal(st.sub, 'esito');
  assert.equal(st.conclavi[2].elezione.eletto, st.conclavi[2].decreti[0], 'eletto il primo decreto (4 voti col Sigillo)');
  assert.ok(await vis('plancia') || await vis('passa'));
  if (await vis('passa')) { await tieni('#paApri'); await shot('cannocchiale'); await page.click('#sgCopri'); }
  assert.ok(await vis('plancia')); await shot('conclave-esito', true);
  const testoPlancia = await page.textContent('#plancia');
  assert.ok(!/Traditore|Sigillo usato|scommesso/.test(testoPlancia), 'la plancia non svela niente');
  bene('cabina: voti, Patto, Sigillo, scommesse, telefono bloccato, ricarica');

  // ---- Era II e verifica
  await page.click('#cApri'); assert.equal((await St()).era, 2); await shot('era2', true);
  await tieni('#cFineEra'); assert.ok(await vis('verifica'));
  // Ada ha 2 verdi (obbligo e decreto Rinascimento se eletto), Diego… Bruno ha vinto la scommessa su Diego? no
  const domande = await page.$$eval('#veCorpo button.dom', b => b.map(x => x.dataset.k));
  for (const k of domande) if (k.startsWith('0|') || k === '4|col:b:2' || k.endsWith('|colori:3')) await page.click(`#veCorpo button.dom[data-k="${k}"]`);
  await shot('verifica', true);
  await tieni('#veOk'); assert.ok(await vis('esito')); await shot('rivelazioni', true);
  st = await St();
  assert.equal(st.risultati[2].patti[0].esito, 'LT');
  assert.ok(st.punti[2] >= 2, 'Chiara ha tradito Ada che aveva completato');
  assert.ok(/ha tradito/.test(await page.textContent('#esCorpo')));
  await page.click('#esAvanti'); assert.ok(await vis('plancia')); assert.equal((await St()).c, 3);
  // annulla la verifica e la rifà uguale
  await tieni('#pAnnulla'); assert.equal((await St()).fase, 'verifica');
  await page.click('#cVerifica');
  for (const k of domande) if (k.startsWith('0|') || k === '4|col:b:2' || k.endsWith('|colori:3')) await page.click(`#veCorpo button.dom[data-k="${k}"]`);
  await tieni('#veOk'); await page.click('#esAvanti');
  assert.equal(JSON.stringify((await St()).punti), JSON.stringify(st.punti), 'stessa verifica, stessi punti');
  bene('Era II: verifica, rivelazioni, annulla e rifai');

  // ---- Conclave III, senza accordi
  await tieni('#cUrne');
  for (let i = 0; i < 5; i++) {
    await tieni('#paApri');
    await page.click('#cbCorpo .dec[data-voto]:nth-of-type(2)');
    // il primo che ha un potere usabile lo usa
    const pot = await page.$('#cbCorpo [data-x="potere"]'), scr = await page.$('#cbCorpo [data-x="scrut"]');
    if (scr) { await scr.click(); await shot('scrutinio'); }
    else if (pot) {
      await pot.click();
      const v = await page.$('#cbCorpo [data-pv]'); if (v) await v.click();
      const sb = await page.$('#cbCorpo [data-sb]'); if (await page.$('#cbCorpo [data-sa]') && !(await page.isEnabled('#cbSigilla'))) { await sb.click(); await page.click('#cbCorpo [data-sa]'); }
    }
    if (!(await page.isEnabled('#cbSigilla'))) { const p2 = await page.$('#cbCorpo [data-x="potere"]'); if (p2) await p2.click(); }
    await tieni('#cbSigilla');
  }
  if (await vis('passa')) { await tieni('#paApri'); await page.click('#sgCopri'); }
  await page.click('#cApri'); await tieni('#cFineEra');
  await tieni('#veOk'); await page.click('#esAvanti');
  st = await St();
  if (st.soc) {
    assert.equal(st.fase, 'missioni');
    await page.click('#cMissioni'); await shot('missioni', true);
    const m = await page.$('#veCorpo button.dom[data-k]'); if (m) await m.click();
    await tieni('#veOk');
  }
  assert.ok(await vis('fine')); await shot('fine', true);
  st = await St(); assert.equal(st.fase, 'finita');
  await page.click('#fiArch'); assert.ok(await vis('archivio')); await shot('archivio', true);
  assert.ok(/Traditore/.test(await page.textContent('#arCorpo')), 'l’archivio svela il tradimento');
  await page.click('#arBack');
  const storico = await page.evaluate(() => JSON.parse(localStorage.getItem('gds-societa-storico')));
  assert.equal(storico.length, 1);
  bene('Conclave III, missioni, classifica, archivio, storico');

  // ---- punti nel conteggio di 7 Wonders
  await page.click('#fi7w'); await page.click('#ifBtns .btn:first-child');
  await page.waitForURL(/7wonders/); await page.waitForTimeout(400);
  const w = await page.evaluate(() => JSON.parse(localStorage.getItem('giochidisimo:7wonders')));
  assert.deepEqual(w.players.map(p => p.name), ['Ada', 'Bruno', 'Chiara', 'Diego', 'Elena']);
  assert.deepEqual(w.players.map(p => p.ext), st.punti);
  assert.equal(w.extra, true);
  await shot('7wonders-extra', true);
  await page.goto(BASE + 'giochi/societa/'); assert.ok(await vis('fine'));
  assert.ok(/Già nel conteggio/.test(await page.textContent('#fi7w')));
  bene('punti portati nella riga Extra del conteggio di 7 Wonders');

  await page.click('#fiNuova'); assert.ok(await vis('inizio'));
  assert.equal(errori.length, 0, errori.join('\n'));
  console.log('nessun errore nelle pagine; schermate in', OUT);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
