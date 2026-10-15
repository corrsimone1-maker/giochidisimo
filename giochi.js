/* =====================================================================
   ELENCO DEI GIOCHI
   Per aggiungere un gioco: metti la sua pagina in una cartella dentro
   giochi/ e aggiungi qui una riga. L'hub e la copia offline si
   aggiornano da soli per tutti.

   categoria   'carte' oppure 'altro' (o una nuova categoria qui sotto)
   nome        come appare nell'elenco
   descrizione una riga sotto il nome
   link        percorso della pagina (il # sceglie il gioco nelle pagine
               che ne contengono più di uno)
   colore      colore della striscia a sinistra nell'elenco
   ===================================================================== */
self.GIOCHI = {
  categorie: [
    { id: 'carte', nome: 'Carte', descrizione: 'Segnapunti per le serate a carte', simbolo: 'carte' },
    { id: 'altro', nome: 'Altro', descrizione: 'Poker senza fiches e giochi da tavolo', simbolo: 'dado' }
  ],
  giochi: [
    { categoria: 'carte', nome: 'Dichiarare', descrizione: 'Prese dichiarate e rispettate: n² + 10', link: 'giochi/segnapunti/#dichiarare', colore: '#2F8F5B' },
    { categoria: 'carte', nome: 'Pegno', descrizione: '+10 se fai giusto, −5 per presa di scarto, ×2 e ×4', link: 'giochi/segnapunti/#pegno', colore: '#C0412F' },
    { categoria: 'carte', nome: 'Tresette', descrizione: '11 punti a mano, con o senza buongiochi', link: 'giochi/segnapunti/#tresette', colore: '#D8A84A' },
    { categoria: 'altro', nome: 'Poker', descrizione: 'Le fiches sul telefono: ognuno entra col codice del tavolo', link: 'giochi/poker/', colore: '#C9402F' },
    { categoria: 'altro', nome: '7 Wonders', descrizione: 'Punti finali di tutti, scienza compresa, con storico', link: 'giochi/7wonders/', colore: '#3F7A57' }
  ]
};
