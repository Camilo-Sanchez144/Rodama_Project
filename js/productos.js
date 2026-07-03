const container =
  document.getElementById("productContainer");

const products =
  JSON.parse(localStorage.getItem("products")) || [];

renderProducts();

function renderProducts() {

  if (products.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <h3>No hay productos disponibles</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  products.forEach((product) => {

    container.innerHTML += `
      <div class="col-md-4 col-lg-3">

        <div class="card h-100 shadow-sm">

          <img
            src="${product.image}"
            class="card-img-top"
            alt="${product.name}">

          <div class="card-body d-flex flex-column">

            <span class="badge bg-secondary mb-2">
              ${product.category}
            </span>

            <h5 class="card-title">
              ${product.name}
            </h5>

            <p class="text-muted">
              Stock: ${product.stock}
            </p>

            <h4 class="mt-auto">
              $${product.price.toLocaleString()}
            </h4>

          </div>

        </div>

      </div>
    `;
  });
}

function addToCart(product) {
  const cart = getCart();

  const existing = cart.find(item => item.key === product.key);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartCount(); 
}