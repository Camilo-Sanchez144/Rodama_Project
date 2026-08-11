/* =========================================================
   SHOP-CORE.JS — Motor del carrito de compras
   Depende de: api.config.js, api.service.js, auth.service.js,
               producto.service.js, ui.utils.js, cart.store.js
   Gestiona: carrito, stock, precios, descuentos, cupones,
             renderizado de la página cart.html, checkout.
   ========================================================= */

/* =================================================================
   CONFIGURACIÓN DE PRECIOS
   (Se lee primero de configTienda en localStorage para que el admin
    pueda ajustarla sin hacer deploy)
================================================================= */
function obtenerConfigPrecios() {
  try {
    const guardada = JSON.parse(localStorage.getItem("configTienda"));
    if (guardada) return guardada;
  } catch { /* usa por defecto */ }

  return {
    DESCUENTO_REGISTRO: 0.10,
    COSTO_ENVIO: 16000,
    ENVIO_GRATIS_DESDE: 200000,
    CUPONES: {
      RODAMA10:   { porcentaje: 0.10, descripcion: "10% adicional" },
      BIENVENIDO: { porcentaje: 0.05, descripcion: "5% de bienvenida" },
    },
  };
}

const CONFIG_PRECIOS = obtenerConfigPrecios();

/* =================================================================
   ALIASES de almacenamiento (delegados a CartStore y ProductoService)
   Se mantienen como funciones globales para compatibilidad con pago.js
================================================================= */
function obtenerCarrito()         { return CartStore.getCarrito(); }
function guardarCarrito(c)        { CartStore.setCarrito(c); }
function obtenerProductos()       { return ProductoService.getCache(); }
function guardarProductos(lista)  { ProductoService.setCache(lista); }
function obtenerCuponAplicado()   { return CartStore.getCuponAplicado(); }
function guardarCuponAplicado(c)  { CartStore.setCuponAplicado(c); }
function obtenerUsuarioActivo()   { return AuthService.getUsuarioActivo(); }
function obtenerCompraPendiente() { return CartStore.getCompraPendiente(); }
function guardarCompraPendiente(c){ CartStore.setCompraPendiente(c); }
function eliminarCompraPendiente(){ CartStore.limpiar(); }
function actualizarContadorCarrito() { CartStore.actualizarContador(); }
function quitarCupon()            { CartStore.setCuponAplicado(null); }

/* =================================================================
   PEDIDOS — helpers globales para pago.js (ya usa PedidoService
   directamente, pero se conservan para compatibilidad)
================================================================= */
function generarIdPedido() {
  const fecha = Date.now().toString(36).toUpperCase();
  const azar  = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PED-${fecha}-${azar}`;
}

function etiquetaMetodoPago(metodo) {
  return { nequi: "Nequi", transferencia: "Transferencia bancaria", contraentrega: "Pago contraentrega" }[metodo] || metodo;
}

/* =================================================================
   NORMALIZACIÓN DE PRODUCTOS
================================================================= */
function normalizarProducto(producto) {
  const stockPorTallaOrig =
    producto.stockBySize &&
    typeof producto.stockBySize === "object" &&
    !Array.isArray(producto.stockBySize)
      ? producto.stockBySize
      : {};

  const sizes = Array.isArray(producto.sizes)
    ? producto.sizes.filter(Boolean)
    : Object.keys(stockPorTallaOrig);

  const stockPorTalla = [...new Set([...sizes, ...Object.keys(stockPorTallaOrig)])].reduce(
    (r, t) => { r[t] = UiUtils.normalizarCantidad(stockPorTallaOrig[t]); return r; },
    {}
  );

  const esAccesorio = (producto.category || producto.categoria) === "ACCESORIOS";
  const stock = esAccesorio
    ? UiUtils.normalizarCantidad(producto.stock)
    : Object.values(stockPorTalla).reduce((t, c) => t + c, 0);

  return { ...producto, id: producto.id || producto.name, stockBySize: stockPorTalla, stock, esAccesorio };
}

function encontrarProductoParaItem(item, productos = obtenerProductos()) {
  return productos.map(normalizarProducto).find((p) => {
    const porId   = item.productId && String(p.id) === String(item.productId);
    const porNombre = !item.productId && p.name === item.name;
    return porId || porNombre;
  });
}

function obtenerStockDisponibleItem(item, carrito = obtenerCarrito()) {
  const producto = encontrarProductoParaItem(item);
  if (!producto) return 0;

  const talla = item.size || "Única";
  const stockTalla = producto.esAccesorio
    ? producto.stock
    : UiUtils.normalizarCantidad(producto.stockBySize[talla]);

  const enOtrosItems = carrito
    .filter((oi) => oi.key !== item.key)
    .filter((oi) => {
      const mismo = String(oi.productId || "") === String(producto.id) ||
                    (!oi.productId && oi.name === producto.name);
      return mismo && String(oi.size || "Única") === talla;
    })
    .reduce((t, oi) => t + UiUtils.normalizarCantidad(oi.quantity), 0);

  return Math.max(0, stockTalla - enOtrosItems);
}

/* =================================================================
   PRICING
================================================================= */
function calcularSubtotal(carrito) {
  return carrito.reduce((t, item) => t + Number(item.price || 0) * UiUtils.normalizarCantidad(item.quantity), 0);
}

function esUsuarioRegistrado() {
  return AuthService.estaAutenticado();
}

function calcularDescuentoRegistro(subtotal) {
  return esUsuarioRegistrado() ? Math.round(subtotal * CONFIG_PRECIOS.DESCUENTO_REGISTRO) : 0;
}

function calcularEnvio(subtotal) {
  if (subtotal === 0) return 0;
  return subtotal >= CONFIG_PRECIOS.ENVIO_GRATIS_DESDE ? 0 : CONFIG_PRECIOS.COSTO_ENVIO;
}

function calcularDescuentoCupon(subtotal, cupon) {
  return cupon ? Math.round(subtotal * cupon.porcentaje) : 0;
}

function calcularTotal(subtotal, descReg, descCup, envio) {
  return Math.max(0, subtotal - descReg - descCup) + envio;
}

function mensajeEnvioGratis(subtotal) {
  if (subtotal >= CONFIG_PRECIOS.ENVIO_GRATIS_DESDE) return "¡Tu pedido tiene envío gratis!";
  return `Te faltan ${UiUtils.formatearPrecio(CONFIG_PRECIOS.ENVIO_GRATIS_DESDE - subtotal)} para envío gratis.`;
}

function aplicarCupon(codigoIngresado) {
  const codigo = String(codigoIngresado || "").trim().toUpperCase();
  if (!codigo) return { valido: false, mensaje: "Ingresa un código de cupón." };

  const cupon = CONFIG_PRECIOS.CUPONES[codigo];
  if (!cupon) return { valido: false, mensaje: "Ese cupón no existe o ya expiró." };

  CartStore.setCuponAplicado({ codigo, ...cupon });
  return { valido: true, mensaje: `Cupón "${codigo}" aplicado: ${cupon.descripcion}.`, cupon: { codigo, ...cupon } };
}

/* =================================================================
   OPERACIONES DEL CARRITO
================================================================= */
function actualizarCantidad(clave, cambio) {
  const carrito = obtenerCarrito();
  const item    = carrito.find((i) => i.key === clave);
  if (!item) return;
  aplicarNuevaCantidad(item, carrito, UiUtils.normalizarCantidad(item.quantity) + cambio);
}

function establecerCantidad(clave, deseada) {
  const carrito = obtenerCarrito();
  const item    = carrito.find((i) => i.key === clave);
  if (!item) return;
  aplicarNuevaCantidad(item, carrito, UiUtils.normalizarCantidad(deseada));
}

function aplicarNuevaCantidad(item, carrito, nuevaCantidad) {
  if (nuevaCantidad <= 0) { eliminarDelCarrito(item.key); return; }
  const disp = obtenerStockDisponibleItem(item, carrito);
  if (nuevaCantidad > disp) {
    alert(`Solo hay ${disp} disponible${disp === 1 ? "" : "s"} para esta talla.`);
    renderizarCarrito();
    return;
  }
  item.quantity = nuevaCantidad;
  guardarCarrito(carrito);
}

function eliminarDelCarrito(clave) {
  guardarCarrito(obtenerCarrito().filter((i) => i.key !== clave));
}

/* =================================================================
   RENDERIZADO DEL CARRITO
================================================================= */
function crearItemCarrito(item, carrito) {
  const producto  = encontrarProductoParaItem(item);
  const disponible = obtenerStockDisponibleItem(item, carrito);
  const cantidad  = UiUtils.normalizarCantidad(item.quantity);
  const subtotal  = Number(item.price || 0) * cantidad;
  const talla     = item.size || "Única";

  const el = document.createElement("div");
  el.className = "cart-item";
  el.innerHTML = `
    <div class="cart-item-img">
      <img src="${UiUtils.escaparHTML(item.image || "https://via.placeholder.com/110x110?text=Producto")}"
           alt="${UiUtils.escaparHTML(item.name || "Producto")}">
    </div>
    <div class="cart-item-info">
      <span class="cart-item-name">${UiUtils.escaparHTML(item.name || "Producto sin nombre")}</span>
      ${talla !== "Única" ? `<span class="cart-item-size">Talla ${UiUtils.escaparHTML(talla)}</span>` : ""}
      <span class="cart-item-price">${UiUtils.formatearPrecio(item.price)} c/u</span>
      ${!producto
        ? `<span class="cart-stock-warning">Este producto ya no está disponible.</span>`
        : cantidad > disponible
          ? `<span class="cart-stock-warning">Solo hay ${disponible} disponible${disponible === 1 ? "" : "s"} para esta selección.</span>`
          : ""}
    </div>
    <div class="cart-item-actions">
      <span class="cart-item-subtotal">${UiUtils.formatearPrecio(subtotal)}</span>
      <div class="qty-control">
        <button type="button" class="btn-decrease" aria-label="Disminuir cantidad">−</button>
        <input type="number" class="qty-input" value="${cantidad}" min="1"
               max="${Math.max(disponible, cantidad)}" aria-label="Cantidad"
               ${!producto ? "disabled" : ""}>
        <button type="button" class="btn-increase" aria-label="Aumentar cantidad"
                ${!producto || cantidad >= disponible ? "disabled" : ""}>+</button>
      </div>
      <button type="button" class="btn-remove">Eliminar</button>
    </div>
  `;

  el.querySelector(".btn-decrease").addEventListener("click", () => actualizarCantidad(item.key, -1));
  el.querySelector(".btn-increase").addEventListener("click", () => actualizarCantidad(item.key, 1));
  el.querySelector(".qty-input").addEventListener("change", (e) => establecerCantidad(item.key, e.target.value));
  el.querySelector(".btn-remove").addEventListener("click", () => eliminarDelCarrito(item.key));

  return el;
}

function renderizarResumen(carrito) {
  const subtotal          = calcularSubtotal(carrito);
  const descuentoRegistro = calcularDescuentoRegistro(subtotal);
  const cupon             = obtenerCuponAplicado();
  const descuentoCupon    = calcularDescuentoCupon(subtotal, cupon);
  const envio             = calcularEnvio(subtotal);
  const total             = calcularTotal(subtotal, descuentoRegistro, descuentoCupon, envio);

  function _set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  _set("cartSubtotal", UiUtils.formatearPrecio(subtotal));
  _set("cartTotal",    UiUtils.formatearPrecio(total));

  const filaDesc = document.getElementById("cartDiscountRow");
  if (filaDesc) {
    filaDesc.style.display = descuentoRegistro > 0 ? "flex" : "none";
    _set("cartDiscountValue", `-${UiUtils.formatearPrecio(descuentoRegistro)}`);
  }

  const filaCup = document.getElementById("cartCouponRow");
  if (filaCup) {
    filaCup.style.display = descuentoCupon > 0 ? "flex" : "none";
    _set("cartCouponLabel", `Cupón (${cupon ? cupon.codigo : ""})`);
    _set("cartCouponValue", `-${UiUtils.formatearPrecio(descuentoCupon)}`);
  }

  const cartShip = document.getElementById("cartShipping");
  if (cartShip) cartShip.textContent = envio === 0 ? "Gratis" : UiUtils.formatearPrecio(envio);

  const msgEnvio = document.getElementById("freeShippingMsg");
  if (msgEnvio) {
    msgEnvio.textContent = mensajeEnvioGratis(subtotal);
    msgEnvio.classList.toggle("free-shipping-reached", envio === 0);
  }

  const barra = document.getElementById("freeShippingBarFill");
  if (barra) barra.style.width = `${Math.min(100, (subtotal / CONFIG_PRECIOS.ENVIO_GRATIS_DESDE) * 100)}%`;

  const couponInput    = document.getElementById("couponInput");
  const btnApply       = document.getElementById("btnApplyCoupon");
  const btnRemove      = document.getElementById("btnRemoveCoupon");

  if (cupon) {
    if (couponInput)  { couponInput.value = cupon.codigo; couponInput.disabled = true; }
    if (btnApply)    btnApply.style.display  = "none";
    if (btnRemove)   btnRemove.style.display = "inline-flex";
  } else {
    if (couponInput)  couponInput.disabled   = false;
    if (btnApply)    btnApply.style.display  = "inline-flex";
    if (btnRemove)   btnRemove.style.display = "none";
  }
}

function renderizarCarrito() {
  const carrito    = obtenerCarrito();
  const contenedor = document.getElementById("cartItemsContainer");
  const resumen    = document.getElementById("cartSummary");

  if (!contenedor || !resumen) return;

  contenedor.innerHTML = "";

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="cart-empty">
        <h3>Tu carrito está vacío</h3>
        <p>Explora el catálogo y añade tus productos favoritos.</p>
      </div>
    `;
    resumen.style.display = "none";
    return;
  }

  resumen.style.display = "block";
  carrito.forEach((item) => contenedor.appendChild(crearItemCarrito(item, carrito)));
  renderizarResumen(carrito);
}

/* =================================================================
   VALIDACIÓN Y DESCUENTO DE STOCK (para checkout)
================================================================= */
function validarCarritoAntesDeCompra(carrito, productos) {
  const errores = [];
  carrito.forEach((item) => {
    const p     = encontrarProductoParaItem(item, productos);
    const talla = item.size || "Única";
    if (!p) { errores.push(`${item.name}: ya no está disponible.`); return; }
    const cant = UiUtils.normalizarCantidad(item.quantity);
    const stock = p.esAccesorio ? p.stock : UiUtils.normalizarCantidad(p.stockBySize[talla]);
    if (cant > stock) {
      errores.push(`${item.name}${talla !== "Única" ? `, talla ${talla}` : ""}: hay ${stock} disponible${stock === 1 ? "" : "s"}.`);
    }
  });
  return errores;
}

function descontarStockDeCompra(carrito, productos) {
  return productos.map((orig) => {
    const p   = normalizarProducto(orig);
    const rel = carrito.find((item) =>
      (item.productId && String(item.productId) === String(p.id)) ||
      (!item.productId && item.name === p.name)
    );
    if (!rel) return orig;

    if (p.esAccesorio) {
      const total = carrito
        .filter((item) => String(item.productId || "") === String(p.id) || (!item.productId && item.name === p.name))
        .reduce((t, item) => t + UiUtils.normalizarCantidad(item.quantity), 0);
      return { ...orig, stock: Math.max(0, p.stock - total), stockBySize: {}, sizes: [] };
    }

    const nSBT = { ...p.stockBySize };
    carrito.forEach((item) => {
      const match = (item.productId && String(item.productId) === String(p.id)) || (!item.productId && item.name === p.name);
      if (!match) return;
      const t = item.size || "Única";
      nSBT[t] = Math.max(0, UiUtils.normalizarCantidad(nSBT[t]) - UiUtils.normalizarCantidad(item.quantity));
    });
    const nStock = Object.values(nSBT).reduce((t, c) => t + UiUtils.normalizarCantidad(c), 0);
    return { ...orig, stockBySize: nSBT, sizes: Object.keys(nSBT), stock: nStock };
  });
}

/* =================================================================
   CHECKOUT → PAYMENT
================================================================= */
function finalizarCompra() {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

  const usuario = AuthService.getUsuarioActivo();
  if (!usuario) {
    alert("Debes iniciar sesión para finalizar la compra.");
    window.location.href = "login.html";
    return;
  }

  const productos = obtenerProductos();
  const errores   = validarCarritoAntesDeCompra(carrito, productos);
  if (errores.length > 0) {
    alert(`No se puede finalizar la compra:\n\n${errores.join("\n")}`);
    renderizarCarrito();
    return;
  }

  const subtotal          = calcularSubtotal(carrito);
  const descuentoRegistro = calcularDescuentoRegistro(subtotal);
  const cupon             = obtenerCuponAplicado();
  const descuentoCupon    = calcularDescuentoCupon(subtotal, cupon);
  const envio             = calcularEnvio(subtotal);
  const total             = calcularTotal(subtotal, descuentoRegistro, descuentoCupon, envio);

  CartStore.setCompraPendiente({ items: carrito, subtotal, descuentoRegistro, cupon, descuentoCupon, envio, total });
  window.location.href = "./payment.html";
}

/* =================================================================
   EVENTOS GLOBALES
================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  // Carga productos frescos del backend al abrir el carrito
  try {
    await ProductoService.cargarYCachear();
  } catch { /* usa caché */ }

  renderizarCarrito();
  CartStore.actualizarContador();

  const btnCheckout = document.getElementById("btnCheckout");
  if (btnCheckout) btnCheckout.addEventListener("click", finalizarCompra);

  const btnApply    = document.getElementById("btnApplyCoupon");
  const couponInput = document.getElementById("couponInput");
  const couponMsg   = document.getElementById("couponMessage");
  const btnRemove   = document.getElementById("btnRemoveCoupon");

  if (btnApply && couponInput) {
    btnApply.addEventListener("click", () => {
      const res = aplicarCupon(couponInput.value);
      if (couponMsg) {
        couponMsg.textContent = res.mensaje;
        couponMsg.classList.toggle("coupon-message-error",   !res.valido);
        couponMsg.classList.toggle("coupon-message-success", res.valido);
      }
      renderizarCarrito();
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener("click", () => {
      quitarCupon();
      if (couponMsg) couponMsg.textContent = "";
      renderizarCarrito();
    });
  }
});

/* Alias globales */
window.updateCartCount  = CartStore.actualizarContador;
window.updateQuantity   = actualizarCantidad;
window.setQuantity      = establecerCantidad;
window.removeFromCart   = eliminarDelCarrito;