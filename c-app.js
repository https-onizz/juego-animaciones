/* =======================================================================
   VARIABLES GLOBALES (nombres simples y descriptivos para aprendices)
   ======================================================================= */
let nombreJugador = "";           // lo pedimos con prompt al iniciar
let nivelActual = 1;              // 1 = carros, 2 = motos (puedes agregar más)
let aciertosEnNivel = 0;          // cuántas parejas acertó en el nivel
let intentosTotales = 0;          // cuántas comparaciones hizo
const tiempoPorNivel = 30;        // segundos por nivel
let tiempoRestante = tiempoPorNivel;

let idReloj = null;               // guarda el setInterval para poder detenerlo
let cartasVolteadas = [];         // aquí guardamos las 2 cartas para comparar
let bloqueoTablero = false;       // evita que voltee más de 2 a la vez
let avisoDiezSegundos = false;    // para reproducir "correr.mp3" una sola vez

// Arreglos de imágenes: 6 únicas → se duplican para armar 12 cartas
const imagenesAgentes = ['01-agentes/agente1.webp','01-agentes/agente2.webp','01-agentes/agente3.png','01-agentes/agente4.png','01-agentes/agente5.png','01-agentes/agente6.png'];
const imagenesArmas  = ['02-armas/arma1.png','02-armas/arma2.webp','02-armas/arma3.png','02-armas/arma4.png','02-armas/arma5.png','02-armas/arma6.png'];

// Lista de niveles en orden: puedes añadir más arrays con 6 imágenes
const nivelesImagenes = [imagenesAgentes, imagenesArmas];

/* =======================================================================
   REFERENCIAS AL DOM (elementos de la página)
   ======================================================================= */
const elTablero         = document.getElementById('tablero');
const elBtnComenzar     = document.getElementById('btnComenzar');
const elDatoJugador     = document.getElementById('datoJugador');
const elDatoNivel       = document.getElementById('datoNivel');
const elDatoAciertos    = document.getElementById('datoAciertos');
const elDatoIntentos    = document.getElementById('datoIntentos');
const elDatoTiempo      = document.getElementById('datoTiempo');
const elTablaJugadores  = document.getElementById('tablaJugadores');

/* =======================================================================
   AUDIOS (variables con el MISMO nombre que el archivo para no confundirse)
   ======================================================================= */
const audioClickMp3   = document.getElementById('audioClickMp3');   // al voltear carta
const audioCorrerMp3  = document.getElementById('audioCorrerMp3');  // últimos 10 segundos (loop controlado por JS)
const audioDerrotaMp3 = document.getElementById('audioDerrotaMp3'); // fin por tiempo agotado
const audioErrorMp3   = document.getElementById('audioErrorMp3');   // pareja incorrecta
const audioJugarMp3   = document.getElementById('audioJugarMp3');   // música de fondo (loop en etiqueta)
const audioSuccessMp3 = document.getElementById('audioSuccessMp3'); // pareja correcta
const audioTriunfoMp3 = document.getElementById('audioTriunfoMp3'); // ganó todos los niveles

/* =======================================================================
   EVENTO DEL BOTÓN "COMENZAR"
   ======================================================================= */
elBtnComenzar.addEventListener('click', iniciarJuego);

/* =======================================================================
   FUNCIÓN: iniciarJuego()
   - Pide el nombre
   - Resetea contadores
   - Prepara el tablero del nivel 1
   - Inicia el temporizador
   - Enciende la música de fondo "jugar.mp3" en loop
   ======================================================================= */
function iniciarJuego(){
  const nombre = prompt('Ingresa tu nombre:');
  if(!nombre) return; // Si cancela, no hace nada

  nombreJugador = nombre.trim();
  nivelActual = 1;
  aciertosEnNivel = 0;
  intentosTotales = 0;
  tiempoRestante = tiempoPorNivel;
  avisoDiezSegundos = false;

  // Música de fondo durante todo el juego
  try { audioJugarMp3.volume = 0.6; audioJugarMp3.play(); } catch(e){}

  actualizarPanel();
  crearTableroParaNivel(nivelActual);
  iniciarReloj();
}

/* =======================================================================
   FUNCIÓN: crearTableroParaNivel(nivel)
   - Genera 12 cartas (6 imágenes duplicadas y mezcladas)
   - Resetea variables que controlan el flujo del nivel
   ======================================================================= */
function crearTableroParaNivel(nivel){
  elTablero.innerHTML = '';      // limpia el tablero
  cartasVolteadas = [];          // vacía selección
  bloqueoTablero = false;        // permite volver a jugar
  avisoDiezSegundos = false;     // aún no sonó "correr"
  detenerSonidoCorrer();         // por si quedó sonando del nivel anterior

  // Copia de las imágenes del nivel y duplicadas para formar parejas
  const lista = nivelesImagenes[nivel-1].slice();
  const cartas = mezclar([...lista, ...lista]); // mezcla aleatoria

  // Cambiamos la imagen de fondo según nivel (decorativo)
  document.body.style.backgroundImage =
    (nivel === 1) ? "url('fondo.png')" : "url('fondo2.png')";

  // Crea cada carta con su “cara” (imagen) y su “reverso” (interrogante)
  cartas.forEach((ruta, i)=>{
    const carta = document.createElement('div');
    carta.className = 'carta';
    carta.dataset.ruta = ruta; // para comparar luego
    carta.dataset.index = i;

    const cara = document.createElement('div');
    cara.className = 'cara';
    const img = document.createElement('img');
    img.src = ruta;
    cara.appendChild(img);

    const reverso = document.createElement('div');
    reverso.className = 'reverso';

    carta.appendChild(cara);
    carta.appendChild(reverso);

    // Al hacer click → llamar a voltearCarta(carta)
    carta.addEventListener('click', ()=>voltearCarta(carta));
    elTablero.appendChild(carta);
  });
}

/* =======================================================================
   FUNCIÓN: voltearCarta(carta)
   - Controla que no se volteen más de 2 cartas a la vez
   - Guarda las 2 cartas para compararlas
   ======================================================================= */
function voltearCarta(carta){
  if (bloqueoTablero) return;                     // bloqueado mientras comparamos
  if (carta.classList.contains('volteada')) return; // ya está boca arriba
  if (carta.classList.contains('acertada')) return; // ya fue acertada

  // Sonido de click al voltear
  try { audioClickMp3.currentTime = 0; audioClickMp3.play(); } catch(e){}

  carta.classList.add('volteada');
  cartasVolteadas.push(carta);

  // Cuando hay 2, se comparan
  if (cartasVolteadas.length === 2) {
    bloqueoTablero = true;       // evita que se voltee una tercera
    intentosTotales++;           // cuenta el intento
    actualizarPanel();
    compararPareja();
  }
}

/* =======================================================================
   FUNCIÓN: compararPareja()
   - Compara las 2 cartas en cartasVolteadas
   - Si son iguales → acierto (mantener volteadas)
   - Si son distintas → error (se giran de nuevo)
   ======================================================================= */
function compararPareja(){
  const [c1, c2] = cartasVolteadas;
  const sonIguales = c1.dataset.ruta === c2.dataset.ruta;

  if (sonIguales) {
    // Acierto: sonido corto y marcar cartas
    aciertosEnNivel++;
    try { audioSuccessMp3.currentTime = 0; audioSuccessMp3.play(); } catch(e){}
    c1.classList.add('acertada'); c2.classList.add('acertada');

    mostrarCheckAnimado();

    // Limpiar selección y permitir seguir
    cartasVolteadas = [];
    bloqueoTablero = false;

    actualizarPanel();
    revisarFinDeNivel();   // ¿ya completó las 6 parejas?
  } else {
    // Error: sonido y volver a girar luego de 700ms
    try { audioErrorMp3.currentTime = 0; audioErrorMp3.play(); } catch(e){}
    setTimeout(()=>{
      c1.classList.remove('volteada');
      c2.classList.remove('volteada');
      cartasVolteadas = [];
      bloqueoTablero = false;
    }, 700);
  }
}

function mostrarCheckAnimado() {
  const check = document.createElement('div');
  check.className = 'check-valorant';
  check.innerHTML = '✔'; // puedes reemplazar por un SVG estilo Valorant

  document.body.appendChild(check);

  // Quitar después de 1 segundo
  setTimeout(()=> check.remove(), 1000);
}


/* =======================================================================
   FUNCIÓN: revisarFinDeNivel()
   - Si completó 6 parejas, anuncia y pasa al siguiente nivel (si existe)
   - Si no hay más niveles, GANÓ la partida (triunfo.mp3)
   ======================================================================= */
function revisarFinDeNivel(){
  if (aciertosEnNivel === 6) {
    detenerReloj();
    detenerSonidoCorrer();

    // Guardamos el número del nivel que se acaba de completar
    const nivelCompletado = nivelActual;
    setTimeout(()=>alert('🎉 ¡Nivel ' + nivelCompletado + ' completado!'), 120);

    // ¿Hay más niveles?
    if (nivelActual < nivelesImagenes.length) {
      // Avanzar al siguiente nivel
      nivelActual++;
      aciertosEnNivel = 0;
      intentosTotales = 0;
      tiempoRestante = tiempoPorNivel;

      actualizarPanel();
      crearTableroParaNivel(nivelActual);
      iniciarReloj(); // empezar a contar otra vez
    } else {
  // No hay más niveles → TRIUNFO FINAL
  registrarJugador();
  try { audioTriunfoMp3.currentTime = 0; audioTriunfoMp3.play(); } catch(e){}

  // Mostrar animación de GANADOR estilo Valorant
  const winnerBanner = document.getElementById('winnerBanner');
  winnerBanner.classList.add('show');

  // Ocultar después de unos segundos si quieres
  setTimeout(() => {
    winnerBanner.classList.remove('show');
  }, 4000); // 4 segundos visible
}

  }
}

/* =======================================================================
   FUNCIÓN: iniciarReloj()
   - Usa setInterval para restar 1 segundo
   - A los 10 segundos restantes, reproduce "correr.mp3" en loop
   - Cuando llega a 0, fin de partida → DERROTA
   ======================================================================= */
function iniciarReloj(){
  detenerReloj(); // seguridad por si estaba corriendo
  elDatoTiempo.textContent = 'Tiempo: ' + tiempoRestante;

  idReloj = setInterval(()=>{
    tiempoRestante--;
    elDatoTiempo.textContent = 'Tiempo: ' + tiempoRestante;

    // Cuando queden 10s, activamos el sonido "correr.mp3" una sola vez
    if (!avisoDiezSegundos && tiempoRestante <= 10) {
      avisoDiezSegundos = true;
      try {
        audioCorrerMp3.loop = true;
        audioCorrerMp3.volume = 0.85;
        audioCorrerMp3.currentTime = 0;
        audioCorrerMp3.play();
      } catch(e){}
    }

    // ¿Se quedó sin tiempo? → Derrota
    if (tiempoRestante <= 0) {
      detenerReloj();
      detenerSonidoCorrer();
      try { audioDerrotaMp3.currentTime = 0; audioDerrotaMp3.play(); } catch(e){}
      alert('⏳ ¡Tiempo agotado!');
      registrarJugador();
      bloqueoTablero = true; // Evita seguir jugando hasta reiniciar
    }
  }, 1000);
}

/* =======================================================================
   FUNCIONES AUXILIARES: detenerReloj, detenerSonidoCorrer, actualizarPanel,
   registrarJugador, mezclar (aleatorio simple), esc (escape de texto)
   ======================================================================= */
function detenerReloj(){ if (idReloj) clearInterval(idReloj); idReloj = null; }

function detenerSonidoCorrer(){
  try { audioCorrerMp3.pause(); audioCorrerMp3.currentTime = 0; } catch(e){}
}

function actualizarPanel(){
  elDatoJugador.textContent  = 'Jugador: ' + (nombreJugador || '—');
  elDatoNivel.textContent    = 'Nivel: ' + nivelActual;
  elDatoAciertos.textContent = 'Aciertos: ' + aciertosEnNivel;
  elDatoIntentos.textContent = 'Intentos: ' + intentosTotales;
  elDatoTiempo.textContent   = 'Tiempo: ' + tiempoRestante;
}

function registrarJugador(){
  const fila = document.createElement('tr');
  const numero = elTablaJugadores.children.length + 1;
  fila.innerHTML = `
    <td>${numero}</td>
    <td>${esc(nombreJugador)}</td>
    <td>${nivelActual}</td>
    <td>${intentosTotales}</td>
    <td>${aciertosEnNivel}</td>
    <td>${tiempoRestante} seg.</td>
  `;
  elTablaJugadores.appendChild(fila);
}

/* Mezcla rápida para este proyecto educativo (suficiente para el juego) */
function mezclar(arr){ return arr.sort(()=>Math.random() - 0.5); }

/* Escapa caracteres especiales por si el jugador escribe símbolos raros */
function esc(t){ return (t+'').replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }