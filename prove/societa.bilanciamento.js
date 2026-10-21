// Conti del bilanciamento di 7 Wonders: Secret Societies (giochi/societa/motore.js).
// Uso, dalla cartella della repo:  node prove/societa.bilanciamento.js
// 1. Matrice del Patto: quando conviene essere leali (per ogni preset).
// 2. Lo stesso in termini relativi (si vince la partita, non si massimizzano i punti).
// 3. Frequenze di base dei requisiti con un draft casuale (stima grezza, composizione delle carte da verificare).
// 4. Ordine di grandezza dei punti dell'espansione in partite simulate con un modello ingenuo.
// I punti 3 e 4 sono modelli, non dati: servono a scegliere un punto di partenza, poi decidono i playtest.
'use strict';
const path = require('path');
const SS = require(path.join(__dirname, '..', 'giochi', 'societa', 'motore.js'));
const f2 = x => (x >= 0 ? ' ' : '') + x.toFixed(2);

/* ---------- 1. Matrice del Patto ----------
   π = probabilità che il partner sia leale, q = probabilità che, se leale, completi,
   c = costo (in punti) che pago per completare il mio obbligo se sono leale.
   Δ = E[Leale] − E[Traditore] = π·q·(R − Tm) + (1 − π)·(S − P) − c                      */
console.log('1. MATRICE DEL PATTO  Δ = E[Leale] − E[Traditore] = π·q·(R−Tm) + (1−π)·(S−P) − c\n');
for (const p of SS.PRESET) {
  const { pattoLL: R, tradimento: Tm, tradito: S, doppio: P } = p.c;
  console.log(`${p.nome}: R=${R} Tm=${Tm} S=${S} P=${P}  →  Δ = ${R - Tm}·π·q ${S - P >= 0 ? '+' : '−'} ${Math.abs(S - P)}·(1−π) − c`);
  for (const c of [0, 1, 2]) {
    const riga = [0, 0.25, 0.5, 0.75, 1].map(pi => f2(pi * 1 * (R - Tm) + (1 - pi) * (S - P) - c)).join(' ');
    console.log(`   c=${c}, q=1, π = 0 .25 .5 .75 1:  Δ =${riga}`);
  }
  const dipende = (R - Tm) !== (S - P);
  console.log(dipende ? '   la convenienza dipende da quanto ti fidi del partner' : '   ATTENZIONE: con q=1 Δ non dipende da π — tradire o no è una scelta solitaria, non un dilemma');
  console.log('');
}

/* ---------- 2. In termini relativi ----------
   Conta il distacco dagli altri: u = miei punti − media dei punti degli altri N−1 (partner compreso, gli altri a 0). */
console.log('2. IN TERMINI RELATIVI (c = 0, q = 1): u = miei punti − media degli altri\n');
for (const p of SS.PRESET.slice(0, 1).concat(SS.PRESET.slice(2))) {
  const { pattoLL: R, tradimento: Tm, tradito: S, doppio: P } = p.c;
  const pay = { LL: [R, R], TL: [Tm, S], LT: [S, Tm], TT: [P, P] };
  console.log(p.nome);
  for (let N = 3; N <= 8; N++) {
    const u = k => pay[k][0] - pay[k][1] / (N - 1);
    const LL = u('LL'), TL = u('TL'), LT = u('LT'), TT = u('TT');
    const tipo = LL > TL && TT > LT ? `caccia al cervo: leale se π > ${((TT - LT) / ((LL - TL) + (TT - LT))).toFixed(2)}`
      : LL <= TL && TT >= LT ? 'dilemma del prigioniero: tradire conviene sempre' : 'lealtà sempre conveniente';
    console.log(`   N=${N}: LL ${f2(LL)}  TL ${f2(TL)}  LT ${f2(LT)}  TT ${f2(TT)}  → ${tipo}`);
  }
  console.log('');
}

/* ---------- 3. Frequenze di base con un draft casuale ----------
   Modello nullo: ogni città costruisce n carte prese a caso tra le 21 dell'Era II a 3 giocatori.
   Composizione usata (da ricordo del regolamento della 1ª edizione, DA VERIFICARE sulle carte):
   4 marroni, 3 grigie, 4 blu, 3 gialle, 3 rosse, 4 verdi. I giocatori veri non pescano a caso:
   chi segue un colore lo supera, gli altri restano sotto. */
console.log('3. DRAFT CASUALE, Era II a 3 giocatori (stima grezza)\n');
const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
const hyp = (N, K, n, k) => C(K, k) * C(N - K, n - k) / C(N, n);
for (const [col, K] of [['verdi', 4], ['blu', 4], ['rosse', 3], ['gialle', 3]]) {
  const s = [5, 6].map(n => { const p0 = hyp(21, K, n, 0), p1 = hyp(21, K, n, 1); return `n=${n}: ≥1 ${(1 - p0).toFixed(2)}, ≥2 ${(1 - p0 - p1).toFixed(2)}`; }).join('   ');
  console.log(`   ${col.padEnd(7)} ${s}`);
}
console.log('   → «almeno 1» capita quasi sempre (l’obbligo non sposta il draft), «almeno 2» circa una volta su 4–5.\n');

/* ---------- 4. Ordine di grandezza dei punti ----------
   Modello ingenuo: ogni requisito è vero con una probabilità fissa, metà dei giocatori fa un Patto
   (leale al 75%), chi può scommette, i poteri si usano a caso, le missioni riescono al 40%. */
console.log('4. PUNTI DELL’ESPANSIONE IN PARTITE SIMULATE (modello ingenuo, 20.000 partite)\n');
const PROB = { 'col:1': 0.7, 'col:2': 0.3, 'col:3': 0.1, 'stadi:1': 0.7, 'stadi:2': 0.25, 'stadi:3': 0.05, vinci: 0.35, norosse: 0.35, 'gialla+6': 0.35, 'verde+blu': 0.45, officina: 0.5, 'colori:3': 0.75, 'colori:4': 0.45, 'col:p:1': 0.6 };
const prob = a => { if (PROB[a] != null) return PROB[a]; const [k, x, y] = a.split(':'); return k === 'col' ? PROB['col:' + y] : k === 'stadi' ? PROB['stadi:' + x] : 0.4; };
let seed = 7; const R = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 2147483648 * n); };
const U = () => R(1e6) / 1e6;
for (const pr of SS.PRESET) {
  const tot = [], fonti = {};
  for (let i = 0; i < 20000; i++) {
    const n = 3 + R(5);
    let P = SS.nuovaPartita({ nomi: Array.from({ length: n }, (_, k) => 'G' + k), cfg: pr.c }, R), St = SS.stato(P);
    while (St.fase !== 'finita') {
      if (St.fase === 'era') P = SS.applica(P, { t: 'fineEra' });
      else if (St.sub === 'mercato') {
        const liberi = Array.from({ length: n }, (_, g) => g).filter(g => !SS.relazioneDi(St, St.c, g));
        if (liberi.length >= 2 && U() < 0.6) {
          const men = SS.obblighi(St.cfg), a = liberi[0], b = liberi[1 + R(liberi.length - 1)];
          P = SS.applica(P, U() < 0.75 || !St.cfg.patrocinio ? { t: 'relazione', tipo: 'patto', a, b, oa: men[R(5)], ob: men[R(5)] } : { t: 'relazione', tipo: 'patrocinio', a, b, ob: men[R(5)] });
        } else P = SS.applica(P, { t: 'urne' });
      } else if (St.sub === 'cabina') {
        const g = SS.prossimoInCabina(St), op = SS.opzioniScheda(St, g);
        const ev = { t: 'scheda', g, voto: op.decreti[R(3)], sigillo: op.sigillo && U() < 0.5, intento: op.patto ? (U() < 0.75 ? 'L' : 'T') : null, scommessa: null, potere: null };
        if (op.scommessa && U() < 0.6) ev.scommessa = { b: op.scommessa.bersagli[R(op.scommessa.bersagli.length)], a: op.scommessa.tipi[R(op.scommessa.tipi.length)] };
        if (op.potere && op.potere.ok && U() < 0.5 && (op.potere.id !== 'velo' || ev.scommessa)) {
          ev.potere = { id: op.potere.id };
          if (op.potere.id === 'cannocchiale') ev.potere.bersaglio = op.potere.bersagli[0];
          if (op.potere.id === 'veto') ev.potere.decreto = op.decreti[R(3)];
        }
        P = SS.applica(P, ev);
      } else if (St.sub === 'esito') P = SS.applica(P, { t: 'apriEra' });
      else if (St.fase === 'verifica') { const r = {}; for (const q of SS.domande(St, St.era)) if (U() < prob(q.a)) r[q.key] = true; P = SS.applica(P, { t: 'verifica', r }); }
      else if (St.fase === 'missioni') { const r = {}; for (const q of SS.domandeMissioni(St)) if (U() < 0.4) r[q.g] = true; P = SS.applica(P, { t: 'missioni', r }); }
      St = SS.stato(P);
    }
    for (const x of SS.finale(St)) { tot.push(x.punti); for (const v of x.voci) fonti[v.fonte] = (fonti[v.fonte] || 0) + v.p; }
  }
  tot.sort((a, b) => a - b);
  const m = tot.reduce((a, b) => a + b, 0) / tot.length, sd = Math.sqrt(tot.reduce((a, b) => a + (b - m) ** 2, 0) / tot.length);
  const q = p => tot[Math.floor(p * (tot.length - 1))];
  console.log(`${pr.nome}: media ${m.toFixed(1)} punti a testa, deviazione ${sd.toFixed(1)}, 10°–90° percentile ${q(0.1)}…${q(0.9)}, massimo ${tot[tot.length - 1]}`);
  console.log('   media per fonte: ' + Object.entries(fonti).map(([k, v]) => `${k} ${(v / tot.length).toFixed(2)}`).join(', '));
}
console.log('\nPer confronto: una partita normale di 7 Wonders finisce di solito sui 45–65 punti a testa.');
