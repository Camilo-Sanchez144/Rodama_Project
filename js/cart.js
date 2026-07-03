function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch (error) {
    console.error("Error al leer el carrito:", error);
    return [];
  }
}


function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
  updateCartCount();
}


function updateCartCount() {
  const cart = getCart();

  // Total de productos (suma de cantidades)
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  console.log(totalItems);
  const cartCount = document.getElementById("cartCount");

  if (cartCount) {
    cartCount.textContent = totalItems;
  }
}


function formatPrice(value) {
  return `$${Number(value).toLocaleString("es-CO")}`;
}

function updateQuantity(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);

  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    removeFromCart(key);
    return;
  }

  saveCart(cart);
}


function removeFromCart(key) {
  const cart = getCart().filter(item => item.key !== key);
  saveCart(cart);
}


function renderCart() {
  const cart = getCart();

  const container = document.getElementById("cartItemsContainer");
  const summary = document.getElementById("cartSummary");

  if (!container || !summary) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <h3>Tu carrito está vacío</h3>
        <p>Explora el catálogo y añade tus productos favoritos.</p>
      </div>
    `;

    summary.style.display = "none";
    return;
  }

  summary.style.display = "block";

  let subtotal = 0;

  container.innerHTML = cart.map(item => {

    const itemSubtotal = item.price * item.quantity;
    subtotal += itemSubtotal;

    const sizeLabel =
      item.size && item.size !== "Única"
        ? `<span class="cart-item-size">Talla ${item.size}</span>`
        : "";

    return `
      <div class="cart-item" data-key="${item.key}">

        <div class="cart-item-img">
          <img
            src="${item.image || 'https://via.placeholder.com/110x110?text=Producto'}"
            alt="${item.name}">
        </div>

        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>

          ${sizeLabel}

          <span class="cart-item-price">
            ${formatPrice(item.price)} c/u
          </span>
        </div>

        <div class="cart-item-actions">

          <span class="cart-item-subtotal">
            ${formatPrice(itemSubtotal)}
          </span>

          <div class="qty-control">

            <button
              onclick="updateQuantity('${item.key}', -1)"
              aria-label="Disminuir cantidad">
              −
            </button>

            <span>${item.quantity}</span>

            <button
              onclick="updateQuantity('${item.key}', 1)"
              aria-label="Aumentar cantidad">
              +
            </button>

          </div>

          <button
            class="btn-remove"
            onclick="removeFromCart('${item.key}')">
            Eliminar
          </button>

        </div>

      </div>
    `;
  }).join("");

  document.getElementById("cartSubtotal").textContent = formatPrice(subtotal);
  document.getElementById("cartTotal").textContent = formatPrice(subtotal);
}

const btnCheckout = document.getElementById("btnCheckout");

if (btnCheckout) {
  btnCheckout.addEventListener("click", () => {

    if (!getCart().length) {
      alert("Tu carrito está vacío.");
      return;
    }

    // Aquí puedes redirigir a tu página de pago
    // window.location.href = "checkout.html";

    alert("Función de checkout pendiente de implementar.");
  });
}

renderCart();
updateCartCount();

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
  updateCartCount();
}