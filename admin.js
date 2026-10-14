(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  const $ = id => document.getElementById(id);
  if (!document.getElementById('login-panel')) return;

  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  let vehicles = [];
  let products = [];
  let orders = [];
  let currentProductImages = [];
  let loadedVehicle = null;

  const MAX_IMAGES = 20;
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const COMPRESS_MAX_SIDE = 1280;
  const COMPRESS_QUALITY = 0.75;
  const UPLOAD_CONCURRENCY = 3;

  function msg(id, text, type = '') {
    const el = $(id); if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + type;
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function money(n) {
    return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(Number(n)||0);
  }
  function statusText(s) {
    return ({available:'Dostępna',reserved:'Zarezerwowana',sold:'Sprzedana',hidden:'Ukryta'}[s] || 'Dostępna');
  }
  function statusClass(s) {
    return ['available','reserved','sold','hidden'].includes(s) ? s : 'available';
  }
  function orderStatusText(s) {
    return ({new:'Nowe',contacted:'Skontaktowano',completed:'Zrealizowane',cancelled:'Anulowane'}[s] || 'Nowe');
  }
  function orderStatusClass(s) {
    return ['new','contacted','completed','cancelled'].includes(s) ? s : 'new';
  }
  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch (e) { return iso; }
  }
  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random()*16)|0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function compressImage(file) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const scale = Math.min(1, COMPRESS_MAX_SIDE / Math.max(width, height));
          const w = Math.max(1, Math.round(width * scale));
          const h = Math.max(1, Math.round(height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) return resolve(file);
            const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          }, 'image/jpeg', COMPRESS_QUALITY);
        };
        img.onerror = () => resolve(file);
        img.src = reader.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  function extractStoragePath(url) {
    if (!url) return '';
    const marker = '/product-images/';
    const idx = url.indexOf(marker);
    return idx === -1 ? '' : url.slice(idx + marker.length);
  }
  async function deleteStorageFile(url) {
    const path = extractStoragePath(url);
    if (!path) return;
    try { await client.storage.from('product-images').remove([path]); } catch (e) {}
  }

  async function uploadMany(files, onProgress) {
    const results = new Array(files.length);
    let done = 0;
    let cursor = 0;
    async function worker() {
      while (true) {
        const idx = cursor++;
        if (idx >= files.length) return;
        try {
          const compressed = await compressImage(files[idx]);
          if (compressed.size > MAX_IMAGE_BYTES) {
            results[idx] = { error: 'Za duże zdjęcie.' };
          } else {
            const path = `${uuid()}.jpg`;
            const up = await client.storage.from('product-images')
              .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' });
            if (up.error) {
              results[idx] = { error: up.error.message };
            } else {
              const { data: pub } = client.storage.from('product-images').getPublicUrl(path);
              results[idx] = { url: pub.publicUrl };
            }
          }
        } catch (e) {
          results[idx] = { error: e.message || 'nieznany' };
        }
        done++;
        if (onProgress) onProgress(done, files.length);
      }
    }
    const workers = [];
    for (let i = 0; i < Math.min(UPLOAD_CONCURRENCY, files.length); i++) workers.push(worker());
    await Promise.all(workers);
    return results;
  }

  function showUser(user) {
    $('login-panel').hidden = !!user;
    $('dashboard').hidden = !user;
    if (user) {
      refreshOrders();
      refreshVehicles();
      refreshProducts();
    }
  }

  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!client) { msg('login-message','Uzupełnij config.js.','error'); return; }
    msg('login-message','Logowanie…');
    const { error } = await client.auth.signInWithPassword({
      email: $('email').value, password: $('password').value
    });
    if (error) { msg('login-message','Nie udało się zalogować.','error'); return; }
    msg('login-message','');
  });

  $('logout').addEventListener('click', async () => {
    await client.auth.signOut();
    showUser(null);
  });

  const tabs = [
    { tab: 'tab-orders',   panel: 'panel-orders' },
    { tab: 'tab-vehicles', panel: 'panel-vehicles' },
    { tab: 'tab-product',  panel: 'panel-product' },
    { tab: 'tab-list',     panel: 'panel-list' }
  ];
  tabs.forEach(t => {
    const btn = $(t.tab);
    if (!btn) return;
    btn.addEventListener('click', () => {
      tabs.forEach(x => {
        $(x.tab).setAttribute('aria-selected', x.tab === t.tab ? 'true' : 'false');
        $(x.panel).hidden = x.panel !== t.panel;
      });
      if (t.tab === 'tab-orders') refreshOrders();
    });
  });

  // ===== ORDERS =====
  async function refreshOrders() {
    if (!client) {
      msg('orders-message', 'Klient Supabase nie jest utworzony — sprawdź config.js.', 'error');
      return;
    }

    msg('orders-message', 'Ładowanie zamówień…');

    // Диагностика: сначала посмотрим сессию
    const sessionRes = await client.auth.getSession();
    const sessionEmail = sessionRes?.data?.session?.user?.email || '(brak)';
    console.log('ADMIN session email:', sessionEmail);

    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      msg('orders-message',
        'Błąd pobierania: ' + error.message +
        ' | Zalogowany jako: ' + sessionEmail, 'error');
      console.error('orders select error:', error);
      return;
    }

    orders = data || [];
    $('orders-total').textContent = orders.length;
    updateOrdersBadge();
    renderOrders();

    if (!orders.length) {
      msg('orders-message',
        'Baza zwróciła 0 zamówień. Zalogowany jako: ' + sessionEmail +
        '. Jeśli w bazie są zamówienia — sprawdź politykę RLS (SELECT).', 'error');
    } else {
      msg('orders-message', 'Załadowano zamówień: ' + orders.length + '.', 'success');
    }
  }

  function updateOrdersBadge() {
    const badge = $('orders-badge');
    if (!badge) return;
    const newCount = orders.filter(o => o.status === 'new').length;
    badge.textContent = String(newCount);
    badge.hidden = newCount === 0;
  }

  function renderOrders() {
    const filter = $('orders-status-filter').value;
    const wrap = $('orders-list');
    wrap.innerHTML = '';

    const list = orders.filter(o => !filter || o.status === filter);

    if (!list.length) {
      wrap.innerHTML = '<div class="orders-empty"><h3>Brak zamówień</h3><p>Gdy klient złoży zamówienie, pojawi się tutaj.</p></div>';
      return;
    }

    const waNumber = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g,'');

    list.forEach(o => {
      const card = document.createElement('div');
      card.className = 'order-card status-' + orderStatusClass(o.status);

      const ref = String(o.id || '').slice(0, 8).toUpperCase();
      const items = Array.isArray(o.items) ? o.items : [];

      const itemsHtml = items.length
        ? items.map(it => `
            <div class="order-item">
              <span class="qty">${esc(it.qty || 1)}×</span>
              <span class="name">${esc(it.name || '—')}${it.sku ? ` <span class="sku">#${esc(it.sku)}</span>` : ''}</span>
              <span class="price">${money(Number(it.price) * Number(it.qty || 1))}</span>
            </div>`).join('')
        : '<div class="order-item"><span class="name">— brak danych —</span></div>';

      const customerPhoneDigits = String(o.customer_phone || '').replace(/\D/g,'');
      const waHref = customerPhoneDigits
        ? `https://wa.me/${customerPhoneDigits}`
        : (waNumber ? `https://wa.me/${waNumber}` : '');

      card.innerHTML = `
        <div class="order-head">
          <div>
            <div class="order-ref">ZAMÓWIENIE #${esc(ref)}</div>
            <div class="order-date">${esc(formatDate(o.created_at))}</div>
          </div>
          <span class="order-status ${orderStatusClass(o.status)}">${orderStatusText(o.status)}</span>
        </div>

        <div class="order-customer">
          <div class="name">${esc(o.customer_name || '—')}</div>
          ${o.customer_phone ? `<div class="contact-row"><span>Telefon</span><a href="tel:${esc(o.customer_phone.replace(/[^+\d]/g,''))}">${esc(o.customer_phone)}</a></div>` : ''}
          ${o.customer_email ? `<div class="contact-row"><span>E-mail</span><a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a></div>` : ''}
        </div>

        <div class="order-address"><b style="color:#888;font-size:11px;display:block;margin-bottom:4px;letter-spacing:.05em">ADRES DOSTAWY</b>${esc(o.customer_address || '—')}</div>

        ${o.notes ? `<div class="order-notes"><b>Uwagi klienta</b>${esc(o.notes)}</div>` : ''}

        <div class="order-items">${itemsHtml}</div>

        <div class="order-total">
          <span>Razem</span>
          <b>${money(o.total_pln)}</b>
        </div>

        <div class="order-actions">
          ${waHref ? `<a class="wa" href="${esc(waHref)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${o.customer_phone ? `<a href="tel:${esc(o.customer_phone.replace(/[^+\d]/g,''))}">Zadzwoń</a>` : ''}
          ${o.customer_email ? `<a href="mailto:${esc(o.customer_email)}">E-mail</a>` : ''}
        </div>

        <div class="order-actions">
          <select class="order-status-select" data-ostatus="${esc(o.id)}">
            <option value="new" ${o.status==='new'?'selected':''}>Nowe</option>
            <option value="contacted" ${o.status==='contacted'?'selected':''}>Skontaktowano</option>
            <option value="completed" ${o.status==='completed'?'selected':''}>Zrealizowane</option>
            <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Anulowane</option>
          </select>
          <button type="button" class="danger" data-odelete="${esc(o.id)}">Usuń</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  const statusFilterEl = $('orders-status-filter');
  if (statusFilterEl) statusFilterEl.addEventListener('change', renderOrders);

  const refreshBtn = $('orders-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshOrders);

  const ordersListEl = $('orders-list');
  if (ordersListEl) {
    ordersListEl.addEventListener('change', async e => {
      const id = e.target.closest('[data-ostatus]')?.dataset.ostatus;
      if (!id) return;
      const next = e.target.value;
      const { error } = await client.from('orders').update({ status: next }).eq('id', id);
      if (error) {
        msg('orders-message', 'Nie udało się zmienić statusu: ' + error.message, 'error');
        return;
      }
      const ord = orders.find(x => x.id === id);
      if (ord) ord.status = next;
      updateOrdersBadge();
      const card = e.target.closest('.order-card');
      if (card) card.className = 'order-card status-' + orderStatusClass(next);
      const pill = card?.querySelector('.order-status');
      if (pill) {
        pill.className = 'order-status ' + orderStatusClass(next);
        pill.textContent = orderStatusText(next);
      }
      msg('orders-message', 'Status zaktualizowany.', 'success');
    });

    ordersListEl.addEventListener('click', async e => {
      const id = e.target.closest('[data-odelete]')?.dataset.odelete;
      if (!id) return;
      const o = orders.find(x => x.id === id);
      if (!o) return;
      if (!confirm(`Usunąć zamówienie od „${o.customer_name}”?`)) return;
      const { error } = await client.from('orders').delete().eq('id', id);
      if (error) {
        msg('orders-message', 'Nie udało się usunąć: ' + error.message, 'error');
        return;
      }
      msg('orders-message', 'Zamówienie usunięte.', 'success');
      await refreshOrders();
    });
  }

  // ===== VEHICLES =====
  async function refreshVehicles() {
    const { data, error } = await client.from('vehicles').select('*')
      .order('created_at', { ascending: false }).limit(5000);
    if (error) { msg('vehicles-message', 'Błąd pobierania: ' + error.message, 'error'); return; }
    vehicles = data || [];
    $('vehicle-total').textContent = vehicles.length;
    renderVehicles();
  }

  function renderVehicles() {
    const q = $('vehicle-search').value.trim().toLowerCase();
    const body = $('vehicles-body');
    body.innerHTML = '';
    vehicles
      .filter(v => [v.dismantling_number, v.make, v.model, v.vin]
        .some(x => String(x||'').toLowerCase().includes(q)))
      .forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><b>${esc(v.dismantling_number)}</b></td>
          <td>${esc(v.make)} ${esc(v.model)}</td>
          <td>${esc(v.years || '—')}</td>
          <td>${esc(v.vin || '—')}</td>
          <td>
            <div class="row-actions">
              <button data-vedit="${esc(v.id)}">Edytuj</button>
              <button data-vdelete="${esc(v.id)}">Usuń</button>
            </div>
          </td>`;
        body.appendChild(tr);
      });
    if (!body.children.length) {
      body.innerHTML = '<tr><td colspan="5">Brak rozbieralni.</td></tr>';
    }
  }

  function resetVehicleForm() {
    $('vehicle-form').reset();
    $('vehicle-id').value = '';
    $('vehicle-form-title').textContent = 'Dodaj rozbieralnię';
    $('save-vehicle').textContent = 'Zapisz rozbieralnię';
    $('cancel-vehicle-edit').hidden = true;
    msg('vehicle-form-message','');
  }

  $('vehicle-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!client) return;
    const btn = $('save-vehicle'); btn.disabled = true;
    msg('vehicle-form-message','Zapisywanie…');
    try {
      const payload = {
        dismantling_number: $('v-dismantling-number').value.trim(),
        make: $('v-make').value.trim(),
        model: $('v-model').value.trim(),
        years: $('v-years').value.trim() || null,
        vin: $('v-vin').value.trim() || null,
        engine_volume: $('v-engine-volume').value.trim() || null,
        engine_fuel: $('v-engine-fuel').value.trim() || null,
        engine_code: $('v-engine-code').value.trim() || null,
        gearbox: $('v-gearbox').value.trim() || null,
        drive: $('v-drive').value.trim() || null,
        body: $('v-body').value.trim() || null,
        color: $('v-color').value.trim() || null,
        steering: $('v-steering').value.trim() || null,
        mileage: $('v-mileage').value ? Number($('v-mileage').value) : null,
        notes: $('v-notes').value.trim() || null
      };
      const id = $('vehicle-id').value;
      const res = id
        ? await client.from('vehicles').update(payload).eq('id', id).select().single()
        : await client.from('vehicles').insert(payload).select().single();
      if (res.error) throw res.error;
      msg('vehicle-form-message', id ? 'Zmiany zapisane.' : 'Dodano rozbieralnię.', 'success');
      resetVehicleForm();
      await refreshVehicles();
    } catch (err) {
      msg('vehicle-form-message','Błąd: ' + (err.message||'nieznany'),'error');
    } finally { btn.disabled = false; }
  });

  $('cancel-vehicle-edit').addEventListener('click', resetVehicleForm);
  $('vehicle-search').addEventListener('input', renderVehicles);

  $('vehicles-body').addEventListener('click', async e => {
    const editId = e.target.closest('[data-vedit]')?.dataset.vedit;
    const delId = e.target.closest('[data-vdelete]')?.dataset.vdelete;

    if (editId) {
      const v = vehicles.find(x => x.id === editId);
      if (!v) return;
      $('vehicle-id').value = v.id;
      $('v-dismantling-number').value = v.dismantling_number || '';
      $('v-make').value = v.make || '';
      $('v-model').value = v.model || '';
      $('v-years').value = v.years || '';
      $('v-vin').value = v.vin || '';
      $('v-engine-volume').value = v.engine_volume || '';
      $('v-engine-fuel').value = v.engine_fuel || '';
      $('v-engine-code').value = v.engine_code || '';
      $('v-gearbox').value = v.gearbox || '';
      $('v-drive').value = v.drive || '';
      $('v-body').value = v.body || '';
      $('v-color').value = v.color || '';
      $('v-steering').value = v.steering || '';
      $('v-mileage').value = v.mileage ?? '';
      $('v-notes').value = v.notes || '';
      $('vehicle-form-title').textContent = 'Edytuj rozbieralnię';
      $('save-vehicle').textContent = 'Zapisz zmiany';
      $('cancel-vehicle-edit').hidden = false;
      window.scrollTo({top:0,behavior:'smooth'});
    }

    if (delId) {
      const v = vehicles.find(x => x.id === delId);
      if (!v || !confirm(`Usunąć rozbieralnię „${v.dismantling_number}”?`)) return;
      const { error } = await client.from('vehicles').delete().eq('id', delId);
      if (error) { msg('vehicles-message','Błąd: '+error.message,'error'); return; }
      msg('vehicles-message','Usunięto.','success');
      refreshVehicles();
    }
  });

  // ===== PRODUCTS =====
  async function refreshProducts() {
    const { data, error } = await client.from('products').select('*')
      .order('created_at',{ascending:false}).limit(5000);
    if (error) { msg('products-message','Błąd pobierania: '+error.message,'error'); return; }
    products = data || [];
    $('product-total').textContent = products.length;
    renderProducts();
  }

  function renderProducts() {
    const qSku = $('sku-search').value.trim().toLowerCase();
    const q = $('product-search').value.trim().toLowerCase();
    const body = $('products-body');
    body.innerHTML = '';

    products
      .filter(p => {
        const v = vehicles.find(x => x.id === p.vehicle_id);
        if (qSku) {
          const sku = String(p.sku || '').toLowerCase();
          if (!sku.includes(qSku)) return false;
        }
        if (q) {
          const hay = [
            p.name, p.category, p.oem, p.license_number, p.description, p.condition, p.sku,
            v?.dismantling_number, v?.make, v?.model, v?.years, v?.vin,
            v?.engine_volume, v?.engine_code, v?.gearbox, v?.drive
          ].map(x => String(x || '').toLowerCase());
          if (!hay.some(h => h.includes(q))) return false;
        }
        return true;
      })
      .forEach(p => {
        const v = vehicles.find(x => x.id === p.vehicle_id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><div class="table-thumb" data-thumb="${esc(p.id)}"></div></td>
          <td><span class="sku-cell">${esc(p.sku || '—')}</span></td>
          <td><b>${esc(p.name)}</b><br><small style="color:#888">${esc(p.category)}</small></td>
          <td><b>${esc(v ? v.dismantling_number : '—')}</b><br><small style="color:#888">${esc(v ? (v.make + ' ' + v.model) : '')}</small></td>
          <td>${esc(p.oem || '—')}</td>
          <td>${esc(p.license_number || '—')}</td>
          <td><b>${money(p.price_pln)}</b></td>
          <td><span class="total-pill" style="background:#1a1a1a">${statusText(p.status)}</span></td>
          <td>
            <div class="row-actions">
              <button data-pedit="${esc(p.id)}">Edytuj</button>
              <button data-pstatus="${esc(p.id)}" data-next="${p.status === 'hidden' ? 'available' : 'hidden'}">
                ${p.status === 'hidden' ? 'Pokaż' : 'Ukryj'}
              </button>
              <button data-pdelete="${esc(p.id)}" class="danger">Usuń</button>
            </div>
          </td>`;
        body.appendChild(tr);
        loadThumbForProduct(p.id);
      });
    if (!body.children.length) {
      body.innerHTML = '<tr><td colspan="9">Brak części.</td></tr>';
    }
  }

  async function loadThumbForProduct(productId) {
    const cell = document.querySelector(`[data-thumb="${productId}"]`);
    if (!cell) return;
    const { data } = await client.from('product_images').select('url')
      .eq('product_id', productId).order('sort_order').limit(1);
    if (data && data[0]) {
      cell.innerHTML = `<img src="${esc(data[0].url)}" alt="" class="table-thumb">`;
    } else {
      cell.innerHTML = '<div class="table-thumb" style="background:#222;display:grid;place-items:center;color:#555;font-size:10px">brak</div>';
    }
  }

  $('product-search').addEventListener('input', renderProducts);
  $('sku-search').addEventListener('input', renderProducts);

  $('load-vehicle').addEventListener('click', async () => {
    const num = $('p-vehicle-number').value.trim();
    if (!num) { msg('product-form-message','Wpisz numer rozbieralni.','error'); return; }
    const v = vehicles.find(x => String(x.dismantling_number).toLowerCase() === num.toLowerCase());
    if (!v) { msg('product-form-message','Nie znaleziono rozbieralni o numerze ' + num,'error'); return; }
    loadedVehicle = v;
    $('vehicle-info-box').hidden = false;
    $('vehicle-info-box').innerHTML = `
      <div><b>Numer</b><span>${esc(v.dismantling_number)}</span></div>
      <div><b>Marka</b><span>${esc(v.make)}</span></div>
      <div><b>Model</b><span>${esc(v.model)}</span></div>
      <div><b>Rok</b><span>${esc(v.years || '—')}</span></div>
      <div><b>VIN</b><span>${esc(v.vin || '—')}</span></div>
      <div><b>Silnik</b><span>${esc([v.engine_volume, v.engine_fuel, v.engine_code].filter(Boolean).join(', ') || '—')}</span></div>
      <div><b>Skrzynia</b><span>${esc(v.gearbox || '—')}</span></div>
      <div><b>Napęd</b><span>${esc(v.drive || '—')}</span></div>
      <div><b>Nadwozie</b><span>${esc(v.body || '—')}</span></div>
      <div><b>Kolor</b><span>${esc(v.color || '—')}</span></div>
      <div><b>Kierownica</b><span>${esc(v.steering || '—')}</span></div>
      <div><b>Przebieg</b><span>${esc(v.mileage ? v.mileage + ' km' : '—')}</span></div>`;
    msg('product-form-message','');
  });

  function renderProductImages() {
    const wrap = $('product-images');
    wrap.innerHTML = '';
    currentProductImages.forEach((img, i) => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerHTML = `
        <img src="${esc(img.url)}" alt="">
        <div class="thumb-bar">
          <button type="button" data-up="${i}">↑</button>
          <button type="button" data-down="${i}">↓</button>
          <button type="button" data-remove="${i}" class="danger">×</button>
        </div>`;
      wrap.appendChild(div);
    });
  }

  $('product-images').addEventListener('click', async e => {
    const up = e.target.closest('[data-up]')?.dataset.up;
    const down = e.target.closest('[data-down]')?.dataset.down;
    const rm = e.target.closest('[data-remove]')?.dataset.remove;
    if (up !== undefined) {
      const i = Number(up);
      if (i > 0) {
        [currentProductImages[i-1], currentProductImages[i]] = [currentProductImages[i], currentProductImages[i-1]];
        renderProductImages();
        await persistImageOrder();
      }
    }
    if (down !== undefined) {
      const i = Number(down);
      if (i < currentProductImages.length - 1) {
        [currentProductImages[i+1], currentProductImages[i]] = [currentProductImages[i], currentProductImages[i+1]];
        renderProductImages();
        await persistImageOrder();
      }
    }
    if (rm !== undefined) {
      const i = Number(rm);
      const img = currentProductImages[i];
      if (!img) return;
      if (img.id) {
        await client.from('product_images').delete().eq('id', img.id);
        await deleteStorageFile(img.url);
      }
      currentProductImages.splice(i, 1);
      renderProductImages();
    }
  });

  async function persistImageOrder() {
    for (let i = 0; i < currentProductImages.length; i++) {
      const img = currentProductImages[i];
      if (img.id) await client.from('product_images').update({ sort_order: i }).eq('id', img.id);
      else img.sort_order = i;
    }
  }

  function resetProductForm() {
    $('product-form').reset();
    $('product-id').value = '';
    $('vehicle-info-box').hidden = true;
    $('vehicle-info-box').innerHTML = '';
    currentProductImages = [];
    loadedVehicle = null;
    renderProductImages();
    $('product-form-title').textContent = 'Dodaj część';
    $('save-product').textContent = 'Zapisz część';
    $('cancel-product-edit').hidden = true;
    msg('product-form-message','');
  }

  $('cancel-product-edit').addEventListener('click', resetProductForm);

  $('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!client) return;

    const btn = $('save-product');
    btn.disabled = true;
    msg('product-form-message','Zapisywanie…');

    try {
      const num = $('p-vehicle-number').value.trim();
      if (!num) throw new Error('Wpisz numer rozbieralni.');
      let v = loadedVehicle;
      if (!v || v.dismantling_number.toLowerCase() !== num.toLowerCase()) {
        v = vehicles.find(x => String(x.dismantling_number).toLowerCase() === num.toLowerCase());
      }
      if (!v) throw new Error('Nie znaleziono rozbieralni o numerze ' + num);

      const payload = {
        vehicle_id: v.id,
        sku: $('p-sku').value.trim() || null,
        name: $('p-name').value.trim(),
        category: $('p-category').value.trim(),
        oem: $('p-oem').value.trim() || null,
        license_number: $('p-license').value.trim() || null,
        condition: $('p-condition').value.trim() || null,
        price_pln: Number($('p-price').value),
        status: statusClass($('p-status').value),
        description: $('p-description').value.trim() || null
      };

      const id = $('product-id').value;
      let productId = id;

      if (id) {
        const res = await client.from('products').update(payload).eq('id', id).select().single();
        if (res.error) throw res.error;
      } else {
        const res = await client.from('products').insert(payload).select().single();
        if (res.error) throw res.error;
        productId = res.data.id;
      }

      const files = Array.from($('p-images').files || []);
      const existingCount = currentProductImages.length;
      const room = MAX_IMAGES - existingCount;
      const toUpload = files.slice(0, room);

      if (toUpload.length) {
        btn.textContent = 'Przygotowanie zdjęć…';
        const results = await uploadMany(toUpload, (done, total) => {
          btn.textContent = `Zdjęcia ${done}/${total}…`;
        });
        const inserts = [];
        results.forEach((r, i) => {
          if (r && r.url) inserts.push({ product_id: productId, url: r.url, sort_order: existingCount + i });
        });
        if (inserts.length) {
          const ins = await client.from('product_images').insert(inserts).select();
          if (!ins.error && ins.data) currentProductImages.push(...ins.data);
        }
        const failed = results.filter(r => r && r.error).length;
        if (failed) {
          msg('product-form-message', `Zapisano część. ${failed} zdjęć nie udało się wgrać.`, 'error');
        }
      }

      msg('product-form-message', id ? 'Zmiany zapisane.' : 'Część dodana.', 'success');
      resetProductForm();
      await refreshProducts();
    } catch (err) {
      msg('product-form-message','Błąd: ' + (err.message || 'nieznany'),'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Zapisz część';
    }
  });

  $('products-body').addEventListener('click', async e => {
    const editId = e.target.closest('[data-pedit]')?.dataset.pedit;
    const delId  = e.target.closest('[data-pdelete]')?.dataset.pdelete;
    const stId   = e.target.closest('[data-pstatus]');
    const next   = stId?.dataset.next;

    if (editId) {
      const p = products.find(x => x.id === editId);
      if (!p) return;
      const v = vehicles.find(x => x.id === p.vehicle_id);
      loadedVehicle = v || null;

      $('product-id').value = p.id;
      $('p-vehicle-number').value = v ? v.dismantling_number : '';
      $('p-sku').value = p.sku || '';
      $('p-license').value = p.license_number || '';

      if (v) {
        $('vehicle-info-box').hidden = false;
        $('vehicle-info-box').innerHTML = `
          <div><b>Numer</b><span>${esc(v.dismantling_number)}</span></div>
          <div><b>Marka</b><span>${esc(v.make)}</span></div>
          <div><b>Model</b><span>${esc(v.model)}</span></div>
          <div><b>Rok</b><span>${esc(v.years || '—')}</span></div>
          <div><b>VIN</b><span>${esc(v.vin || '—')}</span></div>
          <div><b>Silnik</b><span>${esc([v.engine_volume, v.engine_fuel, v.engine_code].filter(Boolean).join(', ') || '—')}</span></div>`;
      } else {
        $('vehicle-info-box').hidden = true;
      }

      $('p-name').value = p.name || '';
      $('p-category').value = p.category || '';
      $('p-oem').value = p.oem || '';
      $('p-condition').value = p.condition || '';
      $('p-price').value = p.price_pln ?? '';
      $('p-status').value = statusClass(p.status);
      $('p-description').value = p.description || '';

      const { data: imgs } = await client.from('product_images').select('*')
        .eq('product_id', p.id).order('sort_order');
      currentProductImages = imgs || [];
      renderProductImages();

      $('product-form-title').textContent = 'Edytuj część';
      $('save-product').textContent = 'Zapisz zmiany';
      $('cancel-product-edit').hidden = false;

      $('tab-product').click();
      window.scrollTo({top:0,behavior:'smooth'});
    }

    if (delId) {
      const p = products.find(x => x.id === delId);
      if (!p || !confirm(`Usunąć część „${p.name}”?`)) return;
      const { data: imgs } = await client.from('product_images').select('url').eq('product_id', p.id);
      const { error } = await client.from('products').delete().eq('id', delId);
      if (error) { msg('products-message','Błąd: '+error.message,'error'); return; }
      if (imgs) for (const im of imgs) await deleteStorageFile(im.url);
      msg('products-message','Usunięto.','success');
      refreshProducts();
    }

    if (stId) {
      const id = stId.dataset.pstatus;
      const { error } = await client.from('products').update({ status: next }).eq('id', id);
      if (error) { msg('products-message','Błąd: '+error.message,'error'); return; }
      refreshProducts();
    }
  });

  // ===== INIT =====
  if (!configured) {
    const w = $('setup-warning');
    w.hidden = false;
    w.textContent = 'Konfiguracja nie jest gotowa. Uzupełnij config.js.';
    $('login-panel').hidden = false;
  } else {
    client.auth.onAuthStateChange((_e, s) => {
      showUser(s?.user || null);
    });
  }
})();