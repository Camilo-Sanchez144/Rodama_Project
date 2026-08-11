/* =========================================================
   API SERVICE — Cliente HTTP centralizado
   Adjunta automáticamente el token JWT (Bearer) cuando
   el usuario ha iniciado sesión. Lanza errores descriptivos.
   ========================================================= */

const ApiService = (() => {
  /**
   * Obtiene el token JWT guardado en sessionStorage/localStorage.
   * auth.service.js lo almacena bajo la clave "authToken".
   */
  function _getToken() {
    return (
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("authToken") ||
      null
    );
  }

  /**
   * Construye los headers base para todas las peticiones.
   * Si hay token disponible lo incluye como Bearer.
   */
  function _buildHeaders(extraHeaders = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };

    const token = _getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Parsea la respuesta de la API y devuelve el cuerpo como objeto.
   * Si la respuesta no es OK lanza un Error con el mensaje del servidor.
   */
  async function _handleResponse(response) {
    let data = null;

    // Algunos endpoints (DELETE) devuelven 204 sin cuerpo
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      // Intenta usar el mensaje que manda Spring Boot
      const mensaje =
        data?.message ||
        data?.error ||
        `Error ${response.status}: ${response.statusText}`;
      throw new Error(mensaje);
    }

    return data;
  }

  /**
   * Realiza una petición HTTP a la API.
   *
   * @param {string} endpoint - Ruta relativa a API_CONFIG.BASE_URL
   * @param {RequestInit} options - Opciones de fetch (method, body, etc.)
   */
  async function request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    const config = {
      ...options,
      headers: _buildHeaders(options.headers || {}),
    };

    try {
      const response = await fetch(url, config);
      return await _handleResponse(response);
    } catch (error) {
      // Re-lanza el error con el mensaje que ya viene descriptivo
      throw error;
    }
  }

  // ---- Métodos convenientes ----

  /** GET /endpoint */
  function get(endpoint) {
    return request(endpoint, { method: "GET" });
  }

  /** POST /endpoint con body JSON */
  function post(endpoint, body) {
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** PUT /endpoint con body JSON */
  function put(endpoint, body) {
    return request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /** DELETE /endpoint */
  function del(endpoint) {
    return request(endpoint, { method: "DELETE" });
  }

  return { get, post, put, del, request };
})();

window.ApiService = ApiService;
