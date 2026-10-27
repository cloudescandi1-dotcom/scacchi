# Pubblicare il gioco per installarlo su telefono e iPad

Il gioco è pubblicato su **GitHub Pages** (gratis), così ha un indirizzo `https://`
che funziona ovunque e permette di installarlo come app.

## Come funziona
- Il codice sta in un repository su GitHub.
- Ogni volta che carichi modifiche sul ramo `main`, l'automazione
  `.github/workflows/pages.yml` lancia i test e, se passano, pubblica la cartella `src/`.
- Lo stato della pubblicazione si vede nella scheda **Actions** del repository.

## Aggiornare il sito dopo una modifica
Nella cartella del progetto:

```
git add -A
git commit -m "Descrivi la modifica"
git push
```

Dopo un paio di minuti il sito è aggiornato. Sul telefono, chiudi e riapri l'app
(a volte serve due volte, perché la prima volta scarica la versione nuova).

Se aggiungi o rinomini file del gioco, aggiorna l'elenco in `src/sw.js`
e cambia il numero di versione (`scacchi-v2` → `scacchi-v3`).

## Installare l'app
- **iPhone / iPad (Safari):** apri l'indirizzo → pulsante Condividi → "Aggiungi alla schermata Home"
- **Android (Chrome):** apri l'indirizzo → menu ⋮ → "Installa app" (o "Aggiungi a schermata Home")
- **PC (Chrome/Edge):** icona di installazione nella barra degli indirizzi
