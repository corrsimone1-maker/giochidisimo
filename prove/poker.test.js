// Prove del cuore del poker (logica e replica), senza browser e senza rete.
// Uso, dalla cartella della repo:  node prove/poker.test.js
// Carica il blocco tra 'use strict' e CORE-END di giochi/poker/index.html e simula i server MQTT.
const fs = require('fs'), vm = require('vm'), path = require('path');
function carica(file) {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf("'use strict';"), b = html.indexOf('/* CORE-END */');
  const src = html.slice(a, b) + '\n;({SV,HMAX,LMAX,AMAX,TTL,rid,clone,newGame,applyAction,better,same,validState,Sync,GameError,chipsOnTable,P,potOf});';
  const ctx = vm.createContext({ globalThis: { crypto: require('crypto').webcrypto, setTimeout, clearTimeout }, Date, Math, JSON, Error, Map, Set, Array, Object, String, Number, Uint8Array });
  return vm.runInContext(src, ctx);
}
const assert = require('assert');
const C = carica(process.argv[2] || path.join(__dirname, '..', 'giochi', 'poker', 'index.html'));
let ok = 0; const prova = (nome, f) => { f(); ok++; console.log('ok  ', nome); };
const somma = s => s.players.reduce((a, p) => a + p.stack, 0);
let aid = 0; const A = (s, a) => C.applyAction(s, { aid: 'a' + (++aid), t: 1000 + aid, ...a });

function partita(n = 4) {
  let s = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'W0', pid: 'p0', name: 'P0', start: 1000, sb: 5, bb: 10, t: 1 });
  for (let i = 1; i < n; i++) s = A(s, { type: 'join', by: 'p' + i, name: 'P' + i });
  return A(s, { type: 'start', by: 'p0' });
}

/* ---------- riduttore ---------- */
prova('chiusura a mano in corso: puntate restituite, fiches conservate, stato minimo', () => {
  let s = partita(4);
  s = A(s, { type: 'bet', by: s.players.find(p => p.inHand && !p.put).id, amount: 50, hand: s.hand });
  const prima = C.chipsOnTable(s);
  const c = A(s, { type: 'close', by: 'p2' });
  assert.equal(c.phase, 'closed');
  assert.equal(somma(c), prima, 'le fiches totali non cambiano');
  assert.ok(c.players.every(p => p.put === 0 && p.rem === 0 && !p.inHand));
  assert.deepEqual(c.hist, []); assert.equal(c.log.length, 1); assert.equal(c.aids.length, 1);
  assert.equal(c.closed.by, 'P2'); assert.equal(c.closed.byId, 'p2');
  assert.ok(C.validState(c, 'ABCDE'));
  assert.ok(JSON.stringify(c).length < 1500, 'pochi byte: ' + JSON.stringify(c).length);
});

prova('chiusura durante lo showdown con piatto laterale già in parte assegnato', () => {
  let s = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'W0', pid: 'p0', name: 'P0', start: 100, t: 1 });
  s = A(s, { type: 'join', by: 'p1', name: 'P1' }); s = A(s, { type: 'join', by: 'p2', name: 'P2' });
  s = A(s, { type: 'setstack', by: 'p0', target: 'p0', value: 50 });
  s = A(s, { type: 'start', by: 'p0' });
  for (const id of ['p0', 'p1', 'p2']) s = A(s, { type: 'bet', by: id, amount: Math.min(100, C.P(s, id).stack), hand: s.hand });
  s = A(s, { type: 'end', by: 'p0', hand: s.hand });
  s = A(s, { type: 'win', winners: ['p0'], by: 'p0', hand: s.hand });     // p0 prende il piatto principale, resta il laterale
  assert.equal(s.phase, 'showdown');
  const prima = C.chipsOnTable(s);
  const c = A(s, { type: 'close', by: 'p1' });
  assert.equal(somma(c), prima);
});

prova('dopo la chiusura ogni azione fallisce in silenzio (anche annulla e chiudi di nuovo)', () => {
  const c = A(partita(3), { type: 'close', by: 'p0' });
  for (const a of [{ type: 'start', by: 'p0' }, { type: 'undo', by: 'p0', target: 'x' }, { type: 'close', by: 'p1' }, { type: 'join', by: 'p9', name: 'Nuovo' }, { type: 'reset', by: 'p0', start: 5 }]) {
    assert.throws(() => A(c, a), e => e instanceof C.GameError && e.quiet && /chiuso/.test(e.message));
  }
});

prova('chi non è seduto non può chiudere', () => {
  assert.throws(() => A(partita(3), { type: 'close', by: 'estraneo' }), /seduto/);
});

/* ---------- ordine tra stati ---------- */
prova('un tavolo chiuso vince su ogni stato aperto della stessa partita', () => {
  const s = partita(3);
  const c = { ...A(s, { type: 'close', by: 'p0' }), ver: 5, w: 'A' };
  const aperto = { ...s, ver: 999, w: 'Z' };
  assert.ok(C.better(c, aperto)); assert.ok(!C.better(aperto, c));
  const c2 = { ...c, ver: 6 };
  assert.ok(C.better(c2, c) && !C.better(c, c2));
  const altra = { ...s, gid: 'G2', created: s.created + 1, ver: 1 };   // partita più nuova con lo stesso codice
  assert.ok(C.better(altra, c));
});

/* ---------- replica con server simulati ---------- */
function mondo() {
  let ora = 0; const coda = [];
  const timers = { setTimeout: (f, ms) => { coda.push({ at: ora + ms, f }); return coda.length; } };
  const gira = (fino = Infinity) => { for (;;) { coda.sort((a, b) => a.at - b.at); const e = coda[0]; if (!e || e.at > fino) break; coda.shift(); ora = e.at; e.f(); } if (fino !== Infinity) ora = Math.max(ora, fino); };
  const brokers = {};
  const broker = nome => brokers[nome] || (brokers[nome] = { nome, up: true, retained: null, subs: new Set() });
  function link(dev, nome) {
    const b = broker(nome);
    const l = { connected: false, onMessage: null, onConnect: null, dev, b };
    l.publish = str => { if (!l.connected || !b.up) return; timers.setTimeout(() => { if (!b.up) return; b.retained = str; for (const x of b.subs) if (x.connected) timers.setTimeout(() => x.connected && x.onMessage(str), 20); }, 20); };
    l.connect = () => { if (!b.up) return; l.connected = true; b.subs.add(l); if (b.retained) { const r = b.retained; timers.setTimeout(() => l.connected && l.onMessage(r), 30); } l.onConnect && l.onConnect(); };
    l.drop = () => { l.connected = false; b.subs.delete(l); };
    return l;
  }
  function device(id, nomi, initial = null) {
    const d = { id, changes: [], rejects: [] };
    d.sync = new C.Sync({ code: 'ABCDE', wid: 'W' + id, initial, now: () => ora, timers,
      onChange: s => d.changes.push(s), onReject: (a, msg, e) => d.rejects.push({ a, msg, quiet: e && e.quiet }) });
    d.links = nomi.map(n => link(d, n)); d.links.forEach(l => d.sync.addLink(l));
    return d;
  }
  return { device, broker, brokers, gira, get ora() { return ora; } };
}
const statoDi = b => b.retained && JSON.parse(b.retained);

prova('telefono addormentato durante la chiusura: al risveglio si chiude anche lui e non riapre il tavolo', () => {
  const M = mondo();
  const s0 = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'WA', pid: 'pA', name: 'A', start: 1000, t: 0 });
  const a = M.device('A', ['b1', 'b2', 'b3'], s0); a.links.forEach(l => l.connect()); M.gira();
  const b = M.device('B', ['b1', 'b2', 'b3']); b.links.forEach(l => l.connect()); M.gira();
  const c = M.device('C', ['b1', 'b2', 'b3']); c.links.forEach(l => l.connect()); M.gira();
  b.sync.dispatch({ type: 'join', by: 'pB', name: 'B' }); M.gira();
  c.sync.dispatch({ type: 'join', by: 'pC', name: 'C' }); M.gira();
  a.sync.dispatch({ type: 'start', by: 'pA' }); M.gira();
  b.links.forEach(l => l.drop());                                         // B si addormenta
  const hand = b.sync.cur.hand;
  const cur = b.sync.cur, pB = C.P(cur, 'pB');
  if (pB.inHand && cur.phase === 'betting') b.sync.dispatch({ type: 'bet', by: 'pB', amount: 30, hand });   // mossa fatta offline
  a.sync.dispatch({ type: 'close', by: 'pA' }); M.gira();
  assert.equal(c.sync.cur.phase, 'closed');
  for (const n of ['b1', 'b2', 'b3']) assert.equal(statoDi(M.broker(n)).phase, 'closed', n);
  b.links.forEach(l => l.connect()); M.gira();                            // B si risveglia
  assert.equal(b.sync.cur.phase, 'closed');
  for (const n of ['b1', 'b2', 'b3']) assert.equal(statoDi(M.broker(n)).phase, 'closed', 'dopo il risveglio ' + n);
  assert.ok(b.rejects.every(r => r.quiet), 'nessun avviso rumoroso');
  assert.ok(JSON.stringify(statoDi(M.broker('b1'))).length < 1500);
});

prova('chi ha chiuso se ne è andato e un telefono si risveglia con più mosse offline: il tavolo resta chiuso', () => {
  const M = mondo();
  const s0 = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'WA', pid: 'pA', name: 'A', start: 1000, t: 0 });
  const a = M.device('A', ['b1', 'b2'], s0); a.links.forEach(l => l.connect()); M.gira();
  const b = M.device('B', ['b1', 'b2']); b.links.forEach(l => l.connect()); M.gira();
  b.sync.dispatch({ type: 'join', by: 'pB', name: 'B' }); M.gira();
  b.links.forEach(l => l.drop());                                         // B offline
  for (const nm of ['B1', 'B2', 'B3']) b.sync.dispatch({ type: 'join', by: 'pB', name: nm });   // tre mosse: versione più alta
  a.sync.dispatch({ type: 'close', by: 'pA' }); M.gira();
  a.links.forEach(l => l.drop());                                         // A chiude la pagina
  assert.ok(b.sync.cur.ver > JSON.parse(M.broker('b1').retained).ver, 'B è avanti di versione');
  b.links.forEach(l => l.connect()); M.gira();
  assert.equal(b.sync.cur.phase, 'closed');
  for (const n of ['b1', 'b2']) assert.equal(statoDi(M.broker(n)).phase, 'closed', n);
});

prova('server rimasto indietro: chi riceve la chiusura la porta anche lì', () => {
  const M = mondo();
  const s0 = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'WA', pid: 'pA', name: 'A', start: 1000, t: 0 });
  const a = M.device('A', ['b1', 'b3'], s0); a.links.forEach(l => l.connect()); M.gira();
  const c = M.device('C', ['b1', 'b3']); c.links.forEach(l => l.connect()); M.gira();
  c.sync.dispatch({ type: 'join', by: 'pC', name: 'C' }); M.gira();
  assert.equal(statoDi(M.broker('b3')).players.length, 2);
  a.links[1].drop();                                                     // A perde il server b3
  a.sync.dispatch({ type: 'close', by: 'pA' }); M.gira();
  assert.equal(c.sync.cur.phase, 'closed');
  assert.equal(statoDi(M.broker('b3')).phase, 'closed', 'C ha aggiornato b3');
});

prova('server spento durante la chiusura e riacceso dopo: il primo che passa lo sistema', () => {
  const M = mondo();
  const s0 = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'WA', pid: 'pA', name: 'A', start: 1000, t: 0 });
  const a = M.device('A', ['b1', 'b2'], s0); a.links.forEach(l => l.connect()); M.gira();
  a.sync.dispatch({ type: 'join', by: 'pA', name: 'Anna' }); M.gira();   // cambio nome: b2 tiene uno stato aperto
  M.broker('b2').up = false; a.links[1].drop();
  a.sync.dispatch({ type: 'close', by: 'pA' }); M.gira();
  assert.equal(statoDi(M.broker('b2')).phase, 'lobby');
  M.broker('b2').up = true;
  const n = M.device('N', ['b1', 'b2']); n.links.forEach(l => l.connect()); M.gira();   // qualcuno riapre il codice
  assert.equal(n.sync.cur.phase, 'closed');
  assert.equal(statoDi(M.broker('b2')).phase, 'closed');
});

prova('chiusura e mossa nello stesso istante: vince la chiusura ovunque', () => {
  for (let giro = 0; giro < 50; giro++) {
    const M = mondo();
    const s0 = C.newGame({ code: 'ABCDE', gid: 'G1', wid: 'WA', pid: 'pA', name: 'A', start: 1000, t: 0 });
    const a = M.device('A', ['b1', 'b2', 'b3'], s0); a.links.forEach(l => l.connect()); M.gira();
    const z = M.device('Z', ['b1', 'b2', 'b3']); z.links.forEach(l => l.connect()); M.gira();
    z.sync.dispatch({ type: 'join', by: 'pZ', name: 'Z' }); M.gira();
    a.sync.dispatch({ type: 'start', by: 'pA' }); M.gira();
    const h = a.sync.cur.hand;
    a.sync.dispatch({ type: 'close', by: 'pA' });                        // stessa versione, scrittore «più grande» per Z
    try { z.sync.dispatch({ type: 'check', by: 'pZ', hand: h }); } catch (e) { z.sync.dispatch({ type: 'fold', by: 'pZ', hand: h }); }
    M.gira();
    assert.equal(a.sync.cur.phase, 'closed'); assert.equal(z.sync.cur.phase, 'closed');
    for (const n of ['b1', 'b2', 'b3']) assert.equal(statoDi(M.broker(n)).phase, 'closed');
    assert.equal(somma(a.sync.cur), 2000);
  }
});

console.log(`\n${ok} prove superate`);
