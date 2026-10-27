/*
 * ai.js — l'avversario COMPUTER.
 *
 * Idea di base (algoritmo "minimax" con potatura alfa-beta):
 *   il computer prova le sue mosse, poi le risposte dell'avversario, poi le sue...
 *   fino a una certa profondità, e dà un punteggio alle posizioni finali
 *   (materiale + buona posizione dei pezzi). Sceglie la mossa che gli garantisce
 *   il punteggio migliore supponendo che anche l'avversario giochi bene.
 *
 * Livelli: più è alto, più mosse "in avanti" guarda e meno sbaglia apposta.
 */
(function (root) {
  'use strict';

  const ChessLib = (typeof module === 'object' && module.exports) ? require('./chess.js') : root;
  const Chess = ChessLib.Chess;

  const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const MATE = 100000;
  const INF = 1e9;

  // Livelli di difficoltà
  //   depth: quante mezze-mosse guarda avanti
  //   noise: errore casuale aggiunto (in centesimi di pedone) per sbagliare ogni tanto
  //   time:  tempo massimo di riflessione in millisecondi
  const LEVELS = {
    1: { name: 'Principiante', depth: 1, noise: 300, time: 1000 },
    2: { name: 'Facile', depth: 2, noise: 120, time: 1500 },
    3: { name: 'Medio', depth: 3, noise: 35, time: 2000 },
    4: { name: 'Difficile', depth: 4, noise: 0, time: 2500 },
    5: { name: 'Esperto', depth: 7, noise: 0, time: 4000 },
  };

  // Tabelle "pezzo-casa": bonus o malus per ogni casa (dal punto di vista del Bianco,
  // la prima riga è la traversa 8). Per il Nero si usano rovesciate.
  const PST = {
    p: [
      0, 0, 0, 0, 0, 0, 0, 0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0,
      5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0],
    n: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 0, 0, 0, -20, -40,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50],
    b: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20],
    r: [
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 10, 10, 10, 10, 10, 10, 5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      0, 0, 0, 5, 5, 0, 0, 0],
    q: [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20],
    k: [ // mediogioco: il re sta al riparo
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20],
    kEnd: [ // finale: il re va al centro
      -50, -40, -30, -20, -20, -30, -40, -50,
      -30, -20, -10, 0, 0, -10, -20, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -30, 0, 0, 0, 0, -30, -30,
      -50, -30, -30, -30, -30, -30, -30, -50],
  };

  // Punteggio della posizione dal punto di vista di chi deve muovere
  // (positivo = buono per lui).
  function evaluate(g) {
    const b = g.board;
    let score = 0;       // positivo = meglio per il Bianco
    let material = 0;
    let heavy = 0;       // materiale senza pedoni, per capire se siamo in finale
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const t = p.toLowerCase();
      if (t !== 'p' && t !== 'k') heavy += VALUE[t];
      const v = VALUE[t];
      if (p < 'a') { material += v; score += v + (t === 'k' ? 0 : PST[t][i]); }
      else { material -= v; score -= v + (t === 'k' ? 0 : PST[t][i ^ 56]); }
    }

    const endgame = heavy <= 1300;
    const wk = g.kingSq.w, bk = g.kingSq.b;
    const kt = endgame ? PST.kEnd : PST.k;
    score += kt[wk] - kt[bk ^ 56];

    // Nei finali vinti: spingi il re avversario verso il bordo e avvicina il tuo
    if (endgame && Math.abs(material) >= 300) {
      const winnerIsWhite = material > 0;
      const loser = winnerIsWhite ? bk : wk;
      const lr = loser >> 3, lc = loser & 7;
      const centerDist = Math.max(3 - lr, lr - 4) + Math.max(3 - lc, lc - 4);
      const kingDist = Math.abs((wk >> 3) - (bk >> 3)) + Math.abs((wk & 7) - (bk & 7));
      const bonus = centerDist * 10 + (14 - kingDist) * 4;
      score += winnerIsWhite ? bonus : -bonus;
    }

    return g.turn === 'w' ? score : -score;
  }

  // Ordina le mosse: prima le catture più convenienti (es. pedone che mangia donna)
  function orderMoves(moves, first) {
    for (const m of moves) {
      let s = 0;
      if (m.captured) s += 10 * VALUE[m.captured.toLowerCase()] - VALUE[m.piece.toLowerCase()] + 10000;
      if (m.promotion) s += VALUE[m.promotion.toLowerCase()] + 9000;
      if (first && m.from === first.from && m.to === first.to && m.promotion === first.promotion) s += 1e6;
      m._score = s;
    }
    return moves.sort((a, b) => b._score - a._score);
  }

  const TIMEOUT = { timeout: true };

  // Trova la mossa migliore. Restituisce { from, to, promotion } con le case in lettere.
  function bestMove(fen, level) {
    const cfg = LEVELS[level] || LEVELS[3];
    const g = new Chess(fen);
    const deadline = Date.now() + cfg.time;
    let nodes = 0;

    function tick() {
      if ((++nodes & 1023) === 0 && Date.now() > deadline) throw TIMEOUT;
    }

    // Alla fine della ricerca si continuano a guardare le catture,
    // così il computer non si ferma nel mezzo di uno scambio.
    function quiesce(alpha, beta, qdepth) {
      tick();
      const stand = evaluate(g);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (qdepth <= 0) return stand;
      const us = g.turn;
      for (const m of orderMoves(g._pseudo(true))) {
        g._make(m);
        if (g._attacked(g.kingSq[us], g.turn)) { g._unmake(); continue; }
        const s = -quiesce(-beta, -alpha, qdepth - 1);
        g._unmake();
        if (s >= beta) return s;
        if (s > alpha) alpha = s;
      }
      return alpha;
    }

    function negamax(depth, alpha, beta, ply) {
      if (g.halfmove >= 100) return 0;
      const us = g.turn;
      const inCheck = g._attacked(g.kingSq[us], us === 'w' ? 'b' : 'w');
      if (inCheck && ply < 10) depth++; // sotto scacco guarda una mossa in più
      if (depth <= 0) return quiesce(alpha, beta, 6);
      tick();

      let best = -INF;
      let legal = 0;
      for (const m of orderMoves(g._pseudo(false))) {
        g._make(m);
        if (g._attacked(g.kingSq[us], g.turn)) { g._unmake(); continue; }
        legal++;
        const s = -negamax(depth - 1, -beta, -alpha, ply + 1);
        g._unmake();
        if (s > best) best = s;
        if (s > alpha) alpha = s;
        if (alpha >= beta) break;
      }
      if (!legal) return inCheck ? -MATE + ply : 0; // matto o stallo
      return best;
    }

    let rootMoves = g._legal(false);
    if (!rootMoves.length) return null;
    let chosen = rootMoves[Math.floor(Math.random() * rootMoves.length)];
    if (rootMoves.length === 1) return toPublic(rootMoves[0]);

    // "Approfondimento iterativo": prima profondità 1, poi 2, 3...
    // Se il tempo finisce si usa il risultato dell'ultima profondità completata.
    for (let depth = 1; depth <= cfg.depth; depth++) {
      try {
        const scored = [];
        let alpha = -INF;
        for (const m of orderMoves(rootMoves, chosen)) {
          g._make(m);
          // Con il "rumore" serve il punteggio esatto di ogni mossa (finestra piena)
          const s = cfg.noise ? -negamax(depth - 1, -INF, INF, 1) : -negamax(depth - 1, -INF, -alpha, 1);
          g._unmake();
          scored.push({ m, s });
          if (s > alpha) alpha = s;
        }
        let bestScore = -INF;
        for (const x of scored) {
          const noisy = x.s + (cfg.noise ? (Math.random() - 0.5) * 2 * cfg.noise : 0);
          if (noisy > bestScore) { bestScore = noisy; chosen = x.m; }
        }
        if (!cfg.noise && alpha > MATE - 1000) break; // trovato uno scacco matto
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        break;
      }
    }
    return toPublic(chosen);
  }

  function toPublic(m) {
    return { from: ChessLib.sqName(m.from), to: ChessLib.sqName(m.to), promotion: m.promotion ? m.promotion.toLowerCase() : null };
  }

  const api = { bestMove, evaluate, LEVELS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChessAI = api;
})(typeof self !== 'undefined' ? self : this);
