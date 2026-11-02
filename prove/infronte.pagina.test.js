// Prova nel browser di In fronte: scrittura, anteprima, schermo nero girato, scritta che riempie lo schermo senza
// uscire dai margini (controllata sui pixel degli screenshot), una e più parole, doppio tocco, «Fine», tieni premuto,
// riprendi, mescola, capovolgi, telefono davvero in orizzontale, dati salvati e Reset.
// Uso, dalla cartella della repo:
//   python3 -m http.server 8765 &
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/infronte.pagina.test.js
// Con SCATTI=cartella salva gli screenshot.
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const zlib = require('zlib');
const fs = require('fs');
const BASE = process.env.ROOT || 'http://localhost:8765/';
const SCATTI = process.env.SCATTI || '';
if (SCATTI) fs.mkdirSync(SCATTI, { recursive: true });
let ok = 0; const bene = m => { ok++; console.log('ok  ', m); };

/* PNG → pixel (solo 8 bit RGB/RGBA, quello che fa Playwright) */
function png(buf) {
  let p = 8, w, h, tipo, dati = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); assert.equal(d[8], 8); tipo = d[9]; }
    else if (t === 'IDAT') dati.push(d);
    else if (t === 'IEND') break;
    p += 12 + len;
  }
  const bpp = tipo === 6 ? 4 : 3, riga = w * bpp, raw = zlib.inflateSync(Buffer.concat(dati)), out = Buffer.alloc(h * riga);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (riga + 1)], src = raw.subarray(y * (riga + 1) + 1, (y + 1) * (riga + 1)), o = y * riga;
    for (let x = 0; x < riga; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0, b = y ? out[o - riga + x] : 0, c = x >= bpp && y ? out[o - riga + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[o + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}
/* Riquadro dell'inchiostro (pixel più chiari della soglia) */
function inchiostro(img, soglia = 60) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * img.bpp;
    if (img.px[i] > soglia && img.px[i + 1] > soglia && img.px[i + 2] > soglia) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

(async () => {
  const browser = await chromium.launch();
  const errori = [];
  async function telefono(viewport) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errori.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errori.push('console: ' + m.text()); });
    const cdp = await ctx.newCDPSession(page);
    let n = 0;
    const T = {
      page,
      ev: (f, a) => page.evaluate(f, a),
      S: () => page.evaluate(() => JSON.parse(localStorage.getItem('gds-infronte'))),
      righe: () => page.evaluate(() => [...document.querySelectorAll('#box .riga')].map(d => d.textContent)),
      attivo: () => page.evaluate(() => attivo && getComputedStyle(palco).visibility === 'visible'),
      shot: async nome => { if (SCATTI) await page.screenshot({ path: `${SCATTI}/${viewport.width}-${String(++n).padStart(2, '0')}-${nome}.png` }); },
      tocco: async (x, y, ms = 40) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await page.waitForTimeout(ms);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      },
      doppio: async (x, y) => { await T.tocco(x, y); await page.waitForTimeout(90); await T.tocco(x + 6, y + 4); await page.waitForTimeout(220); },
      centro: () => ({ x: viewport.width / 2 + 15, y: viewport.height / 2 - 20 }),
      /* La scritta sta tutta nel riquadro, al centro, e ne riempie almeno un lato */
      controllaPixel: async (nome, minimo = 0.9) => {
        await page.waitForTimeout(260);
        const R = await page.evaluate(() => { const r = box.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        const I = inchiostro(png(await page.screenshot()));
        assert.ok(I, nome + ': niente inchiostro');
        const tol = 2;
        assert.ok(I.x >= R.x - tol && I.y >= R.y - tol && I.x + I.w <= R.x + R.w + tol && I.y + I.h <= R.y + R.h + tol,
          `${nome}: esce dal riquadro ${JSON.stringify(I)} in ${JSON.stringify(R)}`);
        const fw = I.w / R.w, fh = I.h / R.h;
        assert.ok(fw >= minimo || fh >= minimo, `${nome}: riempie poco (${fw.toFixed(3)} × ${fh.toFixed(3)})`);
        const dx = (I.x + I.w / 2) - (R.x + R.w / 2), dy = (I.y + I.h / 2) - (R.y + R.h / 2);
        assert.ok(Math.abs(dx) <= 0.03 * Math.max(R.w, R.h) && Math.abs(dy) <= 0.03 * Math.max(R.w, R.h), `${nome}: fuori centro di ${dx.toFixed(1)}, ${dy.toFixed(1)}`);
        return { fw, fh };
      }
    };
    return T;
  }

  /* 1. Una parola, telefono in verticale con la rotazione bloccata */
  {
    const t = await telefono({ width: 402, height: 874 });
    await t.page.goto(BASE + 'giochi/infronte/');
    await t.ev(() => localStorage.clear()); await t.page.reload(); await t.page.waitForTimeout(300);
    assert.equal(await t.ev(() => [...document.fonts].find(f => f.family === 'Archivo IF').status), 'loaded', 'Archivo dalla repo');
    await t.shot('vuota');
    await t.page.click('#goBtn'); await t.page.waitForTimeout(100);
    assert.ok(!(await t.attivo()), 'senza testo non si apre'); assert.match(await t.page.textContent('#toast'), /Scrivi/);
    await t.page.fill('#testo', 'Napoleone'); await t.page.waitForTimeout(150);
    assert.deepEqual(await t.ev(() => [...document.querySelectorAll('#miniBox .riga')].map(d => d.textContent)), ['NAPOLEONE'], 'anteprima');
    await t.shot('anteprima');
    await t.page.press('#testo', 'Enter');
    await t.page.waitForTimeout(250);
    assert.ok(await t.attivo(), 'Invio = Mostra');
    assert.equal(await t.ev(() => location.hash), '#mostra');
    assert.equal(await t.ev(() => document.getElementById('testo').value), 'Napoleone', 'Invio non va a capo');
    assert.match(await t.ev(() => getComputedStyle(palco).transform), /matrix\(0(\.0+)?, 1, -1, 0/, 'girato di 90°');
    let f = await t.controllaPixel('NAPOLEONE');
    assert.ok(f.fh > 0.95, `parola lunga: riempie il lato lungo (${f.fh.toFixed(3)})`);   // girato: il lato lungo è in verticale sullo schermo
    await t.shot('napoleone');

    const casi = ['Uva', 'Giulio Cesare', 'Il Signore degli Anelli', 'Precipitevolissimevolmente', 'Perché? È così', 'Mi', 'La vita è bella ma la cassa integrazione di più, diceva il saggio sul tram 8'];
    for (const c of casi) {
      await t.ev(c => { S.una = c; aggiorna(); }, c);
      const r = await t.righe();
      await t.controllaPixel(c);
      await t.shot(c.slice(0, 12).replace(/\W+/g, '_'));
      console.log('     ', JSON.stringify(c), '→', r.length, 'righe,', await t.ev(() => box.firstChild.style.fontSize + ' ' + box.firstChild.style.fontStretch));
    }
    assert.deepEqual(await t.ev(() => { S.una = 'Giulio Cesare'; aggiorna(); return [...box.children].map(d => d.textContent); }), ['GIULIO', 'CESARE'], 'due parole: due righe');
    await t.ev(() => { S.maiuscolo = false; S.una = 'gelato yogurt'; aggiorna(); });
    await t.controllaPixel('minuscole con le gambe');
    await t.shot('minuscole');
    await t.ev(() => { S.maiuscolo = true; S.una = 'Napoleone'; aggiorna(); });
    bene('una parola: Invio mostra, schermo girato, scritta dentro i margini, al centro, che riempie un lato (8 casi + minuscole)');

    /* tocchi: uno o due non fanno niente con una parola; tenere premuto sul bordo non esce */
    const c = t.centro();
    await t.doppio(c.x, c.y);
    assert.deepEqual(await t.righe(), ['NAPOLEONE']); assert.ok(await t.attivo());
    await t.tocco(10, c.y, 1100); await t.page.waitForTimeout(150);
    assert.ok(await t.attivo(), 'dita sul bordo: non esce');
    await t.tocco(c.x, c.y, 300); await t.page.waitForTimeout(150);
    assert.ok(await t.attivo(), 'tocco di 0,3 s: non esce');
    await t.tocco(c.x, c.y, 900); await t.page.waitForTimeout(300);
    assert.ok(!(await t.attivo()), 'tieni premuto: torna a scrivere');
    assert.equal(await t.ev(() => location.hash), '', 'il # se ne va');
    bene('tocchi: doppio tocco senza effetto con una parola, bordo ignorato, tieni premuto 0,7 s per uscire');

    /* indietro del browser chiude lo schermo nero */
    await t.page.click('#goBtn'); await t.page.waitForTimeout(200);
    assert.ok(await t.attivo());
    await t.page.goBack(); await t.page.waitForTimeout(250);
    assert.ok(!(await t.attivo()) && t.page.url().endsWith('/giochi/infronte/'), 'indietro: si torna a scrivere, non alla home');
    bene('il tasto indietro chiude lo schermo nero e resta nella pagina');

    /* Più parole */
    await t.page.click('#modoSeg [data-m="piu"]');
    assert.equal(await t.ev(() => document.getElementById('testo').value), '', 'testo separato per «Più parole»');
    await t.page.fill('#testo', 'cane\ngatto\n\n  topo  \n');
    assert.match(await t.page.textContent('#info'), /3 parole/);
    await t.ev(() => { const x = document.getElementById('testo'); x.focus(); x.setSelectionRange(7, 7); anteprima(); });
    assert.deepEqual(await t.ev(() => [...document.querySelectorAll('#miniBox .riga')].map(d => d.textContent)), ['GATTO'], 'anteprima della riga col cursore');
    assert.equal(await t.page.textContent('#antCont'), '2 / 3');
    await t.shot('piu-parole');
    await t.page.click('#goBtn'); await t.page.waitForTimeout(250);
    assert.deepEqual(await t.righe(), ['CANE']);
    await t.tocco(c.x, c.y); await t.page.waitForTimeout(500);
    assert.deepEqual(await t.righe(), ['CANE'], 'un tocco solo non cambia');
    await t.doppio(c.x, c.y); assert.deepEqual(await t.righe(), ['GATTO']);
    await t.doppio(c.x, c.y); assert.deepEqual(await t.righe(), ['TOPO']);
    await t.controllaPixel('TOPO');
    await t.doppio(c.x, c.y); assert.deepEqual(await t.righe(), ['FINE']);
    assert.ok(await t.ev(() => box.firstChild.classList.contains('fine')), '«Fine» in grigio');
    await t.shot('fine');
    await t.doppio(c.x, c.y); assert.deepEqual(await t.righe(), ['CANE'], 'dopo «Fine» si ricomincia');
    await t.doppio(c.x, c.y); assert.deepEqual(await t.righe(), ['GATTO']);
    await t.tocco(c.x, c.y, 900); await t.page.waitForTimeout(300);
    assert.ok(!(await t.attivo()));
    assert.ok(await t.page.isVisible('#riprendiBtn')); assert.match(await t.page.textContent('#riprendiBtn'), /2ª di 3/);
    await t.shot('riprendi');
    await t.page.reload(); await t.page.waitForTimeout(300);
    assert.ok(await t.page.isVisible('#riprendiBtn'), 'riprendi resta dopo aver chiuso la pagina');
    await t.page.click('#riprendiBtn'); await t.page.waitForTimeout(250);
    assert.deepEqual(await t.righe(), ['GATTO'], 'riprende da dove era');
    await t.tocco(c.x, c.y, 900); await t.page.waitForTimeout(300);
    await t.page.click('#goBtn'); await t.page.waitForTimeout(250);
    assert.deepEqual(await t.righe(), ['CANE'], 'Mostra riparte dalla prima');
    await t.tocco(c.x, c.y, 900); await t.page.waitForTimeout(300);
    await t.ev(() => { S.giro.i = 1; save(); renderInfo(); });
    await t.page.fill('#testo', 'cane\ngatto\ntopo\nmerlo');
    assert.ok(await t.page.isHidden('#riprendiBtn'), 'elenco cambiato: niente riprendi');
    bene('più parole: righe vuote ignorate, anteprima della riga col cursore, doppio tocco avanti, «Fine» e si ricomincia, riprendi anche dopo la chiusura');

    /* Mescola: ogni giro è un ordine nuovo con tutte le parole */
    const lista = Array.from({ length: 12 }, (_, i) => 'parola' + (i + 1));
    await t.page.fill('#testo', lista.join('\n'));
    await t.page.click('#optBtn'); await t.page.click('.opz[data-k="mescola"]');
    await t.shot('opzioni');
    await t.page.click('#fattoBtn');
    await t.page.click('#goBtn'); await t.page.waitForTimeout(250);
    const giro = [];
    for (let i = 0; i < 12; i++) { giro.push((await t.righe()).join(' ')); await t.doppio(c.x, c.y); }
    assert.deepEqual([...giro].sort(), lista.map(p => p.toUpperCase()).sort(), 'tutte, una volta');
    assert.notDeepEqual(giro, lista.map(p => p.toUpperCase()), 'non nell\'ordine scritto');
    assert.deepEqual(await t.righe(), ['FINE']);
    const o1 = (await t.S()).giro.ordine.join(); await t.doppio(c.x, c.y);
    assert.notEqual((await t.S()).giro.ordine.join(), o1, 'nuovo giro rimescolato');
    await t.tocco(c.x, c.y, 900); await t.page.waitForTimeout(300);
    bene('mescola: ogni parola una volta per giro, ordine a caso, rimescolato dopo «Fine»');

    /* Capovolgi */
    await t.ev(() => { S.capovolto = true; save(); });
    await t.page.click('#goBtn'); await t.page.waitForTimeout(250);
    assert.match(await t.ev(() => getComputedStyle(palco).transform), /matrix\(0(\.0+)?, -1, 1, 0/, 'girato di −90°');
    await t.controllaPixel('capovolto');
    await t.shot('capovolto');
    await t.tocco(c.x, c.y, 900); await t.page.waitForTimeout(300);
    await t.ev(() => { S.capovolto = false; save(); });
    bene('capovolgi: lo schermo si gira dall\'altra parte e la scritta resta dentro');

    /* Reset (due tocchi) cancella i testi, le opzioni restano */
    await t.page.click('#resetBtn'); assert.ok((await t.S()).piu, 'un tocco solo: niente');
    await t.page.click('#resetBtn'); await t.page.waitForTimeout(100);
    const s = await t.S();
    assert.equal(s.piu, ''); assert.equal(s.una, ''); assert.equal(s.giro, null); assert.equal(s.mescola, true); assert.equal(s.modo, 'piu');
    assert.equal(await t.ev(() => document.getElementById('testo').value), '');
    bene('Reset: due tocchi cancellano parole e giro, le opzioni restano');
    await t.page.context().close();
  }

  /* 2. Telefono davvero in orizzontale (rotazione libera): niente giro, margini dell'isola */
  {
    const t = await telefono({ width: 874, height: 402 });
    await t.page.goto(BASE + 'giochi/infronte/');
    await t.ev(() => { localStorage.clear(); localStorage.setItem('gds-infronte', JSON.stringify({ modo: 'una', una: 'Uva' })); }); await t.page.reload(); await t.page.waitForTimeout(300);
    await t.shot('editor-orizzontale');
    await t.page.click('#goBtn'); await t.page.waitForTimeout(250);
    assert.equal(await t.ev(() => getComputedStyle(palco).transform), 'none');
    await t.controllaPixel('UVA in orizzontale');
    await t.shot('uva');
    for (const c of ['Giulio Cesare', 'Il Signore degli Anelli']) { await t.ev(c => { S.una = c; aggiorna(); }, c); await t.controllaPixel(c + ' in orizzontale'); }
    await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(250);
    assert.ok(!(await t.attivo()));
    bene('in orizzontale vero: niente rotazione, scritta dentro e al centro');
    await t.page.context().close();
  }

  console.log(errori.length ? 'ERRORI:\n' + errori.join('\n') : 'nessun errore nella pagina');
  assert.equal(errori.length, 0);
  await browser.close();
  console.log(`\n${ok} prove superate`);
})().catch(e => { console.error(e); process.exit(1); });
