// =========================
// LOCAL STORAGE
// =========================

let products = JSON.parse(localStorage.getItem("products")) || [];

const form = document.getElementById("productForm");
const table = document.getElementById("productTable");
const searchInput = document.getElementById("searchProduct");
const categorySelect = document.getElementById("category");
const sizesWrapper = document.getElementById("sizesWrapper");
const sizesMessage = document.getElementById("sizesMessage");
const imageFilesInput = document.getElementById("imageFiles");
const imageUrlsInput = document.getElementById("imageUrls");
const previewContainer = document.getElementById("previewContainer");

renderProducts(products);
toggleSizesByCategory();

categorySelect.addEventListener("change", toggleSizesByCategory);
searchInput.addEventListener("input", handleSearch);
imageFilesInput.addEventListener("change", renderPreview);

// =========================
// CREAR PRODUCTO
// =========================

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const category = categorySelect.value;
  const sizes = category === "Accesorios" ? [] : getSelectedSizes();
  const uploadedImages = await getImagesFromFiles(imageFilesInput.files);
  const urlImages = getImagesFromUrls(imageUrlsInput.value);

  const allImages = [...uploadedImages, ...urlImages];

  const product = {
    id: Date.now(),
    name: document.getElementById("name").value.trim(),
    price: Number(document.getElementById("price").value),
    stock: Number(document.getElementById("stock").value),
    category: category,
    description: document.getElementById("description").value.trim(),
    sizes: sizes,
    image: allImages[0] || "https://via.placeholder.com/400x500?text=Rodama",
    images: allImages.length ? allImages : ["https://via.placeholder.com/400x500?text=Rodama"]
  };

  products.push(product);

  saveProducts();
  renderProducts(products);

  form.reset();
  previewContainer.innerHTML = "";
  toggleSizesByCategory();

  const modalElement = document.getElementById("productModal");
  const modal = bootstrap.Modal.getInstance(modalElement);

  if (modal) {
    modal.hide();
  }
});

// =========================
// MOSTRAR PRODUCTOS
// =========================

function renderProducts(productList) {
  table.innerHTML = "";

  if (!productList.length) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          No hay productos registrados.
        </td>
      </tr>
    `;
    return;
  }

  productList.forEach((product) => {
    const sizesHTML = product.category === "Accesorios"
      ? `<span class="no-size-text">No aplica</span>`
      : product.sizes && product.sizes.length
        ? `<div class="sizes-list-table">
            ${product.sizes.map(size => `<span class="size-pill">${size}</span>`).join("")}
          </div>`
        : `<span class="no-size-text">Sin tallas</span>`;

    table.innerHTML += `
      <tr>
        <td>
          <img
            src="${product.image}"
            alt="${product.name}"
            class="product-thumb">
        </td>

        <td class="product-name-cell">
          <div class="product-name-text">${product.name}</div>
          <div class="product-description-preview">
            ${product.description ? product.description : "Sin descripción"}
          </div>
        </td>

        <td>
          <span class="product-category-badge">
            ${product.category}
          </span>
        </td>

        <td>$${Number(product.price).toLocaleString()}</td>
        <td>${product.stock}</td>
        <td>${sizesHTML}</td>

        <td>
          <button
            class="btn-delete"
            onclick="deleteProduct(${product.id})">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });
}

// =========================
// BUSCAR
// =========================

function handleSearch() {
  const value = searchInput.value.toLowerCase().trim();

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(value) ||
    product.category.toLowerCase().includes(value)
  );

  renderProducts(filtered);
}

// =========================
// ELIMINAR
// =========================

function deleteProduct(id) {
  products = products.filter(product => product.id !== id);
  saveProducts();
  handleSearch();
}

// =========================
// GUARDAR
// =========================

function saveProducts() {
  localStorage.setItem("products", JSON.stringify(products));
}

// =========================
// TALLAS
// =========================

function toggleSizesByCategory() {
  const isAccessory = categorySelect.value === "Accesorios";

  sizesWrapper.classList.toggle("d-none", isAccessory);
  sizesMessage.classList.toggle("d-none", !isAccessory);

  if (isAccessory) {
    document.querySelectorAll(".size-check").forEach(check => {
      check.checked = false;
    });
  }
}

function getSelectedSizes() {
  return [...document.querySelectorAll(".size-check:checked")].map(input => input.value);
}

// =========================
// IMÁGENES
// =========================

function getImagesFromUrls(text) {
  return text
    .split("\n")
    .map(url => url.trim())
    .filter(url => url !== "");
}

function getImagesFromFiles(files) {
  return Promise.all(
    [...files].map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    })
  );
}

function renderPreview() {
  previewContainer.innerHTML = "";

  const files = [...imageFilesInput.files];

  files.forEach(file => {
    const reader = new FileReader();

    reader.onload = function (e) {
      previewContainer.innerHTML += `
        <div class="preview-item">
          <img src="${e.target.result}" alt="preview">
        </div>
      `;
    };

    reader.readAsDataURL(file);
  });
}