window.addEventListener("scroll", function () {
  document
    .querySelector(".custom-navbar")
    .classList.toggle("scrolled", window.scrollY > 50);
});
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", function () {
  hamburger.classList.toggle("open");
  mobileMenu.classList.toggle("open");
});

const searchToggle = document.getElementById("searchToggle");
const searchInput = document.getElementById("searchInput");

function buscar() {
  const valor = searchInput.value.trim();
  if (valor !== "") {
    console.log("Buscando:", valor);
  }
}

searchToggle.addEventListener("click", function (e) {
  e.preventDefault();
  searchInput.classList.toggle("active");
  if (searchInput.classList.contains("active")) searchInput.focus();
});

searchInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") buscar();
});

document.addEventListener("click", function (e) {
  if (!searchInput.contains(e.target) && !searchToggle.contains(e.target)) {
    searchInput.classList.remove("active");
  }
});

const backBtn = document.getElementById("backToAdmin");

if (backBtn) {
  const session = JSON.parse(localStorage.getItem("adminSession"));

  if (session) {
    backBtn.style.display = "block";

    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "../html/dashboard-admin.html";
    });
  } else {
    backBtn.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const adminBtn = document.getElementById("adminAccess");

  if (!adminBtn) return;

  adminBtn.addEventListener("click", function (e) {
    e.preventDefault();

    const session = JSON.parse(localStorage.getItem("adminSession"));

    if (session) {
      window.location.href = "../html/dashboard-admin.html";
    } else {
      window.location.href = "../html/login-admin.html";
    }
  });
});

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
}

function updateCartCount() {
  const cart = getCart();

  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const counter = document.getElementById("cartCount");

  if (!counter) return;

  counter.textContent = total;
  counter.style.display = total > 0 ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});
