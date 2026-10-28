// Test della partita online (solo la parte che non usa la rete). Si lanciano con:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { cleanCode, newCode, mergeSync } = require('../src/js/online.js');

const e4 = { from: 'e2', to: 'e4', promotion: null };
const e5 = { from: 'e7', to: 'e5', promotion: null };
const d5 = { from: 'd7', to: 'd5', promotion: null };

test('codici: 6 caratteri, letti anche da un link incollato', () => {
  assert.match(newCode(), /^[A-Z2-9]{6}$/);
  assert.strictEqual(cleanCode(' k7qx2m '), 'K7QX2M');
  assert.strictEqual(cleanCode('https://x.io/scacchi/?partita=K7QX2M'), 'K7QX2M');
  assert.strictEqual(cleanCode('abc'), null);
});

test("si tiene la partita più avanti, se continua quella dell'altro", () => {
  const local = { n: 1, white: 'host', moves: [e4] };
  const remote = { n: 1, white: 'host', moves: [e4, e5] };
  assert.strictEqual(mergeSync(local, remote, true), remote);
  assert.strictEqual(mergeSync(remote, local, false), null); // l'altro è indietro: non si cambia
});

test('una partita nuova (rivincita) vince sempre sulla vecchia', () => {
  const local = { n: 1, white: 'host', moves: [e4, e5] };
  const remote = { n: 2, white: 'guest', moves: [] };
  assert.strictEqual(mergeSync(local, remote, false), remote);
  assert.strictEqual(mergeSync(remote, local, true), null);
});

test("l'amico che entra per la prima volta prende la partita dell'host", () => {
  const guest = { n: 0, white: null, moves: [] };
  const host = { n: 1, white: 'guest', moves: [] };
  assert.strictEqual(mergeSync(guest, host, false), host);
});

test("storie diverse: comanda l'host; la resa arriva anche senza mosse nuove", () => {
  const host = { n: 1, white: 'host', moves: [e4, e5] };
  const guest = { n: 1, white: 'host', moves: [e4, d5] };
  assert.strictEqual(mergeSync(guest, host, false), host);
  assert.strictEqual(mergeSync(host, guest, true), null);
  const resigned = { n: 1, white: 'host', moves: [e4, e5], over: 'b' };
  assert.strictEqual(mergeSync(host, resigned, true), resigned);
});
