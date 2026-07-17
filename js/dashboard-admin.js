function obtenerUsuarioActivo() {
  try {
    return JSON.parse(localStorage.getItem("usuarioActivo"));
  } catch {
    return null;
  }
}

const usuarioActivo = obtenerUsuarioActivo();

if (!usuarioActivo || usuarioActivo.rol !== "ADMIN") {
  alert("No tienes permisos para acceder al panel administrativo.");
  window.location.href = "login.html";
}

function logout() {
  localStorage.removeItem("usuarioActivo");
  window.location.href = "login.html";
}

function obtenerProductos() {
  try {
    return JSON.parse(localStorage.getItem("products")) || [];
  } catch {
    return [];
  }
}

function guardarProductos(productos) {
  localStorage.setItem("products", JSON.stringify(productos));
}

function normalizarProducto(producto) {
  let imagenes = [];

  if (Array.isArray(producto.images) && producto.images.length > 0) {
    imagenes = producto.images;
  } else if (producto.image) {
    imagenes = [producto.image];
  }

  let stockPorTalla = {};

  if (producto.stockBySize) {
    stockPorTalla = producto.stockBySize;
  } else if (
    producto.sizes &&
    !Array.isArray(producto.sizes) &&
    typeof producto.sizes === "object"
  ) {
    stockPorTalla = producto.sizes;
  }

  let tallas = [];

  if (Array.isArray(producto.sizes)) {
    tallas = producto.sizes;
  } else {
    tallas = Object.keys(stockPorTalla);
  }

  let stock = Number(producto.stock || 0);

  if (Object.keys(stockPorTalla).length > 0) {
    stock = Object.values(stockPorTalla).reduce((total, cantidad) => {
      return total + Number(cantidad || 0);
    }, 0);
  }

  return {
    ...producto,
    image:
      imagenes[0] ||
      "https://via.placeholder.com/400x500?text=Producto",
    images: imagenes,
    sizes: tallas,
    stockBySize: stockPorTalla,
    stock: stock
  };
}

const productForm = document.getElementById("productForm");
const productTable = document.getElementById("productTable");
const searchProduct = document.getElementById("searchProduct");
const category = document.getElementById("category");
const stock = document.getElementById("stock");
const imageFiles = document.getElementById("imageFiles");
const previewContainer = document.getElementById("previewContainer");
const sizesWrapper = document.getElementById("sizesWrapper");
const sizesMessage = document.getElementById("sizesMessage");
const modalTitle = document.getElementById("modalTitle");
const saveProductBtn = document.getElementById("saveProductBtn");
const newProductButton = document.getElementById("newProductButton");

let productoEditandoId = null;
let imagenesTemporales = [];

function cambiarTallasPorCategoria() {
  const esAccesorio = category.value === "Accesorios";

  sizesWrapper.classList.toggle("d-none", esAccesorio);
  sizesMessage.classList.toggle("d-none", !esAccesorio);

  if (esAccesorio) {
    stock.disabled = false;
  } else {
    stock.disabled = true;
    stock.value = "0";
  }
}

function obtenerStockPorTalla() {
  const stockPorTalla = {};

  document.querySelectorAll(".size-stock").forEach((input) => {
    const talla = input.dataset.size;
    const cantidad = Math.max(0, Number(input.value || 0));

    if (cantidad > 0) {
      stockPorTalla[talla] = cantidad;
    }
  });

  return stockPorTalla;
}

function obtenerTextoStock(producto) {
  if (producto.category === "Accesorios") {
    return `General: ${producto.stock}`;
  }

  const stockPorTalla = producto.stockBySize || {};

  const texto = Object.entries(stockPorTalla)
    .filter(([, cantidad]) => Number(cantidad) > 0)
    .map(([talla, cantidad]) => `${talla}: ${cantidad}`)
    .join(" · ");

  return texto || "Sin stock por talla";
}

function mostrarProductos(listaProductos = obtenerProductos()) {
  productTable.innerHTML = "";

  if (listaProductos.length === 0) {
    productTable.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          No hay productos registrados.
        </td>
      </tr>
    `;

    return;
  }

  listaProductos.forEach((productoOriginal) => {
    const producto = normalizarProducto(productoOriginal);

    const tallasHTML =
      producto.category === "Accesorios"
        ? `<span class="no-size-text">No aplica</span>`
        : producto.sizes.length > 0
          ? producto.sizes
              .map((talla) => {
                return `<span class="size-pill">${talla}</span>`;
              })
              .join(" ")
          : `<span class="no-size-text">Sin tallas</span>`;

    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>
        <img
          src="${producto.image}"
          alt="${producto.name}"
          class="product-thumb"
        >
      </td>

      <td class="product-name-cell">
        <div class="product-name-text"></div>
        <div class="product-description-preview"></div>
      </td>

      <td>
        <span class="product-category-badge"></span>
      </td>

      <td>$${Number(producto.price || 0).toLocaleString()}</td>

      <td>${obtenerTextoStock(producto)}</td>

      <td>${tallasHTML}</td>

      <td>
        <button class="btn btn-sm btn-outline-dark btn-edit">
          Editar
        </button>

        <button class="btn-delete btn-delete-product">
          Eliminar
        </button>
      </td>
    `;

    fila.querySelector(".product-name-text").textContent =
      producto.name || "Producto sin nombre";

    fila.querySelector(".product-description-preview").textContent =
      producto.description || "Sin descripción";

    fila.querySelector(".product-category-badge").textContent =
      producto.category || "Sin categoría";

    fila.querySelector(".btn-edit").addEventListener("click", () => {
      editarProducto(producto);
    });

    fila
      .querySelector(".btn-delete-product")
      .addEventListener("click", () => {
        eliminarProducto(producto.id, producto.name);
      });

    productTable.appendChild(fila);
  });
}

function renderizarImagenes() {
  previewContainer.innerHTML = "";

  imagenesTemporales.forEach((imagen, indice) => {
    const item = document.createElement("div");

    item.classList.add("preview-item");

    item.innerHTML = `
      <img src="${imagen}" alt="Imagen ${indice + 1}">

      <div class="preview-actions">
        <strong>
          ${indice === 0 ? "Principal" : `Imagen ${indice + 1}`}
        </strong>

        <button
          type="button"
          class="btn btn-sm btn-light btn-subir"
          ${indice === 0 ? "disabled" : ""}
        >
          Subir
        </button>

        <button
          type="button"
          class="btn btn-sm btn-light btn-bajar"
          ${
            indice === imagenesTemporales.length - 1
              ? "disabled"
              : ""
          }
        >
          Bajar
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline-danger btn-quitar"
        >
          Quitar
        </button>
      </div>
    `;

    item.querySelector(".btn-subir").addEventListener("click", () => {
      moverImagen(indice, -1);
    });

    item.querySelector(".btn-bajar").addEventListener("click", () => {
      moverImagen(indice, 1);
    });

    item.querySelector(".btn-quitar").addEventListener("click", () => {
      imagenesTemporales.splice(indice, 1);
      renderizarImagenes();
    });

    previewContainer.appendChild(item);
  });
}

function moverImagen(indice, direccion) {
  const nuevaPosicion = indice + direccion;

  if (
    nuevaPosicion < 0 ||
    nuevaPosicion >= imagenesTemporales.length
  ) {
    return;
  }

  const imagen = imagenesTemporales[indice];

  imagenesTemporales[indice] =
    imagenesTemporales[nuevaPosicion];

  imagenesTemporales[nuevaPosicion] = imagen;

  renderizarImagenes();
}

function convertirArchivoADataURL(archivo) {
  return new Promise((resolve) => {
    const lector = new FileReader();

    lector.onload = (evento) => {
      resolve(evento.target.result);
    };

    lector.readAsDataURL(archivo);
  });
}

function limpiarFormulario() {
  productoEditandoId = null;
  imagenesTemporales = [];

  productForm.reset();

  document.querySelectorAll(".size-stock").forEach((input) => {
    input.value = "0";
  });

  modalTitle.textContent = "Nuevo producto";
  saveProductBtn.textContent = "CREAR PRODUCTO";

  renderizarImagenes();
  cambiarTallasPorCategoria();
}

function editarProducto(productoOriginal) {
  const producto = normalizarProducto(productoOriginal);

  productoEditandoId = producto.id;

  document.getElementById("name").value = producto.name || "";
  category.value = producto.category || "";
  document.getElementById("price").value = producto.price || 0;
  stock.value = producto.stock || 0;
  document.getElementById("description").value =
    producto.description || "";

  document.querySelectorAll(".size-stock").forEach((input) => {
    input.value = producto.stockBySize[input.dataset.size] || 0;
  });

  imagenesTemporales = [...producto.images];

  modalTitle.textContent = "Editar producto";
  saveProductBtn.textContent = "GUARDAR CAMBIOS";

  cambiarTallasPorCategoria();
  renderizarImagenes();

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("productModal")
  );

  modal.show();
}

function eliminarProducto(id, nombreProducto) {
  const confirmar = confirm(
    `¿Deseas eliminar el producto "${nombreProducto}"?`
  );

  if (!confirmar) return;

  const productos = obtenerProductos().filter((producto) => {
    return String(producto.id) !== String(id);
  });

  guardarProductos(productos);
  mostrarProductos(productos);
}

category.addEventListener("change", cambiarTallasPorCategoria);

newProductButton.addEventListener("click", () => {
  limpiarFormulario();
});

imageFiles.addEventListener("change", async () => {
  const archivos = [...imageFiles.files];

  const imagenesNuevas = await Promise.all(
    archivos.map((archivo) => convertirArchivoADataURL(archivo))
  );

  imagenesTemporales.push(...imagenesNuevas);

  imageFiles.value = "";

  renderizarImagenes();
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const categoria = category.value;
  const esAccesorio = categoria === "Accesorios";
  const stockPorTalla = esAccesorio ? {} : obtenerStockPorTalla();

  let stockFinal = 0;

  if (esAccesorio) {
    stockFinal = Math.max(0, Number(stock.value || 0));
  } else {
    stockFinal = Object.values(stockPorTalla).reduce(
      (total, cantidad) => total + Number(cantidad),
      0
    );
  }

  const nuevoProducto = {
    id: productoEditandoId || `product-${Date.now()}`,
    name: document.getElementById("name").value.trim(),
    category: categoria,
    price: Number(document.getElementById("price").value),
    stock: stockFinal,
    stockBySize: stockPorTalla,
    sizes: Object.keys(stockPorTalla),
    description: document.getElementById("description").value.trim(),
    images: imagenesTemporales,
    image:
      imagenesTemporales[0] ||
      "https://via.placeholder.com/400x500?text=Producto"
  };

  let productos = obtenerProductos();

  const posicionProducto = productos.findIndex((producto) => {
    return String(producto.id) === String(nuevoProducto.id);
  });

  if (posicionProducto === -1) {
    productos.push(nuevoProducto);
  } else {
    productos[posicionProducto] = nuevoProducto;
  }

  guardarProductos(productos);
  mostrarProductos(productos);

  const modal = bootstrap.Modal.getInstance(
    document.getElementById("productModal")
  );

  if (modal) {
    modal.hide();
  }
});

searchProduct.addEventListener("input", () => {
  const texto = searchProduct.value.toLowerCase().trim();

  const productosFiltrados = obtenerProductos().filter((producto) => {
    const nombre = (producto.name || "").toLowerCase();
    const categoria = (producto.category || "").toLowerCase();

    return nombre.includes(texto) || categoria.includes(texto);
  });

  mostrarProductos(productosFiltrados);
});

const menuItems = document.querySelectorAll(".menu li");
const sections = document.querySelectorAll(".section");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const hamburger = document.getElementById("hamburger");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const seccion = item.dataset.section;

    menuItems.forEach((menu) => {
      menu.classList.remove("active");
    });

    sections.forEach((section) => {
      section.classList.remove("active", "fade-in");
    });

    item.classList.add("active");

    const seccionSeleccionada = document.getElementById(
      `section-${seccion}`
    );

    if (seccionSeleccionada) {
      seccionSeleccionada.classList.add("active");

      requestAnimationFrame(() => {
        seccionSeleccionada.classList.add("fade-in");
      });
    }

    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
  });
});

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("visible");
});

sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
});

mostrarProductos();
cambiarTallasPorCategoria();