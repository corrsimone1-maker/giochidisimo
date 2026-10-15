# Giochi di Simo

Tutti i segnapunti e gli strumenti per le serate di giochi, in un'unica app.

**Apri:** https://corrsimone1-maker.github.io/giochidisimo/
(sull'iPhone: Safari → Condividi → «Aggiungi alla schermata Home»)

| Categoria | Gioco | Pagina |
|---|---|---|
| Carte | Dichiarare, Pegno, Tresette | `giochi/segnapunti/` (una pagina, il gioco si sceglie con `#dichiarare`, `#pegno`, `#tresette`) |
| Altro | Poker (fiches sul telefono, multigiocatore) | `giochi/poker/` |
| Altro | 7 Wonders (punti finali di tutti, scienza con jolly, storico) | `giochi/7wonders/` |

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
   Per una nuova categoria aggiungi una voce anche in `categorie`.

Fatto il push su `main`, GitHub Pages pubblica in circa un minuto e tutti vedono la novità
alla prossima apertura: il service worker (`sw.js`) chiede sempre prima la versione nuova alla
rete e usa la copia salvata solo senza connessione. Non c'è nessun numero di versione da cambiare.

## Dove stanno i dati

- **Segnapunti e 7 Wonders:** sul telefono che li usa (localStorage). Le partite in corso
  di Dichiarare, Pegno e Tresette sono le stesse della vecchia app `segnapunti`, perché il sito è lo stesso.
- **Poker:** il tavolo passa da broker MQTT pubblici (EMQX, HiveMQ, Mosquitto) e ogni telefono ne tiene una copia.
  Chi conosce il codice del tavolo può vedere nomi e fiches.

## Provenienza

- `giochi/segnapunti/` viene dalla repo `segnapunti`, con l'aggiunta del link all'hub e della scelta del gioco via `#`.
- `giochi/poker/` viene dalla repo `pokercontachips`, con il link all'hub.
- `giochi/7wonders/` estende il calcolatore dei punti scienza con tutte le categorie, la classifica
  (a pari punti vince chi ha più monete) e lo storico delle partite.
