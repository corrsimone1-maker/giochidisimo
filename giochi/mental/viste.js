/* =====================================================================
   MENTAL — viste dei tipi di sfida che non sono griglie: enigmi e domande con risposta
   ('risposta'), codici ('codice'), calcolatrice rotta ('calcolatrice'), travasi ('travasi').
   Si carica prima dello script della pagina e usa le sue funzioni (G, mossa, toast, esc,
   disegnaGioco, consegna…) solo quando viene chiamata, a pagina pronta.

   Ogni vista: disegna(tav, s, st, o)  la sfida nell'area centrale (o.interattivo false = solo da guardare)
               strumenti(box)          la barra in basso
               esito(s)                HTML della soluzione nella schermata dell'esito
   ===================================================================== */
'use strict';
const VISTE = {};

/* Colori dei codici: ognuno con il suo numero dentro, così non serve distinguerli a occhio */
const PALETTE = ['#3DDCA0', '#B2A7FF', '#F2B84B', '#FF6B6B', '#5DB9DE', '#E58AD0', '#9BD16B', '#ECEEFF'];
const pioloHTML = (k, stile, cl = '') => (stile === 'lucchetto'
  ? `<span class="cifra-lucchetto ${cl}">${k >= 0 ? k : ''}</span>`
  : `<span class="piolo ${cl}" style="${k >= 0 ? `background:${PALETTE[k]}` : ''}">${k >= 0 ? k + 1 : ''}</span>`);

/* ---------------- Risposta (enigmi, in fila, moneta falsa) ---------------- */
function formaDi(E, p) { return E.forma ? E.forma(p) : p.forma; }
function testoRisposta(E, p) { return E.testoHTML ? E.testoHTML(p) : `<p>${p.testo}</p>`; }
function figuraRisposta(E, p) { return E.figura ? E.figura(p) : p.figura || ''; }
function mostraValore(E, p, v) {
  const f = formaDi(E, p);
  if (f === 'parole') return v.join(' · ');
  if (f === 'ordine') return v.map(i => (E.opzioniDi ? E.opzioniDi(p) : p.opzioni)[i]).join(' → ');
  if (f === 'scelta') return p.opzioni[v];
  if (f === 'moneta') return `moneta ${v.k + 1}, pesa di ${v.h > 0 ? 'più' : 'meno'}`;
  if (f === 'tabella') return 'una tabella';
  return String(v) + (p.unita ? ' ' + p.unita : '');
}
VISTE.risposta = {
  disegna(tav, s, st, o) {
    const E = M.motori[s.gioco], p = s.p, f = formaDi(E, p), attivo = o.interattivo;
    tav.className = 'carta-enigma';
    const fig = figuraRisposta(E, p);
    let h = `<div class="enigma-testo">${testoRisposta(E, p)}</div>${fig ? `<div class="enigma-figura">${fig}</div>` : ''}`;
    if (f === 'numero' || f === 'frazione') {
      h += `<div class="display-num${st.v ? '' : ' vuoto'}">${st.v ? esc(st.v) : (f === 'frazione' ? 'a/b' : '?')}${p.unita ? `<span class="unita">${esc(p.unita)}</span>` : ''}</div>`;
    } else if (f === 'parola') {
      h += `<input class="campo-testo" id="rIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="La tua risposta" value="${esc(st.v || '')}" ${attivo ? '' : 'disabled'}>`;
    } else if (f === 'parole') {
      h += '<div class="campi">' + p.campi.map((c, i) => `<label class="campo-riga${st.giusti && st.giusti[i] ? ' giusto' : ''}"><span>${esc(c)}</span><input class="campo-testo" data-i="${i}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" value="${esc(st.v[i] || '')}" ${attivo && !(st.giusti && st.giusti[i]) ? '' : 'disabled'}></label>`).join('') + '</div>';
    } else if (f === 'ordine') {
      const op = E.opzioniDi ? E.opzioniDi(p) : p.opzioni, messi = new Set(st.v);
      h += `<div class="ordine-messo">${op.map((_, k) => (k < st.v.length ? `<button class="chip messo" data-k="${k}"><b>${k + 1}</b>${esc(op[st.v[k]])}</button>` : `<span class="chip vuoto"><b>${k + 1}</b></span>`)).join('')}</div>`;
      h += `<div class="ordine-da">${op.map((x, i) => `<button class="chip" data-i="${i}" ${messi.has(i) || !attivo ? 'disabled' : ''}>${esc(x)}</button>`).join('')}</div>`;
    } else if (f === 'scelta') {
      h += `<div class="scelte">${p.opzioni.map((x, i) => `<button class="scelta-btn${st.v === i ? ' on' : ''}" data-i="${i}" ${attivo ? '' : 'disabled'}>${esc(x)}</button>`).join('')}</div>`;
    } else if (f === 'tabella') {
      // chi è chi: una riga per persona, una colonna per categoria; si tocca la casella e poi il valore
      const cats = E.intestazioni(p), sel = G && G.s === s && attivo ? G.sel : -1;
      h += `<div class="tabella-wrap"><table class="tabella"><thead><tr><th></th>${cats.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${p.nomi.map((nm, i) => `<tr><th>${esc(nm)}</th>${cats.map((_, c) => { const v = st.v[c][i]; return `<td><button class="cella-t${sel === c * 100 + i ? ' sel' : ''}${v >= 0 ? ' piena' : ''}" data-ci="${c}" data-ri="${i}" ${attivo ? '' : 'disabled'}>${v >= 0 ? esc(E.opzioniDi(p, c)[v]) : '·'}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
      if (sel >= 0) { const c = Math.floor(sel / 100); h += `<div class="scelte-t">${E.opzioniDi(p, c).map((x, v) => `<button class="chip" data-v="${v}">${esc(x)}</button>`).join('')}<button class="chip" data-v="-1">·</button></div>`; }
    } else if (f === 'moneta') {
      h += `<div class="monete">${Array.from({ length: p.n }, (_, k) => `<button class="moneta${st.v.k === k ? ' on' : ''}" data-k="${k}" ${attivo ? '' : 'disabled'}>${k + 1}</button>`).join('')}</div>
        <div class="interr peso"><button data-h="1" aria-pressed="${st.v.h === 1}" ${attivo ? '' : 'disabled'}>Pesa di più</button><button data-h="-1" aria-pressed="${st.v.h === -1}" ${attivo ? '' : 'disabled'}>Pesa di meno</button></div>`;
    }
    if (st.prove && st.prove.length && f !== 'parole' && f !== 'tabella') h += `<div class="gia">Già consegnate, sbagliate: ${st.prove.map(x => `<b>${esc(x)}</b>`).join(' · ')}</div>`;
    tav.innerHTML = h;
    if (!attivo) return;
    // eventi
    const salvaTesto = () => { salvaPar(); aggiornaConsegna(); };
    if (f === 'parola') { const el = $('rIn'); el.oninput = () => { G.P.st.v = el.value; salvaTesto(); }; el.onkeydown = e => { if (e.key === 'Enter') { el.blur(); consegna(); } }; }
    if (f === 'parole') tav.querySelectorAll('input[data-i]').forEach(el => {
      el.oninput = () => { G.P.st.v[+el.dataset.i] = el.value; salvaTesto(); };
      el.onkeydown = e => { if (e.key !== 'Enter') return; const dopo = tav.querySelector(`input[data-i="${+el.dataset.i + 1}"]:not([disabled])`); if (dopo) dopo.focus(); else { el.blur(); consegna(); } };
    });
    if (f === 'ordine') {
      tav.querySelectorAll('.ordine-da .chip').forEach(b => { b.onclick = () => mossa(st2 => { if (!st2.v.includes(+b.dataset.i)) st2.v.push(+b.dataset.i); }); });
      tav.querySelectorAll('.ordine-messo .messo').forEach(b => { b.onclick = () => mossa(st2 => { st2.v.splice(+b.dataset.k, 1); }); });
    }
    if (f === 'scelta') tav.querySelectorAll('.scelta-btn').forEach(b => { b.onclick = () => mossa(st2 => { st2.v = +b.dataset.i; }); });
    if (f === 'tabella') {
      // un secondo tocco sulla casella scelta la lascia; ma se ci si è arrivati da soli (dopo aver messo un valore) la tiene
      tav.querySelectorAll('.cella-t').forEach(b => { b.onclick = () => { const k = +b.dataset.ci * 100 + +b.dataset.ri; G.sel = G.sel === k && !G.selAuto ? -1 : k; G.selAuto = false; disegnaGioco(); }; });
      tav.querySelectorAll('.scelte-t .chip').forEach(b => {
        b.onclick = () => {
          const c = Math.floor(G.sel / 100), i = G.sel % 100, v = +b.dataset.v;
          mossa(st2 => { if (v >= 0) st2.v[c] = st2.v[c].map(x => (x === v ? -1 : x)); st2.v[c][i] = v; });
          // si passa alla prossima casella vuota della stessa colonna
          const prossima = G.P.st.v[c].findIndex(x => x < 0);
          G.sel = v >= 0 && prossima >= 0 ? c * 100 + prossima : -1; G.selAuto = G.sel >= 0;
          disegnaGioco();
        };
      });
    }
    if (f === 'moneta') {
      tav.querySelectorAll('.moneta').forEach(b => { b.onclick = () => mossa(st2 => { st2.v = Object.assign({}, st2.v, { k: +b.dataset.k }); }); });
      tav.querySelectorAll('.peso button').forEach(b => { b.onclick = () => mossa(st2 => { st2.v = Object.assign({}, st2.v, { h: +b.dataset.h }); }); });
    }
  },
  strumenti(box) {
    const E = G.E, f = formaDi(E, G.s.p);
    let h = '';
    if (f === 'numero' || f === 'frazione') {
      const tasti = ['1', '2', '3', '4', '5', '6', '⌫', '7', '8', '9', '0', ',', f === 'frazione' ? '/' : '−', f === 'frazione' ? '−' : ''];
      h += `<div class="tastierino tastiera-num">${tasti.map(t => (t ? `<button class="tasto" data-t="${t}">${t}</button>` : '<span></span>')).join('')}</div>`;
    }
    h += `<div class="contatore" id="sPen"></div><div class="barra">${f === 'ordine' ? `<button class="stru" id="sAnn">${ICO.annulla}Annulla</button>` : ''}<button class="stru menta" id="sConsegna">Consegna</button></div>`;
    box.innerHTML = h;
    box.querySelectorAll('.tastiera-num .tasto').forEach(b => { b.onclick = () => tastoNumero(b.dataset.t); });
    if ($('sAnn')) $('sAnn').onclick = annulla;
    $('sConsegna').onclick = consegna;
  },
  esito(s) {
    const E = M.motori[s.gioco], sol = E.soluzione(s.p), fig = figuraRisposta(E, s.p);
    let risposta = `<div class="risposta-giusta"><span>La risposta</span><b>${esc(sol.risposta)}</b></div>`;
    if (sol.tabella) {
      const p = s.p, cats = E.intestazioni(p);
      risposta = `<div class="risposta-giusta"><span>Chi ha cosa</span><div class="tabella-wrap"><table class="tabella"><thead><tr><th></th>${cats.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${p.nomi.map((nm, i) => `<tr><th>${esc(nm)}</th>${cats.map((_, c) => `<td><span class="cella-t piena">${esc(E.opzioniDi(p, c)[sol.tabella[c + 1][i]])}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    }
    return `<div class="enigma-testo">${testoRisposta(E, s.p)}</div>${fig ? `<div class="enigma-figura">${fig}</div>` : ''}${risposta}${sol.spiegazione ? `<div class="spiegazione">${sol.spiegazione}</div>` : ''}`;
  }
};
function tastoNumero(t) {
  if (!G || fermo()) return;
  mossa(st => {
    let v = String(st.v || '');
    if (t === '⌫') v = v.slice(0, -1);
    else if (t === '−') v = v.startsWith('-') ? v.slice(1) : '-' + v;
    else if (t === ',') { const ultimo = v.split('/').pop(); if (!ultimo.includes(',')) v += (ultimo === '' || ultimo === '-' ? '0,' : ','); }
    else if (t === '/') { if (v && !v.includes('/') && /\d$/.test(v)) v += '/'; }
    else if (v.replace(/\D/g, '').length < 12) v += t;
    st.v = v;
  });
}
function aggiornaConsegna() {
  if (!G || !$('sConsegna')) return;
  const E = G.E, vuota = E.vuota ? E.vuota(G.s.p, G.P.st.v) : false;
  $('sConsegna').disabled = G.P.finito != null || vuota;
  if ($('sPen')) {
    const c = G.prova ? (G.P.consegne || 0) : (G.r.consegne || 0);
    $('sPen').innerHTML = c ? `Consegne sbagliate <b>${c}</b> · +${c} min` : 'Ogni consegna sbagliata aggiunge un minuto';
  }
}

/* ---------------- Codice (lucchetto o colori) ---------------- */
VISTE.codice = {
  disegna(tav, s, st, o) {
    const E = M.motori.codice, p = s.p;
    tav.className = 'carta-enigma';
    const righe = p.prove.map(x => `<div class="prova-codice"><div class="simboli">${x.c.map(k => pioloHTML(k, p.stile)).join('')}</div>
      <div class="esito-prova">${p.stile === 'lucchetto' ? esc(E.aParole(x.n, x.b)) : `<span class="pallini">${'●'.repeat(x.n)}${'○'.repeat(x.b)}${x.n + x.b ? '' : '—'}</span><small>${x.n} ● · ${x.b} ○</small>`}</div></div>`).join('');
    const intro = p.stile === 'lucchetto'
      ? `<p>Un lucchetto a combinazione: <b>${p.L} cifre tutte diverse</b>. Ecco qualche tentativo e cosa ne sappiamo.</p>`
      : `<p>Un codice di <b>${p.L} colori</b> (scelti tra ${p.K}, anche ripetuti). Per ogni tentativo: <b>●</b> giusto al posto giusto, <b>○</b> giusto ma al posto sbagliato.</p>`;
    tav.innerHTML = `<div class="enigma-testo">${intro}</div><div class="prove-codice">${righe}</div>
      ${st.prove && st.prove.length ? `<div class="gia">Già consegnati, sbagliati: ${st.prove.map(x => `<b>${esc(x)}</b>`).join(' · ')}</div>` : ''}`;
  },
  strumenti(box) {
    const p = G.s.p, st = G.P.st;
    if (G.sel == null || G.sel < 0 || G.sel >= p.L) G.sel = Math.max(0, st.v.indexOf(-1));
    const conf = new Set(M.motori.codice.conflitti(p, st));
    box.innerHTML = `<div class="risposta-codice">${st.v.map((k, i) => `<button class="slot${i === G.sel ? ' sel' : ''}${conf.has(i) ? ' errore' : ''}" data-i="${i}">${pioloHTML(k, p.stile)}</button>`).join('')}</div>
      <div class="tavolozza">${Array.from({ length: p.K }, (_, k) => `<button class="tasto colore" data-k="${k}">${pioloHTML(k, p.stile)}</button>`).join('')}<button class="tasto colore" data-k="-1">⌫</button></div>
      <div class="contatore" id="sPen"></div><div class="barra"><button class="stru menta" id="sConsegna">Consegna</button></div>`;
    box.querySelectorAll('.slot').forEach(b => { b.onclick = () => { G.sel = +b.dataset.i; disegnaStrumenti(); }; });
    box.querySelectorAll('.colore').forEach(b => {
      b.onclick = () => {
        if (fermo()) return;
        const k = +b.dataset.k, i = G.sel;
        mossa(st2 => { st2.v[i] = k; });
        if (k >= 0) { const prossimo = G.P.st.v.findIndex((x, j) => j > i && x < 0); G.sel = prossimo >= 0 ? prossimo : Math.min(i + 1, p.L - 1); }
        disegnaStrumenti();
      };
    });
    $('sConsegna').onclick = consegna;
  },
  esito(s) {
    const sol = M.motori.codice.soluzione(s.p);
    return `<div class="risposta-giusta"><span>${s.p.stile === 'lucchetto' ? 'La combinazione' : 'Il codice'}</span><div class="simboli grandi">${sol.codice.map(k => pioloHTML(k, s.p.stile)).join('')}</div></div>
      <div class="spiegazione">Ogni tentativo serviva: togliendone uno qualsiasi, i codici possibili sarebbero più di uno.</div>`;
  }
};

/* ---------------- Calcolatrice rotta ---------------- */
VISTE.calcolatrice = {
  disegna(tav, s, st, o) {
    const E = M.motori.calcolatrice, p = s.p, rimaste = p.mosse - st.seq.length, fatto = st.v === p.a;
    tav.className = 'calcolatrice';
    const spieg = p.tasti.map(t => [E.etichetta(t), E.spiegaTasto(t)]).filter(x => x[1]);
    tav.innerHTML = `<div class="calc-obiettivo">Arriva a <b>${p.a}</b> in al massimo <b>${p.mosse}</b> mosse</div>
      <div class="calc-display${fatto ? ' fatto' : ''}"><small>${st.seq.length ? st.seq.map(i => E.etichetta(p.tasti[i])).join(' ') : 'parti da ' + p.da}</small><span>${st.v}</span></div>
      <div class="calc-mosse">${Array.from({ length: p.mosse }, (_, k) => `<i class="${k < st.seq.length ? 'usata' : ''}"></i>`).join('')}<span>${rimaste > 0 ? (rimaste === 1 ? 'resta 1 mossa' : `restano ${rimaste} mosse`) : fatto ? 'fatto!' : 'mosse finite: annulla o ricomincia'}</span></div>
      <div class="calc-tasti">${p.tasti.map((t, i) => `<button class="calc-tasto" data-i="${i}" ${o.interattivo && rimaste > 0 && !fatto ? '' : 'disabled'}>${esc(E.etichetta(t))}</button>`).join('')}</div>
      ${spieg.length ? `<div class="calc-legenda">${spieg.map(([a, b]) => `<span><b>${esc(a)}</b> ${esc(b)}</span>`).join('')}</div>` : ''}`;
    if (!o.interattivo) return;
    tav.querySelectorAll('.calc-tasto').forEach(b => {
      b.onclick = () => {
        const i = +b.dataset.i, x = E.premi(G.P.st.v, p.tasti[i]);
        if (x == null) { toast('Questo tasto ora non fa niente'); return; }
        mossa(st2 => { st2.v = x; st2.seq.push(i); });
      };
    });
  },
  strumenti(box) {
    box.innerHTML = `<div class="barra"><button class="stru" id="sAnn">${ICO.annulla}Annulla</button><button class="stru hold" id="sRic"><i class="fill"></i><span>Tieni premuto: ricomincia</span></button></div>`;
    $('sAnn').onclick = annulla;
    tieniPremuto($('sRic'), ricomincia, 600);
  },
  esito(s) {
    const E = M.motori.calcolatrice, p = s.p, seq = E.strada(p);
    let v = p.da; const passi = seq.map(i => { const a = v; v = E.premi(v, p.tasti[i]); return `${a} <b>${esc(E.etichetta(p.tasti[i]))}</b> ${v}`; });
    return `<div class="risposta-giusta"><span>Una strada in ${p.mosse} mosse</span></div><ol class="passi">${passi.map(x => `<li>${x}</li>`).join('')}</ol>`;
  }
};

/* ---------------- Travasi ---------------- */
VISTE.travasi = {
  disegna(tav, s, st, o) {
    const E = M.motori.travasi, p = s.p, rimaste = p.mosse - st.seq.length, fatto = st.v.includes(p.obiettivo), max = Math.max(...p.cap);
    tav.className = 'travasi';
    const sel = G && G.s === s ? G.sel : -1;
    tav.innerHTML = `<div class="calc-obiettivo">Ottieni <b>${p.obiettivo} litri</b> in una brocca, in al massimo <b>${p.mosse}</b> mosse${p.fontana ? '' : '<br><small>Niente fontana: l’acqua è solo quella che c’è.</small>'}</div>
      <div class="brocche">${p.cap.map((c, i) => `<div class="brocca-col"><button class="brocca${i === sel ? ' sel' : ''}${st.v[i] === p.obiettivo ? ' giusta' : ''}" data-i="${i}" style="height:${Math.round(70 + 150 * c / max)}px" ${o.interattivo ? '' : 'disabled'}>
          <i class="acqua" style="height:${(100 * st.v[i] / c).toFixed(1)}%"></i><span>${st.v[i]}</span></button><div class="brocca-cap">${c} litri</div>
          ${p.fontana && o.interattivo ? `<div class="brocca-azioni"><button class="mini-btn" data-r="${i}" ${st.v[i] < c && rimaste > 0 && !fatto ? '' : 'disabled'}>Riempi</button><button class="mini-btn" data-s="${i}" ${st.v[i] > 0 && rimaste > 0 && !fatto ? '' : 'disabled'}>Vuota</button></div>` : ''}</div>`).join('')}</div>
      <div class="calc-mosse">${Array.from({ length: p.mosse }, (_, k) => `<i class="${k < st.seq.length ? 'usata' : ''}"></i>`).join('')}<span>${rimaste > 0 ? (fatto ? 'fatto!' : sel >= 0 ? 'ora tocca la brocca in cui versare' : 'tocca una brocca per versarla in un’altra') : fatto ? 'fatto!' : 'mosse finite: annulla o ricomincia'}</span></div>
      ${st.seq.length ? `<div class="calc-legenda">${st.seq.map((m, k) => `<span>${k + 1}. ${esc(E.testoMossa(p, m))}</span>`).join('')}</div>` : ''}`;
    if (!o.interattivo) return;
    const fai = m => { if (!G.P.st.v.includes(p.obiettivo) && G.P.st.seq.length < p.mosse) mossa(st2 => { const w = E.applica(p, st2.v, m); if (w) { st2.v = w; st2.seq.push(m); } }); };
    tav.querySelectorAll('.brocca').forEach(b => {
      b.onclick = () => {
        const i = +b.dataset.i;
        if (G.sel == null || G.sel < 0) { if (G.P.st.v[i] === 0) { toast('Questa brocca è vuota'); return; } G.sel = i; disegnaGioco(); return; }
        if (G.sel === i) { G.sel = -1; disegnaGioco(); return; }
        const da = G.sel; G.sel = -1;
        if (G.P.st.v[i] >= p.cap[i]) { toast('Quella brocca è già piena'); disegnaGioco(); return; }
        fai({ t: 'versa', i: da, j: i }); disegnaGioco();
      };
    });
    tav.querySelectorAll('[data-r]').forEach(b => { b.onclick = () => { G.sel = -1; fai({ t: 'riempi', i: +b.dataset.r }); }; });
    tav.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { G.sel = -1; fai({ t: 'svuota', i: +b.dataset.s }); }; });
  },
  strumenti(box) { VISTE.calcolatrice.strumenti(box); },
  esito(s) {
    const E = M.motori.travasi, p = s.p, seq = E.bfs(p).seq;
    let v = p.ini.slice();
    const passi = seq.map(m => { v = E.applica(p, v, m); return `${esc(E.testoMossa(p, m))} → <b>${v.join(' · ')}</b>`; });
    return `<div class="risposta-giusta"><span>Una soluzione in ${p.mosse} mosse</span></div><ol class="passi">${passi.map(x => `<li>${x}</li>`).join('')}</ol>
      <div class="spiegazione">Le brocche, in ordine: ${p.cap.map(c => c + ' litri').join(', ')}.</div>`;
  }
};
