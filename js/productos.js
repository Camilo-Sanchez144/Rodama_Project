const container = document.getElementById("productContainer");
const searchInput1 = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

// =========================
// PRODUCTOS BASE (5)
// =========================
const baseProducts = [
  {
    name: "Camisa básica",
    price: 30000,
    category: "Camisas",
    stock: 10,
    image: "https://i.pinimg.com/736x/01/2e/9e/012e9e3d16c6a82237727731187d35ad.jpg",
    images: [],
    sizes: ["S", "M"],
    description: "Camisa cómoda"
  },
  {
    name: "Jean clásico",
    price: 80000,
    category: "Pantalones",
    stock: 5,
    image: "https://i.pinimg.com/1200x/b6/18/f2/b618f234546cfa6940844695f0db03fa.jpg",
    images: [],
    sizes: ["M", "L"],
    description: "Jean azul clásico"
  },
  {
    name: "Vestido elegante",
    price: 120000,
    category: "Vestidos",
    stock: 8,
    image: "https://i.pinimg.com/736x/7d/31/eb/7d31ebec410c273fd0eed10cf699cab8.jpg",
    images: [],
    sizes: ["S", "M", "L"],
    description: "Ideal para ocasiones especiales"
  },
  {
    name: "Gorra urbana",
    price: 25000,
    category: "Accesorios",
    stock: 15,
    image: "https://i.pinimg.com/736x/62/b1/e7/62b1e795576cb923e002ee4e99d9c490.jpg",
    images: [],
    sizes: [],
    description: "Estilo casual urbano"
  },
  {
    name: "Falda moderna",
    price: 70000,
    category: "Faldas",
    stock: 6,
    image: "https://i.pinimg.com/736x/8a/e4/54/8ae454aa7836dd2ec3b50263b6280683.jpg",
    images: [],
    sizes: ["S", "M"],
    description: "Falda versátil y moderna"
  }
];

// =========================
// OBTENER PRODUCTOS (BASE + LOCALSTORAGE)
// =========================
function getProducts() {
  const stored = JSON.parse(localStorage.getItem("products")) || [];
  return [...baseProducts, ...stored];
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

  const products = getProducts(); // 🔥 SIEMPRE actualizado

  const filtered = products.filter((product) => {
    const matchesSearch =
      (product.name || "").toLowerCase().includes(search) ||
      (product.category || "").toLowerCase().includes(search) ||
      (product.description || "").toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || product.category === category;

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
          `
          )
          .join("")}
        </div>
      `
        : "";

    const controls =
      images.length > 1
        ? `
        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon"></span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
          <span class="carousel-control-next-icon"></span>
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
            <div id="${carouselId}" class="carousel slide product-carousel">
              ${indicators}

              <div class="carousel-inner">
                ${images
        .map(
          (img, imgIndex) => `
                  <div class="carousel-item ${imgIndex === 0 ? "active" : ""}">
                    <img src="${img}" alt="${product.name}">
                  </div>
                `
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

            ${product.description
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