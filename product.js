(() => {
  const cfg = window.APP_CONFIG || {};
  const i18n = window.TPi18n;
  const T = k => i18n ? i18n.t(k) : k;
  const configured =
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  const $ = id => document.getElementById(id);
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  const safe = s => String(s || '').replace(/\s+/g,' ').trim();

  const placeholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">' +
    '<rect width="640" height="440" fill="#1a1a1a"/>' +
    '<g fill="none" stroke="#3a3a3a" stroke-width="5">' +
    '<path d="M170 280h300l-35-80H235z"/>' +
    '<circle cx="235" cy="300" r="32"/><circle cx="405" cy="300" r="32"/>' +
    '<path d="M260 205l28-38h90l40 38"/></g></svg>'
  )}`;

  function currentLang() { return i18n ? i18n.getLang() : 'pl'; }
  function statusText(s) {
    const map = {
      available: T('status.available'), reserved: T('status.reserved'),
      sold: T('status.sold'), hidden: T('status.hidden')
    };
    return map[s] || T('status.available');
  }

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
  function showToast(title, sub, imageUrl) {
    const t = buildToast(`
      ${imageUrl ? `<img class="toast-thumb" src="${esc(imageUrl)}" alt="">` : '<div class="toast-icon">✓</div>'}
      <div class="toast-body">
        <div class="toast-title">${esc(title)}</div>
        ${sub ? `<div class="toast-sub">${esc(sub)}</div>` : ''}
        <div class="toast-actions">
          <a href="checkout.html">${esc(T('product.viewCart'))}</a>
          <button type="button" data-toast-close>${esc(T('product.close'))}</button>
        </div>
      </div>`);
    if (t) setTimeout(t.remove, 4200);
  }

  let currentProduct = null;
  let currentVehicle = null;
  let images = [];
  let imgIndex = 0;

  function renderGallery() {
    $('main-image').src = images[imgIndex] || placeholder;
    const thumbs = $('thumbs');
    thumbs.innerHTML = '';
    if (images.length > 1) {
      images.forEach((url, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'thumb-btn' + (i === imgIndex ? ' active' : '');
        b.innerHTML = `<img src="${esc(url)}" alt="">`;
        b.addEventListener('click', () => { imgIndex = i; renderGallery(); });
        thumbs.appendChild(b);
      });
    }
    $('prev-image').style.display = images.length > 1 ? '' : 'none';
    $('next-image').style.display = images.length > 1 ? '' : 'none';
  }

  $('prev-image').addEventListener('click', () => {
    imgIndex = (imgIndex - 1 + images.length) % images.length; renderGallery();
  });
  $('next-image').addEventListener('click', () => {
    imgIndex = (imgIndex + 1) % images.length; renderGallery();
  });

  function contactUrl(p, vehicle) {
    const number = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g,'');
    const lines = [
      'Hello, please tell me about this part:',
      safe(p.name),
      p.sku ? '| Art: ' + safe(p.sku) : '',
      p.oem ? '| OEM: ' + safe(p.oem) : '',
      p.license_number ? '| License: ' + safe(p.license_number) : '',
      p.price_pln != null ? '| Price: ' + p.price_pln + ' PLN' : '',
      vehicle ? '| Car: ' + safe([vehicle.make, vehicle.model, vehicle.years].filter(Boolean).join(' ')) : '',
      vehicle && vehicle.dismantling_number ? '| Dismantling: ' + safe(vehicle.dismantling_number) : '',
      '| Link: ' + window.location.href
    ].filter(Boolean);
    const msg = lines.join(' ');
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
                  : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  async function renderProduct() {
    const p = currentProduct, vehicle = currentVehicle;
    if (!p) return;
    const lang = currentLang();

    let trName = p.name, trCat = p.category, trDesc = p.description;
    if (lang !== 'pl' && window.TPTranslate) {
      try {
        const dict = await window.TPTranslate.translateMany(
          [p.name, p.category, p.description].filter(Boolean), lang
        );
        trName = dict[p.name] || p.name;
        trCat  = dict[p.category] || p.category;
        trDesc = p.description ? (dict[p.description] || p.description) : '';
      } catch (e) { console.warn('translate failed', e); }
    }

    document.title = (trName || 'Part') + ' — TRIPL PARTS';

    $('breadcrumb').hidden = false;
    $('bc-category').textContent = trCat || '';
    $('bc-name').textContent = trName || '';

    $('p-category').textContent = trCat || '';
    $('p-name').textContent = trName || '';
    $('p-price').textContent = i18n ? i18n.formatProductPrice(p) : (p.price_pln + ' PLN');
    $('p-status').textContent = statusText(p.status);
    $('p-status').className = 'stock-badge ' + (p.status || 'available');
    $('p-desc').textContent = trDesc || '';

    const partInfo = [
      [T('product.article'), p.sku],
      [T('product.condition'), p.condition],
      [T('product.oem'), p.oem],
      [T('product.license'), p.license_number],
      [T('product.status'), statusText(p.status)]
    ];
    $('part-info').innerHTML = partInfo.filter(([,v]) => v)
      .map(([k,val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('')
      || '<div><dd>—</dd></div>';

    const vehInfo = vehicle ? [
      [T('veh.dism'), vehicle.dismantling_number],
      [T('veh.make'), vehicle.make],
      [T('veh.model'), vehicle.model],
      [T('veh.year'), vehicle.years],
      [T('veh.vin'), vehicle.vin],
      [T('veh.engine'), [vehicle.engine_volume, vehicle.engine_fuel, vehicle.engine_code].filter(Boolean).join(', ')],
      [T('veh.gearbox'), vehicle.gearbox],
      [T('veh.drive'), vehicle.drive],
      [T('veh.body'), vehicle.body],
      [T('veh.color'), vehicle.color],
      [T('veh.steering'), vehicle.steering],
      [T('veh.mileage'), vehicle.mileage ? vehicle.mileage + ' km' : ''],
      [T('veh.notes'), vehicle.notes]
    ] : [];
    $('vehicle-info').innerHTML = vehInfo.filter(([,val]) => val)
      .map(([k,val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('')
      || '<div><dd>—</dd></div>';

    $('wa-btn').href = contactUrl(p, vehicle);
    const phone = (cfg.PHONE_NUMBER || '').replace(/[^+\d]/g,'');
    $('phone-btn').href = phone ? 'tel:' + phone : '#';
    $('email-btn').href = 'mailto:' + (cfg.EMAIL || '') +
      '?subject=' + encodeURIComponent('Zapytanie: ' + (trName || '')) +
      '&body=' + encodeURIComponent('Hello,\n\n' + (trName || '') + '\nLink: ' + window.location.href);

    renderGallery();
  }

  $('buy-btn').addEventListener('click', () => {
    if (!currentProduct || !window.TPCart) return;
    const img = images[0] === placeholder ? '' : images[0];
    window.TPCart.add({
      id: currentProduct.id,
      sku: currentProduct.sku,
      name: currentProduct.name,
      price_pln: currentProduct.price_pln,
      price_eur: currentProduct.price_eur,
      image: img
    });
    showToast(T('product.added'), currentProduct.name, img);
  });

  $('share-btn').addEventListener('click', async () => {
    const url = window.location.href;
    const title = currentProduct?.name || 'Część';
    try {
      if (navigator.share) await navigator.share({ title, text: title, url });
      else { await navigator.clipboard.writeText(url); showToast(T('product.linkCopied'), url); }
    } catch (e) {
      try {
        const ta = document.createElement('textarea'); ta.value = url;
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); showToast(T('product.linkCopied'), url);
      } catch (e2) { showToast('—', url); }
    }
  });

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) { root.removeAttribute('data-theme'); try{localStorage.setItem('tp-theme','dark');}catch(e){} }
      else { root.setAttribute('data-theme','light'); try{localStorage.setItem('tp-theme','light');}catch(e){} }
    });
  }

  window.addEventListener('tp-lang-changed', () => { if (currentProduct) renderProduct(); });
  window.addEventListener('tp-currency-changed', () => {
    if (currentProduct) $('p-price').textContent = i18n ? i18n.formatProductPrice(currentProduct) : '';
  });

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id || !client) { showNotFound(); return; }
    try {
      const [pRes, iRes] = await Promise.all([
        client.from('products').select('*').eq('id', id).maybeSingle(),
        client.from('product_images').select('*').eq('product_id', id).order('sort_order')
      ]);
      if (pRes.error || !pRes.data) { showNotFound(); return; }
      currentProduct = pRes.data;
      images = (iRes.data || []).map(x => x.url);
      if (!images.length) images = [placeholder];
      if (currentProduct.vehicle_id) {
        const vRes = await client.from('vehicles').select('*').eq('id', currentProduct.vehicle_id).maybeSingle();
        currentVehicle = vRes.data || null;
      }
      await renderProduct();
      $('product-loading').hidden = true;
      $('product-content').hidden = false;
    } catch (e) { console.error(e); showNotFound(); }
  }

  function showNotFound() {
    $('product-loading').hidden = true;
    $('product-content').hidden = true;
    $('product-not-found').hidden = false;
  }

  load();
})();