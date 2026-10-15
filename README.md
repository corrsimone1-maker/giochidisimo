# Giochi di Simo

Tutti i segnapunti e gli strumenti per le serate di giochi, in un'unica app.

**Apri:** https://corrsimone1-maker.github.io/giochidisimo/
(sull'iPhone: Safari → Condividi → «Aggiungi alla schermata Home»)

| Categoria | Gioco | Pagina |
|---|---|---|
| Carte | Dichiarare, Pegno, Tresette | `giochi/segnapunti/` (una pagina, il gioco si sceglie con `#dichiarare`, `#pegno`, `#tresette`) |
| Contapunti | Schermo diviso in 2, 3 o 4 colori, un tocco = un punto, blocco anti-tocco, tempo di gioco; sempre in orizzontale | `giochi/contapunti/` (la carta della home lo apre direttamente) |
| Giochi | Impostore (parola segreta, pacchetti di parole scelti dalle Impostazioni) | `giochi/impostore/` (parole in `parole.js`) |
| Giochi | Lupus (30 ruoli tra cui scegliere, distribuzione segreta, scaletta della notte per il narratore) | `giochi/lupus/` (ruoli in `ruoli.js`) |
| Altro | Poker (fiches sul telefono, multigiocatore) | `giochi/poker/` |
| Altro | 7 Wonders (punti finali di tutti, scienza con jolly, storico) | `giochi/7wonders/` |
| Altro | Chi inizia (un dito a testa: chi inizia, squadre, ordine di gioco) | `giochi/chiinizia/` |

## Aggiungere un gioco

1. Crea la cartella `giochi/<nome>/` con dentro `index.html`.
   In cima alla pagina metti il link per tornare all'hub e in fondo lo script comune:
   ```html
   <a href="../../">‹ Giochi</a>
   ...
   <script src="../../comune/app.js"></script>
   ```
2. Aggiungi una riga in [`giochi.js`](giochi.js):
   ```js
   { categoria: 'carte', nome: 'Scopa', descrizione: 'Primiera, settebello, scope', link: 'giochi/scopa/', colore: '#3A6A98' },
   ```
   Per una nuova categoria aggiungi una voce anche in `categorie`
   (con `diretto: true` la carta della home apre subito il primo gioco della categoria).
   Se la pagina usa altri file (come `parole.js` di Impostore), elencali in `extra`
   così funzionano anche senza connessione.

Fatto il push su `main`, GitHub Pages pubblica in circa un minuto e tutti vedono la novità
alla prossima apertura: il service worker (`sw.js`) chiede sempre prima la versione nuova alla
rete e usa la copia salvata solo senza connessione. Non c'è nessun numero di versione da cambiare.

## Dove stanno i dati

- **Segnapunti, 7 Wonders, Contapunti, Impostore, Lupus, Chi inizia:** le partite e le impostazioni stanno sul
  telefono che li usa (localStorage). I nomi dei giocatori sono in comune tra Impostore e Lupus.
- **Parole di Impostore e ruoli di Lupus:** solo nella repo, così sono uguali per tutti e non si perdono.
  - `giochi/impostore/parole.js`: pacchetti (Standard, Roma, Matematica, Musica, Personaggi, Meme), ognuno con le sue
    categorie. Per un pacchetto nuovo si copia un blocco e si cambia `id` e `nome`; `attivo: true` lo accende di base.
  - `giochi/lupus/ruoli.js`: ogni ruolo ha squadra, descrizione, se e quando si sveglia di notte, ordine di chiamata
    e cosa fa il narratore. In cima al file c'è la spiegazione di ogni campo. Le partite in corso
  di Dichiarare, Pegno e Tresette sono le stesse della vecchia app `segnapunti`, perché il sito è lo stesso.
- **Poker:** il tavolo passa da broker MQTT pubblici (EMQX, HiveMQ, Mosquitto) e ogni telefono ne tiene una copia.
  Chi conosce il codice del tavolo può vedere nomi e fiches.

## Provenienza

- `giochi/segnapunti/` viene dalla repo `segnapunti`, con l'aggiunta del link all'hub e della scelta del gioco via `#`.
- `giochi/poker/` viene dalla repo `pokercontachips`, con il link all'hub.
- `giochi/7wonders/` estende il calcolatore dei punti scienza con tutte le categorie, la classifica
  (a pari punti vince chi ha più monete) e lo storico delle partite.
