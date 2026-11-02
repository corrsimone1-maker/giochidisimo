# Librerie esterne, copiate qui

Prima il poker e Claude Machine le scaricavano da jsDelivr / unpkg. Il sito sta su
`corrsimone1-maker.github.io`, lo stesso indirizzo di vistidisimo: quello che gira qui può leggere la
memoria del browser di tutti i siti di Simo su questo indirizzo (anche il token di vistidisimo). Un CDN
violato avrebbe potuto far girare codice suo sul nostro indirizzo. Copiate nella repo, cambiano solo con
un commit nostro.

| File | Pacchetto npm | Licenza | SHA-256 |
|---|---|---|---|
| `mqtt.min.js` | `mqtt@5.16.1`, `dist/mqtt.min.js` | MIT (MQTT.js contributors) | `75873d04a6400bbbac093b3602caf06f44ed92ee032925e1f4f21c03eba05a4e` |
| `qrcode.js` | `qrcode-generator@2.0.4`, `dist/qrcode.js` | MIT (Kazuhiko Arase) | `79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c` |

Sono i file del pacchetto pubblicato su npm, identici a quelli che servivano i CDN, presi con
`npm pack` (che controlla l'impronta del pacchetto). Per aggiornarli:

```bash
npm pack mqtt@<versione> qrcode-generator@<versione>
# estrai i .tgz, copia dist/mqtt.min.js e dist/qrcode.js qui, aggiorna questa tabella
sha256sum comune/lib/*.js
```

Poi prova il poker e le stanze di Claude Machine (`prove/machine.stanze.test.js`).
