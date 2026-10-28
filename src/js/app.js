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
  const STYLE_KEY = 'scacchi-stile-v1';

  // ---------- Personalizzazione: scacchiere e pezzi ----------
  const BOARDS = [
    { id: 'legno', name: 'Legno', light: '#f0d9b5', dark: '#b58863' },
    { id: 'torneo', name: 'Torneo', light: '#eeeed2', dark: '#769656' },
    { id: 'mare', name: 'Mare', light: '#dee3e6', dark: '#8ca2ad' },
    { id: 'noce', name: 'Noce', light: '#e3c08d', dark: '#8a5a2e' },
    { id: 'marmo', name: 'Marmo', light: '#ecebe6', dark: '#9c978f' },
    { id: 'notte', name: 'Notte', light: '#c7cede', dark: '#4d5b7c' },
    { id: 'corallo', name: 'Corallo', light: '#f6e3dc', dark: '#d07c6c' },
    { id: 'viola', name: 'Ametista', light: '#e7def0', dark: '#8a6aa8' },
  ];
  // Colori dei pezzi: corpo (un colore o una sfumatura [chiaro, scuro]), contorno e dettagli
  const PIECE_SETS = [
    { id: 'classici', name: 'Classici' },
    { id: 'legno', name: 'Legno', w: { body: ['#fbe7bf', '#e0b97a'], line: '#5a3a1a' }, b: { body: ['#8a5530', '#4e2b12'], line: '#24120a', detail: '#f3d9a4' } },
    { id: 'oro', name: 'Oro e acciaio', w: { body: ['#fff0a8', '#e0a92e'], line: '#5c3f00' }, b: { body: ['#6f8296', '#2e3b4b'], line: '#10161e', detail: '#dfe8f2' } },
    { id: 'marmo', name: 'Marmo', w: { body: ['#ffffff', '#d9d6cf'], line: '#3c3a36' }, b: { body: ['#55555f', '#1e1e24'], line: '#000000', detail: '#c9c9cf' } },
    { id: 'pop', name: 'Rosso e blu', w: { body: ['#ffb0a3', '#e2503c'], line: '#4a120a' }, b: { body: ['#5d8fe0', '#1f4a9a'], line: '#0b1a38', detail: '#e2ecff' } },
    { id: 'giada', name: 'Giada e rubino', w: { body: ['#c8f2d8', '#3fae72'], line: '#0d3a22' }, b: { body: ['#d0475a', '#7a1426'], line: '#2a0510', detail: '#ffd9df' } },
  ];
  const style = { board: 'legno', pieces: 'classici' };
  let pieceUrls = null; // disegni ricolorati del set scelto (null = originali)

  // ---------- Stato del gioco ----------
  const state = {
    game: new Chess(),
    mode: 'cpu',      // 'cpu' = contro il computer, 'pvp' = due giocatori, 'online' = con un amico online
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
    online: null,     // partita online: { role: 'host'|'guest', code, white: 'host'|'guest'|null, n, net, resign }
  };

  // ---------- Elementi della pagina ----------
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const statusEl = $('status');
  const movesEl = $('moves');
  const squares = []; // 64 caselle, in ordine di visualizzazione

  function pieceFile(p) {
    return 'pieces/' + (p < 'a' ? 'w' : 'b') + p.toUpperCase() + '.svg';
  }

  function pieceSrc(p) {
    return (pieceUrls && pieceUrls[p]) || pieceFile(p);
  }

  // Ricolora un disegno dei pezzi cambiando i colori dentro il file SVG
  function recolor(svg, isWhite, c) {
    const body = Array.isArray(c.body) ? 'url(#g)' : c.body;
    let out = isWhite
      ? svg.replace(/fill="#fff"/g, `fill="${body}"`).replace(/#000/g, c.line)
      : svg.replace(/fill="#000"/g, `fill="${body}"`).replace(/stroke="#000"/g, `stroke="${c.line}"`).replace(/#ececec/g, c.detail);
    // Alcune parti non scrivono il colore e sarebbero nere "per default": si dà un colore di base a tutto il disegno
    out = out.replace('<svg ', `<svg fill="${isWhite ? c.line : body}" `);
    if (Array.isArray(c.body)) {
      const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="${c.body[0]}"/><stop offset="1" stop-color="${c.body[1]}"/></linearGradient></defs>`;
      out = out.replace(/(<svg[^>]*>)/, '$1' + defs);
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out);
  }

  async function piecesFor(set) {
    if (!set.w) return null;
    const urls = {};
    await Promise.all('KQRBNPkqrbnp'.split('').map(async (p) => {
      const svg = await (await fetch(pieceFile(p))).text();
      urls[p] = recolor(svg, p < 'a', p < 'a' ? set.w : set.b);
    }));
    return urls;
  }

  async function applyStyle() {
    const b = BOARDS.find(x => x.id === style.board) || BOARDS[0];
    document.documentElement.style.setProperty('--light', b.light);
    document.documentElement.style.setProperty('--dark', b.dark);
    const set = PIECE_SETS.find(x => x.id === style.pieces) || PIECE_SETS[0];
    try { pieceUrls = await piecesFor(set); } catch (err) { pieceUrls = null; } // senza file (doppio clic): pezzi classici
    render();
  }

  function loadStyle() {
    try { Object.assign(style, JSON.parse(localStorage.getItem(STYLE_KEY)) || {}); } catch (err) { /* stile di base */ }
  }

  function saveStyle() {
    try { localStorage.setItem(STYLE_KEY, JSON.stringify(style)); } catch (err) { /* pazienza */ }
  }

  function openStyleDialog() {
    const boards = $('style-boards');
    boards.innerHTML = '';
    for (const b of BOARDS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'style-item' + (b.id === style.board ? ' on' : '');
      btn.innerHTML = `<span class="mini" style="--l:${b.light};--d:${b.dark}"><i></i><i></i><i></i><i></i></span><span>${b.name}</span>`;
      btn.addEventListener('click', () => { style.board = b.id; saveStyle(); applyStyle(); openStyleDialog(); });
      boards.appendChild(btn);
    }
    const sets = $('style-pieces');
    sets.innerHTML = '';
    for (const set of PIECE_SETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'style-item' + (set.id === style.pieces ? ' on' : '');
      btn.innerHTML = `<span class="mini-pieces"></span><span>${set.name}</span>`;
      piecesFor(set).catch(() => null).then((urls) => {
        const src = (p) => (urls && urls[p]) || pieceFile(p);
        btn.querySelector('.mini-pieces').innerHTML = `<img src="${src('N')}" alt=""><img src="${src('q')}" alt="">`;
      });
      btn.addEventListener('click', () => { style.pieces = set.id; saveStyle(); applyStyle(); openStyleDialog(); });
      sets.appendChild(btn);
    }
    if (!$('dlg-style').open) $('dlg-style').showModal();
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
      const online = state.mode === 'online';
      $('btn-undo').disabled = g.history.length === 0 || online;
      $('btn-suggest').hidden = online;
      $('btn-suggest').disabled = !humanCanMove() || state.suggesting;
      $('btn-invite').hidden = !online;
      $('btn-resign').hidden = !online;
      $('btn-resign').disabled = !online || !!state.over || !state.online.white;
    }
  }

  function playerName(color) {
    if (state.mode === 'pvp') return COLOR_NAME[color];
    if (state.mode === 'online') {
      if (!state.online.white) return color === 'w' ? 'Tu' : 'Amico';
      if (color === state.human) return 'Tu (' + COLOR_NAME[color] + ')';
      return 'Amico (' + COLOR_NAME[color] + ')' + (state.online.net === 'collegato' ? '' : ' · non collegato');
    }
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
      case 'resign': return ['Partita abbandonata', 'Il ' + COLOR_NAME[over.winner === 'w' ? 'b' : 'w'] + ' si è arreso: vince il ' + COLOR_NAME[over.winner] + '.'];
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
    } else if (state.mode === 'online' && !state.online.white) {
      text = NET_TEXT[state.online.net] || 'Mi collego alla partita…';
    } else if (state.mode === 'online' && state.online.net !== 'collegato' && g.turn !== state.human) {
      text = state.online.role === 'host' && !state.online.met ? 'Aspetto che l\'amico entri (codice ' + state.online.code + ')' : 'L\'amico non è collegato: aspetto che torni…';
    } else {
      const who = state.mode === 'cpu'
        ? (g.turn === state.human ? 'Tocca a te' : 'Tocca al computer')
        : state.mode === 'online'
          ? (g.turn === state.human ? 'Tocca a te' : 'Tocca all\'amico')
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
    if (state.mode === 'online' && !state.online.white) return false;
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
    if (state.mode === 'online' && !state.learn) {
      Online.send({ t: 'move', n: state.online.n, ply: state.game.history.length - 1, m: { from: done.from, to: done.to, promotion: done.promotion || null } });
    }
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
    if (state.mode === 'online') return;   // online non si annulla: l'amico ha già visto la mossa
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
    stopOnline();
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
    if (state.mode === 'online') Online.leave(); // si riprende uscendo dalle lezioni
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
    resumeOnline();
    maybeComputerMove();
  }

  // ---------- Finestre ----------
  function closeDialog(dlg) {
    if (dlg.open) dlg.close();
  }

  function openNewGameDialog() {
    const form = $('form-new');
    form.mode.value = state.mode;
    form.how.value = 'create';
    form.code.value = '';
    form.color.value = state.human;
    form.level.value = String(state.level);
    updateCpuOptions();
    $('dlg-new').returnValue = '';
    $('dlg-new').showModal();
  }

  function updateCpuOptions() {
    const f = $('form-new');
    const mode = f.mode.value, join = f.how.value === 'join';
    $('color-options').hidden = !(mode === 'cpu' || (mode === 'online' && !join));
    $('level-options').hidden = mode !== 'cpu';
    $('online-options').hidden = mode !== 'online';
    $('join-code').hidden = !join;
    $('join-error').hidden = true;
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
    if (state.mode === 'online' && state.over.winner) {
      extra = state.over.winner === state.human ? ' Complimenti, hai vinto!' : ' Ha vinto il tuo amico.';
    }
    $('btn-over-new').textContent = state.mode === 'online' ? 'Rivincita' : 'Nuova partita';
    $('over-title').textContent = title;
    $('over-text').textContent = text + extra + ' (' + state.over.result + ')';
    $('dlg-over').returnValue = '';
    $('dlg-over').showModal();
  }

  // ---------- Partita online con un amico ----------
  const NET_TEXT = {
    apertura: 'Mi collego al server…', cerco: 'Cerco la partita dell\'amico…', attesa: 'In attesa dell\'amico…',
    assente: 'L\'amico non ha il gioco aperto: aspetto…',
    riconnessione: 'Connessione persa, mi ricollego…', errore: 'Gioco online non disponibile (serve internet).',
    piena: 'Questa partita ha già due giocatori: chiedi un nuovo codice.',
  };
  const other = (c) => (c === 'w' ? 'b' : 'w');

  function inviteLink(code) {
    return location.origin + location.pathname + '?partita=' + code;
  }

  function resignOver(color) {
    const winner = other(color);
    return { reason: 'resign', winner, result: winner === 'w' ? '1-0' : '0-1' };
  }

  // Situazione da mandare all'amico
  function snapshot() {
    const o = state.online;
    return { n: o.n, white: o.white, over: o.resign || null, moves: state.game.history.map(m => ({ from: m.from, to: m.to, promotion: m.promotion || null })) };
  }

  // Prende la situazione ricevuta (o una nuova partita) e la mostra
  function adopt(s) {
    const o = state.online;
    const wasOver = !!state.over;
    const g = new Chess();
    for (const m of s.moves) if (!g.move(m)) break;
    state.game = g;
    o.n = s.n | 0;
    o.white = s.white === 'guest' ? 'guest' : 'host';
    o.resign = s.over === 'w' || s.over === 'b' ? s.over : null;
    const mine = o.white === o.role ? 'w' : 'b';
    if (state.human !== mine || !g.history.length) state.flipped = mine === 'b';
    state.human = mine;
    state.selected = null;
    state.targets = [];
    state.over = o.resign ? resignOver(o.resign) : g.gameOver();
    if (!state.over) closeDialog($('dlg-over'));
    save();
    render();
    if (state.over && !wasOver) setTimeout(showGameOver, 350);
  }

  function onlineMessage(msg) {
    const o = state.online;
    if (!o || state.learn) return;
    switch (msg.t) {
      case 'sync': {
        const merged = Online.mergeSync(snapshot(), msg, o.role === 'host');
        if (merged) adopt(merged);
        break;
      }
      case 'move': {
        const g = state.game;
        if (msg.n !== o.n || msg.ply !== g.history.length || g.turn === state.human || state.over || !msg.m) {
          Online.send(Object.assign({ t: 'sync' }, snapshot())); // non torna qualcosa: ci si rimette d'accordo
          return;
        }
        const promo = ['q', 'r', 'b', 'n'].includes(msg.m.promotion) ? msg.m.promotion : undefined;
        const done = g.move({ from: String(msg.m.from), to: String(msg.m.to), promotion: promo });
        if (!done) { Online.send(Object.assign({ t: 'sync' }, snapshot())); return; }
        state.selected = null;
        state.targets = [];
        state.hint = null;
        afterMove();
        break;
      }
      case 'resign': {
        if (msg.n !== o.n || state.over) return;
        o.resign = other(state.human);
        state.over = resignOver(o.resign);
        save();
        render();
        setTimeout(showGameOver, 350);
        break;
      }
      case 'new': {
        if ((msg.n | 0) > o.n) adopt({ n: msg.n, white: msg.white, moves: [] });
        break;
      }
      case 'full': {
        Online.leave();
        o.net = 'piena';
        render();
        break;
      }
    }
  }

  function connectOnline() {
    const o = state.online;
    if (o.role === 'guest' && !o.token) o.token = Online.newCode() + Online.newCode() + Online.newCode();
    o.net = 'apertura';
    Online.open(o.role, o.code, {
      onStatus: (s) => {
        if (state.online !== o) return;
        o.net = s;
        if (s === 'collegato' && !o.met) { o.met = true; save(); closeDialog($('dlg-invite')); }
        render();
      },
      onConnect: () => { if (state.online === o) Online.send(Object.assign({ t: 'sync' }, snapshot())); },
      onMessage: onlineMessage,
      onToken: (t) => { if (state.online === o) { o.token = t; save(); } },
    }, o.token);
  }

  // role: 'host' (crea) o 'guest' (entra con il codice)
  function startOnline(role, code, color) {
    cancelComputer();
    closeDialog($('dlg-over'));
    state.learn = null;
    state.game = new Chess();
    state.mode = 'online';
    const pick = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    state.online = { role, code, n: role === 'host' ? 1 : 0, white: role === 'host' ? (pick === 'w' ? 'host' : 'guest') : null, net: 'apertura', resign: null, met: false };
    state.human = role === 'host' ? pick : 'w';
    state.flipped = state.human === 'b';
    state.over = null;
    state.selected = null;
    state.targets = [];
    state.hint = null;
    save();
    render();
    connectOnline();
    if (role === 'host') openInvite();
  }

  function resumeOnline() {
    if (state.mode === 'online' && state.online && !state.learn) connectOnline();
  }

  function stopOnline() {
    if (state.online) Online.leave();
    state.online = null;
  }

  function resign() {
    const o = state.online;
    if (!o || state.over || !o.white) return;
    o.resign = state.human;
    state.over = resignOver(o.resign);
    Online.send({ t: 'resign', n: o.n });
    save();
    render();
    setTimeout(showGameOver, 350);
  }

  // Rivincita: nuova partita con i colori scambiati
  function rematch() {
    const o = state.online;
    const s = { n: o.n + 1, white: o.white === 'host' ? 'guest' : 'host', moves: [] };
    Online.send({ t: 'new', n: s.n, white: s.white });
    adopt(s);
  }

  function openInvite() {
    const code = state.online.code;
    $('invite-code').textContent = code;
    $('invite-link').textContent = inviteLink(code);
    $('invite-copied').hidden = true;
    $('btn-share').hidden = !navigator.share;
    if (!$('dlg-invite').open) $('dlg-invite').showModal();
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink(state.online.code));
      $('invite-copied').hidden = false;
    } catch (err) {
      // Copia non permessa: si seleziona il testo così l'utente lo copia a mano
      const range = document.createRange();
      range.selectNodeContents($('invite-link'));
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function shareInvite() {
    navigator.share({ title: 'Scacchi', text: 'Giochiamo a scacchi! Codice partita: ' + state.online.code, url: inviteLink(state.online.code) }).catch(() => {});
  }

  // Aperto un link d'invito (…?partita=CODICE): si chiede se entrare
  function checkInviteLink() {
    const code = Online.cleanCode(location.search);
    if (!code) return;
    history.replaceState(null, '', location.pathname);
    if (state.online && state.online.code === code) return; // è già la partita in corso
    $('join-text').textContent = 'Un amico ti ha invitato alla partita ' + code + '. Vuoi entrare? La partita in corso su questo dispositivo verrà chiusa.';
    $('dlg-join').returnValue = '';
    $('dlg-join').dataset.code = code;
    $('dlg-join').showModal();
  }

  // ---------- Salvataggio automatico (resta anche chiudendo l'app) ----------
  function save() {
    if (state.learn) return; // le lezioni non sovrascrivono la partita salvata
    try {
      const data = {
        mode: state.mode, human: state.human, level: state.level, flipped: state.flipped,
        online: state.online && { role: state.online.role, code: state.online.code, white: state.online.white, n: state.online.n, resign: state.online.resign || null, met: !!state.online.met, token: state.online.token || null },
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
      state.mode = ['pvp', 'online'].includes(data.mode) && (data.mode !== 'online' || data.online) ? data.mode : 'cpu';
      state.human = data.human === 'b' ? 'b' : 'w';
      state.level = Math.min(5, Math.max(1, Number(data.level) || 2));
      state.flipped = !!data.flipped;
      state.over = g.gameOver();
      state.online = null;
      if (state.mode === 'online') {
        const o = data.online;
        state.online = { role: o.role === 'host' ? 'host' : 'guest', code: String(o.code), white: o.white || null, n: o.n | 0, resign: o.resign || null, met: !!o.met, token: typeof o.token === 'string' ? o.token : null, net: 'apertura' };
        if (state.online.resign) state.over = resignOver(state.online.resign);
      }
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
    $('btn-style').addEventListener('click', openStyleDialog);
    $('btn-invite').addEventListener('click', openInvite);
    $('btn-resign').addEventListener('click', () => { $('dlg-resign').returnValue = ''; $('dlg-resign').showModal(); });
    $('dlg-resign').addEventListener('close', () => { if ($('dlg-resign').returnValue === 'yes') resign(); });
    $('btn-copy').addEventListener('click', copyInvite);
    $('btn-share').addEventListener('click', shareInvite);
    $('dlg-join').addEventListener('close', () => {
      if ($('dlg-join').returnValue === 'yes') startOnline('guest', $('dlg-join').dataset.code, 'w');
    });

    $('btn-lessons').addEventListener('click', openLessonsDialog);
    $('btn-exit-learn').addEventListener('click', exitLearn);
    $('btn-lesson-hint').addEventListener('click', lessonHint);
    $('btn-lesson-retry').addEventListener('click', loadStep);
    $('btn-lesson-next').addEventListener('click', nextStep);

    const form = $('form-new');
    form.addEventListener('change', updateCpuOptions);
    form.addEventListener('submit', (e) => {
      // Codice sbagliato: la finestra resta aperta e lo dice
      if (e.submitter && e.submitter.value === 'ok' && form.mode.value === 'online' && form.how.value === 'join' && !Online.cleanCode(form.code.value)) {
        e.preventDefault();
        $('join-error').hidden = false;
      }
    });
    $('dlg-new').addEventListener('close', () => {
      if ($('dlg-new').returnValue !== 'ok') return;
      if (form.mode.value === 'online') {
        if (form.how.value === 'join') startOnline('guest', Online.cleanCode(form.code.value), 'w');
        else { stopOnline(); startOnline('host', Online.newCode(), form.color.value); }
        return;
      }
      newGame({ mode: form.mode.value, color: form.color.value, level: Number(form.level.value) });
    });
    $('dlg-over').addEventListener('close', () => {
      if ($('dlg-over').returnValue !== 'new') return;
      if (state.mode === 'online') rematch();
      else openNewGameDialog();
    });

    loadStyle();
    const resumed = load();
    render();
    applyStyle();
    resumeOnline();
    if (location.search.includes('partita=')) checkInviteLink();
    else if (!resumed) openNewGameDialog();
    else maybeComputerMove(); // se era il turno del computer quando l'app è stata chiusa

    // Funzionamento offline / installazione (solo se servito da un indirizzo web)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
