const container = document.getElementById("productContainer");
const searchInput = document.querySelector(".catalog-toolbar #searchInput");
const categoryFilter = document.getElementById("categoryFilter");

function obtenerUsuarioActivo() {
  try {
    return JSON.parse(localStorage.getItem("usuarioActivo"));
  } catch {
    return null;
  }
}

function obtenerProductos() {
  try {
    return JSON.parse(localStorage.getItem("products")) || [];
  } catch {
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem("cart", JSON.stringify(carrito));

  if (typeof window.updateCartCount === "function") {
    window.updateCartCount();
    return;
  }

  actualizarContadorCarrito();
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
  const contador = document.getElementById("cartCount");

  if (!contador) {
    return;
  }

  const total = carrito.reduce((suma, item) => {
    return suma + Number(item.quantity || 0);
  }, 0);

  contador.textContent = total;
  contador.style.display = total > 0 ? "flex" : "none";
}

function normalizarCantidad(cantidad) {
  return Math.max(0, Number(cantidad) || 0);
}

function normalizarProducto(producto) {
  const stockPorTalla =
    producto.stockBySize &&
    typeof producto.stockBySize === "object" &&
    !Array.isArray(producto.stockBySize)
      ? producto.stockBySize
      : {};

  const tallasGuardadas = Array.isArray(producto.sizes)
    ? producto.sizes.filter(Boolean)
    : Object.keys(stockPorTalla);

  const tallas = [...new Set([
    ...tallasGuardadas,
    ...Object.keys(stockPorTalla)
  ])];

  const stockPorTallaNormalizado = tallas.reduce((resultado, talla) => {
    resultado[talla] = normalizarCantidad(stockPorTalla[talla]);
    return resultado;
  }, {});

  const esAccesorio = producto.category === "Accesorios";

  const stockGeneral = esAccesorio
    ? normalizarCantidad(producto.stock)
    : Object.values(stockPorTallaNormalizado).reduce(
        (total, cantidad) => total + cantidad,
        0
      );

  const imagenes =
    Array.isArray(producto.images) && producto.images.length > 0
      ? producto.images
      : producto.image
        ? [producto.image]
        : ["https://via.placeholder.com/700x900?text=Producto"];

  return {
    ...producto,
    id: producto.id || producto.name,
    images: imagenes,
    image: imagenes[0],
    sizes: tallas,
    stockBySize: stockPorTallaNormalizado,
    stock: stockGeneral,
    esAccesorio
  };
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obtenerClaveFavoritos(usuario) {
  return `favorites_${usuario.id}`;
}

function obtenerFavoritos() {
  const usuario = obtenerUsuarioActivo();

  if (!usuario) {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(obtenerClaveFavoritos(usuario))) || [];
  } catch {
    return [];
  }
}

function guardarFavoritos(favoritos) {
  const usuario = obtenerUsuarioActivo();

  if (!usuario) {
    return;
  }

  localStorage.setItem(
    obtenerClaveFavoritos(usuario),
    JSON.stringify(favoritos)
  );
}

function esFavorito(productoId) {
  return obtenerFavoritos().some((favorito) => {
    return String(favorito.productId) === String(productoId);
  });
}

function alternarFavorito(producto) {
  const usuario = obtenerUsuarioActivo();

  if (!usuario) {
    alert("Inicia sesión para guardar productos en favoritos.");
    return;
  }

  let favoritos = obtenerFavoritos();

  const yaExiste = favoritos.some((favorito) => {
    return String(favorito.productId) === String(producto.id);
  });

  if (yaExiste) {
    favoritos = favoritos.filter((favorito) => {
      return String(favorito.productId) !== String(producto.id);
    });
  } else {
    favoritos.push({
      productId: producto.id,
      name: producto.name || "Producto sin nombre",
      price: Number(producto.price || 0),
      image: producto.image || "",
      category: producto.category || ""
    });
  }

  guardarFavoritos(favoritos);
  filtrarProductos();
}

function obtenerCantidadEnCarrito(producto, talla) {
  return obtenerCarrito()
    .filter((item) => {
      const mismoId =
        String(item.productId || "") === String(producto.id);

      const mismoProductoAnterior =
        !item.productId &&
        item.name === producto.name;

      return (
        (mismoId || mismoProductoAnterior) &&
        String(item.size || "Única") === String(talla)
      );
    })
    .reduce((total, item) => {
      return total + normalizarCantidad(item.quantity);
    }, 0);
}

function obtenerStockDisponible(producto, talla) {
  const stockDeLaTalla = producto.esAccesorio
    ? normalizarCantidad(producto.stock)
    : normalizarCantidad(producto.stockBySize[talla]);

  return Math.max(
    0,
    stockDeLaTalla - obtenerCantidadEnCarrito(producto, talla)
  );
}

function obtenerProductoActualizado(productoId) {
  return obtenerProductos()
    .map(normalizarProducto)
    .find((producto) => String(producto.id) === String(productoId));
}

function agregarAlCarrito(productoId, talla, cantidad) {
  const producto = obtenerProductoActualizado(productoId);

  if (!producto) {
    alert("El producto ya no está disponible.");
    return false;
  }

  const disponible = obtenerStockDisponible(producto, talla);
  const cantidadSolicitada = normalizarCantidad(cantidad);

  if (cantidadSolicitada < 1 || disponible < cantidadSolicitada) {
    alert(
      `Solo hay ${disponible} unidad${
        disponible === 1 ? "" : "es"
      } disponible${
        disponible === 1 ? "" : "s"
      } para esta talla.`
    );

    return false;
  }

  const carrito = obtenerCarrito();
  const clave = `${producto.id}-${talla}`;

  const productoExistente = carrito.find((item) => item.key === clave);

  if (productoExistente) {
    productoExistente.quantity += cantidadSolicitada;
  } else {
    carrito.push({
      key: clave,
      productId: producto.id,
      name: producto.name,
      price: Number(producto.price || 0),
      image: producto.image || "",
      size: talla,
      quantity: cantidadSolicitada
    });
  }

  guardarCarrito(carrito);
  mostrarNotificacionCarrito(producto.name, cantidadSolicitada, talla);

  return true;
}

function mostrarNotificacionCarrito(nombre, cantidad, talla) {
  const notificacionAnterior = document.getElementById("cartToast");

  if (notificacionAnterior) {
    notificacionAnterior.remove();
  }

  const toast = document.createElement("div");

  toast.id = "cartToast";
  toast.className =
    "toast align-items-center text-bg-dark border-0 position-fixed bottom-0 end-0 m-3";
  toast.setAttribute("role", "alert");
  toast.style.zIndex = "9999";

  const contenido = document.createElement("div");
  contenido.className = "d-flex";

  const mensaje = document.createElement("div");
  mensaje.className = "toast-body";
  mensaje.textContent =
    `${cantidad} unidad${cantidad === 1 ? "" : "es"} de ${nombre}` +
    (talla !== "Única" ? `, talla ${talla}` : "") +
    " se añadió al carrito.";

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "btn-close btn-close-white me-2 m-auto";
  cerrar.setAttribute("data-bs-dismiss", "toast");
  cerrar.setAttribute("aria-label", "Cerrar");

  contenido.append(mensaje, cerrar);
  toast.appendChild(contenido);
  document.body.appendChild(toast);

  const instanciaToast = new bootstrap.Toast(toast, { delay: 3000 });

  instanciaToast.show();

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

function crearCarrusel(producto, indice) {
  const carouselId = `productCarousel${indice}`;

  const indicadores =
    producto.images.length > 1
      ? `
        <div class="carousel-indicators">
          ${producto.images
            .map((_, posicion) => {
              return `
                <button
                  type="button"
                  data-bs-target="#${carouselId}"
                  data-bs-slide-to="${posicion}"
                  class="${posicion === 0 ? "active" : ""}"
                  ${posicion === 0 ? 'aria-current="true"' : ""}
                  aria-label="Imagen ${posicion + 1}"
                ></button>
              `;
            })
            .join("")}
        </div>
      `
      : "";

  const controles =
    producto.images.length > 1
      ? `
        <button
          class="carousel-control-prev"
          type="button"
          data-bs-target="#${carouselId}"
          data-bs-slide="prev"
          aria-label="Imagen anterior"
        >
          <span class="carousel-control-prev-icon"></span>
        </button>

        <button
          class="carousel-control-next"
          type="button"
          data-bs-target="#${carouselId}"
          data-bs-slide="next"
          aria-label="Imagen siguiente"
        >
          <span class="carousel-control-next-icon"></span>
        </button>
      `
      : "";

  return `
    <div id="${carouselId}" class="carousel slide product-carousel">
      ${indicadores}

      <div class="carousel-inner">
        ${producto.images
          .map((imagen, posicion) => {
            return `
              <div class="carousel-item ${posicion === 0 ? "active" : ""}">
                <img
                  src="${escaparHTML(imagen)}"
                  alt="${escaparHTML(producto.name || "Producto")}"
                >
              </div>
            `;
          })
          .join("")}
      </div>

      ${controles}
    </div>
  `;
}

function crearSelectorTallas(producto) {
  if (producto.esAccesorio) {
    return `
      <div class="product-size-selector">
        <span class="meta-label">Presentación</span>
        <span class="size-chip size-chip-selected">Única</span>
      </div>
    `;
  }

  if (producto.sizes.length === 0) {
    return `
      <div class="product-size-selector">
        <span class="meta-label">Tallas</span>
        <p class="stock-message">Este producto no tiene tallas disponibles.</p>
      </div>
    `;
  }

  return `
    <div class="product-size-selector">
      <span class="meta-label">Elige tu talla</span>

      <div class="size-list product-size-list">
        ${producto.sizes
          .map((talla) => {
            const cantidad = normalizarCantidad(producto.stockBySize[talla]);
            const agotada = cantidad === 0;

            return `
              <button
                type="button"
                class="size-choice ${agotada ? "is-disabled" : ""}"
                data-size="${escaparHTML(talla)}"
                ${agotada ? "disabled" : ""}
                aria-label="Talla ${escaparHTML(talla)}, ${cantidad} disponibles"
              >
                ${escaparHTML(talla)}
                <small>${cantidad}</small>
              </button>
            `;
          })
          .join("")}
      </div>

      <p class="stock-message" data-stock-message>
        Selecciona una talla para continuar.
      </p>
    </div>
  `;
}

function crearTarjetaProducto(producto, indice) {
  const productoSinStock = producto.stock <= 0;
  const favorito = esFavorito(producto.id);

  const tarjeta = document.createElement("div");
  tarjeta.className = "col-md-6 col-lg-4";

  tarjeta.innerHTML = `
    <article class="product-card" data-product-id="${escaparHTML(producto.id)}">
      <div class="product-image-wrapper">
        ${crearCarrusel(producto, indice)}

        <button
          type="button"
          class="favorite-button ${favorito ? "is-favorite" : ""}"
          aria-label="${favorito ? "Quitar de favoritos" : "Agregar a favoritos"}"
          title="${favorito ? "Quitar de favoritos" : "Agregar a favoritos"}"
        >
          <i class="bi ${favorito ? "bi-heart-fill" : "bi-heart"}"></i>
        </button>
      </div>

      <div class="product-body">
        <div class="product-top">
          <span class="product-category">
            ${escaparHTML(producto.category || "Sin categoría")}
          </span>

          <span class="product-stock">
            Stock: ${producto.stock}
          </span>
        </div>

        <h3 class="product-name">
          ${escaparHTML(producto.name || "Producto sin nombre")}
        </h3>

        ${
          producto.description
            ? `
              <p class="product-description">
                ${escaparHTML(producto.description)}
              </p>
            `
            : ""
        }

        <div class="product-meta">
          ${crearSelectorTallas(producto)}
        </div>

        <div class="product-purchase-controls">
          <div class="quantity-selector">
            <span class="meta-label">Cantidad</span>

            <div class="quantity-control">
              <button
                type="button"
                class="quantity-button quantity-minus"
                aria-label="Disminuir cantidad"
                disabled
              >
                −
              </button>

              <span class="quantity-value" aria-live="polite">1</span>

              <button
                type="button"
                class="quantity-button quantity-plus"
                aria-label="Aumentar cantidad"
                disabled
              >
                +
              </button>
            </div>
          </div>

          <p class="stock-message product-stock-feedback" aria-live="polite">
            ${
              productoSinStock
                ? "Producto agotado."
                : producto.esAccesorio
                  ? `${obtenerStockDisponible(producto, "Única")} disponibles.`
                  : "Selecciona una talla para conocer la disponibilidad."
            }
          </p>
        </div>

        <div class="product-footer">
          <h4 class="product-price">
            $${Number(producto.price || 0).toLocaleString("es-CO")}
          </h4>

          <button
            type="button"
            class="btn btn-dark btn-add-cart"
            ${productoSinStock ? "disabled" : ""}
          >
            ${productoSinStock ? "Sin stock" : "Añadir al carrito"}
          </button>
        </div>
      </div>
    </article>
  `;

  configurarTarjetaProducto(tarjeta, producto);

  return tarjeta;
}

function configurarTarjetaProducto(tarjeta, producto) {
  const botonFavorito = tarjeta.querySelector(".favorite-button");
  const botonesTalla = tarjeta.querySelectorAll(".size-choice");
  const botonMenos = tarjeta.querySelector(".quantity-minus");
  const botonMas = tarjeta.querySelector(".quantity-plus");
  const valorCantidad = tarjeta.querySelector(".quantity-value");
  const botonAgregar = tarjeta.querySelector(".btn-add-cart");
  const mensajeStock = tarjeta.querySelector(".product-stock-feedback");

  let tallaSeleccionada = producto.esAccesorio ? "Única" : null;
  let cantidadSeleccionada = 1;

  function obtenerDisponibleActual() {
    if (!tallaSeleccionada) {
      return 0;
    }

    const productoActualizado =
      obtenerProductoActualizado(producto.id) || producto;

    return obtenerStockDisponible(productoActualizado, tallaSeleccionada);
  }

  function actualizarControles() {
    const disponible = obtenerDisponibleActual();

    if (cantidadSeleccionada > disponible && disponible > 0) {
      cantidadSeleccionada = disponible;
    }

    if (cantidadSeleccionada < 1) {
      cantidadSeleccionada = 1;
    }

    valorCantidad.textContent = cantidadSeleccionada;

    botonMenos.disabled = cantidadSeleccionada <= 1 || disponible <= 0;
    botonMas.disabled =
      !tallaSeleccionada ||
      disponible <= cantidadSeleccionada;

    botonAgregar.disabled = !tallaSeleccionada || disponible <= 0;

    if (!tallaSeleccionada) {
      mensajeStock.textContent =
        "Selecciona una talla para conocer la disponibilidad.";
      return;
    }

    if (disponible <= 0) {
      mensajeStock.textContent =
        "Esta talla ya no tiene unidades disponibles.";
      return;
    }

    mensajeStock.textContent =
      `${disponible} unidad${disponible === 1 ? "" : "es"} disponible${
        disponible === 1 ? "" : "s"
      } para esta selección.`;
  }

  botonFavorito.addEventListener("click", () => {
    alternarFavorito(producto);
  });

  botonesTalla.forEach((boton) => {
    boton.addEventListener("click", () => {
      tallaSeleccionada = boton.dataset.size;
      cantidadSeleccionada = 1;

      botonesTalla.forEach((botonTalla) => {
        botonTalla.classList.remove("selected");
        botonTalla.setAttribute("aria-pressed", "false");
      });

      boton.classList.add("selected");
      boton.setAttribute("aria-pressed", "true");

      const mensajeTallas = tarjeta.querySelector("[data-stock-message]");

      if (mensajeTallas) {
        const disponible = obtenerDisponibleActual();

        mensajeTallas.textContent =
          disponible > 0
            ? `Talla ${tallaSeleccionada} seleccionada.`
            : `La talla ${tallaSeleccionada} está agotada.`;
      }

      actualizarControles();
    });
  });

  botonMenos.addEventListener("click", () => {
    if (cantidadSeleccionada > 1) {
      cantidadSeleccionada -= 1;
      actualizarControles();
    }
  });

  botonMas.addEventListener("click", () => {
    const disponible = obtenerDisponibleActual();

    if (cantidadSeleccionada < disponible) {
      cantidadSeleccionada += 1;
      actualizarControles();
    }
  });

  botonAgregar.addEventListener("click", () => {
    if (!tallaSeleccionada) {
      mensajeStock.textContent = "Selecciona una talla antes de añadir.";
      return;
    }

    const agregado = agregarAlCarrito(
      producto.id,
      tallaSeleccionada,
      cantidadSeleccionada
    );

    if (agregado) {
      cantidadSeleccionada = 1;
      actualizarControles();
    }
  });

  actualizarControles();
}

function renderizarProductos(listaProductos) {
  if (!container) {
    return;
  }

  const productos = listaProductos.map(normalizarProducto);

  if (productos.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <h3>No hay productos disponibles</h3>
          <p>No se encontraron productos con los filtros seleccionados.</p>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  productos.forEach((producto, indice) => {
    container.appendChild(crearTarjetaProducto(producto, indice));
  });
}

function filtrarProductos() {
  const textoBusqueda = (searchInput?.value || "").toLowerCase().trim();
  const categoriaSeleccionada = categoryFilter?.value || "all";

  const productosFiltrados = obtenerProductos().filter((producto) => {
    const nombre = (producto.name || "").toLowerCase();
    const categoria = (producto.category || "").toLowerCase();
    const descripcion = (producto.description || "").toLowerCase();

    const coincideBusqueda =
      nombre.includes(textoBusqueda) ||
      categoria.includes(textoBusqueda) ||
      descripcion.includes(textoBusqueda);

    const coincideCategoria =
      categoriaSeleccionada === "all" ||
      producto.category === categoriaSeleccionada;

    return coincideBusqueda && coincideCategoria;
  });

  renderizarProductos(productosFiltrados);
}

if (searchInput) {
  searchInput.addEventListener("input", filtrarProductos);
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", filtrarProductos);
}

renderizarProductos(obtenerProductos());
actualizarContadorCarrito();