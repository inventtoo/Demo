# The Cat's Journey 🐱

Videojuego 2D de plataformas hecho **solo con HTML5, CSS3 y JavaScript puro**
(Canvas API + Web Audio API). Sin frameworks, sin motores y sin recursos externos.

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
├── index.html          Estructura: canvas, HUD, menús, diálogos y controles táctiles
├── css/style.css       Estilos de la interfaz, botones, paneles y animaciones CSS
├── js/
│   ├── audio.js        Música y efectos generados con Web Audio API
│   ├── physics.js      Constantes, colisiones AABB, gravedad y partículas
│   ├── camera.js       Cámara con scroll suave, límites, bloqueo y temblor
│   ├── collectibles.js Monedas, corazones, estrellas, llaves (+ dibujos reutilizables)
│   ├── enemies.js      Slime, seta, murciélago, jabalí, caballero, fantasma y jefe final
│   ├── player.js       Milo: controles, física, salud, animaciones y proyectil
│   ├── levels.js       Mapas de texto de los niveles, temas visuales, plataformas e historia
│   ├── ui.js           Pantallas, HUD, diálogos, escenas de historia y configuración
│   └── main.js         Entrada (teclado/táctil), estados del juego y bucle principal
└── assets/
    ├── images/         (opcional, el juego no necesita imágenes)
    └── audio/          (opcional, el juego no necesita archivos de audio)
```

Los scripts se cargan en ese orden desde `index.html` (sin módulos ES, para
que funcione al abrir el archivo directamente).

## Cómo modificar o crear niveles

Cada nivel de `js/levels.js` es un **mapa de texto** donde cada carácter es
una casilla de 40×40 píxeles. La leyenda completa está al principio del
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
