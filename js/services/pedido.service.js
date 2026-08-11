/* =========================================================
   PEDIDO SERVICE — CRUD de pedidos contra el backend
   Requiere: api.service.js, api.config.js
   ========================================================= */

const PedidoService = (() => {
  const EP = API_CONFIG.ENDPOINTS;

  /** GET /api/pedido — Todos los pedidos (Admin) */
  async function getAll() {
    return ApiService.get(EP.PEDIDO);
  }

  /** GET /api/pedido/{id} */
  async function getById(id) {
    return ApiService.get(EP.PEDIDO_POR_ID(id));
  }

  /**
   * POST /api/pedido — Crear un pedido nuevo.
   * El cuerpo debe incluir los campos que espera tu Spring Boot.
   * Ajusta según tu entidad Pedido en el backend.
   *
   * Estructura sugerida:
   * {
   *   usuarioId: number,
   *   items: [{ productoId, nombre, talla, cantidad, precio }],
   *   total: number,
   *   metodoPago: string,
   *   direccionEntrega: string,
   *   estado: "CONFIRMADO"
   * }
   */
  async function crear(datos) {
    return ApiService.post(EP.PEDIDO, datos);
  }

  /** DELETE /api/pedido/{id} (Admin) */
  async function eliminar(id) {
    return ApiService.del(EP.PEDIDO_POR_ID(id));
  }

  /**
   * Construye el objeto pedido a partir del carrito actual y el usuario.
   * Úsalo en pago.js antes de llamar a crear().
   */
  function buildFromCarrito(compraPendiente, usuario, metodoPago) {
    return {
      usuarioId: usuario.id,
      items: compraPendiente.items.map((item) => ({
        productoId: item.productId || item.id,
        nombre: item.name,
        talla: item.size || "Única",
        cantidad: item.quantity,
        precio: item.price,
      })),
      subtotal: compraPendiente.subtotal,
      descuentoRegistro: compraPendiente.descuentoRegistro || 0,
      descuentoCupon: compraPendiente.descuentoCupon || 0,
      costoEnvio: compraPendiente.envio || 0,
      total: compraPendiente.total,
      metodoPago: metodoPago,
      estado: "CONFIRMADO",
    };
  }

  return { getAll, getById, crear, eliminar, buildFromCarrito };
})();

window.PedidoService = PedidoService;
