/* Comune a tutte le pagine: registra il service worker dell'app.
   Il service worker chiede sempre prima la versione nuova alla rete
   (così ogni aggiornamento arriva a tutti) e usa la copia salvata solo
   quando manca la connessione. Includilo in ogni nuova pagina con
   <script src="../../comune/app.js"></script> */
(function () {
  if (!('serviceWorker' in navigator) || !document.currentScript) return;
  var root = new URL('../', document.currentScript.src).href;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(function () {});
  });
})();
