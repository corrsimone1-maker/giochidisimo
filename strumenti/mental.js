#!/usr/bin/env node
/* =====================================================================
   MENTAL — prepara le sfide dei prossimi giorni
   Uso (dalla cartella della repo):
     node strumenti/mental.js --fino 2027-01-31      prepara i giorni mancanti fino a quella data
     node strumenti/mental.js --giorni 30            prepara 30 giorni dopo l'ultimo già pronto
     node strumenti/mental.js --scorta 60            fa in modo che ci siano sfide fino a oggi + 60 giorni
                                                     (oggi di Roma); se ci sono già non fa niente
     node strumenti/mental.js --controlla            ricontrolla da zero tutte le sfide pubblicate

   Regole (le stesse per chiunque lo lanci, così il risultato non dipende da chi lo fa):
   - si aggiungono solo giorni DOPO l'ultimo già pronto: una sfida pubblicata non cambia mai;
   - gioco e livello del giorno vengono da comune.js (giocoDelGiorno, livelloDelGiorno);
   - ogni sfida si genera da un seme fatto con la data, quindi è riproducibile;
   - prima di scriverla si controlla da capo: dati validi, soluzione unica (ricerca completa),
     risolta dal risolutore «umano» e del livello giusto. Se un controllo fallisce, lo
     strumento si ferma e non scrive niente.
   File scritti: giochi/mental/sfide/AAAA-MM.js (un mese per file) e giochi/mental/sfide/indice.js.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const CARTELLA = path.join(RADICE, 'giochi', 'mental');
const SFIDE = path.join(CARTELLA, 'sfide');
global.self = global;
const M = require(path.join(CARTELLA, 'comune.js'));
const GIOCHI = ['corone', 'stelle', 'binario', 'sudoku', 'campo', 'grattacieli', 'futoshiki', 'nonogramma', 'cavalieri'];
for (const g of GIOCHI) require(path.join(CARTELLA, 'motori', g + '.js'));

/* ---------------- Lettura di quello che c'è già ---------------- */
function leggiTutto() {
  M.dati = {};
  const indice = path.join(SFIDE, 'indice.js');
  if (!fs.existsSync(indice)) return { mesi: [] };
  const ctx = {}; new Function('self', fs.readFileSync(indice, 'utf8'))(ctx);
  const I = ctx.MENTAL_INDICE || { mesi: [] };
  for (const m of I.mesi) {
    const f = path.join(SFIDE, m + '.js');
    new Function('MENTAL', fs.readFileSync(f, 'utf8'))(M);
  }
  return I;
}

/* ---------------- Controllo di una sfida ---------------- */
function controlla(s) {
  const E = M.motori[s.gioco];
  if (!E) return 'gioco sconosciuto ' + s.gioco;
  if (!M.dataValida(s.data)) return 'data non valida';
  if (s.n !== M.numero(s.data)) return `numero sbagliato (${s.n} invece di ${M.numero(s.data)})`;
  if (!M.LIVELLI[s.livello]) return 'livello sconosciuto';
  const v = E.valida(s.p); if (v) return 'dati: ' + v;
  const c = E.conta(s.p, 2); if (c !== 1) return `soluzioni: ${c}`;
  const unica = E.conta.ultima;
  const ris = E.risolvi(s.p);
  if (!ris.risolto) return 'il risolutore umano non arriva in fondo';
  if (JSON.stringify(ris.sol) !== JSON.stringify(unica)) return 'il risolutore umano trova una soluzione diversa da quella unica';
  const liv = E.livello(s.p, ris); if (liv !== s.livello) return `livello ${liv} invece di ${s.livello}`;
  if (!E.completo(s.p, E.statoRisolto(s.p, ris.sol))) return 'la soluzione non risulta completa nella pagina';
  return null;
}
function riassunto(ris) {                    // tecniche usate, dalla più difficile: { id: volte }
  const E_ = Object.entries(ris.conteggio);
  return Object.fromEntries(E_.sort((a, b) => b[1] - a[1]));
}

/* ---------------- Generazione di un giorno ---------------- */
function preparaGiorno(data) {
  const prec = {}; for (const d in M.dati) prec[d] = M.dati[d].gioco;
  const gioco = M.giocoDelGiorno(data, prec, GIOCHI);
  const livello = M.livelloDelGiorno(data, gioco, M.dati);
  const E = M.motori[gioco];
  const r = M.prng(`sfida|${data}|${gioco}|${livello}`);
  let g = null;
  for (let k = 0; k < 40 && !g; k++) g = E.genera(r, livello, undefined, data);
  if (!g) throw new Error(`${data}: non riesco a generare ${gioco} ${livello}`);
  // titoli: senza ripetere quelli delle ultime volte dello stesso gioco
  const usati = new Set(), dello = Object.values(M.dati).filter(x => x.gioco === gioco).sort((a, b) => (a.data < b.data ? 1 : -1));
  const quanti = Math.max(1, (M.TITOLI[gioco] || []).length - 1);
  for (const x of dello.slice(0, quanti)) usati.add(gioco + '|' + x.titolo);
  const titolo = M.titoloDelGiorno(gioco, data, usati);
  const s = { data, n: M.numero(data), gioco, livello, titolo, tecniche: riassunto(g.ris), p: g.p };
  const err = controlla(s);
  if (err) throw new Error(`${data} (${gioco}): ${err}`);
  return s;
}

/* ---------------- Scrittura ---------------- */
function scriviMese(m) {
  const sfide = Object.values(M.dati).filter(s => s.data.slice(0, 7) === m).sort((a, b) => (a.data < b.data ? -1 : 1));
  const [a, mm] = m.split('-').map(Number);
  const nomi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const testa = `/* MENTAL — sfide di ${nomi[mm - 1]} ${a}.\n   File preparato da strumenti/mental.js: non modificarlo a mano (le sfide sono già state controllate). */\n`;
  const corpo = sfide.map(s => JSON.stringify(s)).join(',\n');
  fs.writeFileSync(path.join(SFIDE, m + '.js'), `${testa}MENTAL.mese('${m}', [\n${corpo}\n]);\n`);
}
function scriviIndice() {
  const date = Object.keys(M.dati).sort();
  const mesi = [...new Set(date.map(d => d.slice(0, 7)))];
  const I = { mesi, primo: date[0], ultimo: date[date.length - 1] };
  fs.writeFileSync(path.join(SFIDE, 'indice.js'),
    `/* MENTAL — quali mesi di sfide esistono e fino a che giorno arrivano.\n   File preparato da strumenti/mental.js. */\nself.MENTAL_INDICE = ${JSON.stringify(I)};\n`);
  return I;
}

/* ---------------- Comandi ---------------- */
function main() {
  const arg = process.argv.slice(2);
  const val = k => { const i = arg.indexOf(k); return i >= 0 ? arg[i + 1] : null; };
  fs.mkdirSync(SFIDE, { recursive: true });
  leggiTutto();
  const date = Object.keys(M.dati).sort();

  if (arg.includes('--controlla')) {
    let errori = 0;
    date.forEach((d, k) => {
      const s = M.dati[d];
      let e = controlla(s);
      if (!e && k > 0 && M.differenza(date[k - 1], d) !== 1) e = 'manca il giorno prima';
      if (e) { errori++; console.log('✗', d, s.gioco, e); }
    });
    console.log(errori ? `${errori} sfide con problemi su ${date.length}` : `tutte le ${date.length} sfide sono a posto (dal ${date[0]} al ${date[date.length - 1]})`);
    process.exit(errori ? 1 : 0);
  }

  const ultimo = date.length ? date[date.length - 1] : M.piuGiorni(M.LANCIO, -1);
  let fino = val('--fino');
  if (val('--giorni')) fino = M.piuGiorni(ultimo, Number(val('--giorni')));
  if (val('--scorta')) fino = M.piuGiorni(M.giornoRoma(), Number(val('--scorta')));
  if (!fino || !M.dataValida(fino)) { console.log('Uso: node strumenti/mental.js --fino AAAA-MM-GG | --giorni N | --scorta N | --controlla'); process.exit(1); }
  if (fino <= ultimo) { console.log(`Niente da fare: le sfide arrivano già al ${ultimo}.`); return; }

  const toccati = new Set();
  for (let d = M.piuGiorni(ultimo, 1); d <= fino; d = M.piuGiorni(d, 1)) {
    const t0 = Date.now();
    const s = preparaGiorno(d);
    M.dati[d] = s; toccati.add(d.slice(0, 7));
    console.log(`#${String(s.n).padStart(3, '0')} ${d} ${s.gioco.padEnd(11)} ${s.livello.padEnd(11)} ${s.titolo}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  for (const m of toccati) scriviMese(m);
  const I = scriviIndice();
  console.log(`Fatto: sfide dal ${I.primo} al ${I.ultimo}.`);
}
if (require.main === module) main();
module.exports = { controlla, leggiTutto, preparaGiorno, GIOCHI, M };
