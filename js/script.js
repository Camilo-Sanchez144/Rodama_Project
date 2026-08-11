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

  return estaEnRaiz ? `html/${nombreArchivo}` : nombreArchivo;
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  if (!contador) {
    return;
  }

  contador.textContent = total;
  contador.style.display = total > 0 ? "flex" : "none";
}

function obtenerAvatarUsuario(usuario) {
  return (
    usuario?.avatar ||
    usuario?.foto ||
    usuario?.imagen ||
    usuario?.image ||
    ""
  );
}

function crearIconoUsuario(usuario) {
  const avatar = obtenerAvatarUsuario(usuario);

  if (!avatar) {
    return `<i class="bi bi-person-circle user-trigger-icon"></i>`;
  }

  return `
    <img
      class="user-avatar"
      src="${escaparHTML(avatar)}"
      alt="Foto de perfil de ${escaparHTML(usuario.nombre || "usuario")}"
    >
  `;
}

function crearMenuUsuario() {
  const accesoUsuario =
    document.getElementById("userAccess") ||
    document.getElementById("adminAccess");

  if (!accesoUsuario) {
    return;
  }

  const usuario = obtenerUsuarioActivo();

  const contenedor = document.createElement("div");
  contenedor.classList.add("user-menu");

  if (!usuario) {
    contenedor.innerHTML = `
      <a class="user-trigger" href="${obtenerRuta("login.html")}">
        <i class="bi bi-person"></i>
      </a>
    `;

    accesoUsuario.replaceWith(contenedor);
    return;
  }

  const esAdmin = usuario.rol === "ADMIN";
  const avatarHTML = crearIconoUsuario(usuario);

  const opcionesCliente = esAdmin
    ? ""
    : `
      <a href="${obtenerRuta("perfil.html")}#historial">
        <i class="bi bi-clock-history"></i>
        Historial
      </a>

      <a href="${obtenerRuta("perfil.html")}#favoritos">
        <i class="bi bi-heart"></i>
        Favoritos
      </a>
    `;

  const opcionPanelAdmin = esAdmin
    ? `
      <a href="${obtenerRuta("dashboard-admin.html")}">
        <i class="bi bi-grid"></i>
        Panel administrativo
      </a>
    `
    : "";
  const opcionesPerfil = esAdmin
    ? ""
    : `
        <a href="${obtenerRuta("perfil.html")}">
            <i class="bi bi-person-vcard"></i>
            Mi perfil
        </a>

        <a href="${obtenerRuta("perfil.html")}#configuracion">
            <i class="bi bi-gear"></i>
            Configuración
        </a>
    `;

  contenedor.innerHTML = `
    <button
      class="user-trigger"
      type="button"
      id="userMenuButton"
      aria-expanded="false"
      aria-label="Abrir menú de usuario"
    >
      ${avatarHTML}
      <span>${escaparHTML(usuario.nombre || "Usuario")}</span>
      <i class="bi bi-chevron-down small"></i>
    </button>

    <div class="user-dropdown">
    ${opcionesPerfil}
    ${opcionesCliente}
    ${opcionPanelAdmin}

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

    const estaAbierto = contenedor.classList.toggle("open");

    botonMenu.setAttribute("aria-expanded", String(estaAbierto));
  });

  botonCerrarSesion.addEventListener("click", () => {
    localStorage.removeItem("usuarioActivo");
    window.location.href = obtenerRuta("login.html");
  });

  accesoUsuario.replaceWith(contenedor);
}

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".custom-navbar");
  const hamburger =
    document.getElementById("siteHamburger") ||
    document.getElementById("hamburger");
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

  /* hamburguesa: toggle + aria + cerrar al click fuera */
  if (hamburger && mobileMenu) {
    hamburger.setAttribute("aria-expanded", "false");

    hamburger.addEventListener("click", (e) => {
      const abierto = hamburger.classList.toggle("open");
      mobileMenu.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", abierto ? "true" : "false");
      e.stopPropagation();
    });

    // cerrar mobile menu si se hace click fuera
    document.addEventListener("click", (e) => {
      if (!mobileMenu.classList.contains("open")) return;
      if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
      }
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

      const botonMenu = menuUsuario.querySelector("#userMenuButton");

      if (botonMenu) {
        botonMenu.setAttribute("aria-expanded", "false");
      }
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

/* utilidades añadidas al final */
(function () {
  function mostrarMensaje(elemento, texto, tipo) {
    if (!elemento) return;
    elemento.innerHTML = `<span class="msg ${tipo}">${texto}</span>`;
  }

  function initNewsletter() {
    const form = document.getElementById("newsletterForm");
    const emailInput = document.getElementById("newsletterEmail");
    const messageWrap = document.getElementById("newsletterMessage");

    if (!form || !emailInput || !messageWrap) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = String(emailInput.value || "").trim();

      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email)) {
        mostrarMensaje(messageWrap, "Por favor ingresa un correo válido.", "error");
        emailInput.focus();
        return;
      }

      try {
        const suscritos = JSON.parse(localStorage.getItem("rodama_newsletter") || "[]");
        if (!suscritos.includes(email)) {
          suscritos.push(email);
          localStorage.setItem("rodama_newsletter", JSON.stringify(suscritos));
        }
        mostrarMensaje(messageWrap, "Gracias por suscribirte. Revisa tu correo para confirmar.", "success");
        form.reset();
      } catch (err) {
        mostrarMensaje(messageWrap, "Error al procesar la suscripción. Intenta nuevamente.", "error");
      }
    });
  }

  function initWhatsAppFloat() {
    const wa = document.getElementById("whatsappButton");
    if (!wa) return;

    try {
      const tooltip = bootstrap.Tooltip.getOrCreateInstance(wa);
    } catch (err) {}

    wa.style.transform = "translateY(8px)";
    wa.style.opacity = "0";
    setTimeout(() => {
      wa.style.transition = "transform 0.35s ease, opacity 0.35s ease";
      wa.style.transform = "translateY(0)";
      wa.style.opacity = "1";
    }, 300);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNewsletter();
    initWhatsAppFloat();
  });
})();