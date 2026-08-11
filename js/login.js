/* =========================================================
   LOGIN.JS — Autenticación contra el backend
   Depende de: api.config.js, api.service.js, auth.service.js,
               ui.utils.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form     = document.getElementById("loginForm");
  const correoIn = document.getElementById("correo");
  const passIn   = document.getElementById("password");
  const eyeBtn   = document.getElementById("eye");
  const errorBox = document.getElementById("loginError");

  /* ---- Toggle mostrar/ocultar contraseña ---- */
  if (eyeBtn) {
    eyeBtn.addEventListener("click", () => {
      const visible = passIn.type === "text";
      passIn.type = visible ? "password" : "text";
      eyeBtn.classList.toggle("bi-eye", visible);
      eyeBtn.classList.toggle("bi-eye-slash", !visible);
    });
  }

  /* ---- Mostrar error inline ---- */
  function mostrarError(mensaje) {
    if (errorBox) {
      errorBox.textContent = mensaje;
      errorBox.style.display = "block";
    } else {
      alert(mensaje);
    }
  }

  function ocultarError() {
    if (errorBox) errorBox.style.display = "none";
  }

  /* ---- Envío del formulario ---- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarError();

    const correo   = correoIn.value.trim().toLowerCase();
    const password = passIn.value;

    if (!correo || !password) {
      mostrarError("Completa el correo y la contraseña.");
      return;
    }

    if (!UiUtils.esCorreoValido(correo)) {
      mostrarError("Ingresa un correo electrónico válido.");
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    UiUtils.setBtnLoading(submitBtn, true, "Iniciar sesión");

    try {
      const { usuario } = await AuthService.login(correo, password);

      // Redirige según el rol devuelto por el backend
      const esAdmin = usuario.rol === "ROLE_ADMIN" || usuario.rol === "ADMIN";
      if (esAdmin) {
        window.location.href = "dashboard-admin.html";
      } else {
        window.location.href = "../index.html";
      }
    } catch (error) {
      mostrarError(
        error.message || "Correo o contraseña incorrectos. Inténtalo de nuevo."
      );
      UiUtils.setBtnLoading(submitBtn, false, "Iniciar sesión");
    }
  });
});