// Prova nel browser di MENTAL a schermo iPhone (390×844, tocco), con l'orologio del browser spostato:
// giorno del lancio (inizio, tempo che continua dopo un ricaricamento, corone risolte toccando, condivisione),
// allenamento che non tocca il tempo ufficiale, tutti i tipi di sfida finiti dall'interfaccia (griglie, enigmi
// con numeri, frazioni e parole, codici, in fila, moneta falsa, calcolatrice, travasi), consegne sbagliate
// (+1 minuto), mina, resa, calendario senza giorni futuri, mezzanotte a partita aperta, giorno senza sfida
// pronta, prima del lancio, «I miei tempi».
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/mental.pagina.test.js
// Gli screenshot finiscono nella cartella temporanea del sistema (mental-schermate), o in SCATTI=cartella.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const path = require('path');
const OUT = process.env.SCATTI || path.join(require('os').tmpdir(), 'mental-schermate');
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8765/giochi/mental/';
const bene = m => console.log('ok  ', m);

(async () => {
  const browser = await chromium.launch();
  const errori = [];
  let n = 0;
  async function telefono(quando) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch (e) { /* */ } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errori.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errori.push('console: ' + m.text()); });
    await page.clock.install({ time: new Date(quando) });
    await page.clock.resume();
    await page.goto(BASE);
    await page.waitForTimeout(400);
    return page;
  }
  const shot = async (page, nome) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${nome}.png` }); };
  const tieni = async (page, sel, ms = 1500) => { const el = await page.$(sel); const b = await el.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(200); };
  const visibile = (page, id) => page.isVisible('#' + id);
  const sto = page => page.evaluate(() => JSON.parse(localStorage.getItem('gds-mental-storico') || 'null'));
  const tocca = (page, i) => page.tap(`#tav [data-i="${i}"]`);

  /* ---------- 1. Giorno del lancio ---------- */
  const a = await telefono('2026-10-22T08:00:00Z');                     // 10:00 a Roma
  assert.equal((await a.textContent('#oNum')).trim(), '#001');
  assert.match(await a.textContent('#oCorpo'), /Corone/);
  assert.equal((await a.textContent('#oCta')).trim(), 'Inizia la sfida');
  await shot(a, 'oggi');
  await a.tap('#oCta');
  await a.waitForSelector('#sGioco:not([hidden])');
  assert.equal(await a.evaluate(() => G.s.gioco), 'corone');
  await a.clock.fastForward(65000);
  await a.waitForTimeout(400);
  assert.match(await a.textContent('#gTempo'), /^1:0[5-9]$/, 'il tempo scorre');
  // una croce e poi una corona sulla stessa casella, poi annulla
  const sol1 = await a.evaluate(() => soluzione(G.s));
  const vuota = sol1.findIndex(x => !x);
  await tocca(a, vuota); assert.equal(await a.evaluate(i => G.P.st.c[i], vuota), 1);
  await a.tap('#sAnn'); assert.equal(await a.evaluate(i => G.P.st.c[i], vuota), 0);
  // trascinando si mettono croci
  const b0 = await (await a.$('#tav [data-i="0"]')).boundingBox(), b3 = await (await a.$('#tav [data-i="3"]')).boundingBox();
  await a.mouse.move(b0.x + 5, b0.y + 5); await a.mouse.down(); await a.mouse.move(b3.x + 5, b3.y + 5, { steps: 6 }); await a.mouse.up();
  assert.deepEqual(await a.evaluate(() => G.P.st.c.slice(0, 4)), [1, 1, 1, 1], 'trascinando: croci in fila');
  await a.tap('#sAnn');
  // ricarico: il tempo non riparte
  await a.reload(); await a.waitForTimeout(500);
  assert.ok(await visibile(a, 'sGioco'), 'si riapre la partita');
  assert.ok(/^1:\d\d$/.test(await a.textContent('#gTempo')), 'il tempo continua dopo il ricaricamento');
  await shot(a, 'corone');
  // risolvo toccando: due tocchi per corona
  const corone = sol1.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
  for (const i of corone.slice(0, -1)) { await tocca(a, i); await tocca(a, i); }
  await shot(a, 'corone-quasi');
  const n1 = await a.evaluate(() => G.s.p.n);
  const ultima = corone[corone.length - 1];
  await tocca(a, ultima); await tocca(a, ultima);
  await a.waitForSelector('#sEsito:not([hidden])', { timeout: 4000 });
  const r1 = (await sto(a)).giorni['2026-10-22'];
  assert.equal(r1.esito, 'risolta'); assert.ok(r1.giornata); assert.ok(r1.ms >= 65000 && r1.ms < 200000, 'tempo ' + r1.ms);
  assert.match(await a.textContent('#eCorpo'), /Risolta/);
  assert.match(await a.textContent('#eCorpo'), /Il giorno stesso/);
  assert.match(await a.textContent('#eCorpo'), /Le chiavi/);
  await shot(a, 'esito');
  await a.tap('#eCond');
  const testo = await a.evaluate(() => navigator.clipboard.readText());
  assert.match(testo, /^MENTAL #001 · Corone\n/); assert.match(testo, /Risolta in \d+:\d\d/); assert.match(testo, /giochi\/mental\//);
  bene(`lancio: #001 Corone, tempo che continua dopo il ricaricamento, risolta toccando (${n1}×${n1}), condivisione senza spoiler`);
  // allenamento: non tocca lo storico
  await a.tap('#eProva');
  await a.waitForSelector('#sGioco:not([hidden])'); assert.match(await a.textContent('#gSotto'), /Allenamento/);
  await a.tap('#gRegole'); await tieni(a, '#veloBox .btn.hold:last-of-type');
  await a.waitForSelector('#velo:not([hidden])'); assert.match(await a.textContent('#veloBox'), /non conta/);
  await shot(a, 'allenamento');
  assert.deepEqual((await sto(a)).giorni['2026-10-22'], r1, 'l’allenamento non cambia il tempo ufficiale');
  await a.tap('#veloBox .btn.sec');
  await a.waitForSelector('#sOggi:not([hidden])'); await a.waitForTimeout(200); assert.equal((await a.textContent('#oCta')).trim(), 'Risultato');
  assert.equal(await a.getAttribute('#oSett .giornino.oggi .segno', 'class'), 'segno risolta');
  bene('allenamento: si rigioca, la soluzione si vede, il tempo ufficiale resta');
  await a.context().close();

  /* ---------- 2. Tutti i tipi di sfida, all'ultimo giorno pronto ---------- */
  const I = (() => { const ctx = {}; new Function('self', require('fs').readFileSync(path.join(__dirname, '..', 'giochi', 'mental', 'sfide', 'indice.js'), 'utf8'))(ctx); return ctx.MENTAL_INDICE; })();
  const OGGI = I.ultimo;
  const b = await telefono(OGGI + 'T10:00:00Z');
  const giorni = await b.evaluate(async () => {
    for (const m of MENTAL_INDICE.mesi) await caricaMese(m);
    const o = {}, tutti = {}, forme = {};
    for (const s of Object.values(MENTAL.dati).sort((x, y) => (x.data < y.data ? -1 : 1))) {
      const t = MENTAL.tipoSfida(s.gioco, s.p);
      o[s.gioco] = s.data; o[t] = s.data; (tutti[s.gioco] = tutti[s.gioco] || []).push(s.data);
      if (s.gioco === 'enigma') forme[s.p.forma] = s.data;
    }
    return { ultimo: o, tutti, forme, tipi: [...new Set(Object.values(MENTAL.dati).map(s => MENTAL.tipoSfida(s.gioco, s.p)))] };
  });
  assert.ok(giorni.tipi.length >= 20, 'tipi di sfida nel calendario: ' + giorni.tipi.length);
  for (const g of ['corone', 'stelle', 'binario', 'sudoku', 'campo', 'grattacieli', 'futoshiki', 'nonogramma', 'cavalieri', 'codice:lucchetto', 'codice:colori', 'linea', 'bilancia', 'calcolatrice', 'travasi']) assert.ok(giorni.ultimo[g], g + ' nel calendario');
  for (const f of ['numero', 'frazione', 'parola', 'parole']) assert.ok(giorni.forme[f], 'enigma con risposta ' + f);
  const apri = async d => { await b.evaluate(d => { location.hash = ''; }, d); await b.waitForTimeout(150); await b.evaluate(d => inizia(d), d); await b.waitForSelector('#sGioco:not([hidden])'); await b.waitForTimeout(200); };
  const quasi = (fn) => b.evaluate(fn);
  let finite = 0;
  const esito = async (g, atteso = 'risolta') => {
    await b.waitForSelector('#sEsito:not([hidden])', { timeout: 5000 });
    const d = await b.evaluate(() => location.hash.split('=')[1]);
    const r = (await sto(b)).giorni[d];
    assert.equal(r.esito, atteso, g + ': ' + atteso);
    assert.equal(r.giornata, d === OGGI, g + ': il giorno stesso solo se è oggi');
    finite++;
    return r;
  };
  const sbagliata = async g => {
    await b.waitForSelector('#toast:not([hidden])'); assert.match(await b.textContent('#toast'), /\+1 minuto/, g);
    assert.ok(await visibile(b, 'sGioco'), g + ': consegna sbagliata, si resta in gioco');
    await b.waitForTimeout(150);
  };
  // segni: stelle
  await apri(giorni.ultimo.stelle);
  await shot(b, 'stelle');
  let ult = await quasi(() => { const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol), k = sol.lastIndexOf(1); st.c[k] = 0; G.P.st = st; disegnaGioco(); return k; });
  await tocca(b, ult); await tocca(b, ult); await esito('stelle');
  // binario
  await apri(giorni.ultimo.binario);
  ult = await quasi(() => { const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol), k = G.s.p.g.findIndex(x => x < 0); st.c[k] = -1; G.P.st = st; disegnaGioco(); return [k, sol[k]]; });
  for (let t = 0; t <= ult[1]; t++) await tocca(b, ult[0]);
  await esito('binario');
  // cifre: sudoku, grattacieli, futoshiki (tocco sulla casella e poi sul tastierino)
  for (const g of ['sudoku', 'grattacieli', 'futoshiki']) {
    await apri(giorni.ultimo[g]);
    ult = await quasi(() => { const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol), dati = G.s.gioco === 'sudoku' ? G.s.p.g : (G.s.p.dati || []); const k = sol.findIndex((_, i) => !dati[i]); st.v[k] = 0; G.P.st = st; disegnaGioco(); return [k, sol[k]]; });
    await tocca(b, ult[0]);
    await b.tap('#sNote'); await b.tap(`.tasto[data-k="${ult[1] === 1 ? 2 : 1}"]`); await b.tap('#sNote');
    await b.tap(`.tasto[data-k="${ult[1]}"]`);
    await esito(g);
  }
  const versi = await b.evaluate(() => Object.values(MENTAL.dati).filter(s => s.gioco === 'futoshiki').every(d => { const sol = soluzione(d); return d.p.dis.every(([x, y]) => sol[x] < sol[y]); }));
  assert.ok(versi, 'futoshiki: ogni coppia [a, b] ha a < b nella soluzione');
  // nonogramma
  await apri(giorni.ultimo.nonogramma);
  ult = await quasi(() => { const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol), k = sol.lastIndexOf(1); st.c[k] = 0; G.P.st = st; disegnaGioco(); return k; });
  await tocca(b, ult); await esito('nonogramma');
  // campo: l'ultima casella libera; e su un altro campo una mina
  await apri(giorni.ultimo.campo);
  ult = await quasi(() => { const sol = soluzione(G.s), libere = sol.map((x, i) => (x ? -1 : i)).filter(i => i >= 0 && G.P.st.s[i] === 0); const k = libere[libere.length - 1]; sol.forEach((x, i) => { if (!x && i !== k) G.P.st.s[i] = 1; }); disegnaGioco(); return k; });
  await tocca(b, ult); await esito('campo');
  await apri(giorni.tutti.campo[0]);
  const mina = await quasi(() => [...G.aux.mine][0]);
  const bm = await (await b.$(`#tav [data-i="${mina}"]`)).boundingBox();
  await b.mouse.move(bm.x + 8, bm.y + 8); await b.mouse.down(); await b.waitForTimeout(600); await b.mouse.up(); await b.waitForTimeout(150);
  assert.equal(await b.evaluate(i => G.P.st.s[i], mina), 2, 'tenendo premuto si mette la bandiera');
  await tocca(b, mina); assert.equal(await b.evaluate(i => G.P.st.s[i], mina), 2, 'una bandiera non si scopre');
  await b.tap('#sAnn'); assert.equal(await b.evaluate(i => G.P.st.s[i], mina), 0, 'annulla toglie la bandiera');
  await tocca(b, mina);
  await esito('campo (mina)', 'persa');
  // sinceri e bugiardi: consegna sbagliata (+1 minuto), poi giusta
  await apri(giorni.ultimo.cavalieri);
  const solC = await b.evaluate(() => soluzione(G.s));
  for (let i = 0; i < solC.length; i++) await b.tap(`#tav .scelta [data-i="${i}"][data-v="${i === 0 ? (solC[0] ? 2 : 1) : (solC[i] ? 1 : 2)}"]`);
  await b.tap('#sConsegna'); await sbagliata('cavalieri');
  await b.tap(`#tav .scelta [data-i="0"][data-v="${solC[0] ? 1 : 2}"]`);
  await b.tap('#sConsegna');
  const rc = await esito('cavalieri');
  assert.equal(rc.consegne, 1); assert.equal(rc.pen, 60000); assert.ok(rc.ms >= 60000);
  assert.match(await b.textContent('#eCorpo'), /Come si ragiona/);
  // corone: resa (tenendo premuto)
  await apri(giorni.ultimo.corone);
  await b.tap('#gRegole');
  await tieni(b, '#veloBox .btn.hold:last-of-type');
  await esito('corone', 'arresa');
  assert.match(await b.textContent('#eCorpo'), /Non risolta/);
  bene('i nove giochi del lancio si finiscono dall’interfaccia; mina = persa; resa = non risolta; consegna sbagliata = +1 minuto');

  // enigma con un numero: tastierino, prima sbagliato e poi giusto
  const tasti = async testo => { for (const t of testo) await b.tap(`.tastiera-num .tasto[data-t="${t === '-' ? '−' : t}"]`); };
  const cancella = async () => { while ((await b.evaluate(() => String(G.P.st.v || ''))).length) await b.tap('.tastiera-num .tasto[data-t="⌫"]'); };
  await apri(giorni.forme.numero);
  const rn = await quasi(() => String(G.E.statoRisolto(G.s.p).v));
  assert.ok(await b.isDisabled('#sConsegna'), 'consegna spenta finché non si scrive');
  await tasti(rn === '7' ? '8' : '7'); await shot(b, 'enigma-numero');
  await b.tap('#sConsegna'); await sbagliata('enigma numero');
  assert.match(await b.textContent('#tav'), /Già consegnate, sbagliate/);
  await cancella(); await tasti(rn); await b.tap('#sConsegna');
  const re = await esito('enigma numero');
  assert.equal(re.consegne, 1); assert.equal(re.pen, 60000);
  assert.match(await b.textContent('#eCorpo'), /La risposta/);
  await shot(b, 'enigma-esito');
  // enigma con una frazione: la stessa frazione non ridotta vale
  await apri(giorni.forme.frazione);
  const rf = await quasi(() => String(G.E.statoRisolto(G.s.p).v));
  const [nu, de] = rf.split('/');
  await tasti(`${nu * 2}/${de * 2}`); await b.tap('#sConsegna');
  await esito('enigma frazione');
  // enigma con una parola: maiuscole, accenti e articolo non contano
  await apri(giorni.forme.parola);
  const rp = await quasi(() => String(G.E.statoRisolto(G.s.p).v));
  await b.fill('#rIn', 'una cosa sbagliata'); await b.tap('#sConsegna'); await sbagliata('enigma parola');
  await b.fill('#rIn', '  ' + rp.toUpperCase() + ' '); await shot(b, 'enigma-parola');
  await b.tap('#sConsegna'); await esito('enigma parola');
  // enigma con più parole: dopo una consegna sbagliata quelle giuste restano bloccate
  await apri(giorni.forme.parole);
  const rr = await quasi(() => G.E.statoRisolto(G.s.p).v);
  for (let i = 0; i < rr.length; i++) await b.fill(`#tav input[data-i="${i}"]`, i === rr.length - 1 ? 'sbagliata' : 'L’' + rr[i]);
  await b.tap('#sConsegna'); await sbagliata('enigma parole');
  assert.ok(await b.isDisabled('#tav input[data-i="0"]'), 'il campo giusto si blocca');
  assert.ok(!(await b.isDisabled(`#tav input[data-i="${rr.length - 1}"]`)), 'quello sbagliato no');
  await b.fill(`#tav input[data-i="${rr.length - 1}"]`, rr[rr.length - 1]);
  await shot(b, 'enigma-parole');
  await b.tap('#sConsegna'); await esito('enigma parole');
  bene('enigmi: numero dal tastierino, frazione non ridotta, parola con maiuscole e spazi, più parole con i campi giusti bloccati');

  // codici: lucchetto e colori, dalla tavolozza
  for (const t of ['codice:lucchetto', 'codice:colori']) {
    await apri(giorni.ultimo[t]);
    const cod = await quasi(() => G.E.soluzione(G.s.p).codice);
    const sb = cod.slice(); sb[0] = (sb[0] + 1) % (await quasi(() => G.s.p.K)); if (t === 'codice:lucchetto' && sb.slice(1).includes(sb[0])) sb[0] = (sb[0] + 1) % 10;
    for (const k of sb) await b.tap(`.tavolozza .colore[data-k="${k}"]`);
    await b.tap('#sConsegna'); await sbagliata(t);
    await b.tap('.risposta-codice .slot[data-i="0"]'); await b.tap(`.tavolozza .colore[data-k="${cod[0]}"]`);
    await shot(b, t.replace(':', '-'));
    await b.tap('#sConsegna'); await esito(t);
  }
  // in fila: si mettono in ordine toccando, un annulla in mezzo
  await apri(giorni.ultimo.linea);
  const ord = await quasi(() => G.E.statoRisolto(G.s.p, soluzione(G.s)).v);
  await b.tap(`.ordine-da .chip[data-i="${ord[1]}"]`); await b.tap('#sAnn');
  for (const i of ord) await b.tap(`.ordine-da .chip[data-i="${i}"]`);
  await shot(b, 'linea');
  await b.tap('#sConsegna'); await esito('linea');
  // moneta falsa: la moneta e il verso
  await apri(giorni.ultimo.bilancia);
  const mf = await quasi(() => G.E.statoRisolto(G.s.p, soluzione(G.s)).v);
  await b.tap(`.monete .moneta[data-k="${mf.k}"]`); await b.tap(`.peso button[data-h="${-mf.h}"]`);
  await b.tap('#sConsegna'); await sbagliata('bilancia');
  await b.tap(`.peso button[data-h="${mf.h}"]`);
  await shot(b, 'bilancia');
  await b.tap('#sConsegna'); await esito('bilancia');
  // calcolatrice rotta: una mossa annullata, poi la strada giusta
  await apri(giorni.ultimo.calcolatrice);
  const seq = await quasi(() => soluzione(G.s));
  await b.tap(`.calc-tasto[data-i="${seq[0]}"]`); await b.tap('#sAnn');
  assert.equal(await b.evaluate(() => G.P.st.seq.length), 0);
  for (const i of seq) await b.tap(`.calc-tasto[data-i="${i}"]`);
  await esito('calcolatrice');
  // travasi: riempi, vuota, versa toccando prima una brocca e poi l'altra
  await apri(giorni.ultimo.travasi);
  const mos = await quasi(() => soluzione(G.s));
  for (const m of mos) {
    if (m.t === 'riempi') await b.tap(`[data-r="${m.i}"]`);
    else if (m.t === 'svuota') await b.tap(`[data-s="${m.i}"]`);
    else { await b.tap(`.brocca[data-i="${m.i}"]`); await b.tap(`.brocca[data-i="${m.j}"]`); }
  }
  await esito('travasi');
  await shot(b, 'travasi-esito');
  bene('lucchetto, codice a colori, in fila, moneta falsa, calcolatrice rotta e travasi si finiscono dall’interfaccia');

  /* ---------- 3. Calendario e «I miei tempi» ---------- */
  const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const meseTesto = d => `${mesi[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  await b.evaluate(() => { location.hash = '#calendario'; });
  await b.waitForSelector('#sCal:not([hidden])'); await b.waitForTimeout(200);
  assert.match(await b.textContent('#cCorpo'), new RegExp(meseTesto(OGGI)));
  assert.equal(await b.$$eval('#cCorpo .giorno[data-d]', x => x.length), +OGGI.slice(8), 'giorni fino a oggi');
  await shot(b, 'calendario');
  for (let k = 0; k < 24 && !(await b.isDisabled('#cPrima')); k++) { await b.tap('#cPrima'); await b.waitForTimeout(250); }
  assert.match(await b.textContent('#cCorpo'), /ottobre 2026/);
  assert.equal(await b.$$eval('#cCorpo .giorno[data-d]', x => x.length), 10, 'ottobre: dal 22 al 31');
  await b.tap('#cCorpo .giorno[data-d="2026-10-25"]');
  await b.waitForSelector('#velo:not([hidden])'); assert.match(await b.textContent('#veloBox'), /Non giocata/);
  await b.tap('#veloBox .btn.sec');
  await b.evaluate(() => { location.hash = '#tempi'; });
  await b.waitForSelector('#sTempi:not([hidden])'); await b.waitForTimeout(200);
  assert.equal(await b.$$eval('#tCorpo .elenco li', x => x.length), finite);
  await shot(b, 'tempi');
  await b.tap('#tCopia');
  const elenco = await b.evaluate(() => navigator.clipboard.readText());
  assert.match(elenco, /^MENTAL · i miei tempi\n/); assert.equal(elenco.split('\n').length, finite + 1);
  bene(`calendario solo fino a oggi e dal lancio; «I miei tempi» con ${finite} sfide e l’elenco da copiare`);
  // un giorno nel mezzo: i giorni dopo non si vedono
  await b.clock.setSystemTime(new Date('2026-12-15T10:00:00Z'));
  await b.evaluate(() => { location.hash = '#calendario=2026-12'; });
  await b.waitForTimeout(400);
  assert.equal(await b.$$eval('#cCorpo .giorno[data-d]', x => x.length), 15, 'dicembre il 15: solo 15 giorni');
  assert.ok(await b.isDisabled('#cDopo'));
  bene('niente sfide future nel calendario');
  await b.context().close();

  /* ---------- 4. Mezzanotte a partita aperta (ora solare: Roma = UTC+1) ---------- */
  const c = await telefono('2026-12-30T22:58:30Z');                   // 23:58:30 a Roma
  assert.equal((await c.textContent('#oNum')).trim(), '#070');
  assert.match(await c.textContent('#oConto'), /00:01:3\d|00:01:2\d/);
  await c.tap('#oCta');
  await c.waitForSelector('#sGioco:not([hidden])');
  await c.clock.fastForward(100000);                                  // passa mezzanotte
  await c.waitForTimeout(400);
  assert.match(await c.textContent('#toast'), /mezzanotte/);
  await c.evaluate(() => { const sol = soluzione(G.s); G.P.st = G.E.statoRisolto(G.s.p, sol); controllaFine(); });
  await c.waitForSelector('#sEsito:not([hidden])');
  const rm = (await sto(c)).giorni['2026-12-30'];
  assert.equal(rm.esito, 'risolta'); assert.equal(rm.giornata, false, 'finita dopo mezzanotte: non il giorno stesso');
  assert.match(await c.textContent('#eCorpo'), /dopo mezzanotte/);
  await c.evaluate(() => { location.hash = ''; }); await c.waitForTimeout(400);
  assert.equal((await c.textContent('#oNum')).trim(), '#071', 'a mezzanotte arriva la sfida nuova');
  bene('mezzanotte: la partita continua, vale come «dopo mezzanotte», la home passa al giorno nuovo');
  await c.context().close();

  /* ---------- 5. Giorno senza sfida pronta e prima del lancio ---------- */
  const d = await telefono('2030-01-01T10:00:00Z');
  assert.match(await d.textContent('#oCorpo'), /non è ancora pronta/);
  assert.equal(await d.$('#oCta'), null, 'nessuna sfida a caso');
  await shot(d, 'non-pronta');
  await d.context().close();
  const e = await telefono('2026-10-21T10:00:00Z');
  assert.match(await e.textContent('#oCorpo'), /MENTAL parte/);
  await e.context().close();
  bene('giorno senza sfida: avviso, niente sfida inventata; prima del lancio: avviso');

  console.log(errori.length ? 'ERRORI:\n' + errori.join('\n') : 'nessun errore nelle pagine');
  assert.equal(errori.length, 0);
  console.log('schermate in', OUT);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
