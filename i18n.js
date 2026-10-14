window.TPi18n = (() => {
  const dict = {
    pl: {
      "nav.catalog":"Katalog","nav.contact":"Kontakt","nav.admin":"Panel administratora","nav.cart":"Koszyk",
      "hero.eyebrow":"UŻYWANE CZĘŚCI • Z ANGLII","hero.title1":"Części samochodowe.","hero.title2":"Sprawdzone i gotowe.","hero.text":"Używałe części z rozbieranych samochodów. Wyszukaj po marce, modelu, numerze OEM lub numerze rozbieralni.","hero.btn":"Przeglądaj katalog",
      "catalog.eyebrow":"NASZA OFERTA","catalog.title":"Katalog części","catalog.sub":"Znajdź część dopasowaną do swojego samochodu.","catalog.count":"DOSTĘPNE CZĘŚCI","catalog.search":"Wyszukiwanie","catalog.searchPh":"Nazwa, OEM, numer rozbieralni…","catalog.make":"Marka","catalog.category":"Kategoria","catalog.allMakes":"Wszystkie marki","catalog.allCategories":"Wszystkie kategorie","catalog.sort":"Sortowanie","catalog.sortNew":"Najnowsze","catalog.sortPriceAsc":"Cena: od najniższej","catalog.sortPriceDesc":"Cena: od najwyższej","catalog.empty":"Nie znaleziono części","catalog.emptyHint":"Spróbuj zmienić wyszukiwanie lub wybrać inną kategorię.","catalog.loading":"Ładowanie katalogu…","catalog.empty2":"Katalog jest jeszcze pusty.",
      "card.buy":"Kup","card.ask":"Zapytaj","card.oem":"OEM",
      "status.available":"Dostępna","status.reserved":"Zarezerwowana","status.sold":"Sprzedana","status.hidden":"Ukryta",
      "contact.eyebrow":"MASZ PYTANIA?","contact.title":"Szukasz konkretnej części?","contact.text":"Skontaktuj się z nami. Podaj markę, model samochodu oraz numer OEM lub numer rozbieralni.",
      "footer.tagline":"Używane części samochodowe",
      "product.bcCatalog":"Katalog","product.loading":"Ładowanie…","product.notFound":"Nie znaleziono części","product.notFoundHint":"Ten produkt został usunięty albo link jest nieprawidłowy.","product.back":"Wróć do katalogu","product.partInfo":"Informacje o części","product.vehicle":"Samochód dawca","product.shareBtn":"Skopiuj link do tej części","product.linkCopied":"Link skopiowany","product.added":"Dodano do koszyka","product.viewCart":"Zobacz koszyk","product.close":"Zamknij","product.article":"Artykuł","product.condition":"Stan","product.oem":"Numer OEM","product.license":"Numer licencyjny","product.status":"Status","product.wa":"WhatsApp","product.call":"Zadzwoń","product.email":"E-mail","product.buy":"Kup",
      "veh.dism":"Nr rozbieralni","veh.make":"Marka","veh.model":"Model","veh.year":"Rok","veh.vin":"VIN","veh.engine":"Silnik","veh.gearbox":"Skrzynia","veh.drive":"Napęd","veh.body":"Nadwozie","veh.color":"Kolor","veh.steering":"Kierownica","veh.mileage":"Przebieg","veh.notes":"Uwagi",
      "checkout.title":"Zamówienie","checkout.lead":"Wypełnij dane kontaktowe.","checkout.name":"Imię i nazwisko","checkout.namePh":"np. Jan Kowalski","checkout.phone":"Telefon","checkout.phonePh":"np. +48 500 100 200","checkout.email":"E-mail","checkout.emailPh":"np. jan@example.com","checkout.address":"Adres dostawy","checkout.addressPh":"Ulica, numer, kod pocztowy, miasto, kraj","checkout.notes":"Uwagi (opcjonalnie)","checkout.notesPh":"Dodatkowe informacje do zamówienia","checkout.hint":"Podaj telefon lub e-mail — co najmniej jeden kontakt jest wymagany.","checkout.submit":"Złóż zamówienie","checkout.empty":"Twój koszyk jest pusty","checkout.emptyHint":"Dodaj części z katalogu.","checkout.thanks":"Dziękujemy!","checkout.thanksText":"Twoje zamówienie zostało wysłane.","checkout.orderNum":"Numer zamówienia:","checkout.yourCart":"Twój koszyk","checkout.partsValue":"Wartość części","checkout.shipping":"Dostawa","checkout.shippingTbd":"do ustalenia","checkout.grand":"Do zapłaty z dostawą","checkout.grandTbd":"ustalimy po kontakcie","checkout.shippingNote":"Koszt dostawy ustalamy indywidualnie.","checkout.clearCart":"Wyczyść koszyk","checkout.sending":"Wysyłanie…","checkout.backToCatalog":"Wróć do katalogu","checkout.errName":"Podaj imię i nazwisko.","checkout.errAddress":"Podaj adres dostawy.","checkout.errContact":"Podaj telefon lub e-mail.","checkout.errEmpty":"Koszyk jest pusty.","checkout.errSend":"Nie udało się wysłać zamówienia: ",
      "toast.addedCart":"Dodano do koszyka"
    },
    en: {
      "nav.catalog":"Catalog","nav.contact":"Contact","nav.admin":"Admin panel","nav.cart":"Cart",
      "hero.eyebrow":"USED PARTS • FROM UK","hero.title1":"Car parts.","hero.title2":"Checked and ready.","hero.text":"Used parts from dismantled cars. Search by make, model, OEM number or dismantling number.","hero.btn":"Browse catalog",
      "catalog.eyebrow":"OUR OFFER","catalog.title":"Parts catalog","catalog.sub":"Find a part that fits your car.","catalog.count":"AVAILABLE PARTS","catalog.search":"Search","catalog.searchPh":"Name, OEM, dismantling number…","catalog.make":"Make","catalog.category":"Category","catalog.allMakes":"All makes","catalog.allCategories":"All categories","catalog.sort":"Sort","catalog.sortNew":"Newest","catalog.sortPriceAsc":"Price: low to high","catalog.sortPriceDesc":"Price: high to low","catalog.empty":"No parts found","catalog.emptyHint":"Try changing your search or selecting another category.","catalog.loading":"Loading catalog…","catalog.empty2":"Catalog is still empty.",
      "card.buy":"Buy","card.ask":"Ask","card.oem":"OEM",
      "status.available":"Available","status.reserved":"Reserved","status.sold":"Sold","status.hidden":"Hidden",
      "contact.eyebrow":"QUESTIONS?","contact.title":"Looking for a specific part?","contact.text":"Get in touch. Send us the make, model and OEM number or dismantling number.",
      "footer.tagline":"Used car parts",
      "product.bcCatalog":"Catalog","product.loading":"Loading…","product.notFound":"Part not found","product.notFoundHint":"This product was removed or the link is invalid.","product.back":"Back to catalog","product.partInfo":"Part information","product.vehicle":"Donor car","product.shareBtn":"Copy link to this part","product.linkCopied":"Link copied","product.added":"Added to cart","product.viewCart":"View cart","product.close":"Close","product.article":"Article no.","product.condition":"Condition","product.oem":"OEM number","product.license":"License number","product.status":"Status","product.wa":"WhatsApp","product.call":"Call","product.email":"E-mail","product.buy":"Buy",
      "veh.dism":"Dismantling no.","veh.make":"Make","veh.model":"Model","veh.year":"Year","veh.vin":"VIN","veh.engine":"Engine","veh.gearbox":"Gearbox","veh.drive":"Drive","veh.body":"Body","veh.color":"Color","veh.steering":"Steering","veh.mileage":"Mileage","veh.notes":"Notes",
      "checkout.title":"Order","checkout.lead":"Fill in your contact details.","checkout.name":"Full name","checkout.namePh":"e.g. John Smith","checkout.phone":"Phone","checkout.phonePh":"e.g. +44 500 100 200","checkout.email":"E-mail","checkout.emailPh":"e.g. john@example.com","checkout.address":"Delivery address","checkout.addressPh":"Street, number, postal code, city, country","checkout.notes":"Notes (optional)","checkout.notesPh":"Additional information for the order","checkout.hint":"Provide phone or e-mail — at least one contact is required.","checkout.submit":"Place order","checkout.empty":"Your cart is empty","checkout.emptyHint":"Add parts from the catalog.","checkout.thanks":"Thank you!","checkout.thanksText":"Your order has been sent.","checkout.orderNum":"Order number:","checkout.yourCart":"Your cart","checkout.partsValue":"Parts value","checkout.shipping":"Shipping","checkout.shippingTbd":"to be confirmed","checkout.grand":"Total with shipping","checkout.grandTbd":"confirmed after contact","checkout.shippingNote":"Shipping cost is confirmed individually.","checkout.clearCart":"Clear cart","checkout.sending":"Sending…","checkout.backToCatalog":"Back to catalog","checkout.errName":"Enter your full name.","checkout.errAddress":"Enter the delivery address.","checkout.errContact":"Provide phone or e-mail.","checkout.errEmpty":"The cart is empty.","checkout.errSend":"Could not send the order: ",
      "toast.addedCart":"Added to cart"
    },
    pt: {
      "nav.catalog":"Catálogo","nav.contact":"Contacto","nav.admin":"Painel de administração","nav.cart":"Carrinho",
      "hero.eyebrow":"PEÇAS USADAS • DO REINO UNIDO","hero.title1":"Peças auto.","hero.title2":"Verificadas e prontas.","hero.text":"Peças usadas de carros desmontados. Pesquise por marca, modelo, número OEM ou número de desmontagem.","hero.btn":"Ver catálogo",
      "catalog.eyebrow":"A NOSSA OFERTA","catalog.title":"Catálogo de peças","catalog.sub":"Encontre uma peça compatível com o seu carro.","catalog.count":"PEÇAS DISPONÍVEIS","catalog.search":"Pesquisar","catalog.searchPh":"Nome, OEM, número de desmontagem…","catalog.make":"Marca","catalog.category":"Categoria","catalog.allMakes":"Todas as marcas","catalog.allCategories":"Todas as categorias","catalog.sort":"Ordenar","catalog.sortNew":"Mais recentes","catalog.sortPriceAsc":"Preço: do mais baixo","catalog.sortPriceDesc":"Preço: do mais alto","catalog.empty":"Nenhuma peça encontrada","catalog.emptyHint":"Tente alterar a pesquisa ou escolher outra categoria.","catalog.loading":"A carregar o catálogo…","catalog.empty2":"O catálogo ainda está vazio.",
      "card.buy":"Comprar","card.ask":"Perguntar","card.oem":"OEM",
      "status.available":"Disponível","status.reserved":"Reservada","status.sold":"Vendida","status.hidden":"Oculta",
      "contact.eyebrow":"TEM PERGUNTAS?","contact.title":"Procura uma peça específica?","contact.text":"Entre em contacto. Envie a marca, o modelo e o número OEM ou o número de desmontagem.",
      "footer.tagline":"Peças auto usadas",
      "product.bcCatalog":"Catálogo","product.loading":"A carregar…","product.notFound":"Peça não encontrada","product.notFoundHint":"Este produto foi removido ou o link é inválido.","product.back":"Voltar ao catálogo","product.partInfo":"Informações da peça","product.vehicle":"Carro doador","product.shareBtn":"Copiar link desta peça","product.linkCopied":"Link copiado","product.added":"Adicionado ao carrinho","product.viewCart":"Ver carrinho","product.close":"Fechar","product.article":"N.º de artigo","product.condition":"Estado","product.oem":"Número OEM","product.license":"Número de licença","product.status":"Estado","product.wa":"WhatsApp","product.call":"Ligar","product.email":"E-mail","product.buy":"Comprar",
      "veh.dism":"N.º desmontagem","veh.make":"Marca","veh.model":"Modelo","veh.year":"Ano","veh.vin":"VIN","veh.engine":"Motor","veh.gearbox":"Caixa","veh.drive":"Tração","veh.body":"Carroçaria","veh.color":"Cor","veh.steering":"Direção","veh.mileage":"Quilometragem","veh.notes":"Notas",
      "checkout.title":"Encomenda","checkout.lead":"Preencha os seus dados de contacto.","checkout.name":"Nome completo","checkout.namePh":"p.ex. João Silva","checkout.phone":"Telefone","checkout.phonePh":"p.ex. +351 500 100 200","checkout.email":"E-mail","checkout.emailPh":"p.ex. joao@exemplo.com","checkout.address":"Morada de entrega","checkout.addressPh":"Rua, número, código postal, cidade, país","checkout.notes":"Notas (opcional)","checkout.notesPh":"Informações adicionais para a encomenda","checkout.hint":"Forneça telefone ou e-mail — pelo menos um contacto é obrigatório.","checkout.submit":"Fazer encomenda","checkout.empty":"O seu carrinho está vazio","checkout.emptyHint":"Adicione peças do catálogo.","checkout.thanks":"Obrigado!","checkout.thanksText":"A sua encomenda foi enviada.","checkout.orderNum":"Número da encomenda:","checkout.yourCart":"O seu carrinho","checkout.partsValue":"Valor das peças","checkout.shipping":"Envio","checkout.shippingTbd":"a confirmar","checkout.grand":"Total com envio","checkout.grandTbd":"confirmado após contacto","checkout.shippingNote":"O custo de envio é confirmado individualmente.","checkout.clearCart":"Limpar carrinho","checkout.sending":"A enviar…","checkout.backToCatalog":"Voltar ao catálogo","checkout.errName":"Indique o nome completo.","checkout.errAddress":"Indique a morada de entrega.","checkout.errContact":"Forneça telefone ou e-mail.","checkout.errEmpty":"O carrinho está vazio.","checkout.errSend":"Não foi possível enviar a encomenda: ",
      "toast.addedCart":"Adicionado ao carrinho"
    }
  };

  const STORAGE_LANG = 'tp-lang';
  const STORAGE_CURRENCY = 'tp-currency';
  const LANG_LABELS = { pl: 'PL', en: 'EN', pt: 'PT' };

  let lang = 'pl';
  try { lang = localStorage.getItem(STORAGE_LANG) || 'pl'; } catch(e){}
  if (!dict[lang]) lang = 'pl';

  let currency = 'PLN';
  try { currency = localStorage.getItem(STORAGE_CURRENCY) || 'PLN'; } catch(e){}
  if (!['PLN','EUR'].includes(currency)) currency = 'PLN';

  function t(key) {
    return (dict[lang] && dict[lang][key]) || dict.pl[key] || key;
  }
  function getLang() { return lang; }
  function getCurrency() { return currency; }

  function setLang(l) {
    if (!dict[l]) return;
    lang = l;
    try { localStorage.setItem(STORAGE_LANG, l); } catch(e){}
    document.documentElement.setAttribute('lang', l);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('tp-lang-changed', { detail: { lang: l } }));
  }

  function setCurrency(c) {
    if (!['PLN','EUR'].includes(c)) return;
    currency = c;
    try { localStorage.setItem(STORAGE_CURRENCY, c); } catch(e){}
    applyTranslations();
    window.dispatchEvent(new CustomEvent('tp-currency-changed', { detail: { currency: c } }));
  }

  function formatProductPrice(product) {
    if (!product) return '—';
    if (currency === 'EUR') {
      const v = product.price_eur;
      if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—';
      return new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR', maximumFractionDigits:2 }).format(Number(v));
    }
    const pln = Number(product.price_pln);
    if (isNaN(pln)) return '—';
    return new Intl.NumberFormat('pl-PL', { style:'currency', currency:'PLN', maximumFractionDigits:2 }).format(pln);
  }

  function formatAmount(pln) {
    const n = Number(pln) || 0;
    if (currency === 'EUR') {
      return new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR', maximumFractionDigits:2 }).format(n);
    }
    return new Intl.NumberFormat('pl-PL', { style:'currency', currency:'PLN', maximumFractionDigits:2 }).format(n);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = t(key);
      if (text) el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const text = t(key);
      if (text) el.placeholder = text;
    });
    // Обновляем метку языка на кнопке
    document.querySelectorAll('[data-current-lang]').forEach(el => {
      el.textContent = LANG_LABELS[lang] || lang.toUpperCase();
    });
    // Обновляем метку валюты
    document.querySelectorAll('[data-current-currency]').forEach(el => {
      el.textContent = currency;
    });
    // Активный пункт в меню языков
    document.querySelectorAll('[data-lang-btn]').forEach(el => {
      el.classList.toggle('active', el.dataset.langBtn === lang);
    });
    // Активный пункт в меню валют
    document.querySelectorAll('[data-currency-btn]').forEach(el => {
      el.classList.toggle('active', el.dataset.currencyBtn === currency);
    });
  }

  function closeAllMenus() {
    document.querySelectorAll('[data-switcher-menu]').forEach(m => { m.hidden = true; });
    document.querySelectorAll('[data-switcher-toggle]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  function bindSwitchers() {
    // Кнопки языка в меню
    document.querySelectorAll('[data-lang-btn]').forEach(el => {
      el.addEventListener('click', () => {
        setLang(el.dataset.langBtn);
        closeAllMenus();
      });
    });
    // Кнопки валюты в меню
    document.querySelectorAll('[data-currency-btn]').forEach(el => {
      el.addEventListener('click', () => {
        setCurrency(el.dataset.currencyBtn);
        closeAllMenus();
      });
    });
    // Кнопки-переключатели (открывают меню)
    document.querySelectorAll('[data-switcher-toggle]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const type = el.dataset.switcherToggle;
        const menu = document.querySelector('[data-switcher-menu="' + type + '"]');
        if (!menu) return;
        const isOpen = !menu.hidden;
        closeAllMenus();
        if (!isOpen) {
          menu.hidden = false;
          el.setAttribute('aria-expanded', 'true');
        }
      });
    });
    // Клик вне меню закрывает
    document.addEventListener('click', closeAllMenus);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAllMenus();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('lang', lang);
    bindSwitchers();
    applyTranslations();
  });

  return { t, setLang, getLang, setCurrency, getCurrency, formatProductPrice, formatAmount, applyTranslations, closeAllMenus };
})();