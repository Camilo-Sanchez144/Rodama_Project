const form = document.getElementById("loginForm");
const correo = document.getElementById("correo");
const password = document.getElementById("password");
const eye = document.getElementById("eye");

let passwordVisible = false;

const adminPorDefecto = {
    id: 1,
    nombre: "Administrador",
    apellido: "",
    telefono: "",
    correo: "admin@rodama.com",
    password: "Admin123",
    rol: "ADMIN"
};

let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

if (!usuarios.some(u => u.rol === "ADMIN")) {
    usuarios.push(adminPorDefecto);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

eye.addEventListener("click", () => {
    passwordVisible = !passwordVisible;
    password.type = passwordVisible ? "text" : "password";
    eye.classList.toggle("bi-eye");
    eye.classList.toggle("bi-eye-slash");
});

form.addEventListener("submit", (e) => {

    e.preventDefault();

    const correoIngresado = correo.value.trim().toLowerCase();
    const passwordIngresado = password.value.trim();

    usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario = usuarios.find(u =>
        u.correo.toLowerCase() === correoIngresado &&
        u.password === passwordIngresado
    );

    if (!usuario) {
        alert("Correo o contraseña incorrectos.");
        return;
    }

    // Guardar sesión
    localStorage.setItem("usuarioActivo", JSON.stringify(usuario));

    alert(`Bienvenido ${usuario.nombre}`);

    if (usuario.rol === "ADMIN") {

        window.location.href = "dashboard-admin.html";

    } else {

        window.location.href = "../index.html";

    }

});