# Giochi di Simo

Tutti i segnapunti e gli strumenti per le serate di giochi, in un'unica app.

**Apri:** https://corrsimone1-maker.github.io/giochidisimo/
(sull'iPhone: Safari → Condividi → «Aggiungi alla schermata Home»)

| Categoria | Gioco | Pagina |
|---|---|---|
| Carte | Dichiarare, Pegno, Tresette | `giochi/segnapunti/` (una pagina, il gioco si sceglie con `#dichiarare`, `#pegno`, `#tresette`) |
| Carte | Conta Monete (tre monete a testa per 31 e Saltacavallo: tocco = ne perdi una, tieni premuto = la riprendi) | `giochi/contamonete/` |
| Contapunti | Schermo diviso in 2, 3 o 4 colori, un tocco = un punto, blocco anti-tocco, tempo di gioco; sempre in orizzontale | `giochi/contapunti/` (la carta della home lo apre direttamente) |
| Giochi | Impostore (parola segreta, pacchetti di parole scelti dalle Impostazioni) | `giochi/impostore/` (parole in `parole.js`) |
| Giochi | Lupus (30 ruoli tra cui scegliere, distribuzione segreta, scaletta della notte per il narratore) | `giochi/lupus/` (ruoli in `ruoli.js`) |
| Giochi | Perudo (i propri dadi sotto il bicchiere: si guarda tenendo premuto, si mescola tenendo premuto, −1 dado, calza) | `giochi/perudo/` |
| Giochi | Hex ad Aste (Hex in cui ogni pedina si conquista con un’asta di carte vere: l’app gestisce solo la scacchiera; si sceglie a mano chi ha vinto l’asta, Pareggio e gettone di priorità, annulla tenendo premuto, 5×5–11×11, mazzo francese o italiano, regolamento con schemi) | `giochi/hex/` |
| Giochi | Claude Machine (deduzione alla Turing Machine: un codice segreto di tre cifre e 4–6 verificatori che controllano in segreto una regola ciascuno; livelli Medio, Difficile e Insano con carte «malate» e carte doppie; collaborativa o versus, con un telefono che gira o ognuno col suo in una stanza che si chiude e si cancella) | `giochi/machine/` (logica in `motore.js`, prove in `prove/machine.test.js` e `prove/machine.stanze.test.js`) |
| Altro | Poker (fiches sul telefono, multigiocatore) | `giochi/poker/` |
| Altro | 7 Wonders (punti finali di tutti, scienza con jolly, storico) | `giochi/7wonders/` |
| Altro | Chi inizia (un dito a testa: chi inizia, squadre, ordine di gioco) | `giochi/chiinizia/` |
| Expansions | Secret Hitler: Dossier (espansione per il gioco fisico: ruoli dal telefono, un indizio logico vero a testa, rapporti al Presidente, poteri liberali a scelta tra Voto segreto, Testimone, Inchiesta e Confronto, Voltagabbana facoltativo, indagine ed esecuzione) | `giochi/dossier/` |
| Expansions | Camel Up: Economics (espansione per Camel Up 2ª edizione: il telefono fa da piramide con sequenza dei dadi fissata a inizio tappa e impronta SHA-256 verificabile, asta segreta per una licenza di spionaggio con tre domande, Borsa LMSR sul vincitore di tappa con prezzi d’apertura dalla classifica, portafogli, liquidazione, punteggio finale sterline + guadagno in Borsa / 10) | `giochi/camelup/` (logica in `motore.js`, prove in `prove/camelup.test.js`, simulazioni in `prove/camelup.bilanciamento.js`) |
| Expansions | Nome in Codice: Double Agents (espansione per Codenames, «Nome in Codice» in italiano: due mappe segrete diverse generate dal telefono, 3 doppi agenti condivisi che conquista chi li tocca per primo, punti intelligence fino a 7 con bonus di coppia, intercettazioni a sorpresa sulla prima scelta avversaria, messaggi criptati da 1 o 2, un’indagine segreta, annulla onesto, debriefing con tutti i segreti, regolamento illustrato) | `giochi/codenames/` (logica in `motore.js`, prove in `prove/codenames.test.js` e `prove/codenames.pagina.test.js`, simulazioni in `prove/codenames.bilanciamento.js`) |
| Expansions | 7 Wonders: Secret Societies (espansione per 7 Wonders con un solo telefono: società segrete con missione e potere, Concilio che vota una legge per l’Era II e III con Sigillo e veto, Patti pubblici con scelta segreta Leale/Traditore ribilanciati come «caccia al cervo», Patrocini, scommesse sulle costruzioni degli altri, verifica sì/no a fine Era, rivelazioni, archivio segreto, punti portati nel conteggio di 7 Wonders) | `giochi/societa/` (logica in `motore.js`, prove in `prove/societa.test.js` e `prove/societa.pagina.test.js`, conti in `prove/societa.bilanciamento.js`) |

> Le istruzioni complete per Claude (dove mettere parole e ruoli, convenzioni, come provare e pubblicare)
> sono in [`CLAUDE.md`](CLAUDE.md).

## Aggiungere un gioco

1. Crea la cartella `giochi/<nome>/` con dentro `index.html`.
   Nell'`<head>` metti le due righe comuni (passaggi morbidi tra le pagine), in cima alla pagina
   il link per tornare all'hub e in fondo lo script comune:
   ```html
   <style>@view-transition{navigation:auto}</style>
   <link rel="stylesheet" href="../../comune/app.css">
   <script src="../../giochi.js"></script>
   <script src="../../comune/pulizia.js"></script>
   ...
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

- **Segnapunti, 7 Wonders, Contapunti, Impostore, Lupus, Chi inizia, Dossier, Hex ad Aste, Camel Up: Economics, Nome in Codice: Double Agents, 7 Wonders: Secret Societies, Claude Machine:** le partite e le impostazioni stanno sul
  telefono che li usa (localStorage). I nomi dei giocatori sono in comune tra Impostore e Lupus.
- **Poker:**
  - ogni tavolo sta su tre server MQTT pubblici e gratuiti (un messaggio per tavolo, sovrascritto a ogni mossa) e in
    una copia su ogni telefono che ci è entrato;
  - «Chiudi il tavolo» nel menu mostra a tutti la classifica finale e cancella il tavolo dai telefoni, mentre sui
    server resta solo la classifica (meno di 1 KB);
  - le copie dei tavoli fermi da più di 7 giorni si cancellano da sole.
- **Claude Machine, stanze:** ogni stanza sta sugli stessi tre server MQTT del poker; «Chiudi e cancella» la cancella
  per tutti (resta solo una lapide vuota, che scade dopo un giorno) e comunque i server la cancellano da soli dopo 12 ore.
- **Pulizia:**
  - un gioco non aperto da più di 7 giorni torna come nuovo: via nomi, squadre, impostazioni e partita;
  - il tasto «Pulisci tutto» in fondo alla home (da tenere premuto) lo fa subito per tutti i giochi;
  - gli storici di 7 Wonders, Dossier, Camel Up: Economics e Nome in Codice: Double Agents restano;
  - le chiavi di ogni gioco sono nel campo `dati` di `giochi.js` (vedi `comune/pulizia.js`).
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
