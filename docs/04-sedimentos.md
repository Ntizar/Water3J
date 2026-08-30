# Transporte de sedimentos y morfodinámica — Water3J

Cómo se mueve la arena bajo el oleaje y cómo evoluciona el fondo marino y la playa. Fuente principal: Coastal Wiki, pyReef-model/wavesed, bshishov/UnityTerrainErosionGPU, MDPI 2024.

## 1. Mecanismos de transporte

### Por acción del oleaje
- **Tensión de corte en el fondo:** la velocidad orbital (que decae con la profundidad) genera esfuerzo cortante sobre el lecho
- **Umbral de movimiento (Shields):** si `τ > τ_critico(d_grano)` la arena empieza a moverse
- Modos: **lecho de carga (bed load)** — rodadura/saltación en superficie; **suspensión** — partículas en el agua

### Por corrientes inducidas
- **Corriente de deriva litoral (longshore):** generada por olas incidentes oblicuas → transportan arena a lo largo de la costa
- **Corrientes de retorno (rip currents):** canales perpendiculares a la costa
- **Corrientes de arranque (undertow):** devuelven agua hacia mar abierto cerca del fondo

## 2. Fórmulas de referencia

### Tensión de corte de olas

```
τ_w = 0.5 · ρ_w · f_w · u_b²
```

con:
- `f_w` — factor de fricción de oleaje (coeficiente de Jonsson/Swart, depende de la rugosidad del fondo)
- `u_b` — amplitud de velocidad orbital en el fondo: `u_b = (π·H)/(T·sinh(k·h))`

### Transporte bed load (Meyer-Peter & Müller, simplificado)

```
q_b = 8·((θ - θ_c)^1.5) · √((s-1)·g·d⁵⁰)
```

con `θ` — parámetro de Shields, `θ_c ≈ 0.047` crítico, `d50` — diámetro medio de grano, `s` — densidad relativa arena/agua.

### Transporte por deriva litoral (CERC, simplificado)

```
Q_l = K · (ρ·g²/(16·s)) · H_b^(5/2) · sin(2·α_b)
```

con `K ≈ 0.39` — coeficiente CERC, `H_b` — altura de rotura, `α_b` — ángulo de la cresta en la rompiente.

### Equilibrio de perfil de playa (Dean)

El perfil de playa en equilibrio tiende a `h = A·x^(2/3)` (x = distancia a la orilla). Las desviaciones de este perfil indican erosión o acreción neta.

## 3. Conservación de masa del fondo (morfodinámica)

```
∂z_b/∂t = -1/(1-p) · ∇·Q_total
```

- `z_b` — altura del fondo
- `p ≈ 0.4` — porosidad de la arena
- `Q_total = Q_b + Q_s` — transporte bed load + suspended load

Este es el **closing equation** del modelo morfodinámico: el fondo cambia donde hay convergencia/divergencia de flujo de sedimento.

## 4. Implementación en GPU (Three.js)

Estrategia recomendada, portando el enfoque de `bshishov/UnityTerrainErosionGPU` a GLSL:

1. **Grid de batimetría** (`z_b`) como textura float (RG32F junto a columna de agua si usamos SWE)
2. **Campo de tensiones de corte** (`τ_w(x,y)`) calculado en shader desde el campo de olas actual
3. **Capacidad de transporte** `C(τ)` — cuánta arena puede llevar el flujo en cada celda
4. **Flujo de sedimento** en dirección de la corriente/deriva con difusión
5. **Actualización de `z_b`:** `Δz = -∇·Q / (1-p)`, con límites de estabilidad
6. **Feedback visual:** recolorear el fondo (arena expuesta, zonas rocosas si z_b cambia mucho, barras de arena emergidas)

### Detalle importante — feedback con el oleaje

Como la batimetría cambia, el campo de olas cambia (refracción/shoaling). Un ciclo realista:

```
Olas → τ de corte → transporte → nuevo z_b → nueva refracción → olas (bucle)
```

Con un timestep grande (simular "1 día" por frame en modo acelerado) se ven barras de arena, tombolos y deltas formarse en minutos.

## 5. Casos de uso en Water3J

| Escenario | Qué simular |
|---|---|
| Playa con olas oblicuas | Deriva litoral, erosión aguas abajo del espigón |
| Dique / espigón | Acumulación a barlovento, erosión a sotavento (efecto obstructor) |
| Rompeolas sumergido | Reducción de τ tras la estructura → acreción |
| Nourishment (regeneración de playa) | Dispersión del depósito artificial |
| Fondo irregular | Barras de arena, canales, rip currents |

## 6. Referencias clave

- Coastal Wiki: sediment transport, longshore drift, beach profile
- pyReef-model/wavesed: https://github.com/pyReef-model/wavesed (referencia conceptual, Python)
- UnityTerrainErosionGPU: https://github.com/bshishov/UnityTerrainErosionGPU (base para port a GLSL)
- MDPI 2024: pipeline integrado Mild-Slope → RANS → sedimentos
