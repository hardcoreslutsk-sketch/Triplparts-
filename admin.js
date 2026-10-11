(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  const $ = id => document.getElementById(id);
  if (!document.getElementById('login-panel')) return;

  const warning = $('setup-warning');
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  let products = [];
  let currentImageUrl = '';
  let currentImagePath = '';

  const STATUSES = ['available', 'reserved', 'sold'];
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  function message(id, text, type = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + type;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function money(n) {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(n) || 0);
  }

  function statusText(s) {
    return ({ available: 'Dostępna', reserved: 'Zarezerwowana', sold: 'Sprzedana' }[s] || 'Dostępna');
  }

  function statusClass(s) {
    return STATUSES.includes(s) ? s : 'available';
  }

  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function extractStoragePath(url) {
    if (!url) return '';
    const marker = '/product-images/';
    const idx = url.indexOf(marker);
    if (idx === -1) return '';
    return url.slice(idx + marker.length);
  }

  async function deleteOldImage(oldUrl, newUrl) {
    if (!oldUrl || oldUrl === newUrl) return;
    const path = extractStoragePath(oldUrl);
    if (!path) return;
    try {
      await client.storage.from('product-images').remove([path]);
    } catch (e) {
      console.warn('Nie udało się usunąć starego zdjęcia:', e);
    }
  }

  function showUser(user) {
    $('login-panel').hidden = !!user;
    $('dashboard').hidden = !user;
    if (user) refresh();
  }

  async function refresh() {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      message('inventory-message', 'Błąd pobierania danych: ' + error.message, 'error');
      return;
    }
    products = data || [];
    $('admin-total').textContent = products.length;
    renderInventory();
  }

  function renderInventory() {
    const q = $('admin-search').value.trim().toLocaleLowerCase('pl');
    const body = $('inventory-body');
    body.innerHTML = '';

    products
      .filter(p => [p.name, p.category, p.make, p.model, p.oem]
        .some(v => String(v || '').toLocaleLowerCase('pl').includes(q)))
      .forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="table-product">
              ${p.image_url
                ? `<img src="${esc(p.image_url)}" alt="">`
                : '<div class="brand-mark">A</div>'}
              <div>
                <b>${esc(p.name)}</b>
                <small>${esc([p.category, p.make, p.model].filter(Boolean).join(' · '))}</small>
              </div>
            </div>
          </td>
          <td>${esc(p.oem || '—')}</td>
          <td><b>${money(p.price)}</b></td>
          <td><span class="table-status ${statusClass(p.status)}">${statusText(p.status)}</span></td>
          <td>
            <div class="table-actions">
              <button class="small-action" data-edit="${esc(p.id)}">Edytuj</button>
              <button class="small-action delete" data-delete="${esc(p.id)}">Usuń</button>
            </div>
          </td>`;
        body.appendChild(tr);
      });

    if (!body.children.length) {
      body.innerHTML = '<tr><td colspan="5">Brak części do wyświetlenia.</td></tr>';
    }
  }

  function resetForm() {
    $('product-form').reset();
    $('product-id').value = '';
    currentImageUrl = '';
    currentImagePath = '';
    $('current-image').hidden = true;
    $('current-image').innerHTML = '';
    $('form-title').textContent = 'Dodaj nową część';
    $('save-product').textContent = 'Zapisz część';
    $('cancel-edit').hidden = true;
    message('form-message', '');
  }

  function edit(p) {
    $('product-id').value = p.id;
    $('p-name').value = p.name || '';
    $('p-category').value = p.category || '';
    $('p-make').value = p.make || '';
    $('p-model').value = p.model || '';
    $('p-years').value = p.years || '';
    $('p-oem').value = p.oem || '';
    $('p-price').value = p.price ?? '';
    $('p-status').value = statusClass(p.status);
    $('p-description').value = p.description || '';

    currentImageUrl = p.image_url || '';
    currentImagePath = extractStoragePath(currentImageUrl);

    $('current-image').hidden = !currentImageUrl;
    $('current-image').innerHTML = currentImageUrl
      ? `<img src="${esc(currentImageUrl)}" alt="Aktualne zdjęcie"><span>Aktualne zdjęcie</span>`
      : '';

    $('form-title').textContent = 'Edytuj część';
    $('save-product').textContent = 'Zapisz zmiany';
    $('cancel-edit').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadImage(file) {
    if (!file) return currentImageUrl;
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Wybierz zdjęcie JPG, PNG lub WebP.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Zdjęcie jest za duże. Maksymalny rozmiar to 5 MB.');
    }

    const ext = file.type === 'image/png' ? 'png'
              : file.type === 'image/webp' ? 'webp'
              : 'jpg';

    const path = `${uuid()}.${ext}`;
    const { error } = await client.storage
      .from('product-images')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;

    const { data } = client.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  }

  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!client) {
      message('login-message', 'Najpierw uzupełnij config.js i wykonaj instrukcję README.', 'error');
      return;
    }
    message('login-message', 'Logowanie…');
    const { error } = await client.auth.signInWithPassword({
      email: $('email').value,
      password: $('password').value
    });
    if (error) {
      message('login-message', 'Nie udało się zalogować. Sprawdź e-mail i hasło.', 'error');
      return;
    }
    message('login-message', '');
  });

  $('logout').addEventListener('click', async () => {
    await client.auth.signOut();
    showUser(null);
  });

  $('cancel-edit').addEventListener('click', resetForm);
  $('admin-search').addEventListener('input', renderInventory);

  $('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!client) return;

    const btn = $('save-product');
    btn.disabled = true;
    message('form-message', 'Zapisywanie…');

    try {
      const oldImageUrl = currentImageUrl;
      const image_url = await uploadImage($('p-image').files[0]);

      const payload = {
        name: $('p-name').value.trim(),
        category: $('p-category').value.trim(),
        make: $('p-make').value.trim() || null,
        model: $('p-model').value.trim() || null,
        years: $('p-years').value.trim() || null,
        oem: $('p-oem').value.trim() || null,
        price: Number($('p-price').value),
        status: statusClass($('p-status').value),
        description: $('p-description').value.trim() || null,
        image_url: image_url || null
      };

      const id = $('product-id').value;
      const result = id
        ? await client.from('products').update(payload).eq('id', id).select().single()
        : await client.from('products').insert(payload).select().single();

      if (result.error) throw result.error;

      if (id && oldImageUrl && oldImageUrl !== image_url) {
        await deleteOldImage(oldImageUrl, image_url);
      }

      message('form-message', id ? 'Zmiany zapisane.' : 'Część została dodana.', 'success');
      resetForm();
      await refresh();
    } catch (err) {
      message('form-message', 'Nie udało się zapisać: ' + (err.message || 'nieznany błąd'), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  $('inventory-body').addEventListener('click', async e => {
    const editId = e.target.closest('[data-edit]')?.dataset.edit;
    const deleteId = e.target.closest('[data-delete]')?.dataset.delete;

    if (editId) {
      const p = products.find(x => x.id === editId);
      if (p) edit(p);
    }

    if (deleteId) {
      const p = products.find(x => x.id === deleteId);
      if (!p || !confirm(`Usunąć część „${p.name}”? Tej operacji nie można cofnąć.`)) return;

      const { error } = await client.from('products').delete().eq('id', deleteId);
      if (error) {
        message('inventory-message', 'Nie udało się usunąć części: ' + error.message, 'error');
        return;
      }

      if (p.image_url) {
        await deleteOldImage(p.image_url, null);
      }

      message('inventory-message', 'Część została usunięta.', 'success');
      refresh();
    }
  });

  if (!configured) {
    warning.hidden = false;
    warning.textContent = 'Konfiguracja nie jest gotowa. Uzupełnij SUPABASE_URL i SUPABASE_ANON_KEY w config.js, a następnie wykonaj kroki z pliku README.md.';
    $('login-panel').hidden = false;
  } else {
    client.auth.onAuthStateChange((_event, session) => {
      showUser(session?.user || null);
    });
  }
})();