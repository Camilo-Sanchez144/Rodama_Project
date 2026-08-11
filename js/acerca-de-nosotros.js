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
// Animación de conteo para la sección de indicadores
  const statNumbers = document.querySelectorAll(".stat-number");

  const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = Math.floor(progress * target);
      el.textContent = value;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    };

    requestAnimationFrame(step);
  };

  if (statNumbers.length) {
    const statsObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    statNumbers.forEach((el) => statsObserver.observe(el));
  }
});
