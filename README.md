# SuperTirititran · 20 Aniversario

Juego de disparos 2D ambientado en Cádiz, reconstruido para la web con Phaser, TypeScript y Vite. Incluye tres fases, presentaciones originales, Intercom, cuatro poderes y jefes finales. Los recursos específicos de cada fase se descargan al seleccionarla y se reutilizan durante la sesión.

## Desarrollo

Requiere Node.js 22.18 o posterior.

```sh
npm ci
npm run dev
```

Vite muestra la dirección local. Los recursos web se preparan automáticamente a partir de `assets/`, sin modificar los originales.

```sh
npm run build       # Versión publicable en dist/
npm run preview     # Comprueba la versión compilada
npm test            # Pruebas de lógica y recursos
```

Las pruebas de navegador requieren Chrome instalado y el servidor de desarrollo activo:

```sh
npm run test:browser
npm run test:intros
npm run test:phase-loading
```

## Publicación

La compilación produce una web estática compatible con GitHub Pages. `vite.config.ts` utiliza rutas relativas para que funcione también en la subcarpeta del repositorio. Para comprobar la compilación estática, ejecutar `npm run preview` y, en otra terminal, `npm run test:pages`. Se puede indicar otra dirección con `TEST_URL`, incluida una subcarpeta. La publicación y su automatización se configurarán cuando exista el nuevo repositorio. No hay cuentas de alojamiento, credenciales, servicios de medición ni servidor de partidas configurados.

## Controles

- Cursores o WASD: volar.
- Control o Z: disparar; disparo automático configurable.
- 1–4, Mayúsculas o C: seleccionar poder.
- Alt o X: usar el poder.
- Espacio: Intercom; Enter también avanza conversaciones.
- P o Escape: pausa.
- Móvil: horizontal, joystick a la izquierda y poderes a la derecha.
- Mando: stick izquierdo, A disparo, B poder, X Intercom, Y selección y Start pausa.

Preferencias, récord y última fase seleccionada se guardan únicamente en el navegador mediante `localStorage`. La portada se recuerda durante la sesión de la pestaña. El vídeo homenaje se abre en YouTube solo al pulsar su enlace.

## Estructura

- `src/`: juego e interfaz.
- `src/game/original/`: adaptación de calendarios y reglas del juego original; los campos `source` de los datos indican su procedencia histórica.
- `assets/`: imágenes, audios, mapas y guiones originales necesarios para preparar la versión web.
- `scripts/prepare-assets.mjs`: atlas por fase, mapas segmentados y conversión de presentaciones.
- `public/fonts/`: tipografías locales y su licencia.
- `tests/`: pruebas de lógica, campaña, presentaciones y carga por fases.

`public/assets/`, `public/generated/`, `dist/`, dependencias y resultados de pruebas se generan localmente y están excluidos de Git. Esta copia no incluye el historial, el C++ de referencia ni los informes internos de reconstrucción.

## Créditos y licencias

Programación original: Fco. Javier Pérez Pacheco. Gráficos: Jesús Carrasco Carrasco. Música: Shano Lores.

Se conserva en `LICENSE-ORIGINAL.txt` el texto de licencia distribuido con el juego original: Creative Commons Reconocimiento-NoComercial-CompartirIgual 2.0. Esta copia es una adaptación web; se conservan las autorías y no se añade una licencia permisiva distinta a los recursos originales. Las fuentes Barlow y Barlow Condensed incluyen su licencia SIL Open Font License en `public/fonts/OFL.txt`.
