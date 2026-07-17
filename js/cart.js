function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem("cart", JSON.stringify(carrito));
  renderizarCarrito();
  actualizarContadorCarrito();
}

function obtenerProductos() {
  try {
    return JSON.parse(localStorage.getItem("products")) || [];
  } catch {
    return [];
  }
}

function guardarProductos(productos) {
  localStorage.setItem("products", JSON.stringify(productos));
}

function normalizarCantidad(cantidad) {
  return Math.max(0, Number(cantidad) || 0);
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarProducto(producto) {
  const stockPorTallaOriginal =
    producto.stockBySize &&
    typeof producto.stockBySize === "object" &&
    !Array.isArray(producto.stockBySize)
      ? producto.stockBySize
      : {};

  const tallas = Array.isArray(producto.sizes)
    ? producto.sizes.filter(Boolean)
    : Object.keys(stockPorTallaOriginal);

  const stockPorTalla = [...new Set([
    ...tallas,
    ...Object.keys(stockPorTallaOriginal)
  ])].reduce((resultado, talla) => {
    resultado[talla] = normalizarCantidad(stockPorTallaOriginal[talla]);
    return resultado;
  }, {});

  const esAccesorio = producto.category === "Accesorios";

  const stock = esAccesorio
    ? normalizarCantidad(producto.stock)
    : Object.values(stockPorTalla).reduce(
        (total, cantidad) => total + cantidad,
        0
      );

  return {
    ...producto,
    id: producto.id || producto.name,
    stockBySize: stockPorTalla,
    stock,
    esAccesorio
  };
}

function encontrarProductoParaItem(item, productos = obtenerProductos()) {
  return productos
    .map(normalizarProducto)
    .find((producto) => {
      const coincideId =
        item.productId &&
        String(producto.id) === String(item.productId);

      const coincideProductoAnterior =
        !item.productId &&
        producto.name === item.name;

      return coincideId || coincideProductoAnterior;
    });
}

function obtenerStockDisponibleItem(item, carrito = obtenerCarrito()) {
  const producto = encontrarProductoParaItem(item);

  if (!producto) {
    return 0;
  }

  const talla = item.size || "Única";

  const stockDeLaTalla = producto.esAccesorio
    ? producto.stock
    : normalizarCantidad(producto.stockBySize[talla]);

  const cantidadDeOtrosItems = carrito
    .filter((otroItem) => {
      return otroItem.key !== item.key;
    })
    .filter((otroItem) => {
      const mismoProducto =
        String(otroItem.productId || "") === String(producto.id) ||
        (!otroItem.productId && otroItem.name === producto.name);

      return mismoProducto && String(otroItem.size || "Única") === talla;
    })
    .reduce((total, otroItem) => {
      return total + normalizarCantidad(otroItem.quantity);
    }, 0);

  return Math.max(0, stockDeLaTalla - cantidadDeOtrosItems);
}

function actualizarContadorCarrito() {
  const carrito = obtenerCarrito();

  const totalItems = carrito.reduce((total, item) => {
    return total + normalizarCantidad(item.quantity);
  }, 0);

  const cartCount = document.getElementById("cartCount");

  if (!cartCount) {
    return;
  }

  cartCount.textContent = totalItems;
  cartCount.style.display = totalItems > 0 ? "flex" : "none";
}

function formatearPrecio(valor) {
  return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

function actualizarCantidad(clave, cambio) {
  const carrito = obtenerCarrito();
  const item = carrito.find((producto) => producto.key === clave);

  if (!item) {
    return;
  }

  const nuevaCantidad = normalizarCantidad(item.quantity) + cambio;

  if (nuevaCantidad <= 0) {
    eliminarDelCarrito(clave);
    return;
  }

  if (cambio > 0) {
    const disponible = obtenerStockDisponibleItem(item, carrito);

    if (nuevaCantidad > disponible) {
      alert(
        `No puedes agregar más unidades. Solo hay ${disponible} disponible${
          disponible === 1 ? "" : "s"
        } para esta talla.`
      );

      return;
    }
  }

  item.quantity = nuevaCantidad;
  guardarCarrito(carrito);
}

function eliminarDelCarrito(clave) {
  const carrito = obtenerCarrito().filter((item) => item.key !== clave);

  guardarCarrito(carrito);
}

function crearItemCarrito(item, carrito) {
  const producto = encontrarProductoParaItem(item);
  const disponible = obtenerStockDisponibleItem(item, carrito);
  const subtotal = Number(item.price || 0) * normalizarCantidad(item.quantity);
  const talla = item.size || "Única";

  const elemento = document.createElement("div");
  elemento.className = "cart-item";

  elemento.innerHTML = `
    <div class="cart-item-img">
      <img
        src="${escaparHTML(
          item.image || "https://via.placeholder.com/110x110?text=Producto"
        )}"
        alt="${escaparHTML(item.name || "Producto")}"
      >
    </div>

    <div class="cart-item-info">
      <span class="cart-item-name">
        ${escaparHTML(item.name || "Producto sin nombre")}
      </span>

      ${
        talla !== "Única"
          ? `<span class="cart-item-size">Talla ${escaparHTML(talla)}</span>`
          : ""
      }

      <span class="cart-item-price">
        ${formatearPrecio(item.price)} c/u
      </span>

      ${
        !producto
          ? `<span class="cart-stock-warning">Este producto ya no está disponible.</span>`
          : normalizarCantidad(item.quantity) > disponible
            ? `
              <span class="cart-stock-warning">
                Solo hay ${disponible} disponible${
                  disponible === 1 ? "" : "s"
                } para esta selección.
              </span>
            `
            : ""
      }
    </div>

    <div class="cart-item-actions">
      <span class="cart-item-subtotal">
        ${formatearPrecio(subtotal)}
      </span>

      <div class="qty-control">
        <button
          type="button"
          class="btn-decrease"
          aria-label="Disminuir cantidad"
        >
          −
        </button>

        <span>${normalizarCantidad(item.quantity)}</span>

        <button
          type="button"
          class="btn-increase"
          aria-label="Aumentar cantidad"
          ${
            !producto || normalizarCantidad(item.quantity) >= disponible
              ? "disabled"
              : ""
          }
        >
          +
        </button>
      </div>

      <button type="button" class="btn-remove">
        Eliminar
      </button>
    </div>
  `;

  elemento.querySelector(".btn-decrease").addEventListener("click", () => {
    actualizarCantidad(item.key, -1);
  });

  elemento.querySelector(".btn-increase").addEventListener("click", () => {
    actualizarCantidad(item.key, 1);
  });

  elemento.querySelector(".btn-remove").addEventListener("click", () => {
    eliminarDelCarrito(item.key);
  });

  return elemento;
}

function renderizarCarrito() {
  const carrito = obtenerCarrito();
  const contenedor = document.getElementById("cartItemsContainer");
  const resumen = document.getElementById("cartSummary");

  if (!contenedor || !resumen) {
    return;
  }

  contenedor.innerHTML = "";

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="cart-empty">
        <h3>Tu carrito está vacío</h3>
        <p>Explora el catálogo y añade tus productos favoritos.</p>
      </div>
    `;

    resumen.style.display = "none";
    return;
  }

  resumen.style.display = "block";

  let subtotal = 0;

  carrito.forEach((item) => {
    subtotal += Number(item.price || 0) * normalizarCantidad(item.quantity);

    contenedor.appendChild(crearItemCarrito(item, carrito));
  });

  document.getElementById("cartSubtotal").textContent = formatearPrecio(subtotal);
  document.getElementById("cartTotal").textContent = formatearPrecio(subtotal);
}

function validarCarritoAntesDeCompra(carrito, productos) {
  const errores = [];

  carrito.forEach((item) => {
    const producto = encontrarProductoParaItem(item, productos);
    const talla = item.size || "Única";

    if (!producto) {
      errores.push(
        `${item.name}: el producto ya no se encuentra disponible.`
      );

      return;
    }

    const cantidadSolicitada = normalizarCantidad(item.quantity);
    const stockDisponible = producto.esAccesorio
      ? producto.stock
      : normalizarCantidad(producto.stockBySize[talla]);

    if (cantidadSolicitada > stockDisponible) {
      errores.push(
        `${item.name}${
          talla !== "Única" ? `, talla ${talla}` : ""
        }: hay ${stockDisponible} disponible${
          stockDisponible === 1 ? "" : "s"
        }.`
      );
    }
  });

  return errores;
}

function descontarStockDeCompra(carrito, productos) {
  return productos.map((productoOriginal) => {
    const producto = normalizarProducto(productoOriginal);

    const itemRelacionado = carrito.find((item) => {
      const coincideId =
        item.productId &&
        String(item.productId) === String(producto.id);

      const coincideProductoAnterior =
        !item.productId &&
        item.name === producto.name;

      return coincideId || coincideProductoAnterior;
    });

    if (!itemRelacionado) {
      return productoOriginal;
    }

    if (producto.esAccesorio) {
      const cantidadComprada = carrito
        .filter((item) => {
          return (
            String(item.productId || "") === String(producto.id) ||
            (!item.productId && item.name === producto.name)
          );
        })
        .reduce((total, item) => {
          return total + normalizarCantidad(item.quantity);
        }, 0);

      return {
        ...productoOriginal,
        stock: Math.max(0, producto.stock - cantidadComprada),
        stockBySize: {},
        sizes: []
      };
    }

    const nuevoStockPorTalla = { ...producto.stockBySize };

    carrito.forEach((item) => {
      const coincideId =
        item.productId &&
        String(item.productId) === String(producto.id);

      const coincideProductoAnterior =
        !item.productId &&
        item.name === producto.name;

      if (!coincideId && !coincideProductoAnterior) {
        return;
      }

      const talla = item.size || "Única";

      nuevoStockPorTalla[talla] = Math.max(
        0,
        normalizarCantidad(nuevoStockPorTalla[talla]) -
          normalizarCantidad(item.quantity)
      );
    });

    const nuevoStockGeneral = Object.values(nuevoStockPorTalla).reduce(
      (total, cantidad) => total + normalizarCantidad(cantidad),
      0
    );

    return {
      ...productoOriginal,
      stockBySize: nuevoStockPorTalla,
      sizes: Object.keys(nuevoStockPorTalla),
      stock: nuevoStockGeneral
    };
  });
}

function finalizarCompra() {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  const productos = obtenerProductos();
  const errores = validarCarritoAntesDeCompra(carrito, productos);

  if (errores.length > 0) {
    alert(
      `No se puede finalizar la compra porque el stock cambió:\n\n${errores.join(
        "\n"
      )}`
    );

    renderizarCarrito();
    return;
  }

  const confirmar = confirm(
    "¿Deseas finalizar la compra? El stock de los productos se actualizará."
  );

  if (!confirmar) {
    return;
  }

  const productosActualizados = descontarStockDeCompra(carrito, productos);

  guardarProductos(productosActualizados);
  localStorage.removeItem("cart");

  renderizarCarrito();
  actualizarContadorCarrito();

  alert("Compra finalizada correctamente. Gracias por tu compra.");
}

const btnCheckout = document.getElementById("btnCheckout");

if (btnCheckout) {
  btnCheckout.addEventListener("click", finalizarCompra);
}

renderizarCarrito();
actualizarContadorCarrito();

window.updateQuantity = actualizarCantidad;
window.removeFromCart = eliminarDelCarrito;
window.updateCartCount = actualizarContadorCarrito;