const container = document.getElementById("productContainer");
const searchInput1 = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

// =========================
// CARRITO
// =========================
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(product, size, quantity) {
  const cart = getCart();
  const key = `${product.name}-${size}`;
  const existing = cart.find(i => i.key === key);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      key,
      name: product.name,
      price: product.price,
      image: product.image || (product.images?.[0] ?? ""),
      size,
      quantity
    });
  }

  saveCart(cart);
}

// =========================
// PRODUCTOS
// =========================
function getProducts() {
  return JSON.parse(localStorage.getItem("products")) || [];
}

// =========================
// MODAL
// =========================
function openAddToCartModal(productIndex) {
  const products = getProducts();
  const product = products[productIndex];
  if (!product) return;

  const hasSizes = Array.isArray(product.sizes) && product.sizes.filter(Boolean).length > 0;
  const isAccesorio = product.category === "Accesorios";

  const sizesHTML = (!isAccesorio && hasSizes)
    ? `
      <div class="mb-3">
        <label class="form-label fw-semibold">Talla</label>
        <div class="d-flex flex-wrap gap-2" id="modalSizeList">
          ${product.sizes.filter(Boolean).map(size => `
            <button type="button"
              class="btn btn-outline-dark size-btn"
              data-size="${size}">
              ${size}
            </button>
          `).join("")}
        </div>
        <div id="sizeError" class="text-danger mt-1 d-none" style="font-size:0.85rem">
          Selecciona una talla
        </div>
      </div>
    `
    : `<input type="hidden" id="selectedSizeHidden" value="Única">`;

  const modalHTML = `
    <div class="modal fade" id="addToCartModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title">${product.name}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            ${sizesHTML}

            <div class="mb-3">
              <label class="form-label fw-semibold">Cantidad</label>
              <div class="d-flex align-items-center gap-3">
                <button type="button" class="btn btn-outline-secondary px-3" id="btnMinus">−</button>
                <span id="qtyDisplay" style="font-size:1.2rem;min-width:24px;text-align:center">1</span>
                <button type="button" class="btn btn-outline-secondary px-3" id="btnPlus">+</button>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-3">
              <span class="text-muted">Precio unitario</span>
              <span class="fw-bold">$${Number(product.price).toLocaleString()}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1" id="totalRow">
              <span class="text-muted">Total</span>
              <span class="fw-bold" id="modalTotal">$${Number(product.price).toLocaleString()}</span>
            </div>
          </div>

          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-dark w-100" id="confirmAddToCart">
              Añadir al carrito
            </button>
          </div>

        </div>
      </div>
    </div>
  `;

  // Limpiar modal anterior si existe
  const old = document.getElementById("addToCartModal");
  if (old) old.remove();

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modalEl = document.getElementById("addToCartModal");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  // Estado interno del modal
  let selectedSize = (!isAccesorio && hasSizes) ? null : "Única";
  let quantity = 1;

  // Selección de talla
  modalEl.querySelectorAll(".size-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modalEl.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active", "btn-dark"));
      btn.classList.add("active", "btn-dark");
      btn.classList.remove("btn-outline-dark");
      selectedSize = btn.dataset.size;
      document.getElementById("sizeError")?.classList.add("d-none");
    });
  });

  // Cantidad
  function updateQty() {
    document.getElementById("qtyDisplay").textContent = quantity;
    document.getElementById("modalTotal").textContent =
      `$${(product.price * quantity).toLocaleString()}`;
  }

  document.getElementById("btnMinus").addEventListener("click", () => {
    if (quantity > 1) { quantity--; updateQty(); }
  });

  document.getElementById("btnPlus").addEventListener("click", () => {
    if (quantity < (product.stock ?? 99)) { quantity++; updateQty(); }
  });

  // Confirmar
  document.getElementById("confirmAddToCart").addEventListener("click", () => {
    if (!selectedSize) {
      document.getElementById("sizeError")?.classList.remove("d-none");
      return;
    }
    addToCart(product, selectedSize, quantity);
    modal.hide();
    showCartToast(product.name, quantity, selectedSize);
  });

  // Limpiar DOM al cerrar
  modalEl.addEventListener("hidden.bs.modal", () => modalEl.remove());
}

// =========================
// TOAST CONFIRMACIÓN
// =========================
function showCartToast(name, qty, size) {
  const old = document.getElementById("cartToast");
  if (old) old.remove();

  const sizeLabel = size !== "Única" ? ` — Talla ${size}` : "";

  document.body.insertAdjacentHTML("beforeend", `
    <div id="cartToast" class="toast align-items-center text-bg-dark border-0 position-fixed bottom-0 end-0 m-3"
      role="alert" style="z-index:9999">
      <div class="d-flex">
        <div class="toast-body">
          ✓ ${qty}× <strong>${name}</strong>${sizeLabel} añadido al carrito
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `);

  const toast = new bootstrap.Toast(document.getElementById("cartToast"), { delay: 3000 });
  toast.show();
}

// =========================
// INICIALIZAR
// =========================
renderProducts(getProducts());

searchInput1.addEventListener("input", filterProducts);
categoryFilter.addEventListener("change", filterProducts);

// =========================
// FILTRO
// =========================
function filterProducts() {
  const search = searchInput1.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const products = getProducts();

  const filtered = products.filter(product => {
    const matchesSearch =
      (product.name || "").toLowerCase().includes(search) ||
      (product.category || "").toLowerCase().includes(search) ||
      (product.description || "").toLowerCase().includes(search);
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  renderProducts(filtered);
}

// =========================
// RENDER
// =========================
function renderProducts(productList) {
  if (!productList.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <h3>No hay productos disponibles</h3>
          <p>No se encontraron productos con los filtros seleccionados.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  productList.forEach((product, index) => {
    const images =
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.image
          ? [product.image]
          : ["https://via.placeholder.com/700x900?text=Producto"];

    const sizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
    const carouselId = `productCarousel${index}`;

    const indicators = images.length > 1
      ? `<div class="carousel-indicators">
          ${images.map((_, i) => `
            <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${i}"
              class="${i === 0 ? "active" : ""}" ${i === 0 ? 'aria-current="true"' : ""}
              aria-label="Slide ${i + 1}"></button>
          `).join("")}
        </div>`
      : "";

    const controls = images.length > 1
      ? `<button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon"></span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
          <span class="carousel-control-next-icon"></span>
        </button>`
      : "";

    const sizesHTML = product.category !== "Accesorios" && sizes.length
      ? `<div class="meta-block">
          <span class="meta-label">Tallas</span>
          <div class="size-list">
            ${sizes.map(s => `<span class="size-chip">${s}</span>`).join("")}
          </div>
        </div>`
      : "";

    container.innerHTML += `
      <div class="col-md-6 col-lg-4">
        <article class="product-card">

          <div class="product-image-wrapper">
            <div id="${carouselId}" class="carousel slide product-carousel">
              ${indicators}
              <div class="carousel-inner">
                ${images.map((img, i) => `
                  <div class="carousel-item ${i === 0 ? "active" : ""}">
                    <img src="${img}" alt="${product.name}">
                  </div>
                `).join("")}
              </div>
              ${controls}
            </div>
          </div>

          <div class="product-body">
            <div class="product-top">
              <span class="product-category">${product.category || "Sin categoría"}</span>
              <span class="product-stock">Stock: ${product.stock ?? 0}</span>
            </div>

            <h3 class="product-name">${product.name || "Producto sin nombre"}</h3>

            ${product.description ? `<p class="product-description">${product.description}</p>` : ""}

            <div class="product-meta">${sizesHTML}</div>

            <div class="product-footer">
              <h4 class="product-price">$${Number(product.price || 0).toLocaleString()}</h4>
              <button
                class="btn btn-dark btn-add-cart"
                onclick="openAddToCartModal(${index})"
                ${(product.stock ?? 0) === 0 ? "disabled" : ""}>
                ${(product.stock ?? 0) === 0 ? "Sin stock" : "Añadir al carrito"}
              </button>
            </div>

          </div>
        </article>
      </div>
    `;
  });
}

function addToCart(product) {
  const cart = getCart();

  const existing = cart.find(item => item.key === product.key);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartCount(); 
}