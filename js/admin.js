let products = JSON.parse(localStorage.getItem("products")) || [];

const form = document.getElementById("productForm");
const table = document.getElementById("productTable");

renderProducts();

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const product = {
    id: Date.now(),
    name: document.getElementById("name").value.trim(),
    price: Number(document.getElementById("price").value),
    stock: Number(document.getElementById("stock").value),
    category: document.getElementById("category").value,

    image:
      "https://via.placeholder.com/300x350?text=Producto"
  };

  products.push(product);

  saveProducts();

  renderProducts();

  console.log(
    JSON.stringify(products, null, 2)
  );

  form.reset();

  const modalElement =
    document.getElementById("productModal");

  const modal =
    bootstrap.Modal.getInstance(modalElement);

  if (modal) {
    modal.hide();
  }
});

function renderProducts() {
  table.innerHTML = "";

  products.forEach((product) => {
    table.innerHTML += `
      <tr>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>$${product.price.toLocaleString()}</td>
        <td>${product.stock}</td>

        <td>
          <button
            class="btn btn-danger btn-sm"
            onclick="deleteProduct(${product.id})">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });
}

function deleteProduct(id) {
  products = products.filter(
    product => product.id !== id
  );

  saveProducts();

  renderProducts();

  console.log(
    JSON.stringify(products, null, 2)
  );
}

function saveProducts() {
  localStorage.setItem(
    "products",
    JSON.stringify(products)
  );
}

