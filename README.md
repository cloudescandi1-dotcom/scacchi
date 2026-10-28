# Video gioco — Scacchi

Gioco di scacchi per **telefono, PC e iPad**, fatto come web app installabile (PWA).

**© 2026 cloudescandi1-dotcom. Tutti i diritti riservati** (tranne i disegni dei pezzi, vedi sotto) — [LICENSE](LICENSE) · [privacy](docs/privacy.md).

**Gioca online:** https://cloudescandi1-dotcom.github.io/scacchi/

## Stato (27/10/2026)
- ✅ Versione 1.1 della PWA: aggiunta la modalità **Impara** e il pulsante **Suggerimento**
- ✅ Pubblicato su GitHub Pages: si aggiorna da solo a ogni `git push`
- ✅ 43 test automatici superati (regole verificate con i "perft" ufficiali, tutte le lezioni risolvibili)
- ⏳ Versione Flutter (app da store): da fare, serve prima installare Flutter

## Cosa sa fare
- Tutte le regole: scacco, scacco matto, stallo, arrocco, en passant, promozione a scelta
- Patte automatiche: stallo, triplice ripetizione, regola delle 50 mosse, materiale insufficiente
- **Due giocatori** sullo stesso dispositivo oppure **contro il computer** (5 livelli:
  Principiante, Facile, Medio, Difficile, Esperto), giocando col Bianco, col Nero o a caso
- Si muove **toccando** (pezzo, poi casa) oppure **trascinando**, con dito, mouse o penna
- Evidenzia ultima mossa, case raggiungibili e re sotto scacco
- Lista mosse in notazione italiana (R, D, T, A, C), pezzi catturati e vantaggio (+3…)
- Pulsanti: Nuova partita, Impara, Annulla mossa, Gira scacchiera, Suggerimento
- Arrocco: re sulla casa di arrivo (g1/c1) **oppure** re sulla torre
- **Modalità Impara** (23 lezioni con spiegazioni ed esercizi, i progressi restano salvati):
  - *Le basi*: scacchiera, movimento di ogni pezzo, scacco, scacco matto, arrocco,
    promozione, en passant, stallo e patta, consigli per iniziare
  - *Tattiche*: forchetta, inchiodatura, infilata
  - *Le aperture*: Italiana, Spagnola, Gambetto di Donna, Siciliana, Francese,
    Caro-Kann, difesa dal matto del barbiere (giochi le mosse, il computer risponde e ogni mossa è spiegata)
- La partita si **salva da sola**: chiudi e riapri, riprendi da dove eri
- Funziona **offline** e si può **installare** sulla schermata home

## Come provarlo sul PC
Serve Node.js (già installato). Nella cartella del progetto:

```
npm start
```

Poi apri **http://localhost:8080** nel browser. Per fermare: `Ctrl+C`.

> Funziona anche con un doppio clic su `src/index.html`, ma senza la modalità offline.

## Come provarlo sul telefono o sull'iPad
- **Per giocare subito:** con `npm start` acceso, telefono e PC sulla stessa rete Wi-Fi,
  apri sul telefono l'indirizzo "In rete" che compare all'avvio (es. `http://192.168.1.20:8080`).
  Se non si apre: su questo PC la rete Wi-Fi è impostata come "Pubblica" e il firewall
  blocca Node.js. Bisogna impostare la rete come "Privata" e consentire Node.js.
- **Per installarlo come app** (icona sulla home, offline) il sito deve essere su `https://`.
  Vedi [docs/pubblicare.md](docs/pubblicare.md).

## Test automatici
```
npm test
```

## Come è fatto (struttura)
| File | A cosa serve |
|------|--------------|
| `src/index.html` | La pagina: pulsanti, scacchiera, finestre |
| `src/style.css` | Aspetto e adattamento a schermi piccoli/grandi |
| `src/js/chess.js` | Le **regole** degli scacchi (nessuna grafica) |
| `src/js/ai.js` | Il **computer**: minimax con potatura alfa-beta |
| `src/js/worker.js` | Fa pensare il computer "a parte", senza bloccare la pagina |
| `src/js/lessons.js` | Le **lezioni** della modalità Impara (testi, posizioni, esercizi) |
| `src/js/app.js` | **Interfaccia**: disegno, tocco/trascinamento, salvataggio, lezioni |
| `src/sw.js`, `src/manifest.webmanifest` | Offline e installazione (PWA) |
| `src/pieces/` | Disegni dei pezzi |
| `src/icons/` | Icone dell'app (generate con `npm run icons` da `assets/icon.svg`) |
| `tests/` | Test automatici |
| `tools/` | Server di prova e generatore di icone |

## Diritti d'autore, crediti e privacy
- Codice, lezioni, computer avversario, interfaccia e icona: **proprietà esclusiva** del titolare,
  **tutti i diritti riservati** ([LICENSE](LICENSE)). Il codice è visibile su GitHub ma non è riutilizzabile senza permesso.
- Pezzi "cburnett" di Colin M.L. Burnett, licenza CC BY-SA 3.0 (gli stessi di Wikipedia e Lichess): restano dei loro autori.
- Privacy: nessun dato lascia il dispositivo ([docs/privacy.md](docs/privacy.md)).
