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
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  let products = [];
  let vehicles = [];
  let currentImageUrl = "";
  let selectedVehicle = null;
  let lookupSequence = 0;

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

  function vehicleDetails(v) {
    const fields = [
      ["Marka", v.make],
      ["Model", v.model],
      ["Rok", v.year],
      ["VIN", v.vin],
      ["Silnik", v.engine],
      ["Paliwo", v.fuel],
      ["Skrzynia biegów", v.transmission],
      ["Napęd", v.drivetrain],
      ["Strona kierownicy", v.steering_side],
      ["Uwagi", v.notes]
    ];

    return fields
      .filter(([label, value]) => value !== null && value !== undefined && String(value).trim() !== "")
      .map(([label, value]) =>
        `<div><b>${esc(label)}:</b> ${esc(value)}</div>`
      )
      .join("");
  }

  function showVehicleInfo(v) {
    const box = $("p-vehicle-info");

    if (!v) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.hidden = false;
    box.innerHTML = `
      <strong>Samochód znaleziony</strong>
      <p><b>Numer rozbiórkowy:</b> ${esc(v.dismantling_number)}</p>
      <div>${vehicleDetails(v)}</div>
    `;
  }

  async function findVehicle(number) {
    const normalized = number.trim().toUpperCase();
    const sequence = ++lookupSequence;

    selectedVehicle = null;
    showVehicleInfo(null);

    if (!normalized) return null;

    message("form-message", "");

    const { data, error } = await client
      .from("vehicles")
      .select("*")
      .eq("dismantling_number", normalized)
      .maybeSingle();

    if (sequence !== lookupSequence) return null;

    if (error) {
      showVehicleInfo(null);
      message(
        "form-message",
        "Błąd wyszukiwania samochodu: " + error.message,
        "error"
      );
      return null;
    }

    if (!data) {
      showVehicleInfo(null);
      message(
        "form-message",
        `Nie znaleziono samochodu o numerze ${normalized}. Najpierw dodaj go w sekcji samochodów.`,
        "error"
      );
      return null;
    }

    selectedVehicle = data;
    $("p-vehicle-number").value = data.dismantling_number;
    $("p-make").value = data.make || "";
    $("p-model").value = data.model || "";
    $("p-years").value = data.year ? String(data.year) : "";

    showVehicleInfo(data);
    return data;
  }

  async function loadVehicles() {
    const { data, error } = await client
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message("vehicles-message", "Błąd pobierania samochodów: " + error.message, "error");
      return false;
    }

    vehicles = data || [];
    renderVehicles();
    return true;
  }

  function renderVehicles() {
    const body = $("vehicles-body");
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
      body.innerHTML = '<tr><td colspan="4">Brak dodanych samochodów.</td></tr>';
    }
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
      message("inventory-message", "Błąd pobierania danych: " + error.message, "error");
      return;
    }

    products = data || [];
    $("admin-total").textContent = products.length;
    renderInventory();
  }

  function renderInventory() {
    const q = $("admin-search").value.trim().toLocaleLowerCase("pl");
    const body = $("inventory-body");
    body.innerHTML = "";

    products
      .filter(p =>
        [p.name, p.category, p.make, p.model, p.oem]
          .some(v => String(v || "").toLocaleLowerCase("pl").includes(q))
      )
      .forEach(p => {
        const vehicle = vehicles.find(v => String(v.id) === String(p.vehicle_id));
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>
            <div class="table-product">
              ${p.image_url
                ? `<img src="${esc(p.image_url)}" alt="">`
                : '<div class="brand-mark">A</div>'}
              <div>
                <b>${esc(p.name)}</b>
                <small>${esc([p.category, p.make, p.model].filter(Boolean).join(" · "))}</small>
                ${vehicle
                  ? `<small>Rozbiórka: ${esc(vehicle.dismantling_number)}</small>`
                  : ""}
              </div>
            </div>
          </td>
          <td>${esc(p.oem || "—")}</td>
          <td><b>${money(p.price)}</b></td>
          <td><span class="table-status ${esc(p.status)}">${statusText(p.status)}</span></td>
          <td>
            <div class="table-actions">
              <button class="small-action" data-edit="${esc(p.id)}">Edytuj</button>
              <button class="small-action delete" data-delete="${esc(p.id)}">Usuń</button>
            </div>
          </td>
        `;

        body.appendChild(tr);
      });

    if (!body.children.length) {
      body.innerHTML = '<tr><td colspan="5">Brak części do wyświetlenia.</td></tr>';
    }
  }

  function resetForm() {
    $("product-form").reset();
    $("product-id").value = "";
    currentImageUrl = "";
    selectedVehicle = null;
    showVehicleInfo(null);
    $("current-image").hidden = true;
    $("current-image").innerHTML = "";
    $("form-title").textContent = "Dodaj nową część";
    $("save-product").textContent = "Zapisz część";
    $("cancel-edit").hidden = true;
    message("form-message", "");
  }

  async function edit(p) {
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

    $("p-vehicle-number").value = "";
    selectedVehicle = null;
    showVehicleInfo(null);

    currentImageUrl = p.image_url || "";
    $("current-image").hidden = !currentImageUrl;
    $("current-image").innerHTML = currentImageUrl
      ? `<img src="${esc(currentImageUrl)}" alt="Aktualne zdjęcie"><span>Aktualne zdjęcie</span>`
      : "";

    $("form-title").textContent = "Edytuj część";
    $("save-product").textContent = "Zapisz zmiany";
    $("cancel-edit").hidden = false;

    if (p.vehicle_id) {
      const vehicle = vehicles.find(v => String(v.id) === String(p.vehicle_id));
      if (vehicle) {
        $("p-vehicle-number").value = vehicle.dismantling_number;
        await findVehicle(vehicle.dismantling_number);
      }
    }

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

    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp" : "jpg";

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
      message("login-message", "Sprawdź konfigurację Supabase w config.js.", "error");
      return;
    }

    message("login-message", "Logowanie…");

    const { error } = await client.auth.signInWithPassword({
      email: $("email").value,
      password: $("password").value
    });

    if (error) {
      message("login-message", "Nie udało się zalogować. Sprawdź e-mail i hasło.", "error");
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
      const number = $("v-number").value.trim().toUpperCase();

      const payload = {
        dismantling_number: number,
        make: $("v-make").value.trim(),
        model: $("v-model").value.trim(),
        year: $("v-year").value ? Number($("v-year").value) : null,
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

      message(
        "vehicle-form-message",
        `Samochód ${data.dismantling_number} został dodany.`,
        "success"
      );
    } catch (err) {
      const duplicate = /duplicate key|vehicles_dismantling_number_key|already exists/i.test(err.message || "");

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

  $("p-vehicle-number").addEventListener("change", async () => {
    const number = $("p-vehicle-number").value.trim().toUpperCase();
    $("p-vehicle-number").value = number;
    await findVehicle(number);
  });

  $("p-vehicle-number").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("p-vehicle-number").dispatchEvent(new Event("change"));
    }
  });

  $("cancel-edit").addEventListener("click", resetForm);
  $("admin-search").addEventListener("input", renderInventory);

  $("product-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!client) return;

    const number = $("p-vehicle-number").value.trim().toUpperCase();
    if (!number) {
      message("form-message", "Wpisz numer rozbiórkowy samochodu.", "error");
      $("p-vehicle-number").focus();
      return;
    }

    const btn = $("save-product");
    btn.disabled = true;
    message("form-message", "Sprawdzanie samochodu…");

    try {
      const vehicle = await findVehicle(number);

      if (!vehicle) {
        throw new Error("Nie można zapisać części bez prawidłowego numeru rozbiórkowego.");
      }

      message("form-message", "Zapisywanie części…");

      const image_url = await uploadImage($("p-image").files[0]);

      const payload = {
        name: $("p-name").value.trim(),
        category: $("p-category").value.trim(),
        make: vehicle.make || null,
        model: vehicle.model || null,
        years: vehicle.year ? String(vehicle.year) : null,
        oem: $("p-oem").value.trim() || null,
        price: Number($("p-price").value),
        status: $("p-status").value,
        description: $("p-description").value.trim() || null,
        image_url: image_url || null,
        vehicle_id: vehicle.id
      };

      const id = $("product-id").value;

      const result = id
        ? await client.from("products").update(payload).eq("id", id).select().single()
        : await client.from("products").insert(payload).select().single();

      if (result.error) throw result.error;

      message(
        "form-message",
        id ? "Zmiany zapisane." : "Część została dodana.",
        "success"
      );

      resetForm();
      await refreshProducts();
    } catch (err) {
      message("form-message", "Nie udało się zapisać: " + (err.message || "nieznany błąd"), "error");
    } finally {
      btn.disabled = false;
    }
  });

  $("inventory-body").addEventListener("click", async e => {
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    const deleteId = e.target.closest("[data-delete]")?.dataset.delete;

    if (editId) {
      const p = products.find(x => String(x.id) === editId);
      if (p) await edit(p);
    }

    if (deleteId) {
      const p = products.find(x => String(x.id) === deleteId);

      if (!p || !confirm(`Usunąć część „${p.name}”? Tej operacji nie można cofnąć.`)) return;

      const { error } = await client.from("products").delete().eq("id", deleteId);

      if (error) {
        message("inventory-message", "Nie udało się usunąć części: " + error.message, "error");
        return;
      }

      message("inventory-message", "Część została usunięta.", "success");
      await refreshProducts();
    }
  });

  if (!configured || !client) {
    warning.hidden = false;
    warning.textContent = "Konfiguracja nie jest gotowa. Sprawdź SUPABASE_URL i SUPABASE_ANON_KEY w config.js.";
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