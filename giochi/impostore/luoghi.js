/* =====================================================================
   LUOGHI DI IMPOSTORE (variante «Luoghi»)
   Si modificano solo qui, come le parole.

   { cat: 'Categoria', gruppi: [ ['luogo', 'luogo', 'luogo'], ... ] }

   cat     è l'indizio che vede l'impostore nel modo «sa, con indizio»:
           deve dire che tipo di posto è senza svelarlo (ogni categoria
           ha almeno due gruppi).
   gruppi  luoghi SIMILI MA NON TROPPO: nel modo «non sa di esserlo»
           tutti hanno un luogo del gruppo e l'impostore un altro dello
           stesso gruppo. Due luoghi dello stesso gruppo devono reggere
           le stesse domande generiche («ci vai da solo?», «quanto ci
           resti?») ma dare risposte un po' diverse a quelle precise.
           Almeno due luoghi per gruppo.

   Nomi comuni minuscoli, nomi propri maiuscoli (come in parole.js).
   Dopo una modifica: node prove/impostore.test.js
   ===================================================================== */
self.LUOGHI = [
  { cat: 'Viaggi', gruppi: [
    ['aeroporto', 'stazione dei treni', 'porto'],
    ['aereo', 'treno notturno', 'nave da crociera'],
    ['autobus', 'metropolitana', 'tram'],
    ['autogrill', 'casello dell’autostrada', 'distributore di benzina']
  ] },
  { cat: 'In città', gruppi: [
    ['ospedale', 'clinica veterinaria', 'studio del dentista'],
    ['banca', 'ufficio postale', 'anagrafe del comune'],
    ['commissariato', 'tribunale', 'prigione'],
    ['farmacia', 'ottico', 'erboristeria'],
    ['chiesa', 'convento', 'cimitero']
  ] },
  { cat: 'Negozi', gruppi: [
    ['supermercato', 'mercato rionale', 'centro commerciale'],
    ['parrucchiere', 'centro estetico', 'studio di tatuaggi'],
    ['ferramenta', 'negozio di elettronica', 'negozio di mobili'],
    ['libreria', 'edicola', 'cartoleria']
  ] },
  { cat: 'Divertimento', gruppi: [
    ['cinema', 'teatro', 'circo'],
    ['discoteca', 'pub', 'festa in casa'],
    ['luna park', 'parco acquatico', 'zoo'],
    ['casinò', 'sala bingo', 'sala giochi'],
    ['escape room', 'bowling', 'karaoke']
  ] },
  { cat: 'Cultura e studio', gruppi: [
    ['museo', 'biblioteca', 'galleria d’arte'],
    ['asilo', 'liceo', 'università']
  ] },
  { cat: 'Lavoro', gruppi: [
    ['ufficio', 'call center', 'coworking'],
    ['cantiere', 'fabbrica', 'officina meccanica'],
    ['redazione di un giornale', 'studio televisivo', 'stazione radio']
  ] },
  { cat: 'Mangiare fuori', gruppi: [
    ['ristorante elegante', 'pizzeria', 'fast food'],
    ['bar', 'pasticceria', 'gelateria'],
    ['cucina di un ristorante', 'panificio di notte', 'catering di un matrimonio']
  ] },
  { cat: 'Sport', gruppi: [
    ['stadio di calcio', 'ippodromo', 'circuito di Formula 1'],
    ['palestra', 'piscina comunale', 'campo da tennis'],
    ['pista da sci', 'pista di pattinaggio', 'skatepark']
  ] },
  { cat: 'Natura', gruppi: [
    ['foresta', 'giungla', 'savana'],
    ['grotta', 'miniera', 'catacombe'],
    ['spiaggia', 'isola deserta', 'barca a vela'],
    ['vulcano', 'ghiacciaio', 'cima di una montagna']
  ] },
  { cat: 'Vacanze', gruppi: [
    ['albergo di lusso', 'ostello', 'bed and breakfast'],
    ['campeggio', 'villaggio turistico', 'rifugio di montagna'],
    ['agriturismo', 'fattoria', 'vigneto']
  ] },
  { cat: 'Feste', gruppi: [
    ['matrimonio', 'festa di laurea', 'prima comunione'],
    ['concerto allo stadio', 'festival musicale', 'sagra di paese'],
    ['veglione di Capodanno', 'cena di Natale in famiglia', 'festa di Halloween']
  ] },
  { cat: 'Avventura', gruppi: [
    ['sottomarino', 'stazione spaziale', 'base in Antartide'],
    ['castello medievale', 'accampamento di legionari romani', 'tempio egizio'],
    ['set di un film', 'backstage di un concerto', 'sfilata di moda'],
    ['base militare', 'ambasciata', 'quartier generale dei servizi segreti']
  ] },
  { cat: 'Situazioni', gruppi: [
    ['ascensore bloccato', 'sala d’attesa del medico', 'fila alle poste'],
    ['primo appuntamento', 'colloquio di lavoro', 'esame orale']
  ] },
  { cat: 'Roma', gruppi: [
    ['Colosseo', 'Basilica di San Pietro', 'Fontana di Trevi'],
    ['stazione Termini', 'Grande Raccordo Anulare', 'metro B all’ora di punta']
  ] }
];
