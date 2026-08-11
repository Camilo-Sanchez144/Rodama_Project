/* =========================================================
   CART STORE — Gestión del carrito de compras local
   Toda la lógica de lectura/escritura del carrito en
   localStorage vive aquí.  Las páginas sólo llaman a estas
   funciones; no acceden a localStorage directamente.
   ========================================================= */

const CartStore = (() => {
  const CART_KEY      = "cart";
  const COUPON_KEY    = "appliedCoupon";
  const PENDING_KEY   = "compraPendiente";

  /* ---- Lectura ---- */

  function getCarrito() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getCuponAplicado() {
    try {
      return JSON.parse(localStorage.getItem(COUPON_KEY)) || null;
    } catch {
      return null;
    }
  }

  function getCompraPendiente() {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY)) || null;
    } catch {
      return null;
    }
  }

  /* ---- Escritura ---- */

  function setCarrito(carrito) {
    localStorage.setItem(CART_KEY, JSON.stringify(carrito));
    _notificarCambio();
  }

  function setCuponAplicado(cupon) {
    if (cupon) {
      localStorage.setItem(COUPON_KEY, JSON.stringify(cupon));
    } else {
      localStorage.removeItem(COUPON_KEY);
    }
  }

  function setCompraPendiente(compra) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(compra));
  }

  /* ---- Operaciones ---- */

  /** Vacía el carrito y la compra pendiente. */
  function limpiar() {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(COUPON_KEY);
    localStorage.removeItem(PENDING_KEY);
    _notificarCambio();
  }

  /**
   * Actualiza el contador del badge del carrito en el navbar.
   * Busca el elemento #cartCount en el DOM.
   */
  function actualizarContador() {
    const carrito = getCarrito();
    const total = carrito.reduce(
      (suma, item) => suma + UiUtils.normalizarCantidad(item.quantity),
      0
    );
    const el = document.getElementById("cartCount");
    if (!el) return;
    el.textContent = total;
    el.style.display = total > 0 ? "flex" : "none";
  }

  /** Agrega o incrementa un item en el carrito. */
  function agregarItem(item) {
    const carrito = getCarrito();
    // key único por producto+talla
    const key = `${item.productId || item.id}_${item.size || "Única"}`;
    const existente = carrito.find((i) => i.key === key);

    if (existente) {
      existente.quantity = UiUtils.normalizarCantidad(existente.quantity) + (item.quantity || 1);
    } else {
      carrito.push({ ...item, key, quantity: item.quantity || 1 });
    }

    setCarrito(carrito);
    return carrito;
  }

  /** Elimina un item por su key. */
  function eliminarItem(key) {
    setCarrito(getCarrito().filter((i) => i.key !== key));
  }

  /** Cambia la cantidad de un item. Si queda en 0, lo elimina. */
  function actualizarCantidad(key, nuevaCantidad) {
    const carrito = getCarrito();
    const item = carrito.find((i) => i.key === key);
    if (!item) return;

    const cantidad = UiUtils.normalizarCantidad(nuevaCantidad);
    if (cantidad <= 0) {
      eliminarItem(key);
      return;
    }
    item.quantity = cantidad;
    setCarrito(carrito);
  }

  /* ---- Notificación de cambios ---- */
  function _notificarCambio() {
    actualizarContador();
    // Dispara un evento personalizado para que otras páginas puedan escuchar
    window.dispatchEvent(new CustomEvent("carritoActualizado"));
  }

  return {
    getCarrito,
    getCuponAplicado,
    getCompraPendiente,
    setCarrito,
    setCuponAplicado,
    setCompraPendiente,
    limpiar,
    actualizarContador,
    agregarItem,
    eliminarItem,
    actualizarCantidad,
  };
})();

/* Alias global para compatibilidad con código existente */
function actualizarContadorCarrito() { CartStore.actualizarContador(); }
function obtenerCarrito()            { return CartStore.getCarrito(); }
function guardarCarrito(c)           { CartStore.setCarrito(c); }
function obtenerCompraPendiente()    { return CartStore.getCompraPendiente(); }
function guardarCompraPendiente(c)   { CartStore.setCompraPendiente(c); }
function eliminarCompraPendiente()   { CartStore.limpiar(); }
function obtenerCuponAplicado()      { return CartStore.getCuponAplicado(); }
function guardarCuponAplicado(c)     { CartStore.setCuponAplicado(c); }
function quitarCupon()               { CartStore.setCuponAplicado(null); }

window.CartStore = CartStore;
window.actualizarContadorCarrito = actualizarContadorCarrito;
window.obtenerCarrito = obtenerCarrito;
window.guardarCarrito = guardarCarrito;
window.obtenerCompraPendiente = obtenerCompraPendiente;
window.guardarCompraPendiente = guardarCompraPendiente;
window.eliminarCompraPendiente = eliminarCompraPendiente;
window.obtenerCuponAplicado = obtenerCuponAplicado;
window.guardarCuponAplicado = guardarCuponAplicado;
window.quitarCupon = quitarCupon;
window.updateCartCount = CartStore.actualizarContador;
