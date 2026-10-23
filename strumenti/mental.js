#!/usr/bin/env node
/* =====================================================================
   MENTAL — prepara le sfide dei prossimi giorni
   Uso (dalla cartella della repo):
     node strumenti/mental.js --scorta 60       fa in modo che ci siano sfide fino a oggi + 60 giorni (oggi di
                                                Roma); se ci sono già non fa niente
     node strumenti/mental.js --fino AAAA-MM-GG prepara i giorni mancanti fino a quella data
     node strumenti/mental.js --rimescola       rifà il calendario dei giorni dopo oggi: tiene le sfide già
                                                pronte, aggiunge gli enigmi del catalogo non ancora usati e
                                                POOL sfide nuove per ogni gioco nuovo, e mescola tutto
     node strumenti/mental.js --controlla       ricontrolla da zero tutte le sfide pubblicate

   Regole (le stesse per chiunque lo lanci, così il risultato non dipende da chi lo fa):
   - i giorni fino a oggi (ora di Roma) non cambiano mai: qualcuno potrebbe averli giocati;
   - ogni giorno il tipo di sfida lo sceglie il palinsesto di comune.js (scegliDelGiorno): lo stesso tipo
     torna il più tardi possibile, mai la stessa famiglia due giorni di fila, domenica estrema;
   - gli enigmi scritti a mano vengono da strumenti/mental-enigmi.js, una volta sola ciascuno; i giochi
     generati si generano con un seme fatto dalla data (o dal posto nel rimescolamento): riproducibili;
   - prima di scrivere si controlla ogni sfida da capo: dati validi, soluzione unica (ricerca completa) o
     minimo di mosse verificato, risolta dal risolutore «umano», livello giusto; per gli enigmi la loro
     verifica. Se un controllo fallisce lo strumento si ferma e non scrive niente.
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
/* Giochi generati: i primi nove sono quelli del lancio, poi quelli aggiunti dopo */
const GIOCHI = ['corone', 'stelle', 'binario', 'sudoku', 'campo', 'grattacieli', 'futoshiki', 'nonogramma', 'cavalieri',
  'codice', 'linea', 'bilancia', 'calcolatrice', 'travasi',
  'gabbie', 'kakuro', 'flotta', 'tende', 'luci', 'ponti', 'logigramma', 'criptaritmo'];
for (const g of GIOCHI.concat(['enigma'])) require(path.join(CARTELLA, 'motori', g + '.js'));
const CATALOGO = require(path.join(__dirname, 'mental-enigmi.js'));
/* Riserva: sfide già generate e controllate che non sono in calendario (per esempio quelle dei primi
   nove giochi tolte dal rimescolamento perché tornavano troppo spesso). Si usano prima di generarne di nuove. */
const RISERVA = path.join(__dirname, 'mental-riserva.json');
const leggiRiserva = () => (fs.existsSync(RISERVA) ? JSON.parse(fs.readFileSync(RISERVA, 'utf8')) : []);
const scriviRiserva = l => fs.writeFileSync(RISERVA, '[\n' + l.map(x => JSON.stringify(x)).join(',\n') + '\n]\n');
/* Nel rimescolamento, al massimo TIENI sfide per tipo di gioco generato (le altre vanno in riserva) */
const TIENI = 4;
/* Quante sfide nuove per ogni gioco generato entrano in un rimescolamento, e con che livelli */
const POOL = ['impegnativa', 'esperta', 'estrema', 'esperta'];
/* Ritmo ideale (giorni tra una volta e l'altra) quando si allunga il calendario */
const PERIODO_MOTORE = 24, PERIODO_ENIGMI = 10;

/* ---------------- Lettura di quello che c'è già ---------------- */
function leggiTutto() {
  M.dati = {};
  const indice = path.join(SFIDE, 'indice.js');
  if (!fs.existsSync(indice)) return { mesi: [] };
  const ctx = {}; new Function('self', fs.readFileSync(indice, 'utf8'))(ctx);
  const I = ctx.MENTAL_INDICE || { mesi: [] };
  for (const m of I.mesi) new Function('MENTAL', fs.readFileSync(path.join(SFIDE, m + '.js'), 'utf8'))(M);
  return I;
}
const voce = id => CATALOGO.find(e => e.id === id);
const J = x => JSON.stringify(x);
const rispostaDi = v => (Array.isArray(v.risposta) ? v.risposta.join(',') : String(v.risposta));

/* ---------------- Controllo di una sfida ---------------- */
function controllaVoce(e) {
  if (!e.id || !e.titolo || !M.LIVELLI[e.livello]) return 'campi mancanti';
  const E = M.motori.enigma, p = E.daCatalogo(e, 'prova|' + e.id), v = E.valida(p);
  if (v) return v;
  if (e.verifica) { const x = e.verifica(); if (String(x) !== rispostaDi(e)) return `la verifica dà ${x} invece di ${rispostaDi(e)}`; }
  else if (!e.controllo) return 'manca sia la verifica sia il controllo a mano';
  return null;
}
function controlla(s) {
  const E = M.motori[s.gioco];
  if (!E) return 'gioco sconosciuto ' + s.gioco;
  if (!M.dataValida(s.data)) return 'data non valida';
  if (s.n !== M.numero(s.data)) return `numero sbagliato (${s.n} invece di ${M.numero(s.data)})`;
  if (!M.LIVELLI[s.livello]) return 'livello sconosciuto';
  if (!s.titolo) return 'manca il titolo';
  const v = E.valida(s.p); if (v) return 'dati: ' + v;
  if (s.gioco === 'enigma') {
    const e = voce(s.p.id);
    if (e) { const err = controllaVoce(e); if (err) return 'catalogo: ' + err; if (e.livello !== s.livello) return 'livello diverso dal catalogo'; }
    return null;
  }
  const c = E.conta(s.p, 2); if (c !== 1) return `soluzioni: ${c}`;
  const unica = E.conta.ultima;
  const ris = E.risolvi(s.p);
  if (!ris.risolto) return 'il risolutore umano non arriva in fondo';
  if (unica != null && ris.sol != null && J(ris.sol) !== J(unica)) return 'il risolutore umano trova una soluzione diversa da quella unica';
  const liv = E.livello(s.p, ris); if (liv !== s.livello) return `livello ${liv} invece di ${s.livello}`;
  if (E.giusta) { if (!E.giusta(s.p, E.statoRisolto(s.p, ris.sol).v)) return 'la soluzione non viene accettata dalla pagina'; }
  else if (!E.completo(s.p, E.statoRisolto(s.p, ris.sol))) return 'la soluzione non risulta completa nella pagina';
  return null;
}
function riassunto(ris) { return Object.fromEntries(Object.entries(ris.conteggio || {}).sort((a, b) => b[1] - a[1])); }

/* ---------------- Sfide nuove (senza data) ---------------- */
function generaSfida(gioco, livello, seme) {
  const E = M.motori[gioco], r = M.prng(seme);
  let g = null;
  for (let k = 0; k < 40 && !g; k++) g = E.genera(r, livello, undefined, seme);
  if (!g) throw new Error(`non riesco a generare ${gioco} ${livello} (${seme})`);
  return { gioco, livello, tecniche: riassunto(g.ris), p: g.p };
}
function daCatalogo(e) { return { gioco: 'enigma', livello: e.livello, titolo: e.titolo, tecniche: {}, p: M.motori.enigma.daCatalogo(e, 'e|' + e.id) }; }
const tipoDi = s => M.tipoSfida(s.gioco, s.p), famigliaDi = s => M.famigliaSfida(s.gioco, s.p);
function storiaDi(dati) { const st = {}; for (const d in dati) st[d] = { tipo: tipoDi(dati[d]), famiglia: famigliaDi(dati[d]), livello: dati[d].livello }; return st; }
function titolo(s, data) {
  if (s.titolo) return s.titolo;
  const tipo = tipoDi(s), usati = new Set();
  const date = Object.keys(M.dati).filter(d => d < data).sort().reverse();
  const lista = M.TITOLI[tipo] || M.TITOLI[s.gioco] || [];
  let quanti = Math.max(0, lista.length - 1);
  for (const d of date) {
    const x = M.dati[d];
    if (M.differenza(d, data) <= 30) usati.add(x.titolo);
    if (quanti > 0 && tipoDi(x) === tipo) { usati.add(x.titolo); quanti--; }
  }
  return M.titoloDelGiorno(tipo, data, usati);
}
function metti(data, s) {
  const x = Object.assign({ data, n: M.numero(data) }, s);
  x.titolo = titolo(x, data);
  const ord = { data: x.data, n: x.n, gioco: x.gioco, livello: x.livello, titolo: x.titolo, tecniche: x.tecniche || {}, p: x.p };
  const err = controlla(ord);
  if (err) throw new Error(`${data} (${ord.gioco}): ${err}`);
  M.dati[data] = ord;
  return ord;
}
function stampa(s, extra = '') {
  console.log(`#${String(s.n).padStart(3, '0')} ${s.data} ${M.tipoSfida(s.gioco, s.p).padEnd(20)} ${s.livello.padEnd(11)} ${s.titolo}${extra}`);
}

/* ---------------- Rimescolamento ---------------- */
function rimescola(limite) {
  const fissi = Object.keys(M.dati).filter(d => d <= limite).sort();
  const futuri = Object.keys(M.dati).filter(d => d > limite).sort().map(d => M.dati[d]);
  const usati = new Set(fissi.map(d => M.dati[d]).filter(s => s.gioco === 'enigma').map(s => s.p.id));
  const pool = [], perGioco = new Map();
  for (const s of futuri.concat(leggiRiserva())) {
    const x = { gioco: s.gioco, livello: s.livello, titolo: s.titolo, tecniche: s.tecniche, p: s.p };
    if (s.gioco === 'enigma') { if (!usati.has(s.p.id)) { pool.push(x); usati.add(s.p.id); } continue; }
    const t = tipoDi(x); if (!perGioco.has(t)) perGioco.set(t, []); perGioco.get(t).push(x);
  }
  // per ogni tipo generato se ne tengono TIENI, con livelli il più possibile vari (un'estrema se c'è)
  const riserva = [];
  for (const [, l] of perGioco) {
    const tenuti = [];
    for (const liv of ['estrema', 'esperta', 'impegnativa', 'esperta', 'impegnativa', 'esperta', 'estrema']) {
      if (tenuti.length >= TIENI) break;
      const i = l.findIndex(x => x.livello === liv); if (i >= 0) tenuti.push(l.splice(i, 1)[0]);
    }
    while (tenuti.length < TIENI && l.length) tenuti.push(l.shift());
    pool.push(...tenuti); riserva.push(...l);
  }
  for (const e of CATALOGO) if (!usati.has(e.id)) pool.push(daCatalogo(e));
  // i giochi generati che non hanno ancora sfide nel calendario: POOL sfide nuove ciascuno
  const presenti = new Set(Object.values(M.dati).map(s => s.gioco).concat([...perGioco.keys()].map(t => t.split(':')[0])));
  for (const g of GIOCHI) if (!presenti.has(g)) POOL.forEach((liv, i) => { pool.push(generaSfida(g, liv, `pool|${g}|${i}|${liv}`)); process.stdout.write('.'); });
  // ogni domenica vuole un'estrema: se non bastano se ne generano altre, un gioco per volta
  const domeniche = n => { let c = 0; for (let k = 1; k <= n; k++) if (M.giornoSettimana(M.piuGiorni(limite, k)) === 0) c++; return c; };
  for (let k = 0; pool.filter(x => x.livello === 'estrema').length < domeniche(pool.length) + 1; k++) {
    const g = GIOCHI.filter(x => x !== 'stelle')[k % (GIOCHI.length - 1)];
    pool.push(generaSfida(g, 'estrema', `extra|${g}|${k}`)); process.stdout.write('+');
  }
  process.stdout.write('\n');
  // via i giorni futuri e si riparte dal giorno dopo il limite
  for (const s of futuri) delete M.dati[s.data];
  const r = M.prng('rimescola|' + limite);
  const perTipo = new Map();
  for (const s of r.mescola(pool)) { const t = tipoDi(s); if (!perTipo.has(t)) perTipo.set(t, []); perTipo.get(t).push(s); }
  const H = pool.length;
  const ultimo = new Map();
  for (const [t, l] of perTipo) ultimo.set(t, M.piuGiorni(limite, -Math.round((H / l.length) * r.f())));
  let data = M.piuGiorni(limite, 1);
  const storia = storiaDi(M.dati);
  const periodo = new Map([...perTipo].map(([t, l]) => [t, H / l.length]));
  let messi = 0;
  for (let k = 0; k < H; k++, data = M.piuGiorni(data, 1)) {
    const rimasti = [].concat(...perTipo.values());
    // il sabato un'estrema solo se ne avanzano per le domeniche che restano
    const estreme = rimasti.filter(x => x.livello === 'estrema').length;
    const sabatoSenza = M.giornoSettimana(data) === 6 && estreme <= domeniche(H) - domeniche(k);
    const cand = [...perTipo].filter(([, l]) => l.length).map(([t, l]) => ({ tipo: t, famiglia: famigliaDi(l[0]), livelli: [...new Set(l.map(x => x.livello))].filter(v => !sabatoSenza || v !== 'estrema'), periodo: periodo.get(t), ultimo: ultimo.get(t) })).filter(c => c.livelli.length);
    const sc = M.scegliDelGiorno(data, storia, cand, r);
    // quando le regole non si possono più rispettare ci si ferma: il resto va in riserva (gli enigmi
    // tornano disponibili nel catalogo) e i giorni dopo li prepara --scorta
    if (!sc || sc.rilassa > 0) break;
    const lista = perTipo.get(sc.c.tipo), i = Math.max(0, lista.findIndex(x => x.livello === sc.livello));
    const s = lista.splice(i, 1)[0];
    const fatto = metti(data, s);
    storia[data] = { tipo: sc.c.tipo, famiglia: sc.c.famiglia, livello: fatto.livello };
    stampa(fatto); messi++;
  }
  for (const l of perTipo.values()) for (const s of l) if (s.gioco !== 'enigma') riserva.push(s);
  scriviRiserva(riserva);
  console.log(`In calendario: ${messi} giorni nuovi. In riserva: ${riserva.length} sfide.`);
  return fissi.length ? M.meseDi(M.piuGiorni(limite, 1)) : null;
}

/* ---------------- Allungare il calendario ---------------- */
/* I candidati di un giorno: le categorie di enigmi con voci non ancora usate e tutti i giochi generati */
function candidatiDelGiorno(usati) {
  const enigmi = new Map();
  for (const e of CATALOGO) if (!usati.has(e.id)) { const t = 'enigma:' + e.cat; if (!enigmi.has(t)) enigmi.set(t, []); enigmi.get(t).push(e); }
  const cand = [...enigmi].map(([t, l]) => ({ tipo: t, famiglia: M.motori.enigma.famigliaDi({ cat: l[0].cat }), livelli: [...new Set(l.map(e => e.livello))], periodo: PERIODO_ENIGMI, voci: l }));
  for (const g of GIOCHI) {
    const tipi = g === 'codice' ? ['codice:lucchetto', 'codice:colori'] : [g];
    for (const t of tipi) cand.push({ tipo: t, famiglia: M.famigliaSfida(g, g === 'codice' ? { stile: t.split(':')[1] } : null), livelli: g === 'codice' ? (t === 'codice:lucchetto' ? ['impegnativa', 'esperta'] : ['esperta', 'estrema']) : ['impegnativa', 'esperta', 'estrema'], periodo: PERIODO_MOTORE, gioco: g });
  }
  return cand;
}
function estendi(fino) {
  const date = Object.keys(M.dati).sort();
  const ultimo = date.length ? date[date.length - 1] : M.piuGiorni(M.LANCIO, -1);
  if (fino <= ultimo) { console.log(`Niente da fare: le sfide arrivano già al ${ultimo}.`); return false; }
  const usati = new Set(Object.values(M.dati).filter(s => s.gioco === 'enigma').map(s => s.p.id));
  const storia = storiaDi(M.dati);
  for (let d = M.piuGiorni(ultimo, 1); d <= fino; d = M.piuGiorni(d, 1)) {
    const r = M.prng('giorno|' + d), t0 = Date.now();
    const sc = M.scegliDelGiorno(d, storia, candidatiDelGiorno(usati), r);
    let s;
    if (sc.c.voci) { const e = sc.c.voci.find(x => x.livello === sc.livello) || sc.c.voci[0]; s = daCatalogo(e); usati.add(e.id); }
    else {
      const ris = leggiRiserva(), i = ris.findIndex(x => tipoDi(x) === sc.c.tipo && x.livello === sc.livello);
      s = null;
      if (i >= 0) { s = ris.splice(i, 1)[0]; delete s.titolo; scriviRiserva(ris); }
      for (let k = 0; k < 6 && !s; k++) {
        const x = generaSfida(sc.c.gioco, sc.livello, `giorno|${d}|${k}`);
        if (tipoDi(x) === sc.c.tipo) s = x;
      }
      if (!s) throw new Error(`${d}: non riesco a generare ${sc.c.tipo}`);
    }
    const fatto = metti(d, s);
    storia[d] = { tipo: tipoDi(fatto), famiglia: famigliaDi(fatto), livello: fatto.livello };
    stampa(fatto, `  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  return true;
}

/* ---------------- Scrittura ---------------- */
function scriviMese(m) {
  const sfide = Object.values(M.dati).filter(s => s.data.slice(0, 7) === m).sort((a, b) => (a.data < b.data ? -1 : 1));
  const [a, mm] = m.split('-').map(Number);
  const testa = `/* MENTAL — sfide di ${M.MESI[mm - 1]} ${a}.\n   File preparato da strumenti/mental.js: non modificarlo a mano (le sfide sono già state controllate). */\n`;
  fs.writeFileSync(path.join(SFIDE, m + '.js'), `${testa}MENTAL.mese('${m}', [\n${sfide.map(s => J(s)).join(',\n')}\n]);\n`);
}
function scriviTutto(daMese) {
  const date = Object.keys(M.dati).sort();
  const mesi = [...new Set(date.map(d => d.slice(0, 7)))];
  for (const m of mesi) if (!daMese || m >= daMese) scriviMese(m);
  // mesi che non esistono più
  for (const f of fs.readdirSync(SFIDE)) if (/^\d{4}-\d{2}\.js$/.test(f) && !mesi.includes(f.slice(0, 7))) fs.unlinkSync(path.join(SFIDE, f));
  const I = { mesi, primo: date[0], ultimo: date[date.length - 1] };
  fs.writeFileSync(path.join(SFIDE, 'indice.js'), `/* MENTAL — quali mesi di sfide esistono e fino a che giorno arrivano.\n   File preparato da strumenti/mental.js. */\nself.MENTAL_INDICE = ${J(I)};\n`);
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
    for (const e of CATALOGO) { const err = controllaVoce(e); if (err) { errori++; console.log('✗ catalogo', e.id, err); } }
    date.forEach((d, k) => {
      const s = M.dati[d];
      let e = controlla(s);
      if (!e && k > 0 && M.differenza(date[k - 1], d) !== 1) e = 'manca il giorno prima';
      if (e) { errori++; console.log('✗', d, s.gioco, e); }
    });
    console.log(errori ? `${errori} problemi` : `tutte le ${date.length} sfide sono a posto (dal ${date[0]} al ${date[date.length - 1]}), e i ${CATALOGO.length} enigmi del catalogo pure`);
    process.exit(errori ? 1 : 0);
  }
  if (arg.includes('--rimescola')) {
    const limite = val('--dopo') || M.giornoRoma();
    if (!M.dataValida(limite)) { console.log('--dopo AAAA-MM-GG'); process.exit(1); }
    rimescola(limite);
    const I = scriviTutto(M.meseDi(M.piuGiorni(limite, 1)));
    console.log(`Fatto: sfide dal ${I.primo} al ${I.ultimo}; i giorni fino al ${limite} non sono cambiati.`);
    return;
  }
  const ultimo = date.length ? date[date.length - 1] : M.piuGiorni(M.LANCIO, -1);
  let fino = val('--fino');
  if (val('--giorni')) fino = M.piuGiorni(ultimo, Number(val('--giorni')));
  if (val('--scorta')) fino = M.piuGiorni(M.giornoRoma(), Number(val('--scorta')));
  if (!fino || !M.dataValida(fino)) { console.log('Uso: node strumenti/mental.js --scorta N | --fino AAAA-MM-GG | --giorni N | --rimescola [--dopo AAAA-MM-GG] | --controlla'); process.exit(1); }
  if (!estendi(fino)) return;
  const I = scriviTutto(M.meseDi(M.piuGiorni(ultimo, 1)));
  console.log(`Fatto: sfide dal ${I.primo} al ${I.ultimo}.`);
}
if (require.main === module) main();
module.exports = { controlla, controllaVoce, leggiTutto, leggiRiserva, generaSfida, rimescola, estendi, candidatiDelGiorno, storiaDi, GIOCHI, CATALOGO, M };
