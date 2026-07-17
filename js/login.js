const form = document.getElementById("loginForm");
const correo = document.getElementById("correo");
const password = document.getElementById("password");
const eye = document.getElementById("eye");

const adminPorDefecto = {
  id: "admin-rodama",
  nombre: "Administrador",
  correo: "admin@rodama.com",
  password: "Admin123",
  rol: "ADMIN"
};

let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

const existeAdmin = usuarios.some((usuario) => {
  return (
    usuario.id === adminPorDefecto.id ||
    usuario.correo?.toLowerCase() === adminPorDefecto.correo
  );
});

if (!existeAdmin) {
  usuarios.push(adminPorDefecto);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

eye.addEventListener("click", () => {
  if (password.type === "password") {
    password.type = "text";
    eye.classList.remove("bi-eye-slash");
    eye.classList.add("bi-eye");
  } else {
    password.type = "password";
    eye.classList.remove("bi-eye");
    eye.classList.add("bi-eye-slash");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const correoIngresado = correo.value.trim().toLowerCase();
  const passwordIngresado = password.value;

  if (correoIngresado === "" || passwordIngresado === "") {
    alert("Completa el correo y la contraseña.");
    return;
  }

  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const usuarioEncontrado = usuarios.find((usuario) => {
    const correoUsuario = (usuario.correo || "").toLowerCase();
    const usuarioUsuario = (usuario.usuario || "").toLowerCase();

    return (
      (correoUsuario === correoIngresado ||
        usuarioUsuario === correoIngresado) &&
      usuario.password === passwordIngresado
    );
  });

  if (!usuarioEncontrado) {
    alert("Correo o contraseña incorrectos.");
    return;
  }

  localStorage.setItem(
    "usuarioActivo",
    JSON.stringify(usuarioEncontrado)
  );

  alert(`Inicio de sesión exitoso. Bienvenido/a, ${usuarioEncontrado.nombre}.`);

  if (usuarioEncontrado.rol === "ADMIN") {
    window.location.href = "dashboard-admin.html";
  } else {
    window.location.href = "../index.html";
  }
});