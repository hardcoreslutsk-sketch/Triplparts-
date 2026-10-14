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
  function moneyPLN(n) {
    return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(Number(n)||0);
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

  function showLogin() {
    $('mo-login').hidden = false;
    $('mo-orders').hidden = true;
  }
  function showOrders(user) {
    $('mo-login').hidden = true;
    $('mo-orders').hidden = false;
    $('mo-user-email').textContent = user?.email || '';
    loadOrders();
  }

  async function loadOrders() {
    const list = $('mo-list');
    list.innerHTML = '<p class="muted">Ładowanie…</p>';
    const { data, error } = await client.from('orders')
      .select('*').order('created_at', { ascending: false });
    if (error) {
      list.innerHTML = '';
      $('mo-empty').hidden = false;
      return;
    }
    const orders = data || [];
    list.innerHTML = '';
    if (!orders.length) {
      $('mo-empty').hidden = false;
      return;
    }
    $('mo-empty').hidden = true;
    orders.forEach(o => {
      const ref = String(o.id || '').slice(0,8).toUpperCase();
      const items = Array.isArray(o.items) ? o.items : [];
      const itemsHtml = items.map(it => `
        <div class="order-item">
          <span class="qty">${esc(it.qty || 1)}×</span>
          <span class="name">${esc(it.name || '—')}${it.sku ? ` <span class="sku">#${esc(it.sku)}</span>` : ''}</span>
          <span class="price">${moneyPLN(Number(it.price_pln) * Number(it.qty || 1))}</span>
        </div>`).join('') || '<div class="order-item"><span class="name">—</span></div>';
      const card = document.createElement('div');
      card.className = 'order-card status-' + orderStatusClass(o.status);
      card.innerHTML = `
        <div class="order-head">
          <div>
            <div class="order-ref">ZAMÓWIENIE #${esc(ref)}</div>
            <div class="order-date">${esc(formatDate(o.created_at))}</div>
          </div>
          <span class="order-status ${orderStatusClass(o.status)}">${orderStatusText(o.status)}</span>
        </div>
        <div class="order-address"><b style="color:#888;font-size:11px;display:block;margin-bottom:4px;letter-spacing:.05em">ADRES DOSTAWY</b>${esc(o.customer_address || '—')}</div>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-total"><span>Razem</span><b>${moneyPLN(o.total_pln)}</b></div>`;
      list.appendChild(card);
    });
  }

  $('mo-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('mo-login-msg');
    msg.className = 'form-message'; msg.textContent = '';
    if (!client) { msg.className='form-message error'; msg.textContent='config.js'; return; }
    const email = $('mo-email').value.trim();
    const password = $('mo-password').value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      msg.className='form-message error';
      msg.textContent = T('myOrders.loginError') + error.message;
      return;
    }
  });

  $('mo-logout').addEventListener('click', async () => {
    await client.auth.signOut();
    showLogin();
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

  if (!client) { showLogin(); return; }
  client.auth.getSession().then(({ data }) => {
    if (data?.session?.user) showOrders(data.session.user);
    else showLogin();
  });
  client.auth.onAuthStateChange((_e, s) => {
    if (s?.user) showOrders(s.user);
    else showLogin();
  });
})();
