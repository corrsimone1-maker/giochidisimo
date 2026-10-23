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
| `giochi/mental/sfide/`, `strumenti/mental.js` e `strumenti/mental-enigmi.js` | **Sfide di MENTAL**, un file per mese, lo strumento che ne prepara di nuove e il catalogo degli enigmi scritti a mano (vedi la sezione MENTAL). |
| `icone/icona.svg` | **Icona dell'app** (asso di cuori con la S, pedone, piramide a tre livelli sospesi, dado, stelle). I PNG si rigenerano con `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node icone/genera.js`; se cambi l'icona, alza anche il `?v=` nei link `icone/…` delle pagine e del manifest. |

Categorie in `giochi.js`:
- `carte` (Dichiarare, Pegno, Tresette, Conta Monete);
- `contapunti` (con `diretto: true`: la carta della home apre subito il gioco);
- `giochi` (Impostore, Lupus, Perudo, Hex ad Aste, Claude Machine, MENTAL, ALIBI);
- `altro` (Poker, 7 Wonders, Chi inizia; ha `unita: ['app/gioco','app/giochi']`, quindi la carta dice «n app/giochi»).
- `expansions` (Secret Hitler: Dossier, Camel Up: Economics, Nome in Codice: Double Agents, 7 Wonders: Secret Societies; carta «Expansions» con il fascicolo «Riservato», `unita: ['espansione','espansioni']`).

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
     Nome in Codice: Double Agents verde acido `#B7E449`, 7 Wonders: Secret Societies porpora `#9B4DDB`, Claude Machine arancione Claude `#D97757`,
     ALIBI giallo evidenziatore `#F2D21B`, MENTAL verde menta `#3DDCA0`);
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
  - `gds-giocatori` (nomi in comune tra Impostore, Lupus, Dossier, Camel Up: Economics, Secret Societies, ALIBI e il versus a un telefono di Claude Machine);
  - `gds-impostore-v2`, `gds-lupus`, `gds-lupus-partita`;
  - `gds-contapunti`, `gds-chiinizia`, `gds-perudo`, `gds-contamonete`;
  - `gds-hex` (impostazioni: `n`, `colori`, `mazzo`), `gds-hex-partita` (`n`, `mosse: [[casella, squadra], ...]`, `sel`, `gettone`);
  - `gds-dossier` (impostazioni), `gds-dossier-partita` (partita in corso, segreti compresi), `gds-dossier-storico` (risultati, per bilanciare);
  - `gds-camelup` (impostazioni e chi inizia), `gds-camelup-partita` (partita: eventi e sequenze dei dadi, segreti compresi), `gds-camelup-storico` (risultati, per bilanciare);
  - `gds-codenames` (`cfg` e `primo`), `gds-codenames-partita` (partita: mappa segreta ed eventi), `gds-codenames-storico` (risultati, per bilanciare);
  - `gds-societa` (`cfg`), `gds-societa-partita` (partita: società, decreti, eventi, schede segrete comprese, e `ui`), `gds-societa-storico` (riassunti, per bilanciare);
  - `gds-alibi` (modo, livello, luogo, telefoni), `gds-alibi-partita` (`par` e `caso` intero, telefoni, `io`, consegna, accusa, taccuino `tac`), `gds-alibi-storico` (casi chiusi: risolto o no, durata);
  - `gds-machine` (impostazioni e nome), `gds-machine-partita` (partita o sessione di stanza), `gds-machine-stanze` (stanze aperte su questo telefono);
  - `gds-mental-partite` (tavole a metà di MENTAL, per data, e allenamenti `data|prova`), `gds-mental-storico` (il tempo ufficiale e l'esito di ogni giorno giocato: è «I miei tempi»);
  - `giochidisimo:7wonders` e `giochidisimo:7wonders:storico`;
  - poker, con il vecchio prefisso `fiches:` (vedi la sezione Poker);
  - `gds-ultimo-uso` (quando è stato aperto l'ultima volta ogni gioco, la scrive `comune/pulizia.js`).

  Non cambiare il formato di una chiave senza convertire i dati vecchi.
- **Giro al tavolo:** si gioca sempre in **senso antiorario** (il prossimo è a destra), tranne a poker. Nei testi
  scrivi «antiorario» e, quando le regole originali dicono «a sinistra», adatta a «a destra».
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
    `gds-codenames-storico`, `gds-societa-storico`, `gds-alibi-storico`, `gds-mental-storico`);
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

### 7 Wonders: Secret Societies → `giochi/societa/`

Espansione di Simo per il 7 Wonders fisico, da un progetto scritto con un'altra IA e ribilanciato. Tema «Concilio a lume di candela»
(prugna notte `#110D14`, foglia d'oro `#D4AF6A` per le azioni, porpora `#A068D6` per ciò che è segreto, ceralacca `#C8473F` per tradimenti
e avvisi, alloro `#8FB06A` per la lealtà; colori delle carte di 7 Wonders solo nei requisiti; font Cinzel e Figtree solo in questa pagina).
Il gioco vero resta intatto: carte, monete, conflitti e punteggio sono quelli fisici. Un solo telefono al centro.
- **`motore.js`** (in `extra`, `self.SS`): tutta la logica. Partita `{ v, id, cfg, nomi, soc, decreti: { 2, 3 }, spareggio, eventi, ui }`; tutto il
  caso si estrae in `nuovaPartita` (società, tre decreti per Conclave uno per famiglia e mai ripetuti, ordine di spareggio), poi lo stato si
  ricava **rigiocando gli eventi** (`SS.stato`). Eventi: `fineEra`, `relazione`, `urne`, `scheda`, `apriEra`, `verifica`, `missioni` (spiegati in cima
  al file). Fasi: Era I → Conclave II (mercato, cabina, esito) → Era II → verifica → Conclave III → Era III → verifica → missioni → fine.
- **Requisiti** come stringhe (`col:v:2`, `stadi:1`, `colori:3`, `vinci`, `norosse`, …) con testi in `requisito()`/`breve()`. A fine Era il telefono
  chiede solo le domande sì/no che servono (`domande()`), sempre **tutti** gli obblighi, anche dei traditori, così le domande non svelano niente.
- **Privacy:** lo schermo condiviso usa solo `SS.vistaPubblica(S)`; le prove controllano che non cambi con voti, Sigilli, intenzioni, scommesse
  e poteri. La cabina passa di mano con una schermata neutra che si apre tenendo premuto; le schermate riservate si coprono con
  `visibilitychange`. Una scheda sigillata non si annulla; le azioni pubbliche sì. Lo Scrutinio guardato resta usato anche se si copre la cabina
  (`P.ui.scrut`).
- **Parametri di base diversi dalla proposta** (spiegati nel capitolo «Scelte di bilanciamento» del regolamento e in
  `prove/societa.bilanciamento.js`): Patto +4/+4, tradito −1 (con i numeri originali Δ = 1 − c non dipendeva dalla fiducia nel partner),
  obblighi da 2 carte, Agente Libero +1 con 3 colori, scommesse senza moneta (pagarla in pubblico svelava chi scommetteva), decreti da 2 carte e
  Tregua Sacra, società che non dipendono da moduli spenti (Velo solo con le scommesse). Preset in `SS.PRESET` (Consigliata, Numeri della
  proposta, Alta posta).
- **Fine partita:** «Porta i punti nel conteggio di 7 Wonders» somma i punti nella riga Extra di `giochidisimo:7wonders` (aggiunge i nomi
  mancanti, accende Extra) e segna 7 Wonders come usato in `gds-ultimo-uso`, se no `pulizia.js` cancellerebbe subito i punti scritti.
- **Prove:** `node prove/societa.test.js` (generazione, fasi, validazioni, elezione, matrice dei Patti, poteri, missioni, privacy, annullamenti,
  5.000 partite casuali); nel browser `prove/societa.pagina.test.js` (serve `python3 -m http.server 8765`). Se cambi una regola aggiungi un caso.
- Il regolamento sta in `htmlRegole()` (12 capitoli): se cambi una meccanica o un parametro, aggiornalo lì.

### ALIBI → `giochi/alibi/`

Gioco investigativo nato da un dossier di progetto di Simo (scritto con un'altra IA, «progetto sospeso»); direzione artistica e
regole lasciate a Claude. Tema «giallo di notte»: grafite fredda (`#0D0F12`, piani `#15181D`/`#1C2026`), giallo evidenziatore
`#F2D21B` come unico accento, rosso `#D2453A` solo per la scena del delitto e i timbri, pianta disegnata col gesso; font Playfair
Display (titoli in corsivo), Courier Prime (fascicoli e verbali) e Figtree solo in questa pagina.
- **Idea:** il caso non si scrive, si **simula**. Un luogo (pianta con stanze e porte); le posizioni di tutti all'ora del delitto, poi
  passeggiate a caso all'indietro e in avanti (si resta o si passa una porta per quarto d'ora); nella scena, all'ora del delitto, solo il
  colpevole. Le dichiarazioni dicono dov'era ognuno e, se se lo ricorda, chi c'era (i verbali pubblici ricordano meno: `memoriaPub`).
- **Due modi, due modi di nascondere la verità:**
  - `traditore`: i sospettati sono i giocatori; il colpevole mente a voce come vuole, gli innocenti dicono il vero; il personale ha
    verbali pubblici veri. Il caso regge **qualunque bugia**: ogni innocente è scagionato da un testimone che non è né lui né il
    colpevole (G2). La «trappola» G1 (alibi smentibile direttamente) c'è solo in circa un caso su quattro: negli altri si arriva per
    eliminazione, e il regolamento lo dice. Il fascicolo del colpevole suggerisce le stanze dichiarabili senza smentirsi (`alibi`).
  - `coop`: i sospettati sono personaggi con un verbale pubblico **vero ma con dei rifiuti** («si rifiuta di rispondere», `vuoti`);
    all'ora del delitto tacciono il colpevole e altri `rifiuti` sospettati. Nessuno mente. (Una prima versione con un sospettato
    bugiardo era sbagliata: siccome mentiva solo il colpevole, qualunque contraddizione lo indicava subito.)
- **`motore.js`** (in `extra`, `self.AL`): `genera({ codice, nomi, livello, modo, luogo })` è **deterministico** (seme da `VERSIONE` e
  parametri, mulberry32): lo stesso link dà lo stesso caso su ogni telefono, senza rete. `candidati(caso, dich, disponibili)` rifà il
  ragionamento completo («se il colpevole fosse i, tutto torna?»; nel modo traditore non ci si fida di i). Un caso si accetta se:
  - ha una spiegazione semplice per ogni innocente (`spiega`: `dice`, `con`, `prima`, `dopo`);
  - i soli verbali pubblici non bastano (`candidati(pubblici)` ≥ 2);
  - a Medio e Difficile nessun giocatore ci arriva da solo col suo fascicolo: nel modo traditore solo da 5 giocatori (con 2 o 3
    innocenti è impossibile insieme alle ragioni semplici: dimostrazione nel commento in `tentativo`), nel coop con almeno 2 giocatori;
  - nel traditore: qualche innocente non l'ha visto nessuno all'ora del delitto (`soli`) e il colpevole ha almeno una stanza alibi;
  - nel coop: con tutto quello che si sa il colpevole è uno solo.
  **Se cambi la generazione, alza `VERSIONE`**: va nel link (`v=`), e un telefono con un'altra versione avvisa invece di aprire un caso
  diverso.
- **Luoghi** in `LUOGHI` (Villa Ardenza, Teatro Politeama, Espresso del Brennero, Museo Civico): stanze come rettangoli 300×210 (la pagina le
  disegna), `porte` solo tra stanze con un muro in comune (nel treno carrozze in fila), `in` con la preposizione, sigle di due lettere per il
  taccuino. Per aggiungere un luogo: stanze, porte, sigle, personale, sospettati e delitti, poi `node prove/alibi.test.js`.
- **Pagina:** un telefono che gira (consegna dei fascicoli tenendo premuto, rilettura dal tasto «Fascicoli», fascicolo che si chiude se il
  telefono si blocca o dopo 3 minuti) oppure **ognuno col suo**: il link `#c=…&l=…&m=…&u=…&v=…&n=Nome|Nome` (con `URLSearchParams`)
  rigenera il caso; chi lo apre sceglie chi è (`io`). Il link si toglie dalla barra dopo la lettura. Il caso intero si salva in
  `P.caso`; la costruzione mostra «Ricostruisco la serata…». Taccuino per telefono (`tac`), accusa unica tenendo premuto (a maggioranza,
  dice il regolamento), soluzione ragionata (`AL.soluzione`), ricostruzione completa e passi del colpevole sulla pianta.
- **Prove:** `node prove/alibi.test.js` (parametri, codici, determinismo, salvataggio, `candidati` contro una **forza bruta** sui percorsi,
  bugie a caso del colpevole, 3.000 casi con tutte le garanzie e la spiegazione controllata frase per frase; circa 3 minuti); nel browser
  `prove/alibi.pagina.test.js` (serve `python3 -m http.server 8765`; nomi con accenti, apostrofi, `+` e `#` nel link, avviso di versione).
- Il regolamento sta in `htmlRegole()`: se cambi una regola o un livello, aggiornalo lì.

### MENTAL → `giochi/mental/`

La sfida del giorno, da un progetto scritto con un'altra IA («MENTAL», report di Simo) adattato: **niente server e
niente classifica** (scelta di Simo: gli basta salvarsi tempi e giorni completati e confrontarsi a mano). Ogni giorno
(giorno di Roma, cambio a mezzanotte italiana anche con l'ora legale) c'è **una sola sfida, uguale per tutti**, già
preparata e controllata; la #1 è il 22 ottobre 2026 (`LANCIO`). **Simo vuole varietà**: i giochi del progetto erano solo
idee, va bene qualunque cosa dove bisogna pensare (rompicapi, enigmi, indovinelli, problemi…), e lo stesso tipo deve
tornare di rado. Tema «notte d'inchiostro»: indaco `#0D0F22` (piani `#15183A`/`#1C2048`), menta `#3DDCA0` per azioni e
sfide risolte, lavanda `#B2A7FF` per note e selezioni, ambra `#F2B84B` per il tempo, corallo `#FF6B6B` solo per errori e
mine; font Bricolage Grotesque e Figtree.
- **File:**
  - `comune.js` (`self.MENTAL`): date di Roma (`giornoRoma`, `prossimaMezzanotte`, `numero`), `prng` riproducibile,
    livelli, **palinsesto** (`scegliDelGiorno`, `tipoSfida`, `famigliaSfida`, `MINIMO`), titoli (`TITOLI`, per tipo),
    `quadratoLatino`.
  - `motori/<gioco>.js`: un motore per gioco, senza pagina, stessa interfaccia: `id`, `nome`, `tipo` (come si disegna:
    `segni`, `binario`, `cifre`, `campo`, `nonogramma`, `testo`, `risposta`, `codice`, `calcolatrice`, `travasi`,
    `flotta`, `tende`, `luci`, `ponti`),
    `famiglia`, `TECNICHE` (con `peso`), `MISURE`, `breve`, `regole`, `nuovoStato`, `conflitti`, `completo`,
    `statoRisolto`, `conta(p, cap)` (ricerca **completa**, con `conta.ultima`), `risolvi(p)` (risolutore «umano»: solo
    tecniche dichiarate, mai tentativi; `{ risolto, sol, passi, conteggio }`), `livello(p, ris)`,
    `genera(r, livello, tentativi, seme)`, `valida(p)`. Facoltativi: `tipoDi`, `famigliaDi`, `nomeDi`, `breveDi` (un
    motore con più tipi) e, per le sfide che si consegnano, `giusta`, `vuota`, `soluzione`, `testoHTML`, `figura`, `forma`.
    Giochi: `corone` (Queens), `stelle` (Star Battle a due stelle), `binario` (Takuzu), `sudoku`, `campo` (prato fiorito
    senza fortuna: le mine sono scritte mescolate col seme, solo per non leggerle per sbaglio), `grattacieli`,
    `futoshiki`, `nonogramma`, `cavalieri` («Sinceri e bugiardi»), `codice` (tipi `codice:lucchetto`, cifre tutte
    diverse e risposte a parole, e `codice:colori`, alla Mastermind; ogni tentativo serve), `linea` («In fila»: ordinare
    da indizi; ogni indizio serve), `bilancia` («La moneta falsa» da pesate già fatte; ogni pesata serve),
    `calcolatrice` («La calcolatrice rotta»: minimo di mosse, al massimo 2–3 strade minime), `travasi` (brocche senza
    tacche: minimo di mosse), `enigma` (gli enigmi del catalogo, tipi `enigma:<categoria>`), `gabbie` (alla KenKen:
    quadrato latino con le gabbie e i loro conti), `kakuro` («Somme»; nero `nere: [[i, giù, destra]]`), `flotta`
    (battaglia navale in solitario, con caselle già scoperte e la loro forma), `tende` (il campeggio: una tenda per
    albero), `luci` (alla Akari), `ponti` (alla Hashiwokakero), `logigramma` («Chi è chi»: tabella persone × categorie,
    indizi sì/no e, con le case in fila, accanto/più a sinistra/subito a sinistra), `criptaritmo` (somma di parole
    italiane in lettere; si risponde col valore della parola del risultato). Nei criptaritmi i casi da provare fanno
    parte del gioco: il livello conta le ipotesi del risolutore, con un tetto di 25.
  - `viste.js`: i tipi che non sono griglie (`VISTE.risposta`, con le forme `numero`, `frazione`, `parola`, `parole`,
    `ordine`, `moneta`, `tabella`; `codice`, `calcolatrice`, `travasi`: `disegna`, `strumenti`, `esito`).
    `viste-griglie.js`: `VISTE.flotta`, `tende`, `luci`, `ponti` (con `griglia: true`: nell'esito la soluzione si disegna
    con `disegna`). Tocco: vuota → pezzo → segno → vuota; trascinando si mette il segno. Nei ponti si tocca un'isola e poi
    l'altra (o direttamente il ponte): 1, 2, nessuno. Le altre griglie le disegna `disegnaGioco` in `index.html`
    (`gabbie` e `kakuro` dentro `tavCifre`, che per il kakuro usa `E.gruppiDi` per note ed evidenziazioni).
  - `strumenti/mental-enigmi.js`: il **catalogo degli enigmi scritti a mano** (regole in cima al file). Campi: `id`
    (unico, non si cambia), `cat` (vedi `CATEGORIE` in `motori/enigma.js`: indovinello, sciarada, anagramma, cifrario,
    problema, probabilita, contare, geometria, logica, strategia), `livello`, `titolo`, `forma` (`numero`, `frazione`,
    `parola`, `parole`, `ordine`, `scelta`), `testo`, `risposta`, `accetta`, `spiegazione` e `verifica` (funzione che
    ricalcola la risposta da zero) oppure, per i giochi di parole, `controllo` (perché la risposta è unica). Ogni voce
    va in calendario **una volta sola**; nei file delle sfide la soluzione è mescolata (`ve`), non si legge a occhio.
  - `strumenti/mental-riserva.json`: sfide generate e già controllate, tenute da parte; lo strumento le usa prima di
    generarne di nuove.
  - `sfide/AAAA-MM.js` (`MENTAL.mese('AAAA-MM', [sfide])`) e `sfide/indice.js` (`self.MENTAL_INDICE`: mesi, primo, ultimo).
    Una sfida: `{ data, n, gioco, livello, titolo, tecniche, p }`. **Non si modificano a mano.**
  - `index.html`: oggi (con conto alla rovescia), partita, esito (tempo, condividi senza spoiler, soluzione, «le chiavi»
    cioè le tecniche che servivano, passi del ragionamento per Sinceri e bugiardi), calendario, «I miei tempi» (per tipo).
    Indirizzi: `#gioca=AAAA-MM-GG`, `#prova=…` (allenamento), `#esito=…`, `#calendario=AAAA-MM`, `#tempi`.
- **Regole della pagina:** il tempo parte con «Inizia» e **non si ferma** (orologio vero: `inizio` nello storico);
  conta il **primo tentativo** di ogni giorno, poi si rigioca per allenamento senza cambiare il tempo; un giorno passato
  si recupera dal calendario e vale come «recuperata» (`giornata: false`); finita dopo mezzanotte vale come «dopo
  mezzanotte». Nelle sfide che si consegnano (enigmi, codici, in fila, moneta falsa, chi è chi, criptaritmi, Sinceri e bugiardi) ogni consegna
  sbagliata aggiunge un minuto. Mina = persa; «Mi arrendo» (tenendo premuto) = non risolta. Niente sfide future nel
  calendario; un giorno senza sfida pronta mostra un avviso, mai una sfida inventata. La serie conta i giorni di fila
  risolti il giorno stesso. Lo storico salva anche `nome` e `firma` (impronta della sfida): una partita a metà di una
  sfida che nel frattempo è cambiata riparte pulita.
- **Palinsesto** (`scegliDelGiorno` in `comune.js`; le prove lo ricontrollano dal 24 ottobre 2026, perché i primi due
  giorni sono usciti col palinsesto vecchio): ogni sfida ha un **tipo** (il gioco, oppure `codice:…` o `enigma:…`) e una
  **famiglia** (griglia, cifre, logica, numeri, parole, figure). Mai la stessa famiglia due giorni di fila; lo stesso
  tipo mai prima di `MINIMO` (6) giorni e in generale il più tardi possibile; domenica estrema, sabato esperta o
  estrema, in settimana metà impegnativa e metà esperta.
- **Sfide nuove** → `strumenti/mental.js`:
  ```
  node strumenti/mental.js --scorta 60     # sfide fino a oggi + 60 giorni (se ci sono già, non fa niente)
  node strumenti/mental.js --rimescola     # rifà i giorni dopo oggi e mescola tutto (vedi sotto)
  node strumenti/mental.js --controlla     # ricontrolla da zero le sfide pubblicate e il catalogo
  ```
  `--scorta` aggiunge solo giorni **dopo l'ultimo** (una sfida pubblicata non cambia mai): per ogni giorno il palinsesto
  sceglie tra le categorie del catalogo con enigmi non ancora usati e i giochi generati (prima dalla riserva, poi con un
  seme fatto dalla data: chiunque lo lanci ottiene le stesse sfide). Scrive solo se ogni sfida passa i controlli: dati
  validi, soluzione unica (ricerca completa) o minimo di mosse verificato, risolta dal risolutore umano con la stessa
  soluzione, livello giusto; per gli enigmi la loro verifica.
  `--rimescola` cambia solo i giorni **dopo oggi** (o dopo `--dopo AAAA-MM-GG`; i giorni futuri non si vedono nel
  calendario, quindi nessuno li ha giocati): tiene le sfide già pronte (al massimo 4 per tipo generato, le altre vanno in
  riserva), aggiunge gli enigmi del catalogo non usati e 4 sfide per ogni gioco che non c'era, genera le estreme che
  mancano per le domeniche e rimette tutto in calendario col palinsesto; si ferma quando le regole non si possono più
  rispettare (il resto lo prepara `--scorta`). Va lanciato quando si aggiunge un gioco o tanti enigmi.
  Simo ha in mente un'**azione programmata** che lo lancia ogni settimana; il testo da darle è:
  > Lavora sulla repo corrsimone1-maker/giochidisimo seguendo CLAUDE.md (sezione MENTAL). 1) Scrivi da 3 a 5 enigmi
  > nuovi in `strumenti/mental-enigmi.js`, originali e diversi da quelli che ci sono, seguendo le regole in cima al file
  > (una sola risposta giusta; `verifica` che la ricalcola da zero quando si può); non cambiare le voci esistenti.
  > 2) Lancia `node strumenti/mental.js --scorta 60`. 3) Lancia `node prove/mental.test.js`: se passa, fai commit
  > («MENTAL: enigmi nuovi e sfide fino al <ultimo giorno>») e push su main e aspetta che la pubblicazione finisca.
  > Non modificare le sfide già pubblicate, i motori o la pagina. Se qualcosa fallisce non fare push e scrivi cosa è successo.
- **Gioco nuovo:** motore in `motori/` con la stessa interfaccia (e la sua `famiglia`), titoli in `TITOLI`, nome
  nell'elenco `GIOCHI` di `strumenti/mental.js`, script in `index.html` e in `extra` di `giochi.js`, un disegno (in
  `disegnaGioco` per le griglie, in `viste.js` per il resto), un caso con forza bruta in `prove/mental.test.js`, poi
  `--rimescola`. **Enigma nuovo:** una voce nel catalogo e `node prove/mental.test.js`; entra in calendario con la
  prossima `--scorta` (o subito con `--rimescola`). Le stime alla Fermi del progetto originale non ci sono: servono dati
  veri con fonti e un controllo che non si può automatizzare con la stessa sicurezza.
- **Prove:** `node prove/mental.test.js` (date e ora legale, ogni motore contro una forza bruta o una ricerca
  indipendente, il prato fiorito passo per passo, il catalogo con le sue verifiche e le risposte lette all'italiana,
  palinsesto su due anni, tutte le sfide pubblicate e la riserva, lo strumento in una cartella temporanea anche col
  rimescolamento; circa 2 minuti); nel browser `prove/mental.pagina.test.js` (serve `python3 -m http.server 8765`; orologio
  del browser spostato: lancio, ricaricamento, ogni tipo di sfida finito dall'interfaccia, consegne sbagliate, mina,
  resa, calendario, mezzanotte a partita aperta).

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

### Claude Machine → `giochi/machine/`

Gioco di deduzione ispirato a Turing Machine, nome scelto da Simo. Tema «officina di notte»: grafite calda (`#191613`,
piani `#221E1A`/`#2B2621`), un solo accento arancione Claude `#D97757`, niente superfici chiare (Simo non vuole il bianco),
font Bricolage Grotesque e Figtree. Codice segreto di tre cifre da 1 a 5: blu ▲, giallo ■, viola ●.
- **Plancia** (Simo la vuole leggera per gli occhi, poche informazioni a schermo): in alto il codice di prova, con gli appunti
  sulla stessa griglia (selettore Prova/Appunti); poi i verificatori, ognuno con le sue regole (si barrano toccandole) e i
  codici già provati su di lui; in fondo il registro per round, chiuso. Round, domande del round (tre pallini) e pulsanti
  stanno nella barra fissa in basso (`barra()`). Niente spiegazioni a fine partita: solo codice e statistiche.
- **`motore.js`** (in `extra`): carte, generatore, regole del round, senza pagina (`self.CM`, o `require` da node).
  - Carta = criterio con le sue regole; `tipo` `classico` o `malato`; due carte dello stesso `gruppo` non stanno mai nello
    stesso puzzle (dicono quasi la stessa cosa, per esempio «somma multipla di 3» e «numero multiplo di 3»). Gli `id` finiscono
    nelle stanze: non si cambiano. Nei testi `{b}` `{g}` `{v}` diventano le forme colorate.
  - Puzzle `{ v: 1, livello, ver: [{ carte: [id] | [id, id], vera }], codice }`; `vera` indicizza le regole delle carte del
    verificatore, in ordine. Garanzie controllate da `genera()` e `controlla()`: (U) codice unico, (N) nessun verificatore
    inutile, (D) dalle sole carte restano almeno 2 codici (serve almeno una domanda).
  - `LIVELLI`: Medio 4 verificatori classici; Difficile 5 con 2–3 carte malate; Insano 6 verificatori con **due carte** ciascuno
    (la regola vera viene da una sola) e 7–12 carte malate. `candidati` = quanti codici restano ragionando solo sulle carte
    (Medio 2–6, Difficile 4–12, Insano 8–40): è la manopola della difficoltà.
  - Per aggiungere una carta: `aggiungi(...)` nel blocco giusto, poi `node prove/machine.test.js`, che ricontrolla tutto da zero.
- **Modalità** (`S.loc`, `S.vs`, `S.st` nella pagina):
  - collaborativa con un telefono (anche da soli): una dichiarazione sbagliata perde la partita;
  - versus con un telefono che gira in senso antiorario: schede private aperte tenendo premuto, che si richiudono se il telefono
    si blocca; le dichiarazioni si scoprono a fine round con `CM.fineRound` (meno domande vince, chi sbaglia è eliminato, l'ultimo
    rimasto vince);
  - stanze (ognuno col suo): collaborativa con nastro unico di squadra; versus in contemporanea, il round si chiude quando tutti
    hanno finito. Lo stato del versus si ricava da quello di tutti (`statoVersus`), uguale su ogni telefono.
- **Stanze** su tre broker MQTT pubblici (gli stessi del poker), topic `claude-machine/v1/<C>/meta` (scritto una volta da chi
  crea: modo, livello, puzzle, host, t) e `claude-machine/v1/<C>/g/<pid>` (stato di ogni giocatore, scritto solo dal suo
  telefono, con `n` crescente). MQTT 5 con `messageExpiryInterval`: 12 ore la stanza, 24 la lapide; se un server rifiuta la
  versione 5 si ricollega in 3.1.1 e lì vale solo la scadenza controllata dall'app.
  - **Chiudi e cancella** (tenendo premuto, per chiunque nella stanza): lapide `{ chiusa, t, prossima? }` sul meta e messaggio
    vuoto su ogni giocatore, su tutti i server. Chi la riceve svuota il suo topic ed esce. Un telefono scrive il suo stato solo
    dopo aver visto il meta aperto, quindi una stanza chiusa non si riapre; chi l'ha creata la riscrive su un server che l'ha
    persa solo nei primi 2 minuti o se un altro server la mostra ancora aperta.
  - «Nuova partita» a fine partita (solo chi ha creato la stanza): crea una stanza nuova e chiude la vecchia con `prossima`, così
    gli altri telefoni passano da soli alla nuova.
  - Le stanze di questo telefono stanno in `gds-machine-stanze` (con `pid`, per rientrare come prima); in Impostazioni si
    rientra o si cancellano tenendo premuto; quelle con più di 12 ore si cancellano da sole all'apertura della pagina.
- **Prove:** `node prove/machine.test.js` (carte, puzzle ricontrollati da zero, `fineRound`); nel browser
  `prove/machine.stanze.test.js` (serve `python3 -m http.server 8765`; broker finti in node, un contesto per telefono;
  con `SCATTI=cartella` salva gli screenshot). Se cambi stanze, round o chiusura, aggiungi un caso.
- Il regolamento sta in `htmlRegole()`: se cambi una meccanica, aggiornalo lì.

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
