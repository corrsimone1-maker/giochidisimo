// Prova nel browser delle stanze di Claude Machine (ognuno col suo telefono), con broker MQTT finti.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/machine.stanze.test.js
// Ogni telefono è un contesto separato. mqtt.min.js viene sostituito da un client finto che parla con
// tre broker finti tenuti qui in node (messaggi retained, cancellazione col messaggio vuoto, scadenza MQTT 5).
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const ROOT = process.env.ROOT || 'http://localhost:8765/';
const PAGINA = ROOT + 'giochi/machine/';
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };
// con SCATTI=cartella salva gli screenshot delle schermate principali
const SCATTI = process.env.SCATTI; const scatto = async (t, nome) => { if (SCATTI) await t.page.screenshot({ path: `${SCATTI}/${nome}.png` }); };

/* ---------- broker finti ---------- */
const brokers = {};
const B = url => brokers[url] || (brokers[url] = { retained: new Map(), clients: new Map(), log: [], giu: false });
const combacia = (pat, t) => pat.endsWith('/#') ? t.startsWith(pat.slice(0, -1)) : pat === t;
const vivo = m => !m.scade || m.scade > Date.now();
async function consegna(page, id, tipo, a, b) {
  try { await page.evaluate(([id, k, a, b]) => window.__fbConsegna && window.__fbConsegna(id, k, a, b), [id, tipo, a, b]); } catch (e) {}
}
const CLIENT_FINTO = `(() => {
  let n = 0; const clienti = {};
  window.__fbConsegna = (id, k, a, b) => { const c = clienti[id]; if (!c || c.finito) return;
    if (k === 'connect') { c.connected = true; c.emit('connect'); }
    else if (k === 'msg') c.emit('message', a, new TextEncoder().encode(b));
    else if (k === 'close') { c.connected = false; c.emit('close'); } };
  window.mqtt = { connect(url, opts) {
    const id = 'c' + (++n) + Math.random().toString(36).slice(2, 7), L = {};
    const c = { id, url, opts, finito: false, connected: false,
      on(e, f) { (L[e] = L[e] || []).push(f); return c; },
      once(e, f) { const g = (...a) => { c.off(e, g); f(...a); }; return c.on(e, g); },
      off(e, f) { L[e] = (L[e] || []).filter(x => x !== f); return c; },
      emit(e, ...a) { (L[e] || []).slice().forEach(f => f(...a)); },
      subscribe(t) { window.__fb('sub', { url, id, t }); },
      publish(t, m, o) { if (!c.connected) return; window.__fb('pub', { url, id, t, m: String(m), retain: !!(o && o.retain), props: (o && o.properties) || null, v: opts.protocolVersion }); },
      end() { c.finito = true; c.connected = false; window.__fb('end', { url, id }); } };
    clienti[id] = c;
    setTimeout(() => window.__fb('connect', { url, id, v: opts.protocolVersion }), 5);
    return c;
  } };
})();`;

(async () => {
  const browser = await chromium.launch();
  const errori = [];
  async function telefono(nome) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.route(/mqtt\.min\.js/, r => r.fulfill({ contentType: 'application/javascript', body: CLIENT_FINTO }));
    await ctx.exposeBinding('__fb', async ({ page }, tipo, d) => {
      const br = B(d.url);
      if (tipo === 'connect') { if (br.giu) return; br.clients.set(d.id, { page, subs: new Set(), v: d.v }); consegna(page, d.id, 'connect'); }
      else if (tipo === 'sub') {
        const c = br.clients.get(d.id); if (!c) return; c.subs.add(d.t);
        for (const [t, m] of br.retained) if (combacia(d.t, t) && vivo(m)) await consegna(page, d.id, 'msg', t, m.m);
      } else if (tipo === 'pub') {
        br.log.push(d);
        if (d.retain) { if (d.m === '') br.retained.delete(d.t); else br.retained.set(d.t, { m: d.m, scade: d.props && d.props.messageExpiryInterval ? Date.now() + d.props.messageExpiryInterval * 1000 : null, props: d.props }); }
        for (const [id, c] of br.clients) if ([...c.subs].some(p => combacia(p, d.t))) consegna(c.page, id, 'msg', d.t, d.m);
      } else if (tipo === 'end') br.clients.delete(d.id);
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errori.push(nome + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errori.push(nome + ' console: ' + m.text()); });
    await page.goto(PAGINA);
    const T = {
      nome, page, ctx,
      ev: (f, a) => page.evaluate(f, a),
      tap: sel => page.tap(sel),
      tieni: async sel => { const b = await page.locator(sel).first().boundingBox(); await page.mouse.move(b.x + 10, b.y + 10); await page.mouse.down(); await page.waitForTimeout(1350); await page.mouse.up(); await page.waitForTimeout(450); },
      aspetta: (f, a, ms = 8000) => page.waitForFunction(f, a, { timeout: ms, polling: 100 }),
      imposta: async (o) => { await page.evaluate(o => { localStorage.setItem('gds-machine', JSON.stringify(o)); }, o); },
      ricarica: async () => { await page.reload(); await page.waitForTimeout(300); }
    };
    return T;
  }
  const retained = (c, sotto) => Object.values(brokers).map(b => b.retained.get(`claude-machine/v1/${c}/${sotto}`)).map(x => x && JSON.parse(x.m));
  const pausa = ms => new Promise(r => setTimeout(r, ms));

  /* 1. Collaborativa: creare, entrare, storico unico, dichiarazione, chiudere e cancellare */
  {
    const a = await telefono('Simo'), b = await telefono('Luca');
    await a.imposta({ livello: 'medio', modo: 'coop', telefoni: 'tanti', nome: 'Simo' }); await a.ricarica();
    await a.tap('#impBtn'); await a.tap('[data-az="crea-stanza"]');
    await a.aspetta(() => S && S.st && R && R.links.some(l => l.metaVisto));
    const c = await a.ev(() => S.st.c);
    assert.ok(/^[A-Z0-9]{5}$/.test(c));
    await pausa(300);
    const metas = retained(c, 'meta');
    assert.ok(metas.every(m => m && m.modo === 'coop' && m.puzzle), 'meta su tutti e tre i server');
    assert.ok(Object.values(brokers).every(br => { const m = br.retained.get(`claude-machine/v1/${c}/meta`); return m.props && m.props.messageExpiryInterval > 11 * 3600; }), 'meta con scadenza di 12 ore (MQTT 5)');
    bene('stanza collaborativa creata: meta con puzzle e scadenza su tutti i server');

    // Luca entra col codice, dopo aver scelto Versus: deve adattarsi alla stanza
    await b.imposta({ livello: 'insano', modo: 'versus', telefoni: 'tanti', nome: 'Luca' }); await b.ricarica();
    await b.tap('#impBtn'); await b.page.fill('#codiceIn', c.toLowerCase()); await b.tap('[data-az="entra-stanza"]');
    await b.aspetta(() => S && S.puzzle && S.st.modo === 'coop');
    assert.deepEqual(await b.ev(() => S.puzzle), await a.ev(() => S.puzzle), 'stesso puzzle');
    const sec = await a.ev(() => S.puzzle.codice);
    // Luca fa una prova con due domande
    for (const [i, n] of [[0, 1], [1, 2], [2, 3]]) await b.tap(`[data-cod="${i}-${n}"]`);
    await b.tap('[data-ch="0"]'); await b.tap('[data-ch="1"]');
    await a.aspetta(() => document.querySelectorAll('.nastro td.chi').length === 1 && document.querySelector('.nastro td.chi').textContent === 'Luca');
    await b.tap('[data-az="coop-nuova-prova"]');
    // Simo fa una domanda: lo storico è unico
    for (const [i, n] of [[0, 4], [1, 4], [2, 4]]) await a.tap(`[data-cod="${i}-${n}"]`);
    await a.tap('[data-ch="2"]');
    await b.aspetta(() => [...document.querySelectorAll('.nastro td.chi')].map(x => x.textContent).join(',') === 'Tu,Simo');
    await b.tap('[data-az="foglio-stanza"]'); await b.page.waitForTimeout(300); await scatto(b, 'coop-foglio-stanza'); await b.tap('#foglio [data-az="chiudi-foglio"]');
    await b.ev(() => document.querySelector('.nastro').scrollIntoView()); await scatto(b, 'coop-nastro');
    assert.equal(await a.ev(() => totaliSquadra().domande), 3);
    bene('collaborativa: chi entra si adatta alla stanza, le prove di tutti finiscono su un nastro unico, domande contate insieme');

    // Luca dichiara il codice giusto: fine per tutti e due
    await b.tap('[data-az="soluzione"]');
    for (let i = 0; i < 3; i++) await b.tap(`[data-sol="${i}-${sec[i]}"]`);
    await b.tieni('[data-tieni="verifica"]');
    await a.aspetta(() => S.fine && S.fine.tipo === 'vinto');
    await b.aspetta(() => S.fine && S.fine.tipo === 'vinto');
    assert.equal(await a.ev(() => S.fine.domande), 3);
    bene('collaborativa: la dichiarazione giusta di uno chiude la partita su tutti i telefoni');

    // Simo chiude e cancella la stanza
    await a.tieni('[data-tieni="chiudi-stanza"]');
    await pausa(800);
    for (const br of Object.values(brokers)) {
      const meta = br.retained.get(`claude-machine/v1/${c}/meta`);
      assert.ok(meta && JSON.parse(meta.m).chiusa, 'lapide sul meta');
      assert.ok(!JSON.parse(meta.m).puzzle, 'la lapide non porta più il puzzle');
      assert.ok(meta.props.messageExpiryInterval >= 23 * 3600, 'la lapide scade dopo un giorno');
      const giocatori = [...br.retained.keys()].filter(t => t.startsWith(`claude-machine/v1/${c}/g/`));
      assert.deepEqual(giocatori, [], 'giocatori cancellati');
    }
    assert.equal(await a.ev(() => !!(S.st)), false, 'Simo è tornato sul telefono');
    await b.aspetta(() => !S.st);
    assert.equal(await b.ev(() => JSON.parse(localStorage.getItem('gds-machine-stanze') || '[]').length), 0, 'stanza tolta dall’elenco di Luca');
    assert.equal(await a.ev(() => JSON.parse(localStorage.getItem('gds-machine-stanze') || '[]').length), 0, 'stanza tolta dall’elenco di Simo');
    bene('chiudi e cancella: lapide senza dati su tutti i server, giocatori cancellati, gli altri tornano sul loro telefono');

    // Un telefono che riapre il codice non scrive niente
    const prima = Object.values(brokers).reduce((n, br) => n + br.log.length, 0);
    await b.tap('#impBtn'); await b.tap('[data-set="telefoni:tanti"]');
    await b.page.fill('#codiceIn', c); await b.tap('[data-az="entra-stanza"]');
    await pausa(1200);
    const scritti = Object.values(brokers).flatMap(br => br.log.slice()).slice(prima).filter(d => d.t.includes(c) && d.m !== '' && !JSON.parse(d.m).chiusa);
    assert.deepEqual(scritti, [], 'nessuno stato scritto su una stanza chiusa');
    assert.equal(await b.ev(() => !!S.st), false);
    bene('una stanza chiusa non si riapre: chi rientra col codice non scrive niente');
    await a.ctx.close(); await b.ctx.close();
  }

  /* 2. Versus con tre telefoni: sala d'attesa, round insieme, eliminazione, vittoria, nuova stanza per tutti */
  {
    const t = [await telefono('Simo'), await telefono('Luca'), await telefono('Marta')];
    for (const x of t) { await x.imposta({ livello: 'difficile', modo: 'versus', telefoni: 'tanti', nome: x.nome }); await x.ricarica(); }
    await t[0].tap('#impBtn'); await t[0].tap('[data-az="crea-stanza"]');
    await t[0].aspetta(() => S && S.st && R && R.links.some(l => l.metaVisto));
    const c = await t[0].ev(() => S.st.c);
    for (const x of t.slice(1)) { await x.tap('#impBtn'); await x.page.fill('#codiceIn', c); await x.tap('[data-az="entra-stanza"]'); }
    await t[0].aspetta(() => elencoGiocatori().length === 3);
    await t[0].page.waitForTimeout(200); await scatto(t[0], 'stanza-attesa');
    assert.equal(await t[1].ev(() => !!document.querySelector('[data-az="stanza-inizia"]')), false, 'solo chi crea inizia');
    await t[0].tap('[data-az="stanza-inizia"]');
    for (const x of t) await x.aspetta(() => statoVersus().fase === 'gioco');
    const sec = await t[0].ev(() => S.puzzle.codice);
    bene('versus: sala d’attesa con codice, chi crea fa iniziare la partita a tutti');

    // round 1: Luca dichiara sbagliato, Simo fa 2 domande e passa, Marta passa
    for (const [i, n] of [[0, 2], [1, 2], [2, 2]]) await t[0].tap(`[data-cod="${i}-${n}"]`);
    await t[0].tap('[data-ch="0"]'); await t[0].tap('[data-ch="3"]');
    await t[0].tap('[data-az="versus-fine-round"]'); await t[0].tap('[data-az="vs-passo"]');
    assert.equal(await t[0].ev(() => statoVersus().round), 1, 'il round aspetta gli altri');
    await t[0].aspetta(() => /Aspettiamo/.test(document.getElementById('barra').textContent));
    await scatto(t[0], 'versus-aspetta');
    const sbagliato = sec.map((x, i) => i === 2 ? (x % 5) + 1 : x);
    await t[1].tap('[data-az="versus-fine-round"]'); await t[1].tap('[data-az="vs-voglio-dichiarare"]');
    for (let i = 0; i < 3; i++) await t[1].tap(`[data-sol="${i}-${sbagliato[i]}"]`);
    await t[1].tieni('[data-tieni="sigilla"]');
    await t[2].tap('[data-az="versus-fine-round"]'); await t[2].tap('[data-az="vs-passo"]');
    for (const x of t) await x.aspetta(() => statoVersus().round === 2);
    assert.equal(await t[1].ev(() => statoVersus().attivo), false, 'Luca eliminato');
    assert.equal(await t[0].ev(() => S.st.io.r), 2, 'Simo passa al round 2');
    assert.equal(await t[0].ev(() => S.st.banco.storico.length), 1, 'le domande di Simo restano solo sul suo nastro');
    bene('versus: il round si chiude quando tutti hanno finito; chi dichiara sbagliato è eliminato, gli altri passano al round dopo');

    // round 2: Simo dichiara giusto, Marta giusto anche lei ma con più domande
    await t[2].ev(() => { S.st.banco.codice = [1, 1, 1]; });
    for (const [i, n] of [[0, 3], [1, 3], [2, 3]]) await t[2].tap(`[data-cod="${i}-${n}"]`);
    await t[2].tap('[data-ch="1"]'); await t[2].tap('[data-ch="2"]'); await t[2].tap('[data-ch="4"]');
    for (const x of [t[0], t[2]]) {
      await x.tap('[data-az="versus-fine-round"]'); await x.tap('[data-az="vs-voglio-dichiarare"]');
      for (let i = 0; i < 3; i++) await x.tap(`[data-sol="${i}-${sec[i]}"]`);
      await x.tieni('[data-tieni="sigilla"]');
    }
    for (const x of t) await x.aspetta(() => S.fine && S.fine.tipo === 'versus');
    for (const x of t) assert.deepEqual(await x.ev(() => S.fine.vincitori), ['Simo'], x.nome + ' vede vincere Simo (2 domande contro 3)');
    bene('versus: con due codici giusti vince chi ha fatto meno domande, lo vedono tutti');

    // Simo apre una nuova partita: gli altri lo seguono nella stanza nuova
    await t[0].tap('[data-az="stanza-nuova"]');
    await t[0].aspetta(() => S.st && S.st.c && !S.fine);
    const c2 = await t[0].ev(() => S.st.c);
    assert.notEqual(c2, c);
    for (const x of t.slice(1)) await x.aspetta(c2 => S && S.st && S.st.c === c2 && !!S.puzzle, c2);
    await t[0].aspetta(() => elencoGiocatori().length === 3);
    await pausa(500);
    assert.ok(retained(c, 'meta').every(m => m.chiusa && m.prossima === c2), 'la vecchia stanza è una lapide che punta alla nuova');
    assert.ok(Object.values(brokers).every(br => ![...br.retained.keys()].some(k => k.startsWith(`claude-machine/v1/${c}/g/`))), 'giocatori della vecchia stanza cancellati');
    bene('nuova partita: la vecchia stanza si chiude e si cancella, tutti passano alla nuova da soli');

    // Marta ricarica la pagina: rientra nella stanza con il suo stato
    await t[2].ricarica();
    await t[2].aspetta(c2 => S && S.st && S.st.c === c2 && R && R.meta, c2);
    bene('ricaricando la pagina si rientra nella stanza');

    // Simo chiude e cancella dal foglio della stanza
    await t[0].tap('[data-az="foglio-stanza"]');
    await t[0].tieni('#foglio [data-tieni="chiudi-stanza"]');
    for (const x of t) await x.aspetta(() => !S.st);
    await pausa(500);
    assert.ok(retained(c2, 'meta').every(m => m.chiusa));
    bene('chiudi e cancella dal foglio della stanza: tutti i telefoni escono');
    for (const x of t) await x.ctx.close();
  }

  /* 3. Versus: chi se ne va si toglie, chi arriva tardi guarda e basta */
  {
    const t = [await telefono('Simo'), await telefono('Luca'), await telefono('Marta')];
    for (const x of t) { await x.imposta({ livello: 'medio', modo: 'versus', telefoni: 'tanti', nome: x.nome }); await x.ricarica(); }
    await t[0].tap('#impBtn'); await t[0].tap('[data-az="crea-stanza"]');
    await t[0].aspetta(() => S && S.st && R && R.links.some(l => l.metaVisto));
    const c = await t[0].ev(() => S.st.c);
    await t[1].tap('#impBtn'); await t[1].page.fill('#codiceIn', c); await t[1].tap('[data-az="entra-stanza"]');
    await t[0].aspetta(() => elencoGiocatori().length === 2);
    await t[0].tap('[data-az="stanza-inizia"]');
    await t[1].aspetta(() => statoVersus().fase === 'gioco');
    // Marta arriva tardi: vede la partita iniziata e non entra nel round
    await t[2].tap('#impBtn'); await t[2].page.fill('#codiceIn', c); await t[2].tap('[data-az="entra-stanza"]');
    await t[2].aspetta(() => /Partita già iniziata/.test(document.getElementById('vista').textContent));
    assert.equal(await t[0].ev(() => statoVersus().gioc.length), 2, 'Marta non è tra chi gioca');
    bene('versus: chi arriva a partita iniziata non entra nei round');
    // Luca chiude l'app; Simo finisce il round e lo toglie
    await t[1].ctx.close();
    await t[0].tap('[data-az="versus-fine-round"]'); await t[0].tap('[data-az="vs-passo"]');
    await t[0].aspetta(() => /Aspettiamo/.test(document.getElementById('barra').textContent));
    await t[0].tap('[data-az="foglio-stanza"]');
    await t[0].tap('#foglio [data-az="togli"]');
    await t[0].aspetta(() => S.fine && S.fine.tipo === 'versus');
    assert.deepEqual(await t[0].ev(() => S.fine.vincitori), ['Simo'], 'resta solo Simo');
    bene('versus: «Togli» libera il round bloccato da chi se n’è andato');
    await t[0].ctx.close(); await t[2].ctx.close();
  }

  /* 4. Stanze vecchie di questo telefono: si cancellano da sole all'apertura */
  {
    const a = await telefono('Simo');
    // una stanza aperta 13 ore fa, rimasta sui server
    const c = 'QQQQQ';
    for (const br of Object.values(brokers)) {
      br.retained.set(`claude-machine/v1/${c}/meta`, { m: JSON.stringify({ v: 1, t: Date.now() - 13 * 3600e3, modo: 'coop', livello: 'medio', puzzle: { v: 1 }, host: 'x' }) });
      br.retained.set(`claude-machine/v1/${c}/g/x`, { m: JSON.stringify({ n: 3, nome: 'Simo' }) });
    }
    await a.ev(c => localStorage.setItem('gds-machine-stanze', JSON.stringify([{ c, t: Date.now() - 13 * 3600e3, host: true, modo: 'coop', livello: 'medio', pid: 'x' }])), c);
    await a.ricarica();
    await pausa(9000);
    assert.ok(retained(c, 'meta').every(m => m.chiusa), 'lapide scritta');
    assert.ok(Object.values(brokers).every(br => !br.retained.has(`claude-machine/v1/${c}/g/x`)), 'giocatore cancellato');
    assert.equal(await a.ev(() => JSON.parse(localStorage.getItem('gds-machine-stanze')).length), 0);
    bene('stanze di più di 12 ore: all’apertura si chiudono e si cancellano da sole');

    // Cancellare una stanza dall'elenco in Impostazioni
    const c2 = 'WWWWW';
    for (const br of Object.values(brokers)) br.retained.set(`claude-machine/v1/${c2}/meta`, { m: JSON.stringify({ v: 1, t: Date.now(), modo: 'coop', livello: 'medio', puzzle: { v: 1 }, host: 'y' }) });
    await a.ev(c2 => localStorage.setItem('gds-machine-stanze', JSON.stringify([{ c: c2, t: Date.now(), host: true, modo: 'coop', livello: 'medio', pid: 'y' }])), c2);
    await a.tap('#impBtn');
    await a.tieni('[data-tieni="cancella-lista"]');
    await pausa(7000);
    assert.ok(retained(c2, 'meta').every(m => m.chiusa), 'lapide scritta');
    assert.equal(await a.ev(() => JSON.parse(localStorage.getItem('gds-machine-stanze')).length), 0);
    bene('Impostazioni: «Cancella» chiude e cancella una stanza dell’elenco');
    await a.ctx.close();
  }

  await browser.close();
  if (errori.length) { console.log('ERRORI DELLA PAGINA:\n' + errori.join('\n')); process.exit(1); }
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
