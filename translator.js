window.TPTranslate = (() => {
  const cfg = window.APP_CONFIG || {};
  const CACHE_KEY = 'tp-tr-cache';
  const ENDPOINT = 'https://api-free.deepl.com/v2/translate';

  // Куда переводим
  const TARGET = { en: 'EN-US', pt: 'PT-PT' };

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch (e) { cache = {}; }

  function persist() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
    catch (e) { /* quota — ignore */ }
  }

  function lookup(lang, text) {
    if (!text) return null;
    return cache[lang] && cache[lang][text] ? cache[lang][text] : null;
  }
  function store(lang, text, translated) {
    if (!cache[lang]) cache[lang] = {};
    cache[lang][text] = translated;
  }

  /**
   * Переводит массив текстов. Возвращает объект {оригинал: перевод}.
   * Если ключа нет или язык PL — возвращает пустой объект (используйте .get).
   */
  async function translateMany(texts, lang) {
    if (lang === 'pl' || !TARGET[lang]) return {};
    if (!cfg.DEEPL_KEY) return {};

    const uniq = [...new Set((texts || []).filter(t => typeof t === 'string' && t.trim().length > 0))];
    const result = {};
    const missing = [];
    uniq.forEach(t => {
      const c = lookup(lang, t);
      if (c) result[t] = c;
      else missing.push(t);
    });

    if (!missing.length) return result;

    // DeepL принимает до 50 текстов за раз — бьём на пачки
    const batches = [];
    for (let i = 0; i < missing.length; i += 40) batches.push(missing.slice(i, i + 40));

    for (const batch of batches) {
      try {
        const body = new URLSearchParams();
        body.append('source_lang', 'PL');
        body.append('target_lang', TARGET[lang]);
        batch.forEach(t => body.append('text', t));

        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': 'DeepL-Auth-Key ' + cfg.DEEPL_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          console.warn('DeepL error', res.status, txt);
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
        console.warn('DeepL fetch failed', e);
        batch.forEach(t => { result[t] = t; });
      }
    }

    persist();
    return result;
  }

  /** Синхронный доступ к кэшу. Если нет — возвращает оригинал. */
  function get(text, lang) {
    if (!text) return text;
    if (lang === 'pl') return text;
    return lookup(lang, text) || text;
  }

  /** Утилита: применить перевод к объекту товара */
  function applyToProduct(product, lang, dict) {
    if (!product) return product;
    const tr = t => (dict && dict[t]) ? dict[t] : (lookup(lang, t) || t);
    return Object.assign({}, product, {
      _trName: tr(product.name),
      _trCategory: tr(product.category),
      _trDescription: tr(product.description)
    });
  }

  return { translateMany, get, applyToProduct };
})();
