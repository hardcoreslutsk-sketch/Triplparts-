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
    if (curCurrency() === 'EUR') return fmtEur(n);
    return fmtPln(n);
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

  // ===== Уведомления =====
  async function sendEmailNotification(order, items) {
    if (!cfg.WEB3FORMS_KEY) return;
    const total = items.reduce((s, it) => s + Number(it.price_pln) * Number(it.qty), 0);
    const itemsText = items.map(it =>
      `${it.qty}× ${it.name}${it.sku ? ' (#' + it.sku + ')' : ''} — ${(Number(it.price_pln) * Number(it.qty)).toFixed(2)} zł`
    ).join('\n');
    const message =
      `NOWE ZAMÓWIENIE\n\n` +
      `Klient: ${order.customer_name}\n` +
      `Telefon: ${order.customer_phone || '—'}\n` +
      `E-mail: ${order.customer_email || '—'}\n` +
      `Adres: ${order.customer_address}\n` +
      `Uwagi: ${order.notes || '—'}\n\n` +
      `Zamówione części:\n${itemsText}\n\n` +
      `Wartość części: ${total.toFixed(2)} zł\n` +
      `Dostawa: DO USTALENIA`;
    try {
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: cfg.WEB3FORMS_KEY,
          subject: 'Nowe zamówienie — ' + order.customer_name,
          from_name: 'TRIPL PARTS',
          name: order.customer_name,
          email: order.customer_email || cfg.EMAIL || '',
          phone: order.customer_phone || '',
          message
        })
      });
    } catch (e) { console.warn('Web3Forms:', e); }
  }

  async function sendWhatsAppNotification(order, items) {
    if (!cfg.CALLMEBOT_KEY) return;
    const phone = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g,'');
    if (!phone) return;
    const total = items.reduce((s, it) => s + Number(it.price_pln) * Number(it.qty), 0);
    const itemsText = items.map(it => `${it.qty}x ${it.name} — ${(Number(it.price_pln) * Number(it.qty)).toFixed(2)} zl`).join(', ');
    const text = `NOWE ZAMOWIENIE\nKlient: ${order.customer_name}\nTel: ${order.customer_phone || '-'}\nEmail: ${order.customer_email || '-'}\nAdres: ${order.customer_address}\nCzesci: ${itemsText}\nWartosc czesci: ${total.toFixed(2)} zl\nDostawa: DO USTALENIA`;
    try {
      await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${cfg.CALLMEBOT_KEY}`, { mode: 'no-cors' });
    } catch (e) { console.warn('CallMeBot:', e); }
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
      if (!confirm('?')) return;
      window.TPCart.clear(); renderCart();
    });
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

      if (!name) { msg.className='form-message error'; msg.textContent = T('checkout.errName'); return; }
      if (!address) { msg.className='form-message error'; msg.textContent = T('checkout.errAddress'); return; }
      if (!phone && !email) { msg.className='form-message error'; msg.textContent = T('checkout.errContact'); return; }
      const items = window.TPCart ? window.TPCart.read() : [];
      if (!items.length) { msg.className='form-message error'; msg.textContent = T('checkout.errEmpty'); return; }
      if (!client) { msg.className='form-message error'; msg.textContent='config.js'; return; }

      const btn = $('submit-order');
      btn.disabled = true; const prev = btn.textContent; btn.textContent = T('checkout.sending');

      try {
        const itemsPayload = items.map(it => ({
          id: it.id, sku: it.sku || '', name: it.name || '',
          price: Number(it.price_pln) || 0,
          price_pln: Number(it.price_pln) || 0,
          price_eur: it.price_eur === null || it.price_eur === undefined ? null : Number(it.price_eur),
          qty: Number(it.qty) || 1
        }));
        const totalPln = items.reduce((s, it) => s + (Number(it.price_pln) || 0) * (Number(it.qty) || 1), 0);
        const { data: newId, error } = await client.rpc('create_order', {
          p_customer_name: name,
          p_customer_phone: phone || null,
          p_customer_email: email || null,
          p_customer_address: address,
          p_notes: notes || null,
          p_items: itemsPayload,
          p_total_pln: Number(totalPln.toFixed(2))
        });
        if (error) throw error;
        const orderForNotify = { customer_name: name, customer_phone: phone, customer_email: email, customer_address: address, notes };
        Promise.allSettled([sendEmailNotification(orderForNotify, itemsPayload), sendWhatsAppNotification(orderForNotify, itemsPayload)]);

        window.TPCart.clear();
        $('checkout-content').hidden = true;
        $('checkout-empty').hidden = true;
        $('checkout-success').hidden = false;
        $('order-ref').textContent = String(newId || '—').slice(0,8).toUpperCase();
        window.scrollTo({top:0, behavior:'smooth'});
      } catch (err) {
        msg.className = 'form-message error';
        msg.textContent = T('checkout.errSend') + (err.message || '');
      } finally { btn.disabled = false; btn.textContent = prev; }
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
  document.addEventListener('DOMContentLoaded', renderCart);
  renderCart();
})();