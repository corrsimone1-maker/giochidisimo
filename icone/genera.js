/* Rigenera le icone PNG dell'app a partire da icona.svg.
   Uso (nella sandbox di Claude):
     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node icone/genera.js
   Altrove indica dove sta Playwright con  PLAYWRIGHT=<percorso del pacchetto>. */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');

const svg = fs.readFileSync(path.join(__dirname, 'icona.svg'), 'utf8');
const USCITE = [
  // nome, lato in pixel, scala del disegno
  ['icon-512.png', 512, 1],
  ['icon-192.png', 192, 1],
  ['apple-touch-icon.png', 180, 1],        // iPhone: «Aggiungi alla schermata Home»
  ['icon-maskable-512.png', 512, 0.8]      // Android ritaglia l'icona: il disegno deve stare nel cerchio centrale
];

(async () => {
  const browser = await chromium.launch();
  for (const [nome, lato, scala] of USCITE) {
    const page = await browser.newPage({ viewport: { width: lato, height: lato } });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${lato}px;height:${lato}px}</style>${svg}`);
    if (scala !== 1) {
      await page.evaluate(s => document.getElementById('disegno')
        .setAttribute('transform', `translate(256 256) scale(${s}) translate(-256 -256)`), scala);
    }
    await page.screenshot({ path: path.join(__dirname, nome) });
    await page.close();
    console.log('ok', nome);
  }
  await browser.close();
})();
