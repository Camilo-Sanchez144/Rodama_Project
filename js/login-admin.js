const form = document.getElementById("form");
const user = document.getElementById("user");
const password = document.getElementById("password");
const eyeButton = document.getElementById("eye");
const session = JSON.parse(localStorage.getItem("adminSession"));
const botonRegistro = document.getElementById("btn-abrir-registro");
const modal = document.getElementById("modal");
if (session) {
  window.location.href = "../html/dashboard-admin.html";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = user.value.trim();
  const userPassword = password.value.trim();

  if (!username || !userPassword) {
    alert("Completa todos los campos");
    return;
  }

  const session = {
    user: username,
  };

  localStorage.setItem("adminSession", JSON.stringify(session));

  window.location.href = "dashboard-admin.html";
});
let eyeHidden = false;

eyeButton.addEventListener("click", () => {
  if (eyeHidden) {
    eyeButton.className = "bi-eye-slash";
    password.type = "password";
  } else {
    eyeButton.className = "bi-eye";
    password.type = "text";
  }
  eyeHidden = !eyeHidden;
});

botonRegistro.addEventListener("click", function () {
  modal.style.display = "flex";
});
