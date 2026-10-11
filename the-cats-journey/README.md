# The Cat's Journey 🐱

Videojuego 2D de plataformas hecho **solo con HTML5, CSS3 y JavaScript puro**
(Canvas API + Web Audio API). Sin frameworks, sin motores y sin recursos externos.

Gráficos en **pixel art de estilo 32 bits** (sombreado con rampas de color,
tramado/dithering, contornos selectivos y parallax de varias capas),
dibujado a **640×360** y mostrado a **1280×720 (720p)** con cada píxel
ampliado x2 sin suavizado.

Milo, un pequeño gato naranja, debe atravesar el **Bosque Encantado**, las
**Montañas Peligrosas** y el **Castillo del Rey Rata** para rescatar a Luna,
su novia, secuestrada por el malvado villano.

## Cómo jugar

1. Descarga o clona esta carpeta.
2. Abre `index.html` con doble clic en cualquier navegador moderno
   (Chrome, Firefox, Edge o Safari). No hace falta servidor ni instalación.
3. Pulsa **Comenzar partida** (o `Enter`).

> Consejo: si tu navegador bloquea algo al abrir archivos locales, puedes usar
> un servidor sencillo: `python3 -m http.server` dentro de esta carpeta y abrir
> `http://localhost:8000`.

### Controles

| Tecla | Acción |
|-------|--------|
| `←` / `A` | Moverse a la izquierda |
| `→` / `D` | Moverse a la derecha |
| `Shift` (mantener) | Correr |
| `Espacio` / `W` / `↑` | Saltar (mantén para saltar más alto) |
| `X` | Lanzar bola de energía (con tiempo de recarga) |
| `ESC` | Pausar |
| `R` | Reiniciar el nivel |

En móviles y tabletas aparecen botones táctiles (se pueden forzar o
ocultar en **Configuración**).

### Atajo para pruebas

`index.html?nivel=2` (o `3`) empieza directamente en ese nivel.

## Estructura del proyecto

```
the-cats-journey/
├── index.html          Estructura: canvas de 1280x720, menús y controles táctiles
├── css/style.css       Menús con estilo pixel art + fuente de píxeles "CatPixel" incrustada
├── js/
│   ├── audio.js        Música y efectos generados con Web Audio API
│   ├── physics.js      Constantes (resolución, casillas, gravedad), colisiones AABB y partículas
│   ├── pixelart.js     Herramientas de pixel art: PixelBuffer, sprites, tramado y la fuente de píxeles
│   ├── sprites.js      Pixel art de Milo, Luna, enemigos, Rey Rata, objetos e iconos
│   ├── scenery.js      Pixel art de los escenarios: fondos parallax, casillas, plataformas, trampas y decoración
│   ├── camera.js       Cámara con scroll suave, límites, bloqueo y temblor
│   ├── collectibles.js Monedas, corazones, estrellas y llaves
│   ├── enemies.js      Slime, seta, murciélago, jabalí, caballero, fantasma y jefe final
│   ├── player.js       Milo: controles, física, salud, animaciones y proyectil
│   ├── levels.js       Mapas de texto de los niveles, elementos del escenario e historia
│   ├── ui.js           Pantallas, HUD, diálogos con retratos y escenas de historia
│   └── main.js         Entrada (teclado/táctil), estados del juego y bucle principal
└── assets/
    ├── images/         (opcional, el juego no necesita imágenes)
    └── audio/          (opcional, el juego no necesita archivos de audio)
```

Los scripts se cargan en ese orden desde `index.html` (sin módulos ES, para
que funcione al abrir el archivo directamente).

## Cómo funciona el pixel art

- Todo el juego se pinta en un lienzo de **640×360 píxeles** y después se
  amplía x2 al canvas visible de **1280×720** con el suavizado desactivado
  (`imageSmoothingEnabled = false` e `image-rendering: pixelated`).
- **Personajes** (`js/sprites.js`): están dibujados a mano como rejillas de
  texto, donde cada carácter es un píxel y una paleta le da color. Los gatos
  se montan por piezas (cabeza, cuerpo, patas y cola), así una sola cabeza
  sirve para todas las animaciones. Luna usa el mismo dibujo que Milo con
  otra paleta y un lazo.
- **Escenarios** (`js/scenery.js`): se generan píxel a píxel por código. Los
  cielos usan bandas de color con tramado, las montañas tienen laderas
  iluminadas y nieve, y las casillas de suelo cambian sus bordes según sus
  vecinas (césped, nieve o almenas).
- **Texto**: la fuente de píxeles (con tildes, ñ, ¡ y ¿) se define en
  `js/pixelart.js` y se usa tanto en el canvas como en los menús HTML.

Para cambiar el aspecto de un personaje basta con editar su rejilla o su
paleta en `js/sprites.js`.

## Cómo modificar o crear niveles

Cada nivel de `js/levels.js` es un **mapa de texto** donde cada carácter es
una casilla de 24×24 píxeles (15 filas de alto). La leyenda completa está al principio del
archivo. Por ejemplo, `#` es suelo, `=` una plataforma, `o` una moneda,
`s` un slime y `F` la meta. Basta con editar el texto para cambiar el nivel.

## Características

- 3 niveles con ambientación y dificultad progresiva + combate final.
- Plataformas estáticas, elevadas, móviles (horizontales y verticales),
  que se derrumban y zonas secretas.
- Enemigos que patrullan, persiguen, embisten y resisten varios golpes.
- Jefe final con barra de vida, 3 patrones de ataque, segunda fase y
  momentos de vulnerabilidad.
- Monedas (50 = vida extra), corazones, 9 estrellas secretas y llaves.
- Puntos de control, vidas, salud, pausa, derrota y victoria con estadísticas.
- Historia con escenas animadas entre niveles y final con el rescate.
- Bucle con `requestAnimationFrame` y movimiento basado en el tiempo
  transcurrido (misma velocidad a cualquier FPS).
- Se adapta a cualquier tamaño de pantalla y admite controles táctiles.
