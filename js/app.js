// Estado temporal del prototipo. En una versión real vendría desde una base de datos.
const carrito = [];
const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const contador = document.querySelector("#contadorCarrito");
const contenedorItems = document.querySelector("#itemsCarrito");
const subtotal = document.querySelector("#subtotalCarrito");
const confirmar = document.querySelector("#confirmarReserva");
const toast = bootstrap.Toast.getOrCreateInstance(document.querySelector("#appToast"));

// Datos simulados de disponibilidad por juego: fechas ya reservadas y horario de atención.
// En producción esto vendría de la base de datos según la fecha consultada.
const disponibilidadJuegos = {
  castillo: { fechasNoDisponibles: ["2026-09-25", "2026-10-03"], horario: "09:00–20:00" },
  tobogan: { fechasNoDisponibles: ["2026-09-27"], horario: "10:00–19:00" },
  arcade: { fechasNoDisponibles: [], horario: "09:00–22:00" },
  "taca-taca": { fechasNoDisponibles: ["2026-09-30"], horario: "09:00–22:00" },
  hockey: { fechasNoDisponibles: [], horario: "09:00–22:00" }
};

const HORAS_JORNADA = 6;
const HORAS_MIN = 1;

// ===== HU-022: tarifa de transporte simulada por comuna =====
const tarifasTransporte = {
  Santiago: 5000, Providencia: 4000, "Ñuñoa": 4500, "Maipú": 6000, "La Florida": 6000
};

// ===== HU-041 / HU-043: reseñas simuladas por juego =====
const resenasJuegos = {
  castillo: [
    { autor: "Marcela R.", estrellas: 5, comentario: "Llegó impecable y los niños encantados." },
    { autor: "Pablo G.", estrellas: 5, comentario: "Fácil de coordinar, muy recomendable." }
  ],
  tobogan: [
    { autor: "Ignacia T.", estrellas: 5, comentario: "El favorito de la fiesta, todos querían subir." },
    { autor: "Cristóbal M.", estrellas: 4, comentario: "Excelente, solo faltó un poco más de agua." }
  ],
  arcade: [
    { autor: "Diego F.", estrellas: 5, comentario: "Los adultos también se pusieron a jugar." }
  ],
  "taca-taca": [
    { autor: "Valentina S.", estrellas: 5, comentario: "Perfecto para el cumpleaños, muy resistente." }
  ],
  hockey: [
    { autor: "Nicolás A.", estrellas: 5, comentario: "Rápido de armar y funcionó impecable." }
  ]
};

// ===== HU-047 / HU-050 / HU-051: descuentos activos y códigos de promoción =====
const juegosConDescuento = ["tobogan"];
const codigosDescuento = {
  JUEGA10: { tipo: "porcentaje", valor: 0.10, etiqueta: "10% de descuento" },
  VERANO5000: { tipo: "fijo", valor: 5000, etiqueta: "$5.000 de descuento" }
};

let comunaSeleccionada = "";
let descuentoActivo = null;

function mostrarToast(mensaje) {
  document.querySelector("#toastMensaje").textContent = mensaje;
  toast.show();
}

function generarCodigoReserva() {
  return "JY-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// ===== HU-020 / HU-021: precio por hora y selector de horas con costo total estimado =====
// Se inyecta en cada tarjeta sin modificar el HTML: precio/hora + selector de horas + total dinámico.
function inicializarSelectorHoras() {
  document.querySelectorAll(".game-card").forEach(card => {
    const boton = card.querySelector(".add-btn");
    if (!boton) return;

    const id = boton.dataset.id;
    const precioJornada = Number(boton.dataset.price);
    const precioHora = Math.round(precioJornada / HORAS_JORNADA);
    boton.dataset.priceHora = precioHora;

    // Precio por hora, debajo del precio por jornada.
    const bloquePrecio = boton.closest(".d-flex").querySelector(".price").parentElement;
    const precioHoraEl = document.createElement("small");
    precioHoraEl.className = "d-block text-secondary price-hora";
    precioHoraEl.textContent = `${formatoCLP.format(precioHora)} / hora`;
    bloquePrecio.appendChild(precioHoraEl);

    // Selector de horas + total estimado, entre el precio y el botón agregar.
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex align-items-center gap-2 hours-selector";

    const label = document.createElement("label");
    label.className = "visually-hidden";
    label.setAttribute("for", `horas-${id}`);
    label.textContent = `Horas para ${boton.dataset.name}`;

    const input = document.createElement("input");
    input.type = "number";
    input.className = "form-control form-control-sm hours-input";
    input.style.width = "4.2rem";
    input.id = `horas-${id}`;
    input.min = String(HORAS_MIN);
    input.max = String(HORAS_JORNADA);
    input.value = String(HORAS_JORNADA);
    input.setAttribute("aria-label", `Horas para ${boton.dataset.name}`);
    input.dataset.id = id;

    const totalEl = document.createElement("small");
    totalEl.className = "text-secondary total-preview";
    totalEl.dataset.id = id;
    totalEl.textContent = `Total: ${formatoCLP.format(precioHora * HORAS_JORNADA)}`;

    const actualizarTotal = () => {
      let horas = Number(input.value);
      if (!horas || horas < HORAS_MIN) horas = HORAS_MIN;
      if (horas > HORAS_JORNADA) horas = HORAS_JORNADA;
      input.value = String(horas);
      totalEl.textContent = `Total: ${formatoCLP.format(precioHora * horas)}`;
    };

    input.addEventListener("change", actualizarTotal);
    input.addEventListener("input", actualizarTotal);

    wrapper.append(label, input, totalEl);
    boton.insertAdjacentElement("beforebegin", wrapper);
  });
}

// ===== HU-023: agregar al carrito con horas y costo total seleccionados =====
// ===== HU-022 / HU-050: inyecta transporte, código de descuento y total en el carrito =====
function inicializarCarritoExtras() {
  const cartTotal = document.querySelector(".cart-total");
  const notaOriginal = cartTotal.querySelector("small.text-secondary");

  const filaTransporte = document.createElement("div");
  filaTransporte.className = "d-flex justify-content-between mb-1";
  filaTransporte.innerHTML = `<span>Transporte <small class="text-secondary" id="comunaTransporte"></small></span><strong id="valorTransporte">$0</strong>`;

  const filaDescuento = document.createElement("div");
  filaDescuento.className = "d-flex justify-content-between mb-1 d-none";
  filaDescuento.id = "filaDescuento";
  filaDescuento.innerHTML = `<span>Descuento</span><strong id="valorDescuento" class="text-success">-$0</strong>`;

  const filaTotal = document.createElement("div");
  filaTotal.className = "d-flex justify-content-between fw-bold border-top pt-2 mt-1";
  filaTotal.innerHTML = `<span>Total</span><strong id="totalFinal">$0</strong>`;

  const codigoWrap = document.createElement("div");
  codigoWrap.className = "d-flex gap-2 mt-3";
  codigoWrap.innerHTML = `
    <input type="text" class="form-control form-control-sm" id="codigoDescuento" placeholder="Código de descuento">
    <button type="button" class="btn btn-outline-dark btn-sm" id="aplicarCodigo">Aplicar</button>`;

  const promoBanner = document.createElement("p");
  promoBanner.className = "small text-secondary mb-0 mt-2";
  promoBanner.id = "promoBanner";
  promoBanner.innerHTML = `<i class="bi bi-tag"></i> Código disponible: <strong>JUEGA10</strong> (10% dcto)`;

  cartTotal.insertBefore(filaTransporte, notaOriginal);
  cartTotal.insertBefore(filaDescuento, notaOriginal);
  cartTotal.insertBefore(filaTotal, notaOriginal);
  notaOriginal.replaceWith(codigoWrap, promoBanner);

  document.querySelector("#aplicarCodigo").addEventListener("click", () => {
    const codigo = document.querySelector("#codigoDescuento").value.trim().toUpperCase();
    if (codigosDescuento[codigo]) {
      descuentoActivo = codigosDescuento[codigo];
      mostrarToast(`Código aplicado: ${descuentoActivo.etiqueta}`);
      renderCarrito();
    } else {
      mostrarToast("Código de descuento inválido");
    }
  });
}

function renderCarrito() {
  contador.textContent = carrito.length;
  confirmar.disabled = carrito.length === 0;

  const subtotalValor = carrito.reduce((total, item) => total + item.precio, 0);
  subtotal.textContent = formatoCLP.format(subtotalValor);

  // HU-022: tarifa de transporte según la comuna consultada.
  const tarifa = comunaSeleccionada ? (tarifasTransporte[comunaSeleccionada] || 0) : 0;
  document.querySelector("#comunaTransporte").textContent = comunaSeleccionada ? `(${comunaSeleccionada})` : "(elige tu comuna)";
  document.querySelector("#valorTransporte").textContent = formatoCLP.format(tarifa);

  // HU-050: descuento aplicado por código.
  let descuentoValor = 0;
  const filaDescuento = document.querySelector("#filaDescuento");
  if (descuentoActivo && carrito.length > 0) {
    descuentoValor = descuentoActivo.tipo === "porcentaje" ? Math.round(subtotalValor * descuentoActivo.valor) : descuentoActivo.valor;
    document.querySelector("#valorDescuento").textContent = `-${formatoCLP.format(descuentoValor)}`;
    filaDescuento.classList.remove("d-none");
  } else {
    filaDescuento.classList.add("d-none");
  }

  document.querySelector("#totalFinal").textContent = formatoCLP.format(Math.max(subtotalValor + tarifa - descuentoValor, 0));

  if (carrito.length === 0) {
    contenedorItems.innerHTML = `<div class="cart-empty text-center py-5"><i class="bi bi-bag"></i><h3 class="h5 mt-3">Tu reserva está vacía</h3><p class="text-secondary">Agrega un juego desde el catálogo.</p></div>`;
    return;
  }

  // HU-024: permite modificar las horas de un juego ya agregado al carrito.
  contenedorItems.innerHTML = carrito.map(item => `
    <div class="cart-item">
      <div>
        <strong>${item.nombre}</strong>
        <div class="d-flex align-items-center gap-2 mt-1">
          <label class="visually-hidden" for="cart-horas-${item.id}">Horas de ${item.nombre}</label>
          <input type="number" class="form-control form-control-sm cart-hours-input" id="cart-horas-${item.id}" data-id="${item.id}" min="${HORAS_MIN}" max="${HORAS_JORNADA}" value="${item.horas}" style="width:4rem">
          <small class="text-secondary">hora${item.horas === 1 ? "" : "s"}</small>
        </div>
      </div>
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
    if (boton.disabled) return;

    const horasInput = document.querySelector(`.hours-input[data-id="${boton.dataset.id}"]`);
    const horas = horasInput ? Number(horasInput.value) : HORAS_JORNADA;
    const precioHora = Number(boton.dataset.priceHora);

    carrito.push({
      id: boton.dataset.id,
      nombre: boton.dataset.name,
      horas,
      precioHora,
      precio: precioHora * horas
    });
    renderCarrito();
    mostrarToast(`${boton.dataset.name} agregado a la reserva (${horas} h)`);
  });
});

contenedorItems.addEventListener("click", evento => {
  const boton = evento.target.closest("[data-remove]");
  if (!boton) return;
  const indice = carrito.findIndex(item => item.id === boton.dataset.remove);
  carrito.splice(indice, 1);
  renderCarrito();
});

// HU-024: modificar la cantidad de horas de un juego ya agregado.
contenedorItems.addEventListener("change", evento => {
  const input = evento.target.closest(".cart-hours-input");
  if (!input) return;
  let horas = Number(input.value);
  if (!horas || horas < HORAS_MIN) horas = HORAS_MIN;
  if (horas > HORAS_JORNADA) horas = HORAS_JORNADA;

  const item = carrito.find(i => i.id === input.dataset.id);
  if (item) {
    item.horas = horas;
    item.precio = item.precioHora * horas;
    renderCarrito();
    mostrarToast(`${item.nombre} actualizado a ${horas} hora${horas === 1 ? "" : "s"}`);
  }
});

// ===== HU-012 / HU-013 / HU-014: buscador por palabra clave + categoría + rango de precio =====
function inicializarBusquedaYPrecio() {
  const pills = document.querySelector(".filter-pills");
  if (!pills) return;

  const buscador = document.createElement("input");
  buscador.type = "search";
  buscador.id = "buscarJuego";
  buscador.className = "form-control form-control-lg";
  buscador.style.maxWidth = "16rem";
  buscador.placeholder = "Buscar juego...";
  buscador.setAttribute("aria-label", "Buscar juego por palabra clave");

  const rangoPrecio = document.createElement("select");
  rangoPrecio.id = "filtroPrecio";
  rangoPrecio.className = "form-select form-select-lg";
  rangoPrecio.style.maxWidth = "12rem";
  rangoPrecio.setAttribute("aria-label", "Filtrar por rango de precio");
  rangoPrecio.innerHTML = `
    <option value="todos">Cualquier precio</option>
    <option value="0-50000">Hasta $50.000</option>
    <option value="50000-80000">$50.000 – $80.000</option>
    <option value="80000-999999">Más de $80.000</option>
  `;

  pills.insertAdjacentElement("afterend", rangoPrecio);
  pills.insertAdjacentElement("afterend", buscador);

  buscador.addEventListener("input", aplicarFiltros);
  rangoPrecio.addEventListener("change", aplicarFiltros);
}

function aplicarFiltros() {
  const filtro = document.querySelector(".filter-btn.active")?.dataset.filter || "todos";
  const texto = (document.querySelector("#buscarJuego")?.value || "").trim().toLowerCase();
  const rango = document.querySelector("#filtroPrecio")?.value || "todos";
  const [precioMin, precioMax] = rango === "todos" ? [0, Infinity] : rango.split("-").map(Number);

  let visibles = 0;
  document.querySelectorAll(".game-item").forEach(tarjeta => {
    const nombre = tarjeta.querySelector("h3").textContent.toLowerCase();
    const precio = Number(tarjeta.querySelector(".add-btn").dataset.price);

    const coincideCategoria = filtro === "todos" || tarjeta.dataset.category.includes(filtro);
    const coincideTexto = texto === "" || nombre.includes(texto);
    const coincidePrecio = precio >= precioMin && precio <= precioMax;
    const coincide = coincideCategoria && coincideTexto && coincidePrecio;

    tarjeta.classList.toggle("d-none", !coincide);
    if (coincide) visibles++;
  });
  document.querySelector("#sinResultados").classList.toggle("d-none", visibles > 0);
}

document.querySelectorAll(".filter-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    document.querySelector(".filter-btn.active").classList.remove("active");
    boton.classList.add("active");
    aplicarFiltros();
  });
});

document.querySelectorAll(".favorite-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    const activando = !boton.classList.contains("active");
    boton.classList.toggle("active");
    boton.querySelector("i").classList.toggle("bi-heart");
    boton.querySelector("i").classList.toggle("bi-heart-fill");

    // HU-047: notificación de descuento en productos favoritos.
    if (activando) {
      const card = boton.closest(".game-card");
      const id = card.querySelector(".add-btn").dataset.id;
      if (juegosConDescuento.includes(id)) {
        mostrarToast(`🎉 Este favorito tiene descuento activo: usa el código JUEGA10 en tu reserva`);
      }
    }
  });
});

// ===== HU-041 / HU-043: ver calificación y reseñas de cada juego =====
function inicializarResenas() {
  document.querySelectorAll(".game-card").forEach(card => {
    const id = card.querySelector(".add-btn").dataset.id;
    const resenas = resenasJuegos[id];
    if (!resenas) return;

    const ratingEl = card.querySelector(".rating");
    const verBtn = document.createElement("button");
    verBtn.type = "button";
    verBtn.className = "btn btn-link btn-sm p-0 ms-2 ver-resenas";
    verBtn.textContent = `Ver reseñas (${resenas.length})`;
    ratingEl.insertAdjacentElement("afterend", verBtn);

    const panel = document.createElement("div");
    panel.className = "resenas-panel d-none mt-2";
    panel.innerHTML = resenas.map(r => `
      <div class="mb-2 small">
        <strong>${r.autor}</strong> · ${"★".repeat(r.estrellas)}${"☆".repeat(5 - r.estrellas)}
        <p class="text-secondary mb-0">${r.comentario}</p>
      </div>`).join("");
    card.querySelector(".game-meta").insertAdjacentElement("afterend", panel);

    verBtn.addEventListener("click", () => {
      panel.classList.toggle("d-none");
      verBtn.textContent = panel.classList.contains("d-none") ? `Ver reseñas (${resenas.length})` : "Ocultar reseñas";
    });
  });
}

// ===== HU-017 / HU-018: disponibilidad real por fecha y horario del juego =====
function actualizarDisponibilidadPorFecha(fechaISO) {
  let disponibles = 0;

  document.querySelectorAll(".game-item").forEach(tarjeta => {
    const boton = tarjeta.querySelector(".add-btn");
    const horasInput = tarjeta.querySelector(".hours-input");
    const id = boton.dataset.id;
    const info = disponibilidadJuegos[id] || { fechasNoDisponibles: [], horario: "09:00–20:00" };
    const noDisponible = info.fechasNoDisponibles.includes(fechaISO);

    const badge = tarjeta.querySelector(".status-badge");
    const icono = badge.querySelector("i");

    if (noDisponible) {
      badge.classList.add("bg-danger-subtle");
      icono.className = "bi bi-x-circle-fill";
      badge.lastChild.textContent = ` No disponible`;
      boton.disabled = true;
      boton.classList.add("disabled");
      if (horasInput) horasInput.disabled = true;
    } else {
      badge.classList.remove("bg-danger-subtle");
      icono.className = "bi bi-check-circle-fill";
      badge.lastChild.textContent = ` Disponible · ${info.horario}`;
      boton.disabled = false;
      boton.classList.remove("disabled");
      if (horasInput) horasInput.disabled = false;
      disponibles++;
    }
  });

  return disponibles;
}

document.querySelector("#buscarDisponibilidad").addEventListener("click", () => {
  const fecha = document.querySelector("#fechaEvento");
  const comuna = document.querySelector("#comunaEvento");
  if (!fecha.value || !comuna.value) {
    mostrarToast("Selecciona una fecha y una comuna");
    return;
  }
  const fechaLegible = new Date(`${fecha.value}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  document.querySelector("#datosEvento").innerHTML = `<i class="bi bi-calendar2-check"></i><span>${fechaLegible} · ${comuna.value}</span>`;

  comunaSeleccionada = comuna.value;
  const disponibles = actualizarDisponibilidadPorFecha(fecha.value);
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
  renderCarrito();

  // HU-019: alerta si alguno de los favoritos del cliente no está disponible en la fecha elegida.
  const favoritosNoDisponibles = [...document.querySelectorAll(".favorite-btn.active")]
    .map(boton => boton.closest(".game-item"))
    .filter(tarjeta => tarjeta.querySelector(".add-btn").disabled)
    .map(tarjeta => tarjeta.querySelector("h3").textContent);

  if (favoritosNoDisponibles.length > 0) {
    mostrarToast(`⚠️ Tu favorito ${favoritosNoDisponibles.join(", ")} no está disponible esa fecha`);
  } else if (disponibles === 0) {
    mostrarToast("No hay juegos disponibles para esa fecha, prueba con otra");
  } else {
    mostrarToast(`${disponibles} juego(s) disponibles para tu fecha`);
  }
});

confirmar.addEventListener("click", () => {
  // Este avance simula el envío; la integración con pagos queda para una siguiente iteración.
  confirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enviando...`;
  confirmar.disabled = true;
  setTimeout(() => {
    const codigo = generarCodigoReserva();
    confirmar.innerHTML = `<i class="bi bi-check2 me-2"></i>Solicitud enviada`;
    mostrarToast(`Solicitud recibida. Código de reserva ${codigo}. Te contactaremos para confirmar`);
  }, 900);
});

// No se permiten fechas anteriores a hoy.
document.querySelector("#fechaEvento").min = new Date().toISOString().split("T")[0];
inicializarSelectorHoras();
inicializarBusquedaYPrecio();
inicializarResenas();
inicializarCarritoExtras();
renderCarrito();