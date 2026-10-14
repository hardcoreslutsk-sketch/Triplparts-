(() => {
  const cfg = window.APP_CONFIG || {};
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

  function setStatus(text, type) {
    const el = document.getElementById('catalog-status');
    if (!el) return;
    el.textContent = text || '';
    if (type === 'error') {
      el.style.color = '#ff8b8b';
      el.style.background = '#2a1010';
      el.style.padding = '14px';
      el.style.borderRadius = '8px';
    } else if (type === 'info') {
      el.style.color = '#ffd98a';
      el.style.background = '#2a2210';
      el.style.padding = '14px';
      el.style.borderRadius = '8px';
    } else {
      el.style.color = '';
      el.style.background = '';
      el.style.padding = '';
      el.style.borderRadius = '';
    }
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
    '<path d="M260 205l28-38h90l40 38"/></g>' +
    '<text x="320" y="375" font-family="Arial" font-size="18" fill="#555" text-anchor="middle">TRIPL PARTS</text>' +
    '</svg>'
  )}`;

  const money = n => new Intl.NumberFormat('pl-PL',{
    style:'currency',currency:'PLN',maximumFractionDigits:2
  }).format(Number(n)||0);

  const statusText = s => ({
    available:'Dostępna',reserved:'Zarezerwowana',sold:'Sprzedana',hidden:'Ukryta'
  }[s] || 'Dostępna');

  const safe = s => String(s || '').replace(/\s+/g,' ').trim();

  function buildToast(html) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return null;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const remove = () => {
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => el.remove(), 350);
    };
    const btn = el.querySelector('[data-toast-close]');
    if (btn) btn.addEventListener('click', remove);
    return { el, remove };
  }
  function showCartToast(product, imageUrl) {
    const t = buildToast(`
      ${imageUrl
        ? `<img class="toast-thumb" src="${esc(imageUrl)}" alt="">`
        : '<div class="toast-icon">✓</div>'}
      <div class="toast-body">
        <div class="toast-title">Dodano do koszyka</div>
        <div class="toast-sub">${esc(product.name || '')}</div>
        <div class="toast-actions">
          <a href="checkout.html">Zobacz koszyk</a>
          <button type="button" data-toast-close>Zamknij</button>
        </div>
      </div>
    `);
    if (t) setTimeout(t.remove, 4200);
  }

  function addToCart(p, imageUrl) {
    if (!window.TPCart) { console.warn('TPCart not loaded'); return; }
    window.TPCart.add({
      id: p.id,
      sku: p.sku,
      name: p.name,
      price_pln: p.price_pln,
      image: imageUrl || ''
    });
    showCartToast(p, imageUrl || '');
  }

  function contactUrl(p, vehicle) {
    const number = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g,'');
    const lines = [
      'Dzień dobry, proszę o informację o dostępności części:',
      safe(p.name),
      p.sku ? '| Artykuł: ' + safe(p.sku) : '',
      p.oem ? '| OEM: ' + safe(p.oem) : '',
      p.license_number ? '| Nr licencyjny: ' + safe(p.license_number) : '',
      p.price_pln != null ? '| Cena: ' + money(p.price_pln) : '',
      vehicle ? '| Auto: ' + safe([vehicle.make, vehicle.model, vehicle.years].filter(Boolean).join(' ')) : '',
      vehicle && vehicle.dismantling_number ? '| Nr rozbieralni: ' + safe(vehicle.dismantling_number) : ''
    ].filter(Boolean);
    const msg = lines.join(' ');
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
                  : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function setFilters() {
    const makes = [...new Set(products.map(p => {
      const v = vehicles.find(x => x.id === p.vehicle_id);
      return v ? v.make : null;
    }).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'pl'));
    const mSel = $('make-filter'), cSel = $('category-filter');
    const om = mSel.value, oc = cSel.value;
    mSel.innerHTML = '<option value="">Wszystkie marki</option>' +
      makes.map(v => `<option>${esc(v)}</option>`).join('');
    cSel.innerHTML = '<option value="">Wszystkie kategorie</option>' +
      categories.map(v => `<option>${esc(v)}</option>`).join('');
    mSel.value = om; cSel.value = oc;
  }

  function render() {
    const term = $('search').value.trim().toLowerCase();
    const make = $('make-filter').value;
    const cat  = $('category-filter').value;

    const visible = products.filter(p => p.status !== 'hidden' && p.status !== 'sold');

    const list = visible.filter(p => {
      const v = vehicles.find(x => x.id === p.vehicle_id);
      if (make && (!v || v.make !== make)) return false;
      if (cat && p.category !== cat) return false;
      if (term) {
        const hay = [
          p.name, p.category, p.oem, p.license_number, p.sku, p.description,
          v?.make, v?.model, v?.years, v?.dismantling_number, v?.vin
        ].map(x => String(x||'').toLowerCase());
        if (!hay.some(h => h.includes(term))) return false;
      }
      return true;
    });

    grid.innerHTML = '';
    list.forEach(p => {
      const v = vehicles.find(x => x.id === p.vehicle_id);
      const el = document.getElementById('product-template').content.cloneNode(true);
      const card = el.querySelector('.product-card');
      const img = el.querySelector('.product-image');
      const imgs = imagesByProduct[p.id] || [];
      img.src = imgs[0] || placeholder;
      img.alt = p.name || 'Część samochodowa';
      const badge = el.querySelector('.stock-badge');
      badge.textContent = statusText(p.status);
      badge.classList.add(p.status);
      el.querySelector('.product-category').textContent = p.category || 'Części';
      el.querySelector('.product-name').textContent = p.name;
      el.querySelector('.product-fitment').textContent =
        v ? [v.make, v.model, v.years].filter(Boolean).join(' · ') : '';
      el.querySelector('.product-oem').textContent = p.oem ? 'OEM: ' + p.oem : '';
      el.querySelector('.product-price').textContent = money(p.price_pln);
      const buyBtn = el.querySelector('.product-buy');
      buyBtn.addEventListener('click', e => { e.stopPropagation(); addToCart(p, imgs[0] || ''); });
      const contactBtn = el.querySelector('.product-contact');
      contactBtn.addEventListener('click', e => { e.stopPropagation(); openModal(p); });
      card.addEventListener('click', () => openModal(p));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(p); });
      grid.appendChild(el);
    });

    $('results-count').textContent = String(list.length);
    $('empty-state').hidden = list.length !== 0;
  }

  let modalImages = [];
  let modalIndex = 0;
  let modalProduct = null;

  function openModal(p) {
    modalProduct = p;
    const v = vehicles.find(x => x.id === p.vehicle_id);
    const imgs = imagesByProduct[p.id] || [];
    modalImages = imgs.length ? imgs : [placeholder];
    modalIndex = 0;
    $('modal-category').textContent = p.category || 'Części';
    $('modal-name').textContent = p.name || '';
    $('modal-price').textContent = money(p.price_pln);
    $('modal-desc').textContent = p.description || '';
    const partInfo = [
      ['Artykuł', p.sku],
      ['Stan', p.condition],
      ['Numer OEM', p.oem],
      ['Numer licencyjny', p.license_number],
      ['Status', statusText(p.status)]
    ];
    $('modal-part-info').innerHTML = partInfo.filter(([,val]) => val)
      .map(([k,val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('');
    const vehInfo = v ? [
      ['Nr rozbieralni', v.dismantling_number],
      ['Marka', v.make],
      ['Model', v.model],
      ['Rok', v.years],
      ['VIN', v.vin],
      ['Silnik', [v.engine_volume, v.engine_fuel, v.engine_code].filter(Boolean).join(', ')],
      ['Skrzynia', v.gearbox],
      ['Napęd', v.drive],
      ['Nadwozie', v.body],
      ['Kolor', v.color],
      ['Kierownica', v.steering],
      ['Przebieg', v.mileage ? v.mileage + ' km' : '']
    ] : [];
    $('modal-vehicle-info').innerHTML = vehInfo.filter(([,val]) => val)
      .map(([k,val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('')
      || '<div><dd>Brak informacji o samochodzie.</dd></div>';
    $('modal-whatsapp').href = contactUrl(p, v);
    const phone = (cfg.PHONE_NUMBER || '').replace(/[^+\d]/g,'');
    $('modal-phone').href = phone ? 'tel:' + phone : '#';
    $('modal-email').href = 'mailto:' + (cfg.EMAIL || '') +
      '?subject=' + encodeURIComponent('Zapytanie o: ' + (p.name || 'część'));
    renderGallery();
    $('product-modal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    $('product-modal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function renderGallery() {
    $('modal-main-image').src = modalImages[modalIndex] || placeholder;
    const thumbs = $('modal-thumbs');
    thumbs.innerHTML = '';
    modalImages.forEach((url, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb-btn' + (i === modalIndex ? ' active' : '');
      b.innerHTML = `<img src="${esc(url)}" alt="">`;
      b.addEventListener('click', () => { modalIndex = i; renderGallery(); });
      thumbs.appendChild(b);
    });
    $('modal-prev').style.display = modalImages.length > 1 ? '' : 'none';
    $('modal-next').style.display = modalImages.length > 1 ? '' : 'none';
  }

  $('modal-prev').addEventListener('click', () => {
    modalIndex = (modalIndex - 1 + modalImages.length) % modalImages.length;
    renderGallery();
  });
  $('modal-next').addEventListener('click', () => {
    modalIndex = (modalIndex + 1) % modalImages.length;
    renderGallery();
  });
  $('modal-buy').addEventListener('click', () => {
    if (!modalProduct) return;
    const img = modalImages[0] && modalImages[0] !== placeholder ? modalImages[0] : '';
    addToCart(modalProduct, img);
    closeModal();
  });
  document.querySelectorAll('[data-close-modal]').forEach(el =>
    el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => {
    if ($('product-modal').hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') $('modal-prev').click();
    if (e.key === 'ArrowRight') $('modal-next').click();
  });

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) {
        root.removeAttribute('data-theme');
        try { localStorage.setItem('tp-theme', 'dark'); } catch(e){}
      } else {
        root.setAttribute('data-theme', 'light');
        try { localStorage.setItem('tp-theme', 'light'); } catch(e){}
      }
    });
  }

  async function load() {
    setStatus('Ładowanie katalogu…', 'info');

    if (!configured) {
      setStatus('BŁĄD: config.js nie jest uzupełniony — SUPABASE_URL lub SUPABASE_ANON_KEY пустые.', 'error');
      return;
    }
    if (!client) {
      setStatus('BŁĄD: nie udało się utworzyć klienta Supabase (window.supabase == null?).', 'error');
      return;
    }

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

      const visible = products.filter(p => p.status !== 'hidden' && p.status !== 'sold');

      setFilters();
      render();

      if (products.length === 0) {
        setStatus('BAZA PUSTA: w tabeli products нет ни одной строки. Dodaj produkt w panelu administratora.', 'info');
      } else if (visible.length === 0) {
        const statusy = products.map(p => p.status || 'brak').join(', ');
        setStatus('UKRYTE: w bazie ' + products.length + ' produkt(ów), ale wszystkie mają status "hidden"/"sold" (' + statusy + '). Zmień status na "Dostępna" w panelu administratora.', 'info');
      } else if (visible.length !== products.length) {
        setStatus('Widoczne: ' + visible.length + ' z ' + products.length + ' (reszta ukryta/sprzedana).');
      } else {
        setStatus('');
      }
    } catch (e) {
      setStatus('WYJĄTEK: ' + (e && e.message ? e.message : String(e)), 'error');
      console.error(e);
    }
  }

  ['search','make-filter','category-filter'].forEach(id =>
    $(id).addEventListener(id === 'search' ? 'input' : 'change', render));

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

  load();
})();