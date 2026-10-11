(() => {
  const cfg = window.APP_CONFIG || {};

  const configured =
    cfg.SUPABASE_URL &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

  const $ = id => document.getElementById(id);
  const grid = $("product-grid");
  if (!grid) return;

  const client =
    configured && window.supabase
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
      vehicle: null
    }
  ];

  let products = [];
  let lastFocusedElement = null;

  const placeholder =
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440"><rect width="640" height="440" fill="#edf0ef"/><g fill="none" stroke="#b6c0c0" stroke-width="5"><path d="M170 280h300l-35-80H235z"/><circle cx="235" cy="300" r="32"/><circle cx="405" cy="300" r="32"/><path d="M260 205l28-38h90l40 38"/></g><text x="320" y="375" font-family="Arial" font-size="18" fill="#7d898a" text-anchor="middle">ARVORN AUTO PARTS</text></svg>'
    )}`;

  const money = n =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 2
    }).format(Number(n) || 0);

  const statusText = s =>
    ({
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
    const v = p.vehicle;

    const msg =
      `Dzień dobry, proszę o informację o dostępności części: ${p.name}` +
      `${p.make ? " | " + p.make : ""}` +
      `${p.model ? " " + p.model : ""}` +
      `${p.oem ? " | OEM: " + p.oem : ""}` +
      `${v?.dismantling_number ? " | Numer rozbiórkowy: " + v.dismantling_number : ""}` +
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
      .filter(([label, value]) =>
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

  function openProduct(p) {
    const modal = $("product-modal");
    const content = $("product-modal-content");
    if (!modal || !content) return;

    lastFocusedElement = document.activeElement;

    const vehicle = p.vehicle || null;
    const image = p.image_url || placeholder;

    content.innerHTML = `
      <div class="product-modal-main">
        <div>
          <img
            class="product-modal-image"
            src="${esc(image)}"
            alt="${esc(p.name || "Część samochodowa")}"
          >
        </div>

        <div>
          <p class="product-modal-category">${esc(p.category || "Części samochodowe")}</p>
          <h2 class="product-modal-title" id="modal-product-name">${esc(p.name || "Część samochodowa")}</h2>

          <div class="product-modal-fitment">
            ${esc([p.make, p.model, p.years].filter(Boolean).join(" · ") || "Zapytaj o dopasowanie")}
          </div>

          ${p.oem ? `<div class="product-modal-oem"><b>OEM:</b> ${esc(p.oem)}</div>` : ""}

          <div><b>Status:</b> ${esc(statusText(p.status))}</div>
          <div class="product-modal-price">${money(p.price)}</div>

          ${p.description
            ? `<div class="product-modal-description">${esc(p.description)}</div>`
            : ""}

          <div class="product-modal-actions">
            <a class="button button-green" href="${esc(contactUrl(p))}" target="_blank" rel="noopener">Zapytaj przez WhatsApp ↗</a>
          </div>
        </div>
      </div>

      ${vehicleDetailsMarkup(vehicle)}
    `;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    $("product-modal-close").focus();
  }

  function closeProduct() {
    const modal = $("product-modal");
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
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
      badge.textContent = statusText(p.status);
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

      const detailsButton = el.querySelector(".product-details-button");
      detailsButton.addEventListener("click", e => {
        e.stopPropagation();
        openProduct(p);
      });

      const contact = el.querySelector(".product-contact");
      contact.href = contactUrl(p);
      contact.addEventListener("click", e => e.stopPropagation());

      card.addEventListener("click", e => {
        if (e.target.closest("a, button")) return;
        openProduct(p);
      });

      card.setAttribute("aria-label", p.name || "Część samochodowa");

      if (p.status === "reserved") {
        badge.textContent = "Zapytaj o dostępność";
      }

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
        "Tryb demonstracyjny: widzisz przykładowe produkty. Aby uruchomić prawdziwy katalog, skonfiguruj Supabase zgodnie z instrukcją README.";

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

      if (!products.length) {
        $("catalog-status").hidden = false;
        $("catalog-status").textContent =
          "Katalog jest jeszcze pusty. Dodaj pierwsze części w panelu administratora.";
      } else {
        $("catalog-status").hidden = true;
      }
    } catch (e) {
      products = [];
      render();

      $("catalog-status").hidden = false;
      $("catalog-status").textContent =
        "Nie udało się pobrać katalogu lub danych samochodów. Sprawdź konfigurację Supabase.";

      console.error("ARVORN catalog error:", e);
    }
  }

  ["search", "category-filter", "make-filter"].forEach(id => {
    $(id).addEventListener(id === "search" ? "input" : "change", render);
  });

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