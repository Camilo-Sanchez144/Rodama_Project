/* =========================================================
   PAGO.JS — Página de checkout / pago
   Depende de: api.config.js, api.service.js, auth.service.js,
               pedido.service.js, pago.service.js,
               producto.service.js, ui.utils.js, cart.store.js,
               shop-core.js  (calcularTotal, validarCarritoAntesDeCompra,
                               descontarStockDeCompra, etiquetaMetodoPago)
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  // Guard de sesión
  if (!AuthService.requiereAutenticacion("login.html")) return;

  const usuario = AuthService.getUsuarioActivo();

  /* ---- Referencias DOM ---- */
  const form      = document.getElementById("formPago");
  const errorBox  = document.getElementById("pagoError");
  const toast     = document.getElementById("toastPago");
  const toastTit  = document.getElementById("toastTitulo");
  const toastMsg  = document.getElementById("toastMensaje");
  const paneles   = {
    nequi:         document.getElementById("panel-nequi"),
    transferencia: document.getElementById("panel-transferencia"),
    contraentrega: document.getElementById("panel-contraentrega"),
  };

  /* ---- Validar que venga del carrito ---- */
  const compraPendiente = CartStore.getCompraPendiente();
  if (!compraPendiente || !compraPendiente.items?.length) {
    window.location.href = "./cart.html";
    return;
  }

  /* ---- Renderizar resumen del pedido ---- */
  renderizarResumenPago(compraPendiente);

  /* ---- Toggle paneles de método de pago ---- */
  document.querySelectorAll("input[name='metodoPago']").forEach((input) => {
    input.addEventListener("change", () => {
      Object.values(paneles).forEach((p) => p?.classList.remove("activo"));
      if (errorBox) errorBox.textContent = "";
      if (paneles[input.value]) paneles[input.value].classList.add("activo");
    });
  });

  /* ---- Envío del formulario ---- */
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const validacion = validarFormulario();
      if (!validacion) return;

      const btn = form.querySelector("button[type='submit']");
      UiUtils.setBtnLoading(btn, true, "Confirmar pago");

      try {
        await procesarPago(validacion.metodo, validacion.referencia);
      } catch (err) {
        if (errorBox) errorBox.textContent = err.message || "Error al procesar el pago.";
        UiUtils.setBtnLoading(btn, false, `Confirmar pago <i class="bi bi-arrow-right ms-2"></i>`);
      }
    });
  }

  /* ==============================================================
     RENDERIZAR RESUMEN
  ============================================================== */
  function renderizarResumenPago(compra) {
    const cont = document.getElementById("resumenItemsContainer");
    if (cont) {
      cont.innerHTML = compra.items
        .map((item) => {
          const talla    = item.size && item.size !== "Única" ? `Talla ${item.size} · ` : "";
          const cantidad = Number(item.quantity || 0);
          const subtot   = Number(item.price || 0) * cantidad;
          return `
            <div class="resumen-item">
              <img src="${UiUtils.escaparHTML(item.image || "https://via.placeholder.com/80x80?text=Producto")}"
                   alt="${UiUtils.escaparHTML(item.name || "Producto")}" class="resumen-img">
              <div class="resumen-info">
                <p class="resumen-nombre">${UiUtils.escaparHTML(item.name || "Producto sin nombre")}</p>
                <span class="resumen-detalle">${talla}Cant. ${cantidad}</span>
              </div>
              <span class="resumen-precio">${UiUtils.formatearPrecio(subtot)}</span>
            </div>
          `;
        })
        .join("");
    }

    _setTexto("resumenSubtotal", UiUtils.formatearPrecio(compra.subtotal));
    _setTexto("resumenEnvio", compra.envio === 0 ? "Gratis" : UiUtils.formatearPrecio(compra.envio));
    _setTexto("montoTotal", UiUtils.formatearPrecio(compra.total));

    const filaDesc = document.getElementById("resumenDescuentoRegistroRow");
    const valDesc  = document.getElementById("resumenDescuentoRegistro");
    if (filaDesc) filaDesc.style.display = compra.descuentoRegistro > 0 ? "flex" : "none";
    if (valDesc)  valDesc.textContent = `-${UiUtils.formatearPrecio(compra.descuentoRegistro)}`;

    const filaCup = document.getElementById("resumenCuponRow");
    const labelCup = document.getElementById("resumenCuponLabel");
    const valCup   = document.getElementById("resumenCuponValor");
    if (filaCup)   filaCup.style.display = compra.descuentoCupon > 0 ? "flex" : "none";
    if (labelCup)  labelCup.textContent  = `Cupón (${compra.cupon?.codigo || ""})`;
    if (valCup)    valCup.textContent    = `-${UiUtils.formatearPrecio(compra.descuentoCupon)}`;
  }

  function _setTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  /* ==============================================================
     VALIDACIÓN DEL FORMULARIO
  ============================================================== */
  function validarFormulario() {
    if (errorBox) errorBox.textContent = "";

    const metodoInput = document.querySelector("input[name='metodoPago']:checked");
    if (!metodoInput) {
      if (errorBox) errorBox.textContent = "Selecciona un método de pago para continuar.";
      return null;
    }

    const metodo = metodoInput.value;
    let referencia = "";

    if (metodo === "nequi") {
      const num = document.getElementById("nequiNumero");
      if (!num?.value.trim() || num.value.trim().length < 10) {
        if (errorBox) errorBox.textContent = "Ingresa un número Nequi válido (10 dígitos).";
        num?.classList.add("campo-error");
        return null;
      }
      referencia = num.value.trim();
    }

    if (metodo === "transferencia") {
      const ref = document.getElementById("referenciaTransferencia");
      if (!ref?.value.trim()) {
        if (errorBox) errorBox.textContent = "Ingresa el número de comprobante de la transferencia.";
        ref?.classList.add("campo-error");
        return null;
      }
      referencia = ref.value.trim();
    }

    if (metodo === "contraentrega") {
      const dir = document.getElementById("direccionEntrega");
      const tel = document.getElementById("telefonoEntrega");
      if (!dir?.value.trim()) {
        if (errorBox) errorBox.textContent = "Ingresa la dirección de entrega.";
        dir?.classList.add("campo-error");
        return null;
      }
      if (!tel?.value.trim() || tel.value.trim().length < 7) {
        if (errorBox) errorBox.textContent = "Ingresa un teléfono de contacto válido.";
        tel?.classList.add("campo-error");
        return null;
      }
      referencia = `${dir.value.trim()} | ${tel.value.trim()}`;
    }

    return { metodo, referencia };
  }

  /* ==============================================================
     PROCESAR PAGO — Llama al backend
  ============================================================== */
  async function procesarPago(metodo, referencia) {
    // 1) Crear pedido en el backend
    const datosPedido = PedidoService.buildFromCarrito(
      compraPendiente,
      usuario,
      _etiquetaMetodo(metodo)
    );
    const pedidoGuardado = await PedidoService.crear(datosPedido);

    // 2) Registrar pago en el backend
    const datosPago = PagoService.buildFromPedido(
      pedidoGuardado,
      usuario,
      metodo,
      referencia
    );
    await PagoService.registrar(datosPago);

    // 3) Limpiar carrito local
    CartStore.limpiar();

    // 4) Mostrar confirmación
    _mostrarToast(metodo);

    setTimeout(() => {
      window.location.href = "./cart.html";
    }, 2200);
  }

  function _etiquetaMetodo(metodo) {
    const map = {
      nequi: "Nequi",
      transferencia: "Transferencia bancaria",
      contraentrega: "Pago contraentrega",
    };
    return map[metodo] || metodo;
  }

  function _mostrarToast(metodo) {
    const map = {
      nequi:         { titulo: "Pago con Nequi recibido",    msg: "Estamos verificando tu pago. Redirigiendo..." },
      transferencia: { titulo: "Transferencia registrada",   msg: "Validaremos tu comprobante en breve." },
      contraentrega: { titulo: "Pedido confirmado",          msg: "Pagarás al recibir tu pedido." },
    };
    const { titulo, msg } = map[metodo] || { titulo: "Pago confirmado", msg: "Redirigiendo..." };

    if (toastTit) toastTit.textContent = titulo;
    if (toastMsg) toastMsg.textContent = msg;
    if (toast)    toast.classList.add("show");
  }
});