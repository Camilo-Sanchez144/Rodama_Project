/* =========================================================
   USUARIO SERVICE — CRUD de usuarios contra el backend
   Requiere: api.service.js, api.config.js
   ========================================================= */

const UsuarioService = (() => {
  const EP = API_CONFIG.ENDPOINTS;

  /** GET /api/usuario — Lista todos los usuarios (Admin) */
  async function getAll() {
    return ApiService.get(EP.USUARIO);
  }

  /** GET /api/usuario/{id} */
  async function getById(id) {
    return ApiService.get(EP.USUARIO_POR_ID(id));
  }

  /** GET /api/usuario/correo/{correo} */
  async function getByCorreo(correo) {
    return ApiService.get(EP.USUARIO_POR_CORREO(correo));
  }

  /**
   * POST /api/usuario — Registrar nuevo usuario.
   * @param {object} datos - { nombre, apellido, telefono, direccion, correo, password }
   */
  async function crear(datos) {
    return ApiService.post(EP.USUARIO, datos);
  }

  /**
   * PUT /api/usuario/{id} — Actualizar datos de un usuario.
   * @param {number|string} id
   * @param {object} datos
   */
  async function actualizar(id, datos) {
    return ApiService.put(EP.USUARIO_POR_ID(id), datos);
  }

  /** DELETE /api/usuario/{id} */
  async function eliminar(id) {
    return ApiService.del(EP.USUARIO_POR_ID(id));
  }

  return { getAll, getById, getByCorreo, crear, actualizar, eliminar };
})();

window.UsuarioService = UsuarioService;
