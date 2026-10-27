// Test dell'avversario computer. Si lanciano con:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { Chess } = require('../src/js/chess.js');
const { bestMove, LEVELS } = require('../src/js/ai.js');

test('vede il matto in una mossa (livelli 3-5)', () => {
  // Matto del corridoio: Ra8#
  const fen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
  for (const level of [3, 4, 5]) {
    const m = bestMove(fen, level);
    assert.deepStrictEqual([m.from, m.to], ['a1', 'a8'], 'livello ' + level);
  }
});

test('mangia la donna regalata (livello 4)', () => {
  // La donna nera su h4 può essere presa dal pedone g3
  const fen = 'rnb1kbnr/pppp1ppp/8/4p3/7q/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 1';
  const m = bestMove(fen, 4);
  assert.deepStrictEqual([m.from, m.to], ['g3', 'h4']);
});

test('ogni livello risponde entro il tempo previsto', () => {
  const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
  for (const level of Object.keys(LEVELS)) {
    const t0 = Date.now();
    const m = bestMove(fen, Number(level));
    const ms = Date.now() - t0;
    assert.ok(new Chess(fen).move(m), 'mossa legale al livello ' + level);
    assert.ok(ms < LEVELS[level].time + 500, `livello ${level}: ${ms} ms`);
  }
});

test('una partita intera computer contro computer finisce senza errori', () => {
  const g = new Chess();
  let plies = 0;
  while (!g.gameOver() && plies < 200) {
    const m = bestMove(g.fen(), plies % 2 ? 1 : 2);
    assert.ok(g.move(m), 'mossa legale ' + JSON.stringify(m));
    plies++;
  }
  assert.ok(plies > 0);
});
