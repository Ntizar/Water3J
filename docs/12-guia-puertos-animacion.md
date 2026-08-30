# Guía 12 — Alta resolución en puertos, animación de frentes y b real

## 1. Resolución adaptable al zoom
Al pulsar "Simular frentes 2D aquí", la rejilla EMODnet se adapta al zoom del mapa:

| Zoom del mapa | Zona | Rejilla | Lado |
|---|---|---|---|
| ≥ 14 | **Puerto / bahía** | 15×15 (225 pts) | 1.2 km |
| 12–13 | costa cercana | 13×13 (169 pts) | 3 km |
| 10–11 | costa | 11×11 (121 pts) | 6 km |
| < 10 | regional | 11×11 | 10 km |

Cuanto más zoom, más puntos y zona más pequeña → **resolución de detalle de puerto**.
El límite real lo pone EMODnet (DTM de ~100 m): a zoom 15 la rejilla entera cubre 1.2 km,
es decir, un punto cada ~86 m — cerca del máximo de la fuente.

## 2. Animación de frentes de fase
Además de los rayos, se dibujan **frentes (isócronas de fase)** que avanzan cada medio
periodo T/2 — la visualización muestra cómo la ola "viaja" hacia la costa deformándose
por refracción. Los frentes se calculan propagando cada punto del frente inicial con el
mismo motor de rayos (`propagarFrente` + `frentesIsocronos`).

## 3. Altura con separación real (b real)
Antes: `b` constante entre rayos (aproximación). Ahora: `calcularSeparaciones()` mide la
**distancia real entre rayos vecinos en cada paso** — si la refracción converge los rayos,
`b` baja y H sube (flujo de energía concentrado); si divergen, H baja. Es la física completa:
**H = H0·√(cg0·b0/(cg·b))** con b medida, no asumida.

**Validación a mano**: en el mapa, mira dos rayos vecinos que se acercan hacia una punta o
entrada de puerto → el tooltip de H entre ellos debe crecer más que en zonas donde se separan.

## Tests que avalan (T15, tanda 8)
| Test | Garantía |
|------|----------|
| T15a | separaciones calculadas para todos los pasos |
| T15b | separaciones positivas y finitas |
| T15c | b cambia con la geometría (convergencia/divergencia medidas) |
| T15d | H responde a la geometría real de rayos (≠ b fija) |

## Bug cazado por la biblia en esta tanda
El vector perpendicular al rayo estaba mal (`n̂ = (-sin α, cos α)` es el propio rayo, no su
perpendicular). Con el fix `n̂ = (cos α, -sin α)` la refracción lateral emerge correctamente y
las separaciones dejan de ser constantes. Sin T15, este bug habría pasado invisible: los
rayos verticales sobre taludes rectos funcionaban "bien" por simetría.
