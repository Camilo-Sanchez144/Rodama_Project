const form = document.getElementById("registerForm");

form.addEventListener("submit", (e) => {

    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const correo = document.getElementById("correo").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (
        nombre === "" ||
        apellido === "" ||
        telefono === "" ||
        direccion === "" ||
        correo === "" ||
        password === "" ||
        confirmPassword === ""
    ) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regexCorreo.test(correo)) {
        alert("Ingresa un correo electrónico válido.");
        return;
    }

    const regexTelefono = /^[0-9]{10}$/;

    if (!regexTelefono.test(telefono)) {
        alert("El teléfono debe tener 10 números.");
        return;
    }

    if (password.length < 8) {
        alert("La contraseña debe tener mínimo 8 caracteres.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const existeCorreo = usuarios.some(usuario =>
        usuario.correo.toLowerCase() === correo
    );

    if (existeCorreo) {
        alert("Este correo ya se encuentra registrado.");
        return;
    }

    const nuevoUsuario = {

        id: Date.now(),

        nombre,

        apellido,

        telefono,

        direccion,

        correo,

        password,

        rol: "CLIENTE"

    };

    usuarios.push(nuevoUsuario);

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    alert("¡Registro exitoso! Ahora puedes iniciar sesión.");

    form.reset();

    window.location.href = "login.html";

});