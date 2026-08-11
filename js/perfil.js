function obtenerUsuarioActivo() {
  try {
    return JSON.parse(localStorage.getItem("usuarioActivo"));
  } catch {
    return null;
  }
}

function obtenerUsuarios() {
  try {
    return JSON.parse(localStorage.getItem("usuarios")) || [];
  } catch {
    return [];
  }
}

function guardarUsuarios(usuarios) {
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

function obtenerFavoritos(usuario) {
  try {
    return (
      JSON.parse(localStorage.getItem(`favorites_${usuario.id}`)) || []
    );
  } catch {
    return [];
  }
}

function guardarFavoritos(usuario, favoritos) {
  localStorage.setItem(
    `favorites_${usuario.id}`,
    JSON.stringify(favoritos)
  );
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensaje(mensaje, tipo = "success") {
  const profileMessage = document.getElementById("profileMessage");

  profileMessage.textContent = mensaje;
  profileMessage.className = `profile-message show ${tipo}`;
}

function limpiarErrores() {
  document.querySelectorAll(".field-error").forEach((elemento) => {
    elemento.textContent = "";
  });

  document.querySelectorAll(".input-invalid").forEach((elemento) => {
    elemento.classList.remove("input-invalid");
  });
}

function mostrarError(idError, input, mensaje) {
  const error = document.getElementById(idError);

  if (error) {
    error.textContent = mensaje;
  }

  if (input) {
    input.classList.add("input-invalid");
  }
}

function validarDatosPersonales(datos) {
  let esValido = true;
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const telefonoValido = /^\d{7,15}$/;

  if (!datos.nombre) {
    mostrarError(
      "nombreError",
      document.getElementById("nombre"),
      "El nombre es obligatorio."
    );
    esValido = false;
  }

  if (!datos.correo) {
    mostrarError(
      "correoError",
      document.getElementById("correo"),
      "El correo es obligatorio."
    );
    esValido = false;
  } else if (!correoValido.test(datos.correo)) {
    mostrarError(
      "correoError",
      document.getElementById("correo"),
      "Ingresa un correo válido, por ejemplo nombre@dominio.com."
    );
    esValido = false;
  }

  if (!datos.telefono) {
    mostrarError(
      "telefonoError",
      document.getElementById("telefono"),
      "El teléfono es obligatorio."
    );
    esValido = false;
  } else if (!telefonoValido.test(datos.telefono)) {
    mostrarError(
      "telefonoError",
      document.getElementById("telefono"),
      "El teléfono debe contener únicamente números y tener entre 7 y 15 dígitos."
    );
    esValido = false;
  }

  return esValido;
}

function renderizarFavoritos(usuario) {
  const contenedor = document.getElementById("favoritesContainer");

  if (!contenedor) {
    return;
  }

  const favoritos = obtenerFavoritos(usuario);

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

  favoritos.forEach((favorito) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "favorite-card";

    tarjeta.innerHTML = `
      <img
        src="${escaparHTML(
          favorito.image ||
            "https://via.placeholder.com/300x360?text=Producto"
        )}"
        alt="${escaparHTML(favorito.name || "Producto")}"
      >

      <div class="favorite-card-body">
        <span>${escaparHTML(favorito.category || "Producto")}</span>

        <h3>${escaparHTML(favorito.name || "Producto sin nombre")}</h3>

        <strong>
          $${Number(favorito.price || 0).toLocaleString("es-CO")}
        </strong>

        <div class="favorite-card-actions">
          <a href="productos.html">Ver producto</a>

          <button type="button" class="remove-favorite">
            Quitar
          </button>
        </div>
      </div>
    `;

    tarjeta.querySelector(".remove-favorite").addEventListener("click", () => {
      const favoritosActualizados = obtenerFavoritos(usuario).filter(
        (item) => String(item.productId) !== String(favorito.productId)
      );

      guardarFavoritos(usuario, favoritosActualizados);
      renderizarFavoritos(usuario);
      mostrarMensaje("El producto se eliminó de tus favoritos.");
    });

    contenedor.appendChild(tarjeta);
  });
}

function configurarPerfil(usuarioActivo) {
  const nombre = document.getElementById("nombre");
  const apellido = document.getElementById("apellido");
  const correo = document.getElementById("correo");
  const telefono = document.getElementById("telefono");
  const direccion = document.getElementById("direccion");
  const clientName = document.getElementById("clientName");
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const clientSections = document.querySelectorAll(".client-section");
  const historyLink = document.getElementById("historyLink");
  const favoritesLink = document.getElementById("favoritesLink");

  nombre.value = usuarioActivo.nombre || "";
  apellido.value = usuarioActivo.apellido || "";
  correo.value = usuarioActivo.correo || "";
  telefono.value = usuarioActivo.telefono || "";
  direccion.value = usuarioActivo.direccion || "";

  clientName.textContent = usuarioActivo.nombre || "usuario";

  if (usuarioActivo.rol === "ADMIN") {
    clientSections.forEach((seccion) => {
      seccion.classList.add("d-none");
    });

    historyLink.classList.add("d-none");
    favoritesLink.classList.add("d-none");
  } else {
    renderizarFavoritos(usuarioActivo);
  }

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    limpiarErrores();

    const datos = {
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      correo: correo.value.trim().toLowerCase(),
      telefono: telefono.value.trim(),
      direccion: direccion.value.trim()
    };

    if (!validarDatosPersonales(datos)) {
      mostrarMensaje(
        "Revisa los campos marcados antes de guardar.",
        "error"
      );

      return;
    }

    const usuarios = obtenerUsuarios();

    const correoEnUso = usuarios.some((usuario) => {
      return (
        String(usuario.id) !== String(usuarioActivo.id) &&
        (usuario.correo || "").toLowerCase() === datos.correo
      );
    });

    if (correoEnUso) {
      mostrarError(
        "correoError",
        correo,
        "Ya existe una cuenta registrada con este correo."
      );

      mostrarMensaje(
        "No fue posible guardar los cambios. El correo ya está en uso.",
        "error"
      );

      return;
    }

    const usuarioActualizado = {
      ...usuarioActivo,
      ...datos
    };

    const posicionUsuario = usuarios.findIndex((usuario) => {
      return String(usuario.id) === String(usuarioActivo.id);
    });

    if (posicionUsuario === -1) {
      usuarios.push(usuarioActualizado);
    } else {
      usuarios[posicionUsuario] = usuarioActualizado;
    }

    guardarUsuarios(usuarios);
    localStorage.setItem(
      "usuarioActivo",
      JSON.stringify(usuarioActualizado)
    );

    usuarioActivo = usuarioActualizado;
    clientName.textContent = usuarioActualizado.nombre || "usuario";

    mostrarMensaje("Tus datos se guardaron correctamente.");
  });

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    limpiarErrores();

    const currentPassword = document
      .getElementById("currentPassword")
      .value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    let esValido = true;

    if (!currentPassword) {
      mostrarError(
        "currentPasswordError",
        document.getElementById("currentPassword"),
        "Ingresa tu contraseña actual."
      );
      esValido = false;
    } else if (currentPassword !== usuarioActivo.password) {
      mostrarError(
        "currentPasswordError",
        document.getElementById("currentPassword"),
        "La contraseña actual no es correcta."
      );
      esValido = false;
    }

    if (!newPassword) {
      mostrarError(
        "newPasswordError",
        document.getElementById("newPassword"),
        "Ingresa una nueva contraseña."
      );
      esValido = false;
    } else if (newPassword.length < 8) {
      mostrarError(
        "newPasswordError",
        document.getElementById("newPassword"),
        "La nueva contraseña debe tener al menos 8 caracteres."
      );
      esValido = false;
    }

    if (!confirmPassword) {
      mostrarError(
        "confirmPasswordError",
        document.getElementById("confirmPassword"),
        "Confirma la nueva contraseña."
      );
      esValido = false;
    } else if (newPassword !== confirmPassword) {
      mostrarError(
        "confirmPasswordError",
        document.getElementById("confirmPassword"),
        "Las nuevas contraseñas no coinciden."
      );
      esValido = false;
    }

    if (!esValido) {
      mostrarMensaje(
        "No fue posible actualizar la contraseña. Revisa los campos marcados.",
        "error"
      );

      return;
    }

    const usuarioActualizado = {
      ...usuarioActivo,
      password: newPassword
    };

    const usuarios = obtenerUsuarios();
    const posicionUsuario = usuarios.findIndex((usuario) => {
      return String(usuario.id) === String(usuarioActivo.id);
    });

    if (posicionUsuario === -1) {
      usuarios.push(usuarioActualizado);
    } else {
      usuarios[posicionUsuario] = usuarioActualizado;
    }

    guardarUsuarios(usuarios);
    localStorage.setItem(
      "usuarioActivo",
      JSON.stringify(usuarioActualizado)
    );

    usuarioActivo = usuarioActualizado;
    passwordForm.reset();

    mostrarMensaje("Tu contraseña se actualizó correctamente.");
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "login.html";
  });
}

const usuarioActivo = obtenerUsuarioActivo();

if (!usuarioActivo) {
  window.location.replace("login.html");
} else {
  configurarPerfil(usuarioActivo);
}