/* Pulizia dei dati dei giochi. Va incluso nell'<head> di ogni pagina, dopo giochi.js e PRIMA
   dello script del gioco, così il gioco legge già i dati puliti:
     <script src="../../giochi.js"></script>
     <script src="../../comune/pulizia.js"></script>

   Ogni gioco dichiara in giochi.js (campo «dati») dove salva le sue cose: nomi, squadre,
   impostazioni, partita in corso. Gli storici (7 Wonders, Dossier) non sono lì e restano sempre.
   Si toccano SOLO le chiavi elencate: sullo stesso indirizzo (corrsimone1-maker.github.io) ci sono
   anche altri siti di Simo, quindi niente localStorage.clear().

   1. Segna quando si usa un gioco: all'apertura della pagina, quando torna in primo piano o va in
      secondo piano e al cambio di # (il segnapunti ha tre giochi in una pagina). L'ora va in
      gds-ultimo-uso, per link del gioco.
   2. All'apertura di ogni pagina cancella i dati dei giochi non usati da più di 7 giorni. Una chiave
      in comune (gds-giocatori) si cancella solo quando sono scaduti tutti i giochi che la usano.
      La prima volta i giochi che hanno già dei dati partono da adesso, così non si perde niente.
   3. Poker: le copie dei tavoli ferme da più di 7 giorni (st.t) o chiuse si tolgono comunque, con
      «Torna al tavolo» se puntava a una di quelle; a gioco scaduto si toglie anche il nome.
   4. gdsPulizia.tutto() cancella subito i dati di tutti i giochi: lo usa il tasto «Pulisci tutto»
      della home. */
(function () {
  'use strict';
  var GIORNO = 864e5, SCADENZA = 7 * GIORNO, K_USO = 'gds-ultimo-uso';
  var giochi = self.GIOCHI && self.GIOCHI.giochi;
  var ls; try { ls = window.localStorage; } catch (e) { return; }
  if (!giochi || !ls) return;

  function leggi(k) { try { return JSON.parse(ls.getItem(k)); } catch (e) { return null; } }
  function scrivi(k, v) { try { ls.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function togli(k) { try { ls.removeItem(k); } catch (e) {} }

  /* Ogni gioco con le sue voci: { id: 'chiave' } | { id: 'chiave.campo', chiave, campo } | { id: 'poker', poker } */
  var lista = giochi.filter(function (g) { return g.dati && g.dati.length; }).map(function (g) {
    var voci = [];
    g.dati.forEach(function (d) {
      if (typeof d === 'string') voci.push({ id: d, chiave: d });
      else if (d.poker) voci.push({ id: 'poker', poker: true });
      else (d.campi || []).forEach(function (c) { voci.push({ id: d.chiave + '.' + c, chiave: d.chiave, campo: c }); });
    });
    return { id: g.link, voci: voci };
  });

  function chiaviPoker() {
    var ks = [];
    for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf('fiches:st:') === 0) ks.push(k); }
    return ks;
  }
  function presente(v) {
    if (v.poker) return chiaviPoker().length > 0 || ['fiches:name', 'fiches:session', 'fiches:last'].some(function (k) { return ls.getItem(k) != null; });
    var raw = ls.getItem(v.chiave);
    if (raw == null) return false;
    if (!v.campo) return true;
    var o = leggi(v.chiave);
    return !!o && typeof o === 'object' && o[v.campo] != null;
  }
  function cancella(v) {
    if (v.poker) { chiaviPoker().forEach(togli); ['fiches:name', 'fiches:session', 'fiches:last'].forEach(togli); return; }
    if (!v.campo) { togli(v.chiave); return; }
    var o = leggi(v.chiave);
    if (!o || typeof o !== 'object' || !(v.campo in o)) return;
    delete o[v.campo];
    if (Object.keys(o).length) scrivi(v.chiave, o); else togli(v.chiave);      // rimasta vuota: via la chiave
  }
  /* Tavoli del poker vecchi o chiusi, anche se il poker si usa ancora */
  function tavoliVecchi(ora) {
    var tolti = {};
    chiaviPoker().forEach(function (k) {
      var st = leggi(k);
      if (!st || st.phase === 'closed' || !(ora - st.t < SCADENZA)) { togli(k); tolti[k.slice(10)] = true; }
    });
    ['fiches:session', 'fiches:last'].forEach(function (k) { var x = leggi(k); if (x && tolti[x.code]) togli(k); });
  }

  function pulisci(tutto) {
    try {
      var ora = Date.now(), uso = leggi(K_USO);
      if (!uso || typeof uso !== 'object' || Array.isArray(uso)) {        // prima volta: si parte da adesso
        uso = {};
        lista.forEach(function (g) { if (g.voci.some(presente)) uso[g.id] = ora; });
      }
      var scaduto = {};
      lista.forEach(function (g) { scaduto[g.id] = tutto || !(typeof uso[g.id] === 'number' && ora - uso[g.id] <= SCADENZA); });
      var vivi = {};                       // voci di almeno un gioco non scaduto: restano
      lista.forEach(function (g) { if (!scaduto[g.id]) g.voci.forEach(function (v) { vivi[v.id] = true; }); });
      var fatte = {};
      lista.forEach(function (g) {
        if (!scaduto[g.id]) return;
        g.voci.forEach(function (v) { if (!vivi[v.id] && !fatte[v.id]) { fatte[v.id] = true; cancella(v); } });
        delete uso[g.id];
      });
      if (!tutto) tavoliVecchi(ora);
      scrivi(K_USO, uso);
    } catch (e) {}
  }

  /* Quali giochi sono in questa pagina: stesso percorso, e stesso # se il link ne ha uno */
  var radice = document.currentScript ? new URL('../', document.currentScript.src) : null;
  var senzaIndice = function (p) { return p.replace(/index\.html$/, ''); };
  function giochiQui() {
    if (!radice) return [];
    var qui = senzaIndice(location.pathname), h = location.hash.toLowerCase();
    return lista.filter(function (g) {
      var u = new URL(g.id, radice);
      return senzaIndice(u.pathname) === qui && (!u.hash || !h || u.hash.toLowerCase() === h);
    });
  }
  function segnaUso() {
    var qui = giochiQui();
    if (!qui.length) return;
    var uso = leggi(K_USO); if (!uso || typeof uso !== 'object' || Array.isArray(uso)) uso = {};
    var ora = Date.now();
    qui.forEach(function (g) { uso[g.id] = ora; });
    scrivi(K_USO, uso);
  }

  pulisci(false);
  segnaUso();
  document.addEventListener('visibilitychange', segnaUso);
  window.addEventListener('pagehide', segnaUso);
  window.addEventListener('hashchange', segnaUso);
  self.gdsPulizia = { tutto: function () { pulisci(true); }, giorni: SCADENZA / GIORNO };
})();
