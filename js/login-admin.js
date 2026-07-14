const form = document.getElementById("form");
const user = document.getElementById("user");
const password = document.getElementById("password");
const eyeButton = document.getElementById("eye");
const session = JSON.parse(localStorage.getItem("adminSession"));
const botonRegistro = document.getElementById("btn-abrir-registro");
const modal = document.getElementById("modal");
const cerrarmodal = document.getElementById("cerrar-modal");
console.log("JS cargó");

console.log("Formulario:", form);

console.log("Usuario:", user);
console.log("Voy a registrar el evento submit");
if (session) {
  window.location.href = "../html/dashboard-admin.html";
}

console.log("Evento submit registrado");
let eyeHidden = false;

const btnLogin = document.getElementById("btn-login");

btnLogin.addEventListener("click", () => {
  console.log("Entró al login");

  const correoLogin = user.value.trim();
  const passwordLogin = password.value;

  const administrador = JSON.parse(localStorage.getItem("administrador"));

  // Validar que los campos no estén vacíos
  if (!correoLogin || !passwordLogin) {
    alert("Completa todos los campos.");
    return;
  }

  // Verificar que exista un administrador registrado
  if (!administrador) {
    alert("No hay ningún administrador registrado.");
    return;
  }

  // Validar correo
  if (correoLogin !== administrador.correo) {
    alert("Correo incorrecto.");
    return;
  }

  // Validar contraseña
  if (passwordLogin !== administrador.password) {
    alert("Contraseña incorrecta.");
    return;
  }

  // Crear sesión
  const session = {
    nombre: administrador.nombre,
    correo: administrador.correo,
  };

  localStorage.setItem("adminSession", JSON.stringify(session));

  alert("Inicio de sesión exitoso.");

  // Redirigir al dashboard
  window.location.href = "dashboard-admin.html";
});

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
cerrarmodal.addEventListener("click", function () {
  modal.style.display = "none";
});
modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    modal.style.display = "none";
  }
});

const formularioRegistro = document.getElementById("form-registro");

formularioRegistro.addEventListener("submit", function (event) {
  event.preventDefault();

  const nombre = document.getElementById("nombre_completo").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const passwordRegistro = document.getElementById("registropassword").value;
  const confirmarPassword = document.getElementById("confirmar_password").value;

  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const regexTelefono = /^[0-9]{7,15}$/;

  if (
    nombre === "" ||
    telefono === "" ||
    correo === "" ||
    passwordRegistro === "" ||
    confirmarPassword === ""
  ) {
    alert("Todos los campos son obligatorios.");
    return;
  }

  if (!regexCorreo.test(correo)) {
    alert("El correo electrónico no es válido.");
    return;
  }

  if (!regexTelefono.test(telefono)) {
    alert("El teléfono solo debe contener números.");
    return;
  }

  if (passwordRegistro.length < 8) {
    alert("La contraseña debe tener mínimo 8 caracteres.");
    return;
  }

  if (passwordRegistro !== confirmarPassword) {
    alert("Las contraseñas no coinciden.");
    return;
  }

  const administrador = {
    nombre,
    telefono,
    correo,
    password: passwordRegistro,
  };

  localStorage.setItem("administrador", JSON.stringify(administrador));

  alert("Administrador registrado correctamente.");

  formularioRegistro.reset();

  modal.style.display = "none";
});
