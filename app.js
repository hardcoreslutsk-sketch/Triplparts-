(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  const demo = [
    { id: 'demo1', name: 'Lampa przednia lewa', category: 'Oświetlenie', make: 'BMW', model: 'Seria 3 E90', years: '2005–2011', oem: '63117161649', price: 180, status: 'available', description: 'Przykładowy produkt demonstracyjny.', image_url: '' },
    { id: 'demo2', name: 'Zderzak przedni', category: 'Karoseria', make: 'Volkswagen', model: 'Golf VI', years: '2008–2012', oem: '5K0807217', price: 350, status: 'available', description: 'Przykładowy produkt demonstracyjny.', image_url: '' },
    { id: 'demo3', name: 'Sterownik silnika ECU', category: 'Elektronika', make: 'Audi', model: 'A4 B8', years: '2008–2015', oem: '03L906018AQ', price: 260, status: 'reserved', description: 'Przykładowy produkt demonstracyjny.', image_url: '' },
    { id: 'demo4', name: 'Skrzynia biegów', category: 'Skrzynie biegów', make: 'Opel', model: 'Astra J', years: '2009–2015', oem: 'M32', price: 950, status: 'available', description: 'Przykładowy produkt demonstracyjny.', image_url: '' }
  ];

  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const $ = id => document.getElementById(id);
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  let products = [];

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  const placeholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440">' +
    '<rect width="640" height="440" fill="#edf0ef"/>' +
    '<g fill="none" stroke="#b6c0c0" stroke-width="5">' +
    '<path d="M170 280h300l-35-80H235z"/>' +
    '<circle cx="235" cy="300" r="32"/>' +
    '<circle cx="405" cy="300" r="32"/>' +
    '<path d="M260 205l28-38h90l40 38"/></g>' +
    '<text x="320" y="375" font-family="Arial" font-size="18" fill="#7d898a" text-anchor="middle">TRIPL PARTS</text>' +
    '</svg>'
  )}`;

  const money = n => new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN', maximumFractionDigits: 2
  }).format(Number(n) || 0);

  const statusText = s => ({
    available: 'Dostępna', reserved: 'Zarezerwowana', sold: 'Sprzedana'
  }[s] || 'Dostępna');

  const safe = s => String(s || '').replace(/\s+/g, ' ').trim();

  function contactUrl(p) {
    const number = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    const msg = [
      'Dzień dobry, proszę o informację o dostępności części:',
      safe(p.name),
      p.make ? '| ' + safe(p.make) : '',
      p.model ? safe(p.model) : '',
      p.oem ? '| OEM: ' + safe(p.oem) : '',
      p.price != null ? '| Cena: ' + money(p.price) : ''
    ].filter(Boolean).join(' ');

    const encoded = encodeURIComponent(msg);
    return number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }

  function setFilters() {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pl'));
    const makes = [...new Set(products.map(p => p.make).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pl'));

    const cat = $('category-filter');
    const make = $('make-filter');
    const oldCat = cat.value;
    const oldMake = make.value;

    cat.innerHTML = '<option value="">Wszystkie kategorie</option>' +
      categories.map(v => `<option>${esc(v)}</option>`).join('');
    make.innerHTML = '<option value="">Wszystkie marki</option>' +
      makes.map(v => `<option>${esc(v)}</option>`).join('');

    cat.value = oldCat;
    make.value = oldMake;
  }

  function render() {
    const term = $('search').value.trim().toLocaleLowerCase('pl');
    const category = $('category-filter').value;
    const make = $('make-filter').value;

    const filtered = products.filter(p =>
      p.status !== 'sold' &&
      (!category || p.category === category) &&
      (!make || p.make === make) &&
      (!term || [p.name, p.category, p.make, p.model, p.years, p.oem, p.description]
        .some(v => String(v || '').toLocaleLowerCase('pl').includes(term)))
    );

    grid.innerHTML = '';

    filtered.forEach(p => {
      const el = document.getElementById('product-template').content.cloneNode(true);
      const card = el.querySelector('.product-card');
      const img = el.querySelector('.product-image');

      img.src = p.image_url || placeholder;
      img.alt = p.name || 'Część samochodowa';

      const badge = el.querySelector('.stock-badge');
      badge.textContent = statusText(p.status);
      badge.classList.add(p.status || 'available');
      if (p.status === 'reserved') {
        badge.textContent = 'Zapytaj o dostępność';
      }

      el.querySelector('.product-category').textContent = p.category || 'Części samochodowe';
      el.querySelector('.product-name').textContent = p.name;
      el.querySelector('.product-fitment').textContent =
        [p.make, p.model, p.years].filter(Boolean).join(' · ') || 'Zapytaj o dopasowanie';
      el.querySelector('.product-oem').textContent = p.oem ? 'OEM: ' + p.oem : '';
      el.querySelector('.product-price').textContent = money(p.price);

      const a = el.querySelector('.product-contact');
      a.href = contactUrl(p);

      card.setAttribute('aria-label', p.name);
      grid.appendChild(el);
    });

    $('results-count').textContent =
      `${filtered.length} ${filtered.length === 1 ? 'produkt'
        : filtered.length < 5 ? 'produkty' : 'produktów'}`;
    $('empty-state').hidden = filtered.length !== 0;
  }

  async function load() {
    if (!client) {
      products = demo;
      setFilters();
      render();
      $('catalog-status').hidden = false;
      $('catalog-status').textContent =
        'Tryb demonstracyjny: widzisz przykładowe produkty. Aby uruchomić prawdziwy katalog, skonfiguruj Supabase zgodnie z instrukcją README.';
      return;
    }

    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      products = data || [];
      setFilters();
      render();

      if (!products.length) {
        $('catalog-status').hidden = false;
        $('catalog-status').textContent =
          'Katalog jest jeszcze pusty. Dodaj pierwsze części w panelu administratora.';
      } else {
        $('catalog-status').hidden = true;
      }
    } catch (e) {
      products = [];
      render();
      $('catalog-status').hidden = false;
      $('catalog-status').textContent =
        'Nie udało się połączyć z katalogiem. Sprawdź konfigurację Supabase i połączenie internetowe.';
      console.error(e);
    }
  }

  ['search', 'category-filter', 'make-filter'].forEach(id =>
    $(id).addEventListener(id === 'search' ? 'input' : 'change', render)
  );

  const w = $('whatsapp-cta');
  const waNumber = (cfg.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const waConfigured = waNumber && !cfg.WHATSAPP_NUMBER.includes('123456789');
  w.href = waConfigured ? `https://wa.me/${waNumber}` : 'https://wa.me/';
  w.target = '_blank';
  w.rel = 'noopener';

  const ph = $('phone-cta');
  const phoneRaw = cfg.PHONE_NUMBER || '';
  const phoneConfigured = phoneRaw && !phoneRaw.includes('123 456 789');
  if (phoneConfigured) {
    ph.href = 'tel:' + phoneRaw.replace(/[^+\d]/g, '');
  } else {
    ph.href = 'javascript:void(0)';
    ph.addEventListener('click', e => {
      e.preventDefault();
      alert('Dodaj numer telefonu w pliku config.js.');
    });
  }

  load();
})();