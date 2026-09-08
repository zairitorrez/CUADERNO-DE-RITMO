/* ============================================================
   CUADERNO DE RITMO
   1. Audio        5. Samples            9. Proyecto
   2. Batería      6. Interfaz ritmo    10. Visualizador
   3. Pistas       7. Teclado/melodías  11. Avatar robot
   4. Secuenciador 8. Grabar y exportar 12. Bucle y arranque
   ============================================================ */
(() => {
"use strict";

/* ============================================================
   1. AUDIO
   ============================================================ */
const AC = window.AudioContext || window.webkitAudioContext;
let ctx = null, master = null, compresor = null, analizador = null, tomaGrabacion = null, mudo = null;
let bufferRuido = null, datosOnda = null, datosFrec = null;

function crearRuido(){
  const largo = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, largo, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function iniciarAudio(){
  if (ctx){ if (ctx.state === "suspended") ctx.resume(); return; }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = (+vol.value) / 100;
  compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -12;
  compresor.ratio.value = 4;
  analizador = ctx.createAnalyser();
  analizador.fftSize = 2048;
  analizador.smoothingTimeConstant = 0.75;
  datosOnda = new Uint8Array(analizador.fftSize);
  datosFrec = new Uint8Array(analizador.frequencyBinCount);
  master.connect(compresor);
  compresor.connect(analizador);
  analizador.connect(ctx.destination);
  mudo = ctx.createGain();
  mudo.gain.value = 0;
  mudo.connect(ctx.destination);
  bufferRuido = crearRuido();
}

const ahora = () => (ctx ? ctx.currentTime : 0);

function env(g, t, pico, ataque, caida){
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
}

/* ============================================================
   2. SONIDOS DE FÁBRICA DE LA CAJA DE RITMO
   ============================================================ */
function bombo(t, salida, v = 1){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.13);
  env(g, t, 1.0 * v, 0.004, 0.42);
  o.connect(g); g.connect(salida);
  o.start(t); o.stop(t + 0.5);
}
function caja(t, salida, v = 1){
  const n = ctx.createBufferSource(); n.buffer = bufferRuido;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.8;
  const g = ctx.createGain(); env(g, t, 0.55 * v, 0.002, 0.19);
  n.connect(f); f.connect(g); g.connect(salida);
  n.start(t); n.stop(t + 0.3);
  const o = ctx.createOscillator(), g2 = ctx.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(190, t);
  env(g2, t, 0.32 * v, 0.002, 0.11);
  o.connect(g2); g2.connect(salida);
  o.start(t); o.stop(t + 0.2);
}
function hihat(t, salida, v = 1){
  const n = ctx.createBufferSource(); n.buffer = bufferRuido;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7800;
  const g = ctx.createGain(); env(g, t, 0.3 * v, 0.001, 0.055);
  n.connect(f); f.connect(g); g.connect(salida);
  n.start(t); n.stop(t + 0.14);
}
function palmas(t, salida, v = 1){
  for (let i = 0; i < 3; i++){
    const d = t + i * 0.012;
    const n = ctx.createBufferSource(); n.buffer = bufferRuido;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1250; f.Q.value = 1.6;
    const g = ctx.createGain(); env(g, d, (i === 2 ? 0.5 : 0.28) * v, 0.001, i === 2 ? 0.16 : 0.03);
    n.connect(f); f.connect(g); g.connect(salida);
    n.start(d); n.stop(d + 0.25);
  }
}
function tom(t, salida, v = 1){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(96, t + 0.22);
  env(g, t, 0.7 * v, 0.004, 0.3);
  o.connect(g); g.connect(salida);
  o.start(t); o.stop(t + 0.4);
}
function cencerro(t, salida, v = 1){
  const g = ctx.createGain(); env(g, t, 0.3 * v, 0.002, 0.25);
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 2;
  [540, 800].forEach(hz => {
    const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = hz;
    o.connect(f); o.start(t); o.stop(t + 0.3);
  });
  f.connect(g); g.connect(salida);
}

/* ============================================================
   3. PISTAS Y PATRONES
   ============================================================ */
const PASOS = 16;
const PISTAS = [
  { id:"bombo",    nombre:"Bombo",    color:"var(--rojo)",     synth:bombo },
  { id:"caja",     nombre:"Caja",     color:"var(--rosa)",     synth:caja },
  { id:"hihat",    nombre:"Hi-hat",   color:"var(--violeta)",  synth:hihat },
  { id:"palmas",   nombre:"Palmas",   color:"var(--amarillo)", synth:palmas },
  { id:"tom",      nombre:"Tom",      color:"var(--verde)",    synth:tom },
  { id:"cencerro", nombre:"Cencerro", color:"var(--naranja)",  synth:cencerro }
];
PISTAS.forEach(p => {
  p.pasos = new Array(PASOS).fill(false);
  p.silencio = false;
  p.volumen = 0.85;
  p.buffer = null;
  p.nombreArchivo = "";
  p.datosArchivo = null;   // base64 del archivo original, para exportar el proyecto
});

const PRESETS = {
  cumbia:    { bpm:96,  datos:{ bombo:[0,8], caja:[4,12], hihat:[2,6,10,14], palmas:[], tom:[7,15], cencerro:[0,4,8,12] } },
  reggaeton: { bpm:94,  datos:{ bombo:[0,8], caja:[3,6,11,14], hihat:[0,2,4,6,8,10,12,14], palmas:[3,11], tom:[], cencerro:[] } },
  house:     { bpm:124, datos:{ bombo:[0,4,8,12], caja:[4,12], hihat:[2,6,10,14], palmas:[4,12], tom:[], cencerro:[] } },
  trap:      { bpm:140, datos:{ bombo:[0,7,10], caja:[8], hihat:[0,2,4,6,8,10,11,12,14,15], palmas:[8], tom:[], cencerro:[] } }
};

/* ============================================================
   4. SECUENCIADOR
   ============================================================ */
let sonando = false, pasoActual = 0, proximoTiempo = 0, reloj = null;
const HORIZONTE = 0.12, INTERVALO = 25;
const cola = [];    // marcas visuales del cabezal
const golpes = [];  // impulsos para el avatar

const duracionPaso = () => 60 / (+bpm.value) / 4;

function programarPaso(paso, t){
  PISTAS.forEach(p => {
    if (!p.pasos[paso] || p.silencio) return;
    if (p.buffer) reproducirBuffer(p.buffer, t, p.volumen, 1);
    else {
      const g = ctx.createGain();
      g.gain.value = p.volumen;
      g.connect(master);
      p.synth(t, g, 1);
    }
    golpes.push({ tiempo:t, tipo:(p.id === "bombo" || p.id === "tom") ? "fuerte" : "suave" });
  });
  if (paso === 0 && melodiaEnBucle) reproducirMelodia(melodiaEnBucle, t);
  cola.push({ paso, tiempo:t });
}

function avanzar(){
  const d = duracionPaso();
  const swing = (+swingCtrl.value) / 100;
  proximoTiempo += (pasoActual % 2 === 0) ? d * (1 + swing * 0.5) : d * (1 - swing * 0.5);
  pasoActual = (pasoActual + 1) % PASOS;
}

function planificador(){
  while (proximoTiempo < ahora() + HORIZONTE){
    programarPaso(pasoActual, proximoTiempo);
    avanzar();
  }
}

function tocarDetener(forzar){
  iniciarAudio();
  const encender = (forzar === undefined) ? !sonando : forzar;
  if (encender === sonando) return;
  if (encender){
    sonando = true;
    pasoActual = 0;
    proximoTiempo = ahora() + 0.06;
    reloj = setInterval(planificador, INTERVALO);
    btnTocar.textContent = "Detener";
    btnTocar.dataset.sonando = "true";
  } else {
    sonando = false;
    clearInterval(reloj); reloj = null;
    cola.length = 0;
    document.querySelectorAll(".paso.tocando").forEach(e => e.classList.remove("tocando"));
    btnTocar.textContent = "Tocar";
    btnTocar.dataset.sonando = "false";
  }
}

/* ============================================================
   5. SAMPLES
   ============================================================ */
function reproducirBuffer(buffer, t, volumen, velocidad){
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  s.playbackRate.value = velocidad;
  const g = ctx.createGain();
  g.gain.setValueAtTime(volumen, t);
  s.connect(g); g.connect(master);
  s.start(t);
  return s;
}

function aBase64(arrayBuffer){
  const bytes = new Uint8Array(arrayBuffer);
  let bin = "";
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo){
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + trozo));
  }
  return btoa(bin);
}
function deBase64(b64){
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function decodificar(arrayBuffer){
  iniciarAudio();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/* ============================================================
   6. INTERFAZ DE LA CAJA DE RITMO
   ============================================================ */
const contenedorPistas = document.getElementById("pistas");
const regla = document.getElementById("regla");

for (let i = 0; i < PASOS; i++){
  const c = document.createElement("span");
  c.innerHTML = (i % 4 === 0) ? "<b>" + (i / 4 + 1) + "</b>" : "·";
  regla.appendChild(c);
}

PISTAS.forEach((p, ti) => {
  const fila = document.createElement("div");
  fila.className = "pista";

  const rot = document.createElement("div");
  rot.className = "rotulo";
  rot.innerHTML = '<i class="punto" style="background:' + p.color + '"></i>' +
                  '<span class="nombre" id="nom-' + p.id + '">' + p.nombre + '</span>';

  const bSample = document.createElement("button");
  bSample.className = "mini"; bSample.textContent = "♪";
  bSample.title = "Cargar un WAV o MP3 en la pista " + p.nombre;
  bSample.setAttribute("aria-label", "Cargar sonido propio en " + p.nombre);

  const entrada = document.createElement("input");
  entrada.type = "file"; entrada.accept = "audio/*,.wav,.mp3"; entrada.hidden = true;

  const bMute = document.createElement("button");
  bMute.className = "mini"; bMute.textContent = "M";
  bMute.setAttribute("aria-pressed", "false");
  bMute.setAttribute("aria-label", "Silenciar " + p.nombre);

  const bLimpiar = document.createElement("button");
  bLimpiar.className = "mini"; bLimpiar.textContent = "✕";
  bLimpiar.setAttribute("aria-label", "Borrar el patrón de " + p.nombre);

  rot.append(bSample, entrada, bMute, bLimpiar);
  p.botonSample = bSample;

  const pasos = document.createElement("div");
  pasos.className = "pasos";
  for (let s = 0; s < PASOS; s++){
    const b = document.createElement("button");
    b.className = "paso";
    b.style.setProperty("--color", p.color);
    b.dataset.pista = ti; b.dataset.paso = s;
    b.dataset.fuerte = (s % 4 === 0) ? "1" : "0";
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", p.nombre + ", casilla " + (s + 1));
    b.addEventListener("click", () => {
      p.pasos[s] = !p.pasos[s];
      b.setAttribute("aria-pressed", p.pasos[s] ? "true" : "false");
      if (p.pasos[s]){ iniciarAudio(); previa(p); }
      guardarPronto();
    });
    pasos.appendChild(b);
  }

  bSample.addEventListener("click", () => entrada.click());
  entrada.addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const datos = await f.arrayBuffer();
      await cargarSampleEnPista(p, f.name, datos);
      previa(p);
      avisar("Cargado en " + p.nombre + ": " + f.name);
    } catch (err){
      avisar("Ese archivo no se pudo leer. Prueba con un WAV o un MP3.");
    }
  });

  bMute.addEventListener("click", () => {
    p.silencio = !p.silencio;
    bMute.setAttribute("aria-pressed", p.silencio ? "true" : "false");
    guardarPronto();
  });

  bLimpiar.addEventListener("click", () => {
    p.pasos.fill(false);
    pasos.querySelectorAll(".paso").forEach(b => b.setAttribute("aria-pressed", "false"));
    guardarPronto();
  });

  fila.append(rot, pasos);
  contenedorPistas.appendChild(fila);
});

async function cargarSampleEnPista(p, nombreArchivo, arrayBuffer){
  p.buffer = await decodificar(arrayBuffer);
  p.nombreArchivo = nombreArchivo;
  p.datosArchivo = aBase64(arrayBuffer);
  p.botonSample.classList.add("cargada");
  p.botonSample.title = "Sonido cargado: " + nombreArchivo + ". Toca de nuevo para cambiarlo.";
  document.getElementById("nom-" + p.id).textContent = nombreArchivo.replace(/\.[^.]+$/, "");
  if (!bufferMelodico){
    bufferMelodico = p.buffer;
    opcionSample.disabled = false;
    opcionSample.textContent = "Tu sample (" + nombreArchivo.slice(0, 14) + ")";
  }
}

function previa(p){
  iniciarAudio();
  const t = ahora() + 0.01;
  if (p.buffer) reproducirBuffer(p.buffer, t, p.volumen, 1);
  else { const g = ctx.createGain(); g.gain.value = p.volumen; g.connect(master); p.synth(t, g, 1); }
  golpes.push({ tiempo:t, tipo:"suave" });
}

function pintarPatron(){
  PISTAS.forEach((p, ti) => {
    const botones = contenedorPistas.querySelectorAll('.paso[data-pista="' + ti + '"]');
    p.pasos.forEach((on, s) => botones[s].setAttribute("aria-pressed", on ? "true" : "false"));
  });
}

document.querySelectorAll("[data-preset]").forEach(b => {
  b.addEventListener("click", () => {
    const pr = PRESETS[b.dataset.preset];
    PISTAS.forEach(p => {
      p.pasos.fill(false);
      (pr.datos[p.id] || []).forEach(i => p.pasos[i] = true);
    });
    bpm.value = pr.bpm; bpmVal.value = pr.bpm;
    pintarPatron(); guardarPronto();
    avisar("Ritmo de " + b.textContent.toLowerCase() + " listo. Cámbialo a tu gusto.");
  });
});

document.getElementById("borrarTodo").addEventListener("click", () => {
  PISTAS.forEach(p => p.pasos.fill(false));
  pintarPatron(); guardarPronto();
});

/* ============================================================
   7. TECLADO Y MELODÍAS
   ============================================================ */
const NOTAS = [
  {en:"C",  n:"Do",  s:0,  negra:false, tecla:"a"},
  {en:"C#", n:"Do#", s:1,  negra:true,  tecla:"w"},
  {en:"D",  n:"Re",  s:2,  negra:false, tecla:"s"},
  {en:"D#", n:"Re#", s:3,  negra:true,  tecla:"e"},
  {en:"E",  n:"Mi",  s:4,  negra:false, tecla:"d"},
  {en:"F",  n:"Fa",  s:5,  negra:false, tecla:"f"},
  {en:"F#", n:"Fa#", s:6,  negra:true,  tecla:"t"},
  {en:"G",  n:"Sol", s:7,  negra:false, tecla:"g"},
  {en:"G#", n:"Sol#",s:8,  negra:true,  tecla:"y"},
  {en:"A",  n:"La",  s:9,  negra:false, tecla:"h"},
  {en:"A#", n:"La#", s:10, negra:true,  tecla:"u"},
  {en:"B",  n:"Si",  s:11, negra:false, tecla:"j"},
  {en:"C",  n:"Do",  s:12, negra:false, tecla:"k"},
  {en:"C#", n:"Do#", s:13, negra:true,  tecla:"o"},
  {en:"D",  n:"Re",  s:14, negra:false, tecla:"l"},
  {en:"D#", n:"Re#", s:15, negra:true,  tecla:"p"},
  {en:"E",  n:"Mi",  s:16, negra:false, tecla:"ñ"}
];
let octava = 4;
let bufferMelodico = null;
const opcionSample = document.getElementById("optSample");
const selInstrumento = document.getElementById("instrumento");
const contenedorTeclas = document.getElementById("teclas");
const mapaTeclas = {};
const teclaPorSemitono = {};

function construirTeclado(){
  contenedorTeclas.innerHTML = "";
  const blancas = NOTAS.filter(n => !n.negra);
  const anchoBlanca = 100 / blancas.length;
  let iBlanca = -1;

  NOTAS.forEach(nota => {
    const b = document.createElement("button");
    b.dataset.semitono = nota.s;
    if (nota.negra){
      b.className = "negra";
      b.style.left = "calc(" + ((iBlanca + 1) * anchoBlanca) + "% - 3.6%)";
      b.innerHTML = '<b class="ingles"></b><kbd>' + nota.tecla.toUpperCase() + "</kbd>";
    } else {
      iBlanca++;
      b.className = "blanca";
      b.innerHTML = '<b class="ingles"></b><span class="latina">' + nota.n +
                    '</span><kbd>' + nota.tecla.toUpperCase() + "</kbd>";
    }
    b.addEventListener("pointerdown", ev => { ev.preventDefault(); tocarNota(nota.s, b); });
    mapaTeclas[nota.tecla] = { semitono: nota.s, el: b };
    teclaPorSemitono[nota.s] = b;
    contenedorTeclas.appendChild(b);
  });
  etiquetarTeclado();
}

/* Los nombres en inglés llevan el número de octava y cambian con los botones de octava */
function etiquetarTeclado(){
  NOTAS.forEach(nota => {
    const b = teclaPorSemitono[nota.s];
    if (!b) return;
    const oct = octava + Math.floor(nota.s / 12);
    const nombre = nota.en + oct;
    b.querySelector(".ingles").textContent = nombre;
    b.setAttribute("aria-label", nombre + ", " + nota.n);
    b.title = nombre + " (" + nota.n + ") — tecla " + nota.tecla.toUpperCase();
  });
}

const frecuencia = (semitono, oct) => 440 * Math.pow(2, (12 * ((oct === undefined ? octava : oct) + 1) + semitono - 69) / 12);

function destello(el){
  if (!el) return;
  el.classList.add("activa");
  setTimeout(() => el.classList.remove("activa"), 160);
}

function tocarNota(semitono, el, cuando, instr, oct){
  iniciarAudio();
  const programada = cuando !== undefined;
  const t = programada ? cuando : ahora() + 0.005;
  const tipo = instr || selInstrumento.value;
  const oc = (oct === undefined) ? octava : oct;
  const f = frecuencia(semitono, oc);
  const g = ctx.createGain(); g.gain.value = 0.9; g.connect(master);

  if (tipo === "sample" && bufferMelodico){
    reproducirBuffer(bufferMelodico, t, 0.9, f / 261.63);
  } else if (tipo === "bajo"){
    const o = ctx.createOscillator(), sub = ctx.createOscillator(), fl = ctx.createBiquadFilter(), e = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = f / 2;
    sub.type = "sine"; sub.frequency.value = f / 4;
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(1400, t);
    fl.frequency.exponentialRampToValueAtTime(160, t + 0.5);
    env(e, t, 0.6, 0.01, 0.6);
    o.connect(fl); sub.connect(fl); fl.connect(e); e.connect(g);
    o.start(t); sub.start(t); o.stop(t + 0.9); sub.stop(t + 0.9);
  } else if (tipo === "pluck"){
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), e = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = f;
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(f * 6, t);
    fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.25);
    env(e, t, 0.45, 0.004, 0.5);
    o.connect(fl); fl.connect(e); e.connect(g);
    o.start(t); o.stop(t + 0.8);
  } else if (tipo === "campana"){
    const port = ctx.createOscillator(), mod = ctx.createOscillator(), gm = ctx.createGain(), e = ctx.createGain();
    port.type = "sine"; port.frequency.value = f;
    mod.type = "sine"; mod.frequency.value = f * 3.4;
    gm.gain.setValueAtTime(f * 2.2, t);
    gm.gain.exponentialRampToValueAtTime(1, t + 0.9);
    mod.connect(gm); gm.connect(port.frequency);
    env(e, t, 0.4, 0.003, 1.6);
    port.connect(e); e.connect(g);
    port.start(t); mod.start(t); port.stop(t + 2); mod.stop(t + 2);
  } else if (tipo === "pad"){
    const e = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = "lowpass"; fl.frequency.value = 2200;
    [-7, 0, 7].forEach(cents => {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = cents;
      o.connect(fl); o.start(t); o.stop(t + 2.2);
    });
    env(e, t, 0.3, 0.35, 1.7);
    fl.connect(e); e.connect(g);
  } else {
    const e = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(f * 8 + 800, t);
    fl.frequency.exponentialRampToValueAtTime(f * 2 + 200, t + 0.6);
    const o1 = ctx.createOscillator(); o1.type = "triangle"; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o1.connect(fl); o2.connect(g2); g2.connect(fl);
    env(e, t, 0.5, 0.006, 1.1);
    fl.connect(e); e.connect(g);
    o1.start(t); o2.start(t); o1.stop(t + 1.4); o2.stop(t + 1.4);
  }

  golpes.push({ tiempo:t, tipo:"nota" });

  if (programada){
    const espera = Math.max(0, (t - ahora()) * 1000);
    setTimeout(() => destello(teclaPorSemitono[semitono]), espera);
  } else {
    destello(el || teclaPorSemitono[semitono]);
    if (grabandoMelodia) notasGrabadas.push({ t: t - inicioMelodia, s: semitono, i: tipo, o: oc });
  }
}

document.getElementById("octMenos").addEventListener("click", () => cambiarOctava(-1));
document.getElementById("octMas").addEventListener("click", () => cambiarOctava(1));
function cambiarOctava(d){
  octava = Math.min(6, Math.max(1, octava + d));
  document.getElementById("octVal").textContent = "Octava " + octava;
  etiquetarTeclado();
  guardarPronto();
}
selInstrumento.addEventListener("change", guardarPronto);

document.getElementById("cargarMelodico").addEventListener("click", () => document.getElementById("fileMelodico").click());
document.getElementById("fileMelodico").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    bufferMelodico = await decodificar(await f.arrayBuffer());
    opcionSample.disabled = false;
    opcionSample.textContent = "Tu sample (" + f.name.slice(0, 16) + ")";
    selInstrumento.value = "sample";
    avisar("Sample melódico listo. Cada tecla lo toca a distinta altura.");
  } catch (err){
    avisar("Ese archivo no se pudo leer. Prueba con un WAV o un MP3.");
  }
});

/* ---------- grabación de melodías ---------- */
let melodias = [];
let grabandoMelodia = false, notasGrabadas = [], inicioMelodia = 0;
let melodiaEnBucle = null;
const btnGrabarMelodia = document.getElementById("grabarMelodia");
const campoNombre = document.getElementById("nombreMelodia");
const listaMelodias = document.getElementById("listaMelodias");
const vacioMelodias = document.getElementById("vacioMelodias");
const estadoMelodia = document.getElementById("estadoMelodia");

btnGrabarMelodia.addEventListener("click", () => {
  iniciarAudio();
  if (!grabandoMelodia){
    grabandoMelodia = true;
    notasGrabadas = [];
    inicioMelodia = ahora();
    btnGrabarMelodia.dataset.grabando = "true";
    btnGrabarMelodia.textContent = "Guardar melodía";
    estadoMelodia.textContent = "Grabando… toca el teclado.";
  } else {
    grabandoMelodia = false;
    btnGrabarMelodia.dataset.grabando = "false";
    btnGrabarMelodia.textContent = "Grabar melodía";
    if (!notasGrabadas.length){
      estadoMelodia.textContent = "No tocaste ninguna nota.";
      return;
    }
    const nombre = (campoNombre.value || "").trim() || "Melodía " + (melodias.length + 1);
    melodias.push({
      id: "m" + Date.now(),
      nombre,
      notas: notasGrabadas.slice(),
      duracion: notasGrabadas[notasGrabadas.length - 1].t + 1
    });
    campoNombre.value = "";
    estadoMelodia.textContent = "Guardada: " + nombre;
    pintarMelodias(); guardarPronto(); sumarActividad("melodias");
  }
});

function reproducirMelodia(m, inicio){
  iniciarAudio();
  const t0 = (inicio === undefined) ? ahora() + 0.06 : inicio;
  m.notas.forEach(n => tocarNota(n.s, null, t0 + n.t, n.i, n.o));
}

function pintarMelodias(){
  listaMelodias.innerHTML = "";
  vacioMelodias.style.display = melodias.length ? "none" : "";
  melodias.forEach(m => {
    const li = document.createElement("li");
    if (melodiaEnBucle && melodiaEnBucle.id === m.id) li.classList.add("activa");

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = "<b>" + escapar(m.nombre) + "</b><span>" + m.notas.length +
                     " notas · " + m.duracion.toFixed(1) + " s</span>";

    const acciones = document.createElement("div");
    acciones.className = "acciones";

    const bTocar = document.createElement("button");
    bTocar.className = "boton chico"; bTocar.textContent = "Tocar";
    bTocar.addEventListener("click", () => reproducirMelodia(m));

    const bBucle = document.createElement("button");
    bBucle.className = "boton chico"; bBucle.textContent = "Repetir con el ritmo";
    bBucle.setAttribute("aria-pressed", melodiaEnBucle && melodiaEnBucle.id === m.id ? "true" : "false");
    bBucle.addEventListener("click", () => {
      melodiaEnBucle = (melodiaEnBucle && melodiaEnBucle.id === m.id) ? null : m;
      pintarMelodias();
      avisar(melodiaEnBucle ? "Se repetirá al inicio de cada compás." : "Bucle desactivado.");
    });

    const bBorrar = document.createElement("button");
    bBorrar.className = "boton chico"; bBorrar.textContent = "✕";
    bBorrar.setAttribute("aria-label", "Borrar " + m.nombre);
    bBorrar.addEventListener("click", () => {
      melodias = melodias.filter(x => x.id !== m.id);
      if (melodiaEnBucle && melodiaEnBucle.id === m.id) melodiaEnBucle = null;
      pintarMelodias(); guardarPronto();
    });

    acciones.append(bTocar, bBucle, bBorrar);
    li.append(info, acciones);
    listaMelodias.appendChild(li);
  });
}

const escapar = s => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

/* teclas del ordenador */
const presionadas = new Set();
addEventListener("keydown", e => {
  const enCampo = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
  if (e.code === "Space" && !enCampo){ e.preventDefault(); tocarDetener(); return; }
  if (enCampo) return;
  const k = e.key.toLowerCase();
  if (mapaTeclas[k] && !presionadas.has(k)){
    presionadas.add(k);
    tocarNota(mapaTeclas[k].semitono, mapaTeclas[k].el);
  }
  if (k === "z") cambiarOctava(-1);
  if (k === "x") cambiarOctava(1);
});
addEventListener("keyup", e => presionadas.delete(e.key.toLowerCase()));

/* ============================================================
   8. GRABAR AUDIO Y EXPORTAR A MP3
   ============================================================ */
const btnGrabar = document.getElementById("grabar");
const estadoGrabacion = document.getElementById("estadoGrabacion");
const listaGrabaciones = document.getElementById("listaGrabaciones");
const vacioGrabaciones = document.getElementById("vacioGrabaciones");
let grabandoAudio = false, procesador = null, trozosIzq = [], trozosDer = [], muestrasTotal = 0;
let grabaciones = [];

btnGrabar.addEventListener("click", () => {
  grabandoAudio ? detenerGrabacion() : iniciarGrabacion();
});

function iniciarGrabacion(){
  iniciarAudio();
  trozosIzq = []; trozosDer = []; muestrasTotal = 0;
  procesador = ctx.createScriptProcessor(4096, 2, 2);
  procesador.onaudioprocess = ev => {
    if (!grabandoAudio) return;
    trozosIzq.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
    trozosDer.push(new Float32Array(ev.inputBuffer.getChannelData(ev.inputBuffer.numberOfChannels > 1 ? 1 : 0)));
    muestrasTotal += ev.inputBuffer.length;
  };
  compresor.connect(procesador);
  procesador.connect(mudo);
  grabandoAudio = true;
  btnGrabar.dataset.grabando = "true";
  btnGrabar.textContent = "Detener grabación";
  estadoGrabacion.textContent = "Grabando…";
  if (!sonando) tocarDetener(true);
}

async function detenerGrabacion(){
  grabandoAudio = false;
  btnGrabar.dataset.grabando = "false";
  btnGrabar.textContent = "Grabar audio";
  try { compresor.disconnect(procesador); } catch (e) {}
  try { procesador.disconnect(); } catch (e) {}
  procesador = null;

  if (!muestrasTotal){ estadoGrabacion.textContent = "No se capturó audio."; return; }

  const izq = unir(trozosIzq, muestrasTotal);
  const der = unir(trozosDer, muestrasTotal);
  const sr = ctx.sampleRate;
  const segundos = muestrasTotal / sr;
  trozosIzq = []; trozosDer = [];

  estadoGrabacion.textContent = "Convirtiendo a MP3…";
  btnGrabar.disabled = true;
  let blob, ext = "mp3";
  try {
    blob = await aMP3(izq, der, sr);
  } catch (err){
    blob = aWAV(izq, der, sr);
    ext = "wav";
    avisar("No se pudo cargar el codificador MP3 (¿sin internet?). Se guardó en WAV.");
  }
  btnGrabar.disabled = false;
  estadoGrabacion.textContent = "Listo";

  grabaciones.push({
    id: "g" + Date.now(),
    nombre: "Grabación " + (grabaciones.length + 1),
    url: URL.createObjectURL(blob),
    ext, segundos
  });
  pintarGrabaciones();
  sumarActividad("grabaciones");
}

function unir(trozos, total){
  const salida = new Float32Array(total);
  let off = 0;
  trozos.forEach(t => { salida.set(t, off); off += t.length; });
  return salida;
}

function aInt16(f32){
  const salida = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++){
    const s = Math.max(-1, Math.min(1, f32[i]));
    salida[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return salida;
}

const FUENTES_LAME = [
  "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.0/lame.min.js",
  "https://unpkg.com/lamejs@1.2.1/lame.min.js"
];
function cargarLame(){
  if (window.lamejs) return Promise.resolve();
  return FUENTES_LAME.reduce((cadena, url) => cadena.catch(() => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => window.lamejs ? res() : rej(new Error("sin lamejs"));
    s.onerror = () => rej(new Error("no cargó " + url));
    document.head.appendChild(s);
  })), Promise.reject());
}

async function aMP3(izq, der, sr){
  await cargarLame();
  const enc = new lamejs.Mp3Encoder(2, sr, 128);
  const l = aInt16(izq), r = aInt16(der);
  const bloque = 1152, partes = [];
  for (let i = 0; i < l.length; i += bloque){
    const b = enc.encodeBuffer(l.subarray(i, i + bloque), r.subarray(i, i + bloque));
    if (b.length) partes.push(new Uint8Array(b));
  }
  const fin = enc.flush();
  if (fin.length) partes.push(new Uint8Array(fin));
  return new Blob(partes, { type: "audio/mpeg" });
}

function aWAV(izq, der, sr){
  const n = izq.length;
  const buf = new ArrayBuffer(44 + n * 4);
  const v = new DataView(buf);
  const txt = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  txt(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); txt(8, "WAVE");
  txt(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  txt(36, "data"); v.setUint32(40, n * 4, true);
  let off = 44;
  for (let i = 0; i < n; i++){
    v.setInt16(off, Math.max(-1, Math.min(1, izq[i])) * 0x7FFF, true); off += 2;
    v.setInt16(off, Math.max(-1, Math.min(1, der[i])) * 0x7FFF, true); off += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
}

function pintarGrabaciones(){
  listaGrabaciones.innerHTML = "";
  vacioGrabaciones.style.display = grabaciones.length ? "none" : "";
  grabaciones.forEach(g => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = "<b>" + escapar(g.nombre) + "." + g.ext + "</b><span>" +
                     g.segundos.toFixed(1) + " s</span>";
    const audio = document.createElement("audio");
    audio.controls = true; audio.src = g.url; audio.style.width = "100%"; audio.style.marginTop = "6px";
    info.appendChild(audio);

    const acciones = document.createElement("div");
    acciones.className = "acciones";

    const bDescargar = document.createElement("a");
    bDescargar.className = "boton chico";
    bDescargar.textContent = "Descargar";
    bDescargar.href = g.url;
    bDescargar.download = g.nombre.replace(/\s+/g, "-").toLowerCase() + "." + g.ext;
    bDescargar.style.textDecoration = "none";

    const bBorrar = document.createElement("button");
    bBorrar.className = "boton chico"; bBorrar.textContent = "✕";
    bBorrar.setAttribute("aria-label", "Borrar " + g.nombre);
    bBorrar.addEventListener("click", () => {
      URL.revokeObjectURL(g.url);
      grabaciones = grabaciones.filter(x => x.id !== g.id);
      pintarGrabaciones();
    });

    acciones.append(bDescargar, bBorrar);
    li.append(info, acciones);
    listaGrabaciones.appendChild(li);
  });
}

/* ============================================================
   9. GUARDAR Y ABRIR EL PROYECTO
   ============================================================ */
const CLAVE = "cuaderno-de-ritmo-v1";
const memoria = {};
const almacen = {
  leer(k){ try { return localStorage.getItem(k); } catch (e){ return memoria[k] || null; } },
  escribir(k, v){ try { localStorage.setItem(k, v); } catch (e){ memoria[k] = v; } }
};
const estadoProyecto = document.getElementById("estadoProyecto");
let temporizadorGuardado = null;

function estadoActual(conMuestras){
  return {
    v: 1,
    bpm: +bpm.value,
    swing: +swingCtrl.value,
    volumen: +vol.value,
    octava,
    instrumento: selInstrumento.value,
    pistas: PISTAS.map(p => ({
      id: p.id,
      pasos: p.pasos.map(x => x ? 1 : 0),
      silencio: p.silencio,
      nombreArchivo: p.nombreArchivo,
      datos: conMuestras ? p.datosArchivo : null
    })),
    melodias
  };
}

function guardarPronto(){
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(() => {
    almacen.escribir(CLAVE, JSON.stringify(estadoActual(false)));
    const h = new Date();
    estadoProyecto.textContent = "Guardado a las " +
      h.getHours().toString().padStart(2, "0") + ":" + h.getMinutes().toString().padStart(2, "0") + ".";
  }, 600);
}

async function aplicarEstado(est){
  if (!est) return;
  bpm.value = est.bpm || 100; bpmVal.value = bpm.value;
  swingCtrl.value = est.swing || 0; swingVal.value = swingCtrl.value + "%";
  vol.value = est.volumen === undefined ? 80 : est.volumen; volVal.value = vol.value;
  octava = est.octava || 4;
  document.getElementById("octVal").textContent = "Octava " + octava;
  etiquetarTeclado();
  if (est.instrumento) selInstrumento.value = est.instrumento;

  for (const guardada of (est.pistas || [])){
    const p = PISTAS.find(x => x.id === guardada.id);
    if (!p) continue;
    p.pasos = guardada.pasos.map(x => !!x);
    p.silencio = !!guardada.silencio;
    if (guardada.datos && guardada.nombreArchivo){
      try { await cargarSampleEnPista(p, guardada.nombreArchivo, deBase64(guardada.datos)); } catch (e){}
    }
  }
  melodias = est.melodias || [];
  melodiaEnBucle = null;
  pintarPatron(); pintarMelodias();
}

document.getElementById("descargarProyecto").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(estadoActual(true), null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cuaderno-de-ritmo.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  avisar("Proyecto descargado con tus samples incluidos.");
});

document.getElementById("abrirProyecto").addEventListener("click", () => document.getElementById("fileProyecto").click());
document.getElementById("fileProyecto").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    await aplicarEstado(JSON.parse(await f.text()));
    guardarPronto();
    avisar("Proyecto abierto: " + f.name);
  } catch (err){
    avisar("Ese archivo no parece un proyecto del Cuaderno de Ritmo.");
  }
});

/* ============================================================
   10. VISUALIZADOR
   ============================================================ */
const cOnda = document.getElementById("onda");
const cEsp = document.getElementById("espectro");
const gOnda = cOnda.getContext("2d");
const gEsp = cEsp.getContext("2d");
const barraNivel = document.getElementById("nivel");
let congelado = false;

function ajustarLienzos(){
  [cOnda, cEsp].forEach(c => {
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.floor(r.width * dpr));
    c.height = Math.max(1, Math.floor(r.height * dpr));
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  });
}
addEventListener("resize", ajustarLienzos);

function fondoCuadriculado(g, w, h){
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(23,48,122,.09)"; g.lineWidth = 1;
  for (let x = 0; x < w; x += 14){ g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
  for (let y = 0; y < h; y += 14){ g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
}

function dibujarVisuales(){
  const wO = cOnda.clientWidth, hO = cOnda.clientHeight;
  const wE = cEsp.clientWidth, hE = cEsp.clientHeight;
  fondoCuadriculado(gOnda, wO, hO);
  fondoCuadriculado(gEsp, wE, hE);

  if (!analizador || congelado){
    gOnda.strokeStyle = "rgba(23,48,122,.5)"; gOnda.lineWidth = 2;
    gOnda.beginPath(); gOnda.moveTo(0, hO / 2); gOnda.lineTo(wO, hO / 2); gOnda.stroke();
    return 0;
  }

  analizador.getByteTimeDomainData(datosOnda);
  analizador.getByteFrequencyData(datosFrec);

  gOnda.strokeStyle = "rgba(23,48,122,.25)"; gOnda.lineWidth = 1;
  gOnda.beginPath(); gOnda.moveTo(0, hO / 2); gOnda.lineTo(wO, hO / 2); gOnda.stroke();

  gOnda.lineWidth = 2.2; gOnda.strokeStyle = "#17307A"; gOnda.lineJoin = "round";
  gOnda.beginPath();
  const salto = Math.max(1, Math.floor(datosOnda.length / Math.max(1, wO)));
  const puntos = datosOnda.length / salto;
  let suma = 0;
  for (let i = 0, k = 0; i < datosOnda.length; i += salto, k++){
    const v = (datosOnda[i] - 128) / 128;
    suma += v * v;
    const x = k * (wO / puntos);
    const y = hO / 2 + v * (hO / 2 - 6);
    k === 0 ? gOnda.moveTo(x, y) : gOnda.lineTo(x, y);
  }
  gOnda.stroke();
  const rms = Math.sqrt(suma / puntos);

  const barras = 40;
  const paso = Math.max(1, Math.floor(datosFrec.length / barras / 2.2));
  const ancho = wE / barras;
  const colores = ["#D8412F", "#EE7B33", "#EFB80B", "#0F9E77", "#7B4AE2", "#E8477F"];
  for (let i = 0; i < barras; i++){
    let v = 0;
    for (let j = 0; j < paso; j++) v = Math.max(v, datosFrec[i * paso + j] || 0);
    const alto = (v / 255) * (hE - 8);
    gEsp.fillStyle = colores[i % colores.length];
    gEsp.globalAlpha = .85;
    gEsp.fillRect(i * ancho + 1.5, hE - alto, ancho - 3, alto);
    gEsp.globalAlpha = 1;
    gEsp.strokeStyle = "rgba(23,48,122,.55)"; gEsp.lineWidth = 1;
    gEsp.strokeRect(i * ancho + 1.5, hE - alto, ancho - 3, alto);
  }
  return rms;
}

document.getElementById("cambiarVista").addEventListener("click", e => {
  congelado = !congelado;
  e.currentTarget.setAttribute("aria-pressed", congelado ? "true" : "false");
  e.currentTarget.textContent = congelado ? "Reanudar" : "Congelar";
});

/* ============================================================
   11. AVATAR ROBOT
   ============================================================ */
const svgCuerpo   = document.getElementById("cuerpo");
const gCabeza     = document.getElementById("cabeza");
const gAntena     = document.getElementById("antena");
const bombilla    = document.getElementById("bombilla");
const gBrazoIzq   = document.getElementById("brazoIzq");
const gBrazoDer   = document.getElementById("brazoDer");
const gPiernaIzq  = document.getElementById("piernaIzq");
const gPiernaDer  = document.getElementById("piernaDer");
const gOjos       = document.getElementById("ojos");
const ojoIzq      = document.getElementById("ojoIzq");
const ojoDer      = document.getElementById("ojoDer");
const bocaRobot   = document.getElementById("boca");
const sombra      = document.getElementById("sombra");
const gNotas      = document.getElementById("notas");
const leds        = [document.getElementById("led1"), document.getElementById("led2"), document.getElementById("led3")];
const menosMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

let rebote = 0, giro = 0, energia = 0, proximoParpadeo = 2;

document.getElementById("avatarBtn").addEventListener("click", () => {
  iniciarAudio();
  giro = 1; rebote = 1;
  const t = ahora() + 0.01;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(940, t + 0.14);
  env(g, t, 0.16, 0.005, 0.18);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + 0.35);
});

function animarAvatar(marca, rms){
  energia += (rms - energia) * 0.25;
  const t = marca / 1000;

  const n = ahora();
  for (let i = golpes.length - 1; i >= 0; i--){
    if (golpes[i].tiempo <= n){
      rebote = Math.max(rebote, golpes[i].tipo === "fuerte" ? 1 : golpes[i].tipo === "nota" ? 0.5 : 0.4);
      golpes.splice(i, 1);
    } else if (golpes[i].tiempo < n - 2){
      golpes.splice(i, 1);
    }
  }
  rebote *= 0.88;
  giro *= 0.93;

  const vaiven = menosMovimiento ? 0 : Math.sin(t * 2.2) * (1.6 + energia * 16);
  const salto  = rebote * 12 + energia * 6;
  const anchoGiro = Math.cos(giro * Math.PI * 2);

  /* el cuerpo entero: primero el salto, luego giro y balanceo alrededor de la cintura */
  svgCuerpo.setAttribute("transform",
    "translate(0," + (-salto).toFixed(2) + ") " +
    "translate(150,250) rotate(" + vaiven.toFixed(2) + ") scale(" + anchoGiro.toFixed(3) + ",1) translate(-150,-250)");

  gCabeza.setAttribute("transform",
    "rotate(" + (Math.sin(t * 2.2 + 0.6) * (2 + energia * 10)).toFixed(2) + " 150 150)");
  gAntena.setAttribute("transform",
    "rotate(" + (Math.sin(t * 5.5) * (4 + rebote * 22)).toFixed(2) + " 150 72)");
  gBrazoIzq.setAttribute("transform",
    "rotate(" + (-20 * rebote - Math.sin(t * 2.2) * (6 + energia * 26)).toFixed(2) + " 110 174)");
  gBrazoDer.setAttribute("transform",
    "rotate(" + ( 20 * rebote + Math.sin(t * 2.2) * (6 + energia * 26)).toFixed(2) + " 190 174)");
  gPiernaIzq.setAttribute("transform",
    "rotate(" + ( Math.sin(t * 2.2) * (3 + energia * 14)).toFixed(2) + " 133 248)");
  gPiernaDer.setAttribute("transform",
    "rotate(" + (-Math.sin(t * 2.2) * (3 + energia * 14)).toFixed(2) + " 167 248)");

  /* cara */
  const h = 5 + rebote * 12;
  bocaRobot.setAttribute("height", h.toFixed(1));
  bocaRobot.setAttribute("y", (139 - h / 2).toFixed(1));
  proximoParpadeo -= 1 / 60;
  const parpadeo = proximoParpadeo < 0;
  if (proximoParpadeo < -0.12) proximoParpadeo = 2 + Math.random() * 3;
  const ry = parpadeo ? 1.2 : 8 - rebote * 1.5;
  ojoIzq.setAttribute("ry", ry.toFixed(1));
  ojoDer.setAttribute("ry", ry.toFixed(1));
  gOjos.setAttribute("transform", "translate(" + (Math.sin(t * 1.3) * 3).toFixed(2) + ",0)");
  bombilla.setAttribute("fill", rebote > 0.35 ? "#E8477F" : "#EFB80B");

  /* panel del pecho */
  leds.forEach((led, i) => {
    const alto = 4 + Math.min(1, energia * (3 + i)) * 16 + rebote * 4;
    led.setAttribute("height", alto.toFixed(1));
    led.setAttribute("y", (208 - alto).toFixed(1));
  });

  sombra.setAttribute("rx", (66 - salto * 0.9).toFixed(1));
  sombra.setAttribute("opacity", (0.9 - salto * 0.02).toFixed(2));
  gNotas.setAttribute("opacity", Math.min(1, energia * 6 + rebote * 0.6).toFixed(2));
  gNotas.setAttribute("transform", "translate(0," + (-Math.sin(t * 3) * 6).toFixed(1) + ")");
}

/* ============================================================
   11.b VISITANTES DE LA FERIA
   ============================================================ */
const CLAVE_VISITANTES = "cuaderno-visitantes-v1";
let visitantes = [];
let visitanteActual = null;
let inicioTurno = 0;
let yaAvisadoRegistro = false;

const formaRegistro   = document.getElementById("registroForma");
const activoRegistro  = document.getElementById("registroActivo");
const errorRegistro   = document.getElementById("registroError");
const campoVisNombre  = document.getElementById("visNombre");
const campoVisTel     = document.getElementById("visTel");
const conteoVisitantes= document.getElementById("conteoVisitantes");
const tablaVisitantes = document.getElementById("tablaVisitantes");

campoVisTel.addEventListener("input", () => {
  campoVisTel.value = campoVisTel.value.replace(/\D/g, "").slice(0, 8);
});
[campoVisNombre, campoVisTel].forEach(c => c.addEventListener("keydown", e => {
  if (e.key === "Enter") registrar();
}));
document.getElementById("btnRegistrar").addEventListener("click", registrar);

function telefonoValido(t){
  return /^[67]\d{7}$/.test(t) || /^[2-4]\d{6}$/.test(t);
}

function mostrarError(msg){
  errorRegistro.textContent = msg;
  errorRegistro.hidden = !msg;
}

function registrar(){
  const nombre = campoVisNombre.value.trim();
  const tel = campoVisTel.value.trim();
  if (nombre.length < 3){
    mostrarError("Escribe tu nombre completo para continuar.");
    campoVisNombre.focus();
    return;
  }
  if (!telefonoValido(tel)){
    mostrarError("El celular debe tener 8 dígitos y empezar con 6 o 7. Los fijos llevan 7 dígitos.");
    campoVisTel.focus();
    return;
  }
  mostrarError("");
  visitanteActual = {
    id: "v" + Date.now(),
    nombre,
    telefono: "+591 " + tel,
    fecha: new Date().toISOString(),
    melodias: 0,
    grabaciones: 0,
    minutos: 0
  };
  visitantes.push(visitanteActual);
  inicioTurno = Date.now();
  guardarVisitantes();

  document.getElementById("visActivoNombre").textContent = nombre;
  document.getElementById("visActivoTel").textContent = "· +591 " + tel;
  formaRegistro.hidden = true;
  activoRegistro.hidden = false;
  campoVisNombre.value = ""; campoVisTel.value = "";
  avisar("Listo, " + nombre.split(" ")[0] + ". Todo lo que hagas queda a tu nombre.");
}

document.getElementById("pasarTurno").addEventListener("click", () => {
  cerrarTurno();
  tocarDetener(false);
  melodias = [];
  melodiaEnBucle = null;
  grabaciones.forEach(g => URL.revokeObjectURL(g.url));
  grabaciones = [];
  const pr = PRESETS.cumbia;
  PISTAS.forEach(p => {
    p.pasos.fill(false);
    (pr.datos[p.id] || []).forEach(i => p.pasos[i] = true);
  });
  bpm.value = pr.bpm; bpmVal.value = pr.bpm;
  pintarPatron(); pintarMelodias(); pintarGrabaciones(); guardarPronto();
  formaRegistro.hidden = false;
  activoRegistro.hidden = true;
  campoVisNombre.focus();
  avisar("Turno cerrado. La mesa queda lista para la siguiente persona.");
});

function cerrarTurno(){
  if (!visitanteActual) return;
  visitanteActual.minutos = +(((Date.now() - inicioTurno) / 60000).toFixed(1));
  guardarVisitantes();
  visitanteActual = null;
}

function sumarActividad(campo){
  if (!visitanteActual) return;
  visitanteActual[campo]++;
  visitanteActual.minutos = +(((Date.now() - inicioTurno) / 60000).toFixed(1));
  guardarVisitantes();
}

function guardarVisitantes(){
  almacen.escribir(CLAVE_VISITANTES, JSON.stringify(visitantes));
  pintarVisitantes();
}

function cargarVisitantes(){
  try { visitantes = JSON.parse(almacen.leer(CLAVE_VISITANTES) || "[]"); }
  catch (e){ visitantes = []; }
  pintarVisitantes();
}

function pintarVisitantes(){
  conteoVisitantes.textContent = visitantes.length + (visitantes.length === 1 ? " registro" : " registros");
  if (tablaVisitantes.hidden) return;
  if (!visitantes.length){
    tablaVisitantes.innerHTML = '<p class="vacio">Nadie se ha registrado todavía.</p>';
    return;
  }
  let html = "<table class='tabla'><thead><tr><th>#</th><th>Nombre</th><th>Celular</th><th>Fecha</th><th>Mel.</th><th>Grab.</th><th>Min.</th></tr></thead><tbody>";
  visitantes.forEach((v, i) => {
    const f = new Date(v.fecha);
    html += "<tr><td>" + (i + 1) + "</td><td>" + escapar(v.nombre) + "</td><td>" + escapar(v.telefono) +
            "</td><td>" + f.toLocaleDateString("es-BO") + " " + f.toLocaleTimeString("es-BO", {hour:"2-digit", minute:"2-digit"}) +
            "</td><td>" + v.melodias + "</td><td>" + v.grabaciones + "</td><td>" + v.minutos + "</td></tr>";
  });
  tablaVisitantes.innerHTML = html + "</tbody></table>";
}

document.getElementById("verRegistros").addEventListener("click", e => {
  tablaVisitantes.hidden = !tablaVisitantes.hidden;
  e.currentTarget.setAttribute("aria-pressed", tablaVisitantes.hidden ? "false" : "true");
  e.currentTarget.textContent = tablaVisitantes.hidden ? "Ver lista" : "Ocultar lista";
  pintarVisitantes();
});

function descargar(blob, nombre){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const fechaArchivo = () => new Date().toISOString().slice(0, 10);

document.getElementById("descargarCSV").addEventListener("click", () => {
  cerrarTurnoSuave();
  if (!visitantes.length){ avisar("Todavía no hay registros que descargar."); return; }
  const celda = v => '"' + String(v).replace(/"/g, '""') + '"';
  const filas = [["N","Nombre","Celular","Fecha","Hora","Melodias","Grabaciones","Minutos"]];
  visitantes.forEach((v, i) => {
    const f = new Date(v.fecha);
    filas.push([i + 1, v.nombre, v.telefono, f.toLocaleDateString("es-BO"),
                f.toLocaleTimeString("es-BO"), v.melodias, v.grabaciones, v.minutos]);
  });
  const csv = "\uFEFF" + filas.map(f => f.map(celda).join(";")).join("\r\n");
  descargar(new Blob([csv], { type: "text/csv;charset=utf-8" }), "visitantes-feria-" + fechaArchivo() + ".csv");
  avisar("CSV descargado. Se abre directo en Excel.");
});

document.getElementById("descargarJSON").addEventListener("click", () => {
  cerrarTurnoSuave();
  if (!visitantes.length){ avisar("Todavía no hay registros que descargar."); return; }
  descargar(new Blob([JSON.stringify(visitantes, null, 1)], { type: "application/json" }),
            "visitantes-feria-" + fechaArchivo() + ".json");
});

function cerrarTurnoSuave(){
  if (visitanteActual) visitanteActual.minutos = +(((Date.now() - inicioTurno) / 60000).toFixed(1));
  almacen.escribir(CLAVE_VISITANTES, JSON.stringify(visitantes));
}

const btnBorrarVisitantes = document.getElementById("borrarVisitantes");
let confirmandoBorrado = false;
btnBorrarVisitantes.addEventListener("click", () => {
  if (!confirmandoBorrado){
    confirmandoBorrado = true;
    btnBorrarVisitantes.textContent = "¿Seguro? Pulsa otra vez";
    setTimeout(() => {
      confirmandoBorrado = false;
      btnBorrarVisitantes.textContent = "Borrar lista";
    }, 4000);
    return;
  }
  visitantes = [];
  visitanteActual = null;
  confirmandoBorrado = false;
  btnBorrarVisitantes.textContent = "Borrar lista";
  guardarVisitantes();
  avisar("Lista de visitantes borrada. No se puede deshacer.");
});

addEventListener("beforeunload", cerrarTurnoSuave);

/* ============================================================
   12. BUCLE Y ARRANQUE
   ============================================================ */
const btnTocar = document.getElementById("tocar");
const bpm = document.getElementById("bpm");
const bpmVal = document.getElementById("bpmVal");
const swingCtrl = document.getElementById("swing");
const swingVal = document.getElementById("swingVal");
const vol = document.getElementById("vol");
const volVal = document.getElementById("volVal");
const aviso = document.getElementById("aviso");
let temporizadorAviso = null;

function avisar(txt){
  aviso.textContent = txt;
  aviso.classList.add("ver");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("ver"), 2800);
}

btnTocar.addEventListener("click", () => {
  if (!visitanteActual && !yaAvisadoRegistro){
    yaAvisadoRegistro = true;
    avisar("Puedes tocar sin registrarte, pero si dejas tu nombre guardamos lo que hagas.");
  }
  tocarDetener();
});
bpm.addEventListener("input", () => { bpmVal.value = bpm.value; guardarPronto(); });
swingCtrl.addEventListener("input", () => { swingVal.value = swingCtrl.value + "%"; guardarPronto(); });
vol.addEventListener("input", () => {
  volVal.value = vol.value;
  if (master) master.gain.setTargetAtTime((+vol.value) / 100, ahora(), 0.02);
  guardarPronto();
});

function bucle(marca){
  requestAnimationFrame(bucle);
  const n = ahora();
  while (cola.length && cola[0].tiempo <= n){
    const ev = cola.shift();
    document.querySelectorAll(".paso.tocando").forEach(e => e.classList.remove("tocando"));
    document.querySelectorAll('.paso[data-paso="' + ev.paso + '"]').forEach(e => e.classList.add("tocando"));
  }
  const rms = dibujarVisuales();
  barraNivel.style.right = Math.max(0, 100 - Math.min(100, rms * 260)) + "%";
  animarAvatar(marca, rms);
}

construirTeclado();
ajustarLienzos();

(function arranque(){
  cargarVisitantes();
  const guardado = almacen.leer(CLAVE);
  if (guardado){
    try {
      aplicarEstado(JSON.parse(guardado));
      estadoProyecto.textContent = "Se recuperó tu último proyecto.";
      pintarGrabaciones();
      requestAnimationFrame(bucle);
      return;
    } catch (e){}
  }
  const pr = PRESETS.cumbia;
  PISTAS.forEach(p => (pr.datos[p.id] || []).forEach(i => p.pasos[i] = true));
  bpm.value = pr.bpm; bpmVal.value = pr.bpm;
  pintarPatron(); pintarMelodias(); pintarGrabaciones();
  requestAnimationFrame(bucle);
})();

})();
