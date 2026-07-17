function obtenerUsuarioActivo() {
  try {
    return JSON.parse(localStorage.getItem("usuarioActivo"));
  } catch {
    return null;
  }
}

const usuarioActivo = obtenerUsuarioActivo();

if (!usuarioActivo) {
  window.location.replace("login.html");
} else if (usuarioActivo.rol === "ADMIN") {
  window.location.replace("dashboard-admin.html");
} else if (usuarioActivo.rol !== "CLIENTE") {
  localStorage.removeItem("usuarioActivo");
  window.location.replace("login.html");
} else {
  const nombre = document.getElementById("nombre");
  const apellido = document.getElementById("apellido");
  const correo = document.getElementById("correo");
  const telefono = document.getElementById("telefono");
  const direccion = document.getElementById("direccion");
  const clientName = document.getElementById("clientName");
  const profileForm = document.getElementById("profileForm");
  const profileMessage = document.getElementById("profileMessage");
  const logoutBtn = document.getElementById("logoutBtn");

  nombre.value = usuarioActivo.nombre || "";
  apellido.value = usuarioActivo.apellido || "";
  correo.value = usuarioActivo.correo || "";
  telefono.value = usuarioActivo.telefono || "";
  direccion.value = usuarioActivo.direccion || "";

  clientName.textContent = usuarioActivo.nombre || "cliente";

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nuevoNombre = nombre.value.trim();
    const nuevoApellido = apellido.value.trim();
    const nuevoCorreo = correo.value.trim().toLowerCase();
    const nuevoTelefono = telefono.value.trim();
    const nuevaDireccion = direccion.value.trim();

    if (
      nuevoNombre === "" ||
      nuevoApellido === "" ||
      nuevoCorreo === "" ||
      nuevoTelefono === "" ||
      nuevaDireccion === ""
    ) {
      alert("Completa todos los datos del perfil.");
      return;
    }

    const usuarioActualizado = {
      ...usuarioActivo,
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      correo: nuevoCorreo,
      telefono: nuevoTelefono,
      direccion: nuevaDireccion
    };

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const posicionUsuario = usuarios.findIndex((usuario) => {
      return String(usuario.id) === String(usuarioActivo.id);
    });

    if (posicionUsuario !== -1) {
      usuarios[posicionUsuario] = usuarioActualizado;

      localStorage.setItem("usuarios", JSON.stringify(usuarios));
    }

    localStorage.setItem(
      "usuarioActivo",
      JSON.stringify(usuarioActualizado)
    );

    clientName.textContent = nuevoNombre;

    profileMessage.textContent =
      "Tus datos se guardaron correctamente.";

    profileMessage.classList.add("show");
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("usuarioActivo");
    window.location.href = "login.html";
  });
}