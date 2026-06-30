function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function updateQuantity(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    return removeFromCart(key);
  }
  saveCart(cart);
}

function removeFromCart(key) {
  const cart = getCart().filter(i => i.key !== key);
  saveCart(cart);
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById("cartItemsContainer");
  const summary = document.getElementById("cartSummary");

  if (!cart.length) {
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

  container.innerHTML = cart.map(item => {
    const sizeLabel = item.size && item.size !== "Única"
      ? `<span class="cart-item-size">Talla ${item.size}</span>`
      : "";

    const itemSubtotal = item.price * item.quantity;

    return `
      <div class="cart-item" data-key="${item.key}">
        <div class="cart-item-img">
          <img src="${item.image || 'https://via.placeholder.com/110x110?text=Producto'}" alt="${item.name}">
        </div>

        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          ${sizeLabel}
          <span class="cart-item-price">$${Number(item.price).toLocaleString()} c/u</span>
        </div>

        <div class="cart-item-actions">
          <span class="cart-item-subtotal">$${itemSubtotal.toLocaleString()}</span>
          <div class="qty-control">
            <button onclick="updateQuantity('${item.key}', -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateQuantity('${item.key}', 1)">+</button>
          </div>
          <button class="btn-remove" onclick="removeFromCart('${item.key}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  document.getElementById("cartSubtotal").textContent = `$${subtotal.toLocaleString()}`;
  document.getElementById("cartTotal").textContent = `$${subtotal.toLocaleString()}`;
}

document.getElementById("btnCheckout")?.addEventListener("click", () => {
  if (!getCart().length) return;
  alert("Función de checkout pendiente de implementar");
});

renderCart();