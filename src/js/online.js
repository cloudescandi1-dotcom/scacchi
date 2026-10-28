/*
 * online.js — PARTITA ONLINE CON UN AMICO, senza un nostro server.
 * I due dispositivi si collegano direttamente tra loro (WebRTC, tramite la libreria PeerJS).
 * Chi crea la partita ("host") riceve un codice; l'amico ("guest") lo inserisce o apre il link.
 * Se la connessione cade (telefono in tasca, rete che cambia) si ricollega da solo.
 */
(function (root) {
  'use strict';

  const PREFIX = 'scacchi-cloudescandi-';   // per non confonderci con altre app sullo stesso servizio
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente 0/O e 1/I, si confondono

  function newCode() {
    let s = '';
    for (let i = 0; i < 6; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    return s;
  }

  // Pulisce un codice scritto a mano (spazi, minuscole, link incollato intero)
  function cleanCode(text) {
    const m = /[?&]partita=([A-Za-z0-9]+)/.exec(text || '');
    const s = (m ? m[1] : String(text || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length === 6 ? s : null;
  }

  // Chi ha la partita "più avanti" vince: si tiene la lista di mosse più lunga,
  // purché sia la continuazione dell'altra. A parità di numero di partita decide l'host.
  // local/remote: { n: numero partita, moves: [...], white: 'host'|'guest' }
  function mergeSync(local, remote, iAmHost) {
    if (!remote || !Array.isArray(remote.moves)) return null;
    if ((remote.n | 0) > (local.n | 0)) return remote;
    if ((remote.n | 0) < (local.n | 0)) return null;
    const same = (a, b) => a.from === b.from && a.to === b.to && (a.promotion || null) === (b.promotion || null);
    const shorter = remote.moves.length < local.moves.length ? remote.moves : local.moves;
    const longer = shorter === remote.moves ? local.moves : remote.moves;
    const prefix = shorter.every((m, i) => same(m, longer[i]));
    if (prefix) return remote.moves.length > local.moves.length || remote.over && !local.over ? remote : null;
    return iAmHost ? null : remote; // storie diverse (non dovrebbe succedere): comanda l'host
  }

  let peer = null, conn = null, role = null, code = null, cb = {}, timer = null, closed = true;
  // Biglietto segreto dell'amico: il guest lo manda appena si collega; l'host accetta solo quello
  // (il primo che arriva lo fissa). Così chi scopre il codice non può prendere il posto dell'amico.
  let token = null;

  function status(s) { cb.onStatus && cb.onStatus(s); }

  function later(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!closed) fn(); }, ms);
  }

  function makePeer(id) {
    if (peer && !peer.destroyed) peer.destroy();
    peer = id ? new root.Peer(id, { debug: 0 }) : new root.Peer({ debug: 0 });
    peer.on('disconnected', () => { if (!closed) later(() => { try { peer.reconnect(); } catch (e) { start(); } }, 2000); });
    peer.on('error', (err) => {
      if (closed) return;
      if (err.type === 'unavailable-id') { status('apertura'); later(start, 3000); return; } // codice ancora "occupato" dopo un ricaricamento
      if (err.type === 'peer-unavailable') { status('assente'); later(connect, 4000); return; } // l'host non è collegato
      status('riconnessione');
      later(start, 4000);
    });
    return peer;
  }

  function accept(c) {
    if (conn && conn !== c) { try { conn.close(); } catch (e) { /* vecchia */ } }
    conn = c;
    status('collegato');
    cb.onConnect && cb.onConnect();
  }

  function setup(c) {
    let checked = role === 'guest';
    c.on('open', () => {
      if (role !== 'guest') return; // l'host aspetta il biglietto
      conn = c;
      c.send({ t: 'hello', token });
      accept(c);
    });
    c.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (!checked) {
        if (msg.t !== 'hello' || typeof msg.token !== 'string' || msg.token.length > 40) { try { c.close(); } catch (e) { /* già chiusa */ } return; }
        if (token && msg.token !== token) {
          try { c.send({ t: 'full' }); } catch (e) { /* pazienza */ }
          setTimeout(() => { try { c.close(); } catch (e) { /* già chiusa */ } }, 500);
          return;
        }
        if (!token) { token = msg.token; cb.onToken && cb.onToken(token); }
        checked = true;
        accept(c);
        return;
      }
      if (c === conn) cb.onMessage && cb.onMessage(msg);
    });
    c.on('close', () => {
      if (c !== conn) return;
      conn = null;
      if (closed) return;
      if (role === 'host') status('attesa');
      else { status('riconnessione'); later(connect, 2500); }
    });
    c.on('error', () => { /* gestito da close */ });
  }

  function connect() {
    if (closed || !peer || peer.destroyed || !peer.open) { later(start, 2000); return; }
    status('cerco');
    const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
    setup(c);
    // Se dopo un po' non si è aperta, si ricomincia da capo (nuovo collegamento al server)
    setTimeout(() => { if (!closed && conn !== c) { try { c.close(); } catch (e) { /* già chiusa */ } if (!conn) start(); } }, 10000);
  }

  // Quando si torna nell'app (il telefono l'aveva "addormentata") si rifà il collegamento da capo
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || closed) return;
      if (conn && conn.open) { conn.send({ t: 'ping' }); return; }
      clearTimeout(timer);
      start();
    });
  }

  function start() {
    if (closed) return;
    if (typeof root.Peer === 'undefined') { status('errore'); return; }
    status('apertura');
    if (role === 'host') {
      const p = makePeer(PREFIX + code);
      p.on('open', () => status(conn ? 'collegato' : 'attesa'));
      p.on('connection', setup);
    } else {
      const p = makePeer(null);
      p.on('open', connect);
    }
  }

  // r: 'host' o 'guest'; c: codice della partita; callbacks: onStatus, onConnect, onMessage, onToken
  // t: biglietto (guest: il proprio; host: quello dell'amico già entrato, oppure null)
  function open(r, c, callbacks, t) {
    leave();
    role = r; code = c; cb = callbacks || {}; closed = false; token = t || null;
    start();
  }

  function send(msg) {
    if (conn && conn.open) { conn.send(msg); return true; }
    return false;
  }

  function leave() {
    closed = true;
    clearTimeout(timer);
    if (conn) { try { conn.close(); } catch (e) { /* già chiusa */ } }
    conn = null;
    if (peer && !peer.destroyed) peer.destroy();
    peer = null;
  }

  const api = { newCode, cleanCode, mergeSync, open, send, leave, connected: () => !!(conn && conn.open) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Online = api;
})(typeof window !== 'undefined' ? window : globalThis);
