# Transformaciones del oleaje — Water3J

Qué le ocurre a una ola cuando viaja desde aguas profundas hasta la costa o entra en un puerto. Fuente principal: Coastal Wiki, satbastola (Cap. 5 Coastal Engineering), MDPI (Integrated Modeling).

## 1. Shoaling (aguallamiento)

Al disminuir la profundidad, la ola desacelera. El **flujo de energía se conserva**, así que la altura aumenta:

```
H/h crece con la disminución de c
K_sh = H/H₀ = √(c₀ / (2·c·n))     con n = 1/2·(1 + 2kh/sinh(2kh))
```

En aguas someras: `H ∝ h^(-1/4)` (Green's law aproximada).

**Efecto visual:** olas cada vez más altas y empinadas al acercarse a la playa.

## 2. Refracción

Cuando las líneas de batimetría no son paralelas a la cresta, distintas partes de la ola viajan a distinta velocidad → **la cresta se dobla para alinearse con las isolíneas de profundidad** (principio de Huygens, igual que en óptica).

### Ley de Snell para olas

```
sin(α)/c = constante      (α = ángulo entre cresta y isolínea de profundidad)
```

### Consecuencias
- **Cabezas de punta (headlands):** concentran energía → erosión
- **Bahías:** dispersan energía → playas más tranquilas
- Es el fenómeno que explica por qué las olas "entran" alineadas en la playa

### Implementación práctica
- **Modelo de rayos (ray tracing):** trazar rayos ortogonales a las crestas que se doblan según Snell con `c(h)` local. Referencia: GMD Ocean wave tracing v.1
- En shader: modificar la dirección y longitud de onda de cada componente Gerstner según `h(x,y)` local (aproximación barata y efectiva visualmente)
- En solver SWE: la refracción emerge sola de la física

## 3. Difracción

Olas que rodean obstáculos (diques, cabezas) o pasan por aberturas, **introduciendo energía en la zona de sombra**.

### Coeficiente de difracción

```
K_d(x, y) = η/η₀  (altura local / altura incidente)
```

Detrás de un dique semi-infinito, `K_d` se aproxima con integrales de Fresnel:
- Zona iluminada (alineada con el oleaje incidente): `K_d ≈ 1`
- Zona de sombra (detrás del dique): `K_d < 1`, decreciente con la distancia
- Incidencia oblicua → patrón asimétrico

### Ecuación de Mild-Slope (MSE)

Gobierna difracción + refracción combinadas en batimetría suave:

```
∇·(C·Cg·∇η) + k²·C·Cg·η = 0
```

Es la base de los modelos de agitación portuaria (harbour resonance / wave agitation).

### Uso en Water3J
- Para la web app: implementar MSE simplificada o difracción por aberturas (fórmulas de Goda / Penny & Price) para calcular la agitación en un puerto con diques
- Visualmente: superponer componentes de onda circular (Huygens) en los extremos de los diques

## 4. Reflexión

Parte de la energía rebota en estructuras y pendientes.

### Coeficiente de reflexión

```
Cr = H_reflejada / H_incidente
```

Valores típicos:
- Muro vertical liso: Cr ≈ 0.9-1.0 (reflexión casi total → **oleaje estacionario / clapotis**)
- Escollera de escamas (rubble mound): Cr ≈ 0.2-0.5
- Playa suave: Cr ≈ 0.05-0.2
- Con talud inclinado: Cr decrece con el talud

### Oleaje parcialmente estacionario (clapotis)

Ola incidente + reflejada → patrón de nodos y antinodos. En muros portuarios genera cargas estructurales altas y agitación en la bocana.

### Impacto en estructuras (muros verticales)

- **Carga hidrostática dinámica** + impulso de impacto (slamming)
- Métodos clásicos: Goda (1985) para muros verticales, Minikin para impactos de rompiente
- Presión pico en cresta, distribución trapezoidal en el muro
- Para la web app: visualizar el campo de presiones sobre el muro con escala de color

## 5. Fricción de fondo y disipación

- Pérdida de energía por fricción con el fondo (ley de Manning/Chebyshev) — importante en bajíos extensos
- **Rotura (breaking):** H/h > 0.78 → conversión de energía en turbulencia y espuma
- Zona de surf: corrientes longitudinal y transversal, set-up del nivel medio

## 6. Pipeline integrado (objetivo científico)

El flujo completo de un modelo de ingeniería costera (MDPI, 2024):

```
Batimetría + oleaje incidente (espectro)
  → Modelo Mild-Slope (refracción + difracción + reflexión)
  → Tensiones de radiación
  → Modelo hidrodinámico RANS (corrientes litorales)
  → Modelo de transporte de sedimentos
  → Evolución morfológica del fondo
```

Water3J aspira a implementar una versión simplificada pero fiel de este pipeline en el navegador, con Three.js para la visualización.

### Reparto realista para la web app

| Módulo | Física | Viabilidad navegador |
|---|---|---|
| Olas visuales | Gerstner espectral + dispersión | ✅ Trivial (shaders) |
| Shoaling + refracción | Snell con batimetría local | ✅ Fácil (ray o shader) |
| Difracción en diques | MSE simplificada / Huygens | ⚠️ Media (solver pequeño) |
| Reflexión en muros | Coeficientes + clapotis | ✅ Fácil (superposición) |
| SWE / inundación | Virtual pipes en GLSL | ⚠️ Media-alta (GPGPU) |
| Sedimentos | Pipes + capacidad transporte | ⚠️ Media (año 2) |
| Cargas en muros | Goda / Minikin | ✅ Fácil (analítico) |

## Referencias concretas

- Coastal Wiki: https://www.coastalwiki.org/wiki/Shallow-water_wave_theory
- Cap. 5 (fórmulas): https://satbastola.github.io/CivilEngineering_Tools/Chap5/Diffraction_Shoaling_Refraction.html
- MDPI (pipeline): https://mdpi.com/2673-3951/5/2/25
- GMD (ray tracing): https://gmd.copernicus.org/articles/16/6515/2023/
