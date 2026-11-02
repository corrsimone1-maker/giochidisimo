// Prova nel browser del narratore automatico di Lupus: impostazioni («Il telefono»), distribuzione, notte con la
// voce (finta: si registrano le frasi), scelte sul telefono, alba con i morti e il ruolo, voto, cacciatore, giro dei
// messaggi con gli innamorati, vittoria, ripresa dopo un ricaricamento; e la modalità con il narratore persona.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/lupus.pagina.test.js
// Con SCATTI=cartella salva gli screenshot.
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const fs = require('fs');
const BASE = process.env.ROOT || 'http://localhost:8765/';
const SCATTI = process.env.SCATTI || '';
if (SCATTI) fs.mkdirSync(SCATTI, { recursive: true });
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  // voce finta: registra le frasi e finisce subito; tutto accelerato
  await ctx.addInitScript(() => {
    sessionStorage.setItem('gds-lupus-vel', '0.01');
    window.__frasi = [];
    // in Chromium speechSynthesis è in sola lettura: si ridefinisce la proprietà
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: function (t) { this.text = t; } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak(u) { window.__frasi.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, cancel() {}, getVoices() { return [{ lang: 'it-IT', name: 'Alice' }]; }, addEventListener() {} } });
  });
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => errori.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errori.push('console: ' + m.text()); });
  let n = 0;
  const shot = async nome => { if (SCATTI) { await page.waitForTimeout(200); await page.screenshot({ path: `${SCATTI}/${String(++n).padStart(2, '0')}-${nome}.png` }); } };
  const ev = (f, a) => page.evaluate(f, a);
  const frasi = () => ev(() => window.__frasi.slice());
  const testo = sel => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim());

  // impostazioni: giocatori e ruoli (conteggi), narratore telefono
  async function prepara(nomi, conteggi, riempitivo = 'contadino') {
    await page.goto(BASE + 'giochi/lupus/');
    await ev(([nomi, conteggi, riempitivo]) => {
      localStorage.clear();
      localStorage.setItem('gds-giocatori', JSON.stringify(nomi));
      localStorage.setItem('gds-lupus', JSON.stringify({ conteggi, riempitivo, mostraSquadra: true, aperti: {}, narratore: 'persona', rivela: true }));
    }, [nomi, conteggi, riempitivo]);
    await page.reload();
    await page.click('#narrSeg [data-narra="telefono"]');
  }
  async function distribuisci() {
    await page.click('#dealBtn');
    const np = await ev(() => G.carte.length);
    for (let i = 0; i < np; i++) { await page.click('#showBtn'); await page.click('#hideBtn'); }
  }
  const ruoli = () => ev(() => G.carte.map(c => c.ruolo.id));
  const idx = async id => (await ruoli()).indexOf(id);
  const nome = i => ev(i => G.carte[i].nome, i);

  // gioca la notte: per ogni schermata chiede a `scelta(ruolo, giocatoriTraCuiScegliere)` cosa toccare
  async function giocaNotte(scelta, { fermaDopo = null } = {}) {
    let passi = 0;
    for (;;) {
      await page.waitForFunction(() => !document.getElementById('giorno').hidden || document.querySelector('#notte [data-ok]:not([disabled]), #notte [data-i], #notte [data-v]'), null, { timeout: 15000 });
      if (await page.isVisible('#giorno')) return;
      const ruolo = await page.$eval('#notte', el => (el.querySelector('.nt-role') || {}).textContent || '');
      if (await page.$('#notte [data-i]')) {
        const tra = await page.$$eval('#notte [data-i]', bs => bs.map(b => +b.dataset.i));
        const qui = await scelta(ruolo, tra);
        for (const i of [].concat(qui)) await page.click(`#notte [data-i="${i}"]`);
        await page.click('#notte [data-ok]');
      } else if (await page.$('#notte [data-v]')) {
        const v = await scelta(ruolo, null);
        await page.click(`#notte [data-v="${v}"]`);
      } else {
        await scelta(ruolo, 'avviso');
        await page.click('#notte [data-ok]');
      }
      if (fermaDopo && ++passi === fermaDopo) return 'fermo';
    }
  }

  /* ---------- 1. classica: 2 lupi, veggente, guardia, strega, contadino ---------- */
  await prepara(['Anna', 'Bruno', 'Carla', 'Dario', 'Elena', 'Fabio'], { lupo: 2, veggente: 1, guardia: 1, strega: 1 });
  assert.ok(await page.isVisible('#autoOpts'));
  assert.strictEqual(await testo('#playersSub'), 'Tutti, nell’ordine in cui siete seduti (in senso antiorario).');
  await shot('impostazioni-telefono');
  bene('impostazioni: «Il telefono» con le sue opzioni');
  await distribuisci();
  assert.ok(await page.isVisible('#tavolo'));
  assert.strictEqual(await testo('#startAuto'), 'Inizia la notte');
  await shot('telefono-al-centro');
  bene('dopo l’ultima carta: telefono al centro');
  const R = await ruoli();
  const lupi = R.map((r, i) => (r === 'lupo' ? i : -1)).filter(i => i >= 0);
  const vegg = R.indexOf('veggente'), guar = R.indexOf('guardia'), streg = R.indexOf('strega'), cont = R.indexOf('contadino');
  await page.click('#startAuto');
  let vistoRisultato = '';
  let fotoScelta = false;
  await giocaNotte(async (ruolo, tra) => {
    if (ruolo === 'Veggente' && tra && tra !== 'avviso') return lupi[0];
    if (ruolo === 'Veggente' && tra === 'avviso') { vistoRisultato = await testo('#notte .res'); await shot('veggente-risultato'); return; }
    if (ruolo === 'Guardia del corpo') { assert.ok(!tra.includes(guar), 'la guardia non protegge se stessa'); return cont; }
    if (ruolo === 'Lupi') { assert.ok(!tra.some(i => lupi.includes(i)), 'i lupi non sbranano un lupo'); if (!fotoScelta) { fotoScelta = true; await page.click(`#notte [data-i="${vegg}"]`); await shot('lupi-scelgono'); await page.click(`#notte [data-i="${vegg}"]`); } return vegg; }
    if (ruolo === 'Strega' && tra === null) return 'no';
    if (ruolo === 'Strega' && tra && tra !== 'avviso') return -1;
  });
  assert.strictEqual(vistoRisultato, `${await nome(lupi[0])} è un lupo mannaro`);
  bene('veggente: vede il lupo');
  const f1 = await frasi();
  const chiamati = f1.filter(t => / apri| aprite/.test(t));
  assert.deepStrictEqual(chiamati, ['Veggente, apri gli occhi.', 'Guardia del corpo, apri gli occhi.', 'Lupi, aprite gli occhi e riconoscetevi.', 'Strega, apri gli occhi.']);
  assert.ok(f1[0].startsWith('È notte. Tutti chiudono gli occhi.'));
  bene('voce: chiama i ruoli in ordine, prima notte coi lupi che si riconoscono');
  // alba
  await page.waitForSelector('#giorno .dawn .d');
  const morto = await testo('#giorno .dawn .d');
  assert.ok(morto.startsWith(await nome(vegg)) && morto.includes('sbranato dai lupi') && morto.endsWith('Veggente'), morto);
  const f2 = await frasi();
  assert.ok(f2.includes('Il villaggio si sveglia. Tutti aprono gli occhi.') && f2.includes(`Stanotte è morto: ${await nome(vegg)}, Veggente.`), f2.slice(-3).join(' | '));
  await shot('alba');
  bene('alba: muore la veggente, col ruolo, detto a voce');
  // voto: il primo lupo
  await page.click(`#giorno [data-vt="${lupi[0]}"]`);
  await page.click('#giorno [data-g="vota"]');
  await page.waitForSelector('#giorno [data-g="notte"]');
  assert.ok((await frasi()).includes(`Oggi è morto: ${await nome(lupi[0])}, Lupo mannaro.`));
  await shot('dopo-voto');
  bene('voto: eliminato il primo lupo');
  // notte 2, ma la pagina si ricarica a metà: si riprende dallo stesso passo
  await page.click('#giorno [data-g="notte"]');
  assert.strictEqual(await giocaNotte(async (ruolo) => (ruolo === 'Guardia del corpo' ? cont : undefined), { fermaDopo: 1 }), 'fermo');
  const passo = await ev(() => G.A.passo);
  assert.ok((await frasi()).filter(t => t === 'Veggente, apri gli occhi.').length === 2, 'la veggente morta si chiama lo stesso');
  bene('la veggente morta si chiama lo stesso');
  await page.reload();
  await page.waitForSelector('#riprendiNotte');
  await shot('riprendi-notte');
  assert.strictEqual(await ev(() => G.A.passo), passo);
  await page.click('#riprendiNotte');
  bene('ricaricata a metà notte: «Riprendi la notte» dallo stesso passo');
  await giocaNotte(async (ruolo, tra) => {
    if (ruolo === 'Lupi') return guar;
    if (ruolo === 'Strega' && tra === null) return 'no';
    if (ruolo === 'Strega' && tra && tra !== 'avviso') return -1;
    if (ruolo === 'Guardia del corpo') return cont;
  });
  await page.waitForSelector('#giorno .dawn .d');
  // voto: il secondo lupo → vince il villaggio
  await page.click(`#giorno [data-vt="${lupi[1]}"]`);
  await page.click('#giorno [data-g="vota"]');
  await page.waitForSelector('#giorno .fin');
  assert.strictEqual(await testo('#giorno .daytitle'), 'Ha vinto il villaggio');
  assert.ok((await frasi()).includes('Ha vinto il villaggio.'));
  await shot('fine');
  bene('fine: ha vinto il villaggio, con tutti i ruoli');

  /* ---------- 2. cupido, cacciatore e giro dei messaggi ---------- */
  await prepara(['Gaia', 'Ivo', 'Lea', 'Max', 'Nora', 'Otto', 'Pia'], { lupo: 2, cupido: 1, cacciatore: 1 });
  await distribuisci();
  await page.click('#startAuto');
  const R2 = await ruoli();
  const lupi2 = R2.map((r, i) => (r === 'lupo' ? i : -1)).filter(i => i >= 0);
  const cont2 = R2.map((r, i) => (r === 'contadino' ? i : -1)).filter(i => i >= 0);
  const cacc = R2.indexOf('cacciatore');
  const amanti = [cont2[0], cont2[1]];
  await giocaNotte(async (ruolo) => {
    if (ruolo === 'Cupido') return amanti;
    if (ruolo === 'Lupi') return cacc;
  });
  bene('cupido sceglie due innamorati, i lupi sbranano il cacciatore');
  await page.waitForSelector('#giorno [data-sp]');
  await shot('cacciatore');
  assert.strictEqual(await testo('#giorno .kicker'), 'Il cacciatore spara');
  await page.click(`#giorno [data-sp="${lupi2[0]}"]`);
  await page.click('#giorno [data-g="spara"]');
  assert.ok((await frasi()).includes(`Colpito dal cacciatore, è morto: ${await nome(lupi2[0])}, Lupo mannaro.`));
  bene('il cacciatore morto spara e porta con sé un lupo');
  // giro: il telefono passa ai vivi; gli innamorati leggono il loro messaggio
  const vivi = await ev(() => LUPUS.vivi(G));
  for (const i of vivi) {
    await page.waitForSelector('#giorno [data-g="sonoio"]');
    assert.strictEqual(await testo('#giorno .who'), await nome(i));
    await page.click('#giorno [data-g="sonoio"]');
    const m = await testo('#giorno .mid');
    if (amanti.includes(i)) { assert.ok(m.includes(`Sei innamorato di ${await nome(amanti[0] === i ? amanti[1] : amanti[0])}`), m); if (i === amanti[0]) await shot('messaggio-innamorato'); }
    else assert.ok(m.includes('Niente di nuovo per te.'), m);
    await page.click('#giorno [data-g="letto"]');
  }
  bene('giro dei messaggi: gli innamorati sanno di esserlo, gli altri «niente di nuovo»');
  await page.waitForSelector('#giorno [data-vt]');
  await page.click('#giorno [data-vt="-1"]');
  await page.click('#giorno [data-g="vota"]');
  await page.click('#giorno [data-g="notte"]');
  await giocaNotte(async (ruolo) => (ruolo === 'Lupi' ? amanti[0] : undefined));
  await page.waitForSelector('#giorno .dawn .d');
  const morti2 = await page.$$eval('#giorno .dawn .d', ds => ds.map(d => d.textContent.replace(/\s+/g, ' ').trim()));
  assert.ok(morti2.length === 2 && morti2[1].includes('morto di dolore'), morti2.join(' | '));
  bene('l’innamorato sbranato si porta dietro l’altro');
  assert.ok(!(await frasi()).includes('Cupido, apri gli occhi.') || (await frasi()).filter(t => t === 'Cupido, apri gli occhi.').length === 1);
  bene('cupido solo la prima notte');

  /* ---------- 3. Esci e torna; narratore persona invariato ---------- */
  await page.click('#giorno [data-g="esci"]');
  await page.click('#giorno [data-g="esci"]');
  assert.ok(await page.isVisible('#setup') && await page.isVisible('#resumeBtn'));
  await page.click('#resumeBtn');
  assert.ok(await page.isVisible('#giorno'));
  bene('«Esci» (due tocchi) e «Torna alla partita in corso»');
  await page.goto(BASE + 'giochi/lupus/');
  await ev(() => { localStorage.clear(); localStorage.setItem('gds-giocatori', JSON.stringify(['A', 'B', 'C', 'D'])); });
  await page.reload();
  assert.strictEqual(await ev(() => cfg.narratore), 'persona');
  assert.ok(await page.isHidden('#autoOpts'));
  await page.click('#dealBtn');
  for (let i = 0; i < 4; i++) { await page.click('#showBtn'); await page.click('#hideBtn'); }
  assert.ok(await page.isVisible('#toNarr'));
  await page.click('#narrBtn');
  assert.ok(await page.isVisible('#narr') && (await testo('#script')).includes('Tutti chiudono gli occhi'));
  bene('narratore persona: come prima');

  assert.deepStrictEqual(errori, []);
  console.log(`\n${ok} controlli passati`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
