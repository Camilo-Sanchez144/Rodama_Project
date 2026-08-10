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

function normalizarCantidad(cantidad) {
  return Math.max(0, Number(cantidad) || 0);
}

function normalizarProducto(producto) {
  let imagenes = [];

  if (Array.isArray(producto.images) && producto.images.length > 0) {
    imagenes = producto.images;
  } else if (producto.image) {
    imagenes = [producto.image];
  }

  let stockPorTalla = {};

  if (producto.stockBySize && typeof producto.stockBySize === "object") {
    stockPorTalla = producto.stockBySize;
  } else if (
    producto.sizes &&
    !Array.isArray(producto.sizes) &&
    typeof producto.sizes === "object"
  ) {
    stockPorTalla = producto.sizes;
  }

  stockPorTalla = Object.entries(stockPorTalla).reduce(
    (resultado, [talla, cantidad]) => {
      resultado[talla] = normalizarCantidad(cantidad);
      return resultado;
    },
    {}
  );

  let tallas = [];

  if (Array.isArray(producto.sizes)) {
    tallas = producto.sizes.filter(Boolean);
  } else {
    tallas = Object.keys(stockPorTalla);
  }

  const tieneStockPorTalla = Object.keys(stockPorTalla).length > 0;

  const stock = tieneStockPorTalla
    ? Object.values(stockPorTalla).reduce(
        (total, cantidad) => total + normalizarCantidad(cantidad),
        0
      )
    : normalizarCantidad(producto.stock);

  return {
    ...producto,
    image:
      imagenes[0] ||
      "https://via.placeholder.com/400x500?text=Producto",
    images: imagenes,
    sizes: tallas,
    stockBySize: stockPorTalla,
    stock
  };
}

/* =========================================================
   NUEVO: helpers compartidos con el resto del sitio
   (copias locales, igual que ya hacía este archivo con
   obtenerProductos/normalizarProducto, para no depender de
   que shop-core.js esté cargado en el admin)
   ========================================================= */
function obtenerTodosPedidos() {
  try {
    return JSON.parse(localStorage.getItem("pedidos")) || [];
  } catch {
    return [];
  }
}

function obtenerUsuarios() {
  try {
    return JSON.parse(localStorage.getItem("usuarios")) || [];
  } catch {
    return [];
  }
}

function guardarUsuarios(usuarios) {
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

function formatearPrecio(valor) {
  return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function badgeEstadoPedido(estado) {
  const etiquetas = {
    confirmado: "Confirmado",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado"
  };
  return etiquetas[estado] || "Confirmado";
}

/* ===== Config de tienda (envío, descuento por registro, cupones) =====
   Misma forma y misma clave de localStorage ("configTienda") que usa
   shop-core.js, así que lo que se guarde aquí se aplica de inmediato
   en el carrito de la tienda. */
const CONFIG_PRECIOS_POR_DEFECTO = {
  DESCUENTO_REGISTRO: 0.10,
  COSTO_ENVIO: 16000,
  ENVIO_GRATIS_DESDE: 200000,
  CUPONES: {
    RODAMA10: { porcentaje: 0.10, descripcion: "10% adicional" },
    BIENVENIDO: { porcentaje: 0.05, descripcion: "5% de bienvenida" }
  }
};

function obtenerConfigTienda() {
  try {
    const guardada = JSON.parse(localStorage.getItem("configTienda"));

    if (!guardada) {
      return JSON.parse(JSON.stringify(CONFIG_PRECIOS_POR_DEFECTO));
    }

    return {
      DESCUENTO_REGISTRO:
        guardada.DESCUENTO_REGISTRO ?? CONFIG_PRECIOS_POR_DEFECTO.DESCUENTO_REGISTRO,
      COSTO_ENVIO: guardada.COSTO_ENVIO ?? CONFIG_PRECIOS_POR_DEFECTO.COSTO_ENVIO,
      ENVIO_GRATIS_DESDE:
        guardada.ENVIO_GRATIS_DESDE ?? CONFIG_PRECIOS_POR_DEFECTO.ENVIO_GRATIS_DESDE,
      CUPONES:
        guardada.CUPONES && Object.keys(guardada.CUPONES).length > 0
          ? guardada.CUPONES
          : JSON.parse(JSON.stringify(CONFIG_PRECIOS_POR_DEFECTO.CUPONES))
    };
  } catch {
    return JSON.parse(JSON.stringify(CONFIG_PRECIOS_POR_DEFECTO));
  }
}

function guardarConfigTienda(config) {
  localStorage.setItem("configTienda", JSON.stringify(config));
}

function mostrarMensajeAjuste(idElemento, mensaje, tipo) {
  const elemento = document.getElementById(idElemento);
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.className = `settings-message ${tipo}`;
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

function obtenerStockPorTalla() {
  const stockPorTalla = {};

  document.querySelectorAll(".size-stock").forEach((input) => {
    const talla = input.dataset.size;
    const cantidad = normalizarCantidad(input.value);

    input.value = cantidad;

    if (cantidad > 0) {
      stockPorTalla[talla] = cantidad;
    }
  });

  return stockPorTalla;
}

function actualizarStockGeneral() {
  if (category.value === "Accesorios") {
    stock.readOnly = false;
    stock.disabled = false;
    stock.value = normalizarCantidad(stock.value);
    return;
  }

  const stockPorTalla = obtenerStockPorTalla();

  const total = Object.values(stockPorTalla).reduce(
    (suma, cantidad) => suma + normalizarCantidad(cantidad),
    0
  );

  stock.value = total;
  stock.readOnly = true;
  stock.disabled = false;
}

function cambiarTallasPorCategoria() {
  const esAccesorio = category.value === "Accesorios";

  sizesWrapper.classList.toggle("d-none", esAccesorio);
  sizesMessage.classList.toggle("d-none", !esAccesorio);

  document.querySelectorAll(".size-stock").forEach((input) => {
    input.disabled = esAccesorio;
  });

  if (esAccesorio) {
    stock.readOnly = false;
    stock.disabled = false;
    stock.value = normalizarCantidad(stock.value);
    return;
  }

  actualizarStockGeneral();
}

function obtenerTextoStock(producto) {
  if (producto.category === "Accesorios") {
    return `General: ${producto.stock}`;
  }

  const stockPorTalla = producto.stockBySize || {};

  const texto = Object.entries(stockPorTalla)
    .filter(([, cantidad]) => normalizarCantidad(cantidad) > 0)
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

      <td>$${Number(producto.price || 0).toLocaleString("es-CO")}</td>

      <td>${obtenerTextoStock(producto)}</td>

      <td>${tallasHTML}</td>

      <td>
        <button class="btn btn-sm btn-outline-dark btn-edit" type="button">
          Editar
        </button>

        <button class="btn-delete btn-delete-product" type="button">
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
          ${indice === imagenesTemporales.length - 1 ? "disabled" : ""}
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
    input.disabled = false;
  });

  stock.value = "0";
  stock.readOnly = true;

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
  document.getElementById("description").value =
    producto.description || "";

  document.querySelectorAll(".size-stock").forEach((input) => {
    input.value = producto.stockBySize[input.dataset.size] || 0;
  });

  stock.value = producto.stock || 0;
  imagenesTemporales = [...producto.images];

  modalTitle.textContent = "Editar producto";
  saveProductBtn.textContent = "GUARDAR CAMBIOS";

  cambiarTallasPorCategoria();
  actualizarStockGeneral();
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

  if (!confirmar) {
    return;
  }

  const productos = obtenerProductos().filter((producto) => {
    return String(producto.id) !== String(id);
  });

  guardarProductos(productos);
  mostrarProductos(productos);
}

category.addEventListener("change", cambiarTallasPorCategoria);

document.querySelectorAll(".size-stock").forEach((input) => {
  input.addEventListener("input", actualizarStockGeneral);

  input.addEventListener("change", actualizarStockGeneral);
});

stock.addEventListener("input", () => {
  if (category.value === "Accesorios") {
    stock.value = normalizarCantidad(stock.value);
  }
});

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

  const stockFinal = esAccesorio
    ? normalizarCantidad(stock.value)
    : Object.values(stockPorTalla).reduce(
        (total, cantidad) => total + normalizarCantidad(cantidad),
        0
      );

  stock.value = stockFinal;

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

/* =========================================================
   NUEVO: RESUMEN
   ========================================================= */
function calcularMetricasPedidos(pedidos) {
  const pedidosValidos = pedidos.filter((pedido) => pedido.estado !== "cancelado");
  const totalVentas = pedidosValidos.reduce(
    (suma, pedido) => suma + Number(pedido.total || 0),
    0
  );
  const ticketPromedio =
    pedidosValidos.length > 0 ? totalVentas / pedidosValidos.length : 0;

  return {
    totalVentas,
    totalPedidos: pedidos.length,
    ticketPromedio
  };
}

function renderizarResumenAdmin() {
  const pedidos = obtenerTodosPedidos().sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );
  const clientes = obtenerUsuarios().filter((usuario) => usuario.rol !== "ADMIN");

  const { totalVentas, totalPedidos, ticketPromedio } = calcularMetricasPedidos(pedidos);

  const elTotalVentas = document.getElementById("resumenTotalVentas");
  const elTotalPedidos = document.getElementById("resumenTotalPedidos");
  const elTotalClientes = document.getElementById("resumenTotalClientes");
  const elTicketPromedio = document.getElementById("resumenTicketPromedio");

  if (elTotalVentas) elTotalVentas.textContent = formatearPrecio(totalVentas);
  if (elTotalPedidos) elTotalPedidos.textContent = totalPedidos;
  if (elTotalClientes) elTotalClientes.textContent = clientes.length;
  if (elTicketPromedio) elTicketPromedio.textContent = formatearPrecio(ticketPromedio);

  const contenedorRecientes = document.getElementById("resumenPedidosRecientes");
  if (!contenedorRecientes) return;

  const recientes = pedidos.slice(0, 6);

  if (recientes.length === 0) {
    contenedorRecientes.innerHTML = `<p class="text-muted">Todavía no se han registrado pedidos.</p>`;
    return;
  }

  contenedorRecientes.innerHTML = recientes
    .map((pedido) => {
      const cliente = clientes.find(
        (usuario) => String(usuario.id) === String(pedido.usuarioId)
      );
      const nombreCliente = cliente
        ? `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim()
        : "Cliente eliminado";
      const fecha = new Date(pedido.fecha).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });

      return `
        <div class="resumen-pedido-row">
          <div>
            <strong>${escaparHTML(pedido.id)}</strong>
            <span class="text-muted d-block">${escaparHTML(nombreCliente)}</span>
          </div>
          <span class="order-status order-status-${escaparHTML(pedido.estado)}">
            ${badgeEstadoPedido(pedido.estado)}
          </span>
          <span>${fecha}</span>
          <strong>${formatearPrecio(pedido.total)}</strong>
        </div>
      `;
    })
    .join("");
}

/* =========================================================
   NUEVO: CLIENTES
   ========================================================= */
function renderizarClientes(filtro = "") {
  const contenedor = document.getElementById("clientTable");
  if (!contenedor) return;

  const pedidos = obtenerTodosPedidos();
  const texto = filtro.toLowerCase().trim();

  const clientes = obtenerUsuarios()
    .filter((usuario) => usuario.rol !== "ADMIN")
    .filter((usuario) => {
      const nombre = `${usuario.nombre || ""} ${usuario.apellido || ""}`.toLowerCase();
      const correo = (usuario.correo || "").toLowerCase();
      return nombre.includes(texto) || correo.includes(texto);
    });

  if (clientes.length === 0) {
    contenedor.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4">
          No hay clientes registrados.
        </td>
      </tr>
    `;
    return;
  }

  contenedor.innerHTML = "";

  clientes.forEach((cliente) => {
    const pedidosCliente = pedidos.filter(
      (pedido) => String(pedido.usuarioId) === String(cliente.id)
    );
    const totalGastado = pedidosCliente
      .filter((pedido) => pedido.estado !== "cancelado")
      .reduce((suma, pedido) => suma + Number(pedido.total || 0), 0);

    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>
        <div class="product-name-text"></div>
        <div class="product-description-preview"></div>
      </td>
      <td class="client-email"></td>
      <td>${pedidosCliente.length}</td>
      <td>${formatearPrecio(totalGastado)}</td>
      <td>
        <button class="btn btn-sm btn-outline-dark btn-ver-pedidos" type="button">
          Ver pedidos
        </button>
      </td>
    `;

    fila.querySelector(".product-name-text").textContent =
      `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() || "Sin nombre";

    fila.querySelector(".product-description-preview").textContent =
      cliente.telefono || "Sin teléfono";

    fila.querySelector(".client-email").textContent = cliente.correo || "Sin correo";

    fila.querySelector(".btn-ver-pedidos").addEventListener("click", () => {
      mostrarPedidosDeCliente(cliente, pedidosCliente);
    });

    contenedor.appendChild(fila);
  });
}

function mostrarPedidosDeCliente(cliente, pedidosCliente) {
  const titulo = document.getElementById("clientOrdersModalTitle");
  const contenedor = document.getElementById("clientOrdersModalBody");

  const nombreCliente = `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim() || "Cliente";

  if (titulo) {
    titulo.textContent = `Pedidos de ${nombreCliente}`;
  }

  if (contenedor) {
    if (pedidosCliente.length === 0) {
      contenedor.innerHTML = `<p class="text-muted">Este cliente todavía no ha realizado compras.</p>`;
    } else {
      const pedidosOrdenados = [...pedidosCliente].sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );

      contenedor.innerHTML = pedidosOrdenados
        .map((pedido) => {
          const fecha = new Date(pedido.fecha).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "long",
            day: "numeric"
          });

          const itemsHTML = pedido.items
            .map((item) => {
              const talla =
                item.size && item.size !== "Única"
                  ? ` · Talla ${escaparHTML(item.size)}`
                  : "";

              return `
                <li>
                  <span>${escaparHTML(item.name)}${talla} · Cant. ${item.quantity}</span>
                  <span>${formatearPrecio(item.price * item.quantity)}</span>
                </li>
              `;
            })
            .join("");

          return `
            <article class="order-card">
              <header class="order-card-header">
                <div>
                  <strong>Pedido ${escaparHTML(pedido.id)}</strong>
                  <span>${fecha}</span>
                </div>
                <span class="order-status order-status-${escaparHTML(pedido.estado)}">
                  ${badgeEstadoPedido(pedido.estado)}
                </span>
              </header>

              <ul class="order-items">${itemsHTML}</ul>

              <footer class="order-card-footer">
                <span>Método de pago: ${escaparHTML(pedido.metodoPago)}</span>
                <strong>Total: ${formatearPrecio(pedido.total)}</strong>
              </footer>
            </article>
          `;
        })
        .join("");
    }
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("clientOrdersModal")
  );

  modal.show();
}

const searchClient = document.getElementById("searchClient");
if (searchClient) {
  searchClient.addEventListener("input", () => {
    renderizarClientes(searchClient.value);
  });
}

/* =========================================================
   NUEVO: AJUSTES — envío / descuento por registro
   ========================================================= */
function cargarAjustesEnvio() {
  const config = obtenerConfigTienda();

  const costoEnvio = document.getElementById("costoEnvio");
  const envioGratisDesde = document.getElementById("envioGratisDesde");
  const descuentoRegistro = document.getElementById("descuentoRegistro");

  if (costoEnvio) costoEnvio.value = config.COSTO_ENVIO;
  if (envioGratisDesde) envioGratisDesde.value = config.ENVIO_GRATIS_DESDE;
  if (descuentoRegistro) descuentoRegistro.value = Math.round(config.DESCUENTO_REGISTRO * 100);
}

const shippingForm = document.getElementById("shippingForm");
if (shippingForm) {
  shippingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const costoEnvio = normalizarCantidad(document.getElementById("costoEnvio").value);
    const envioGratisDesde = normalizarCantidad(
      document.getElementById("envioGratisDesde").value
    );
    const descuentoPorcentaje = Math.min(
      100,
      normalizarCantidad(document.getElementById("descuentoRegistro").value)
    );

    const config = obtenerConfigTienda();
    config.COSTO_ENVIO = costoEnvio;
    config.ENVIO_GRATIS_DESDE = envioGratisDesde;
    config.DESCUENTO_REGISTRO = descuentoPorcentaje / 100;

    guardarConfigTienda(config);

    mostrarMensajeAjuste(
      "shippingMessage",
      "Los cambios se guardaron y ya aplican en el carrito de la tienda.",
      "success"
    );
  });
}

/* =========================================================
   NUEVO: AJUSTES — cupones
   ========================================================= */
function renderizarCupones() {
  const contenedor = document.getElementById("couponsList");
  if (!contenedor) return;

  const config = obtenerConfigTienda();
  const codigos = Object.keys(config.CUPONES);

  if (codigos.length === 0) {
    contenedor.innerHTML = `<div class="coupons-empty">No hay cupones activos todavía.</div>`;
    return;
  }

  contenedor.innerHTML = codigos
    .map((codigo) => {
      const cupon = config.CUPONES[codigo];
      return `
        <div class="coupon-item" data-codigo="${escaparHTML(codigo)}">
          <div class="coupon-item-info">
            <strong>${escaparHTML(codigo)}</strong>
            <span>${escaparHTML(cupon.descripcion)} · ${Math.round(cupon.porcentaje * 100)}%</span>
          </div>
          <button type="button" class="btn-delete btn-eliminar-cupon">Eliminar</button>
        </div>
      `;
    })
    .join("");

  contenedor.querySelectorAll(".btn-eliminar-cupon").forEach((boton) => {
    boton.addEventListener("click", () => {
      const item = boton.closest(".coupon-item");
      const codigo = item.dataset.codigo;

      const configActual = obtenerConfigTienda();
      delete configActual.CUPONES[codigo];
      guardarConfigTienda(configActual);

      renderizarCupones();
    });
  });
}

const couponForm = document.getElementById("couponForm");
if (couponForm) {
  couponForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const codigo = document.getElementById("couponCode").value.trim().toUpperCase();
    const porcentaje = Number(document.getElementById("couponPercent").value);
    const descripcion = document.getElementById("couponDescription").value.trim();

    if (!codigo || !descripcion || !porcentaje || porcentaje <= 0 || porcentaje > 100) {
      mostrarMensajeAjuste(
        "couponMessageAdmin",
        "Revisa el código, el porcentaje (1-100) y la descripción.",
        "error"
      );
      return;
    }

    const config = obtenerConfigTienda();
    config.CUPONES[codigo] = { porcentaje: porcentaje / 100, descripcion };
    guardarConfigTienda(config);

    couponForm.reset();
    mostrarMensajeAjuste("couponMessageAdmin", `Cupón "${codigo}" guardado.`, "success");
    renderizarCupones();
  });
}

/* =========================================================
   NUEVO: AJUSTES — cuenta del administrador
   ========================================================= */
function cargarPerfilAdmin() {
  const usuario = obtenerUsuarioActivo();
  if (!usuario) return;

  const nombre = document.getElementById("adminNombre");
  const apellido = document.getElementById("adminApellido");
  const correo = document.getElementById("adminCorreo");

  if (nombre) nombre.value = usuario.nombre || "";
  if (apellido) apellido.value = usuario.apellido || "";
  if (correo) correo.value = usuario.correo || "";
}

const adminProfileForm = document.getElementById("adminProfileForm");
if (adminProfileForm) {
  adminProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nombre = document.getElementById("adminNombre").value.trim();
    const apellido = document.getElementById("adminApellido").value.trim();
    const correo = document.getElementById("adminCorreo").value.trim().toLowerCase();
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!nombre || !correo || !correoValido.test(correo)) {
      mostrarMensajeAjuste(
        "adminProfileMessage",
        "Ingresa un nombre y un correo válido.",
        "error"
      );
      return;
    }

    const usuarioActivoActual = obtenerUsuarioActivo();
    const usuarios = obtenerUsuarios();

    const correoEnUso = usuarios.some(
      (usuario) =>
        String(usuario.id) !== String(usuarioActivoActual.id) &&
        (usuario.correo || "").toLowerCase() === correo
    );

    if (correoEnUso) {
      mostrarMensajeAjuste(
        "adminProfileMessage",
        "Ese correo ya está en uso por otra cuenta.",
        "error"
      );
      return;
    }

    const usuarioActualizado = { ...usuarioActivoActual, nombre, apellido, correo };
    const posicion = usuarios.findIndex(
      (usuario) => String(usuario.id) === String(usuarioActivoActual.id)
    );

    if (posicion === -1) usuarios.push(usuarioActualizado);
    else usuarios[posicion] = usuarioActualizado;

    guardarUsuarios(usuarios);
    localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActualizado));

    mostrarMensajeAjuste("adminProfileMessage", "Tus datos se guardaron correctamente.", "success");
  });
}

const adminPasswordForm = document.getElementById("adminPasswordForm");
if (adminPasswordForm) {
  adminPasswordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const actual = document.getElementById("adminCurrentPassword").value;
    const nueva = document.getElementById("adminNewPassword").value;
    const confirmar = document.getElementById("adminConfirmPassword").value;

    const usuarioActivoActual = obtenerUsuarioActivo();

    if (actual !== usuarioActivoActual.password) {
      mostrarMensajeAjuste("adminPasswordMessage", "La contraseña actual no es correcta.", "error");
      return;
    }

    if (!nueva || nueva.length < 8) {
      mostrarMensajeAjuste(
        "adminPasswordMessage",
        "La nueva contraseña debe tener al menos 8 caracteres.",
        "error"
      );
      return;
    }

    if (nueva !== confirmar) {
      mostrarMensajeAjuste("adminPasswordMessage", "Las contraseñas no coinciden.", "error");
      return;
    }

    const usuarios = obtenerUsuarios();
    const usuarioActualizado = { ...usuarioActivoActual, password: nueva };
    const posicion = usuarios.findIndex(
      (usuario) => String(usuario.id) === String(usuarioActivoActual.id)
    );

    if (posicion === -1) usuarios.push(usuarioActualizado);
    else usuarios[posicion] = usuarioActualizado;

    guardarUsuarios(usuarios);
    localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActualizado));

    adminPasswordForm.reset();
    mostrarMensajeAjuste(
      "adminPasswordMessage",
      "Tu contraseña se actualizó correctamente.",
      "success"
    );
  });
}

/* =========================================================
   NAVEGACIÓN DEL SIDEBAR
   ========================================================= */
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

    // Refresca los datos de la sección al entrar, por si cambiaron
    // en otra pestaña (nuevo pedido, nuevo cliente, etc.)
    if (seccion === "resumen") renderizarResumenAdmin();
    if (seccion === "clientes") renderizarClientes();
    if (seccion === "ajustes") {
      cargarAjustesEnvio();
      renderizarCupones();
      cargarPerfilAdmin();
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
renderizarResumenAdmin();
renderizarClientes();
cargarAjustesEnvio();
renderizarCupones();
cargarPerfilAdmin();
