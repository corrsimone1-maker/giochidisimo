/* =====================================================================
   TRACCIA: le aree e le loro tavole. Le legge la pagina (self.TRACCIA_AREE).

   AREA  { id, nome, sigla, tipo, sup?, simbolo?, regola, tavole }
     id       non si cambia (progressi salvati)
     tipo     'regola' (una regola nuova sul piano), 'forma' (una superficie
              incollata, con i numeri) o 'segreto' (si apre con tutte le stelle;
              chi ha già risolto una sua tavola non lo perde quando arrivano stelle nuove)
     sigla    il numero romano dell'area: si può cambiare (non si salva)
     regola   il testo del tasto «Regola» (spoiler, si legge tenendo premuto)
   TAVOLA  vedi in cima a motore.js (w, h, sup, start, end, endDir, gaps, s, stella).
     L'id di una tavola non si cambia mai: è la chiave dei progressi.

   Ogni tavola con dei simboli deve avere UNA sola soluzione, oppure
   esattamente «stella» soluzioni diverse (2 o 3): trovarle tutte dà la stella.
   Le tavole senza simboli sono labirinti: va bene qualunque linea.
   Dopo ogni modifica:  node prove/traccia.test.js  (controlla tutto da zero).
   ===================================================================== */
self.TRACCIA_AREE = [
  { id: 'frecce', nome: 'Frecce', sigla: 'I', tipo: 'regola', simbolo: 'NE', regola: 'La linea divide la griglia in zone. In ogni zona le frecce si devono annullare: tante ↑ quante ↓ e tante → quante ←. Una freccia in diagonale vale due passi insieme: ↗ è una → più una ↑, quindi si annulla con una ↙ oppure con una ← e una ↓.',
    tavole: [
      { id: 'f1', w: 2, h: 2, sup: 'piano', start: [0, 2], end: [2, 0], endDir: 'up', gaps: [[0, 0, 0, 1], [1, 2, 2, 2]], s: { '0,0': 'N', '1,0': 'S', '0,1': 'E', '1,1': 'W' } },
      { id: 'f2', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [[0, 1, 0, 2], [1, 3, 2, 3]], s: { '2,0': 'N', '0,2': 'S', '2,2': 'E', '1,1': 'W', '1,2': 'E', '0,1': 'W' } },
      { id: 'f3', w: 3, h: 3, sup: 'piano', start: [0, 0], end: [3, 3], endDir: 'right', gaps: [[1, 0, 2, 0], [0, 2, 0, 3]], s: { '0,1': 'N', '0,2': 'N', '0,0': 'S', '1,1': 'S', '2,0': 'W', '2,1': 'E', '1,2': 'N', '1,0': 'S' } },
      { id: 'f4', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [[0, 1, 0, 2], [1, 3, 2, 3]], stella: 2, s: { '0,1': 'N', '1,2': 'S', '1,1': 'E', '0,2': 'W', '2,1': 'N', '2,0': 'S' } },
      { id: 'f5', w: 3, h: 3, sup: 'piano', start: [3, 3], end: [0, 0], endDir: 'up', gaps: [[3, 1, 3, 2], [2, 3, 1, 3]], s: { '1,1': 'NW', '1,2': 'SE', '2,2': 'N', '0,1': 'S', '2,1': 'W', '0,2': 'E' } },
      { id: 'f6', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [[0, 0, 0, 1], [2, 3, 3, 3]], s: { '2,1': 'NE', '0,1': 'S', '1,1': 'W', '1,0': 'N', '0,2': 'S', '2,2': 'E', '0,0': 'W' } },
      { id: 'f7', w: 3, h: 3, sup: 'piano', start: [0, 0], end: [3, 3], endDir: 'down', gaps: [[0, 2, 0, 1], [1, 0, 2, 0]], s: { '0,1': 'SW', '1,2': 'SE', '2,1': 'N', '1,1': 'N', '2,2': 'E', '1,0': 'W', '2,0': 'S', '0,0': 'N' } },
      { id: 'f8', w: 4, h: 4, sup: 'piano', start: [0, 4], end: [4, 0], endDir: 'up', gaps: [[0, 1, 0, 2], [2, 4, 3, 4], [2, 0, 3, 0]], s: { '0,0': 'NE', '2,3': 'NW', '0,2': 'S', '1,0': 'S', '2,0': 'SE', '0,1': 'W', '2,1': 'N', '1,2': 'E', '1,3': 'W', '1,1': 'N', '3,0': 'S' } }
    ] },
  { id: 'numeri', nome: 'Numeri', sigla: 'II', tipo: 'regola', simbolo: '3', regola: 'Ogni numero dice quante caselle ha la zona in cui si trova. Due numeri nella stessa zona devono quindi essere uguali.',
    tavole: [
      { id: 'n1', w: 2, h: 2, sup: 'piano', start: [0, 2], end: [2, 0], endDir: 'up', gaps: [[0, 0, 0, 1], [1, 2, 2, 2]], s: { '0,0': '1' } },
      { id: 'n2', w: 2, h: 2, sup: 'piano', start: [0, 2], end: [2, 0], endDir: 'up', gaps: [[0, 0, 0, 1], [1, 2, 2, 2]], s: { '0,0': '3' } },
      { id: 'n3', w: 3, h: 2, sup: 'piano', start: [0, 2], end: [3, 0], endDir: 'up', gaps: [[1, 0, 2, 0], [1, 2, 2, 2]], s: { '0,1': '2', '2,0': '4' } },
      { id: 'n4', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [[0, 1, 0, 2], [1, 3, 2, 3]], s: { '0,0': '4', '2,0': '3' } },
      { id: 'n5', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [], stella: 2, s: { '1,2': '2', '2,2': '4' } },
      { id: 'n6', w: 4, h: 3, sup: 'piano', start: [0, 3], end: [4, 0], endDir: 'up', gaps: [], s: { '0,0': '5', '1,2': '1' } },
      { id: 'n7', w: 4, h: 4, sup: 'piano', start: [0, 4], end: [4, 0], endDir: 'up', gaps: [[2, 0, 3, 0], [0, 1, 0, 2]], s: { '1,1': '8', '0,3': '8', '1,3': '7' } }
    ] },
  { id: 'lati', nome: 'Lati', sigla: 'III', tipo: 'regola', simbolo: 'sole', regola: 'Immagina di camminare sulla linea, dal cerchio all’uscita: i soli devono restare alla tua sinistra e le lune alla tua destra. Se partenza e uscita si scambiano, si scambiano anche sinistra e destra.',
    tavole: [
      { id: 'l1', w: 2, h: 2, sup: 'piano', start: [0, 2], end: [2, 0], endDir: 'up', gaps: [], s: { '0,0': 'luna', '1,1': 'luna', '0,1': 'sole' } },
      { id: 'l2', w: 2, h: 2, sup: 'piano', start: [2, 0], end: [0, 2], endDir: 'down', gaps: [], s: { '0,0': 'luna', '1,1': 'luna', '0,1': 'sole' } },
      { id: 'l3', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [[1, 0, 2, 0], [0, 2, 0, 3]], s: { '0,0': 'luna', '2,0': 'luna', '2,2': 'sole' } },
      { id: 'l4', w: 3, h: 3, sup: 'piano', start: [0, 0], end: [3, 3], endDir: 'right', gaps: [[3, 1, 3, 2], [1, 0, 2, 0]], s: { '0,0': 'luna', '0,2': 'sole', '1,2': 'luna', '2,2': 'luna' } },
      { id: 'l5', w: 3, h: 3, sup: 'piano', start: [3, 3], end: [0, 0], endDir: 'left', gaps: [], stella: 2, s: { '1,0': 'luna', '2,0': 'sole', '0,1': 'luna', '2,2': 'luna' } },
      { id: 'l6', w: 4, h: 3, sup: 'piano', start: [0, 3], end: [4, 0], endDir: 'up', gaps: [[2, 3, 3, 3], [0, 0, 0, 1]], s: { '1,0': 'luna', '2,0': 'luna', '0,1': 'luna', '1,2': 'sole', '3,2': 'sole' } },
      { id: 'l7', w: 4, h: 4, sup: 'piano', start: [4, 4], end: [0, 0], endDir: 'up', gaps: [[1, 4, 2, 4], [4, 1, 4, 2]], s: { '0,0': 'sole', '1,0': 'luna', '3,0': 'sole', '3,2': 'sole', '0,3': 'luna', '2,3': 'luna' } }
    ] },
  { id: 'specchi', nome: 'Specchi', sigla: 'IV', tipo: 'regola', simbolo: 'mv', regola: 'La zona di uno specchio deve essere simmetrica rispetto al suo asse: la linea sottile che passa per il centro della sua casella, in verticale o in orizzontale.',
    tavole: [
      { id: 's1', w: 3, h: 2, sup: 'piano', start: [0, 2], end: [3, 0], endDir: 'up', gaps: [[0, 0, 0, 1], [3, 1, 3, 2]], s: { '1,0': 'mv', '1,1': 'mo' } },
      { id: 's2', w: 3, h: 2, sup: 'piano', start: [0, 2], end: [3, 0], endDir: 'up', gaps: [], s: { '0,0': 'mo', '2,1': 'mv' } },
      { id: 's3', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [], s: { '2,0': 'mo', '1,1': 'mv', '0,2': 'mv' } },
      { id: 's4', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [[0, 1, 0, 2], [2, 3, 3, 3]], s: { '0,0': 'mo', '0,2': 'mv' } },
      { id: 's5', w: 3, h: 3, sup: 'piano', start: [0, 0], end: [3, 3], endDir: 'right', gaps: [], stella: 2, s: { '0,0': 'mo', '2,1': 'mv', '0,2': 'mv' } },
      { id: 's6', w: 4, h: 3, sup: 'piano', start: [0, 3], end: [4, 0], endDir: 'up', gaps: [[2, 0, 3, 0]], s: { '1,0': 'mv', '2,1': 'mv' } },
      { id: 's7', w: 4, h: 4, sup: 'piano', start: [0, 4], end: [4, 0], endDir: 'up', gaps: [[0, 2, 0, 3], [3, 4, 4, 4]], s: { '3,0': 'mo', '3,2': 'mo', '0,3': 'mv' } }
    ] },
  { id: 'contorni', nome: 'Contorni', sigla: 'V', tipo: 'regola', simbolo: 'c3', regola: 'Il numero nel quadratino dice quanti dei quattro lati della sua casella fa la linea: da 0 a 3. Qui le zone non contano: conta solo da dove passa la linea.',
    tavole: [
      { id: 'co1', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [], s: { '1,1': 'c3', '1,2': 'c0' } },
      { id: 'co2', w: 4, h: 4, sup: 'piano', start: [0, 4], end: [4, 0], endDir: 'right', gaps: [], s: { '0,0': 'c0', '0,1': 'c0', '2,1': 'c2', '1,3': 'c0', '2,3': 'c2' } },
      { id: 'co3', w: 4, h: 4, sup: 'piano', start: [2, 4], end: [2, 0], endDir: 'up', gaps: [], s: { '3,1': 'c3', '1,2': 'c3', '2,2': 'c0' } },
      { id: 'co4', w: 5, h: 5, sup: 'piano', start: [0, 0], end: [5, 5], endDir: 'right', gaps: [], stella: 2, s: { '1,0': 'c0', '2,1': 'c1', '0,3': 'c0', '3,3': 'c0', '3,4': 'c3' } },
      { id: 'co5', w: 5, h: 5, sup: 'piano', start: [0, 5], end: [5, 0], endDir: 'up', gaps: [], s: { '4,0': 'c3', '0,1': 'c3', '2,1': 'c3', '0,2': 'c1', '4,2': 'c0', '0,3': 'c1', '1,4': 'c0' } },
      { id: 'co6', w: 6, h: 6, sup: 'piano', start: [3, 6], end: [3, 0], endDir: 'up', gaps: [], s: { '3,1': 'c3', '4,1': 'c3', '5,1': 'c1', '1,2': 'c0', '5,2': 'c0', '0,3': 'c0', '3,4': 'c3', '4,4': 'c1', '5,5': 'c3' } },
      { id: 'co7', w: 6, h: 6, sup: 'piano', start: [0, 6], end: [6, 0], endDir: 'up', gaps: [], s: { '0,1': 'c0', '5,1': 'c1', '2,2': 'c3', '4,2': 'c0', '2,3': 'c1', '3,3': 'c2', '0,4': 'c2', '1,4': 'c1', '2,4': 'c1', '3,4': 'c2', '5,4': 'c3', '4,5': 'c3' } }
    ] },
  { id: 'occhi', nome: 'Occhi', sigla: 'VI', tipo: 'regola', simbolo: 'o4', regola: 'Il numero con le quattro frecce è un occhio: guarda in su, in giù, a sinistra e a destra e conta le caselle che vede prima di trovare la linea o il bordo (la sua casella non conta). Il numero è il totale delle quattro direzioni.',
    tavole: [
      { id: 'oc1', w: 3, h: 3, sup: 'piano', start: [0, 3], end: [3, 0], endDir: 'up', gaps: [], s: { '1,0': 'o4', '2,0': 'o2', '0,2': 'o4' } },
      { id: 'oc2', w: 4, h: 4, sup: 'piano', start: [0, 4], end: [4, 0], endDir: 'right', gaps: [], s: { '0,0': 'o4', '2,2': 'o5', '3,2': 'o5', '2,3': 'o6' } },
      { id: 'oc3', w: 4, h: 4, sup: 'piano', start: [2, 4], end: [2, 0], endDir: 'up', gaps: [], s: { '1,0': 'o1', '3,1': 'o4', '3,3': 'o5' } },
      { id: 'oc4', w: 5, h: 5, sup: 'piano', start: [0, 0], end: [5, 5], endDir: 'right', gaps: [], stella: 2, s: { '3,0': 'o4', '1,1': 'o8', '3,1': 'o8', '4,2': 'o6' } },
      { id: 'oc5', w: 5, h: 5, sup: 'piano', start: [0, 5], end: [5, 0], endDir: 'up', gaps: [], s: { '1,0': 'o6', '0,2': 'o4', '1,3': 'o1', '4,4': 'o8' } },
      { id: 'oc6', w: 6, h: 6, sup: 'piano', start: [3, 6], end: [3, 0], endDir: 'up', gaps: [], s: { '5,0': 'o1', '2,1': 'o9', '5,1': 'o1', '3,2': 'o2', '1,4': 'o9', '4,5': 'o1' } },
      { id: 'oc7', w: 6, h: 6, sup: 'piano', start: [0, 6], end: [6, 0], endDir: 'up', gaps: [], s: { '5,1': 'o6', '3,2': 'o7', '1,3': 'o6', '4,3': 'o4', '4,4': 'o4', '1,5': 'o6', '4,5': 'o6', '5,5': 'o2' } }
    ] },
  { id: 'cilindro', nome: 'Cilindro', sigla: 'VII', tipo: 'forma', sup: 'cilindro', regola: 'I due lati con la freccia sono incollati: esci da destra e rientri da sinistra alla stessa altezza, come su un cilindro. Anche le zone continuano attraverso il bordo. I numeri dicono quante caselle ha la loro zona.',
    tavole: [
      { id: 'c1', w: 4, h: 3, sup: 'cilindro', start: [1, 3], end: [3, 0], endDir: 'up', gaps: [[1, 0, 2, 0], [1, 1, 2, 1], [1, 2, 2, 2], [1, 3, 2, 3]], s: {} },
      { id: 'c2', w: 3, h: 3, sup: 'cilindro', start: [1, 3], end: [2, 0], endDir: 'up', gaps: [], s: { '0,2': '2' } },
      { id: 'c3', w: 4, h: 3, sup: 'cilindro', start: [1, 3], end: [2, 0], endDir: 'up', gaps: [[2, 1, 2, 2]], s: { '3,0': '1', '3,2': '10' } },
      { id: 'c4', w: 4, h: 3, sup: 'cilindro', start: [2, 3], end: [1, 0], endDir: 'up', gaps: [], stella: 2, s: { '1,1': '3', '3,2': '4' } },
      { id: 'c5', w: 4, h: 4, sup: 'cilindro', start: [1, 4], end: [3, 0], endDir: 'up', gaps: [[2, 2, 2, 3], [0, 1, 1, 1]], s: { '2,0': '5', '3,0': '6' } }
    ] },
  { id: 'mobius', nome: 'Möbius', sigla: 'VIII', tipo: 'forma', sup: 'mobius', regola: 'Destra e sinistra sono incollate al contrario (le frecce puntano in versi opposti): esci da destra in alto e rientri da sinistra in basso. È un nastro di Möbius. I numeri dicono quante caselle ha la loro zona.',
    tavole: [
      { id: 'm1', w: 4, h: 3, sup: 'mobius', start: [1, 3], end: [3, 3], endDir: 'down', gaps: [[1, 0, 2, 0], [1, 1, 2, 1], [1, 2, 2, 2], [1, 3, 2, 3], [0, 3, 1, 3], [3, 0, 3, 1]], s: {} },
      { id: 'm2', w: 3, h: 3, sup: 'mobius', start: [1, 3], end: [2, 0], endDir: 'up', gaps: [], s: { '1,0': '3', '1,2': '3' } },
      { id: 'm3', w: 4, h: 3, sup: 'mobius', start: [1, 3], end: [1, 0], endDir: 'up', gaps: [[2, 1, 2, 2]], s: { '0,0': '4', '3,0': '2' } },
      { id: 'm4', w: 4, h: 3, sup: 'mobius', start: [3, 3], end: [2, 0], endDir: 'up', gaps: [], stella: 2, s: { '2,0': '4', '1,1': '7', '2,2': '4' } },
      { id: 'm5', w: 4, h: 4, sup: 'mobius', start: [1, 4], end: [2, 4], endDir: 'down', gaps: [[2, 4, 3, 4], [2, 0, 2, 1]], s: { '3,1': '4', '0,2': '9' } }
    ] },
  { id: 'sfera', nome: 'Sfera', sigla: 'IX', tipo: 'forma', sup: 'sfera', regola: 'La tavola è una busta: il lato di sopra è incollato a quello di destra e il lato di sinistra a quello di sotto, nel verso delle frecce. Esci da sopra e rientri da destra andando verso sinistra: è una sfera. Non c’è uscita: la linea deve tornare al cerchio. I numeri dicono quante caselle ha la loro zona. Sulla sfera ogni anello divide in due, come su un foglio.',
    tavole: [
      { id: 'sf1', w: 3, h: 3, sup: 'sfera', start: [1, 1], end: null, gaps: [[2, 1, 2, 2], [0, 2, 1, 2], [1, 1, 2, 1], [1, 0, 1, 1]], s: {} },
      { id: 'sf2', w: 3, h: 3, sup: 'sfera', start: [1, 1], end: null, gaps: [], s: { '2,2': '2' } },
      { id: 'sf3', w: 4, h: 4, sup: 'sfera', start: [2, 2], end: null, gaps: [], s: { '1,0': '5', '0,1': '5', '1,3': '5' } },
      { id: 'sf4', w: 4, h: 4, sup: 'sfera', start: [1, 2], end: null, gaps: [], stella: 2, s: { '1,1': '4', '0,2': '4', '0,3': '4' } },
      { id: 'sf5', w: 5, h: 5, sup: 'sfera', start: [2, 2], end: null, gaps: [], s: { '0,0': '7', '1,4': '7', '2,4': '18', '3,4': '7' } }
    ] },
  { id: 'toro', nome: 'Toro', sigla: 'X', tipo: 'forma', sup: 'toro', regola: 'Tutti i lati sono incollati, ognuno col gemello che ha la stessa freccia: è la superficie di una ciambella, un toro. Non c’è uscita: la linea deve tornare al cerchio e chiudersi. I numeri dicono quante caselle ha la loro zona. Un anello che fa il giro della ciambella non divide niente.',
    tavole: [
      { id: 't1', w: 3, h: 3, sup: 'toro', start: [1, 1], end: null, gaps: [], s: {} },
      { id: 't2', w: 3, h: 3, sup: 'toro', start: [1, 1], end: null, gaps: [], s: { '0,0': '4', '2,0': '4', '0,2': '4', '2,2': '4' } },
      { id: 't3', w: 4, h: 3, sup: 'toro', start: [2, 1], end: null, gaps: [], s: { '3,0': '3', '2,2': '3' } },
      { id: 't4', w: 4, h: 3, sup: 'toro', start: [1, 2], end: null, gaps: [[2, 0, 2, 1]], stella: 2, s: { '0,0': '4', '2,2': '4' } },
      { id: 't5', w: 4, h: 4, sup: 'toro', start: [2, 2], end: null, gaps: [[0, 1, 1, 1], [3, 2, 3, 3]], s: { '0,1': '6', '0,2': '6', '2,3': '6' } }
    ] },
  { id: 'klein', nome: 'Klein', sigla: 'XI', tipo: 'forma', sup: 'klein', regola: 'Destra e sinistra sono incollate dritte, sopra e sotto al contrario: è una bottiglia di Klein. Non c’è uscita: la linea deve tornare al cerchio e chiudersi. I numeri dicono quante caselle ha la loro zona.',
    tavole: [
      { id: 'k1', w: 3, h: 3, sup: 'klein', start: [1, 1], end: null, gaps: [], s: {} },
      { id: 'k2', w: 3, h: 3, sup: 'klein', start: [1, 1], end: null, gaps: [], s: { '2,2': '2' } },
      { id: 'k3', w: 4, h: 3, sup: 'klein', start: [2, 1], end: null, gaps: [], s: { '1,0': '4', '1,1': '4', '2,1': '4', '2,2': '4' } },
      { id: 'k4', w: 4, h: 3, sup: 'klein', start: [1, 2], end: null, gaps: [[3, 1, 3, 2]], stella: 2, s: { '3,0': '3', '1,2': '3' } },
      { id: 'k5', w: 4, h: 4, sup: 'klein', start: [2, 2], end: null, gaps: [[1, 0, 1, 1]], s: { '0,0': '7', '3,1': '7', '1,3': '7' } }
    ] },
  { id: 'rp2', nome: 'RP²', sigla: 'XII', tipo: 'forma', sup: 'rp2', regola: 'Tutte e due le coppie di lati sono incollate al contrario: è il piano proiettivo. Non c’è uscita: la linea deve tornare al cerchio e chiudersi. I numeri dicono quante caselle ha la loro zona. Qui una linea che va da un lato all’altro può non dividere niente.',
    tavole: [
      { id: 'r1', w: 3, h: 3, sup: 'rp2', start: [1, 1], end: null, gaps: [], s: {} },
      { id: 'r2', w: 3, h: 3, sup: 'rp2', start: [1, 1], end: null, gaps: [], s: { '2,0': '3', '1,2': '3' } },
      { id: 'r3', w: 4, h: 3, sup: 'rp2', start: [2, 1], end: null, gaps: [[2, 1, 3, 1], [1, 1, 2, 1], [3, 1, 3, 2], [1, 0, 2, 0], [1, 2, 2, 2]], s: { '0,1': '12' } },
      { id: 'r4', w: 4, h: 3, sup: 'rp2', start: [1, 2], end: null, gaps: [[2, 1, 2, 2]], stella: 2, s: { '1,0': '4', '3,2': '4' } },
      { id: 'r5', w: 4, h: 4, sup: 'rp2', start: [2, 2], end: null, gaps: [[1, 3, 2, 3]], s: { '1,0': '6', '3,2': '6', '0,3': '6' } }
    ] },
  { id: 'bitoro', nome: 'Bitoro', sigla: 'XIII', tipo: 'forma', sup: 'bitoro', regola: 'La tavola è una L con i lati incollati a coppie, dritti: ogni lato col gemello che ha le stesse frecce. È un bitoro, una ciambella con due buchi. Tutti gli angoli della L, segnati con la stellina, sono lo stesso punto: lì attorno gli angoli delle caselle fanno tre giri (6π) e la linea non ci passa. Non c’è uscita: la linea torna al cerchio. I numeri dicono quante caselle ha la loro zona.',
    tavole: [
      { id: 'bt1', w: 4, h: 4, L: [2, 2], sup: 'bitoro', start: [1, 3], end: null, gaps: [], s: {} },
      { id: 'bt2', w: 5, h: 5, L: [3, 2], sup: 'bitoro', start: [1, 4], end: null, gaps: [], s: { '4,3': '2' } },
      { id: 'bt3', w: 5, h: 5, L: [3, 2], sup: 'bitoro', start: [1, 4], end: null, gaps: [], s: { '1,3': '9' } },
      { id: 'bt4', w: 6, h: 6, L: [3, 3], sup: 'bitoro', start: [1, 5], end: null, gaps: [], stella: 2, s: { '4,3': '15', '5,4': '12', '4,5': '12' } },
      { id: 'bt5', w: 6, h: 6, L: [3, 3], sup: 'bitoro', start: [1, 5], end: null, gaps: [], s: { '3,4': '14', '4,5': '13' } }
    ] },
  { id: 'segreto', nome: 'Segreto', sigla: '★', tipo: 'segreto', regola: 'Le regole delle altre aree, tutte insieme: frecce che si annullano, numeri che contano le caselle, soli a sinistra e lune a destra, zone simmetriche negli specchi, contorni e occhi. La terza tavola è su un toro, l’ultima su una sfera.',
    tavole: [
      { id: 'x1', w: 4, h: 4, sup: 'piano', start: [0, 4], end: [4, 0], endDir: 'up', gaps: [[2, 0, 3, 0]], s: { '0,2': 'E', '2,2': 'W', '1,2': '9', '0,1': '6', '2,0': '9' } },
      { id: 'x2', w: 4, h: 4, sup: 'piano', start: [0, 0], end: [4, 4], endDir: 'down', gaps: [[0, 2, 0, 3]], s: { '1,1': 'sole', '3,1': 'luna', '2,1': 'sole', '0,1': 'luna', '3,0': 'sole', '2,3': 'mv', '0,0': 'sole' } },
      { id: 'x3', w: 4, h: 4, sup: 'toro', start: [2, 2], end: null, gaps: [], s: { '0,1': 'SE', '1,1': 'W', '0,3': 'N', '1,0': '11', '1,3': '5', '0,0': '5' } },
      { id: 'x4', w: 5, h: 5, sup: 'piano', start: [0, 5], end: [5, 0], endDir: 'up', gaps: [], s: { '1,0': 'o6', '2,1': '11', '4,1': 'c3', '0,2': '8', '2,2': 'c1', '3,3': '5' } },
      { id: 'x5', w: 4, h: 4, sup: 'sfera', start: [2, 2], end: null, gaps: [], s: { '0,0': 'c3', '1,1': '9', '3,1': '7', '2,3': 'c3' } }
    ] }
];
