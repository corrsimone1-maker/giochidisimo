/* =====================================================================
   PACCHETTI DI PAROLE DI IMPOSTORE
   Si modificano solo qui: chi apre l'app vede subito la versione nuova.
   Ogni pacchetto si attiva o disattiva dalle Impostazioni dell'app.

   { id, nome, descrizione, attivo (acceso di base?), categorie: {
       'Nome categoria': ['parola', 'parola', ...]
   } }

   La categoria è quella che vede l'impostore se è acceso l'indizio.
   Per aggiungere parole basta scriverle nella lista giusta; per un
   pacchetto nuovo si copia un blocco { ... } e si cambia id e nome.
   ===================================================================== */
self.PACCHETTI = [
  {
    id: 'standard', nome: 'Standard', descrizione: 'Le parole classiche: cibo, luoghi, oggetti, animali…', attivo: true,
    categorie: {
      'Cibo': ['pizza', 'carbonara', 'lasagne', 'tiramisù', 'gelato', 'sushi', 'kebab', 'cornetto', 'risotto', 'polenta',
        'cannolo', 'gnocchi', 'parmigiana', 'bruschetta', 'mozzarella', 'nutella', 'popcorn', 'hamburger', 'patatine fritte', 'frittata',
        'minestrone', 'panettone', 'piadina', 'insalata', 'uovo', 'pesto', 'arancino', 'hot dog', 'brioche', 'cotoletta'],
      'Frutta e verdura': ['mela', 'banana', 'anguria', 'fragola', 'ananas', 'limone', 'arancia', 'ciliegia', 'cocco', 'avocado',
        'carota', 'pomodoro', 'patata', 'cipolla', 'aglio', 'peperoncino', 'zucchina', 'melanzana', 'fungo', 'castagna'],
      'Bevande': ['caffè', 'cappuccino', 'tè', 'birra', 'vino', 'spritz', 'acqua frizzante', 'coca-cola', 'succo di frutta', 'latte',
        'cioccolata calda', 'limoncello', 'mojito', 'grappa', 'frullato'],
      'Animali': ['gatto', 'cane', 'giraffa', 'pinguino', 'elefante', 'delfino', 'squalo', 'aquila', 'serpente', 'coccodrillo',
        'canguro', 'koala', 'panda', 'lupo', 'volpe', 'gufo', 'ape', 'formica', 'farfalla', 'polpo',
        'cavallo', 'mucca', 'pecora', 'maiale', 'tartaruga', 'riccio', 'scoiattolo', 'pappagallo', 'cammello', 'leone'],
      'Luoghi': ['spiaggia', 'ospedale', 'aeroporto', 'biblioteca', 'discoteca', 'palestra', 'cinema', 'museo', 'stazione', 'supermercato',
        'chiesa', 'stadio', 'montagna', 'campeggio', 'ristorante', 'scuola', 'università', 'prigione', 'zoo', 'circo',
        'farmacia', 'banca', 'parrucchiere', 'metropolitana', 'castello', 'deserto', 'isola', 'bosco', 'piscina', 'luna park'],
      'Casa': ['divano', 'letto', 'frigorifero', 'lavatrice', 'forno', 'doccia', 'vasca da bagno', 'specchio', 'armadio', 'tappeto',
        'balcone', 'ascensore', 'scale', 'finestra', 'campanello', 'lampadario', 'termosifone', 'televisore', 'comodino', 'cuscino'],
      'Oggetti': ['ombrello', 'forbici', 'orologio', 'candela', 'chiave', 'zaino', 'occhiali', 'telecomando', 'pentola', 'valigia',
        'martello', 'lampada', 'sedia', 'tazza', 'spazzolino', 'caricabatterie', 'portafoglio', 'accendino', 'bussola', 'aspirapolvere',
        'termometro', 'cerotto', 'matita', 'colla', 'calcolatrice'],
      'Vestiti e accessori': ['cappello', 'calzino', 'sciarpa', 'guanti', 'cravatta', 'felpa', 'jeans', 'gonna', 'pigiama', 'costume da bagno',
        'ciabatte', 'stivali', 'scarpe da ginnastica', 'giacca', 'cintura', 'orecchini', 'collana', 'anello', 'borsa', 'papillon'],
      'Mestieri': ['medico', 'pompiere', 'cuoco', 'pilota', 'idraulico', 'maestro', 'poliziotto', 'astronauta', 'giardiniere', 'barista',
        'dentista', 'avvocato', 'fotografo', 'pescatore', 'sarto', 'muratore', 'postino', 'cassiere', 'veterinario', 'architetto',
        'giornalista', 'attore', 'cantante', 'farmacista', 'elettricista', 'panettiere', 'tassista', 'infermiere', 'ingegnere', 'bibliotecario'],
      'Sport': ['calcio', 'tennis', 'nuoto', 'sci', 'pallavolo', 'basket', 'rugby', 'golf', 'boxe', 'ciclismo',
        'surf', 'judo', 'scherma', 'pattinaggio', 'arrampicata', 'maratona', 'padel', 'equitazione', 'canottaggio', 'karate',
        'Formula 1', 'pallanuoto', 'atletica', 'yoga', 'snowboard'],
      'Giochi e svaghi': ['scacchi', 'poker', 'briscola', 'tresette', 'scopa', 'ping pong', 'bowling', 'biliardo', 'freccette', 'monopoli',
        'nascondino', 'puzzle', 'cruciverba', 'karaoke', 'videogiochi', 'tombola', 'Uno', 'sudoku', 'Risiko', 'calcio balilla'],
      'Mezzi di trasporto': ['bicicletta', 'monopattino', 'motorino', 'autobus', 'tram', 'treno', 'aereo', 'elicottero', 'nave', 'gommone',
        'sottomarino', 'razzo', 'taxi', 'ambulanza', 'camion', 'trattore', 'funivia', 'mongolfiera'],
      'Natura e meteo': ['arcobaleno', 'temporale', 'fulmine', 'neve', 'nebbia', 'vulcano', 'terremoto', 'tsunami', 'cascata', 'ghiacciaio',
        'tramonto', 'luna', 'sole', 'stella cadente', 'eclissi', 'tornado', 'grandine', 'onda', 'sabbia', 'cactus'],
      'Feste ed eventi': ['matrimonio', 'compleanno', 'Natale', 'Capodanno', 'Carnevale', 'Pasqua', 'Halloween', 'laurea', 'funerale', 'battesimo',
        'addio al celibato', 'festa a sorpresa', 'Ferragosto', 'sagra', 'concerto', 'picnic', 'gita scolastica', 'trasloco'],
      'Strumenti musicali': ['chitarra', 'pianoforte', 'batteria', 'violino', 'tromba', 'sassofono', 'flauto', 'arpa', 'fisarmonica', 'contrabbasso',
        'tamburello', 'xilofono', 'armonica', 'ukulele', 'organo'],
      'Corpo': ['naso', 'orecchio', 'gomito', 'ginocchio', 'unghia', 'sopracciglio', 'ombelico', 'mento', 'caviglia', 'polso',
        'lingua', 'dente', 'capelli', 'barba', 'lentiggini'],
      'Città nel mondo': ['Parigi', 'Londra', 'New York', 'Tokyo', 'Venezia', 'Napoli', 'Milano', 'Firenze', 'Barcellona', 'Amsterdam',
        'Berlino', 'Las Vegas', 'Dubai', 'Rio de Janeiro', 'Il Cairo', 'Atene', 'Istanbul', 'Sydney', 'Pechino', 'Los Angeles'],
      'Tecnologia': ['smartphone', 'computer', 'WhatsApp', 'Instagram', 'TikTok', 'Netflix', 'YouTube', 'Wi-Fi', 'password', 'selfie',
        'emoji', 'cuffie', 'drone', 'robot', 'intelligenza artificiale']
    }
  },
  {
    id: 'roma', nome: 'Roma', descrizione: 'Posti, cibo e cose che conosce solo chi ci vive', attivo: false,
    categorie: {
      'Luoghi di Roma': ['Colosseo', 'Trastevere', 'Fontana di Trevi', 'Pantheon', 'Testaccio', 'Gianicolo', 'Circo Massimo', "Campo de' Fiori", 'Piazza Navona', 'San Pietro',
        'Villa Borghese', 'Ostia', 'Garbatella', 'Termini', 'Grande Raccordo Anulare', 'Bocca della Verità', "Castel Sant'Angelo", 'Pigneto', 'EUR', 'Ponte Milvio',
        'Altare della Patria', 'Piramide', 'Tevere', 'Trinità dei Monti', 'Fori Imperiali', 'Stadio Olimpico', 'Curva Sud'],
      'Romanità': ['supplì', 'maritozzo', 'porchetta', 'cacio e pepe', 'amatriciana', 'gricia', 'carciofi alla giudia', 'coda alla vaccinara', 'saltimbocca', 'pinsa',
        'nasone', 'sampietrini', 'Vespa', 'ATAC', 'derby', 'Roma Tre', 'La Sapienza', 'Tor Vergata', 'grattachecca', 'fraschetta']
    }
  },
  {
    id: 'matematica', nome: 'Matematica', descrizione: 'Concetti, matematici famosi e vita da dipartimento', attivo: false,
    categorie: {
      'Concetti matematici': ['integrale', 'derivata', 'matrice', 'determinante', 'autovalore', 'vettore', 'gradiente', 'limite', 'serie', 'successione',
        'polinomio', 'logaritmo', 'esponenziale', 'numero primo', 'pi greco', 'numero di Nepero', 'unità immaginaria', 'infinito', 'insieme vuoto', 'funzione',
        'equazione differenziale', 'gruppo', 'ideale', 'campo', 'spazio vettoriale', 'topologia', 'varietà', 'omeomorfismo', 'isomorfismo', 'frattale',
        'caos', 'attrattore', 'toro', 'nastro di Möbius', 'bottiglia di Klein', 'trasformata di Fourier', 'probabilità', 'gaussiana', 'teorema', 'lemma',
        'corollario', 'congettura', 'assioma', 'dimostrazione per assurdo', 'induzione', 'grafo', 'radice quadrata', 'triangolo', 'cerchio', 'frazione'],
      'Matematici': ['Pitagora', 'Euclide', 'Archimede', 'Fibonacci', 'Cartesio', 'Fermat', 'Pascal', 'Newton', 'Leibniz', 'Eulero',
        'Lagrange', 'Laplace', 'Gauss', 'Cauchy', 'Galois', 'Riemann', 'Hamilton', 'Cantor', 'Poincaré', 'Hilbert',
        'Peano', 'Volterra', 'Levi-Civita', 'Noether', 'Gödel', 'Turing', 'Kolmogorov', 'Nash', 'Ramanujan', 'Perelman',
        'Tartaglia', 'Cardano'],
      'Vita da matematico': ['lavagna', 'gesso', 'esame orale', 'appello', 'esercitazione', 'ricevimento', 'tesi', 'relatore', 'seminario', 'LaTeX',
        'arXiv', 'dottorato', 'borsa di studio', 'lasciato al lettore', 'banale', 'quindi segue', 'macchinetta del caffè', 'aula studio', 'tutorato', 'compito scritto']
    }
  },
  {
    id: 'musica', nome: 'Musica', descrizione: 'Cantanti, gruppi e canzoni dai nomi riconoscibili', attivo: false,
    categorie: {
      'Cantanti italiani': ['Vasco Rossi', 'Laura Pausini', 'Måneskin', 'Lucio Dalla', 'Fabrizio De André', 'Mina', 'Adriano Celentano', 'Lucio Battisti', 'Franco Battiato', 'Rino Gaetano',
        'Pino Daniele', 'Antonello Venditti', 'Gianni Morandi', 'Zucchero', 'Eros Ramazzotti', 'Tiziano Ferro', 'Jovanotti', 'Cesare Cremonini', 'Max Pezzali', 'Elisa',
        'Giorgia', 'Marco Mengoni', 'Mahmood', 'Ultimo', 'Sfera Ebbasta', 'Geolier', 'Lazza', 'Marracash', 'Salmo', 'Tananai',
        'Annalisa', 'Elodie', 'Calcutta', 'Gazzelle', 'Fulminacci', 'Blanco', 'Angelina Mango', 'Achille Lauro', 'Gigi D’Alessio', 'Al Bano',
        'Domenico Modugno', 'Raffaella Carrà', 'Renato Zero', 'Franco Califano'],
      'Cantanti e gruppi stranieri': ['Michael Jackson', 'Madonna', 'Freddie Mercury', 'Beatles', 'Elvis Presley', 'Bob Marley', 'ABBA', 'Taylor Swift', 'Beyoncé', 'Rihanna',
        'Lady Gaga', 'Shakira', 'Eminem', 'Ed Sheeran', 'Adele', 'Bad Bunny', 'Daft Punk', 'Coldplay', 'Billie Eilish', 'Bruno Mars',
        'Dua Lipa', 'The Weeknd', 'Drake', 'Britney Spears', 'Pink Floyd', 'Nirvana'],
      'Canzoni': ['Volare', 'Azzurro', 'Bella ciao', 'Gloria', 'Despacito', 'Macarena', 'Gangnam Style', 'Bohemian Rhapsody', 'Thriller', 'Albachiara',
        'Vita spericolata', 'Felicità', "L'italiano", 'Grazie Roma', 'Roma capoccia', 'Zitti e buoni', 'Soldi', 'Brividi', 'Tuta gold', 'Nessun dorma',
        'Caruso', 'Con te partirò', 'Ti amo', "Hanno ucciso l'Uomo Ragno", 'La Bamba', 'YMCA', 'Waka Waka', 'Jingle Bells', 'Cuoricini', 'Il cielo in una stanza']
    }
  },
  {
    id: 'personaggi', nome: 'Personaggi', descrizione: 'Persone famose e personaggi di fantasia', attivo: false,
    categorie: {
      'Persone famose': ['Totti', 'Totò', 'Alberto Sordi', 'Carlo Verdone', 'Anna Magnani', 'Sophia Loren', 'Federico Fellini', 'Roberto Benigni', 'Checco Zalone', 'Leonardo da Vinci',
        'Michelangelo', 'Dante', 'Giulio Cesare', 'Nerone', 'Cleopatra', 'Napoleone', 'Garibaldi', 'Cristoforo Colombo', 'Galileo', 'Einstein',
        'Marilyn Monroe', 'Charlie Chaplin', 'Steve Jobs', 'Elon Musk', 'Maradona', 'Messi', 'Cristiano Ronaldo', 'Valentino Rossi', 'Jannik Sinner', 'Usain Bolt',
        'Michael Schumacher', 'Mike Bongiorno', 'Pippo Baudo', 'Fiorello', 'Maria De Filippi', 'Gerry Scotti', 'Piero Angela', 'Alberto Angela'],
      'Personaggi di fantasia': ['Pinocchio', 'Fantozzi', 'Harry Potter', 'Topolino', 'Paperino', 'Super Mario', 'Batman', 'Spider-Man', 'Sherlock Holmes', 'Dracula',
        'Babbo Natale', 'Befana', 'Biancaneve', 'Cenerentola', 'Peter Pan', 'Shrek', 'Homer Simpson', 'Pikachu', 'Darth Vader', 'Gandalf',
        'James Bond', 'Zorro', 'Frankenstein', 'Tarzan', 'Godzilla', 'Winnie the Pooh', 'Lupin', 'Goku', 'Barbie', 'Gollum']
    }
  },
  {
    id: 'meme', nome: 'Meme', descrizione: 'Meme di internet e meme nostri', attivo: false,
    categorie: {
      'Meme': ['aura', 'caracalla', 'sigma', 'skibidi', 'rizz', 'brainrot', 'NPC', 'Tralalero Tralala', 'Tung Tung Tung Sahur', 'Bombardiro Crocodilo',
        'Ballerina Cappuccina', 'six seven', 'Ohio', 'delulu', 'cringe', 'ok boomer', 'Rickroll', 'Nyan Cat', 'Doge', 'Stonks',
        'Gigachad', 'Grumpy Cat', 'Harambe', 'This is fine', 'fidanzato distratto', 'Hide the Pain Harold', 'mewing', 'slay']
    }
  }
];
