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
| `index.html` | Home: quattro carte da gioco (categorie), l'elenco dei giochi di ogni categoria e in basso la riga con «Pulisci tutto» a sinistra (da tenere premuto) e il tastino «Condividi» a destra (foglio di condivisione del telefono, altrimenti copia il link). Quella riga deve restare **l'ultima cosa** della home (scorre con le carte). |
| `giochi.js` | **Registro unico** di categorie e giochi. La home e la copia offline si costruiscono da qui. |
| `sw.js` | Service worker: chiede prima alla rete, usa la cache solo offline. Salva le pagine di `giochi.js` e i file `extra`. |
| `comune/app.js` | Incluso in **ogni** pagina: blocca lo zoom con le dita e il rimbalzo, registra il service worker e offre `gdsAppare(el)` per far entrare una schermata. |
| `comune/app.css` | Incluso in **ogni** pagina: passaggi morbidi (circa 0,2 s) tra le pagine, tra home e categorie, per le schermate (`.appare`) e le finestre (`.velo`). |
| `comune/pulizia.js` | Incluso nell'`<head>` di **ogni** pagina, dopo `giochi.js` e prima dello script del gioco. Cancella i dati dei giochi non aperti da più di 7 giorni e dà `gdsPulizia.tutto()` al tasto «Pulisci tutto» della home (vedi «Pulizia dei dati»). |
| `giochi/<nome>/index.html` | Una pagina per gioco, autonoma (HTML, CSS e JS nello stesso file). |
| `giochi/impostore/parole.js` | **Parole di Impostore**, divise in pacchetti. |
| `giochi/lupus/ruoli.js` | **Ruoli di Lupus**. |
| `icone/icona.svg` | **Icona dell'app** (asso di cuori con la S, pedone, piramide a tre livelli sospesi, dado, stelle). I PNG si rigenerano con `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node icone/genera.js`; se cambi l'icona, alza anche il `?v=` nei link `icone/…` delle pagine e del manifest. |

Categorie in `giochi.js`:
- `carte` (Dichiarare, Pegno, Tresette, Conta Monete);
- `contapunti` (con `diretto: true`: la carta della home apre subito il gioco);
- `giochi` (Impostore, Lupus, Perudo, Hex ad Aste);
- `altro` (Poker, 7 Wonders, Chi inizia; ha `unita: ['app/gioco','app/giochi']`, quindi la carta dice «n app/giochi»).
- `expansions` (Secret Hitler: Dossier, Camel Up: Economics, Nome in Codice: Double Agents; carta «Expansions» con il fascicolo «Riservato», `unita: ['espansione','espansioni']`).

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
   - `colore`: **diverso da tutti gli altri** (oggi, scelti da Simo: Dichiarare verde acceso `#2ED15A`,
     Pegno burgundy `#A3324F`, Tresette lilla `#B39DF0`, Conta Monete oro `#E3B23C`, Contapunti indaco `#4F58D9`,
     Impostore nero `#000000` con `filo: '#FFFFFF'`, Lupus blu notte `#1F2E8C`, Perudo fucsia `#E0249A`, Poker rosso caramella `#E8102A`,
     7 Wonders rosa aranciato color tramonto `#FF8A70`, Chi inizia blu `#3A78E0`,
     Dossier turchese acceso `#08E8DE`, Hex ad Aste blu elettrico `#006BFF`, Camel Up: Economics sabbia calda `#C8A273`,
     Nome in Codice: Double Agents verde acido `#B7E449`);
   - `filo` (facoltativo): un filo sottile sul lato interno della striscia, per i colori troppo scuri sul fondo;
   - `extra` se la pagina carica altri file, così funzionano anche offline;
   - `dati` con tutte le chiavi che il gioco salva sul telefono (nomi, squadre, impostazioni, partita), tranne gli
     storici. Vedi «Pulizia dei dati».
3. Aggiorna la tabella nel `README.md`.

Convenzioni che Simo ha chiesto, da rispettare in ogni pagina:
- **Pagina:**
  - tema **scuro** (palette notte `#141C2F` / `#1B2540`, oro `#D8A84A`, font Bricolage Grotesque e Figtree);
  - il **lilla** gli piace;
  - in alto a sinistra il link `‹ Giochi` → `../../`;
  - nell'`<head>` `<style>@view-transition{navigation:auto}</style>` e `<link rel="stylesheet" href="../../comune/app.css">`
    (la prima riga va scritta nella pagina, non in `app.css`: da lì Chrome a volte la legge tardi e salta il passaggio),
    subito dopo `<script src="../../giochi.js"></script>` e `<script src="../../comune/pulizia.js"></script>`;
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
  - `gds-giocatori` (nomi in comune tra Impostore, Lupus, Dossier e Camel Up: Economics);
  - `gds-impostore-v2`, `gds-lupus`, `gds-lupus-partita`;
  - `gds-contapunti`, `gds-chiinizia`, `gds-perudo`, `gds-contamonete`;
  - `gds-hex` (impostazioni: `n`, `colori`, `mazzo`), `gds-hex-partita` (`n`, `mosse: [[casella, squadra], ...]`, `sel`, `gettone`);
  - `gds-dossier` (impostazioni), `gds-dossier-partita` (partita in corso, segreti compresi), `gds-dossier-storico` (risultati, per bilanciare);
  - `gds-camelup` (impostazioni e chi inizia), `gds-camelup-partita` (partita: eventi e sequenze dei dadi, segreti compresi), `gds-camelup-storico` (risultati, per bilanciare);
  - `gds-codenames` (`cfg` e `primo`), `gds-codenames-partita` (partita: mappa segreta ed eventi), `gds-codenames-storico` (risultati, per bilanciare);
  - `giochidisimo:7wonders` e `giochidisimo:7wonders:storico`;
  - poker, con il vecchio prefisso `fiches:` (vedi la sezione Poker);
  - `gds-ultimo-uso` (quando è stato aperto l'ultima volta ogni gioco, la scrive `comune/pulizia.js`).

  Non cambiare il formato di una chiave senza convertire i dati vecchi.
- **Disegni:** solo disegni originali. Niente riproduzioni di disegni protetti: per esempio le facce vere delle monete in euro non si copiano, e infatti le monete di Conta Monete sono inventate.

### Pulizia dei dati → `comune/pulizia.js`

Simo vuole ritrovare tutto se chiude l'app per sbaglio, ma dopo una settimana non gli interessa più niente:
nomi, squadre, impostazioni e partite di un gioco che non usa vanno via.
- **Automatica:** quando un gioco non viene aperto da più di **7 giorni**, alla prossima apertura di qualunque pagina
  si cancella tutto quello che salva. Aprire o usare il gioco rinnova i 7 giorni: l'uso si segna all'apertura, al ritorno
  in primo piano, all'uscita e al cambio di `#`, in `gds-ultimo-uso`.
- **Tasto «Pulisci tutto»** in fondo alla home, a sinistra di Condividi, da tenere premuto 1,2 s: cancella subito i dati
  di tutti i giochi, compresi nome e tavoli del poker.
- **Restano sempre:**
  - gli storici (`giochidisimo:7wonders:storico`, `gds-dossier-storico`, che serve a bilanciare gli indizi, `gds-camelup-storico`,
    `gds-codenames-storico`);
  - `fiches:device`;
  - tutto ciò che non è elencato. Sullo stesso indirizzo `corrsimone1-maker.github.io` ci sono anche altri siti di
    Simo, quindi **mai** `localStorage.clear()`.
- **Cosa cancella:** il campo `dati` di ogni gioco in `giochi.js`, che può essere:
  - una chiave intera;
  - alcuni campi di una chiave: il segnapunti tiene `g1`/`g2`/`g3` di Dichiarare, Pegno e Tresette nella stessa chiave;
  - `{ poker: true }`.
- **Chiavi in comune:** una chiave in comune (`gds-giocatori`, `tab` del segnapunti) si cancella solo quando sono
  scaduti tutti i giochi che la elencano.
- **Prima volta:** i giochi che hanno già dei dati partono da adesso.
- **Poker:** le copie dei tavoli ferme da più di 7 giorni (ora `t` del tavolo) o chiuse si tolgono anche se il poker si
  usa, insieme a `fiches:session` / `fiches:last` se puntavano a quelle.
- **Se un gioco salva una chiave nuova,** aggiungila al suo `dati`, aggiungi un caso in `prove/pulizia.test.js` e lancialo:
  ```
  python3 -m http.server 8765 &
  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node prove/pulizia.test.js
  ```

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

### Camel Up: Economics → `giochi/camelup/`

Espansione di Simo per Camel Up **2ª edizione** (cinque cammelli, due pazzi, dado grigio). Tema «deserto di notte» (sabbia
`#D9BE90`, bronzo `#A97A4C`, oro spento `#C8AA66`, font Marcellus e Figtree solo in questa pagina); colori vivi solo per i cammelli.
Si usano tabellone, cammelli, tessere e sterline veri: il telefono sostituisce **solo la piramide**, gestisce asta e spionaggio,
la Borsa e i crediti virtuali (separati dalle sterline). **Non conosce il tabellone**: non va fatto finta che i prezzi lo seguano.
- **`motore.js`** (in `extra`): tutta la logica, senza pagina. La partita salvata è `{ id, cfg, nomi, primo, partenza, tappe:
  { n: { seq, sale, hash } }, eventi }` e lo stato si ricava **rigiocando gli eventi** (`CU.stato`). Eventi: `asta`, `primo`,
  `dado`, `compra`, `vendi`, `tavolo`, `spia`, `traguardo`, `liquida`, `punteggi` (spiegati in cima al file). Ogni evento cambia
  saldo, portafoglio e mercato insieme. Gli eventi portano `g` (chi agisce) e il dado anche `k`: un doppio tocco viene rifiutato.
- **Dadi:** la sequenza di ogni tappa (permutazione dei sei dadi + risultati, `randIntCrypto` con scarto) si fissa una volta in
  `preparaTappa` e non cambia più, nemmeno annullando. Impegno: `sha256(testoImpegno(...))` (SHA-256 scritto a mano, sincrono).
- **Annulla:** toglie l'ultimo evento. `asta` e `spia` non si annullano (si vedrebbero offerte o risposte).
- **Borsa:** LMSR con le forme chiuse `R·b·log1p(p·expm1(±1/b))`; crediti in **centesimi interi**, acquisti per eccesso e
  vendite per difetto (niente arbitraggio). Prezzi d'apertura `APERTURA` per posto in classifica (prima tappa e dalle altre),
  stimati con `prove/camelup.bilanciamento.js`. `TIPI_MERCATO.testa` (testa a testa) è pronto nel motore ma spento: per
  accenderlo servono schermate e scelta delle coppie.
- **Parametri di base diversi dalla proposta originale** (decisi con le simulazioni, spiegati nella schermata Regole):
  apertura dalla classifica (non 20% a tutti), capitale 60 (non 40), domande 5/2/2 (non 6/4/2).
- **Prove:** `node prove/camelup.test.js` (piramide, distribuzioni, impegno, asta, spionaggio, LMSR, limiti, turni, annullamenti,
  fuzz sui saldi). Se cambi una regola aggiungi un caso. `node prove/camelup.bilanciamento.js` stampa i numeri del bilanciamento.
- Le regole spiegate stanno in `renderRegole()`: se cambi una meccanica o un parametro di base, aggiornale lì.

### Nome in Codice: Double Agents → `giochi/codenames/`

Nell'elenco della home si chiama **«Nome in Codice: Double Agents»** (scelta di Simo; in `giochi.js` gli spazi
dentro «Nome in Codice» e «Double Agents» sono `\u00A0`, così la riga va a capo solo dopo i due punti). Dentro la pagina
resta «Codenames», più corto.

Espansione di Simo per il Codenames fisico (25 carte parola e tessere vere, niente carte chiave). Tema «bunker di intelligence»
(antracite `#0B0D0C`, verde acido `#B7E449`, salvia `#7E8F70`, ambra `#E2A94C` per avvisi e doppi agenti; rosso `#E0574B` e blu
`#4D8CF0` solo per le squadre; font Chakra Petch, IBM Plex Mono e Figtree solo in questa pagina).
- **Mappa:** 7 solo rossi, 7 solo blu, 3 doppi (`D`), 7 neutrali, 1 assassino, mescolati con Fisher–Yates e `randIntCrypto`.
  Posizioni 0–24 = A1…E5 (colonne A–E, righe 1–5 viste dai capispia). Ogni capospia vede le sue 10 parole tutte uguali.
- **`motore.js`** (in `extra`): tutta la logica, senza pagina. Partita `{ v, id, cfg, mappa, primo, eventi, svelate, annullati, ui }`;
  lo stato si ricava **rigiocando gli eventi** (`DA.stato`). Eventi: `indagine`, `indizio`, `criptato`, `intercetta`, `tocco`
  (con `k` contro i doppi tocchi), `stop` (spiegati in cima al file). Punti: `e + d + (d ≥ 2 ? 1 : 0)`.
- **Privacy:** la plancia usa solo `DA.vistaPubblica(S)`, le mappe solo `DA.vistaPrivata(S, s)`. Le prove controllano che la plancia
  sia identica con o senza intercettazione (e ovunque sia), per qualunque messaggio criptato e qualunque indagine. Il gettone di
  intercettazione si scala **al primo tocco**, così il contatore non dice se l'intercettazione c'è. Le schermate riservate si aprono
  tenendo premuto e si chiudono da sole con `visibilitychange` (telefono bloccato) e dopo 3 minuti di sola consultazione.
- **Annulla:** toglie l'ultimo evento. Non si annullano `indagine`, `criptato` e il primo tocco contro un'intercettazione piazzata
  (mostrerebbero segreti già visti). Un tocco annullato finisce in `svelate`: la carta resta «nota» a tutti.
- **Parametri di base diversi dalla proposta originale** (decisi con le simulazioni, spiegati nel capitolo 13 del regolamento):
  `bonusRisposta: 1` (un'intercettazione in più a chi gioca per secondo; senza, chi inizia vinceva ~59%). Niente intercettazione
  sull'assassino; le intercettazioni sono «a sorpresa» (gli agenti non sanno se ci sono). La soglia non supera 7 (`LIMITI`).
- **Prove:** `node prove/codenames.test.js` (generazione e uniformità, viste e indistinguibilità, punteggio, intercettazioni, criptati,
  indagine, turni, annullamenti, 5.000 partite casuali). `node prove/codenames.bilanciamento.js` stampa le simulazioni.
  Nel browser: `prove/codenames.pagina.test.js` (serve `python3 -m http.server 8765`). Se cambi una regola aggiungi un caso.
- Il regolamento sta in `renderRegole()` (14 capitoli con schemi): se cambi una meccanica o un parametro di base, aggiornalo lì.

### Hex ad Aste → `giochi/hex/index.html`

Hex in cui il diritto di mettere una pedina si vince con un'asta di carte vere (una carta coperta a testa, vince la più alta,
pareggio al gettone di priorità che poi passa). **L'app gestisce solo la scacchiera**: non simula le carte e non sceglie mai
da sola chi muove; dopo ogni pedina torna su «Chi ha vinto l'asta?».
- **Squadre:** 0 collega alto e basso (Rosso di base, carte rosse), 1 sinistra e destra (Blu di base, carte nere). I colori sono
  coppie fisse in `COPPIE`, così non possono essere uguali o troppo simili.
- **Geometria:** casella (r, c), indice `r·N + c`, esagoni col lato in alto, centro `x = 1,5·c`, `y = √3·(r + c/2)`: è il rombo
  classico ruotato di 90°, con i bordi sinistro e destro verticali, perché in verticale le caselle vengono più grandi.
  Vicini: le sei direzioni di `DIREZIONI`, con controllo dei limiti (niente «a capo» tra le righe). Vittoria: `cammino()`, ricerca
  in ampiezza dal proprio bordo di partenza, che restituisce il cammino più corto da evidenziare. Le strisce colorate sono
  quattro triangoli centro-angoli ritagliati da una maschera lungo il contorno.
- **Annulla mossa** (tieni premuto 1,2 s): toglie l'ultima di `mosse` e riseleziona la sua squadra, anche a partita finita.
- Il regolamento sta in `renderRegole()` e segue colori e mazzo scelti: se cambi una meccanica, aggiornalo lì.
- **Verifica:** se tocchi la geometria, controlla che le adiacenze ricavate dai poligoni disegnati (due vertici in comune)
  coincidano con `vicini()` e che su scacchiere piene a caso ci sia sempre esattamente un vincitore.

### Poker (Fiches) → `giochi/poker/index.html`

Fiches sul telefono, multigiocatore senza server nostro. Ogni tavolo è un messaggio *retained* sul topic
`fiches-tavolo/v1/<codice>` di tre broker MQTT pubblici (EMQX, HiveMQ, Mosquitto), sovrascritto a ogni mossa
(al massimo 20-30 KB: log, storico e `aids` hanno un tetto). In più ogni telefono ne tiene una copia.
- **Dati sul telefono:** `fiches:st:<codice>` (copia del tavolo), `fiches:session`, `fiches:last`, `fiches:name`, `fiches:device`.
- **Replica:** `Sync` nel blocco `CORE-START`…`CORE-END`. Ordine totale tra stati in `better()`, rebase delle mosse proprie.
- **Chiudi il tavolo** (ultimo tasto del menu), azione `close`:
  - vale per tutti e non si annulla;
  - le puntate in corso tornano a chi le ha messe;
  - lo stato diventa `phase: 'closed'`, ridotto alla classifica (meno di 1 KB): è la «lapide» che resta sui broker;
  - ogni telefono che la riceve mostra la classifica finale, cancella la sua copia e torna alla home;
  - in `better()` uno stato chiuso vince su ogni stato aperto della stessa partita, così un telefono che si risveglia
    con mosse fatte offline non riapre il tavolo;
  - chi riceve la chiusura la ripubblica anche sui broker rimasti indietro.
  
  **Non** cancellare la lapide con un messaggio vuoto: un telefono rimasto offline ripubblicherebbe il tavolo aperto.
- **Pulizia:** le copie locali dei tavoli chiusi o fermi da più di 7 giorni le toglie `comune/pulizia.js`
  (vedi «Pulizia dei dati»). Lo spazio del sito (pochi MB) è in comune con tutti i giochi.
- **Prove:**
  - `node prove/poker.test.js` prova il core: chiusura, telefono addormentato, broker rimasti indietro, chiusura e mossa
    nello stesso istante. Se cambi `better()`, `Sync` o le azioni, rilancialo e aggiungi un caso.
  - Nel browser i broker veri non si raggiungono dalla sandbox. Con `page.route` si sostituisce `mqtt.min.js` con un client
    finto e si tiene un broker finto in node (`exposeBinding`), con un contesto separato per ogni telefono.

## Cose da sapere

- Su iPhone lo schermo regge al massimo 5 dita insieme: al sesto tocco iOS li annulla tutti. Chi inizia ha la modalità nascosta «un tocco alla volta» proprio per questo.
- Il poker usa broker MQTT pubblici. Dalla sandbox non si raggiungono, quindi negli errori di console dei test sono normali (vedi la sezione Poker per provarlo con un broker finto).
- Le vecchie repo separate (`segnapunti`, `pokercontachips`) Simo le cancella: è tutto qui.
