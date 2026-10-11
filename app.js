(() => {
  const cfg = window.APP_CONFIG || {};
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
      id: "demo1", name: "Lampa przednia lewa",
      category: "Oświetlenie", make: "BMW",
      model: "Seria 3 E90", years: "2005–2011",
      oem: "63117161649", price: 180,
      status: "available",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "", vehicle: null
    },
    {
      id: "demo2", name: "Zderzak przedni",
      category: "Karoseria", make: "Volkswagen",
      model: "Golf VI", years: "2008–2012",
      oem: "5K0807217", price: 350,
      status: "available",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "", vehicle: null
    },
    {
      id: "demo3", name: "Sterownik silnika ECU",
      category: "Elektronika", make: "Audi",
      model: "A4 B8", years: "2008–2015",
      oem: "03L906018AQ", price: 260,
      status: "reserved",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "", vehicle: null
    },
    {
      id: "demo4", name: "Skrzynia biegów",
      category: "Skrzynie biegów", make: "Opel",
      model: "Astra J", years: "2009–2015",
      oem: "M32", price: 950,
      status: "available",
      description: "Przykładowy produkt demonstracyjny.",
      image_url: "", vehicle: null
    }
  ];

  let products = [];
  let lastFocusedElement = null;

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

  function contactUrl(p) {
    const number = (cfg.WHATSAPP_NUMBER || "").replace(/\D/g, "");
    const v = p.vehicle || {};

    const msg =
      `Dzień dobry, proszę o informację o dostępności części: ${p.name || ""}` +
      `${p.make ? " | " + p.make : ""}` +
      `${p.model ? " " + p.model : ""}` +
      `${p.oem ? " | OEM: " + p.oem : ""}` +
      `${v.dismantling_number ? " | Numer rozbiórkowy: " + v.dismantling_number : ""}` +
      `${p.price != null ? " | Cena: " + money(p.price) : ""}.`;

    return number
      ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
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
        </section>
      `;
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
        </div>
      `).join("");

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
      </section>
    `;
  }

  function ensureModal() {
    let modal = $("product-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "product-modal";
      modal.innerHTML = `
        <div class="product-modal-dialog" role="dialog" aria-modal="true">
          <button type="button" id="product-modal-close" aria-label="Zamknij">×</button>
          <div id="product-modal-content"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    Object.assign(modal.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      padding: "18px",
      background: "rgba(15,22,19,.76)",
      overflowY: "auto",
      boxSizing: "border-box"
    });

    const dialog = modal.querySelector(".product-modal-dialog");

    Object.assign(dialog.style, {
      position: "relative",
      width: "100%",
      maxWidth: "760px",
      maxHeight: "calc(100vh - 36px)",
      overflowY: "auto",
      background: "#fff",
      color: "#202925",
      borderRadius: "12px",
      boxShadow: "0 20px 70px rgba(0,0,0,.3)",
      boxSizing: "border-box"
    });

    // Исправленный крестик: абсолютное позиционирование
    // внутри окна, без отрицательных отступов и float.
    const close = $("product-modal-close");

    Object.assign(close.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      float: "none",
      zIndex: "10",
      margin: "0",
      padding: "0",
      width: "40px",
      height: "40px",
      minWidth: "40px",
      minHeight: "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "0",
      borderRadius: "50%",
      background: "#edf0ee",
      color: "#202925",
      fontSize: "28px",
      fontWeight: "400",
      lineHeight: "1",
      cursor: "pointer",
      boxSizing: "border-box",
      appearance: "none",
      WebkitAppearance: "none"
    });

    const content = $("product-modal-content");

    Object.assign(content.style, {
      padding: "24px",
      paddingTop: "58px",
      boxSizing: "border-box"
    });

    return modal;
  }

  function openProduct(p) {
    const modal = ensureModal();
    const content = $("product-modal-content");
    lastFocusedElement = document.activeElement;

    content.innerHTML = `
      <div class="product-modal-main"
        style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:24px;margin-bottom:24px">
        <div>
          <img
            class="product-modal-image"
            src="${esc(p.image_url || placeholder)}"
            alt="${esc(p.name || "Część samochodowa")}"
            style="width:100%;aspect-ratio:4/3;object-fit:contain;background:#f1f3f2;border-radius:8px"
          >
        </div>

        <div>
          <p style="color:#66716b;font-size:12px;text-transform:uppercase">
            ${esc(p.category || "Części samochodowe")}
          </p>

          <h2 id="modal-product-name"
            style="font-size:28px;line-height:1.2;margin-right:35px">
            ${esc(p.name || "Część samochodowa")}
          </h2>

          <p>
            ${esc([p.make, p.model, p.years].filter(Boolean).join(" · ") || "Zapytaj o dopasowanie")}
          </p>

          ${p.oem ? `<p><strong>OEM:</strong> ${esc(p.oem)}</p>` : ""}

          <p><strong>Status:</strong> ${esc(statusText(p.status))}</p>

          <p style="font-size:26px;font-weight:700">${money(p.price)}</p>

          ${p.description
            ? `<p style="white-space:pre-wrap;line-height:1.6">${esc(p.description)}</p>`
            : ""}

          <a class="button button-green"
            href="${esc(contactUrl(p))}"
            target="_blank"
            rel="noopener"
            style="display:inline-block;margin-top:12px;text-decoration:none">
            Zapytaj przez WhatsApp ↗
          </a>
        </div>
      </div>

      ${vehicleDetailsMarkup(p.vehicle || null)}
    `;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.style.setProperty("display", "flex", "important");
    document.body.style.overflow = "hidden";

    $("product-modal-close").focus();
  }

  function closeProduct() {
    const modal = $("product-modal");
    if (!modal) return;

    modal.style.setProperty("display", "none", "important");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (lastFocusedElement && lastFocusedElement.focus) {
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
      (!term || [
        p.name, p.category, p.make, p.model, p.years,
        p.oem, p.description,
        p.vehicle?.dismantling_number,
        p.vehicle?.vin,
        p.vehicle?.engine
      ].some(v =>
        String(v || "").toLocaleLowerCase("pl").includes(term)
      ))
    );

    grid.innerHTML = "";

    filtered.forEach(p => {
      const el = $("product-template").content.cloneNode(true);
      const card = el.querySelector(".product-card");
      const img = el.querySelector(".product-image");

      img.src = p.image_url || placeholder;
      img.alt = p.name || "Część samochodowa";

      const badge = el.querySelector(".stock-badge");
      badge.textContent = p.status === "reserved"
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

      el.querySelector(".product-details-button").addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        openProduct(p);
      });

      const contact = el.querySelector(".product-contact");
      contact.href = contactUrl(p);
      contact.addEventListener("click", e => e.stopPropagation());

      card.addEventListener("click", e => {
        if (!e.target.closest("a, button")) openProduct(p);
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
    $(id).addEventListener(id === "search" ? "input" : "change", render);
  });

  ensureModal();

  $("product-modal-close").addEventListener("click", closeProduct);

  $("product-modal").addEventListener("click", e => {
    if (e.target === $("product-modal")) closeProduct();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeProduct();
  });

  const w = $("whatsapp-cta");

  w.href =
    cfg.WHATSAPP_NUMBER &&
    !cfg.WHATSAPP_NUMBER.includes("123456789")
      ? `https://wa.me/${cfg.WHATSAPP_NUMBER.replace(/\D/g, "")}`
      : "https://wa.me/";

  w.target = "_blank";
  w.rel = "noopener";

  const ph = $("phone-cta");

  ph.href =
    cfg.PHONE_NUMBER &&
    !cfg.PHONE_NUMBER.includes("123 456 789")
      ? `tel:${cfg.PHONE_NUMBER.replace(/[^+\d]/g, "")}`
      : "#";

  if (ph.href === "#") {
    ph.addEventListener("click", e => {
      e.preventDefault();
      alert("Dodaj numer telefonu w pliku config.js.");
    });
  }

  load();
})();