// Consenso alla memoria del dispositivo. Finché non si accetta, partite, lezioni e stile
// restano solo nella memoria della pagina; la scelta stessa viene sempre ricordata.
(function (root) {
  'use strict';
  // Niente incorniciamento da altri siti (questo file è il primo a essere caricato)
  if (root.top !== root.self) {
    try { root.top.location = root.self.location.href; } catch (e) { document.documentElement.innerHTML = ''; }
  }
  const CHIAVE = 'scacchi-consenso';
  const mem = {};

  function scelta() {
    try { return localStorage.getItem(CHIAVE); } catch (e) { return null; }
  }
  const ok = () => scelta() === 'si';

  const Archivio = {
    ok,
    get(k) {
      if (!ok()) return k in mem ? mem[k] : null;
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set(k, v) {
      if (!ok()) { mem[k] = v; return; }
      try { localStorage.setItem(k, v); } catch (e) { /* pazienza */ }
    },
  };

  function scegli(si) {
    try {
      if (si) {
        localStorage.setItem(CHIAVE, 'si');
        for (const k in mem) localStorage.setItem(k, mem[k]);
      } else {
        localStorage.clear();
        localStorage.setItem(CHIAVE, 'no');
      }
    } catch (e) { /* memoria non disponibile */ }
    document.getElementById('consenso').hidden = true;
  }

  function mostra() { document.getElementById('consenso').hidden = false; }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('c-accetta').onclick = () => scegli(true);
    document.getElementById('c-rifiuta').onclick = () => scegli(false);
    const cambia = document.getElementById('cambia-scelta');
    if (cambia) cambia.onclick = (e) => { e.preventDefault(); mostra(); };
    if (scelta() == null) mostra();
  });

  root.Archivio = Archivio;
})(typeof window !== 'undefined' ? window : globalThis);
