
/* =========================================================
   AUTH SERVICE — Autenticación y control de sesión
   Gestiona el token JWT, el usuario activo y el control de
   acceso por rol (ROLE_ADMIN / ROLE_USER).
   ========================================================= */

const AuthService = (() => {
  const STORAGE_TOKEN = "authToken";
  const STORAGE_USUARIO = "usuarioActivo";

  /* ---- Acceso a sesión ---- */

  function getToken() {
    return (
      sessionStorage.getItem(STORAGE_TOKEN) ||
      localStorage.getItem(STORAGE_TOKEN) ||
      null
    );
  }

  function getUsuarioActivo() {
    try {
      const raw =
        sessionStorage.getItem(STORAGE_USUARIO) ||
        localStorage.getItem(STORAGE_USUARIO);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function estaAutenticado() {
    return Boolean(getToken() && getUsuarioActivo());
  }

  function esAdmin() {
    const u = getUsuarioActivo();
    return u?.rol === "ROLE_ADMIN" || u?.rol === "ADMIN";
  }

  function esUser() {
    const u = getUsuarioActivo();
    return u?.rol === "ROLE_USER" || u?.rol === "CLIENTE" || u?.rol === "USER";
  }

  /* ---- Guardar / limpiar sesión ---- */

  function _guardarSesion(token, usuario, recordar = false) {
    // Guardamos siempre en localStorage para evitar pérdida de token en nuevas pestañas o redirecciones
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario));
    
    // También guardamos en sessionStorage por compatibilidad
    sessionStorage.setItem(STORAGE_TOKEN, token);
    sessionStorage.setItem(STORAGE_USUARIO, JSON.stringify(usuario));
  }

  function limpiarSesion() {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USUARIO);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USUARIO);
  }

  /* ---- Login / Logout ---- */

  /**
   * Llama a POST /api/auth/login.
   * El backend devuelve { token, usuario } o similar.
   * Ajusta la desestructuración según la respuesta real de tu API.
   *
   * @param {string} correo
   * @param {string} password
   * @param {boolean} recordar - Si true guarda en localStorage (persistente)
   * @returns {Promise<{token: string, usuario: object}>}
   */
  /**
   * Decodifica la sección de datos (payload) de un token JWT.
   */
  function decodeJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  /**
   * Llama a POST /api/auth/login.
   * Envía { email, password } al backend.
   *
   * @param {string} correo
   * @param {string} password
   * @param {boolean} recordar - Si true guarda en localStorage (persistente)
   * @returns {Promise<{token: string, usuario: object}>}
   */
  async function login(correo, password, recordar = false) {
    // El backend espera AuthRequestDTO con "email" y "password"
    const data = await ApiService.post(API_CONFIG.ENDPOINTS.LOGIN, {
      email: correo,
      password,
    });

    console.log("[AuthService] Respuesta del backend en /api/auth/login:", data);

    const token =
      data.token ||
      data.accessToken ||
      data.jwt ||
      data.access_token ||
      null;

    if (!token) {
      console.error("[AuthService] No se encontró el token en la respuesta:", data);
      throw new Error("El servidor no devolvió un token de autenticación.");
    }

    // Guardar token temporalmente en almacenamiento para que las llamadas siguientes
    // (como obtener los datos del usuario) lleven el header Authorization Bearer.
    localStorage.setItem(STORAGE_TOKEN, token);
    sessionStorage.setItem(STORAGE_TOKEN, token);

    // Decodificar el token para extraer el email y rol del usuario
    let email = correo;
    let rolFromToken = "";
    try {
      const payload = decodeJwt(token);
      console.log("[AuthService] Payload decodificado del JWT:", payload);
      if (payload) {
        email = payload.sub || payload.username || payload.email || email;
        
        // El rol en Spring Boot suele venir en claims como 'role', 'roles', 'auth', 'authorities'
        const rawRol = payload.role || payload.roles || payload.auth || payload.authorities || payload.authority || "";
        if (Array.isArray(rawRol)) {
          rolFromToken = rawRol[0] || "";
        } else {
          rolFromToken = String(rawRol);
        }
        console.log("[AuthService] Rol extraído del token JWT:", rolFromToken);
      }
    } catch (e) {
      console.warn("[AuthService] Error al decodificar claims del token JWT:", e);
    }

    // Obtener los datos completos del usuario desde el backend
    let usuario = null;
    try {
      usuario = await UsuarioService.getByCorreo(email);
    } catch (error) {
      console.warn("[AuthService] No se pudo obtener el usuario por correo. Generando objeto básico desde el token:", error);
      // Fallback si falla el endpoint de obtener por correo
      usuario = {
        id: `user-${Date.now()}`,
        nombre: email.split("@")[0],
        correo: email,
        rol: rolFromToken || (email.toLowerCase().includes("admin") ? "ROLE_ADMIN" : "ROLE_USER"),
      };
    }

    // Guardar sesión final con el token y el objeto de usuario completo
    _guardarSesion(token, usuario, recordar);

    return { token, usuario };
  }

  function logout(redirectUrl = null) {
    limpiarSesion();

    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }

  /* ---- Guards de acceso ---- */

  /**
   * Redirige a login.html si el usuario no está autenticado.
   * Llama esto al inicio de páginas protegidas.
   */
  function requiereAutenticacion(loginUrl = "login.html") {
    if (!estaAutenticado()) {
      window.location.replace(_resolverRuta(loginUrl));
      return false;
    }
    return true;
  }

  /**
   * Redirige si el usuario autenticado no es ADMIN.
   */
  function requiereAdmin(loginUrl = "login.html") {
    if (!estaAutenticado()) {
      window.location.replace(_resolverRuta(loginUrl));
      return false;
    }
    if (!esAdmin()) {
      alert("No tienes permisos para acceder al panel administrativo.");
      window.location.replace(_resolverRuta("../index.html"));
      return false;
    }
    return true;
  }

  /* ---- Helper de rutas relativas ---- */
  function _resolverRuta(nombreArchivo) {
    const rutaActual = window.location.pathname.toLowerCase();
    const estaEnRaiz = !rutaActual.includes("/html/");
    return estaEnRaiz ? `html/${nombreArchivo}` : nombreArchivo;
  }

  return {
    getToken,
    getUsuarioActivo,
    estaAutenticado,
    esAdmin,
    esUser,
    limpiarSesion,
    login,
    logout,
    requiereAutenticacion,
    requiereAdmin,
  };
})();

window.AuthService = AuthService;
