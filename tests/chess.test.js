// Test delle regole. Si lanciano con:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { Chess } = require('../src/js/chess.js');

// Numeri di riferimento noti (https://www.chessprogramming.org/Perft_Results)
const PERFT = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];

for (const [fen, counts] of PERFT) {
  test('perft ' + fen, () => {
    const g = new Chess(fen);
    counts.forEach((n, i) => assert.strictEqual(g.perft(i + 1), n, 'profondità ' + (i + 1)));
  });
}

test('matto del barbiere / matto dell\'imbecille', () => {
  const g = new Chess();
  for (const s of ['f3', 'e5', 'g4']) assert.ok(g.move(s), s);
  const last = g.move('Qh4');
  assert.strictEqual(last.san, 'Qh4#');
  assert.deepStrictEqual(g.gameOver(), { result: '0-1', reason: 'checkmate', winner: 'b' });
});

test('stallo', () => {
  const g = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.strictEqual(g.gameOver().reason, 'stalemate');
});

test('arrocco corto e lungo', () => {
  const g = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.strictEqual(g.move({ from: 'e1', to: 'g1' }).san, 'O-O');
  assert.strictEqual(g.get('f1'), 'R');
  assert.strictEqual(g.move({ from: 'e8', to: 'c8' }).san, 'O-O-O');
  assert.strictEqual(g.get('d8'), 'r');
});

test('non si arrocca attraverso una casa attaccata', () => {
  const g = new Chess('4k3/8/8/8/8/8/5r2/4K2R w K - 0 1');
  assert.strictEqual(g.move({ from: 'e1', to: 'g1' }), null);
});

test('en passant', () => {
  const g = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const m = g.move({ from: 'e5', to: 'd6' });
  assert.strictEqual(m.san, 'exd6');
  assert.strictEqual(g.get('d5'), null);
});

test('promozione a scelta', () => {
  const g = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1');
  assert.strictEqual(g.moves({ square: 'a7' }).length, 4);
  assert.strictEqual(g.move({ from: 'a7', to: 'a8', promotion: 'n' }).san, 'a8=N');
  assert.strictEqual(g.get('a8'), 'N');
});

test('materiale insufficiente', () => {
  assert.strictEqual(new Chess('8/8/4k3/8/8/2KB4/8/8 w - - 0 1').gameOver().reason, 'insufficient');
  assert.strictEqual(new Chess('8/8/4k3/8/8/2KR4/8/8 w - - 0 1').gameOver(), null);
});

test('triplice ripetizione', () => {
  const g = new Chess();
  for (const s of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1']) g.move(s);
  assert.strictEqual(g.gameOver(), null);
  g.move('Ng8');
  assert.strictEqual(g.gameOver().reason, 'threefold');
});

test('regola delle 50 mosse', () => {
  assert.strictEqual(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 100 80').gameOver().reason, 'fifty');
});

test('annullare una mossa riporta la posizione di prima', () => {
  const g = new Chess();
  const before = g.fen();
  g.move('e4');
  g.undo();
  assert.strictEqual(g.fen(), before);
});

test('disambiguazione: Nbd2', () => {
  const g = new Chess('4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1');
  assert.strictEqual(g.move({ from: 'b1', to: 'd2' }).san, 'Nbd2');
});
