# Murmuria

Murmuria es un prototipo jugable de simulacion y gestion 2D construido con Vue 3, Vite y Phaser 3.
La aplicacion corre enteramente en cliente: genera un mundo procedural, simula peones y recursos, y
sincroniza el estado con el canvas de Phaser en cada tick.

## Estado actual

- Pantalla unica a viewport completo montada desde `App.vue`.
- Mundo procedural con isla, agua, zonas elevadas, castillo, arboles, oro y ovejas.
- Simulacion basada en estado compartido en Pinia.
- Peones con pathfinding, seleccion de objetivo por deseos del reino, recoleccion y entrega de recursos.
- Ovejas con movimiento autonomo.
- HUD de recursos del reino.
- Camara con pan por teclado, zoom por rueda y ajuste al resize.
- `vue-router` e `vue-i18n` estan inicializados como base, pero la experiencia actual no usa navegacion por vistas.
- No hay backend, persistencia ni suite de tests configurada en `package.json`.

## Arquitectura

La base del proyecto se organiza por capas:

```txt
src/
  components/             # Shell de la aplicacion y overlays de UI
  stores/worldStore.js    # Estado global compartido de mundo, reino, unidades y recursos
  game/
    config/               # Constantes, variantes de recursos y parametros de simulacion
    core/                 # Generacion del mundo, pathfinding y utilidades de grilla
    domain/factories/     # Factories de castillo, peones, arboles, oro y ovejas
    simulation/           # Motor de simulacion y systems por tick
    rendering/            # Controladores de sprites y resolucion de animaciones
    phaser/               # Bootstrap de Phaser, escena principal y renderers
  i18n/                   # Vue I18n con locales `es` y `en`
  router/                 # Router base
```

### Flujo principal

1. `GameCanvas` crea el mundo si el store aun esta vacio.
2. `createPhaserGame` monta `GameScene` dentro del contenedor del canvas.
3. `SimulationEngine` ejecuta los systems cada `500ms`.
4. Los systems escriben en `worldStore`.
5. Phaser lee ese estado y actualiza terreno, edificios, recursos y peones.

### Piezas clave

- `src/game/core/createWorld.js`: genera la isla, ubica el castillo y spawnea unidades y recursos iniciales.
- `src/game/simulation/SimulationEngine.js`: coordina el loop de simulacion.
- `src/game/simulation/systems/DecisionSystem.js`: decide intents de las unidades segun sus perfiles y las necesidades del reino.
- `src/game/simulation/systems/MovementSystem.js`: resuelve rutas y movimiento de peones.
- `src/game/simulation/systems/UnitStateSystem.js`: maneja transiciones con delay por tick.
- `src/game/simulation/systems/VillagerWorkSystem.js`: procesa recoleccion, capacidad de carga y entrega.
- `src/game/simulation/systems/SheepMovementSystem.js`: mueve ovejas de forma autonoma.
- `src/game/phaser/GameScene.js`: gestiona carga de assets, camara, animaciones y sincronizacion visual.
- `src/game/rendering/UnitSpriteController.js`: interpola posicion de unidades y resuelve animaciones/facing.
- `src/components/HudPanel.vue`: muestra madera, oro y carne del reino.

## Tecnologias

- Vue 3
- Vite 6
- Pinia
- Phaser 3
- Vue Router
- Vue I18n
- Tailwind CSS 4

## Requisitos

- Node.js
- Yarn

## Desarrollo

```bash
yarn install
yarn dev
```

## Build

```bash
yarn build
yarn preview
```

## Estructura de datos

El estado global vive en `worldStore` y expone:

- `seed`: semilla del mundo actual.
- `tick`: contador de simulacion.
- `kingdom`: recursos y deseos del reino.
- `world`: dimensiones y tiles del mapa.
- `units`: peones.
- `resources`: arboles, oro y ovejas.
- `buildings`: castillos.

## Notas

- Los assets estan en `public/assets` y se cargan con rutas absolutas desde Phaser.
- `DEBUG_MODE` esta desactivado por defecto en `src/game/config/constants.js`.
- `src/views/HomeView.vue` y `src/router/index.js` existen como base, pero hoy no forman parte del flujo visible principal.
