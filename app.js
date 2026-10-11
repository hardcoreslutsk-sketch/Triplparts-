(() => {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);
  const grid = $('product-grid');

  if (!grid) return;

  const statusEl = $('catalog-status');
  const countEl = $('results-count');
  const emptyEl = $('empty-state');
  const template = $('product-template');

  let products = [];
  let client = null;
  let contactDialog = null;

  const configured =
    typeof cfg.SUPABASE_URL === 'string' &&
    cfg.SUPABASE_URL.startsWith('https://') &&
    typeof cfg.SUPABASE_ANON_KEY === 'string' &&
    cfg.SUPABASE_ANON_KEY.length > 20;

  if (configured && window.supabase) {
    client = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  const placeholder =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
        width="640" height="440" viewBox="0 0 640 440">
        <rect width="640" height="440" fill="#edf0ef"/>
        <text x="320" y="210" text-anchor="middle"
          font-family="Arial" font-size="28"
          font-weight="bold" fill="#26332f">TRIPL PARTS</text>
        <text x="320" y="250" text-anchor="middle"
          font-family="Arial" font-size="16"
          fill="#68736e">USED AUTO PARTS</text>
      </svg>
    `);

  const money = value =>
    new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(Number(value) || 0);

  const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const statusText = status => ({
    available: 'Dostępna',
    reserved: 'Zarezerwowana',
    sold: 'Sprzedana'
  }[status] || 'Dostępna');

  function setStatus(message, visible = true) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = !visible;
  }

  function contactNumber() {
    return String(cfg.WHATSAPP_NUMBER || '48726579717')
      .replace(/\D/g, '');
  }

  function phoneNumber() {
    return String(cfg.PHONE_NUMBER || '+48726579717')
      .trim();
  }

  function productMessage(product) {
    const vehicle = [
      product.make,
      product.model,
      product.years
    ].filter(Boolean).join(' ');

    return [
      'Dzień dobry! Proszę o informację o części:',
      `Nazwa: ${product.name || ''}`,
      vehicle ? `Samochód: ${vehicle}` : '',
      product.oem ? `Numer OEM: ${product.oem}` : '',
      product.price != null ? `Cena: ${money(product.price)}` : '',
      product.dismantling_number
        ? `Numer rozbieralni: ${product.dismantling_number}`
        : ''
    ].filter(Boolean).join('\n');
  }

  function openContact(product) {
    closeContact();

    const message = productMessage(product);
    const whatsappUrl =
      `https://wa.me/${contactNumber()}?text=${encodeURIComponent(message)}`;
    const emailUrl =
      `mailto:triplparts@gmail.com?subject=${encodeURIComponent(
        'Zapytanie o część: ' + (product.name || '')
      )}&body=${encodeURIComponent(message)}`;

    contactDialog = document.createElement('div');
    contactDialog.className = 'tripl-contact-overlay';
    contactDialog.setAttribute('role', 'presentation');

    contactDialog.innerHTML = `
      <section class="tripl-contact-dialog"
        role="dialog" aria-modal="true"
        aria-labelledby="tripl-contact-title">
        <button type="button" class="tripl-contact-close"
          aria-label="Zamknij">×</button>
        <p class="tripl-contact-eyebrow">TRIPL PARTS</p>
        <h2 id="tripl-contact-title">Zapytaj o część</h2>
        <p class="tripl-contact-product">${esc(product.name || '')}</p>
        ${product.oem
          ? `<p class="tripl-contact-oem">OEM: ${esc(product.oem)}</p>`
          : ''}
        <a class="tripl-contact-option tripl-whatsapp"
          href="${esc(whatsappUrl)}" target="_blank" rel="noopener">
          WhatsApp <span>↗</span>
        </a>
        <a class="tripl-contact-option"
          href="tel:${esc(phoneNumber())}">
          Zadzwoń <span>↗</span>
        </a>
        <a class="tripl-contact-option"
          href="${esc(emailUrl)}">
          E-mail <span>↗</span>
        </a>
      </section>
    `;

    if (!document.getElementById('tripl-contact-styles')) {
      const style = document.createElement('style');
      style.id = 'tripl-contact-styles';
      style.textContent = `
        .tripl-contact-overlay {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          padding: 18px; background: rgba(8,12,11,.72);
        }
        .tripl-contact-dialog {
          position: relative; width: 100%; max-width: 390px;
          box-sizing: border-box; padding: 28px;
          background: #fff; color: #17201c; border-radius: 16px;
          box-shadow: 0 20px 70px rgba(0,0,0,.28);
          font-family: Arial, sans-serif;
        }
        .tripl-contact-close {
          position: absolute; top: 10px; right: 14px;
          border: 0; background: transparent; color: #17201c;
          font-size: 30px; cursor: pointer;
        }
        .tripl-contact-eyebrow {
          margin: 0 0 8px; font-size: 11px;
          letter-spacing: 2px; font-weight: 800;
        }
        .tripl-contact-dialog h2 {
          margin: 0 0 12px; font-size: 25px;
        }
        .tripl-contact-product {
          margin: 0 0 6px; font-weight: 700;
        }
        .tripl-contact-oem {
          margin: 0 0 18px; color: #606b65; font-size: 13px;
        }
        .tripl-contact-option {
          display: flex; justify-content: space-between;
          align-items: center; box-sizing: border-box;
          width: 100%; margin-top: 10px; padding: 14px 16px;
          border: 1px solid #d9dfdb; border-radius: 9px;
          color: #17201c; text-decoration: none;
          font-size: 15px; font-weight: 700;
        }
        .tripl-contact-option.tripl-whatsapp {
          background: #183d2b; border-color: #183d2b; color: #fff;
        }
        .tripl-contact-option:focus-visible,
        .tripl-contact-close:focus-visible {
          outline: 3px solid #7ab99a; outline-offset: 3px;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(contactDialog);

    contactDialog.querySelector('.tripl-contact-close')
      .addEventListener('click', closeContact);

    contactDialog.addEventListener('click', event => {
      if (event.target === contactDialog) closeContact();
    });

    document.addEventListener('keydown', handleContactKey);
    contactDialog.querySelector('.tripl-contact-close').focus();
  }

  function handleContactKey(event) {
    if (event.key === 'Escape') closeContact();
  }

  function closeContact() {
    if (contactDialog) {
      contactDialog.remove();
      contactDialog = null;
    }
    document.removeEventListener('keydown', handleContactKey);
  }

  function setFilters() {
    const categorySelect = $('category-filter');
    const makeSelect = $('make-filter');

    if (!categorySelect || !makeSelect) return;

    const oldCategory = categorySelect.value;
    const oldMake = makeSelect.value;

    const categories = [...new Set(
      products.map(product => product.category).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pl'));

    const makes = [...new Set(
      products.map(product => product.make).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pl'));

    categorySelect.innerHTML =
      '<option value="">Wszystkie kategorie</option>' +
      categories.map(value =>
        `<option value="${esc(value)}">${esc(value)}</option>`
      ).join('');

    makeSelect.innerHTML =
      '<option value="">Wszystkie marki</option>' +
      makes.map(value =>
        `<option value="${esc(value)}">${esc(value)}</option>`
      ).join('');

    categorySelect.value = oldCategory;
    makeSelect.value = oldMake;
  }

  function render() {
    if (!template || !template.content) {
      setStatus('Brakuje szablonu kart produktów w index.html.');
      return;
    }

    const searchInput = $('search');
    const categoryInput = $('category-filter');
    const makeInput = $('make-filter');

    const term = (searchInput?.value || '').trim().toLocaleLowerCase('pl');
    const category = categoryInput?.value || '';
    const make = makeInput?.value || '';

    const filtered = products.filter(product => {
      if (product.status === 'sold') return false;
      if (category && product.category !== category) return false;
      if (make && product.make !== make) return false;

      if (!term) return true;

      return [
        product.name,
        product.category,
        product.make,
        product.model,
        product.years,
        product.oem,
        product.description,
        product.dismantling_number
      ].some(value =>
        String(value || '').toLocaleLowerCase('pl').includes(term)
      );
    });

    grid.replaceChildren();

    filtered.forEach(product => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.product-card');
      const img = fragment.querySelector('.product-image');
      const badge = fragment.querySelector('.stock-badge');
      const contact = fragment.querySelector('.product-contact');

      if (img) {
        img.src = product.image_url || placeholder;
        img.alt = product.name || 'Część samochodowa';
        img.loading = 'lazy';
        img.onerror = () => {
          img.onerror = null;
          img.src = placeholder;
        };
      }

      if (badge) {
        badge.textContent = statusText(product.status);
        badge.classList.add(product.status || 'available');
        if (product.status === 'reserved') {
          badge.textContent = 'Zapytaj o dostępność';
        }
      }

      const categoryEl = fragment.querySelector('.product-category');
      const nameEl = fragment.querySelector('.product-name');
      const fitmentEl = fragment.querySelector('.product-fitment');
      const oemEl = fragment.querySelector('.product-oem');
      const priceEl = fragment.querySelector('.product-price');

      if (categoryEl) {
        categoryEl.textContent = product.category || 'Części samochodowe';
      }
      if (nameEl) nameEl.textContent = product.name || 'Część samochodowa';

      if (fitmentEl) {
        fitmentEl.textContent = [
          product.make,
          product.model,
          product.years
        ].filter(Boolean).join(' · ') || 'Zapytaj o dopasowanie';
      }

      if (oemEl) {
        oemEl.textContent = product.oem ? `OEM: ${product.oem}` : '';
      }

      if (priceEl) priceEl.textContent = money(product.price);

      if (contact) {
        contact.href = '#kontakt';
        contact.removeAttribute('target');
        contact.addEventListener('click', event => {
          event.preventDefault();
          openContact(product);
        });
        contact.textContent = 'Zapytaj o część';
      }

      if (card) {
        card.setAttribute('aria-label', product.name || 'Część samochodowa');
      }

      grid.appendChild(fragment);
    });

    if (countEl) {
      countEl.textContent =
        `${filtered.length} ${filtered.length === 1
          ? 'produkt'
          : filtered.length < 5 ? 'produkty' : 'produktów'}`;
    }

    if (emptyEl) emptyEl.hidden = filtered.length !== 0;
  }

  async function load() {
    if (!client) {
      products = [];
      render();
      setStatus(
        'Katalog nie jest połączony z Supabase. Sprawdź ustawienia w config.js.'
      );
      return;
    }

    setStatus('Ładowanie katalogu…');

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

      if (products.length === 0) {
        setStatus('Katalog jest pusty. Dodaj części w panelu administratora.');
      } else {
        setStatus('', false);
      }
    } catch (error) {
      console.error('TRIPL PARTS: błąd pobierania katalogu', error);
      products = [];
      render();
      setStatus(
        'Nie udało się pobrać części. Sprawdź połączenie i uprawnienia Supabase.'
      );
    }
  }

  if ($('search')) $('search').addEventListener('input', render);
  if ($('category-filter')) {
    $('category-filter').addEventListener('change', render);
  }
  if ($('make-filter')) $('make-filter').addEventListener('change', render);

  const whatsapp = $('whatsapp-cta');
  if (whatsapp) {
    whatsapp.href = `https://wa.me/${contactNumber()}`;
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener';
  }

  const phone = $('phone-cta');
  if (phone) phone.href = `tel:${phoneNumber()}`;

  const email = $('email-cta');
  if (email) email.href = 'mailto:triplparts@gmail.com';

  const contactToggle = $('contact-toggle');
  const contactOptions = $('contact-options');

  if (contactToggle && contactOptions) {
    contactToggle.addEventListener('click', () => {
      const opening = contactOptions.hidden;
      contactOptions.hidden = !opening;
      contactToggle.setAttribute('aria-expanded', String(opening));
    });

    document.addEventListener('click', event => {
      if (
        !contactOptions.hidden &&
        !contactOptions.contains(event.target) &&
        !contactToggle.contains(event.target)
      ) {
        contactOptions.hidden = true;
        contactToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        contactOptions.hidden = true;
        contactToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  load();
})();