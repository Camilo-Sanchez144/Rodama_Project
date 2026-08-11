/* =========================================================
   REGISTER.JS — Registro de nuevo usuario en el backend
   Depende de: api.config.js, api.service.js,
               usuario.service.js, ui.utils.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  /* ---- Toggle contraseña ---- */
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.togglePassword;
      const input = document.getElementById(targetId);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.classList.toggle("bi-eye", visible);
      btn.classList.toggle("bi-eye-slash", !visible);
    });
  });

  /* ---- Error box ---- */
  const errorBox = document.getElementById("registerError");

  function mostrarError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = "block";
    } else {
      alert(msg);
    }
  }

  function ocultarError() {
    if (errorBox) errorBox.style.display = "none";
  }

  /* ---- Envío del formulario ---- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarError();

    const nombre          = document.getElementById("nombre").value.trim();
    const apellido        = document.getElementById("apellido").value.trim();
    const telefono        = document.getElementById("telefono").value.trim();
    const direccion       = document.getElementById("direccion")?.value.trim() || "";
    const correo          = document.getElementById("correo").value.trim().toLowerCase();
    const password        = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validaciones de cliente
    if (!nombre || !apellido || !telefono || !correo || !password || !confirmPassword) {
      mostrarError("Completa todos los campos para crear tu cuenta.");
      return;
    }

    if (!UiUtils.esCorreoValido(correo)) {
      mostrarError("Ingresa un correo electrónico válido.");
      return;
    }

    if (!UiUtils.esTelefonoValido(telefono)) {
      mostrarError("Ingresa un teléfono válido (solo dígitos, 7–15 caracteres).");
      return;
    }

    if (password.length < 8) {
      mostrarError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      mostrarError("Las contraseñas no coinciden.");
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    UiUtils.setBtnLoading(submitBtn, true, "Crear cuenta");

    const nuevoUsuario = {
      nombre,
      apellido,
      telefono,
      direccion,
      correo,
      password,
      // El backend asignará ROLE_USER por defecto.
      // Si tu API requiere el rol explícito, descomenta la siguiente línea:
      // rol: "ROLE_USER",
    };

    try {
      await UsuarioService.crear(nuevoUsuario);

      UiUtils.mostrarToast(
        "¡Cuenta creada!",
        "Tu cuenta se registró correctamente. Ahora inicia sesión.",
        "success"
      );

      form.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1800);
    } catch (error) {
      mostrarError(
        error.message || "Hubo un error al crear la cuenta. Inténtalo de nuevo."
      );
      UiUtils.setBtnLoading(submitBtn, false, "Crear cuenta");
    }
  });
});