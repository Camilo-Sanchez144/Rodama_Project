document.addEventListener('DOMContentLoaded', function () {

  // Esta página depende de que shop-core.js esté cargado ANTES que pago.js
  // en payment.html (usa obtenerCompraPendiente, obtenerProductos,
  // validarCarritoAntesDeCompra, descontarStockDeCompra, guardarProductos,
  // obtenerUsuarioActivo, guardarPedido, generarIdPedido, etiquetaMetodoPago,
  // eliminarCompraPendiente, quitarCupon, actualizarContadorCarrito, formatearPrecio).

  const form = document.getElementById('formPago');
  const metodoInputs = document.querySelectorAll('input[name="metodoPago"]');
  const paneles = {
    nequi: document.getElementById('panel-nequi'),
    transferencia: document.getElementById('panel-transferencia'),
    contraentrega: document.getElementById('panel-contraentrega')
  };
  const errorBox = document.getElementById('pagoError');
  const toast = document.getElementById('toastPago');
  const toastTitulo = document.getElementById('toastTitulo');
  const toastMensaje = document.getElementById('toastMensaje');

  // Si alguien llega directo a payment.html sin pasar por el carrito,
  // no hay nada que cobrar: lo mandamos de vuelta.
  const compraPendiente = obtenerCompraPendiente();
  if (!compraPendiente || !compraPendiente.items || compraPendiente.items.length === 0) {
    window.location.href = './cart.html';
    return;
  }

  // Pinta el resumen del pedido (ítems + totales) a partir de compraPendiente
  renderizarResumenPago(compraPendiente);

  function renderizarResumenPago(compra) {
    const contenedorItems = document.getElementById('resumenItemsContainer');
    if (contenedorItems) {
      contenedorItems.innerHTML = compra.items.map(function (item) {
        const talla = item.size && item.size !== 'Única' ? `Talla ${item.size} · ` : '';
        const cantidad = Number(item.quantity || 0);
        const subtotalItem = Number(item.price || 0) * cantidad;

        return `
          <div class="resumen-item">
            <img src="${escaparHTML(item.image || 'https://via.placeholder.com/80x80?text=Producto')}"
                 alt="${escaparHTML(item.name || 'Producto')}" class="resumen-img" />
            <div class="resumen-info">
              <p class="resumen-nombre">${escaparHTML(item.name || 'Producto sin nombre')}</p>
              <span class="resumen-detalle">${talla}Cant. ${cantidad}</span>
            </div>
            <span class="resumen-precio">${formatearPrecio(subtotalItem)}</span>
          </div>
        `;
      }).join('');
    }

    const subtotalEl = document.getElementById('resumenSubtotal');
    if (subtotalEl) subtotalEl.textContent = formatearPrecio(compra.subtotal);

    const filaDescuento = document.getElementById('resumenDescuentoRegistroRow');
    const valorDescuento = document.getElementById('resumenDescuentoRegistro');
    if (filaDescuento) {
      filaDescuento.style.display = compra.descuentoRegistro > 0 ? 'flex' : 'none';
    }
    if (valorDescuento) {
      valorDescuento.textContent = `-${formatearPrecio(compra.descuentoRegistro)}`;
    }

    const filaCupon = document.getElementById('resumenCuponRow');
    const labelCupon = document.getElementById('resumenCuponLabel');
    const valorCupon = document.getElementById('resumenCuponValor');
    if (filaCupon) {
      filaCupon.style.display = compra.descuentoCupon > 0 ? 'flex' : 'none';
    }
    if (labelCupon) {
      labelCupon.textContent = `Cupón (${compra.cupon ? compra.cupon.codigo : ''})`;
    }
    if (valorCupon) {
      valorCupon.textContent = `-${formatearPrecio(compra.descuentoCupon)}`;
    }

    const envioEl = document.getElementById('resumenEnvio');
    if (envioEl) {
      envioEl.textContent = compra.envio === 0 ? 'Gratis' : formatearPrecio(compra.envio);
    }

    const totalEl = document.getElementById('montoTotal');
    if (totalEl) totalEl.textContent = formatearPrecio(compra.total);
  }

  function ocultarPaneles() {
    Object.values(paneles).forEach(function (panel) {
      if (panel) panel.classList.remove('activo');
    });
  }

  metodoInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      ocultarPaneles();
      errorBox.textContent = '';
      limpiarErrores();
      if (paneles[input.value]) {
        paneles[input.value].classList.add('activo');
      }
    });
  });

  function limpiarErrores() {
    document.querySelectorAll('.campo-error').forEach(function (el) {
      el.classList.remove('campo-error');
    });
  }

  function marcarError(input) {
    if (input) input.classList.add('campo-error');
  }

  function validarFormulario() {
    limpiarErrores();
    errorBox.textContent = '';

    const metodoSeleccionado = document.querySelector('input[name="metodoPago"]:checked');

    if (!metodoSeleccionado) {
      errorBox.textContent = 'Selecciona un método de pago para continuar.';
      return false;
    }

    const metodo = metodoSeleccionado.value;

    if (metodo === 'nequi') {
      const numero = document.getElementById('nequiNumero');
      if (!numero.value.trim() || numero.value.trim().length < 10) {
        marcarError(numero);
        errorBox.textContent = 'Ingresa un número Nequi válido (10 dígitos).';
        return false;
      }
    }

    if (metodo === 'transferencia') {
      const referencia = document.getElementById('referenciaTransferencia');
      if (!referencia.value.trim()) {
        marcarError(referencia);
        errorBox.textContent = 'Ingresa el número de comprobante de la transferencia.';
        return false;
      }
    }

    if (metodo === 'contraentrega') {
      const direccion = document.getElementById('direccionEntrega');
      const telefono = document.getElementById('telefonoEntrega');
      if (!direccion.value.trim()) {
        marcarError(direccion);
        errorBox.textContent = 'Ingresa la dirección de entrega.';
        return false;
      }
      if (!telefono.value.trim() || telefono.value.trim().length < 7) {
        marcarError(telefono);
        errorBox.textContent = 'Ingresa un teléfono de contacto válido.';
        return false;
      }
    }

    return { valido: true, metodo: metodo };
  }

  function mensajesPorMetodo(metodo) {
    const mensajes = {
      nequi: {
        titulo: 'Pago con Nequi recibido',
        mensaje: 'Estamos verificando tu pago. Redirigiendo a tu carrito...'
      },
      transferencia: {
        titulo: 'Transferencia registrada',
        mensaje: 'Validaremos tu comprobante en breve. Redirigiendo...'
      },
      contraentrega: {
        titulo: 'Pedido confirmado',
        mensaje: 'Pagarás al recibir tu pedido. Redirigiendo a tu carrito...'
      }
    };
    return mensajes[metodo] || { titulo: 'Pago confirmado', mensaje: 'Redirigiendo a tu carrito...' };
  }

  function mostrarToast(metodo) {
    const contenido = mensajesPorMetodo(metodo);
    toastTitulo.textContent = contenido.titulo;
    toastMensaje.textContent = contenido.mensaje;
    toast.classList.add('show');
  }

  // ===== NUEVO: procesa el pago real usando shop-core.js =====
  function procesarPago(metodo) {
    // 1) El usuario debe estar logueado para poder guardar el pedido a su nombre
    const usuarioActivo = obtenerUsuarioActivo();
    if (!usuarioActivo) {
      errorBox.textContent = 'Tu sesión expiró. Inicia sesión de nuevo para completar el pago.';
      return false;
    }

    // 2) Re-validar stock: pudo cambiar entre que se hizo click en "Finalizar compra"
    //    y el momento de confirmar el pago.
    const productos = obtenerProductos();
    const erroresStock = validarCarritoAntesDeCompra(compraPendiente.items, productos);

    if (erroresStock.length > 0) {
      errorBox.textContent =
        'El stock cambió mientras completabas el pago: ' + erroresStock.join(' ');
      return false;
    }

    // 3) Descontar stock real
    const productosActualizados = descontarStockDeCompra(compraPendiente.items, productos);
    guardarProductos(productosActualizados);

    // 4) Crear y guardar el pedido (con la forma que espera profile.js)
    const pedido = {
      id: generarIdPedido(),
      usuarioId: usuarioActivo.id,
      fecha: new Date().toISOString(),
      items: compraPendiente.items,
      estado: 'confirmado',
      metodoPago: etiquetaMetodoPago(metodo),
      total: compraPendiente.total
    };
    guardarPedido(pedido);

    // 5) Limpiar carrito y compra pendiente
    localStorage.removeItem('cart');
    eliminarCompraPendiente();
    quitarCupon();
    actualizarContadorCarrito();

    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const resultado = validarFormulario();
    if (!resultado || !resultado.valido) {
      return;
    }

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    boton.innerHTML = 'Procesando... <i class="bi bi-hourglass-split ms-2"></i>';

    const exito = procesarPago(resultado.metodo);

    if (!exito) {
      // Reactivar el botón si algo falló (sesión expiró, stock cambió, etc.)
      boton.disabled = false;
      boton.innerHTML = 'Confirmar pago <i class="bi bi-arrow-right ms-2"></i>';
      return;
    }

    mostrarToast(resultado.metodo);

    setTimeout(function () {
      window.location.href = './cart.html';
    }, 2200);
  });

});