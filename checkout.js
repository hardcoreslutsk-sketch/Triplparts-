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

  function curCurrency() { return i18n ? i18n.getCurrency() : 'PLN'; }

  function fmtPln(n) {
    return new Intl.NumberFormat('pl-PL', { style:'currency', currency:'PLN', maximumFractionDigits:2 }).format(Number(n)||0);
  }
  function fmtEur(n) {
    return new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR', maximumFractionDigits:2 }).format(Number(n)||0);
  }
  function fmtCurrency(n) {
    return curCurrency() === 'EUR' ? fmtEur(n) : fmtPln(n);
  }
  function itemPrice(it) {
    if (curCurrency() === 'EUR') {
      const v = it.price_eur;
      if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—';
      return fmtEur(v);
    }
    return fmtPln(it.price_pln);
  }
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
      emptyEl.hidden = false; contentEl.hidden = true; successEl.hidden = true; return;
    }
    emptyEl.hidden = true; contentEl.hidden = false;

    const list = $('checkout-items');
    list.innerHTML = '';
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'checkout-item';
      row.innerHTML = `
        ${it.image ? `<img src="${esc(it.image)}" alt="" class="checkout-thumb">` : '<div class="checkout-thumb checkout-thumb-empty">—</div>'}
        <div class="checkout-item-info">
          <b>${esc(it.name)}</b>
          ${it.sku ? `<small>Art.: ${esc(it.sku)}</small>` : ''}
          <div class="checkout-item-price">${itemPrice(it)}</div>
        </div>
        <div class="checkout-item-qty">
          <button type="button" data-dec="${esc(it.id)}">−</button>
          <input type="number" min="1" max="99" value="${Number(it.qty)||1}" data-qty="${esc(it.id)}">
          <button type="button" data-inc="${esc(it.id)}">+</button>
        </div>
        <button type="button" class="checkout-item-remove" data-remove="${esc(it.id)}">×</button>`;
      list.appendChild(row);
    });
    $('checkout-count').textContent = String(window.TPCart ? window.TPCart.count() : 0);
    $('checkout-total').textContent = fmtCurrency(window.TPCart ? window.TPCart.total(curCurrency()) : 0);
  }

  document.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]')?.dataset.inc;
    const dec = e.target.closest('[data-dec]')?.dataset.dec;
    const rm  = e.target.closest('[data-remove]')?.dataset.remove;
    if (!window.TPCart) return;
    if (inc) {
      const it = window.TPCart.read().find(x => String(x.id) === String(inc));
      window.TPCart.setQty(inc, (Number(it?.qty) || 1) + 1); renderCart();
    }
    if (dec) {
      const it = window.TPCart.read().find(x => String(x.id) === String(dec));
      const q = (Number(it?.qty) || 1) - 1;
      if (q <= 0) window.TPCart.remove(dec); else window.TPCart.setQty(dec, q);
      renderCart();
    }
    if (rm) { window.TPCart.remove(rm); renderCart(); }
  });

  document.addEventListener('input', e => {
    const id = e.target.closest('[data-qty]')?.dataset.qty;
    if (!id || !window.TPCart) return;
    const v = Math.max(1, Math.min(99, Number(e.target.value) || 1));
    window.TPCart.setQty(id, v);
    const tot = document.querySelector('#checkout-total');
    if (tot) tot.textContent = fmtCurrency(window.TPCart.total(curCurrency()));
  });

  const clearBtn = $('clear-cart');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm(T('checkout.confirmClear') || 'Wyczyścić koszyk?')) return;
      window.TPCart.clear(); renderCart();
    });
  }

  // Чекбокс "Создать аккаунт"
  const regCheck = $('o-create-account');
  const pwdBlock = $('password-block');
  if (regCheck && pwdBlock) {
    regCheck.addEventListener('change', () => {
      pwdBlock.hidden = !regCheck.checked;
    });
  }

  // Мгновенное подтверждение заказа через Edge Function
  async function notifyOrder(orderId) {
    if (!cfg.ORDER_EMAIL_FUNCTION_URL) return;
    try {
      await fetch(cfg.ORDER_EMAIL_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      });
    } catch (e) { console.warn('notifyOrder:', e); }
  }

  const form = $('order-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('order-message');
      msg.className = 'form-message'; msg.textContent = '';

      const name = $('o-name').value.trim();
      const phone = $('o-phone').value.trim();
      const email = $('o-email').value.trim();
      const address = $('o-address').value.trim();
      const notes = $('o-notes').value.trim();
      const wantAccount = $('o-create-account')?.checked || false;
      const password = $('o-password')?.value || '';

      if (!name) { msg.className='form-message error'; msg.textContent = T('checkout.errName'); return; }
      if (!address) { msg.className='form-message error'; msg.textContent = T('checkout.errAddress'); return; }
      if (!phone && !email) { msg.className='form-message error'; msg.textContent = T('checkout.errContact'); return; }
      if (wantAccount) {
        if (!email) { msg.className='form-message error'; msg.textContent = T('checkout.errEmailForAcc'); return; }
        if (password.length < 6) { msg.className='form-message error'; msg.textContent = T('checkout.errPassword'); return; }
      }

      const items = window.TPCart ? window.TPCart.read() : [];
      if (!items.length) { msg.className='form-message error'; msg.textContent = T('checkout.errEmpty'); return; }
      if (!client) { msg.className='form-message error'; msg.textContent='config.js'; return; }

      const btn = $('submit-order');
      btn.disabled = true; const prev = btn.textContent; btn.textContent = T('checkout.sending');

      try {
        // 1) Опциональная регистрация
        let accountInfo = '';
        if (wantAccount) {
          btn.textContent = T('checkout.creatingAccount') || 'Tworzenie konta…';
          let { data: si, error: siErr } =
            await client.auth.signInWithPassword({ email, password });
          if (siErr) {
            const su = await client.auth.signUp({ email, password });
            if (su.error && /already registered/i.test(su.error.message)) {
              accountInfo = T('checkout.accExistsWrongPass') ||
                'Konto z tym e-mailem już istnieje. Zaloguj się w „Moje zamówienia”.';
            } else if (su.error) {
              accountInfo = (T('checkout.regError') || 'Nie udało się utworzyć konta: ') + su.error.message;
            } else if (!su.data.session) {
              accountInfo = T('checkout.accNeedConfirm') ||
                'Konto utworzone. Potwierdź e-mail, aby zobaczyć zamówienia.';
            }
          }
        }

        // 2) Создание заказа (цены считает сервер)
        btn.textContent = T('checkout.sending');
        const itemsPayload = items.map(it => ({
          id: it.id,
          qty: Number(it.qty) || 1
        }));

        const { data: orderId, error: orderErr } = await client.rpc('create_order', {
          p_customer_name: name,
          p_customer_phone: phone || null,
          p_customer_email: email || null,
          p_customer_address: address,
          p_notes: notes || null,
          p_items: itemsPayload
        });
        if (orderErr) throw orderErr;

        // 3) Уведомления (email + WhatsApp) через Edge Function
        notifyOrder(orderId);

        // 4) Успех
        window.TPCart.clear();
        $('checkout-content').hidden = true;
        $('checkout-empty').hidden = true;
        $('checkout-success').hidden = false;
        $('order-ref').textContent = String(orderId || '—').slice(0,8).toUpperCase();
        if (accountInfo) $('checkout-success-note').textContent = accountInfo;
        window.scrollTo({top:0, behavior:'smooth'});
      } catch (err) {
        msg.className = 'form-message error';
        msg.textContent = (T('checkout.errSend') || 'Błąd: ') + (err.message || '');
      } finally {
        btn.disabled = false; btn.textContent = prev;
      }
    });
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

  window.addEventListener('tp-cart-updated', renderCart);
  window.addEventListener('tp-currency-changed', renderCart);
  window.addEventListener('tp-lang-changed', renderCart);
  document.addEventListener('DOMContentLoaded', renderCart);
  renderCart();
})();