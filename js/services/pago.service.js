/* =========================================================
   PAGO SERVICE — CRUD de pagos contra el backend
   Requiere: api.service.js, api.config.js
   ========================================================= */

const PagoService = (() => {
  const EP = API_CONFIG.ENDPOINTS;

  /** GET /api/pago — Todos los pagos (Admin) */
  async function getAll() {
    return ApiService.get(EP.PAGO);
  }

  /** GET /api/pago/{id} */
  async function getById(id) {
    return ApiService.get(EP.PAGO_POR_ID(id));
  }

  /**
   * POST /api/pago — Registrar un pago.
   * Ajusta los campos según tu entidad Pago en el backend.
   *
   * Estructura sugerida:
   * {
   *   pedidoId: number|string,
   *   usuarioId: number|string,
   *   monto: number,
   *   metodoPago: string,
   *   referencia: string,   // número de comprobante / número Nequi
   *   estado: "PENDIENTE" | "VERIFICADO"
   * }
   */
  async function registrar(datos) {
    return ApiService.post(EP.PAGO, datos);
  }

  /**
   * Construye el objeto pago a registrar en el backend.
   * @param {object} pedido - El pedido ya guardado (con su id del backend)
   * @param {object} usuario - Usuario activo
   * @param {string} metodoPago - 'nequi' | 'transferencia' | 'contraentrega'
   * @param {string} referencia - Número de comprobante o datos extra
   */
  function buildFromPedido(pedido, usuario, metodoPago, referencia = "") {
    return {
      pedidoId: pedido.id,
      usuarioId: usuario.id,
      monto: pedido.total,
      metodoPago: metodoPago,
      referencia: referencia,
      estado: metodoPago === "contraentrega" ? "PENDIENTE" : "EN_VERIFICACION",
    };
  }

  return { getAll, getById, registrar, buildFromPedido };
})();

window.PagoService = PagoService;
