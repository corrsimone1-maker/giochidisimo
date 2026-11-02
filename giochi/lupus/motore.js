/* =====================================================================
   LUPUS: NARRATORE AUTOMATICO — la logica, senza pagina (self.LUPUS).

   Quando narra il telefono: chiama i ruoli con la voce, chi si sveglia
   sceglie sul telefono al centro del tavolo, all'alba si calcola chi muore
   e di giorno si segna chi elimina il voto. Qui ci sono solo le regole: la
   pagina (index.html) disegna le schermate e parla.

   Stato della partita automatica: G.A (dentro la partita G di index.html)
     n          notte (1, 2, …); 0 = «giorno zero» dell'Angelo, prima della prima notte
     p[i]       { r: ruolo attuale, lupo: la veggente lo vede lupo, branco: si sveglia col branco }
     amanti     [a, b] oppure null            incantati  [i, …] (pifferaio)
     poz        { vita, morte } pozioni della strega ancora da usare
     padre      true se il padre dei lupi ha già infettato
     volpe      false se la volpe ha perso il potere
     anziano    attacchi dei lupi che l'anziano regge ancora (1)
     malato     lupo che muore all'alba dopo (cavaliere), oppure null
     modello    modello del bambino selvaggio
     gufo       chi va al ballottaggio oggi (gufo)
     ultimo     { i, lupo } eliminato dal voto oggi (per la medium), null se nessuno
     senzaPoteri  true quando il villaggio ha eliminato l'anziano
     nd         scelte della notte in corso: { vittima, vittima2, bianco, protetto, salva, veleno, veggente, infetta }
     msg        messaggi privati per il giro del mattino: { i: [testo, …] }
   I giocatori sono seduti nell'ordine dell'elenco (il giro è antiorario: il
   prossimo è a destra, quindi a sinistra c'è il precedente).
   ===================================================================== */
(function () {
  'use strict';

  /* --- nomi per la voce: singolare e plurale --- */
  const VOCE = {
    branco: ['Lupi', 'Lupi'], massone: ['Massone', 'Massoni'], sorelle: ['Sorelle', 'Sorelle'], fratelli: ['Fratelli', 'Fratelli'],
    veggente: ['Veggente', 'Veggenti'], guardia: ['Guardia del corpo', 'Guardie del corpo'],
  };
  const voceDi = (id, nome, molti) => (VOCE[id] ? VOCE[id][molti ? 1 : 0] : nome);

  const ruoloDi = (G, i) => G.A.p[i].r;
  const vivo = (G, i) => !G.morti.includes(i);
  const vivi = G => G.carte.map((_, i) => i).filter(i => vivo(G, i));
  /* chi ha in mano un ruolo, vivo o morto (la chiamata non deve dire se è morto) */
  const titolari = (G, id) => G.carte.map((_, i) => i).filter(i => ruoloDi(G, i) === id);
  const inGioco = (G, id) => G.carte.some(c => c.ruolo.id === id);

  function nuovo(G) {
    G.A = {
      n: G.carte.some(c => c.ruolo.id === 'angelo') ? 0 : 1,
      p: G.carte.map(c => ({ r: c.ruolo.id, lupo: !!c.ruolo.branco, branco: !!c.ruolo.branco })),
      amanti: null, incantati: [], poz: { vita: true, morte: true }, padre: false, volpe: true, anziano: 1,
      malato: null, modello: null, gufo: null, ultimo: null, senzaPoteri: false, giudice: false,
      nd: {}, msg: {}, fase: 'tavolo', passo: 0, oggi: null,
    };
    return G.A;
  }

  /* Un ruolo del villaggio ha perso i poteri (l'anziano eliminato dal villaggio)? */
  const spento = (G, id) => G.A.senzaPoteri && ((self.RUOLI || []).find(r => r.id === id) || {}).squadra === 'villaggio';

  /* ---------------- passi della notte ---------------- */
  // Ogni passo: { id, nome (per la voce), chi: [titolari vivi], tutti: [titolari], tipo, finto }
  // tipo: 'guarda' (aprono gli occhi e si riconoscono), 'branco', 'scelta' (una persona), 'due', 'veggente',
  // 'volpe', 'strega', 'padre', 'grandelupo', 'bianco', 'medium', 'mitomane', 'canelupo', 'giudice'.
  // finto: si chiama lo stesso e si aspetta un po', ma non c'è niente da fare (morti, potere esaurito…).
  function passi(G) {
    const A = G.A, n = A.n, prima = n === 1;
    const ruoli = (self.RUOLI || []);
    const out = [];
    const add = (o) => out.push(o);
    for (const r of ruoli) {
      if (!r.notte || !inGioco(G, r.id)) continue;
      if (r.notte === 'prima' && !prima) continue;
      if (r.notte === 'dalla2' && prima) continue;
      if (['padre', 'grandelupo', 'lupobianco'].includes(r.id)) continue; // dentro il turno del branco
      const tutti = titolari(G, r.id);
      // la mitomane diventata veggente si sveglia con la veggente
      if (r.id === 'veggente') for (let i = 0; i < A.p.length; i++) if (A.p[i].r === 'veggente' && !tutti.includes(i)) tutti.push(i);
      const chi = tutti.filter(i => vivo(G, i));
      const tipo = { cupido: 'due', massone: 'guarda', sorelle: 'guarda', fratelli: 'guarda', mitomane: 'mitomane', giudice: 'giudice', selvaggio: 'scelta',
        canelupo: 'canelupo', veggente: 'veggente', guardia: 'scelta', gufo: 'scelta', strega: 'strega', volpe: 'volpe', pifferaio: 'due', medium: 'medium' }[r.id] || 'guarda';
      let finto = !chi.length || spento(G, r.id);
      if (r.id === 'volpe' && !A.volpe) finto = true;
      if (r.id === 'strega' && !A.poz.vita && !A.poz.morte) finto = true;
      if (r.id === 'medium' && !A.ultimo) finto = true;
      add({ id: r.id, ordine: r.ordine || 99, nome: voceDi(r.id, r.nome, tutti.length > 1), molti: tutti.length > 1, chi, tutti, tipo, finto });
    }
    // turno del branco: c'è se in gioco c'è qualcuno che si sveglia col branco (o che può diventarlo)
    const puoBranco = G.carte.some(c => c.ruolo.branco || ['mitomane', 'selvaggio', 'canelupo', 'padre'].includes(c.ruolo.id));
    if (puoBranco) {
      const chi = vivi(G).filter(i => A.p[i].branco);
      add({ id: 'branco', ordine: 20, nome: 'Lupi', molti: true, chi, tutti: chi, tipo: 'branco', finto: !chi.length });
      const extra = (id, ord, tipo, ok) => {
        if (!inGioco(G, id)) return;
        const tutti = titolari(G, id); const c2 = tutti.filter(i => vivo(G, i));
        add({ id, ordine: ord, nome: voceDi(id, (ruoli.find(r => r.id === id) || {}).nome || id, false), molti: false, chi: c2, tutti, tipo, finto: !c2.length || !ok });
      };
      // lupo bianco: una notte sì e una no (la seconda, la quarta…)
      extra('lupobianco', 21, 'bianco', n % 2 === 0);
      extra('padre', 22, 'padre', !A.padre);
      // grande lupo cattivo: finché nessun lupo è morto
      extra('grandelupo', 23, 'grandelupo', !G.morti.some(i => G.A.p[i].lupo || G.carte[i].ruolo.branco));
    }
    return out.sort((a, b) => a.ordine - b.ordine);
  }

  /* ---------------- vicini ---------------- */
  // I due vicini vivi di i (a sinistra il precedente, a destra il successivo).
  function vicini(G, i) {
    const n = G.carte.length; const v = [];
    for (const d of [-1, 1]) {
      for (let k = 1; k < n; k++) { const j = ((i + d * k) % n + n) % n; if (j !== i && vivo(G, j)) { if (!v.includes(j)) v.push(j); break; } }
    }
    return v;
  }
  // Primo lupo vivo alla sinistra di i (per il cavaliere).
  function lupoASinistra(G, i) {
    const n = G.carte.length;
    for (let k = 1; k < n; k++) { const j = ((i - k) % n + n) % n; if (vivo(G, j) && G.A.p[j].lupo) return j; }
    return null;
  }

  /* ---------------- morti ---------------- */
  // Elimina i giocatori della lista ({ i, causa }) con tutte le conseguenze: innamorati, modello del bambino
  // selvaggio, anziano eliminato dal villaggio. Restituisce i morti in ordine, con la causa.
  // Il cacciatore non spara qui: la pagina lo chiede (vedi cacciatoriDaFar e la fase «sparo»).
  function uccidi(G, lista) {
    const A = G.A; const morti = []; const coda = lista.slice();
    while (coda.length) {
      const { i, causa } = coda.shift();
      if (i == null || !vivo(G, i)) continue;
      G.morti.push(i); morti.push({ i, causa });
      const r = A.p[i].r;
      if (r === 'anziano' && ['voto', 'veleno', 'cacciatore'].includes(causa)) A.senzaPoteri = true;
      // l'angelo eliminato nel primo giro (giorno zero o prima notte) vince
      if (r === 'angelo') A.angeloMorto = 1;
      if (A.amanti && A.amanti.includes(i)) { const j = A.amanti[0] === i ? A.amanti[1] : A.amanti[0]; if (vivo(G, j)) coda.push({ i: j, causa: 'amore' }); }
      // il modello del bambino selvaggio muore: il bambino diventa lupo
      if (A.modello === i) for (let k = 0; k < A.p.length; k++) if (A.p[k].r === 'selvaggio' && vivo(G, k) && !A.p[k].branco) { A.p[k].lupo = true; A.p[k].branco = true; }
      if (r === 'cacciatore' && !spento(G, 'cacciatore')) (A.spari ||= []).push(i);
    }
    return morti;
  }

  // Alba: applica le scelte della notte. Restituisce { morti: [{ i, causa }], ringhio, gufo }.
  function alba(G) {
    const A = G.A, nd = A.nd, lista = [];
    // il lupo ammalato dal cavaliere la notte prima
    if (A.malato != null) { lista.push({ i: A.malato, causa: 'malattia' }); A.malato = null; }
    const attacco = (v, causa) => {
      if (v == null || !vivo(G, v)) return;
      if (nd.protetto === v) return; // guardia
      if (A.p[v].r === 'criceto') return; // i lupi non possono ucciderlo
      if (A.p[v].r === 'anziano' && A.anziano > 0 && !spento(G, 'anziano')) { A.anziano--; return; }
      lista.push({ i: v, causa });
      // il cavaliere sbranato: si ammala il primo lupo alla sua sinistra
      if (A.p[v].r === 'cavaliere' && !spento(G, 'cavaliere')) { const l = lupoASinistra(G, v); if (l != null) A.malato = l; }
    };
    if (nd.infetta && nd.vittima != null) {
      const v = nd.vittima; A.padre = true;
      A.p[v].lupo = true; A.p[v].branco = true;
      (A.msg[v] ||= []).push('Stanotte i lupi ti hanno infettato: ora sei un lupo mannaro. Dalla prossima notte ti svegli col branco, e tieni i tuoi poteri.');
    } else if (nd.salva !== true) attacco(nd.vittima, 'lupi');
    attacco(nd.vittima2, 'lupi');
    if (nd.bianco != null && vivo(G, nd.bianco)) lista.push({ i: nd.bianco, causa: 'lupi' });
    if (nd.veleno != null) lista.push({ i: nd.veleno, causa: 'veleno' });
    if (nd.veggente != null && A.p[nd.veggente].r === 'criceto') lista.push({ i: nd.veggente, causa: 'veggente' });
    const morti = uccidi(G, lista);
    // domatore: ringhio se tra i suoi vicini vivi c'è un lupo
    let ringhio = false;
    G.carte.forEach((c, i) => { if (A.p[i].r === 'domatore' && vivo(G, i) && !spento(G, 'domatore') && vicini(G, i).some(j => A.p[j].lupo)) ringhio = true; });
    A.gufo = nd.gufo != null && vivo(G, nd.gufo) ? nd.gufo : null;
    A.nd = {};
    // finito il primo giro, l'angelo ancora vivo diventa un contadino
    A.p.forEach((x, i) => { if (x.r === 'angelo' && vivo(G, i)) x.r = 'contadino'; });
    return { morti, ringhio, gufo: A.gufo };
  }

  // Il voto del giorno: elimina i (oppure nessuno). Idiota del villaggio: resta vivo e non vota più.
  // Restituisce { morti, idiota }.
  function voto(G, i, causa = 'voto') {
    const A = G.A;
    A.ultimo = null; // la medium scopre solo l'eliminato di oggi
    if (i == null) return { morti: [] };
    if (A.p[i].r === 'idiota' && !spento(G, 'idiota') && !A.idiota) { A.idiota = i; return { morti: [], idiota: i }; }
    A.ultimo = { i, lupo: A.p[i].lupo };
    return { morti: uccidi(G, [{ i, causa }]) };
  }

  // Giocatori che devono ancora sparare (cacciatori appena morti).
  const cacciatori = G => (G.A.spari || []).slice();
  function sparo(G, cacciatore, bersaglio) {
    G.A.spari = (G.A.spari || []).filter(x => x !== cacciatore);
    return bersaglio == null ? [] : uccidi(G, [{ i: bersaglio, causa: 'cacciatore' }]);
  }

  /* ---------------- vittoria ---------------- */
  // null se la partita continua, altrimenti { chi, testo }.
  function vittoria(G) {
    const A = G.A, v = vivi(G);
    const angelo = G.carte.findIndex(c => c.ruolo.id === 'angelo');
    if (angelo >= 0 && !vivo(G, angelo) && A.angeloMorto) return { chi: 'angelo', testo: `Ha vinto l’Angelo: ${G.carte[angelo].nome}` };
    if (!v.length) return { chi: 'nessuno', testo: 'Sono morti tutti: nessuno ha vinto' };
    if (A.amanti && v.length === 2 && A.amanti.every(i => vivo(G, i))) return { chi: 'amanti', testo: `Hanno vinto gli innamorati: ${A.amanti.map(i => G.carte[i].nome).join(' e ')}` };
    const bianco = v.filter(i => A.p[i].r === 'lupobianco');
    if (v.length === 1 && bianco.length) return { chi: 'lupobianco', testo: `Ha vinto il Lupo bianco: ${G.carte[bianco[0]].nome}` };
    const piff = v.filter(i => A.p[i].r === 'pifferaio');
    if (piff.length && v.filter(i => !piff.includes(i)).every(i => A.incantati.includes(i)) && v.length > 1) return { chi: 'pifferaio', testo: `Ha vinto il Pifferaio magico: ${G.carte[piff[0]].nome}` };
    const lupi = v.filter(i => A.p[i].lupo);
    const criceto = v.filter(i => A.p[i].r === 'criceto');
    const conCriceto = criceto.length ? ` (e anche il Criceto mannaro, ${G.carte[criceto[0]].nome}, è arrivato vivo alla fine)` : '';
    if (!lupi.length) return { chi: 'villaggio', testo: `Ha vinto il villaggio${conCriceto}` };
    const branco = lupi.filter(i => A.p[i].r !== 'lupobianco');
    if (!bianco.length && branco.length >= v.length - branco.length) return { chi: 'lupi', testo: `Hanno vinto i lupi${conCriceto}` };
    return null;
  }

  // Serve il giro dei messaggi stanotte? Dipende solo dai ruoli in gioco, non da cosa è successo,
  // così il giro non svela niente.
  function serveGiro(G) {
    const n = G.A.n;
    return (n === 1 && inGioco(G, 'cupido')) || inGioco(G, 'padre') || inGioco(G, 'pifferaio');
  }

  const CAUSE = {
    lupi: 'sbranato dai lupi', veleno: 'avvelenato', veggente: 'scoperto dalla veggente', malattia: 'morto di malattia',
    amore: 'morto di dolore', voto: 'eliminato dal voto', cacciatore: 'colpito dal cacciatore',
  };

  self.LUPUS = { nuovo, passi, vicini, uccidi, alba, voto, cacciatori, sparo, vittoria, serveGiro, vivi, vivo, CAUSE };
  if (typeof module !== 'undefined') module.exports = self.LUPUS;
})();
