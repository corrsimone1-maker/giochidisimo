// Prova nel browser di MENTAL a schermo iPhone (390×844, tocco), con l'orologio del browser spostato:
// giorno del lancio (inizio, niente cronometro anche dopo un ricaricamento, corone risolte toccando, condivisione),
// allenamento che non tocca il risultato ufficiale, tutti i tipi di sfida finiti dall'interfaccia (griglie, enigmi
// con numeri, frazioni e parole, codici, in fila, moneta falsa, calcolatrice, travasi), consegne sbagliate
// (contate, senza minuti), mina, resa, calendario senza giorni futuri, mezzanotte a partita aperta, giorno senza
// sfida pronta, prima del lancio, «Le mie sfide», voci salvate col cronometro di prima.
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
  // niente tempi da nessuna parte: né «1:05» né «1:02:05» (il conto alla rovescia della home è a parte)
  const senzaTempi = async (page, sel, cosa) => assert.doesNotMatch(await page.textContent(sel), /\d:\d\d|\bmin\b|minut/, cosa + ': niente tempi');

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
  assert.equal(await a.$('#gTempo'), null, 'niente cronometro');
  await senzaTempi(a, '#sGioco', 'gioco');
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
  // ricarico: la partita si riapre, sempre senza tempo
  await a.reload(); await a.waitForTimeout(500);
  assert.ok(await visibile(a, 'sGioco'), 'si riapre la partita');
  await senzaTempi(a, '#sGioco', 'gioco dopo il ricaricamento');
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
  assert.equal(r1.esito, 'risolta'); assert.ok(r1.giornata); assert.equal(r1.ms, undefined, 'nessun tempo salvato'); assert.equal(r1.pen, undefined);
  assert.match(await a.textContent('#eCorpo'), /Risolta/);
  assert.match(await a.textContent('#eCorpo'), /Il giorno stesso/);
  assert.match(await a.textContent('#eCorpo'), /Le chiavi/);
  await senzaTempi(a, '#sEsito .esito', 'esito');
  await shot(a, 'esito');
  await a.tap('#eCond');
  const testo = await a.evaluate(() => navigator.clipboard.readText());
  assert.match(testo, /^MENTAL #001 · Corone\n/); assert.match(testo, /\n✅ Risolta\n/); assert.match(testo, /giochi\/mental\//);
  assert.doesNotMatch(testo, /\d:\d\d/, 'condivisione senza tempo');
  bene(`lancio: #001 Corone, niente cronometro nemmeno dopo il ricaricamento, risolta toccando (${n1}×${n1}), condivisione senza spoiler e senza tempo`);
  // allenamento: non tocca lo storico
  await a.tap('#eProva');
  await a.waitForSelector('#sGioco:not([hidden])'); assert.match(await a.textContent('#gSotto'), /Allenamento/);
  await a.tap('#gRegole'); await tieni(a, '#veloBox .btn.hold:last-of-type');
  await a.waitForSelector('#velo:not([hidden])'); assert.match(await a.textContent('#veloBox'), /non conta/);
  await shot(a, 'allenamento');
  assert.deepEqual((await sto(a)).giorni['2026-10-22'], r1, 'l’allenamento non cambia il risultato ufficiale');
  assert.match(await a.textContent('#veloBox'), /risultato ufficiale non cambia/);
  await a.tap('#veloBox .btn.sec');
  await a.waitForSelector('#sOggi:not([hidden])'); await a.waitForTimeout(200); assert.equal((await a.textContent('#oCta')).trim(), 'Risultato');
  assert.equal(await a.getAttribute('#oSett .giornino.oggi .segno', 'class'), 'segno risolta');
  bene('allenamento: si rigioca, la soluzione si vede, il risultato ufficiale resta');
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
  for (const g of ['corone', 'stelle', 'binario', 'sudoku', 'campo', 'grattacieli', 'futoshiki', 'nonogramma', 'cavalieri', 'codice:lucchetto', 'codice:colori', 'linea', 'bilancia', 'calcolatrice', 'travasi',
    'gabbie', 'kakuro', 'flotta', 'tende', 'luci', 'ponti', 'logigramma', 'criptaritmo']) assert.ok(giorni.ultimo[g], g + ' nel calendario');
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
    await b.waitForSelector('#toast:not([hidden])'); assert.match(await b.textContent('#toast'), /^Non è giusto$/, g);
    if (await b.$('#sPen')) assert.match(await b.textContent('#sPen'), /^Consegne sbagliate \d+$/, g + ': consegne contate, niente minuti');
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
  // sinceri e bugiardi: consegna sbagliata (si conta), poi giusta
  await apri(giorni.ultimo.cavalieri);
  const solC = await b.evaluate(() => soluzione(G.s));
  for (let i = 0; i < solC.length; i++) await b.tap(`#tav .scelta [data-i="${i}"][data-v="${i === 0 ? (solC[0] ? 2 : 1) : (solC[i] ? 1 : 2)}"]`);
  await b.tap('#sConsegna'); await sbagliata('cavalieri');
  await b.tap(`#tav .scelta [data-i="0"][data-v="${solC[0] ? 1 : 2}"]`);
  await b.tap('#sConsegna');
  const rc = await esito('cavalieri');
  assert.equal(rc.consegne, 1); assert.equal(rc.pen, undefined); assert.equal(rc.ms, undefined);
  assert.match(await b.textContent('#eCorpo'), /1 consegna sbagliata/);
  await senzaTempi(b, '#sEsito .esito', 'esito con consegna sbagliata');
  assert.match(await b.textContent('#eCorpo'), /Come si ragiona/);
  // corone: resa (tenendo premuto)
  await apri(giorni.ultimo.corone);
  await b.tap('#gRegole');
  await tieni(b, '#veloBox .btn.hold:last-of-type');
  await esito('corone', 'arresa');
  assert.match(await b.textContent('#eCorpo'), /Non risolta/);
  bene('i nove giochi del lancio si finiscono dall’interfaccia; mina = persa; resa = non risolta; consegna sbagliata contata, senza minuti');

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
  assert.equal(re.consegne, 1); assert.equal(re.pen, undefined);
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

  // gabbie e somme: casella e tastierino; nelle somme le note si tolgono dalle caselle della stessa fila
  for (const g of ['gabbie', 'kakuro']) {
    await apri(giorni.ultimo[g]);
    ult = await quasi(() => { const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol); const k = sol.findIndex(x => x > 0); st.v[k] = 0; G.P.st = st; disegnaGioco(); return [k, sol[k]]; });
    await tocca(b, ult[0]);
    await b.tap('#sNote'); await b.tap(`.tasto[data-k="${ult[1] === 1 ? 2 : 1}"]`); await b.tap('#sNote');
    await shot(b, g);
    await b.tap(`.tasto[data-k="${ult[1]}"]`);
    await esito(g);
  }
  // flotta, tende, luci: l'ultimo pezzo con un tocco; prima un tocco in più per vedere il giro dei segni
  for (const g of ['flotta', 'tende', 'luci']) {
    await apri(giorni.ultimo[g]);
    const [ultima, altra] = await quasi(() => {
      const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol), fisse = new Set((G.s.p.dati || []).map(d => d[0]).concat(G.s.p.alberi || [], (G.s.p.nere || []).map(x => x[0])));
      const k = st.c.findIndex((x, i) => x === 2 && !fisse.has(i)), w = st.c.findIndex((x, i) => x === 1 && !fisse.has(i));
      st.c[k] = 0; st.c[w] = 0; G.P.st = st; disegnaGioco(); return [k, w];
    });
    // il giro dei segni su una casella che resta vuota: pezzo, segno, vuota
    await tocca(b, altra); assert.equal(await b.evaluate(i => G.P.st.c[i], altra), 2, g + ': primo tocco = pezzo');
    await tocca(b, altra); assert.equal(await b.evaluate(i => G.P.st.c[i], altra), 1, g + ': secondo tocco = segno');
    await tocca(b, altra); assert.equal(await b.evaluate(i => G.P.st.c[i], altra), 0, g + ': terzo tocco = vuota');
    await shot(b, g);
    await tocca(b, ultima);
    await esito(g);
  }
  // ponti: un'isola e poi l'altra
  await apri(giorni.ultimo.ponti);
  const qp = await quasi(() => { const sol = soluzione(G.s), st = G.E.statoRisolto(G.s.p, sol); const q = sol.findIndex(x => x > 0); st.x[q]--; G.P.st = st; disegnaGioco(); const e = G.E.archi(G.s.p).E[q]; return [e.a, e.b]; });
  await shot(b, 'ponti');
  await b.tap(`#tav [data-isola="${qp[0]}"]`); await b.tap(`#tav [data-isola="${qp[1]}"]`);
  await esito('ponti');
  // chi è chi: tabella, una consegna sbagliata, poi giusta
  await apri(giorni.ultimo.logigramma);
  const tab = await quasi(() => G.E.soluzione(G.s.p).tabella);
  for (let c = 1; c < tab.length; c++) for (let i = 0; i < tab[c].length; i++) {
    await b.tap(`.cella-t[data-ci="${c - 1}"][data-ri="${i}"]`);
    const v = c === 1 && i < 2 ? tab[c][1 - i] : tab[c][i];                // le prime due scambiate
    await b.tap(`.scelte-t .chip[data-v="${v}"]`);
  }
  await shot(b, 'logigramma');
  await b.tap('#sConsegna'); await sbagliata('chi è chi');
  await b.tap('.cella-t[data-ci="0"][data-ri="0"]'); await b.tap(`.scelte-t .chip[data-v="${tab[1][0]}"]`);
  // il valore tolto dalla seconda riga la lascia vuota, e la selezione passa lì da sola
  assert.equal(await b.evaluate(() => G.sel), 1, 'chi è chi: si passa alla casella vuota della colonna');
  await b.tap(`.scelte-t .chip[data-v="${tab[1][1]}"]`);
  await b.tap('#sConsegna'); await esito('chi è chi');
  // criptaritmo: il valore della parola del risultato
  await apri(giorni.ultimo.criptaritmo);
  const cr = await quasi(() => G.E.soluzione(G.s.p).risposta);
  await tasti(cr); await shot(b, 'criptaritmo');
  await b.tap('#sConsegna'); await esito('criptaritmo');
  bene('gabbie, somme, flotta, tende, luci, ponti, chi è chi e criptaritmo si finiscono dall’interfaccia');

  /* ---------- 3. Calendario e «Le mie sfide» ---------- */
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
  await b.evaluate(() => { location.hash = '#sfide'; });
  await b.waitForSelector('#sSfide:not([hidden])'); await b.waitForTimeout(200);
  assert.equal(await b.$$eval('#tCorpo .elenco li', x => x.length), finite);
  await senzaTempi(b, '#sSfide', 'le mie sfide');
  assert.match(await b.textContent('#tCorpo .elenco'), /Mina/); assert.match(await b.textContent('#tCorpo .elenco'), /Non risolta/);
  await shot(b, 'sfide');
  await b.tap('#tCopia');
  const elenco = await b.evaluate(() => navigator.clipboard.readText());
  assert.match(elenco, /^MENTAL · le mie sfide\n/); assert.equal(elenco.split('\n').length, finite + 1);
  assert.doesNotMatch(elenco, /\d:\d\d/, 'elenco senza tempi');
  await b.evaluate(() => { location.hash = '#calendario'; }); await b.waitForSelector('#sCal:not([hidden])');
  await b.evaluate(() => { location.hash = '#tempi'; });
  await b.waitForSelector('#sSfide:not([hidden])');
  bene(`calendario solo fino a oggi e dal lancio; «Le mie sfide» con ${finite} sfide, senza tempi, e l’elenco da copiare; #tempi porta lì`);
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
  // qualunque tipo sia la sfida di quel giorno: soluzione nello stato, poi fine o consegna
  await c.evaluate(() => { const sol = soluzione(G.s); G.P.st = G.E.statoRisolto(G.s.p, sol); if (['risposta', 'codice', 'testo'].includes(G.E.tipo)) consegna(); else controllaFine(); });
  await c.waitForSelector('#sEsito:not([hidden])');
  const rm = (await sto(c)).giorni['2026-12-30'];
  assert.equal(rm.esito, 'risolta'); assert.equal(rm.giornata, false, 'finita dopo mezzanotte: non il giorno stesso');
  assert.match(await c.textContent('#eCorpo'), /dopo mezzanotte/);
  await c.evaluate(() => { location.hash = ''; }); await c.waitForTimeout(400);
  assert.equal((await c.textContent('#oNum')).trim(), '#071', 'a mezzanotte arriva la sfida nuova');
  bene('mezzanotte: la partita continua, vale come «dopo mezzanotte», la home passa al giorno nuovo');
  await c.context().close();

  /* ---------- 5. Voci salvate col cronometro di prima: ms e pen restano nello storico ma non si vedono;
     una partita aperta da 30 ore si riprende senza tempo ---------- */
  const f = await telefono('2026-10-24T14:00:00Z');
  const ieri = await f.evaluate(async () => {
    await caricaMese('2026-10');
    const ora = Date.now(), ore = h => ora - h * 3600e3, s1 = MENTAL.dati['2026-10-22'], s2 = MENTAL.dati['2026-10-23'];
    localStorage.setItem('gds-mental-storico', JSON.stringify({ v: 1, giorni: {
      '2026-10-22': { n: s1.n, gioco: s1.gioco, nome: nomeDi(s1), livello: s1.livello, esito: 'risolta', inizio: ore(52), fine: ore(51), ms: 3725000, pen: 60000, consegne: 1, giornata: true, firma: firma(s1.p) },
      '2026-10-23': { n: s2.n, gioco: s2.gioco, nome: nomeDi(s2), livello: s2.livello, esito: 'corso', inizio: ore(30), pen: 0, firma: firma(s2.p) } } }));
    localStorage.setItem('gds-mental-partite', JSON.stringify({ '2026-10-23': { st: MENTAL.motori[s2.gioco].nuovoStato(s2.p), storia: [], inizio: ore(30), pen: 0, firma: firma(s2.p) } }));
    return s2;
  });
  await f.reload(); await f.waitForTimeout(400);
  await f.evaluate(() => { location.hash = '#sfide'; }); await f.waitForSelector('#sSfide:not([hidden])'); await f.waitForTimeout(150);
  await senzaTempi(f, '#sSfide', 'le mie sfide con voci vecchie');
  assert.match(await f.textContent('#tCorpo .elenco'), /In corso/); assert.match(await f.textContent('#tCorpo .elenco'), /1 consegna sbagliata/);
  await f.evaluate(() => { location.hash = '#esito=2026-10-22'; }); await f.waitForSelector('#sEsito:not([hidden])'); await f.waitForTimeout(150);
  await senzaTempi(f, '#sEsito .esito', 'esito di una voce vecchia');
  await f.evaluate(() => dettaglioGiorno('2026-10-23')); await f.waitForSelector('#velo:not([hidden])');
  assert.match(await f.textContent('#veloBox'), /In corso\./); await senzaTempi(f, '#veloBox', 'dettaglio di una partita aperta da 30 ore');
  await f.tap('#veloBox .btn:not(.sec)');
  await f.waitForSelector('#sGioco:not([hidden])'); await f.waitForTimeout(200);
  assert.equal(await f.evaluate(() => G.data), '2026-10-23');
  await senzaTempi(f, '#sGioco', 'partita aperta da 30 ore');
  await shot(f, 'partita-vecchia');
  // la si finisce: iniziata il suo giorno e finita dopo, quindi «dopo mezzanotte»; la voce nuova non ha tempi
  await f.evaluate(() => { const sol = soluzione(G.s); G.P.st = G.E.statoRisolto(G.s.p, sol); if (['risposta', 'codice', 'testo'].includes(G.E.tipo)) consegna(); else controllaFine(); });
  await f.waitForSelector('#sEsito:not([hidden])');
  const rv = (await sto(f)).giorni['2026-10-23'];
  assert.equal(rv.esito, 'risolta'); assert.equal(rv.giornata, false); assert.equal(rv.ms, undefined);
  assert.match(await f.textContent('#eCorpo'), /Finita dopo mezzanotte/);
  await senzaTempi(f, '#sEsito .esito', 'esito della partita vecchia');
  await f.context().close();
  bene(`voci di prima del cambio: niente tempi in «Le mie sfide», esito e dettaglio; la partita aperta da 30 ore (${ieri.gioco}) si riprende e finisce senza tempo`);

  /* ---------- 6. Giorno senza sfida pronta e prima del lancio ---------- */
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
