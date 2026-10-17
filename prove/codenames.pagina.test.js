// Prova nel browser di Codenames: Double Agents: una partita intera a schermo iPhone (390×844, tocco),
// con indagine, intercettazione fallita e riuscita, messaggio criptato, annullamento, refresh, privacy e debriefing.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/codenames.pagina.test.js
// Gli screenshot finiscono nella cartella temporanea del sistema (codenames-schermate).
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const OUT = require('path').join(require('os').tmpdir(), 'codenames-schermate');
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
  const shot = async (nome, full = false) => { await page.waitForTimeout(260); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${nome}.png`, fullPage: full }); };
  const vis = async id => page.isVisible('#' + id);
  const tieni = async (sel, ms = 900) => { const el = await page.$(sel); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(150); };
  const P = async () => page.evaluate(() => JSON.parse(localStorage.getItem('gds-codenames-partita')));
  const St = async () => page.evaluate(() => DA.stato(JSON.parse(localStorage.getItem('gds-codenames-partita'))));

  await page.goto(BASE + 'giochi/codenames/');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await shot('inizio', true);
  await page.click('#bilBtn'); await shot('bilanciamento', true);
  await page.click('#bilBack');
  await page.click('#rulesBtn'); await shot('regole-inizio');
  await page.click('#esSchede button[data-v="vera"]'); await page.evaluate(() => document.querySelector('#cap4').scrollIntoView()); await shot('regole-mappe');
  await page.evaluate(() => document.querySelector('#cap6').scrollIntoView()); await shot('regole-punteggio');
  await page.evaluate(() => document.querySelector('#cap10').scrollIntoView()); await shot('regole-turno');
  await page.click('#regBack2');
  await page.click('#segPrimo button[data-v="R"]');
  await page.click('#playBtn');
  assert.ok(await vis('preparazione'));
  await shot('preparazione', true);
  // mappa rossa dalla preparazione: un tocco breve non apre
  await page.click('#prepMappaR'); assert.ok(await vis('protezione')); await shot('protezione');
  await page.click('#prApri'); await page.waitForTimeout(200); assert.ok(await vis('protezione'), 'un tocco breve non apre');
  await tieni('#prApri'); assert.ok(await vis('mappa')); await page.waitForTimeout(700); await shot('mappa-rossa');
  const v = await page.evaluate(() => [...document.querySelectorAll('#mGriglia .cella')].map(c => c.className));
  assert.equal(v.filter(c => /mioR/.test(c)).length, 10); assert.equal(v.filter(c => /\bass\b/.test(c)).length, 1);
  await page.click('#mNascondi'); assert.ok(await vis('preparazione'));
  await page.click('#prepGo'); assert.ok(await vis('plancia'));
  await shot('plancia-inizio', true);
  let p = await P();
  const mie = s => p.mappa.map((c, i) => c === s || c === 'D' ? i : -1).filter(i => i >= 0);
  // ---- Turno rosso: indagine
  await page.click('#cIndagine'); await tieni('#prApri');
  await page.click(`#mGriglia button.cella[data-i="${mie('R')[0]}"]`); await shot('indagine-scelta');
  await tieni('#mConferma'); assert.ok(await vis('rivelazione')); await shot('indagine-esito');
  await page.click('#rvOk'); assert.ok(await vis('plancia'));
  assert.equal(await page.isVisible('#cIndagine'), false, 'indagine usata');
  // privacy: la plancia non contiene la posizione indagata
  // ---- indizio pubblico
  await page.click('#cPubblico'); await page.click('#ivNumeri button[data-n="2"]'); await page.fill('#ivParola', 'spazio'); await shot('indizio-velo');
  await page.click('#ivOk'); await page.waitForTimeout(700);
  assert.equal((await St()).fase, 'controspionaggio'); await shot('controspionaggio', true);
  await page.click('#cContro'); await tieni('#prApri'); await page.waitForTimeout(400);
  // il blu intercetta una carta che il rosso NON toccherà per prima
  p = await P();
  const rosse = mie('R'), bersaglio = p.mappa.findIndex((c, i) => c === 'N');
  await page.click(`#mGriglia button.cella[data-i="${bersaglio}"]`); await shot('intercetta-scelta');
  await tieni('#mConferma'); assert.ok(await vis('neutro')); await shot('intercetta-neutro');
  const testoNeutro1 = await page.textContent('#neutro');
  await page.click('#neOk'); assert.ok(await vis('plancia')); await page.waitForTimeout(700);
  await shot('tocchi-plancia', true);
  // tocco: scelta e conferma
  p = await P();
  const prima = rosse.find(i => p.mappa[i] === 'R');
  await page.click(`#pGriglia button.cella[data-i="${prima}"]`); await shot('tocco-scelto');
  await page.click('#cRivela'); assert.ok(await vis('esitoVelo')); await shot('esito-fallita');
  assert.match(await page.textContent('#esitoBox'), /Intercettazione blu fallita/);
  await page.waitForTimeout(500); await page.click('#esOk');
  // un doppio agente
  p = await P();
  const doppio = p.mappa.findIndex((c, i) => c === 'D');
  await page.waitForTimeout(700);
  await page.click(`#pGriglia button.cella[data-i="${doppio}"]`); await page.click('#cRivela'); await shot('esito-doppio');
  assert.match(await page.textContent('#esitoBox'), /Doppio agente catturato/);
  await page.waitForTimeout(500); await page.click('#esOk'); await page.waitForTimeout(700);
  // terzo tentativo (max 3): un neutrale → fine turno
  const neutro = p.mappa.findIndex((c, i) => c === 'N' && i !== bersaglio);
  await page.click(`#pGriglia button.cella[data-i="${neutro}"]`); await page.click('#cRivela'); await shot('esito-neutrale');
  await page.waitForTimeout(500); await page.click('#esOk');
  assert.ok(await vis('neutro')); await shot('passaggio');
  await page.click('#neOk');
  // ---- Turno blu: messaggio criptato
  await page.waitForTimeout(700);
  await page.click('#cCripto'); await tieni('#prApri');
  await page.fill('#mParola', 'orbita'); await page.click('#mNumeri button[data-n="2"]'); await shot('cripto-componi');
  await tieni('#mConferma'); assert.ok(await vis('neutro')); await shot('cripto-trasmesso');
  await page.click('#neOk'); assert.ok(await vis('protezione')); await tieni('#prApri'); await page.waitForTimeout(800); await shot('cripto-lettura');
  assert.match(await page.textContent('#msParola'), /ORBITA/);
  await page.click('#msOk'); assert.ok(await vis('plancia'));
  const plancia = await page.textContent('#plancia');
  assert.ok(!/orbita/i.test(plancia), 'la parola criptata non è sulla plancia');
  await shot('cripto-plancia', true);
  // tocchi blu: due giusti e poi limite (3)
  p = await P();
  const blu = p.mappa.map((c, i) => c === 'B' ? i : -1).filter(i => i >= 0);
  for (const i of blu.slice(0, 3)) { await page.waitForTimeout(700); await page.click(`#pGriglia button.cella[data-i="${i}"]`); await page.click('#cRivela'); await page.waitForTimeout(500); await page.click('#esOk'); }
  assert.ok(await vis('neutro'), 'tentativi finiti → passaggio');
  assert.match(await page.textContent('#neTesto'), /Tentativi finiti/);
  await page.click('#neOk');
  // ---- Annulla: tieni premuto e conferma
  await page.waitForTimeout(700);
  await tieni('#pAnnulla', 1400); assert.ok(await vis('infoVelo')); await shot('annulla-conferma');
  assert.match(await page.textContent('#ifCorpo'), /resterà noto a tutti/);
  await page.click('#ifBtns .btn:first-child'); await page.waitForTimeout(300);
  let st = await St(); assert.equal(st.turno, 'B'); assert.equal(st.tentativi, 2);
  await shot('dopo-annulla', true);
  // il blu si ferma
  await page.click('#cStop'); await page.click('#ifBtns .btn:first-child'); assert.ok(await vis('neutro')); await page.click('#neOk');
  // ---- Ricarica a metà partita: tutto resta, si torna sulla plancia pubblica
  await page.reload(); await page.waitForTimeout(400); assert.ok(await vis('plancia'), 'dopo il refresh: plancia');
  const st2 = await St(); assert.equal(st2.turno, 'R');
  // privacy: aprire una mappa e nascondere la pagina la chiude
  await page.click('#pMappaB'); await tieni('#prApri'); assert.ok(await vis('mappa'));
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(200); assert.ok(await vis('plancia'), 'mappa chiusa quando il telefono si blocca');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
  // ---- Si gioca fino alla fine: il rosso trova i suoi esclusivi
  for (let giro = 0; giro < 30; giro++) {
    st = await St(); if (st.fase === 'finita') break;
    const s = st.turno;
    if (await vis('neutro')) { await page.click('#neOk'); await page.waitForTimeout(650); }
    if (await vis('esitoVelo')) { await page.click('#esOk'); await page.waitForTimeout(650); continue; }
    st = await St(); if (st.fase === 'finita') break;
    if (st.fase === 'indizio') { await page.waitForTimeout(650); await page.click('#cPubblico'); await page.click('#ivNumeri button[data-n="4"]'); await page.click('#ivOk'); await page.waitForTimeout(650); continue; }
    if (st.fase === 'controspionaggio') { await page.click('#cContro'); await tieni('#prApri'); await tieni('#mNessuna'); await page.click('#neOk'); await page.waitForTimeout(650); continue; }
    // tocchi: i rossi toccano un proprio esclusivo, i blu un neutrale (così il rosso vince)
    const lib = st.mappa.map((c, i) => st.rivelata[i] ? -1 : i).filter(i => i >= 0);
    const scelta = s === 'R' ? lib.find(i => st.mappa[i] === 'R') : lib.find(i => st.mappa[i] === 'N');
    await page.click(`#pGriglia button.cella[data-i="${scelta}"]`); await page.click('#cRivela'); await page.waitForTimeout(500);
    if ((await St()).fase === 'finita') { await shot('esito-vittoria'); await page.click('#esOk'); break; }
    await page.click('#esOk'); await page.waitForTimeout(650);
  }
  assert.ok(await vis('fine')); await shot('fine', true);
  await page.click('#fiDeb'); await shot('debriefing', true);
  const storico = await page.evaluate(() => JSON.parse(localStorage.getItem('gds-codenames-storico')));
  assert.equal(storico.length, 1); assert.equal(storico[0].vincitore, 'R');
  // ---- Intercettazione riuscita: la carta non si rivela e il turno passa
  await page.evaluate(() => {
    const P = DA.nuovaPartita({ primo: 'R' }, DA.randIntCrypto); P.ui = { pronta: true };
    localStorage.setItem('gds-codenames-partita', JSON.stringify(P));
  });
  await page.goto(BASE + 'giochi/codenames/'); await page.waitForTimeout(400);
  assert.ok(await vis('plancia'));
  await page.click('#cPubblico'); await page.click('#ivNumeri button[data-n="1"]'); await page.click('#ivOk'); await page.waitForTimeout(650);
  p = await P();
  const obiettivo = p.mappa.findIndex(c => c === 'R');
  await page.click('#cContro'); await tieni('#prApri');
  await page.click(`#mGriglia button.cella[data-i="${obiettivo}"]`); await tieni('#mConferma');
  const testoNeutro2 = await page.textContent('#neutro');
  assert.equal(testoNeutro2, testoNeutro1, 'la schermata dopo il controspionaggio è sempre la stessa');
  await page.click('#neOk'); await page.waitForTimeout(650);
  await page.click(`#pGriglia button.cella[data-i="${obiettivo}"]`); await page.click('#cRivela');
  assert.match(await page.textContent('#esitoBox'), /Intercettazione riuscita/); await shot('esito-intercettata');
  await page.waitForTimeout(500); await page.click('#esOk'); await page.click('#neOk'); await page.waitForTimeout(300);
  st = await St(); assert.equal(st.turno, 'B'); assert.equal(st.rivelata[obiettivo], false);
  assert.ok(!(await page.getAttribute(`#pGriglia .cella[data-i="${obiettivo}"]`, 'class')).match(/\b(R|B|N)\b/), 'la carta resta in gioco sulla plancia');
  // il primo tocco contro un'intercettazione non si annulla
  await tieni('#pAnnulla', 1400); assert.match(await page.textContent('#ifCorpo'), /non si annulla/); await page.click('#ifBtns .btn');

  // home: la carta dell'espansione in Expansions
  await page.goto(BASE + '#expansions'); await page.waitForTimeout(400); await shot('home-expansions');
  assert.ok((await page.textContent('body')).replace(/\u00A0/g, ' ').includes('Nome in Codice: Double Agents'));
  console.log(errori.length ? 'ERRORI:\n' + errori.join('\n') : 'nessun errore nella pagina');
  await browser.close();
  if (errori.length) process.exit(1);
  console.log('prova nel browser superata');
})().catch(e => { console.error(e); process.exit(1); });
