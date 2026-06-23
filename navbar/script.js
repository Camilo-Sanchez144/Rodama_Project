
window.addEventListener("scroll", function () {
    document.querySelector(".custom-navbar")
        .classList.toggle("scrolled", window.scrollY > 50);
});
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", function () {
    hamburger.classList.toggle("open");
    mobileMenu.classList.toggle("open");
});


const searchToggle = document.getElementById("searchToggle");
const searchInput  = document.getElementById("searchInput");

function buscar() {
    const valor = searchInput.value.trim();
    if (valor !== "") {
        console.log("Buscando:", valor);
    }
}

searchToggle.addEventListener("click", function (e) {
    e.preventDefault();
    searchInput.classList.toggle("active");
    if (searchInput.classList.contains("active")) searchInput.focus();
});

searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") buscar();
});

document.addEventListener("click", function (e) {
    if (!searchInput.contains(e.target) && !searchToggle.contains(e.target)) {
        searchInput.classList.remove("active");
    }
});