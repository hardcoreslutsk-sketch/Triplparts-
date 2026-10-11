
(() => {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);

  const grid = $('product-grid');
  if (!grid) return;

  const statusBox = $('catalog-status');
  const searchInput = $('search');
  const categoryFilter = $('category-filter');
  const makeFilter = $('make-filter');
  const resultsCount = $('results-count');
  const emptyState = $('empty-state');

  let products = [];
  let client = null;

  const placeholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="440">
      <rect width="100%" height="100%" fill="#edf0ef"/>
      <text x="50%" y="48%" font-family="Arial" font-size="30"
        fill="#66757a" text-anchor="middle">TRIPL PARTS</text>
      <text x="50%" y="58%" font-family="Arial" font-size="18"
        fill="#66757a" text-anchor="middle">USED AUTO PARTS</text>
    </svg>
  `)}`;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const money = value => new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

  const statusText = status => ({
    available: 'Dostępna',
    reserved: 'Zarezerwowana',
    sold: 'Sprzedana'
  }[status] || 'Dostępna');

  function showStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.hidden = false;
    statusBox.textContent = message;
    statusBox.classList.toggle('notice-error', isError);
  }

  function hideStatus() {
    if (statusBox) statusBox.hidden = true;
  }

  function getWhatsAppNumber() {
    return String(cfg.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  }

  function contactUrl(product) {
    const message = [
      'Dzień dobry, proszę o informację o dostępności części:',
      product.name,
      [product.make, product.model, product.years].filter(Boolean).join(' '),
      product.oem ? `OEM: ${product.oem}` : '',
      product.vehicle?.dismantling_number
        ? `Numer rozbiórki: ${product.vehicle.dismantling_number}`
        : '',
      product.price != null ? `Cena: ${money(product.price)}` : ''
    ].filter(Boolean).join('\n');

    const number = getWhatsAppNumber();
    return `https://wa.me/${number}${number ? '' : ''}?text=${encodeURIComponent(message)}`;
  }

  function setFilters() {
    const categories = [...new Set(
      products.map(p => p.category).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pl'));

    const makes = [...new Set(
      products.map(p => p.make).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pl'));

    const previousCategory = categoryFilter?.value || '';
    const previousMake = makeFilter?.value || '';

    if (categoryFilter) {
      categoryFilter.innerHTML =
        '<option value="">Wszystkie kategorie</option>' +
        categories.map(value =>
          `<option value="${esc(value)}">${esc(value)}</option>`
        ).join('');

      categoryFilter.value = categories.includes(previousCategory)
        ? previousCategory : '';
    }

    if (makeFilter) {
      makeFilter.innerHTML =
        '<option value="">Wszystkie marki</option>' +
        makes.map(value =>
          `<option value="${esc(value)}">${esc(value)}</option>`
        ).join('');

      makeFilter.value = makes.includes(previousMake) ? previousMake : '';
    }
  }

  function render() {
    const term = (searchInput?.value || '').trim().toLocaleLowerCase('pl');
    const category = categoryFilter?.value || '';
    const make = makeFilter?.value || '';

    const filtered = products.filter(product => {
      if (product.status === 'sold') return false;
      if (category && product.category !== category) return false;
      if (make && product.make !== make) return false;

      if (!term) return true;

      const searchable = [
        product.name,
        product.category,
        product.make,
        product.model,
        product.years,
        product.oem,
        product.description,
        product.vehicle?.dismantling_number
      ].join(' ').toLocaleLowerCase('pl');

      return searchable.includes(term);
    });

    grid.innerHTML = '';

    const template = $('product-template');

    if (template) {
      filtered.forEach(product => {
        const element = template.content.cloneNode(true);
        const card = element.querySelector('.product-card');
        const image = element.querySelector('.product-image');
        const badge = element.querySelector('.stock-badge');

        if (image) {
          image.src = product.image_url || placeholder;
          image.alt = product.name || 'Część samochodowa';
          image.onerror = () => {
            image.onerror = null;
            image.src = placeholder;
          };
        }

        if (badge) {
          badge.textContent = statusText(product.status);
          badge.classList.add(product.status || 'available');
        }

        const categoryElement = element.querySelector('.product-category');
        if (categoryElement) {
          categoryElement.textContent = product.category || 'Części samochodowe';
        }

        const nameElement = element.querySelector('.product-name');
        if (nameElement) nameElement.textContent = product.name || 'Część samochodowa';

        const fitmentElement = element.querySelector('.product-fitment');
        if (fitmentElement) {
          fitmentElement.textContent =
            [product.make, product.model, product.years].filter(Boolean).join(' · ') ||
            'Zapytaj o dopasowanie';
        }

        const oemElement = element.querySelector('.product-oem');
        if (oemElement) {
          oemElement.textContent = product.oem ? `OEM: ${product.oem}` : '';
        }

        const priceElement = element.querySelector('.product-price');
        if (priceElement) priceElement.textContent = money(product.price);

        const contact = element.querySelector('.product-contact');
        if (contact) {
          contact.href = contactUrl(product);
          contact.target = '_blank';
          contact.rel = 'noopener noreferrer';
          contact.textContent = 'Zapytaj o część ↗';
        }

        if (card) card.setAttribute('aria-label', product.name || 'Część samochodowa');
        grid.appendChild(element);
      });
    }

    if (resultsCount) {
      const count = filtered.length;
      resultsCount.textContent =
        `${count} ${count === 1 ? 'produkt' : count < 5 ? 'produkty' : 'produktów'}`;
    }

    if (emptyState) emptyState.hidden = filtered.length !== 0;
  }

  async function loadProducts() {
    const configured =
      cfg.SUPABASE_URL &&
      !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
      cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

    if (!configured || !window.supabase) {
      products = [];
      render();
      showStatus(
        'Nie można uruchomić połączenia z Supabase. Sprawdź, czy config.js i biblioteka Supabase są prawidłowo załadowane.',
        true
      );
      return;
    }

    try {
      client = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      );

      // Celowo bez order('created_at'): nie każda istniejąca tabela
      // musi zawierać kolumnę created_at.
      const { data, error } = await client
        .from('products')
        .select('*')
        .limit(5000);

      if (error) throw error;

      products = Array.isArray(data) ? data : [];
      setFilters();
      render();

      if (products.length === 0) {
        showStatus(
          'Połączenie działa, ale katalog nie zwrócił produktów. Sprawdź uprawnienia SELECT (RLS) dla tabeli products.'
        );
      } else {
        hideStatus();
      }
    } catch (error) {
      console.error('TRIPL PARTS — błąd ładowania katalogu:', error);

      products = [];
      render();

      const details = error?.message
        ? ` Szczegóły: ${error.message}`
        : '';

      showStatus(
        `Nie udało się pobrać katalogu z Supabase.${details}`,
        true
      );
    }
  }

  if (searchInput) searchInput.addEventListener('input', render);
  if (categoryFilter) categoryFilter.addEventListener('change', render);
  if (makeFilter) makeFilter.addEventListener('change', render);

  const whatsappButton = $('whatsapp-cta');
  if (whatsappButton) {
    const number = getWhatsAppNumber();
    whatsappButton.href = number ? `https://wa.me/${number}` : 'https://wa.me/';
    whatsappButton.target = '_blank';
    whatsappButton.rel = 'noopener noreferrer';
  }

  const phoneButton = $('phone-cta');
  if (phoneButton) {
    const phone = String(cfg.PHONE_NUMBER || '').replace(/[^\d+]/g, '');
    phoneButton.href = phone ? `tel:${phone}` : '#';
  }

  loadProducts();
})();
