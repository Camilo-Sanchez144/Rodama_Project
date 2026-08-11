/* =========================================================
   CART.JS — Delegación al motor shop-core.js
   Este archivo ya no contiene lógica propia: toda la
   funcionalidad del carrito vive en shop-core.js que se
   carga antes que este en cart.html.

   Si cart.html necesita comportamiento adicional específico
   de esa página (ej: animaciones, banners), agrégalo aquí.
   ========================================================= */

// shop-core.js ya se encarga de:
//   - renderizarCarrito()
//   - actualizarContadorCarrito()
//   - finalizarCompra()
//   - aplicarCupon() / quitarCupon()
//   - Todos los eventos de carrito

// No se requiere código adicional en este archivo.
// Mantenerlo vacío evita duplicación de lógica.