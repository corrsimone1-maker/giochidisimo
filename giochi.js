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
   icona       (facoltativo) disegno accanto al nome nell'elenco: il nome di
               uno dei disegni in ICONE dentro index.html (es. 'esagoni')
   extra       (facoltativo) altri file della pagina da salvare per l'uso
               senza connessione

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
    { categoria: 'carte', nome: 'Dichiarare', descrizione: 'Prese dichiarate e rispettate: n² + 10', link: 'giochi/segnapunti/#dichiarare', colore: '#2ED15A' },
    { categoria: 'carte', nome: 'Pegno', descrizione: '+10 se fai giusto, −5 per presa di scarto, ×2 e ×4', link: 'giochi/segnapunti/#pegno', colore: '#A3324F' },
    { categoria: 'carte', nome: 'Tresette', descrizione: '11 punti a mano, con o senza buongiochi', link: 'giochi/segnapunti/#tresette', colore: '#B39DF0' },
    { categoria: 'carte', nome: 'Conta Monete', descrizione: 'Tre monete a testa: tocca per perderne una (31, Saltacavallo)', link: 'giochi/contamonete/', colore: '#E3B23C' },
    { categoria: 'contapunti', nome: 'Contapunti', descrizione: 'Schermo diviso a colori: un tocco, un punto', link: 'giochi/contapunti/', colore: '#4F58D9' },
    { categoria: 'giochi', nome: 'Impostore', descrizione: 'Tutti hanno la parola segreta, tranne uno', link: 'giochi/impostore/', colore: '#000000', filo: '#FFFFFF', extra: ['giochi/impostore/parole.js'] },
    { categoria: 'giochi', nome: 'Lupus', descrizione: 'Ruoli segreti e scaletta della notte per il narratore', link: 'giochi/lupus/', colore: '#1F2E8C', extra: ['giochi/lupus/ruoli.js'] },
    { categoria: 'giochi', nome: 'Perudo', descrizione: 'I tuoi dadi sotto il bicchiere, quando quelli veri non bastano', link: 'giochi/perudo/', colore: '#16938C' },
    { categoria: 'giochi', nome: 'Hex ad Aste', descrizione: 'Hex con le carte vere: chi vince l’asta mette la pedina', link: 'giochi/hex/', colore: '#3D9AF2', icona: 'esagoni' },
    { categoria: 'altro', nome: 'Poker', descrizione: 'Le fiches sul telefono: ognuno entra col codice del tavolo', link: 'giochi/poker/', colore: '#E8102A' },
    { categoria: 'altro', nome: '7 Wonders', descrizione: 'Punti finali di tutti, scienza compresa, con storico', link: 'giochi/7wonders/', colore: '#FF8A70' },
    { categoria: 'altro', nome: 'Chi inizia', descrizione: 'Un dito a testa: chi inizia, squadre o ordine di gioco', link: 'giochi/chiinizia/', colore: '#3A78E0' },
    { categoria: 'expansions', nome: 'Secret Hitler: Dossier', descrizione: 'Ruoli dal telefono, indizi logici veri, poteri liberali e voltagabbana', link: 'giochi/dossier/', colore: '#4E8C86' }
  ]
};
