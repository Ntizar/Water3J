# Teoría del oleaje — Water3J

Fundamentos físicos necesarios para la simulación. Fuente principal: Coastal Wiki (Shallow-water wave theory), GPU Gems 1 Cap. 1, y la literatura estándar de ingeniería costera.

## 1. Teoría de Airy (olas lineales de pequeña amplitud)

La descripción matemática más básica de una ola progresiva periódica (Airy, 1845).

### Ecuación de dispersión

La relación entre longitud de onda L, periodo T y profundidad h:

```
ω² = g·k·tanh(k·h)
```

donde:
- `ω = 2π/T` — frecuencia angular
- `k = 2π/L` — número de onda
- `g = 9.81 m/s²` — gravedad
- `h` — profundidad local

### Régimen de aguas profundas (h > L/2)

```
tanh(k·h) → 1  →  ω² = g·k  →  c = √(g·L / 2π)
```

La velocidad de fase `c` depende de la longitud de onda: **olas largas viajan más rápido** (dispersión). Esto es clave para que el océano simulado se vea natural.

### Régimen de aguas someras (h < L/20)

```
tanh(k·h) → k·h  →  c = √(g·h)
```

La velocidad depende solo de la profundidad: todas las olas viajan igual (no hay dispersión). Esto es lo que hace que las olas "se pare" frente a la costa.

### Régimen intermedio

Resolver numéricamente `ω² = g·k·tanh(k·h)` (Newton-Raphson sobre k). Es imprescindible para refracción realista con batimetría.

### Elevación de superficie (Airy)

```
η(x,t) = (H/2)·cos(k·x - ω·t)
```

Campo de velocidades potencial, presión dinámica, trayectorias orbitales (circulares en profundidad, elípticas en someras). Las órbitas cerradas son las que hacen flotar objetos con bob suave.

## 2. Olas de Gerstner (trochoidales)

Mejor aproximación para olas de amplitud finita con crestas puntiagudas. Es el estándar de la industria de videojuegos/visualización.

### Formulación (por componente)

Cada componente wave_i es un vector `(d.x, d.y, steepness, wavelength)`:

```glsl
// Shader de referencia (Sean-Bradley, rama gerstner-waves)
vec3 GerstnerWave(vec4 wave, vec3 p) {
    float steepness = wave.z;
    float wavelength = wave.w;
    float k = 2.0 * PI / wavelength;
    float c = sqrt(9.8 / k);          // dispersión aguas profundas
    vec2 d = normalize(wave.xy);      // dirección de propagación
    float f = k * (dot(d, p.xz) - c * time);
    float a = steepness / k;          // amplitud
    return vec3(
        d.x * (a * cos(f)),           // desplazamiento horizontal
        d.y * (a * cos(f)),
        a * sin(f)                    // desplazamiento vertical
    );
}
```

### Características
- Las partículas de agua se mueven en **círculos** (no solo verticalmente) → crestas afiladas, valles planos
- Superponer 3-50 componentes con direcciones/longitudes distintas da mar realista
- `steepness` total sumado no debe superar ~1 para evitar auto-intersección (loops)
- Desventaja: no es exactamente conservativa en energía ni masivamente exacta, pero visualmente imbatible por coste

### Cuándo usar Gerstner vs Airy vs SWE

| Escenario | Modelo recomendado |
|---|---|
| Mar abierto, swell, visual | Gerstner espectral |
| Bajíos, rompiente, run-up | SWE (aguas someras) |
| Difracción en diques, puertos | Mild-Slope / ray model |
| Flotabilidad de objetos | Muestreo de la superficie resultante |

## 3. Espectros de olas (mar real)

Un mar real es la superposición de cientos de componentes con energías distribuidas según un espectro.

### Pierson-Moskowitz (mar totalmente desarrollado)

```
S(ω) = α·g²/ω⁵ · exp(-β·(ω₀/ω)⁴)
α = 0.0081,  β = 0.74,  ω₀ = g/U₁₉.₅
```

### JONSWAP (mar en desarrollo, fetch limitado)

```
S(ω) = S_PM(ω) · γ^exp(-0.5·((ω-ω₀)/(σ·ω₀))²)
γ ≈ 3.3 (pico más agudo que PM)
```

### Implementación práctica

1. Elegir espectro, velocidad de viento y fetch
2. Discretizar en N bandas de frecuencia (log-spaced) y M direcciones
3. Para cada banda: amplitud `a_i = √(2·S(ω_i)·Δω_i·Δθ)`, fase aleatoria
4. Sumar como Gerstner o sinúsoides → campo de olas
5. `Hs` (altura significativa) y `Tp` (periodo de pico) derivan del espectro

Referencia: librería Python `wavespectra` para generar/validar espectros.

## 4. Ecuaciones de aguas someras (SWE)

Modelo 2D en profundidad integrada. Descripción del flujo sobre batimetría (inundación, corrientes, run-up), no de olas orbitales.

```
∂η/∂t + ∇·((h+η)·u) = 0                        (continuidad)
∂u/∂t + (u·∇)u = -g·∇η + ν∇²u - fricción       (momento)
```

### Métodos de resolución en GPU

| Método | Características |
|---|---|
| **Virtual pipes** (lisyarus) | 4 buffers: fondo, columna, flujo X, flujo Y. Estable, fácil en GLSL |
| Lax-Friedrichs | Simple, difusivo. NekomiyaKasane |
| Semi-lagrangiano | WebFlood. Permite dt grandes |

### Uso en Water3J

- Para playas: solver SWE sobre batimetría con olas entrantes como frontera → reproduce shoaling, rompiente y run-up de forma física
- Para puertos: agitación interior (wave agitation) con fronteras absorbentes

## 5. Flotabilidad

Para objetos flotantes:
1. Muestrear altura de superficie en la posición del objeto (misma fórmula en CPU que en GPU, o lectura de render target)
2. Fuerza de Arquímedes proporcional a volumen sumergido
3. Alinear el objeto con la **normal local de la ola** (gradiente de la superficie)
4. Añadir deriva por pendiente (Stokes drift) y amortiguación

Referencia de implementación: WaterThreeJS (bodies ligeros) y Tidewater (CPU mirror del campo de olas).

## 6. Rompiente

Criterio práctico: la ola rompe cuando `H/h > 0.78` (índice de McCowan) o cuando la pendiente frontal supera un umbral. Tipos:
- **Spilling**: crestas blancas progresivas (pendientes suaves)
- **Plunging**: tubo que colapsa (pendientes medias)
- **Surging**: apenas rompe, sube la pared (playas steep)

En implementación: detectar rotura en el solver SWE (gradiente de altura > umbral) y activar partículas de espuma/shader de crestas.
