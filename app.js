(() => {
  const cfg = window.APP_CONFIG || {};
  const CONTACT_PHONE = "+48726579717";
  const CONTACT_WHATSAPP = "48726579717";
  const CONTACT_EMAIL = "triplparts@gmail.com";

  const $ = id => document.getElementById(id);
  const grid = $("product-grid");
  if (!grid) return;

  const configured =
    cfg.SUPABASE_URL &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

  const client = configured && window.supabase
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      )
    : null;

  const demo = [
    {
      id: "demo1",
      name: "Lampa przednia lewa",
      category: "Oświetlenie",
      make: "BMW",
      model: "Seria 3 E90",
      years: "2005–2011",
      oem: "63117161649",
      price: 180,
      status: "available",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "",
      gallery_urls: [],
      vehicle: null
    },
    {
      id: "demo2",
      name: "Zderzak przedni",
      category: "Karoseria",
      make: "Volkswagen",
      model: "Golf VI",
      years: "2008–2012",
      oem: "5K0807217",
      price: 350,
      status: "available",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "",
      gallery_urls: [],
      vehicle: null
    },
    {
      id: "demo3",
      name: "Sterownik silnika ECU",
      category: "Elektronika",
      make: "Audi",
      model: "A4 B8",
      years: "2008–2015",
      oem: "03L906018AQ",
      price: 260,
      status: "reserved",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "",
      gallery_urls: [],
      vehicle: null
    },
    {
      id: "demo4",
      name: "Skrzynia biegów",
      category: "Skrzynie biegów",
      make: "Opel",
      model: "Astra J",
      years: "2009–2015",
      oem: "M32",
      price: 950,
      status: "available",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "",
      gallery_urls: [],
      vehicle: null
    }
  ];

  let products = [];
  let lastFocusedElement = null;
  let activeGalleryIndex = 0;
  let activeGalleryUrls = [];

  const placeholder =
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#edf0ef"/><text x="320" y="220" text-anchor="middle" font-family="Arial" font-size="24" fill="#7d898a">ARVORN AUTO PARTS</text></svg>'
    )}`;

  const money = n =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 2
    }).format(Number(n) || 0);

  const statusText = s => ({
    available: "Dostępna",
    reserved: "Zarezerwowana",
    sold: "Sprzedana"
  }[s] || "Dostępna");

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function galleryFor(p) {
    let urls = p?.gallery_urls;

    if (typeof urls === "string") {
      try {
        urls = JSON.parse(urls);
      } catch (_) {
        urls = [];
      }
    }

    if (!Array.isArray(urls)) urls = [];

    urls = urls.filter(
      url => typeof url === "string" && url.trim()
    );

    if (p?.image_url && !urls.includes(p.image_url)) {
      urls.unshift(p.image_url);
    }

    return [...new Set(urls)].slice(0, 20);
  }

  function contactUrl(p) {
    const number = CONTACT_WHATSAPP;
    const v = p.vehicle || {};

    const msg =
      `Dzień dobry, proszę o informację o dostępności części: ${p.name || ""}` +
      `${p.make ? " | " + p.make : ""}` +
      `${p.model ? " " + p.model : ""}` +
      `${p.oem ? " | OEM: " + p.oem : ""}` +
      `${v.dismantling_number ? " | Numer rozbiórkowy: " + v.dismantling_number : ""}` +
      `${p.price != null ? " | Cena: " + money(p.price) : ""}.`;

    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  }

  function setFilters() {
    const categories = [
      ...new Set(products.map(p => p.category).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, "pl"));

    const makes = [
      ...new Set(products.map(p => p.make).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, "pl"));

    const cat = $("category-filter");
    const make = $("make-filter");

    const oldCat = cat.value;
    const oldMake = make.value;

    cat.innerHTML =
      '<option value="">Wszystkie kategorie</option>' +
      categories.map(v =>
        `<option value="${esc(v)}">${esc(v)}</option>`
      ).join("");

    make.innerHTML =
      '<option value="">Wszystkie marki</option>' +
      makes.map(v =>
        `<option value="${esc(v)}">${esc(v)}</option>`
      ).join("");

    cat.value = oldCat;
    make.value = oldMake;
  }

  function vehicleDetailsMarkup(v) {
    if (!v) {
      return `
        <section class="product-vehicle">
          <h3>Dane samochodu</h3>
          <p>Brak przypisanych danych samochodu.</p>
        </section>`;
    }

    const fields = [
      ["Marka", v.make],
      ["Model", v.model],
      ["Rok produkcji", v.year],
      ["Silnik", v.engine],
      ["VIN", v.vin],
      ["Paliwo", v.fuel],
      ["Skrzynia biegów", v.transmission],
      ["Napęd", v.drivetrain],
      ["Strona kierownicy", v.steering_side],
      ["Uwagi", v.notes]
    ];

    const rows = fields
      .filter(([, value]) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      )
      .map(([label, value]) => `
        <div class="vehicle-detail-row">
          <span>${esc(label)}</span>
          <strong>${esc(value)}</strong>
        </div>`
      ).join("");

    return `
      <section class="product-vehicle">
        <h3>Dane samochodu</h3>
        <div class="vehicle-number">
          Numer rozbiórkowy:
          <strong>${esc(v.dismantling_number || "—")}</strong>
        </div>
        <div class="vehicle-detail-list">
          ${rows || "<p>Brak dodatkowych danych.</p>"}
        </div>
      </section>`;
  }

  function ensureModal() {
    let modal = $("product-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "product-modal";
      modal.className = "product-modal";
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");

      modal.innerHTML = `
        <div class="product-modal-dialog"
             role="dialog"
             aria-modal="true"
             aria-labelledby="modal-product-name">
          <div class="product-modal-topbar">
            <button type="button"
                    id="product-modal-close"
                    class="product-modal-close"
                    aria-label="Zamknij">×</button>
          </div>
          <div id="product-modal-content"
               class="product-modal-content"></div>
        </div>`;

      document.body.appendChild(modal);
    }

    const dialog = modal.querySelector(".product-modal-dialog");
    const topbar = modal.querySelector(".product-modal-topbar");
    const close = $("product-modal-close");
    const content = $("product-modal-content");

    Object.assign(modal.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483000",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
      overflow: "hidden",
      boxSizing: "border-box"
    });

    Object.assign(dialog.style, {
      position: "relative",
      width: "100%",
      maxWidth: "760px",
      height: "100%",
      maxHeight: "100%",
      overflowY: "auto",
      overscrollBehavior: "contain",
      WebkitOverflowScrolling: "touch",
      background: "#fff",
      color: "#202925",
      borderRadius: "0",
      boxSizing: "border-box"
    });

    Object.assign(topbar.style, {
      position: "sticky",
      top: "0",
      zIndex: "100",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
      height: "58px",
      minHeight: "58px",
      padding: "8px 12px",
      background: "#fff",
      borderBottom: "1px solid #edf0ee",
      boxSizing: "border-box"
    });

    Object.assign(close.style, {
      position: "relative",
      top: "auto",
      right: "auto",
      left: "auto",
      bottom: "auto",
      float: "none",
      zIndex: "101",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 42px",
      width: "42px",
      height: "42px",
      minWidth: "42px",
      minHeight: "42px",
      margin: "0",
      padding: "0",
      border: "0",
      borderRadius: "50%",
      background: "#edf0ee",
      color: "#202925",
      fontFamily: "Arial, sans-serif",
      fontSize: "29px",
      fontWeight: "400",
      lineHeight: "1",
      cursor: "pointer",
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none"
    });

    Object.assign(content.style, {
      display: "block",
      padding: "24px",
      paddingTop: "24px",
      boxSizing: "border-box"
    });

    if (window.matchMedia("(max-width: 560px)").matches) {
      Object.assign(modal.style, {
        alignItems: "stretch",
        justifyContent: "stretch"
      });

      Object.assign(dialog.style, {
        width: "100%",
        maxWidth: "none",
        height: "100dvh",
        maxHeight: "100dvh",
        borderRadius: "0"
      });

      Object.assign(content.style, {
        padding: "16px"
      });
    }

    return modal;
  }

  function renderGallery(index) {
    if (!activeGalleryUrls.length) {
      activeGalleryUrls = [placeholder];
    }

    activeGalleryIndex =
      (index + activeGalleryUrls.length) % activeGalleryUrls.length;

    const main = $("gallery-main-image");
    if (!main) return;

    main.src = activeGalleryUrls[activeGalleryIndex];
    main.alt = `Zdjęcie ${activeGalleryIndex + 1}`;

    const counter = $("gallery-counter");
    if (counter) {
      counter.textContent =
        `${activeGalleryIndex + 1} / ${activeGalleryUrls.length}`;
    }

    const prev = $("gallery-prev");
    const next = $("gallery-next");
    const multiple = activeGalleryUrls.length > 1;

    if (prev) prev.hidden = !multiple;
    if (next) next.hidden = !multiple;

    document.querySelectorAll("[data-gallery-index]").forEach(button => {
      const selected =
        Number(button.dataset.galleryIndex) === activeGalleryIndex;

      button.style.border = selected
        ? "2px solid #1b6b48"
        : "2px solid transparent";

      button.setAttribute(
        "aria-pressed",
        selected ? "true" : "false"
      );
    });
  }

  function openProduct(p) {
    const modal = ensureModal();
    const content = $("product-modal-content");

    lastFocusedElement = document.activeElement;

    activeGalleryUrls = galleryFor(p);
    if (!activeGalleryUrls.length) {
      activeGalleryUrls = [placeholder];
    }

    activeGalleryIndex = 0;

    const thumbnails = activeGalleryUrls.length > 1
      ? `<div class="gallery-thumbnails"
              style="display:flex;gap:8px;overflow-x:auto;margin-top:10px;padding-bottom:5px">
          ${activeGalleryUrls.map((url, index) => `
            <button type="button"
                    data-gallery-index="${index}"
                    aria-label="Pokaż zdjęcie ${index + 1}"
                    aria-pressed="${index === 0 ? "true" : "false"}"
                    style="flex:0 0 64px;width:64px;height:64px;padding:2px;border:2px solid ${index === 0 ? "#1b6b48" : "transparent"};border-radius:6px;background:#f1f3f2;cursor:pointer">
              <img src="${esc(url)}"
                   alt=""
                   loading="lazy"
                   style="width:100%;height:100%;object-fit:contain">
            </button>`
          ).join("")}
        </div>`
      : "";

    content.innerHTML = `
      <div class="product-modal-main"
           style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:24px;margin-bottom:24px">
        <div class="product-gallery">
          <div style="position:relative;background:#f1f3f2;border-radius:8px;overflow:hidden">
            <img id="gallery-main-image"
                 class="product-modal-image"
                 src="${esc(activeGalleryUrls[0])}"
                 alt="${esc(p.name || "Część samochodowa")}"
                 style="display:block;width:100%;aspect-ratio:4/3;object-fit:contain">

            <button type="button"
                    id="gallery-prev"
                    aria-label="Poprzednie zdjęcie"
                    style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:50%;background:#ffffffdf;font-size:24px;cursor:pointer">‹</button>

            <button type="button"
                    id="gallery-next"
                    aria-label="Następne zdjęcie"
                    style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:50%;background:#ffffffdf;font-size:24px;cursor:pointer">›</button>

            <span id="gallery-counter"
                  style="position:absolute;right:10px;bottom:10px;padding:4px 8px;border-radius:20px;background:#202925cc;color:#fff;font-size:12px"></span>
          </div>
          ${thumbnails}
        </div>

        <div>
          <p class="product-modal-category">
            ${esc(p.category || "Części samochodowe")}
          </p>

          <h2 id="modal-product-name"
              class="product-modal-title"
              style="overflow-wrap:anywhere">
            ${esc(p.name || "Część samochodowa")}
          </h2>

          <div class="product-modal-fitment">
            ${esc(
              [p.make, p.model, p.years].filter(Boolean).join(" · ") ||
              "Zapytaj o dopasowanie"
            )}
          </div>

          ${p.oem
            ? `<div class="product-modal-oem"><b>OEM:</b> ${esc(p.oem)}</div>`
            : ""}

          <div><b>Status:</b> ${esc(statusText(p.status))}</div>
          <div class="product-modal-price">${money(p.price)}</div>

          ${p.description
            ? `<div class="product-modal-description">${esc(p.description)}</div>`
            : ""}

          <div class="product-modal-actions">
            <a class="button button-green"
               href="${esc(contactUrl(p))}"
               target="_blank"
               rel="noopener">Zapytaj przez WhatsApp ↗</a>
          </div>
        </div>
      </div>

      ${vehicleDetailsMarkup(p.vehicle || null)}
    `;

    $("gallery-prev").addEventListener(
      "click",
      () => renderGallery(activeGalleryIndex - 1)
    );

    $("gallery-next").addEventListener(
      "click",
      () => renderGallery(activeGalleryIndex + 1)
    );

    content.querySelectorAll("[data-gallery-index]").forEach(button => {
      button.addEventListener("click", () => {
        renderGallery(Number(button.dataset.galleryIndex));
      });
    });

    renderGallery(0);

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.style.setProperty("display", "flex", "important");

    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    $("product-modal-close").focus();
  }

  function closeProduct() {
    const modal = $("product-modal");
    if (!modal || modal.hidden) return;

    modal.style.setProperty("display", "none", "important");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === "function"
    ) {
      lastFocusedElement.focus();
    }
  }

  function render() {
    const term = $("search").value.trim().toLocaleLowerCase("pl");
    const category = $("category-filter").value;
    const make = $("make-filter").value;

    const filtered = products.filter(p =>
      p.status !== "sold" &&
      (!category || p.category === category) &&
      (!make || p.make === make) &&
      (
        !term ||
        [
          p.name,
          p.category,
          p.make,
          p.model,
          p.years,
          p.oem,
          p.description,
          p.vehicle?.dismantling_number,
          p.vehicle?.vin,
          p.vehicle?.engine
        ].some(v =>
          String(v || "").toLocaleLowerCase("pl").includes(term)
        )
      )
    );

    grid.innerHTML = "";

    filtered.forEach(p => {
      const el = $("product-template").content.cloneNode(true);
      const card = el.querySelector(".product-card");
      const img = el.querySelector(".product-image");
      const gallery = galleryFor(p);

      img.src = gallery[0] || placeholder;
      img.alt = p.name || "Część samochodowa";

      const badge = el.querySelector(".stock-badge");
      badge.textContent =
        p.status === "reserved"
          ? "Zapytaj o dostępność"
          : statusText(p.status);

      badge.classList.add(p.status || "available");

      el.querySelector(".product-category").textContent =
        p.category || "Części samochodowe";

      el.querySelector(".product-name").textContent = p.name || "";

      el.querySelector(".product-fitment").textContent =
        [p.make, p.model, p.years].filter(Boolean).join(" · ") ||
        "Zapytaj o dopasowanie";

      el.querySelector(".product-oem").textContent =
        p.oem ? "OEM: " + p.oem : "";

      el.querySelector(".product-price").textContent = money(p.price);

      el.querySelector(".product-details-button")
        .addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          openProduct(p);
        });

      const contact = el.querySelector(".product-contact");
      contact.href = contactUrl(p);
      contact.addEventListener("click", e => e.stopPropagation());

      card.addEventListener("click", e => {
        if (!e.target.closest("a, button")) {
          openProduct(p);
        }
      });

      card.setAttribute("aria-label", p.name || "Część samochodowa");
      grid.appendChild(el);
    });

    $("results-count").textContent =
      `${filtered.length} ${
        filtered.length === 1
          ? "produkt"
          : filtered.length < 5
            ? "produkty"
            : "produktów"
      }`;

    $("empty-state").hidden = filtered.length !== 0;
  }

  async function load() {
    if (!client) {
      products = demo;
      setFilters();
      render();

      $("catalog-status").hidden = false;
      $("catalog-status").textContent =
        "Tryb demonstracyjny: widzisz przykładowe produkty. Sprawdź konfigurację Supabase.";

      return;
    }

    try {
      const { data, error } = await client
        .from("products")
        .select("*, vehicle:vehicles(*)")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) throw error;

      products = data || [];
      setFilters();
      render();

      $("catalog-status").hidden = products.length > 0;

      if (!products.length) {
        $("catalog-status").textContent =
          "Katalog jest jeszcze pusty. Dodaj pierwsze części w panelu administratora.";
      }
    } catch (e) {
      console.error("ARVORN catalog error:", e);

      products = [];
      render();

      $("catalog-status").hidden = false;
      $("catalog-status").textContent =
        "Nie udało się pobrać katalogu. Sprawdź konfigurację Supabase.";
    }
  }

  ["search", "category-filter", "make-filter"].forEach(id => {
    $(id).addEventListener(
      id === "search" ? "input" : "change",
      render
    );
  });

  ensureModal();

  $("product-modal-close").addEventListener("click", closeProduct);

  $("product-modal").addEventListener("click", e => {
    if (e.target === $("product-modal")) {
      closeProduct();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeProduct();

    if (!$("product-modal").hidden && e.key === "ArrowRight") {
      renderGallery(activeGalleryIndex + 1);
    }

    if (!$("product-modal").hidden && e.key === "ArrowLeft") {
      renderGallery(activeGalleryIndex - 1);
    }
  });

  // WhatsApp — główny numer kontaktowy
  const w = $("whatsapp-cta");
  if (w) {
    w.href = `https://wa.me/${CONTACT_WHATSAPP}`;
    w.target = "_blank";
    w.rel = "noopener";
  }

  // Telefon
  const ph = $("phone-cta");
  if (ph) {
    ph.href = `tel:${CONTACT_PHONE}`;
  }

  // E-mail
  const em = $("email-cta");
  if (em) {
    em.href = `mailto:${CONTACT_EMAIL}`;
  }

  // Kontakty w nagłówku
  const headerWhatsApp = document.querySelector(".header-whatsapp");
  if (headerWhatsApp) {
    headerWhatsApp.href = `https://wa.me/${CONTACT_WHATSAPP}`;
    headerWhatsApp.target = "_blank";
    headerWhatsApp.rel = "noopener";
  }

  const headerPhone = document.querySelector(".header-phone");
  if (headerPhone) {
    headerPhone.href = `tel:${CONTACT_PHONE}`;
  }

  load();
})();