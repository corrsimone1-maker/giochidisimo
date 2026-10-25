// Prova nel browser di TRACCIA: risolve TUTTE le tavole trascinando il dito come su un iPhone,
// comprese le stelle (ogni soluzione) e il Segreto, che si apre con tutte le stelle.
// Sulle superfici incollate la linea passa da un lato all'altro; quando il dito finirebbe fuori
// dallo schermo lo si solleva (la linea resta in sospeso) e si riprende dalla punta.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/traccia.pagina.test.js
// Con SCATTI=cartella salva gli screenshot.
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const fs = require('fs');
const ROOT = process.env.ROOT || 'http://localhost:8765/';
const SCATTI = process.env.SCATTI || '';
if (SCATTI) fs.mkdirSync(SCATTI, { recursive: true });
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => errori.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errori.push(m.text()); });
  const scatto = async nome => { if (SCATTI) await page.screenshot({ path: `${SCATTI}/${nome}.png` }); };

  // tocco vero (pointerType touch) con CDP
  const cdp = await ctx.newCDPSession(page);
  const tocca = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });

  await page.goto(ROOT + 'giochi/traccia/');
  await page.evaluate(() => { localStorage.removeItem('gds-traccia-storico'); localStorage.removeItem('gds-traccia'); });
  await page.goto(ROOT + 'giochi/traccia/');
  await page.waitForTimeout(200);
  const nAree = await page.evaluate(() => document.querySelectorAll('#aree .area').length);
  assert.equal(nAree, 10, 'dieci carte nell’elenco');
  assert.ok(await page.evaluate(() => document.querySelector('#aree .area.chiusa') !== null), 'il Segreto parte chiuso');
  await scatto('01-elenco');
  bene('elenco: nove aree aperte e il Segreto chiuso');

  // soluzioni di una tavola come stringhe di direzioni (rifatte col motore della pagina)
  const soluzioniDi = id => page.evaluate(id => {
    const x = tavolaDa[id], p = x.t, G = TR.grafo(p), out = [];
    for (const s of TR.soluzioni(p).soluzioni) {
      let r = p.start.slice(), str = '';
      for (let k = 0; k < s.es.length; k++) {
        const d = [[0, -1, 'U'], [0, 1, 'D'], [-1, 0, 'L'], [1, 0, 'R']].find(([dx, dy]) => { const st = TR.passo(G, r, [dx, dy]); return st && st.e === s.es[k] && st.v === s.vs[k + 1]; });
        str += d[2]; r = TR.passo(G, r, [d[0], d[1]]).b;
      }
      out.push(str);
      if (!Object.keys(p.s).length) break;     // labirinto: ne basta una
    }
    return out;
  }, id);

  async function traccia(str) {
    const geo = await page.evaluate(() => {
      const svg = document.getElementById('tavola'), b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const p = tavola.p;
      return { x: b.x, y: b.y, s: b.width / vb.width, start: [80 + p.start[0] * 100, 80 + p.start[1] * 100] };
    });
    const scr = q => [geo.x + q[0] * geo.s, geo.y + q[1] * geo.s];
    let f = scr(geo.start);
    await tocca('touchStart', f[0], f[1]);
    const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    let sospensioni = 0;
    for (const ch of str) {
      const d = D[ch], passo = 100 * geo.s;
      const fine = [f[0] + d[0] * passo, f[1] + d[1] * passo];
      if (fine[0] < 6 || fine[0] > 384 || fine[1] < 60 || fine[1] > 838) {
        // il dito uscirebbe dallo schermo: si solleva e si riprende dalla punta
        await tocca('touchEnd'); sospensioni++;
        const testa = await page.evaluate(() => { const r = tavola.rep(); return [80 + r[0] * 100, 80 + r[1] * 100]; });
        f = scr(testa);
        await tocca('touchStart', f[0], f[1]);
      }
      for (let k = 1; k <= 6; k++) await tocca('touchMove', f[0] + d[0] * passo * k / 6, f[1] + d[1] * passo * k / 6);
      f = [f[0] + d[0] * passo, f[1] + d[1] * passo];
    }
    await tocca('touchEnd');
    await page.waitForTimeout(30);
    return sospensioni;
  }

  const aree = await page.evaluate(() => AREE.map(a => ({ id: a.id, tipo: a.tipo, tavole: a.tavole.map(t => ({ id: t.id, stella: t.stella || 0 })) })));
  let sospTot = 0;
  for (const a of aree) {
    if (a.tipo === 'segreto') continue;
    await page.evaluate(id => { location.hash = id; }, a.id);
    await page.waitForTimeout(120);
    for (let k = 0; k < a.tavole.length; k++) {
      const t = a.tavole[k];
      await page.evaluate(k => vai(k), k);
      const sol = await soluzioniDi(t.id);
      const quante = t.stella || 1;
      assert.ok(sol.length >= quante, t.id + ': soluzioni trovate dal motore');
      for (let n = 0; n < quante; n++) sospTot += await traccia(sol[n]);
      const salvate = await page.evaluate(id => (ST.t[id] || []).length, t.id);
      assert.equal(salvate, quante, t.id + ': soluzioni salvate dopo il tracciamento');
      if (t.stella) assert.ok(await page.evaluate(id => presa(tavolaDa[id].t), t.id), t.id + ': stella presa');
      if (['f1', 'c1', 'm2', 't2', 'k3', 'r3', 'f4', 'n5'].includes(t.id)) await scatto('tav-' + t.id);
    }
    bene(`${a.id}: tutte le tavole risolte trascinando (${a.tavole.length})`);
  }
  assert.ok(sospTot > 0, 'almeno una linea ha dovuto riprendere dalla punta');
  bene(`ripresa dalla punta usata ${sospTot} volte sulle superfici incollate`);

  // linea sbagliata: diventa rossa e lampeggiano i simboli giusti
  await page.evaluate(() => { location.hash = 'numeri'; });
  await page.waitForTimeout(100);
  await page.evaluate(() => vai(0));
  await traccia('RRUU');      // n1: il «1» non resta da solo
  assert.ok(await page.evaluate(() => document.getElementById('tavola').classList.contains('sbagliata')), 'linea rossa');
  assert.ok(await page.evaluate(() => document.querySelectorAll('#tavola .sim.male').length === 1), 'il numero lampeggia');
  await scatto('02-sbagliata');
  bene('una linea sbagliata diventa rossa e segna il simbolo');

  // linea in sospeso
  await page.evaluate(() => vai(0));
  const geo = await page.evaluate(() => { const b = document.getElementById('tavola').getBoundingClientRect(); return { x: b.x, y: b.y, s: b.width / document.getElementById('tavola').viewBox.baseVal.width }; });
  const sx = geo.x + 80 * geo.s, sy = geo.y + 280 * geo.s;
  await tocca('touchStart', sx, sy);
  for (let k = 1; k <= 6; k++) await tocca('touchMove', sx + 100 * geo.s * k / 6, sy);
  await tocca('touchEnd');
  assert.equal(await page.evaluate(() => tavola.stato), 'sospesa');
  await scatto('03-sospesa');
  await tocca('touchStart', sx + 100 * geo.s, sy);
  for (let k = 1; k <= 6; k++) await tocca('touchMove', sx + 100 * geo.s, sy - 100 * geo.s * k / 6);
  await tocca('touchEnd');
  assert.equal(await page.evaluate(() => tavola.passi.length), 2, 'ripresa dalla punta');
  bene('sollevando il dito la linea resta in sospeso e si riprende dalla punta');

  // il Segreto ora è aperto
  await page.evaluate(() => { location.hash = ''; });
  await page.waitForTimeout(150);
  assert.ok(await page.evaluate(() => document.querySelector('#aree .area.chiusa') === null), 'Segreto aperto');
  await scatto('04-elenco-finito');
  await page.evaluate(() => { location.hash = 'segreto'; });
  await page.waitForTimeout(120);
  const seg = aree.find(a => a.tipo === 'segreto');
  for (let k = 0; k < seg.tavole.length; k++) {
    await page.evaluate(k => vai(k), k);
    const sol = await soluzioniDi(seg.tavole[k].id);
    await traccia(sol[0]);
    assert.equal(await page.evaluate(id => (ST.t[id] || []).length, seg.tavole[k].id), 1, seg.tavole[k].id);
  }
  await scatto('05-segreto');
  bene('Segreto aperto con tutte le stelle e risolto');

  // i progressi restano dopo il ricaricamento; Reset (due tocchi) li cancella
  await page.goto(ROOT + 'giochi/traccia/');
  await page.waitForTimeout(150);
  const fatte = await page.evaluate(() => Object.keys(ST.t).length);
  assert.equal(fatte, aree.reduce((n, a) => n + a.tavole.length, 0), 'tutto salvato');
  await page.click('#reset'); await page.click('#reset');
  assert.equal(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('gds-traccia-storico')).t).length), 0);
  bene('progressi salvati; Reset con due tocchi li cancella');

  // finestre
  await page.click('#apriCome'); assert.ok(await page.isVisible('#come')); await scatto('06-come'); await page.click('#come [data-chiudi]');
  await page.evaluate(() => { location.hash = 'toro'; }); await page.waitForTimeout(100);
  await page.click('#apriRegola'); assert.ok(await page.isVisible('#regolaCopri'));
  const b = await page.locator('#tieni').boundingBox();
  await page.mouse.move(b.x + 20, b.y + 20); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
  assert.ok(await page.isVisible('#regolaTesto'), 'regola letta tenendo premuto');
  await scatto('07-regola');
  bene('Come si gioca e Regola (tenendo premuto)');

  assert.deepEqual(errori, [], 'nessun errore nella pagina');
  bene('nessun errore nella pagina');
  await browser.close();
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
