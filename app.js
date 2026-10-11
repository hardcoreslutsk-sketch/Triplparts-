(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};

  const configured =
    typeof cfg.SUPABASE_URL === 'string' &&
    cfg.SUPABASE_URL.startsWith('https://') &&
    typeof cfg.SUPABASE_ANON_KEY === 'string' &&
    cfg.SUPABASE_ANON_KEY.length > 20;

  if (!$('login-panel')) return;

  const client = configured && window.supabase
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        }
      )
    : null;

  let products = [];
  let vehicles = [];
  let authReady = false;
  let currentGallery = [];
  let removedGallery = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);

  const money = value => new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(Number(value) || 0);

  const statusText = value => ({
    available: 'Dostępna',
    reserved: 'Zarezerwowana',
    sold: 'Sprzedana'
  }[value] || 'Dostępna');

  function message(id, text, type = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + type;
  }

  function showUser(user) {
    $('login-panel').hidden = !!user;
    $('dashboard').hidden = !user;

    if (user) {
      loadAll();
    }
  }

  function setTab(name) {
    const productsActive = name === 'products';

    $('tab-products').setAttribute('aria-selected', String(productsActive));
    $('tab-vehicles').setAttribute('aria-selected', String(!productsActive));

    $('panel-products').hidden = !productsActive;
    $('panel-vehicles').hidden = productsActive;
  }

  $('tab-products').addEventListener('click', () => setTab('products'));
  $('tab-vehicles').addEventListener('click', () => setTab('vehicles'));

  async function loadAll() {
    if (!client) return;
    await Promise.all([loadProducts(), loadVehicles()]);
  }

  async function loadProducts() {
    const { data, error } = await client
      .from('products')
      .select('*')
      .limit(5000);

    if (error) {
      message('inventory-message', 'Błąd pobierania części: ' + error.message, 'error');
      return;
    }

    products = data || [];
    $('admin-total').textContent = products.length;
    renderProducts();
    renderVehicleSelect();
  }

  async function loadVehicles() {
    const { data, error } = await client
      .from('vehicles')
      .select('*')
      .limit(2000);

    if (error) {
      vehicles = [];
      renderVehicles();
      renderVehicleSelect();
      message(
        'vehicles-message',
        'Nie udało się pobrać rozbieralni: ' + error.message,
        'error'
      );
      return;
    }

    vehicles = data || [];
    $('vehicle-total').textContent = vehicles.length;
    renderVehicles();
    renderVehicleSelect();
  }

  function renderProducts() {
    const body = $('inventory-body');
    const query = $('admin-search').value.trim().toLocaleLowerCase('pl');

    const filtered = products.filter(p =>
      [
        p.name, p.category, p.make, p.model, p.years,
        p.oem, p.description, p.dismantling_number
      ].some(v => String(v || '').toLocaleLowerCase('pl').includes(query))
    );

    body.innerHTML = filtered.map(p => {
      const linkedVehicle = vehicles.find(v =>
        String(v.id) === String(p.vehicle_id)
      );

      const dismantlingNumber =
        p.dismantling_number ||
        linkedVehicle?.dismantling_number ||
        '';

      return `
        <tr>
          <td>
            <strong>${esc(p.name)}</strong>
            <br><small>${esc(p.category || '')}</small>
          </td>
          <td>${esc([p.make, p.model, p.years].filter(Boolean).join(' '))}
            ${dismantlingNumber
              ? `<br><small>${esc(dismantlingNumber)}</small>`
              : ''}
          </td>
          <td>${esc(p.oem || '—')}</td>
          <td>${money(p.price)}</td>
          <td>${esc(statusText(p.status))}</td>
          <td>
            <div class="row-actions">
              <button type="button" data-edit-product="${esc(p.id)}">Edytuj</button>
              <button type="button" class="danger"
                data-delete-product="${esc(p.id)}">Usuń</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="6">Brak części.</td></tr>';
    }
  }

  function renderVehicles() {
    const body = $('vehicles-body');
    const query = $('vehicle-search').value.trim().toLocaleLowerCase('pl');

    const filtered = vehicles.filter(v =>
      [
        v.dismantling_number, v.make, v.model, v.years
      ].some(value =>
        String(value || '').toLocaleLowerCase('pl').includes(query)
      )
    );

    body.innerHTML = filtered.map(v => `
      <tr>
        <td><strong>${esc(v.dismantling_number || '—')}</strong></td>
        <td>${esc(v.make || '—')}</td>
        <td>${esc(v.model || '—')}</td>
        <td>${esc(v.years || '—')}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-edit-vehicle="${esc(v.id)}">Edytuj</button>
            <button type="button" class="danger"
              data-delete-vehicle="${esc(v.id)}">Usuń</button>
          </div>
        </td>
      </tr>
    `).join('');

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="5">Brak rozbieralni.</td></tr>';
    }
  }

  function renderVehicleSelect(selectedId = '') {
    const select = $('p-vehicle');
    if (!select) return;

    select.innerHTML =
      '<option value="">Bez przypisania</option>' +
      vehicles.map(v => `
        <option value="${esc(v.id)}">
          ${esc(v.dismantling_number || '')} — ${esc(v.make || '')} ${esc(v.model || '')}
        </option>
      `).join('');

    select.value = selectedId || '';
  }

  function galleryOf(product) {
    if (Array.isArray(product.gallery_urls)) {
      return product.gallery_urls.filter(Boolean);
    }

    if (typeof product.gallery_urls === 'string') {
      try {
        const parsed = JSON.parse(product.gallery_urls);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {}
    }

    return product.image_url ? [product.image_url] : [];
  }

  function renderGallery() {
    const box = $('current-images');
    box.innerHTML = '';

    currentGallery.forEach((url, index) => {
      const item = document.createElement('div');
      item.className = 'image-preview-item';

      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Zdjęcie ' + (index + 1);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Usuń zdjęcie';
      button.addEventListener('click', () => {
        removedGallery.push(url);
        currentGallery.splice(index, 1);
        renderGallery();
      });

      item.append(img, button);
      box.appendChild(item);
    });

    if (!currentGallery.length) {
      box.innerHTML = '<span class="muted">Brak zapisanych zdjęć.</span>';
    }
  }

  function resetProductForm() {
    $('product-form').reset();
    $('product-id').value = '';
    currentGallery = [];
    removedGallery = [];
    renderGallery();
    renderVehicleSelect();

    $('form-title').textContent = 'Dodaj część';
    $('save-product').textContent = 'Zapisz część';
    $('cancel-edit').hidden = true;
    message('form-message', '');
  }

  function editProduct(product) {
    $('product-id').value = product.id;
    $('p-name').value = product.name || '';
    $('p-category').value = product.category || '';
    $('p-make').value = product.make || '';
    $('p-model').value = product.model || '';
    $('p-years').value = product.years || '';
    $('p-oem').value = product.oem || '';
    $('p-price').value = product.price ?? '';
    $('p-status').value = product.status || 'available';
    $('p-description').value = product.description || '';
    $('p-dismantling-number').value = product.dismantling_number || '';

    const linked = vehicles.find(v =>
      String(v.id) === String(product.vehicle_id)
    );
    renderVehicleSelect(linked?.id || product.vehicle_id || '');

    currentGallery = galleryOf(product);
    removedGallery = [];
    renderGallery();

    $('form-title').textContent = 'Edytuj część';
    $('save-product').textContent = 'Zapisz zmiany';
    $('cancel-edit').hidden = false;
    setTab('products');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadImages(files) {
    const urls = [];

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Dozwolone formaty: JPG, PNG i WebP.');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Każde zdjęcie może mieć maksymalnie 5 MB.');
      }

      const extension = file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp' ? 'webp' : 'jpg';

      const path = `${crypto.randomUUID()}.${extension}`;

      const { error } = await client.storage
        .from('product-images')
        .upload(path, file, {
          upsert: false,
          contentType: file.type
        });

      if (error) throw error;

      const { data } = client.storage
        .from('product-images')
        .getPublicUrl(path);

      urls.push(data.publicUrl);
    }

    return urls;
  }

  async function saveProduct(event) {
    event.preventDefault();

    const button = $('save-product');
    button.disabled = true;
    message('form-message', 'Zapisywanie…');

    try {
      const id = $('product-id').value;
      const files = Array.from($('p-images').files || []);
      const uploaded = await uploadImages(files);
      const gallery = [...currentGallery, ...uploaded];

      const selectedVehicleId = $('p-vehicle').value || null;
      const selectedVehicle = vehicles.find(v =>
        String(v.id) === String(selectedVehicleId)
      );

      const payload = {
        name: $('p-name').value.trim(),
        category: $('p-category').value.trim(),
        make: $('p-make').value.trim() || selectedVehicle?.make || null,
        model: $('p-model').value.trim() || selectedVehicle?.model || null,
        years: $('p-years').value.trim() || selectedVehicle?.years || null,
        oem: $('p-oem').value.trim() || null,
        price: Number($('p-price').value),
        status: $('p-status').value,
        description: $('p-description').value.trim() || null,
        image_url: gallery[0] || null,
        gallery_urls: gallery,
        vehicle_id: selectedVehicleId,
        dismantling_number:
          $('p-dismantling-number').value.trim() ||
          selectedVehicle?.dismantling_number ||
          null
      };

      let result;

      if (id) {
        result = await client.from('products').update(payload).eq('id', id);
      } else {
        result = await client.from('products').insert(payload);
      }

      if (result.error) {
        const errorText = result.error.message || '';

        if (/column .* does not exist|schema cache/i.test(errorText)) {
          throw new Error(
            'W tabeli products brakuje jednego z pól używanych do powiązania galerii lub rozbieralni. Nie zmieniono struktury bazy. Szczegóły: ' +
            errorText
          );
        }

        throw result.error;
      }

      resetProductForm();
      await loadProducts();
      message('form-message', 'Część została zapisana.', 'success');
    } catch (error) {
      message(
        'form-message',
        'Nie udało się zapisać części: ' + (error.message || error),
        'error'
      );
    } finally {
      button.disabled = false;
    }
  }

  function resetVehicleForm() {
    $('vehicle-form').reset();
    $('vehicle-id').value = '';
    $('vehicle-form-title').textContent = 'Dodaj rozbieralnię / samochód dawcę';
    $('save-vehicle').textContent = 'Zapisz rozbieralnię';
    $('cancel-vehicle-edit').hidden = true;
    message('vehicle-form-message', '');
  }

  function editVehicle(vehicle) {
    $('vehicle-id').value = vehicle.id;
    $('v-dismantling-number').value = vehicle.dismantling_number || '';
    $('v-make').value = vehicle.make || '';
    $('v-model').value = vehicle.model || '';
    $('v-years').value = vehicle.years || '';
    $('v-vin').value = vehicle.vin || '';
    $('v-description').value = vehicle.description || '';

    $('vehicle-form-title').textContent = 'Edytuj rozbieralnię';
    $('save-vehicle').textContent = 'Zapisz zmiany';
    $('cancel-vehicle-edit').hidden = false;

    setTab('vehicles');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveVehicle(event) {
    event.preventDefault();

    const button = $('save-vehicle');
    button.disabled = true;
    message('vehicle-form-message', 'Zapisywanie…');

    try {
      const id = $('vehicle-id').value;

      // Zapisujemy wyłącznie pola, które widać w istniejącej tabeli vehicles.
      // Nie dodajemy automatycznie niepotwierdzonych kolumn.
      const payload = {
        dismantling_number: $('v-dismantling-number').value.trim(),
        make: $('v-make').value.trim(),
        model: $('v-model').value.trim(),
        years: $('v-years').value.trim() || null
      };

      const result = id
        ? await client.from('vehicles').update(payload).eq('id', id)
        : await client.from('vehicles').insert(payload);

      if (result.error) throw result.error;

      resetVehicleForm();
      await loadVehicles();
      message('vehicle-form-message', 'Rozbieralnia została zapisana.', 'success');
    } catch (error) {
      message(
        'vehicle-form-message',
        'Nie udało się zapisać rozbieralni: ' + (error.message || error),
        'error'
      );
    } finally {
      button.disabled = false;
    }
  }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();

    if (!client) {
      message('login-message', 'Sprawdź konfigurację Supabase w config.js.', 'error');
      return;
    }

    const button = $('login-button');
    button.disabled = true;
    message('login-message', 'Logowanie…');

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: $('email').value.trim(),
        password: $('password').value
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error('Sesja nie została utworzona.');
      }

      message('login-message', '');
      showUser(data.user);
    } catch (error) {
      message('login-message', 'Błąd logowania: ' + error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  $('logout').addEventListener('click', async () => {
    if (!client) return;

    const { error } = await client.auth.signOut();

    if (error) {
      message('inventory-message', error.message, 'error');
      return;
    }

    showUser(null);
  });

  $('product-form').addEventListener('submit', saveProduct);
  $('cancel-edit').addEventListener('click', resetProductForm);
  $('admin-search').addEventListener('input', renderProducts);
  $('vehicle-form').addEventListener('submit', saveVehicle);
  $('cancel-vehicle-edit').addEventListener('click', resetVehicleForm);
  $('vehicle-search').addEventListener('input', renderVehicles);

  $('inventory-body').addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-product]');
    const deleteButton = event.target.closest('[data-delete-product]');

    if (editButton) {
      const product = products.find(p =>
        String(p.id) === editButton.dataset.editProduct
      );
      if (product) editProduct(product);
    }

    if (deleteButton) {
      const product = products.find(p =>
        String(p.id) === deleteButton.dataset.deleteProduct
      );

      if (!product || !confirm(`Usunąć część „${product.name}”?`)) return;

      const { error } = await client
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) {
        message('inventory-message', error.message, 'error');
        return;
      }

      message('inventory-message', 'Część została usunięta.', 'success');
      await loadProducts();
    }
  });

  $('vehicles-body').addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-vehicle]');
    const deleteButton = event.target.closest('[data-delete-vehicle]');

    if (editButton) {
      const vehicle = vehicles.find(v =>
        String(v.id) === editButton.dataset.editVehicle
      );
      if (vehicle) editVehicle(vehicle);
    }

    if (deleteButton) {
      const vehicle = vehicles.find(v =>
        String(v.id) === deleteButton.dataset.deleteVehicle
      );

      if (!vehicle || !confirm(
        `Usunąć rozbieralnię ${vehicle.dismantling_number || ''}?`
      )) return;

      const { error } = await client
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) {
        message('vehicles-message', error.message, 'error');
        return;
      }

      message('vehicles-message', 'Rozbieralnia została usunięta.', 'success');
      await loadVehicles();
    }
  });

  if (!client) {
    $('setup-warning').hidden = false;
    $('setup-warning').textContent =
      'Brak poprawnej konfiguracji Supabase. Sprawdź config.js.';
  } else {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        showUser(null);
      } else if (session?.user) {
        showUser(session.user);
      } else if (authReady) {
        showUser(null);
      }
    });

    client.auth.getSession()
      .then(({ data, error }) => {
        authReady = true;

        if (error) {
          message('login-message', 'Nie udało się odtworzyć sesji. Zaloguj się ponownie.', 'error');
          showUser(null);
          return;
        }

        showUser(data.session?.user || null);
      })
      .catch(() => {
        authReady = true;
        showUser(null);
      });
  }
})();