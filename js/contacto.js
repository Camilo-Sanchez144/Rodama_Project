const formulario = document.getElementById("formContacto");

formulario.addEventListener("submit", function (e) {

    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const mensaje = document.getElementById("mensaje").value.trim();

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const regexTelefono = /^[0-9]{10}$/;

    if (nombre === "") {
        e.preventDefault(); 
        alert("Por favor ingrese su nombre.");
        return;
    }

    if (!regexCorreo.test(correo)) {
        e.preventDefault();
        alert("Ingrese un correo válido.");
        return;
    }

    if (!regexTelefono.test(telefono)) {
        e.preventDefault();
        alert("Ingrese un teléfono válido de 10 dígitos.");
        return;
    }

    if (mensaje === "") {
        e.preventDefault();
        alert("Por favor escriba un mensaje.");
        return;
    }

    alert("Formulario enviado correctamente.");
});