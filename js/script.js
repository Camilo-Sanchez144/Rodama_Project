/* =========================================================
   SCRIPT.JS — Navbar global, menú de usuario, carrito, newsletter
   Depende de: api.config.js, api.service.js, auth.service.js,
               ui.utils.js, cart.store.js
   ========================================================= */

/* ---- Menú de usuario dinámico ---- */
function crearMenuUsuario() {
  const ancla =
    document.getElementById("userAccess") ||
    document.getElementById("adminAccess");

  if (!ancla) return;

  const usuario = AuthService.getUsuarioActivo();
  const contenedor = document.createElement("div");
  contenedor.classList.add("user-menu");

  /* Usuario NO autenticado */
  if (!usuario) {
    contenedor.innerHTML = `
      <a class="user-trigger" href="${UiUtils.resolverRuta("login.html")}">
        <i class="bi bi-person"></i>
      </a>
    `;
    ancla.replaceWith(contenedor);
    return;
  }

  /* Usuario autenticado */
  const esAdmin = AuthService.esAdmin();
  const avatar  = usuario.avatar || usuario.foto || usuario.imagen || usuario.image || "";

  const avatarHTML = avatar
    ? `<img class="user-avatar" src="${UiUtils.escaparHTML(avatar)}" alt="Foto de ${UiUtils.escaparHTML(usuario.nombre || "usuario")}">`
    : `<i class="bi bi-person-circle user-trigger-icon"></i>`;

  const opcionesPerfil = !esAdmin
    ? `
      <a href="${UiUtils.resolverRuta("perfil.html")}">
        <i class="bi bi-person-vcard"></i> Mi perfil
      </a>
      <a href="${UiUtils.resolverRuta("perfil.html")}#configuracion">
        <i class="bi bi-gear"></i> Configuración
      </a>
      <a href="${UiUtils.resolverRuta("perfil.html")}#historial">
        <i class="bi bi-clock-history"></i> Historial
      </a>
      <a href="${UiUtils.resolverRuta("perfil.html")}#favoritos">
        <i class="bi bi-heart"></i> Favoritos
      </a>
    `
    : "";

  const opcionAdmin = esAdmin
    ? `
      <a href="${UiUtils.resolverRuta("dashboard-admin.html")}">
        <i class="bi bi-grid"></i> Panel administrativo
      </a>
    `
    : "";

  contenedor.innerHTML = `
    <button class="user-trigger" type="button" id="userMenuButton"
      aria-expanded="false" aria-label="Abrir menú de usuario">
      ${avatarHTML}
      <span>${UiUtils.escaparHTML(usuario.nombre || "Usuario")}</span>
      <i class="bi bi-chevron-down small"></i>
    </button>
    <div class="user-dropdown">
      ${opcionesPerfil}
      ${opcionAdmin}
      <button type="button" id="logoutButton">
        <i class="bi bi-box-arrow-right"></i> Cerrar sesión
      </button>
    </div>
  `;

  contenedor.querySelector("#userMenuButton").addEventListener("click", (e) => {
    e.stopPropagation();
    const abierto = contenedor.classList.toggle("open");
    contenedor
      .querySelector("#userMenuButton")
      .setAttribute("aria-expanded", String(abierto));
  });

  contenedor.querySelector("#logoutButton").addEventListener("click", () => {
    AuthService.logout(UiUtils.resolverRuta("login.html"));
  });

  ancla.replaceWith(contenedor);
}

/* ---- Inicialización del navbar ---- */
document.addEventListener("DOMContentLoaded", () => {
  const navbar       = document.querySelector(".custom-navbar");
  const hamburger    =
    document.getElementById("siteHamburger") ||
    document.getElementById("hamburger");
  const mobileMenu   = document.getElementById("mobileMenu");
  const searchToggle = document.getElementById("searchToggle");
  const searchInput  = document.querySelector(".nav-icons #searchInput");

  crearMenuUsuario();
  CartStore.actualizarContador();

  /* Scroll effect en el navbar */
  window.addEventListener("scroll", () => {
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 50);
  });

  /* Hamburguesa del menú móvil */
  if (hamburger && mobileMenu) {
    hamburger.setAttribute("aria-expanded", "false");

    hamburger.addEventListener("click", (e) => {
      const abierto = hamburger.classList.toggle("open");
      mobileMenu.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", abierto ? "true" : "false");
      e.stopPropagation();
    });

    document.addEventListener("click", (e) => {
      if (!mobileMenu.classList.contains("open")) return;
      if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
        mobileMenu.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Toggle buscador */
  if (searchToggle && searchInput) {
    searchToggle.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.classList.toggle("active");
      if (searchInput.classList.contains("active")) searchInput.focus();
    });
  }

  /* Cerrar el dropdown de usuario al click fuera */
  document.addEventListener("click", (e) => {
    const menuUsuario = document.querySelector(".user-menu");
    if (menuUsuario && !menuUsuario.contains(e.target)) {
      menuUsuario.classList.remove("open");
      const btn = menuUsuario.querySelector("#userMenuButton");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    if (
      searchInput &&
      !searchInput.contains(e.target) &&
      !searchToggle?.contains(e.target)
    ) {
      searchInput.classList.remove("active");
    }
  });
});

/* ---- Newsletter ---- */
(function () {
  function initNewsletter() {
    const formNL    = document.getElementById("newsletterForm");
    const emailInNL = document.getElementById("newsletterEmail");
    const msgWrap   = document.getElementById("newsletterMessage");

    if (!formNL || !emailInNL || !msgWrap) return;

    formNL.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = emailInNL.value.trim();

      if (!UiUtils.esCorreoValido(email)) {
        msgWrap.innerHTML = `<span class="msg error">Por favor ingresa un correo válido.</span>`;
        emailInNL.focus();
        return;
      }

      // Por ahora se guarda localmente; integrar con endpoint backend si se agrega
      try {
        const suscritos = JSON.parse(localStorage.getItem("rodama_newsletter") || "[]");
        if (!suscritos.includes(email)) {
          suscritos.push(email);
          localStorage.setItem("rodama_newsletter", JSON.stringify(suscritos));
        }
        msgWrap.innerHTML = `<span class="msg success">Gracias por suscribirte. ¡Revisa tu correo!</span>`;
        formNL.reset();
      } catch {
        msgWrap.innerHTML = `<span class="msg error">Error al procesar. Inténtalo de nuevo.</span>`;
      }
    });
  }

  function initWhatsAppFloat() {
    const wa = document.getElementById("whatsappButton");
    if (!wa) return;
    wa.style.transform = "translateY(8px)";
    wa.style.opacity   = "0";
    setTimeout(() => {
      wa.style.transition = "transform 0.35s ease, opacity 0.35s ease";
      wa.style.transform  = "translateY(0)";
      wa.style.opacity    = "1";
    }, 300);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNewsletter();
    initWhatsAppFloat();
  });
})();