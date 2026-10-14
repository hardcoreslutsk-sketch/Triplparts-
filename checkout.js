(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  const $ = id => document.getElementById(id);
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const money = n => new Intl.NumberFormat('pl-PL',{
    style:'currency',currency:'PLN',maximumFractionDigits:2
  }).format(Number(n)||0);

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function renderCart() {
    const items = window.TPCart ? window.TPCart.read() : [];
    const emptyEl = $('checkout-empty');
    const contentEl = $('checkout-content');
    const successEl = $('checkout-success');

    if (!items.length) {
      emptyEl.hidden = false;
      contentEl.hidden = true;
      successEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    contentEl.hidden = false;

    const list = $('checkout-items');
    list.innerHTML = '';
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'checkout-item';
      row.innerHTML = `
        ${it.image
          ? `<img src="${esc(it.image)}" alt="" class="checkout-thumb">`
          : '<div class="checkout-thumb checkout-thumb-empty"></div>'}
        <div class="checkout-item-info">
          <b>${esc(it.name)}</b>
          ${it.sku ? `<small>Art.: ${esc(it.sku)}</small>` : ''}
          <div class="checkout-item-price">${money(it.price)}</div>
        </div>
        <div class="checkout-item-qty">
          <button type="button" data-dec="${esc(it.id)}" aria-label="Zmniejsz">−</button>
          <input type="number" min="1" max="99" value="${Number(it.qty)||1}" data-qty="${esc(it.id)}" inputmode="numeric">
          <button type="button" data-inc="${esc(it.id)}" aria-label="Zwiększ">+</button>
        </div>
        <button type="button" class="checkout-item-remove" data-remove="${esc(it.id)}" aria-label="Usuń">×</button>
      `;
      list.appendChild(row);
    });

    $('checkout-count').textContent = String(window.TPCart ? window.TPCart.count() : 0);
    $('checkout-total').textContent = money(window.TPCart ? window.TPCart.total() : 0);
  }

  // Click delegation for cart controls
  document.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]')?.dataset.inc;
    const dec = e.target.closest('[data-dec]')?.dataset.dec;
    const rm  = e.target.closest('[data-remove]')?.dataset.remove;

    if (!window.TPCart) return;

    if (inc) {
      const it = window.TPCart.read().find(x => String(x.id) === String(inc));
      window.TPCart.setQty(inc, (Number(it?.qty) || 1) + 1);
      renderCart();
    }
    if (dec) {
      const it = window.TPCart.read().find(x => String(x.id) === String(dec));
      const q = (Number(it?.qty) || 1) - 1;
      if (q <= 0) window.TPCart.remove(dec);
      else window.TPCart.setQty(dec, q);
      renderCart();
    }
    if (rm) {
      window.TPCart.remove(rm);
      renderCart();
    }
  });

  document.addEventListener('input', e => {
    const id = e.target.closest('[data-qty]')?.dataset.qty;
    if (!id || !window.TPCart) return;
    const v = Math.max(1, Math.min(99, Number(e.target.value) || 1));
    window.TPCart.setQty(id, v);
    const tot = document.querySelector('#checkout-total');
    if (tot) tot.textContent = money(window.TPCart.total());
    const cnt = document.querySelector('#checkout-count');
    if (cnt) cnt.textContent = String(window.TPCart.count());
  });

  const clearBtn = $('clear-cart');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Wyczyścić cały koszyk?')) return;
      window.TPCart.clear();
      renderCart();
    });
  }

  // ===== SUBMIT =====
  const form = $('order-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('order-message');
      msg.className = 'form-message';
      msg.textContent = '';

      const name = $('o-name').value.trim();
      const phone = $('o-phone').value.trim();
      const email = $('o-email').value.trim();
      const address = $('o-address').value.trim();
      const notes = $('o-notes').value.trim();

      if (!name) { msg.className = 'form-message error'; msg.textContent = 'Podaj imię i nazwisko.'; return; }
      if (!address) { msg.className = 'form-message error'; msg.textContent = 'Podaj adres dostawy.'; return; }
      if (!phone && !email) { msg.className = 'form-message error'; msg.textContent = 'Podaj telefon lub e-mail.'; return; }

      const items = window.TPCart ? window.TPCart.read() : [];
      if (!items.length) { msg.className = 'form-message error'; msg.textContent = 'Koszyk jest pusty.'; return; }

      if (!client) {
        msg.className = 'form-message error';
        msg.textContent = 'Brak połączenia z bazą (config.js). Skontaktuj się z nami telefonicznie.';
        return;
      }

      const btn = $('submit-order');
      btn.disabled = true;
      const prev = btn.textContent;
      btn.textContent = 'Wysyłanie…';

      try {
        const payload = {
          customer_name: name,
          customer_phone: phone || null,
          customer_email: email || null,
          customer_address: address,
          notes: notes || null,
          items: items.map(it => ({
            id: it.id,
            sku: it.sku || '',
            name: it.name || '',
            price: Number(it.price) || 0,
            qty: Number(it.qty) || 1
          })),
          total_pln: Number(window.TPCart.total().toFixed(2)),
          status: 'new'
        };

        const { data, error } = await client.from('orders').insert(payload).select('id').single();
        if (error) throw error;

        window.TPCart.clear();

        $('checkout-content').hidden = true;
        $('checkout-empty').hidden = true;
        $('checkout-success').hidden = false;
        $('order-ref').textContent = (data && data.id ? String(data.id).slice(0,8) : '—').toUpperCase();
        window.scrollTo({top:0, behavior:'smooth'});
      } catch (err) {
        msg.className = 'form-message error';
        msg.textContent = 'Nie udało się wysłać zamówienia: ' + (err.message || 'nieznany błąd');
      } finally {
        btn.disabled = false;
        btn.textContent = prev;
      }
    });
  }

  // ===== THEME TOGGLE =====
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

  window.addEventListener('tp-cart-updated', renderCart);
  document.addEventListener('DOMContentLoaded', renderCart);
  renderCart();
})();
