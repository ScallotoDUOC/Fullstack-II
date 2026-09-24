// acá guardo los juegos que el usuario va agregando a su reserva, parte vacío obvio (hu-23)
const carrito = [];
// esto es pa' no andar escribiendo "$" y los puntos a mano, js ya trae algo que formatea plata chilena
const formatoCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

// el toast es el cartelito que aparece abajo a la derecha avisando cosas, lo dejo listo acá arriba
// porque lo uso desde varias partes del código (catálogo, login, registro, etc)
const toast = bootstrap.Toast.getOrCreateInstance(document.querySelector("#appToast"));

// esta función junta TODO lo del catálogo y el carrito
// ojo: solo se ejecuta si estamos parados en catalogo.html, si no, ni se llama (más abajo se ve eso)
function inicializarCatalogo() {
  // acá agarro los elementos del carrito que voy a necesitar varias veces, para no repetir el querySelector siempre
  const contador = document.querySelector("#contadorCarrito");
const contenedorItems = document.querySelector("#itemsCarrito");
const subtotal = document.querySelector("#subtotalCarrito");
const confirmar = document.querySelector("#confirmarReserva");

// esto simula la disponibilidad de cada juego (como si viniera de una base de datos que no tenemos todavía)
// básicamente dice qué días ya están reservados y en qué horario atiende cada juego (hu-17, hu-18)
const disponibilidadJuegos = {
  castillo: { fechasNoDisponibles: ["2026-09-25", "2026-10-03"], horario: "09:00–20:00" },
  tobogan: { fechasNoDisponibles: ["2026-09-27"], horario: "10:00–19:00" },
  arcade: { fechasNoDisponibles: [], horario: "09:00–22:00" },
  "taca-taca": { fechasNoDisponibles: ["2026-09-30"], horario: "09:00–22:00" },
  hockey: { fechasNoDisponibles: [], horario: "09:00–22:00" }
};

// cuántas horas máximo y mínimo se puede arrendar un juego (una jornada completa son 6 horas)
const HORAS_JORNADA = 6;
const HORAS_MIN = 1;

// tarifa de transporte inventada según la comuna, para que el cliente sepa que hay un costo extra (hu-22)
const tarifasTransporte = {
  Concepcion: 5000, Talcahuano: 4000, "Hualpen": 4500, "Chiguayante": 6000, "San Pedro De la Paz": 6000, "Penco":7000
};

// reseñas de juguete (inventadas por mí) para poder mostrar algo en la sección de reseñas (hu-41, hu-43)
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

// acá defino qué juegos tienen descuento y qué códigos de descuento existen (inventados, ojalá algún día vengan de un admin) (hu-47, hu-50, hu-51)
const juegosConDescuento = ["tobogan"];
const codigosDescuento = {
  JUEGA10: { tipo: "porcentaje", valor: 0.10, etiqueta: "10% de descuento" },
  VERANO5000: { tipo: "fijo", valor: 5000, etiqueta: "$5.000 de descuento" }
};

// estas dos variables van cambiando mientras el usuario usa la página (por eso son let y no const)
let comunaSeleccionada = "";
let descuentoActivo = null;

// función chica pa' mostrar el toast, le paso el mensaje y listo
function mostrarToast(mensaje) {
  document.querySelector("#toastMensaje").textContent = mensaje;
  toast.show();
}

// genera un código random tipo "JY-A1B2C" para que el cliente sienta que su reserva quedó "oficial" (hu-28)
function generarCodigoReserva() {
  return "JY-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// esta función le agrega a cada tarjeta del catálogo el precio por hora y un inputcito para elegir las horas,
// todo esto lo armo desde js (no está en el html) para no tener que repetir el mismo bloque 5 veces en el html (hu-20, hu-21)
function inicializarSelectorHoras() {
  document.querySelectorAll(".game-card").forEach(card => {
    const boton = card.querySelector(".add-btn");
    if (!boton) return; // por si acaso no hay botón, para que no explote

    const id = boton.dataset.id;
    const precioJornada = Number(boton.dataset.price);
    // saco el precio por hora dividiendo el precio del día en las 6 horas de la jornada
    const precioHora = Math.round(precioJornada / HORAS_JORNADA);
    boton.dataset.priceHora = precioHora; // lo dejo guardado ahí mismo en el botón para usarlo después

    // acá meto el textito de "$X / hora" debajo del precio normal
    const bloquePrecio = boton.closest(".d-flex").querySelector(".price").parentElement;
    const precioHoraEl = document.createElement("small");
    precioHoraEl.className = "d-block text-secondary price-hora";
    precioHoraEl.textContent = `${formatoCLP.format(precioHora)} / hora`;
    bloquePrecio.appendChild(precioHoraEl);

    // ahora armo el inputcito de horas + el texto que muestra el total, todo metido en un div
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex align-items-center gap-2 hours-selector";

    const label = document.createElement("label");
    label.className = "visually-hidden"; // esto es solo para lectores de pantalla, no se ve en la página
    label.setAttribute("for", `horas-${id}`);
    label.textContent = `Horas para ${boton.dataset.name}`;

    const input = document.createElement("input");
    input.type = "number";
    input.className = "form-control form-control-sm hours-input";
    input.style.width = "4.2rem";
    input.id = `horas-${id}`;
    input.min = String(HORAS_MIN);
    input.max = String(HORAS_JORNADA);
    input.value = String(HORAS_JORNADA); // parte marcando la jornada completa por defecto
    input.setAttribute("aria-label", `Horas para ${boton.dataset.name}`);
    input.dataset.id = id;

    const totalEl = document.createElement("small");
    totalEl.className = "text-secondary total-preview";
    totalEl.dataset.id = id;
    totalEl.textContent = `Total: ${formatoCLP.format(precioHora * HORAS_JORNADA)}`;

    // esta función actualiza el "Total:" mientras el usuario va escribiendo, sin pisarle lo que está tipeando
    // (antes tenía un bug feo: si escribías "4" quedando "14" por un segundo, lo dejaba en 6 sí o sí)
    const actualizarPreview = () => {
      const valorCrudo = Number(input.value);
      const horasPreview = !valorCrudo || valorCrudo < HORAS_MIN
        ? HORAS_MIN
        : Math.min(valorCrudo, HORAS_JORNADA);
      totalEl.textContent = `Total: ${formatoCLP.format(precioHora * horasPreview)}`;
    };

    // esto solo corrige el valor del input cuando el usuario ya terminó de escribir (sale del campo)
    const normalizarValor = () => {
      let horas = Number(input.value);
      if (!horas || horas < HORAS_MIN) horas = HORAS_MIN;
      if (horas > HORAS_JORNADA) horas = HORAS_JORNADA;
      input.value = String(horas);
      actualizarPreview();
    };

    input.addEventListener("input", actualizarPreview); // cada tecla que aprieta
    input.addEventListener("change", normalizarValor); // cuando saca el foco del input

    wrapper.append(label, input, totalEl);
    boton.insertAdjacentElement("beforebegin", wrapper); // lo pongo justo antes del botón "Agregar"
  });
}

// esta función le agrega al carrito lateral las filas de transporte, descuento, total y el campo
// para meter el código de descuento. todo esto tampoco está en el html, lo armo acá (hu-22, hu-50)
function inicializarCarritoExtras() {
  const cartTotal = document.querySelector(".cart-total");
  const notaOriginal = cartTotal.querySelector("small.text-secondary"); // esta es la notita que venía por defecto en el html

  const filaTransporte = document.createElement("div");
  filaTransporte.className = "d-flex justify-content-between mb-1";
  filaTransporte.innerHTML = `<span>Transporte <small class="text-secondary" id="comunaTransporte"></small></span><strong id="valorTransporte">$0</strong>`;

  const filaDescuento = document.createElement("div");
  filaDescuento.className = "d-flex justify-content-between mb-1 d-none"; // parte oculta hasta que apliquen un código
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

  // voy insertando todo esto justo antes de la notita original, y al final la reemplazo por el input de código + el banner
  cartTotal.insertBefore(filaTransporte, notaOriginal);
  cartTotal.insertBefore(filaDescuento, notaOriginal);
  cartTotal.insertBefore(filaTotal, notaOriginal);
  notaOriginal.replaceWith(codigoWrap, promoBanner);

  // cuando el usuario aprieta "Aplicar", reviso si el código existe en mi lista de arriba
  document.querySelector("#aplicarCodigo").addEventListener("click", () => {
    const codigo = document.querySelector("#codigoDescuento").value.trim().toUpperCase();
    if (codigosDescuento[codigo]) {
      descuentoActivo = codigosDescuento[codigo];
      mostrarToast(`Código aplicado: ${descuentoActivo.etiqueta}`);
      renderCarrito(); // vuelvo a pintar el carrito para que se vea el descuento aplicado
    } else {
      mostrarToast("Código de descuento inválido");
    }
  });
}

// esta es LA función que pinta de nuevo todo el carrito cada vez que algo cambia (agregar, quitar, cambiar horas, etc)
// básicamente borro todo y lo vuelvo a dibujar, más fácil que andar actualizando pedacito por pedacito
function renderCarrito() {
  contador.textContent = carrito.length;
  confirmar.disabled = carrito.length === 0; // si el carrito está vacío, no lo dejo confirmar

  const subtotalValor = carrito.reduce((total, item) => total + item.precio, 0);
  subtotal.textContent = formatoCLP.format(subtotalValor);

  // calculo la tarifa de transporte según la comuna que eligió el usuario al buscar disponibilidad (hu-22)
  const tarifa = comunaSeleccionada ? (tarifasTransporte[comunaSeleccionada] || 0) : 0;
  document.querySelector("#comunaTransporte").textContent = comunaSeleccionada ? `(${comunaSeleccionada})` : "(elige tu comuna)";
  document.querySelector("#valorTransporte").textContent = formatoCLP.format(tarifa);

  // si hay un código de descuento aplicado, calculo cuánto hay que restar (hu-50)
  let descuentoValor = 0;
  const filaDescuento = document.querySelector("#filaDescuento");
  if (descuentoActivo && carrito.length > 0) {
    descuentoValor = descuentoActivo.tipo === "porcentaje" ? Math.round(subtotalValor * descuentoActivo.valor) : descuentoActivo.valor;
    document.querySelector("#valorDescuento").textContent = `-${formatoCLP.format(descuentoValor)}`;
    filaDescuento.classList.remove("d-none");
  } else {
    filaDescuento.classList.add("d-none");
  }

  // el total final es: subtotal + transporte - descuento (y nunca menos que $0, obvio)
  document.querySelector("#totalFinal").textContent = formatoCLP.format(Math.max(subtotalValor + tarifa - descuentoValor, 0));

  // si no hay nada en el carrito, muestro el mensajito de "carrito vacío" y corto aquí
  if (carrito.length === 0) {
    contenedorItems.innerHTML = `<div class="cart-empty text-center py-5"><i class="bi bi-bag"></i><h3 class="h5 mt-3">Tu reserva está vacía</h3><p class="text-secondary">Agrega un juego desde el catálogo.</p></div>`;
    return;
  }

  // acá dibujo cada juego que está en el carrito, con un input para poder cambiarle las horas después de agregado (hu-24)
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

// cuando el usuario aprieta "Agregar" en cualquier juego del catálogo, esto lo mete al carrito (hu-23)
document.querySelectorAll(".add-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    // no dejo agregar el mismo juego dos veces (una reserva = un juego físico, no puede estar dos veces a la vez)
    if (carrito.some(item => item.id === boton.dataset.id)) {
      mostrarToast("Este juego ya está en tu reserva");
      return;
    }
    if (boton.disabled) return; // si está marcado como no disponible, ni lo dejo agregar

    // saco las horas que eligió en el inputcito de la tarjeta (y las dejo entre el mínimo y el máximo por si las moscas)
    const horasInput = document.querySelector(`.hours-input[data-id="${boton.dataset.id}"]`);
    let horas = horasInput ? Number(horasInput.value) : HORAS_JORNADA;
    if (!horas || horas < HORAS_MIN) horas = HORAS_MIN;
    if (horas > HORAS_JORNADA) horas = HORAS_JORNADA;
    const precioHora = Number(boton.dataset.priceHora);

    carrito.push({
      id: boton.dataset.id,
      nombre: boton.dataset.name,
      horas,
      precioHora,
      precio: precioHora * horas
    });
    renderCarrito(); // repinto el carrito pa' que se vea el nuevo juego agregado
    mostrarToast(`${boton.dataset.name} agregado a la reserva (${horas} h)`);
  });
});

// cuando aprietan el tacho de basura de un item del carrito, lo elimino (hu-25)
// uso delegación de eventos (escucho en el contenedor completo) porque los botones se crean dinámicamente
contenedorItems.addEventListener("click", evento => {
  const boton = evento.target.closest("[data-remove]");
  if (!boton) return; // si el click no fue en un botón de eliminar, no hago nada
  const indice = carrito.findIndex(item => item.id === boton.dataset.remove);
  carrito.splice(indice, 1);
  renderCarrito();
});

// esto escucha cuando cambian el número de horas de un juego que YA está en el carrito (hu-24)
contenedorItems.addEventListener("change", evento => {
  const input = evento.target.closest(".cart-hours-input");
  if (!input) return;
  let horas = Number(input.value);
  if (!horas || horas < HORAS_MIN) horas = HORAS_MIN;
  if (horas > HORAS_JORNADA) horas = HORAS_JORNADA;

  const item = carrito.find(i => i.id === input.dataset.id);
  if (item) {
    item.horas = horas;
    item.precio = item.precioHora * horas; // recalculo el precio de ese item con las horas nuevas
    renderCarrito();
    mostrarToast(`${item.nombre} actualizado a ${horas} hora${horas === 1 ? "" : "s"}`);
  }
});

// esta función mete el buscador y el filtro de precio arriba del catálogo (no vienen en el html, los creo acá) (hu-12, hu-13, hu-14)
function inicializarBusquedaYPrecio() {
  const pills = document.querySelector(".filter-pills");
  if (!pills) return; // por si la página no tiene esa sección

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

  // los agrego justo al lado de los botones de categoría que ya venían en el html
  pills.insertAdjacentElement("afterend", rangoPrecio);
  pills.insertAdjacentElement("afterend", buscador);

  buscador.addEventListener("input", aplicarFiltros);
  rangoPrecio.addEventListener("change", aplicarFiltros);
}

// esta junta los 3 filtros (categoría + texto buscado + rango de precio) y decide qué tarjetas mostrar y cuáles esconder
function aplicarFiltros() {
  const filtro = document.querySelector(".filter-btn.active")?.dataset.filter || "todos";
  const texto = (document.querySelector("#buscarJuego")?.value || "").trim().toLowerCase();
  const rango = document.querySelector("#filtroPrecio")?.value || "todos";
  const [precioMin, precioMax] = rango === "todos" ? [0, Infinity] : rango.split("-").map(Number);

  let visibles = 0;
  document.querySelectorAll(".game-item").forEach(tarjeta => {
    const nombre = tarjeta.querySelector("h3").textContent.toLowerCase();
    const precio = Number(tarjeta.querySelector(".add-btn").dataset.price);

    // tiene que cumplir las 3 condiciones a la vez para mostrarse
    const coincideCategoria = filtro === "todos" || tarjeta.dataset.category.includes(filtro);
    const coincideTexto = texto === "" || nombre.includes(texto);
    const coincidePrecio = precio >= precioMin && precio <= precioMax;
    const coincide = coincideCategoria && coincideTexto && coincidePrecio;

    tarjeta.classList.toggle("d-none", !coincide); // la escondo o la muestro según corresponda
    if (coincide) visibles++;
  });
  document.querySelector("#sinResultados").classList.toggle("d-none", visibles > 0); // muestro el mensaje de "no hay resultados" si corresponde
}

// cuando aprietan un botón de categoría (Todos, Inflables, etc), lo marco como activo y aplico los filtros de nuevo (hu-13)
document.querySelectorAll(".filter-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    document.querySelector(".filter-btn.active").classList.remove("active");
    boton.classList.add("active");
    aplicarFiltros();
  });
});

// cuando aprietan el corazoncito, marco/desmarco el juego como favorito
// y si ese juego tiene descuento activo, aviso con un toast (hu-47)
document.querySelectorAll(".favorite-btn").forEach(boton => {
  boton.addEventListener("click", () => {
    const activando = !boton.classList.contains("active"); // reviso si lo estaban marcando o desmarcando
    boton.classList.toggle("active");
    boton.querySelector("i").classList.toggle("bi-heart");
    boton.querySelector("i").classList.toggle("bi-heart-fill");

    if (activando) {
      const card = boton.closest(".game-card");
      const id = card.querySelector(".add-btn").dataset.id;
      if (juegosConDescuento.includes(id)) {
        mostrarToast(`🎉 Este favorito tiene descuento activo: usa el código JUEGA10 en tu reserva`);
      }
    }
  });
});

// esta función agrega el botón "Ver reseñas" a cada tarjeta y arma el paneleto que se abre con los comentarios (hu-41, hu-43)
function inicializarResenas() {
  document.querySelectorAll(".game-card").forEach(card => {
    const id = card.querySelector(".add-btn").dataset.id;
    const resenas = resenasJuegos[id];
    if (!resenas) return; // si ese juego no tiene reseñas guardadas, no hago nada

    const ratingEl = card.querySelector(".rating");
    const verBtn = document.createElement("button");
    verBtn.type = "button";
    verBtn.className = "btn btn-link btn-sm p-0 ms-2 ver-resenas";
    verBtn.textContent = `Ver reseñas (${resenas.length})`;
    ratingEl.insertAdjacentElement("afterend", verBtn);

    // acá armo el bloque con cada reseña, usando estrellitas llenas y vacías según la calificación
    const panel = document.createElement("div");
    panel.className = "resenas-panel d-none mt-2"; // parte oculto hasta que le hagan click al botón
    panel.innerHTML = resenas.map(r => `
      <div class="mb-2 small">
        <strong>${r.autor}</strong> · ${"★".repeat(r.estrellas)}${"☆".repeat(5 - r.estrellas)}
        <p class="text-secondary mb-0">${r.comentario}</p>
      </div>`).join("");
    card.querySelector(".game-meta").insertAdjacentElement("afterend", panel);

    // al hacer click, muestro/escondo el panel y cambio el texto del botón
    verBtn.addEventListener("click", () => {
      panel.classList.toggle("d-none");
      verBtn.textContent = panel.classList.contains("d-none") ? `Ver reseñas (${resenas.length})` : "Ocultar reseñas";
    });
  });
}

// esta revisa, para una fecha dada, qué juegos están disponibles y cuáles no, y actualiza la tarjeta de cada uno (hu-17, hu-18)
function actualizarDisponibilidadPorFecha(fechaISO) {
  let disponibles = 0;

  document.querySelectorAll(".game-item").forEach(tarjeta => {
    const boton = tarjeta.querySelector(".add-btn");
    const horasInput = tarjeta.querySelector(".hours-input");
    const id = boton.dataset.id;
    // si el juego no tiene datos de disponibilidad guardados, le pongo uno por defecto para que no explote
    const info = disponibilidadJuegos[id] || { fechasNoDisponibles: [], horario: "09:00–20:00" };
    const noDisponible = info.fechasNoDisponibles.includes(fechaISO);

    const badge = tarjeta.querySelector(".status-badge");
    const icono = badge.querySelector("i");

    if (noDisponible) {
      // si no está disponible, cambio el badge a rojo, pongo el ícono de la x y desactivo el botón de agregar
      badge.classList.add("bg-danger-subtle");
      icono.className = "bi bi-x-circle-fill";
      badge.lastChild.textContent = ` No disponible`;
      boton.disabled = true;
      boton.classList.add("disabled");
      if (horasInput) horasInput.disabled = true;
    } else {
      // si sí está disponible, lo dejo normal y de paso muestro el horario de atención
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

// esto se dispara cuando el usuario aprieta "Buscar disponibilidad" arriba en el hero, con su fecha y comuna (hu-17, hu-18, hu-19)
document.querySelector("#buscarDisponibilidad").addEventListener("click", () => {
  const fecha = document.querySelector("#fechaEvento");
  const comuna = document.querySelector("#comunaEvento");
  if (!fecha.value || !comuna.value) {
    mostrarToast("Selecciona una fecha y una comuna");
    return; // si falta algo, ni sigo
  }
  // convierto la fecha a algo más legible tipo "25 de septiembre de 2026"
  const fechaLegible = new Date(`${fecha.value}T12:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  document.querySelector("#datosEvento").innerHTML = `<i class="bi bi-calendar2-check"></i><span>${fechaLegible} · ${comuna.value}</span>`;

  comunaSeleccionada = comuna.value; // guardo la comuna para calcular el transporte más adelante
  const disponibles = actualizarDisponibilidadPorFecha(fecha.value);
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" }); // hago scroll bonito hasta el catálogo
  renderCarrito(); // repinto el carrito porque puede que ahora sí tenga tarifa de transporte

  // reviso si alguno de los favoritos del usuario justo quedó no disponible esa fecha, para avisarle (hu-19)
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

// cuando aprietan "Solicitar reserva" en el carrito, simulo que se envía la solicitud (hu-26, hu-27, hu-28)
// como no tenemos backend, esto no manda nada de verdad, solo hace como que sí con un spinner y un toast
confirmar.addEventListener("click", () => {
  confirmar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enviando...`;
  confirmar.disabled = true;
  setTimeout(() => {
    const codigo = generarCodigoReserva();
    confirmar.innerHTML = `<i class="bi bi-check2 me-2"></i>Solicitud enviada`;
    mostrarToast(`Solicitud recibida. Código de reserva ${codigo}. Te contactaremos para confirmar`);
  }, 900); // el setTimeout es solo pa' que se sienta como que "está cargando" un rato
});

// no dejo elegir una fecha que ya pasó (el mínimo del input queda en el día de hoy)
document.querySelector("#fechaEvento").min = new Date().toISOString().split("T")[0];

// acá dejo todo listo apenas carga la página: le agrego el selector de horas a cada tarjeta,
// el buscador, las reseñas, los extras del carrito, y pinto el carrito una primera vez (aunque parta vacío)
inicializarSelectorHoras();
inicializarBusquedaYPrecio();
inicializarResenas();
inicializarCarritoExtras();
renderCarrito();
} // acá se cierra inicializarCatalogo(), ojo con este corchete jaja

// ===================================================================
// de acá para abajo: registro e inicio de sesión.
// como no hay backend, uso el localStorage del navegador como si fuera mi "base de datos" (hu-01, hu-03)
// ===================================================================
const CLAVE_USUARIOS = "juegaya_usuarios"; // así se va a llamar la "tabla" de usuarios guardada en el navegador
const CLAVE_SESION = "juegaya_sesion"; // acá guardo quién es el usuario que inició sesión

// trae la lista de usuarios guardados, o un arreglo vacío si todavía no hay ninguno
function obtenerUsuarios() {
  return JSON.parse(localStorage.getItem(CLAVE_USUARIOS) || "[]");
}

// guarda de nuevo toda la lista de usuarios (la piso completa cada vez, más simple así)
function guardarUsuarios(usuarios) {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
}

// esto maneja el formulario de "Crear cuenta": valida los campos, revisa que el correo no exista ya, y guarda al usuario (hu-01)
function inicializarRegistro() {
  const form = document.querySelector("#registroForm");
  if (!form) return; // si no estamos en la página de registro, no hago nada

  form.addEventListener("submit", evento => {
    evento.preventDefault(); // esto evita que la página se recargue sola al enviar el form

    const nombre = document.querySelector("#nombre").value.trim();
    const email = document.querySelector("#email").value.trim().toLowerCase();
    const password = document.querySelector("#password").value;

    if (!nombre || !email || !password) {
      mostrarToast("Completa todos los campos para crear tu cuenta");
      return;
    }
    if (password.length < 6) {
      mostrarToast("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const usuarios = obtenerUsuarios();
    if (usuarios.some(usuario => usuario.email === email)) {
      mostrarToast("Ya existe una cuenta con ese correo, intenta iniciar sesión");
      return;
    }

    // ojo: esto guarda la contraseña tal cual, en texto plano, en el navegador.
    // está bien para este prototipo, pero en un proyecto de verdad la contraseña se encripta y se guarda en un servidor, nunca así
    usuarios.push({ nombre, email, password });
    guardarUsuarios(usuarios);
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ nombre, email })); // lo dejo "logueado" de una

    mostrarToast(`¡Cuenta creada! Bienvenido/a ${nombre}`);
    setTimeout(() => { window.location.href = "catalogo.html"; }, 1200); // lo mando al catálogo despuesito
  });
}

// esto maneja el formulario de "Iniciar sesión": revisa que el correo y contraseña coincidan con algún usuario guardado (hu-03)
function inicializarLogin() {
  const form = document.querySelector("#loginForm");
  if (!form) return; // si no estamos en la página de login, chao

  form.addEventListener("submit", evento => {
    evento.preventDefault();

    const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
    const password = document.querySelector("#loginPassword").value;

    const usuarios = obtenerUsuarios();
    const usuario = usuarios.find(u => u.email === email && u.password === password);

    if (!usuario) {
      mostrarToast("Correo o contraseña incorrectos");
      return;
    }

    localStorage.setItem(CLAVE_SESION, JSON.stringify({ nombre: usuario.nombre, email: usuario.email }));
    mostrarToast(`¡Hola de nuevo, ${usuario.nombre}!`);
    setTimeout(() => { window.location.href = "catalogo.html"; }, 1000);
  });
}

// y acá abajo es donde realmente se "prende" todo el script.
// primero reviso si esta página tiene el catálogo (el #listaJuegos), y si es así, recién ahí corro toda la lógica del carrito.
// esto evita que truene el script en páginas como login o registro, que no tienen esos elementos
if (document.querySelector("#listaJuegos")) inicializarCatalogo();
inicializarRegistro(); // esta función misma revisa si existe el form, así que no pasa nada si la llamo siempre
inicializarLogin(); // lo mismo acá
