/* =========================================================
   CONFIGURACIÓN DE PRECIOS
   ========================================================= */
const CONFIG_PRECIOS = {
  DESCUENTO_REGISTRO: 0.10, // 10% para usuario registrado
  COSTO_ENVIO: 16000,
  ENVIO_GRATIS_DESDE: 200000,
  CUPONES: {
    RODAMA10: { porcentaje: 0.10, descripcion: "10% adicional" },
    BIENVENIDO: { porcentaje: 0.05, descripcion: "5% de bienvenida" }
  }
};

/* =========================================================
   ALMACENAMIENTO
   ========================================================= */
function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem("cart", JSON.stringify(carrito));
  renderizarCarrito();
  actualizarContadorCarrito();
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

function obtenerCuponAplicado() {
  try {
    return JSON.parse(localStorage.getItem("appliedCoupon")) || null;
  } catch {
    return null;
  }
}

function guardarCuponAplicado(cupon) {
  if (cupon) {
    localStorage.setItem("appliedCoupon", JSON.stringify(cupon));
  } else {
    localStorage.removeItem("appliedCoupon");
  }
}

/* =========================================================
   UTILIDADES
   ========================================================= */
function normalizarCantidad(cantidad) {
  return Math.max(0, Number(cantidad) || 0);
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatearPrecio(valor) {
  return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

// CORREGIDO: antes leía "currentUser" (clave que nunca se crea) y además
// tenía un fallback que forzaba `true` siempre (SIMULAR_USUARIO_REGISTRADO).
// Ahora consulta la sesión real que guarda login.js/script.js: "usuarioActivo".
function esUsuarioRegistrado() {
  try {
    return Boolean(JSON.parse(localStorage.getItem("usuarioActivo")));
  } catch {
    return false;
  }
}

/* =========================================================
   PRODUCTOS / STOCK
   ========================================================= */
function normalizarProducto(producto) {
  const stockPorTallaOriginal =
    producto.stockBySize &&
    typeof producto.stockBySize === "object" &&
    !Array.isArray(producto.stockBySize)
      ? producto.stockBySize
      : {};

  const tallas = Array.isArray(producto.sizes)
    ? producto.sizes.filter(Boolean)
    : Object.keys(stockPorTallaOriginal);

  const stockPorTalla = [...new Set([
    ...tallas,
    ...Object.keys(stockPorTallaOriginal)
  ])].reduce((resultado, talla) => {
    resultado[talla] = normalizarCantidad(stockPorTallaOriginal[talla]);
    return resultado;
  }, {});

  const esAccesorio = producto.category === "Accesorios";

  const stock = esAccesorio
    ? normalizarCantidad(producto.stock)
    : Object.values(stockPorTalla).reduce(
          (total, cantidad) => total + cantidad,
          0
      );

  const imagenes =
    Array.isArray(producto.images) && producto.images.length > 0
        ? producto.images
        : producto.image
            ? [producto.image]
            : ["https://via.placeholder.com/700x900?text=Producto"];

  return {
    ...producto,
    id: producto.id || producto.name,
    images: imagenes,
    image: imagenes[0],
    stockBySize: stockPorTalla,
    stock,
    esAccesorio
};
}
function encontrarProductoParaItem(item, productos = obtenerProductos()) {
  return productos
    .map(normalizarProducto)
    .find((producto) => {
      const coincideId =
        item.productId &&
        String(producto.id) === String(item.productId);

      const coincideProductoAnterior =
        !item.productId &&
        producto.name === item.name;

      return coincideId || coincideProductoAnterior;
    });
}

function obtenerStockDisponibleItem(item, carrito = obtenerCarrito()) {
  const producto = encontrarProductoParaItem(item);

  if (!producto) {
    return 0;
  }

  const talla = item.size || "Única";

  const stockDeLaTalla = producto.esAccesorio
    ? producto.stock
    : normalizarCantidad(producto.stockBySize[talla]);

  const cantidadDeOtrosItems = carrito
    .filter((otroItem) => otroItem.key !== item.key)
    .filter((otroItem) => {
      const mismoProducto =
        String(otroItem.productId || "") === String(producto.id) ||
        (!otroItem.productId && otroItem.name === producto.name);

      return mismoProducto && String(otroItem.size || "Única") === talla;
    })
    .reduce((total, otroItem) => total + normalizarCantidad(otroItem.quantity), 0);

  return Math.max(0, stockDeLaTalla - cantidadDeOtrosItems);
}

/* =========================================================
   PRICING: subtotal, descuento, envío, cupón, total
   ========================================================= */
function calcularSubtotal(carrito) {
  return carrito.reduce((total, item) => {
    return total + Number(item.price || 0) * normalizarCantidad(item.quantity);
  }, 0);
}

function calcularDescuentoRegistro(subtotal) {
  return esUsuarioRegistrado()
    ? Math.round(subtotal * CONFIG_PRECIOS.DESCUENTO_REGISTRO)
    : 0;
}

function calcularEnvio(subtotal) {
  if (subtotal === 0) return 0;
  return subtotal >= CONFIG_PRECIOS.ENVIO_GRATIS_DESDE
    ? 0
    : CONFIG_PRECIOS.COSTO_ENVIO;
}

function aplicarCupon(codigoIngresado) {
  const codigo = String(codigoIngresado || "").trim().toUpperCase();

  if (!codigo) {
    return { valido: false, mensaje: "Ingresa un código de cupón." };
  }

  const cuponEncontrado = CONFIG_PRECIOS.CUPONES[codigo];

  if (!cuponEncontrado) {
    return { valido: false, mensaje: "Ese cupón no existe o ya expiró." };
  }

  const cupon = { codigo, ...cuponEncontrado };
  guardarCuponAplicado(cupon);

  return {
    valido: true,
    mensaje: `Cupón "${codigo}" aplicado: ${cuponEncontrado.descripcion}.`,
    cupon
  };
}

function quitarCupon() {
  guardarCuponAplicado(null);
}

function calcularDescuentoCupon(subtotal, cupon) {
  if (!cupon) return 0;
  return Math.round(subtotal * cupon.porcentaje);
}

function calcularTotal(subtotal, descuentoRegistro, descuentoCupon, envio) {
  const baseConDescuentos = Math.max(0, subtotal - descuentoRegistro - descuentoCupon);
  return baseConDescuentos + envio;
}

function mensajeEnvioGratis(subtotal) {
  if (subtotal >= CONFIG_PRECIOS.ENVIO_GRATIS_DESDE) {
    return "¡Tu pedido tiene envío gratis!";
  }

  const faltante = CONFIG_PRECIOS.ENVIO_GRATIS_DESDE - subtotal;
  return `Te faltan ${formatearPrecio(faltante)} para envío gratis.`;
}

/* =========================================================
   CANTIDAD
   ========================================================= */
function actualizarCantidad(clave, cambio) {
  const carrito = obtenerCarrito();
  const item = carrito.find((producto) => producto.key === clave);

  if (!item) return;

  const nuevaCantidad = normalizarCantidad(item.quantity) + cambio;
  aplicarNuevaCantidad(item, carrito, nuevaCantidad);
}

function establecerCantidad(clave, cantidadDeseada) {
  const carrito = obtenerCarrito();
  const item = carrito.find((producto) => producto.key === clave);

  if (!item) return;

  aplicarNuevaCantidad(item, carrito, normalizarCantidad(cantidadDeseada));
}

function aplicarNuevaCantidad(item, carrito, nuevaCantidad) {
  if (nuevaCantidad <= 0) {
    eliminarDelCarrito(item.key);
    return;
  }

  const disponible = obtenerStockDisponibleItem(item, carrito);

  if (nuevaCantidad > disponible) {
    alert(
      `No puedes agregar más unidades. Solo hay ${disponible} disponible${
        disponible === 1 ? "" : "s"
      } para esta talla.`
    );
    renderizarCarrito();
    return;
  }

  item.quantity = nuevaCantidad;
  guardarCarrito(carrito);
}

function eliminarDelCarrito(clave) {
  const carrito = obtenerCarrito().filter((item) => item.key !== clave);
  guardarCarrito(carrito);
}

function actualizarContadorCarrito() {
  const carrito = obtenerCarrito();

  const totalItems = carrito.reduce((total, item) => {
    return total + normalizarCantidad(item.quantity);
  }, 0);

  const cartCount = document.getElementById("cartCount");

  if (!cartCount) return;

  cartCount.textContent = totalItems;
  cartCount.style.display = totalItems > 0 ? "flex" : "none";
}

/* =========================================================
   RENDER: ítems del carrito
   ========================================================= */
function crearItemCarrito(item, carrito) {
  const producto = encontrarProductoParaItem(item);
  const disponible = obtenerStockDisponibleItem(item, carrito);
  const cantidad = normalizarCantidad(item.quantity);
  const subtotal = Number(item.price || 0) * cantidad;
  const talla = item.size || "Única";

  const elemento = document.createElement("div");
  elemento.className = "cart-item";

  elemento.innerHTML = `
    <div class="cart-item-img">
      <img
    src="${escaparHTML(
        (producto && producto.image) ||
        item.image ||
        "https://via.placeholder.com/110x110?text=Producto"
    )}"
    alt="${escaparHTML(item.name || "Producto")}"
    > 
    </div>

    <div class="cart-item-info">
      <span class="cart-item-name">
        ${escaparHTML(item.name || "Producto sin nombre")}
      </span>

      ${
        talla !== "Única"
          ? `<span class="cart-item-size">Talla ${escaparHTML(talla)}</span>`
          : ""
      }

      <span class="cart-item-price">
        ${formatearPrecio(item.price)} c/u
      </span>

      ${
        !producto
          ? `<span class="cart-stock-warning">Este producto ya no está disponible.</span>`
          : cantidad > disponible
            ? `
              <span class="cart-stock-warning">
                Solo hay ${disponible} disponible${
                  disponible === 1 ? "" : "s"
                } para esta selección.
              </span>
            `
            : ""
      }
    </div>

    <div class="cart-item-actions">
      <span class="cart-item-subtotal">
        ${formatearPrecio(subtotal)}
      </span>

      <div class="qty-control">
        <button type="button" class="btn-decrease" aria-label="Disminuir cantidad">−</button>

        <input
          type="number"
          class="qty-input"
          value="${cantidad}"
          min="1"
          max="${Math.max(disponible, cantidad)}"
          aria-label="Cantidad"
          ${!producto ? "disabled" : ""}
        >

        <button
          type="button"
          class="btn-increase"
          aria-label="Aumentar cantidad"
          ${!producto || cantidad >= disponible ? "disabled" : ""}
        >
          +
        </button>
      </div>

      <button type="button" class="btn-remove">Eliminar</button>
    </div>
  `;

  elemento.querySelector(".btn-decrease").addEventListener("click", () => {
    actualizarCantidad(item.key, -1);
  });

  elemento.querySelector(".btn-increase").addEventListener("click", () => {
    actualizarCantidad(item.key, 1);
  });

  elemento.querySelector(".qty-input").addEventListener("change", (evento) => {
    establecerCantidad(item.key, evento.target.value);
  });

  elemento.querySelector(".btn-remove").addEventListener("click", () => {
    eliminarDelCarrito(item.key);
  });

  return elemento;
}

/* =========================================================
   RENDER: resumen de compra
   ========================================================= */
function renderizarResumen(carrito) {
  const subtotal = calcularSubtotal(carrito);
  const descuentoRegistro = calcularDescuentoRegistro(subtotal);
  const cupon = obtenerCuponAplicado();
  const descuentoCupon = calcularDescuentoCupon(subtotal, cupon);
  const envio = calcularEnvio(subtotal);
  const total = calcularTotal(subtotal, descuentoRegistro, descuentoCupon, envio);

  document.getElementById("cartSubtotal").textContent = formatearPrecio(subtotal);

  const filaDescuentoRegistro = document.getElementById("cartDiscountRow");
  if (filaDescuentoRegistro) {
    filaDescuentoRegistro.style.display = descuentoRegistro > 0 ? "flex" : "none";
    document.getElementById("cartDiscountValue").textContent =
      `-${formatearPrecio(descuentoRegistro)}`;
  }

  const filaCupon = document.getElementById("cartCouponRow");
  if (filaCupon) {
    filaCupon.style.display = descuentoCupon > 0 ? "flex" : "none";
    document.getElementById("cartCouponLabel").textContent =
      `Cupón (${cupon ? cupon.codigo : ""})`;
    document.getElementById("cartCouponValue").textContent =
      `-${formatearPrecio(descuentoCupon)}`;
  }

  const cartShipping = document.getElementById("cartShipping");
  if (cartShipping) {
    cartShipping.textContent = envio === 0 ? "Gratis" : formatearPrecio(envio);
  }

  const mensajeEnvio = document.getElementById("freeShippingMsg");
  if (mensajeEnvio) {
    mensajeEnvio.textContent = mensajeEnvioGratis(subtotal);
    mensajeEnvio.classList.toggle("free-shipping-reached", envio === 0);
  }

  const barra = document.getElementById("freeShippingBarFill");
  if (barra) {
    const porcentaje = Math.min(
      100,
      (subtotal / CONFIG_PRECIOS.ENVIO_GRATIS_DESDE) * 100
    );
    barra.style.width = `${porcentaje}%`;
  }

  document.getElementById("cartTotal").textContent = formatearPrecio(total);

  // Estado visual del input/botón de cupón
  const couponInput = document.getElementById("couponInput");
  const btnRemoveCoupon = document.getElementById("btnRemoveCoupon");
  const btnApplyCoupon = document.getElementById("btnApplyCoupon");

  if (cupon) {
    if (couponInput) couponInput.value = cupon.codigo;
    if (couponInput) couponInput.disabled = true;
    if (btnApplyCoupon) btnApplyCoupon.style.display = "none";
    if (btnRemoveCoupon) btnRemoveCoupon.style.display = "inline-flex";
  } else {
    if (couponInput) couponInput.disabled = false;
    if (btnApplyCoupon) btnApplyCoupon.style.display = "inline-flex";
    if (btnRemoveCoupon) btnRemoveCoupon.style.display = "none";
  }
}

function renderizarCarrito() {
  const carrito = obtenerCarrito();
  const contenedor = document.getElementById("cartItemsContainer");
  const resumen = document.getElementById("cartSummary");

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

  carrito.forEach((item) => {
    contenedor.appendChild(crearItemCarrito(item, carrito));
  });

  renderizarResumen(carrito);
}

/* =========================================================
   VALIDACIÓN Y DESCUENTO DE STOCK (COMPRA)
   ========================================================= */
function validarCarritoAntesDeCompra(carrito, productos) {
  const errores = [];

  carrito.forEach((item) => {
    const producto = encontrarProductoParaItem(item, productos);
    const talla = item.size || "Única";

    if (!producto) {
      errores.push(`${item.name}: el producto ya no se encuentra disponible.`);
      return;
    }

    const cantidadSolicitada = normalizarCantidad(item.quantity);
    const stockDisponible = producto.esAccesorio
      ? producto.stock
      : normalizarCantidad(producto.stockBySize[talla]);

    if (cantidadSolicitada > stockDisponible) {
      errores.push(
        `${item.name}${
          talla !== "Única" ? `, talla ${talla}` : ""
        }: hay ${stockDisponible} disponible${stockDisponible === 1 ? "" : "s"}.`
      );
    }
  });

  return errores;
}

function descontarStockDeCompra(carrito, productos) {
  return productos.map((productoOriginal) => {
    const producto = normalizarProducto(productoOriginal);

    const itemRelacionado = carrito.find((item) => {
      const coincideId =
        item.productId && String(item.productId) === String(producto.id);
      const coincideProductoAnterior =
        !item.productId && item.name === producto.name;
      return coincideId || coincideProductoAnterior;
    });

    if (!itemRelacionado) return productoOriginal;

    if (producto.esAccesorio) {
      const cantidadComprada = carrito
        .filter((item) => {
          return (
            String(item.productId || "") === String(producto.id) ||
            (!item.productId && item.name === producto.name)
          );
        })
        .reduce((total, item) => total + normalizarCantidad(item.quantity), 0);

      return {
        ...productoOriginal,
        stock: Math.max(0, producto.stock - cantidadComprada),
        stockBySize: {},
        sizes: []
      };
    }

    const nuevoStockPorTalla = { ...producto.stockBySize };

    carrito.forEach((item) => {
      const coincideId =
        item.productId && String(item.productId) === String(producto.id);
      const coincideProductoAnterior =
        !item.productId && item.name === producto.name;

      if (!coincideId && !coincideProductoAnterior) return;

      const talla = item.size || "Única";

      nuevoStockPorTalla[talla] = Math.max(
        0,
        normalizarCantidad(nuevoStockPorTalla[talla]) -
          normalizarCantidad(item.quantity)
      );
    });

    const nuevoStockGeneral = Object.values(nuevoStockPorTalla).reduce(
      (total, cantidad) => total + normalizarCantidad(cantidad),
      0
    );

    return {
      ...productoOriginal,
      stockBySize: nuevoStockPorTalla,
      sizes: Object.keys(nuevoStockPorTalla),
      stock: nuevoStockGeneral
    };
  });
}

function finalizarCompra() {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  const usuarioActivo = obtenerUsuarioActivo();
  if (!usuarioActivo) {
    alert("Debes iniciar sesión para finalizar la compra.");
    window.location.href = "login.html";
    return;
  }

  const productos = obtenerProductos();
  const errores = validarCarritoAntesDeCompra(carrito, productos);

  if (errores.length > 0) {
    alert(
      `No se puede finalizar la compra porque el stock cambió:\n\n${errores.join("\n")}`
    );
    renderizarCarrito();
    return;
  }

  const subtotal = calcularSubtotal(carrito);
  const descuentoRegistro = calcularDescuentoRegistro(subtotal);
  const cupon = obtenerCuponAplicado();
  const descuentoCupon = calcularDescuentoCupon(subtotal, cupon);
  const envio = calcularEnvio(subtotal);
  const total = calcularTotal(subtotal, descuentoRegistro, descuentoCupon, envio);

  localStorage.setItem("compraPendiente", JSON.stringify({
    items: carrito,
    subtotal,
    descuentoRegistro,
    cupon,
    descuentoCupon,
    envio,
    total
  }));

  window.location.href = "./payment.html";
}

/* =========================================================
   EVENTOS GLOBALES
   ========================================================= */
const btnCheckout = document.getElementById("btnCheckout");
if (btnCheckout) {
  btnCheckout.addEventListener("click", finalizarCompra);
}

const btnApplyCoupon = document.getElementById("btnApplyCoupon");
const couponInput = document.getElementById("couponInput");
const couponMessage = document.getElementById("couponMessage");
const btnRemoveCoupon = document.getElementById("btnRemoveCoupon");

if (btnApplyCoupon && couponInput) {
  btnApplyCoupon.addEventListener("click", () => {
    const resultado = aplicarCupon(couponInput.value);

    if (couponMessage) {
      couponMessage.textContent = resultado.mensaje;
      couponMessage.classList.toggle("coupon-message-error", !resultado.valido);
      couponMessage.classList.toggle("coupon-message-success", resultado.valido);
    }

    renderizarCarrito();
  });
}

if (btnRemoveCoupon) {
  btnRemoveCoupon.addEventListener("click", () => {
    quitarCupon();
    if (couponMessage) {
      couponMessage.textContent = "";
      couponMessage.classList.remove("coupon-message-error", "coupon-message-success");
    }
    renderizarCarrito();
  });
}

renderizarCarrito();
actualizarContadorCarrito();

window.updateQuantity = actualizarCantidad;
window.setQuantity = establecerCantidad;
window.removeFromCart = eliminarDelCarrito;
window.updateCartCount = actualizarContadorCarrito;