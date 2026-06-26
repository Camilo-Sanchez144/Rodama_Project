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
const menuItems = document.querySelectorAll('.menu li');
const sections = document.querySelectorAll('.section');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const hamburger = document.getElementById('hamburger');

renderProducts(products);
toggleSizesByCategory();

categorySelect.addEventListener("change", toggleSizesByCategory);
searchInput.addEventListener("input", handleSearch);
imageFilesInput.addEventListener("change", renderPreview);

(function initSection() {
    const activeItem = document.querySelector('.menu li.active');
    if (activeItem) {
        const target = activeItem.dataset.section;
        const section = document.getElementById(`section-${target}`);
        if (section) {
            section.classList.add('active');
            requestAnimationFrame(() => section.classList.add('fade-in'));
        }
    }
})();

// =========================
// CREAR PRODUCTO
// =========================

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const category = categorySelect.value;
  const sizes = category === "Accesorios" ? [] : getSelectedSizes();
  const uploadedImages = await getImagesFromFiles(imageFilesInput.files);

  const allImages = [...uploadedImages];

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
  console.log(products)
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

function switchSection(target) {
  menuItems.forEach(i => i.classList.remove('active'));
  sections.forEach(s => {
      s.classList.remove('active', 'fade-in');
      void s.offsetWidth;
  });

  document.querySelector(`[data-section="${target}"]`).classList.add('active');
  const next = document.getElementById(`section-${target}`);
  next.classList.add('active');
  requestAnimationFrame(() => next.classList.add('fade-in'));
}

menuItems.forEach(item => {
  item.addEventListener('click', () => {
      switchSection(item.dataset.section);
      if (window.innerWidth < 992) closeSidebar();
  });
});

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
}

hamburger.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

overlay.addEventListener('click', closeSidebar);