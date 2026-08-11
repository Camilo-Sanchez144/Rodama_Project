/* =========================================================
   PRODUCTOS.JS — Catálogo de productos
   Depende de: api.config.js, api.service.js, auth.service.js,
               producto.service.js, ui.utils.js, cart.store.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const container      = document.getElementById("productContainer");
  const searchInput    = document.getElementById("catalogSearchInput");
  const categoryFilter = document.getElementById("categoryFilter");

  if (!container) return;

  /* ---- Estado local ---- */
  let todosLosProductos = [];

  /* ---- Carga inicial desde el backend ---- */
  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-dark" role="status"></div>
      <p class="mt-2 text-muted">Cargando productos...</p>
    </div>
  `;

  try {
    todosLosProductos = await ProductoService.cargarYCachear();
  } catch {
    todosLosProductos = ProductoService.getCache();
  }

  renderizarProductos(todosLosProductos);

  /* ---- Filtros: búsqueda + categoría ---- */
  function aplicarFiltros() {
    const texto     = (searchInput?.value || "").toLowerCase().trim();
    const categoria = categoryFilter?.value || "";

    const filtrados = todosLosProductos.filter((p) => {
      const nombre    = (p.name || p.nombre || "").toLowerCase();
      const desc      = (p.description || p.descripcion || "").toLowerCase();
      const cat       = (p.category || p.categoria || "").toLowerCase();
      const coincideTexto = !texto || nombre.includes(texto) || desc.includes(texto);
      const coincideCat   = !categoria || cat === categoria.toLowerCase();
      return coincideTexto && coincideCat;
    });

    renderizarProductos(filtrados);
  }

  if (searchInput)    searchInput.addEventListener("input",  aplicarFiltros);
  if (categoryFilter) categoryFilter.addEventListener("change", aplicarFiltros);

  /* ==============================================================
     RENDERIZADO DE TARJETAS
  ============================================================== */
  function renderizarProductos(productos) {
    container.innerHTML = "";

    if (!productos || productos.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-bag-x fs-1 text-muted"></i>
          <p class="mt-2 text-muted">No se encontraron productos.</p>
        </div>
      `;
      return;
    }

    productos.forEach((productoOriginal) => {
      const p = normalizarProducto(productoOriginal);
      const card = document.createElement("div");
      card.className = "col-sm-6 col-md-4 col-lg-3";

      const stockTexto = p.stock > 0 ? `Stock: ${p.stock}` : "Agotado";
      const estaAgotado = p.stock <= 0;

      card.innerHTML = `
        <div class="product-card ${estaAgotado ? "out-of-stock" : ""}">
          <div class="product-img-wrap">
            <img src="${UiUtils.escaparHTML(p.image || "https://via.placeholder.com/400x500?text=Producto")}"
                 alt="${UiUtils.escaparHTML(p.name || "Producto")}" loading="lazy">
            ${estaAgotado ? `<span class="sold-out-badge">Agotado</span>` : ""}
            <button class="btn-wishlist" title="Agregar a favoritos" data-id="${UiUtils.escaparHTML(String(p.id))}">
              <i class="bi bi-heart"></i>
            </button>
          </div>
          <div class="product-card-body">
            <span class="product-category">${UiUtils.escaparHTML(p.category || p.categoria || "")}</span>
            <h3 class="product-name">${UiUtils.escaparHTML(p.name || p.nombre || "Producto sin nombre")}</h3>
            <p class="product-price">$${Number(p.price || p.precio || 0).toLocaleString("es-CO")}</p>
            ${!estaAgotado ? `
              <div class="product-actions">
                ${p.esAccesorio ? "" : crearSelectorTallas(p)}
                <button class="btn-add-to-cart" data-key="${UiUtils.escaparHTML(String(p.id))}">
                  <i class="bi bi-bag-plus"></i> Agregar
                </button>
              </div>
            ` : ""}
          </div>
        </div>
      `;

      /* --- Agregar al carrito --- */
      if (!estaAgotado) {
        card.querySelector(".btn-add-to-cart")?.addEventListener("click", () => {
          agregarAlCarrito(p, card);
        });
      }

      /* --- Favorito --- */
      card.querySelector(".btn-wishlist")?.addEventListener("click", (e) => {
        toggleFavorito(p, e.currentTarget);
      });

      container.appendChild(card);
    });
  }

  function crearSelectorTallas(p) {
    if (!p.sizes || p.sizes.length === 0) return "";
    const opciones = p.sizes
      .map((t) => `<option value="${UiUtils.escaparHTML(t)}">${UiUtils.escaparHTML(t)}</option>`)
      .join("");
    return `<select class="size-select" aria-label="Talla">${opciones}</select>`;
  }

  /* ==============================================================
     CARRITO
  ============================================================== */
  function agregarAlCarrito(p, cardEl) {
    const tallaSelect = cardEl.querySelector(".size-select");
    const talla = tallaSelect ? tallaSelect.value : "Única";

    const item = {
      productId:  p.id,
      name:       p.name || p.nombre,
      price:      p.price || p.precio,
      image:      p.image,
      category:   p.category || p.categoria,
      size:       talla,
      quantity:   1,
    };

    CartStore.agregarItem(item);
    UiUtils.mostrarToast("Agregado al carrito", `${item.name} · Talla ${talla}`, "success");
  }

  /* ==============================================================
     FAVORITOS
  ============================================================== */
  function toggleFavorito(p, btn) {
    const usuario = AuthService.getUsuarioActivo();
    if (!usuario) {
      UiUtils.mostrarToast("Inicia sesión", "Debes iniciar sesión para guardar favoritos.", "warning");
      return;
    }

    const key = `favorites_${usuario.id}`;
    let favs  = [];
    try {
      favs = JSON.parse(localStorage.getItem(key)) || [];
    } catch { favs = []; }

    const idx = favs.findIndex((f) => String(f.productId) === String(p.id));
    const icono = btn.querySelector("i");

    if (idx >= 0) {
      favs.splice(idx, 1);
      icono?.classList.replace("bi-heart-fill", "bi-heart");
    } else {
      favs.push({
        productId: p.id,
        name: p.name || p.nombre,
        price: p.price || p.precio,
        image: p.image,
        category: p.category || p.categoria,
      });
      icono?.classList.replace("bi-heart", "bi-heart-fill");
    }

    localStorage.setItem(key, JSON.stringify(favs));
  }

  /* ==============================================================
     NORMALIZACIÓN DE PRODUCTO (bridge entre backend y UI)
  ============================================================== */
  function normalizarProducto(producto) {
    const stockPorTalla =
      producto.stockBySize &&
      typeof producto.stockBySize === "object" &&
      !Array.isArray(producto.stockBySize)
        ? producto.stockBySize
        : {};

    const sizes =
      Array.isArray(producto.sizes) && producto.sizes.length > 0
        ? producto.sizes.filter(Boolean)
        : Object.keys(stockPorTalla);

    const esAccesorio = (producto.category || producto.categoria) === "ACCESORIOS";

    const stock = esAccesorio
      ? UiUtils.normalizarCantidad(producto.stock)
      : Object.values(stockPorTalla).reduce(
          (t, c) => t + UiUtils.normalizarCantidad(c),
          0
        );

    const images =
      Array.isArray(producto.images) && producto.images.length > 0
        ? producto.images
        : producto.image
        ? [producto.image]
        : ["https://via.placeholder.com/700x900?text=Producto"];

    return {
      ...producto,
      id:          producto.id,
      name:        producto.name || producto.nombre,
      price:       producto.price || producto.precio,
      category:    producto.category || producto.categoria,
      description: producto.description || producto.descripcion,
      image:       images[0],
      images,
      sizes,
      stockBySize: stockPorTalla,
      stock,
      esAccesorio,
    };
  }
});