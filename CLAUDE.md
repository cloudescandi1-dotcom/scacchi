# Progetto: Scacchi (telefono, PC, iPad)

Istruzioni per l'agente che lavora in questa cartella.

## Obiettivo
Un gioco di scacchi che funzioni su telefono (Android e iPhone), PC e iPad,
con un'unica base di codice.

## Tecnologia
Da confermare con l'utente prima di scrivere codice. Proposta di partenza:
- **Web app installabile (PWA)** in HTML/CSS/JavaScript (o TypeScript):
  gira nel browser di ogni dispositivo e si può "installare" sulla schermata home.
- Librerie utili: `chess.js` per le regole e la validazione delle mosse;
  in seguito eventualmente Stockfish (versione WebAssembly) per giocare contro il computer.
- Alternative da proporre se l'utente vuole un'app da store: Flutter oppure Godot.

## Regole di lavoro
- Lingua: rispondi e commenta in italiano.
- L'utente è principiante in programmazione (sa un po' di Python) e impara costruendo:
  spiega le scelte in modo semplice e procedi a piccoli passi verificabili.
- Crea le cartelle `src/`, `assets/`, `docs/` se mancano.
- Controlli touch e mouse: la scacchiera deve adattarsi a schermi piccoli e grandi.
- Aggiorna `README.md` quando cambia lo stato del progetto.

## Prime tappe suggerite
1. Scacchiera che si disegna e si adatta allo schermo.
2. Spostare i pezzi (tocco/trascinamento) con mosse valide.
3. Scacco, scaccomatto, stallo, arrocco, en passant, promozione.
4. Partita a due sullo stesso dispositivo.
5. Avversario computer con livelli di difficoltà.
6. Rendere l'app installabile (PWA) e provarla su telefono e iPad.
