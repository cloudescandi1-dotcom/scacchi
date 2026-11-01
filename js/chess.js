/*
 * chess.js — le REGOLE degli scacchi (nessuna grafica qui).
 *
 * Come è rappresentata la scacchiera:
 *   - un array di 64 caselle; l'indice 0 è a8 (in alto a sinistra visto dal Bianco),
 *     l'indice 63 è h1 (in basso a destra).
 *   - riga = Math.floor(indice / 8)  (0 = traversa 8, 7 = traversa 1)
 *   - colonna = indice % 8           (0 = colonna a, 7 = colonna h)
 *   - ogni casella contiene null (vuota) oppure una lettera:
 *       MAIUSCOLA = pezzo bianco, minuscola = pezzo nero
 *       P/p pedone, N/n cavallo, B/b alfiere, R/r torre, Q/q donna, K/k re
 *
 * Il file funziona sia nel browser (crea la variabile globale `Chess`)
 * sia in Node.js (per i test automatici).
 */
(function (root) {
  'use strict';

  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const FILES = 'abcdefgh';

  // Spostamenti (riga, colonna) dei vari pezzi
  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  // Diritti di arrocco come "bit": si possono combinare con | e &
  const WK = 1; // Bianco, lato di re   (O-O)
  const WQ = 2; // Bianco, lato di donna (O-O-O)
  const BK = 4; // Nero, lato di re
  const BQ = 8; // Nero, lato di donna

  // Se un pezzo parte da (o arriva su) una di queste caselle,
  // si perde il relativo diritto di arrocco (re o torre mossi/catturati).
  const CASTLE_MASK = new Array(64).fill(15);
  CASTLE_MASK[56] = 15 & ~WQ;        // a1
  CASTLE_MASK[63] = 15 & ~WK;        // h1
  CASTLE_MASK[60] = 15 & ~(WK | WQ); // e1
  CASTLE_MASK[0] = 15 & ~BQ;         // a8
  CASTLE_MASK[7] = 15 & ~BK;         // h8
  CASTLE_MASK[4] = 15 & ~(BK | BQ);  // e8

  function sqName(i) { return FILES[i & 7] + (8 - (i >> 3)); }
  function sqIndex(name) { return (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]); }
  function isWhite(p) { return p < 'a'; } // le maiuscole vengono prima delle minuscole
  function colorOf(p) { return isWhite(p) ? 'w' : 'b'; }

  function mv(from, to, piece, captured, flag, promotion) {
    // flag: '' normale, 'double' pedone di due passi, 'ep' en passant,
    //       'O-O' arrocco corto, 'O-O-O' arrocco lungo
    return { from, to, piece, captured: captured || null, flag: flag || '', promotion: promotion || null };
  }

  class Chess {
    constructor(fen) {
      this.load(fen || START_FEN);
    }

    // ---------- Caricare / descrivere una posizione (notazione FEN) ----------

    load(fen) {
      const parts = fen.trim().split(/\s+/);
      if (parts.length < 4) throw new Error('FEN non valida: ' + fen);
      const rows = parts[0].split('/');
      if (rows.length !== 8) throw new Error('FEN non valida: ' + fen);

      const board = new Array(64).fill(null);
      const kingSq = { w: -1, b: -1 };
      for (let r = 0; r < 8; r++) {
        let c = 0;
        for (const ch of rows[r]) {
          if (ch >= '1' && ch <= '8') {
            c += Number(ch);
          } else {
            if (c > 7 || 'pnbrqkPNBRQK'.indexOf(ch) < 0) throw new Error('FEN non valida: ' + fen);
            board[r * 8 + c] = ch;
            if (ch === 'K') kingSq.w = r * 8 + c;
            if (ch === 'k') kingSq.b = r * 8 + c;
            c++;
          }
        }
        if (c !== 8) throw new Error('FEN non valida: ' + fen);
      }
      if (kingSq.w < 0 || kingSq.b < 0) throw new Error('FEN senza re: ' + fen);

      this.board = board;
      this.kingSq = kingSq;
      this.turn = parts[1] === 'b' ? 'b' : 'w';
      this.castling = 0;
      if (parts[2].includes('K')) this.castling |= WK;
      if (parts[2].includes('Q')) this.castling |= WQ;
      if (parts[2].includes('k')) this.castling |= BK;
      if (parts[2].includes('q')) this.castling |= BQ;
      this.ep = parts[3] === '-' ? -1 : sqIndex(parts[3]); // casella dove si può catturare en passant
      this.halfmove = parseInt(parts[4], 10) || 0;         // mosse senza catture né pedoni (regola 50 mosse)
      this.fullmove = parseInt(parts[5], 10) || 1;

      this._stack = [];       // copie della posizione, per annullare le mosse
      this.history = [];      // mosse giocate nella partita
      this.startFen = this.fen();
      this._keys = [this._key()]; // posizioni viste, per la triplice ripetizione
    }

    fen() {
      let s = '';
      for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let c = 0; c < 8; c++) {
          const p = this.board[r * 8 + c];
          if (!p) { empty++; continue; }
          if (empty) { s += empty; empty = 0; }
          s += p;
        }
        if (empty) s += empty;
        if (r < 7) s += '/';
      }
      return s + ' ' + this.turn + ' ' + this._castlingString() + ' ' +
        (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.halfmove + ' ' + this.fullmove;
    }

    _castlingString() {
      const c = this.castling;
      return ((c & WK ? 'K' : '') + (c & WQ ? 'Q' : '') + (c & BK ? 'k' : '') + (c & BQ ? 'q' : '')) || '-';
    }

    // Chiave che identifica la posizione (per contare le ripetizioni).
    // La casella en passant conta solo se una cattura en passant è davvero possibile.
    _key() {
      let ep = '-';
      if (this.ep >= 0) {
        const white = this.turn === 'w';
        const r = (this.ep >> 3) + (white ? 1 : -1);
        const c = this.ep & 7;
        const pawn = white ? 'P' : 'p';
        if ((c > 0 && this.board[r * 8 + c - 1] === pawn) || (c < 7 && this.board[r * 8 + c + 1] === pawn)) {
          ep = sqName(this.ep);
        }
      }
      return this.board.map(p => p || '.').join('') + this.turn + this._castlingString() + ep;
    }

    get(square) {
      return this.board[sqIndex(square)];
    }

    // ---------- Attacchi e scacco ----------

    // La casella `sq` è attaccata da un pezzo del colore `by`?
    _attacked(sq, by) {
      const b = this.board;
      const r = sq >> 3, c = sq & 7;
      const white = by === 'w';

      // Pedoni: un pedone bianco attacca "verso l'alto", quindi si trova una riga sotto
      const pr = white ? r + 1 : r - 1;
      const pawn = white ? 'P' : 'p';
      if (pr >= 0 && pr < 8) {
        if (c > 0 && b[pr * 8 + c - 1] === pawn) return true;
        if (c < 7 && b[pr * 8 + c + 1] === pawn) return true;
      }

      const N = white ? 'N' : 'n', K = white ? 'K' : 'k';
      for (const [dr, dc] of KNIGHT) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N) return true;
      }
      for (const [dr, dc] of KING) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K) return true;
      }

      const R = white ? 'R' : 'r', B = white ? 'B' : 'b', Q = white ? 'Q' : 'q';
      if (this._slideHits(r, c, ROOK_DIRS, R, Q)) return true;
      if (this._slideHits(r, c, BISHOP_DIRS, B, Q)) return true;
      return false;
    }

    // Partendo da (r, c), in ogni direzione, il primo pezzo incontrato è p1 o p2?
    _slideHits(r, c, dirs, p1, p2) {
      const b = this.board;
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const p = b[rr * 8 + cc];
          if (p) {
            if (p === p1 || p === p2) return true;
            break;
          }
          rr += dr; cc += dc;
        }
      }
      return false;
    }

    inCheck(color) {
      const us = color || this.turn;
      return this._attacked(this.kingSq[us], us === 'w' ? 'b' : 'w');
    }

    // ---------- Generazione delle mosse ----------

    // Mosse "pseudo-legali": rispettano il movimento dei pezzi ma potrebbero
    // lasciare il proprio re sotto scacco (quelle vengono scartate dopo).
    // capturesOnly = true serve al computer: solo catture e promozioni.
    _pseudo(capturesOnly) {
      const moves = [];
      const b = this.board;
      const white = this.turn === 'w';
      for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (!p || isWhite(p) !== white) continue;
        const r = i >> 3, c = i & 7;
        switch (p.toLowerCase()) {
          case 'p': this._pawnMoves(i, r, c, white, moves, capturesOnly); break;
          case 'n': this._steps(i, r, c, KNIGHT, white, moves, capturesOnly); break;
          case 'b': this._slides(i, r, c, BISHOP_DIRS, white, moves, capturesOnly); break;
          case 'r': this._slides(i, r, c, ROOK_DIRS, white, moves, capturesOnly); break;
          case 'q':
            this._slides(i, r, c, ROOK_DIRS, white, moves, capturesOnly);
            this._slides(i, r, c, BISHOP_DIRS, white, moves, capturesOnly);
            break;
          case 'k':
            this._steps(i, r, c, KING, white, moves, capturesOnly);
            if (!capturesOnly) this._castling(white, moves);
            break;
        }
      }
      return moves;
    }

    _pawnMoves(i, r, c, white, moves, capturesOnly) {
      const b = this.board;
      const p = b[i];
      const dir = white ? -1 : 1;           // il Bianco sale (riga diminuisce)
      const startRow = white ? 6 : 1;
      const lastRow = white ? 0 : 7;
      const r1 = r + dir;
      if (r1 < 0 || r1 > 7) return;

      const add = (to, captured, flag) => {
        if ((to >> 3) === lastRow) {
          for (const q of (white ? 'QRBN' : 'qrbn')) moves.push(mv(i, to, p, captured, flag, q));
        } else {
          moves.push(mv(i, to, p, captured, flag));
        }
      };

      // Avanti di uno (e di due dalla casa di partenza)
      const one = r1 * 8 + c;
      if (!b[one]) {
        if (!capturesOnly || r1 === lastRow) add(one, null, '');
        const two = one + dir * 8;
        if (!capturesOnly && r === startRow && !b[two]) moves.push(mv(i, two, p, null, 'double'));
      }

      // Catture in diagonale (anche en passant)
      for (const dc of [-1, 1]) {
        const cc = c + dc;
        if (cc < 0 || cc > 7) continue;
        const to = r1 * 8 + cc;
        const t = b[to];
        if (t && isWhite(t) !== white) add(to, t, '');
        else if (to === this.ep) add(to, white ? 'p' : 'P', 'ep');
      }
    }

    _steps(i, r, c, deltas, white, moves, capturesOnly) {
      const b = this.board;
      const p = b[i];
      for (const [dr, dc] of deltas) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const to = rr * 8 + cc;
        const t = b[to];
        if (!t) {
          if (!capturesOnly) moves.push(mv(i, to, p));
        } else if (isWhite(t) !== white) {
          moves.push(mv(i, to, p, t));
        }
      }
    }

    _slides(i, r, c, dirs, white, moves, capturesOnly) {
      const b = this.board;
      const p = b[i];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const to = rr * 8 + cc;
          const t = b[to];
          if (!t) {
            if (!capturesOnly) moves.push(mv(i, to, p));
          } else {
            if (isWhite(t) !== white) moves.push(mv(i, to, p, t));
            break;
          }
          rr += dr; cc += dc;
        }
      }
    }

    // Arrocco: re e torre mai mossi, caselle in mezzo libere,
    // il re non è sotto scacco e non attraversa caselle attaccate.
    _castling(white, moves) {
      const b = this.board;
      const them = white ? 'b' : 'w';
      const k = white ? 60 : 4; // e1 oppure e8
      const K = white ? 'K' : 'k', R = white ? 'R' : 'r';
      if (b[k] !== K) return;
      const ks = white ? WK : BK, qs = white ? WQ : BQ;
      if ((this.castling & (ks | qs)) === 0) return;
      if (this._attacked(k, them)) return;

      if ((this.castling & ks) && !b[k + 1] && !b[k + 2] && b[k + 3] === R &&
          !this._attacked(k + 1, them) && !this._attacked(k + 2, them)) {
        moves.push(mv(k, k + 2, K, null, 'O-O'));
      }
      if ((this.castling & qs) && !b[k - 1] && !b[k - 2] && !b[k - 3] && b[k - 4] === R &&
          !this._attacked(k - 1, them) && !this._attacked(k - 2, them)) {
        moves.push(mv(k, k - 2, K, null, 'O-O-O'));
      }
    }

    // Esegue una mossa (interna). Salva una copia per poterla annullare.
    _make(m) {
      const b = this.board;
      this._stack.push([b.slice(), this.turn, this.castling, this.ep, this.halfmove,
        this.fullmove, this.kingSq.w, this.kingSq.b]);
      const white = this.turn === 'w';

      b[m.to] = m.promotion || m.piece;
      b[m.from] = null;
      if (m.flag === 'ep') {
        b[m.to + (white ? 8 : -8)] = null;             // il pedone catturato è "dietro"
      } else if (m.flag === 'O-O') {
        b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; // torre da h a f
      } else if (m.flag === 'O-O-O') {
        b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; // torre da a a d
      }

      if (m.piece === 'K') this.kingSq.w = m.to;
      else if (m.piece === 'k') this.kingSq.b = m.to;

      this.castling &= CASTLE_MASK[m.from] & CASTLE_MASK[m.to];
      this.ep = m.flag === 'double' ? (m.from + m.to) / 2 : -1;
      this.halfmove = (m.piece === 'P' || m.piece === 'p' || m.captured) ? 0 : this.halfmove + 1;
      if (!white) this.fullmove++;
      this.turn = white ? 'b' : 'w';
    }

    _unmake() {
      const s = this._stack.pop();
      this.board = s[0];
      this.turn = s[1];
      this.castling = s[2];
      this.ep = s[3];
      this.halfmove = s[4];
      this.fullmove = s[5];
      this.kingSq.w = s[6];
      this.kingSq.b = s[7];
    }

    // Mosse davvero legali (il proprio re non resta sotto scacco)
    _legal(capturesOnly) {
      const us = this.turn;
      const out = [];
      for (const m of this._pseudo(capturesOnly)) {
        this._make(m);
        if (!this._attacked(this.kingSq[us], this.turn)) out.push(m);
        this._unmake();
      }
      return out;
    }

    // ---------- Notazione algebrica (es. "Nf3", "exd5", "O-O", "e8=Q+") ----------

    _san(m, legal) {
      let s;
      if (m.flag === 'O-O' || m.flag === 'O-O-O') {
        s = m.flag;
      } else {
        const type = m.piece.toUpperCase();
        if (type === 'P') {
          s = m.captured ? FILES[m.from & 7] + 'x' : '';
          s += sqName(m.to);
          if (m.promotion) s += '=' + m.promotion.toUpperCase();
        } else {
          s = type;
          // Se due pezzi uguali possono andare sulla stessa casa, si indica da dove parte
          const rivals = legal.filter(o => o.piece === m.piece && o.to === m.to && o.from !== m.from);
          if (rivals.length) {
            const sameFile = rivals.some(o => (o.from & 7) === (m.from & 7));
            const sameRank = rivals.some(o => (o.from >> 3) === (m.from >> 3));
            if (!sameFile) s += FILES[m.from & 7];
            else if (!sameRank) s += String(8 - (m.from >> 3));
            else s += sqName(m.from);
          }
          if (m.captured) s += 'x';
          s += sqName(m.to);
        }
      }
      this._make(m);
      if (this.inCheck()) s += this._legal(false).length ? '+' : '#';
      this._unmake();
      return s;
    }

    _export(m, san) {
      return {
        from: sqName(m.from), to: sqName(m.to), piece: m.piece, color: colorOf(m.piece),
        captured: m.captured, promotion: m.promotion, flag: m.flag, san
      };
    }

    // ---------- Funzioni "pubbliche" usate dall'interfaccia ----------

    // Elenco delle mosse legali. opzione: { square: 'e2' } per un solo pezzo.
    moves(opts) {
      const legal = this._legal(false);
      let list = legal;
      if (opts && opts.square) {
        const s = sqIndex(opts.square);
        list = legal.filter(m => m.from === s);
      }
      return list.map(m => this._export(m, this._san(m, legal)));
    }

    // Gioca una mossa: { from: 'e2', to: 'e4', promotion: 'q' } oppure 'e4' / 'Nf3'.
    // Restituisce la mossa giocata, oppure null se non è legale.
    move(input) {
      const legal = this._legal(false);
      let m = null;
      if (typeof input === 'string') {
        const clean = input.replace(/[+#?!]/g, '');
        m = legal.find(x => this._san(x, legal).replace(/[+#]/g, '') === clean) || null;
      } else if (input && input.from && input.to) {
        const f = sqIndex(input.from), t = sqIndex(input.to);
        const promo = (input.promotion || 'q').toLowerCase();
        m = legal.find(x => x.from === f && x.to === t &&
          (!x.promotion || x.promotion.toLowerCase() === promo)) || null;
      }
      if (!m) return null;

      const san = this._san(m, legal);
      this._make(m);
      const record = this._export(m, san);
      this.history.push(record);
      this._keys.push(this._key());
      return record;
    }

    undo() {
      if (!this.history.length) return null;
      this._unmake();
      this._keys.pop();
      return this.history.pop();
    }

    isCheckmate() { return this.inCheck() && this._legal(false).length === 0; }
    isStalemate() { return !this.inCheck() && this._legal(false).length === 0; }
    isFiftyMoves() { return this.halfmove >= 100; }

    isThreefold() {
      const key = this._keys[this._keys.length - 1];
      let n = 0;
      for (const k of this._keys) if (k === key) n++;
      return n >= 3;
    }

    // Nessuno dei due può più dare scacco matto (es. re contro re, re+alfiere contro re)
    isInsufficientMaterial() {
      const minors = [];
      for (let i = 0; i < 64; i++) {
        const p = this.board[i];
        if (!p) continue;
        const t = p.toLowerCase();
        if (t === 'k') continue;
        if (t === 'p' || t === 'r' || t === 'q') return false;
        minors.push({ t, shade: ((i >> 3) + (i & 7)) % 2 });
      }
      if (minors.length <= 1) return true;
      // Solo alfieri, tutti su caselle dello stesso colore
      return minors.every(x => x.t === 'b' && x.shade === minors[0].shade);
    }

    // Stato della partita: null se si continua, altrimenti { result, reason, winner }
    gameOver() {
      const noMoves = this._legal(false).length === 0;
      if (noMoves && this.inCheck()) {
        const winner = this.turn === 'w' ? 'b' : 'w';
        return { result: winner === 'w' ? '1-0' : '0-1', reason: 'checkmate', winner };
      }
      if (noMoves) return { result: '1/2-1/2', reason: 'stalemate', winner: null };
      if (this.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient', winner: null };
      if (this.isThreefold()) return { result: '1/2-1/2', reason: 'threefold', winner: null };
      if (this.isFiftyMoves()) return { result: '1/2-1/2', reason: 'fifty', winner: null };
      return null;
    }

    // Conta le posizioni raggiungibili in `depth` mosse: serve per verificare le regole
    perft(depth) {
      if (depth === 0) return 1;
      const moves = this._legal(false);
      if (depth === 1) return moves.length;
      let n = 0;
      for (const m of moves) {
        this._make(m);
        n += this.perft(depth - 1);
        this._unmake();
      }
      return n;
    }
  }

  const api = { Chess, START_FEN, sqName, sqIndex, colorOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof self !== 'undefined' ? self : this);
