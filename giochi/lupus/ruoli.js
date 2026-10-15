/* =====================================================================
   RUOLI DI LUPUS
   Si modificano solo qui: chi apre l'app vede subito la versione nuova.
   Dall'app si sceglie solo quanti giocatori ricevono ogni ruolo.

   id           parola unica, senza spazi (non cambiarla dopo averla usata)
   nome         come appare sulla carta
   squadra      'villaggio' | 'lupi' | 'ambiguo' | 'solo'
   descrizione  cosa legge chi riceve il ruolo
   notte        ''        non viene chiamato
                'prima'   solo la prima notte
                'ogni'    ogni notte
                'dalla2'  ogni notte dalla seconda in poi
   ordine       ordine di chiamata nella notte (più basso = prima)
   narratore    cosa deve fare il narratore quando lo chiama
   branco       true se apre gli occhi con i lupi mannari
   coiLupi      nota per il narratore nel turno dei lupi (es. la Bambina)
   avviso       nota mostrata in cima alla prima notte (es. l'Angelo)
   origine      da quale gioco viene, solo come promemoria

   Il turno dei lupi (ordine 20) c'è sempre se in gioco c'è qualcuno
   con  branco: true .
   ===================================================================== */
self.RUOLI = [
  /* ---------- Villaggio ---------- */
  { id: 'contadino', nome: 'Contadino', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Nessun potere: di giorno ragiona, accusa e vota per scovare i lupi.',
    origine: 'entrambi' },
  { id: 'veggente', nome: 'Veggente', squadra: 'villaggio', notte: 'ogni', ordine: 10,
    descrizione: 'Ogni notte indica un giocatore e il narratore le fa capire con un cenno se è un lupo mannaro.',
    narratore: 'Indica un giocatore: pollice su se è un lupo mannaro, giù se non lo è. (Il criceto mannaro, se indicato, muore.)',
    origine: 'Lupus in Tabula' },
  { id: 'guardia', nome: 'Guardia del corpo', squadra: 'villaggio', notte: 'ogni', ordine: 15,
    descrizione: 'Ogni notte sceglie un giocatore, diverso da sé, da proteggere: se i lupi attaccano proprio lui, non muore.',
    narratore: 'Indica chi proteggere stanotte (non se stessa). Se i lupi scelgono lui, al mattino non muore nessuno.',
    origine: 'Lupus in Tabula' },
  { id: 'medium', nome: 'Medium', squadra: 'villaggio', notte: 'dalla2', ordine: 40,
    descrizione: 'Ogni notte, dalla seconda, scopre se il giocatore eliminato dal voto quel giorno era un lupo mannaro.',
    narratore: 'Fagli capire con un cenno se l’ultimo eliminato dal voto era un lupo mannaro.',
    origine: 'Lupus in Tabula' },
  { id: 'massone', nome: 'Massone', squadra: 'villaggio', notte: 'prima', ordine: 3,
    descrizione: 'La prima notte i massoni si svegliano e si riconoscono: sono del villaggio e possono fidarsi l’uno dell’altro. Si mettono in gioco in coppia.',
    narratore: 'Aprono gli occhi, si guardano e li richiudono.',
    origine: 'Lupus in Tabula' },
  { id: 'cupido', nome: 'Cupido', squadra: 'villaggio', notte: 'prima', ordine: 1,
    descrizione: 'La prima notte sceglie due innamorati (anche se stesso). Se uno muore, l’altro muore di dolore. Se sono un lupo e un umano, vincono solo restando gli ultimi due.',
    narratore: 'Indica due innamorati. Poi tocca i due sulla spalla: aprono gli occhi, si riconoscono e li richiudono.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'strega', nome: 'Strega', squadra: 'villaggio', notte: 'ogni', ordine: 30,
    descrizione: 'Ha due pozioni, una volta sola ciascuna: una salva la vittima dei lupi (anche se stessa), l’altra uccide un giocatore a scelta. Può usarle anche nella stessa notte.',
    narratore: 'Mostrale chi hanno attaccato i lupi. Può salvarlo (se ha ancora la pozione) e/o avvelenare qualcuno (se ha ancora il veleno).',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'cacciatore', nome: 'Cacciatore', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Quando viene eliminato, in qualsiasi modo, spara subito e porta con sé un altro giocatore a sua scelta.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'bambina', nome: 'Bambina', squadra: 'villaggio', notte: '', ordine: 0,
    coiLupi: 'può sbirciare socchiudendo gli occhi',
    descrizione: 'Mentre i lupi hanno gli occhi aperti può sbirciare socchiudendo i suoi. Se i lupi la scoprono, possono sbranare lei al posto della vittima.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'sorelle', nome: 'Due sorelle', squadra: 'villaggio', notte: 'prima', ordine: 4,
    descrizione: 'La prima notte le due sorelle si svegliano e si riconoscono: sono del villaggio. Si mettono in gioco in coppia.',
    narratore: 'Aprono gli occhi, si riconoscono e li richiudono. (Se volete, chiamatele di nuovo ogni tanto per consultarsi in silenzio.)',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'fratelli', nome: 'Tre fratelli', squadra: 'villaggio', notte: 'prima', ordine: 5,
    descrizione: 'La prima notte i tre fratelli si svegliano e si riconoscono: sono del villaggio. Si mettono in gioco in tre.',
    narratore: 'Aprono gli occhi, si riconoscono e li richiudono.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'volpe', nome: 'Volpe', squadra: 'villaggio', notte: 'ogni', ordine: 35,
    descrizione: 'Ogni notte può indicare un giocatore: il narratore le dice se tra lui e i suoi due vicini c’è almeno un lupo. Se non ce n’è nessuno, perde il potere.',
    narratore: 'Se vuole, indica un giocatore: annuisci se lui o uno dei suoi due vicini vivi è un lupo. Se non lo è nessuno, la volpe perde il potere per sempre.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'cavaliere', nome: 'Cavaliere dalla spada arrugginita', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Se i lupi lo sbranano muore, ma il primo lupo seduto alla sua sinistra si ammala e muore la notte successiva.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'anziano', nome: 'Anziano', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Resiste al primo attacco dei lupi e muore solo al secondo. Se però lo elimina il villaggio (col voto, il veleno della strega o il colpo del cacciatore), tutti gli abitanti perdono i loro poteri.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'domatore', nome: 'Domatore d’orsi', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Ogni mattina, se tra i suoi due vicini vivi c’è un lupo, il narratore ringhia.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'idiota', nome: 'Idiota del villaggio', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Se il villaggio lo vota per eliminarlo, mostra la carta e resta in vita, ma da quel momento non può più votare.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'capro', nome: 'Capro espiatorio', squadra: 'villaggio', notte: '', ordine: 0,
    descrizione: 'Se una votazione finisce in parità, viene eliminato lui. Prima di uscire decide chi potrà votare il giorno dopo.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'giudice', nome: 'Giudice balbuziente', squadra: 'villaggio', notte: 'prima', ordine: 7,
    descrizione: 'Una volta per partita, con un segnale concordato col narratore, fa fare subito una seconda votazione nello stesso giorno.',
    narratore: 'Concordate un segnale segreto: quando lo farà durante un voto, ci sarà subito una seconda votazione.',
    origine: 'Lupi di Miller’s Hollow' },

  /* ---------- Lupi ---------- */
  { id: 'lupo', nome: 'Lupo mannaro', squadra: 'lupi', notte: '', ordine: 0, branco: true,
    descrizione: 'Ogni notte, d’accordo con gli altri lupi, sceglie chi sbranare. Di giorno finge di essere un abitante qualunque.',
    origine: 'entrambi' },
  { id: 'padre', nome: 'Padre dei lupi', squadra: 'lupi', notte: 'ogni', ordine: 22, branco: true,
    descrizione: 'Si sveglia col branco. Una volta per partita, invece di far sbranare la vittima, la infetta: diventa segretamente un lupo e tiene i suoi poteri.',
    narratore: 'Una volta per partita: se alza la mano, la vittima non muore ma diventa lupo. Toccala per dirglielo; da ora si sveglia col branco.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'grandelupo', nome: 'Grande lupo cattivo', squadra: 'lupi', notte: 'ogni', ordine: 23, branco: true,
    descrizione: 'Si sveglia col branco. Finché nessun lupo è morto, si risveglia da solo e sbrana una seconda vittima (non un lupo).',
    narratore: 'Solo se nessun lupo è ancora morto: si risveglia da solo e indica una seconda vittima.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'indemoniato', nome: 'Indemoniato', squadra: 'lupi', notte: '', ordine: 0,
    descrizione: 'Tifa per i lupi e vince con loro, ma non sa chi sono e non è un lupo: per la veggente risulta un abitante.',
    origine: 'Lupus in Tabula' },
  { id: 'gufo', nome: 'Gufo', squadra: 'lupi', notte: 'ogni', ordine: 25,
    descrizione: 'Ogni notte indica un giocatore, che il giorno dopo finisce d’ufficio al ballottaggio.',
    narratore: 'Indica un giocatore: domani andrà direttamente al ballottaggio.',
    origine: 'Lupus in Tabula' },

  /* ---------- Ambigui ---------- */
  { id: 'mitomane', nome: 'Mitomane', squadra: 'ambiguo', notte: 'prima', ordine: 6,
    coiLupi: 'si sveglia col branco se la prima notte ha indicato un lupo',
    descrizione: 'La prima notte indica un giocatore: se è un lupo mannaro diventa lupo, se è la veggente diventa veggente anche lui, altrimenti resta un semplice contadino.',
    narratore: 'Indica un giocatore. Fagli capire cosa diventa: lupo (da ora si sveglia col branco), veggente (si sveglia con la veggente) o contadino.',
    origine: 'Lupus in Tabula' },
  { id: 'selvaggio', nome: 'Bambino selvaggio', squadra: 'ambiguo', notte: 'prima', ordine: 8,
    coiLupi: 'si sveglia col branco se il suo modello è morto',
    descrizione: 'La prima notte sceglie un modello. Finché il modello è vivo è del villaggio; se il modello muore, diventa un lupo e si sveglia col branco.',
    narratore: 'Indica il suo modello. Se il modello muore, da quella notte chiamalo col branco.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'canelupo', nome: 'Cane lupo', squadra: 'ambiguo', notte: 'prima', ordine: 9,
    coiLupi: 'si sveglia col branco se ha scelto i lupi',
    descrizione: 'La prima notte sceglie per sempre se essere un contadino o un lupo. Se sceglie lupo, si sveglia col branco.',
    narratore: 'Chiedigli a gesti: villaggio o lupi? Se lupi, da stanotte chiamalo col branco.',
    origine: 'Lupi di Miller’s Hollow' },

  /* ---------- Da soli ---------- */
  { id: 'criceto', nome: 'Criceto mannaro', squadra: 'solo', notte: '', ordine: 0,
    descrizione: 'Gioca per sé: vince se arriva vivo alla fine della partita. I lupi non possono ucciderlo, ma muore se la veggente lo indica.',
    origine: 'Lupus in Tabula' },
  { id: 'lupobianco', nome: 'Lupo bianco', squadra: 'solo', notte: 'ogni', ordine: 21, branco: true,
    descrizione: 'Si sveglia col branco ma gioca da solo: una notte sì e una no può sbranare anche un lupo. Vince solo se resta l’ultimo vivo.',
    narratore: 'Una notte sì e una no: si risveglia da solo e, se vuole, indica un lupo da eliminare.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'pifferaio', nome: 'Pifferaio magico', squadra: 'solo', notte: 'ogni', ordine: 38,
    descrizione: 'Ogni notte incanta due giocatori (non se stesso). Vince quando tutti gli altri vivi sono incantati.',
    narratore: 'Indica due giocatori da incantare. Poi tocca tutti gli incantati: aprono gli occhi, si riconoscono e li richiudono.',
    origine: 'Lupi di Miller’s Hollow' },
  { id: 'angelo', nome: 'Angelo', squadra: 'solo', notte: '', ordine: 0,
    avviso: 'C’è l’Angelo: prima della prima notte fate un giro di discussione e un voto.',
    descrizione: 'La partita comincia con un voto prima della prima notte: se l’angelo viene eliminato in questo primo giro (dal voto o nella prima notte), vince da solo. Altrimenti diventa un semplice contadino.',
    origine: 'Lupi di Miller’s Hollow' }
];
