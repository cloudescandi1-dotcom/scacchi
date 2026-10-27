/*
 * lessons.js — le LEZIONI della modalità "Impara".
 *
 * Ogni lezione ha un titolo e una lista di passi (steps). Ogni passo ha:
 *   text:   la spiegazione mostrata accanto alla scacchiera
 *   fen:    la posizione (se manca: posizione iniziale)
 *   goal:   cosa deve fare il giocatore (se manca: è solo da leggere)
 *     'reach'      porta il pezzo su tutte le stelle (stars), con quante mosse vuoi
 *     'captureAll' mangia tutti i pezzi neri (il Nero sta fermo)
 *     'move'       gioca una delle mosse in answer (es. 'e2e4' = da e2 a e4)
 *     'check'      dai scacco
 *     'mate'       dai scacco matto
 *   answer: mosse giuste (usate anche dal pulsante Suggerimento)
 *   hint:   testo del suggerimento
 *   wrong:  messaggio se la mossa è sbagliata
 *   last:   ultima mossa da evidenziare, es. ['d7', 'd5']
 *   action: 'play' = il pulsante finale avvia una partita contro il computer
 *
 * Per le aperture e le tattiche c'è anche:
 *     'line'       segui una sequenza di mosse (line); tu giochi il colore `side`,
 *                  il computer gioca le altre. comments[i] spiega la mossa numero i.
 */
(function (root) {
  'use strict';

  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const LESSONS = [
    {
      title: 'La scacchiera',
      steps: [
        { fen: START, text: 'Gli scacchi si giocano in due: Bianco e Nero. La scacchiera ha 64 case, chiare e scure. Le colonne hanno le lettere da a a h, le righe (traverse) i numeri da 1 a 8: così ogni casa ha un nome, per esempio e4. Il Bianco muove sempre per primo, poi si fa una mossa a testa.' },
        { fen: START, text: 'Lo scopo è dare SCACCO MATTO al re avversario: attaccarlo in modo che non possa più salvarsi. Ogni pezzo ha un valore indicativo: pedone 1, cavallo 3, alfiere 3, torre 5, donna 9. Il re non ha prezzo: se subisci scacco matto hai perso.' },
        { fen: START, text: 'Per muovere: tocca (o clicca) un tuo pezzo; compaiono dei puntini sulle case dove può andare; poi tocca la casa che vuoi. Puoi anche trascinare il pezzo. Premi «Avanti» per cominciare con la torre.' },
      ],
    },
    {
      title: 'La torre',
      steps: [
        { fen: '7k/8/8/8/8/8/8/R6K w - - 0 1', goal: 'reach', stars: ['a7'],
          text: 'La torre si muove in linea retta, in orizzontale o in verticale, di quante case vuoi. Non può saltare gli altri pezzi. Portala sulla stella ★.',
          hint: 'Tocca la torre in a1: i puntini mostrano dove può andare. La stella è nella stessa colonna.' },
        { fen: '7k/8/8/8/8/8/8/R6K w - - 0 1', goal: 'reach', stars: ['c4', 'c7', 'g7'],
          text: 'Raccogli tutte le stelle, nell\'ordine che vuoi. Puoi usare più mosse.',
          hint: 'Per esempio: prima in c1, poi su in c4, poi c7, poi a destra fino a g7.' },
        { fen: '7k/8/8/1p2p3/8/8/8/R6K w - - 0 1', goal: 'captureAll',
          text: 'Per catturare (mangiare) un pezzo nemico ci si muove sulla sua casa e lo si toglie dalla scacchiera. Mangia tutti i pedoni neri con la torre.',
          hint: 'Sali in a5: da lì la torre vede il pedone in b5, e poi quello in e5.' },
      ],
    },
    {
      title: 'L\'alfiere',
      steps: [
        { fen: '7k/8/8/8/8/8/8/2B4K w - - 0 1', goal: 'reach', stars: ['h6'],
          text: 'L\'alfiere si muove in diagonale, di quante case vuoi. Per questo resta sempre sulle case dello stesso colore. Portalo sulla stella.',
          hint: 'Dalla casa c1 la diagonale verso destra arriva fino in h6.' },
        { fen: '7k/8/8/8/8/8/8/2B4K w - - 0 1', goal: 'reach', stars: ['a3', 'c5', 'f8'],
          text: 'Raccogli tutte le stelle con l\'alfiere.',
          hint: 'Prova l\'ordine: a3, poi c5, poi f8.' },
      ],
    },
    {
      title: 'La donna',
      steps: [
        { fen: '6k1/8/8/8/8/8/8/3Q3K w - - 0 1', goal: 'reach', stars: ['d6', 'a3', 'h3'],
          text: 'La donna (o regina) è il pezzo più forte: si muove come la torre e come l\'alfiere insieme, in tutte le direzioni. Raccogli le stelle.',
          hint: 'Prova: d6 (dritto in su), poi a3 (in diagonale), poi h3 (in orizzontale).' },
        { fen: '5b1k/8/3n4/8/1p6/8/8/3Q3K w - - 0 1', goal: 'captureAll',
          text: 'Mangia tutti i pezzi neri con la donna. Scegli bene l\'ordine!',
          hint: 'Prima il cavallo in d6, poi il pedone in b4, infine l\'alfiere in f8.' },
      ],
    },
    {
      title: 'Il cavallo',
      steps: [
        { fen: '7k/8/8/8/8/8/8/1N5K w - - 0 1', goal: 'reach', stars: ['c3', 'e4', 'f6'],
          text: 'Il cavallo si muove a «L»: due case in una direzione e poi una di lato. È l\'unico pezzo che può saltare sopra gli altri. Raccogli le stelle.',
          hint: 'Da b1 il cavallo arriva in c3, da c3 in e4, da e4 in f6.' },
        { fen: START, goal: 'move', answer: ['g1f3', 'b1c3', 'g1h3', 'b1a3'],
          text: 'All\'inizio della partita il cavallo può già uscire saltando i pedoni. Muovi un cavallo!',
          hint: 'Un\'ottima mossa è il cavallo da g1 a f3.',
          wrong: 'Muovi uno dei due cavalli (in b1 o in g1).' },
      ],
    },
    {
      title: 'Il re',
      steps: [
        { fen: '7k/8/8/8/8/8/8/4K3 w - - 0 1', goal: 'reach', stars: ['e2', 'd3', 'd4'],
          text: 'Il re si muove di una sola casa, in qualsiasi direzione. È lento ma è il pezzo più importante. Non può mai andare su una casa attaccata da un pezzo nemico. Raccogli le stelle.',
          hint: 'Una casa alla volta: e2, poi d3, poi d4.' },
      ],
    },
    {
      title: 'Il pedone',
      steps: [
        { fen: '7k/8/8/8/8/8/4P3/7K w - - 0 1', goal: 'reach', stars: ['e4', 'e6'],
          text: 'Il pedone va solo avanti, una casa alla volta, e non torna mai indietro. Alla sua prima mossa però può avanzare di due case. Raccogli le stelle.',
          hint: 'Prima mossa: da e2 direttamente in e4. Poi una casa alla volta.' },
        { fen: '7k/8/8/3p1n2/4P3/8/8/7K w - - 0 1', goal: 'move', answer: ['e4f5'],
          text: 'Il pedone cattura in modo diverso da come cammina: in diagonale, una casa in avanti. Qui può mangiare il pedone o il cavallo. Scegli la cattura migliore!',
          hint: 'Il cavallo vale 3, il pedone 1.',
          wrong: 'Hai mangiato il pedone, che vale 1. Il cavallo vale 3: conviene mangiare lui!' },
      ],
    },
    {
      title: 'Lo scacco',
      steps: [
        { fen: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1', goal: 'check', answer: ['a1a8'],
          text: 'Quando un pezzo attacca il re avversario si dice che dà SCACCO. Dai scacco al re nero con la torre.',
          hint: 'La torre può salire fino in a8, sulla stessa riga del re nero.' },
        { fen: '4r2k/8/8/8/2B5/8/8/4K3 w - - 0 1', goal: 'move', answer: ['c4e6', 'c4e2'],
          text: 'Ora sei TU sotto scacco: la torre nera attacca il tuo re! Ci sono tre modi per salvarsi: spostare il re, catturare il pezzo che dà scacco, oppure mettere un pezzo in mezzo. Qui metti in mezzo l\'alfiere.',
          hint: 'L\'alfiere può andare in e2 o in e6, sulla colonna tra la torre e il re.',
          wrong: 'Così esci dallo scacco, ma questa volta prova a parare mettendo in mezzo l\'alfiere.' },
        { fen: '7k/8/8/8/8/8/1R4q1/6K1 w - - 0 1', goal: 'move', answer: ['b2g2', 'g1g2'],
          text: 'La donna nera ti dà scacco ed è vicinissima al tuo re. Catturala!',
          hint: 'Sia la torre sia il re possono mangiare la donna in g2.' },
      ],
    },
    {
      title: 'Scacco matto',
      steps: [
        { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: 'mate', answer: ['a1a8'],
          text: 'SCACCO MATTO: il re è sotto scacco e non ha nessun modo per salvarsi. Chi dà scacco matto vince la partita! Il re nero è chiuso dai suoi stessi pedoni: trova il matto in una mossa.',
          hint: 'La torre sull\'ultima riga, in a8.' },
        { fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', goal: 'mate', answer: ['g1g7'],
          text: 'Il re bianco protegge la donna. Trova lo scacco matto.',
          hint: 'La donna in g7 è protetta dal re bianco in f6.' },
        { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', goal: 'mate', answer: ['h5f7'],
          text: 'Il famoso «matto del barbiere»: donna e alfiere attaccano insieme il punto debole f7. Trova la mossa vincente!',
          hint: 'La donna mangia il pedone in f7, protetta dall\'alfiere in c4.' },
        { fen: 'r5rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', goal: 'mate', answer: ['h6f7'],
          text: 'Il cavallo può dare un matto speciale, il «matto affogato», quando il re è circondato dai suoi pezzi.',
          hint: 'Il cavallo in f7 attacca h8, e il re non ha case libere.' },
      ],
    },
    {
      title: 'L\'arrocco',
      steps: [
        { fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', goal: 'move', answer: ['e1g1'],
          text: 'L\'ARROCCO è una mossa speciale che mette al sicuro il re e fa entrare in gioco la torre: il re si sposta di due case verso la torre e la torre gli salta accanto. Fai l\'arrocco corto: muovi il re di due case verso destra.',
          hint: 'Sposta il re da e1 a g1: la torre si sposterà da sola in f1.',
          wrong: 'Per arroccare corto sposta il re da e1 a g1.' },
        { fen: 'r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1', goal: 'move', answer: ['e1c1'],
          text: 'Si può arroccare solo se: re e torre non si sono mai mossi, tra loro non ci sono pezzi, il re non è sotto scacco e non passa su case attaccate. Qui l\'alfiere nero controlla f1, quindi l\'arrocco corto non si può fare. Arrocca dall\'altra parte (arrocco lungo).',
          hint: 'Sposta il re da e1 a c1: la torre andrà in d1.',
          wrong: 'Per l\'arrocco lungo sposta il re di due case a sinistra, da e1 a c1.' },
      ],
    },
    {
      title: 'Promozione ed en passant',
      steps: [
        { fen: '7k/P7/8/8/8/8/8/K7 w - - 0 1', goal: 'move', answer: ['a7a8'],
          text: 'PROMOZIONE: quando un pedone arriva in fondo alla scacchiera si trasforma nel pezzo che vuoi (tranne il re). Quasi sempre si sceglie la donna. Porta il pedone in a8.',
          hint: 'Avanza il pedone da a7 ad a8 e scegli la donna.' },
        { fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', goal: 'move', answer: ['e5d6'], last: ['d7', 'd5'],
          text: 'EN PASSANT («al passaggio»): il pedone nero è appena avanzato di due case, da d7 a d5, finendo accanto al tuo. Solo nella mossa subito dopo puoi catturarlo come se fosse avanzato di una casa sola. Muovi il tuo pedone in d6!',
          hint: 'Muovi il pedone da e5 a d6: il pedone nero in d5 sparisce.',
          wrong: 'Prova la cattura en passant: pedone da e5 a d6.' },
      ],
    },
    {
      title: 'Stallo e patta',
      steps: [
        { fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          text: 'Non tutte le partite hanno un vincitore. Se chi deve muovere NON è sotto scacco ma non ha nessuna mossa possibile, è STALLO: la partita finisce patta (pari). Qui tocca al Nero: il suo re non è in scacco, ma tutte le case vicine sono attaccate.' },
        { fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', goal: 'mate', answer: ['f1f8'],
          text: 'Ora tocca a te: dai scacco matto, ma attento a non fare stallo! Quando stai vincendo, controlla sempre che l\'avversario abbia ancora una mossa.',
          hint: 'La donna sull\'ultima riga, per esempio in f8.' },
        { fen: '8/8/4k3/8/8/2K5/8/8 w - - 0 1',
          text: 'Altri casi di patta, che il gioco riconosce da solo: la stessa posizione ripetuta tre volte; 50 mosse di fila senza catture né mosse di pedone; materiale insufficiente, come re contro re: nessuno può più dare matto.' },
      ],
    },
    {
      title: 'Consigli per iniziare',
      steps: [
        { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
          text: 'Nelle prime mosse: 1) occupa il centro con i pedoni (e4, d4); 2) fai uscire cavalli e alfieri; 3) arrocca presto per proteggere il re; 4) non muovere la donna troppo presto, perché può essere attaccata.' },
        { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
          text: 'Prima di ogni mossa chiediti: cosa vuole fare l\'avversario con la sua ultima mossa? I miei pezzi sono protetti? Posso mangiare qualcosa gratis? Nelle partite, se sei bloccato, premi «Suggerimento».' },
        { fen: START, action: 'play',
          text: 'Sei pronto! Metti in pratica quello che hai imparato con una partita contro il computer al livello Principiante.' },
      ],
    },
  ];
  for (const l of LESSONS) l.group = 'Le basi';

  const TACTICS = [
    {
      title: 'La forchetta',
      steps: [
        { fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', goal: 'line', side: 'w', line: ['d5c7', 'e8d7', 'c7a8'],
          comments: ['Scacco e attacco alla torre nello stesso momento: è una forchetta!', 'Il re deve scappare per forza…', '…e tu mangi la torre. Hai guadagnato 5 punti!'],
          text: 'La FORCHETTA è un pezzo che attacca due bersagli insieme: l\'avversario può salvarne solo uno. Il cavallo è bravissimo a fare forchette. Trova la casa da cui attacca il re e la torre insieme.',
          hint: 'Il cavallo in c7 attacca sia e8 sia a8.' },
      ],
    },
    {
      title: 'L\'inchiodatura',
      steps: [
        { fen: '4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1', goal: 'line', side: 'w', line: ['d4d5', 'e8e7', 'd5c6'],
          comments: ['Il pedone attacca il cavallo, che non può scappare: se si muovesse, il suo re resterebbe sotto scacco dell\'alfiere!', 'Il Nero non può più salvare il cavallo.', 'Il pedone (1 punto) mangia il cavallo (3 punti)!'],
          text: 'L\'INCHIODATURA: un pezzo non può muoversi perché dietro di lui c\'è il re. Qui il cavallo nero in c6 è inchiodato dal tuo alfiere in b5. Approfittane: attaccalo con un pedone!',
          hint: 'Avanza il pedone da d4 a d5.' },
      ],
    },
    {
      title: 'L\'infilata',
      steps: [
        { fen: '8/1q6/2k5/8/8/8/8/4KB2 w - - 0 1', goal: 'line', side: 'w', line: ['f1g2', 'c6c5', 'g2b7'],
          comments: ['Scacco! E dietro al re, sulla stessa diagonale, c\'è la donna…', 'Il re deve spostarsi…', '…e l\'alfiere mangia la donna! 9 punti guadagnati.'],
          text: 'L\'INFILATA è il contrario dell\'inchiodatura: attacchi il pezzo più importante (il re), lui deve spostarsi e tu mangi quello che c\'era dietro. Dai scacco con l\'alfiere sulla grande diagonale!',
          hint: 'L\'alfiere da f1 a g2: da lì vede c6 e, dietro, b7.' },
      ],
    },
  ];
  for (const l of TACTICS) l.group = 'Tattiche';

  const OPENINGS = [
    {
      title: 'Partita Italiana',
      steps: [
        { goal: 'line', side: 'w', line: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d4'],
          comments: [
            '1.e4: il pedone di re occupa il centro e apre la strada ad alfiere e donna.',
            'Il Nero risponde allo stesso modo e contende il centro. Ora fai uscire il cavallo di re (g1) in f3.',
            '2.Cf3: il cavallo esce e attacca subito il pedone in e5.',
            'Il Nero difende e5 sviluppando il cavallo. Ora porta l\'alfiere in c4.',
            '3.Ac4: l\'alfiere punta su f7, il punto più debole del Nero (lo protegge solo il re). Questa è la Partita Italiana!',
            'Il Nero fa lo stesso: è il «Giuoco Piano». Ora prepara il centro con il pedone in c3.',
            '4.c3: prepara la spinta d4 per costruire un grande centro di pedoni.',
            'Il Nero sviluppa un altro pezzo e attacca e4. Ora spingi d4!',
            '5.d4: il Bianco conquista il centro. Ora sai giocare la Partita Italiana!',
          ],
          text: 'La Partita Italiana è tra le aperture più antiche e più adatte a chi inizia: sviluppo veloce e attacco al punto f7. Tu giochi col Bianco, il computer risponde. Prima mossa: pedone da e2 a e4.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
    {
      title: 'Partita Spagnola',
      steps: [
        { goal: 'line', side: 'w', line: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1'],
          comments: [
            '1.e4: si parte occupando il centro.',
            'Il Nero risponde e5. Ora cavallo in f3.',
            '2.Cf3: attacca il pedone in e5.',
            'Il Nero lo difende con il cavallo. Ora l\'alfiere va in b5, ad attaccare quel cavallo.',
            '3.Ab5: è la Spagnola (o Ruy Lopez), l\'apertura preferita da tanti campioni del mondo. L\'alfiere attacca il cavallo che difende e5.',
            'Il Nero chiede all\'alfiere cosa vuole fare. Ritiralo in a4, senza cambiarlo.',
            '4.Aa4: l\'alfiere si ritira ma continua a «guardare» il cavallo.',
            'Il Nero sviluppa e attacca e4. Ora metti al sicuro il re: ARROCCA (re da e1 a g1, oppure tocca il re e poi la torre).',
            '5.O-O: arrocco! Il re è al sicuro e la torre si avvicina al centro. Ottimo!',
          ],
          text: 'La Partita Spagnola inizia come l\'Italiana, ma l\'alfiere va in b5 per fare pressione sul cavallo nero. Tu giochi col Bianco. Prima mossa: e2-e4.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
    {
      title: 'Gambetto di Donna',
      steps: [
        { goal: 'line', side: 'w', line: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'f8e7'],
          comments: [
            '1.d4: il pedone di donna occupa il centro ed è già protetto dalla donna.',
            'Il Nero risponde allo stesso modo. Ora offri il pedone c: c2-c4!',
            '2.c4: il Gambetto di Donna! Offri un pedone per allontanare quello nero dal centro.',
            'Il Nero non accetta e difende d5 (Gambetto di Donna rifiutato). Sviluppa il cavallo in c3.',
            '3.Cc3: aumenta la pressione su d5.',
            'Il Nero difende ancora d5 con il cavallo. Ora l\'alfiere in g5!',
            '4.Ag5: l\'alfiere inchioda il cavallo f6, che difende d5.',
            'Il Nero toglie l\'inchiodatura e si prepara ad arroccare. Ben fatto: questo è il Gambetto di Donna!',
          ],
          text: 'Il Gambetto di Donna è un\'apertura classica con 1.d4: si «offre» un pedone per conquistare il centro. Tu giochi col Bianco. Prima mossa: d2-d4.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
    {
      title: 'Difesa Siciliana',
      steps: [
        { goal: 'line', side: 'b', line: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'],
          comments: [
            'Il Bianco apre con 1.e4. Ora tocca a te: rispondi con il pedone da c7 a c5!',
            '1…c5: la Siciliana! Controlli d4 da un lato, senza copiare il Bianco.',
            'Il Bianco sviluppa il cavallo e prepara d4. Gioca d7-d6.',
            '2…d6: liberi l\'alfiere e controlli e5.',
            'Il Bianco apre il centro con d4. Mangia quel pedone con il tuo pedone c5!',
            '3…cxd4: cedi un pedone laterale per uno centrale: buon affare.',
            'Il Bianco riprende col cavallo. Ora sviluppa il cavallo in f6, attaccando e4.',
            '4…Cf6: attacchi il pedone e4.',
            'Il Bianco difende e4 con il cavallo. Ora la mossa tipica: a7-a6.',
            '5…a6: è la famosa variante Najdorf, giocata da Fischer e Kasparov. Bravo!',
          ],
          text: 'La Difesa Siciliana è la risposta più combattiva a 1.e4. Questa volta giochi col NERO: il computer muove il Bianco.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
    {
      title: 'Difesa Francese',
      steps: [
        { goal: 'line', side: 'b', line: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'g8f6', 'c1g5', 'f8e7'],
          comments: [
            'Il Bianco gioca 1.e4. Rispondi con il pedone da e7 a e6.',
            '1…e6: la Difesa Francese, molto solida: prepara d5.',
            'Il Bianco prende il centro con d4. Ora attacca e4 con d7-d5!',
            '2…d5: attacchi subito il pedone e4.',
            'Il Bianco lo difende con il cavallo. Attacca e4 un\'altra volta: cavallo in f6.',
            '3…Cf6: secondo attacco su e4.',
            'Il Bianco inchioda il tuo cavallo con l\'alfiere. Liberalo: alfiere in e7.',
            '4…Ae7: liberi il cavallo e prepari l\'arrocco. Ottimo!',
          ],
          text: 'La Difesa Francese è una risposta solida a 1.e4: il Nero costruisce una catena di pedoni e contrattacca il centro. Giochi col NERO.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
    {
      title: 'Difesa Caro-Kann',
      steps: [
        { goal: 'line', side: 'b', line: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'c8f5'],
          comments: [
            'Il Bianco gioca 1.e4. Rispondi con il pedone da c7 a c6.',
            '1…c6: la Caro-Kann prepara d5 senza chiudere l\'alfiere in c8.',
            'Il Bianco prende il centro. Ora d7-d5!',
            '2…d5: sfidi il pedone e4.',
            'Il Bianco difende e4 con il cavallo. Cambia: pedone d5 mangia e4.',
            '3…dxe4: cambi il pedone centrale.',
            'Il Bianco riprende col cavallo. Ora fai uscire l\'alfiere in f5, attaccando il cavallo.',
            '4…Af5: l\'alfiere esce attivo. È una difesa molto solida!',
          ],
          text: 'La Caro-Kann è una difesa sicura contro 1.e4, amata dai giocatori prudenti. Giochi col NERO.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
    {
      title: 'Difendersi dal matto del barbiere',
      steps: [
        { goal: 'line', side: 'b', line: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g7g6', 'h5f3', 'g8f6'],
          comments: [
            'Il Bianco gioca 1.e4. Rispondi e7-e5.',
            '1…e5: occupi anche tu il centro.',
            'L\'alfiere bianco punta su f7. Sviluppa il cavallo in c6.',
            '2…Cc6: sviluppi un pezzo e difendi e5.',
            'Attenzione! La donna in h5 minaccia Dxf7 scacco matto (e attacca anche e5). Gioca g7-g6 per cacciarla.',
            '3…g6: la donna è attaccata e la diagonale verso f7 è chiusa.',
            'La donna torna in f3 e minaccia di nuovo f7! Copri con il cavallo in f6.',
            '4…Cf6: il cavallo blocca la colonna f e sviluppa un pezzo. Minaccia respinta!',
          ],
          text: 'Molti principianti provano il «matto del barbiere» (donna e alfiere contro f7). Impara a difenderti! Giochi col NERO.',
          hint: 'Gioca la mossa evidenziata.' },
      ],
    },
  ];
  for (const l of OPENINGS) l.group = 'Le aperture';

  LESSONS.push(...TACTICS, ...OPENINGS);

  if (typeof module === 'object' && module.exports) module.exports = { LESSONS };
  else root.LESSONS = LESSONS;
})(typeof self !== 'undefined' ? self : this);
