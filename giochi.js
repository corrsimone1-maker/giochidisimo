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
   extra       (facoltativo) altri file della pagina da salvare per l'uso
               senza connessione

   Una categoria con  diretto: true  apre subito il suo primo gioco
   invece dell'elenco (serve per il Contapunti).
   ===================================================================== */
self.GIOCHI = {
  categorie: [
    { id: 'carte', nome: 'Carte', descrizione: 'Segnapunti per le serate a carte', simbolo: 'carte' },
    { id: 'contapunti', nome: 'Contapunti', descrizione: 'Schermo diviso a colori: un tocco, un punto', simbolo: 'punti', diretto: true, etichetta: '2, 3 o 4 squadre' },
    { id: 'giochi', nome: 'Giochi', descrizione: 'Giochi di gruppo col telefono che gira', simbolo: 'maschera' },
    { id: 'altro', nome: 'Altro', descrizione: 'Poker, giochi da tavolo e chi inizia', simbolo: 'dado' }
  ],
  giochi: [
    { categoria: 'carte', nome: 'Dichiarare', descrizione: 'Prese dichiarate e rispettate: n² + 10', link: 'giochi/segnapunti/#dichiarare', colore: '#2F8F5B' },
    { categoria: 'carte', nome: 'Pegno', descrizione: '+10 se fai giusto, −5 per presa di scarto, ×2 e ×4', link: 'giochi/segnapunti/#pegno', colore: '#C0412F' },
    { categoria: 'carte', nome: 'Tresette', descrizione: '11 punti a mano, con o senza buongiochi', link: 'giochi/segnapunti/#tresette', colore: '#D8A84A' },
    { categoria: 'contapunti', nome: 'Contapunti', descrizione: 'Schermo diviso a colori: un tocco, un punto', link: 'giochi/contapunti/', colore: '#1E63B5' },
    { categoria: 'giochi', nome: 'Impostore', descrizione: 'Tutti hanno la parola segreta, tranne uno', link: 'giochi/impostore/', colore: '#D9483A', extra: ['giochi/impostore/parole.js'] },
    { categoria: 'giochi', nome: 'Lupus', descrizione: 'Ruoli segreti e scaletta della notte per il narratore', link: 'giochi/lupus/', colore: '#3BA56A', extra: ['giochi/lupus/ruoli.js'] },
    { categoria: 'altro', nome: 'Poker', descrizione: 'Le fiches sul telefono: ognuno entra col codice del tavolo', link: 'giochi/poker/', colore: '#C9402F' },
    { categoria: 'altro', nome: '7 Wonders', descrizione: 'Punti finali di tutti, scienza compresa, con storico', link: 'giochi/7wonders/', colore: '#3F7A57' },
    { categoria: 'altro', nome: 'Chi inizia', descrizione: 'Un dito a testa: chi inizia, squadre o ordine di gioco', link: 'giochi/chiinizia/', colore: '#F2B705' }
  ]
};
