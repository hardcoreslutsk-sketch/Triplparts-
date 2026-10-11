(() => {
  const cfg = window.APP_CONFIG || {};

  const configured =
    !!cfg.SUPABASE_URL &&
    !!cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

  const $ = id => document.getElementById(id);

  if (!$("login-panel")) return;

  const client = configured && window.supabase
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        }
      )
    : null;

  let products = [];
  let currentImageUrl = "";
  let authStateReady = false;

  function message(id, text, type = "") {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = "form-message " + type;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function money(value) {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(value) || 0);
  }

  function statusText(status) {
    return ({
      available: "Dostępna",
      reserved: "Zarezerwowana",
      sold: "Sprzedana"
    }[status] || "Dostępna");
  }

  function showUser(user) {
    $("login-panel").hidden = !!user;
    $("dashboard").hidden = !user;

    if (user) refresh();
  }

  async function refresh() {
    if (!client) return;

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
          .some(value =>
            String(value || "")
              .toLocaleLowerCase("pl")
              .includes(q)
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
                  : "<span>TP</span>"
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
              <button class="small-action"
                data-edit="${esc(p.id)}">Edytuj</button>
              <button class="small-action delete"
                data-delete="${esc(p.id)}">Usuń</button>
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

  function edit(product) {
    $("product-id").value = product.id;
    $("p-name").value = product.name || "";
    $("p-category").value = product.category || "";
    $("p-make").value = product.make || "";
    $("p-model").value = product.model || "";
    $("p-years").value = product.years || "";
    $("p-oem").value = product.oem || "";
    $("p-price").value = product.price ?? "";
    $("p-status").value = product.status || "available";
    $("p-description").value = product.description || "";

    currentImageUrl = product.image_url || "";

    $("current-image").hidden = !currentImageUrl;
    $("current-image").innerHTML = currentImageUrl
      ? `<img src="${esc(currentImageUrl)}" alt="Aktualne zdjęcie">`
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

  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    if (!client) {
      message(
        "login-message",
        "Sprawdź konfigurację Supabase w config.js.",
        "error"
      );
      return;
    }

    const button = $("login-form").querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;
    message("login-message", "Logowanie…");

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: $("email").value.trim(),
        password: $("password").value
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Nie udało się utworzyć sesji.");
      }

      message("login-message", "");
      showUser(data.user);
    } catch (error) {
      message(
        "login-message",
        "Nie udało się zalogować: " + error.message,
        "error"
      );
    } finally {
      button.disabled = false;
    }
  });

  $("logout").addEventListener("click", async () => {
    if (!client) return;

    const { error } = await client.auth.signOut();

    if (error) {
      message(
        "inventory-message",
        "Nie udało się wylogować: " + error.message,
        "error"
      );
      return;
    }

    showUser(null);
  });

  $("cancel-edit").addEventListener("click", resetForm);
  $("admin-search").addEventListener("input", renderInventory);

  $("product-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!client) return;

    const button = $("save-product");
    button.disabled = true;
    message("form-message", "Zapisywanie…");

    try {
      const image_url = await uploadImage(
        $("p-image").files[0]
      );

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
        image_url: image_url || null
      };

      const id = $("product-id").value;

      const result = id
        ? await client
            .from("products")
            .update(payload)
            .eq("id", id)
            .select()
            .single()
        : await client
            .from("products")
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
      await refresh();
    } catch (error) {
      message(
        "form-message",
        "Nie udało się zapisać: " + error.message,
        "error"
      );
    } finally {
      button.disabled = false;
    }
  });

  $("inventory-body").addEventListener("click", async event => {
    const editId = event.target.closest("[data-edit]")?.dataset.edit;
    const deleteId = event.target.closest("[data-delete]")?.dataset.delete;

    if (editId) {
      const product = products.find(p => p.id === editId);
      if (product) edit(product);
    }

    if (deleteId) {
      const product = products.find(p => p.id === deleteId);

      if (
        !product ||
        !confirm(`Usunąć część „${product.name}”? Tej operacji nie można cofnąć.`)
      ) {
        return;
      }

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
      await refresh();
    }
  });

  if (!configured || !window.supabase) {
    $("setup-warning").hidden = false;
    $("setup-warning").textContent =
      "Sprawdź SUPABASE_URL i SUPABASE_ANON_KEY w config.js.";
  } else {
    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        showUser(null);
      } else if (session?.user) {
        showUser(session.user);
      } else if (authStateReady) {
        showUser(null);
      }
    });

    client.auth.getSession()
      .then(({ data, error }) => {
        authStateReady = true;

        if (error) {
          showUser(null);
          return;
        }

        showUser(data.session?.user || null);
      })
      .catch(() => {
        authStateReady = true;
        showUser(null);
      });
  }
})();