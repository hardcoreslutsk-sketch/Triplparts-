window.TPTranslate = (() => {
  const cfg = window.APP_CONFIG || {};
  const CACHE_KEY = 'tp-tr-cache-v3';
  const ENDPOINT = 'https://api-free.deepl.com/v2/translate';

  // Список CORS-прокси — пробуем по очереди, пока один не сработает
  const PROXIES = [
    url => 'https://corsproxy.io/?url=' + encodeURIComponent(url),
    url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    url => 'https://thingproxy.freeboard.io/fetch/' + url,
    url => 'https://cors-anywhere.herokuapp.com/' + url
  ];

  const TARGET = { en: 'EN-US', pt: 'PT-PT' };

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch (e) { cache = {}; }

  function persist() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
  }

  function lookup(lang, text) {
    if (!text) return null;
    return cache[lang] && cache[lang][text] ? cache[lang][text] : null;
  }
  function store(lang, text, translated) {
    if (!cache[lang]) cache[lang] = {};
    cache[lang][text] = translated;
  }

  let lastError = null;

  async function fetchWithProxies(targetUrl, options) {
    let lastErr = null;
    for (let i = 0; i < PROXIES.length; i++) {
      const proxied = PROXIES[i](targetUrl);
      try {
        const res = await fetch(proxied, options);
        if (res.ok) return res;
        lastErr = 'proxy ' + i + ' → HTTP ' + res.status;
      } catch (e) {
        lastErr = 'proxy ' + i + ' → ' + (e.message || 'failed');
      }
    }
    throw new Error('All proxies failed: ' + lastErr);
  }

  async function translateMany(texts, lang) {
    lastError = null;
    if (lang === 'pl' || !TARGET[lang]) return {};
    if (!cfg.DEEPL_KEY) { lastError = 'Brak klucza DeepL'; return {}; }

    const uniq = [...new Set((texts || []).filter(t => typeof t === 'string' && t.trim().length > 0))];
    const result = {};
    const missing = [];
    uniq.forEach(t => {
      const c = lookup(lang, t);
      if (c) result[t] = c;
      else missing.push(t);
    });
    if (!missing.length) return result;

    const batches = [];
    for (let i = 0; i < missing.length; i += 40) batches.push(missing.slice(i, i + 40));

    for (const batch of batches) {
      try {
        const body = new URLSearchParams();
        body.append('source_lang', 'PL');
        body.append('target_lang', TARGET[lang]);
        batch.forEach(t => body.append('text', t));

        const res = await fetchWithProxies(ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': 'DeepL-Auth-Key ' + cfg.DEEPL_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          lastError = 'DeepL HTTP ' + res.status + ' — ' + txt.slice(0, 120);
          batch.forEach(t => { result[t] = t; });
          continue;
        }

        const data = await res.json();
        const trans = data.translations || [];
        batch.forEach((t, i) => {
          const tr = (trans[i] && trans[i].text) ? trans[i].text : t;
          result[t] = tr;
          store(lang, t, tr);
        });
      } catch (e) {
        lastError = e.message || 'fetch failed';
        batch.forEach(t => { result[t] = t; });
      }
    }

    persist();
    if (lastError) console.warn('TPTranslate:', lastError);
    return result;
  }

  function get(text, lang) {
    if (!text) return text;
    if (lang === 'pl') return text;
    return lookup(lang, text) || text;
  }

  function getLastError() { return lastError; }

  function clearCache() {
    cache = {};
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  return { translateMany, get, getLastError, clearCache };
})();