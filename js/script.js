function obtenerUsuarioActivo() {
  try {
    return JSON.parse(localStorage.getItem("usuarioActivo"));
  } catch {
    return null;
  }
}

function obtenerRuta(nombreArchivo) {
  const rutaActual = window.location.pathname.toLowerCase();

  const estaEnRaiz =
    rutaActual.endsWith("/index.html") ||
    !rutaActual.includes("/html/");

  if (estaEnRaiz) {
    return `html/${nombreArchivo}`;
  }

  return nombreArchivo;
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}

function actualizarContadorCarrito() {
  const carrito = obtenerCarrito();

  const total = carrito.reduce((suma, producto) => {
    return suma + Number(producto.quantity || 0);
  }, 0);

  const contador = document.getElementById("cartCount");

  if (!contador) return;

  contador.textContent = total;
  contador.style.display = total > 0 ? "flex" : "none";
}

function crearMenuUsuario() {
  const accesoUsuario =
    document.getElementById("userAccess") ||
    document.getElementById("adminAccess");

  if (!accesoUsuario) return;

  const usuario = obtenerUsuarioActivo();

  const contenedor = document.createElement("div");
  contenedor.classList.add("user-menu");

  if (!usuario) {
    contenedor.innerHTML = `
      <a class="user-trigger" href="${obtenerRuta("login.html")}">
        <i class="bi bi-person"></i>
        <span>Ingresar</span>
      </a>
    `;
  } else {
    const esAdmin = usuario.rol === "ADMIN";

    let opcionesCliente = "";

    if (!esAdmin) {
      opcionesCliente = `
        <a href="${obtenerRuta("perfil.html")}">
          <i class="bi bi-person-vcard"></i>
          Mi perfil
        </a>

        <a href="${obtenerRuta("perfil.html")}#historial">
          <i class="bi bi-clock-history"></i>
          Historial
        </a>

        <a href="${obtenerRuta("perfil.html")}#favoritos">
          <i class="bi bi-heart"></i>
          Favoritos
        </a>
      `;
    }

    let opcionAdmin = "";

    if (esAdmin) {
      opcionAdmin = `
        <a href="${obtenerRuta("dashboard-admin.html")}">
          <i class="bi bi-grid"></i>
          Panel administrativo
        </a>
      `;
    }

    contenedor.innerHTML = `
      <button class="user-trigger" type="button" id="userMenuButton">
        <i class="bi bi-person-circle"></i>
        <span>${escaparHTML(usuario.nombre)}</span>
        <i class="bi bi-chevron-down small"></i>
      </button>

      <div class="user-dropdown">
        ${opcionAdmin}
        ${opcionesCliente}

        <button type="button" id="logoutButton">
          <i class="bi bi-box-arrow-right"></i>
          Cerrar sesión
        </button>
      </div>
    `;

    const botonMenu = contenedor.querySelector("#userMenuButton");
    const botonCerrarSesion = contenedor.querySelector("#logoutButton");

    botonMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      contenedor.classList.toggle("open");
    });

    botonCerrarSesion.addEventListener("click", () => {
      localStorage.removeItem("usuarioActivo");
      window.location.href = obtenerRuta("login.html");
    });
  }

  accesoUsuario.replaceWith(contenedor);
}

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".custom-navbar");
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  const searchToggle = document.getElementById("searchToggle");
  const searchInput = document.querySelector(".nav-icons #searchInput");

  crearMenuUsuario();
  actualizarContadorCarrito();

  window.addEventListener("scroll", () => {
    if (navbar) {
      navbar.classList.toggle("scrolled", window.scrollY > 50);
    }
  });

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("open");
      mobileMenu.classList.toggle("open");
    });
  }

  if (searchToggle && searchInput) {
    searchToggle.addEventListener("click", (event) => {
      event.preventDefault();

      searchInput.classList.toggle("active");

      if (searchInput.classList.contains("active")) {
        searchInput.focus();
      }
    });
  }

  document.addEventListener("click", (event) => {
    const menuUsuario = document.querySelector(".user-menu");

    if (menuUsuario && !menuUsuario.contains(event.target)) {
      menuUsuario.classList.remove("open");
    }

    if (
      searchInput &&
      !searchInput.contains(event.target) &&
      !searchToggle?.contains(event.target)
    ) {
      searchInput.classList.remove("active");
    }
  });
});

window.updateCartCount = actualizarContadorCarrito;