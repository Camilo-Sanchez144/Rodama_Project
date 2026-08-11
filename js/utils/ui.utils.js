/* =========================================================
   UI UTILS — Helpers de UI compartidos entre páginas
   Todas las funciones son puras (sin side effects de DOM)
   excepto las que lo indican explícitamente.
   ========================================================= */

const UiUtils = (() => {
  /* ---- Formateo ---- */

  /** Formatea un número como precio colombiano: $1.234.567 */
  function formatearPrecio(valor) {
    return `$${Number(valor || 0).toLocaleString("es-CO")}`;
  }

  /** Escapa caracteres HTML para prevenir XSS. */
  function escaparHTML(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Normaliza un número de cantidad a entero >= 0. */
  function normalizarCantidad(cantidad) {
    return Math.max(0, Number(cantidad) || 0);
  }

  /* ---- Alertas y mensajes inline ---- */

  /**
   * Muestra un mensaje en un elemento del DOM.
   * @param {string} idElemento - id del elemento en el HTML
   * @param {string} mensaje
   * @param {'success'|'error'|'warning'|'info'} tipo
   */
  function mostrarMensaje(idElemento, mensaje, tipo = "success") {
    const el = document.getElementById(idElemento);
    if (!el) return;
    el.textContent = mensaje;
    el.className = `${el.className.split(" ")[0]} show ${tipo}`;
  }

  /**
   * Muestra un mensaje de error en un campo de formulario.
   * @param {string} idError - id del span de error
   * @param {HTMLElement|null} input - el input al que marcar
   * @param {string} mensaje
   */
  function mostrarErrorCampo(idError, input, mensaje) {
    const el = document.getElementById(idError);
    if (el) el.textContent = mensaje;
    if (input) input.classList.add("input-invalid");
  }

  /** Limpia todos los errores de campos de un formulario. */
  function limpiarErroresCampos() {
    document.querySelectorAll(".field-error").forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll(".input-invalid").forEach((el) => {
      el.classList.remove("input-invalid");
    });
  }

  /* ---- Loading spinner ---- */

  /**
   * Muestra u oculta un spinner dentro de un botón.
   * @param {HTMLButtonElement} btn
   * @param {boolean} cargando
   * @param {string} textoOriginal - Texto a restaurar cuando cargando=false
   */
  function setBtnLoading(btn, cargando, textoOriginal = "Guardar") {
    if (!btn) return;
    btn.disabled = cargando;
    btn.innerHTML = cargando
      ? `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Cargando...`
      : textoOriginal;
  }

  /* ---- Validaciones ---- */

  function esCorreoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
  }

  function esTelefonoValido(telefono) {
    return /^\d{7,15}$/.test(String(telefono).replace(/[\s\-+]/g, ""));
  }

  /* ---- Resolución de rutas ---- */

  /**
   * Devuelve la ruta correcta a un archivo HTML teniendo en cuenta
   * si estamos en la raíz del proyecto o dentro de /html/.
   */
  function resolverRuta(nombreArchivo) {
    const rutaActual = window.location.pathname.toLowerCase();
    const estaEnRaiz = !rutaActual.includes("/html/");
    return estaEnRaiz ? `html/${nombreArchivo}` : nombreArchivo;
  }

  /* ---- Toast ---- */

  /**
   * Muestra un toast Bootstrap si existe el elemento #toastGlobal.
   * Crea uno dinámico si no existe.
   */
  function mostrarToast(titulo, mensaje, tipo = "success") {
    let toastEl = document.getElementById("toastGlobal");

    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toastGlobal";
      toastEl.className = `toast align-items-center text-bg-${tipo} border-0 position-fixed bottom-0 end-0 m-3`;
      toastEl.setAttribute("role", "alert");
      toastEl.setAttribute("aria-live", "assertive");
      toastEl.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">
            <strong>${escaparHTML(titulo)}</strong><br>
            ${escaparHTML(mensaje)}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;
      document.body.appendChild(toastEl);
    } else {
      const body = toastEl.querySelector(".toast-body");
      if (body) {
        body.innerHTML = `<strong>${escaparHTML(titulo)}</strong><br>${escaparHTML(mensaje)}`;
      }
      toastEl.className = `toast align-items-center text-bg-${tipo} border-0 position-fixed bottom-0 end-0 m-3`;
    }

    try {
      const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
      bsToast.show();
    } catch {
      // Bootstrap no cargado aún — mostramos el elemento directamente
      toastEl.classList.add("show");
      setTimeout(() => toastEl.classList.remove("show"), 3500);
    }
  }

  return {
    formatearPrecio,
    escaparHTML,
    normalizarCantidad,
    mostrarMensaje,
    mostrarErrorCampo,
    limpiarErroresCampos,
    setBtnLoading,
    esCorreoValido,
    esTelefonoValido,
    resolverRuta,
    mostrarToast,
  };
})();

/* Aliases globales para compatibilidad con código existente */
function formatearPrecio(valor) { return UiUtils.formatearPrecio(valor); }
function escaparHTML(texto)     { return UiUtils.escaparHTML(texto); }
function normalizarCantidad(n)  { return UiUtils.normalizarCantidad(n); }

window.UiUtils = UiUtils;
window.formatearPrecio = formatearPrecio;
window.escaparHTML = escaparHTML;
window.normalizarCantidad = normalizarCantidad;
