/*
 * app.js — INTERFACCIA: disegna la scacchiera, gestisce tocco/mouse,
 * le finestre, il salvataggio, la modalità Impara e chiede le mosse al computer.
 * Le regole stanno in chess.js, il computer in ai.js, le lezioni in lessons.js.
 */
(function () {
  'use strict';

  const SAVE_KEY = 'scacchi-partita-v1';
  const PROGRESS_KEY = 'scacchi-lezioni-v1';
  const COLOR_NAME = { w: 'Bianco', b: 'Nero' };
  const PIECE_ORDER = { q: 0, r: 1, b: 2, n: 3, p: 4 };
  const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const PRAISE = ['Bravo!', 'Ottimo!', 'Perfetto!', 'Esatto!', 'Benissimo!'];
  const HINT_LEVEL = 4; // forza del computer quando dà suggerimenti

  // ---------- Stato del gioco ----------
  const state = {
    game: new Chess(),
    mode: 'cpu',      // 'cpu' = contro il computer, 'pvp' = due giocatori
    human: 'w',       // colore del giocatore umano (modalità cpu)
    level: 2,
    flipped: false,   // scacchiera vista dal Nero
    selected: null,   // casa del pezzo selezionato, es. 'e2'
    targets: [],      // mosse possibili del pezzo selezionato
    thinking: false,  // il computer sta pensando
    suggesting: false,// il computer sta cercando un suggerimento
    aiRequest: 0,     // numero della richiesta, per ignorare risposte vecchie
    over: null,       // risultato se la partita è finita
    hint: null,       // mossa suggerita da evidenziare { from, to }
    learn: null,      // stato della modalità Impara (null = partita normale)
  };

  // ---------- Elementi della pagina ----------
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const statusEl = $('status');
  const movesEl = $('moves');
  const squares = []; // 64 caselle, in ordine di visualizzazione

  function pieceSrc(p) {
    return 'pieces/' + (p < 'a' ? 'w' : 'b') + p.toUpperCase() + '.svg';
  }

  function buildBoard() {
    for (let d = 0; d < 64; d++) {
      const el = document.createElement('div');
      el.className = 'square';
      boardEl.appendChild(el);
      squares.push(el);
    }
  }

  // Indice di visualizzazione (0 = in alto a sinistra) -> nome della casa
  function squareAt(d) {
    const i = state.flipped ? 63 - d : d;
    return sqName(i);
  }

  // ---------- Disegno ----------
  function render() {
    const g = state.game;
    const last = g.history[g.history.length - 1] || (state.learn && state.learn.last);
    const checkSq = g.inCheck() ? sqName(g.kingSq[g.turn]) : null;
    const targetMap = new Map(state.targets.map(m => [m.to, m]));
    const stars = state.learn ? state.learn.stars : [];
    const hint = state.hint;

    for (let d = 0; d < 64; d++) {
      const el = squares[d];
      const name = squareAt(d);
      const i = sqIndex(name);
      const light = ((i >> 3) + (i & 7)) % 2 === 0;
      const cls = ['square', light ? 'light' : 'dark'];
      if (last && (last.from === name || last.to === name)) cls.push('last');
      if (state.selected === name) cls.push('selected');
      if (checkSq === name) cls.push('check');
      if (hint && (hint.from === name || hint.to === name)) cls.push('hint');
      const t = targetMap.get(name);
      if (t) cls.push('target', (t.captured || t.realTo) ? 'capture' : 'quiet');
      el.className = cls.join(' ');
      el.dataset.square = name;

      let html = '';
      const p = g.board[i];
      if (p) html += `<img class="piece" src="${pieceSrc(p)}" alt="" draggable="false">`;
      if (stars.includes(name)) html += '<span class="star">★</span>';
      if (d % 8 === 0) html += `<span class="coord rank">${name[1]}</span>`;
      if (d >= 56) html += `<span class="coord file">${name[0]}</span>`;
      if (el.innerHTML !== html) el.innerHTML = html;
    }

    document.body.classList.toggle('learning', !!state.learn);
    $('game-panel').hidden = !!state.learn;
    $('lesson-panel').hidden = !state.learn;

    if (state.learn) {
      renderLesson();
      $('btn-undo').disabled = false;
    } else {
      renderPlayers();
      renderStatus();
      renderMoves();
      $('btn-undo').disabled = g.history.length === 0;
      $('btn-suggest').disabled = !humanCanMove() || state.suggesting;
    }
  }

  function playerName(color) {
    if (state.mode === 'pvp') return COLOR_NAME[color];
    if (color === state.human) return 'Tu (' + COLOR_NAME[color] + ')';
    return 'Computer · livello ' + state.level;
  }

  function renderPlayers() {
    const g = state.game;
    const bottom = state.flipped ? 'b' : 'w';
    const top = bottom === 'w' ? 'b' : 'w';

    // Pezzi catturati da ciascun colore e vantaggio di materiale
    const taken = { w: [], b: [] };
    for (const m of g.history) if (m.captured) taken[m.color].push(m.captured);
    const score = (list) => list.reduce((s, p) => s + VALUE[p.toLowerCase()], 0);
    const diff = score(taken.w) - score(taken.b);

    for (const [barId, color] of [['bar-top', top], ['bar-bottom', bottom]]) {
      const bar = $(barId);
      bar.querySelector('.name').textContent = playerName(color);
      bar.classList.toggle('active', !state.over && g.turn === color);
      const list = taken[color].slice().sort((a, b) => PIECE_ORDER[a.toLowerCase()] - PIECE_ORDER[b.toLowerCase()]);
      bar.querySelector('.captured').innerHTML = list.map(p => `<img src="${pieceSrc(p)}" alt="">`).join('');
      const adv = color === 'w' ? diff : -diff;
      bar.querySelector('.advantage').textContent = adv > 0 ? '+' + adv : '';
    }
  }

  function overText(over) {
    switch (over.reason) {
      case 'checkmate': return ['Scacco matto!', 'Vince il ' + COLOR_NAME[over.winner] + '.'];
      case 'stalemate': return ['Patta per stallo', 'Chi deve muovere non ha mosse legali ma non è sotto scacco.'];
      case 'insufficient': return ['Patta', 'Materiale insufficiente: nessuno può più dare scacco matto.'];
      case 'threefold': return ['Patta', 'La stessa posizione si è ripetuta tre volte.'];
      case 'fifty': return ['Patta', 'Regola delle 50 mosse: nessuna cattura né mossa di pedone.'];
      default: return ['Partita finita', ''];
    }
  }

  function renderStatus() {
    const g = state.game;
    let text;
    let check = false;
    if (state.over) {
      const [title, sub] = overText(state.over);
      text = title + ' ' + sub;
    } else if (state.thinking) {
      text = 'Il computer sta pensando…';
    } else if (state.suggesting) {
      text = 'Cerco una buona mossa…';
    } else if (state.hint) {
      text = 'Suggerimento: muovi da ' + state.hint.from + ' a ' + state.hint.to;
    } else {
      const who = state.mode === 'cpu'
        ? (g.turn === state.human ? 'Tocca a te' : 'Tocca al computer')
        : 'Tocca al ' + COLOR_NAME[g.turn];
      check = g.inCheck();
      text = check ? 'Scacco! ' + who : who;
    }
    statusEl.textContent = text;
    statusEl.classList.toggle('check', check);
  }

  // Notazione italiana: Re, Donna, Torre, Alfiere, Cavallo
  const IT_LETTER = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };
  function sanIt(san) {
    return san.replace(/[KQRBN]/g, (ch) => IT_LETTER[ch]);
  }

  function renderMoves() {
    const h = state.game.history;
    let html = '';
    // Se la partita è iniziata con il Nero a muovere, la prima riga ha "…"
    const startBlack = state.game.startFen.split(' ')[1] === 'b';
    const list = startBlack ? [null].concat(h) : h;
    for (let i = 0; i < list.length; i += 2) {
      const w = list[i], b = list[i + 1];
      const lastIdx = list.length - 1;
      const cw = i === lastIdx ? ' class="current"' : '';
      const cb = i + 1 === lastIdx ? ' class="current"' : '';
      html += `<li><span class="num">${i / 2 + 1}.</span><span${cw}>${w ? sanIt(w.san) : '…'}</span><span${cb}>${b ? sanIt(b.san) : ''}</span></li>`;
    }
    if (movesEl.innerHTML !== html) {
      movesEl.innerHTML = html;
      movesEl.scrollTop = movesEl.scrollHeight;
    }
  }

  // ---------- Selezione e mosse dell'utente ----------
  function humanCanMove() {
    if (state.learn) {
      const L = state.learn, s = currentStep();
      if (!s.goal || L.solved || L.busy) return false;
      return s.goal !== 'line' || state.game.turn === s.side;
    }
    if (state.over || state.thinking) return false;
    return state.mode === 'pvp' || state.game.turn === state.human;
  }

  // Mosse possibili di un pezzo. Per l'arrocco si accetta anche
  // "re sulla torre" (realTo = casa vera dove va il re).
  function movesFrom(sq) {
    let list = state.game.moves({ square: sq });
    if (state.learn) list = list.filter(m => !(m.captured && m.captured.toLowerCase() === 'k'));
    const extra = [];
    for (const m of list) {
      if (m.flag === 'O-O' || m.flag === 'O-O-O') {
        const rookSq = (m.flag === 'O-O' ? 'h' : 'a') + m.from[1];
        extra.push(Object.assign({}, m, { to: rookSq, realTo: m.to }));
      }
    }
    return list.concat(extra);
  }

  function select(sq) {
    state.selected = sq;
    state.targets = movesFrom(sq);
    render();
  }

  function deselect() {
    if (!state.selected) return;
    state.selected = null;
    state.targets = [];
    render();
  }

  async function tryMove(from, to) {
    const options = state.targets.filter(m => m.from === from && m.to === to);
    if (!options.length) return false;
    const realTo = options[0].realTo || to;
    let promotion = null;
    if (options[0].promotion) {
      promotion = await askPromotion(state.game.turn);
      if (!promotion) { render(); return false; } // annullato
    }
    playMove({ from, to: realTo, promotion });
    return true;
  }

  function playMove(m) {
    const done = state.game.move(m);
    state.selected = null;
    state.targets = [];
    state.hint = null;
    if (!done) { render(); return; }
    if (state.learn) learnAfterMove(done);
    else afterMove();
  }

  function afterMove() {
    state.over = state.game.gameOver();
    save();
    render();
    if (state.over) {
      setTimeout(showGameOver, 350);
    } else {
      maybeComputerMove();
    }
  }

  // ---------- Tocco e trascinamento (funziona con dito, mouse e penna) ----------
  let drag = null;

  function squareFromPoint(x, y) {
    const r = boardEl.getBoundingClientRect();
    if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return null;
    const col = Math.floor((x - r.left) / (r.width / 8));
    const row = Math.floor((y - r.top) / (r.height / 8));
    return squareAt(row * 8 + col);
  }

  function squareEl(name) {
    return squares.find(el => el.dataset.square === name);
  }

  function onPointerDown(e) {
    if (!e.isPrimary || e.button > 0) return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (!sq) return;
    e.preventDefault();
    if (!humanCanMove()) return;

    // Tocca una casa evidenziata: muovi lì (anche la torre, per arroccare)
    if (state.selected && state.targets.some(m => m.to === sq)) {
      tryMove(state.selected, sq);
      return;
    }

    const p = state.game.get(sq);
    if (p && colorOf(p) === state.game.turn) {
      const wasSelected = state.selected === sq;
      if (!wasSelected) select(sq);
      drag = { from: sq, x: e.clientX, y: e.clientY, ghost: null, wasSelected, id: e.pointerId };
      try { boardEl.setPointerCapture(e.pointerId); } catch (err) { /* non indispensabile */ }
    } else {
      deselect();
    }
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.ghost) {
      // Si inizia a trascinare solo dopo qualche pixel (altrimenti è un tocco)
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      const size = boardEl.getBoundingClientRect().width / 8;
      const img = document.createElement('img');
      img.src = pieceSrc(state.game.get(drag.from));
      img.className = 'ghost';
      img.style.width = img.style.height = size + 'px';
      document.body.appendChild(img);
      drag.ghost = img;
      squareEl(drag.from).classList.add('dragging-from');
    }
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';

    const over = squareFromPoint(e.clientX, e.clientY);
    if (over !== drag.hover) {
      if (drag.hover) squareEl(drag.hover).classList.remove('hover');
      drag.hover = over;
      if (over) squareEl(over).classList.add('hover');
    }
  }

  function endDrag() {
    if (!drag) return;
    if (drag.ghost) drag.ghost.remove();
    if (drag.hover) squareEl(drag.hover).classList.remove('hover');
    const from = squareEl(drag.from);
    if (from) from.classList.remove('dragging-from');
    drag = null;
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    const to = squareFromPoint(e.clientX, e.clientY);
    endDrag();
    if (d.ghost) {
      // Rilasciato dopo un trascinamento
      if (to && to !== d.from && state.targets.some(m => m.to === to)) tryMove(d.from, to);
    } else if (d.wasSelected) {
      deselect(); // secondo tocco sullo stesso pezzo: deseleziona
    }
  }

  // ---------- Computer (pensa in un thread separato, il "worker") ----------
  let worker = null;
  let engineId = 0;
  const pending = new Map();

  // Piano B senza worker (es. pagina aperta con doppio clic): calcola qui
  function computeHere(job) {
    setTimeout(() => job.resolve(ChessAI.bestMove(job.fen, job.level)), 30);
  }

  try {
    worker = new Worker('js/worker.js');
    worker.onmessage = (e) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      job.resolve(e.data.move);
    };
    worker.onerror = () => {
      worker = null;
      const jobs = [...pending.values()];
      pending.clear();
      jobs.forEach(computeHere);
    };
  } catch (err) {
    worker = null;
  }

  // Chiede una mossa al computer; restituisce una Promise con { from, to, promotion }
  function askEngine(fen, level) {
    return new Promise((resolve) => {
      const job = { fen, level, resolve };
      if (!worker) { computeHere(job); return; }
      const id = ++engineId;
      pending.set(id, job);
      worker.postMessage({ id, fen, level });
    });
  }

  function maybeComputerMove() {
    if (state.learn || state.mode !== 'cpu' || state.over || state.game.turn === state.human) return;
    state.thinking = true;
    render();
    const id = ++state.aiRequest;
    const started = Date.now();
    askEngine(state.game.fen(), state.level).then((move) => {
      // Piccola pausa perché la mossa non appaia "di colpo"
      const wait = Math.max(0, 450 - (Date.now() - started));
      setTimeout(() => onComputerMove(id, move), wait);
    });
  }

  function onComputerMove(id, move) {
    if (id !== state.aiRequest) return; // risposta vecchia (es. dopo "Annulla")
    state.thinking = false;
    if (!move) { render(); return; }
    playMove(move);
  }

  function cancelComputer() {
    state.aiRequest++;
    state.thinking = false;
    state.suggesting = false;
  }

  // Pulsante "Suggerimento" durante una partita
  async function suggest() {
    if (state.learn) { lessonHint(); return; }
    if (!humanCanMove() || state.suggesting) return;
    const fen = state.game.fen();
    const id = state.aiRequest;
    state.suggesting = true;
    state.hint = null;
    render();
    const m = await askEngine(fen, HINT_LEVEL);
    if (id !== state.aiRequest) return; // annullato (nuova partita, lezione, ecc.)
    state.suggesting = false;
    // Se nel frattempo è stata giocata una mossa, il suggerimento non vale più
    state.hint = m && !state.learn && state.game.fen() === fen ? { from: m.from, to: m.to } : null;
    render();
  }

  // ---------- Pulsanti ----------
  function undo() {
    if (state.learn) { loadStep(); return; } // nelle lezioni: ricomincia l'esercizio
    const g = state.game;
    if (!g.history.length) return;
    cancelComputer();
    closeDialog($('dlg-over'));
    g.undo();
    // Contro il computer si torna fino al proprio turno
    if (state.mode === 'cpu') {
      while (g.history.length && g.turn !== state.human) g.undo();
    }
    state.over = null;
    state.selected = null;
    state.targets = [];
    state.hint = null;
    save();
    render();
    maybeComputerMove(); // es. tutto annullato e il computer ha il Bianco
  }

  function flip() {
    state.flipped = !state.flipped;
    endDrag();
    save();
    render();
  }

  function newGame(opts) {
    cancelComputer();
    state.learn = null;
    state.game = new Chess();
    state.mode = opts.mode;
    state.level = opts.level;
    state.human = opts.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : opts.color;
    state.flipped = state.mode === 'cpu' && state.human === 'b';
    state.over = null;
    state.selected = null;
    state.targets = [];
    state.hint = null;
    save();
    render();
    maybeComputerMove();
  }

  // ---------- Modalità Impara ----------
  function currentStep() {
    return LESSONS[state.learn.lesson].steps[state.learn.step];
  }

  function startLesson(index) {
    cancelComputer();
    endDrag();
    closeDialog($('dlg-over'));
    state.learn = { lesson: index, step: 0, token: 0 };
    loadStep();
  }

  function loadStep() {
    const L = state.learn;
    const s = currentStep();
    L.token++; // annulla eventuali mosse automatiche ancora in attesa
    state.game = new Chess(s.fen || START_FEN);
    L.stars = (s.stars || []).slice();
    L.ply = 0;
    L.solved = !s.goal;     // i passi senza esercizio sono solo da leggere
    L.busy = false;
    L.comment = '';
    L.feedback = '';
    L.feedbackType = '';
    L.last = s.last ? { from: s.last[0], to: s.last[1] } : null;
    state.flipped = s.side === 'b';
    state.selected = null;
    state.targets = [];
    state.hint = null;
    if (L.solved && L.step === LESSONS[L.lesson].steps.length - 1) markDone(L.lesson);
    render();
    if (s.goal === 'line') opponentLine();
  }

  function setFeedback(text, type) {
    state.learn.feedback = text;
    state.learn.feedbackType = type;
    render();
  }

  function solve() {
    const L = state.learn;
    const s = currentStep();
    L.solved = true;
    L.busy = false;
    L.feedback = s.success || PRAISE[Math.floor(Math.random() * PRAISE.length)];
    L.feedbackType = 'ok';
    if (L.step === LESSONS[L.lesson].steps.length - 1) markDone(L.lesson);
    render();
  }

  // Mossa sbagliata: spiega e rimette la posizione com'era
  function wrong(text) {
    const L = state.learn;
    const token = L.token;
    L.busy = true;
    setFeedback(text, 'err');
    setTimeout(() => {
      if (state.learn !== L || L.token !== token) return;
      state.game.undo();
      L.busy = false;
      render();
    }, 1200);
  }

  // Negli esercizi "stelle" e "mangia tutto" il Nero non muove mai:
  // dopo ogni mossa si ridà il turno al Bianco.
  function keepWhiteToMove(rec) {
    const f = state.game.fen().split(' ');
    f[1] = 'w';
    f[3] = '-';
    state.game = new Chess(f.join(' '));
    state.learn.last = { from: rec.from, to: rec.to };
  }

  function learnAfterMove(rec) {
    const L = state.learn;
    const s = currentStep();
    const g = state.game;
    const uci = rec.from + rec.to;

    switch (s.goal) {
      case 'reach': {
        L.stars = L.stars.filter(x => x !== rec.to);
        if (!L.stars.length) { solve(); return; }
        keepWhiteToMove(rec);
        setFeedback(L.stars.length === 1 ? 'Bene! Manca ancora una stella.' : `Bene! Mancano ${L.stars.length} stelle.`, 'ok');
        return;
      }
      case 'captureAll': {
        const left = g.board.filter(p => p && p >= 'a' && p !== 'k').length;
        if (!left) { solve(); return; }
        keepWhiteToMove(rec);
        const msg = left === 1 ? 'ne manca ancora uno.' : `ne mancano ${left}.`;
        setFeedback(rec.captured ? 'Preso! Ora ' + msg : 'Continua: ' + msg, rec.captured ? 'ok' : 'info');
        return;
      }
      case 'line': {
        if (uci === s.line[L.ply].slice(0, 4)) {
          L.comment = s.comments[L.ply];
          L.ply++;
          L.feedback = '';
          if (L.ply >= s.line.length) { solve(); return; }
          render();
          opponentLine();
          return;
        }
        wrong(s.wrong || 'Non è la mossa di questa sequenza. Riprova, oppure premi «Suggerimento».');
        return;
      }
      case 'move':
        if (s.answer.includes(uci)) solve();
        else wrong(s.wrong || 'Non è la mossa giusta. Riprova!');
        return;
      case 'check':
        if (g.inCheck()) solve();
        else wrong('Questa mossa non dà scacco. Riprova!');
        return;
      case 'mate':
        if (g.isCheckmate()) solve();
        else if (g.isStalemate()) wrong('Stallo! Il re nero non è in scacco ma non può muoversi: sarebbe patta. Riprova!');
        else if (g.inCheck()) wrong('È scacco, ma non matto: il re può ancora salvarsi. Riprova!');
        else wrong('Non è scacco matto. Riprova!');
        return;
    }
  }

  // Nelle sequenze (aperture, tattiche) il computer gioca le mosse dell'altro colore
  function opponentLine() {
    const L = state.learn;
    const s = currentStep();
    if (L.ply >= s.line.length || state.game.turn === s.side) return;
    const token = L.token;
    L.busy = true;
    render();
    setTimeout(() => {
      if (state.learn !== L || L.token !== token) return;
      const u = s.line[L.ply];
      state.game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      // Resta visibile anche il commento sulla mossa del giocatore
      L.comment = (L.comment ? L.comment + '\n\n' : '') + s.comments[L.ply];
      L.ply++;
      L.busy = false;
      if (L.ply >= s.line.length) solve();
      else render();
    }, 900);
  }

  function lessonHint() {
    const L = state.learn;
    const s = currentStep();
    if (!s.goal || L.solved || L.busy) return;
    const u = s.goal === 'line' ? s.line[L.ply] : (s.answer && s.answer[0]);
    state.hint = u ? { from: u.slice(0, 2), to: u.slice(2, 4) } : null;
    const text = s.hint || (state.hint ? 'Muovi da ' + state.hint.from + ' a ' + state.hint.to + '.' : 'Rileggi la spiegazione qui sopra.');
    setFeedback(text, 'info');
  }

  function nextStep() {
    const L = state.learn;
    if (!L.solved) return;
    const s = currentStep();
    if (s.action === 'play') { newGame({ mode: 'cpu', color: 'w', level: 1 }); return; }
    if (L.step + 1 < LESSONS[L.lesson].steps.length) {
      L.step++;
      loadStep();
    } else if (L.lesson + 1 < LESSONS.length) {
      startLesson(L.lesson + 1);
    } else {
      openLessonsDialog();
    }
  }

  function renderLesson() {
    const L = state.learn;
    const lesson = LESSONS[L.lesson];
    const s = currentStep();
    $('lesson-progress').textContent = `${lesson.group} · ${L.step + 1}/${lesson.steps.length}`;
    $('lesson-title').textContent = lesson.title;
    $('lesson-text').textContent = s.text;

    const comment = $('lesson-comment');
    comment.textContent = L.comment;
    comment.hidden = !L.comment;

    const fb = $('lesson-feedback');
    let fbText = L.feedback;
    let fbType = L.feedbackType;
    if (!fbText && L.busy && s.goal === 'line') { fbText = 'Il computer muove…'; fbType = 'info'; }
    fb.textContent = fbText;
    fb.className = 'feedback ' + fbType;
    fb.hidden = !fbText;

    // Se compare un commento o un messaggio nuovo, scorri fino in fondo per mostrarlo
    const shown = L.comment + '|' + fbText;
    if (shown !== L.shown) {
      L.shown = shown;
      const body = document.querySelector('.lesson-body');
      body.scrollTop = (L.comment || fbText) ? body.scrollHeight : 0;
    }

    $('btn-lesson-hint').disabled = !s.goal || L.solved || L.busy;
    $('btn-lesson-retry').disabled = !s.goal;
    const next = $('btn-lesson-next');
    next.disabled = !L.solved;
    const lastStep = L.step === lesson.steps.length - 1;
    next.textContent = s.action === 'play' ? 'Gioca!'
      : !lastStep ? 'Avanti'
      : L.lesson + 1 < LESSONS.length ? 'Lezione successiva' : 'Fine';
  }

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || []; } catch (err) { return []; }
  }

  function markDone(index) {
    const done = loadProgress();
    const title = LESSONS[index].title;
    if (done.includes(title)) return;
    done.push(title);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(done)); } catch (err) { /* pazienza */ }
  }

  function openLessonsDialog() {
    const done = loadProgress();
    const list = $('lesson-list');
    list.innerHTML = '';
    let group = null;
    let n = 0;
    LESSONS.forEach((lesson, i) => {
      if (lesson.group !== group) {
        group = lesson.group;
        n = 0;
        const h = document.createElement('h3');
        h.textContent = group;
        list.appendChild(h);
      }
      n++;
      const isDone = done.includes(lesson.title);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lesson-item' + (isDone ? ' done' : '');
      const check = document.createElement('span');
      check.className = 'check';
      check.textContent = isDone ? '✓' : String(n);
      const name = document.createElement('span');
      name.textContent = lesson.title;
      btn.append(check, name);
      btn.addEventListener('click', () => {
        closeDialog($('dlg-lessons'));
        startLesson(i);
      });
      list.appendChild(btn);
    });
    $('dlg-lessons').showModal();
  }

  function exitLearn() {
    state.learn = null;
    state.hint = null;
    state.selected = null;
    state.targets = [];
    if (!load()) {
      state.game = new Chess();
      state.over = null;
    }
    render();
    maybeComputerMove();
  }

  // ---------- Finestre ----------
  function closeDialog(dlg) {
    if (dlg.open) dlg.close();
  }

  function openNewGameDialog() {
    const form = $('form-new');
    form.mode.value = state.mode;
    form.color.value = state.human;
    form.level.value = String(state.level);
    updateCpuOptions();
    $('dlg-new').returnValue = '';
    $('dlg-new').showModal();
  }

  function updateCpuOptions() {
    $('cpu-options').hidden = $('form-new').mode.value !== 'cpu';
  }

  function askPromotion(color) {
    return new Promise((resolve) => {
      const dlg = $('dlg-promo');
      const box = $('promo-choices');
      box.innerHTML = '';
      for (const t of ['q', 'r', 'b', 'n']) {
        const p = color === 'w' ? t.toUpperCase() : t;
        const btn = document.createElement('button');
        btn.type = 'submit';
        btn.value = t;
        btn.innerHTML = `<img src="${pieceSrc(p)}" alt="${t}">`;
        box.appendChild(btn);
      }
      dlg.returnValue = '';
      dlg.addEventListener('close', () => {
        const v = dlg.returnValue;
        resolve('qrbn'.includes(v) && v ? v : null);
      }, { once: true });
      dlg.showModal();
    });
  }

  function showGameOver() {
    if (!state.over || state.learn) return;
    const [title, text] = overText(state.over);
    let extra = '';
    if (state.mode === 'cpu' && state.over.winner) {
      extra = state.over.winner === state.human ? ' Complimenti, hai vinto!' : ' Ha vinto il computer.';
    }
    $('over-title').textContent = title;
    $('over-text').textContent = text + extra + ' (' + state.over.result + ')';
    $('dlg-over').returnValue = '';
    $('dlg-over').showModal();
  }

  // ---------- Salvataggio automatico (resta anche chiudendo l'app) ----------
  function save() {
    if (state.learn) return; // le lezioni non sovrascrivono la partita salvata
    try {
      const data = {
        mode: state.mode, human: state.human, level: state.level, flipped: state.flipped,
        moves: state.game.history.map(m => ({ from: m.from, to: m.to, promotion: m.promotion })),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) { /* salvataggio non disponibile: si gioca lo stesso */ }
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!data) return false;
      const g = new Chess();
      for (const m of data.moves) if (!g.move(m)) break;
      state.game = g;
      state.mode = data.mode === 'pvp' ? 'pvp' : 'cpu';
      state.human = data.human === 'b' ? 'b' : 'w';
      state.level = Math.min(5, Math.max(1, Number(data.level) || 2));
      state.flipped = !!data.flipped;
      state.over = g.gameOver();
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---------- Avvio ----------
  function init() {
    buildBoard();
    boardEl.addEventListener('pointerdown', onPointerDown);
    boardEl.addEventListener('pointermove', onPointerMove);
    boardEl.addEventListener('pointerup', onPointerUp);
    boardEl.addEventListener('pointercancel', endDrag);
    boardEl.addEventListener('contextmenu', (e) => e.preventDefault());

    $('btn-new').addEventListener('click', openNewGameDialog);
    $('btn-learn').addEventListener('click', openLessonsDialog);
    $('btn-undo').addEventListener('click', undo);
    $('btn-flip').addEventListener('click', flip);
    $('btn-suggest').addEventListener('click', suggest);

    $('btn-lessons').addEventListener('click', openLessonsDialog);
    $('btn-exit-learn').addEventListener('click', exitLearn);
    $('btn-lesson-hint').addEventListener('click', lessonHint);
    $('btn-lesson-retry').addEventListener('click', loadStep);
    $('btn-lesson-next').addEventListener('click', nextStep);

    const form = $('form-new');
    form.addEventListener('change', updateCpuOptions);
    $('dlg-new').addEventListener('close', () => {
      if ($('dlg-new').returnValue !== 'ok') return;
      newGame({ mode: form.mode.value, color: form.color.value, level: Number(form.level.value) });
    });
    $('dlg-over').addEventListener('close', () => {
      if ($('dlg-over').returnValue === 'new') openNewGameDialog();
    });

    const resumed = load();
    render();
    if (!resumed) openNewGameDialog();
    else maybeComputerMove(); // se era il turno del computer quando l'app è stata chiusa

    // Funzionamento offline / installazione (solo se servito da un indirizzo web)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
