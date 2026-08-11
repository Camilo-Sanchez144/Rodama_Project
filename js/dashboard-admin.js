/* =========================================================
   DASHBOARD-ADMIN.JS — Panel de administración
   Depende de: api.config.js, api.service.js, auth.service.js,
               producto.service.js, usuario.service.js,
               pedido.service.js, pago.service.js, ui.utils.js
   ========================================================= */

/* ---- Guard de acceso (ROLE_ADMIN) ---- */
if (!AuthService.requiereAdmin("login.html")) {
  throw new Error("Acceso denegado");
}

/* ---- Logout ---- */
function logout() {
  AuthService.logout("login.html");
}

/* =================================================================
   ESTADO LOCAL
================================================================= */
let productoEditandoId = null;
let imagenesTemporales = [];
let productosCache     = [];
let usuariosCache      = [];
let pedidosCache       = [];
let pagosCache         = [];

/* =================================================================
   REFERENCIAS DOM — PRODUCTOS
================================================================= */
const productForm     = document.getElementById("productForm");
const productTable    = document.getElementById("productTable");
const searchProduct   = document.getElementById("searchProduct");
const categorySelect  = document.getElementById("category");
const stockInput      = document.getElementById("stock");
const imageFiles      = document.getElementById("imageFiles");
const previewContainer = document.getElementById("previewContainer");
const sizesWrapper    = document.getElementById("sizesWrapper");
const sizesMessage    = document.getElementById("sizesMessage");
const modalTitle      = document.getElementById("modalTitle");
const saveProductBtn  = document.getElementById("saveProductBtn");
const newProductButton = document.getElementById("newProductButton");

/* =================================================================
   HELPERS LOCALES
================================================================= */
function normalizarProductoAdmin(p) {
  let images = [];
  if (Array.isArray(p.images) && p.images.length > 0) images = p.images;
  else if (p.image) images = [p.image];

  let stockBySize = {};
  if (p.stockBySize && typeof p.stockBySize === "object" && !Array.isArray(p.stockBySize)) {
    stockBySize = p.stockBySize;
  }

  stockBySize = Object.entries(stockBySize).reduce((r, [t, c]) => {
    r[t] = UiUtils.normalizarCantidad(c);
    return r;
  }, {});

  const sizes = Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : Object.keys(stockBySize);
  const tieneStock = Object.keys(stockBySize).length > 0;
  const stock = tieneStock
    ? Object.values(stockBySize).reduce((t, c) => t + UiUtils.normalizarCantidad(c), 0)
    : UiUtils.normalizarCantidad(p.stock);

  return {
    ...p,
    image:  images[0] || "https://via.placeholder.com/400x500?text=Producto",
    images, sizes, stockBySize, stock,
  };
}

function obtenerStockPorTalla() {
  const result = {};
  document.querySelectorAll(".size-stock").forEach((input) => {
    const t = input.dataset.size;
    const c = UiUtils.normalizarCantidad(input.value);
    input.value = c;
    if (c > 0) result[t] = c;
  });
  return result;
}

function actualizarStockGeneral() {
  if (!categorySelect || !stockInput) return;
  if (categorySelect.value === "ACCESORIOS") {
    stockInput.readOnly = false;
    stockInput.value = UiUtils.normalizarCantidad(stockInput.value);
    return;
  }
  const total = Object.values(obtenerStockPorTalla()).reduce(
    (s, c) => s + UiUtils.normalizarCantidad(c), 0
  );
  stockInput.value = total;
  stockInput.readOnly = true;
}

function cambiarTallasPorCategoria() {
  if (!categorySelect) return;
  const esAccesorio = categorySelect.value === "ACCESORIOS";
  sizesWrapper?.classList.toggle("d-none", esAccesorio);
  sizesMessage?.classList.toggle("d-none", !esAccesorio);
  document.querySelectorAll(".size-stock").forEach((i) => { i.disabled = esAccesorio; });
  if (esAccesorio) {
    stockInput.readOnly = false;
    stockInput.value = UiUtils.normalizarCantidad(stockInput.value);
  } else {
    actualizarStockGeneral();
  }
}

function obtenerTextoStock(p) {
  if (p.category === "ACCESORIOS") return `General: ${p.stock}`;
  const texto = Object.entries(p.stockBySize || {})
    .filter(([, c]) => UiUtils.normalizarCantidad(c) > 0)
    .map(([t, c]) => `${t}: ${c}`)
    .join(" · ");
  return texto || "Sin stock";
}

function badgeEstado(estado) {
  const map = { confirmado:"Confirmado", enviado:"Enviado", entregado:"Entregado", cancelado:"Cancelado" };
  return map[(estado || "").toLowerCase()] || estado || "Confirmado";
}

/* =================================================================
   TABLA DE PRODUCTOS
================================================================= */
function mostrarProductos(lista = productosCache) {
  if (!productTable) return;
  productTable.innerHTML = "";

  if (lista.length === 0) {
    productTable.innerHTML = `<tr><td colspan="7" class="text-center py-4">No hay productos registrados.</td></tr>`;
    return;
  }

  lista.forEach((orig) => {
    const p = normalizarProductoAdmin(orig);

    const tallasHTML = p.category === "ACCESORIOS"
      ? `<span class="no-size-text">No aplica</span>`
      : p.sizes.length > 0
        ? p.sizes.map((t) => `<span class="size-pill">${t}</span>`).join(" ")
        : `<span class="no-size-text">Sin tallas</span>`;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><img src="${p.image}" alt="${p.name}" class="product-thumb"></td>
      <td class="product-name-cell">
        <div class="product-name-text"></div>
        <div class="product-description-preview"></div>
      </td>
      <td><span class="product-category-badge"></span></td>
      <td>$${Number(p.price || 0).toLocaleString("es-CO")}</td>
      <td>${obtenerTextoStock(p)}</td>
      <td>${tallasHTML}</td>
      <td>
        <button class="btn btn-sm btn-outline-dark btn-edit" type="button">Editar</button>
        <button class="btn-delete btn-delete-product" type="button">Eliminar</button>
      </td>
    `;

    fila.querySelector(".product-name-text").textContent        = p.name || "Sin nombre";
    fila.querySelector(".product-description-preview").textContent = p.description || "Sin descripción";
    fila.querySelector(".product-category-badge").textContent   = p.category || "Sin categoría";
    fila.querySelector(".btn-edit").addEventListener("click",   () => editarProducto(p));
    fila.querySelector(".btn-delete-product").addEventListener("click", () => eliminarProducto(p.id, p.name));

    productTable.appendChild(fila);
  });
}

/* =================================================================
   IMÁGENES PREVIEW
================================================================= */
function renderizarImagenes() {
  if (!previewContainer) return;
  previewContainer.innerHTML = "";

  imagenesTemporales.forEach((img, i) => {
    const item = document.createElement("div");
    item.classList.add("preview-item");
    item.innerHTML = `
      <img src="${img}" alt="Imagen ${i + 1}">
      <div class="preview-actions">
        <strong>${i === 0 ? "Principal" : `Imagen ${i + 1}`}</strong>
        <button type="button" class="btn btn-sm btn-light btn-subir" ${i === 0 ? "disabled" : ""}>Subir</button>
        <button type="button" class="btn btn-sm btn-light btn-bajar" ${i === imagenesTemporales.length - 1 ? "disabled" : ""}>Bajar</button>
        <button type="button" class="btn btn-sm btn-outline-danger btn-quitar">Quitar</button>
      </div>
    `;
    item.querySelector(".btn-subir").addEventListener("click", () => moverImagen(i, -1));
    item.querySelector(".btn-bajar").addEventListener("click", () => moverImagen(i, 1));
    item.querySelector(".btn-quitar").addEventListener("click", () => {
      imagenesTemporales.splice(i, 1);
      renderizarImagenes();
    });
    previewContainer.appendChild(item);
  });
}

function moverImagen(i, dir) {
  const np = i + dir;
  if (np < 0 || np >= imagenesTemporales.length) return;
  [imagenesTemporales[i], imagenesTemporales[np]] = [imagenesTemporales[np], imagenesTemporales[i]];
  renderizarImagenes();
}

function convertirArchivoADataURL(archivo) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target.result);
    r.readAsDataURL(archivo);
  });
}

function limpiarFormulario() {
  productoEditandoId = null;
  imagenesTemporales = [];
  productForm?.reset();
  document.querySelectorAll(".size-stock").forEach((i) => { i.value = "0"; i.disabled = false; });
  if (stockInput) { stockInput.value = "0"; stockInput.readOnly = true; }
  if (modalTitle)    modalTitle.textContent    = "Nuevo producto";
  if (saveProductBtn) saveProductBtn.textContent = "CREAR PRODUCTO";
  renderizarImagenes();
  cambiarTallasPorCategoria();
}

function editarProducto(orig) {
  const p = normalizarProductoAdmin(orig);
  productoEditandoId = p.id;

  const nameIn = document.getElementById("name");
  const priceIn = document.getElementById("price");
  const descIn  = document.getElementById("description");
  if (nameIn)       nameIn.value  = p.name || "";
  if (categorySelect) categorySelect.value = p.category || "";
  if (priceIn)      priceIn.value = p.price || 0;
  if (descIn)       descIn.value  = p.description || "";

  document.querySelectorAll(".size-stock").forEach((input) => {
    input.value = p.stockBySize[input.dataset.size] || 0;
  });

  if (stockInput) stockInput.value = p.stock || 0;
  imagenesTemporales = [...p.images];

  if (modalTitle)     modalTitle.textContent     = "Editar producto";
  if (saveProductBtn) saveProductBtn.textContent = "GUARDAR CAMBIOS";

  cambiarTallasPorCategoria();
  actualizarStockGeneral();
  renderizarImagenes();

  bootstrap.Modal.getOrCreateInstance(document.getElementById("productModal")).show();
}

async function eliminarProducto(id, nombre) {
  if (!confirm(`¿Eliminar el producto "${nombre}"?`)) return;

  try {
    await ProductoService.eliminar(id);
    productosCache = productosCache.filter((p) => String(p.id) !== String(id));
    ProductoService.setCache(productosCache);
    mostrarProductos();
    UiUtils.mostrarToast("Producto eliminado", nombre, "success");
  } catch (err) {
    UiUtils.mostrarToast("Error", err.message || "No se pudo eliminar.", "danger");
  }
}

/* =================================================================
   EVENTOS FORMULARIO PRODUCTO
================================================================= */
if (categorySelect) {
  categorySelect.addEventListener("change", cambiarTallasPorCategoria);
}

document.querySelectorAll(".size-stock").forEach((input) => {
  input.addEventListener("input",  actualizarStockGeneral);
  input.addEventListener("change", actualizarStockGeneral);
});

if (stockInput) {
  stockInput.addEventListener("input", () => {
    if (categorySelect?.value === "ACCESORIOS") {
      stockInput.value = UiUtils.normalizarCantidad(stockInput.value);
    }
  });
}

newProductButton?.addEventListener("click", limpiarFormulario);

if (imageFiles) {
  imageFiles.addEventListener("change", async () => {
    const nuevas = await Promise.all([...imageFiles.files].map(convertirArchivoADataURL));
    imagenesTemporales.push(...nuevas);
    imageFiles.value = "";
    renderizarImagenes();
  });
}

if (productForm) {
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const categoria = categorySelect?.value || "";
    const esAccesorio = categoria === "ACCESORIOS";
    const stockPorTalla = esAccesorio ? {} : obtenerStockPorTalla();
    const stockFinal = esAccesorio
      ? UiUtils.normalizarCantidad(stockInput?.value)
      : Object.values(stockPorTalla).reduce((t, c) => t + UiUtils.normalizarCantidad(c), 0);

    if (stockInput) stockInput.value = stockFinal;

    const datos = {
      name:        document.getElementById("name")?.value.trim(),
      category:    categoria,
      price:       Number(document.getElementById("price")?.value),
      stock:       stockFinal,
      stockBySize: stockPorTalla,
      sizes:       Object.keys(stockPorTalla),
      description: document.getElementById("description")?.value.trim(),
      images:      imagenesTemporales,
      image:       imagenesTemporales[0] || "https://via.placeholder.com/400x500?text=Producto",
    };

    UiUtils.setBtnLoading(saveProductBtn, true, saveProductBtn?.textContent || "Guardar");

    try {
      let guardado;
      if (productoEditandoId) {
        guardado = await ProductoService.actualizar(productoEditandoId, datos);
        productosCache = productosCache.map((p) =>
          String(p.id) === String(productoEditandoId) ? (guardado || { ...datos, id: productoEditandoId }) : p
        );
      } else {
        guardado = await ProductoService.crear(datos);
        productosCache.push(guardado || { ...datos, id: `local-${Date.now()}` });
      }

      ProductoService.setCache(productosCache);
      mostrarProductos();

      const modal = bootstrap.Modal.getInstance(document.getElementById("productModal"));
      modal?.hide();

      UiUtils.mostrarToast("Éxito", productoEditandoId ? "Producto actualizado." : "Producto creado.", "success");
    } catch (err) {
      UiUtils.mostrarToast("Error", err.message || "No se pudo guardar el producto.", "danger");
    } finally {
      UiUtils.setBtnLoading(saveProductBtn, false, productoEditandoId ? "GUARDAR CAMBIOS" : "CREAR PRODUCTO");
    }
  });
}

if (searchProduct) {
  searchProduct.addEventListener("input", () => {
    const t = searchProduct.value.toLowerCase().trim();
    mostrarProductos(productosCache.filter((p) => {
      return (p.name || "").toLowerCase().includes(t) ||
             (p.category || "").toLowerCase().includes(t);
    }));
  });
}

/* =================================================================
   RESUMEN (métricas del dashboard)
================================================================= */
async function renderizarResumenAdmin() {
  try {
    const [pedidos, usuarios, productos] = await Promise.all([
      PedidoService.getAll(),
      UsuarioService.getAll(),
      ProductoService.cargarYCachear(),
    ]);

    pedidosCache  = pedidos;
    usuariosCache = usuarios;
    productosCache = productos;

    const validos     = pedidos.filter((p) => (p.estado || "").toLowerCase() !== "cancelado");
    const totalVentas = validos.reduce((s, p) => s + Number(p.total || 0), 0);
    const clientes    = usuarios.filter((u) => u.rol !== "ROLE_ADMIN" && u.rol !== "ADMIN");
    const ticket      = validos.length > 0 ? totalVentas / validos.length : 0;

    _set("resumenTotalVentas",    UiUtils.formatearPrecio(totalVentas));
    _set("resumenTotalPedidos",   pedidos.length);
    _set("resumenTotalClientes",  clientes.length);
    _set("resumenTicketPromedio", UiUtils.formatearPrecio(ticket));

    mostrarProductos(productos);

    const cont = document.getElementById("resumenPedidosRecientes");
    if (!cont) return;

    const recientes = [...pedidos]
      .sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt))
      .slice(0, 6);

    if (recientes.length === 0) {
      cont.innerHTML = `<p class="text-muted">Todavía no se han registrado pedidos.</p>`;
      return;
    }

    cont.innerHTML = recientes.map((ped) => {
      const cli = clientes.find((u) => String(u.id) === String(ped.usuarioId));
      const nombre = cli
        ? `${cli.nombre || ""} ${cli.apellido || ""}`.trim()
        : "Cliente eliminado";
      const fecha = new Date(ped.fecha || ped.createdAt).toLocaleDateString("es-CO", {
        year: "numeric", month: "short", day: "numeric",
      });
      const estado = (ped.estado || "confirmado").toLowerCase();
      return `
        <div class="resumen-pedido-row">
          <div>
            <strong>${UiUtils.escaparHTML(String(ped.id))}</strong>
            <span class="text-muted d-block">${UiUtils.escaparHTML(nombre)}</span>
          </div>
          <span class="order-status order-status-${UiUtils.escaparHTML(estado)}">${badgeEstado(estado)}</span>
          <span>${fecha}</span>
          <strong>${UiUtils.formatearPrecio(ped.total)}</strong>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Error al cargar resumen admin:", err);
  }
}

function _set(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

/* =================================================================
   CLIENTES
================================================================= */
async function renderizarClientes(filtro = "") {
  const cont = document.getElementById("clientTable");
  if (!cont) return;

  if (usuariosCache.length === 0) {
    try {
      usuariosCache = await UsuarioService.getAll();
    } catch { usuariosCache = []; }
  }
  if (pedidosCache.length === 0) {
    try {
      pedidosCache = await PedidoService.getAll();
    } catch { pedidosCache = []; }
  }

  const texto = filtro.toLowerCase().trim();
  const clientes = usuariosCache
    .filter((u) => u.rol !== "ROLE_ADMIN" && u.rol !== "ADMIN")
    .filter((u) => {
      const nombre = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
      const correo = (u.correo || "").toLowerCase();
      return nombre.includes(texto) || correo.includes(texto);
    });

  if (clientes.length === 0) {
    cont.innerHTML = `<tr><td colspan="5" class="text-center py-4">No hay clientes registrados.</td></tr>`;
    return;
  }

  cont.innerHTML = "";
  clientes.forEach((cli) => {
    const pedidosCli = pedidosCache.filter((p) => String(p.usuarioId) === String(cli.id));
    const gastado    = pedidosCli
      .filter((p) => (p.estado || "").toLowerCase() !== "cancelado")
      .reduce((s, p) => s + Number(p.total || 0), 0);

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>
        <div class="product-name-text"></div>
        <div class="product-description-preview"></div>
      </td>
      <td class="client-email"></td>
      <td>${pedidosCli.length}</td>
      <td>${UiUtils.formatearPrecio(gastado)}</td>
      <td><button class="btn btn-sm btn-outline-dark" type="button">Ver pedidos</button></td>
    `;

    fila.querySelector(".product-name-text").textContent =
      `${cli.nombre || ""} ${cli.apellido || ""}`.trim() || "Sin nombre";
    fila.querySelector(".product-description-preview").textContent = cli.telefono || "Sin teléfono";
    fila.querySelector(".client-email").textContent = cli.correo || "Sin correo";
    fila.querySelector("button").addEventListener("click", () =>
      mostrarPedidosDeCliente(cli, pedidosCli)
    );

    cont.appendChild(fila);
  });
}

function mostrarPedidosDeCliente(cli, pedidos) {
  const titulo = document.getElementById("clientOrdersModalTitle");
  const cont   = document.getElementById("clientOrdersModalBody");
  const nombre = `${cli.nombre || ""} ${cli.apellido || ""}`.trim() || "Cliente";

  if (titulo) titulo.textContent = `Pedidos de ${nombre}`;
  if (!cont) return;

  if (pedidos.length === 0) {
    cont.innerHTML = `<p class="text-muted">Este cliente no ha realizado compras.</p>`;
  } else {
    cont.innerHTML = [...pedidos]
      .sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt))
      .map((ped) => {
        const fecha = new Date(ped.fecha || ped.createdAt).toLocaleDateString("es-CO", {
          year: "numeric", month: "long", day: "numeric",
        });
        const itemsHTML = (ped.items || []).map((item) => {
          const talla = item.talla && item.talla !== "Única" ? ` · Talla ${UiUtils.escaparHTML(item.talla)}` : "";
          return `<li>
            <span>${UiUtils.escaparHTML(item.nombre || item.name)}${talla} · Cant. ${item.cantidad || item.quantity}</span>
            <span>${UiUtils.formatearPrecio((item.precio || item.price) * (item.cantidad || item.quantity))}</span>
          </li>`;
        }).join("");
        const estado = (ped.estado || "confirmado").toLowerCase();
        return `
          <article class="order-card">
            <header class="order-card-header">
              <div>
                <strong>Pedido ${UiUtils.escaparHTML(String(ped.id))}</strong>
                <span>${fecha}</span>
              </div>
              <span class="order-status order-status-${UiUtils.escaparHTML(estado)}">${badgeEstado(estado)}</span>
            </header>
            <ul class="order-items">${itemsHTML}</ul>
            <footer class="order-card-footer">
              <span>Método: ${UiUtils.escaparHTML(ped.metodoPago || "")}</span>
              <strong>Total: ${UiUtils.formatearPrecio(ped.total)}</strong>
            </footer>
          </article>
        `;
      }).join("");
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById("clientOrdersModal")).show();
}

const searchClient = document.getElementById("searchClient");
if (searchClient) {
  searchClient.addEventListener("input", () => renderizarClientes(searchClient.value));
}

/* =================================================================
   AJUSTES — Configuración de tienda (local)
================================================================= */
const CONFIG_DEFAULTS = {
  DESCUENTO_REGISTRO: 0.10,
  COSTO_ENVIO: 16000,
  ENVIO_GRATIS_DESDE: 200000,
  CUPONES: {
    RODAMA10:   { porcentaje: 0.10, descripcion: "10% adicional" },
    BIENVENIDO: { porcentaje: 0.05, descripcion: "5% de bienvenida" },
  },
};

function obtenerConfigTienda() {
  try {
    const g = JSON.parse(localStorage.getItem("configTienda"));
    if (!g) return JSON.parse(JSON.stringify(CONFIG_DEFAULTS));
    return {
      DESCUENTO_REGISTRO:   g.DESCUENTO_REGISTRO   ?? CONFIG_DEFAULTS.DESCUENTO_REGISTRO,
      COSTO_ENVIO:          g.COSTO_ENVIO           ?? CONFIG_DEFAULTS.COSTO_ENVIO,
      ENVIO_GRATIS_DESDE:   g.ENVIO_GRATIS_DESDE    ?? CONFIG_DEFAULTS.ENVIO_GRATIS_DESDE,
      CUPONES: g.CUPONES && Object.keys(g.CUPONES).length > 0
        ? g.CUPONES
        : JSON.parse(JSON.stringify(CONFIG_DEFAULTS.CUPONES)),
    };
  } catch {
    return JSON.parse(JSON.stringify(CONFIG_DEFAULTS));
  }
}

function guardarConfigTienda(cfg) {
  localStorage.setItem("configTienda", JSON.stringify(cfg));
}

function cargarAjustesEnvio() {
  const cfg = obtenerConfigTienda();
  const ceEl  = document.getElementById("costoEnvio");
  const egEl  = document.getElementById("envioGratisDesde");
  const drEl  = document.getElementById("descuentoRegistro");
  if (ceEl)  ceEl.value  = cfg.COSTO_ENVIO;
  if (egEl)  egEl.value  = cfg.ENVIO_GRATIS_DESDE;
  if (drEl)  drEl.value  = Math.round(cfg.DESCUENTO_REGISTRO * 100);
}

const shippingForm = document.getElementById("shippingForm");
if (shippingForm) {
  shippingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const cfg = obtenerConfigTienda();
    cfg.COSTO_ENVIO        = UiUtils.normalizarCantidad(document.getElementById("costoEnvio").value);
    cfg.ENVIO_GRATIS_DESDE = UiUtils.normalizarCantidad(document.getElementById("envioGratisDesde").value);
    cfg.DESCUENTO_REGISTRO = Math.min(100, UiUtils.normalizarCantidad(document.getElementById("descuentoRegistro").value)) / 100;
    guardarConfigTienda(cfg);
    UiUtils.mostrarMensaje("shippingMessage", "Cambios guardados.", "success");
  });
}

function renderizarCupones() {
  const cont = document.getElementById("couponsList");
  if (!cont) return;
  const cfg = obtenerConfigTienda();
  const codigos = Object.keys(cfg.CUPONES);

  if (codigos.length === 0) {
    cont.innerHTML = `<div class="coupons-empty">No hay cupones activos.</div>`;
    return;
  }

  cont.innerHTML = codigos.map((cod) => {
    const c = cfg.CUPONES[cod];
    return `
      <div class="coupon-item" data-codigo="${UiUtils.escaparHTML(cod)}">
        <div class="coupon-item-info">
          <strong>${UiUtils.escaparHTML(cod)}</strong>
          <span>${UiUtils.escaparHTML(c.descripcion)} · ${Math.round(c.porcentaje * 100)}%</span>
        </div>
        <button type="button" class="btn-delete btn-eliminar-cupon">Eliminar</button>
      </div>
    `;
  }).join("");

  cont.querySelectorAll(".btn-eliminar-cupon").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cod = btn.closest(".coupon-item").dataset.codigo;
      const cfgActual = obtenerConfigTienda();
      delete cfgActual.CUPONES[cod];
      guardarConfigTienda(cfgActual);
      renderizarCupones();
    });
  });
}

const couponForm = document.getElementById("couponForm");
if (couponForm) {
  couponForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const cod  = document.getElementById("couponCode").value.trim().toUpperCase();
    const pct  = Number(document.getElementById("couponPercent").value);
    const desc = document.getElementById("couponDescription").value.trim();

    if (!cod || !desc || !pct || pct <= 0 || pct > 100) {
      UiUtils.mostrarMensaje("couponMessageAdmin", "Revisa el código, porcentaje (1–100) y descripción.", "error");
      return;
    }

    const cfg = obtenerConfigTienda();
    cfg.CUPONES[cod] = { porcentaje: pct / 100, descripcion: desc };
    guardarConfigTienda(cfg);
    couponForm.reset();
    UiUtils.mostrarMensaje("couponMessageAdmin", `Cupón "${cod}" guardado.`, "success");
    renderizarCupones();
  });
}

/* =================================================================
   AJUSTES — Perfil del admin
================================================================= */
function cargarPerfilAdmin() {
  const u = AuthService.getUsuarioActivo();
  if (!u) return;
  const nEl = document.getElementById("adminNombre");
  const aEl = document.getElementById("adminApellido");
  const cEl = document.getElementById("adminCorreo");
  if (nEl) nEl.value = u.nombre   || "";
  if (aEl) aEl.value = u.apellido || "";
  if (cEl) cEl.value = u.correo   || "";
}

const adminProfileForm = document.getElementById("adminProfileForm");
if (adminProfileForm) {
  adminProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre  = document.getElementById("adminNombre").value.trim();
    const apellido = document.getElementById("adminApellido").value.trim();
    const correo  = document.getElementById("adminCorreo").value.trim().toLowerCase();

    if (!nombre || !correo || !UiUtils.esCorreoValido(correo)) {
      UiUtils.mostrarMensaje("adminProfileMessage", "Ingresa un nombre y correo válidos.", "error");
      return;
    }

    const u = AuthService.getUsuarioActivo();
    try {
      await UsuarioService.actualizar(u.id, { nombre, apellido, correo });
      const actualizado = { ...u, nombre, apellido, correo };
      localStorage.setItem("usuarioActivo", JSON.stringify(actualizado));
      UiUtils.mostrarMensaje("adminProfileMessage", "Datos guardados.", "success");
    } catch (err) {
      UiUtils.mostrarMensaje("adminProfileMessage", err.message || "Error al guardar.", "error");
    }
  });
}

/* =================================================================
   SIDEBAR — Navegación entre secciones
================================================================= */
const menuItems = document.querySelectorAll(".menu li");
const sections  = document.querySelectorAll(".section");
const sidebar   = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const hamburger = document.getElementById("hamburger");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const seccion = item.dataset.section;

    menuItems.forEach((m) => m.classList.remove("active"));
    sections.forEach((s) => s.classList.remove("active", "fade-in"));

    item.classList.add("active");
    const secEl = document.getElementById(`section-${seccion}`);
    if (secEl) {
      secEl.classList.add("active");
      requestAnimationFrame(() => secEl.classList.add("fade-in"));
    }

    if (seccion === "resumen")   renderizarResumenAdmin();
    if (seccion === "clientes")  renderizarClientes();
    if (seccion === "ajustes")   { cargarAjustesEnvio(); renderizarCupones(); cargarPerfilAdmin(); }

    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("visible");
  });
});

hamburger?.addEventListener("click", () => {
  sidebar?.classList.toggle("open");
  sidebarOverlay?.classList.toggle("visible");
});

sidebarOverlay?.addEventListener("click", () => {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("visible");
});

/* =================================================================
   ARRANQUE
================================================================= */
(async () => {
  await renderizarResumenAdmin();
  renderizarClientes();
  cargarAjustesEnvio();
  renderizarCupones();
  cargarPerfilAdmin();
  cambiarTallasPorCategoria();
})();
