/* =========================================================
   PERFIL.JS — Perfil del usuario: datos, contraseña, pedidos, favoritos
   Depende de: api.config.js, api.service.js, auth.service.js,
               usuario.service.js, pedido.service.js,
               ui.utils.js, cart.store.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  // Guard: redirige a login si no hay sesión activa
  if (!AuthService.requiereAutenticacion("login.html")) return;

  let usuarioActivo = AuthService.getUsuarioActivo();

  /* ---- Referencias DOM ---- */
  const clientName    = document.getElementById("clientName");
  const profileForm   = document.getElementById("profileForm");
  const passwordForm  = document.getElementById("passwordForm");
  const logoutBtn     = document.getElementById("logoutBtn");
  const clientSections = document.querySelectorAll(".client-section");
  const historyLink   = document.getElementById("historyLink");
  const favoritesLink = document.getElementById("favoritesLink");

  /* ---- Inputs de datos personales ---- */
  const nombreIn    = document.getElementById("nombre");
  const apellidoIn  = document.getElementById("apellido");
  const correoIn    = document.getElementById("correo");
  const telefonoIn  = document.getElementById("telefono");
  const direccionIn = document.getElementById("direccion");

  /* ---- Llenar formulario con datos actuales ---- */
  function poblarFormulario(u) {
    if (nombreIn)    nombreIn.value    = u.nombre    || "";
    if (apellidoIn)  apellidoIn.value  = u.apellido  || "";
    if (correoIn)    correoIn.value    = u.correo    || "";
    if (telefonoIn)  telefonoIn.value  = u.telefono  || "";
    if (direccionIn) direccionIn.value = u.direccion || "";
    if (clientName)  clientName.textContent = u.nombre || "Usuario";
  }

  poblarFormulario(usuarioActivo);

  /* ---- Ocultar secciones de cliente para ADMIN ---- */
  if (AuthService.esAdmin()) {
    clientSections.forEach((s) => s.classList.add("d-none"));
    if (historyLink)   historyLink.classList.add("d-none");
    if (favoritesLink) favoritesLink.classList.add("d-none");
  } else {
    await cargarHistorialPedidos();
    renderizarFavoritos();
  }

  /* ---- Botón de logout ---- */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      AuthService.logout("login.html");
    });
  }

  /* ================================================================
     PERFIL — actualizar datos personales
     ============================================================= */
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      UiUtils.limpiarErroresCampos();

      const datos = {
        nombre:    nombreIn.value.trim(),
        apellido:  apellidoIn?.value.trim() || "",
        correo:    correoIn.value.trim().toLowerCase(),
        telefono:  telefonoIn?.value.trim() || "",
        direccion: direccionIn?.value.trim() || "",
      };

      // Validaciones de cliente
      if (!datos.nombre) {
        UiUtils.mostrarErrorCampo("nombreError", nombreIn, "El nombre es obligatorio.");
        return;
      }
      if (!datos.correo || !UiUtils.esCorreoValido(datos.correo)) {
        UiUtils.mostrarErrorCampo("correoError", correoIn, "Ingresa un correo válido.");
        return;
      }
      if (datos.telefono && !UiUtils.esTelefonoValido(datos.telefono)) {
        UiUtils.mostrarErrorCampo("telefonoError", telefonoIn, "Teléfono inválido (7–15 dígitos).");
        return;
      }

      const btn = profileForm.querySelector("button[type='submit']");
      UiUtils.setBtnLoading(btn, true, "Guardar cambios");

      try {
        const actualizado = await UsuarioService.actualizar(usuarioActivo.id, datos);
        // Sincroniza sesión local con los datos que devuelve el backend
        usuarioActivo = { ...usuarioActivo, ...datos, ...(actualizado || {}) };
        localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));

        if (clientName) clientName.textContent = usuarioActivo.nombre || "Usuario";
        UiUtils.mostrarMensaje("profileMessage", "Tus datos se guardaron correctamente.", "success");
      } catch (err) {
        UiUtils.mostrarMensaje("profileMessage", err.message || "Error al guardar.", "error");
      } finally {
        UiUtils.setBtnLoading(btn, false, "Guardar cambios");
      }
    });
  }

  /* ================================================================
     CONTRASEÑA — actualizar
     ============================================================= */
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      UiUtils.limpiarErroresCampos();

      const actual    = document.getElementById("currentPassword").value;
      const nueva     = document.getElementById("newPassword").value;
      const confirmar = document.getElementById("confirmPassword").value;

      if (!actual) {
        UiUtils.mostrarErrorCampo("currentPasswordError",
          document.getElementById("currentPassword"),
          "Ingresa tu contraseña actual.");
        return;
      }
      if (!nueva || nueva.length < 8) {
        UiUtils.mostrarErrorCampo("newPasswordError",
          document.getElementById("newPassword"),
          "La nueva contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (nueva !== confirmar) {
        UiUtils.mostrarErrorCampo("confirmPasswordError",
          document.getElementById("confirmPassword"),
          "Las contraseñas no coinciden.");
        return;
      }

      const btn = passwordForm.querySelector("button[type='submit']");
      UiUtils.setBtnLoading(btn, true, "Actualizar contraseña");

      try {
        // El endpoint PUT /api/usuario/{id} recibe la nueva contraseña
        await UsuarioService.actualizar(usuarioActivo.id, {
          currentPassword: actual,
          password: nueva,
        });

        passwordForm.reset();
        UiUtils.mostrarMensaje("profileMessage", "Contraseña actualizada correctamente.", "success");
      } catch (err) {
        UiUtils.mostrarMensaje("profileMessage", err.message || "Error al actualizar la contraseña.", "error");
      } finally {
        UiUtils.setBtnLoading(btn, false, "Actualizar contraseña");
      }
    });
  }

  /* ================================================================
     HISTORIAL DE PEDIDOS — cargar del backend
     ============================================================= */
  async function cargarHistorialPedidos() {
    const contenedor = document.getElementById("orderHistoryContainer");
    if (!contenedor) return;

    contenedor.innerHTML = `<p class="text-muted">Cargando pedidos...</p>`;

    try {
      const todosPedidos = await PedidoService.getAll();
      // Filtrar los del usuario activo (el backend debería filtrar, pero por si acaso)
      const pedidosUsuario = todosPedidos.filter(
        (p) => String(p.usuarioId) === String(usuarioActivo.id)
      );

      renderizarHistorial(contenedor, pedidosUsuario);
    } catch {
      contenedor.innerHTML = `<p class="text-muted">No se pudo cargar el historial.</p>`;
    }
  }

  function renderizarHistorial(contenedor, pedidos) {
    if (!pedidos || pedidos.length === 0) {
      contenedor.innerHTML = `
        <div class="orders-empty">
          <i class="bi bi-bag-x"></i>
          <p>Aún no has realizado ninguna compra.</p>
          <a href="productos.html">Ver productos</a>
        </div>
      `;
      return;
    }

    const ordenados = [...pedidos].sort(
      (a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)
    );

    contenedor.innerHTML = ordenados
      .map((pedido) => {
        const fecha = new Date(pedido.fecha || pedido.createdAt).toLocaleDateString("es-CO", {
          year: "numeric", month: "long", day: "numeric",
        });

        const itemsHTML = (pedido.items || [])
          .map((item) => {
            const talla = item.talla && item.talla !== "Única" ? ` · Talla ${UiUtils.escaparHTML(item.talla)}` : "";
            return `
              <li>
                <span>${UiUtils.escaparHTML(item.nombre || item.name)}${talla} · Cant. ${item.cantidad || item.quantity}</span>
                <span>${UiUtils.formatearPrecio((item.precio || item.price) * (item.cantidad || item.quantity))}</span>
              </li>
            `;
          })
          .join("");

        return `
          <article class="order-card">
            <header class="order-card-header">
              <div>
                <strong>Pedido ${UiUtils.escaparHTML(String(pedido.id))}</strong>
                <span>${fecha}</span>
              </div>
              <span class="order-status order-status-${UiUtils.escaparHTML(String(pedido.estado || "confirmado").toLowerCase())}">
                ${UiUtils.escaparHTML(pedido.estado || "Confirmado")}
              </span>
            </header>
            <ul class="order-items">${itemsHTML}</ul>
            <footer class="order-card-footer">
              <span>Método: ${UiUtils.escaparHTML(pedido.metodoPago || "")}</span>
              <strong>Total: ${UiUtils.formatearPrecio(pedido.total)}</strong>
            </footer>
          </article>
        `;
      })
      .join("");
  }

  /* ================================================================
     FAVORITOS — almacenados localmente
     ============================================================= */
  function obtenerFavoritos() {
    try {
      return JSON.parse(localStorage.getItem(`favorites_${usuarioActivo.id}`)) || [];
    } catch {
      return [];
    }
  }

  function guardarFavoritos(favs) {
    localStorage.setItem(`favorites_${usuarioActivo.id}`, JSON.stringify(favs));
  }

  function renderizarFavoritos() {
    const contenedor = document.getElementById("favoritesContainer");
    if (!contenedor) return;

    const favoritos = obtenerFavoritos();

    if (favoritos.length === 0) {
      contenedor.innerHTML = `
        <div class="favorites-empty">
          <i class="bi bi-heart"></i>
          <p>No tienes favoritos guardados todavía.</p>
          <a href="productos.html">Explorar productos</a>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = "";

    favoritos.forEach((fav) => {
      const tarjeta = document.createElement("article");
      tarjeta.className = "favorite-card";
      tarjeta.innerHTML = `
        <img src="${UiUtils.escaparHTML(fav.image || "https://via.placeholder.com/300x360?text=Producto")}"
             alt="${UiUtils.escaparHTML(fav.name || "Producto")}">
        <div class="favorite-card-body">
          <span>${UiUtils.escaparHTML(fav.category || "Producto")}</span>
          <h3>${UiUtils.escaparHTML(fav.name || "Producto sin nombre")}</h3>
          <strong>$${Number(fav.price || 0).toLocaleString("es-CO")}</strong>
          <div class="favorite-card-actions">
            <a href="productos.html">Ver producto</a>
            <button type="button" class="remove-favorite">Quitar</button>
          </div>
        </div>
      `;

      tarjeta.querySelector(".remove-favorite").addEventListener("click", () => {
        const actualizados = obtenerFavoritos().filter(
          (f) => String(f.productId) !== String(fav.productId)
        );
        guardarFavoritos(actualizados);
        renderizarFavoritos();
        UiUtils.mostrarToast("Favorito eliminado", "El producto se quitó de tus favoritos.");
      });

      contenedor.appendChild(tarjeta);
    });
  }
});