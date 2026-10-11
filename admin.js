(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

  const $ = id => document.getElementById(id);

  if (!$("login-panel")) return;

  const warning = $("setup-warning");

  const client = configured && window.supabase
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      )
    : null;

  let products = [];
  let vehicles = [];
  let currentImageUrl = "";

  function message(id, text, type = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = "form-message " + type;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function money(n) {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(n) || 0);
  }

  function statusText(s) {
    return ({
      available: "Dostępna",
      reserved: "Zarezerwowana",
      sold: "Sprzedana"
    }[s] || "Dostępna");
  }

  function showUser(user) {
    $("login-panel").hidden = !!user;
    $("dashboard").hidden = !user;

    if (user) refreshAll();
  }

  async function loadVehicles() {
    const { data, error } = await client
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message(
        "vehicles-message",
        "Błąd pobierania samochodów: " + error.message,
        "error"
      );
      return false;
    }

    vehicles = data || [];
    renderVehicles();
    renderVehicleOptions();
    return true;
  }

  function renderVehicles() {
    const body = $("vehicles-body");
    if (!body) return;

    body.innerHTML = "";

    vehicles.forEach(v => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><b>${esc(v.dismantling_number)}</b></td>
        <td>${esc([v.make, v.model].filter(Boolean).join(" "))}</td>
        <td>${esc(v.year || "—")}</td>
        <td>${esc(v.engine || "—")}</td>
      `;

      body.appendChild(tr);
    });

    if (!vehicles.length) {
      body.innerHTML =
        '<tr><td colspan="4">Brak dodanych samochodów.</td></tr>';
    }
  }

  function renderVehicleOptions() {
    const select = $("p-vehicle");
    if (!select) return;

    const previous = select.value;

    select.innerHTML =
      '<option value="">Bez przypisanego samochodu</option>';

    vehicles.forEach(v => {
      const option = document.createElement("option");
      option.value = String(v.id);
      option.textContent =
        `${v.dismantling_number} — ${v.make} ${v.model}` +
        (v.year ? ` (${v.year})` : "");
      select.appendChild(option);
    });

    if (vehicles.some(v => String(v.id) === previous)) {
      select.value = previous;
    }
  }

  function fillProductVehicleFields() {
    const select = $("p-vehicle");
    if (!select || !select.value) return;

    const v = vehicles.find(
      item => String(item.id) === select.value
    );

    if (!v) return;

    $("p-make").value = v.make || "";
    $("p-model").value = v.model || "";
    $("p-years").value = v.year ? String(v.year) : "";
  }

  async function refreshAll() {
    await loadVehicles();
    await refreshProducts();
  }

  async function refreshProducts() {
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      message(
        "inventory-message",
        "Błąd pobierania danych: " + error.message,
        "error"
      );
      return;
    }

    products = data || [];
    $("admin-total").textContent = products.length;
    renderInventory();
  }

  function renderInventory() {
    const q = $("admin-search").value
      .trim()
      .toLocaleLowerCase("pl");

    const body = $("inventory-body");
    body.innerHTML = "";

    products
      .filter(p =>
        [p.name, p.category, p.make, p.model, p.oem]
          .some(v =>
            String(v || "").toLocaleLowerCase("pl").includes(q)
          )
      )
      .forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>
            <div class="table-product">
              ${
                p.image_url
                  ? `<img src="${esc(p.image_url)}" alt="">`
                  : '<div class="brand-mark">A</div>'
              }
              <div>
                <b>${esc(p.name)}</b>
                <small>${esc(
                  [p.category, p.make, p.model]
                    .filter(Boolean)
                    .join(" · ")
                )}</small>
              </div>
            </div>
          </td>
          <td>${esc(p.oem || "—")}</td>
          <td><b>${money(p.price)}</b></td>
          <td>
            <span class="table-status ${esc(p.status)}">
              ${statusText(p.status)}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="small-action" data-edit="${esc(p.id)}">
                Edytuj
              </button>
              <button class="small-action delete" data-delete="${esc(p.id)}">
                Usuń
              </button>
            </div>
          </td>
        `;

        body.appendChild(tr);
      });

    if (!body.children.length) {
      body.innerHTML =
        '<tr><td colspan="5">Brak części do wyświetlenia.</td></tr>';
    }
  }

  function resetForm() {
    $("product-form").reset();
    $("product-id").value = "";
    currentImageUrl = "";
    $("current-image").hidden = true;
    $("current-image").innerHTML = "";
    $("form-title").textContent = "Dodaj nową część";
    $("save-product").textContent = "Zapisz część";
    $("cancel-edit").hidden = true;
    message("form-message", "");
  }

  function edit(p) {
    $("product-id").value = p.id;
    $("p-name").value = p.name || "";
    $("p-category").value = p.category || "";
    $("p-make").value = p.make || "";
    $("p-model").value = p.model || "";
    $("p-years").value = p.years || "";
    $("p-oem").value = p.oem || "";
    $("p-price").value = p.price ?? "";
    $("p-status").value = p.status || "available";
    $("p-description").value = p.description || "";

    $("p-vehicle").value =
      p.vehicle_id == null ? "" : String(p.vehicle_id);

    currentImageUrl = p.image_url || "";

    $("current-image").hidden = !currentImageUrl;
    $("current-image").innerHTML = currentImageUrl
      ? `<img src="${esc(currentImageUrl)}" alt="Aktualne zdjęcie"><span>Aktualne zdjęcie</span>`
      : "";

    $("form-title").textContent = "Edytuj część";
    $("save-product").textContent = "Zapisz zmiany";
    $("cancel-edit").hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file) {
    if (!file) return currentImageUrl;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Wybierz zdjęcie JPG, PNG lub WebP.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Zdjęcie jest za duże. Maksymalny rozmiar to 5 MB.");
    }

    const ext = file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await client.storage
      .from("product-images")
      .upload(path, file, {
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;

    const { data } = client.storage
      .from("product-images")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  $("login-form").addEventListener("submit", async e => {
    e.preventDefault();

    if (!client) {
      message(
        "login-message",
        "Sprawdź konfigurację Supabase w config.js.",
        "error"
      );
      return;
    }

    message("login-message", "Logowanie…");

    const { error } = await client.auth.signInWithPassword({
      email: $("email").value,
      password: $("password").value
    });

    if (error) {
      message(
        "login-message",
        "Nie udało się zalogować. Sprawdź e-mail i hasło.",
        "error"
      );
      return;
    }

    message("login-message", "");
    const { data } = await client.auth.getSession();
    showUser(data.session?.user || null);
  });

  $("logout").addEventListener("click", async () => {
    await client.auth.signOut();
    showUser(null);
  });

  $("vehicle-form").addEventListener("submit", async e => {
    e.preventDefault();

    if (!client) return;

    const btn = $("save-vehicle");
    btn.disabled = true;
    message("vehicle-form-message", "Zapisywanie samochodu…");

    try {
      const number = $("v-number").value.trim();

      const payload = {
        dismantling_number: number,
        make: $("v-make").value.trim(),
        model: $("v-model").value.trim(),
        year: $("v-year").value
          ? Number($("v-year").value)
          : null,
        vin: $("v-vin").value.trim() || null,
        engine: $("v-engine").value.trim() || null,
        fuel: $("v-fuel").value || null,
        transmission: $("v-transmission").value || null,
        drivetrain: $("v-drivetrain").value || null,
        steering_side: $("v-steering-side").value || null,
        notes: $("v-notes").value.trim() || null
      };

      const { data, error } = await client
        .from("vehicles")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      await loadVehicles();

      $("vehicle-form").reset();

      $("p-vehicle").value = String(data.id);
      fillProductVehicleFields();

      message(
        "vehicle-form-message",
        `Samochód ${number} został dodany. Możesz teraz przypisać do niego części.`,
        "success"
      );
    } catch (err) {
      const duplicate = /duplicate key|vehicles_dismantling_number_key|already exists/i
        .test(err.message || "");

      message(
        "vehicle-form-message",
        duplicate
          ? "Ten numer rozbiórkowy już istnieje. Użyj innego numeru."
          : "Nie udało się dodać samochodu: " + (err.message || "nieznany błąd"),
        "error"
      );
    } finally {
      btn.disabled = false;
    }
  });

  $("p-vehicle").addEventListener("change", fillProductVehicleFields);

  $("cancel-edit").addEventListener("click", resetForm);
  $("admin-search").addEventListener("input", renderInventory);

  $("product-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!client) return;

    const btn = $("save-product");
    btn.disabled = true;
    message("form-message", "Zapisywanie…");

    try {
      const image_url = await uploadImage($("p-image").files[0]);

      const payload = {
        name: $("p-name").value.trim(),
        category: $("p-category").value.trim(),
        make: $("p-make").value.trim() || null,
        model: $("p-model").value.trim() || null,
        years: $("p-years").value.trim() || null,
        oem: $("p-oem").value.trim() || null,
        price: Number($("p-price").value),
        status: $("p-status").value,
        description: $("p-description").value.trim() || null,
        image_url: image_url || null,
        vehicle_id: $("p-vehicle").value
          ? Number($("p-vehicle").value)
          : null
      };

      const id = $("product-id").value;

      const result = id
        ? await client.from("products")
            .update(payload)
            .eq("id", id)
            .select()
            .single()
        : await client.from("products")
            .insert(payload)
            .select()
            .single();

      if (result.error) throw result.error;

      message(
        "form-message",
        id ? "Zmiany zapisane." : "Część została dodana.",
        "success"
      );

      resetForm();
      await refreshProducts();
    } catch (err) {
      message(
        "form-message",
        "Nie udało się zapisać: " + (err.message || "nieznany błąd"),
        "error"
      );
    } finally {
      btn.disabled = false;
    }
  });

  $("inventory-body").addEventListener("click", async e => {
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    const deleteId = e.target.closest("[data-delete]")?.dataset.delete;

    if (editId) {
      const p = products.find(x => String(x.id) === editId);
      if (p) edit(p);
    }

    if (deleteId) {
      const p = products.find(x => String(x.id) === deleteId);

      if (!p || !confirm(
        `Usunąć część „${p.name}”? Tej operacji nie można cofnąć.`
      )) return;

      const { error } = await client
        .from("products")
        .delete()
        .eq("id", deleteId);

      if (error) {
        message(
          "inventory-message",
          "Nie udało się usunąć części: " + error.message,
          "error"
        );
        return;
      }

      message("inventory-message", "Część została usunięta.", "success");
      await refreshProducts();
    }
  });

  if (!configured || !client) {
    warning.hidden = false;
    warning.textContent =
      "Konfiguracja nie jest gotowa. Sprawdź SUPABASE_URL i SUPABASE_ANON_KEY w config.js.";
    $("login-panel").hidden = false;
  } else {
    client.auth.getSession().then(({ data }) => {
      showUser(data.session?.user || null);
    });

    client.auth.onAuthStateChange((_event, session) => {
      showUser(session?.user || null);
    });
  }
})();