/* =========================================================
   CONFIGURACIÓN GLOBAL DE LA API
   Cambia BASE_URL si tu backend corre en otro puerto o host.
   ========================================================= */

const API_CONFIG = {
  BASE_URL: "http://localhost:8080/api",

  ENDPOINTS: {
    // Auth
    LOGIN: "/auth/login",

    // Usuarios
    USUARIO: "/usuario",
    USUARIO_POR_ID: (id) => `/usuario/${id}`,
    USUARIO_POR_CORREO: (correo) => `/usuario/correo/${encodeURIComponent(correo)}`,

    // Productos
    PRODUCTO: "/producto",
    PRODUCTO_POR_ID: (id) => `/producto/${id}`,
    PRODUCTO_POR_CATEGORIA: (cat) => `/producto/categoria/${encodeURIComponent(cat)}`,

    // Pedidos
    PEDIDO: "/pedido",
    PEDIDO_POR_ID: (id) => `/pedido/${id}`,

    // Pagos
    PAGO: "/pago",
    PAGO_POR_ID: (id) => `/pago/${id}`,
  },
};

window.API_CONFIG = API_CONFIG;
