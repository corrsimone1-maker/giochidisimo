# Traccia: soluzioni

Una scheda per area (le immagini `01_frecce.png` … `14_segreto.png`), con la soluzione di tutte le 83 tavole come si
vede nell'app. Le tavole con la stella hanno una foto per ogni soluzione.

- I labirinti senza simboli (`c1`, `m1`, `sf1`, `t1`, `k1`, `r1`, `bt1`) accettano qualunque linea: nella scheda ce n'è una sola, a titolo di esempio.
- `soluzioni.json`: le stesse soluzioni come stringhe di direzioni `U D L R` dal cerchio, nel formato salvato dall'app in `gds-traccia-storico`.
  Per i labirinti con tante linee è riportata solo la prima.
- Calcolate il 13 novembre 2026 col motore (`giochi/traccia/motore.js`) sulle tavole di quel giorno: se una tavola cambia, vanno rifatte.
