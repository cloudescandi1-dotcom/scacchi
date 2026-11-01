// Il computer "pensa" qui, in un thread separato: così la pagina non si blocca.
importScripts('chess.js', 'ai.js');

self.onmessage = (e) => {
  const { id, fen, level } = e.data;
  const move = self.ChessAI.bestMove(fen, level);
  self.postMessage({ id, move });
};
