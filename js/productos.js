const container = document.getElementById("productContainer");
const searchInput1 = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const products = JSON.parse(localStorage.getItem("products")) || [];

renderProducts(products);

searchInput1.addEventListener("input", filterProducts);
categoryFilter.addEventListener("change", filterProducts);

function filterProducts() {
  const search = searchInput1.value.toLowerCase().trim();
  const category = categoryFilter.value;

  const filtered = products.filter((product) => {
    const matchesSearch =
      (product.name || "").toLowerCase().includes(search) ||
      (product.category || "").toLowerCase().includes(search) ||
      (product.description || "").toLowerCase().includes(search);

    const matchesCategory = category === "all" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  renderProducts(filtered);
}

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
          : ["https://via.placeholder.com/700x900?text=Rodama"];

    const sizes = Array.isArray(product.sizes)
      ? product.sizes.filter(Boolean)
      : [];
    const carouselId = `productCarousel${index}`;

    const indicators =
      images.length > 1
        ? `
        <div class="carousel-indicators">
          ${images
            .map(
              (_, imgIndex) => `
            <button
              type="button"
              data-bs-target="#${carouselId}"
              data-bs-slide-to="${imgIndex}"
              class="${imgIndex === 0 ? "active" : ""}"
              ${imgIndex === 0 ? 'aria-current="true"' : ""}
              aria-label="Slide ${imgIndex + 1}">
            </button>
          `,
            )
            .join("")}
        </div>
      `
        : "";

    const controls =
      images.length > 1
        ? `
        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Anterior</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Siguiente</span>
        </button>
      `
        : "";

    const sizesHTML =
      product.category !== "Accesorios" && sizes.length
        ? `
          <div class="meta-block">
            <span class="meta-label">Tallas</span>
            <div class="size-list">
              ${sizes.map((size) => `<span class="size-chip">${size}</span>`).join("")}
            </div>
          </div>
        `
        : "";

    container.innerHTML += `
      <div class="col-md-6 col-lg-4">
        <article class="product-card">
          <div class="product-image-wrapper">
            <div id="${carouselId}" class="carousel slide product-carousel" data-bs-ride="false">
              ${indicators}

              <div class="carousel-inner">
                ${images
                  .map(
                    (img, imgIndex) => `
                  <div class="carousel-item ${imgIndex === 0 ? "active" : ""}">
                    <img src="${img}" alt="${product.name}">
                  </div>
                `,
                  )
                  .join("")}
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

            ${
              product.description
                ? `<p class="product-description">${product.description}</p>`
                : ""
            }

            <div class="product-meta">
              ${sizesHTML}
            </div>

            <div class="product-footer">
              <h4 class="product-price">$${Number(product.price || 0).toLocaleString()}</h4>
            </div>
          </div>
        </article>
      </div>
    `;
  });
}
