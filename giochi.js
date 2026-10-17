/* =====================================================================
   ELENCO DEI GIOCHI
   Per aggiungere un gioco: metti la sua pagina in una cartella dentro
   giochi/ e aggiungi qui una riga. L'hub e la copia offline si
   aggiornano da soli per tutti.

   categoria   l'id di una delle categorie qui sotto
   nome        come appare nell'elenco
   descrizione una riga sotto il nome
   link        percorso della pagina (il # sceglie il gioco nelle pagine
               che ne contengono più di uno)
   colore      colore della striscia a sinistra nell'elenco
   filo        (facoltativo) colore di un filo sottile sul lato interno
               della striscia, per farla spiccare se è molto scura
   extra       (facoltativo) altri file della pagina da salvare per l'uso
               senza connessione
   dati        dove il gioco salva le sue cose sul telefono (nomi, squadre,
               impostazioni, partita in corso). Si cancellano quando il gioco
               non si apre da più di 7 giorni, o col tasto «Pulisci tutto» della
               home (vedi comune/pulizia.js):
                 'gds-x'                            la chiave intera
                 { chiave: 'gds-x', campi: ['a'] }  solo quei campi della chiave
                 { poker: true }                    nome e tavoli del poker
               Una chiave in comune (gds-giocatori) si cancella solo quando
               nessuno dei giochi che la usano è stato aperto da 7 giorni.
               Gli storici non vanno messi qui: restano sempre.

   Una categoria con  diretto: true  apre subito il suo primo gioco
   invece dell'elenco (serve per il Contapunti).
   Con  unita: ['app/gioco', 'app/giochi']  la carta della home conta
   «app/giochi» invece di «giochi».
   ===================================================================== */
self.GIOCHI = {
  categorie: [
    { id: 'carte', nome: 'Carte', descrizione: 'Segnapunti e monete per le serate a carte', simbolo: 'carte' },
    { id: 'contapunti', nome: 'Contapunti', descrizione: 'Schermo diviso a colori: un tocco, un punto', simbolo: 'punti', diretto: true, etichetta: '2, 3 o 4 squadre' },
    { id: 'giochi', nome: 'Giochi', descrizione: 'Impostore, Lupus, i dadi del Perudo e Hex ad Aste', simbolo: 'maschera' },
    { id: 'altro', nome: 'Altro', descrizione: 'Poker, giochi da tavolo e chi inizia', simbolo: 'dado', unita: ['app/gioco', 'app/giochi'] },
    { id: 'expansions', nome: 'Expansions', descrizione: 'Espansioni nostre per i giochi da tavolo che abbiamo già', simbolo: 'fascicolo', unita: ['espansione', 'espansioni'] }
  ],
  giochi: [
    { categoria: 'carte', nome: 'Dichiarare', descrizione: 'Prese dichiarate e rispettate: n² + 10', link: 'giochi/segnapunti/#dichiarare', colore: '#2ED15A', dati: [{ chiave: 'segnapunti-prese-v2', campi: ['g1', 'tab'] }, 'segnapunti-prese-v1'] },
    { categoria: 'carte', nome: 'Pegno', descrizione: '+10 se fai giusto, −5 per presa di scarto, ×2 e ×4', link: 'giochi/segnapunti/#pegno', colore: '#A3324F', dati: [{ chiave: 'segnapunti-prese-v2', campi: ['g2', 'tab'] }, 'segnapunti-prese-v1'] },
    { categoria: 'carte', nome: 'Tresette', descrizione: '11 punti a mano, con o senza buongiochi', link: 'giochi/segnapunti/#tresette', colore: '#B39DF0', dati: [{ chiave: 'segnapunti-prese-v2', campi: ['g3', 'tab'] }, 'segnapunti-prese-v1'] },
    { categoria: 'carte', nome: 'Conta Monete', descrizione: 'Tre monete a testa: tocca per perderne una (31, Saltacavallo)', link: 'giochi/contamonete/', colore: '#E3B23C', dati: ['gds-contamonete'] },
    { categoria: 'contapunti', nome: 'Contapunti', descrizione: 'Schermo diviso a colori: un tocco, un punto', link: 'giochi/contapunti/', colore: '#4F58D9', dati: ['gds-contapunti'] },
    { categoria: 'giochi', nome: 'Impostore', descrizione: 'Tutti hanno la parola segreta, tranne uno', link: 'giochi/impostore/', colore: '#000000', filo: '#FFFFFF', extra: ['giochi/impostore/parole.js'], dati: ['gds-impostore-v2', 'gds-giocatori'] },
    { categoria: 'giochi', nome: 'Lupus', descrizione: 'Ruoli segreti e scaletta della notte per il narratore', link: 'giochi/lupus/', colore: '#1F2E8C', extra: ['giochi/lupus/ruoli.js'], dati: ['gds-lupus', 'gds-lupus-partita', 'gds-giocatori'] },
    { categoria: 'giochi', nome: 'Perudo', descrizione: 'I tuoi dadi sotto il bicchiere, quando quelli veri non bastano', link: 'giochi/perudo/', colore: '#E0249A', dati: ['gds-perudo'] },
    { categoria: 'giochi', nome: 'Hex ad Aste', descrizione: 'Hex con le carte vere: chi vince l’asta mette la pedina', link: 'giochi/hex/', colore: '#006BFF', dati: ['gds-hex', 'gds-hex-partita'] },
    { categoria: 'altro', nome: 'Poker', descrizione: 'Le fiches sul telefono: ognuno entra col codice del tavolo', link: 'giochi/poker/', colore: '#E8102A', dati: [{ poker: true }] },
    { categoria: 'altro', nome: '7 Wonders', descrizione: 'Punti finali di tutti, scienza compresa, con storico', link: 'giochi/7wonders/', colore: '#FF8A70', dati: ['giochidisimo:7wonders'] },
    { categoria: 'altro', nome: 'Chi inizia', descrizione: 'Un dito a testa: chi inizia, squadre o ordine di gioco', link: 'giochi/chiinizia/', colore: '#3A78E0', dati: ['gds-chiinizia'] },
    { categoria: 'expansions', nome: 'Secret Hitler: Dossier', descrizione: 'Ruoli dal telefono, indizi logici veri, poteri liberali e voltagabbana', link: 'giochi/dossier/', colore: '#08E8DE', dati: ['gds-dossier', 'gds-dossier-partita', 'gds-giocatori'] },
    { categoria: 'expansions', nome: 'Camel Up: Economics', descrizione: 'Piramide digitale, spionaggio sui dadi e Borsa sul vincitore di tappa', link: 'giochi/camelup/', colore: '#C8A273', extra: ['giochi/camelup/motore.js'], dati: ['gds-camelup', 'gds-camelup-partita', 'gds-giocatori'] },
    { categoria: 'expansions', nome: 'Nome\u00A0in\u00A0Codice: Double\u00A0Agents', descrizione: 'Due mappe segrete, doppi agenti contesi, intercettazioni e messaggi criptati', link: 'giochi/codenames/', colore: '#B7E449', extra: ['giochi/codenames/motore.js'], dati: ['gds-codenames', 'gds-codenames-partita'] }
  ]
};
