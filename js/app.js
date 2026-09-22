// Estado temporal del prototipo. En una versión real vendría desde una base de datos.
const carrito = [];
const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const contador = document.querySelector("#contadorCarrito");
const contenedorItems = document.querySelector("#itemsCarrito");
const subtotal = document.querySelector("#subtotalCarrito");
const confirmar = document.querySelector("#confirmarReserva");
const toast = bootstrap.Toast.getOrCreateInstance(document.querySelector("#appToast"));

function mostrarToast(mensaje) {
  document.querySelector("#toastMensaje").textContent = mensaje;
  toast.show();
}

function renderCarrito() {
  contador.textContent = carrito.length;
  confirmar.disabled = carrito.length === 0;
  subtotal.textContent = formatoCLP.format(carrito.reduce((total, item) => total + item.precio, 0));

  if (carrito.length === 0) {
    contenedorItems.innerHTML = `<div class="cart-empty text-center py-5"><i class="bi bi-bag"></i><h3 class="h5 mt-3">Tu reserva está vacía</h3><p class="text-secondary">Agrega un juego desde el catálogo.</p></div>`;
    return;
  }

  contenedorItems.innerHTML = carrito.map(item => `
    <div class="cart-item">
      <div><strong>${item.nombre}</strong><small class="d-block text-secondary">1 jornada</small></div>
      <div class="text-end"><strong>${formatoCLP.format(item.precio)}</strong><button class="remove-item d-block ms-auto" data-remove="${item.id}" aria-label="Quitar ${item.nombre}"><i class="bi bi-trash3"></i></button></div>
    </div>`).join("");
}

document.querySelectorAll(".add-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    // Evita duplicados porque cada juego físico solo puede reservarse una vez por fecha.
    if (carrito.some(item => item.id === boton.dataset.id)) {
      mostrarToast("Este juego ya está en tu reserva");
      return;
    }
    carrito.push({ id: boton.dataset.id, nombre: boton.dataset.name, precio: Number(boton.dataset.price) });
    renderCarrito();
    mostrarToast(`${boton.dataset.name} agregado a la reserva`);
  });
});

contenedorItems.addEventListener("click", evento => {
  const boton = evento.target.closest("[data-remove]");
  if (!boton) return;
  const indice = carrito.findIndex(item => item.id === boton.dataset.remove);
  carrito.splice(indice, 1);
  renderCarrito();
});

document.querySelectorAll(".filter-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    document.querySelector(".filter-btn.active").classList.remove("active");
    boton.classList.add("active");
    const filtro = boton.dataset.filter;
    let visibles = 0;
    document.querySelectorAll(".game-item").forEach(tarjeta => {
      const coincide = filtro === "todos" || tarjeta.dataset.category.includes(filtro);
      tarjeta.classList.toggle("d-none", !coincide);
      if (coincide) visibles++;
    });
    document.querySelector("#sinResultados").classList.toggle("d-none", visibles > 0);
  });
});

document.querySelectorAll(".favorite-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    boton.classList.toggle("active");
    boton.querySelector("i").classList.toggle("bi-heart");
    boton.querySelector("i").classList.toggle("bi-heart-fill");
  });
});

document.querySelector("#buscarDisponibilidad").addEventListener("click", () => {
  const fecha = document.querySelector("#fechaEvento");
  const comuna = document.querySelector("#comunaEvento");
  if (!fecha.value || !comuna.value) {
    mostrarToast("Selecciona una fecha y una comuna");
    return;
  }
  const fechaLegible = new Date(`${fecha.value}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  document.querySelector("#datosEvento").innerHTML = `<i class="bi bi-calendar2-check"></i><span>${fechaLegible} · ${comuna.value}</span>`;
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
  mostrarToast("Mostrando juegos disponibles para tu fecha");
});

confirmar.addEventListener("click", () => {
  // Este avance simula el envío; la integración con pagos y reservas queda para una siguiente iteración.
  confirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enviando...`;
  confirmar.disabled = true;
  setTimeout(() => {
    confirmar.innerHTML = `<i class="bi bi-check2 me-2"></i>Solicitud enviada`;
    mostrarToast("Solicitud recibida. Te contactaremos para confirmar");
  }, 900);
});

// No se permiten fechas anteriores a hoy.
document.querySelector("#fechaEvento").min = new Date().toISOString().split("T")[0];
renderCarrito();
