/*
 * online.js — PARTITA ONLINE CON UN AMICO, tramite Supabase.
 * Chi crea la partita ("host") riceve un codice; l'amico ("guest") lo inserisce o apre il link.
 * Le mosse viaggiano su un canale in tempo reale "scacchi:CODICE" che possono usare SOLO
 * i due giocatori (lo controllano le regole del database): sono veloci anche con i dati mobili
 * e nessuno dei due vede l'indirizzo IP dell'altro.
 * Ogni dispositivo entra in automatico come "ospite" (account anonimo, nessun dato personale).
 * Se la connessione cade (telefono in tasca, rete che cambia) si ricollega da solo.
 */
(function (root) {
  'use strict';

  const URL = 'https://vnegcvnpribnojkxmegg.supabase.co';
  const KEY = 'sb_publishable_HnOulQ5E1wXOxoyY1B_SZw_Eedb2xy8';   // chiave PUBBLICA: può stare nel gioco
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

  let sb = null, ch = null, role = null, code = null, cb = {}, timer = null, closed = true, here = false, gen = 0;

  function status(s) { cb.onStatus && cb.onStatus(s); }

  function later(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!closed) fn(); }, ms);
  }

  function client() {
    if (!sb && root.supabase && root.supabase.createClient) {
      sb = root.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'account-scacchi' } });
    }
    return sb;
  }

  // Entra come ospite se non c'è già un accesso; restituisce la sessione
  async function session() {
    const { data } = await sb.auth.getSession();
    if (data && data.session) return data.session;
    const r = await sb.auth.signInAnonymously();
    return r.error ? null : r.data.session;
  }

  // Il posto nella partita: l'host la crea, l'amico entra (o rientra) con il codice
  async function seat() {
    if (role === 'host') {
      const { error } = await sb.from('partite_scacchi').insert({ codice: code });
      if (!error) return 'ok';
      if (error.code !== '23505') return 'errore';   // 23505 = esiste già
      const { data } = await sb.from('partite_scacchi').select('codice').eq('codice', code).maybeSingle();
      return data ? 'ok' : 'occupato';                // è nostra (si riprende) oppure di qualcun altro
    }
    const { data, error } = await sb.rpc('entra_partita', { c: code });
    return error ? 'errore' : data;
  }

  // L'avversario è collegato? Lo dice la "presenza" sul canale
  function checkHere() {
    if (!ch) return;
    const st = ch.presenceState();
    const other = role === 'host' ? 'guest' : 'host';
    const now = !!(st[other] && st[other].length);
    if (now && !here) { here = true; status('collegato'); cb.onConnect && cb.onConnect(); }
    else if (!now && here) { here = false; status(role === 'host' ? 'attesa' : 'assente'); }
  }

  async function start() {
    if (closed) return;
    const my = ++gen;
    if (!client()) { status('errore'); return; }
    status('apertura');
    const s = await session();
    if (my !== gen || closed) return;
    if (!s) { status('riconnessione'); later(start, 5000); return; }
    status('cerco');
    const r = await seat();
    if (my !== gen || closed) return;
    if (r === 'piena') { cb.onMessage && cb.onMessage({ t: 'full' }); return; }
    if (r === 'occupato' && role === 'host') { cb.onCodeTaken && cb.onCodeTaken(); return; }
    if (r !== 'ok') { status(role === 'guest' ? 'assente' : 'riconnessione'); later(start, 4000); return; }
    sb.realtime.setAuth(s.access_token);
    if (ch) { sb.removeChannel(ch); ch = null; }
    here = false;
    const c = sb.channel('scacchi:' + code, { config: { private: true, broadcast: { self: false }, presence: { key: role } } });
    ch = c;
    c.on('broadcast', { event: 'm' }, ({ payload }) => { if (c === ch && payload && typeof payload === 'object') cb.onMessage && cb.onMessage(payload); });
    c.on('presence', { event: 'sync' }, () => { if (c === ch) checkHere(); });
    c.subscribe(async (st) => {
      if (c !== ch || closed) return;
      if (st === 'SUBSCRIBED') {
        await c.track({ at: Date.now() });
        if (!here) status(role === 'host' ? 'attesa' : 'cerco');
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        here = false;
        status('riconnessione');
        later(start, 3000);
      }
    });
  }

  // Quando si torna nell'app (il telefono l'aveva "addormentata") si controlla il collegamento
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || closed) return;
      if (ch && ch.state === 'joined') { checkHere(); return; }
      clearTimeout(timer);
      start();
    });
  }

  // r: 'host' o 'guest'; c: codice della partita; callbacks: onStatus, onConnect, onMessage, onCodeTaken
  // (il quarto argomento, il vecchio "biglietto", non serve più: ora i posti li controlla il database)
  function open(r, c, callbacks) {
    leave();
    role = r; code = c; cb = callbacks || {}; closed = false;
    start();
  }

  function send(msg) {
    if (!ch || !here) return false;
    ch.send({ type: 'broadcast', event: 'm', payload: msg });
    return true;
  }

  function leave() {
    closed = true;
    gen++;
    clearTimeout(timer);
    if (ch && sb) { try { sb.removeChannel(ch); } catch (e) { /* già chiuso */ } }
    ch = null;
    here = false;
  }

  const api = { newCode, cleanCode, mergeSync, open, send, leave, connected: () => !!(ch && here) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Online = api;
})(typeof window !== 'undefined' ? window : globalThis);
