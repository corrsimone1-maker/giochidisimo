# Istruzioni per Claude: Giochi di Simo

Leggi questo file prima di toccare la repo. Simo chiede le modifiche in chat (spesso dal telefono)
e vuole che tu faccia **tutto da solo**: modifica, prova, commit e push. Lui non tocca GitHub.

- **Sito:** https://corrsimone1-maker.github.io/giochidisimo/
- **Repo:** `corrsimone1-maker/giochidisimo`, branch `main`. GitHub Pages pubblica da `main` / root:
  dopo il push il sito si aggiorna da solo in circa un minuto.
- **Lingua:** tutto in italiano, sia l'interfaccia sia i commenti nel codice.

## Come si lavora

1. Aggiungi la repo alla sessione (con permesso di push), clonala e lavora su `main`.
2. Fai la modifica.
3. Prova in un browser vero. Playwright è in `/opt/node-tools/node_modules/playwright`, con
   `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Servi la repo con `python3 -m http.server`,
   blocca i Google Fonts (dalla sandbox non si raggiungono) e usa un viewport da iPhone
   (`390×844`, `hasTouch`, `isMobile`). Controlla gli errori della pagina e guarda gli screenshot.
4. Fai commit e push su `main`. Messaggi di commit in italiano.
5. Aspetta che finisca la pubblicazione: l'API `GET /repos/corrsimone1-maker/giochidisimo/actions/runs?per_page=1`
   deve dare `completed`/`success` sull'ultimo commit.
6. Verifica la pagina pubblicata con WebFetch aggiungendo `?v=<sha>`, perché la cache di GitHub
   tiene la versione vecchia fino a una decina di minuti. Dalla shell `github.io` di solito non si raggiunge.
7. Rispondi corto: cosa è cambiato e dove si trova nell'app.

## Struttura

| File | Cosa fa |
|---|---|
| `index.html` | Home: quattro carte da gioco (categorie), l'elenco dei giochi di ogni categoria e il tastino «Condividi» in basso a destra, che deve restare **l'ultima cosa** della home (scorre con le carte) (foglio di condivisione del telefono, altrimenti copia il link). |
| `giochi.js` | **Registro unico** di categorie e giochi. La home e la copia offline si costruiscono da qui. |
| `sw.js` | Service worker: chiede prima alla rete, usa la cache solo offline. Salva le pagine di `giochi.js` e i file `extra`. |
| `comune/app.js` | Incluso in **ogni** pagina: blocca lo zoom con le dita e il rimbalzo, registra il service worker e offre `gdsAppare(el)` per far entrare una schermata. |
| `comune/app.css` | Incluso in **ogni** pagina: passaggi morbidi (circa 0,2 s) tra le pagine, tra home e categorie, per le schermate (`.appare`) e le finestre (`.velo`). |
| `giochi/<nome>/index.html` | Una pagina per gioco, autonoma (HTML, CSS e JS nello stesso file). |
| `giochi/impostore/parole.js` | **Parole di Impostore**, divise in pacchetti. |
| `giochi/lupus/ruoli.js` | **Ruoli di Lupus**. |
| `icone/icona.svg` | **Icona dell'app** (asso di cuori con la S, pedone, piramide a tre livelli sospesi, dado, stelle). I PNG si rigenerano con `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node icone/genera.js`; se cambi l'icona, alza anche il `?v=` nei link `icone/…` delle pagine e del manifest. |

Categorie in `giochi.js`:
- `carte` (Dichiarare, Pegno, Tresette, Conta Monete);
- `contapunti` (con `diretto: true`: la carta della home apre subito il gioco);
- `giochi` (Impostore, Lupus, Perudo);
- `altro` (Poker, 7 Wonders, Chi inizia; ha `unita: ['app/gioco','app/giochi']`, quindi la carta dice «n app/giochi»).
- `expansions` (Secret Hitler: Dossier; carta «Expansions» con il fascicolo «Riservato», `unita: ['espansione','espansioni']`).

## Richieste frequenti

### Aggiungere parole a Impostore → `giochi/impostore/parole.js`

Le parole si cambiano **solo qui**: nell'app non c'è un editor, per scelta di Simo.

`self.PACCHETTI` è un array di pacchetti `{ id, nome, descrizione, attivo, categorie: { 'Categoria': [...] } }`.
I pacchetti si accendono e spengono dalle Impostazioni dell'app. `attivo: true` vuol dire acceso di base, e oggi lo è solo `standard`.

Pacchetti e categorie attuali:
- **standard**: Cibo, Frutta e verdura, Bevande, Animali, Luoghi, Casa, Oggetti, Vestiti e accessori, Mestieri, Sport,
  Giochi e svaghi, Mezzi di trasporto, Natura e meteo, Feste ed eventi, Strumenti musicali, Corpo e salute,
  Città nel mondo, Tecnologia, Religione e misteri, Idee e concetti, Effetti e sindromi, Situazioni,
  Vita all’italiana, Scuola e università, Arte e storia
- **roma**: Luoghi di Roma, Romanità
- **matematica**: Concetti matematici, Matematici, Vita da matematico
- **musica**: Cantanti italiani, Cantanti e gruppi stranieri, Canzoni
- **personaggi**: Persone famose, Personaggi di fantasia, Film, serie e TV
- **meme**: Meme (ci sono anche «aura» e «caracalla», meme loro), Slang di internet

Regole per le parole:
- Prima controlla quali parole ci sono **già**, in qualunque pacchetto. Confronta senza maiuscole né accenti.
  Le doppie non si aggiungono: dillo a Simo.
- Metti ogni parola nella categoria giusta. Se non ce n'è una adatta, creane una nuova nel pacchetto giusto.
  La categoria è l'indizio che vede l'impostore, quindi il nome deve avere senso.
- I nomi comuni vanno minuscoli (`friggitrice ad aria`), i nomi propri e i marchi maiuscoli (`IKEA`, `Walter White`).
- Usa gli apostrofi tipografici dentro le stringhe con apici (`'Vita all’italiana'`), oppure le virgolette doppie se serve `'`.
- Le parole di internet o «nostre» vanno in `meme`. Le persone e i personaggi vanno in `personaggi`.
  Ricorda a Simo che quei pacchetti sono spenti di base.
- Dopo la modifica verifica che non ci siano doppioni:

```bash
node -e "const self={}; eval(require('fs').readFileSync('giochi/impostore/parole.js','utf8'));
const n=w=>w.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(), s=new Map();
for (const p of self.PACCHETTI) for (const [c,ws] of Object.entries(p.categorie)) for (const w of ws)
{ const k=n(w); if (s.has(k)) console.log('DOPPIA', w, s.get(k), p.id+'/'+c); s.set(k, p.id+'/'+c); }
console.log('ok');"
```

### Aggiungere o cambiare ruoli di Lupus → `giochi/lupus/ruoli.js`

Anche i ruoli si cambiano **solo qui**: nell'app si sceglie soltanto quanti giocatori hanno ogni ruolo.
In cima al file c'è la spiegazione di ogni campo:
- `id`: unico, senza spazi, da non cambiare una volta usato;
- `nome`;
- `squadra`: `villaggio` | `lupi` | `ambiguo` | `solo`;
- `descrizione`: la legge chi riceve il ruolo;
- `notte`: `''` (non si sveglia) | `prima` | `ogni` | `dalla2`;
- `ordine`: posizione nella notte;
- `narratore`: cosa fa il narratore quando chiama il ruolo, **obbligatorio se `notte` non è vuoto**;
- `branco: true`: si sveglia con i lupi;
- `coiLupi`: nota per il narratore nel turno dei lupi;
- `avviso`: nota in cima alla prima notte;
- `origine`.

Ordine della notte usato finora (il turno del branco è sempre `20`):

```
prima notte: 1 cupido · 3 massone · 4 sorelle · 5 fratelli · 6 mitomane · 7 giudice · 8 selvaggio · 9 canelupo
ogni notte:  10 veggente · 15 guardia · [20 branco] · 21 lupobianco · 22 padre · 23 grandelupo · 25 gufo
             30 strega · 35 volpe · 38 pifferaio · 40 medium (dalla seconda notte)
```

- Un ruolo nuovo va messo nel blocco della sua squadra, con un `ordine` coerente: chi protegge o indaga prima dei lupi, chi reagisce alla vittima dopo.
- Per i ruoli presi da giochi veri (Lupus in Tabula, Lupi di Miller's Hollow, ecc.) controlla le regole su una fonte prima di scrivere la descrizione.
- I ruoli inventati da Simo si scrivono come li descrive lui.
- Nella risposta segnala quello che non hai potuto verificare.

### Aggiungere un gioco o un'app nuova

1. Crea `giochi/<nome>/index.html`, partendo da una pagina simile. Il Contapunti va bene per le pagine sempre in orizzontale, Impostore per quelle a «passa il telefono».
2. Aggiungi una riga in `giochi.js`:
   - `categoria`, `nome`, `descrizione`, `link`;
   - `colore`: **diverso da tutti gli altri** (oggi: lilla `#B39DF0`, burgundy `#A3324F`, ciano `#22C1D4`,
     oro `#E3B23C`, indaco `#4F58D9`, viola `#8A4FD8`, petrolio `#16938C`, lime `#9BCB3C`, fucsia `#D04BA0`,
     corallo `#EE7A5E`, blu `#3A78E0`, rosso `#D23B30`);
   - `extra` se la pagina carica altri file, così funzionano anche offline.
3. Aggiorna la tabella nel `README.md`.

Convenzioni che Simo ha chiesto, da rispettare in ogni pagina:
- **Pagina:**
  - tema **scuro** (palette notte `#141C2F` / `#1B2540`, oro `#D8A84A`, font Bricolage Grotesque e Figtree);
  - il **lilla** gli piace;
  - in alto a sinistra il link `‹ Giochi` → `../../`;
  - nell'`<head>` `<style>@view-transition{navigation:auto}</style>` e `<link rel="stylesheet" href="../../comune/app.css">`
    (la prima riga va scritta nella pagina, non in `app.css`: da lì Chrome a volte la legge tardi e salta il passaggio);
  - in fondo `<script src="../../comune/app.js"></script>`;
  - viewport `width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover`.
- **Reset:** dove si imposta una partita c'è un tasto **Reset** piccolo e sottolineato in alto a destra. Riporta tutto a com'era all'inizio e va toccato due volte entro 3 secondi.
- **Tocchi per sbaglio:**
  - le azioni pericolose si fanno **tenendo premuto** (mescolare, sbloccare, riprendere una moneta);
  - dove serve c'è il blocco schermo: un tocco blocca, per sbloccare si tiene premuto;
  - le azioni frequenti ma sbagliabili hanno «Annulla».
- **Pagine sempre in orizzontale** (Contapunti, Conta Monete): Simo tiene il telefono in verticale con la rotazione bloccata. Quando è `orientation:portrait` la pagina si gira di 90° con
  `width:100dvh;height:100vw;transform-origin:0 0;transform:rotate(90deg) translateY(-100%)`.
  Usa `clientWidth`/`offsetWidth`, non `getBoundingClientRect`, per le misure dentro la pagina girata.
- **Animazioni:** quello che si apre entra sfumando e salendo di poco, in circa 0,2 s (Simo le vuole pulite e veloci).
  Una finestra sopra la pagina, nascosta con `hidden`, prende la classe `velo`; quando la pagina cambia schermata chiama
  `if (window.gdsAppare) gdsAppare(el)`.
- **Niente schermate intermedie** di impostazioni se non le chiede: si entra subito nel gioco, e le impostazioni stanno in un tasto piccolo.
- **Casualità:** sempre con `crypto.getRandomValues` e scarto dei valori che distorcono il modulo (vedi `randInt` nelle pagine).
- **Dati:** in `localStorage` con prefisso `gds-`. Chiavi in uso:
  - `gds-giocatori` (nomi in comune tra Impostore e Lupus);
  - `gds-impostore-v2`, `gds-lupus`, `gds-lupus-partita`;
  - `gds-contapunti`, `gds-chiinizia`, `gds-perudo`, `gds-contamonete`;
  - `gds-dossier` (impostazioni), `gds-dossier-partita` (partita in corso, segreti compresi), `gds-dossier-storico` (risultati, per bilanciare);
  - `giochidisimo:7wonders` e `giochidisimo:7wonders:storico`.

  Non cambiare il formato di una chiave senza convertire i dati vecchi.
- **Disegni:** solo disegni originali. Niente riproduzioni di disegni protetti: per esempio le facce vere delle monete in euro non si copiano, e infatti le monete di Conta Monete sono inventate.

### Secret Hitler: Dossier → `giochi/dossier/index.html`

Espansione di Simo per il Secret Hitler fisico: tema «bunker» scuro (rosso spento `#A6463D`, verde acqua spento `#4E8C86`,
font Stardos Stencil e Special Elite solo in questa pagina). Si usano tabellone, mazzo delle leggi e carte Ja/Nein veri;
l'app sostituisce le buste dei ruoli e dà gli imprevisti.
- **Indizi:** `frase()` e `nuovoIndizio()` generano frasi vere sul mondo reale (chi è del partito fascista, chi è Hitler),
  che non nominano chi le riceve e sono vere tra il 30% e il 70% dei mondi possibili. Una forma nuova va aggiunta in `frase()`
  e nell'elenco `tipi` del livello giusto in `LIVELLI`; poi verifica con un controllo indipendente che migliaia di indizi
  generati siano tutti veri.
- **Opzioni:** rapporti al Presidente a ogni legge liberale, poteri liberali (Voto segreto, Testimone, Inchiesta, Confronto)
  sotto le caselle di `SLOT`, Voltagabbana alla 3ª legge liberale. Tutte si scelgono in Impostazioni prima della partita.
- Le regole spiegate stanno nella schermata «Come funziona» della pagina: se cambi una meccanica, aggiornala anche lì.

## Cose da sapere

- Su iPhone lo schermo regge al massimo 5 dita insieme: al sesto tocco iOS li annulla tutti. Chi inizia ha la modalità nascosta «un tocco alla volta» proprio per questo.
- Il poker usa broker MQTT pubblici. Dalla sandbox non si raggiungono, quindi negli errori di console dei test sono normali.
