/* Comune a tutte le pagine (includilo in ogni nuova pagina con
   <script src="../../comune/app.js"></script>).

   1. Niente zoom con due dita e niente pagina «elastica»:
      - touch-action: pan-x pan-y sulla radice lascia scorrere ma toglie lo zoom
        con le dita e il doppio tocco (Safari lo rispetta da iOS 13);
      - gesturestart/gesturechange sono gli eventi del pizzico propri di Safari:
        annullarli blocca lo zoom anche dove il CSS non arriva;
      - overscroll-behavior: none sulla radice toglie il rimbalzo quando si
        trascina oltre il bordo (Safari da iOS 16).
      Il meta viewport con maximum-scale=1 evita invece lo zoom automatico
      quando si tocca un campo di testo.

   2. Registra il service worker dell'app: chiede sempre prima la versione
      nuova alla rete (così ogni aggiornamento arriva a tutti) e usa la copia
      salvata solo quando manca la connessione. */
(function () {
  var st = document.createElement('style');
  st.textContent = 'html{touch-action:pan-x pan-y;overscroll-behavior:none;-webkit-text-size-adjust:100%;text-size-adjust:100%}';
  (document.head || document.documentElement).appendChild(st);
  var stop = function (e) { e.preventDefault(); };
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, stop, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
})();

(function () {
  if (!('serviceWorker' in navigator) || !document.currentScript) return;
  var root = new URL('../', document.currentScript.src).href;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(function () {});
  });
})();
