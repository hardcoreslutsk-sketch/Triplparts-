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
        <div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;color:var(--text);padding:4px 0;">
          <span style="color:var(--accent-fg);font-weight:800;min-width:28px;">${esc(it.qty || 1)}×</span>
          <span style="flex:1;overflow-wrap:anywhere;">${esc(it.name || '—')}${it.sku ? ` <span style="color:var(--muted);font-size:11px;font-family:monospace;">#${esc(it.sku)}</span>` : ''}</span>
          <span style="font-weight:700;white-space:nowrap;">${moneyPLN(Number(it.price_pln) * Number(it.qty || 1))}</span>
        </div>`).join('') || '<div style="color:var(--muted);font-size:13px;">—</div>';

      const statusColors = {
        new: 'background:#fef3c7;color:#92400e;',
        contacted: 'background:#dbeafe;color:#1e40af;',
        completed: 'background:#dcfce7;color:#166534;',
        cancelled: 'background:#e5e7eb;color:#6b7280;'
      };
      const statusStyle = statusColors[o.status] || statusColors.new;

      const card = document.createElement('div');
      card.style.cssText = 'padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;gap:10px;';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="font-family:monospace;font-size:12px;color:var(--muted);letter-spacing:.5px;">ZAMÓWIENIE #${esc(ref)}</div>
            <div style="font-size:12px;color:var(--muted);">${esc(formatDate(o.created_at))}</div>
          </div>
          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;${statusStyle}">${orderStatusText(o.status)}</span>
        </div>
        <div style="font-size:13px;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere;padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">${esc(o.customer_address || '—')}</div>
        <div style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">${itemsHtml}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--border);">
          <span style="color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">Razem</span>
          <b style="color:var(--accent-fg);font-size:20px;font-weight:900;">${moneyPLN(o.total_pln)}</b>
        </div>`;
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
      const isDark = root.getAttribute('data-theme') === 'dark';
      if (isDark) { root.removeAttribute('data-theme'); try{localStorage.setItem('tp-theme','light');}catch(e){} }
      else { root.setAttribute('data-theme','dark'); try{localStorage.setItem('tp-theme','dark');}catch(e){} }
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