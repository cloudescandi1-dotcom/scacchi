// Captcha "Turnstile" di Cloudflare: controlla che a creare un account sia una persona e non un
// programma che ne crea migliaia. Quasi sempre è invisibile; solo nei casi sospetti compare un
// riquadro in basso da toccare. Il "biglietto" (token) che restituisce viene controllato da Supabase.
// SITE_KEY è la chiave PUBBLICA del sito (può stare nel gioco); quella segreta sta solo in Supabase.
// Se SITE_KEY è vuota il captcha è spento e non si scarica niente da Cloudflare.
(function (root) {
  'use strict';
  const SITE_KEY = '0x4AAAAAAFtQPNHVoDYevmyS';

  let loading = null;
  function load() {
    if (root.turnstile) return Promise.resolve(root.turnstile);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => res(root.turnstile);
      s.onerror = () => { loading = null; rej(new Error('captcha non caricato')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // Restituisce il biglietto da dare a Supabase (o undefined se il captcha è spento)
  async function token() {
    if (!SITE_KEY) return undefined;
    const ts = await load();
    return new Promise((res, rej) => {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:300';
      document.body.appendChild(box);
      let id = null;
      const done = () => { try { if (id !== null) ts.remove(id); } catch (e) { /* già tolto */ } box.remove(); };
      id = ts.render(box, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',   // si vede solo se serve un tocco
        language: 'it',
        callback: (t) => { done(); res(t); },
        'error-callback': () => { done(); rej(new Error('captcha non superato')); },
        'timeout-callback': () => { done(); rej(new Error('captcha scaduto')); },
      });
    });
  }

  root.Captcha = { token, attivo: () => !!SITE_KEY };
})(typeof self !== 'undefined' ? self : this);
