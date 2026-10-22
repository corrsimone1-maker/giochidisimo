// Prova nel browser della pulizia dei dati (comune/pulizia.js), con l'orologio spostato in avanti.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/pulizia.test.js
// Se aggiungi un gioco con dei «dati» in giochi.js, aggiungi qui un caso.
const { chromium, devices } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const OUT = require('os').tmpdir() + '/gds-prove'; require('fs').mkdirSync(OUT, { recursive: true });
const ROOT = process.env.ROOT || 'http://localhost:8765/';
const D = 864e5;
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

(async () => {
  const browser = await chromium.launch();
  const errori = [];
  async function telefono() {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr|unpkg\.com/, r => r.abort());
    // orologio spostabile: localStorage.__off millisecondi in avanti
    await ctx.addInitScript(() => { try { const off = Number(localStorage.getItem('__off') || 0); if (off) { const real = Date.now.bind(Date); Date.now = () => real() + off; } } catch (e) {} });
    const page = await ctx.newPage();
    page.on('pageerror', e => errori.push(page.url() + ' → ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|mqtt/.test(m.text())) errori.push(page.url() + ' console: ' + m.text()); });
    const T = {
      page,
      // passando per about:blank la pagina si ricarica sempre, anche se cambia solo il #
      vai: async (p, giorni) => { if (giorni != null) await T.sposta(giorni); await page.goto('about:blank'); await page.goto(ROOT + p); await page.waitForLoadState('load'); await page.waitForTimeout(150); },
      ev: (f, a) => page.evaluate(f, a),
      get: k => page.evaluate(k => JSON.parse(localStorage.getItem(k)), k),
      sposta: async giorni => { if (!page.url().startsWith('http')) await page.goto(ROOT + 'README.md'); await page.evaluate(o => localStorage.setItem('__off', String(o)), Math.round(giorni * D)); }
    };
    return T;
  }

  /* 1. Dati di prima: non si perdono, il conto parte dalla prima apertura */
  {
    const t = await telefono();
    await t.vai('README.md');   // pagina senza pulizia
    await t.ev(() => { localStorage.setItem('gds-lupus-partita', '{"carte":[],"idx":0}'); localStorage.setItem('gds-giocatori', '["Simo","Luca"]'); localStorage.setItem('gds-lupus', '{"conteggi":{"lupo":2}}'); });
    await t.vai('', 30);
    assert.ok(await t.get('gds-lupus-partita')); assert.ok(await t.get('gds-giocatori'));
    await t.vai('', 36);
    assert.ok(await t.get('gds-lupus'), '6 giorni dopo resta');
    await t.vai('', 38);
    for (const k of ['gds-lupus', 'gds-lupus-partita', 'gds-giocatori']) assert.equal(await t.get(k), null, k);
    await t.vai('giochi/lupus/');
    bene('dati salvati prima: restano, poi 8 giorni senza aprire Lupus cancellano partita, ruoli scelti e nomi');
    await t.page.context().close();
  }

  /* 2. Nomi in comune: restano finché un gioco che li usa è stato aperto negli ultimi 7 giorni */
  {
    const t = await telefono();
    await t.vai('giochi/impostore/', 0);
    await t.ev(() => { localStorage.setItem('gds-giocatori', '["Simo","Luca","Marta"]'); localStorage.setItem('gds-impostore-v2', '{"pacchetti":{"meme":true},"imp":2}'); });
    await t.vai('giochi/lupus/', 5);                        // Lupus solo aperto
    await t.vai('', 10);
    assert.equal(await t.get('gds-impostore-v2'), null, 'Impostore scaduto: pacchetti tolti');
    assert.deepEqual(await t.get('gds-giocatori'), ['Simo', 'Luca', 'Marta'], 'i nomi restano: Lupus aperto 5 giorni fa');
    await t.vai('', 13);
    assert.equal(await t.get('gds-giocatori'), null, 'scaduti tutti: via anche i nomi');
    bene('nomi in comune: restano finché Impostore, Lupus o Dossier è stato aperto negli ultimi 7 giorni');
    await t.page.context().close();
  }

  /* 3. Contapunti: usarlo rinnova i 7 giorni; poi via anche i nomi delle squadre */
  {
    const t = await telefono();
    await t.vai('giochi/contapunti/', 0);
    await t.ev(() => { S.squadre[0].nome = 'Rossi'; S.squadre[1].nome = 'Blu'; save(); });
    await t.vai('giochi/contapunti/');
    await t.page.click('#startBtn'); await t.page.waitForTimeout(200);
    const bb = await t.page.$eval('#board .panel', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width * 0.5, y: r.y + r.height * 0.3 }; });
    await t.page.mouse.click(bb.x, bb.y); await t.page.waitForTimeout(150);
    assert.ok((await t.get('gds-contapunti')).partita.punti.some(p => p > 0), 'punto segnato');
    await t.vai('giochi/contapunti/', 6);
    assert.ok((await t.get('gds-contapunti')).partita, 'dopo 6 giorni la partita c\'è');
    await t.vai('', 12);
    assert.ok((await t.get('gds-contapunti')).partita, 'aperto 6 giorni fa: c\'è ancora');
    await t.vai('', 14);
    assert.equal(await t.get('gds-contapunti'), null);
    await t.vai('giochi/contapunti/');
    const s = await t.get('gds-contapunti');
    assert.ok(!s || (!s.partita && s.squadre.every(q => !q.nome)), 'squadre senza nome');
    assert.ok(await t.page.isVisible('#startBtn'));
    await t.page.screenshot({ path: OUT + '/contapunti-pulito.png' });
    bene('Contapunti: aprirlo rinnova i 7 giorni; 8 giorni dopo l\'ultima apertura via partita e nomi delle squadre');
    await t.page.context().close();
  }

  /* 4. Segnapunti: tre giochi nella stessa chiave, ognuno con la sua scadenza */
  {
    const t = await telefono();
    await t.vai('giochi/segnapunti/#tresette', 0);
    await t.ev(() => { state.g3.names = ['Noi', 'Loro']; state.g3.rows[0][0].pt = 6; state.g3.rows[0][1].pt = 5; save(); });
    await t.vai('giochi/segnapunti/#dichiarare');
    await t.ev(() => { state.g1.names = ['Simo', 'Ugo', 'Eva']; state.g1.rows[0][0].n = 2; save(); });
    await t.vai('giochi/segnapunti/#dichiarare', 5);
    await t.vai('', 8);
    const sp = await t.get('segnapunti-prese-v2');
    assert.equal(sp.g3, undefined, 'Tresette (aperto 8 giorni fa) cancellato');
    assert.deepEqual(sp.g1.names, ['Simo', 'Ugo', 'Eva'], 'Dichiarare (aperto 3 giorni fa) resta');
    await t.vai('giochi/segnapunti/#tresette');
    assert.deepEqual(await t.ev(() => state.g3.names), ['Noi', 'Voi'], 'Tresette riparte con i nomi di base');
    bene('Segnapunti: Tresette non aperto da 8 giorni torna nuovo (nomi compresi), Dichiarare aperto da 3 resta');
    await t.page.context().close();
  }

  /* 5. Perudo, Conta Monete, Hex, 7 Wonders, Dossier, Chi inizia, Camel Up, Codenames, Secret Societies, Claude Machine: tutto via, storici restano */
  {
    const t = await telefono();
    await t.vai('giochi/perudo/', 0); await t.page.click('#minusBtn'); await t.ev(() => { S.dadi = '#123456'; save(); });
    await t.vai('giochi/contamonete/'); await t.ev(() => { S.perse = 2; S.faccia = '2e'; save(); });
    await t.vai('giochi/hex/'); await t.ev(() => { G.mosse.push([0, 0]); salva(); });
    await t.vai('giochi/7wonders/'); await t.ev(() => { state.extra = true; state.players[0].name = 'Simo'; state.players[0].mil = 9; save(); localStorage.setItem('giochidisimo:7wonders:storico', '[{"date":1,"players":[]}]'); });
    await t.vai('giochi/dossier/'); await t.ev(() => localStorage.setItem('gds-dossier-storico', '[{"esito":"x"}]'));
    await t.vai('giochi/chiinizia/'); await t.ev(() => localStorage.setItem('gds-chiinizia', '{"modo":"squadre"}'));
    await t.vai('giochi/camelup/'); await t.ev(() => { localStorage.setItem('gds-camelup', '{"cfg":{"capitale":80},"primo":1}'); localStorage.setItem('gds-camelup-partita', JSON.stringify(CU.nuovaPartita({ nomi: ['Simo', 'Luca'] }, CU.randIntCrypto))); localStorage.setItem('gds-camelup-storico', '[{"n":2}]'); });
    await t.vai('giochi/codenames/'); await t.ev(() => { localStorage.setItem('gds-codenames', '{"cfg":{"nInt":4},"primo":"B"}'); localStorage.setItem('gds-codenames-partita', JSON.stringify(DA.nuovaPartita({}, DA.randIntCrypto))); localStorage.setItem('gds-codenames-storico', '[{"id":"x"}]'); });
    await t.vai('giochi/societa/'); await t.ev(() => { localStorage.setItem('gds-societa', '{"cfg":{"soglia":1}}'); localStorage.setItem('gds-societa-partita', JSON.stringify(Object.assign(SS.nuovaPartita({ nomi: ['Simo', 'Luca', 'Eva'] }, SS.randIntCrypto), { ui: {} }))); localStorage.setItem('gds-societa-storico', '[{"id":"x","punti":[1]}]'); });
    await t.vai('giochi/alibi/'); await t.ev(() => { localStorage.setItem('gds-alibi', '{"modo":"coop","livello":"difficile"}'); localStorage.setItem('gds-alibi-partita', JSON.stringify({ v: 1, par: { codice: 'ACDEFG', nomi: ['Simo'], livello: 'facile', modo: 'coop', luogo: 'villa' }, telefoni: 'uno', io: null, consegna: 1, inizio: 1, accusa: null, tac: {}, host: true })); localStorage.setItem('gds-alibi-storico', '[{"codice":"x","giusto":true}]'); });
    await t.vai('giochi/machine/'); await t.ev(() => { cfg.livello = 'insano'; salvaCfg(); S.loc.domande = 3; salva(); localStorage.setItem('gds-machine-stanze', JSON.stringify([{ c: 'AAAAA', t: Date.now(), host: true, modo: 'coop', livello: 'medio', pid: 'x' }])); });
    const prima = await t.ev(() => Object.keys(localStorage).sort());
    await t.vai('', 8);
    const dopo = await t.ev(() => Object.keys(localStorage).sort());
    console.log('     prima:', prima.join(', ')); console.log('     dopo: ', dopo.join(', '));
    for (const k of ['gds-perudo', 'gds-contamonete', 'gds-hex', 'gds-hex-partita', 'giochidisimo:7wonders', 'gds-dossier', 'gds-dossier-partita', 'gds-chiinizia', 'gds-camelup', 'gds-camelup-partita', 'gds-codenames', 'gds-codenames-partita', 'gds-societa', 'gds-societa-partita', 'gds-alibi', 'gds-alibi-partita', 'gds-machine', 'gds-machine-partita', 'gds-machine-stanze']) assert.ok(!dopo.includes(k), k + ' cancellata');
    assert.ok(dopo.includes('giochidisimo:7wonders:storico') && dopo.includes('gds-dossier-storico') && dopo.includes('gds-camelup-storico') && dopo.includes('gds-codenames-storico') && dopo.includes('gds-societa-storico') && dopo.includes('gds-alibi-storico'), 'storici restano');
    await t.vai('giochi/perudo/');
    assert.equal((await t.get('gds-perudo')).valori.length, 5); assert.notEqual((await t.get('gds-perudo')).dadi, '#123456');
    await t.vai('giochi/camelup/');
    assert.ok(await t.page.isVisible('#inizio') && await t.page.isHidden('#resumePan'), 'Camel Up riparte senza partita');
    await t.vai('giochi/codenames/');
    assert.ok(await t.page.isVisible('#inizio') && await t.page.isHidden('#resumePan'), 'Codenames riparte senza partita');
    await t.vai('giochi/societa/');
    assert.ok(await t.page.isVisible('#inizio') && await t.page.isHidden('#resumePan'), 'Secret Societies riparte senza partita');
    await t.vai('giochi/alibi/');
    assert.ok(await t.page.isVisible('#inizio') && await t.page.isHidden('#resumePan'), 'ALIBI riparte senza caso');
    await t.vai('giochi/machine/');
    assert.equal(await t.ev(() => S.loc.domande + ':' + S.cfg.livello), '0:medio', 'Claude Machine riparte da Medio senza domande');
    bene('Perudo, Conta Monete, Hex, 7 Wonders, Dossier, Chi inizia, Camel Up, Codenames, Secret Societies, Claude Machine: dopo 8 giorni tutto come nuovo, storici intatti');
    await t.page.context().close();
  }

  /* 6. Poker: tavoli vecchi via anche se il poker si usa; a poker scaduto via anche il nome */
  {
    const t = await telefono();
    await t.vai('README.md', 0);
    await t.ev(now => {
      const st = (c, t) => JSON.stringify({ app: 'fiches', code: c, t, phase: 'lobby', players: [], aids: [], hist: [], ver: 1 });
      localStorage.setItem('fiches:st:VECCH', st('VECCH', now - 8 * 864e5));
      localStorage.setItem('fiches:st:NUOVO', st('NUOVO', now - 2 * 864e5));
      localStorage.setItem('fiches:st:CHIUS', JSON.stringify({ app: 'fiches', code: 'CHIUS', t: now, phase: 'closed', players: [], aids: [], hist: [], ver: 1 }));
      localStorage.setItem('fiches:last', '{"code":"VECCH","pid":"x"}'); localStorage.setItem('fiches:session', '{"code":"VECCH","pid":"x"}');
      localStorage.setItem('fiches:name', '"Simo"'); localStorage.setItem('fiches:device', '"DEV"');
    }, Date.now());
    await t.vai('giochi/poker/');
    assert.equal(await t.get('fiches:st:VECCH'), null); assert.equal(await t.get('fiches:st:CHIUS'), null); assert.ok(await t.get('fiches:st:NUOVO'));
    assert.equal(await t.get('fiches:last'), null); assert.equal(await t.get('fiches:session'), null);
    assert.equal(await t.get('fiches:name'), 'Simo');
    assert.ok(await t.page.isVisible('#home'), 'non rientra in un tavolo vecchio');
    await t.vai('', 8);
    assert.equal(await t.get('fiches:st:NUOVO'), null); assert.equal(await t.get('fiches:name'), null); assert.equal(await t.get('fiches:device'), 'DEV');
    bene('Poker: tavoli fermi da 7 giorni o chiusi via subito; 8 giorni senza poker via anche il nome');
    await t.page.context().close();
  }

  /* 7. Tasto «Pulisci tutto» in home */
  {
    const t = await telefono();
    await t.vai('giochi/perudo/', 0); await t.page.click('#minusBtn');
    await t.vai('giochi/contapunti/'); await t.ev(() => { S.squadre[0].nome = 'Rossi'; save(); });
    await t.vai('giochi/segnapunti/#tresette'); await t.ev(() => { state.g3.names = ['A', 'B']; save(); });
    await t.vai('giochi/lupus/'); await t.ev(() => { localStorage.setItem('gds-giocatori', '["Simo"]'); localStorage.setItem('gds-lupus', '{"x":1}'); localStorage.setItem('giochidisimo:7wonders:storico', '[1]'); localStorage.setItem('fiches:name', '"Simo"'); localStorage.setItem('fiches:device', '"DEV"'); localStorage.setItem('altro-sito', '"non toccare"'); });
    await t.vai('');
    await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await t.page.waitForTimeout(100);
    const box = await (await t.page.$('#wipeBtn')).boundingBox(), share = await (await t.page.$('#shareBtn')).boundingBox();
    assert.ok(box.x < 60 && share.x > 250 && Math.abs(box.y - share.y) < 4, 'a sinistra, sulla riga di Condividi');
    await t.page.screenshot({ path: OUT + '/home-tasto.png' });
    await t.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await t.page.mouse.down(); await t.page.waitForTimeout(250); await t.page.mouse.up(); await t.page.waitForTimeout(100);
    assert.match(await t.page.textContent('#toast'), /Tieni premuto/);
    assert.ok(await t.get('gds-contapunti'), 'tocco breve: niente si cancella');
    await t.page.mouse.down(); await t.page.waitForTimeout(700); await t.page.screenshot({ path: OUT + '/home-tasto-carica.png' });
    await t.page.waitForTimeout(700); await t.page.mouse.up(); await t.page.waitForTimeout(100);
    assert.match(await t.page.textContent('#toast'), /come nuovi/);
    await t.page.screenshot({ path: OUT + '/home-pulito.png' });
    const resta = await t.ev(() => Object.keys(localStorage).filter(k => k !== '__off').sort());
    console.log('     dopo «Pulisci tutto» restano:', resta.join(', '));
    assert.deepEqual(resta, ['altro-sito', 'fiches:device', 'gds-ultimo-uso', 'giochidisimo:7wonders:storico'].sort());
    const sp = await t.get('segnapunti-prese-v2');
    assert.ok(!sp || (!sp.g1 && !sp.g2 && !sp.g3), 'segnapunti vuoto');
    bene('Pulisci tutto: tocco breve avvisa e basta; tenuto premuto cancella tutto, restano storici e le chiavi di altri siti');
    for (const p of ['giochi/segnapunti/#pegno', 'giochi/segnapunti/', 'giochi/contamonete/', 'giochi/contapunti/', 'giochi/impostore/', 'giochi/lupus/', 'giochi/perudo/', 'giochi/hex/', 'giochi/poker/', 'giochi/7wonders/', 'giochi/chiinizia/', 'giochi/dossier/', 'giochi/camelup/', 'giochi/codenames/', 'giochi/societa/', 'giochi/machine/', 'giochi/alibi/', '#expansions', '#carte', '']) await t.vai(p);
    bene('tutte le pagine si aprono da pulite');
    await t.page.context().close();
  }

  console.log(errori.length ? 'ERRORI:\n' + errori.join('\n') : 'nessun errore nelle pagine');
  assert.equal(errori.length, 0);
  await browser.close();
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
