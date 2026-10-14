(() => {
  const cfg = window.APP_CONFIG || {};
  const i18n = window.TPi18n;
  const T = k => i18n ? i18n.t(k) : k;
  const configured =
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const $ = id => document.getElementById(id);
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  let products = [];
  let vehicles = [];
  let imagesByProduct = {};
  let renderToken = 0;

  function setStatus(text, type) {
    const el = document.getElementById('catalog-status');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = type === 'error' ? '#ff8b8b' : type === 'info' ? '#ffd98a' : '';
    el.style.background = type === 'error' ? '#2a1010' : type === 'info' ? '#2a2210' : '';
    el.style.padding = type ? '14px' : '';
    el.style.borderRadius = type ? '8px' : '';
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  const placeholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">' +
    '<rect width="640" height="440" fill="#1a1a1a"/>' +
    '<g fill="none" stroke="#3a3a3a" stroke-width="5">' +
    '<path d="M170 280h300l-35-80H235z"/>' +
    '<circle cx="235" cy="300" r="32"/><circle cx="405" cy="300" r="32"/>' +
    '<path d="M260 205l28-38h90l40 38"/></g></svg>'
  )}`;

  function formatPrice(p) {
    if (!i18n) return String(p.price_pln);
    return i18n.formatProductPrice(p);
  }
  function statusText(s) {
    const map = {
      available: T('status.available'),
      reserved: T('status.reserved'),
      sold: T('status.sold'),
      hidden: T('status.hidden')
    };
    return map[s] || T('status.available');
  }
  function currentLang() { return i18n ? i18n.getLang() : 'pl'; }

  function buildToast(html) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return null;
    const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = html; wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const remove = () => { el.classList.remove('show'); el.classList.add('hide'); setTimeout(() => el.remove(), 350); };
    const btn = el.querySelector('[data-toast-close]');
    if (btn) btn.addEventListener('click', remove);
    return { el, remove };
  }
  function showCartToast(product, imageUrl) {
    const t = buildToast(`
      ${imageUrl ? `<img class="toast-thumb" src="${esc(imageUrl)}" alt="">` : '<div class="toast-icon">✓</div>'}
      <div class="toast-body">
        <div class="toast-title">${esc(T('toast.addedCart'))}</div>
        <div class="toast-sub">${esc(product.name || '')}</div>
        <div class="toast-actions">
          <a href="checkout.html">${esc(T('product.viewCart'))}</a>
          <button type="button" data-toast-close>${esc(T('product.close'))}</button>
        </div>
      </div>`);
    if (t) setTimeout(t.remove, 4200);
  }

  function addToCart(p, imageUrl) {
    if (!window.TPCart) return;
    window.TPCart.add({
      id: p.id, sku: p.sku, name: p.name,
      price_pln: p.price_pln, image: imageUrl || ''
    });
    showCartToast(p, imageUrl || '');
  }

  function productUrl(id) { return 'product.html?id=' + encodeURIComponent(id); }

  function setFilters() {
    const makes = [...new Set(products.map(p => {
      const v = vehicles.find(x => x.id === p.vehicle_id);
      return v ? v.make : null;
    }).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'pl'));
    const mSel = $('make-filter'), cSel = $('category-filter');
    const om = mSel.value, oc = cSel.value;
    mSel.innerHTML = `<option value="">${esc(T('catalog.allMakes'))}</option>` +
      makes.map(v => `<option>${esc(v)}</option>`).join('');
    cSel.innerHTML = `<option value="">${esc(T('catalog.allCategories'))}</option>` +
      categories.map(v => `<option>${esc(v)}</option>`).join('');
    mSel.value = om; cSel.value = oc;
  }

  function getSort() { const s = $('sort-filter'); return s ? s.value : 'new'; }
  function sortList(list) {
    const s = getSort();
    const arr = list.slice();
    if (s === 'price_asc') arr.sort((a,b) => (Number(a.price_pln)||0) - (Number(b.price_pln)||0));
    else if (s === 'price_desc') arr.sort((a,b) => (Number(b.price_pln)||0) - (Number(a.price_pln)||0));
    return arr;
  }

  async function render() {
    const token = ++renderToken;
    const lang = currentLang();
    const term = $('search').value.trim().toLowerCase();
    const make = $('make-filter').value;
    const cat  = $('category-filter').value;

    let list = products.filter(p => {
      if (p.status === 'hidden' || p.status === 'sold') return false;
      const v = vehicles.find(x => x.id === p.vehicle_id);
      if (make && (!v || v.make !== make)) return false;
      if (cat && p.category !== cat) return false;
      if (term) {
        const hay = [p.name, p.category, p.oem, p.license_number, p.sku, p.description,
          v?.make, v?.model, v?.years, v?.dismantling_number, v?.vin]
          .map(x => String(x||'').toLowerCase());
        // также ищем в переводе, если кэш есть
        if (window.TPTranslate) {
          hay.push(String(window.TPTranslate.get(p.name, lang)).toLowerCase());
          hay.push(String(window.TPTranslate.get(p.category, lang)).toLowerCase());
        }
        if (!hay.some(h => h.includes(term))) return false;
      }
      return true;
    });

    list = sortList(list);

    // Переводим только когда есть язык ≠ pl
    let nameDict = {}, catDict = {};
    if (lang !== 'pl' && window.TPTranslate && list.length) {
      try {
        const names = list.map(p => p.name);
        const cats  = list.map(p => p.category);
        [nameDict, catDict] = await Promise.all([
          window.TPTranslate.translateMany(names, lang),
          window.TPTranslate.translateMany(cats, lang)
        ]);
      } catch (e) { console.warn('Translation failed', e); }
    }

    // Если пока переводили — был вызван новый render, пропускаем этот
    if (token !== renderToken) return;

    const trName = (p) => nameDict[p.name] || p.name;
    const trCat  = (p) => catDict[p.category] || p.category;

    grid.innerHTML = '';
    list.forEach(p => {
      const v = vehicles.find(x => x.id === p.vehicle_id);
      const el = document.getElementById('product-template').content.cloneNode(true);
      const card = el.querySelector('.product-card');
      const img = el.querySelector('.product-image');
      const imgs = imagesByProduct[p.id] || [];
      img.src = imgs[0] || placeholder;
      img.alt = trName(p) || '';

      const badge = el.querySelector('.stock-badge');
      badge.textContent = statusText(p.status);
      badge.classList.add(p.status);

      el.querySelector('.product-category').textContent = trCat(p) || '—';
      el.querySelector('.product-name').textContent = trName(p);
      el.querySelector('.product-fitment').textContent =
        v ? [v.make, v.model, v.years].filter(Boolean).join(' · ') : '';
      el.querySelector('.product-oem').textContent = p.oem ? T('card.oem')+': ' + p.oem : '';
      el.querySelector('.product-price').textContent = formatPrice(p);

      el.querySelectorAll('[data-i18n]').forEach(node => {
        node.textContent = T(node.dataset.i18n);
      });

      card.addEventListener('click', () => { window.location.href = productUrl(p.id); });
      card.addEventListener('keydown', e => { if (e.key === 'Enter') window.location.href = productUrl(p.id); });
      el.querySelector('.product-buy').addEventListener('click', e => {
        e.stopPropagation(); addToCart(p, imgs[0] || '');
      });
      el.querySelector('.product-contact').addEventListener('click', e => {
        e.stopPropagation(); window.location.href = productUrl(p.id);
      });

      grid.appendChild(el);
    });

    $('results-count').textContent = String(list.length);
    $('empty-state').hidden = list.length !== 0;
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) { root.removeAttribute('data-theme'); try{localStorage.setItem('tp-theme','dark');}catch(e){} }
      else { root.setAttribute('data-theme','light'); try{localStorage.setItem('tp-theme','light');}catch(e){} }
    });
  }

  async function load() {
    setStatus(T('catalog.loading'), 'info');
    if (!configured) { setStatus('BŁĄD: config.js.', 'error'); return; }
    if (!client) { setStatus('BŁĄD: klient Supabase.', 'error'); return; }
    try {
      const [vRes, pRes, iRes] = await Promise.all([
        client.from('vehicles').select('*').limit(5000),
        client.from('products').select('*').order('created_at',{ascending:false}).limit(5000),
        client.from('product_images').select('*').order('sort_order')
      ]);
      if (vRes.error) { setStatus('BŁĄD vehicles: ' + vRes.error.message, 'error'); return; }
      if (pRes.error) { setStatus('BŁĄD products: ' + pRes.error.message, 'error'); return; }
      if (iRes.error) { setStatus('BŁĄD product_images: ' + iRes.error.message, 'error'); return; }
      vehicles = vRes.data || [];
      products = pRes.data || [];
      imagesByProduct = {};
      (iRes.data || []).forEach(im => {
        (imagesByProduct[im.product_id] = imagesByProduct[im.product_id] || []).push(im.url);
      });
      setFilters();
      await render();
      if (!products.length) setStatus(T('catalog.empty2'), 'info');
      else setStatus('');
    } catch (e) {
      setStatus('WYJĄTEK: ' + (e && e.message ? e.message : String(e)), 'error');
    }
  }

  ['search','make-filter','category-filter','sort-filter'].forEach(id => {
    const el = $(id); if (!el) return;
    el.addEventListener(id === 'search' ? 'input' : 'change', render);
  });

  const w = $('whatsapp-cta');
  if (w) {
    const num = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g,'');
    w.href = num ? `https://wa.me/${num}` : 'https://wa.me/';
    w.target = '_blank'; w.rel = 'noopener';
  }
  const ph = $('phone-cta');
  if (ph) {
    const phone = (cfg.PHONE_NUMBER || '').replace(/[^+\d]/g,'');
    ph.href = phone ? 'tel:' + phone : '#';
  }

  window.addEventListener('tp-lang-changed', () => { setFilters(); render(); });
  window.addEventListener('tp-currency-changed', () => { render(); });

  load();
})();