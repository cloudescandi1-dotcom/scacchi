// Controlla che ogni lezione sia risolvibile. Si lancia con:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { Chess, START_FEN } = require('../src/js/chess.js');
const { LESSONS } = require('../src/js/lessons.js');

const uci = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

for (const lesson of LESSONS) {
  test(`${lesson.group} › ${lesson.title}`, () => {
    assert.ok(lesson.steps.length > 0);
    lesson.steps.forEach((s, i) => {
      const where = `passo ${i + 1}`;
      assert.ok(s.text, where + ': manca il testo');
      const fen = s.fen || START_FEN;
      new Chess(fen); // la posizione deve essere valida

      if (s.goal === 'reach') {
        assert.ok(s.stars && s.stars.length, where + ': nessuna stella');
      }
      if (s.goal === 'captureAll') {
        assert.ok(new Chess(fen).board.some(p => p && p >= 'a' && p !== 'k'), where + ': niente da catturare');
      }
      if (['move', 'check', 'mate'].includes(s.goal)) {
        assert.ok(s.answer && s.answer.length, where + ': manca answer');
        for (const a of s.answer) {
          const g = new Chess(fen);
          assert.ok(g.move(uci(a)), `${where}: ${a} non è legale`);
          if (s.goal === 'check') assert.ok(g.inCheck(), `${where}: ${a} non dà scacco`);
          if (s.goal === 'mate') assert.ok(g.isCheckmate(), `${where}: ${a} non è matto`);
        }
      }
      if (s.goal === 'line') {
        assert.ok(s.side === 'w' || s.side === 'b', where + ': side mancante');
        assert.strictEqual(s.comments.length, s.line.length, where + ': un commento per ogni mossa');
        const g = new Chess(fen);
        for (const a of s.line) assert.ok(g.move(uci(a)), `${where}: ${a} non è legale`);
      }
    });
  });
}
