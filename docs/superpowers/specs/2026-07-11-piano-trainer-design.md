# Diseño: Piano — entrenador de canciones en el navegador

**Fecha:** 2026-07-11
**Estado:** Aprobado por el usuario

## Contexto y objetivo

Aplicación web gratuita para aprender a tocar piano paso a paso, practicando canciones que el usuario puede añadir él mismo como archivos MIDI (`.mid`).

- **Usuario:** una persona, nivel básico (conoce notas, no lee partitura con fluidez, no domina las dos manos).
- **Instrumento:** Casio Privia PX-100 (puertos MIDI IN/OUT de 5 pines; requiere cable adaptador MIDI-a-USB, ~15-25 €).
- **Dispositivo principal: iPhone**, apoyado en el atril del piano, conectado así: piano → cable MIDI-USB → adaptador USB(-A) a USB-C (o Lightning en iPhones antiguos) → iPhone. Como Safari/Chrome en iOS no soportan Web MIDI, en el iPhone la app se abre dentro de **"Web MIDI Browser"** (app gratuita de la App Store que sí lo soporta). En un ordenador con Chrome/Edge funciona directamente.
- **Distribución:** la app se publica como web estática en una URL gratuita (GitHub Pages) para poder abrirla desde el móvil. En desarrollo se prueba en red local (`npm run dev -- --host`).
- **Coste:** cero. Sin servidor, sin cuentas, sin suscripciones. Todo corre y se guarda en el navegador del usuario.

### Decisiones tomadas durante el brainstorming

| Decisión | Elección |
|---|---|
| Detección de notas | Teclado MIDI vía Web MIDI API (no micrófono) |
| Visualización | Notas que caen + partitura sincronizada, ambas a la vez |
| Alcance | Entrenador de canciones + ejercicios básicos de calentamiento (no curso completo de teoría) |
| Plataforma | Webapp propia desde cero (no fork de Sightread/Midiano, no app de escritorio) |
| Dispositivo | iPhone como dispositivo principal (vía Web MIDI Browser); interfaz responsive pensada para móvil en horizontal, usable también en ordenador |

### Referencias de la auditoría de apps existentes

- Comerciales (Simply Piano, Flowkey, Skoove, Yousician): curso estructurado, detección por micrófono, suscripción de pago.
- Gratuitas/open source (Midiano, Sightread, PianoBooster, midee): patrón "notas que caen" + archivos MIDI + modo espera. **Este es el patrón que adoptamos**, porque hace trivial añadir canciones propias (hay miles de `.mid` gratuitos en internet).

## Arquitectura

- **Stack:** Vite + TypeScript + React. Aplicación estática: se ejecuta con `npm run dev` en desarrollo o como build estático abierto en Chrome.
- **Entrada MIDI:** Web MIDI API. Detección automática del dispositivo al conectarlo. Fallback sin piano: teclado del ordenador y clic sobre el teclado en pantalla.
- **Audio:** piano sampleado gratuito (soundfont) vía Web Audio API para las partes que reproduce la app (demo, mano acompañante). Cuando el usuario toca, suena su propio PX-100.
- **Partitura:** generada automáticamente desde el MIDI (notación simplificada: notas, compases, dos pentagramas). No pretende igualar una partitura de editorial.
- **Persistencia:** IndexedDB en el navegador — biblioteca de canciones (los `.mid` importados) y progreso/puntuaciones. Nada sale del ordenador del usuario.

## Pantallas y componentes

### 1. Biblioteca
- Lista de canciones con nombre, duración, dificultad estimada automáticamente y mejor puntuación.
- Añadir canción: arrastrar un `.mid` a la ventana (o botón de selección de archivo).
- Canciones incluidas de fábrica: una selección libre de derechos (clásica y ejercicios) para empezar sin buscar nada.
- Eliminar canciones importadas.

### 2. Práctica (pantalla principal)
Disposición vertical: partitura sincronizada arriba, cascada de notas en el centro, teclado de 88 teclas abajo que se ilumina con las teclas pulsadas.

- **Colores por mano:** azul mano derecha, verde mano izquierda (según pistas/canales del MIDI, con posibilidad de reasignar si el archivo viene mal etiquetado).
- **Modo espera:** la reproducción se detiene hasta que el usuario pulsa la(s) nota(s) correcta(s). Es el modo de aprendizaje principal.
- **Manos separadas:** practicar solo derecha, solo izquierda o ambas; la app reproduce la mano no practicada.
- **Velocidad:** 25%–100% del tempo original.
- **Repetir sección:** bucle entre compás X y compás Y.
- **Puntuación:** al terminar, % de notas correctas; se guarda como historial por canción.

### 3. Calentamiento
- Ejercicios generados automáticamente (no archivos): escalas mayores/menores y acordes básicos en la tonalidad elegida.
- Usan el mismo motor visual de práctica (notas cayendo + modo espera).

## Flujo de datos

1. El usuario importa un `.mid` → se parsea (cabecera, pistas, eventos de nota, tempo) → se guarda en IndexedDB junto a metadatos (nombre, duración, dificultad estimada).
2. Al abrir una canción → el motor de práctica construye la línea de tiempo de notas por mano → renderiza cascada + partitura + teclado.
3. Eventos MIDI del piano → se comparan con las notas esperadas en la ventana de tiempo actual → feedback visual inmediato (tecla verde = correcta, roja = incorrecta) → alimenta la puntuación y el modo espera.
4. Al terminar → puntuación calculada y persistida → visible en la Biblioteca.

## Manejo de errores

- **Navegador sin Web MIDI** (Firefox, Safari): aviso claro al arrancar recomendando Chrome/Edge; la app sigue usable con teclado de ordenador y ratón.
- **`.mid` corrupto o sin notas:** mensaje de error comprensible en la importación; nunca un cuelgue ni una canción rota en la biblioteca.
- **Desconexión del MIDI en plena práctica:** pausa automática y aviso; al reconectar se puede continuar.
- **MIDI sin separación de manos** (una sola pista): se practica como una sola voz y se informa al usuario; opción de reasignar manos manualmente por rango de notas.

## Pruebas

- Unitarias para el parser MIDI, la estimación de dificultad, la lógica del modo espera y la puntuación (son lógica pura, fáciles de testear).
- Pruebas de integración del motor de práctica con archivos MIDI de ejemplo.
- Prueba manual del flujo completo con el PX-100 real (Web MIDI no se puede automatizar de forma realista).

## Fases de construcción

- **Fase 1 (MVP):** núcleo practicable — importar MIDI, notas cayendo, teclado en pantalla (táctil), entrada MIDI, modo espera, manos separadas, velocidad, puntuación, biblioteca con persistencia y canciones incluidas. Interfaz responsive para móvil en horizontal.
- **Fase 2:** partitura sincronizada, ejercicios de calentamiento, repetir sección, despliegue en GitHub Pages y PWA (instalable/offline).

## Fuera de alcance (versión 1)

- Curso de teoría musical / itinerario de lecciones.
- Detección de notas por micrófono.
- App nativa de iOS/Android (la vía móvil es la web + Web MIDI Browser).
- Cuentas de usuario y sincronización en la nube.
- Compartir canciones online.

Cualquiera de estos puede añadirse en versiones posteriores.
