document.addEventListener("DOMContentLoaded", () => {
  console.log("Página Acerca de Nosotros cargada correctamente");

  const cards = document.querySelectorAll(".team-card");

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.boxShadow = "";
    });
  });
});
