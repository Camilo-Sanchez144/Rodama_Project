const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

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
    alert("Completa todos los campos para crear tu cuenta.");
    return;
  }

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const telefonoValido = /^\+?[0-9\s-]{7,15}$/;

  if (!correoValido.test(correo)) {
    alert("Ingresa un correo electrónico válido.");
    return;
  }

  if (!telefonoValido.test(telefono)) {
    alert("Ingresa un teléfono válido.");
    return;
  }

  if (password.length < 8) {
    alert("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Las contraseñas no coinciden.");
    return;
  }

  let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const correoRepetido = usuarios.some((usuario) => {
    return (usuario.correo || "").toLowerCase() === correo;
  });

  if (correoRepetido) {
    alert("Ya existe una cuenta con este correo.");
    return;
  }

  const nuevoUsuario = {
    id: `cliente-${Date.now()}`,
    nombre: nombre,
    apellido: apellido,
    telefono: telefono,
    direccion: direccion,
    correo: correo,
    password: password,
    rol: "CLIENTE"
  };

  usuarios.push(nuevoUsuario);

  localStorage.setItem("usuarios", JSON.stringify(usuarios));

  alert("Cuenta creada correctamente. Ahora puedes iniciar sesión.");

  registerForm.reset();

  window.location.href = "login.html";
});