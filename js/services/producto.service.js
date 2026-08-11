const ProductoService = (() => {
  const EP = API_CONFIG.ENDPOINTS;

  /**
   * Traduce un producto de la base de datos (Spring Boot) a formato frontend.
   */
  function toFrontend(p) {
    if (!p) return null;

    // Normalizar imágenes
    let images = [];
    if (Array.isArray(p.images) && p.images.length > 0) {
      images = p.images;
    } else if (p.imageUrl) {
      images = [p.imageUrl];
    } else if (p.image) {
      images = [p.image];
    } else {
      images = ["https://via.placeholder.com/700x900?text=Producto"];
    }

    // Normalizar tallas (sizes) y stock por talla (stockBySize)
    let stockBySize = {};
    if (p.stockBySize && typeof p.stockBySize === "object" && !Array.isArray(p.stockBySize)) {
      stockBySize = p.stockBySize;
    }

    let sizes = [];
    if (Array.isArray(p.sizes) && p.sizes.length > 0) {
      sizes = p.sizes.filter(Boolean);
    } else if (p.talla) {
      // Permite tallas separadas por coma, ej: "S, M, L" o simples "M"
      sizes = String(p.talla).split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      sizes = Object.keys(stockBySize);
    }

    // Si hay stock global pero no distribuido por talla, distribuirlo equitativamente
    const stockTotal = UiUtils.normalizarCantidad(p.stock);
    if (Object.keys(stockBySize).length === 0 && sizes.length > 0) {
      if (sizes.length === 1) {
        stockBySize[sizes[0]] = stockTotal;
      } else {
        sizes.forEach((s) => {
          stockBySize[s] = stockTotal;
        });
      }
    }

    // Normalizar categoría
    let catVal = p.categoria || p.category || "";
    if (catVal && typeof catVal === "object") {
      catVal = catVal.nombre || catVal.name || "";
    }

    return {
      ...p,
      id: p.id,
      name: p.nombre || p.name || "",
      price: Number(p.precio || p.price || 0),
      category: String(catVal),
      description: p.descripcion || p.description || "",
      image: images[0],
      images: images,
      sizes: sizes,
      stockBySize: stockBySize,
      stock: stockTotal,
      esAccesorio: String(catVal).toUpperCase() === "ACCESORIOS",
    };
  }

  /**
   * Traduce un producto del frontend a formato backend (Spring Boot).
   */
  function toBackend(p) {
    if (!p) return null;

    let catVal = p.category || p.categoria;
    // Si categoría es un objeto, extraer el valor
    if (catVal && typeof catVal === "object") {
      catVal = catVal.nombre || catVal.name || catVal;
    }

    let tallaStr = "";
    if (Array.isArray(p.sizes) && p.sizes.length > 0) {
      tallaStr = p.sizes.join(", ");
    } else if (p.talla) {
      tallaStr = p.talla;
    }

    return {
      id: p.id,
      nombre: p.name || p.nombre,
      precio: Number(p.price || p.precio || 0),
      categoria: catVal,
      descripcion: p.description || p.descripcion,
      stock: UiUtils.normalizarCantidad(p.stock),
      talla: tallaStr,
      imageUrl: p.image || p.imageUrl || (p.images && p.images[0]) || "",
    };
  }

  /** GET /api/producto — Lista todos los productos */
  async function getAll() {
    const list = await ApiService.get(EP.PRODUCTO);
    return (list || []).map(toFrontend);
  }

  /** GET /api/producto/{id} */
  async function getById(id) {
    const item = await ApiService.get(EP.PRODUCTO_POR_ID(id));
    return toFrontend(item);
  }

  /** GET /api/producto/categoria/{categoria} */
  async function getByCategoria(categoria) {
    const list = await ApiService.get(EP.PRODUCTO_POR_CATEGORIA(categoria));
    return (list || []).map(toFrontend);
  }

  /**
   * POST /api/producto — Crear nuevo producto (Admin).
   * @param {object} datos
   */
  async function crear(datos) {
    const backendData = toBackend(datos);
    const response = await ApiService.post(EP.PRODUCTO, backendData);
    return toFrontend(response);
  }

  /**
   * PUT /api/producto/{id} — Actualizar producto existente (Admin).
   * @param {number|string} id
   * @param {object} datos
   */
  async function actualizar(id, datos) {
    const backendData = toBackend(datos);
    const response = await ApiService.put(EP.PRODUCTO_POR_ID(id), backendData);
    return toFrontend(response);
  }

  /** DELETE /api/producto/{id} (Admin) */
  async function eliminar(id) {
    return ApiService.del(EP.PRODUCTO_POR_ID(id));
  }

  /* ---- Cache local de productos ---- */
  const CACHE_KEY = "products";

  function getCache() {
    try {
      const list = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
      return list.map(toFrontend);
    } catch {
      return [];
    }
  }

  function setCache(productos) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(productos));
  }

  /**
   * Carga productos del backend y los guarda en caché local.
   */
  async function cargarYCachear() {
    try {
      const productos = await getAll();
      setCache(productos);
      return productos;
    } catch (error) {
      console.warn("ProductoService: no se pudo conectar al backend, usando caché local.", error);
      return getCache();
    }
  }

  return {
    getAll,
    getById,
    getByCategoria,
    crear,
    actualizar,
    eliminar,
    getCache,
    setCache,
    cargarYCachear,
    toFrontend,
    toBackend,
  };
})();

window.ProductoService = ProductoService;
