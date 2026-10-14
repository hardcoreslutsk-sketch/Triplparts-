window.TPTranslate = (() => {
  const cfg = window.APP_CONFIG || {};
  const CACHE_KEY = 'tp-tr-cache-v5';

  // URL Supabase Edge Function (переводит через DeepL, ключ живёт на сервере)
  const FUNCTION_URL = cfg.TRANSLATE_FUNCTION_URL ||
    'https://izndgthdwnxjltpcsyuu.supabase.co/functions/v1/translate';

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

  async function translateMany(texts, lang) {
    lastError = null;
    if (lang === 'pl' || !TARGET[lang]) return {};

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
        const res = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: batch,
            source_lang: 'PL',
            target_lang: TARGET[lang]
          })
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          lastError = 'Function HTTP ' + res.status + ' — ' + txt.slice(0, 150);
          batch.forEach(t => { result[t] = t; });
          continue;
        }
        const data = await res.json();
        const translations = data.translations || [];
        batch.forEach((t, i) => {
          const tr = translations[i] || t;
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